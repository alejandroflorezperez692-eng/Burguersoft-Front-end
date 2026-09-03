import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import ToastMessage, { useToast } from '../../components/Toast';

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
  nombre_promo: '', descripcion_promo: '', valor_promo: '', img_promo: '',
  fecha_inicio: '', fecha_fin: '', estado: 'Activa',
};

const fechaLegible = (f?: string | null) =>
  f ? new Date(f + (f.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

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

  const toArray = <T,>(v: unknown): T[] =>
    Array.isArray(v) ? (v as T[]) : ((v as { data?: unknown })?.data as T[] ?? []);

  const load = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        apiClient.get<Promocion[]>('/promociones'),
        apiClient.get('/productos'),
      ]);
      setItems(toArray<Promocion>(r1.data));
      const prodsRaw = toArray<{ id_producto: number; nombre_producto: string }>(r2.data);
      setAllProducts(prodsRaw.map((p) => ({ id: p?.id_producto, nombre: p?.nombre_producto ?? 'Sin nombre' })));
    } catch {
      showToast('No se pudieron cargar las promociones', true);
      setItems([]);
      setAllProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const est = (p: Promocion) => {
    if (p?.estado === 'Inactiva' || p?.estado === 'Finalizada') return 'Inactiva';
    if (p?.fecha_fin && new Date(p.fecha_fin) < new Date()) return 'Finalizada';
    return 'Activa';
  };

  const filtered = (items ?? []).filter((p) =>
    (filtro === 'todas' || est(p) === filtro) &&
    (p?.nombre_promo ?? '').toLowerCase().includes((q ?? '').toLowerCase())
  );

  const activas = (items ?? []).filter((p) => est(p) === 'Activa').length;

  const openNew = () => {
    setForm(emptyForm);
    setSelectedProds([]);
    setEditId(null);
    setModal(true);
  };

  const openEdit = (p: Promocion) => {
    setForm({
      nombre_promo: p?.nombre_promo ?? '',
      descripcion_promo: p?.descripcion_promo ?? '',
      valor_promo: String(p?.valor_promo ?? ''),
      img_promo: p?.img_promo ?? '',
      fecha_inicio: p?.fecha_inicio?.slice(0, 10) ?? '',
      fecha_fin: p?.fecha_fin?.slice(0, 10) ?? '',
      estado: p?.estado ?? 'Activa',
    });
    setSelectedProds((p?.productos ?? []).map((pr) => pr?.id));
    setEditId(p?.id ?? null);
    setModal(true);
  };

  const toggleProd = (id: number) => {
    setSelectedProds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const guardar = async () => {
    if (!form.nombre_promo.trim()) { showToast('El nombre es obligatorio', true); return; }
    if (Number(form.valor_promo) < 0) { showToast('El precio no puede ser negativo', true); return; }
    if (selectedProds.length === 0) { showToast('Selecciona al menos un producto', true); return; }
    const body = {
      ...form,
      valor_promo: Number(form.valor_promo) || 0,
      productos_ids: selectedProds,
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
    const p = (items ?? []).find((x) => x?.id === id);
    if (!confirm(`¿Eliminar "${p?.nombre_promo ?? id}"?`)) return;
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
              <div key={p?.id} style={{
                background: 'var(--surface)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
              }}>
                {p?.img_promo && (
                  <div style={{ height: 130, overflow: 'hidden', background: 'var(--surface-3)' }}>
                    <img src={p.img_promo} alt={p.nombre_promo ?? 'promoción'} onError={(ev) => { (ev.target as HTMLImageElement).style.display = 'none'; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
                <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, color: 'var(--text-900)', margin: 0 }}>{p?.nombre_promo ?? 'Sin nombre'}</h3>
                    <span className={`badge ${e === 'Activa' ? 'badge-success' : 'badge-gray'}`}>{e}</span>
                  </div>
                  {p?.descripcion_promo && <p style={{ fontSize: 13, color: 'var(--text-400)', margin: 0 }}>{p.descripcion_promo}</p>}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {(p?.productos ?? []).map((pr) => (
                      <span key={pr?.id} className="badge badge-info" style={{ fontSize: 10 }}>{pr?.nombre}</span>
                    ))}
                  </div>
                  {(p?.fecha_inicio || p?.fecha_fin) && (
                    <div style={{ fontSize: 12, color: 'var(--text-400)', fontWeight: 500 }}>
                      {fechaLegible(p.fecha_inicio)}{p.fecha_inicio && p.fecha_fin ? ' → ' : ''}{fechaLegible(p.fecha_fin)}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 800, color: 'var(--brand)' }}>${Number(p?.valor_promo || 0).toLocaleString()}</span>
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
              <input value={form.nombre_promo} onChange={(e) => setForm({ ...form, nombre_promo: e.target.value })} placeholder="Ej. Combo Familiar" />
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <textarea value={form.descripcion_promo} onChange={(e) => setForm({ ...form, descripcion_promo: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Precio del combo</label>
              <input type="number" min={0} value={form.valor_promo} onChange={(e) => setForm({ ...form, valor_promo: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Imagen (URL)</label>
              <input value={form.img_promo} onChange={(e) => setForm({ ...form, img_promo: e.target.value })} placeholder="https://..." />
              <div className="logo-preview-wrap">
                {form.img_promo ? (
                  <img src={form.img_promo} alt="Vista previa" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
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
                <option value="Finalizada">Finalizada</option>
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