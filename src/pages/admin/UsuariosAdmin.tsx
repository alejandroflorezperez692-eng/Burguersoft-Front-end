import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import ToastMessage, { useToast } from '../../components/Toast';

interface Usuario {
  id_Usuario: number;
  nombre_usuario: string;
  apellido_usuario: string;
  correo_personal: string;
  telefono: string;
  estado: string;
  rol: { nombre: string } | null;
}

type FiltroEstado = 'todos' | 'Activo' | 'Inactivo' | 'Suspendido';
type FiltroRol = 'todos' | string;

const ESTADOS: FiltroEstado[] = ['todos', 'Activo', 'Inactivo', 'Suspendido'];
const ROLES = ['todos', 'Administrador', 'Cajero', 'Mesero', 'Cliente'];

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
  const [fEstado, setFEstado] = useState<FiltroEstado>('todos');
  const [fRol, setFRol] = useState<FiltroRol>('todos');
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

  const filtered = items.filter((u) =>
    (fEstado === 'todos' || u.estado === fEstado) &&
    (fRol === 'todos' || u.rol?.nombre === fRol) &&
    `${u.nombre_usuario} ${u.apellido_usuario} ${u.correo_personal} ${u.telefono ?? ''}`.toLowerCase().includes(q.toLowerCase())
  );

  const total = items.length;
  const admins = items.filter((u) => u.rol?.nombre === 'Administrador').length;
  const activos = items.filter((u) => u.estado === 'Activo').length;

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
      await apiClient.put(`/usuarios/${sel.id_Usuario}`, { rol, estado });
      showToast('Usuario actualizado');
      setModal(false);
      load();
    } catch {
      showToast('No se pudo actualizar el usuario', true);
    }
  };

  const del = async (id: number) => {
    const u = items.find((x) => x.id_Usuario === id);
    if (!confirm(`¿Eliminar a "${u?.nombre_usuario} ${u?.apellido_usuario ?? ''}"?`)) return;
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

      <div className="search-bar">
        <input placeholder="Buscar por nombre, correo o teléfono..." value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="filter-chips" style={{ flexBasis: '100%', marginBottom: 0 }}>
          {ESTADOS.map((e) => (
            <button key={e} className={`chip-filtro${fEstado === e ? ' active' : ''}`} onClick={() => setFEstado(e)}>
              {e === 'todos' ? 'Todos los estados' : e}
            </button>
          ))}
          <span style={{ width: 1, alignSelf: 'stretch', background: 'var(--border)' }} />
          {ROLES.map((r) => (
            <button key={r} className={`chip-filtro${fRol === r ? ' active' : ''}`} onClick={() => setFRol(r)}>
              {r === 'todos' ? 'Todos los roles' : r}
            </button>
          ))}
        </div>
      </div>

      <div className="meta-bar">
        <span>{filtered.length} usuario{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-400)', padding: 20 }}>Cargando...</p>
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
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
            {filtered.map((u) => (
              <tr key={u.id_Usuario}>
                <td>{u.id_Usuario}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar nombre={u.nombre_usuario} apellido={u.apellido_usuario} estado={u.estado} />
                    <span style={{ fontWeight: 600 }}>{u.nombre_usuario} {u.apellido_usuario}</span>
                  </div>
                </td>
                <td>{u.correo_personal}</td>
                <td>{u.telefono || '—'}</td>
                <td><span className={`badge ${badgeClass(u.estado)}`}>{u.estado}</span></td>
                <td><span className="badge badge-info">{u.rol?.nombre ?? '—'}</span></td>
                <td>
                  <button className="btn-icon btn-icon-edit" onClick={() => openEdit(u)} title="Editar">✏</button>
                  <button className="btn-icon btn-icon-del" onClick={() => del(u.id_Usuario)} title="Eliminar" style={{ marginLeft: 6 }}>🗑</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
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
              {sel.nombre_usuario} {sel.apellido_usuario} — {sel.correo_personal}
            </p>
            <div className="form-group">
              <label>Rol</label>
              <select value={rol} onChange={(e) => setRol(e.target.value)}>
                <option value="">Seleccionar rol...</option>
                <option value="Administrador">Administrador</option>
                <option value="Cajero">Cajero</option>
                <option value="Mesero">Mesero</option>
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