import { useEffect, useState } from 'react';
import apiClient from '../../api/client';

interface DetalleCompra {
  id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  materia_prima_id: number;
  marca_id: number;
  materia_prima?: { nombre_materia: string };
  marca?: { nombre_marca: string };
}

interface Compra {
  id: number;
  fecha: string;
  metodo_pago: string;
  valor_total: number;
  detalles: DetalleCompra[];
}

interface MateriaPrima { idmateria: number; nombre_materia: string; }
interface Marca { idMarca: number; nombre_marca: string; }

interface Linea {
  materia_prima_id: number | null;
  cantidad: string;
  precio_unitario: string;
  marca_id: number;
  nombre_nuevo: string;
  tipo: string;
  unidad_medida: string;
}

const METODOS = ['Efectivo', 'Tarjeta', 'Transferencia', 'Nequi', 'Daviplata'];

export default function ComprasAdmin() {
  const [items, setItems] = useState<Compra[]>([]);
  const [materias, setMaterias] = useState<MateriaPrima[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [lineas, setLineas] = useState<Linea[]>([
    { materia_prima_id: null, cantidad: '', precio_unitario: '', marca_id: 0, nombre_nuevo: '', tipo: '', unidad_medida: '' },
  ]);
  const [modalDetalle, setModalDetalle] = useState<Compra | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    Promise.all([
      apiClient.get<Compra[]>('/compras'),
      apiClient.get<MateriaPrima[]>('/materias-primas'),
      apiClient.get<Marca[]>('/marcas'),
    ]).then(([r1, r2, r3]) => {
      setItems(r1.data);
      setMaterias(r2.data);
      setMarcas(r3.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter((c) =>
    String(c.id).includes(q) || c.metodo_pago.toLowerCase().includes(q.toLowerCase())
  );

  const totalMes = items.filter((c) => {
    const d = new Date(c.fecha);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((a, c) => a + Number(c.valor_total), 0);

  const totalHisto = items.reduce((a, c) => a + Number(c.valor_total), 0);

  const addLinea = () => {
    setLineas([...lineas, { materia_prima_id: null, cantidad: '', precio_unitario: '', marca_id: marcas[0]?.idMarca ?? 0, nombre_nuevo: '', tipo: '', unidad_medida: '' }]);
  };

  const removeLinea = (i: number) => {
    setLineas(lineas.filter((_, idx) => idx !== i));
  };

  const updateLinea = (i: number, field: keyof Linea, value: string | number | null) => {
    const copy = [...lineas];
    copy[i] = { ...copy[i], [field]: value };
    setLineas(copy);
  };

  const total = lineas.reduce((a, l) => a + (Number(l.cantidad) * Number(l.precio_unitario) || 0), 0);

  const save = () => {
    const payload = {
      fecha: new Date().toISOString().slice(0, 10),
      metodo_pago: metodoPago,
      items: lineas.map((l) => ({
        materia_prima_id: l.materia_prima_id,
        cantidad: Number(l.cantidad),
        precio_unitario: Number(l.precio_unitario),
        marca_id: l.marca_id,
        nombre_nuevo: l.materia_prima_id ? undefined : l.nombre_nuevo,
        tipo: l.materia_prima_id ? undefined : l.tipo,
        unidad_medida: l.materia_prima_id ? undefined : l.unidad_medida,
      })),
    };
    apiClient.post('/compras', payload).then(() => {
      setShowForm(false);
      setLineas([{ materia_prima_id: null, cantidad: '', precio_unitario: '', marca_id: marcas[0]?.idMarca ?? 0, nombre_nuevo: '', tipo: '', unidad_medida: '' }]);
      load();
    });
  };

  const del = (id: number) => {
    if (!confirm('¿Eliminar esta compra? Se revertirá el stock.')) return;
    apiClient.delete(`/compras/${id}`).then(() => load());
  };

  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <h1>Gestión de Compras</h1>
          <p className="subtitulo">{items.length} compras registradas</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nueva compra'}
        </button>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Compras este mes</span>
          <span className="stat-val">{items.filter((c) => { const d = new Date(c.fecha); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }).length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Invertido este mes</span>
          <span className="stat-val">${totalMes.toLocaleString()}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total histórico</span>
          <span className="stat-val">${totalHisto.toLocaleString()}</span>
        </div>
      </div>

      {showForm && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 28, marginBottom: 28, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--text-900)' }}>Registrar Compra</h3>
          <div className="form-group">
            <label>Método de pago</label>
            <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
              {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {lineas.map((l, i) => (
            <div key={i} className="grid-lineas">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>{i === 0 ? 'Insumo' : ''}</label>
                <select value={l.materia_prima_id ?? '__nuevo__'} onChange={(e) => updateLinea(i, 'materia_prima_id', e.target.value === '__nuevo__' ? null : Number(e.target.value))}>
                  <option value="__nuevo__">+ Nuevo insumo</option>
                  {materias.map((m) => <option key={m.idmateria} value={m.idmateria}>{m.nombre_materia}</option>)}
                </select>
              </div>
              {l.materia_prima_id === null && (
                <>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Nombre</label>
                    <input value={l.nombre_nuevo} onChange={(e) => updateLinea(i, 'nombre_nuevo', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Unidad</label>
                    <input value={l.unidad_medida} onChange={(e) => updateLinea(i, 'unidad_medida', e.target.value)} />
                  </div>
                </>
              )}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Cantidad</label>
                <input type="number" value={l.cantidad} onChange={(e) => updateLinea(i, 'cantidad', e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Precio Unit.</label>
                <input type="number" value={l.precio_unitario} onChange={(e) => updateLinea(i, 'precio_unitario', e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Proveedor</label>
                <select value={l.marca_id} onChange={(e) => updateLinea(i, 'marca_id', Number(e.target.value))}>
                  {marcas.map((m) => <option key={m.idMarca} value={m.idMarca}>{m.nombre_marca}</option>)}
                </select>
              </div>
              {lineas.length > 1 && (
                <button className="btn-icon btn-icon-del" onClick={() => removeLinea(i)} style={{ marginBottom: 0 }}>✕</button>
              )}
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <button className="btn-primary" onClick={addLinea} style={{ background: 'var(--surface-3)', color: 'var(--text-900)', boxShadow: 'none' }}>+ Agregar insumo</button>
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 18, color: 'var(--text-900)' }}>Total: ${total.toLocaleString()}</span>
          </div>
          <div className="modal-actions" style={{ marginTop: 16 }}>
            <button className="btn-cancel" onClick={() => setShowForm(false)}>Cancelar</button>
            <button className="btn-save" onClick={save}>Registrar Compra</button>
          </div>
        </div>
      )}

      <div className="search-bar">
        <input placeholder="Buscar compra..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-400)', padding: 20 }}>Cargando...</p>
      ) : (
        <div className="tabla-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Método de pago</th>
              <th>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{new Date(c.fecha).toLocaleDateString()}</td>
                <td><span className="badge badge-info">{c.metodo_pago}</span></td>
                <td style={{ fontWeight: 700 }}>${Number(c.valor_total).toLocaleString()}</td>
                <td>
                  <button className="btn-icon btn-icon-edit" onClick={() => setModalDetalle(c)} title="Ver detalle">👁</button>
                  <button className="btn-icon btn-icon-del" onClick={() => del(c.id)} title="Eliminar" style={{ marginLeft: 6 }}>🗑</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>No se encontraron compras</td></tr>
            )}
          </tbody>
        </table>
        </div>
      )}

      {modalDetalle && (
        <div className="modal-overlay open" onClick={() => setModalDetalle(null)}>
          <div className="modal-box" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <h2>Factura Compra #{modalDetalle.id}</h2>
            <p style={{ marginBottom: 8, fontSize: 13, color: 'var(--text-400)' }}>
              {new Date(modalDetalle.fecha).toLocaleDateString()} — {modalDetalle.metodo_pago}
            </p>
            <div className="tabla-responsive" style={{ marginBottom: 16 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Insumo</th>
                    <th>Proveedor</th>
                    <th>Cant.</th>
                    <th>Precio Unit.</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {modalDetalle.detalles.map((d) => (
                    <tr key={d.id}>
                      <td>{d.materia_prima?.nombre_materia ?? 'N/A'}</td>
                      <td>{d.marca?.nombre_marca ?? 'N/A'}</td>
                      <td>{d.cantidad}</td>
                      <td>${Number(d.precio_unitario).toLocaleString()}</td>
                      <td style={{ fontWeight: 600 }}>${Number(d.subtotal).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ textAlign: 'right', fontWeight: 800, fontSize: 16 }}>
              Total: ${Number(modalDetalle.valor_total).toLocaleString()}
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModalDetalle(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
