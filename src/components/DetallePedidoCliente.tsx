import ComprobanteImagen from './ComprobanteImagen';
import { useEscape } from '../hooks/useEscape';

/** Datos mínimos del pedido que necesita el modal de detalle del cliente. */
export interface PedidoDetalleDatos {
  id: number;
  numero_secuencial: number;
  fecha: string;
  estado: string;
  metodo_pago?: string;
  total: number;
  tiene_comprobante?: boolean;
  comprobante_estado?: string;
  comprobante_motivo?: string;
  comprobante_valor?: number;
  comprobante_coincide?: boolean;
  comprobante_subido_en?: string;
}

interface Props {
  pedido: PedidoDetalleDatos;
  onClose: () => void;
}

const ESTADOS_COMPROBANTE: Record<string, { texto: string; detalle: string }> = {
  aprobado: {
    texto: 'Pago aprobado',
    detalle: 'El administrador revisó la imagen y confirmó tu pago.',
  },
  rechazado: {
    texto: 'Comprobante devuelto',
    detalle: 'El comprobante no fue aceptado. Puedes subir uno nuevo desde la tarjeta del pedido.',
  },
  pendiente: {
    texto: 'En revisión',
    detalle: 'La IA confirmó que la imagen es un comprobante de pago y el administrador la está verificando.',
  },
};

function formatoMoneda(valor: number): string {
  return `$${Number(valor ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

function formatearFecha(fecha: string): string {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return fecha;
  return d.toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Muestra el detalle de un pedido del cliente junto con la imagen del
 * comprobante de pago que subió (si existe) y el resultado de la revisión.
 */
export default function DetallePedidoCliente({ pedido, onClose }: Props) {
  useEscape([[true, onClose]]);

  const estadoComprobante = (pedido.comprobante_estado ?? '').trim().toLowerCase();
  const info = ESTADOS_COMPROBANTE[estadoComprobante];
  const tieneComprobante = Boolean(pedido.tiene_comprobante);

  return (
    <div className="mp-detalle-overlay" onClick={onClose} role="presentation">
      <div
        className="mp-detalle-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Detalle del pedido ${pedido.numero_secuencial}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="mp-detalle-cerrar"
          onClick={onClose}
          aria-label="Cerrar detalle"
        >
          ×
        </button>

        <h3 className="mp-detalle-titulo">Pedido #{pedido.numero_secuencial}</h3>
        <p className="mp-detalle-sub">Detalle del pedido y comprobante de pago</p>

        <dl className="mp-detalle-datos">
          <div>
            <dt>Estado</dt>
            <dd>{pedido.estado}</dd>
          </div>
          <div>
            <dt>Fecha</dt>
            <dd>{formatearFecha(pedido.fecha)}</dd>
          </div>
          <div>
            <dt>Método de pago</dt>
            <dd>{pedido.metodo_pago || 'No registrado'}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>{formatoMoneda(pedido.total)}</dd>
          </div>
        </dl>

        <section className="mp-detalle-comprobante">
          <h4>Comprobante de pago</h4>

          {tieneComprobante ? (
            <>
              {info && (
                <p className={`mp-detalle-estado mp-detalle-estado-${estadoComprobante}`}>
                  {info.texto}
                </p>
              )}
              {info && <p className="mp-detalle-estado-detalle">{info.detalle}</p>}

              <ComprobanteImagen
                ventaId={pedido.id}
                version={pedido.comprobante_subido_en}
              />

              {estadoComprobante === 'rechazado' && pedido.comprobante_motivo && (
                <p className="mp-detalle-motivo">
                  Motivo: {pedido.comprobante_motivo}
                </p>
              )}

              {estadoComprobante !== 'aprobado' && pedido.comprobante_valor !== undefined && (
                <p className="mp-detalle-dato">
                  Valor detectado por la IA: {formatoMoneda(pedido.comprobante_valor)}
                  {pedido.comprobante_coincide === false
                    ? ' · No coincide con el total, el administrador lo revisará.'
                    : ''}
                </p>
              )}
            </>
          ) : (
            <p className="mp-detalle-sin-comprobante">
              Este pedido todavía no tiene comprobante de pago.
            </p>
          )}
        </section>

        <div className="mp-detalle-acciones">
          <button type="button" className="mp-detalle-btn" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
