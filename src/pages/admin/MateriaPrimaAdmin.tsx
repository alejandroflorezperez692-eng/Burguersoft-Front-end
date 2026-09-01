import { useEffect, useState } from 'react';
import apiClient from '../../api/client';

interface MateriaPrima {
  idmateria: number;
  nombre_materia: string;
  tipo_materia: string;
  valor_materia: number;
  stock_materia: number;
  idMarca: number;
  marca?: { nombre_marca: string };
}

interface Marca {
  idMarca: number;
  nombre_marca: string;
}

export default function MateriaPrimaAdmin() {
  const [items, setItems] = useState<MateriaPrima[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    nombre_materia: '', tipo_materia: '', valor_materia: '', stock_materia: '', idMarca: 1,
  });
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    Promise.all([
      apiClient.get<MateriaPrima[]>('/materias-primas'),
      apiClient.get<Marca[]>('/marcas'),
    ]).then(([r1, r2]) => {
      setItems(r1.data);
      setMarcas(r2.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter((m) =>
    m.nombre_materia.toLowerCase().includes(q.toLowerCase())
  );

  const total = items.length;
  const disponibles = items.filter((m) => m.stock_materia > 0).length;
  const valorProm = total > 0 ? items.reduce((a, m) => a + Number(m.valor_materia), 0) / total : 0;

  const openNew = () => {
    setForm({ nombre_materia: '', tipo_materia: '', valor_materia: '', stock_materia: '', idMarca: marcas[0]?.idMarca ?? 1 });
    setEditId(null);
    setModal(true);
  };

  const openEdit = (m: MateriaPrima) => {
    setForm({
      nombre_materia: m.nombre_materia,
      tipo_materia: m.tipo_materia,
      valor_materia: String(m.valor_materia),
      stock_materia: String(m.stock_materia),
      idMarca: m.idMarca,
    });
    setEditId(m.idmateria);
    setModal(true);
  };

  const save = () => {
    const body = {
      ...form,
      valor_materia: Number(form.valor_materia),
      stock_materia: Number(form.stock_materia),
    };
    if (editId) {
      apiClient.put(`/materias-primas/${editId}`, body).then(() => { setModal(false); load(); });
    } else {
      apiClient.post('/materias-primas', body).then(() => { setModal(false); load(); });
    }
  };

  const del = (id: number) => {
    if (!confirm('¿Eliminar esta materia prima?')) return;
    apiClient.delete(`/materias-primas/${id}`).then(() => load());
  };

  const estado = (stock: number) =>
    stock > 10 ? 'badge-success' : stock > 0 ? 'badge-warning' : 'badge-danger';

  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <h1>Materia Prima</h1>
          <p className="subtitulo">Control de inventario de insumos</p>
        </div>
        <button className="btn-primary" onClick={openNew}>+ Nueva materia prima</button>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Total insumos</span>
          <span className="stat-val">{total}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Disponibles</span>
          <span className="stat-val">{disponibles}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Valor promedio</span>
          <span className="stat-val">${Math.round(valorProm).toLocaleString()}</span>
        </div>
      </div>

      <div className="search-bar">
        <input placeholder="Buscar insumo..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-400)', padding: 20 }}>Cargando...</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Valor</th>
              <th>Stock</th>
              <th>Estado</th>
              <th>Marca</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.idmateria}>
                <td style={{ fontWeight: 600 }}>{m.nombre_materia}</td>
                <td>{m.tipo_materia || '—'}</td>
                <td>${Number(m.valor_materia).toLocaleString()}</td>
                <td>{m.stock_materia}</td>
                <td>
                  <span className={`badge ${estado(m.stock_materia)}`}>
                    {m.stock_materia > 10 ? 'Disponible' : m.stock_materia > 0 ? 'Bajo' : 'Agotado'}
                  </span>
                </td>
                <td>{m.marca?.nombre_marca || '—'}</td>
                <td>
                  <button className="btn-icon btn-icon-edit" onClick={() => openEdit(m)} title="Editar">✏</button>
                  <button className="btn-icon btn-icon-del" onClick={() => del(m.idmateria)} title="Eliminar" style={{ marginLeft: 6 }}>🗑</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>No se encontraron insumos</td></tr>
            )}
          </tbody>
        </table>
      )}

      {modal && (
        <div className="modal-overlay open" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2>{editId ? 'Editar Materia Prima' : 'Nueva Materia Prima'}</h2>
            <div className="form-group">
              <label>Nombre</label>
              <input value={form.nombre_materia} onChange={(e) => setForm({ ...form, nombre_materia: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Tipo</label>
              <input value={form.tipo_materia} onChange={(e) => setForm({ ...form, tipo_materia: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Valor unitario</label>
              <input type="number" value={form.valor_materia} onChange={(e) => setForm({ ...form, valor_materia: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Stock</label>
              <input type="number" value={form.stock_materia} onChange={(e) => setForm({ ...form, stock_materia: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Marca</label>
              <select value={form.idMarca} onChange={(e) => setForm({ ...form, idMarca: Number(e.target.value) })}>
                {marcas.map((m) => (
                  <option key={m.idMarca} value={m.idMarca}>{m.nombre_marca}</option>
                ))}
              </select>
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
