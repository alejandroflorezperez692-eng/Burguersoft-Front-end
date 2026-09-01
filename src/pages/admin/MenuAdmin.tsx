import { useEffect, useState } from 'react';
import apiClient from '../../api/client';

interface Producto {
  id_producto: number;
  nombre_producto: string;
  valor_producto: number;
  descri_producto: string;
  img_producto: string;
  id_categoria: number;
}

const CATEGORIAS = [
  'Hamburguesa', 'Perros Caliente', 'Salchipapa', 'Fritos',
  'Arepas', 'Picada', 'Bebidas Frias', 'Bebidas Calientes', 'Pizza',
];

const emptyForm = {
  nombre_producto: '',
  valor_producto: '',
  descri_producto: '',
  id_categoria: 1,
};

export default function MenuAdmin() {
  const [items, setItems] = useState<Producto[]>([]);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    apiClient.get<Producto[]>('/productos').then((r) => { setItems(r.data); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter((p) =>
    p.nombre_producto.toLowerCase().includes(q.toLowerCase())
  );

  const grouped = CATEGORIAS.reduce<Record<string, Producto[]>>((acc, cat) => {
    const prods = filtered.filter((p) => p.id_categoria === CATEGORIAS.indexOf(cat) + 1);
    if (prods.length > 0) acc[cat] = prods;
    return acc;
  }, {});

  const openNew = () => { setForm(emptyForm); setEditId(null); setModal(true); };

  const openEdit = (p: Producto) => {
    setForm({
      nombre_producto: p.nombre_producto,
      valor_producto: String(p.valor_producto),
      descri_producto: p.descri_producto,
      id_categoria: p.id_categoria,
    });
    setEditId(p.id_producto);
    setModal(true);
  };

  const save = () => {
    const body = {
      ...form,
      valor_producto: Number(form.valor_producto),
    };
    if (editId) {
      apiClient.put(`/productos/${editId}`, body).then(() => { setModal(false); load(); });
    } else {
      apiClient.post('/productos', body).then(() => { setModal(false); load(); });
    }
  };

  const del = (id: number) => {
    if (!confirm('¿Eliminar este producto?')) return;
    apiClient.delete(`/productos/${id}`).then(() => load());
  };

  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <h1>Gestión del Menú</h1>
          <p className="subtitulo">{items.length} productos en el catálogo</p>
        </div>
        <button className="btn-primary" onClick={openNew}>+ Nuevo producto</button>
      </div>

      <div className="search-bar">
        <input placeholder="Buscar producto..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-400)', padding: 20 }}>Cargando...</p>
      ) : (
        Object.entries(grouped).map(([cat, prods]) => (
          <div key={cat} style={{ marginBottom: 28 }}>
            <div className="meta-bar">
              <span>{cat} ({prods.length})</span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Precio</th>
                  <th>Descripción</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {prods.map((p) => (
                  <tr key={p.id_producto}>
                    <td>{p.id_producto}</td>
                    <td style={{ fontWeight: 600 }}>{p.nombre_producto}</td>
                    <td>${Number(p.valor_producto).toLocaleString()}</td>
                    <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.descri_producto || '—'}
                    </td>
                    <td>
                      <button className="btn-icon btn-icon-edit" onClick={() => openEdit(p)} title="Editar">✏</button>
                      <button className="btn-icon btn-icon-del" onClick={() => del(p.id_producto)} title="Eliminar" style={{ marginLeft: 6 }}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}

      {modal && (
        <div className="modal-overlay open" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2>{editId ? 'Editar Producto' : 'Nuevo Producto'}</h2>
            <div className="form-group">
              <label>Nombre</label>
              <input value={form.nombre_producto} onChange={(e) => setForm({ ...form, nombre_producto: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Precio</label>
              <input type="number" value={form.valor_producto} onChange={(e) => setForm({ ...form, valor_producto: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <textarea value={form.descri_producto} onChange={(e) => setForm({ ...form, descri_producto: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Categoría</label>
              <select value={form.id_categoria} onChange={(e) => setForm({ ...form, id_categoria: Number(e.target.value) })}>
                {CATEGORIAS.map((c, i) => (
                  <option key={c} value={i + 1}>{c}</option>
                ))}
              </select>
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
