import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import ToastMessage, { useToast } from '../../components/Toast';
import AdminLoading from '../../components/AdminLoading';

interface Producto {
  id: number;
  nombre: string;
  valor: number;
  descripcion: string;
  img: string;
  categoria: string | number;
}

const CATEGORIAS = [
  'Hamburguesa', 'Perros Caliente', 'Salchipapa', 'Fritos',
  'Arepas', 'Picada', 'Bebidas Frias', 'Bebidas Calientes', 'Pizza',
];

// El backend devuelve categoria como texto ("Hamburguesa"), pero datos viejos
// pueden traerla como número (1-9). Normaliza ambos a nombre.
const catNombre = (c: unknown): string => {
  if (typeof c === 'number') return CATEGORIAS[c - 1] ?? '';
  return (c as string | null | undefined) ?? '';
};

const emptyForm = {
  nombre: '',
  valor: '',
  descripcion: '',
  img: '',
  categoria: 'Hamburguesa',
};

function ThumbProducto({ img, nombre }: { img?: string | null; nombre?: string | null }) {
  const [err, setErr] = useState(false);
  const inicial = (nombre ?? '').charAt(0).toUpperCase() || '?';
  if (!img || err) {
    return (
      <span style={{
        width: 42, height: 42, borderRadius: 10, background: 'var(--brand)',
        color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 17, flexShrink: 0,
      }}>
        {inicial}
      </span>
    );
  }
  return (
    <img
      src={img ?? ''}
      alt={nombre ?? 'Producto'}
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
      const data = Array.isArray(r.data) ? r.data : (r.data as unknown as { data?: Producto[] })?.data ?? [];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      showToast('No se pudieron cargar los productos', true);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = (items ?? []).filter((p) =>
    (catFiltro === 0 || catNombre(p?.categoria) === CATEGORIAS[catFiltro - 1]) &&
    (p?.nombre ?? '').toLowerCase().includes((q ?? '').toLowerCase())
  );

  const grouped = CATEGORIAS.reduce<Record<string, Producto[]>>((acc, cat) => {
    const prods = filtered.filter((p) => catNombre(p?.categoria) === cat);
    if (prods.length > 0) acc[cat] = prods;
    return acc;
  }, {});

  // Productos con categoria desconocida/vacía: van a "Otras" para que nunca desaparezcan
  const sinCategoria = filtered.filter((p) => !CATEGORIAS.includes(catNombre(p?.categoria)));
  if (sinCategoria.length > 0) grouped['Otras'] = sinCategoria;

  const openNew = () => { setForm(emptyForm); setEditId(null); setModal(true); };

  const openEdit = (p: Producto) => {
    setForm({
      nombre: p.nombre ?? '',
      valor: String(p.valor ?? ''),
      descripcion: p.descripcion ?? '',
      img: p.img ?? '',
      categoria: catNombre(p.categoria) || 'Hamburguesa',
    });
    setEditId(p.id);
    setModal(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) { showToast('El nombre es obligatorio', true); return; }
    if (Number(form.valor) < 0) { showToast('El precio no puede ser negativo', true); return; }
    // El backend valida categoria como texto (in:Hamburguesa,...), no número
    const body = { ...form, valor: Number(form.valor) || 0, categoria: catNombre(form.categoria) || 'Hamburguesa' };
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
    const p = items.find((x) => x.id === id);
    if (!confirm(`¿Eliminar "${p?.nombre  ?? id}"?`)) return;
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
        <AdminLoading texto="Cargando menú" subtexto="Preparando tus productos" />
      ) : Object.keys(grouped).length === 0 ? (
        <p style={{ textAlign: 'center', padding: 40, color: 'var(--text-400)' }}>No se encontraron productos</p>
      ) : (
        Object.entries(grouped).map(([cat, prods]) => (
          <div key={cat} style={{ marginBottom: 28 }}>
            <div className="meta-bar">
              <span>{cat} ({prods.length})</span>
            </div>
            <div className="tabla-responsive">
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
                    <tr key={p.id ?? p.nombre ?? Math.random()}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <ThumbProducto img={p.img} nombre={p.nombre} />
                          <span style={{ fontWeight: 600 }}>{p.nombre ?? 'Sin nombre'}</span>
                        </div>
                      </td>
                      <td>${Number(p.valor ?? 0).toLocaleString()}</td>
                      <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.descripcion || '—'}
                      </td>
                      <td>
                        <button className="btn-icon btn-icon-edit" onClick={() => openEdit(p)} title="Editar">✏</button>
                        <button className="btn-icon btn-icon-del" onClick={() => del(p.id)} title="Eliminar" style={{ marginLeft: 6 }}>🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {modal && (
        <div className="modal-overlay open" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2>{editId ? 'Editar Producto' : 'Nuevo Producto'}</h2>
            <div className="form-group">
              <label>Nombre</label>
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Hamburguesa Criolla" />
            </div>
            <div className="form-group">
              <label>Precio</label>
              <input type="number" min={0} value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Imagen (URL)</label>
              <input value={form.img} onChange={(e) => setForm({ ...form, img: e.target.value })} placeholder="https://..." />
              <div className="logo-preview-wrap">
                {form.img ? (
                  <img src={form.img} alt="Vista previa" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <span style={{ color: 'var(--text-400)', fontSize: 12 }}>Sin imagen</span>
                )}
              </div>
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Categoría</label>
              <select value={catNombre(form.categoria) || 'Hamburguesa'} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>{c}</option>
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