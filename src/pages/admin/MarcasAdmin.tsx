import { useEffect, useRef, useState } from 'react';
import apiClient from '../../api/client';

interface Marca {

  idMarca: number;
  nombre_marca: string;
  img_marca: string;
  nit_marca: string;
  telefono_marca: string;
  correo_marca: string;
  estado_marca: string;
}

const empty: Omit<Marca, 'idMarca'> = {
  nombre_marca: '',
  img_marca: '',
  nit_marca: '',
  telefono_marca: '',
  correo_marca: '',
  estado_marca: 'Activo',

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

function estadoClass(e: string) {
  if (e === 'Activo') return 'dot-activo';
  if (e === 'Inactivo') return 'dot-inactivo';
  return 'dot-suspendido';
}

export default function MarcasAdmin() {
  const [items, setItems] = useState<Marca[]>([]);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [detalle, setDetalle] = useState<Marca | null>(null);
  const [closing, setClosing] = useState(false);
  const detalleRef = useRef<HTMLDivElement>(null);

  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'ok' | 'err'>('ok');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = () => {
    apiClient.get<Marca[]>('/marcas').then((r) => { setItems(r.data); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDetalle();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const filtered = items.filter((m) =>
    m.nombre.toLowerCase().includes(q.toLowerCase())
  );

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast(msg);
    setToastType(type);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3500);
  };

  const openNew = () => { setForm(empty); setEditId(null); setModal(true); };

  const openEdit = (m: Marca) => {
    setForm({

      nombre_marca: m.nombre_marca,
      img_marca: m.img_marca,
      nit_marca: m.nit_marca ?? '',
      telefono_marca: m.telefono_marca,
      correo_marca: m.correo_marca,
      estado_marca: m.estado_marca ?? 'Activo',
      nombre: m.nombre,
      img: m.img,
      telefono: m.telefono,
      correo: m.correo,
      nit: m.nit,
    });
    setEditId(m.id);
    setModal(true);
  };

  const save = () => {

    if (!form.nombre_marca.trim() || !form.img_marca.trim() || !form.nit_marca.trim()) {
      showToast('Nombre, imagen y NIT son obligatorios.', 'err');
      return;

    if (editId) {
      // El endpoint de actualizar no acepta/require nit, así que lo excluimos.
      const { nit, ...body } = form;
      apiClient.put(`/marcas/${editId}`, body).then(() => { setModal(false); load(); });
    } else {
      // El NIT colombiano trae un dígito de verificación después del guion (ej. "830.047.819-9");
      // ese dígito no es parte del número, así que solo tomamos lo que va antes del guion.
      const soloNit = form.nit.split('-')[0].replace(/[^0-9]/g, '');
      apiClient.post('/marcas', { ...form, nit: Number(soloNit) }).then(() => { setModal(false); load(); });

    }
    const req = editId
      ? apiClient.put(`/marcas/${editId}`, form)
      : apiClient.post('/marcas', form);
    req.then(() => {
      setModal(false);
      load();
      showToast(editId ? 'Marca actualizada.' : 'Marca agregada.');
    }).catch(() => {
      showToast('Error al guardar la marca.', 'err');
    });
  };

  const del = (id: number) => {
    if (!confirm('¿Eliminar esta marca?')) return;
    apiClient.delete(`/marcas/${id}`).then(() => {
      load();
      showToast('Marca eliminada.');
    }).catch(() => {
      showToast('Error: la marca puede estar en uso.', 'err');
    });
  };

  const openDetalle = (m: Marca) => {
    setDetalle(m);
    setClosing(false);
  };

  const closeDetalle = () => {
    setClosing(true);
    setTimeout(() => { setDetalle(null); setClosing(false); }, 380);
  };

  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <h1>Gestión de Marcas</h1>
          <p className="subtitulo">Proveedores y socios del negocio</p>
        </div>
        <button className="btn-primary" onClick={openNew}>+ Nueva marca</button>
      </div>

      <div className="topbar">
        <input
          type="text"
          placeholder="Buscar marca..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="meta-bar">
        <span>{filtered.length === 1 ? '1 marca' : `${filtered.length} marcas`}</span>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-400)', padding: 20 }}>Cargando...</p>
      ) : (

        <div className="marcas-grid">
          {filtered.map((m) => (
            <div className="marca-card" key={m.idMarca} onClick={() => openDetalle(m)}>
              <div className="marca-img-wrap">
                <img
                  src={m.img_marca || '/placeholder.jpg'}
                  alt={m.nombre_marca}
                  onError={(e) => { e.currentTarget.src = '/placeholder.jpg'; }}
                />
              </div>
              <div className="marca-body">
                <div>
                  <div className="marca-nombre">{m.nombre_marca}</div>
                  <div className="marca-id">#{m.idMarca}</div>
                </div>
                <span className={`estado-dot ${estadoClass(m.estado_marca || 'Activo')}`}>
                  {m.estado_marca || 'Activo'}
                </span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="empty-state">No hay marcas registradas. Agrega la primera.</div>
          )}
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Correo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id}>
                <td>{m.id}</td>
                <td style={{ fontWeight: 600 }}>{m.nombre}</td>
                <td>{m.telefono || '—'}</td>
                <td>{m.correo || '—'}</td>
                <td>
                  <button className="btn-icon btn-icon-edit" onClick={() => openEdit(m)} title="Editar">✏</button>
                  <button className="btn-icon btn-icon-del" onClick={() => del(m.id)} title="Eliminar" style={{ marginLeft: 6 }}>🗑</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>No se encontraron marcas</td></tr>
            )}
          </tbody>
        </table>

      )}

      {modal && (
        <div className="modal-overlay show" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2>{editId ? 'Editar Marca' : 'Nueva Marca'}</h2>
            <div className="form-group">

              <label>Nombre *</label>
              <input value={form.nombre_marca} onChange={(e) => setForm({ ...form, nombre_marca: e.target.value })} placeholder="Nombre de la marca" />
            </div>
            <div className="form-group">
              <label>NIT *</label>
              <input value={form.nit_marca} onChange={(e) => setForm({ ...form, nit_marca: e.target.value })} placeholder="Número de identificación" />
            </div>
            <div className="form-group">
              <label>URL Imagen *</label>
              <input value={form.img_marca} onChange={(e) => setForm({ ...form, img_marca: e.target.value })} placeholder="https://..." />
            </div>
            <div className="logo-preview-wrap">
              {form.img_marca ? (
                <img src={form.img_marca} alt="Vista previa" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <span style={{ fontSize: 12, color: 'var(--text-400)' }}>Vista previa del logo</span>
              )}
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select value={form.estado_marca} onChange={(e) => setForm({ ...form, estado_marca: e.target.value })}>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
                <option value="Suspendido">Suspendido</option>
              </select>
            </div>
            <div className="form-group">
              <label>Teléfono *</label>
              <input value={form.telefono_marca} onChange={(e) => setForm({ ...form, telefono_marca: e.target.value })} placeholder="Número de contacto" />
            </div>
            <div className="form-group">
              <label>Correo *</label>
              <input type="email" value={form.correo_marca} onChange={(e) => setForm({ ...form, correo_marca: e.target.value })} placeholder="correo@empresa.com" />

              <label>Nombre</label>
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div className="form-group">
              <label>URL Imagen</label>
              <input value={form.img} onChange={(e) => setForm({ ...form, img: e.target.value })} />
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
                <input value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} />
              </div>
            )}
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-save" onClick={save}>{editId ? 'Actualizar' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {detalle && (
        <div
          className={`detalle-overlay show${closing ? ' closing' : ''}`}
          onClick={(e) => { if (e.target === detalleRef.current) closeDetalle(); }}
          ref={detalleRef}
        >
          <div className="detalle-box">
            <button className="detalle-close" onClick={closeDetalle}>×</button>
            <div className="detalle-content">
              <div className="detalle-nombre">{detalle.nombre_marca}</div>
              <div className="detalle-info">
                <strong>NIT:</strong> {detalle.nit_marca || '-'}<br />
                <strong>Tel:</strong> {detalle.telefono_marca || '-'}<br />
                <strong>Email:</strong> {detalle.correo_marca || '-'}
              </div>
              <div className={`detalle-estado estado-dot ${estadoClass(detalle.estado_marca || 'Activo')}`}>
                {detalle.estado_marca || 'Activo'}
              </div>
              <div className="detalle-actions">
                <button className="btn-det-editar" onClick={() => { closeDetalle(); setTimeout(() => openEdit(detalle), 350); }}>Editar</button>
                <button className="btn-det-eliminar" onClick={() => { closeDetalle(); setTimeout(() => del(detalle.idMarca), 350); }}>Eliminar</button>
              </div>
            </div>
            <div className="detalle-logo-bg" />
            <img className="detalle-logo-flotante" src={detalle.img_marca || '/placeholder.jpg'} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.jpg'; }} />
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast-marca ${toastType === 'err' ? 'toast-error' : ''}`}>{toast}</div>
      )}
    </div>
  );
}    
