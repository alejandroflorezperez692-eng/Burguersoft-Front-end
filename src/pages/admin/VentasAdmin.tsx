import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import AdminLoading from '../../components/AdminLoading';
import Paginacion, { paginar } from '../../components/Paginacion';
import VentasGraficas from '../../components/VentasGraficas';
import type { EstadisticasVentas } from '../../types/Ventas';
import { useAuth } from '../../hooks/useAuth';
import { normalizarRol } from '../../utils/roles';

interface DetalleVenta {
  id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  producto?: { id?: number; nombre?: string };
}

interface PromocionVenta {
  id: number;
  nombre: string;
}

interface Venta {
  id: number;
  fecha: string;
  valor_total: number;
  metodo_pago: string;
  estado: string;
  tipo_entrega: string;
  usuario_id: number;
  cliente_nombre?: string | null;
  usuario?: { nombre: string; apellido: string };
  detalles: DetalleVenta[];
  promociones: PromocionVenta[];
}

interface Producto {
  id: number;
  nombre: string;
  valor: number;
}

interface Promocion {
  id: number;
  nombre: string;
  precio: number;
  estado?: string;
}

const METODOS = ['Efectivo', 'Daviplata', 'Bancolombia', 'Nequi'];
const TIPOS_ENTREGA = ['Domicilio', 'Recoger', 'Consumir'];
const ESTADOS = ['En barra', 'En cocina', 'En camino', 'Listo para recoger', 'Entregado', 'Pagado', 'Cancelado', 'Reembolsada'];

const toArray = <T,>(v: unknown): T[] =>
  Array.isArray(v) ? (v as T[]) : ((v as { data?: unknown })?.data as T[] ?? []);

export default function VentasAdmin() {
  const { user } = useAuth();
  const esAdmin = normalizarRol(user?.role) === 'admin';
  const [items, setItems] = useState<Venta[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [q, setQ] = useState('');
  const [pagina, setPagina] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [tipoEntrega, setTipoEntrega] = useState('Domicilio');
  const [clienteNombre, setClienteNombre] = useState('');
  const [productoId, setProductoId] = useState<number>(0);
  const [cantidad, setCantidad] = useState('1');
  const [carrito, setCarrito] = useState<{ producto_id: number; cantidad: number }[]>([]);
  const [promocionId, setPromocionId] = useState<number>(0);
  const [cantidadCombo, setCantidadCombo] = useState('1');
  const [combos, setCombos] = useState<{ promocion_id: number; cantidad: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const [dias, setDias] = useState(7);
  const [stats, setStats] = useState<EstadisticasVentas | null>(null);
  const [cargandoStats, setCargandoStats] = useState(esAdmin);
  const [errorStats, setErrorStats] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [r1, r2, r3] = await Promise.all([
        apiClient.get('/ventas'),
        apiClient.get('/productos'),
        apiClient.get('/promociones'),
      ]);
      setItems(toArray<Venta>(r1.data));
      setProductos(toArray<Producto>(r2.data));
      setPromociones(toArray<Promocion>(r3.data));
    } catch {
      setItems([]);
      setProductos([]);
      setPromociones([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!esAdmin) return; // las estadísticas son solo del administrador
    let activo = true;
    setCargandoStats(true);

    apiClient.get<EstadisticasVentas>('/ventas/estadisticas', { params: { dias } })
      .then(({ data }) => {
        if (!activo) return;
        setStats(data);
        setErrorStats(false);
      })
      .catch(() => {
        if (activo) setErrorStats(true);
      })
      .finally(() => {
        if (activo) setCargandoStats(false);
      });

    return () => { activo = false; };
  }, [dias, version, esAdmin]);

  if (loading) {
    return <AdminLoading texto="Cargando ventas" subtexto="Preparando tus pedidos y movimientos" />;
  }

  const nombreCliente = (v: Venta) =>
    v?.cliente_nombre || (v?.usuario ? `${v.usuario.nombre} ${v.usuario.apellido}`.trim() : '');

  const filtered = (items ?? []).filter((v) =>
    String(v?.id ?? '').includes(q ?? '') ||
    nombreCliente(v).toLowerCase().includes((q ?? '').toLowerCase())
  );

  const { visibles, paginaActual } = paginar(filtered, pagina);

  const hoy = new Date().toISOString().slice(0, 10);
  const ventasHoy = stats ? stats.ventas_hoy : (items ?? []).filter((v) => (v?.fecha ?? '').slice(0, 10) === hoy).length;
  const ingresosHoy = stats ? stats.ingresos_hoy : (items ?? []).reduce((a, v) => a + (Number(v?.valor_total) || 0), 0);
  const totalVentas = stats ? stats.total_ventas : items.length;
  const ingresosTotal = stats ? stats.ingresos_totales : (items ?? []).reduce((a, v) => a + (Number(v?.valor_total) || 0), 0);

  const save = () => {
    if (carrito.length === 0 && combos.length === 0) return;
    const body = {
      carrito,
      combos: combos.length ? combos : undefined,
      metodo_pago: metodoPago,
      tipo_entrega: tipoEntrega,
      cliente_nombre: clienteNombre.trim() || undefined,
    };
    apiClient.post('/ventas', body).then(() => {
      cerrarFormulario();
      setVersion((v) => v + 1);
      load();
    }).catch(() => alert('No se pudo registrar la venta. Revisa el stock y los datos.'));
  };

  const cerrarFormulario = () => {
    setShowForm(false);
    setCarrito([]);
    setCombos([]);
    setProductoId(0);
    setCantidad('1');
    setPromocionId(0);
    setCantidadCombo('1');
    setClienteNombre('');
  };

  const buscarProducto = (id: number) => (productos ?? []).find((p) => p?.id === id);

  const agregarAlCarrito = () => {
    if (!productoId) return;
    const cant = Math.max(1, Math.floor(Number(cantidad) || 1));

    setCarrito((prev) => {
      const existente = prev.findIndex((l) => l.producto_id === productoId);

      if (existente >= 0) {
        const copia = [...prev];
        copia[existente] = { ...copia[existente], cantidad: copia[existente].cantidad + cant };
        return copia;
      }

      return [...prev, { producto_id: productoId, cantidad: cant }];
    });

    setProductoId(0);
    setCantidad('1');
  };

  const quitarDelCarrito = (id: number) =>
    setCarrito((prev) => prev.filter((l) => l.producto_id !== id));

  const buscarPromocion = (id: number) => (promociones ?? []).find((p) => p?.id === id);

  const agregarCombo = () => {
    if (!promocionId) return;
    const cant = Math.max(1, Math.floor(Number(cantidadCombo) || 1));

    setCombos((prev) => {
      const existente = prev.findIndex((c) => c.promocion_id === promocionId);

      if (existente >= 0) {
        const copia = [...prev];
        copia[existente] = { ...copia[existente], cantidad: copia[existente].cantidad + cant };
        return copia;
      }

      return [...prev, { promocion_id: promocionId, cantidad: cant }];
    });

    setPromocionId(0);
    setCantidadCombo('1');
  };

  const quitarCombo = (id: number) =>
    setCombos((prev) => prev.filter((c) => c.promocion_id !== id));

  const totalProductos = carrito.reduce(
    (acumulado, linea) => acumulado + (Number(buscarProducto(linea.producto_id)?.valor) || 0) * linea.cantidad,
    0
  );

  const totalCombos = combos.reduce(
    (acumulado, combo) => acumulado + (Number(buscarPromocion(combo.promocion_id)?.precio) || 0) * combo.cantidad,
    0
  );

  const totalCarrito = totalProductos + totalCombos;

  const updateEstado = (id: number, estado: string) => {
    apiClient.patch(`/ventas/${id}/estado`, { estado })
      .then(() => { setVersion((v) => v + 1); load(); })
      .catch(() => alert('No se pudo cambiar el estado.'));
  };

  const verFactura = async (id: number) => {
    const ventana = window.open('', '_blank');

    try {
      const respuesta = await apiClient.get(`/ventas/${id}/recibo.pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([respuesta.data], { type: 'application/pdf' }));

      if (ventana) {
        ventana.location.href = url;
      } else {
        window.open(url, '_blank');
      }

      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      ventana?.close();
      alert('No se pudo abrir la factura.');
    }
  };

  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <h1>{esAdmin ? 'Gestión de Ventas' : 'Caja'}</h1>
          <p className="subtitulo">{new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nueva venta'}
        </button>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Ventas hoy</span>
          <span className="stat-val">{ventasHoy}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Ingresos hoy</span>
          <span className="stat-val stat-val-dinero" title={`$${Math.round(ingresosHoy).toLocaleString('es-CO')}`}>${Math.round(ingresosHoy).toLocaleString('es-CO')}</span>
        </div>
        {esAdmin && (
          <>
            <div className="stat-card">
              <span className="stat-label">Total ventas</span>
              <span className="stat-val">{totalVentas}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Ingresos totales</span>
              <span className="stat-val stat-val-dinero" title={`$${Math.round(ingresosTotal).toLocaleString('es-CO')}`}>${Math.round(ingresosTotal).toLocaleString('es-CO')}</span>
            </div>
          </>
        )}
      </div>

      {esAdmin && (
        <VentasGraficas
          datos={stats}
          cargando={cargandoStats}
          error={errorStats}
          dias={dias}
          onCambiarDias={setDias}
        />
      )}

      {showForm && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 28, marginBottom: 28, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--text-900)' }}>Registrar Venta</h3>
          <div className="grid-registro">
            <div className="form-group">
              <label>Producto</label>
              <select value={productoId} onChange={(e) => setProductoId(Number(e.target.value))}>
                <option value={0}>Seleccionar...</option>
                {(productos ?? []).map((p) => <option key={p?.id ?? p?.nombre} value={p?.id}>{p?.nombre ?? 'Sin nombre'} — ${Number(p?.valor || 0).toLocaleString('es-CO')}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Cantidad</label>
              <input
                type="number"
                min={1}
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') agregarAlCarrito(); }}
              />
            </div>
          </div>

          <button
            type="button"
            className="btn-cancel"
            onClick={agregarAlCarrito}
            disabled={!productoId}
            style={{ marginTop: 4, padding: '8px 18px', fontSize: 13, opacity: productoId ? 1 : 0.5, cursor: productoId ? 'pointer' : 'not-allowed' }}
          >
            Agregar producto
          </button>

          <div className="grid-registro" style={{ marginTop: 18 }}>
            <div className="form-group">
              <label>Combo (opcional)</label>
              <select value={promocionId} onChange={(e) => setPromocionId(Number(e.target.value))}>
                <option value={0}>Seleccionar combo...</option>
                {(promociones ?? [])
                  .filter((p) => p?.estado === 'Activa')
                  .map((p) => (
                    <option key={p?.id} value={p?.id}>
                      {p?.nombre ?? 'Combo'} — ${Number(p?.precio || 0).toLocaleString('es-CO')}
                    </option>
                  ))}
              </select>
            </div>
            <div className="form-group">
              <label>Cantidad de combos</label>
              <input
                type="number"
                min={1}
                value={cantidadCombo}
                onChange={(e) => setCantidadCombo(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') agregarCombo(); }}
              />
            </div>
          </div>

          <button
            type="button"
            className="btn-cancel"
            onClick={agregarCombo}
            disabled={!promocionId}
            style={{ marginTop: 4, padding: '8px 18px', fontSize: 13, opacity: promocionId ? 1 : 0.5, cursor: promocionId ? 'pointer' : 'not-allowed' }}
          >
            Agregar combo
          </button>

          <div style={{ marginTop: 18 }}>
            {carrito.length === 0 && combos.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-400)', margin: 0 }}>Aún no has agregado productos ni combos.</p>
            ) : (
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                {carrito.map((linea) => {
                  const prod = buscarProducto(linea.producto_id);
                  return (
                    <div
                      key={linea.producto_id}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px', borderBottom: '1px solid var(--border)', fontSize: 13 }}
                    >
                      <span style={{ flex: 1, fontWeight: 600, color: 'var(--text-900)' }}>{prod?.nombre ?? 'Producto'}</span>
                      <span style={{ color: 'var(--text-600)' }}>x{linea.cantidad}</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-900)', minWidth: 80, textAlign: 'right' }}>
                        ${((Number(prod?.valor) || 0) * linea.cantidad).toLocaleString('es-CO')}
                      </span>
                      <button
                        type="button"
                        onClick={() => quitarDelCarrito(linea.producto_id)}
                        title="Quitar producto"
                        style={{ border: 'none', background: 'transparent', color: '#c0392b', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
                {combos.map((combo) => {
                  const promo = buscarPromocion(combo.promocion_id);
                  return (
                    <div
                      key={`combo-${combo.promocion_id}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px', borderBottom: '1px solid var(--border)', fontSize: 13, background: 'rgba(232, 98, 44, 0.04)' }}
                    >
                      <span style={{ flex: 1, fontWeight: 600, color: 'var(--text-900)' }}>
                        {promo?.nombre ?? 'Combo'}{' '}
                        <span className="badge badge-info" style={{ fontSize: 10 }}>Combo</span>
                      </span>
                      <span style={{ color: 'var(--text-600)' }}>x{combo.cantidad}</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-900)', minWidth: 80, textAlign: 'right' }}>
                        ${((Number(promo?.precio) || 0) * combo.cantidad).toLocaleString('es-CO')}
                      </span>
                      <button
                        type="button"
                        onClick={() => quitarCombo(combo.promocion_id)}
                        title="Quitar combo"
                        style={{ border: 'none', background: 'transparent', color: '#c0392b', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid-registro" style={{ marginTop: 8 }}>
            <div className="form-group">
              <label>Método de pago</label>
              <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Tipo de entrega</label>
              <select value={tipoEntrega} onChange={(e) => setTipoEntrega(e.target.value)}>
                {TIPOS_ENTREGA.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Cliente (opcional)</label>
              <input
                type="text"
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                placeholder="Nombre del cliente o dejar vacío"
                maxLength={150}
              />
            </div>
          </div>

          {carrito.length > 0 || combos.length > 0 ? (
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-900)', marginBottom: 2 }}>
              Total: ${totalCarrito.toLocaleString('es-CO')}
            </p>
          ) : null}
          <div className="modal-actions" style={{ marginTop: 8 }}>
            <button className="btn-cancel" onClick={cerrarFormulario}>Cancelar</button>
            <button
              className="btn-save"
              onClick={save}
              disabled={carrito.length === 0 && combos.length === 0}
              style={{ opacity: carrito.length || combos.length ? 1 : 0.5, cursor: carrito.length || combos.length ? 'pointer' : 'not-allowed' }}
            >
              Registrar
            </button>
          </div>
        </div>
      )}

      <div className="search-bar">
        <input placeholder="Buscar venta..." value={q} onChange={(e) => { setQ(e.target.value); setPagina(1); }} />
      </div>

      <div className="tabla-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Cliente</th>
              <th>Productos</th>
              <th>Total</th>
              <th>Método</th>
              <th>Estado</th>
              <th>Factura</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((v) => (
              <tr key={v?.id}>
                <td>{v?.id}</td>
                <td style={{ fontWeight: 600 }}>{nombreCliente(v) || '—'}</td>
                <td>
                  <div className="venta-detalles">
                    {(v?.detalles ?? []).map((d, i) => (
                      <span key={`${d?.id}-${i}`} style={{ fontSize: 12, color: 'var(--text-600)' }}>
                        {d?.producto?.nombre ?? 'Producto'} x{d?.cantidad ?? 0}
                      </span>
                    ))}
                    {(v?.promociones ?? []).map((p, i) => (
                      <span key={`${p?.id}-${i}`} className="badge badge-info" style={{ fontSize: 10 }}>{p?.nombre}</span>
                    ))}
                  </div>
                </td>
                <td style={{ fontWeight: 700 }}>${Number(v?.valor_total || 0).toLocaleString('es-CO')}</td>
                <td><span className="badge badge-info">{v?.metodo_pago ?? ''}</span></td>
                <td>
                  <select
                    value={v?.estado ?? ''}
                    onChange={(e) => updateEstado(v.id, e.target.value)}
                    style={{ padding: '4px 8px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    {ESTADOS.map((e) => (
                      <option key={e} value={e} disabled={!esAdmin && e === 'Reembolsada'}>{e}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn-save"
                    style={{ padding: '5px 10px', fontSize: 12, whiteSpace: 'nowrap' }}
                    onClick={() => verFactura(v.id)}
                  >
                    Ver factura
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>No se encontraron ventas</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Paginacion total={filtered.length} pagina={paginaActual} onCambiar={setPagina} />
    </div>
  );
}