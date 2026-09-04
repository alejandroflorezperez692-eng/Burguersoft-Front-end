import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import ToastMessage, { useToast } from '../../components/Toast';

// La API Laravel devuelve: id, nombre, valor, descripcion, img, cantidad, categoria, estado
interface ProductoApi {
  id?: number;
  id_producto?: number;
  nombre?: string;
  nombre_producto?: string;
  valor?: number | string;
  valor_producto?: number | string;
  descripcion?: string;
  descri_producto?: string;
  img?: string;
  img_producto?: string;
  cantidad?: string | number;
  categoria?: string;
  id_categoria?: number;
  estado?: string;
}

interface Producto {
  id: number;
  nombre: string;
  valor: number;
  descripcion: string;
  img: string;
  cantidad: string;
  categoria: string;
  estado: string;
}

const CATEGORIAS = [
  'Hamburguesa', 'Perros Caliente', 'Salchipapa', 'Fritos',
  'Arepas', 'Picada', 'Bebidas Frias', 'Bebidas Calientes', 'Pizza',
];

const emptyForm = {
  nombre: '',
  valor: '',
  descripcion: '',
  img: '',
  cantidad: '',
  categoria: 'Hamburguesa',
  estado: 'Disponible',
};

function normalize(p: ProductoApi): Producto {
  return {
    id: Number(p.id ?? p.id_producto ?? 0),
    nombre: p.nombre ?? p.nombre_producto ?? '',
    valor: Number(p.valor ?? p.valor_producto ?? 0),
    descripcion: p.descripcion ?? p.descri_producto ?? '',
    img: p.img ?? p.img_producto ?? '',
    cantidad: String(p.cantidad ?? '0'),
    categoria: p.categoria ?? (p.id_categoria ? CATEGORIAS[p.id_categoria - 1] ?? '' : ''),
    estado: p.estado ?? 'Disponible',
  };
}

function ThumbProducto({ img, nombre }: { img: string; nombre: string }) {
  const [err, setErr] = useState(false);
  const letra = (nombre ?? '').charAt(0).toUpperCase() || '?';
  if (!img || err) {
    return (
      <span style={{
        width: 42, height: 42, borderRadius: 10, background: 'var(--brand)',
        color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 17, flexShrink: 0,
      }}>
        {letra}
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
  const [catFiltro, setCatFiltro] = useState('Todas');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast, showToast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiClient.get<ProductoApi[]>('/productos');
      const data = Array.isArray(r.data) ? r.data : [];
      setItems(data.map(normalize));
    } catch {
      showToast('No se pudieron cargar los productos', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter((p) =>
    (catFiltro === 'Todas' || p.categoria === catFiltro) &&
    (p.nombre ?? '').toLowerCase().includes(q.toLowerCase())
  );

  const grouped = CATEGORIAS.reduce<Record<string, Producto[]>>((acc, cat) => {
    const prods = filtered.filter((p) => p.categoria === cat);
    if (prods.length > 0) acc[cat] = prods;
    return acc;
  }, {});
  const sinCategoria = filtered.filter((p) => !p.categoria || !CATEGORIAS.includes(p.categoria));
  if (sinCategoria.length > 0) grouped['Sin categoría'] = sinCategoria;

  const openNew = () => { setForm(emptyForm); setEditId(null); setModal(true); };

  const openEdit = (p: Producto) => {
    setForm({
      nombre: p.nombre,
      valor: String(p.valor),
      descripcion: p.descripcion,
      img: p.img ?? '',
      cantidad: p.cantidad,
      categoria: p.categoria || 'Hamburguesa',
      estado: p.estado || 'Disponible',
    });
    setEditId(p.id);
    setModal(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) { showToast('El nombre es obligatorio', true); return; }
    if (Number(form.valor) < 0) { showToast('El precio no puede ser negativo', true); return; }
    const body = {
      nombre: form.nombre.trim(),
      valor: Number(form.valor) || 0,
      descripcion: form.descripcion || null,
      img: form.img || null,
      cantidad: form.cantidad === '' ? 0 : Number(form.cantidad),
      categoria: form.categoria,
      estado: form.estado,
    };
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
    if (!confirm(`¿Eliminar "${p?.nombre ?? id}"?`)) return;
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
          <button className={`chip-filtro${catFiltro === 'Todas' ? ' active' : ''}`} onClick={() => setCatFiltro('Todas')}>Todas</button>
          {CATEGORIAS.map((c) => (
            <button
              key={c}
              className={`chip-filtro${catFiltro === c ? ' active' : ''}`}
              onClick={() => setCatFiltro(c)}
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
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <ThumbProducto img={p.img} nombre={p.nombre} />
                          <span style={{ fontWeight: 600 }}>{p.nombre}</span>
                        </div>
                      </td>
                      <td>${Number(p.valor).toLocaleString()}</td>
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
              <label>Cantidad</label>
              <input type="number" min={0} value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Categoría</label>
              <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                <option value="Disponible">Disponible</option>
                <option value="Agotado">Agotado</option>
                <option value="Por agotarse">Por agotarse</option>
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
