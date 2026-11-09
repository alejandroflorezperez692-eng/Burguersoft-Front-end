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
}

const moneda = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(Math.round(n)).toLocaleString('es-CO')}`;
const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });

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
          <input type="number" min={0} step={100} value={base} onChange={(e) => setBase(e.target.value)} placeholder="0" />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Efectivo que contaste</label>
          <input type="number" min={0} step={100} value={contado} onChange={(e) => setContado(e.target.value)} placeholder="0" />
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