import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { useEscape } from '../hooks/useEscape';
import {
  registrosDeTrazabilidad,
  nombreUsuario,
  type RegistroTrazabilidad,
} from '../types/Trazabilidad';

interface TrazabilidadModalProps {
  ventaId: number;
  onClose: () => void;
}

const fmtDia = (f: string) =>
  f ? new Date(f).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
const fmtHora = (f: string) =>
  f ? new Date(f).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '';

/** Color del badge según el estado del pedido. */
const claseEstado = (estado: string) => {
  const e = (estado || '').toLowerCase();
  if (e.includes('cancel')) return 'badge-danger';
  if (e.includes('entreg') || e.includes('pagado') || e.includes('servido')) return 'badge-success';
  if (e.includes('pendi') || e.includes('espera')) return 'badge-warning';
  return 'badge-info';
};

/** Muestra el historial de estados (trazabilidad) de un pedido.
 *  Prueba el endpoint de ventas y hace un intento adicional con pedidos. */
export default function TrazabilidadModal({ ventaId, onClose }: TrazabilidadModalProps) {
  const [registros, setRegistros] = useState<RegistroTrazabilidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEscape([[true, onClose]]);

  useEffect(() => {
    let vivo = true;
    const pedir = async () => {
      const intentos = [`/ventas/${ventaId}/trazabilidad`, `/pedidos/${ventaId}/trazabilidad`];
      try {
        let data: unknown = null;
        for (const ruta of intentos) {
          try {
            data = (await apiClient.get(ruta)).data;
            break;
          } catch {
            // siguiente intento
          }
        }
        if (!vivo) return;
        setRegistros(registrosDeTrazabilidad(data));
      } catch {
        if (vivo) setError(true);
      } finally {
        if (vivo) setLoading(false);
      }
    };
    pedir();
    return () => {
      vivo = false;
    };
  }, [ventaId]);

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal-box tz-box" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-x" onClick={onClose} aria-label="Cerrar">×</button>

        <h3 className="tz-title">Trazabilidad del pedido #{ventaId}</h3>
        <p className="tz-sub">Todos los cambios de estado registrados, con su fecha y motivo cuando aplica.</p>

        <div className="tz-list">
          {loading ? (
            <p className="tz-msg">Cargando historial...</p>
          ) : error ? (
            <p className="tz-msg tz-msg-error">No se pudo cargar la trazabilidad del pedido.</p>
          ) : registros.length === 0 ? (
            <p className="tz-msg">No hay registros de trazabilidad para este pedido.</p>
          ) : (
            registros.map((r, i) => {
              const estado = r.a || r.estado || '';
              const tieneCambio = Boolean(r.de && r.a && r.de !== r.a);
              const esCreacion = !r.de && !!r.a;
              return (
                <div className="tz-item" key={i}>
                  <span className={`badge ${claseEstado(estado)}`}>{estado || '—'}</span>
                  <div className="tz-desc">
                    {esCreacion && <span className="tz-linea">Pedido registrado</span>}
                    {tieneCambio && (
                      <span className="tz-linea">
                        Cambió de <strong>{r.de}</strong> a <strong>{r.a}</strong>
                      </span>
                    )}
                    {r.motivo && <span className="tz-motivo">Motivo: {r.motivo}</span>}
                    <span className="tz-user">{nombreUsuario(r)}</span>
                  </div>
                  <div className="tz-fecha">
                    <span>{fmtDia(r.fecha || '')}</span>
                    <small>{fmtHora(r.fecha || '')}</small>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="tz-footer">
          <button type="button" className="btn-save" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}