import { useEffect, useState } from 'react';
import apiClient from '../../api/client';

interface Usuario {
  id_Usuario: number;
  nombre_usuario: string;
  apellido_usuario: string;
  correo_personal: string;
  telefono: string;
  estado: string;
  rol: { nombre: string } | null;
}

export default function UsuariosAdmin() {
  const [items, setItems] = useState<Usuario[]>([]);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(false);
  const [sel, setSel] = useState<Usuario | null>(null);
  const [rol, setRol] = useState('');
  const [estado, setEstado] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    apiClient.get<Usuario[]>('/usuarios').then((r) => { setItems(r.data); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter((u) =>
    `${u.nombre_usuario} ${u.apellido_usuario} ${u.correo_personal}`.toLowerCase().includes(q.toLowerCase())
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

  const save = () => {
    if (!sel) return;
    apiClient.put(`/usuarios/${sel.id_Usuario}`, { rol, estado }).then(() => { setModal(false); load(); });
  };

  const del = (id: number) => {
    if (!confirm('¿Eliminar este usuario?')) return;
    apiClient.delete(`/usuarios/${id}`).then(() => load());
  };

  const badgeClass = (e: string) =>
    e === 'Activo' ? 'badge-success' : e === 'Inactivo' ? 'badge-danger' : 'badge-warning';

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
        <input placeholder="Buscar usuario..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="meta-bar">
        <span>{filtered.length} usuario{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-400)', padding: 20 }}>Cargando...</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Estado</th>
              <th>Rol</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id_Usuario}>
                <td>{u.id_Usuario}</td>
                <td style={{ fontWeight: 600 }}>{u.nombre_usuario} {u.apellido_usuario}</td>
                <td>{u.correo_personal}</td>
                <td><span className={`badge ${badgeClass(u.estado)}`}>{u.estado}</span></td>
                <td><span className="badge badge-info">{u.rol?.nombre ?? '—'}</span></td>
                <td>
                  <button className="btn-icon btn-icon-edit" onClick={() => openEdit(u)} title="Editar">✏</button>
                  <button className="btn-icon btn-icon-del" onClick={() => del(u.id_Usuario)} title="Eliminar" style={{ marginLeft: 6 }}>🗑</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>No se encontraron usuarios</td></tr>
            )}
          </tbody>
        </table>
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
                <option value="Administrador">Administrador</option>
                <option value="Cajero">Cajero</option>
                <option value="Mesero">Mesero</option>
                <option value="Cliente">Cliente</option>
              </select>
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select value={estado} onChange={(e) => setEstado(e.target.value)}>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
                <option value="Suspendido">Suspendido</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-save" onClick={save}>Actualizar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
