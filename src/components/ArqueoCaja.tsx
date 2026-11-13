import { useCallback, useEffect, useState } from 'react';
import apiClient from '../api/client';
import { useToast } from './Toast';
import { mensajeError } from '../utils/errores';

interface Preview {
  desde: string;
  por_metodo: { metodo: string; pedidos: number; total: number }[];
  total: number;
  pedidos: number;
  efectivo: number;
}

interface CierreGuardado {
  id: number;
  cajero: string;
  created_at: string;
  total_cobrado: number | string;
  diferencia: number | string;
  observacion: string | null;
  desde?: string;
  base_inicial?: number | string;
  efectivo_esperado?: number | string;
  efectivo_contado?: number | string;
  pedidos?: number;
  por_metodo?: { metodo: string; pedidos: number; total: number }[];
}

const moneda = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(Math.round(n)).toLocaleString('es-CO')}`;
const soloDigitos = (v: string) => v.replace(/\D/g, '').slice(0, 9);
const miles = (v: string) => (v === '' ? '' : Number(v).toLocaleString('es-CO'));
const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });

const esc = (t: string) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function descargarPdfCierre(c: CierreGuardado, aviso: (m: string) => void) {
  const f = new Date(c.created_at);
  const dif = Number(c.diferencia);
  const filas = (c.por_metodo ?? [])
    .map((m) => `<tr><td>${esc(m.metodo)}</td><td>${m.pedidos}</td><td>${moneda(Number(m.total))}</td></tr>`)
    .join('');
  const w = window.open('', '_blank');
  if (!w) { aviso('Permite las ventanas emergentes para descargar el PDF'); return; }
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8">
    <title>Cierre de caja N.º ${c.id}</title>
    <style>
      body{font-family:Arial,sans-serif;color:#1a0a00;padding:32px}
      h1{margin:0 0 4px;font-size:22px} p{margin:2px 0;font-size:13px}
      table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}
      th{background:#1a0a00;color:#fff;text-align:left;padding:8px 10px}
      td{padding:8px 10px;border-bottom:1px solid #ddd}
    </style></head><body>
    <h1>Cierre de caja N.º ${c.id}</h1>
    <p><b>Empresa:</b> El Oriente</p>
    <p><b>Fecha:</b> ${f.toLocaleDateString('es-CO')} &nbsp; <b>Hora:</b> ${f.toLocaleTimeString('es-CO')}</p>
    <p><b>Cajero:</b> ${esc(c.cajero)}</p>
    ${c.desde ? `<p><b>Turno desde:</b> ${fechaHora(c.desde)}</p>` : ''}
    <p><b>Pedidos cobrados:</b> ${c.pedidos ?? '—'}</p>
    <table>
      <thead><tr><th>Método de pago</th><th>Pedidos</th><th>Total</th></tr></thead>
      <tbody>${filas || '<tr><td colspan="3">Sin cobros</td></tr>'}</tbody>
    </table>
    <table>
      <tbody>
        <tr><td>Total cobrado</td><td><b>${moneda(Number(c.total_cobrado))}</b></td></tr>
        <tr><td>Base inicial</td><td>${moneda(Number(c.base_inicial ?? 0))}</td></tr>
        <tr><td>Efectivo esperado</td><td>${moneda(Number(c.efectivo_esperado ?? 0))}</td></tr>
        <tr><td>Efectivo contado</td><td>${moneda(Number(c.efectivo_contado ?? 0))}</td></tr>
        <tr><td>Diferencia</td><td><b>${Math.abs(dif) >= 0.01 ? moneda(dif) : 'Cuadró'}</b></td></tr>
      </tbody>
    </table>
    <p style="margin-top:14px"><b>Observación:</b> ${esc(c.observacion ?? '—')}</p>
    </body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

export default function ArqueoCaja() {
  const { showToast } = useToast();
  const [prev, setPrev] = useState<Preview | null>(null);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [base, setBase] = useState('');
  const [contado, setContado] = useState('');
  const [obs, setObs] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [historial, setHistorial] = useState<CierreGuardado[] | null>(null);
  const [verHistorial, setVerHistorial] = useState(false);

  const cargar = useCallback(() => {
    apiClient
      .get<Preview>('/caja/cierre/preview')
      .then(({ data }) => setPrev(data))
      .catch(() => setSinPermiso(true));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (sinPermiso || !prev) return null;

  const esperado = (base === '' ? 0 : Number(base)) + prev.efectivo;
  const diferencia = contado === '' ? null : Number(contado) - esperado;
  const hayDiferencia = diferencia !== null && Math.abs(diferencia) >= 0.01;

  const guardar = async () => {
    if (contado === '' || Number(contado) < 0) {
      showToast('Escribe el efectivo que contaste', true);
      return;
    }
    if (hayDiferencia && !obs.trim()) {
      showToast('Hay una diferencia: escribe una observación', true);
      return;
    }
    setGuardando(true);
    try {
      await apiClient.post('/caja/cierres', {
        efectivo_contado: Number(contado),
        base_inicial: base === '' ? 0 : Number(base),
        observacion: obs.trim() || undefined,
      });
      showToast('Cierre de caja guardado', false, true);
      setBase('');
      setContado('');
      setObs('');
      setHistorial(null);
      setVerHistorial(false);
      cargar();
    } catch (e) {
      showToast(mensajeError(e, 'No se pudo guardar el cierre de caja'), true);
    } finally {
      setGuardando(false);
    }
  };

  const alternarHistorial = () => {
    const abrir = !verHistorial;
    setVerHistorial(abrir);
    if (abrir && historial === null) {
      apiClient
        .get<CierreGuardado[]>('/caja/cierres')
        .then(({ data }) => setHistorial(data))
        .catch(() => setHistorial([]));
    }
  };

  return (
    <div style={{ borderTop: '1px solid var(--border)', marginTop: 18, paddingTop: 14 }}>
      <h4 className="cierre-sub">Arqueo de caja</h4>
      <p className="cierre-nota">
        Lo que cobraste tú desde tu último cierre ({fechaHora(prev.desde)}): {moneda(prev.total)} en {prev.pedidos}{' '}
        {prev.pedidos === 1 ? 'pedido' : 'pedidos'}.
      </p>

      <div className="cierre-metodos">
        {prev.por_metodo.map((m) => (
          <span key={m.metodo}>
            <b>{m.metodo}</b> {moneda(m.total)} <small>({m.pedidos})</small>
          </span>
        ))}
        {prev.por_metodo.length === 0 && <span>Aún no has cobrado pedidos.</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 12 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Base inicial (opcional)</label>
          <input type="text" inputMode="numeric" value={miles(base)} onChange={(e) => setBase(soloDigitos(e.target.value))} placeholder="0" />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Efectivo que contaste</label>
          <input type="text" inputMode="numeric" value={miles(contado)} onChange={(e) => setContado(soloDigitos(e.target.value))} placeholder="0" />
        </div>
      </div>

      <p style={{ margin: '10px 0 0', fontSize: 14 }}>
        Efectivo esperado: <b>{moneda(esperado)}</b>
        {diferencia !== null && (
          <>
            {' · '}Diferencia:{' '}
            <b style={{ color: hayDiferencia ? 'var(--danger)' : '#1e8e4e' }}>
              {hayDiferencia ? moneda(diferencia) : 'Cuadra ✓'}
            </b>
          </>
        )}
      </p>

      {hayDiferencia && (
        <div className="form-group" style={{ marginTop: 10 }}>
          <label>Observación (obligatoria si hay diferencia)</label>
          <textarea rows={2} maxLength={255} value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
        <button type="button" className="btn-save" disabled={guardando} onClick={guardar}>
          {guardando ? 'Guardando...' : 'Guardar cierre de caja'}
        </button>
        <button type="button" className="btn-cancel" onClick={alternarHistorial}>
          {verHistorial ? 'Ocultar cierres' : 'Ver cierres anteriores'}
        </button>
      </div>

      {verHistorial && (
        <div style={{ marginTop: 12, fontSize: 13 }}>
          {historial === null && <p>Cargando...</p>}
          {historial?.length === 0 && <p>Aún no hay cierres guardados.</p>}
          {historial?.slice(0, 8).map((c) => {
            const dif = Number(c.diferencia);
            return (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '6px 0', borderTop: '1px solid var(--border)' }}>
                <span>
                  {fechaHora(c.created_at)} · {c.cajero}
                </span>
                <span>
                  <button
                    type="button"
                    className="btn-cancel"
                    style={{ padding: '2px 10px', marginRight: 8 }}
                    onClick={() => descargarPdfCierre(c, (m) => showToast(m, true))}
                    aria-label={`Descargar PDF del cierre ${c.id}`}
                  >
                    PDF
                  </button>
                  {moneda(Number(c.total_cobrado))} ·{' '}
                  <b style={{ color: Math.abs(dif) >= 0.01 ? 'var(--danger)' : '#1e8e4e' }}>
                    {Math.abs(dif) >= 0.01 ? moneda(dif) : 'Cuadró'}
                  </b>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}