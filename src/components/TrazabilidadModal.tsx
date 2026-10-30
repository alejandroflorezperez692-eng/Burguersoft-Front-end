import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { useEscape } from '../hooks/useEscape';
import {
  registrosDeTrazabilidad,
  nombreUsuario,
  type RegistroTrazabilidad,
} from '../types/Trazabilidad';

interface TrazabilidadModalProps {
  /** Id de la venta/pedido cuyo historial se muestra. */
  ventaId: number;
  onClose: () => void;
}

const fmtFecha = (f: string) =>
  f
    ? new Date(f).toLocaleString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

/** Color del badge según el estado del pedido. */
const claseEstado = (estado: string) => {
  const e = (estado || '').toLowerCase();
  if (e.includes('cancel')) return 'badge-danger';
  if (e.includes('entreg')) return 'badge-success';
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
      <div
        className="modal-box"
        style={{ maxWidth: 640, width: '96%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--text-900)', flexShrink: 0 }}>
          Trazabilidad del pedido #{ventaId}
        </h3>
        <p style={{ fontSize: 12.5, color: 'var(--text-400)', margin: '6px 0 14px', flexShrink: 0 }}>
          Todos los cambios de estado registrados, con su fecha y motivo cuando aplica.
        </p>

        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {loading ? (
            <p style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>Cargando historial...</p>
          ) : error ? (
            <p style={{ textAlign: 'center', padding: 30, color: 'var(--danger)' }}>
              No se pudo cargar la trazabilidad del pedido.
            </p>
          ) : registros.length === 0 ? (
            <p style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>
              No hay registros de trazabilidad para este pedido.
            </p>
          ) : (
            registros.map((r, i) => {
              const estado = r.a || r.estado || '';
              const tieneCambio = Boolean(r.de && r.a);
              return (
                <div
                  key={i}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 2px', borderBottom: '1px solid var(--border)' }}
                >
                  <span className={`badge ${claseEstado(estado)}`} style={{ flexShrink: 0, minWidth: 96, textAlign: 'center' }}>
                    {estado || '—'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {tieneCambio && (
                      <span style={{ display: 'block', fontSize: 13, color: 'var(--text-900)' }}>
                        Cambió de <strong>{r.de}</strong> a <strong>{r.a}</strong>
                      </span>
                    )}
                    {r.motivo && (
                      <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-600)', fontStyle: 'italic', marginTop: 2 }}>
                        Motivo: {r.motivo}
                      </span>
                    )}
                    <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-400)', marginTop: 2 }}>
                      {nombreUsuario(r)}
                    </span>
                  </div>
                  <span style={{ flexShrink: 0, fontSize: 11, color: 'var(--text-400)' }}>{fmtFecha(r.fecha || '')}</span>
                </div>
              );
            })
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14, flexShrink: 0 }}>
          <button type="button" className="btn-cancel" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
