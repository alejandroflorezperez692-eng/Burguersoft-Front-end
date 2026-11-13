import { useCallback, useEffect, useState } from 'react';
import PublicHeader from '../components/PublicHeader';
import MotivoModal from '../components/MotivoModal';
import ComprobanteModal from '../components/ComprobanteModal';
import DetallePedidoCliente from '../components/DetallePedidoCliente';
import Footer from '../components/Footer';
import apiClient from '../api/client';
import { getEcho } from '../api/echo';
import { etiquetaEstado } from '../utils/estados';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import '../styles/public.css';
import '../styles/mis-pedidos.css';
import { mensajeError } from '../utils/errores';
import { useToast } from '../components/Toast';

type ItemUI = {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  es_combo?: boolean;
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
  telefono?: string;
  telefono_recibe?: string;
  recibe_nombre?: string;
  combos?: { nombre: string; precio: number }[];
  direccion?: string;
  barrio?: string;
  referencia?: string;
  cliente_nombre?: string;
  notas?: string;
  tiene_comprobante?: boolean;
  comprobante_estado?: string;
  comprobante_motivo?: string;
  comprobante_valor?: number;
  comprobante_coincide?: boolean;
  comprobante_subido_en?: string;
  reembolso?: { monto: number; fecha: string } | null;
};

function texto(valor: unknown): string | undefined {
  if (valor === null || valor === undefined) return undefined;
  const limpio = String(valor).trim();
  return limpio !== '' ? limpio : undefined;
}

function booleano(valor: unknown): boolean | undefined {
  if (valor === null || valor === undefined || valor === '') return undefined;
  if (typeof valor === 'boolean') return valor;
  if (valor === 1 || valor === '1' || valor === 'true') return true;
  if (valor === 0 || valor === '0' || valor === 'false') return false;
  return undefined;
}

function numero(valor: unknown): number | undefined {
  if (valor === null || valor === undefined || valor === '') return undefined;
  const n = Number(valor);
  return Number.isFinite(n) ? n : undefined;
}

const PASOS = ['Registrado', 'Por verificar', 'Recepcionado', 'En preparación', 'Preparado', 'Servido', 'Pendiente de pago', 'Pagado'];
const PASOS_DOMICILIO = PASOS;
const PASOS_RECOGER = PASOS;
const PASOS_CONSUMIR = PASOS;
const CANCELABLES = ['Registrado', 'Por verificar', 'Recepcionado'];

const ORDEN_GLOBAL = PASOS;

function normalizarTipoEntrega(tipo?: string): string {
  const t = (tipo ?? '').trim().toLowerCase();
  if (t.includes('domi')) return 'Domicilio';
  if (t.includes('recog') || t.includes('llevar')) return 'Para recoger';
  return 'En el local';
}

function pasosPara(tipoEntrega: string): string[] {
  const t = normalizarTipoEntrega(tipoEntrega);
  if (t === 'Domicilio') return PASOS_DOMICILIO;
  if (t === 'Para recoger') return PASOS_RECOGER;
  return PASOS_CONSUMIR;
}

function calcularProgreso(pasoActual: number, totalPasos: number): number {
  if (totalPasos <= 1) return 100;
  if (pasoActual <= 0) return 0;
  if (pasoActual >= totalPasos - 1) return 100;
  return (pasoActual / (totalPasos - 1)) * 100;
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

function formatearTelefono(valor?: string): string | undefined {
  if (!valor) return undefined;
  let digitos = valor.replace(/\D/g, '');
  if (digitos.length === 12 && digitos.startsWith('57')) digitos = digitos.slice(2);
  if (digitos.length === 10) {
    return `${digitos.slice(0, 3)} ${digitos.slice(3, 6)} ${digitos.slice(6)}`;
  }
  return valor;
}

function normalizarPedidos(raw: any): PedidoUI[] {
  const desanidar = (v: any): any[] => {
    if (Array.isArray(v)) return v;
    if (!v || typeof v !== 'object') return [];
    if (Array.isArray(v.data)) return desanidar(v.data);
   
    if (v.data && typeof v.data === 'object' && Array.isArray(v.data.data)) return v.data.data;
    if (Array.isArray(v.pedidos)) return v.pedidos;
    if (Array.isArray(v.ventas)) return v.ventas;
    if (Array.isArray(v.items)) return v.items;
    return [];
  };
  const lista = desanidar(raw);
  if (lista.length === 0) return [];

  const esFilaPlana = lista.some((r: any) => r && (r.id_venta !== undefined || r.producto !== undefined));
  if (esFilaPlana) {
    const mapa = new Map<number, PedidoUI & { valorTotalBD?: number }>();
    for (const f of lista as any[]) {
      const vid = Number(f.id_venta ?? f.venta_id ?? f.id);
      if (!Number.isFinite(vid)) continue;
      if (!mapa.has(vid)) {
        mapa.set(vid, {
          id: vid,
          numero_secuencial: 0,
          fecha: String(f.fecha ?? f.created_at ?? ''),
          estado: String(f.estado_venta ?? f.estado ?? 'Registrado'),
          tipo_entrega: normalizarTipoEntrega(f.tipo_entrega),
          metodo_pago: f.metodo_pago ? String(f.metodo_pago) : undefined,
          total: 0,
          items: [],
          telefono: texto(f.telefono_contacto ?? f.telefono),
          direccion: texto(f.direccion),
          barrio: texto(f.barrio),
          referencia: texto(f.referencia),
          cliente_nombre: texto(f.cliente_nombre),
          notas: texto(f.notas),
          tiene_comprobante: booleano(f.tiene_comprobante) ?? Boolean(f.comprobante_pago),
          comprobante_estado: texto(f.comprobante_estado),
          comprobante_motivo: texto(f.comprobante_motivo),
          comprobante_valor: numero(f.comprobante_valor),
          comprobante_coincide: booleano(f.comprobante_coincide),
          comprobante_subido_en: texto(f.comprobante_subido_en),
          reembolso: f.reembolso ? { monto: Number((f.reembolso as { monto: unknown }).monto), fecha: String((f.reembolso as { fecha: unknown }).fecha) } : null,
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
  
    for (const p of mapa.values()) {
      if (p.valorTotalBD !== undefined && Number.isFinite(p.valorTotalBD) && p.valorTotalBD > 0) {
        p.total = p.valorTotalBD;
      }
      delete p.valorTotalBD;
    }
    return asignarSecuenciales([...mapa.values()]);
  }

  const pedidos = (lista as any[])
    .map((v: any): PedidoUI | null => {
      const detalles = Array.isArray(v.detalles)
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
              es_combo: Boolean(d.venta_promocion_id),
            };
          })
        : Array.isArray(v.productos)
          ? v.productos.map((d: any): ItemUI => {
              const cantidad = Number(d.cantidad ?? 1);
              const precio = Number(d.precio ?? d.precio_unitario ?? 0);
              return {
                nombre: String(d.nombre ?? d.nombre_producto ?? 'Producto'),
                cantidad: Number.isFinite(cantidad) ? cantidad : 1,
                precio_unitario: Number.isFinite(precio) ? precio : 0,
                subtotal: Number(d.subtotal ?? cantidad * precio) || 0,
                es_combo: Boolean(d.venta_promocion_id),
              };
            })
          : Array.isArray(v.items)
            ? v.items.map((d: any): ItemUI => {
                const cantidad = Number(d.cantidad ?? 1);
                const precio = Number(d.precio_unitario ?? d.precio ?? 0);
                return {
                  nombre: String(d.producto ?? d.nombre ?? 'Producto'),
                  cantidad: Number.isFinite(cantidad) ? cantidad : 1,
                  precio_unitario: Number.isFinite(precio) ? precio : 0,
                  subtotal: Number(d.subtotal ?? cantidad * precio) || 0,
                  es_combo: Boolean(d.venta_promocion_id),
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
        estado: String(v.estado ?? v.estado_venta ?? 'Registrado'),
        tipo_entrega: normalizarTipoEntrega(v.tipo_entrega),
        metodo_pago: v.metodo_pago ? String(v.metodo_pago) : undefined,
        total: Number.isFinite(totalBD) && totalBD > 0 ? totalBD : totalCalculado,
        items: detalles,
        telefono: texto(
          v.telefono_contacto ?? v.telefono ?? v.usuario?.telefono ?? v.usuario?.phone,
        ),
        telefono_recibe: texto(v.recibe_telefono),
        recibe_nombre: texto(v.recibe_nombre),
        combos: Array.isArray(v.promociones)
          ? v.promociones.map((promo: any) => ({
              nombre: String(promo?.nombre ?? 'Combo'),
              precio: Number(promo?.precio ?? 0) || 0,
            }))
          : [],
        direccion: texto(v.direccion),
        barrio: texto(v.barrio),
        referencia: texto(v.referencia),
        cliente_nombre:
          texto(v.cliente_nombre) ??
          texto(`${v.usuario?.nombre ?? ''} ${v.usuario?.apellido ?? ''}`),
        notas: texto(v.notas),
        tiene_comprobante: booleano(v.tiene_comprobante) ?? Boolean(v.comprobante_pago),
        comprobante_estado: texto(v.comprobante_estado),
        comprobante_motivo: texto(v.comprobante_motivo),
        comprobante_valor: numero(v.comprobante_valor),
        comprobante_coincide: booleano(v.comprobante_coincide),
        comprobante_subido_en: texto(v.comprobante_subido_en),
        reembolso: v.reembolso ? { monto: Number(v.reembolso.monto), fecha: String(v.reembolso.fecha) } : null,
      };
    })
    .filter((p): p is PedidoUI => p !== null);

  pedidos.sort((a, b) => {
    const fa = new Date(a.fecha).getTime();
    const fb = new Date(b.fecha).getTime();
    if (Number.isFinite(fa) && Number.isFinite(fb) && fa !== fb) return fb - fa;
    return b.id - a.id;
  });

  return asignarSecuenciales(pedidos);
}

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

export default function MisCompras() {
  const { isAuthenticated, user } = useAuth();
  const [pedidoACancelar, setPedidoACancelar] = useState<PedidoUI | null>(null);
  const [pedidoComprobante, setPedidoComprobante] = useState<PedidoUI | null>(null);
  const [pedidoDetalle, setPedidoDetalle] = useState<PedidoUI | null>(null);
  const [avisoComprobante, setAvisoComprobante] = useState<string | null>(null);
  const { showToast } = useToast();
  const [pedidos, setPedidos] = useState<PedidoUI[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelandoId, setCancelandoId] = useState<number | null>(null);
  const [cargando, setCargando] = useState(false);

  const aplicarCambioEstado = useCallback(
    (payload: {
      id?: number;
      estado?: string;
      comprobante_estado?: string | null;
      comprobante_motivo?: string | null;
      comprobante_subido_en?: string | null;
    }) => {
      if (!payload?.id || !payload.estado) return;
      setPedidos((prev) =>
        prev === null
          ? prev
          : prev.map((p) =>
              p.id === Number(payload.id)
                ? {
                    ...p,
                    estado: String(payload.estado),
                    ...(payload.comprobante_estado !== undefined && payload.comprobante_estado !== null
                      ? {
                          comprobante_estado: String(payload.comprobante_estado),
                          comprobante_motivo: payload.comprobante_motivo ?? undefined,
                          comprobante_subido_en: payload.comprobante_subido_en ?? undefined,
                          tiene_comprobante: true,
                        }
                      : {}),
                  }
                : p,
            ),
      );
    },
    [],
  );

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) {
      setError(null);
      setCargando(true);
    }
    try {
      try {
        const { data } = await apiClient.get('/mis-pedidos');
        const normalizados = normalizarPedidos(data);
        if (normalizados.length > 0) {
          setPedidos(normalizados);
          return;
        }
      } catch (e: unknown) {
        const status = (e as { response?: { status?: number } })?.response?.status;
        if (status === 401) {
          if (!silencioso) {
            setError('Tu sesión expiró. Inicia sesión de nuevo para ver tus compras.');
            setPedidos([]);
          }
          return;
        }
      }

      const { data: ventasRaw } = await apiClient.get('/ventas');
      let lista = normalizarPedidos(ventasRaw);
      const userId = user?.id;
      if (userId) {
        const crudo: any[] = Array.isArray(ventasRaw)
          ? ventasRaw
          : ((ventasRaw as any)?.data ?? []);
        if (Array.isArray(crudo) && crudo.length > 0) {
          const mios = crudo.filter((v: any) => {
            const uid = Number(
              v.usuario_id ?? v.usuario?.id ?? v.usuario?.id_Usuario ?? v.user_id ?? NaN,
            );
            return Number.isFinite(uid) && uid === userId;
          });
          if (mios.length > 0) lista = normalizarPedidos(mios);
        }
      }
      setPedidos(lista);
    } catch (e: unknown) {
      if (silencioso) return;
      const err = e as { response?: { status?: number } };
      if (err?.response?.status === 401) {
        setError('Tu sesión expiró. Inicia sesión de nuevo para ver tus compras.');
      } else {
        setError('No se pudieron cargar tus compras. Intenta de nuevo más tarde.');
      }
      setPedidos([]);
    } finally {
      if (!silencioso) setCargando(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (sessionStorage.getItem('token') === 'demo-token-sin-backend') {
      setPedidos([]);
      return;
    }

    void cargar();

    const echo = getEcho();
    
    if (echo) {
      echo.channel('cocina').listen('.venta.actualizada', aplicarCambioEstado);
    }

    const t = window.setInterval(() => {
      if (!document.hidden) void cargar(true);
    }, echo ? 60000 : 10000);

    const alVolver = () => {
      if (!document.hidden) void cargar(true);
    };
    window.addEventListener('focus', alVolver);
    document.addEventListener('visibilitychange', alVolver);

    return () => {
      window.clearInterval(t);
      window.removeEventListener('focus', alVolver);
      document.removeEventListener('visibilitychange', alVolver);
      if (echo) {
        echo.channel('cocina').stopListening('.venta.actualizada', aplicarCambioEstado);
      }
    };
  }, [isAuthenticated, cargar, aplicarCambioEstado]);

  const idsPedidos = (pedidos ?? []).map((p) => p.id).join(',');

  useEffect(() => {
    if (!isAuthenticated || !idsPedidos) return;
    if (sessionStorage.getItem('token') === 'demo-token-sin-backend') return;

    const echo = getEcho();
    if (!echo) return;

    const canales = idsPedidos
      .split(',')
      .filter(Boolean)
      .map((id) =>
        echo.private(`venta.${id}`).listen('.venta.actualizada', aplicarCambioEstado),
      );

    return () => {
      canales.forEach((canal) => canal.stopListening('.venta.actualizada', aplicarCambioEstado));
      idsPedidos
        .split(',')
        .filter(Boolean)
        .forEach((id) => echo.leave(`venta.${id}`));
    };
  }, [isAuthenticated, idsPedidos, aplicarCambioEstado]);

  const cancelarPedido = (pedido: PedidoUI) => {
    if (!CANCELABLES.includes(pedido.estado)) {
      setError('Este pedido ya no se puede cancelar. Contáctanos por WhatsApp.');
      return;
    }
    setPedidoACancelar(pedido);
  };

  const confirmarCancelacion = async (pedido: PedidoUI, motivo: string) => {
    setPedidoACancelar(null);
    setCancelandoId(pedido.id);
    setError(null);
    try {
      const { data } = await apiClient.patch(`/ventas/${pedido.id}/estado`, { estado: 'Cancelado', motivo });
      if (data && data.success === false) {
        throw new Error(String(data.error ?? data.message ?? 'No se pudo cancelar el pedido.'));
      }
  
      setPedidos((prev) =>
        prev === null ? prev : prev.map((p) => (p.id === pedido.id ? { ...p, estado: 'Cancelado' } : p)),
      );
      await cargar();
    } catch (e: unknown) {
      setError(mensajeError(e, 'No se pudo cancelar el pedido'));
    } finally {
      setCancelandoId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="public-body">
        <PublicHeader />
        <div style={{ maxWidth: 800, margin: '60px auto', textAlign: 'center', padding: 24 }}>
          <h2>Debes iniciar sesión para ver tus compras</h2>
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
          <h1>Mis Compras</h1>
          <p>
            Hola{user?.name ? `, ${user.name}` : ''}, aquí puedes ver el estado de tus compras.
          </p>
        </div>

        {error && <div className="mis-pedidos-error">{error}</div>}
        {avisoComprobante && <div className="mis-pedidos-aviso">{avisoComprobante}</div>}

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
          <p style={{ textAlign: 'center', color: '#888' }}>Cargando…</p>
        ) : pedidos.length === 0 ? (
          <div className="pedidos-empty">
            <p>Aún no tienes compras registradas.</p>
            <Link to="/menu-publico">Ver el menú</Link>
          </div>
        ) : (
          pedidos.map((p) => {
            const estado = p.estado ?? 'Registrado';
            const cancelado = estado.trim().toLowerCase() === 'cancelado';
            const rechazado = estado.trim().toLowerCase() === 'rechazada';
            const sinProgreso = cancelado || rechazado;
            const pasos = pasosPara(p.tipo_entrega);
            let pasoActual = pasos.indexOf(estado);
            if (pasoActual === -1) {
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
            const anchoDisponible = 100 - 2 * halfStep;
            const fillWidth = sinProgreso
              ? 0
              : (anchoDisponible * calcularProgreso(pasoActual, totalPasos)) / 100;
            const esCancelable = CANCELABLES.includes(estado);
            const estaCancelando = cancelandoId === p.id;
            const direccionTexto =
              p.tipo_entrega === 'Domicilio'
                ? [p.direccion, p.barrio ? `Barrio ${p.barrio}` : undefined, p.referencia]
                    .filter(Boolean)
                    .join(' · ') || 'No registrada'
                : p.tipo_entrega === 'Para recoger'
                  ? 'Recoge en el local'
                  : 'Consumo en el restaurante';

            const estadoComprobante = (p.comprobante_estado ?? '').trim().toLowerCase();
            const pagoElectronico =
              Boolean(p.metodo_pago) &&
              String(p.metodo_pago).trim().toLowerCase() !== 'efectivo';
            const mostrarComprobante =
              Boolean(p.tiene_comprobante) ||
              (pagoElectronico && !cancelado && !rechazado && estado !== 'Pagado');
            const puedeRecargarComprobante =
              !cancelado &&
              !rechazado &&
              estado !== 'Pagado' &&
              (estadoComprobante === 'rechazado' ||
                (!p.tiene_comprobante && pagoElectronico));

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
                  <div className={`progreso-estado-label${sinProgreso ? ' cancelado' : ''}`}>
                    {cancelado ? '✗ Pedido cancelado' : rechazado ? '✗ Pedido rechazado' : etiquetaEstado(estado, p.tipo_entrega)}
                  </div>
                  <div className="progreso-tipo">Entrega: {p.tipo_entrega}</div>

                  {!sinProgreso ? (
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
                              <div className={`paso-circulo ${clase}`}>{clase ? i + 1 : ''}</div>
                              <span className={`paso-label ${clase}`}>{etiquetaEstado(paso, p.tipo_entrega)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="progreso-cancelado">
                      <span>{cancelado ? 'Este pedido fue cancelado.' : 'Este pedido fue rechazado.'}</span>
                      {p.reembolso && (
                        <span>
                          Registramos la devolución de ${Number(p.reembolso.monto).toLocaleString('es-CO')}. Si no la ves reflejada, escríbenos por WhatsApp.
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {mostrarComprobante && (
                  <div
                    className={`pedido-comprobante ${
                      !p.tiene_comprobante
                        ? 'pedido-comprobante-sin-cargar'
                        : estadoComprobante === 'aprobado'
                          ? 'pedido-comprobante-aprobado'
                          : estadoComprobante === 'rechazado'
                            ? 'pedido-comprobante-rechazado'
                            : 'pedido-comprobante-pendiente'
                    }`}
                  >
                    <div className="pedido-comprobante-texto">
                      <strong>
                        {!p.tiene_comprobante
                          ? 'Comprobante de pago pendiente'
                          : estadoComprobante === 'aprobado'
                            ? '✓ Pago verificado por el administrador'
                            : estadoComprobante === 'rechazado'
                              ? '✗ Comprobante devuelto'
                              : 'Comprobante de pago en revisión'}
                      </strong>
                      <span>
                        {!p.tiene_comprobante
                          ? 'Aún no has subido el comprobante de este pedido. Súbelo para que el administrador pueda verificar tu pago.'
                          : estadoComprobante === 'aprobado'
                            ? 'El administrador revisó la imagen y confirmó tu pago.'
                            : estadoComprobante === 'rechazado'
                              ? p.comprobante_motivo ||
                                'El comprobante no fue aceptado. Sube uno nuevo para continuar.'
                              : 'La IA confirmó que la imagen es un comprobante de pago. El administrador está verificando que coincida con el total del pedido.'}
                      </span>
                      {p.tiene_comprobante &&
                        estadoComprobante !== 'aprobado' &&
                        p.comprobante_valor !== undefined && (
                          <span className="pedido-comprobante-dato">
                            Valor detectado por la IA: {formatoMoneda(p.comprobante_valor)}
                            {p.comprobante_coincide === false
                              ? ' · No coincide con el total, el administrador lo revisará.'
                              : ''}
                          </span>
                        )}
                    </div>
                    {puedeRecargarComprobante && (
                      <button
                        type="button"
                        className="btn-comprobante"
                        onClick={() => {
                          setAvisoComprobante(null);
                          setPedidoComprobante(p);
                        }}
                      >
                        {p.tiene_comprobante ? 'Volver a subir comprobante' : 'Subir comprobante'}
                      </button>
                    )}
                  </div>
                )}

                <div className="pedido-info">
                  <div className="pedido-info-item">
                    <span className="pedido-info-label">Cliente</span>
                    <span className="pedido-info-valor">
                      {p.cliente_nombre ?? user?.name ?? '—'}
                    </span>
                  </div>
                  <div className="pedido-info-item">
                    <span className="pedido-info-label">
                      {p.tipo_entrega === 'Domicilio' ? 'Teléfono de quien recibe' : 'Teléfono'}
                    </span>
                    <span className="pedido-info-valor">
                      {formatearTelefono(
                        p.tipo_entrega === 'Domicilio'
                          ? (p.telefono_recibe ?? p.telefono)
                          : p.telefono,
                      ) ?? 'No registrado'}
                    </span>
                  </div>
                  <div className="pedido-info-item pedido-info-full">
                    <span className="pedido-info-label">
                      {p.tipo_entrega === 'Domicilio' ? 'Dirección de entrega' : 'Entrega'}
                    </span>
                    <span className="pedido-info-valor">{direccionTexto}</span>
                  </div>
                  {p.notas && (
                    <div className="pedido-info-item pedido-info-full">
                      <span className="pedido-info-label">Notas</span>
                      <span className="pedido-info-valor pedido-info-notas">{p.notas}</span>
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
                            <span className="precio-unit">
                              {item.es_combo ? 'Incluido' : formatoMoneda(item.precio_unitario)}
                            </span>
                          </td>
                          <td>{item.cantidad}</td>
                          <td>{item.es_combo ? '—' : formatoMoneda(item.subtotal)}</td>
                        </tr>
                      ))}
                      {(p.combos ?? []).map((combo, idx) => (
                        <tr key={`${p.id}-combo-${idx}`} className="pedido-combo-row">
                          <td>
                            <span className="producto-nombre">{combo.nombre} (combo)</span>
                          </td>
                          <td>
                            <span className="precio-unit">{formatoMoneda(combo.precio)}</span>
                          </td>
                          <td>1</td>
                          <td>{formatoMoneda(combo.precio)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                <div className="pedido-foot">
                  <div className="pedido-foot-acciones">
                    {esCancelable && (
                      <button
                        className="btn-cancelar-pedido"
                        onClick={() => cancelarPedido(p)}
                        disabled={estaCancelando}
                      >
                        {estaCancelando ? 'Cancelando…' : 'Cancelar pedido'}
                      </button>
                    )}
                  </div>
                  <span className="label">Total del pedido:</span>
                  <span className="total">{formatoMoneda(p.total)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
      <Footer />

      {pedidoACancelar && (
        <MotivoModal
          titulo={`Cancelar el pedido #${pedidoACancelar.numero_secuencial}`}
          descripcion="Cuéntanos por qué lo cancelas. Esto nos ayuda a mejorar."
          confirmarTexto="Sí, cancelar pedido"
          peligro
          onClose={() => setPedidoACancelar(null)}
          onConfirm={(motivo) => void confirmarCancelacion(pedidoACancelar, motivo)}
        />
      )}
      {pedidoDetalle && (
        <DetallePedidoCliente
          pedido={pedidoDetalle}
          onClose={() => setPedidoDetalle(null)}
        />
      )}
      {pedidoComprobante && (
        <ComprobanteModal
          ventaId={pedidoComprobante.id}
          numero={pedidoComprobante.numero_secuencial}
          onClose={() => setPedidoComprobante(null)}
          onSubido={() => {
            showToast(
              'Comprobante subido. La IA confirmó que es un comprobante de pago y quedó en revisión del administrador.',
              false,
            );
            void cargar();
          }}
        />
      )}
    </div>
  );
}