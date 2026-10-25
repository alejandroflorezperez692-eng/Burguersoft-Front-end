import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import ToastMessage, { useToast } from '../../components/Toast';
import AdminLoading from '../../components/AdminLoading';
import '../../styles/nu-admin.css';

interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  estado: string;
  rol: { nombre: string } | null;
}

const badgeClass = (e: string) =>
  e === 'Activo' ? 'badge-success' : e === 'Inactivo' ? 'badge-danger' : 'badge-warning';

function Avatar({ nombre, apellido, estado }: { nombre: string; apellido: string; estado: string }) {
  return (
    <span style={{
      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
      background: estado === 'Activo' ? 'var(--brand)' : 'var(--surface-3)',
      color: estado === 'Activo' ? '#fff' : 'var(--text-400)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: 15,
    }}>
      {(nombre.charAt(0) + (apellido?.charAt(0) ?? '')).toUpperCase()}
    </span>
  );
}

export default function UsuariosAdmin() {
  const [items, setItems] = useState<Usuario[]>([]);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(false);
  const [sel, setSel] = useState<Usuario | null>(null);
  const [rol, setRol] = useState('');
  const [estado, setEstado] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast, showToast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiClient.get<Usuario[]>('/usuarios');
      setItems(r.data);
    } catch {
      showToast('No se pudieron cargar los usuarios', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = items
    .filter((u) =>
      `${u.nombre} ${u.apellido} ${u.correo} ${u.telefono ?? ''}`.toLowerCase().includes(q.toLowerCase())
    )
    .sort((a, b) => a.id - b.id);

  const total = items.length;
  const admins = items.filter((u) => u.rol?.nombre === 'Administrador').length;
  const activos = items.filter((u) => String(u.estado).toLowerCase() === 'activo').length;

  const openEdit = (u: Usuario) => {
    setSel(u);
    setRol(u.rol?.nombre ?? '');
    setEstado(u.estado);
    setModal(true);
  };

  const guardar = async () => {
    if (!sel) return;
    if (!rol) { showToast('Selecciona un rol', true); return; }
    if (!estado) { showToast('Selecciona un estado', true); return; }
    try {
      await apiClient.put(`/usuarios/${sel.id}`, { rol, estado });
      showToast('Usuario actualizado');
      setModal(false);
      load();
    } catch {
      showToast('No se pudo actualizar el usuario', true);
    }
  };

  const del = async (id: number) => {
    const u = items.find((x) => x.id === id);
    const nombre = u ? `${u.nombre} ${u.apellido ?? ''}` : 'este usuario';
    if (!confirm(`¿Eliminar a "${nombre}"?`)) return;
    try {
      await apiClient.delete(`/usuarios/${id}`);
      showToast('Usuario eliminado');
      load();
    } catch {
      showToast('No se pudo eliminar el usuario', true);
    }
  };

  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <h1>Gestión de Usuarios</h1>
          <p className="subtitulo">Administra los usuarios del sistema</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Total usuarios</span>
          <span className="stat-val">{total}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Administradores</span>
          <span className="stat-val">{admins}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Activos</span>
          <span className="stat-val">{activos}</span>
        </div>
      </div>

      <div className="mn-search-wrap" style={{ marginBottom: 24 }}>
        <svg className="mn-search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input className="mn-search" type="text" placeholder="Buscar por nombre, correo o teléfono..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="meta-bar">
        <span>{filtered.length} usuario{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <AdminLoading texto="Cargando usuarios" subtexto="Listando tu equipo" />
      ) : (
        <div className="tabla-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Usuario</th>
                <th>Correo</th>
                <th>Teléfono</th>
                <th>Estado</th>
                <th>Rol</th>
                <th className="th-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
            {filtered.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}>
                <td style={{ fontWeight: 600, color: 'var(--text-600)' }}>{u.id}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar nombre={u.nombre} apellido={u.apellido} estado={u.estado} />
                    <span>{u.nombre} {u.apellido}</span>
                  </div>
                </td>
                <td>{u.correo}</td>
                <td>{u.telefono || '—'}</td>
                <td><span className={`badge ${badgeClass(u.estado)}`}>{u.estado}</span></td>
                <td><span className="badge badge-info">{u.rol?.nombre ?? '—'}</span></td>
                <td className="td-acciones">
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    <button className="btn-icon btn-icon-edit btn-accion" onClick={() => openEdit(u)} title="Editar">Editar</button>
                    <button className="btn-icon btn-icon-del btn-accion" onClick={() => del(u.id)} title="Eliminar">Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
            {(filtered.length === 0 && (items.length > 0)) && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>No se encontraron usuarios</td></tr>
            )}
          </tbody>
        </table>
        </div>
      )}

      {modal && sel && (
        <div className="modal-overlay open" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2>Editar Usuario</h2>
            <p style={{ marginBottom: 16, color: 'var(--text-400)', fontSize: 13 }}>
              {sel.nombre} {sel.apellido} — {sel.correo}
            </p>
            <div className="form-group">
              <label>Rol</label>
              <select value={rol} onChange={(e) => setRol(e.target.value)}>
                <option value="">Seleccionar rol...</option>
                <option value="Administrador">Administrador</option>
                <option value="Cajero">Cajero</option>
                <option value="Cocinero">Cocinero</option>
                <option value="Cliente">Cliente</option>
              </select>
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select value={estado} onChange={(e) => setEstado(e.target.value)}>
                <option value="">Seleccionar estado...</option>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
                <option value="Suspendido">Suspendido</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-save" onClick={guardar}>Actualizar</button>
            </div>
          </div>
        </div>
      )}

      <ToastMessage toast={toast} />
    </div>
  );
}