import { useEffect, useState } from 'react';
import type React from 'react';
import apiClient from '../../api/client';
import ToastMessage, { useToast } from '../../components/Toast';
import AdminLoading from '../../components/AdminLoading';
import Paginacion, { paginar } from '../../components/Paginacion';
import '../../styles/nu-admin.css';
import { useEscape } from '../../hooks/useEscape';

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

const UNIDADES = ['Kg', 'Gramos', 'Libras', 'Litros', 'Mililitros', 'Unidades', 'Paquetes', 'Cajas', 'Bolsas', 'Botellas', 'Latas'];

const num = (v: unknown): number => Number(v ?? 0) || 0;

type EstadoStock = 'disponible' | 'bajo' | 'agotado';

const estadoKey = (stock: unknown): EstadoStock => {
  const s = num(stock);
  return s > 10 ? 'disponible' : s > 0 ? 'bajo' : 'agotado';
};

const textoEstado = (stock: unknown) => {
  const k = estadoKey(stock);
  return k === 'disponible' ? 'Disponible' : k === 'bajo' ? 'Bajo' : 'Agotado';
};

const claseBadge = (stock: unknown) => {
  const k = estadoKey(stock);
  return k === 'agotado' ? 'badge-danger' : k === 'bajo' ? 'badge-warning' : 'badge-success';
};

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

// Muestra el precio con punto de miles y coma decimal (ej: 9.999,99)
const formatMiles = (v: string): string => {
  const limpio = v.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
  const [ent, ...dec] = limpio.split('.');
  const entFmt = ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return dec.length ? `${entFmt},${dec.join('')}` : entFmt;
};

// Convierte "9.999,99" de vuelta a número (9999.99)
const milesANumero = (v: string): number =>
  Number(v.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '')) || 0;

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
  const [cantidadOriginal, setCantidadOriginal] = useState(0);
  const [motivo, setMotivo] = useState('');
  const [intentado, setIntentado] = useState(false);
  const [cambiandoId, setCambiandoId] = useState<number | null>(null);
  const [desactivar, setDesactivar] = useState<MateriaPrima | null>(null);
  const [loading, setLoading] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const { toast, showToast } = useToast();

  const toArray = <T,>(v: unknown): T[] =>
    Array.isArray(v) ? (v as T[]) : ((v as { data?: unknown })?.data as T[] ?? []);

  const load = async () => {
    setLoading(true);
    setErrorCarga(null);

    // allSettled: si /marcas falla, los insumos igual se muestran (y viceversa)
    const [r1, r2] = await Promise.allSettled([
      apiClient.get('/materias-primas'),
      apiClient.get('/marcas'),
    ]);

    if (r1.status === 'fulfilled') {
      setItems(toArray<MateriaPrima>(r1.value.data));
    } else {
      console.error('Error al cargar materias primas:', r1.reason);
      const msg = mensajeError(r1.reason, 'No se pudieron cargar los insumos');
      setErrorCarga(msg);
      showToast(msg, true);
    }

    if (r2.status === 'fulfilled') {
      setMarcas(toArray<Marca>(r2.value.data));
    } else {
      console.error('Error al cargar marcas:', r2.reason);
    }

    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => { setPagina(1); }, [q]);

  const marcaNombre = (id: unknown): string =>
    (marcas ?? []).find((x) => x?.id === id)?.nombre ?? '';

  const filtered = (items ?? []).filter((m) =>
    (m?.nombre ?? '').toLowerCase().includes((q ?? '').toLowerCase())
  );

  const { visibles, paginaActual } = paginar(filtered, pagina);

  const openEdit = (m: MateriaPrima) => {
    setForm({
      nombre: m?.nombre ?? '',
      tipo: m?.tipo ?? '',
      valor: m?.valor != null ? formatMiles(String(Number(m.valor))) : '',
      cantidad: m?.cantidad != null ? String(Number(m.cantidad)) : '',
      unidad_medida: m?.unidad_medida ?? '',
      marca_id: m?.marca_id ?? marcas[0]?.id ?? 1,
    });
    setEditId(m?.id ?? null);
    setCantidadOriginal(num(m?.cantidad));
    setMotivo('');
    setIntentado(false);
    setModal(true);
  };

  const errores = {
    nombre: !form.nombre.trim(),
    marca: !form.marca_id,
    cantidad: form.cantidad.trim() === '',
  };

  const bordeError = (malo: boolean): React.CSSProperties | undefined =>
    intentado && malo ? { borderColor: 'var(--danger)' } : undefined;

  const guardar = async () => {
    if (!editId) return;
    setIntentado(true);
    if (errores.nombre) { showToast('El nombre es obligatorio', true); return; }
    if (errores.marca) { showToast('Selecciona un proveedor', true); return; }
    if (errores.cantidad) { showToast('Escribe la cantidad', true); return; }

    const cambioCantidad = Number(form.cantidad) !== cantidadOriginal;
    const valorActual = items.find((x) => x.id === editId)?.valor ?? 0;
    const body = {
      nombre: form.nombre.trim(),
      tipo: form.tipo.trim() || null,
      unidad_medida: form.unidad_medida.trim() || null,
      valor: form.valor.trim() === '' ? Number(valorActual) : milesANumero(form.valor),
      cantidad: Number(form.cantidad),
      marca_id: Number(form.marca_id),
      ...(cambioCantidad ? { motivo: motivo.trim() || 'Ajuste manual de inventario' } : {}),
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

  const esInactivo = (m: MateriaPrima) => m?.estado === 'Inactivo';

  /** Activa o desactiva el insumo (ya no se elimina: así se conserva todo el historial). */
  const alternarEstado = async (m: MateriaPrima) => {
    if (m?.id == null || cambiandoId !== null) return;
    setDesactivar(null);
    const nuevo = esInactivo(m) ? 'Activo' : 'Inactivo';
    setCambiandoId(m.id);
    try {
      await apiClient.put(`/materias-primas/${m.id}`, { estado: nuevo });
      setItems((prev) => prev.map((x) => (x.id === m.id ? { ...x, estado: nuevo } : x)));
      showToast(nuevo === 'Activo' ? 'Materia prima activada' : 'Materia prima desactivada');
    } catch (err) {
      console.error('Error al cambiar el estado de la materia prima:', err);
      showToast(mensajeError(err, 'No se pudo cambiar el estado'), true);
    } finally {
      setCambiandoId(null);
    }
  };

  useEscape([
    [!!desactivar, () => setDesactivar(null)],
    [modal, () => setModal(false)],
  ]);

  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <h1>Materia Prima</h1>
          <p className="subtitulo">Existencias actuales de tus insumos</p>
        </div>
      </div>

      {errorCarga && (
        <div
          role="alert"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            marginBottom: 20, padding: '12px 16px', borderRadius: 12,
            border: '1px solid var(--danger)', color: 'var(--danger)', fontWeight: 600,
          }}
        >
          <span>{errorCarga}</span>
          <button type="button" className="btn-primary" style={{ padding: '7px 18px' }} onClick={load}>
            Reintentar
          </button>
        </div>
      )}

      <div className="mn-search-wrap" style={{ marginBottom: 24 }}>
        <svg className="mn-search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input className="mn-search" type="text" placeholder="Buscar insumo..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <AdminLoading texto="Cargando materia prima" subtexto="Revisando tu inventario" />
      ) : (
        <div className="tabla-responsive">
          <table className="data-table" style={{ tableLayout: 'fixed', minWidth: 1180 }}>
            <colgroup>
              <col style={{ width: '16%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '20%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Nombre del insumo</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th style={{ textAlign: 'right' }}>Precio total</th>
                <th>Stock</th>
                <th>Estado</th>
                <th>Proveedor</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((m) => (
                <tr key={m?.id} className={esInactivo(m) ? 'fila-inactiva' : undefined}>
                  <td style={{ fontWeight: 600 }}>{m?.nombre ?? 'Sin nombre'}</td>
                  <td>{m?.tipo || '—'}</td>
                  <td style={{ fontWeight: 600 }}>
                    {num(m?.cantidad).toLocaleString('es-CO')}
                    {m?.unidad_medida ? (
                      <span style={{ marginLeft: 8, fontWeight: 500, color: 'var(--text-400)' }}>{m.unidad_medida}</span>
                    ) : null}
                  </td>
                  <td style={{ fontWeight: 700, textAlign: 'right' }}>
                    ${((num(m?.valor) || 0) * (num(m?.cantidad) || 0)).toLocaleString('es-CO')}
                  </td>
                  <td>
                    <span className={`badge ${claseBadge(m?.cantidad)}`}>
                      {textoEstado(m?.cantidad)}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${esInactivo(m) ? 'badge-danger' : 'badge-success'}`}>
                      {esInactivo(m) ? 'Inactivo' : 'Activo'}
                    </span>
                  </td>
                  <td>{marcaNombre(m?.marca_id) || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" className="mn-btn-edit" style={{ flex: 'none', padding: '7px 18px' }} onClick={() => openEdit(m)}>Editar</button>
                      <button
                        type="button"
                        className={esInactivo(m) ? 'mn-btn-edit' : 'mn-btn-del'}
                        style={{ flex: 'none', padding: '7px 18px' }}
                        disabled={cambiandoId === m?.id}
                        onClick={() => (esInactivo(m) ? alternarEstado(m) : setDesactivar(m))}
                      >
                        {esInactivo(m) ? 'Activar' : 'Desactivar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>{errorCarga ? 'No se pudo cargar el inventario' : 'No se encontraron insumos'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && <Paginacion total={filtered.length} pagina={paginaActual} onCambiar={setPagina} />}

      {modal && (
        <div className="modal-overlay open" onClick={() => setModal(false)}>
          <div className="modal-box" style={{ maxWidth: 560, padding: '28px 32px' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: 18, paddingBottom: 12 }}>Editar Materia Prima</h2>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Nombre del insumo<span className="mn-req">*</span></label>
              <input
                style={bordeError(errores.nombre)}
                value={form.nombre}
                placeholder="Ej. Pan de hamburguesa"
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Tipo <span style={{ opacity: 0.6, fontWeight: 500 }}>(opcional)</span></label>
              <input
                placeholder="Ej. Carne, Bebida, Panadería..."
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Cantidad real <span className="mn-req">*</span></label>
                <input
                  type="text"
                  inputMode="decimal"
                  style={bordeError(errores.cantidad)}
                  value={form.cantidad}
                  onChange={(e) => setForm({ ...form, cantidad: soloNumero(e.target.value) })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Unidad <span style={{ opacity: 0.6, fontWeight: 500 }}>(opcional)</span></label>
                <select value={form.unidad_medida} onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })}>
                  <option value="">Seleccionar...</option>
                  {(form.unidad_medida && !UNIDADES.includes(form.unidad_medida) ? [form.unidad_medida, ...UNIDADES] : UNIDADES).map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Precio</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ ...adornoBase, left: 14 }}>$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    style={{ paddingLeft: 30 }}
                    placeholder="Se mantiene el actual"
                    value={form.valor}
                    onChange={(e) => setForm({ ...form, valor: formatMiles(e.target.value) })}
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Proveedor <span className="mn-req">*</span></label>
                <select
                  style={bordeError(errores.marca)}
                  value={form.marca_id}
                  onChange={(e) => setForm({ ...form, marca_id: Number(e.target.value) })}
                >
                  {(marcas ?? []).map((m) => (
                    <option key={m?.id} value={m?.id}>{m?.nombre ?? 'Sin nombre'}</option>
                  ))}
                </select>
              </div>
            </div>

            {Number(form.cantidad) !== cantidadOriginal && (
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>
                  Motivo del ajuste <span style={{ opacity: 0.6, fontWeight: 500 }}>(opcional)</span>
                  {' '}· antes: {cantidadOriginal.toLocaleString('es-CO')}, ahora: {(Number(form.cantidad) || 0).toLocaleString('es-CO')}
                </label>
                <input
                  placeholder="Ej: conteo físico, producto dañado..."
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                />
              </div>
            )}

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-save" onClick={guardar}>Actualizar</button>
            </div>
          </div>
        </div>
      )}

      {desactivar && (
        <div className="mn-modal-overlay" onClick={() => setDesactivar(null)}>
          <div className="mn-modal-box" onClick={(e) => e.stopPropagation()}>
            <p>
              ¿Desactivar la materia prima "{desactivar.nombre}"? Ya no se podrá elegir en nuevas compras, pero podrás activarla de nuevo cuando quieras.
            </p>
            <div className="mn-modal-actions">
              <button type="button" className="mn-btn-cancel" onClick={() => setDesactivar(null)}>Cancelar</button>
              <button type="button" className="mn-btn-confirm" onClick={() => alternarEstado(desactivar)}>Sí, desactivar</button>
            </div>
          </div>
        </div>
      )}

      <ToastMessage toast={toast} />
    </div>
  );
}