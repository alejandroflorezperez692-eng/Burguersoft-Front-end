import { useEffect, useState } from 'react';
import apiClient from '../../api/client';

interface Marca {
  idMarca: number;
  nombre_marca: string;
  img_marca: string;
  telefono_marca: string;
  correo_marca: string;
}

const empty: Omit<Marca, 'idMarca'> = {
  nombre_marca: '',
  img_marca: '',
  telefono_marca: '',
  correo_marca: '',
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
    m.nombre_marca.toLowerCase().includes(q.toLowerCase())
  );

  const openNew = () => { setForm(empty); setEditId(null); setModal(true); };

  const openEdit = (m: Marca) => {
    setForm({
      nombre_marca: m.nombre_marca,
      img_marca: m.img_marca,
      telefono_marca: m.telefono_marca,
      correo_marca: m.correo_marca,
    });
    setEditId(m.idMarca);
    setModal(true);
  };

  const save = () => {
    if (editId) {
      apiClient.put(`/marcas/${editId}`, form).then(() => { setModal(false); load(); });
    } else {
      apiClient.post('/marcas', form).then(() => { setModal(false); load(); });
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
              <tr key={m.idMarca}>
                <td>{m.idMarca}</td>
                <td style={{ fontWeight: 600 }}>{m.nombre_marca}</td>
                <td>{m.telefono_marca || '—'}</td>
                <td>{m.correo_marca || '—'}</td>
                <td>
                  <button className="btn-icon btn-icon-edit" onClick={() => openEdit(m)} title="Editar">✏</button>
                  <button className="btn-icon btn-icon-del" onClick={() => del(m.idMarca)} title="Eliminar" style={{ marginLeft: 6 }}>🗑</button>
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
              <input value={form.nombre_marca} onChange={(e) => setForm({ ...form, nombre_marca: e.target.value })} />
            </div>
            <div className="form-group">
              <label>URL Imagen</label>
              <input value={form.img_marca} onChange={(e) => setForm({ ...form, img_marca: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input value={form.telefono_marca} onChange={(e) => setForm({ ...form, telefono_marca: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Correo</label>
              <input type="email" value={form.correo_marca} onChange={(e) => setForm({ ...form, correo_marca: e.target.value })} />
            </div>
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
