import { useEffect, useState } from 'react';
import apiClient from '../../api/client';

interface DetalleVenta {
  id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  producto?: { id?: number; nombre?: string };
}

interface PromocionVenta {
  id: number;
  nombre?: string;
}

interface Venta {
  id: number;
  fecha: string;
  valor_total: number;
  metodo_pago: string;
  estado: string;
  tipo_entrega?: string;
  detalles?: DetalleVenta[];
  promociones?: PromocionVenta[];
}

interface Producto {
  id: number;
  nombre: string;
  valor: number;
}

const METODOS = ['Efectivo', 'Tarjeta', 'Transferencia', 'Nequi', 'Daviplata', 'PSE'];
const TIPOS_ENTREGA = ['Recoger', 'Domicilio', 'Consumir'];
const ESTADOS = ['En cocina', 'En barra', 'En camino', 'Listo para recoger', 'Entregado', 'Pendiente de pago', 'Pagado', 'Cancelado'];

function unwrap<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: T[] }).data;
  }
  return [];
}

export default function VentasAdmin() {
  const [items, setItems] = useState<Venta[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [tipoEntrega, setTipoEntrega] = useState('Recoger');
  const [productoId, setProductoId] = useState<number>(0);
  const [cantidad, setCantidad] = useState('1');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      // /pedidos trae detalles.producto; /ventas no trae detalles
      apiClient.get('/pedidos'),
      apiClient.get('/productos'),
    ]).then(([r1, r2]) => {
      setItems(unwrap<Venta>(r1.data));
      setProductos(
        unwrap<Record<string, unknown>>(r2.data).map((p) => ({
          id: Number(p.id ?? p.id_producto ?? 0),
          nombre: String(p.nombre ?? p.nombre_producto ?? ''),
          valor: Number(p.valor ?? p.valor_producto ?? 0),
        }))
      );
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const qLower = q.toLowerCase();
  const filtered = items.filter((v) =>
    String(v.id ?? '').includes(q) ||
    (v.detalles ?? []).some((d) => (d.producto?.nombre ?? '').toLowerCase().includes(qLower))
  );

  const hoy = new Date().toISOString().slice(0, 10);
  const ventasHoy = items.filter((v) => (v.fecha ?? '').slice(0, 10) === hoy);
  const ingresosHoy = ventasHoy.reduce((a, v) => a + Number(v.valor_total ?? 0), 0);
  const ingresosTotal = items.reduce((a, v) => a + Number(v.valor_total ?? 0), 0);

  const save = () => {
    if (!productoId) return;
    const body = {
      carrito: [{ producto_id: productoId, cantidad: Math.max(1, Number(cantidad) || 1) }],
      metodo_pago: metodoPago,
      tipo_entrega: tipoEntrega,
    };
    apiClient.post('/ventas', body).then(() => {
      setShowForm(false);
      setProductoId(0);
      setCantidad('1');
      load();
    }).catch(() => {
      alert('No se pudo registrar la venta (revisa stock y sesión).');
    });
  };

  const updateEstado = (id: number, estado: string) => {
    apiClient.patch(`/ventas/${id}/estado`, { estado })
      .then(() => load())
      .catch(() => alert('No se pudo actualizar el estado.'));
  };

  const cancelar = (id: number) => {
    if (!confirm('¿Cancelar esta venta?')) return;
    updateEstado(id, 'Cancelado');
  };

  const selectedProd = productos.find((p) => p.id === productoId);

  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <h1>Gestión de Ventas</h1>
          <p className="subtitulo">{new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nueva venta'}
        </button>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Ventas hoy</span>
          <span className="stat-val">{ventasHoy.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Ingresos hoy</span>
          <span className="stat-val">${ingresosHoy.toLocaleString()}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total ventas</span>
          <span className="stat-val">{items.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Ingresos totales</span>
          <span className="stat-val">${ingresosTotal.toLocaleString()}</span>
        </div>
      </div>

      {showForm && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 28, marginBottom: 28, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--text-900)' }}>Registrar Venta</h3>
          <div className="grid-registro">
            <div className="form-group">
              <label>Producto</label>
              <select value={productoId} onChange={(e) => setProductoId(Number(e.target.value))}>
                <option value={0}>Seleccionar...</option>
                {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre} — ${Number(p.valor).toLocaleString()}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Cantidad</label>
              <input type="number" min={1} value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Método de pago</label>
              <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Tipo de entrega</label>
              <select value={tipoEntrega} onChange={(e) => setTipoEntrega(e.target.value)}>
                {TIPOS_ENTREGA.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          {selectedProd && (
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-900)' }}>
              Subtotal: ${(Number(selectedProd.valor) * Number(cantidad || 0)).toLocaleString()}
            </p>
          )}
          <div className="modal-actions" style={{ marginTop: 8 }}>
            <button className="btn-cancel" onClick={() => setShowForm(false)}>Cancelar</button>
            <button className="btn-save" onClick={save}>Registrar</button>
          </div>
        </div>
      )}

      <div className="search-bar">
        <input placeholder="Buscar venta..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-400)', padding: 20 }}>Cargando...</p>
      ) : (
        <div className="tabla-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Productos</th>
              <th>Total</th>
              <th>Método</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => (
              <tr key={v.id}>
                <td>{v.id}</td>
                <td>
                  <div className="venta-detalles">
                    {(v.detalles ?? []).map((d) => (
                      <span key={d.id} style={{ fontSize: 12, color: 'var(--text-600)' }}>
                        {d.producto?.nombre ?? 'Producto'} x{d.cantidad}
                      </span>
                    ))}
                    {(v.promociones ?? []).map((p) => (
                      <span key={p.id} className="badge badge-info" style={{ fontSize: 10 }}>{p.nombre ?? 'Promo'}</span>
                    ))}
                    {(v.detalles ?? []).length === 0 && (v.promociones ?? []).length === 0 && (
                      <span style={{ fontSize: 12, color: 'var(--text-400)' }}>—</span>
                    )}
                  </div>
                </td>
                <td style={{ fontWeight: 700 }}>${Number(v.valor_total ?? 0).toLocaleString()}</td>
                <td><span className="badge badge-info">{v.metodo_pago ?? '—'}</span></td>
                <td>
                  <select
                    value={v.estado}
                    onChange={(e) => updateEstado(v.id, e.target.value)}
                    style={{ padding: '4px 8px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    {ESTADOS.map((e) => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <button className="btn-icon btn-icon-del" onClick={() => cancelar(v.id)} title="Cancelar">🗑</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>No se encontraron ventas</td></tr>
            )}
          </tbody>
        </table>

        </div>
      )}
    </div>
  );
}
