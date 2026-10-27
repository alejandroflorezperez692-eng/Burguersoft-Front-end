import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import marcaFallback from '../../assets/img/marca-comercial.png';
import AdminLoading from '../../components/AdminLoading';
import { useToast } from '../../components/Toast';
import '../../styles/nu-admin.css';

interface Marca {
  id: number;
  nombre: string;
  img: string;
  telefono: string;
  correo: string;
  nit: string;
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
  const [intentado, setIntentado] = useState(false);
  const [closing, setClosing] = useState(false);
  const { showToast, confirmar } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiClient.get<Marca[]>('/marcas');
      setItems(r.data);
    } catch {
      showToast('No se pudieron cargar las marcas', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter((m) =>
    [m.nombre, m.correo, m.telefono].some((v) => v?.toLowerCase().includes(q.toLowerCase()))
  );

  const openNew = () => { setForm(empty); setEditId(null); setIntentado(false); setModal(true); };

  const openEdit = (m: Marca) => {
    setForm({
      nombre: m.nombre,
      img: m.img,
      telefono: m.telefono,
      correo: m.correo,
      nit: m.nit,
    });
    setEditId(m.id);
    setIntentado(false);
    setModal(true);
    closeDetail();
  };


  const soloNitNum = (v: string) => v.split('-')[0].replace(/[^0-9]/g, '');

  const errores = {
    nombre: !form.nombre.trim(),
    img: !form.img.trim(),
    telefono: form.telefono.replace(/[^0-9]/g, '').length < 7,
    correo: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim()),
    nit: !editId && !soloNitNum(form.nit),
  };

  const bordeError = (malo: boolean): React.CSSProperties | undefined =>
    intentado && malo ? { borderColor: 'var(--danger)' } : undefined;

  const save = async () => {
    setIntentado(true);
    if (errores.nombre) { showToast('El nombre es obligatorio', true); return; }
    if (errores.img) { showToast('El logo (URL) es obligatorio', true); return; }
    if (errores.telefono) { showToast('Escribe un teléfono válido (mínimo 7 dígitos)', true); return; }
    if (errores.correo) { showToast('Escribe un correo válido', true); return; }
    if (errores.nit) { showToast('El NIT es obligatorio', true); return; }
    try {
      if (editId) {
        const { nit, ...body } = form;
        await apiClient.put(`/marcas/${editId}`, { ...body, nombre: body.nombre.trim(), img: body.img.trim(), telefono: body.telefono.trim(), correo: body.correo.trim() });
        showToast('Marca actualizada correctamente');
      } else {
        await apiClient.post('/marcas', { ...form, nombre: form.nombre.trim(), img: form.img.trim(), telefono: form.telefono.trim(), correo: form.correo.trim(), nit: Number(soloNitNum(form.nit)) });
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
    if (!(await confirmar(`¿Eliminar la marca "${m?.nombre ?? id}"? Esta acción no se puede deshacer.`, 'Sí, eliminar'))) return;
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
        <AdminLoading texto="Cargando marcas" subtexto="Listando tus proveedores" />
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
          <div className="modal-box" style={{ maxWidth: 560, padding: '28px 32px' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: 18, paddingBottom: 12 }}>{editId ? 'Editar Marca' : 'Nueva Marca'}</h2>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Nombre <span className="mn-req">*</span></label>
              <input style={bordeError(errores.nombre)} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Postobón" />
            </div>

            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', marginBottom: 14 }}>
              <div
                className="logo-preview-wrap"
                style={{ width: 84, height: 84, minHeight: 0, padding: 6, marginBottom: 0, flexShrink: 0 }}
              >
                {form.img ? (
                  <img
                    src={form.img}
                    alt="Vista previa"
                    style={{ maxHeight: 70 }}
                    onError={(e) => { (e.target as HTMLImageElement).src = marcaFallback; }}
                  />
                ) : (
                  <span style={{ color: 'var(--text-400)', fontSize: 11 }}>Sin logo</span>
                )}
              </div>
              <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                <label>Logo (URL) <span className="mn-req">*</span></label>
                <input style={bordeError(errores.img)} value={form.img} onChange={(e) => setForm({ ...form, img: e.target.value })} placeholder="https://..." />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Teléfono <span className="mn-req">*</span></label>
                <input style={bordeError(errores.telefono)} inputMode="tel" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Correo <span className="mn-req">*</span></label>
                <input style={bordeError(errores.correo)} type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} />
              </div>
            </div>

            {!editId && (
              <div className="form-group" style={{ marginBottom: 14, maxWidth: 260 }}>
                <label>NIT <span className="mn-req">*</span></label>
                <input style={bordeError(errores.nit)} value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} placeholder="Ej. 830.047.819-9" />
              </div>
            )}

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
