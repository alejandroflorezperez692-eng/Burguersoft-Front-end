import { useEffect, useState } from 'react';
import apiClient from '../../api/client';

interface Producto {
  id: number;
  nombre: string;
}

interface Promocion {
  id: number;
  nombre_promo: string;
  descripcion_promo: string;
  valor_promo: number;
  img_promo: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  productos: Producto[];
}

const emptyForm = {
  nombre_promo: '', descripcion_promo: '', valor_promo: '',
  fecha_inicio: '', fecha_fin: '', estado: 'Activa',
};

export default function PromocionesAdmin() {
  const [items, setItems] = useState<Promocion[]>([]);
  const [allProducts, setAllProducts] = useState<Producto[]>([]);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedProds, setSelectedProds] = useState<number[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    Promise.all([
      apiClient.get<Promocion[]>('/promociones'),
      apiClient.get('/productos'),
    ]).then(([r1, r2]) => {
      setItems(r1.data);
      setAllProducts(r2.data.map((p: { id_producto: number; nombre_producto: string }) => ({ id: p.id_producto, nombre: p.nombre_producto })));
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter((p) =>
    p.nombre_promo.toLowerCase().includes(q.toLowerCase())
  );

  const openNew = () => {
    setForm(emptyForm);
    setSelectedProds([]);
    setEditId(null);
    setModal(true);
  };

  const openEdit = (p: Promocion) => {
    setForm({
      nombre_promo: p.nombre_promo,
      descripcion_promo: p.descripcion_promo,
      valor_promo: String(p.valor_promo),
      fecha_inicio: p.fecha_inicio?.slice(0, 10) ?? '',
      fecha_fin: p.fecha_fin?.slice(0, 10) ?? '',
      estado: p.estado,
    });
    setSelectedProds(p.productos.map((pr) => pr.id));
    setEditId(p.id);
    setModal(true);
  };

  const toggleProd = (id: number) => {
    setSelectedProds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const save = () => {
    const body = {
      ...form,
      valor_promo: Number(form.valor_promo),
      productos_ids: selectedProds,
    };
    if (editId) {
      apiClient.put(`/promociones/${editId}`, body).then(() => { setModal(false); load(); });
    } else {
      apiClient.post('/promociones', body).then(() => { setModal(false); load(); });
    }
  };

  const del = (id: number) => {
    if (!confirm('¿Eliminar esta promoción?')) return;
    apiClient.delete(`/promociones/${id}`).then(() => load());
  };

  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <h1>Combos y Promociones</h1>
          <p className="subtitulo">{items.length} promociones activas</p>
        </div>
        <button className="btn-primary" onClick={openNew}>+ Añadir promoción</button>
      </div>

      <div className="search-bar">
        <input placeholder="Buscar promoción..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="meta-bar">
        <span>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-400)', padding: 20 }}>Cargando...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {filtered.map((p) => (
            <div key={p.id} style={{
              background: 'var(--surface)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)', padding: 22, display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, color: 'var(--text-900)', margin: 0 }}>{p.nombre_promo}</h3>
                <span className={`badge ${p.estado === 'Activa' ? 'badge-success' : 'badge-gray'}`}>{p.estado}</span>
              </div>
              {p.descripcion_promo && <p style={{ fontSize: 13, color: 'var(--text-400)', margin: 0 }}>{p.descripcion_promo}</p>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {p.productos.map((pr) => (
                  <span key={pr.id} className="badge badge-info" style={{ fontSize: 10 }}>{pr.nombre}</span>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 800, color: 'var(--brand)' }}>${Number(p.valor_promo).toLocaleString()}</span>
                <div>
                  <button className="btn-icon btn-icon-edit" onClick={() => openEdit(p)} title="Editar">✏</button>
                  <button className="btn-icon btn-icon-del" onClick={() => del(p.id)} title="Eliminar" style={{ marginLeft: 6 }}>🗑</button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: 'var(--text-400)' }}>No se encontraron promociones</p>
          )}
        </div>
      )}

      {modal && (
        <div className="modal-overlay open" onClick={() => setModal(false)}>
          <div className="modal-box" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <h2>{editId ? 'Editar Promoción' : 'Nueva Promoción'}</h2>
            <div className="form-group">
              <label>Nombre</label>
              <input value={form.nombre_promo} onChange={(e) => setForm({ ...form, nombre_promo: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <textarea value={form.descripcion_promo} onChange={(e) => setForm({ ...form, descripcion_promo: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Precio del combo</label>
              <input type="number" value={form.valor_promo} onChange={(e) => setForm({ ...form, valor_promo: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Fecha inicio</label>
                <input type="date" value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Fecha fin</label>
                <input type="date" value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Productos del combo</label>
              <div style={{ maxHeight: 160, overflowY: 'auto', border: '1.5px solid var(--border)', borderRadius: 'var(--r-sm)', padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {allProducts.map((p) => (
                  <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--text-900)' }}>
                    <input type="checkbox" checked={selectedProds.includes(p.id)} onChange={() => toggleProd(p.id)} />
                    {p.nombre}
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-save" onClick={save}>{editId ? 'Actualizar' : 'Crear'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
