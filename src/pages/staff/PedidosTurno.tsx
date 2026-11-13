import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import { normalizarRol } from '../../utils/roles';
import { useToast } from '../../components/Toast';
import MotivoModal from '../../components/MotivoModal';
import { mensajeDeError, type MapaTransiciones } from '../../types/Trazabilidad';
import '../../styles/pedidos-turno.css';
import { getEcho } from '../../api/echo';
import { etiquetaEstado } from '../../utils/estados';

import NuevaVentaModal, { precargarNuevaVenta } from '../../components/NuevaVentaModal';
import ComprobanteImagen from '../../components/ComprobanteImagen';
import ComprobanteModal from '../../components/ComprobanteModal';
import { useEscape } from '../../hooks/useEscape';
import AdminLoading from '../../components/AdminLoading';

type Vista = 'cocina' | 'meseros' | 'cajero' | 'todos';

interface Accion {
  sig: string;
  texto: string;
}

interface VistaConfig {
  titulo: string;
  subtitulo: string;
  estados: string[];
  columnas?: string[];
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
    subtitulo: 'Pedidos preparados para servir en las mesas.',
    estados: ['Preparado'],
    acciones: {
      Preparado: { sig: 'Servido', texto: 'Marcar servido' },
    },
  },
  cajero: {
    titulo: 'Cajero',
    subtitulo: 'Verifica pedidos, entrega pedidos listos y cobra las mesas pendientes.',
    estados: ['Por verificar', 'Preparado', 'Pendiente de pago'],
    acciones: {
      'Por verificar': { sig: 'Recepcionado', texto: 'Recibir pedido' },
      Preparado: { sig: 'Servido', texto: 'Entregar' },
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
  cajero: { Preparado: 'Por entregar' },
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
  programado_para?: string | null;
  fecha_programada?: string | null;
  estado?: string;
  tipo_entrega?: string | null;
  metodo_pago?: string | null;
  valor_total?: string | number | null;
  cliente_nombre?: string | null;
  mesa?: number | null;
  notas?: string | null;
  usuario_id?: number | null;
  usuario?: { nombre?: string; apellido?: string; rol_id?: number; telefono?: string | null; phone?: string | null } | null;
  telefono_contacto?: string | null;
  direccion?: string | null;
  barrio?: string | null;
  referencia?: string | null;
  recibe_nombre?: string | null;
  recibe_telefono?: string | null;
  detalles?: ItemVenta[];
  promociones?: PromoVenta[];
  tiene_comprobante?: boolean;
  comprobante_estado?: string | null;
  comprobante_motivo?: string | null;
  comprobante_valor?: string | number | null;
  comprobante_coincide?: boolean | null;
  comprobante_subido_en?: string | null;
  comprobante_datos?: {
    entidad?: string | null;
    referencia?: string | null;
    estado_transaccion?: string | null;
    observaciones?: string | null;
  } | null;
}

interface CambioConMotivo {
  venta: Venta;
  accion: Accion;
}

const METODOS_COBRO = ['Efectivo', 'Nequi', 'Daviplata', 'Bancolombia'];

const aFecha = (f: string) => new Date((f || '').replace(' ', 'T'));

const minutosDesde = (f: string): number => {
  const t = aFecha(f).getTime();
  return Number.isFinite(t) ? Math.max(0, Math.floor((Date.now() - t) / 60000)) : 0;
};

const duracion = (min: number): string =>
  min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`;

type Entrega = 'todos' | 'Domicilio' | 'Recoger' | 'Consumir';

const METODOS_CON_COMPROBANTE = [
  'Nequi', 'Daviplata', 'Bancolombia', 'Transferencia', 'Tarjeta', 'PSE',
];

const requiereComprobante = (v: Venta): boolean =>
  METODOS_CON_COMPROBANTE.includes((v.metodo_pago ?? '').trim());

const comprobanteAprobado = (v: Venta): boolean => v.comprobante_estado === 'Aprobado';

const ROL_CLIENTE = 2;
const creoCliente = (v: Venta) => Number(v.usuario?.rol_id) === ROL_CLIENTE;

const yaPagado = (v: Venta): boolean =>
  creoCliente(v) &&
  (v.metodo_pago ?? '').trim().toLowerCase() !== 'efectivo' &&
  v.comprobante_estado === 'Aprobado';

const pagoConComprobanteAprobado = (v: Venta): boolean =>
  (v.metodo_pago ?? '').trim().toLowerCase() !== 'efectivo' &&
  v.comprobante_estado === 'Aprobado';

const columnaDe = (v: Venta, vista: Vista): string =>
  vista === 'cajero' ? (yaPagado(v) ? 'Ya pagados' : 'Pendiente de pago') : (v.estado ?? '');

const FILTROS_ENTREGA: { valor: Entrega; texto: string }[] = [
  { valor: 'todos', texto: 'Todos' },
  { valor: 'Domicilio', texto: 'Domicilio' },
  { valor: 'Recoger', texto: 'Para recoger' },
  { valor: 'Consumir', texto: 'En el local' },
];

const ETIQUETA_ENTREGA: Record<string, string> = { Domicilio: 'Domicilio', Recoger: 'Para recoger', Consumir: 'En el local' };

const separarNotas = (n?: string | null): string[] =>
  (n ?? '').split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);

const nombreCliente = (v: Venta): string =>
  v.cliente_nombre || [v.usuario?.nombre, v.usuario?.apellido].filter(Boolean).join(' ').trim() || 'Cliente';

const telefonoCliente = (v: Venta): string =>
  v.telefono_contacto || v.usuario?.telefono || v.usuario?.phone || '';

const Fila = ({ k, v }: { k: string; v: ReactNode }) => (
  <div className="tv-fila">
    <span className="tv-fila-k">{k}</span>
    <span className="tv-fila-v">{v}</span>
  </div>
);

export default function PedidosTurno() {
  const { user } = useAuth();
  const { showToast, confirmar } = useToast();

  const alertar = (m: string) => showToast(m, true);

  const rol = normalizarRol(user?.role);
  const esAdmin = rol === 'admin';
  const puedeRevisar = esAdmin || rol === 'cajero';
  const puedeRevisarComprobante = esAdmin || rol === 'cajero';
  const puedeVerComprobante = esAdmin || rol === 'cajero'; 
  const puedeCrear = rol === 'admin' || rol === 'mesero';
  const vistaInicial = VISTA_INICIAL[rol] ?? 'cocina';

  const [vista, setVista] = useState<Vista>(vistaInicial);
  const [items, setItems] = useState<Venta[]>([]);
  const [transiciones, setTransiciones] = useState<MapaTransiciones | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ocupadoId] = useState<number | null>(null);
  const [cambioConMotivo, setCambioConMotivo] = useState<CambioConMotivo | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEntrega, setFiltroEntrega] = useState<Entrega>('todos');
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [mesaNueva, setMesaNueva] = useState<number | null>(null);
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [arrastrandoId, setArrastrandoId] = useState<number | null>(null);
  const [colHover, setColHover] = useState<string | null>(null);
  const [comprobanteARechazar, setComprobanteARechazar] = useState<Venta | null>(null);
  const [comprobanteASubir, setComprobanteASubir] = useState<Venta | null>(null);
  const [procesandoComprobante, setProcesandoComprobante] = useState(false);
  const [cobro, setCobro] = useState<{ venta: Venta; accion: Accion } | null>(null);
  const [metodoCobro, setMetodoCobro] = useState('Efectivo');
  const [archivoCobro, setArchivoCobro] = useState<File | null>(null);
  const [pagando, setPagando] = useState(false);
  const pagandoRef = useRef(false);
  const colsRef = useRef<HTMLDivElement>(null);
  const moverColumnas = (dir: 1 | -1) =>
    colsRef.current?.scrollBy({ left: dir * 420, behavior: 'smooth' });
  const refArchivoCobro = useRef<HTMLInputElement>(null);
  const previewCobro = useMemo(
    () => (archivoCobro ? URL.createObjectURL(archivoCobro) : null),
    [archivoCobro],
  );
  useEffect(() => () => { if (previewCobro) URL.revokeObjectURL(previewCobro); }, [previewCobro]);
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick((x) => x + 1), 30000);
    return () => window.clearInterval(t);
  }, []);

  const version = useRef(0);
  const pendientes = useRef(0);
  const config = VISTA_CONFIG[vista];

  const load = useCallback(async () => {
    if (pendientes.current > 0) return;
    const miVersion = version.current;
    try {
      const res = await apiClient.get('/pedidos/tablero');
      if (miVersion !== version.current || pendientes.current > 0) return;
      const lista: Venta[] = Array.isArray(res.data)
        ? res.data
        : ((res.data as { data?: unknown })?.data as Venta[]) ?? [];
      const turno = lista.filter((v) => config.estados.includes(v.estado ?? ''));
      turno.sort((a, b) =>
        aFecha(a.fecha_programada ?? a.fecha ?? '').getTime() - aFecha(b.fecha_programada ?? b.fecha ?? '').getTime());
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
    precargarNuevaVenta();
  }, []);

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
    echo?.private('cocina').listen('.venta.actualizada', alCambiar);

    const t = window.setInterval(() => {
      if (!document.hidden) void load();
    }, echo ? 60000 : 8000);

    return () => {
      window.clearInterval(t);
      echo?.private('cocina').stopListening('.venta.actualizada', alCambiar);
    };
  }, [load]);

  const intentarCambio = (venta: Venta, accion: Accion) => {
    if (accion.sig === 'Pagado' && pagoConComprobanteAprobado(venta)) {
      void ejecutarCambio(venta, accion, undefined, venta.metodo_pago ?? undefined);
      return;
    }
    if (accion.sig === 'Pagado' && (venta.metodo_pago ?? '').trim().toLowerCase() === 'efectivo') {
      void ejecutarCambio(venta, accion, undefined, 'Efectivo');
      return;
    }
    setError(null);
    const actual = venta.estado ?? '';
    const t = transiciones?.[actual];
    if (t && !t.directas.includes(accion.sig) && !t.con_motivo.includes(accion.sig)) {
      alertar(`El sistema no permite pasar de «${actual}» a «${accion.sig}».`);
      return;
    }
    if (t?.con_motivo.includes(accion.sig)) {
      setCambioConMotivo({ venta, accion });
      return;
    }
    if (actual === 'Registrado' && accion.sig === 'Por verificar') {
      const metodo = (venta.metodo_pago ?? '').trim();
      if (!metodo) {
        alertar(`El pedido #${venta.id} no tiene método de pago. Verifícalo antes de avanzar.`);
        return;
      }
      if (requiereComprobante(venta) && venta.comprobante_estado === 'Rechazado') {
        alertar(`El comprobante del pedido #${venta.id} fue devuelto. Espera a que el cliente suba uno nuevo.`);
        return;
      }
      if (requiereComprobante(venta) && !comprobanteAprobado(venta)) {
        alertar(
          venta.tiene_comprobante
            ? `Aprueba el comprobante de ${metodo} del pedido #${venta.id} antes de avanzar.`
            : `El pedido #${venta.id} (${metodo}) no tiene comprobante de pago.`,
        );
        return;
      }
    }
    if (accion.sig === 'Pagado') {
      pagandoRef.current = false;
      setPagando(false);
      const m = (venta.metodo_pago ?? '').trim();
      setMetodoCobro(METODOS_COBRO.includes(m) ? m : 'Efectivo');
      setArchivoCobro(null);
      setCobro({ venta, accion });
      return;
    }
    void ejecutarCambio(venta, accion, undefined);
  };

  const ejecutarCambio = async (venta: Venta, accion: Accion, motivo?: string, metodo?: string) => {
    const anterior = items;
    pendientes.current += 1;
    version.current += 1;

    setItems((prev) =>
      prev
        .map((v) => (v.id === venta.id ? { ...v, estado: accion.sig } : v))
        .filter((v) => config.estados.includes(v.estado ?? '')),
    );
    showToast(`Pedido #${venta.id}: ${accion.sig.toLowerCase()}`, false);

    try {
      await apiClient.patch(`/ventas/${venta.id}/estado`, { estado: accion.sig, motivo, metodo_pago: metodo });
    } catch (e) {
      setItems(anterior);
      alertar(mensajeDeError(e, `No se pudo marcar el pedido #${venta.id} como «${accion.sig}».`));
    } finally {
      pendientes.current -= 1;
      version.current += 1;
      void load();
    }
  };

  const claseComprobante = (estado?: string | null) => {
    const e = (estado ?? '').trim().toLowerCase();
    if (e === 'aprobado') return 'badge-success';
    if (e === 'rechazado') return 'badge-danger';
    if (e === 'pendiente') return 'badge-warning';
    return 'badge-info';
  };

  const revisarComprobante = async (
    venta: Venta,
    estado: 'Aprobado' | 'Rechazado',
    motivo?: string,
  ) => {
    setProcesandoComprobante(true);
    setError(null);
    try {
      const { data } = await apiClient.patch(`/ventas/${venta.id}/comprobante/revisar`, {
        estado,
        motivo,
      });
      showToast(
        data?.message ??
          (estado === 'Aprobado'
            ? 'Comprobante aprobado.'
            : 'Comprobante devuelto al cliente.'),
        false,
      );
      setComprobanteARechazar(null);
      setItems((prev) =>
        prev.map((v) =>
          v.id === venta.id
            ? {
                ...v,
                comprobante_estado: estado,
                comprobante_motivo: estado === 'Rechazado' ? motivo ?? null : null,
              }
            : v,
        ),
      );
      await load();
    } catch (e: unknown) {
      alertar(
        mensajeDeError(e, `No se pudo revisar el comprobante del pedido #${venta.id}.`),
      );
    } finally {
      setProcesandoComprobante(false);
    }
  };

  const soltarEn = (estadoDestino: string) => {
    const venta = items.find((x) => x.id === arrastrandoId);
    setArrastrandoId(null);
    setColHover(null);
    if (!venta || venta.estado === estadoDestino) return;
    if (vista === 'cajero') return;
    intentarCambio(venta, { sig: estadoDestino, texto: `Mover a ${estadoDestino}` });
  };

  const visibles = items.filter((v) => {
    if (rol === 'mesero' && v.tipo_entrega !== 'Consumir') return false;
    if (rol === 'cajero' && v.estado === 'Preparado' && v.tipo_entrega === 'Consumir') return false;
    if (rol === 'cajero' && v.estado === 'Pendiente de pago' && v.tipo_entrega !== 'Consumir') return false;
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

  const puedeSubirComprobante = (v: Venta) =>
    puedeRevisar || Number(v.usuario_id) === Number(user?.id);
  const esEfectivo = (v: Venta) => (v.metodo_pago || '').toLowerCase() === 'efectivo';

  const detalle = detalleId !== null ? items.find((x) => x.id === detalleId) ?? null : null;
  useEscape([
    [cobro !== null, () => setCobro(null)],
    [comprobanteASubir !== null, () => setComprobanteASubir(null)],
    [comprobanteARechazar !== null, () => setComprobanteARechazar(null)],
    [detalle !== null, () => setDetalleId(null)],
  ]);
  
  const exigeComprobante =
    !!cobro && METODOS_CON_COMPROBANTE.includes(metodoCobro) && !comprobanteAprobado(cobro.venta);
    
  const confirmarPago = async () => {
    if (!cobro || pagandoRef.current) return;
    const { venta, accion } = cobro;

    if (exigeComprobante && !archivoCobro) {
      alertar('Adjunta la imagen del comprobante de pago.');
      return;
    }

    pagandoRef.current = true;
    setPagando(true);
    try {
      if (exigeComprobante && (venta.metodo_pago ?? '').trim() !== metodoCobro) {
        await apiClient.patch(`/ventas/${venta.id}/metodo-pago`, { metodo_pago: metodoCobro });
      }

      if (exigeComprobante && archivoCobro) {
        const form = new FormData();
        form.append('comprobante', archivoCobro);
        const { data } = await apiClient.post(`/ventas/${venta.id}/comprobante`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 90000,
        });

        if (data?.venta?.comprobante_estado !== 'Aprobado') {
          const valor = data?.venta?.comprobante_valor;
          const seguir = await confirmar(
          `El valor del comprobante${valor != null ? ` ($${Number(valor).toLocaleString('es-CO')})` : ''} ` +
          `no coincide con el total del pedido.\n¿Registrar el pago de todas formas?`,
          'Sí, registrar pago',
        );
          if (!seguir) {
            pagandoRef.current = false;
            setPagando(false);
            return;
          }
          await apiClient.patch(`/ventas/${venta.id}/comprobante/revisar`, { estado: 'Aprobado' });
        }
      }

      setCobro(null);
      setArchivoCobro(null);
      void ejecutarCambio(venta, accion, undefined, metodoCobro);
      pagandoRef.current = false;
      setPagando(false);
    } catch (e) {
      alertar(mensajeDeError(e, 'No se pudo registrar el pago.'));
      pagandoRef.current = false;
      setPagando(false);
    }
  };

  const tarjeta = (v: Venta) => {
    const accionBase = config.acciones[v.estado ?? ''];
    let accion =
      accionBase ??
      (rol === 'cajero' && v.estado === 'Preparado' && v.tipo_entrega !== 'Consumir'
        ? { sig: 'Servido', texto: 'Entregar' }
        : undefined);
        
    if (vista === 'cajero' && accion && yaPagado(v)) {
      accion = { ...accion, texto: 'Cerrar pedido' };
    }
    
    const esOcupado = ocupadoId === v.id;
    const min = minutosDesde(v.fecha_programada ?? v.fecha ?? '');
    const enMesa = v.tipo_entrega === 'Consumir' && !!v.mesa;
    const FINALES = ['Pagado', 'Cancelado', 'Reembolsada', 'Rechazada'];
    const hermanos = enMesa
      ? items
          .filter((o) => o.tipo_entrega === 'Consumir' && o.mesa === v.mesa && !FINALES.includes(o.estado ?? ''))
          .sort((a, b) => a.id - b.id)
      : [];
    const nPedido = hermanos.findIndex((o) => o.id === v.id) + 1;
    const colorMesa =
      enMesa && hermanos.length > 1
        ? ['#2563eb', '#e67e22', '#1d7a46', '#8b5cf6', '#db2777'][(Number(v.mesa) - 1) % 5]
        : undefined;

    const estadoTerminal = ['Cancelado', 'Rechazada', 'Reembolsada'].includes(v.estado ?? '');
    const tActual = transiciones?.[v.estado ?? ''];
    const permiteRechazo = !!tActual && (tActual.directas.includes('Rechazada') || tActual.con_motivo.includes('Rechazada'));
    
    let puedeRechazar = false;
    if (!estadoTerminal && permiteRechazo) {
      if (rol === 'admin') {
        puedeRechazar = true;
      } else if (rol === 'cocinero' && ['Recepcionado', 'En preparación'].includes(v.estado ?? '')) {
        puedeRechazar = true;
      } else if (['cajero', 'mesero'].includes(rol) && ['Registrado', 'Por verificar', 'Recepcionado'].includes(v.estado ?? '')) {
        puedeRechazar = true;
      }
    }

    const vaAPagar = accion?.sig === 'Pagado';
    const faltaComprobante = vaAPagar && requiereComprobante(v) && !comprobanteAprobado(v);
    const textoAccion = faltaComprobante
      ? puedeRevisarComprobante
        ? 'Aprobar comprobante'
        : 'Comprobante pendiente'
      : accion?.texto;
    const accionDeshabilitada = esOcupado || (faltaComprobante && !puedeRevisarComprobante);

    return (
      <div
        className={`tv-card${accion ? ' arrastrable' : ''}${arrastrandoId === v.id ? ' arrastrando' : ''}`}
        key={v.id}
        draggable={!!accion && !esOcupado}
        style={colorMesa ? { borderLeftColor: colorMesa } : undefined}
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
          {colorMesa && nPedido > 0 && (
            <span className="tv-mesa-grupo" style={{ color: colorMesa, borderColor: colorMesa }}>
              {nPedido}º pedido de la mesa
            </span>
          )}

          {v.fecha_programada && (() => {
            const t = new Date(v.fecha_programada);
            const hora = t.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
            const faltan = Math.round((t.getTime() - Date.now()) / 60000);
            return faltan <= 30 ? (
              <span className="tv-pago-bloqueado">¡Preparar ya! Para las {hora}</span>
            ) : (
              <span className="tv-tag">Programado: {hora}</span>
            );
          })()}

          <button type="button" className="tv-ver-detalle" onClick={() => setDetalleId(v.id)}>
            Ver detalle
          </button>

          {v.programado_para && (
            <span className="tv-programado">
              Programado: {aFecha(v.programado_para).toLocaleString('es-CO', {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
            </span>
          )}

          {faltaComprobante && (
            <span className="tv-pago-bloqueado">
              {v.comprobante_estado === 'Rechazado'
                ? 'Comprobante devuelto'
                : v.comprobante_estado === 'Pendiente'
                  ? 'Comprobante pendiente de aprobación'
                  : 'Sin comprobante de pago'}
            </span>
          )}
        </div>

        <div className="tv-card-foot">
          <span className="tv-total">${Number(v.valor_total || 0).toLocaleString('es-CO')}</span>
          
          <div className="tv-acciones-tarjeta">
            {accion ? (
              <button
                type="button"
                className="tv-btn"
                disabled={accionDeshabilitada}
                title={faltaComprobante && !puedeRevisarComprobante
                  ? 'El administrador o el cajero deben aprobar el comprobante antes de confirmar el pago.'
                  : undefined}
                onClick={() => {
                  if (faltaComprobante || v.estado === 'Registrado') {
                    setDetalleId(v.id);
                  } else {
                    intentarCambio(v, accion);
                  }
                }}
              >
                {esOcupado ? 'Guardando…' : textoAccion}
              </button>
            ) : (
              <span className="tv-espera">Sin acción disponible</span>
            )}

            {puedeRechazar && (
              <button
                type="button"
                className="tv-btn tv-btn-rechazar"
                disabled={esOcupado}
                onClick={() => intentarCambio(v, { sig: 'Rechazada', texto: 'Rechazar pedido' })}
                title="Rechazar pedido (requiere motivo)"
              >
                Rechazar
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const columnas = config.columnas ?? config.estados;
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

        {columnas.length > 3 && (
          <div className="tv-flechas">
            <button type="button" onClick={() => moverColumnas(-1)} aria-label="Columnas anteriores">‹</button>
            <button type="button" onClick={() => moverColumnas(1)} aria-label="Columnas siguientes">›</button>
          </div>
        )}
      </div>

      <div
        ref={colsRef}
        className="tv-cols"
        style={{ gridTemplateColumns: `repeat(${columnas.length}, minmax(320px, 1fr))` }}
      >
        {columnas.map((estado) => {
          const col = visibles.filter((v) => columnaDe(v, vista) === estado);
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

      {loading && (
        <AdminLoading texto="Cargando pedidos" subtexto="Preparando el tablero" />
      )}
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
              <button type="button" className="modal-x" onClick={() => setDetalleId(null)} aria-label="Cerrar">×</button>
            </div>
            
            {(() => {
              const fmt = (f?: string | null) =>
                f && Number.isFinite(aFecha(f).getTime())
                  ? aFecha(f).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
                  : '—';
              const entrega = ETIQUETA_ENTREGA[detalle.tipo_entrega ?? ''] ?? detalle.tipo_entrega ?? '—';
              const esDomicilio = detalle.tipo_entrega === 'Domicilio';
              const esRecoger = detalle.tipo_entrega === 'Recoger';
              const esLocal = detalle.tipo_entrega === 'Consumir';

              return (
                <div className="tv-info">
                  <div className="tv-info-chips">
                    <span className="tv-info-chip entrega">{entrega}</span>
                  </div>

                  <section className="tv-info-sec">
                    <h4>Cliente</h4>
                    <Fila k="Nombre" v={nombreCliente(detalle)} />
                    {telefonoCliente(detalle) && <Fila k="Teléfono" v={telefonoCliente(detalle)} />}
                  </section>

                  <section className="tv-info-sec">
                    <h4>{esDomicilio ? 'Entrega a domicilio' : esRecoger ? 'Para recoger' : 'En el local'}</h4>
                    {esLocal && <Fila k="Mesa" v={detalle.mesa ?? '—'} />}
                    {esRecoger && (
                      <Fila k="Recoge a nombre de" v={detalle.recibe_nombre || nombreCliente(detalle)} />
                    )}
                    {esDomicilio && (
                      <>
                        <Fila k="Nombre de quien recibe" v={detalle.recibe_nombre || nombreCliente(detalle)} />
                        <Fila k="Teléfono de quien recibe" v={detalle.recibe_telefono || telefonoCliente(detalle) || '—'} />
                        <Fila k="Dirección" v={detalle.direccion || '—'} />
                        <Fila k="Barrio" v={detalle.barrio || '—'} />
                        {detalle.referencia && <Fila k="Referencia" v={detalle.referencia} />}
                      </>
                    )}
                    {!esLocal && (
                      <Fila
                        k="Hora que lo quieren"
                        v={detalle.fecha_programada ? fmt(detalle.fecha_programada) : 'Lo antes posible'}
                      />
                    )}
                  </section>

                  <section className="tv-info-sec">
                    <h4>Pedido</h4>
                    <Fila k="Estado" v={etiquetaEstado(detalle.estado ?? '-', detalle.tipo_entrega)} />
                    <Fila k="Método de pago" v={detalle.metodo_pago || '—'} />
                    <Fila k="Hora del pedido" v={fmt(detalle.fecha)} />
                    {detalle.programado_para && (
                      <Fila k="Programado para" v={fmt(detalle.programado_para)} />
                    )}
                  </section>
                </div>
              );
            })()}

            {(() => {
              const agrupados = new Map<string, { nombre: string; cantidad: number; subtotal: number }>();
              (detalle.detalles ?? []).forEach((d) => {
                const nombre = d.producto?.nombre ?? 'Producto';
                const prev = agrupados.get(nombre) ?? { nombre, cantidad: 0, subtotal: 0 };
                prev.cantidad += Number(d.cantidad ?? 1);
                prev.subtotal += Number((d as any).subtotal ?? 0);
                agrupados.set(nombre, prev);
              });
              const promos = (detalle.promociones ?? []).filter((p) => p?.nombre);

              return (
                <div className="tv-det-productos">
                  <h4 className="tv-det-subtitulo">Productos</h4>
                  <ul className="tv-det-lista">
                    {[...agrupados.values()].map((g) => (
                      <li key={g.nombre}>
                        <span className="tv-det-cant">{g.cantidad}</span>
                        <span className="tv-det-nombre">{g.nombre}</span>
                        <span className="tv-det-precio">
                          {g.subtotal > 0 ? `$${g.subtotal.toLocaleString('es-CO')}` : 'Incluido'}
                        </span>
                      </li>
                    ))}
                    {promos.map((p, i) => (
                      <li key={`p${i}`} className="tv-det-combo">
                        <span className="tv-det-cant">1</span>
                        <span className="tv-det-nombre">Combo {p.nombre}</span>
                        <span className="tv-det-precio" />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}

            {separarNotas(detalle.notas).length > 0 && (
              <div className="tv-chips">
                {separarNotas(detalle.notas).map((n, i) => (
                  <span key={i} className={`tv-chip${/^sin/i.test(n) ? ' sin' : /^extra/i.test(n) ? ' extra' : ''}`}>
                    {n}
                  </span>
                ))}
              </div>
            )}

            {puedeVerComprobante && (
              <section className="vt-det-sec tv-det-comprobante">
                <h4>Comprobante de pago</h4>

                {!detalle.tiene_comprobante ? (
                  <>
                    <p className="vt-comprobante-vacio">
                      {esEfectivo(detalle)
                        ? 'Pago en efectivo contra entrega: no requiere comprobante.'
                        : 'Este pedido no tiene comprobante de pago cargado.'}
                    </p>
                    {!esEfectivo(detalle) && puedeSubirComprobante(detalle) && (
                      <div className="vt-comprobante-acciones">
                        <button
                          type="button"
                          className="btn-save"
                          onClick={() => setComprobanteASubir(detalle)}
                        >
                          Subir comprobante
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="vt-comprobante-cabecera">
                      <span className={`badge ${claseComprobante(detalle.comprobante_estado)}`}>
                        {detalle.comprobante_estado || 'Pendiente'}
                      </span>
                      {detalle.comprobante_subido_en && (
                        <span className="vt-comprobante-fecha">
                          Subido: {aFecha(detalle.comprobante_subido_en).toLocaleString('es-CO', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      )}
                    </div>

                    {detalle.comprobante_estado === 'Rechazado' && detalle.comprobante_motivo && (
                      <p className="vt-comprobante-motivo">
                        Motivo enviado al cliente: {detalle.comprobante_motivo}
                      </p>
                    )}

                    <dl className="vt-det-grid vt-comprobante-datos">
                      <div>
                        <dt>Valor detectado por la IA</dt>
                        <dd>
                          {detalle.comprobante_valor !== null && detalle.comprobante_valor !== undefined
                            ? `$${Number(detalle.comprobante_valor).toLocaleString('es-CO')}`
                            : 'No identificado'}
                        </dd>
                      </div>
                      <div>
                        <dt>¿Coincide con el total?</dt>
                        <dd>
                          {detalle.comprobante_coincide === true
                            ? 'Sí'
                            : detalle.comprobante_coincide === false
                              ? 'No — revisar antes de aprobar'
                              : 'No se pudo determinar'}
                        </dd>
                      </div>
                      <div>
                        <dt>Entidad</dt>
                        <dd>{detalle.comprobante_datos?.entidad || 'No identificada'}</dd>
                      </div>
                      <div>
                        <dt>Referencia</dt>
                        <dd>{detalle.comprobante_datos?.referencia || 'No identificada'}</dd>
                      </div>
                    </dl>

                    <ComprobanteImagen
                      ventaId={detalle.id}
                      version={detalle.comprobante_subido_en}
                      alt={`Comprobante de pago del pedido ${detalle.id}`}
                    />

                    {puedeRevisarComprobante && (
                      <div className="vt-comprobante-acciones">
                        {detalle.comprobante_estado !== 'Aprobado' && (
                          <button
                            type="button"
                            className="btn-save"
                            disabled={procesandoComprobante}
                            onClick={() => void revisarComprobante(detalle, 'Aprobado')}
                          >
                            {procesandoComprobante ? 'Guardando…' : 'Aprobar pago'}
                          </button>
                        )}
                        {detalle.comprobante_estado !== 'Rechazado' && (
                          <button
                            type="button"
                            className="btn-cancel"
                            style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                            disabled={procesandoComprobante}
                            onClick={() => setComprobanteARechazar(detalle)}
                          >
                            Devolver comprobante
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}

                {requiereComprobante(detalle) && !comprobanteAprobado(detalle) && detalle.comprobante_estado !== 'Rechazado' && (
                  <p className="tv-pago-aviso">
                    Pago electrónico: para confirmar el pago primero debe estar aprobado el
                    comprobante.
                  </p>
                )}
              </section>
            )}

            <div className="tv-det-total">
              <span>Total</span>
              <strong>${Number(detalle.valor_total || 0).toLocaleString('es-CO')}</strong>
            </div>

            {detalle.estado === 'Registrado' && (() => {
              const devuelto = requiereComprobante(detalle) && detalle.comprobante_estado === 'Rechazado';
              const bloqueado =
                !detalle.metodo_pago ||
                devuelto ||
                (requiereComprobante(detalle) && !comprobanteAprobado(detalle));

              return (
                <div className="vt-comprobante-acciones" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  {devuelto && (
                    <p className="tv-pago-aviso">
                      Comprobante devuelto: espera a que el cliente suba uno nuevo para continuar.
                    </p>
                  )}
                  <button
                    type="button"
                    className="btn-save"
                    disabled={bloqueado}
                    style={bloqueado ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                    onClick={() => {
                      const v = detalle;
                      setDetalleId(null);
                      intentarCambio(v, { sig: 'Por verificar', texto: 'Verificar' });
                    }}
                  >
                    Verificar y continuar
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {comprobanteASubir && (
        <ComprobanteModal
          ventaId={comprobanteASubir.id}
          numero={comprobanteASubir.id}
          onClose={() => setComprobanteASubir(null)}
          onSubido={() => {
            setComprobanteASubir(null);
            void load();
          }}
        />
      )}

      {comprobanteARechazar && (
        <MotivoModal
          titulo={`Devolver el comprobante del pedido #${comprobanteARechazar.id}`}
          descripcion="Explica al cliente por qué no se acepta el comprobante (por ejemplo, porque el valor no coincide con el total). El cliente verá este motivo en Mis compras y podrá subir uno nuevo."
          confirmarTexto="Devolver comprobante"
          placeholder="Ej: el comprobante muestra $20.000 y el total del pedido es $35.000..."
          onClose={() => setComprobanteARechazar(null)}
          onConfirm={(motivo) =>
            void revisarComprobante(comprobanteARechazar, 'Rechazado', motivo)
          }
        />
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

      {cobro && (
        <div className="modal-overlay open" onClick={() => !pagando && setCobro(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="tv-det-head">
              <h3 className="tv-det-titulo">Registrar pago del pedido #{cobro.venta.id}</h3>
              <button type="button" className="modal-x" onClick={() => setCobro(null)} aria-label="Cerrar">×</button>
            </div>

            <div className="tv-cobro-resumen">
              <div>
                <span className="tv-cobro-etq">
                  {cobro.venta.tipo_entrega === 'Consumir' && cobro.venta.mesa
                    ? `Mesa ${cobro.venta.mesa}`
                    : ETIQUETA_ENTREGA[cobro.venta.tipo_entrega ?? ''] ?? 'Pedido'}
                </span>
              </div>
              <div className="tv-cobro-total">
                <span className="tv-cobro-etq">Total a cobrar</span>
                <strong>${Number(cobro.venta.valor_total).toLocaleString('es-CO')}</strong>
              </div>
            </div>

            <div className="form-group">
              <label>Método de pago</label>
              <select value={metodoCobro} onChange={(e) => setMetodoCobro(e.target.value)} disabled={pagando}>
                {METODOS_COBRO.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {exigeComprobante && (
              <div className="form-group">
                <label>Comprobante de pago <span style={{ color: '#E8821A' }}>*</span></label>
                <input
                  ref={refArchivoCobro}
                  id="comprobante-cobro"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={(e) => setArchivoCobro(e.target.files?.[0] ?? null)}
                />
                {previewCobro ? (
                  <div className="tv-drop-preview">
                    <img src={previewCobro} alt="Vista previa del comprobante" />
                    <div className="tv-drop-info">
                      <strong>{archivoCobro?.name}</strong>
                      <span>{((archivoCobro?.size ?? 0) / 1024 / 1024).toFixed(2)} MB</span>
                      <button
                        type="button"
                        onClick={() => {
                          setArchivoCobro(null);
                          if (refArchivoCobro.current) refArchivoCobro.current.value = '';
                        }}
                      >
                        Quitar y elegir otra
                      </button>
                    </div>
                  </div>
                ) : (
                  <label htmlFor="comprobante-cobro" className="tv-drop">
                    <span>📎 Adjuntar imagen del comprobante</span>
                    <small>JPG, PNG o WEBP · máximo 8 MB</small>
                  </label>
                )}
              </div>
            )}

            <div className="vt-comprobante-acciones">
              <button type="button" className="btn-cancel" onClick={() => setCobro(null)} disabled={pagando}>
                Cancelar
              </button>
              <button type="button" className="btn-save" onClick={confirmarPago} disabled={pagando}>
                {pagando ? 'Registrando…' : 'Registrar pago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}