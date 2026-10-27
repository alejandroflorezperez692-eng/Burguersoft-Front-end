import { useEffect, useRef, useState } from 'react';
import apiClient from '../../api/client';
import ToastMessage, { useToast } from '../../components/Toast';
import AdminLoading from '../../components/AdminLoading';
import Paginacion, { paginar } from '../../components/Paginacion';
import '../../styles/nu-admin.css';

interface FilaCierre {
  id: number;
  nombre: string;
  tipo?: string | null;
  unidad_medida?: string | null;
  stock_inicial: number;
  compras: number;
  consumo: number;
  stock_esperado: number;
}

interface CierreHistorial {
  id: number;
  created_at: string;
  usuario: string | null;
  observacion: string | null;
  insumos: number;
  insumos_con_diferencia: number;
}

interface ItemDetalle {
  materia_prima_id: number;
  nombre: string;
  unidad_medida?: string | null;
  stock_esperado: number;
  conteo_real: number;
  diferencia: number;
}

interface DetalleCierre {
  id: number;
  created_at: string;
  usuario: string | null;
  observacion: string | null;
  items: ItemDetalle[];
}

const n = (v: unknown): number => Number(v ?? 0) || 0;
const fmt = (v: number): string => v.toLocaleString('es-CO', { maximumFractionDigits: 2 });
const soloNumero = (v: string): string => {
  const limpio = v.replace(',', '.').replace(/[^0-9.]/g, '');
  const [ent, ...dec] = limpio.split('.');
  return dec.length ? `${ent}.${dec.join('')}` : ent;
};

export default function CierreInventarioAdmin() {
  const [filas, setFilas] = useState<FilaCierre[]>([]);
  const [desde, setDesde] = useState('');
  const [conteos, setConteos] = useState<Record<number, string>>({});
  const [observacion, setObservacion] = useState('');
  const [historial, setHistorial] = useState<CierreHistorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [detalle, setDetalle] = useState<DetalleCierre | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState<number | null>(null);
  const { toast, showToast } = useToast();

  // Paginación: la tabla de conteo y el historial de cierres, de 10 en 10
  const [paginaConteo, setPaginaConteo] = useState(1);
  const [paginaCierres, setPaginaCierres] = useState(1);
  const conteoPag = paginar(filas, paginaConteo);
  const cierresPag = paginar(historial, paginaCierres);
  const cierres = cierresPag.visibles;

  // Evita pedir los mismos datos dos veces a la vez (StrictMode, recargas en caliente, doble clic)
  const cargandoRef = useRef(false);

  const load = async () => {
    if (cargandoRef.current) return;
    cargandoRef.current = true;
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        apiClient.get('/inventario/cierre/preview'),
        apiClient.get('/inventario/cierres'),
      ]);
      setFilas(r1.data.insumos ?? []);
      setDesde(r1.data.desde ?? '');
      setHistorial(r2.data ?? []);
      setConteos({});
      setObservacion('');
    } catch {
      showToast('No se pudo cargar el cierre de inventario', true);
    } finally {
      cargandoRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Lo que se usó = lo que el sistema creía que había − lo que realmente hay
  const usado = (f: FilaCierre): number | null => {
    const c = conteos[f.id];
    return c === undefined || c === '' ? null : n(f.stock_esperado) - n(c);
  };

  const contados = filas.filter((f) => conteos[f.id] !== undefined && conteos[f.id] !== '');

  // Atajo: rellena todo con lo esperado; luego solo corriges lo que cambió
  const llenarTodo = () =>
    setConteos(Object.fromEntries(filas.map((f) => [f.id, String(n(f.stock_esperado))])));

  const verDetalle = async (id: number) => {
    setCargandoDetalle(id);
    try {
      const r = await apiClient.get<DetalleCierre>(`/inventario/cierres/${id}`);
      setDetalle(r.data);
    } catch {
      showToast('No se pudo cargar el detalle del cierre', true);
    } finally {
      setCargandoDetalle(null);
    }
  };

  const textoCambio = (dif: number, u: string): string =>
    Math.abs(dif) < 0.005 ? 'Sin cambio' : dif < 0 ? `Usado ${fmt(-dif)} ${u}` : `Sobra ${fmt(dif)} ${u}`;

  const descargarPdf = (d: DetalleCierre) => {
    const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const f = new Date(d.created_at);
    const filasHtml = d.items.map((i) => {
      const u = i.unidad_medida ?? '';
      return `<tr>
        <td>${esc(i.nombre)}</td>
        <td>${fmt(n(i.stock_esperado))} ${esc(u)}</td>
        <td>${fmt(n(i.conteo_real))} ${esc(u)}</td>
        <td>${esc(textoCambio(n(i.diferencia), u))}</td>
      </tr>`;
    }).join('');

    const w = window.open('', '_blank');
    if (!w) { showToast('Permite las ventanas emergentes para descargar el PDF', false, true); return; }
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8">
      <title>Cierre de inventario N.º ${d.id}</title>
      <style>
        body{font-family:Arial,sans-serif;color:#1a0a00;padding:32px}
        h1{margin:0 0 4px;font-size:22px} p{margin:2px 0;font-size:13px}
        table{width:100%;border-collapse:collapse;margin-top:20px;font-size:13px}
        th{background:#1a0a00;color:#fff;text-align:left;padding:8px 10px}
        td{padding:8px 10px;border-bottom:1px solid #ddd}
      </style></head><body>
      <h1>Cierre de inventario N.º ${d.id}</h1>
      <p><b>Fecha:</b> ${f.toLocaleDateString('es-CO')} &nbsp; <b>Hora:</b> ${f.toLocaleTimeString('es-CO')}</p>
      <p><b>Responsable:</b> ${esc(d.usuario ?? '—')}</p>
      <p><b>Observación:</b> ${esc(d.observacion ?? '—')}</p>
      <table>
        <thead><tr><th>Materia prima</th><th>Había</th><th>Contó</th><th>Resultado</th></tr></thead>
        <tbody>${filasHtml}</tbody>
      </table></body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const guardar = async () => {
    if (contados.length === 0) {
      showToast('Escribe el conteo real de al menos una materia prima');
      return;
    }
    const sinContar = filas.length - contados.length;
    const aviso = sinContar > 0 ? ` Las ${sinContar} que no contaste quedan como están.` : '';
    if (!confirm(`¿Guardar el cierre de ${contados.length} materias primas?${aviso}`)) return;
    setGuardando(true);
    try {
      await apiClient.post('/inventario/cierres', {
        observacion: observacion.trim() || null,
        conteos: contados.map((f) => ({ materia_prima_id: f.id, conteo_real: n(conteos[f.id]) })),
      });
      showToast('Cierre guardado: el stock arranca desde el conteo real');
      load();
    } catch (e) {
      const d = (e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
      const primero = d?.errors ? Object.values(d.errors)[0]?.[0] : undefined;
      showToast(primero || d?.message || 'No se pudo guardar el cierre', true);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <h1>Cierre de inventario</h1>
          <p className="subtitulo">
            Cuenta lo que hay en la cocina al terminar el día. Movimientos desde {desde ? new Date(desde).toLocaleString('es-CO') : '—'}
          </p>
        </div>
      </div>

      {loading ? (
        <AdminLoading texto="Cargando cierre" subtexto="Calculando el stock esperado" />
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
            <p style={{ fontSize: 14, color: 'var(--text-400)', fontWeight: 500, margin: 0 }}>
              Escribe lo que hay <b>ahora</b> de cada materia prima. El sistema te dice cuánto se usó.
            </p>
            <button type="button" className="btn-primary" style={{ padding: '9px 22px' }} onClick={llenarTodo}>
              Todo está igual
            </button>
          </div>

          <div className="tabla-responsive">
            <table className="data-table" style={{ minWidth: 720 }}>
              <thead>
                <tr>
                  <th>Materia prima</th>
                  <th>Tipo</th>
                  <th>En sistema</th>
                  <th>Conteo real</th>
                  <th>Usado hoy</th>
                </tr>
              </thead>
              <tbody>
                {conteoPag.visibles.map((f) => {
                  const us = usado(f);
                  const u = f.unidad_medida ?? '';
                  return (
                    <tr key={f.id}>
                      <td style={{ fontWeight: 600 }}>{f.nombre}</td>
                      <td>{f.tipo || '—'}</td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{fmt(n(f.stock_esperado))} {u}</div>
                        {n(f.compras) > 0 && (
                          <div style={{ fontSize: 12, color: 'var(--text-400)', fontWeight: 500 }}>
                            Inició {fmt(n(f.stock_inicial))} · +{fmt(n(f.compras))} compras
                          </div>
                        )}
                      </td>
                      <td>
                        <input
                          type="text"
                          inputMode="decimal"
                          style={{ width: 110 }}
                          value={conteos[f.id] ?? ''}
                          onChange={(e) => setConteos({ ...conteos, [f.id]: soloNumero(e.target.value) })}
                        />
                      </td>
                      <td>
                        {us === null ? '—' : Math.abs(us) < 0.005 ? (
                          <span className="badge badge-success">Igual</span>
                        ) : us > 0 ? (
                          <span className="badge badge-warning">Usado {fmt(us)} {u}</span>
                        ) : (
                          <span className="badge badge-danger">Sobra {fmt(-us)} {u}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filas.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>No hay materia prima</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Paginacion total={filas.length} pagina={conteoPag.paginaActual} onCambiar={setPaginaConteo} />

          <div className="form-group" style={{ marginTop: 16 }}>
            <label>Observación (opcional)</label>
            <input value={observacion} maxLength={120} onChange={(e) => setObservacion(e.target.value)} placeholder="Ej: cierre del turno de la noche" />
          </div>
          <div className="modal-actions" style={{ marginTop: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-400)', fontWeight: 600, marginRight: 'auto' }}>
              Contadas {contados.length} de {filas.length}
            </span>
            <button className="btn-save" disabled={guardando} onClick={guardar}>
              {guardando ? 'Guardando...' : 'Guardar cierre'}
            </button>
          </div>

          <div style={{ marginTop: 40, marginBottom: 16, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900, color: 'var(--text-900)', letterSpacing: -0.3, margin: 0 }}>
              Cierres anteriores
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-400)', fontWeight: 500, margin: 0, marginLeft: 'auto', textAlign: 'right' }}>
              {historial.length} {historial.length === 1 ? 'cierre registrado' : 'cierres registrados'}
            </p>
          </div>
          <div className="tabla-responsive">
            <table className="data-table" style={{ tableLayout: 'fixed', minWidth: 900 }}>
              <colgroup>
                <col style={{ width: '6%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '26%' }} />
                <col style={{ width: '16%' }} />
              </colgroup>
              <thead>
                <tr><th>N.º</th><th>Fecha y hora</th><th>Responsable</th><th>Materias primas</th><th>Con diferencia</th><th>Observación</th><th>Detalle</th></tr>
              </thead>
              <tbody>
                {cierres.map((h) => (
                  <tr key={h.id}>
                    <td>{h.id}</td>
                    <td>
                      <div>{new Date(h.created_at).toLocaleDateString('es-CO')}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-400)', fontWeight: 500 }}>
                        {new Date(h.created_at).toLocaleTimeString('es-CO')}
                      </div>
                    </td>
                    <td>{h.usuario ?? '—'}</td>
                    <td>{h.insumos}</td>
                    <td>{h.insumos_con_diferencia}</td>
                    <td
                      title={h.observacion ?? ''}
                      style={{ maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {h.observacion ?? '—'}
                    </td>
                    <td>
                      <button type="button" className="mn-btn-edit" style={{ flex: 'none', padding: '7px 18px' }}
                        disabled={cargandoDetalle === h.id} onClick={() => verDetalle(h.id)}>
                        {cargandoDetalle === h.id ? 'Cargando...' : 'Ver detalle'}
                      </button>
                    </td>
                  </tr>
                ))}
                {historial.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>Aún no hay cierres</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <Paginacion total={historial.length} pagina={cierresPag.paginaActual} onCambiar={setPaginaCierres} etiqueta="cierres" />
        </>
      )}
      {detalle && (
        <div className="modal-overlay open" onClick={() => setDetalle(null)}>
          <div className="modal-box" style={{ maxWidth: 680, padding: '28px 32px' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: 6 }}>Cierre N.º {detalle.id}</h2>
            <p style={{ fontSize: 14, color: 'var(--text-400)', fontWeight: 500, marginBottom: 4 }}>
              {new Date(detalle.created_at).toLocaleDateString('es-CO')} · a las {new Date(detalle.created_at).toLocaleTimeString('es-CO')}
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-400)', fontWeight: 500, marginBottom: 16, wordBreak: 'break-word' }}>
              Responsable: {detalle.usuario ?? '—'}{detalle.observacion ? ` · ${detalle.observacion}` : ''}
            </p>

            <div className="tabla-responsive" style={{ maxHeight: 340, overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr><th>Materia prima</th><th>Había</th><th>Contó</th><th>Resultado</th></tr>
                </thead>
                <tbody>
                  {detalle.items.map((i) => {
                    const u = i.unidad_medida ?? '';
                    const dif = n(i.diferencia);
                    return (
                      <tr key={i.materia_prima_id}>
                        <td style={{ fontWeight: 600 }}>{i.nombre}</td>
                        <td>{fmt(n(i.stock_esperado))} {u}</td>
                        <td style={{ fontWeight: 700 }}>{fmt(n(i.conteo_real))} {u}</td>
                        <td>
                          <span className={`badge ${Math.abs(dif) < 0.005 ? 'badge-success' : dif < 0 ? 'badge-warning' : 'badge-danger'}`}>
                            {textoCambio(dif, u)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {detalle.items.length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--text-400)' }}>Este cierre no tiene materias primas</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="modal-actions" style={{ marginTop: 18 }}>
              <button className="btn-cancel" onClick={() => setDetalle(null)}>Cerrar</button>
              <button className="btn-save" onClick={() => descargarPdf(detalle)}>Descargar PDF</button>
            </div>
          </div>
        </div>
      )}

      <ToastMessage toast={toast} />
    </div>
  );
}