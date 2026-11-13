import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/client';
import '../styles/public.css';
import '../styles/checkout.css';
import { QR_RUTAS, CUENTA_QR, NOMBRE_QR } from '../utils/pagoQr';
import PublicHeader from '../components/PublicHeader';
import { useToast } from '../components/Toast';
import { mensajeError } from '../utils/errores';
import Footer from '../components/Footer';
import logoNequi from '../assets/img/nequi.png';
import logoDaviplata from '../assets/img/daviplata.png';
import logoBancolombia from '../assets/img/bancolombia.svg';
import logoEfectivo from '../assets/img/efectivo.svg';
import logoUbicacion from '../assets/img/Ubicacion.png';
import { useTasaImpuesto } from '../hooks/useTasaImpuesto';
import { nuevaClaveIdempotencia } from '../utils/idempotencia';
import { esPagoElectronico } from '../utils/pagos';
import { comprimirImagen } from '../utils/comprimirImagen';
import AdminLoading from '../components/AdminLoading';

const TIPOS_DOCUMENTO = ['CC', 'CE', 'NIT', 'Pasaporte', 'Otro'];

function IconoNequi() {
  return <img src={logoNequi} alt="Nequi" className="pago-logo-img" />;
}

function IconoDaviplata() {
  return <img src={logoDaviplata} alt="Daviplata" className="pago-logo-img" />;
}

function IconoBancolombia() {
  return <img src={logoBancolombia} alt="Bancolombia" className="pago-logo-img" />;
}

function IconoEfectivo() {
  return <img src={logoEfectivo} alt="Efectivo" className="pago-logo-img" />;
}

type Direccion = {
  linea1: string;
  barrio: string;
  referencia: string;
  lat: number | null;
  lng: number | null;
};

const direccionVacia: Direccion = { linea1: '', barrio: '', referencia: '', lat: null, lng: null };

const ARCGIS_REVERSE = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode';
const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';
const GOOGLE_REVERSE = 'https://maps.googleapis.com/maps/api/geocode/json';

const ABREVIATURAS_VIA: Array<[RegExp, string]> = [
  [/^(cl|cll|calle)\.?\s+/i, 'Calle '],
  [/^(cra|crr|carrera)\.?\s+/i, 'Carrera '],
  [/^(av|ave|avenida)\.?\s+/i, 'Avenida '],
  [/^(diag|diagonal)\.?\s+/i, 'Diagonal '],
  [/^(circ|circular)\.?\s+/i, 'Circular '],
  [/^(manz|manzana)\.?\s+/i, 'Manzana '],
  [/^(via)\.?\s+/i, 'Vía '],
];

type GeoResultado = { linea1: string; barrio: string };

const TIPO_VIA =
  '(?:Calle|Carrera|Cra|Cl|Avenida|Av|Diagonal|Diag|Circular|Circ|V[ií]a|Carril|Carretera|Transversal|Manzana|Manz)';

function normalizarVia(via: string): string {
  const v = via.trim().replace(/\s+/g, ' ');
  for (const [re, prefijo] of ABREVIATURAS_VIA) {
    if (re.test(v)) return (prefijo + v.replace(re, '')).trim();
  }
  return v;
}

function formatearDireccionColombia(address: string, addNum: string): string {
  const limpio = address.trim().replace(/\s+/g, ' ');
  if (!limpio) return '';

  if (limpio.includes('#')) {
    const [via, ...resto] = limpio.split('#');
    const casa = resto.join('#').trim();
    const v = via.trim();
    return casa ? `${v} # ${casa}` : v;
  }

  const tokens: string[] = [];
  for (const t of limpio.split(' ')) {
    const prev = tokens[tokens.length - 1];
    if (prev && /^\d+$/.test(prev) && /^[A-Za-z]$/.test(t)) tokens[tokens.length - 1] = prev + t;
    else tokens.push(t);
  }

  const ultimo = tokens[tokens.length - 1];
  let casa = '';
  if (/^\d/.test(ultimo)) {
    casa = ultimo;
    tokens.pop();
  } else if (/^\d/.test(addNum)) {
    casa = addNum;
  }

  const resto = tokens.join(' ');

  if (casa && !/\d/.test(resto) && new RegExp(`${TIPO_VIA}$`, 'i').test(resto)) {
    return `${resto} ${casa}`;
  }

  const m = resto.match(new RegExp(`^(.*\\b${TIPO_VIA}\\s+\\d+[A-Za-z]?)\\s+(\\d+[A-Za-z]?)$`, 'i'));
  if (m) return casa ? `${m[1]} # ${m[2]}-${casa}` : `${m[1]} # ${m[2]}`;

  return casa ? `${resto} # ${casa}` : resto;
}

function tieneNumero(linea1: string): boolean {
  return /\d/.test(linea1);
}

async function reverseGeocodeGoogle(latitude: number, longitude: number): Promise<GeoResultado | null> {
  const key = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;
  if (!key) return null;

  const url = new URL(GOOGLE_REVERSE);
  url.searchParams.set('latlng', `${latitude},${longitude}`);
  url.searchParams.set('language', 'es');
  url.searchParams.set('key', key);

  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.status !== 'OK' || !Array.isArray(data.results) || data.results.length === 0) return null;

  const componentes: Array<{ long_name: string; types: string[] }> = data.results[0].address_components ?? [];
  const buscar = (tipo: string) => componentes.find((c) => c.types?.includes(tipo))?.long_name ?? '';

  const via = buscar('route');
  const numero = buscar('street_number');
  const linea1 = via && numero ? `${via} # ${numero}` : via;
  
  const barrio =
    buscar('neighborhood') || buscar('sublocality_level_2') || buscar('sublocality_level_1') || '';

  return { linea1, barrio };
}

async function reverseGeocodeArcGIS(latitude: number, longitude: number): Promise<GeoResultado | null> {
  const url = new URL(ARCGIS_REVERSE);
  url.searchParams.set('location', `${longitude},${latitude}`);
  url.searchParams.set('f', 'json');
  url.searchParams.set('outSR', '4326');
  url.searchParams.set('lang', 'es');

  const res = await fetch(url.toString());
  if (!res.ok) return null;

  const data = await res.json();
  const a = data?.address ?? {};
  const tipo = String(a.Addr_type ?? '');
  const esCalle = tipo === 'StreetAddress' || tipo === 'PointAddress';

  const linea1 = esCalle ? formatearDireccionColombia(String(a.Address ?? ''), String(a.AddNum ?? '')) : '';
 
  const barrio = esCalle ? String(a.Neighborhood || '') : String(a.Block || a.Sector || '');

  return { linea1, barrio };
}

async function reverseGeocodeOSM(latitude: number, longitude: number): Promise<GeoResultado | null> {
  const url = new URL(NOMINATIM_REVERSE);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('zoom', '18');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('extratags', '1');
  url.searchParams.set('namedetails', '1');
  url.searchParams.set('accept-language', 'es');

  const res = await fetch(url.toString(), { headers: { 'Accept-Language': 'es' } });
  if (!res.ok) throw new Error(`El geocodificador respondió ${res.status}`);

  const data = await res.json();
  if (!data || data.error || !data.address) throw new Error('El geocodificador no devolvió resultados');

  const a: Record<string, string> = data.address;
  const extra: Record<string, string> = data.extratags ?? {};

  const via = normalizarVia(
    a.road || extra['addr:street'] || a.pedestrian || a.footway || a.path || a.residential || a.place || '',
  );

  const numeroBruto = a.house_number || extra['addr:housenumber'] || a.house || '';
  const numero = /^\d/.test(numeroBruto) ? numeroBruto : '';
  let linea1 = via && numero ? `${via} # ${numero}` : via || numero;
  if (!linea1) {
    linea1 = String(data.display_name ?? '').split(',')[0].trim();
  }

  const barrio =
    a.neighbourhood || a.quarter || a.residential ||
    a.suburb || a.city_district || a.hamlet ||
    a.town || a.village || '';

  return { linea1, barrio };
}

async function obtenerDireccion(latitude: number, longitude: number): Promise<GeoResultado> {
  let linea1 = '';
  let barrio = '';

  const google = await reverseGeocodeGoogle(latitude, longitude).catch(() => null);
  if (google?.barrio && !barrio) barrio = google.barrio;
  if (google?.linea1) linea1 = google.linea1;

  const arcgis = await reverseGeocodeArcGIS(latitude, longitude).catch(() => null);
  if (arcgis?.barrio && !barrio) barrio = arcgis.barrio;
 
  if (!linea1 || !tieneNumero(linea1)) {
    if (arcgis?.linea1 && (!linea1 || tieneNumero(arcgis.linea1))) {
      linea1 = arcgis.linea1;
    }
  }

  const osm = await reverseGeocodeOSM(latitude, longitude).catch(() => null);
  if (osm?.barrio && !barrio) barrio = osm.barrio;
  if (!linea1 && osm?.linea1) linea1 = osm.linea1;

  return { linea1, barrio };
}

const WHATSAPP_LOCAL = '573142208706';

const ETIQUETA_PAGO: Record<string, string> = {
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  bancolombia: 'Bancolombia',
  efectivo: 'Efectivo (contra entrega)',
};

const fmtCOP = (v: number) => `$${Math.round(v).toLocaleString('es-CO')}`;

function formatearTelefono(v: string): string {
  const limpio = v.replace(/\D/g, '').slice(0, 10);
  if (limpio.length <= 3) return limpio;
  if (limpio.length <= 6) return `${limpio.slice(0, 3)} ${limpio.slice(3)}`;
  return `${limpio.slice(0, 3)} ${limpio.slice(3, 6)} ${limpio.slice(6)}`;
}

export default function Checkout() {
  const { items, total, vaciar, tipoEntrega, cuando, fechaProgramada, horaProgramada } = useCart();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { showToast: showToastGlobal } = useToast();
  const alertar = (msg: any) => showToastGlobal(String(msg), true);
  const tasaImpuesto = useTasaImpuesto();

  const [searchParams] = useSearchParams();
  const mesaUrl = Number(searchParams.get('mesa'));
  const mesaDesdeUrl = Number.isInteger(mesaUrl) && mesaUrl > 0;
  const [mesa, setMesa] = useState<number | ''>(mesaDesdeUrl ? mesaUrl : '');

  const partesNombre = (user?.name ?? '').trim().split(' ');
  const nombreInicial = partesNombre[0] ?? '';
  const apellidoInicial = partesNombre.slice(1).join(' ');

  const [direccion, setDireccion] = useState<Direccion>(direccionVacia);
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);

  const refReferencia = useRef<HTMLTextAreaElement | null>(null);

  const showToastUbicacion = (msg: string) => {
    showToastGlobal(msg, false, true);
  };

  useEffect(() => {
    const el = refReferencia.current;
    if (!el) return;
    const necesario = el.scrollHeight;
    if (necesario > el.clientHeight) {
      el.style.height = 'auto';
      el.style.height = `${necesario}px`;
    }
  }, [direccion.referencia]);

  const usarUbicacionActual = () => {
    if (!navigator.geolocation) {
      alertar('Tu navegador no soporta geolocalización. Ingresa la dirección manualmente.');
      return;
    }
    setBuscandoUbicacion(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        setDireccion((prev) => ({ ...prev, lat: latitude, lng: longitude }));

        try {
          const { linea1, barrio } = await obtenerDireccion(latitude, longitude);
          setDireccion((prev) => ({
            ...prev,
            linea1: linea1 || prev.linea1,
            barrio: barrio || prev.barrio,
            lat: latitude,
            lng: longitude,
          }));

          if (!linea1) {
            showToastUbicacion('Encontramos tu ubicación pero sin dirección en el mapa. Escríbela manualmente.');
          } else if (!tieneNumero(linea1)) {
            showToastUbicacion('Ubicación encontrada en la calle, pero falta el número de casa. Agrégalo para que el domiciliario llegue.');
          } else if (!barrio) {
            showToastUbicacion('Ubicación encontrada. Completa el barrio manualmente, no venía en el mapa.');
          }
        } catch {
          showToastUbicacion('Encontramos tu ubicación pero no pudimos convertirla en dirección. Escríbela manualmente.');
        } finally {
          setBuscandoUbicacion(false);
        }
      },
      (err) => {
        setBuscandoUbicacion(false);
        if (err.code === err.PERMISSION_DENIED) {
          alertar('No pudimos acceder a tu ubicación: denegaste el permiso del navegador. Habilítalo e inténtalo de nuevo.');
        } else if (err.code === err.TIMEOUT) {
          alertar('La solicitud de ubicación tardó demasiado. Inténtalo de nuevo.');
        } else {
          alertar('No pudimos determinar tu ubicación. Revisa el GPS del dispositivo e inténtalo de nuevo.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const [tipoDocumento, setTipoDocumento] = useState('CC');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [nombre] = useState(nombreInicial);
  const [apellido] = useState(apellidoInicial);
  const [correo] = useState(user?.email ?? '');
  const [telefono, setTelefono] = useState('');
  const [recibeNombre, setRecibeNombre] = useState('');
  const [recibeTelefono, setRecibeTelefono] = useState('');

  const [mesas, setMesas] = useState<{ numero: number; estado: string }[]>([]);
  const [mesaSel, setMesaSel] = useState<number | null>(null);

  useEffect(() => {
    if (tipoEntrega !== 'En restaurante') return;
    let vivo = true;
    const cargarMesas = () => {
      apiClient
        .get('/mesas/disponibilidad')
        .then(({ data }) => {
          if (!vivo) return;
          const lista = Array.isArray(data) ? data : [];
          setMesas(lista);
          setMesaSel((actual) =>
            actual && lista.find((m: { numero: number; estado: string }) => m.numero === actual && m.estado === 'Libre')
              ? actual
              : null,
          );
        })
        .catch(() => {});
    };
    cargarMesas();
    const t = window.setInterval(cargarMesas, 15000);
    return () => {
      vivo = false;
      window.clearInterval(t);
    };
  }, [tipoEntrega]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    apiClient.get('/me').then(({ data }) => {
      const u = data?.usuario ?? data?.user ?? data;
      if (!u) return;
      if (u.Ndocumento) setNumeroDocumento(String(u.Ndocumento));
      if (u.telefono) setTelefono(String(u.telefono));
      if (u.Tdocumento && TIPOS_DOCUMENTO.includes(u.Tdocumento)) {
        setTipoDocumento(u.Tdocumento);
      }
    }).catch(() => {
      try {
        const raw = localStorage.getItem('perfil_extra');
        if (!raw) return;
        const j = JSON.parse(raw);
        if (j.Ndocumento) setNumeroDocumento(String(j.Ndocumento));
        if (j.telefono) setTelefono(String(j.telefono));
        if (j.Tdocumento && TIPOS_DOCUMENTO.includes(j.Tdocumento)) {
          setTipoDocumento(j.Tdocumento);
        }
      } catch { /* ignore */ }
    });
  }, []);

  const [metodoPago, setMetodoPago] = useState<'nequi' | 'daviplata' | 'bancolombia' | 'efectivo'>('nequi');
  const [qrNoDisponible, setQrNoDisponible] = useState<Record<string, boolean>>({});

  const PEDIDO_KEY = 'checkout_pedido_confirmado';
  type PedidoConfirmado = {
    id: number | null;
    numeroCliente: number | null;
    total: number;
    url: string;
    correo: string | null;
    comprobanteCargado: boolean;
    comprobanteRevisionManual?: boolean;
    metodoPago: string;
  };
  const leerPedidoGuardado = (): PedidoConfirmado | null => {
    try {
      const raw = sessionStorage.getItem(PEDIDO_KEY);
      return raw ? (JSON.parse(raw) as PedidoConfirmado) : null;
    } catch {
      return null;
    }
  };
  const [pedidoConfirmado, setPedidoConfirmado] = useState<PedidoConfirmado | null>(leerPedidoGuardado);

  useEffect(() => {
    return () => {
      try { sessionStorage.removeItem(PEDIDO_KEY); } catch { /* sin storage */ }
    };
  }, []);

  const [comprobante, setComprobante] = useState<File | null>(null);
  const [comprobantePreview, setComprobantePreview] = useState<string | null>(null);
  const refComprobante = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!comprobante) {
      setComprobantePreview(null);
      return;
    }
    const url = URL.createObjectURL(comprobante);
    setComprobantePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [comprobante]);

  const seleccionarComprobante = async (file: File | null) => {
    if (!file) {
      setComprobante(null);
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alertar('El comprobante debe ser una imagen JPG, PNG o WEBP.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      alertar('El comprobante no puede superar los 8 MB.');
      return;
    }
    setComprobante(await comprimirImagen(file));
  };

  const [mapaPromoProductos, setMapaPromoProductos] = useState<Map<number, number[]>>(new Map());

  useEffect(() => {
    apiClient.get<any>('/promociones').then(({ data }) => {
      const lista: any[] = Array.isArray(data) ? data : data?.data ?? [];
      const mapa = new Map<number, number[]>();
      lista.forEach((p) => {
        const prods: any[] = Array.isArray(p?.productos) ? p.productos : [];
        if (prods.length > 0) {
          mapa.set(Number(p.id), prods.map((x) => Number(x.id)).filter((n) => Number.isFinite(n)));
        }
      });
      setMapaPromoProductos(mapa);
    }).catch(() => { /* si falla, se valida al pagar */ });
  }, []);

  const TIPO_ENTREGA_BACKEND: Record<string, string> = {
    Domicilio: 'Domicilio',
    'Para recoger': 'Recoger',
    'En restaurante': 'Consumir',
  };
  const METODO_PAGO_BACKEND: Record<string, string> = {
    nequi: 'Nequi',
    daviplata: 'Daviplata',
    bancolombia: 'Bancolombia',
    efectivo: 'Efectivo',
  };

  const construirNotas = (): string | null => {
    const partes = items
      .filter((i) => (i.sin?.length ?? 0) > 0 || (i.extras?.length ?? 0) > 0 || i.nota)
      .map((i) => {
        const det = [
          ...(i.sin ?? []).map((s) => `SIN ${s}`),
          ...(i.extras ?? []).map((e) => `+${e.cantidad} ${e.nombre}`),
          i.nota,
        ].filter(Boolean).join(', ');
        return `${i.cantidad} ${i.nombre}: ${det}`;
      });
    return partes.length ? partes.join(' | ').slice(0, 255) : null;
  };

  const construirAdiciones = (): { adicion_id: number; cantidad: number }[] => {
    const mapa = new Map<number, number>();
    items.forEach((i) =>
      (i.extras ?? []).forEach((e) => mapa.set(e.id, (mapa.get(e.id) ?? 0) + e.cantidad * i.cantidad)),
    );
    return [...mapa.entries()].map(([adicion_id, cantidad]) => ({ adicion_id, cantidad }));
  };

  const expandirCarrito = (): { producto_id: number; cantidad: number }[] => {
    const combinado = new Map<number, number>();
    items.forEach((item) => {
      const prodIds = mapaPromoProductos.get(Number(item.id));
      if (prodIds && prodIds.length > 0) {
        prodIds.forEach((pid) => combinado.set(pid, (combinado.get(pid) ?? 0) + item.cantidad));
      } else {
        const pid = Number(item.id);
        if (Number.isFinite(pid)) {
          combinado.set(pid, (combinado.get(pid) ?? 0) + item.cantidad);
        }
      }
    });
    return [...combinado.entries()].map(([producto_id, cantidad]) => ({ producto_id, cantidad }));
  };

  const mensajeErrorPago = (err: unknown): string =>
    mensajeError(err, 'No se pudo procesar el pago');

  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);
  const claveIdempotencia = useRef(nuevaClaveIdempotencia());

  const subtotal = total / (1 + tasaImpuesto);
  const impuestos = total - subtotal;

  const requiereDireccion = tipoEntrega === 'Domicilio';

  const validar = (): string | null => {
    if (items.length === 0) return 'Tu carrito está vacío.';
    if (requiereDireccion && (!direccion.linea1 || !direccion.barrio)) {
      return 'Completa la dirección de entrega (o usa el botón de ubicación actual).';
    }
    if (requiereDireccion && (!recibeNombre.trim() || !recibeTelefono.trim())) {
      return 'Indica el nombre y el teléfono de quien recibe el pedido.';
    }
    if (tipoEntrega === 'En restaurante' && !mesa && !mesaSel) {
      return 'Indica el número de mesa o elige una mesa para los pedidos en el restaurante.';
    }
    if (!numeroDocumento || !nombre || !apellido || !correo || !telefono) {
      return 'Completa todos los datos de la compra.';
    }
    if (esPagoElectronico(metodoPago) && !comprobante) {
      return 'Adjunta una imagen del comprobante de pago. La IA verificará que sea un comprobante real.';
    }
    return null;
  };

  const pagarAhora = async () => {
    if (!isAuthenticated) {
      alertar('Debes iniciar sesión para realizar el pago.');
      navigate('/login');
      return;
    }
    if (enviandoRef.current) return;
    const error = validar();
    if (error) {
      alertar(error);
      return;
    }

    enviandoRef.current = true;
    setEnviando(true);
    try {
      const form = new FormData();
      expandirCarrito().forEach((item, i) => {
        form.append(`carrito[${i}][producto_id]`, String(item.producto_id));
        form.append(`carrito[${i}][cantidad]`, String(item.cantidad));
      });
      construirAdiciones().forEach((adicion, i) => {
        form.append(`adiciones[${i}][adicion_id]`, String(adicion.adicion_id));
        form.append(`adiciones[${i}][cantidad]`, String(adicion.cantidad));
      });

      form.append('tipo_entrega', TIPO_ENTREGA_BACKEND[tipoEntrega] ?? 'Domicilio');
      
      if (tipoEntrega === 'En restaurante') {
        const mesaFinal = mesa || mesaSel;
        if (mesaFinal) form.append('mesa', String(mesaFinal));
      }

      form.append('metodo_pago', METODO_PAGO_BACKEND[metodoPago] ?? 'Efectivo');
      form.append('notas', construirNotas() ?? '');
      form.append('total', String(total));
      form.append('cuando', cuando);
      if (cuando === 'Programar para más tarde') {
        form.append('fecha_programada', `${fechaProgramada}T${horaProgramada}`);
      }

      if (requiereDireccion) {
        form.append('direccion[linea1]', direccion.linea1);
        form.append('direccion[barrio]', direccion.barrio);
        form.append('direccion[referencia]', direccion.referencia);
        form.append('direccion[recibe_nombre]', recibeNombre.trim());
        form.append('direccion[recibe_telefono]', recibeTelefono.trim());
      }

      form.append('cliente[tipoDocumento]', tipoDocumento);
      form.append('cliente[numeroDocumento]', numeroDocumento);
      form.append('cliente[nombre]', nombre);
      form.append('cliente[apellido]', apellido);
      form.append('cliente[correo]', correo);
      form.append('cliente[telefono]', telefono);

      if (comprobante) {
        form.append('comprobante', comprobante);
      }

      const respuesta = await apiClient.post('/ventas', form, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Idempotency-Key': claveIdempotencia.current,
        },
        timeout: 90000,
      });

      claveIdempotencia.current = nuevaClaveIdempotencia();

      const idVenta = respuesta.data?.id ?? null;
      const urlWsp = `https://wa.me/${WHATSAPP_LOCAL}?text=${encodeURIComponent(construirFacturaWhatsApp(idVenta))}`;

      vaciar();
      setComprobante(null);

      const confirmado: NonNullable<typeof pedidoConfirmado> = {
        id: idVenta,
        numeroCliente: respuesta.data?.numero_cliente ?? null,
        total,
        url: urlWsp,
        correo: respuesta.data?.recibo_correo ?? null,
        comprobanteCargado: Boolean(respuesta.data?.tiene_comprobante),
        comprobanteRevisionManual: Boolean(respuesta.data?.comprobante_revision_manual),
        metodoPago,
      };
      setPedidoConfirmado(confirmado);
      try { sessionStorage.setItem(PEDIDO_KEY, JSON.stringify(confirmado)); } catch { /* sin storage */ }
      window.scrollTo(0, 0);
    } catch (err) {
      alertar(mensajeErrorPago(err));
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  };

  const construirFacturaWhatsApp = (idVenta: number | null = null): string => {
    const lineas: string[] = [];
    const fechaPedido = new Date().toLocaleString('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    lineas.push(
      `Hola, soy ${nombre} ${apellido}. Acabo de hacer un pedido en *Burguersoft El Oriente* y les mando el *comprobante de pago* de este pedido.`,
    );
    lineas.push('');
    lineas.push(`*PEDIDO${idVenta ? ` #${idVenta}` : ''}*`);
    lineas.push(`Fecha: ${fechaPedido}`);
    lineas.push('------------------------');
    lineas.push('*CLIENTE*');
    lineas.push(`Nombre: ${nombre} ${apellido}`);
    lineas.push(`Doc: ${tipoDocumento} ${numeroDocumento}`);
    lineas.push(`Tel: +57 ${telefono}`);
    lineas.push(`Correo: ${correo}`);
    lineas.push('------------------------');
    lineas.push('*ENTREGA*');
    lineas.push(`Tipo: ${resumenEntrega}`);
    if (cuando === 'Lo antes posible') {
      lineas.push('Momento: Lo antes posible');
    } else {
      lineas.push(`Programado para: ${fechaProgramada} - ${horaProgramada}`);
    }

    if (requiereDireccion) {
      lineas.push(`Dirección: ${direccion.linea1}`);
      lineas.push(`Barrio: ${direccion.barrio}`);
      if (direccion.referencia) lineas.push(`Referencia: ${direccion.referencia}`);
    }

    lineas.push('------------------------');
    lineas.push('*PRODUCTOS*');
    items.forEach((i) => {
      lineas.push(`${i.cantidad} ${i.nombre} - ${fmtCOP(i.precio * i.cantidad)}`);
    });
    lineas.push('------------------------');
    lineas.push(`Subtotal: ${fmtCOP(subtotal)}`);
    lineas.push(`Impuestos: ${fmtCOP(impuestos)}`);
    lineas.push(`*TOTAL: ${fmtCOP(total)}*`);
    lineas.push('------------------------');
    lineas.push(`Método de pago: ${ETIQUETA_PAGO[metodoPago] ?? metodoPago}`);
    if (esPagoElectronico(metodoPago)) {
      lineas.push(`Llave Bre-B: ${CUENTA_QR[metodoPago]?.llave ?? ''}`);
      lineas.push('*Adjunto el comprobante de pago por este chat.*');
    } else {
      lineas.push('Pago contra entrega.');
    }

    return lineas.join('\n');
  };

  const resumenEntrega = useMemo(() => {
    if (tipoEntrega === 'Domicilio') return 'Domicilio';
    if (tipoEntrega === 'Para recoger') return 'Para llevar';
    return 'En restaurante';
  }, [tipoEntrega]);

  const METODOS_PAGO = [
    { id: 'nequi' as const, etiqueta: 'Nequi', icono: <IconoNequi /> },
    { id: 'daviplata' as const, etiqueta: 'Daviplata', icono: <IconoDaviplata /> },
    { id: 'bancolombia' as const, etiqueta: 'Transferencia Bancolombia', icono: <IconoBancolombia /> },
    { id: 'efectivo' as const, etiqueta: 'Contra entrega (efectivo)', icono: <IconoEfectivo /> },
  ];

  return (
    <div className="public-body checkout-wrapper">
      <PublicHeader />
      <div className="checkout-page">
        <div className="checkout-main">
          {pedidoConfirmado ? (
            <section className="checkout-card">
              <div className="checkout-encabezado">
                <h2>¡Pedido realizado con éxito!</h2>
                <p>
                  {pedidoConfirmado.comprobanteCargado
                    ? pedidoConfirmado.comprobanteRevisionManual
                      ? 'Recibimos tu comprobante, pero no se pudo verificar automáticamente. El administrador lo revisará y lo aprobará o te pedirá subir uno nuevo desde el estado de tu pedido.'
                      : 'La IA verificó tu comprobante de pago y quedó en revisión. El administrador lo aprobará o te pedirá subir uno nuevo desde el estado de tu pedido.'
                    : pedidoConfirmado.metodoPago === 'efectivo'
                      ? 'Tu pedido quedó registrado. Puedes pagar en efectivo al recibirlo y seguir su estado desde Mis compras.'
                      : 'Tu pedido quedó registrado. Puedes seguir su estado desde Mis compras y enviar cualquier detalle por el WhatsApp del local.'}
                </p>
                {pedidoConfirmado.correo && (
                  <p>
                    También enviamos tu factura en PDF a <strong>{pedidoConfirmado.correo}</strong>.
                  </p>
                )}
              </div>

              <div className="checkout-seccion">
                <div className="checkout-form">
                  <div className="checkout-info-row">
                    <span className="checkout-info-icon">🧾</span>
                    <div>
                      <strong>Pedido {(pedidoConfirmado.numeroCliente ?? pedidoConfirmado.id) ? `#${pedidoConfirmado.numeroCliente ?? pedidoConfirmado.id}` : 'registrado'}</strong>
                      <p>Total a pagar: {fmtCOP(pedidoConfirmado.total)}</p>
                    </div>
                  </div>

                  <div className="checkout-confirm-acciones">
                    <button
                      type="button"
                      className="btn-ubicacion"
                      onClick={() => navigate('/mis-compras')}
                    >
                      Ver el estado de mis compras
                    </button>

                    <button
                      type="button"
                      className="btn-ubicacion"
                      onClick={() => navigate('/menu-publico')}
                    >
                      Hacer otro pedido
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ) : items.length === 0 ? (
            <section className="checkout-card">
              <div className="checkout-encabezado">
                <h2>Tu carrito está vacío</h2>
                <p>Agrega productos desde el menú para continuar con el pago.</p>
              </div>
              <div className="checkout-seccion">
                <div className="checkout-form">
                  <button
                    type="button"
                    className="btn-ubicacion"
                    onClick={() => navigate('/menu-publico')}
                  >
                    Ir al menú
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <section className="checkout-card">
              <div className="checkout-encabezado">
                <h2>Finaliza tu pedido</h2>
                <p>Completa los pasos y paga con el método que prefieras.</p>
              </div>

              <div className="checkout-seccion">
                <div className="checkout-seccion-titulo">
                  <span className="checkout-paso">1</span>
                  <h3>{requiereDireccion ? 'Dirección de entrega' : 'Detalles del pedido'}</h3>
                </div>

                {requiereDireccion ? (
                  <div className="checkout-form">
                    <button type="button" className="btn-ubicacion" onClick={usarUbicacionActual} disabled={buscandoUbicacion}>
                      <img src={logoUbicacion} alt="" className="btn-ubicacion-icono" />
                      {buscandoUbicacion ? 'Buscando tu ubicación...' : 'Usar mi ubicación actual'}
                    </button>

                    <div className="form-group">
                      <label>Dirección <span className="checkout-required">*</span></label>
                      <input
                        value={direccion.linea1}
                        onChange={(e) => setDireccion({ ...direccion, linea1: e.target.value })}
                        placeholder="Calle 10 # 20-30"
                        required
                      />
                    </div>
                    <div className="checkout-grid-2">
                      <div className="form-group">
                        <label>Barrio <span className="checkout-required">*</span></label>
                        <input value={direccion.barrio} onChange={(e) => setDireccion({ ...direccion, barrio: e.target.value })} required />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Referencia (opcional)</label>
                      <textarea
                        ref={refReferencia}
                        className="checkout-referencia"
                        rows={2}
                        value={direccion.referencia}
                        onChange={(e) => setDireccion({ ...direccion, referencia: e.target.value })}
                        placeholder="Portón negro, casa esquinera, apto 301..."
                      />
                      <span className="checkout-hint">Puedes arrastrar la esquina inferior para agrandar el campo.</span>
                    </div>
                    <div className="checkout-grid-2">
                      <div className="form-group">
                        <label>Nombre de quien recibe <span className="checkout-required">*</span></label>
                        <input
                          value={recibeNombre}
                          onChange={(e) => setRecibeNombre(e.target.value)}
                          placeholder="Nombre y apellido"
                          maxLength={150}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Teléfono de quien recibe <span className="checkout-required">*</span></label>
                        <input
                          value={recibeTelefono}
                          onChange={(e) => setRecibeTelefono(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="3001234567"
                          inputMode="numeric"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {tipoEntrega === 'En restaurante' && (
                      <div className="checkout-form">
                        <div className="form-group">
                          <label>Mesa <span className="checkout-required">*</span></label>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            value={mesa}
                            onChange={(e) => {
                              const valor = Number(e.target.value);
                              setMesa(Number.isInteger(valor) && valor > 0 ? valor : '');
                            }}
                            placeholder="Número de mesa"
                            required
                          />
                          {mesaDesdeUrl && (
                            <span className="checkout-hint">Mesa tomada del código QR.</span>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="checkout-info-row">
                      <span className="checkout-info-icon">🕒</span>
                      <div>
                        <strong>{resumenEntrega}</strong>
                        <p>{cuando === 'Lo antes posible' ? 'Lo antes posible' : `${fechaProgramada} · ${horaProgramada}`}</p>
                      </div>
                    </div>
                  </>
                )}

                {tipoEntrega === 'En restaurante' && (
                  <div style={{ marginTop: 14 }}>
                    <strong style={{ display: 'block', marginBottom: 8 }}>
                      Elige tu mesa <span className="checkout-required">*</span>
                    </strong>
                    {mesas.length === 0 && <p className="checkout-hint">Cargando mesas…</p>}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
                      {mesas.map((m) => {
                        const libre = m.estado === 'Libre';
                        const seleccionada = mesaSel === m.numero;
                        return (
                          <button
                            type="button"
                            key={m.numero}
                            disabled={!libre}
                            onClick={() => setMesaSel(m.numero)}
                            style={{
                              padding: '12px 8px',
                              borderRadius: 12,
                              border: `2px solid ${seleccionada ? '#e8821a' : libre ? '#bfe3cb' : '#eee'}`,
                              background: seleccionada ? '#fff3e6' : libre ? '#f2fbf5' : '#f5f5f5',
                              color: libre ? '#1a1a1a' : '#9a9a9a',
                              cursor: libre ? 'pointer' : 'not-allowed',
                              fontFamily: 'inherit',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <strong>Mesa {m.numero}</strong>
                            <span style={{ fontSize: 12, fontWeight: 700, color: libre ? '#1a7a42' : '#b45309' }}>
                              {libre ? '● Disponible' : '● Ocupada'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="checkout-seccion">
                <div className="checkout-seccion-titulo">
                  <span className="checkout-paso">2</span>
                  <h3>Tus datos</h3>
                </div>

                <div className="checkout-datos-fila">
                  <div className="checkout-dato">
                    <span className="checkout-dato-label">Nombre</span>
                    <span className="checkout-dato-valor">{nombre} {apellido}</span>
                  </div>
                  <div className="checkout-dato">
                    <span className="checkout-dato-label">Documento</span>
                    <span className="checkout-dato-valor">{tipoDocumento} · {numeroDocumento || '—'}</span>
                  </div>
                  <div className="checkout-dato">
                    <span className="checkout-dato-label">Correo</span>
                    <span className="checkout-dato-valor">{correo || '—'}</span>
                  </div>
                </div>

                <div className="form-group">
                  <label>Teléfono <span className="checkout-required">*</span></label>
                  <input
                    inputMode="tel"
                    value={formatearTelefono(telefono)}
                    onChange={(e) => setTelefono(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="300 345 8970"
                  />
                </div>
              </div>

              <div className="checkout-seccion checkout-seccion-pago">
                <div className="checkout-seccion-titulo">
                  <span className="checkout-paso">3</span>
                  <h3>Método de pago</h3>
                </div>

                <div className="pago-zona">
                  <div className="pago-opciones">
                    {METODOS_PAGO.map((m) => (
                      <label key={m.id} className="pago-chip">
                        <input
                          type="radio"
                          name="metodo"
                          checked={metodoPago === m.id}
                          onChange={() => {
                            setMetodoPago(m.id);
                            if (m.id === 'efectivo') setComprobante(null);
                          }}
                        />
                        <span className={`pago-icono pago-icono-${m.id}`}>{m.icono}</span>
                        <span className="pago-chip-texto">{m.etiqueta}</span>
                      </label>
                    ))}
                  </div>

                  {esPagoElectronico(metodoPago) && (
                    <div className="pago-qr-caja" key={metodoPago}>
                      {!qrNoDisponible[metodoPago] ? (
                        <>
                          <img
                            className="pago-qr-img"
                            src={QR_RUTAS[metodoPago]}
                            alt="Código QR Bre-B para pagar el pedido"
                            onError={() => setQrNoDisponible((v) => ({ ...v, [metodoPago]: true }))}
                          />
                          <div className="pago-qr-cuenta">
                            <strong>{CUENTA_QR[metodoPago]?.titular}</strong>
                            <span>Llave Bre-B · {CUENTA_QR[metodoPago]?.llave}</span>
                          </div>
                        </>
                      ) : (
                        <div className="pago-qr-vacio">
                          Paga con {NOMBRE_QR[metodoPago]} y guarda tu comprobante.
                        </div>
                      )}
                      <div className="pago-qr-texto">
                        Escanea este código <strong>Bre-B</strong> desde la app de tu banco o billetera
                        (Nequi, Daviplata, Bancolombia, Davivienda...) y digita el total a pagar.
                        Al finalizar, sube aquí tu comprobante para que la IA lo verifique.
                      </div>
                    </div>
                  )}

                  {metodoPago !== 'efectivo' && (
                    <div className="checkout-comprobante">
                      <div className="checkout-seccion-titulo" style={{ marginBottom: 8 }}>
                        <span className="checkout-paso">4</span>
                        <h3>
                          Comprobante de pago{' '}
                          {esPagoElectronico(metodoPago) ? (
                            <span className="checkout-required">*</span>
                          ) : (
                            <small style={{ fontWeight: 500, color: '#8f0b0b' }}>*</small>
                          )}
                        </h3>
                      </div>
                      <p className="checkout-comprobante-texto">
                        Sube una foto o captura del comprobante de tu pago. La IA verificará que la imagen
                        sea realmente un comprobante de pago antes de registrar el pedido. Si no lo es, no
                        se aceptará.
                      </p>

                      <input
                        ref={refComprobante}
                        id="comprobante-pago"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        style={{ display: 'none' }}
                        onChange={(e) => void seleccionarComprobante(e.target.files?.[0] ?? null)}
                      />

                      {comprobantePreview ? (
                        <div className="checkout-comprobante-preview">
                          <img src={comprobantePreview} alt="Vista previa del comprobante de pago" />
                          <div className="checkout-comprobante-preview-info">
                            <strong>{comprobante?.name}</strong>
                            <span>{((comprobante?.size ?? 0) / 1024 / 1024).toFixed(2)} MB</span>
                            <button
                              type="button"
                              onClick={() => {
                                setComprobante(null);
                                if (refComprobante.current) refComprobante.current.value = '';
                              }}
                            >
                              Quitar y elegir otra
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label htmlFor="comprobante-pago" className="checkout-comprobante-label">
                          <span>📎 Adjuntar imagen del comprobante</span>
                          <small>JPG, PNG o WEBP · máximo 8 MB</small>
                        </label>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>

        {!pedidoConfirmado && items.length > 0 && (
          <aside className="checkout-resumen">
            <div className="checkout-resumen-titulo">Tu pedido</div>
            <div className="checkout-resumen-items">
              {items.map((i) => (
                <div className="checkout-resumen-item" key={i.id}>
                  <span className="checkout-resumen-item-nombre">{i.cantidad} {i.nombre}</span>
                  <span>{fmtCOP(i.precio * i.cantidad)}</span>
                </div>
              ))}
            </div>
            <div className="checkout-resumen-rows">
              <div><span>Subtotal</span><span>{fmtCOP(subtotal)}</span></div>
              <div><span>Impuestos</span><span>{fmtCOP(impuestos)}</span></div>
              <div className="checkout-resumen-total"><span>Total</span><span>{fmtCOP(total)}</span></div>
            </div>
            <button className="btn-pagar-ahora" onClick={pagarAhora} disabled={enviando}>
              {enviando ? 'Procesando...' : 'Pagar ahora'}
            </button>
          </aside>
        )}
      </div>
      {enviando && (
        <AdminLoading
          texto={comprobante ? 'Verificando tu comprobante' : 'Registrando tu pedido'}
          subtexto="No cierres ni recargues esta página."
        />
      )}
      <Footer />
    </div>
  );
}