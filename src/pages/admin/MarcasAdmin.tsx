import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import AdminLoading from '../../components/AdminLoading';
import ToastMessage, { useToast } from '../../components/Toast';
import '../../styles/nu-admin.css';

interface DetalleCompra {
  id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  materia_prima_id: number;
  marca_id: number;
  materia_prima?: { nombre: string };
  marca?: { nombre: string };
}

interface Compra {
  id: number;
  fecha: string;
  metodo_pago: string;
  valor_total: number;
  detalles: DetalleCompra[];
}

interface MateriaPrima { id: number; nombre: string; cantidad: number; unidad_medida?: string | null; }
interface Marca { id: number; nombre: string; }

interface Linea {
  materia_prima_id: number | null;
  cantidad: string;
  precio_unitario: string;
  marca_id: number;
  nombre_nuevo: string;
  unidad_medida: string;
}

const METODOS = ['Efectivo', 'Tarjeta', 'Transferencia', 'Nequi', 'Daviplata'];

/* ---------- Helpers ---------- */
const num = (v: unknown): number => Number(v ?? 0) || 0;
const dinero = (v: unknown): string => `$${num(v).toLocaleString('es-CO')}`;

// "2026-06-24..." -> "24/06/2026" (sin desfase de zona horaria)
const fechaCorta = (f: string): string => {
  const [y, m, d] = (f ?? '').slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : '—';
};

// Fecha de hoy en hora local (toISOString usaría UTC y en la noche marcaría el día siguiente)
const hoyLocal = (): string => {
  const n = new Date();
  const mm = String(n.getMonth() + 1).padStart(2, '0');
  const dd = String(n.getDate()).padStart(2, '0');
  return `${n.getFullYear()}-${mm}-${dd}`;
};

const mesActual = (): string => hoyLocal().slice(0, 7);

const soloNumero = (v: string): string => {
  const limpio = v.replace(',', '.').replace(/[^0-9.]/g, '');
  const [ent, ...dec] = limpio.split('.');
  return dec.length ? `${ent}.${dec.join('')}` : ent;
};

const mensajeError = (e: unknown, base: string): string => {
  const r = (e as { response?: { status?: number; data?: { message?: string; error?: string; errors?: Record<string, string[]> } } })?.response;
  if (!r) return `${base}: no hay conexión con el servidor`;
  const primerError = r.data?.errors ? Object.values(r.data.errors)[0]?.[0] : undefined;
  const detalle = primerError || r.data?.error || r.data?.message || '';
  return `${base} (${r.status})${detalle ? `: ${detalle}` : ''}`;
};

const nuevaLinea = (marcaId: number): Linea => ({
  materia_prima_id: null,
  cantidad: '',
  precio_unitario: '',
  marca_id: marcaId,
  nombre_nuevo: '',
  unidad_medida: '',
});

const grid = (cols: string): React.CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: cols,
  gap: 12,
  marginBottom: 12,
});

export default function ComprasAdmin() {
  const [items, setItems] = useState<Compra[]>([]);
  const [materias, setMaterias] = useState<MateriaPrima[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [nuevaOpen, setNuevaOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [fecha, setFecha] = useState(hoyLocal());
  const [lineas, setLineas] = useState<Linea[]>([nuevaLinea(0)]);
  const [detalle, setDetalle] = useState<Compra | null>(null);
  const [eliminar, setEliminar] = useState<Compra | null>(null);
  const { toast, showToast } = useToast();

  const load = async () => {
    try {
      const [r1, r2, r3] = await Promise.all([
        apiClient.get<Compra[]>('/compras'),
        apiClient.get<MateriaPrima[]>('/materias-primas'),
        apiClient.get<Marca[]>('/marcas'),
      ]);
      setItems(Array.isArray(r1.data) ? r1.data : []);
      setMaterias(Array.isArray(r2.data) ? r2.data : []);
      setMarcas(Array.isArray(r3.data) ? r3.data : []);
    } catch (e) {
      showToast(mensajeError(e, 'No se pudieron cargar las compras'), true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const nombreInsumo = (d: DetalleCompra): string =>
    d.materia_prima?.nombre ?? materias.find((m) => m.id === d.materia_prima_id)?.nombre ?? 'Insumo eliminado';
  const nombreProveedor = (d: DetalleCompra): string =>
    d.marca?.nombre ?? marcas.find((m) => m.id === d.marca_id)?.nombre ?? '—';

  /* ---------- Listado ---------- */
  const filtered = [...items]
    .filter((c) => {
      const t = q.trim().toLowerCase();
      return !t || String(c.id).includes(t) || (c.metodo_pago ?? '').toLowerCase().includes(t) || fechaCorta(c.fecha).includes(t);
    })
    .sort((a, b) => b.id - a.id);

  const delMes = items.filter((c) => (c.fecha ?? '').slice(0, 7) === mesActual());
  const totalMes = delMes.reduce((a, c) => a + num(c.valor_total), 0);
  const totalHisto = items.reduce((a, c) => a + num(c.valor_total), 0);

  /* ---------- Nueva compra ---------- */
  const abrirNueva = () => {
    setMetodoPago('Efectivo');
    setFecha(hoyLocal());
    setLineas([nuevaLinea(marcas[0]?.id ?? 0)]);
    setNuevaOpen(true);
  };

  const addLinea = () => setLineas([...lineas, nuevaLinea(marcas[0]?.id ?? 0)]);
  const removeLinea = (i: number) => setLineas(lineas.filter((_, idx) => idx !== i));
  const updateLinea = (i: number, patch: Partial<Linea>) => {
    const copy = [...lineas];
    copy[i] = { ...copy[i], ...patch };
    setLineas(copy);
  };

  const subtotal = (l: Linea) => num(l.cantidad) * num(l.precio_unitario);
  const totalNueva = lineas.reduce((a, l) => a + subtotal(l), 0);

  const guardar = async () => {
    if (!fecha) { showToast('Selecciona la fecha de la compra', true); return; }
    for (let i = 0; i < lineas.length; i++) {
      const l = lineas[i];
      const n = `Insumo ${i + 1}`;
      if (l.materia_prima_id === null && !l.nombre_nuevo.trim()) { showToast(`${n}: escribe el nombre del insumo nuevo`, true); return; }
      if (!(num(l.cantidad) > 0)) { showToast(`${n}: la cantidad debe ser mayor a 0`, true); return; }
      if (l.precio_unitario === '' || num(l.precio_unitario) < 0) { showToast(`${n}: escribe el precio unitario`, true); return; }
      if (!l.marca_id) { showToast(`${n}: selecciona un proveedor`, true); return; }
    }
    const payload = {
      fecha,
      metodo_pago: metodoPago,
      items: lineas.map((l) => ({
        materia_prima_id: l.materia_prima_id,
        cantidad: num(l.cantidad),
        precio_unitario: num(l.precio_unitario),
        marca_id: l.marca_id,
        nombre_nuevo: l.materia_prima_id ? undefined : l.nombre_nuevo.trim(),
        unidad_medida: l.materia_prima_id ? undefined : (l.unidad_medida.trim() || undefined),
      })),
    };
    setGuardando(true);
    try {
      await apiClient.post('/compras', payload);
      showToast('Compra registrada: el stock se sumó a Materia Prima');
      setNuevaOpen(false);
      load();
    } catch (e) {
      showToast(mensajeError(e, 'No se pudo registrar la compra'), true);
    } finally {
      setGuardando(false);
    }
  };

  /* ---------- Eliminar ---------- */
  const confirmarEliminar = async () => {
    if (!eliminar) return;
    const c = eliminar;
    setEliminar(null);
    try {
      await apiClient.delete(`/compras/${c.id}`);
      showToast('Compra eliminada');
      load();
    } catch (e) {
      showToast(mensajeError(e, 'No se pudo eliminar la compra'), true);
    }
  };

  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <h1>Gestión de Compras</h1>
          <p className="subtitulo">{items.length} compras registradas</p>
        </div>
        <button className="btn-primary" onClick={abrirNueva}>+ Nueva compra</button>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Compras este mes</span>
          <span className="stat-val">{delMes.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Invertido este mes</span>
          <span className="stat-val" style={{ fontSize: 26 }}>{dinero(totalMes)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total histórico</span>
          <span className="stat-val" style={{ fontSize: 26 }}>{dinero(totalHisto)}</span>
        </div>
      </div>

      <div className="search-bar">
        <input placeholder="Buscar por número, fecha o método de pago..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <AdminLoading texto="Cargando compras" subtexto="Reuniendo tus abastecimientos" />
      ) : (
        <div className="tabla-responsive">
          <table className="data-table" style={{ tableLayout: 'fixed', minWidth: 980 }}>
            <colgroup>
              <col style={{ width: '10%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '22%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Compra</th>
                <th>Fecha</th>
                <th>Método de pago</th>
                <th>Insumos</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 700 }}>#{c.id}</td>
                  <td>{fechaCorta(c.fecha)}</td>
                  <td><span className="badge badge-info">{c.metodo_pago}</span></td>
                  <td>{(c.detalles ?? []).length}</td>
                  <td style={{ fontWeight: 700 }}>{dinero(c.valor_total)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" className="mn-btn-edit" style={{ flex: 'none', padding: '7px 14px' }} onClick={() => setDetalle(c)}>Ver detalle</button>
                      <button type="button" className="mn-btn-del" style={{ flex: 'none', padding: '7px 14px' }} onClick={() => setEliminar(c)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>No se encontraron compras</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------- Modal: nueva compra ---------- */}
      {nuevaOpen && (
        <div className="modal-overlay open" onClick={() => setNuevaOpen(false)}>
          <div className="modal-box" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
            <h2>Registrar compra</h2>

            <div style={grid('repeat(auto-fit, minmax(200px, 1fr))')}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Fecha de la compra</label>
                <input type="date" value={fecha} max={hoyLocal()} onChange={(e) => setFecha(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Método de pago</label>
                <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                  {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            {lineas.map((l, i) => (
              <div
                key={i}
                style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 14, background: 'var(--surface-2)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-900)' }}>Insumo {i + 1}</span>
                  {lineas.length > 1 && (
                    <button type="button" className="mn-btn-del" style={{ flex: 'none', padding: '5px 12px' }} onClick={() => removeLinea(i)}>Quitar</button>
                  )}
                </div>

                <div style={grid('repeat(auto-fit, minmax(200px, 1fr))')}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Insumo</label>
                    <select
                      value={l.materia_prima_id ?? '__nuevo__'}
                      onChange={(e) => updateLinea(i, { materia_prima_id: e.target.value === '__nuevo__' ? null : Number(e.target.value) })}
                    >
                      <option value="__nuevo__">+ Nuevo insumo</option>
                      {materias.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nombre} (hay {num(m.cantidad).toLocaleString('es-CO')} {m.unidad_medida ?? ''})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Proveedor</label>
                    <select value={l.marca_id} onChange={(e) => updateLinea(i, { marca_id: Number(e.target.value) })}>
                      {marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                    </select>
                  </div>
                </div>

                {l.materia_prima_id === null && (
                  <div style={grid('repeat(auto-fit, minmax(200px, 1fr))')}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Nombre del insumo nuevo</label>
                      <input value={l.nombre_nuevo} onChange={(e) => updateLinea(i, { nombre_nuevo: e.target.value })} placeholder="Ej. Pan hamburguesa" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Unidad de medida</label>
                      <input value={l.unidad_medida} onChange={(e) => updateLinea(i, { unidad_medida: e.target.value })} placeholder="Ej. Kg, Paquetes, L" />
                    </div>
                  </div>
                )}

                {l.materia_prima_id !== null && num(l.cantidad) > 0 && (() => {
                  const m = materias.find((x) => x.id === l.materia_prima_id);
                  if (!m) return null;
                  return (
                    <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'var(--text-600)' }}>
                      Stock: {num(m.cantidad).toLocaleString('es-CO')} + {num(l.cantidad).toLocaleString('es-CO')} ={' '}
                      <span style={{ color: 'var(--brand)', fontWeight: 800 }}>
                        {(num(m.cantidad) + num(l.cantidad)).toLocaleString('es-CO')} {m.unidad_medida ?? ''}
                      </span>
                    </p>
                  );
                })()}

                <div style={{ ...grid('repeat(auto-fit, minmax(140px, 1fr))'), marginBottom: 0 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Cantidad</label>
                    <input type="text" inputMode="decimal" value={l.cantidad} onChange={(e) => updateLinea(i, { cantidad: soloNumero(e.target.value) })} />                 
                    </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Precio unitario</label>
                    <input type="text" inputMode="decimal" value={l.precio_unitario} onChange={(e) => updateLinea(i, { precio_unitario: soloNumero(e.target.value) })} placeholder="$" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Subtotal</label>
                    <div style={{ padding: '11px 14px', fontWeight: 800, fontSize: 15, color: 'var(--text-900)' }}>{dinero(subtotal(l))}</div>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              className="mn-btn-cancel"
              style={{ padding: '9px 18px', marginBottom: 6 }}
              onClick={addLinea}
            >
              + Agregar otro insumo
            </button>

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline', gap: 10, margin: '14px 0 4px' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-600)', textTransform: 'uppercase', letterSpacing: 0.7 }}>Total de la compra</span>
              <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-900)' }}>{dinero(totalNueva)}</span>
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setNuevaOpen(false)}>Cancelar</button>
              <button className="btn-save" onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Registrar compra'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Modal: detalle ---------- */}
      {detalle && (
        <div className="modal-overlay open" onClick={() => setDetalle(null)}>
          <div className="modal-box" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <h2>Compra #{detalle.id}</h2>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-600)' }}>{fechaCorta(detalle.fecha)}</span>
              <span className="badge badge-info">{detalle.metodo_pago}</span>
            </div>
            <div className="tabla-responsive" style={{ marginBottom: 16 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Insumo</th>
                    <th>Proveedor</th>
                    <th>Cant.</th>
                    <th>Precio unit.</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(detalle.detalles ?? []).map((d) => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 600 }}>{nombreInsumo(d)}</td>
                      <td>{nombreProveedor(d)}</td>
                      <td>{num(d.cantidad).toLocaleString('es-CO')}</td>
                      <td>{dinero(d.precio_unitario)}</td>
                      <td style={{ fontWeight: 700 }}>{dinero(d.subtotal)}</td>
                    </tr>
                  ))}
                  {(detalle.detalles ?? []).length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-400)' }}>Esta compra no tiene insumos registrados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ textAlign: 'right', fontWeight: 900, fontSize: 20, color: 'var(--text-900)' }}>
              Total: {dinero(detalle.valor_total)}
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setDetalle(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Confirmar eliminar ---------- */}
      {eliminar && (
        <div className="mn-modal-overlay" onClick={() => setEliminar(null)}>
          <div className="mn-modal-box" onClick={(e) => e.stopPropagation()}>
            <p>¿Eliminar la compra #{eliminar.id}? Se descontará del stock lo que esta compra sumó. Esta acción no se puede deshacer.</p>
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