import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import ToastMessage, { useToast } from '../../components/Toast';

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
  img_producto: '',
  id_categoria: 1,
};

function ThumbProducto({ img, nombre }: { img: string; nombre: string }) {
  const [err, setErr] = useState(false);
  if (!img || err) {
    return (
      <span style={{
        width: 42, height: 42, borderRadius: 10, background: 'var(--brand)',
        color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 17, flexShrink: 0,
      }}>
        {nombre.charAt(0).toUpperCase()}
      </span>
    );
  }
  return (
    <img
      src={img}
      alt={nombre}
      onError={() => setErr(true)}
      style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
    />
  );
}

export default function MenuAdmin() {
  const [items, setItems] = useState<Producto[]>([]);
  const [q, setQ] = useState('');
  const [catFiltro, setCatFiltro] = useState(0);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast, showToast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiClient.get<Producto[]>('/productos');
      setItems(r.data);
    } catch {
      showToast('No se pudieron cargar los productos', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter((p) =>
    (catFiltro === 0 || p.id_categoria === catFiltro) &&
    p.nombre_producto.toLowerCase().includes(q.toLowerCase())
  );

  const grouped = CATEGORIAS.reduce<Record<string, Producto[]>>((acc, cat, i) => {
    const prods = filtered.filter((p) => p.id_categoria === i + 1);
    if (prods.length > 0) acc[cat] = prods;
    return acc;
  }, {});

  const openNew = () => { setForm(emptyForm); setEditId(null); setModal(true); };

  const openEdit = (p: Producto) => {
    setForm({
      nombre_producto: p.nombre_producto,
      valor_producto: String(p.valor_producto),
      descri_producto: p.descri_producto,
      img_producto: p.img_producto ?? '',
      id_categoria: p.id_categoria,
    });
    setEditId(p.id_producto);
    setModal(true);
  };

  const guardar = async () => {
    if (!form.nombre_producto.trim()) { showToast('El nombre es obligatorio', true); return; }
    if (Number(form.valor_producto) < 0) { showToast('El precio no puede ser negativo', true); return; }
    const body = { ...form, valor_producto: Number(form.valor_producto) || 0 };
    try {
      if (editId) {
        await apiClient.put(`/productos/${editId}`, body);
        showToast('Producto actualizado');
      } else {
        await apiClient.post('/productos', body);
        showToast('Producto creado');
      }
      setModal(false);
      load();
    } catch {
      showToast('No se pudo guardar el producto', true);
    }
  };

  const del = async (id: number) => {
    const p = items.find((x) => x.id_producto === id);
    if (!confirm(`¿Eliminar "${p?.nombre_producto ?? id}"?`)) return;
    try {
      await apiClient.delete(`/productos/${id}`);
      showToast('Producto eliminado');
      load();
    } catch {
      showToast('No se pudo eliminar el producto', true);
    }
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
        <div className="filter-chips" style={{ flexBasis: '100%', marginBottom: 0 }}>
          <button className={`chip-filtro${catFiltro === 0 ? ' active' : ''}`} onClick={() => setCatFiltro(0)}>Todas</button>
          {CATEGORIAS.map((c, i) => (
            <button
              key={c}
              className={`chip-filtro${catFiltro === i + 1 ? ' active' : ''}`}
              onClick={() => setCatFiltro(i + 1)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-400)', padding: 20 }}>Cargando...</p>
      ) : Object.keys(grouped).length === 0 ? (
        <p style={{ textAlign: 'center', padding: 40, color: 'var(--text-400)' }}>No se encontraron productos</p>
      ) : (
        Object.entries(grouped).map(([cat, prods]) => (
          <div key={cat} style={{ marginBottom: 28 }}>
            <div className="meta-bar">
              <span>{cat} ({prods.length})</span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Precio</th>
                  <th>Descripción</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {prods.map((p) => (
                  <tr key={p.id_producto}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <ThumbProducto img={p.img_producto} nombre={p.nombre_producto} />
                        <span style={{ fontWeight: 600 }}>{p.nombre_producto}</span>
                      </div>
                    </td>
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
              <input value={form.nombre_producto} onChange={(e) => setForm({ ...form, nombre_producto: e.target.value })} placeholder="Ej. Hamburugesa Criolla" />
            </div>
            <div className="form-group">
              <label>Precio</label>
              <input type="number" min={0} value={form.valor_producto} onChange={(e) => setForm({ ...form, valor_producto: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Imagen (URL)</label>
              <input value={form.img_producto} onChange={(e) => setForm({ ...form, img_producto: e.target.value })} placeholder="https://..." />
              <div className="logo-preview-wrap">
                {form.img_producto ? (
                  <img src={form.img_producto} alt="Vista previa" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <span style={{ color: 'var(--text-400)', fontSize: 12 }}>Sin imagen</span>
                )}
              </div>
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
              <button className="btn-save" onClick={guardar}>{editId ? 'Actualizar' : 'Crear'}</button>
            </div>
          </div>
        </div>
      )}

      <ToastMessage toast={toast} />
    </div>
  );
}