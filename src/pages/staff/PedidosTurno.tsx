import { useCallback, useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import { normalizarRol } from '../../utils/roles';
import { useToast } from '../../components/Toast';
import MotivoModal from '../../components/MotivoModal';
import { mensajeDeError, type MapaTransiciones } from '../../types/Trazabilidad';
import '../../styles/pedidos-turno.css';
import { getEcho } from '../../api/echo';
import NuevaVentaModal from '../../components/NuevaVentaModal';
import { useEscape } from '../../hooks/useEscape';

type Vista = 'cocina' | 'meseros' | 'cajero' | 'todos';

interface Accion {
  sig: string;
  texto: string;
}

interface VistaConfig {
  titulo: string;
  subtitulo: string;
  estados: string[];
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
    subtitulo: 'Pedidos de la web por recibir y pedidos listos para llevar a la mesa.',
    estados: ['Por verificar', 'Preparado'],
    acciones: {
      'Por verificar': { sig: 'Recepcionado', texto: 'Recibir pedido' },
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
  todos: {
    titulo: 'Todos',
    subtitulo: 'Vista completa del flujo de pedidos.',
    estados: ['Registrado', 'Por verificar', 'Recepcionado', 'En preparación', 'Preparado', 'Servido', 'Pendiente de pago'],
    acciones: {
      Registrado: { sig: 'Por verificar', texto: 'Verificar' },
      'Por verificar': { sig: 'Recepcionado', texto: 'Recibir pedido' },
      Recepcionado: { sig: 'En preparación', texto: 'Empezar a preparar' },
      'En preparación': { sig: 'Preparado', texto: 'Marcar preparado' },
      Preparado: { sig: 'Servido', texto: 'Marcar servido' },
      Servido: { sig: 'Pagado', texto: 'Registrar pago' },
      'Pendiente de pago': { sig: 'Pagado', texto: 'Registrar pago' },
    },
  },
};

const VISTA_INICIAL: Record<string, Vista> = { admin: 'todos', cocinero: 'cocina', mesero: 'meseros', cajero: 'cajero' };

const ETIQUETA: Partial<Record<Vista, Record<string, string>>> = {
  cocina: { Recepcionado: 'Por tomar' },
  cajero: { Servido: 'Por cobrar' },
};
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
  mesa?: number | null;
  notas?: string | null;
  usuario?: { nombre?: string; apellido?: string } | null;
  detalles?: ItemVenta[];
  promociones?: PromoVenta[];
}

interface CambioConMotivo {
  venta: Venta;
  accion: Accion;
}

const aFecha = (f: string) => new Date((f || '').replace(' ', 'T'));

const minutosDesde = (f: string): number => {
  const t = aFecha(f).getTime();
  return Number.isFinite(t) ? Math.max(0, Math.floor((Date.now() - t) / 60000)) : 0;
};

const duracion = (min: number): string =>
  min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`;

type Entrega = 'todos' | 'Domicilio' | 'Recoger' | 'Consumir';

const FILTROS_ENTREGA: { valor: Entrega; texto: string }[] = [
  { valor: 'todos', texto: 'Todos' },
  { valor: 'Domicilio', texto: 'Domicilio' },
  { valor: 'Recoger', texto: 'Para recoger' },
  { valor: 'Consumir', texto: 'En el local' },
];

const ETIQUETA_ENTREGA: Record<string, string> = { Domicilio: 'Domicilio', Recoger: 'Para recoger',Consumir: 'En el local' };

/** "sin tomate, extra bacon" → ['sin tomate', 'extra bacon'] */
const separarNotas = (n?: string | null): string[] =>
  (n ?? '').split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);

const nombreCliente = (v: Venta): string =>
  v.cliente_nombre || [v.usuario?.nombre, v.usuario?.apellido].filter(Boolean).join(' ').trim() || 'Cliente';

export default function PedidosTurno() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const rol = normalizarRol(user?.role);
  const esAdmin = rol === 'admin';
  const puedeCrear = rol === 'admin' || rol === 'mesero';
  const vistaInicial = VISTA_INICIAL[rol] ?? 'cocina';

  const [vista, setVista] = useState<Vista>(vistaInicial);
  const [items, setItems] = useState<Venta[]>([]);
  const [transiciones, setTransiciones] = useState<MapaTransiciones | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ocupadoId, setOcupadoId] = useState<number | null>(null);
  const [cambioConMotivo, setCambioConMotivo] = useState<CambioConMotivo | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEntrega, setFiltroEntrega] = useState<Entrega>('todos');
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [mesaNueva, setMesaNueva] = useState<number | null>(null);
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [arrastrandoId, setArrastrandoId] = useState<number | null>(null);
  const [colHover, setColHover] = useState<string | null>(null);

  const config = VISTA_CONFIG[vista];

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get('/pedidos/tablero');
      const lista: Venta[] = Array.isArray(res.data)
        ? res.data
        : ((res.data as { data?: unknown })?.data as Venta[]) ?? [];
      const turno = lista.filter((v) => config.estados.includes(v.estado ?? ''));
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
      });
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    const echo = getEcho();
    const alCambiar = () => void load();
    echo?.channel('cocina').listen('.venta.actualizada', alCambiar);

    const t = window.setInterval(() => {
      if (!document.hidden) void load();
    }, echo ? 60000 : 8000);

    return () => {
      window.clearInterval(t);
      echo?.channel('cocina').stopListening('.venta.actualizada', alCambiar);
    };
  }, [load]);

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
      setItems((prev) =>
        prev
          .map((v) => (v.id === venta.id ? { ...v, estado: accion.sig } : v))
          .filter((v) => config.estados.includes(v.estado ?? '')),
      );
      showToast(`Pedido #${venta.id}: ${accion.sig.toLowerCase()}`, false);
      void load();
    } catch (e) {
      setError(mensajeDeError(e, `No se pudo marcar el pedido #${venta.id} como «${accion.sig}».`));
    } finally {
      setOcupadoId(null);
    }
  };

  const soltarEn = (estadoDestino: string) => {
    const venta = items.find((x) => x.id === arrastrandoId);
    setArrastrandoId(null);
    setColHover(null);
    if (!venta || venta.estado === estadoDestino) return;
    intentarCambio(venta, { sig: estadoDestino, texto: `Mover a ${estadoDestino}` });
  };

  const visibles = items.filter((v) => {
    if (filtroEntrega !== 'todos' && v.tipo_entrega !== filtroEntrega) return false;
    const q = busqueda.trim().toLowerCase().replace('#', '');
    if (!q) return true;
    const texto = [
      v.id,
      nombreCliente(v),
      v.mesa ? `mesa ${v.mesa}` : '',
      ...(v.detalles ?? []).map((d) => d.producto?.nombre ?? ''),
    ]
      .join(' ')
      .toLowerCase();
    return texto.includes(q);
  });

  const detalle = detalleId !== null ? items.find((x) => x.id === detalleId) ?? null : null;
  useEscape([[detalle !== null, () => setDetalleId(null)]]);

  const tarjeta = (v: Venta) => {
    const accion = config.acciones[v.estado ?? ''];
    const esOcupado = ocupadoId === v.id;
    const min = minutosDesde(v.fecha ?? '');
    const enMesa = v.tipo_entrega === 'Consumir' && !!v.mesa;
    return (
      <div
        className={`tv-card${accion ? ' arrastrable' : ''}${arrastrandoId === v.id ? ' arrastrando' : ''}`}
        key={v.id}
        draggable={!!accion && !esOcupado}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', String(v.id));
          e.dataTransfer.effectAllowed = 'move';
          setArrastrandoId(v.id);
        }}
        onDragEnd={() => {
          setArrastrandoId(null);
          setColHover(null);
        }}
      >
        <div className="tv-card-head">
          <span className="tv-num">#{v.id}</span>
          {v.tipo_entrega && <span className="tv-tag">{ETIQUETA_ENTREGA[v.tipo_entrega] ?? v.tipo_entrega}</span>}
          <span className={`tv-tiempo${min >= 20 ? ' urgente' : ''}`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            {duracion(min)}
          </span>
        </div>

        <div className="tv-card-body">
          <span className="tv-cliente">{enMesa ? `Mesa ${v.mesa}` : nombreCliente(v)}</span>

          <button type="button" className="tv-ver-detalle" onClick={() => setDetalleId(v.id)}>
            Ver detalle
          </button>
        </div>

        <div className="tv-card-foot">
          <span className="tv-total">${Number(v.valor_total || 0).toLocaleString('es-CO')}</span>
          {accion ? (
            <button type="button" className="tv-btn" disabled={esOcupado} onClick={() => intentarCambio(v, accion)}>
              {esOcupado ? 'Guardando…' : accion.texto}
            </button>
          ) : (
            <span className="tv-espera">Sin acción disponible</span>
          )}
        </div>
      </div>
    );
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
              {(['todos', 'cocina', 'meseros', 'cajero'] as Vista[]).map((v) => (
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
        </div>
      </div>

      <p className="tv-nota">Se actualiza en tiempo real.</p>

      {error && (
        <div className="tv-errorbox" role="alert">
          {error}
          <button type="button" onClick={() => setError(null)} aria-label="Cerrar aviso">✕</button>
        </div>
      )}

      <div className="tv-barra">
        <input
          className="tv-buscar"
          type="search"
          placeholder="Buscar por número, mesa o nombre"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <div className="tv-acciones">

          {puedeCrear && (
            <button type="button" className="tv-btn-nuevo" onClick={() => setNuevoAbierto(true)}>
              + Nuevo pedido
            </button>
          )}
        </div>
      </div>

      <div className="tv-pills">
        {FILTROS_ENTREGA.map((f) => (
          <button
            key={f.valor}
            type="button"
            className={`tv-pill${filtroEntrega === f.valor ? ' activo' : ''}`}
            onClick={() => setFiltroEntrega(f.valor)}
          >
            {f.texto}
          </button>
        ))}
      </div>

      <div
        className="tv-cols"
        style={{ gridTemplateColumns: `repeat(${config.estados.length}, minmax(320px, 1fr))` }}
      >
        {config.estados.map((estado) => {
          const col = visibles.filter((v) => v.estado === estado);
          return (
            <section
              className={`tv-col${colHover === estado ? ' soltar' : ''}`}
              data-estado={estado}
              key={estado}
              onDragOver={(e) => {
                if (arrastrandoId === null) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (colHover !== estado) setColHover(estado);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setColHover(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                soltarEn(estado);
              }}
            >
              <header className="tv-col-head">
                <span className="tv-col-titulo">
                  <i className="tv-dot" />
                  {ETIQUETA[vista]?.[estado] ?? estado}
                </span>
                <span className="tv-col-count">{loading ? '–' : col.length}</span>
              </header>
              {loading ? (
                <p className="tv-col-vacio">Cargando…</p>
              ) : col.length === 0 ? (
                <p className="tv-col-vacio">Sin pedidos</p>
              ) : (
                col.map(tarjeta)
              )}
            </section>
          );
        })}
      </div>

      <NuevaVentaModal
        abierto={nuevoAbierto}
        mesaInicial={mesaNueva}
        onClose={() => {
          setNuevoAbierto(false);
          setMesaNueva(null);
        }}
        onCreada={() => void load()}
      />

      {detalle && (
        <div className="modal-overlay open" onClick={() => setDetalleId(null)}>
          <div className="modal-box tv-det-box" onClick={(e) => e.stopPropagation()}>
            <div className="tv-det-head">
              <div>
                <h3 className="tv-det-titulo">Pedido #{detalle.id}</h3>
              </div>
              <button type="button" className="tv-det-cerrar" onClick={() => setDetalleId(null)} aria-label="Cerrar">
                ✕
              </button>
            </div>

            <dl className="tv-det-info">
              <div><dt>Cliente</dt><dd>{nombreCliente(detalle)}</dd></div>
              <div><dt>Estado</dt><dd>{detalle.estado ?? '—'}</dd></div>
              <div>
                <dt>Entrega</dt>
                <dd>{ETIQUETA_ENTREGA[detalle.tipo_entrega ?? ''] ?? detalle.tipo_entrega ?? '—'}</dd>
              </div>
              {detalle.tipo_entrega === 'Consumir' && detalle.mesa ? (
                <div><dt>Mesa</dt><dd>{detalle.mesa}</dd></div>
              ) : null}
              <div><dt>Método de pago</dt><dd>{detalle.metodo_pago || '—'}</dd></div>
              <div>
                <dt>Hora</dt>
                <dd>
                  {Number.isFinite(aFecha(detalle.fecha ?? '').getTime())
                    ? aFecha(detalle.fecha ?? '').toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
                    : '—'}
                </dd>
              </div>
            </dl>

            <ul className="tv-items">
              {(detalle.detalles ?? []).map((d, i) => (
                <li key={`d${i}`}>
                  <b>{d.cantidad ?? 1}×</b> {d.producto?.nombre ?? 'Producto'}
                </li>
              ))}
              {(detalle.promociones ?? [])
                .filter((p) => p?.nombre)
                .map((p, i) => (
                  <li key={`p${i}`} className="tv-promo">
                    {p.nombre}
                  </li>
                ))}
            </ul>

            {separarNotas(detalle.notas).length > 0 && (
              <div className="tv-chips">
                {separarNotas(detalle.notas).map((n, i) => (
                  <span key={i} className={`tv-chip${/^sin/i.test(n) ? ' sin' : /^extra/i.test(n) ? ' extra' : ''}`}>
                    {n}
                  </span>
                ))}
              </div>
            )}

            <div className="tv-det-total">
              <span>Total</span>
              <strong>${Number(detalle.valor_total || 0).toLocaleString('es-CO')}</strong>
            </div>
          </div>
        </div>
      )}

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