import { useEffect, useState } from 'react';
import apiClient from '../../api/client';

interface DetalleVenta {
  id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  producto?: { nombre_producto: string };
}

interface PromocionVenta {
  id: number;
  nombre_promo: string;
  valor_promo: number;
}

interface Venta {
  id: number;
  fecha: string;
  valor_total: number;
  metodo_pago: string;
  estado: string;
  tipo_entrega: string;
  usuario?: { nombre_usuario: string; apellido_usuario: string };
  detalles: DetalleVenta[];
  promociones: PromocionVenta[];
}

interface Producto {
  id_producto: number;
  nombre_producto: string;
  valor_producto: number;
}

const METODOS = ['Efectivo', 'Tarjeta', 'Transferencia', 'Nequi', 'Daviplata'];

export default function VentasAdmin() {
  const [items, setItems] = useState<Venta[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [productoId, setProductoId] = useState<number>(0);
  const [cantidad, setCantidad] = useState('1');
  const [loading, setLoading] = useState(true);

  const load = () => {
    Promise.all([
      apiClient.get<Venta[]>('/ventas'),
      apiClient.get<Producto[]>('/productos'),
    ]).then(([r1, r2]) => {
      setItems(r1.data);
      setProductos(r2.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter((v) =>
    String(v.id).includes(q) ||
    `${v.usuario?.nombre_usuario ?? ''} ${v.usuario?.apellido_usuario ?? ''}`.toLowerCase().includes(q.toLowerCase())
  );

  const ventasHoy = items.filter((v) => v.fecha === new Date().toISOString().slice(0, 10));
  const ingresosHoy = ventasHoy.reduce((a, v) => a + Number(v.valor_total), 0);
  const ingresosTotal = items.reduce((a, v) => a + Number(v.valor_total), 0);

  const save = () => {
    if (!productoId) return;
    const prod = productos.find((p) => p.id_producto === productoId);
    if (!prod) return;
    const body = {
      metodo_pago: metodoPago,
      items: [{ producto_id: productoId, cantidad: Number(cantidad), precio_unitario: Number(prod.valor_producto) }],
    };
    apiClient.post('/ventas', body).then(() => {
      setShowForm(false);
      setProductoId(0);
      setCantidad('1');
      load();
    });
  };

  const updateEstado = (id: number, estado: string) => {
    apiClient.put(`/ventas/${id}`, { estado }).then(() => load());
  };

  const del = (id: number) => {
    if (!confirm('¿Eliminar esta venta?')) return;
    apiClient.delete(`/ventas/${id}`).then(() => load());
  };

  const selectedProd = productos.find((p) => p.id_producto === productoId);

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
                {productos.map((p) => <option key={p.id_producto} value={p.id_producto}>{p.nombre_producto} — ${Number(p.valor_producto).toLocaleString()}</option>)}
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
          </div>
          {selectedProd && (
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-900)' }}>
              Subtotal: ${(Number(selectedProd.valor_producto) * Number(cantidad)).toLocaleString()}
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
              <th>Cliente</th>
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
                <td style={{ fontWeight: 600 }}>{v.usuario?.nombre_usuario} {v.usuario?.apellido_usuario}</td>
                <td>
                  <div className="venta-detalles">
                    {v.detalles.map((d) => (
                      <span key={d.id} style={{ fontSize: 12, color: 'var(--text-600)' }}>
                        {d.producto?.nombre_producto} x{d.cantidad}
                      </span>
                    ))}
                    {v.promociones?.map((p) => (
                      <span key={p.id} className="badge badge-info" style={{ fontSize: 10 }}>{p.nombre_promo}</span>
                    ))}
                  </div>
                </td>
                <td style={{ fontWeight: 700 }}>${Number(v.valor_total).toLocaleString()}</td>
                <td><span className="badge badge-info">{v.metodo_pago}</span></td>
                <td>
                  <select
                    value={v.estado}
                    onChange={(e) => updateEstado(v.id, e.target.value)}
                    style={{ padding: '4px 8px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    {['En cocina', 'En barra', 'En camino', 'Listo para recoger', 'Entregado', 'Pendiente de pago', 'Pagado', 'Cancelado'].map((e) => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <button className="btn-icon btn-icon-del" onClick={() => del(v.id)} title="Eliminar">🗑</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>No se encontraron ventas</td></tr>
            )}
          </tbody>
        </table>

        </div>
      )}
    </div>
  );
}
