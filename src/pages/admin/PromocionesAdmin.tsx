import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import ToastMessage, { useToast } from '../../components/Toast';

interface Producto {
  id: number;
  nombre: string;
}

interface PromocionApi {
  id: number;
  nombre?: string;
  nombre_promo?: string;
  descripcion?: string;
  descripcion_promo?: string;
  precio?: number | string;
  valor_promo?: number | string;
  imagen?: string;
  img_promo?: string;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  estado?: string;
  productos?: { id: number; nombre?: string }[];
}

interface Promocion {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  imagen: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  productos: Producto[];
}

const emptyForm = {
  nombre: '', descripcion: '', precio: '', imagen: '',
  fecha_inicio: '', fecha_fin: '', estado: 'Activa',
};

function unwrap<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: T[] }).data;
  }
  return [];
}

function normalize(p: PromocionApi): Promocion {
  return {
    id: Number(p.id),
    nombre: p.nombre ?? p.nombre_promo ?? '',
    descripcion: p.descripcion ?? p.descripcion_promo ?? '',
    precio: Number(p.precio ?? p.valor_promo ?? 0),
    imagen: p.imagen ?? p.img_promo ?? '',
    fecha_inicio: p.fecha_inicio ?? '',
    fecha_fin: p.fecha_fin ?? '',
    estado: p.estado ?? 'Activa',
    productos: Array.isArray(p.productos) ? p.productos.map((pr) => ({
      id: Number(pr.id),
      nombre: pr.nombre ?? '',
    })) : [],
  };
}

const fechaLegible = (f: string | null | undefined) => {
  if (!f || typeof f !== 'string') return '';
  return new Date(f + (f.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function PromocionesAdmin() {
  const [items, setItems] = useState<Promocion[]>([]);
  const [allProducts, setAllProducts] = useState<Producto[]>([]);
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState('todas');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedProds, setSelectedProds] = useState<number[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast, showToast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        apiClient.get('/promociones'),
        apiClient.get('/productos'),
      ]);
      setItems(unwrap<PromocionApi>(r1.data).map(normalize));
      setAllProducts(unwrap<Record<string, unknown>>(r2.data).map((p) => ({
        id: Number(p.id ?? p.id_producto ?? 0),
        nombre: String(p.nombre ?? p.nombre_producto ?? ''),
      })));
    } catch {
      showToast('No se pudieron cargar las promociones', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const est = (p: Promocion) => {
    if (p.estado === 'Inactiva') return 'Inactiva';
    if (p.fecha_fin && new Date(p.fecha_fin) < new Date()) return 'Finalizada';
    return 'Activa';
  };

  const filtered = items.filter((p) =>
    (filtro === 'todas' || est(p) === filtro) &&
    (p.nombre ?? '').toLowerCase().includes(q.toLowerCase())
  );

  const activas = items.filter((p) => est(p) === 'Activa').length;

  const openNew = () => {
    setForm(emptyForm);
    setSelectedProds([]);
    setEditId(null);
    setModal(true);
  };

  const openEdit = (p: Promocion) => {
    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion,
      precio: String(p.precio),
      imagen: p.imagen ?? '',
      fecha_inicio: (p.fecha_inicio ?? '').slice(0, 10),
      fecha_fin: (p.fecha_fin ?? '').slice(0, 10),
      estado: p.estado === 'Inactiva' ? 'Inactiva' : 'Activa',
    });
    setSelectedProds((p.productos ?? []).map((pr) => pr.id));
    setEditId(p.id);
    setModal(true);
  };

  const toggleProd = (id: number) => {
    setSelectedProds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const guardar = async () => {
    if (!form.nombre.trim()) { showToast('El nombre es obligatorio', true); return; }
    if (Number(form.precio) < 0) { showToast('El precio no puede ser negativo', true); return; }
    const body = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion || null,
      precio: Number(form.precio) || 0,
      imagen: form.imagen || null,
      fecha_inicio: form.fecha_inicio || null,
      fecha_fin: form.fecha_fin || null,
      estado: form.estado,
    };
    try {
      if (editId) {
        await apiClient.put(`/promociones/${editId}`, body);
        showToast('Promoción actualizada');
      } else {
        await apiClient.post('/promociones', body);
        showToast('Promoción creada');
      }
      setModal(false);
      load();
    } catch {
      showToast('No se pudo guardar la promoción', true);
    }
  };

  const del = async (id: number) => {
    const p = items.find((x) => x.id === id);
    if (!confirm(`¿Eliminar "${p?.nombre ?? id}"?`)) return;
    try {
      await apiClient.delete(`/promociones/${id}`);
      showToast('Promoción eliminada');
      load();
    } catch {
      showToast('No se pudo eliminar la promoción', true);
    }
  };

  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <h1>Combos y Promociones</h1>
          <p className="subtitulo">{activas} promociones activas</p>
        </div>
        <button className="btn-primary" onClick={openNew}>+ Añadir promoción</button>
      </div>

      <div className="search-bar">
        <input placeholder="Buscar promoción..." value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="filter-chips" style={{ flexBasis: '100%', marginBottom: 0 }}>
          {['todas', 'Activa', 'Inactiva', 'Finalizada'].map((f) => (
            <button key={f} className={`chip-filtro${filtro === f ? ' active' : ''}`} onClick={() => setFiltro(f)}>
              {f === 'todas' ? 'Todas' : f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-400)', padding: 20 }}>Cargando...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {filtered.map((p) => {
            const e = est(p);
            return (
              <div key={p.id} style={{
                background: 'var(--surface)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
              }}>
                {p.imagen && (
                  <div style={{ height: 130, overflow: 'hidden', background: 'var(--surface-3)' }}>
                    <img src={p.imagen} alt={p.nombre} onError={(ev) => { (ev.target as HTMLImageElement).style.display = 'none'; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
                <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, color: 'var(--text-900)', margin: 0 }}>{p.nombre}</h3>
                    <span className={`badge ${e === 'Activa' ? 'badge-success' : 'badge-gray'}`}>{e}</span>
                  </div>
                  {p.descripcion && <p style={{ fontSize: 13, color: 'var(--text-400)', margin: 0 }}>{p.descripcion}</p>}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {(p.productos ?? []).map((pr) => (
                      <span key={pr.id} className="badge badge-info" style={{ fontSize: 10 }}>{pr.nombre}</span>
                    ))}
                  </div>
                  {(p.fecha_inicio || p.fecha_fin) && (
                    <div style={{ fontSize: 12, color: 'var(--text-400)', fontWeight: 500 }}>
                      {fechaLegible(p.fecha_inicio)}{p.fecha_inicio && p.fecha_fin ? ' → ' : ''}{fechaLegible(p.fecha_fin)}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 800, color: 'var(--brand)' }}>${Number(p.precio).toLocaleString()}</span>
                    <div>
                      <button className="btn-icon btn-icon-edit" onClick={() => openEdit(p)} title="Editar">✏</button>
                      <button className="btn-icon btn-icon-del" onClick={() => del(p.id)} title="Eliminar" style={{ marginLeft: 6 }}>🗑</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Combo Familiar" />
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Precio del combo</label>
              <input type="number" min={0} value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Imagen (URL)</label>
              <input value={form.imagen} onChange={(e) => setForm({ ...form, imagen: e.target.value })} placeholder="https://..." />
              <div className="logo-preview-wrap">
                {form.imagen ? (
                  <img src={form.imagen} alt="Vista previa" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <span style={{ color: 'var(--text-400)', fontSize: 12 }}>Sin imagen</span>
                )}
              </div>
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
              <label>Estado</label>
              <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                <option value="Activa">Activa</option>
                <option value="Inactiva">Inactiva</option>
              </select>
            </div>
            <div className="form-group">
              <label>Productos del combo ({selectedProds.length})</label>
              <div style={{ maxHeight: 160, overflowY: 'auto', border: '1.5px solid var(--border)', borderRadius: 'var(--r-sm)', padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {allProducts.length === 0 && (
                  <span style={{ color: 'var(--text-400)', fontSize: 12, padding: 6 }}>No hay productos disponibles</span>
                )}
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
              <button className="btn-save" onClick={guardar}>{editId ? 'Actualizar' : 'Crear'}</button>
            </div>
          </div>
        </div>
      )}

      <ToastMessage toast={toast} />
    </div>
  );
}
