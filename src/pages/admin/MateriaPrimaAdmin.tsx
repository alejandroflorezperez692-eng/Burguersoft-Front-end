import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import ToastMessage, { useToast } from '../../components/Toast';

interface MateriaApi {
  id?: number;
  idmateria?: number;
  nombre?: string;
  nombre_materia?: string;
  tipo?: string;
  tipo_materia?: string;
  valor?: number | string;
  valor_materia?: number | string;
  cantidad?: number | string;
  stock_materia?: number | string;
  unidad_medida?: string;
  estado?: string;
  marca_id?: number;
  idMarca?: number;
}

interface MateriaPrima {
  id: number;
  nombre: string;
  tipo: string;
  valor: number;
  cantidad: number;
  unidad_medida: string;
  estado: string;
  marca_id: number;
}

interface Marca {
  id: number;
  nombre: string;
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

function unwrap<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: T[] }).data;
  }
  return [];
}

function normalize(m: MateriaApi): MateriaPrima {
  return {
    id: Number(m.id ?? m.idmateria ?? 0),
    nombre: m.nombre ?? m.nombre_materia ?? '',
    tipo: m.tipo ?? m.tipo_materia ?? '',
    valor: Number(m.valor ?? m.valor_materia ?? 0),
    cantidad: Number(m.cantidad ?? m.stock_materia ?? 0),
    unidad_medida: m.unidad_medida ?? '',
    estado: m.estado ?? '',
    marca_id: Number(m.marca_id ?? m.idMarca ?? 0),
  };
}

const emptyForm = {
  nombre: '', tipo: '', valor: '', cantidad: '', unidad_medida: '', estado: 'Activo', marca_id: 1,
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
        apiClient.get('/materias-primas'),
        apiClient.get('/marcas'),
      ]);
      setItems(unwrap<MateriaApi>(r1.data).map(normalize));
      setMarcas(unwrap<Record<string, unknown>>(r2.data).map((m) => ({
        id: Number(m.id ?? m.idMarca ?? 0),
        nombre: String(m.nombre ?? m.nombre_marca ?? ''),
      })));
    } catch {
      showToast('No se pudieron cargar los insumos', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const marcaNombre = (id: number) => marcas.find((m) => m.id === id)?.nombre || '—';

  const filtered = items.filter((m) =>
    (filtro === 'todos' || estadoKey(Number(m.cantidad) || 0) === filtro) &&
    (m.nombre ?? '').toLowerCase().includes(q.toLowerCase())
  );

  const total = items.length;
  const disponibles = items.filter((m) => Number(m.cantidad) > 0).length;
  const agotados = items.filter((m) => Number(m.cantidad) <= 0).length;
  const valorInv = items.reduce((a, m) => a + Number(m.valor || 0) * Number(m.cantidad || 0), 0);

  const openNew = () => {
    setForm({ ...emptyForm, marca_id: marcas[0]?.id ?? 1 });
    setEditId(null);
    setModal(true);
  };

  const openEdit = (m: MateriaPrima) => {
    setForm({
      nombre: m.nombre,
      tipo: m.tipo,
      valor: String(m.valor),
      cantidad: String(m.cantidad),
      unidad_medida: m.unidad_medida,
      estado: m.estado || 'Activo',
      marca_id: m.marca_id,
    });
    setEditId(m.id);
    setModal(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) { showToast('El nombre es obligatorio', true); return; }
    if (Number(form.valor) < 0 || Number(form.cantidad) < 0) {
      showToast('El valor y el stock no pueden ser negativos', true);
      return;
    }
    if (!form.marca_id) { showToast('Selecciona una marca', true); return; }
    const body = {
      nombre: form.nombre.trim(),
      tipo: form.tipo || null,
      valor: Number(form.valor) || 0,
      cantidad: Number(form.cantidad) || 0,
      unidad_medida: form.unidad_medida || null,
      estado: form.estado,
      marca_id: Number(form.marca_id),
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
    const m = items.find((x) => x.id === id);
    if (!confirm(`¿Eliminar "${m?.nombre ?? id}"?`)) return;
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
        <div className="tabla-responsive">
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
                <tr key={m.id}>
                  <td style={{ fontWeight: 600 }}>{m.nombre}</td>
                  <td>{m.tipo || '—'}</td>
                  <td>${Number(m.valor).toLocaleString()}</td>
                  <td>{m.cantidad}{m.unidad_medida ? ` ${m.unidad_medida}` : ''}</td>
                  <td>
                    <span className={`badge ${estadoKey(Number(m.cantidad) || 0) === 'agotado' ? 'badge-danger' : estadoKey(Number(m.cantidad) || 0) === 'bajo' ? 'badge-warning' : 'badge-success'}`}>
                      {textoEstado(Number(m.cantidad) || 0)}
                    </span>
                  </td>
                  <td>{marcaNombre(m.marca_id)}</td>
                  <td>
                    <button className="btn-icon btn-icon-edit" onClick={() => openEdit(m)} title="Editar">✏</button>
                    <button className="btn-icon btn-icon-del" onClick={() => del(m.id)} title="Eliminar" style={{ marginLeft: 6 }}>🗑</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>No se encontraron insumos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="modal-overlay open" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2>{editId ? 'Editar Materia Prima' : 'Nueva Materia Prima'}</h2>
            <div className="form-group">
              <label>Nombre</label>
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Harina" />
            </div>
            <div className="form-group">
              <label>Tipo</label>
              <input value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} placeholder="Ej. Básico / Carnes / Bebidas" />
            </div>
            <div className="form-group">
              <label>Valor unitario</label>
              <input type="number" min={0} value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Stock</label>
              <input type="number" min={0} value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Unidad de medida</label>
              <input value={form.unidad_medida} onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })} placeholder="Ej. kg, L, Unidades" />
            </div>
            <div className="form-group">
              <label>Marca</label>
              <select value={form.marca_id} onChange={(e) => setForm({ ...form, marca_id: Number(e.target.value) })}>
                {marcas.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
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
