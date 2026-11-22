import { useEffect, useMemo, useRef, useState } from 'react';
import { validarCamposVisibles } from '../../utils/validarCampos';
import apiClient from '../../api/client';
import AdminDatePicker from '../../components/AdminDatePicker';
import { useToast } from '../../components/Toast';
import AdminLoading from '../../components/AdminLoading';
import Paginacion, { paginar } from '../../components/Paginacion';
import '../../styles/nu-admin.css';
import { useEscape } from '../../hooks/useEscape';
import { mensajeError } from '../../utils/errores';
import SelectOscuro from '../../components/SelectOscuro';
import logoImg from '../../assets/img/logo-burguersoft.png';
import Boton from '../../components/Boton';
import { Check as CheckIcon, Eye as EyeIcon, Save as SaveIcon } from 'lucide-react';

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

type EstadoConteo = 'todos' | 'sin_contar' | 'contados';

const n = (v: unknown): number => Number(v ?? 0) || 0;
const fmt = (v: number): string => v.toLocaleString('es-CO', { maximumFractionDigits: 2 });
const soloNumero = (v: string): string => {
  const limpio = v.replace(',', '.').replace(/[^0-9.]/g, '');
  const [ent, ...dec] = limpio.split('.');
  return dec.length ? `${ent}.${dec.join('')}` : ent;
};
const normalizar = (t: string): string =>
  t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const diaLocal = (iso: string): string => {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const estiloFiltro: React.CSSProperties = { padding: '8px 12px', minWidth: 0 };
const estiloEtiqueta: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--text-400)',
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
  const { showToast, confirmar } = useToast();


  const [busqueda, setBusqueda] = useState('');
  const [estadoConteo, setEstadoConteo] = useState<EstadoConteo>('todos');

  const [fDesde, setFDesde] = useState('');
  const [fHasta, setFHasta] = useState('');
  const [fResponsable, setFResponsable] = useState('');
  const [fSoloDiferencias, setFSoloDiferencias] = useState(false);

 
  const [paginaConteo, setPaginaConteo] = useState(1);
  const [paginaCierres, setPaginaCierres] = useState(1);

  const cargandoRef = useRef(false);

  const load = async (silencioso = false) => {
  if (cargandoRef.current) return;
  cargandoRef.current = true;
  if (!silencioso) setLoading(true);
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


  useEffect(() => { setPaginaConteo(1); }, [busqueda, estadoConteo]);
  useEffect(() => { setPaginaCierres(1); }, [fDesde, fHasta, fResponsable, fSoloDiferencias]);

  const usado = (f: FilaCierre): number | null => {
    const c = conteos[f.id];
    return c === undefined || c === '' ? null : n(f.stock_esperado) - n(c);
  };

  const estaContada = (f: FilaCierre) => conteos[f.id] !== undefined && conteos[f.id] !== '';

  const contados = filas.filter(estaContada);

  const filasVisibles = useMemo(() => {
    const q = normalizar(busqueda);
    return filas.filter((f) => {
      if (q && !normalizar(f.nombre).includes(q)) return false;
      const c = conteos[f.id] !== undefined && conteos[f.id] !== '';
      if (estadoConteo === 'sin_contar' && c) return false;
      if (estadoConteo === 'contados' && !c) return false;
      return true;
    });
  }, [filas, conteos, busqueda, estadoConteo]);


  const conteoPag = paginar(filasVisibles, paginaConteo);

  const hayFiltroConteo = busqueda.trim() !== '' || estadoConteo !== 'todos';

  const responsables = useMemo(
    () => Array.from(new Set(historial.map((h) => h.usuario).filter((u): u is string => !!u))).sort((a, b) => a.localeCompare(b, 'es')),
    [historial],
  );

 
  const historialFiltrado = useMemo(
    () =>
      historial.filter((h) => {
        const dia = diaLocal(h.created_at);
        if (fDesde && dia < fDesde) return false;
        if (fHasta && dia > fHasta) return false;
        if (fResponsable && (h.usuario ?? '') !== fResponsable) return false;
        if (fSoloDiferencias && n(h.insumos_con_diferencia) <= 0) return false;
        return true;
      }),
    [historial, fDesde, fHasta, fResponsable, fSoloDiferencias],
  );


  const cierresPag = paginar(historialFiltrado, paginaCierres);
  const cierres = cierresPag.visibles;

  const hayFiltroHistorial = fDesde !== '' || fHasta !== '' || fResponsable !== '' || fSoloDiferencias;

  const limpiarFiltrosConteo = () => { setBusqueda(''); setEstadoConteo('todos'); };
  const limpiarFiltrosHistorial = () => { setFDesde(''); setFHasta(''); setFResponsable(''); setFSoloDiferencias(false); };

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

  const descargarPdf = async (d: DetalleCierre) => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const M = 14;
      const limpio = (t: string) => t.replace(/[\u2013\u2014]/g, '-');
      const f = new Date(d.created_at);

      const logo = await new Promise<HTMLImageElement | null>((res) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = () => res(null);
        im.src = logoImg;
      });

      let y = 16;
      const logoW = 24;
      const logoH = logo ? (logo.naturalHeight / logo.naturalWidth) * logoW : 0;
      let xTexto = M;
      if (logo) {
        doc.addImage(logo, 'PNG', M, y, logoW, logoH);
        xTexto = M + logoW + 6;
      }
      doc.setTextColor(26, 10, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('Burguersoft', xTexto, y + 8);
      doc.setFontSize(10);
      doc.text('EL ORIENTE', xTexto, y + 14, { charSpace: 1.5 });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(80, 70, 60);
      doc.text('Calle 9 # 1A-43, Barrio El Oriente · Sogamoso, Boyacá', xTexto, y + 20);
      doc.text('Tel. 314 2208706 · burguersoft@gmail.com', xTexto, y + 25);

      y += Math.max(logoH, 27) + 5;
      doc.setDrawColor(232, 130, 26);
      doc.setLineWidth(0.6);
      doc.line(M, y, W - M, y);
      y += 12;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(26, 10, 0);
      doc.text(`Cierre de inventario N.º ${d.id}`, M, y);
      y += 9;

      const linea = (etq: string, val: string) => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${etq}:`, M, y);
        doc.setFont('helvetica', 'normal');
        const partes = doc.splitTextToSize(limpio(val), W - 2 * M - 32) as string[];
        doc.text(partes, M + 32, y);
        y += 5.5 * partes.length;
      };
      linea('Fecha', f.toLocaleDateString('es-CO'));
      linea('Hora', f.toLocaleTimeString('es-CO'));
      linea('Responsable', d.usuario ?? '-');
      linea('Observación', d.observacion ?? '-');
      y += 4;

      const cols = [M + 2, M + 72, M + 108, M + 144];
      const encabezado = () => {
        doc.setFillColor(26, 10, 0);
        doc.rect(M, y, W - 2 * M, 9, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        ['Materia prima', 'Había', 'Contó', 'Resultado'].forEach((t, i) => doc.text(t, cols[i], y + 6));
        y += 9;
        doc.setTextColor(26, 10, 0);
      };
      encabezado();

      d.items.forEach((i, idx) => {
        if (y + 9 > H - 16) {
          doc.addPage();
          y = 18;
          encabezado();
        }
        const u = i.unidad_medida ?? '';
        const dif = n(i.diferencia);
        if (idx % 2 === 0) {
          doc.setFillColor(250, 245, 238);
          doc.rect(M, y, W - 2 * M, 9, 'F');
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(26, 10, 0);
        doc.text(limpio(i.nombre).slice(0, 34), cols[0], y + 6);
        doc.text(`${fmt(n(i.stock_esperado))} ${u}`, cols[1], y + 6);
        doc.text(`${fmt(n(i.conteo_real))} ${u}`, cols[2], y + 6);
        if (Math.abs(dif) < 0.005) doc.setTextColor(30, 130, 70);
        else if (dif < 0) doc.setTextColor(190, 110, 10);
        else doc.setTextColor(190, 40, 40);
        doc.text(textoCambio(dif, u), cols[3], y + 6);
        y += 9;
      });

      if (d.items.length === 0) {
        doc.setTextColor(120, 100, 80);
        doc.text('Este cierre no tiene materias primas', M + 2, y + 7);
      }

      doc.save(`cierre-inventario-${d.id}.pdf`);
    } catch {
      showToast('No se pudo generar el PDF', true);
    }
  };

  const guardar = async () => {
    if (!validarCamposVisibles()) return;
    if (contados.length === 0) {
      showToast('Escribe el conteo real de al menos una materia prima');
      return;
    }
    const sinContar = filas.length - contados.length;
    const aviso = sinContar > 0 ? ` Las ${sinContar} que no contaste quedan como están.` : '';
    if (!(await confirmar(`¿Guardar el cierre de ${contados.length} materias primas?${aviso}`, 'Sí, guardar'))) return;
    setGuardando(true);
    try {
      await apiClient.post('/inventario/cierres', {
        observacion: observacion.trim() || null,
        conteos: contados.map((f) => ({ materia_prima_id: f.id, conteo_real: n(conteos[f.id]) })),
      });
      showToast('Cierre guardado: el stock arranca desde el conteo real');
      limpiarFiltrosConteo();
      load();
    } catch (e) {
      showToast(mensajeError(e, 'No se pudo guardar el cierre'), true);
    } finally {
      setGuardando(false);
    }
  };

  useEscape([
    [!!detalle, () => setDetalle(null)],
  ]);

  return (
    <div className="page-inner cierre-page">
      <div className="page-header">
        <div>
          <h1>Cierre de inventario</h1>
          <p className="subtitulo">
            Cuenta lo que hay en la cocina al terminar el día. Movimientos desde {desde ? new Date(desde).toLocaleString('es-CO') : '—'}
          </p>
        </div>
      </div>

      {loading ? (
        <AdminLoading area texto="Cargando cierre" subtexto="Calculando la cantidad esperada" />
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
            <p style={{ fontSize: 14, color: 'var(--text-400)', fontWeight: 500, margin: 0 }}>
              Escribe lo que hay <b>ahora</b> de cada materia prima. El sistema te dice cuánto se usó.
            </p>
            <button type="button" className="btn-primary" style={{ padding: '9px 22px' }} onClick={llenarTodo}><CheckIcon size={16} className="btn-ico" aria-hidden="true" />
              Todo está igual
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
            <label style={{ ...estiloEtiqueta, flex: '1 1 220px' }}>
              Buscar materia prima
              <input
                type="search"
                style={estiloFiltro}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Ej: harina"
               maxLength={100}/>
            </label>
            <label style={estiloEtiqueta}>
              Estado
              <SelectOscuro style={estiloFiltro} value={estadoConteo} onChange={(e) => setEstadoConteo(e.target.value as EstadoConteo)}>
                <option value="todos">Todas</option>
                <option value="sin_contar">Sin contar</option>
                <option value="contados">Ya contadas</option>
              </SelectOscuro>
            </label>
            {hayFiltroConteo && (
              <Boton variante="limpiar" type="button" className="btn-cancel" style={{ padding: '9px 18px' }} onClick={limpiarFiltrosConteo}>Limpiar filtros</Boton>
            )}
          </div>
          {hayFiltroConteo && (
            <p style={{ fontSize: 12, color: 'var(--text-400)', fontWeight: 500, margin: '0 0 10px' }}>
              Mostrando {filasVisibles.length} de {filas.length}. Los filtros solo cambian lo que ves: al guardar se incluyen todas las que contaste.
            </p>
          )}

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
                          className="input-conteo"
                          style={{ width: 110 }}
                          value={conteos[f.id] ?? ''}
                          onChange={(e) => setConteos({ ...conteos, [f.id]: soloNumero(e.target.value) })}
                         maxLength={15} pattern="[0-9.,]*"/>
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
                {filasVisibles.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>
                      {filas.length === 0 ? 'No hay materia prima' : 'Ninguna materia prima coincide con los filtros'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <Paginacion total={filasVisibles.length} pagina={conteoPag.paginaActual} onCambiar={setPaginaConteo} siempre />

          <div className="form-group" style={{ marginTop: 16 }}>
            <label>Observación (opcional)</label>
            <input value={observacion} maxLength={120} onChange={(e) => setObservacion(e.target.value)} placeholder="Ej: cierre del turno de la noche" />
          </div>
          <div className="ci-barra">
            <div className="ci-progreso">
              <span className="ci-progreso-txt">
                Contadas <b>{contados.length}</b> de <b>{filas.length}</b>
              </span>
              <div className="ci-progreso-pista">
                <div
                  className="ci-progreso-fill"
                  style={{ width: `${filas.length ? Math.round((contados.length / filas.length) * 100) : 0}%` }}
                />
              </div>
            </div>
            <button type="button" className="ci-btn-guardar" disabled={guardando} onClick={guardar}><SaveIcon size={16} className="btn-ico" aria-hidden="true" />
              {guardando ? 'Guardando...' : 'Guardar cierre'}
            </button>
          </div>

          <div style={{ marginTop: 40, marginBottom: 16, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900, color: 'var(--text-900)', letterSpacing: -0.3, margin: 0 }}>
              Cierres anteriores
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-400)', fontWeight: 500, margin: 0, marginLeft: 'auto', textAlign: 'right' }}>
              {hayFiltroHistorial
                ? `${historialFiltrado.length} de ${historial.length} ${historial.length === 1 ? 'cierre' : 'cierres'}`
                : `${historial.length} ${historial.length === 1 ? 'cierre registrado' : 'cierres registrados'}`}
            </p>
          </div>

          <div className="cierre-filtros" style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
            <label style={estiloEtiqueta}>
              Desde
              <AdminDatePicker label="Desde" style={estiloFiltro} value={fDesde} max={fHasta || undefined} onChange={setFDesde} />
            </label>
            <label style={estiloEtiqueta}>
              Hasta
              <AdminDatePicker label="Hasta" style={estiloFiltro} value={fHasta} min={fDesde || undefined} onChange={setFHasta} />
            </label>
            <label style={estiloEtiqueta}>
              Responsable
              <SelectOscuro style={estiloFiltro} value={fResponsable} onChange={(e) => setFResponsable(e.target.value)}>
                <option value="">Todos</option>
                {responsables.map((r) => <option key={r} value={r}>{r}</option>)}
              </SelectOscuro>
            </label>
            <label className="cierre-solo-dif" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-400)', padding: '8px 0', cursor: 'pointer' }}>
              <input type="checkbox" checked={fSoloDiferencias} onChange={(e) => setFSoloDiferencias(e.target.checked)} />
              Solo con diferencia
            </label>
            {hayFiltroHistorial && (
              <Boton variante="limpiar" type="button" className="btn-cancel" style={{ padding: '9px 18px' }} onClick={limpiarFiltrosHistorial}>Limpiar filtros</Boton>
            )}
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
                <tr><th>#</th><th>Fecha y hora</th><th>Responsable</th><th>Materias primas</th><th>Con diferencia</th><th>Observación</th><th>Detalle</th></tr>
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
                        disabled={cargandoDetalle === h.id} onClick={() => verDetalle(h.id)}
                        data-tooltip="Ver detalle"><EyeIcon size={16} className="btn-ico" aria-hidden="true" />
                        {cargandoDetalle === h.id ? 'Cargando...' : 'Ver detalle'}
                      </button>
                    </td>
                  </tr>
                ))}
                {cierres.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>
                      {historial.length === 0 ? 'Aún no hay cierres' : 'Ningún cierre coincide con los filtros'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Paginacion total={historialFiltrado.length} pagina={cierresPag.paginaActual} onCambiar={setPaginaCierres} etiqueta="cierres" siempre />
        </>
      )}
      {detalle && (
        <div className="modal-overlay open" onClick={() => setDetalle(null)}>
          <div className="modal-box" style={{ maxWidth: 680, padding: '28px 32px' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-x" onClick={() => setDetalle(null)} aria-label="Cerrar">×</button>
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
              <Boton variante="volver" className="btn-cancel" onClick={() => setDetalle(null)}>Cerrar</Boton>
              <Boton variante="descargar" className="btn-save" onClick={() => descargarPdf(detalle)}>Descargar PDF</Boton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}