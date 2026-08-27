import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import ToastMessage, { useToast } from '../../components/Toast';

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

type Filtro = 'todos' | 'disponible' | 'bajo' | 'agotado';

const FILTROS: { key: Filtro; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'disponible', label: 'Disponible' },
  { key: 'bajo', label: 'Bajo stock' },
  { key: 'agotado', label: 'Agotado' },
];

const estadoKey = (stock: number): Filtro =>
  stock > 10 ? 'disponible' : stock > 0 ? 'bajo' : 'agotado';

const textoEstado = (stock: number) =>
  stock > 10 ? 'Disponible' : stock > 0 ? 'Stock bajo' : 'Agotado';

const emptyForm = {
  nombre_materia: '', tipo_materia: '', valor_materia: '', stock_materia: '', idMarca: 1,
};

export default function MateriaPrimaAdmin() {
  const [items, setItems] = useState<MateriaPrima[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast, showToast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        apiClient.get<MateriaPrima[]>('/materias-primas'),
        apiClient.get<Marca[]>('/marcas'),
      ]);
      setItems(r1.data);
      setMarcas(r2.data);
    } catch {
      showToast('No se pudieron cargar los insumos', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter((m) =>
    (filtro === 'todos' || estadoKey(m.stock_materia) === filtro) &&
    m.nombre_materia.toLowerCase().includes(q.toLowerCase())
  );

  const total = items.length;
  const disponibles = items.filter((m) => m.stock_materia > 0).length;
  const agotados = items.filter((m) => m.stock_materia <= 0).length;
  const valorInv = items.reduce((a, m) => a + Number(m.valor_materia) * Number(m.stock_materia), 0);

  const openNew = () => {
    setForm({ ...emptyForm, idMarca: marcas[0]?.idMarca ?? 1 });
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

  const guardar = async () => {
    if (!form.nombre_materia.trim()) { showToast('El nombre es obligatorio', true); return; }
    if (Number(form.valor_materia) < 0 || Number(form.stock_materia) < 0) {
      showToast('El valor y el stock no pueden ser negativos', true);
      return;
    }
    const body = {
      ...form,
      valor_materia: Number(form.valor_materia) || 0,
      stock_materia: Number(form.stock_materia) || 0,
    };
    try {
      if (editId) {
        await apiClient.put(`/materias-primas/${editId}`, body);
        showToast('Materia prima actualizada');
      } else {
        await apiClient.post('/materias-primas', body);
        showToast('Materia prima creada');
      }
      setModal(false);
      load();
    } catch {
      showToast('No se pudo guardar la materia prima', true);
    }
  };

  const del = async (id: number) => {
    const m = items.find((x) => x.idmateria === id);
    if (!confirm(`¿Eliminar "${m?.nombre_materia ?? id}"?`)) return;
    try {
      await apiClient.delete(`/materias-primas/${id}`);
      showToast('Materia prima eliminada');
      load();
    } catch {
      showToast('No se pudo eliminar la materia prima', true);
    }
  };

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
          <span className="stat-label">Agotados</span>
          <span className="stat-val">{agotados}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Valor inventario</span>
          <span className="stat-val" style={{ fontSize: 24 }}>${valorInv.toLocaleString()}</span>
        </div>
      </div>

      <div className="search-bar">
        <input placeholder="Buscar insumo..." value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="filter-chips" style={{ flexBasis: '100%', marginBottom: 0 }}>
          {FILTROS.map((f) => (
            <button
              key={f.key}
              className={`chip-filtro${filtro === f.key ? ' active' : ''}`}
              onClick={() => setFiltro(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
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
                  <span className={`badge ${estadoKey(m.stock_materia) === 'agotado' ? 'badge-danger' : estadoKey(m.stock_materia) === 'bajo' ? 'badge-warning' : 'badge-success'}`}>
                    {textoEstado(m.stock_materia)}
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
              <input value={form.nombre_materia} onChange={(e) => setForm({ ...form, nombre_materia: e.target.value })} placeholder="Ej. Harina" />
            </div>
            <div className="form-group">
              <label>Tipo</label>
              <input value={form.tipo_materia} onChange={(e) => setForm({ ...form, tipo_materia: e.target.value })} placeholder="Ej. Básico / Carnes / Bebidas" />
            </div>
            <div className="form-group">
              <label>Valor unitario</label>
              <input type="number" min={0} value={form.valor_materia} onChange={(e) => setForm({ ...form, valor_materia: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Stock</label>
              <input type="number" min={0} value={form.stock_materia} onChange={(e) => setForm({ ...form, stock_materia: e.target.value })} />
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
              <button className="btn-save" onClick={guardar}>{editId ? 'Actualizar' : 'Crear'}</button>
            </div>
          </div>
        </div>
      )}

      <ToastMessage toast={toast} />
    </div>
  );
}