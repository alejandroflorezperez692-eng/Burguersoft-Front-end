import { useCallback, useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import { normalizarRol } from '../../utils/roles';
import { useToast } from '../../components/Toast';
import MotivoModal from '../../components/MotivoModal';
import { mensajeDeError, type MapaTransiciones } from '../../types/Trazabilidad';
import '../../styles/pedidos-turno.css';

/* ------------------------------------------------------------------ */
/* Configuración de las tres vistas del "turno"                        */
/* ------------------------------------------------------------------ */

type Vista = 'cocina' | 'meseros' | 'cajero';

interface Accion {
  /** Estado al que se pasa con la acción. */
  sig: string;
  /** Texto del botón. */
  texto: string;
}

interface VistaConfig {
  titulo: string;
  subtitulo: string;
  /** Estados que se muestran en esta vista. */
  estados: string[];
  /** Estado actual → acción disponible (si no hay entrada, solo lectura). */
  acciones: Record<string, Accion>;
}

const VISTA_CONFIG: Record<Vista, VistaConfig> = {
  cocina: {
    titulo: 'Cocina',
    subtitulo: 'Pedidos por preparar. Muévelos a «En preparación» y avisa con «Preparado».',
    estados: ['Recepcionado', 'En preparación'],
    acciones: {
      Recepcionado: { sig: 'En preparación', texto: 'Empezar a preparar' },
      'En preparación': { sig: 'Preparado', texto: 'Marcar preparado' },
    },
  },
  meseros: {
    titulo: 'Meseros',
    subtitulo: 'Pedidos recién recepcionados y listos para llevar a la mesa.',
    estados: ['Recepcionado', 'Preparado'],
    acciones: {
      Preparado: { sig: 'Servido', texto: 'Marcar servido' },
    },
  },
  cajero: {
    titulo: 'Cajero',
    subtitulo: 'Pedidos servidos y pagos pendientes por cobrar.',
    estados: ['Servido', 'Pendiente de pago'],
    acciones: {
      Servido: { sig: 'Pagado', texto: 'Registrar pago' },
      'Pendiente de pago': { sig: 'Pagado', texto: 'Registrar pago' },
    },
  },
};

/** Vista por defecto de cada rol; el admin cambia entre las tres. */
const VISTA_INICIAL: Record<string, Vista> = { cocinero: 'cocina', mesero: 'meseros', cajero: 'cajero' };
const INTERVALO = 15000;

/* ------------------------------------------------------------------ */
/* Tipos de la respuesta del backend                                    */
/* ------------------------------------------------------------------ */

interface ItemVenta {
  cantidad?: number;
  producto?: { nombre?: string } | null;
}
interface PromoVenta {
  nombre?: string;
}
interface Venta {
  id: number;
  fecha?: string;
  estado?: string;
  tipo_entrega?: string | null;
  metodo_pago?: string | null;
  valor_total?: string | number | null;
  cliente_nombre?: string | null;
  usuario?: { nombre?: string; apellido?: string } | null;
  detalles?: ItemVenta[];
  promociones?: PromoVenta[];
}

interface CambioConMotivo {
  venta: Venta;
  accion: Accion;
}

/** 'YYYY-MM-DD HH:MM:SS' → Date (el espacio en blanco no lo aceptan todos los navegadores). */
const aFecha = (f: string) => new Date((f || '').replace(' ', 'T'));

const hace = (f: string): string => {
  const t = aFecha(f).getTime();
  if (!Number.isFinite(t)) return '';
  const min = Math.max(0, Math.floor((Date.now() - t) / 60000));
  if (min < 1) return 'hace instantes';
  if (min === 1) return 'hace 1 minuto';
  if (min < 60) return `hace ${min} minutos`;
  const h = Math.floor(min / 60);
  return h === 1 ? 'hace 1 hora' : `hace ${h} horas`;
};

const nombreCliente = (v: Venta): string =>
  v.cliente_nombre || [v.usuario?.nombre, v.usuario?.apellido].filter(Boolean).join(' ').trim() || 'Cliente';

export default function PedidosTurno() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const rol = normalizarRol(user?.role);
  const esAdmin = rol === 'admin';
  const vistaInicial = VISTA_INICIAL[rol] ?? 'cocina';

  const [vista, setVista] = useState<Vista>(vistaInicial);
  const [items, setItems] = useState<Venta[]>([]);
  const [transiciones, setTransiciones] = useState<MapaTransiciones | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ocupadoId, setOcupadoId] = useState<number | null>(null);
  const [cambioConMotivo, setCambioConMotivo] = useState<CambioConMotivo | null>(null);

  const config = VISTA_CONFIG[vista];

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get('/ventas');
      const lista: Venta[] = Array.isArray(res.data)
        ? res.data
        : ((res.data as { data?: unknown })?.data as Venta[]) ?? [];
      const turno = lista.filter((v) => config.estados.includes(v.estado ?? ''));
      // El más antiguo primero: que no pase tiempo en la cocina sin verlo.
      turno.sort((a, b) => aFecha(a.fecha ?? '').getTime() - aFecha(b.fecha ?? '').getTime());
      setItems(turno);
    } catch {
      setError('No se pudo cargar la lista de pedidos.');
    } finally {
      setLoading(false);
    }
  }, [config.estados]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    void load();
  }, [load]);

  useEffect(() => {
    let vivo = true;
    apiClient
      .get('/pedidos/transiciones')
      .then(({ data }) => {
        if (vivo) setTransiciones((data as MapaTransiciones) ?? null);
      })
      .catch(() => {
        /* sin mapa: los cambios se intentan de igual forma */
      });
    return () => {
      vivo = false;
    };
  }, []);

  // Auto-refresco mientras la pestaña esté visible
  useEffect(() => {
    const t = window.setInterval(() => {
      if (!document.hidden) void load();
    }, INTERVALO);
    return () => window.clearInterval(t);
  }, [load]);

  /** Decide si el cambio se hace directo o pide motivo según el mapa del backend. */
  const intentarCambio = (venta: Venta, accion: Accion) => {
    setError(null);
    const actual = venta.estado ?? '';
    const t = transiciones?.[actual];
    if (t && !t.directas.includes(accion.sig) && !t.con_motivo.includes(accion.sig)) {
      setError(`El sistema no permite pasar de «${actual}» a «${accion.sig}».`);
      return;
    }
    if (t?.con_motivo.includes(accion.sig)) {
      setCambioConMotivo({ venta, accion });
      return;
    }
    void ejecutarCambio(venta, accion, undefined);
  };

  const ejecutarCambio = async (venta: Venta, accion: Accion, motivo?: string) => {
    setOcupadoId(venta.id);
    try {
      await apiClient.patch(`/ventas/${venta.id}/estado`, { estado: accion.sig, motivo });
      // Se quita de esta vista (ya no corresponde a este turno) y se recarga por si acaso
      setItems((prev) => prev.filter((v) => v.id !== venta.id));
      showToast(`Pedido #${venta.id}: ${accion.sig.toLowerCase()}`, false);
      await load();
    } catch (e) {
      setError(mensajeDeError(e, `No se pudo marcar el pedido #${venta.id} como «${accion.sig}».`));
    } finally {
      setOcupadoId(null);
    }
  };

  return (
    <div className="tv-wrap">
      <div className="tv-head">
        <div>
          <h1 className="tv-titulo">{config.titulo}</h1>
          <p className="tv-subtitulo">{config.subtitulo}</p>
        </div>
        <div className="tv-lado">
          {esAdmin ? (
            <div className="tv-tabs" role="tablist">
              {(Object.keys(VISTA_CONFIG) as Vista[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={vista === v}
                  className={`tv-tab${vista === v ? ' activo' : ''}`}
                  onClick={() => setVista(v)}
                >
                  {VISTA_CONFIG[v].titulo}
                </button>
              ))}
            </div>
          ) : null}
          <button type="button" className="tv-refrescar" onClick={() => void load()}>
            Actualizar
          </button>
        </div>
      </div>

      <p className="tv-nota">Se refresca automáticamente cada {INTERVALO / 1000} segundos.</p>

      {error && (
        <div className="tv-errorbox" role="alert">
          {error}
          <button type="button" onClick={() => setError(null)} aria-label="Cerrar aviso">✕</button>
        </div>
      )}

      <div className="tv-grid">
        {loading ? (
          <p className="tv-vacio">Cargando pedidos…</p>
        ) : items.length === 0 ? (
          <p className="tv-vacio">No hay pedidos en esta sección. Todo al día.</p>
        ) : (
          items.map((v) => {
            const accion = config.acciones[v.estado ?? ''];
            const esOcupado = ocupadoId === v.id;
            return (
              <div
                className={`tv-card${v.estado === 'En preparación' ? ' cocinando' : ''}${v.estado === 'Preparado' ? ' listo' : ''}`}
                key={v.id}
              >
                <div className="tv-card-head">
                  <span className="tv-num">#{v.id}</span>
                  <span className="badge badge-info">{v.estado ?? '—'}</span>
                  {v.tipo_entrega && <span className="badge badge-warning">{v.tipo_entrega}</span>}
                </div>

                <div className="tv-card-body">
                  <span className="tv-cliente">{nombreCliente(v)}</span>
                  {(v.detalles ?? []).length > 0 && (
                    <ul className="tv-items">
                      {(v.detalles ?? []).map((d, i) => (
                        <li key={i}>
                          {d.producto?.nombre ?? 'Producto'}
                          {d.cantidad ? ` ×${d.cantidad}` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                  {(v.promociones ?? []).filter((p) => p?.nombre).length > 0 && (
                    <ul className="tv-items tv-promos">
                      {(v.promociones ?? []).map((p, i) => (
                        <li key={i}>{p?.nombre ?? 'Combo'}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="tv-card-foot">
                  <span className="tv-total">
                    ${Number(v.valor_total || 0).toLocaleString('es-CO')}
                  </span>
                  <span className="tv-tiempo">{hace(v.fecha ?? '')}</span>
                  {accion ? (
                    <button
                      type="button"
                      className="tv-btn"
                      disabled={esOcupado}
                      onClick={() => intentarCambio(v, accion)}
                    >
                      {esOcupado ? 'Guardando…' : accion.texto}
                    </button>
                  ) : (
                    <span className="tv-espera">
                      {v.estado === 'Recepcionado' ? 'Esperando a cocina…' : 'Sin acción disponible'}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {cambioConMotivo && (
        <MotivoModal
          titulo={`Cambiar el pedido #${cambioConMotivo.venta.id} a «${cambioConMotivo.accion.sig}»`}
          descripcion="Este cambio necesita un motivo; quedó registrado en el historial del pedido."
          confirmarTexto={cambioConMotivo.accion.texto}
          onClose={() => setCambioConMotivo(null)}
          onConfirm={(motivo) => {
            const { venta, accion } = cambioConMotivo;
            setCambioConMotivo(null);
            void ejecutarCambio(venta, accion, motivo);
          }}
        />
      )}
    </div>
  );
}
