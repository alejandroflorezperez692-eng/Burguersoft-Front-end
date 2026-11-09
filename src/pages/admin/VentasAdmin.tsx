import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import apiClient from '../../api/client';
import AdminLoading from '../../components/AdminLoading';
import Paginacion, { paginar } from '../../components/Paginacion';

import { useToast } from '../../components/Toast';

import { useAuth } from '../../hooks/useAuth';
import { normalizarRol } from '../../utils/roles';
import { useEscape } from '../../hooks/useEscape';
import TrazabilidadModal from '../../components/TrazabilidadModal';
import logoImg from '../../assets/img/logo-burguersoft.png';
import { imprimirEnPagina } from '../../utils/imprimirEnPagina';
import ArqueoCaja from '../../components/ArqueoCaja';
import MotivoModal from '../../components/MotivoModal';
import ComprobanteImagen from '../../components/ComprobanteImagen';
import ComprobanteModal from '../../components/ComprobanteModal';
import { mensajeDeError } from '../../types/Trazabilidad';
import SelectOscuro from '../../components/SelectOscuro';


interface DetalleVenta {
  id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  producto?: { id?: number; nombre?: string };
}

interface PromocionVenta {
  id: number;
  nombre: string;
}

interface Venta {
  id: number;
  fecha: string;
  valor_total: number;
  metodo_pago: string;
  estado: string;
  tipo_entrega: string;
  usuario_id: number;
  cliente_nombre?: string | null;
  mesa?: number | null;
  notas?: string | null;
  usuario?: {
    nombre: string;
    apellido: string;
    rol_id?: number | null; 
    correo?: string | null;
    email?: string | null;
    telefono?: string | null;
    phone?: string | null;
    Tdocumento?: string | null;
    Ndocumento?: string | null;
  };
  detalles: DetalleVenta[];
  promociones: PromocionVenta[];
  tiene_comprobante?: boolean;
  comprobante_estado?: string | null;
  comprobante_motivo?: string | null;
  comprobante_datos?: {
    es_comprobante?: boolean;
    valor?: number | null;
    moneda?: string | null;
    fecha?: string | null;
    referencia?: string | null;
    entidad?: string | null;
    estado_transaccion?: string | null;
    valor_coincide?: boolean | null;
    observaciones?: string | null;
  } | null;
  comprobante_valor?: number | null;
  comprobante_coincide?: boolean | null;
  comprobante_subido_en?: string | null;
  comprobante_revisado_en?: string | null;
}

interface Producto {
  id: number;
  nombre: string;
  valor: number;
}

interface Promocion {
  id: number;
  nombre: string;
  precio: number;
  estado?: string;
}

const METODOS = ['Efectivo', 'Daviplata', 'Bancolombia', 'Nequi'];
const TIPOS_ENTREGA = ['Domicilio', 'Recoger', 'Consumir'];
const ESTADOS = ['Registrado', 'Por verificar', 'Recepcionado', 'En preparación', 'Preparado', 'Servido', 'Pendiente de pago', 'Pagado', 'Cancelado', 'Reembolsada', 'Rechazada'];

const METODOS_CON_COMPROBANTE = ['Nequi', 'Daviplata', 'Bancolombia', 'Transferencia', 'Tarjeta', 'PSE'];
const requiereComprobante = (v: Venta): boolean =>
  METODOS_CON_COMPROBANTE.includes((v.metodo_pago ?? '').trim());

// Estados que un mesero puede asignar (el resto queda deshabilitado)
const ESTADOS_MESERO = ['Registrado', 'En preparación', 'Preparado', 'Servido', 'Cancelado'];

const toArray = <T,>(v: unknown): T[] =>
  Array.isArray(v) ? (v as T[]) : ((v as { data?: unknown })?.data as T[] ?? []);

const normalizar = (s: unknown) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const fechaLocal = (fecha?: string | null) =>
  fecha ? new Date(fecha).toLocaleDateString('en-CA') : '';


function FiltroDesplegableVentas({ value, onChange, opciones }: {
  value: string;
  onChange: (value: string) => void;
  opciones: { value: string; label: string }[];
}) {
  const [modoOscuro, setModoOscuro] = useState(() => document.body.classList.contains('dark-mode'));
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new MutationObserver(() => setModoOscuro(document.body.classList.contains('dark-mode')));
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const cerrarFuera = (event: MouseEvent) => {
      if (!contenedorRef.current?.contains(event.target as Node)) setAbierto(false);
    };
    const cerrarEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('mousedown', cerrarFuera);
    document.addEventListener('keydown', cerrarEscape);
    return () => {
      document.removeEventListener('mousedown', cerrarFuera);
      document.removeEventListener('keydown', cerrarEscape);
    };
  }, [abierto]);

  if (!modoOscuro) {
    return (
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {opciones.map((opcion) => <option key={opcion.value} value={opcion.value}>{opcion.label}</option>)}
      </select>
    );
  }

  const seleccionada = opciones.find((opcion) => opcion.value === value);
  return (
    <div className="ventas-filter-dropdown" ref={contenedorRef}>
      <button
        type="button"
        className="ventas-filter-dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        onClick={() => setAbierto(!abierto)}
      >
        <span>{seleccionada?.label ?? ''}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>
      {abierto && (
        <ul className="ventas-filter-dropdown-options" role="listbox">
          {opciones.map((opcion) => (
            <li
              key={opcion.value}
              className={`ventas-filter-dropdown-option${opcion.value === value ? ' selected' : ''}`}
              role="option"
              aria-selected={opcion.value === value}
              tabIndex={0}
              onClick={() => { onChange(opcion.value); setAbierto(false); }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onChange(opcion.value);
                  setAbierto(false);
                }
              }}
            >
              {opcion.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SelectorFechaVentas({ value, onChange, min, max }: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
}) {
  const [modoOscuro, setModoOscuro] = useState(() => document.body.classList.contains('dark-mode'));
  const [abierto, setAbierto] = useState(false);
  const fechaInicial = value ? new Date(`${value}T00:00:00`) : new Date();
  const [mesVisible, setMesVisible] = useState(() => new Date(fechaInicial.getFullYear(), fechaInicial.getMonth(), 1));
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new MutationObserver(() => setModoOscuro(document.body.classList.contains('dark-mode')));
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const cerrarFuera = (event: MouseEvent) => {
      if (!contenedorRef.current?.contains(event.target as Node)) setAbierto(false);
    };
    const cerrarEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('mousedown', cerrarFuera);
    document.addEventListener('keydown', cerrarEscape);
    return () => {
      document.removeEventListener('mousedown', cerrarFuera);
      document.removeEventListener('keydown', cerrarEscape);
    };
  }, [abierto]);

  if (!modoOscuro) {
    return (
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  const anio = mesVisible.getFullYear();
  const mes = mesVisible.getMonth();
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const primerDia = (new Date(anio, mes, 1).getDay() + 6) % 7;
  const tituloMes = mesVisible.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  const indiceMes = anio * 12 + mes;
  const mesMinimo = min ? Number(min.slice(0, 4)) * 12 + Number(min.slice(5, 7)) - 1 : -Infinity;
  const mesMaximo = max ? Number(max.slice(0, 4)) * 12 + Number(max.slice(5, 7)) - 1 : Infinity;
  const textoFecha = value ? new Date(`${value}T00:00:00`).toLocaleDateString('es-CO') : 'dd/mm/aaaa';

  return (
    <div className="compras-date-picker ventas-date-picker" ref={contenedorRef}>
      <button
        type="button"
        className="compras-date-trigger ventas-date-trigger"
        aria-haspopup="dialog"
        aria-expanded={abierto}
        onClick={() => {
          if (!abierto) {
            const fecha = value ? new Date(`${value}T00:00:00`) : new Date();
            setMesVisible(new Date(fecha.getFullYear(), fecha.getMonth(), 1));
          }
          setAbierto(!abierto);
        }}
      >
        <span>{textoFecha}</span>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </svg>
      </button>
      {abierto && (
        <div className="compras-calendar" role="dialog" aria-label="Elegir fecha">
          <div className="compras-calendar-header">
            <button type="button" aria-label="Mes anterior" disabled={indiceMes <= mesMinimo} onClick={() => setMesVisible(new Date(anio, mes - 1, 1))}>‹</button>
            <strong>{tituloMes}</strong>
            <button type="button" aria-label="Mes siguiente" disabled={indiceMes >= mesMaximo} onClick={() => setMesVisible(new Date(anio, mes + 1, 1))}>›</button>
          </div>
          <div className="compras-calendar-grid compras-calendar-weekdays" aria-hidden="true">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((dia) => <span key={dia}>{dia}</span>)}
          </div>
          <div className="compras-calendar-grid">
            {Array.from({ length: primerDia }, (_, index) => <span key={`vacio-${index}`} />)}
            {Array.from({ length: diasEnMes }, (_, index) => {
              const dia = index + 1;
              const fecha = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
              const deshabilitada = (!!min && fecha < min) || (!!max && fecha > max);
              return (
                <button
                  type="button"
                  key={fecha}
                  className={value === fecha ? 'selected' : ''}
                  disabled={deshabilitada}
                  aria-pressed={value === fecha}
                  onClick={() => { onChange(fecha); setAbierto(false); }}
                >
                  {dia}
                </button>
              );
            })}
          </div>
          <div className="compras-calendar-footer">
            <button type="button" onClick={() => { onChange(''); setAbierto(false); }}>Borrar</button>
            <button
              type="button"
              onClick={() => {
                const hoy = new Date();
                const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
                if ((!min || fecha >= min) && (!max || fecha <= max)) onChange(fecha);
                setAbierto(false);
              }}
            >
              Hoy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const fmtDia = (f?: string | null) =>
  f ? new Date(f).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtHora = (f?: string | null) =>
  f ? new Date(f).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '';

export default function VentasAdmin() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const alertar = (m: any) => showToast(String(m), true);
   const esAdmin = normalizarRol(user?.role) === 'admin';
  const esMesero = normalizarRol(user?.role) === 'mesero';
  const puedeSubirComprobante = (v: Venta) =>
    esAdmin || Number(v.usuario_id) === Number(user?.id);

  
  const [items, setItems] = useState<Venta[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  
  const [q, setQ] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroMetodo, setFiltroMetodo] = useState('');
  const [filtroEntrega, setFiltroEntrega] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [estadoAbiertoId, setEstadoAbiertoId] = useState<number | null>(null);
  const [estadoDropdownPos, setEstadoDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const estadoDropdownRefs = useRef(new Map<number, HTMLDivElement>());
  const estadoOptionsRefs = useRef(new Map<number, HTMLDivElement>());

  const [pagina, setPagina] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [tipoEntrega, setTipoEntrega] = useState(esMesero ? 'Consumir' : 'Domicilio');
  const [clienteNombre, setClienteNombre] = useState('');
  const [mesa, setMesa] = useState('');
  const [notas, setNotas] = useState('');
  const [intentado, setIntentado] = useState(false);
  const [productoId, setProductoId] = useState<number>(0);
  const [cantidad, setCantidad] = useState('1');
  const [carrito, setCarrito] = useState<{ producto_id: number; cantidad: number }[]>([]);
  const [promocionId, setPromocionId] = useState<number>(0);
  const [cantidadCombo, setCantidadCombo] = useState('1');
  const [combos, setCombos] = useState<{ promocion_id: number; cantidad: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [historialId, setHistorialId] = useState<number | null>(null);
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [cierreAbierto, setCierreAbierto] = useState(false);
  const [cierreDesde, setCierreDesde] = useState('');
  const [cierreHasta, setCierreHasta] = useState('');
  const [comprobanteARechazar, setComprobanteARechazar] = useState<Venta | null>(null);
  const [comprobanteASubir, setComprobanteASubir] = useState<Venta | null>(null);
  const [procesandoComprobante, setProcesandoComprobante] = useState(false);
  const [, setVersion] = useState(0);

const load = async (silencioso = false) => {
  if (!silencioso) setLoading(true);

  // Se piden a la vez, pero el loader solo espera las ventas
  const extras = Promise.all([apiClient.get('/productos'), apiClient.get('/promociones')])
    .then(([r2, r3]) => {
      setProductos(toArray<Producto>(r2.data));
      setPromociones(toArray<Promocion>(r3.data));
    })
    .catch(() => {
      setProductos([]);
      setPromociones([]);
    });

  try {
    const r1 = await apiClient.get('/ventas');
    setItems(toArray<Venta>(r1.data));
  } catch {
    setItems([]);
  } finally {
    setLoading(false);
  }

  await extras;
};

  useEffect(() => { load(); }, []);

  const nombreCliente = (v: Venta) =>
    v?.cliente_nombre || (v?.usuario ? `${v.usuario.nombre} ${v.usuario.apellido}`.trim() : '');

  const textoBusqueda = normalizar(q).trim();

  const filtered = (items ?? []).filter((v) => {
    if (textoBusqueda) {
      const haystack = normalizar(
        [
          v?.id,
          nombreCliente(v),
          ...(v?.detalles ?? []).map((d) => d?.producto?.nombre),
          ...(v?.promociones ?? []).map((p) => p?.nombre),
        ].join(' ')
      );
      if (!haystack.includes(textoBusqueda)) return false;
    }

    if (filtroEstado && v?.estado !== filtroEstado) return false;
    if (filtroMetodo && v?.metodo_pago !== filtroMetodo) return false;
    if (filtroEntrega && v?.tipo_entrega !== filtroEntrega) return false;

    const fechaVenta = fechaLocal(v?.fecha);
    if (fechaDesde && fechaVenta < fechaDesde) return false;
    if (fechaHasta && fechaVenta > fechaHasta) return false;

    return true;
  });

  const hayFiltros = Boolean(
    q || filtroEstado || filtroMetodo || filtroEntrega || fechaDesde || fechaHasta
  );

  const limpiarFiltros = () => {
    setQ('');
    setFiltroEstado('');
    setFiltroMetodo('');
    setFiltroEntrega('');
    setFechaDesde('');
    setFechaHasta('');
    setPagina(1);
  };

  const totalFiltrado = filtered.reduce((a, v) => a + (Number(v?.valor_total) || 0), 0);

  const { visibles, paginaActual } = paginar(filtered, pagina);

  const sinNada = carrito.length === 0 && combos.length === 0;
  const rojoProducto: CSSProperties | undefined =
    intentado && sinNada
      ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 3px rgba(192, 57, 43, 0.12)' }
      : undefined;

  const save = () => {
    setIntentado(true);
    if (sinNada) return;
    if (tipoEntrega === 'Consumir' && !mesa) return;
    const body = {
      carrito,
      combos: combos.length ? combos : undefined,
      metodo_pago: metodoPago,
      tipo_entrega: tipoEntrega,
      cliente_nombre: clienteNombre.trim() || undefined,
      mesa: tipoEntrega === 'Consumir' ? Number(mesa) : undefined,
      notas: notas.trim() || undefined,
    };
    apiClient.post('/ventas', body).then(() => {
      cerrarFormulario();
      load(true);
    }).catch((e) => {
      const d = (e as any)?.response?.data;
      const msg = d?.error || d?.message || (Object.values(d?.errors ?? {}) as string[][])[0]?.[0];
      alertar(msg || 'No se pudo registrar la venta. Revisa los datos.');
    });
  };

  const cerrarFormulario = () => {
    setIntentado(false);
    setShowForm(false);
    setCarrito([]);
    setCombos([]);
    setProductoId(0);
    setCantidad('1');
    setPromocionId(0);
    setCantidadCombo('1');
    setClienteNombre('');
    setMesa('');
    setNotas('');
  };

  const buscarProducto = (id: number) => (productos ?? []).find((p) => p?.id === id);

  const agregarAlCarrito = () => {
    if (!productoId) return;
    const cant = Math.max(1, Math.floor(Number(cantidad) || 1));

    setCarrito((prev) => {
      const existente = prev.findIndex((l) => l.producto_id === productoId);

      if (existente >= 0) {
        const copia = [...prev];
        copia[existente] = { ...copia[existente], cantidad: copia[existente].cantidad + cant };
        return copia;
      }

      return [...prev, { producto_id: productoId, cantidad: cant }];
    });

    setProductoId(0);
    setCantidad('1');
  };

  const quitarDelCarrito = (id: number) =>
    setCarrito((prev) => prev.filter((l) => l.producto_id !== id));

  const buscarPromocion = (id: number) => (promociones ?? []).find((p) => p?.id === id);

  const agregarCombo = () => {
    if (!promocionId) return;
    const cant = Math.max(1, Math.floor(Number(cantidadCombo) || 1));

    setCombos((prev) => {
      const existente = prev.findIndex((c) => c.promocion_id === promocionId);

      if (existente >= 0) {
        const copia = [...prev];
        copia[existente] = { ...copia[existente], cantidad: copia[existente].cantidad + cant };
        return copia;
      }

      return [...prev, { promocion_id: promocionId, cantidad: cant }];
    });

    setPromocionId(0);
    setCantidadCombo('1');
  };

  const quitarCombo = (id: number) =>
    setCombos((prev) => prev.filter((c) => c.promocion_id !== id));

  const totalProductos = carrito.reduce(
    (acumulado, linea) => acumulado + (Number(buscarProducto(linea.producto_id)?.valor) || 0) * linea.cantidad,
    0
  );

  const totalCombos = combos.reduce(
    (acumulado, combo) => acumulado + (Number(buscarPromocion(combo.promocion_id)?.precio) || 0) * combo.cantidad,
    0
  );

  const totalCarrito = totalProductos + totalCombos;

  const htmlFactura = (v: Venta) => {
    const logoUrl = new URL(logoImg, window.location.origin).href;
    const numero = String(v.id).padStart(6, '0');

    const d = new Date(v.fecha);
    const p2 = (n: number) => String(n).padStart(2, '0');
    const fecha = `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;

    const monedaRecibo = (n: number) => {
      const x = Number(n) || 0;
      return '$ ' + x.toLocaleString('es-CO', {
        minimumFractionDigits: Number.isInteger(x) ? 0 : 2,
        maximumFractionDigits: 2,
      });
    };

    // Misma lógica del PDF: ventas de mostrador (rol 1) = "Consumidor final"
    const usu = v.usuario;
    const mostrador = Number(usu?.rol_id ?? 0) === 1;
    const nombre = mostrador
      ? (v.cliente_nombre || 'Consumidor final')
      : (`${usu?.nombre ?? ''} ${usu?.apellido ?? ''}`.trim() || 'Cliente');
    const documento = !mostrador ? (usu?.Ndocumento ?? '') : '';
    const telefono = !mostrador ? (usu?.telefono ?? '') : '';
    const correo = !mostrador ? (usu?.email ?? usu?.correo ?? '') : '';

    const filas = (v.detalles ?? []).map((l) =>
      `<tr><td>${escHtml(l.producto?.nombre ?? 'Producto')}</td><td class="c">${l.cantidad}</td><td class="r">${monedaRecibo(Number(l.precio_unitario))}</td><td class="r">${monedaRecibo(Number(l.subtotal))}</td></tr>`).join('');
    const filasCombos = (v.promociones ?? []).map((pr) =>
      `<tr><td>${escHtml(pr.nombre)}</td><td class="c">1</td><td class="r">—</td><td class="r">—</td></tr>`).join('');

    const nLineas = (v.detalles?.length ?? 0) + (v.promociones?.length ?? 0);
    const extras = [documento, telefono, correo].filter(Boolean).length;
    const alto = 130 + nLineas * 7 + extras * 5; 

    const u = (mm: number) => `calc(var(--u) * ${mm})`;
    const f = (pt: number) => u(+(pt * 0.3528).toFixed(3));
    const px = (n: number) => u(+(n * 0.2646).toFixed(3));

    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Factura ${numero}</title>
<style>
*{box-sizing:border-box}
@page{size:auto;margin:0}
:root{--u:min(1.25vw, calc(100vh / ${alto + 6}))}
html,body{margin:0}
body{width:${u(80)};margin:0 auto;padding:${u(4)} ${u(3)} ${u(5)};font-family:Helvetica,Arial,sans-serif;font-size:${f(8)};color:#000}
.centro{text-align:center}
.logo{width:${u(26)};height:auto;margin-bottom:${u(1.5)}}
.negocio{font-size:${f(13)};font-weight:bold;letter-spacing:${px(1)}}
.eslogan{font-size:${f(7.5)};letter-spacing:${px(2)};text-transform:uppercase;margin-top:${u(1)}}
.dato{font-size:${f(7)};color:#333;margin-top:${u(0.6)}}
.sep{border-top:1px dashed #000;margin:${u(2.5)} 0}
.titulo{font-size:${f(9)};font-weight:bold;letter-spacing:${px(1.5)};text-transform:uppercase}
.num{font-size:${f(8)};margin-top:${u(0.5)}}
.fila{width:100%;border-collapse:collapse}
.fila td{font-size:${f(7.8)};padding:${u(0.6)} 0;vertical-align:top}
.fila td.etq{width:30%;color:#444}
.items{width:100%;border-collapse:collapse;margin-top:${u(1)}}
.items th{font-size:${f(6.6)};text-transform:uppercase;letter-spacing:${px(0.5)};text-align:left;border-bottom:1px solid #000;padding:${u(1)} 0}
.items td{font-size:${f(7.8)};padding:${u(1.2)} 0;vertical-align:top;border-bottom:1px dotted #ccc}
.items .c{text-align:center}
.items .r{text-align:right;white-space:nowrap}
.totales{width:100%;border-collapse:collapse;margin-top:${u(2)}}
.totales td{padding:${u(1)} 0}
.total-etq{font-size:${f(9)};font-weight:bold;text-transform:uppercase;letter-spacing:${px(1)}}
.total-val{font-size:${f(13)};font-weight:bold;text-align:right;white-space:nowrap}
.pie{text-align:center;margin-top:${u(3)};font-size:${f(7)};color:#333}
.gracias{font-size:${f(9)};font-weight:bold;color:#000;margin-bottom:${u(1)}}
</style></head><body>
<div class="centro">
  <img class="logo" src="${logoUrl}" alt="Burguersoft" onerror="this.style.display='none'">
  <div class="negocio">Burguersoft</div>
  <div class="eslogan">El Oriente</div>
  <div class="dato">Calle 9 # 1A-43, Barrio El Oriente</div>
  <div class="dato">Sogamoso, Boyacá</div>
  <div class="dato">Tel. 314 2208706</div>
</div>
<div class="sep"></div>
<div class="centro titulo">Recibo de venta</div>
<div class="centro num">No. ${numero}</div>
<div class="sep"></div>
<table class="fila">
  <tr><td class="etq">Fecha</td><td>${escHtml(fecha)}</td></tr>
  <tr><td class="etq">Cliente</td><td>${escHtml(nombre)}</td></tr>
  ${documento ? `<tr><td class="etq">Documento</td><td>${escHtml(documento)}</td></tr>` : ''}
  ${telefono ? `<tr><td class="etq">Teléfono</td><td>${escHtml(telefono)}</td></tr>` : ''}
  ${correo ? `<tr><td class="etq">Correo</td><td style="word-break:break-all">${escHtml(correo)}</td></tr>` : ''}
  <tr><td class="etq">Entrega</td><td>${escHtml(v.tipo_entrega)}</td></tr>
  <tr><td class="etq">Pago</td><td>${escHtml(v.metodo_pago)}</td></tr>
</table>
<div class="sep"></div>
<table class="items">
  <thead><tr><th>Producto</th><th class="c" style="width:11%">Cant</th><th class="r" style="width:25%">Vr. Unit</th><th class="r" style="width:27%">Subtotal</th></tr></thead>
  <tbody>${filas}${filasCombos}</tbody>
</table>
<table class="totales"><tr><td class="total-etq">Total</td><td class="total-val">${monedaRecibo(Number(v.valor_total))}</td></tr></table>
<div class="sep"></div>
<div class="pie">
  <div class="gracias">¡Gracias por tu compra!</div>
  <div>Burguersoft · El Oriente</div>
  <div>burguersoft@gmail.com</div>
</div>
</body></html>`;
  };

  const updateEstado = (id: number, estado: string) => {
    apiClient.patch(`/ventas/${id}/estado`, { estado })
      .then(() => { setVersion((v) => v + 1); load(); })
      .catch((e: unknown) =>
        alertar(mensajeDeError(e, 'No se pudo cambiar el estado.')),
      );
  };

  const revisarComprobante = async (
    venta: Venta,
    estado: 'Aprobado' | 'Rechazado',
    motivo?: string,
  ) => {
    setProcesandoComprobante(true);
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
      await load();
    } catch (e: unknown) {
      const mensaje =
        (e as { response?: { data?: { message?: string; error?: string } } })?.response?.data
          ?.message ??
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'No se pudo revisar el comprobante de pago.';
      alertar(mensaje);
    } finally {
      setProcesandoComprobante(false);
    }
  };

  const claseComprobante = (estado?: string | null) => {
    const e = (estado ?? '').trim().toLowerCase();
    if (e === 'aprobado') return 'badge-success';
    if (e === 'rechazado') return 'badge-danger';
    if (e === 'pendiente') return 'badge-warning';
    return 'badge-info';
  };

  useEffect(() => {
    if (estadoAbiertoId === null) return;
    const cerrarAlHacerClickFuera = (event: MouseEvent) => {
      const root = estadoDropdownRefs.current.get(estadoAbiertoId);
      const options = estadoOptionsRefs.current.get(estadoAbiertoId);
      if (!root?.contains(event.target as Node) && !options?.contains(event.target as Node)) {
        setEstadoAbiertoId(null);
      }
    };
    const cerrarAlDesplazarse = (event: Event) => {
      const options = estadoOptionsRefs.current.get(estadoAbiertoId);
      // El scroll dentro de la propia lista de estados no debe cerrarla.
      if (options && event.target instanceof Node && options.contains(event.target)) return;
      setEstadoAbiertoId(null);
    };
    document.addEventListener('mousedown', cerrarAlHacerClickFuera);
    window.addEventListener('scroll', cerrarAlDesplazarse, true);
    window.addEventListener('resize', cerrarAlDesplazarse);
    return () => {
      document.removeEventListener('mousedown', cerrarAlHacerClickFuera);
      window.removeEventListener('scroll', cerrarAlDesplazarse, true);
      window.removeEventListener('resize', cerrarAlDesplazarse);
    };
  }, [estadoAbiertoId]);

  useEffect(() => {
    if (estadoAbiertoId === null) return;
    estadoOptionsRefs.current
      .get(estadoAbiertoId)
      ?.querySelector<HTMLButtonElement>('[role="option"][aria-selected="true"], [role="option"]:not(:disabled)')
      ?.focus();
  }, [estadoAbiertoId]);


  const verFactura = async (id: number) => {
    const ventana = window.open('', '_blank');

    try {
      const respuesta = await apiClient.get(`/ventas/${id}/recibo.pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([respuesta.data], { type: 'application/pdf' }));

      if (ventana) {
        ventana.location.href = url;
      } else {
        window.open(url, '_blank');
      }

      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      ventana?.close();
      const venta = (items ?? []).find((x) => x.id === id);
      if (!venta) {
        alertar('No se pudo abrir la factura.');
        return;
      }
      imprimirEnPagina(htmlFactura(venta));
    }
  };

    /* ===== Días, cierre del día e impresión ===== */
  const NO_VENDIDOS = ['Cancelado', 'Reembolsada', 'Rechazada'];
  const esVendida = (v: Venta) => v?.estado === 'Pagado';
  const hoyStr = new Date().toLocaleDateString('en-CA');
  const moneda = (n: number) => `$${Math.round(n || 0).toLocaleString('es-CO')}`;
  const escHtml = (t: unknown) =>
    String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

  const fmtLargo = (clave: string) =>
    new Date(`${clave}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const etiquetaDia = (clave: string) => {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    if (clave === hoyStr) return `Hoy · ${fmtLargo(clave)}`;
    if (clave === ayer.toLocaleDateString('en-CA')) return `Ayer · ${fmtLargo(clave)}`;
    return fmtLargo(clave);
  };

  const resumenDia = (clave: string) => {
    const delDia = filtered.filter((v) => fechaLocal(v?.fecha) === clave);
    const vendidas = delDia.filter(esVendida);
    return {
      ventas: delDia.length,
      total: vendidas.reduce((a, v) => a + (Number(v?.valor_total) || 0), 0),
    };
  };

  const abrirCierre = (desde?: string, hasta?: string) => {
    const d = desde || fechaDesde || hoyStr;
    setCierreDesde(d);
    setCierreHasta(hasta || (desde ? desde : fechaHasta) || d);
    setCierreAbierto(true);
  };

  const calcularCierre = () => {
    const desde = cierreDesde || hoyStr;
    const hasta = cierreHasta || desde;

    const base = (items ?? []).filter((v) => {
      const f = fechaLocal(v?.fecha);
      if (f < desde || f > hasta) return false;
      if (filtroMetodo && v?.metodo_pago !== filtroMetodo) return false;
      if (filtroEntrega && v?.tipo_entrega !== filtroEntrega) return false;
      return true;
    });

    const vendidas = base.filter(esVendida);
    const pendientes = base.filter((v) => !esVendida(v) && !NO_VENDIDOS.includes(v?.estado));
    const anuladas = base.filter((v) => NO_VENDIDOS.includes(v?.estado));

    const prod = new Map<string, { cantidad: number; total: number }>();
    const combos = new Map<string, number>();
    const metodos = new Map<string, { ventas: number; total: number }>();

    vendidas.forEach((v) => {
      (v?.detalles ?? []).forEach((d) => {
        const nombre = d?.producto?.nombre ?? 'Producto';
        const a = prod.get(nombre) ?? { cantidad: 0, total: 0 };
        a.cantidad += Number(d?.cantidad) || 0;
        a.total += Number(d?.subtotal) || (Number(d?.cantidad) || 0) * (Number(d?.precio_unitario) || 0);
        prod.set(nombre, a);
      });
      (v?.promociones ?? []).forEach((p) => {
        combos.set(p?.nombre, (combos.get(p?.nombre) ?? 0) + 1);
      });
      const m = metodos.get(v?.metodo_pago ?? '—') ?? { ventas: 0, total: 0 };
      m.ventas += 1;
      m.total += Number(v?.valor_total) || 0;
      metodos.set(v?.metodo_pago ?? '—', m);
    });

    const productos = [...prod.entries()]
      .map(([nombre, x]) => ({ nombre, ...x }))
      .sort((a, b) => b.cantidad - a.cantidad);

    return {
      desde,
      hasta,
      vendidas: vendidas.length,
      total: vendidas.reduce((a, v) => a + (Number(v?.valor_total) || 0), 0),
      unidades: productos.reduce((a, p) => a + p.cantidad, 0),
      productos,
      combos: [...combos.entries()].map(([nombre, cantidad]) => ({ nombre, cantidad })),
      metodos: [...metodos.entries()].map(([nombre, x]) => ({ nombre, ...x })),
      pendientes: { n: pendientes.length, total: pendientes.reduce((a, v) => a + (Number(v?.valor_total) || 0), 0) },
      anuladas: anuladas.length,
    };
  };

  const imprimirCierre = () => {
    const c = calcularCierre();

    const rango = c.desde === c.hasta ? fmtLargo(c.desde) : `${fmtLargo(c.desde)} al ${fmtLargo(c.hasta)}`;
    const filasProd = c.productos.length
      ? c.productos.map((p) => `<tr><td>${escHtml(p.nombre)}</td><td class="r">${p.cantidad}</td><td class="r">${moneda(p.total)}</td></tr>`).join('')
      : '<tr><td colspan="3" class="vacio">Sin ventas en este periodo</td></tr>';
    const filasCombos = c.combos.map((p) => `<tr><td>${escHtml(p.nombre)}</td><td class="r">${p.cantidad}</td><td class="r">—</td></tr>`).join('');
    const filasMetodos = c.metodos.map((m) => `<tr><td>${escHtml(m.nombre)}</td><td class="r">${m.ventas}</td><td class="r">${moneda(m.total)}</td></tr>`).join('');

    const filtrosTxt = [filtroMetodo, filtroEntrega].filter(Boolean).join(', ');
    const logoUrl = new URL(logoImg, window.location.origin).href;

    imprimirEnPagina(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Cierre del día</title>
<style>
*{box-sizing:border-box}
@page{margin:0}
body{margin:0 auto;padding:16px 14px 20px;max-width:380px;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:#000}
.centro{text-align:center}
.logo{width:90px;height:auto;margin-bottom:6px}
.negocio{font-size:22px;font-weight:bold;letter-spacing:1px}
.eslogan{font-size:12px;letter-spacing:3px;text-transform:uppercase;margin-top:3px}
.dato{font-size:11.5px;color:#333;margin-top:2px}
.sep{border-top:1px dashed #000;margin:14px 0}
.titulo{font-size:16px;font-weight:bold;letter-spacing:2px;text-transform:uppercase}
.rango{font-size:12.5px;margin-top:3px;text-transform:capitalize}
.fila{width:100%;border-collapse:collapse}
.fila td{padding:3px 0;vertical-align:top;font-size:13px}
.fila td.etq{width:34%;color:#444}
.items{width:100%;border-collapse:collapse;margin-top:2px}
.items th{font-size:11px;text-transform:uppercase;letter-spacing:.5px;text-align:left;border-bottom:2px solid #000;padding:5px 0}
.items td{padding:6px 0;vertical-align:top;border-bottom:1px dotted #ccc;font-size:13px}
.items .c{text-align:center}
.items .r{text-align:right;white-space:nowrap}
.items th.c{text-align:center}
.items th.r{text-align:right}
.vacio{text-align:center;color:#777;padding:10px 0}
.sec{font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin:14px 0 2px}
.tot{display:flex;justify-content:space-between;align-items:center;margin-top:6px}
.tot-etq{font-size:15px;font-weight:bold;text-transform:uppercase;letter-spacing:1px}
.tot-val{font-size:22px;font-weight:bold}
.nota{font-size:11.5px;color:#333;margin:5px 0 0}
.pie{text-align:center;font-size:11.5px;color:#333}
.gracias{font-size:14px;font-weight:bold;color:#000;margin-bottom:3px}
@media print{body{padding:4mm 3mm 5mm;max-width:none}}
</style></head><body>
<div class="centro">
  <img class="logo" src="${logoUrl}" alt="Burguersoft" onerror="this.style.display='none'">
  <div class="negocio">Burguersoft</div>
  <div class="eslogan">El Oriente</div>
  <div class="dato">Calle 9 # 1A-43, Barrio El Oriente</div>
  <div class="dato">Sogamoso, Boyacá</div>
  <div class="dato">Tel. 314 2208706</div>
</div>
<div class="sep"></div>
<div class="centro titulo">Cierre del día</div>
<div class="centro rango">${escHtml(rango)}</div>
<div class="sep"></div>
<table class="fila">
  <tr><td class="etq">Impreso</td><td>${escHtml(new Date().toLocaleString('es-CO'))}</td></tr>
  <tr><td class="etq">Ventas</td><td>${c.vendidas} pagadas</td></tr>
  <tr><td class="etq">Productos</td><td>${c.unidades} unidades</td></tr>
  ${filtrosTxt ? `<tr><td class="etq">Filtros</td><td>${escHtml(filtrosTxt)}</td></tr>` : ''}
</table>
<div class="sep"></div>
<table class="items">
  <thead><tr><th>Producto</th><th class="c" style="width:14%">Cant</th><th class="r" style="width:32%">Subtotal</th></tr></thead>
  <tbody>${filasProd}${filasCombos}</tbody>
</table>
<div class="sep"></div>
<div class="sec" style="margin-top:0">Por método de pago</div>
<table class="items">
  <thead><tr><th>Método</th><th class="c" style="width:14%">Ventas</th><th class="r" style="width:32%">Total</th></tr></thead>
  <tbody>${filasMetodos || '<tr><td colspan="3" class="vacio">—</td></tr>'}</tbody>
</table>
<div class="sep"></div>
<div class="tot"><span class="tot-etq">Total del día</span><span class="tot-val">${moneda(c.total)}</span></div>
${c.pendientes.n ? `<p class="nota">Pendientes de cobro: ${c.pendientes.n} (${moneda(c.pendientes.total)}), no incluidos en el total.</p>` : ''}
${c.anuladas ? `<p class="nota">Canceladas / rechazadas: ${c.anuladas}</p>` : ''}
<div class="sep"></div>
<div class="pie">
  <div class="gracias">Burguersoft · Cierre de caja</div>
  <div>burguersoft@gmail.com</div>
</div>
</body></html>`);
  };

  const cierre = cierreAbierto ? calcularCierre() : null;

  const detalle = detalleId !== null ? items.find((x) => x.id === detalleId) ?? null : null;

  useEscape([
    [detalle !== null, () => setDetalleId(null)],
    [showForm, cerrarFormulario],
  ]);

  if (loading) {
    return <AdminLoading texto="Cargando ventas" subtexto="Preparando tus pedidos y movimientos" />;
  }

  return (
    <div className="page-inner ventas-page">
      <div className="page-header">
        <div>
          <h1>{esAdmin ? 'Gestión de Ventas' : 'Caja'}</h1>
          <p className="subtitulo">{new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <button type="button" className="btn-save" onClick={() => abrirCierre()}>
          Cierre del día
        </button>
      </div>
      

      {cierre && (
        <div className="modal-overlay open">
          <div className="modal-box cierre-box" style={{ maxWidth: 680, width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-x" onClick={() => setCierreAbierto(false)} aria-label="Cerrar">×</button>
            <h2>Cierre del día</h2>

            <div className="cierre-filtros">
              <div className="form-group" style={{ margin: 0 }}>
                <label>Desde</label>
                <input type="date" value={cierre.desde} max={cierre.hasta} onChange={(e) => setCierreDesde(e.target.value)} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Hasta</label>
                <input type="date" value={cierre.hasta} min={cierre.desde} onChange={(e) => setCierreHasta(e.target.value)} />
              </div>
              <p className="cierre-nota">
                Solo cuenta ventas <b>Pagadas</b>
                {(filtroMetodo || filtroEntrega) && ` · Filtros: ${[filtroMetodo, filtroEntrega].filter(Boolean).join(', ')}`}
              </p>
            </div>

            <div className="cierre-resumen">
              <div><small>Total del día</small><strong>{moneda(cierre.total)}</strong></div>
              <div><small>Ventas</small><strong>{cierre.vendidas}</strong></div>
              <div><small>Productos</small><strong>{cierre.unidades}</strong></div>
            </div>

            <h4 className="cierre-sub">Productos vendidos</h4>
            <div className="cierre-scroll">
              <table className="cierre-tabla">
                <thead><tr><th>Producto</th><th className="r">Cant.</th><th className="r">Subtotal</th></tr></thead>
                <tbody>
                  {cierre.productos.map((p) => (
                    <tr key={p.nombre}><td>{p.nombre}</td><td className="r">{p.cantidad}</td><td className="r">{moneda(p.total)}</td></tr>
                  ))}
                  {cierre.combos.map((p) => (
                    <tr key={`c-${p.nombre}`}><td>{p.nombre} <small>(combo)</small></td><td className="r">{p.cantidad}</td><td className="r">—</td></tr>
                  ))}
                  {cierre.productos.length === 0 && cierre.combos.length === 0 && (
                    <tr><td colSpan={3} className="c">No hay ventas pagadas en este periodo</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <h4 className="cierre-sub">Por método de pago</h4>
            <div className="cierre-metodos">
              {cierre.metodos.map((m) => (
                <span key={m.nombre}><b>{m.nombre}</b> {moneda(m.total)} <small>({m.ventas})</small></span>
              ))}
              {cierre.metodos.length === 0 && <span>—</span>}
            </div>

            {cierre.pendientes.n > 0 && (
              <p className="cierre-nota">Pendientes de cobro: {cierre.pendientes.n} ({moneda(cierre.pendientes.total)}), no incluidos en el total.</p>
            )}

            <ArqueoCaja />

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button type="button" className="btn-cancel" onClick={() => setCierreAbierto(false)}>Cerrar</button>
              <button type="button" className="btn-save" onClick={imprimirCierre}>Imprimir</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay open" onClick={cerrarFormulario}>
        <div className="modal-box" style={{ maxWidth: 780, width: '95%', padding: 0 }} onClick={(e) => e.stopPropagation()}>
          <div style={{ background: 'var(--text-900)', padding: '18px 28px' }}>
            <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--surface)' }}>Registrar Venta</h3>
            <button type="button" className="mn-form-cerrar" onClick={cerrarFormulario} aria-label="Cerrar">×</button>
          </div>
          <div style={{ padding: 28 }}>
          <div className="grid-registro">
            <div className="form-group">
              <label>Producto</label>
              <SelectOscuro value={productoId} style={rojoProducto} onChange={(e) => setProductoId(Number(e.target.value))}>
                <option value={0}>Seleccionar...</option>
                {(productos ?? []).map((p) => <option key={p?.id ?? p?.nombre} value={p?.id}>{p?.nombre ?? 'Sin nombre'} — ${Number(p?.valor || 0).toLocaleString('es-CO')}</option>)}
              </SelectOscuro>
            </div>
            <div className="form-group">
              <label>Cantidad</label>
              <input
                type="number"
                min={1}
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') agregarAlCarrito(); }}
              />
            </div>
          </div>

          <button
            type="button"
            className="btn-cancel"
            onClick={agregarAlCarrito}
            disabled={!productoId}
            style={{ marginTop: 4, padding: '8px 18px', fontSize: 13, opacity: productoId ? 1 : 0.5, cursor: productoId ? 'pointer' : 'not-allowed' }}
          >
            Agregar producto
          </button>

          <div className="grid-registro" style={{ marginTop: 18 }}>
            <div className="form-group">
              <label>Combo (opcional)</label>
              <SelectOscuro value={promocionId} onChange={(e) => setPromocionId(Number(e.target.value))}>
                <option value={0}>Seleccionar combo...</option>
                {(promociones ?? [])
                  .filter((p) => p?.estado === 'Activa')
                  .map((p) => (
                    <option key={p?.id} value={p?.id}>
                      {p?.nombre ?? 'Combo'} — ${Number(p?.precio || 0).toLocaleString('es-CO')}
                    </option>
                  ))}
              </SelectOscuro>
            </div>
            <div className="form-group">
              <label>Cantidad de combos</label>
              <input
                type="number"
                min={1}
                value={cantidadCombo}
                onChange={(e) => setCantidadCombo(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') agregarCombo(); }}
              />
            </div>
          </div>

          <button
            type="button"
            className="btn-cancel"
            onClick={agregarCombo}
            disabled={!promocionId}
            style={{ marginTop: 4, padding: '8px 18px', fontSize: 13, opacity: promocionId ? 1 : 0.5, cursor: promocionId ? 'pointer' : 'not-allowed' }}
          >
            Agregar combo
          </button>

          <div style={{ marginTop: 18 }}>
            {carrito.length === 0 && combos.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-400)', margin: 0 }}>Aún no has agregado productos ni combos.</p>
            ) : (
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                {carrito.map((linea) => {
                  const prod = buscarProducto(linea.producto_id);
                  return (
                    <div
                      key={linea.producto_id}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px', borderBottom: '1px solid var(--border)', fontSize: 13 }}
                    >
                      <span style={{ flex: 1, fontWeight: 600, color: 'var(--text-900)' }}>{prod?.nombre ?? 'Producto'}</span>
                      <span style={{ color: 'var(--text-600)' }}>x{linea.cantidad}</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-900)', minWidth: 80, textAlign: 'right' }}>
                        ${((Number(prod?.valor) || 0) * linea.cantidad).toLocaleString('es-CO')}
                      </span>
                      <button
                        type="button"
                        onClick={() => quitarDelCarrito(linea.producto_id)}
                        title="Quitar producto"
                        style={{ border: 'none', background: 'transparent', color: '#c0392b', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
                {combos.map((combo) => {
                  const promo = buscarPromocion(combo.promocion_id);
                  return (
                    <div
                      key={`combo-${combo.promocion_id}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px', borderBottom: '1px solid var(--border)', fontSize: 13, background: 'rgba(232, 98, 44, 0.04)' }}
                    >
                      <span style={{ flex: 1, fontWeight: 600, color: 'var(--text-900)' }}>
                        {promo?.nombre ?? 'Combo'}{' '}
                        <span className="badge badge-info" style={{ fontSize: 10 }}>Combo</span>
                      </span>
                      <span style={{ color: 'var(--text-600)' }}>x{combo.cantidad}</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-900)', minWidth: 80, textAlign: 'right' }}>
                        ${((Number(promo?.precio) || 0) * combo.cantidad).toLocaleString('es-CO')}
                      </span>
                      <button
                        type="button"
                        onClick={() => quitarCombo(combo.promocion_id)}
                        title="Quitar combo"
                        style={{ border: 'none', background: 'transparent', color: '#c0392b', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid-registro" style={{ marginTop: 8 }}>
            <div className="form-group">
              <label>Método de pago</label>
              <SelectOscuro value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
              </SelectOscuro>
            </div>
            <div className="form-group">
              <label>Tipo de entrega</label>
              <SelectOscuro value={tipoEntrega} onChange={(e) => setTipoEntrega(e.target.value)}>
                {TIPOS_ENTREGA.map((t) => <option key={t} value={t}>{t}</option>)}
              </SelectOscuro>
            </div>
            <div className="form-group">
              <label>Cliente (opcional)</label>
              <input
                type="text"
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                placeholder="Nombre del cliente o dejar vacío"
                maxLength={150}
              />
            </div>
            {tipoEntrega === 'Consumir' && (
              <div className="form-group">
                <label>Mesa *</label>
                <SelectOscuro
                  value={mesa}
                  onChange={(e) => setMesa(e.target.value)}
                  style={intentado && !mesa ? { borderColor: 'var(--danger)' } : undefined}
                >
                  <option value="">Elige la mesa</option>
                  {[1, 2, 3, 4].map((n) => <option key={n} value={n}>Mesa {n}</option>)}
                </SelectOscuro>
              </div>
            )}
            <div className="form-group">
              <label>Notas para cocina (opcional)</label>
              <input
                type="text"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej: sin tomate, extra bacon"
                maxLength={255}
              />
            </div>
          </div>

          {carrito.length > 0 || combos.length > 0 ? (
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-900)', marginBottom: 2 }}>
              Total: ${totalCarrito.toLocaleString('es-CO')}
            </p>
          ) : null}
          <div className="modal-actions" style={{ marginTop: 8 }}>
            <button className="btn-cancel" onClick={cerrarFormulario}>Cancelar</button>
            <button className="btn-save" onClick={save}>Registrar</button>
          </div>
          </div>
        </div>
        </div>
      )}

      <div className="search-bar" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        
        {/* Fila 1: Búsqueda */}
        <div className="mn-search-wrap" style={{ marginBottom: 0 }}>
          <svg className="mn-search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="mn-search"
            placeholder="Buscar por #, cliente, producto o combo..."
            value={q}
            onChange={(e) => { setQ(e.target.value); setPagina(1); }}
            style={{ paddingLeft: 42 }} // <-- Esto arregla la superposición con el icono
          />
        </div>

        {/* Fila 2: Filtros (Carlos) */}
        <div className="ventas-filtros" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
          <div className="form-group ventas-filter-state" style={{ margin: 0 }}>
            <label>Estado</label>
            <FiltroDesplegableVentas
              value={filtroEstado}
              onChange={(value) => { setFiltroEstado(value); setPagina(1); }}
              opciones={[{ value: '', label: 'Todos' }, ...ESTADOS.map((estado) => ({ value: estado, label: estado }))]}
            />
          </div>

          <div className="form-group ventas-filter-method" style={{ margin: 0 }}>
            <label>Método de pago</label>
            <FiltroDesplegableVentas
              value={filtroMetodo}
              onChange={(value) => { setFiltroMetodo(value); setPagina(1); }}
              opciones={[{ value: '', label: 'Todos' }, ...METODOS.map((metodo) => ({ value: metodo, label: metodo }))]}
            />
          </div>

          <div className="form-group ventas-filter-delivery" style={{ margin: 0 }}>
            <label>Entrega</label>
            <FiltroDesplegableVentas
              value={filtroEntrega}
              onChange={(value) => { setFiltroEntrega(value); setPagina(1); }}
              opciones={[{ value: '', label: 'Todas' }, ...TIPOS_ENTREGA.map((entrega) => ({ value: entrega, label: entrega }))]}
            />
          </div>

          <div className="form-group ventas-filter-date" style={{ margin: 0 }}>
            <label>Desde</label>
            <SelectorFechaVentas
              value={fechaDesde}
              max={fechaHasta || undefined}
              onChange={(fecha) => { setFechaDesde(fecha); setPagina(1); }}
            />
          </div>

          <div className="form-group ventas-filter-date" style={{ margin: 0 }}>
            <label>Hasta</label>
            <SelectorFechaVentas
              value={fechaHasta}
              min={fechaDesde || undefined}
              onChange={(fecha) => { setFechaHasta(fecha); setPagina(1); }}
            />
          </div>

          {hayFiltros && (
            <button type="button" className="btn-cancel ventas-clear-filters-btn" onClick={limpiarFiltros}>
              Limpiar filtros
            </button>
          )}
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-600)', margin: 0 }}>
          {filtered.length} de {items.length} ventas
          {hayFiltros && ` · Total filtrado: $${Math.round(totalFiltrado).toLocaleString('es-CO')}`}
        </p>
      </div>

      <div className="tabla-responsive ventas-table-wrap">
        <table className="data-table ventas-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Productos</th>
              <th>Total</th>
              <th>Método</th>
              <th>Estado</th>
              <th>Historial</th>
              <th>Factura</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((v, i) => {
              const clave = fechaLocal(v?.fecha);
              const nuevoDia = i === 0 || clave !== fechaLocal(visibles[i - 1]?.fecha);
              const r = nuevoDia ? resumenDia(clave) : null;
              return (
              <Fragment key={v?.id}>
              {r && (
                <tr className="vt-dia">
                  <td colSpan={9}>
                    <div className="vt-dia-bar">
                      <span className="vt-dia-label">{etiquetaDia(clave)}</span>
                      <span className="vt-dia-info">{r.ventas} ventas · Vendido: <b>{moneda(r.total)}</b></span>
                      <button type="button" className="btn-save vt-dia-btn" onClick={() => abrirCierre(clave, clave)}>
                        Cierre del día
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              <tr>
                <td className="vt-num">#{v?.id}</td>
                <td className="vt-fecha">
                  <span>{fmtDia(v?.fecha)}</span>
                  <small>{fmtHora(v?.fecha)}</small>
                </td>
                <td className="vt-cliente">
                  <strong>{nombreCliente(v) || '—'}</strong>
                  <small>
                    {v?.tipo_entrega === 'Consumir' && v?.mesa ? `Mesa ${v.mesa}` : v?.tipo_entrega ?? ''}
                  </small>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn-cancel"
                    style={{ padding: '5px 10px', fontSize: 12, whiteSpace: 'nowrap' }}
                    onClick={() => setDetalleId(v.id)}
                  >
                    Ver detalle
                  </button>
                  {v?.tiene_comprobante && (
                    <span
                      className={`badge ${claseComprobante(v.comprobante_estado)}`}
                      style={{ display: 'block', marginTop: 6, fontSize: 10, textAlign: 'center' }}
                    >
                      {v.comprobante_estado === 'Aprobado'
                        ? 'Pago aprobado'
                        : v.comprobante_estado === 'Rechazado'
                          ? 'Comprobante devuelto'
                          : 'Comprobante pendiente'}
                    </span>
                  )}
                </td>
                <td className="vt-total">${Number(v?.valor_total || 0).toLocaleString('es-CO')}</td>

                <td><span className="badge badge-info venta-metodo-badge">{v?.metodo_pago ?? ''}</span></td>
                <td className="vt-estado-celda">
                  <div
                    className="venta-estado-dropdown"
                    ref={(element) => {
                      if (element) estadoDropdownRefs.current.set(v.id, element);
                      else estadoDropdownRefs.current.delete(v.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        setEstadoAbiertoId(null);
                        estadoDropdownRefs.current.get(v.id)
                          ?.querySelector<HTMLButtonElement>('.venta-estado-trigger')
                          ?.focus();
                        return;
                      }
                      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
                      event.preventDefault();
                      if (estadoAbiertoId !== v.id) {
                        const rect = event.currentTarget.getBoundingClientRect();
                        const menuHeight = ESTADOS.length * 38;
                        const width = Math.max(rect.width, 180);
                        const top = rect.bottom + menuHeight + 4 <= window.innerHeight
                          ? rect.bottom + 4
                          : Math.max(8, rect.top - menuHeight - 4);
                        setEstadoDropdownPos({
                          top,
                          left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
                          width,
                        });
                        setEstadoAbiertoId(v.id);
                        return;
                      }
                      const options = Array.from(
                        estadoOptionsRefs.current.get(v.id)?.querySelectorAll<HTMLButtonElement>('[role="option"]:not(:disabled)') ?? [],
                      );
                      const currentIndex = options.indexOf(document.activeElement as HTMLButtonElement);
                      const increment = event.key === 'ArrowDown' ? 1 : -1;
                      options[(currentIndex + increment + options.length) % options.length]?.focus();
                    }}
                  >
                    <button
                      type="button"
                      className="venta-estado-trigger"
                      aria-haspopup="listbox"
                      aria-expanded={estadoAbiertoId === v.id}
                      onClick={(event) => {
                        if (estadoAbiertoId === v.id) {
                          setEstadoAbiertoId(null);
                          return;
                        }
                        const rect = event.currentTarget.getBoundingClientRect();
                        const menuHeight = ESTADOS.length * 38;
                        const width = Math.max(rect.width, 180);
                        const top = rect.bottom + menuHeight + 4 <= window.innerHeight
                          ? rect.bottom + 4
                          : Math.max(8, rect.top - menuHeight - 4);
                        setEstadoDropdownPos({
                          top,
                          left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
                          width,
                        });
                        setEstadoAbiertoId(v.id);
                      }}
                    >
                      {v?.estado ?? ''}
                      <span aria-hidden="true">▾</span>
                    </button>
                    {estadoAbiertoId === v.id && estadoDropdownPos && createPortal(
                      <div
                        className="venta-estado-options"
                        ref={(element) => {
                          if (element) estadoOptionsRefs.current.set(v.id, element);
                          else estadoOptionsRefs.current.delete(v.id);
                        }}
                        role="listbox"
                        aria-label={`Estado de la venta ${v.id}`}
                        style={{
                          position: 'fixed',
                          top: estadoDropdownPos.top,
                          left: estadoDropdownPos.left,
                          width: estadoDropdownPos.width,
                        }}
                      >
                        {ESTADOS.map((estado) => {
                          const seleccionado = estado === v?.estado;
                          const deshabilitado = (!esAdmin && estado === 'Reembolsada') || (esMesero && !ESTADOS_MESERO.includes(estado));
                          return (
                            <button
                              key={estado}
                              type="button"
                              role="option"
                              aria-selected={seleccionado}
                              className={`venta-estado-option${seleccionado ? ' selected' : ''}`}
                              disabled={deshabilitado}
                              onClick={() => {
                                updateEstado(v.id, estado);
                                setEstadoAbiertoId(null);
                              }}
                            >
                              {estado}
                            </button>
                          );
                        })}
                      </div>,
                      document.body,
                    )}
                  </div>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn-cancel"
                    style={{ padding: '5px 10px', fontSize: 12, whiteSpace: 'nowrap' }}
                    onClick={() => setHistorialId(v.id)}
                  >
                    Ver historial
                  </button>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn-save"
                    style={{ padding: '5px 10px', fontSize: 12, whiteSpace: 'nowrap' }}
                    onClick={() => verFactura(v.id)}
                  >
                    Ver factura
                  </button>
                </td>
              </tr>
              </Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>No se encontraron ventas</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Paginacion total={filtered.length} pagina={paginaActual} onCambiar={setPagina} />

      {historialId !== null && (
        <TrazabilidadModal ventaId={historialId} onClose={() => setHistorialId(null)} />
      )}

      {detalle && (
        <div className="modal-overlay open" onClick={() => setDetalleId(null)}>
          <div className="modal-box vt-det" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="modal-x" onClick={() => setDetalleId(null)} aria-label="Cerrar">×</button>   {/* ➕ */}
          <div className="vt-det-head">
              <div>
                <h3>Venta #{detalle.id}</h3>
                <p>{fmtDia(detalle.fecha)} · {fmtHora(detalle.fecha)}</p>
              </div>
              <span className="vt-estado" data-estado={detalle.estado}>{detalle.estado}</span>
            </div>

            <section className="vt-det-sec">
              <h4>Cliente</h4>
              <dl className="vt-det-grid">
                <div><dt>Nombre</dt><dd>{nombreCliente(detalle) || '—'}</dd></div>
                <div><dt>Correo</dt><dd>{detalle.usuario?.correo || detalle.usuario?.email || '—'}</dd></div>
                <div><dt>Teléfono</dt><dd>{detalle.usuario?.telefono || detalle.usuario?.phone || '—'}</dd></div>
                <div>
                  <dt>Documento</dt>
                  <dd>
                    {detalle.usuario?.Ndocumento
                      ? `${detalle.usuario?.Tdocumento ? detalle.usuario.Tdocumento + ' ' : ''}${detalle.usuario.Ndocumento}`
                      : '—'}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="vt-det-sec">
              <h4>Pedido</h4>
              <dl className="vt-det-grid">
                <div><dt>Entrega</dt><dd>{detalle.tipo_entrega || '—'}</dd></div>
                {detalle.tipo_entrega === 'Consumir' && detalle.mesa ? (
                  <div><dt>Mesa</dt><dd>{detalle.mesa}</dd></div>
                ) : null}
                <div><dt>Método de pago</dt><dd>{detalle.metodo_pago || '—'}</dd></div>
                {detalle.notas ? (
                  <div className="vt-det-full"><dt>Notas</dt><dd>{detalle.notas}</dd></div>
                ) : null}
              </dl>
            </section>

            <section className="vt-det-sec">
              <h4>Comprobante de pago</h4>

              {!detalle.tiene_comprobante ? (
                <>
                  <p className="vt-comprobante-vacio">
                    Este pedido no tiene comprobante de pago cargado.
                  </p>
                  {puedeSubirComprobante(detalle) && (
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
                        Subido: {fmtDia(detalle.comprobante_subido_en)} {fmtHora(detalle.comprobante_subido_en)}
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
                      <dt>Total del pedido</dt>
                      <dd>${Number(detalle.valor_total || 0).toLocaleString('es-CO')}</dd>
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
                    <div>
                      <dt>Estado en el comprobante</dt>
                      <dd>{detalle.comprobante_datos?.estado_transaccion || 'No identificado'}</dd>
                    </div>
                    {detalle.comprobante_datos?.observaciones && (
                      <div className="vt-det-full">
                        <dt>Observaciones de la IA</dt>
                        <dd>{detalle.comprobante_datos.observaciones}</dd>
                      </div>
                    )}
                  </dl>

                  <ComprobanteImagen
                    ventaId={detalle.id}
                    version={detalle.comprobante_subido_en}
                    alt={`Comprobante de pago del pedido ${detalle.id}`}
                  />

                  <div className="vt-comprobante-acciones">
                    {esAdmin && detalle.comprobante_estado !== 'Aprobado' && (
                      <button
                        type="button"
                        className="btn-save"
                        disabled={procesandoComprobante}
                        onClick={() => void revisarComprobante(detalle, 'Aprobado')}
                      >
                        {procesandoComprobante ? 'Guardando…' : 'Aprobar pago'}
                      </button>
                    )}
                    {esAdmin && detalle.comprobante_estado !== 'Rechazado' && (
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
                    {esAdmin && (
                      <button
                        type="button"
                        className="btn-cancel"
                        onClick={() => setComprobanteASubir(detalle)}
                      >
                        Reemplazar comprobante
                      </button>
                    )}
                  </div>

                  {!esAdmin && puedeSubirComprobante(detalle) && (
                    <div className="vt-comprobante-acciones">
                      <button
                        type="button"
                        className="btn-cancel"
                        onClick={() => setComprobanteASubir(detalle)}
                      >
                        Reemplazar comprobante
                      </button>
                    </div>
                  )}
                </>
              )}

              {requiereComprobante(detalle) && detalle.comprobante_estado !== 'Aprobado' && (
                <p className="vt-comprobante-aviso">
                  Pago electrónico: para confirmar el pago primero debe estar aprobado el comprobante.
                </p>
              )}
            </section>

            <section className="vt-det-sec">
              <h4>Productos</h4>
              <div className="vt-det-lineas">
                {(detalle.detalles ?? []).map((d, i) => (
                  <div className="vt-det-linea" key={`d${i}`}>
                    <span><b>{d?.cantidad ?? 0}×</b> {d?.producto?.nombre ?? 'Producto'}</span>
                    <span className="vt-det-pu">${Number(d?.precio_unitario || 0).toLocaleString('es-CO')} c/u</span>
                    <strong>${Number(d?.subtotal || 0).toLocaleString('es-CO')}</strong>
                  </div>
                ))}
                {(detalle.promociones ?? []).map((p, i) => (
                  <div className="vt-det-linea" key={`p${i}`}>
                    <span>{p?.nombre} <span className="badge badge-info">Combo</span></span>
                  </div>
                ))}
              </div>
            </section>

            <div className="vt-det-total">
              <span>Total</span>
              <strong>${Number(detalle.valor_total || 0).toLocaleString('es-CO')}</strong>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setDetalleId(null)}>Cerrar</button>
            </div>
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
            setVersion((v) => v + 1);
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
          peligro
          onClose={() => setComprobanteARechazar(null)}
          onConfirm={(motivo) =>
            void revisarComprobante(comprobanteARechazar, 'Rechazado', motivo)
          }
        />
      )}
    </div>
  );
}