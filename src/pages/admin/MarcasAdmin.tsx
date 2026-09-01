import { useEffect, useState } from 'react';
import apiClient from '../../api/client';

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

  const load = () => {
    apiClient.get<Marca[]>('/marcas').then((r) => { setItems(r.data); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter((m) =>
    m.nombre.toLowerCase().includes(q.toLowerCase())
  );

  const openNew = () => { setForm(empty); setEditId(null); setModal(true); };

  const openEdit = (m: Marca) => {
    setForm({
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
  };

  const del = (id: number) => {
    if (!confirm('¿Eliminar esta marca?')) return;
    apiClient.delete(`/marcas/${id}`).then(() => load());
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
          placeholder="Buscar marca..."
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
        <div className="modal-overlay open" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2>{editId ? 'Editar Marca' : 'Nueva Marca'}</h2>
            <div className="form-group">
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
              <button className="btn-save" onClick={save}>{editId ? 'Actualizar' : 'Crear'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}