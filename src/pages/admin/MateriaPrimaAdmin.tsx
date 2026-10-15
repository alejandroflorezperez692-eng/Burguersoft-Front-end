import { useEffect, useState } from 'react';
import type React from 'react';
import apiClient from '../../api/client';
import ToastMessage, { useToast } from '../../components/Toast';
import AdminLoading from '../../components/AdminLoading';
import '../../styles/nu-admin.css';

interface MateriaPrima {
  id: number;
  nombre: string;
  tipo?: string | null;
  valor: number;
  cantidad: number;
  unidad_medida?: string | null;
  marca_id: number;
  estado?: string | null;
}

interface Marca {
  id: number;
  nombre: string;
}

const num = (v: unknown): number => Number(v ?? 0) || 0;

type EstadoStock = 'disponible' | 'bajo' | 'agotado';

const estadoKey = (stock: unknown): EstadoStock => {
  const s = num(stock);
  return s > 10 ? 'disponible' : s > 0 ? 'bajo' : 'agotado';
};

const textoEstado = (stock: unknown) => {
  const k = estadoKey(stock);
  return k === 'disponible' ? 'Disponible' : k === 'bajo' ? 'Stock bajo' : 'Agotado';
};

const claseBadge = (stock: unknown) => {
  const k = estadoKey(stock);
  return k === 'agotado' ? 'badge-danger' : k === 'bajo' ? 'badge-warning' : 'badge-success';
};

/**
 * Vista de solo lectura: el admin consulta cuánto queda de cada insumo
 * (paquetes de pan, kilos de papa, carne, etc.). El stock se alimenta
 * desde el módulo de Compras, por eso aquí no se crea, edita ni elimina.
 */
// Arma un mensaje con el motivo real que devolvió el servidor
const mensajeError = (e: unknown, base: string): string => {
  const r = (e as { response?: { status?: number; data?: { message?: string; error?: string; errors?: Record<string, string[]> } } })?.response;
  if (!r) return `${base}: no hay conexión con el servidor`;
  const primerError = r.data?.errors ? Object.values(r.data.errors)[0]?.[0] : undefined;
  const detalle = primerError || r.data?.error || r.data?.message || '';
  return `${base} (${r.status})${detalle ? `: ${detalle}` : ''}`;
};

// Deja solo dígitos y un punto decimal (acepta coma como punto)
const soloNumero = (v: string): string => {
  const limpio = v.replace(',', '.').replace(/[^0-9.]/g, '');
  const [ent, ...dec] = limpio.split('.');
  return dec.length ? `${ent}.${dec.join('')}` : ent;
};

const adornoBase: React.CSSProperties = {
  position: 'absolute', top: '50%', transform: 'translateY(-50%)',
  color: 'var(--text-400)', fontWeight: 600, fontSize: 14, pointerEvents: 'none',
};

const emptyForm = {
  nombre: '', tipo: '', valor: '', cantidad: '', unidad_medida: '', marca_id: 1,
};

export default function MateriaPrimaAdmin() {
  const [items, setItems] = useState<MateriaPrima[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [eliminar, setEliminar] = useState<MateriaPrima | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast, showToast } = useToast();

  const toArray = <T,>(v: unknown): T[] =>
    Array.isArray(v) ? (v as T[]) : ((v as { data?: unknown })?.data as T[] ?? []);

  const load = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        apiClient.get('/materias-primas'),
        apiClient.get('/marcas'),
      ]);
      setItems(toArray<MateriaPrima>(r1.data));
      setMarcas(toArray<Marca>(r2.data));
    } catch {
      showToast('No se pudieron cargar los insumos', true);
      setItems([]);
      setMarcas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // El index no trae la marca: se resuelve con la lista de /marcas
  const marcaNombre = (id: unknown): string =>
    (marcas ?? []).find((x) => x?.id === id)?.nombre ?? '';

  const filtered = (items ?? []).filter((m) =>
    (m?.nombre ?? '').toLowerCase().includes((q ?? '').toLowerCase())
  );

  const total = (items ?? []).length;
  const disponibles = (items ?? []).filter((m) => num(m?.cantidad) > 0).length;
  const agotados = (items ?? []).filter((m) => num(m?.cantidad) <= 0).length;

  const openEdit = (m: MateriaPrima) => {
    setForm({
      nombre: m?.nombre ?? '',
      tipo: m?.tipo ?? '',
      valor: m?.valor != null ? String(Number(m.valor)) : '',
      cantidad: m?.cantidad != null ? String(Number(m.cantidad)) : '',
      unidad_medida: m?.unidad_medida ?? '',
      marca_id: m?.marca_id ?? marcas[0]?.id ?? 1,
    });
    setEditId(m?.id ?? null);
    setModal(true);
  };

  const guardar = async () => {
    if (!editId) return;
    if (!form.nombre.trim()) { showToast('El nombre es obligatorio', true); return; }
    if (Number(form.valor) < 0 || Number(form.cantidad) < 0) {
      showToast('El valor y el stock no pueden ser negativos', true);
      return;
    }
    if (!form.marca_id) { showToast('Selecciona una marca', true); return; }
    const body = {
      nombre: form.nombre.trim(),
      tipo: form.tipo.trim() || null,
      valor: Number(form.valor) || 0,
      cantidad: Number(form.cantidad) || 0,
      marca_id: Number(form.marca_id),
    };
    try {
      await apiClient.put(`/materias-primas/${editId}`, body);
      showToast('Materia prima actualizada');
      setModal(false);
      load();
    } catch (e) {
      console.error('Error al actualizar materia prima:', e);
      showToast(mensajeError(e, 'No se pudo actualizar'), true);
    }
  };

  const confirmarEliminar = async () => {
    if (!eliminar) return;
    const m = eliminar;
    setEliminar(null);
    try {
      await apiClient.delete(`/materias-primas/${m.id}`);
      showToast('Materia prima eliminada');
      load();
    } catch (e) {
      console.error('Error al eliminar materia prima:', e);
      showToast(mensajeError(e, 'No se pudo eliminar'), true);
    }
  };

  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <h1>Materia Prima</h1>
          <p className="subtitulo">Existencias actuales de tus insumos</p>
        </div>
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
      </div>

      <div className="search-bar">
        <input placeholder="Buscar insumo..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <AdminLoading texto="Cargando materia prima" subtexto="Revisando tu inventario" />
      ) : (
        <div className="tabla-responsive">
          <table className="data-table" style={{ tableLayout: 'fixed', minWidth: 980 }}>
            <colgroup>
              <col style={{ width: '20%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '24%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Estado</th>
                <th>Marca</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(filtered ?? []).map((m) => (
                <tr key={m?.id}>
                  <td style={{ fontWeight: 600 }}>{m?.nombre ?? 'Sin nombre'}</td>
                  <td>{m?.tipo || '—'}</td>
                  <td style={{ fontWeight: 600 }}>
                    {num(m?.cantidad).toLocaleString('es-CO')} {m?.unidad_medida ?? ''}
                  </td>
                  <td>
                    <span className={`badge ${claseBadge(m?.cantidad)}`}>
                      {textoEstado(m?.cantidad)}
                    </span>
                  </td>
                  <td>{marcaNombre(m?.marca_id) || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" className="mn-btn-edit" style={{ flex: 'none', padding: '7px 18px' }} onClick={() => openEdit(m)}>Editar</button>
                      <button type="button" className="mn-btn-del" style={{ flex: 'none', padding: '7px 18px' }} onClick={() => m?.id != null && setEliminar(m)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>No se encontraron insumos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="modal-overlay open" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2>Editar Materia Prima</h2>
            <div className="form-group">
              <label>Nombre</label>
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Tipo</label>
                <input value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Marca</label>
                <select value={form.marca_id} onChange={(e) => setForm({ ...form, marca_id: Number(e.target.value) })}>
                  {(marcas ?? []).map((m) => (
                    <option key={m?.id} value={m?.id}>{m?.nombre ?? 'Sin nombre'}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Precio</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ ...adornoBase, left: 14 }}>$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    style={{ paddingLeft: 30 }}
                    value={form.valor}
                    onChange={(e) => setForm({ ...form, valor: soloNumero(e.target.value) })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Cantidad que queda</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.cantidad}
                  onChange={(e) => setForm({ ...form, cantidad: soloNumero(e.target.value) })}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-save" onClick={guardar}>Actualizar</button>
            </div>
          </div>
        </div>
      )}

      {eliminar && (
        <div className="mn-modal-overlay" onClick={() => setEliminar(null)}>
          <div className="mn-modal-box" onClick={(e) => e.stopPropagation()}>
            <p>¿Eliminar "{eliminar.nombre}"? Se borrará también de las compras y recetas donde aparezca. Esta acción no se puede deshacer.</p>
            <div className="mn-modal-actions">
              <button type="button" className="mn-btn-cancel" onClick={() => setEliminar(null)}>Cancelar</button>
              <button type="button" className="mn-btn-confirm" onClick={confirmarEliminar}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      <ToastMessage toast={toast} />
    </div>
  );
}