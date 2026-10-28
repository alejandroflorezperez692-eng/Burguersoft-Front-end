import { useEffect, useMemo, useState } from 'react';
import apiClient from '../api/client';
import { useEscape } from '../hooks/useEscape';

interface Movimiento {
  id: number;
  usuario_id: number;
  nombre?: string;
  apellido?: string;
  rol?: string | null;
  modulo: string;
  descripcion: string;
  fecha: string;
}

type Respuesta = Movimiento[] | { data?: Movimiento[] };

const POR_PAGINA = 100;

export default function HistorialModal({ onClose }: { onClose: () => void }) {
  const [movs, setMovs] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState('');
  const [modulo, setModulo] = useState('');
  const [mostrar, setMostrar] = useState(POR_PAGINA);

  useEscape([[true, onClose]]);

  useEffect(() => {
    let vivo = true;
    apiClient
      .get<Respuesta>('/reportes/historial')
      .then(({ data }) => {
        if (vivo) setMovs(Array.isArray(data) ? data : data?.data ?? []);
      })
      .catch(() => {
        if (vivo) setError(true);
      })
      .finally(() => {
        if (vivo) setLoading(false);
      });
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => { setMostrar(POR_PAGINA); }, [q, modulo]);

  const modulos = useMemo(
    () => Array.from(new Set(movs.map((m) => m.modulo).filter(Boolean))).sort(),
    [movs],
  );

  const filtrados = movs.filter((m) => {
    if (modulo && m.modulo !== modulo) return false;
    const texto = `${m.nombre ?? ''} ${m.apellido ?? ''} ${m.rol ?? ''} ${m.modulo} ${m.descripcion}`.toLowerCase();
    return texto.includes(q.toLowerCase().trim());
  });

  const fmtFecha = (f: string) =>
    f ? new Date(f).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div
        className="modal-box"
        style={{ maxWidth: 940, width: '96%', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '88vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ background: 'var(--text-900)', padding: '18px 28px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--surface)' }}>Historial de movimientos</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar" style={{ border: 'none', background: 'transparent', color: 'var(--surface)', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: '16px 28px 0', display: 'flex', gap: 12, flexWrap: 'wrap', flexShrink: 0 }}>
          <input
            style={{ flex: 1, minWidth: 220 }}
            placeholder="Buscar por usuario, rol o acción..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select value={modulo} onChange={(e) => setModulo(e.target.value)} style={{ minWidth: 170 }}>
            <option value="">Todos los apartados</option>
            {modulos.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <p style={{ margin: '10px 28px 8px', fontSize: 12, color: 'var(--text-400)', flexShrink: 0 }}>
          {filtrados.length} movimiento{filtrados.length !== 1 ? 's' : ''} de todos los roles
        </p>

        <div style={{ padding: '0 28px 24px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {loading ? (
            <p style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>Cargando historial...</p>
          ) : error ? (
            <p style={{ textAlign: 'center', padding: 30, color: 'var(--danger)' }}>No se pudo cargar el historial.</p>
          ) : filtrados.length === 0 ? (
            <p style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>No hay movimientos para mostrar.</p>
          ) : (
            <>
              {filtrados.slice(0, mostrar).map((m) => (
                <div
                  key={m.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 4px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}
                >
                  <span className="badge badge-info" style={{ flexShrink: 0, minWidth: 92, textAlign: 'center' }}>{m.modulo ?? '—'}</span>
                  <span style={{ flex: 1, minWidth: 200, fontSize: 13, color: 'var(--text-900)' }}>
                    <strong>{[m.nombre, m.apellido].filter(Boolean).join(' ') || 'Usuario'}</strong>
                    {m.rol && <span style={{ color: 'var(--text-400)' }}> ({m.rol})</span>}
                    {' — '}
                    {m.descripcion ?? '—'}
                  </span>
                  <span style={{ flexShrink: 0, fontSize: 11, color: 'var(--text-400)' }}>{fmtFecha(m.fecha)}</span>
                </div>
              ))}
              {filtrados.length > mostrar && (
                <div style={{ textAlign: 'center', paddingTop: 14 }}>
                  <button type="button" className="btn-cancel" onClick={() => setMostrar((n) => n + POR_PAGINA)}>
                    Ver más
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}