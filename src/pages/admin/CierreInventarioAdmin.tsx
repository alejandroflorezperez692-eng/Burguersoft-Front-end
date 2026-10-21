import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import ToastMessage, { useToast } from '../../components/Toast';
import AdminLoading from '../../components/AdminLoading';
import '../../styles/nu-admin.css';

interface FilaCierre {
  id: number;
  nombre: string;
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
  const { toast, showToast } = useToast();

  const load = async () => {
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
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const diferencia = (f: FilaCierre): number | null => {
    const c = conteos[f.id];
    return c === undefined || c === '' ? null : n(c) - n(f.stock_esperado);
  };

  const guardar = async () => {
    const faltan = filas.filter((f) => conteos[f.id] === undefined || conteos[f.id] === '');
    if (faltan.length) {
      showToast(`Falta el conteo real de: ${faltan.slice(0, 3).map((f) => f.nombre).join(', ')}${faltan.length > 3 ? '...' : ''}`, true);
      return;
    }
    if (!confirm('¿Guardar el cierre? El stock de cada insumo quedará igual al conteo real.')) return;
    setGuardando(true);
    try {
      await apiClient.post('/inventario/cierres', {
        observacion: observacion.trim() || null,
        conteos: filas.map((f) => ({ materia_prima_id: f.id, conteo_real: n(conteos[f.id]) })),
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
            Cuenta lo que hay en la cocina. Movimientos desde {desde ? new Date(desde).toLocaleString('es-CO') : '—'}
          </p>
        </div>
      </div>

      {loading ? (
        <AdminLoading texto="Cargando cierre" subtexto="Calculando el stock esperado" />
      ) : (
        <>
          <div className="tabla-responsive">
            <table className="data-table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th>Insumo</th>
                  <th>Stock inicial</th>
                  <th>+ Compras</th>
                  <th>− Consumo ventas</th>
                  <th>Stock esperado</th>
                  <th>Conteo real</th>
                  <th>Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => {
                  const dif = diferencia(f);
                  const u = f.unidad_medida ?? '';
                  return (
                    <tr key={f.id}>
                      <td style={{ fontWeight: 600 }}>{f.nombre}</td>
                      <td>{fmt(n(f.stock_inicial))} {u}</td>
                      <td>{fmt(n(f.compras))}</td>
                      <td>{fmt(n(f.consumo))}</td>
                      <td style={{ fontWeight: 700 }}>{fmt(n(f.stock_esperado))} {u}</td>
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
                        {dif === null ? '—' : (
                          <span className={`badge ${Math.abs(dif) < 0.005 ? 'badge-success' : dif < 0 ? 'badge-danger' : 'badge-warning'}`}>
                            {dif > 0 ? '+' : ''}{fmt(dif)} {u}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filas.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>No hay insumos</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="form-group" style={{ marginTop: 16 }}>
            <label>Observación (opcional)</label>
            <input value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Ej: cierre del turno de la noche" />
          </div>
          <div className="modal-actions" style={{ marginTop: 12 }}>
            <button className="btn-save" disabled={guardando || filas.length === 0} onClick={guardar}>
              {guardando ? 'Guardando...' : 'Guardar cierre'}
            </button>
          </div>

          <h2 style={{ marginTop: 40 }}>Cierres anteriores</h2>
          <div className="tabla-responsive">
            <table className="data-table">
              <thead>
                <tr><th>N.º</th><th>Fecha</th><th>Responsable</th><th>Insumos</th><th>Con diferencia</th><th>Observación</th></tr>
              </thead>
              <tbody>
                {historial.map((h) => (
                  <tr key={h.id}>
                    <td>{h.id}</td>
                    <td>{new Date(h.created_at).toLocaleString('es-CO')}</td>
                    <td>{h.usuario ?? '—'}</td>
                    <td>{h.insumos}</td>
                    <td>{h.insumos_con_diferencia}</td>
                    <td>{h.observacion ?? '—'}</td>
                  </tr>
                ))}
                {historial.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>Aún no hay cierres</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
      <ToastMessage toast={toast} />
    </div>
  );
}