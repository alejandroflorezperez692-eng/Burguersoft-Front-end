import { useEffect, useRef, useState } from 'react';
import apiClient from '../../api/client';
import marcaFallback from '../../assets/img/marca-comercial.png';

interface Marca {
  id: number;
  nombre: string;
  img: string;
  telefono: string;
  correo: string;
  nit: string | number;
}

const empty: Omit<Marca, 'id'> = {
  nombre: '',
  img: '',
  telefono: '',
  correo: '',
  nit: '',
};

export default function MarcasAdmin() {
  const [items, setItems] = useState<Marca[]>([]);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [detalle, setDetalle] = useState<Marca | null>(null);
  const [closing, setClosing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const showToast = (msg: string, error = false) => {
    setToast({ msg, error });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  };

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiClient.get('/marcas');
      const lista = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
      setItems(Array.isArray(lista) ? lista : []);
    } catch {
      showToast('No se pudieron cargar las marcas', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter((m) =>
    [m.nombre, m.correo, m.telefono].some((v) => (v ?? '').toString().toLowerCase().includes(q.toLowerCase()))
  );

  const openNew = () => { setForm(empty); setEditId(null); setModal(true); };

  const openEdit = (m: Marca) => {
    setForm({
      nombre: m.nombre ?? '',
      img: m.img ?? '',
      telefono: m.telefono != null ? String(m.telefono) : '',
      correo: m.correo ?? '',
      nit: m.nit != null ? String(m.nit) : '',
    });
    setEditId(m.id);
    setModal(true);
    closeDetail();
  };


  const save = async () => {
    if (!form.nombre.trim()) {
      showToast('El nombre es obligatorio', true);
      return;
    }
    try {
      if (editId) {
        const { nit: _nit, ...body } = form;
        await apiClient.put(`/marcas/${editId}`, body);
        showToast('Marca actualizada correctamente');
      } else {
        const soloNit = String(form.nit ?? '').split('-')[0].replace(/[^0-9]/g, '');
        await apiClient.post('/marcas', { ...form, nit: Number(soloNit) || 0 });
        showToast('Marca creada correctamente');
      }
      setModal(false);
      load();
    } catch {
      showToast('No se pudo guardar la marca', true);
    }
  };

  const del = async (id: number) => {
    const m = items.find((x) => x.id === id);
    if (!confirm(`¿Eliminar la marca "${m?.nombre ?? id}"?`)) return;
    try {
      await apiClient.delete(`/marcas/${id}`);
      showToast('Marca eliminada');
      closeDetail();
      load();
    } catch {
      showToast('No se pudo eliminar la marca', true);
    }
  };

  const verDetalle = (m: Marca) => { setClosing(false); setDetalle(m); };

  const closeDetail = () => {
    if (!detalle || closing) return;
    setClosing(true);
    window.setTimeout(() => { setDetalle(null); setClosing(false); }, 280);
  };

  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <h1>Gestión de Marcas</h1>
          <p className="subtitulo">Administra las marcas de insumos</p>
        </div>
        <button className="btn-primary" onClick={openNew}>+ Nueva marca</button>
      </div>

      <div className="search-bar">
        <input
          placeholder="Buscar por nombre, correo o teléfono..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="meta-bar">
        <span>{filtered.length} marca{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-400)', padding: 20 }}>Cargando...</p>
      ) : (
        <div className="marcas-grid">
          {filtered.map((m) => (
            <article className="marca-card" key={m.id} onClick={() => verDetalle(m)}>
              <div className="marca-img-wrap">
                <img
                  src={m.img || marcaFallback}
                  alt={m.nombre}
                  onError={(e) => { (e.target as HTMLImageElement).src = marcaFallback; }}
                />
              </div>
              <div className="marca-body">
                <div>
                  <div className="marca-nombre">{m.nombre}</div>
                  <div className="marca-id">NIT {m.nit || '—'} · ID {m.id}</div>
                </div>
                <span className="estado-dot dot-activo">Ver</span>
              </div>
            </article>
          ))}
          {filtered.length === 0 && (
            <div className="empty-state">No se encontraron marcas</div>
          )}
        </div>
      )}

      <div className={`detalle-overlay${detalle ? ' show' : ''}${closing ? ' closing' : ''}`} onClick={closeDetail}>
        {detalle && (
          <div className="detalle-box" onClick={(e) => e.stopPropagation()}>
            <button className="detalle-close" onClick={closeDetail} title="Cerrar">✕</button>
            <div className="detalle-content">
              <div className="detalle-nombre">{detalle.nombre}</div>
              <div className="detalle-info">
                {detalle.telefono && <p><strong>Teléfono:</strong> {detalle.telefono}</p>}
                {detalle.correo && <p><strong>Correo:</strong> {detalle.correo}</p>}
                {detalle.nit && <p><strong>NIT:</strong> {detalle.nit}</p>}
              </div>
              <span className="detalle-estado dot-activo">ID {detalle.id}</span>
              <div className="detalle-actions">
                <button className="btn-det-editar" onClick={() => openEdit(detalle)}>Editar</button>
                <button className="btn-det-eliminar" onClick={() => del(detalle.id)}>Eliminar</button>
              </div>
            </div>
            <div className="detalle-logo-bg" />
            <img
              className="detalle-logo-flotante"
              src={detalle.img || marcaFallback}
              alt={detalle.nombre}
              onError={(e) => { (e.target as HTMLImageElement).src = marcaFallback; }}
            />
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay open" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2>{editId ? 'Editar Marca' : 'Nueva Marca'}</h2>
            <div className="form-group">
              <label>Nombre</label>
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Postobón" />
            </div>
            <div className="form-group">
              <label>Logo (URL)</label>
              <input value={form.img} onChange={(e) => setForm({ ...form, img: e.target.value })} placeholder="https://..." />
              <div className="logo-preview-wrap">
                {form.img ? (
                  <img src={form.img} alt="Vista previa" onError={(e) => { (e.target as HTMLImageElement).src = marcaFallback; }} />
                ) : (
                  <span style={{ color: 'var(--text-400)', fontSize: 12 }}>Sin logo</span>
                )}
              </div>
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Correo</label>
              <input type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} />
            </div>
            {!editId && (
              <div className="form-group">
                <label>NIT</label>
                <input value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} placeholder="Ej. 830.047.819-9" />
              </div>
            )}
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-save" onClick={save}>{editId ? 'Actualizar' : 'Crear'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast-marca${toast.error ? ' toast-error' : ''}`}>{toast.msg}</div>
      )}
    </div>
  );
}