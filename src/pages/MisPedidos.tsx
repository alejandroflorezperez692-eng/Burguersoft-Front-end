import { useCallback, useEffect, useState } from 'react';
import PublicHeader from '../components/PublicHeader';
import Footer from '../components/Footer';
import apiClient from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import '../styles/mis-pedidos.css';

type ItemUI = {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
};

type PedidoUI = {
  id: number;
  numero_secuencial: number;
  fecha: string;
  estado: string;
  tipo_entrega: string;
  metodo_pago?: string;
  total: number;
  items: ItemUI[];
};

// Reutiliza los mismos pasos que la vista PHP original
const PASOS_DOMICILIO = ['En cocina', 'En barra', 'En camino', 'Entregado', 'Pagado'];
const PASOS_RECOGER = ['En cocina', 'Listo para recoger', 'Entregado', 'Pagado'];
const PASOS_CONSUMIR = ['En cocina', 'En barra', 'Entregado', 'Pendiente de pago', 'Pagado'];
const CANCELABLES = ['En cocina', 'En barra', 'Pendiente de pago'];

// Orden global para estimar progreso cuando el estado no pertenece al flujo actual
// (el backend permite cualquier estado en cualquier tipo de entrega).
const ORDEN_GLOBAL = [
  'En cocina',
  'En barra',
  'Listo para recoger',
  'En camino',
  'Entregado',
  'Pendiente de pago',
  'Pagado',
];

function normalizarTipoEntrega(tipo?: string): string {
  const t = (tipo ?? '').trim().toLowerCase();
  if (t.includes('domi')) return 'Domicilio';
  if (t.includes('recog')) return 'Recoger';
  if (t.includes('consum') || t.includes('local') || t.includes('mesa')) return 'Consumir en local';
  return 'Recoger';
}

function pasosPara(tipoEntrega: string): string[] {
  const t = normalizarTipoEntrega(tipoEntrega);
  if (t === 'Domicilio') return PASOS_DOMICILIO;
  if (t === 'Recoger') return PASOS_RECOGER;
  return PASOS_CONSUMIR;
}

/** Progreso 0-100. Antes era (actual/total)*100 y nunca llegaba al 100%. */
function calcularProgreso(pasoActual: number, totalPasos: number): number {
  if (totalPasos <= 1) return 100;
  if (pasoActual <= 0) return 0;
  if (pasoActual >= totalPasos - 1) return 100;
  return Math.round((pasoActual / (totalPasos - 1)) * 100);
}

function formatearFecha(fecha: string): string {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return fecha;
  return d.toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatoMoneda(valor: number): string {
  return `$${Number(valor ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

// Acepta las formas que puede devolver el backend:
// 1) filas planas estilo PHP (id_venta + producto + cantidad...)
// 2) ventas Laravel con `detalles` (VentaAdmin)
// 3) pedidos simples antiguos (productos: [{nombre, cantidad, precio}])
// También tolera paginación Laravel: { data: [...] } o { data: { data: [...] } }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizarPedidos(raw: any): PedidoUI[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const desanidar = (v: any): any[] => {
    if (Array.isArray(v)) return v;
    if (!v || typeof v !== 'object') return [];
    if (Array.isArray(v.data)) return desanidar(v.data);
    // Paginador Laravel: { data: { data: [...] } }
    if (v.data && typeof v.data === 'object' && Array.isArray(v.data.data)) return v.data.data;
    if (Array.isArray(v.pedidos)) return v.pedidos;
    if (Array.isArray(v.ventas)) return v.ventas;
    if (Array.isArray(v.items)) return v.items;
    return [];
  };
  const lista = desanidar(raw);
  if (lista.length === 0) return [];

  // Caso 1: filas planas (vienen de la consulta JOIN del PHP)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const esFilaPlana = lista.some((r: any) => r && (r.id_venta !== undefined || r.producto !== undefined));
  if (esFilaPlana) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapa = new Map<number, PedidoUI & { valorTotalBD?: number }>();
    for (const f of lista as any[]) {
      const vid = Number(f.id_venta ?? f.venta_id ?? f.id);
      if (!Number.isFinite(vid)) continue;
      if (!mapa.has(vid)) {
        mapa.set(vid, {
          id: vid,
          numero_secuencial: 0,
          fecha: String(f.fecha ?? f.created_at ?? ''),
          estado: String(f.estado_venta ?? f.estado ?? 'En cocina'),
          tipo_entrega: normalizarTipoEntrega(f.tipo_entrega),
          metodo_pago: f.metodo_pago ? String(f.metodo_pago) : undefined,
          total: 0,
          items: [],
          valorTotalBD: f.valor_total !== undefined ? Number(f.valor_total) : undefined,
        });
      }
      const p = mapa.get(vid)!;
      const cantidad = Number(f.cantidad ?? 1);
      const precio = Number(f.precio_unitario ?? f.precio ?? 0);
      const subtotal = Number(f.subtotal ?? cantidad * precio);
      p.items.push({
        nombre: String(f.producto ?? f.nombre_producto ?? f.nombre ?? 'Producto'),
        cantidad: Number.isFinite(cantidad) ? cantidad : 1,
        precio_unitario: Number.isFinite(precio) ? precio : 0,
        subtotal: Number.isFinite(subtotal) ? subtotal : 0,
      });
      p.total += Number.isFinite(subtotal) ? subtotal : 0;
      if (f.valor_total !== undefined) {
        const vt = Number(f.valor_total);
        if (Number.isFinite(vt)) p.valorTotalBD = vt;
      }
    }
    // Prefiere el total guardado en BD cuando existe; si no, usa la suma.
    for (const p of mapa.values()) {
      if (p.valorTotalBD !== undefined && Number.isFinite(p.valorTotalBD) && p.valorTotalBD > 0) {
        p.total = p.valorTotalBD;
      }
      delete p.valorTotalBD;
    }
    return asignarSecuenciales([...mapa.values()]);
  }

  // Caso 2 y 3: objetos de venta/pedido
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pedidos = (lista as any[])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((v: any): PedidoUI | null => {
      const detalles = Array.isArray(v.detalles)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? v.detalles.map((d: any): ItemUI => {
            const cantidad = Number(d.cantidad ?? 1);
            const precio = Number(d.precio_unitario ?? d.precio ?? d.valor_producto ?? 0);
            return {
              nombre: String(
                d.producto?.nombre_producto ?? d.producto?.nombre ?? d.nombre ?? 'Producto',
              ),
              cantidad: Number.isFinite(cantidad) ? cantidad : 1,
              precio_unitario: Number.isFinite(precio) ? precio : 0,
              subtotal: Number(d.subtotal ?? cantidad * precio) || 0,
            };
          })
        : Array.isArray(v.productos)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? v.productos.map((d: any): ItemUI => {
              const cantidad = Number(d.cantidad ?? 1);
              const precio = Number(d.precio ?? d.precio_unitario ?? 0);
              return {
                nombre: String(d.nombre ?? d.nombre_producto ?? 'Producto'),
                cantidad: Number.isFinite(cantidad) ? cantidad : 1,
                precio_unitario: Number.isFinite(precio) ? precio : 0,
                subtotal: Number(d.subtotal ?? cantidad * precio) || 0,
              };
            })
          : Array.isArray(v.items)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? v.items.map((d: any): ItemUI => {
                const cantidad = Number(d.cantidad ?? 1);
                const precio = Number(d.precio_unitario ?? d.precio ?? 0);
                return {
                  nombre: String(d.producto ?? d.nombre ?? 'Producto'),
                  cantidad: Number.isFinite(cantidad) ? cantidad : 1,
                  precio_unitario: Number.isFinite(precio) ? precio : 0,
                  subtotal: Number(d.subtotal ?? cantidad * precio) || 0,
                };
              })
            : [];

      const id = Number(v.id ?? v.id_venta ?? v.venta_id ?? 0);
      if (!Number.isFinite(id) || id === 0) return null;
      const totalCalculado = detalles.reduce((a: number, d: ItemUI) => a + d.subtotal, 0);
      const totalBD = Number(v.valor_total ?? v.total ?? NaN);
      return {
        id,
        numero_secuencial: 0,
        fecha: String(v.fecha ?? v.created_at ?? ''),
        estado: String(v.estado ?? v.estado_venta ?? 'En cocina'),
        tipo_entrega: normalizarTipoEntrega(v.tipo_entrega),
        metodo_pago: v.metodo_pago ? String(v.metodo_pago) : undefined,
        total: Number.isFinite(totalBD) && totalBD > 0 ? totalBD : totalCalculado,
        items: detalles,
      };
    })
    .filter((p): p is PedidoUI => p !== null);

  // Ordena como el PHP: fecha DESC, id DESC (por si el backend no lo hace)
  pedidos.sort((a, b) => {
    const fa = new Date(a.fecha).getTime();
    const fb = new Date(b.fecha).getTime();
    if (Number.isFinite(fa) && Number.isFinite(fb) && fa !== fb) return fb - fa;
    return b.id - a.id;
  });

  return asignarSecuenciales(pedidos);
}

// Igual que el PHP: el más reciente (primero, ORDER BY fecha DESC) lleva el número más alto
function asignarSecuenciales(pedidos: PedidoUI[]): PedidoUI[] {
  const ordenados = [...pedidos].sort((a, b) => {
    const fa = new Date(a.fecha).getTime();
    const fb = new Date(b.fecha).getTime();
    if (Number.isFinite(fa) && Number.isFinite(fb) && fa !== fb) return fb - fa;
    return b.id - a.id;
  });
  const total = ordenados.length;
  return ordenados.map((p, i) => ({ ...p, numero_secuencial: total - i }));
}

export default function MisPedidos() {
  const { isAuthenticated, user } = useAuth();
  const [pedidos, setPedidos] = useState<PedidoUI[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelandoId, setCancelandoId] = useState<number | null>(null);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    setError(null);
    setCargando(true);
    try {
      // 1) Ruta dedicada (si el backend Laravel la expone)
      try {
        const { data } = await apiClient.get('/mis-pedidos');
        const normalizados = normalizarPedidos(data);
        // Si la ruta existe pero viene vacía, igual intentamos el fallback a /ventas
        // filtrado por usuario, porque algunos backends devuelven [] sin filtrar.
        if (normalizados.length > 0) {
          setPedidos(normalizados);
          return;
        }
      } catch (e: unknown) {
        const status = (e as { response?: { status?: number } })?.response?.status;
        // 401 sí es definitivo; 404 seguimos al fallback
        if (status === 401) {
          setError('Tu sesión expiró. Inicia sesión de nuevo para ver tus pedidos.');
          setPedidos([]);
          return;
        }
      }

      // 2) Fallback: /ventas y filtrar por usuario autenticado.
      // El backend de admin devuelve todas las ventas con `usuario`.
      const { data: ventasRaw } = await apiClient.get('/ventas');
      let lista = normalizarPedidos(ventasRaw);
      const userId = user?.id;
      if (userId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const crudo: any[] = Array.isArray(ventasRaw)
          ? ventasRaw
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          : ((ventasRaw as any)?.data ?? []);
        if (Array.isArray(crudo) && crudo.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mios = crudo.filter((v: any) => {
            const uid = Number(
              v.usuario_id ?? v.usuario?.id ?? v.usuario?.id_Usuario ?? v.user_id ?? NaN,
            );
            return Number.isFinite(uid) && uid === userId;
          });
          // Solo filtramos si encontramos coincidencias; si no, mostramos todo
          // para no dejar la pantalla vacía por un formato distinto.
          if (mios.length > 0) lista = normalizarPedidos(mios);
        }
      }
      setPedidos(lista);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      if (err?.response?.status === 401) {
        setError('Tu sesión expiró. Inicia sesión de nuevo para ver tus pedidos.');
      } else {
        setError('No se pudieron cargar tus pedidos. Intenta de nuevo más tarde.');
      }
      setPedidos([]);
    } finally {
      setCargando(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!isAuthenticated) return;
    // Token demo sin backend: no hay nada que pedir
    if (localStorage.getItem('token') === 'demo-token-sin-backend') {
      setPedidos([]);
      return;
    }
    void cargar();
    // Auto-refresco cada 30s para ver cambios de estado (cocina/barra/camino)
    const t = window.setInterval(() => {
      void cargar();
    }, 30000);
    return () => window.clearInterval(t);
  }, [isAuthenticated, cargar]);

  const cancelarPedido = async (pedido: PedidoUI) => {
    if (!CANCELABLES.includes(pedido.estado)) {
      setError('Este pedido ya no se puede cancelar. Contáctanos por WhatsApp.');
      return;
    }
    if (!window.confirm(`¿Seguro que deseas cancelar el pedido #${pedido.numero_secuencial}?`)) return;
    setCancelandoId(pedido.id);
    setError(null);
    try {
      const { data } = await apiClient.put(`/ventas/${pedido.id}`, { estado: 'Cancelado' });
      // El backend puede devolver { success: true } o la venta actualizada
      if (data && data.success === false) {
        throw new Error(String(data.error ?? data.message ?? 'No se pudo cancelar el pedido.'));
      }
      // Actualización optimista inmediata + recarga de confirmación
      setPedidos((prev) =>
        prev === null ? prev : prev.map((p) => (p.id === pedido.id ? { ...p, estado: 'Cancelado' } : p)),
      );
      await cargar();
    } catch (e: unknown) {
      let mensaje = 'No se pudo cancelar el pedido.';
      if (typeof e === 'object' && e !== null) {
        const err = e as { response?: { data?: { error?: string; message?: string } }; message?: string };
        mensaje = err.response?.data?.error ?? err.response?.data?.message ?? err.message ?? mensaje;
      }
      setError(mensaje);
    } finally {
      setCancelandoId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="public-body">
        <PublicHeader />
        <div style={{ maxWidth: 800, margin: '60px auto', textAlign: 'center', padding: 24 }}>
          <h2>Debes iniciar sesión para ver tus pedidos</h2>
          <Link
            to="/login"
            style={{
              display: 'inline-block',
              marginTop: 16,
              background: '#E8821A',
              color: '#fff',
              padding: '10px 22px',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            Iniciar sesión
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="public-body">
      <PublicHeader />
      <div className="mis-pedidos-page">
        <div className="mis-pedidos-header">
          <h1>Mis Pedidos</h1>
          <p>
            Hola{user?.name ? `, ${user.name}` : ''}, aquí puedes ver el estado de tus pedidos.
          </p>
        </div>

        {error && <div className="mis-pedidos-error">{error}</div>}

        <div style={{ textAlign: 'right', marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => void cargar()}
            disabled={cargando}
            style={{
              background: '#fff',
              border: '1px solid #e8e0d4',
              borderRadius: 8,
              padding: '8px 16px',
              cursor: cargando ? 'wait' : 'pointer',
              fontWeight: 700,
              fontSize: 12,
              color: '#3d2111',
            }}
          >
            {cargando ? 'Actualizando…' : '↻ Actualizar'}
          </button>
        </div>

        {pedidos === null ? (
          <p style={{ textAlign: 'center', color: '#888' }}>Cargando...</p>
        ) : pedidos.length === 0 ? (
          <div className="pedidos-empty">
            <p>Aún no tienes pedidos registrados.</p>
            <Link to="/menu-publico">Ver el menú</Link>
          </div>
        ) : (
          pedidos.map((p) => {
            const estado = p.estado ?? 'En cocina';
            const cancelado = estado.trim().toLowerCase() === 'cancelado';
            const pasos = pasosPara(p.tipo_entrega);
            let pasoActual = pasos.indexOf(estado);
            if (pasoActual === -1) {
              // El estado existe pero es de otro flujo (ej. "En camino" en un pedido
              // para recoger): estima la posición con el orden global.
              const gActual = ORDEN_GLOBAL.indexOf(estado);
              if (gActual !== -1) {
                const gIni = ORDEN_GLOBAL.indexOf(pasos[0]);
                const gFin = ORDEN_GLOBAL.indexOf(pasos[pasos.length - 1]);
                const span = Math.max(1, gFin - gIni);
                const rel = Math.min(Math.max(gActual - gIni, 0), span);
                pasoActual = Math.round((rel / span) * (pasos.length - 1));
              } else {
                pasoActual = 0;
              }
            }
            const totalPasos = pasos.length;
            const halfStep = 50 / totalPasos;
            const fillWidth = cancelado ? 0 : calcularProgreso(pasoActual, totalPasos);
            const esCancelable = CANCELABLES.includes(estado);
            const estaCancelando = cancelandoId === p.id;

            return (
              <div className="pedido-card" key={p.id}>
                <div className="pedido-head">
                  <div className="pedido-head-left">
                    <span className="pedido-num">Pedido #{p.numero_secuencial}</span>
                    <span className="pedido-fecha">{formatearFecha(p.fecha)}</span>
                  </div>
                  {p.metodo_pago && <span className="pedido-metodo">{p.metodo_pago}</span>}
                </div>

                <div className="progreso-container">
                  <div className={`progreso-estado-label${cancelado ? ' cancelado' : ''}`}>
                    {cancelado ? '✗ Pedido cancelado' : estado}
                  </div>
                  <div className="progreso-tipo">Entrega: {p.tipo_entrega}</div>

                  {!cancelado ? (
                    <div className="progreso-barra-wrapper">
                      <div
                        className="progreso-linea-bg"
                        style={{ left: `${halfStep}%`, right: `${halfStep}%` }}
                      />
                      <div
                        className="progreso-linea-fill"
                        style={{ left: `${halfStep}%`, width: `${fillWidth}%` }}
                      />
                      <div className="progreso-pasos">
                        {pasos.map((paso, i) => {
                          const clase =
                            i < pasoActual ? 'completado' : i === pasoActual ? 'activo' : '';
                          return (
                            <div className="progreso-paso" key={paso}>
                              <div className={`paso-circulo ${clase}`} />
                              <span className={`paso-label ${clase}`}>{paso}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="progreso-cancelado">
                      <span>Este pedido fue cancelado.</span>
                    </div>
                  )}
                </div>

                {p.items.length > 0 && (
                  <table className="pedido-table">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Precio unitario</th>
                        <th>Cantidad</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.items.map((item, idx) => (
                        <tr key={`${p.id}-${idx}`}>
                          <td>
                            <span className="producto-nombre">{item.nombre}</span>
                          </td>
                          <td>
                            <span className="precio-unit">{formatoMoneda(item.precio_unitario)}</span>
                          </td>
                          <td>{item.cantidad}</td>
                          <td>{formatoMoneda(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                <div className="pedido-foot">
                  {esCancelable && (
                    <button
                      className="btn-cancelar-pedido"
                      onClick={() => void cancelarPedido(p)}
                      disabled={estaCancelando}
                    >
                      {estaCancelando ? 'Cancelando…' : 'Cancelar pedido'}
                    </button>
                  )}
                  <span className="label">Total del pedido:</span>
                  <span className="total">{formatoMoneda(p.total)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
      <Footer />
    </div>
  );
}
