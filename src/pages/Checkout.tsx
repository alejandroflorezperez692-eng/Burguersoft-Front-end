import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/client';
import '../styles/public.css';
import '../styles/checkout.css';
import PublicHeader from '../components/PublicHeader';
import { useToast } from '../components/Toast';
import Footer from '../components/Footer';
import logoNequi from '../assets/img/nequi.png';
import logoDaviplata from '../assets/img/daviplata.png';
import logoBancolombia from '../assets/img/bancolombia.svg';
import logoEfectivo from '../assets/img/efectivo.svg';
import logoUbicacion from '../assets/img/Ubicacion.png';

const IVA_RATE = 0.08;
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

// ---------------------------------------------------------------------------
// Geocodificación inversa
//
// La mayoría de geocodificadores públicos (OpenStreetMap) solo conocen la
// calle donde estás, no el número de casa de tu casa/apartamento. Por eso
// usamos una cascada de proveedores y nos quedamos con el primero que
// entregue la dirección más completa:
//
//   1. Google Maps  -> requiere VITE_GOOGLE_MAPS_KEY y billing activo en GCP.
//   2. ArcGIS       -> endpoint gratuito, interpola el número de casa.
//   3. OpenStreetMap (Nominatim) -> sin API key, pero suele traer la calle.
// ---------------------------------------------------------------------------

const ARCGIS_REVERSE = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode';
const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';
const GOOGLE_REVERSE = 'https://maps.googleapis.com/maps/api/geocode/json';

// Abreviaturas de vías que devuelve Nominatim en Colombia.
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

// Tipos de vía usados para detectar la transversal en una dirección colombiana.
const TIPO_VIA =
  '(?:Calle|Carrera|Cra|Cl|Avenida|Av|Diagonal|Diag|Circular|Circ|V[ií]a|Carril|Carretera|Transversal|Manzana|Manz)';

/** Normaliza "cl 60" -> "Calle 60", "cra 15" -> "Carrera 15", etc. */
function normalizarVia(via: string): string {
  const v = via.trim().replace(/\s+/g, ' ');
  for (const [re, prefijo] of ABREVIATURAS_VIA) {
    if (re.test(v)) return (prefijo + v.replace(re, '')).trim();
  }
  return v;
}

/**
 * ArcGIS devuelve "Carrera 30 33 35" (vía + transversal + casa).
 * En formato colombiano eso es "Carrera 30 # 33-35".
 */
function formatearDireccionColombia(address: string, addNum: string): string {
  const limpio = address.trim().replace(/\s+/g, ' ');
  if (!limpio) return '';

  // "Cra 33 # 45-20" (ya viene con el "#").
  if (limpio.includes('#')) {
    const [via, ...resto] = limpio.split('#');
    const casa = resto.join('#').trim();
    const v = via.trim();
    return casa ? `${v} # ${casa}` : v;
  }

  // Une tokens numéricos seguidos de una letra suelta: "33 A" -> "33A".
  const tokens: string[] = [];
  for (const t of limpio.split(' ')) {
    const prev = tokens[tokens.length - 1];
    if (prev && /^\d+$/.test(prev) && /^[A-Za-z]$/.test(t)) tokens[tokens.length - 1] = prev + t;
    else tokens.push(t);
  }

  // El número de casa es el último token numérico.
  const ultimo = tokens[tokens.length - 1];
  let casa = '';
  if (/^\d/.test(ultimo)) {
    casa = ultimo;
    tokens.pop();
  } else if (/^\d/.test(addNum)) {
    casa = addNum;
  }

  const resto = tokens.join(' ');

  // "Calle 60" es la vía sin número de casa: el token quitado era el de la vía.
  if (casa && !/\d/.test(resto) && new RegExp(`${TIPO_VIA}$`, 'i').test(resto)) {
    return `${resto} ${casa}`;
  }

  // "Calle 35 23" -> vía "Calle 35" + transversal "23".
  const m = resto.match(new RegExp(`^(.*\\b${TIPO_VIA}\\s+\\d+[A-Za-z]?)\\s+(\\d+[A-Za-z]?)$`, 'i'));
  if (m) return casa ? `${m[1]} # ${m[2]}-${casa}` : `${m[1]} # ${m[2]}`;

  return casa ? `${resto} # ${casa}` : resto;
}

/** ¿La dirección incluye número de casa? */
function tieneNumero(linea1: string): boolean {
  return /\d/.test(linea1);
}

/** 1) Google Maps (opcional, necesita billing activo). */
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
  // Solo el barrio (nunca la ciudad): neighborhood -> sublocality.
  const barrio =
    buscar('neighborhood') || buscar('sublocality_level_2') || buscar('sublocality_level_1') || '';

  return { linea1, barrio };
}

/** 2) ArcGIS: trae el número de casa (interpolado sobre la vía). */
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
  // Solo el barrio: ArcGIS lo llama "Neighborhood" (Antonio Santos, Mejoras
  // Publicas...). District/City son la ciudad y no nos sirven.
  // Si el match no es a nivel de calle (Locality/POI), su "Neighborhood" es
  // más general (p.ej. el corregimiento), así que lo descartamos y dejamos
  // que OSM aporte el barrio específico.
  const barrio = esCalle ? String(a.Neighborhood || '') : String(a.Block || a.Sector || '');

  return { linea1, barrio };
}

/** 3) OpenStreetMap (Nominatim): sin API key, pero muchas veces sin número. */
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
  // OSM a veces mete valores raros en el numero de casa: solo aceptamos
  // valores que empiecen por digito.
  const numeroBruto = a.house_number || extra['addr:housenumber'] || a.house || '';
  const numero = /^\d/.test(numeroBruto) ? numeroBruto : '';
  let linea1 = via && numero ? `${via} # ${numero}` : via || numero;
  if (!linea1) {
    linea1 = String(data.display_name ?? '').split(',')[0].trim();
  }

  // Solo el barrio. Se descartan "city"/"locality" porque son la ciudad.
  // Orden: barrio mapeado (neighbourhood) -> sector -> comuna (suburb).
  const barrio =
    a.neighbourhood || a.quarter || a.residential ||
    a.suburb || a.city_district || a.hamlet ||
    a.town || a.village || '';

  return { linea1, barrio };
}

/**
 * Corre los proveedores en cascada y devuelve la dirección más completa
 * que se pueda construir.
 */
async function obtenerDireccion(latitude: number, longitude: number): Promise<GeoResultado> {
  let linea1 = '';
  let barrio = '';

  const google = await reverseGeocodeGoogle(latitude, longitude).catch(() => null);
  if (google?.barrio && !barrio) barrio = google.barrio;
  if (google?.linea1) linea1 = google.linea1;

  const arcgis = await reverseGeocodeArcGIS(latitude, longitude).catch(() => null);
  if (arcgis?.barrio && !barrio) barrio = arcgis.barrio;
  // ArcGIS solo gana si Google no dio nada o dio una dirección sin número.
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

// WhatsApp donde el cliente envia el comprobante de pago y el detalle del
// pedido (314 220 8706).
const WHATSAPP_LOCAL = '573142208706';

const ETIQUETA_PAGO: Record<string, string> = {
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  bancolombia: 'Bancolombia',
  efectivo: 'Efectivo (contra entrega)',
};

// Los QR de cobro son codigos Bre-B (estandar de pagos inmediatos del Banco
// de la Republica), asi que cada uno se puede pagar desde cualquier entidad
// habilitada en Bre-B (Nequi, Daviplata, Bancolombia, Davivienda...).
//
// OJO CON LA CADUCIDAD: el QR NO lleva fecha de expiracion dentro, la
// vencimiento la guarda el banco en la llave registrada. La llave Daviplata
// @plata3115387534 (contrato CC02C39E5B) esta CADUCADA en Bre-B, por eso la
// app de Daviplata lee el codigo pero responde "vencido".
// Mientras tanto todos los metodos usan el codigo de Nequi (@3115387534),
// que si funciona y se puede pagar escaneando desde CUALQUIER app (incluida
// Daviplata, porque Bre-B es interoperable).
//
// Cuando generes un QR nuevo en la app de Daviplata: guarda la imagen en
// public/estilos/img/qr-daviplata.png y cambia la linea de "daviplata" de
// QR_RUTAS y la llave de CUENTA_QR.
//
// Los PNG son codigos regenerados en alta resolucion (810x810, modulos de
// 10px y zona de silencio de 4 modulos) para que las apps los lean sin problema.
const QR_RUTAS: Record<string, string> = {
  nequi: '/estilos/img/qr-breb.png',
  daviplata: '/estilos/img/qr-breb.png',
  bancolombia: '/estilos/img/qr-breb.png',
};

// Datos de la cuenta que recibe el pago (para que el cliente verifique).
// El 314 2208706 NO va aqui: ese numero solo se usa para el chat de
// WhatsApp donde el cliente manda el comprobante.
const CUENTA_QR: Record<string, { titular: string; llave: string }> = {
  nequi: { titular: 'Flor Avella', llave: '@3115387534' },
  daviplata: { titular: 'Flor Avella', llave: '@3115387534' },
  bancolombia: { titular: 'Flor Avella', llave: '@3115387534' },
};

const NOMBRE_QR: Record<string, string> = {
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  bancolombia: 'Bancolombia',
};

const fmtCOP = (v: number) => `$${Math.round(v).toLocaleString('es-CO')}`;

// Formatea "3087087087" -> "308 708 7087" (igual que en el perfil)
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

  // El AuthContext guarda "name" como nombre completo (nombre + apellido juntos),
  // así que lo separamos para llenar los dos campos del formulario.
  const partesNombre = (user?.name ?? '').trim().split(' ');
  const nombreInicial = partesNombre[0] ?? '';
  const apellidoInicial = partesNombre.slice(1).join(' ');

  // ---- Dirección de entrega (solo aplica si tipoEntrega === 'Domicilio') ----
  const [direccion, setDireccion] = useState<Direccion>(direccionVacia);
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);
  const [avisoUbicacion, setAvisoUbicacion] = useState<string | null>(null);
  const avisoTimer = useRef<number | null>(null);
  const refReferencia = useRef<HTMLTextAreaElement | null>(null);

  const showToastUbicacion = (msg: string) => {
    setAvisoUbicacion(msg);
    if (avisoTimer.current) window.clearTimeout(avisoTimer.current);
    avisoTimer.current = window.setTimeout(() => setAvisoUbicacion(null), 5000);
  };

  useEffect(() => {
    return () => {
      if (avisoTimer.current) window.clearTimeout(avisoTimer.current);
    };
  }, []);

  // El campo de referencia crece solo con el texto, pero nunca se encoge
  // si el cliente lo agrandó a mano arrastrando la esquina.
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

        // Guardamos las coordenadas de entrada: si el geocodificador falla,
        // el pedido conserva el punto exacto y el cliente escribe la dirección.
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

  // ---- Facturación ----
  const [usarMismosDatos, setUsarMismosDatos] = useState(true);
  const [facturaNombre, setFacturaNombre] = useState('');
  const [facturaApellido, setFacturaApellido] = useState('');
  const [facturaDocumento, setFacturaDocumento] = useState('');

  // ---- Método de pago ----
  const [metodoPago, setMetodoPago] = useState<'nequi' | 'daviplata' | 'bancolombia' | 'efectivo'>('nequi');
  const [qrNoDisponible, setQrNoDisponible] = useState<Record<string, boolean>>({});

  // Pedido ya registrado: se muestra el panel de confirmacion con el boton
  // para abrir el chat de WhatsApp (por si el navegador bloqueo la ventana).
  const [pedidoConfirmado, setPedidoConfirmado] = useState<{
    id: number | null;
    total: number;
    url: string;
    correo: string | null;
  } | null>(null);

  // Mapa promoción -> productos (el backend solo acepta producto_id en el
  // carrito y aplica el precio de la promo automáticamente).
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

  // Valores exactos que exige el backend (VentaController@store).
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

  // Convierte el carrito (promos y/o productos) a líneas de producto_id.
  // Cada promo se expande a 1 unidad de cada uno de sus productos por cantidad.
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

  const mensajeErrorPago = (err: unknown): string => {
    const data = (err as any)?.response?.data;
    if (data?.error) return String(data.error); // ej. "Stock insuficiente de..."
    const errores = data?.errors as Record<string, string[]> | undefined;
    if (errores) {
      const primero = Object.values(errores)[0]?.[0];
      if (primero) return String(primero);
    }
    if (data?.message) return String(data.message);
    if ((err as any)?.response?.status === 401) return 'Tu sesión expiró. Inicia sesión de nuevo.';
    return 'No se pudo procesar el pago. Intenta de nuevo.';
  };

  const [enviando, setEnviando] = useState(false);

  const subtotal = total / (1 + IVA_RATE);
  const impuestos = total - subtotal;

  const requiereDireccion = tipoEntrega === 'Domicilio';

  const validar = (): string | null => {
    if (items.length === 0) return 'Tu carrito está vacío.';
    if (requiereDireccion && (!direccion.linea1 || !direccion.barrio)) {
      return 'Completa la dirección de entrega (o usa el botón de ubicación actual).';
    }
    if (!numeroDocumento || !nombre || !apellido || !correo || !telefono) {
      return 'Completa todos los datos de la compra.';
    }
    return null;
  };

  const pagarAhora = async () => {
    if (!isAuthenticated) {
      alertar('Debes iniciar sesión para realizar el pago.');
      navigate('/login');
      return;
    }
    const error = validar();
    if (error) {
      alertar(error);
      return;
    }

    // Se abre la pestaña de forma sincrónica (dentro del gesto del clic)
    // para que el navegador no la bloquee como ventana emergente.
    const ventanaWsp = window.open('', '_blank');

    setEnviando(true);
    try {
      const respuesta = await apiClient.post('/ventas', {
        carrito: expandirCarrito(),
        tipo_entrega: TIPO_ENTREGA_BACKEND[tipoEntrega] ?? 'Domicilio',
        metodo_pago: METODO_PAGO_BACKEND[metodoPago] ?? 'Efectivo',
        // Contexto extra del pedido en línea (el backend lo ignora al validar)
        total,
        cuando,
        fecha_programada: cuando === 'Programar para más tarde' ? `${fechaProgramada}T${horaProgramada}` : null,
        direccion: requiereDireccion ? direccion : null,
        cliente: { tipoDocumento, numeroDocumento, nombre, apellido, correo, telefono },
        facturacion: usarMismosDatos
          ? { tipoDocumento, numeroDocumento, nombre, apellido }
          : { nombre: facturaNombre, apellido: facturaApellido, numeroDocumento: facturaDocumento },
      });

      // Numero del pedido registrado en el backend, va en el mensaje.
      const idVenta = respuesta.data?.id ?? null;
      const urlWsp = `https://wa.me/${WHATSAPP_LOCAL}?text=${encodeURIComponent(construirFacturaWhatsApp(idVenta))}`;

      vaciar();

      // Queda el panel de confirmacion en pantalla: si el navegador bloqueo la
      // ventana emergente, el cliente pulsa el boton y se abre igual (un clic
      // si cuenta como gesto del usuario y no lo bloquea el navegador).
      setPedidoConfirmado({
        id: idVenta,
        total,
        url: urlWsp,
        correo: respuesta.data?.recibo_correo ?? null,
      });

      if (ventanaWsp) {
        ventanaWsp.location.href = urlWsp;
      }
    } catch (err) {
      ventanaWsp?.close();
      alertar(mensajeErrorPago(err));
    } finally {
      setEnviando(false);
    }
  };

  // Arma el texto que llega al chat de WhatsApp del local: el pedido, el
  // total y el reclamo del comprobante de pago.
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
      lineas.push(`${i.cantidad}x ${i.nombre} - ${fmtCOP(i.precio * i.cantidad)}`);
    });
    lineas.push('------------------------');
    lineas.push(`Subtotal: ${fmtCOP(subtotal)}`);
    lineas.push(`Impuestos: ${fmtCOP(impuestos)}`);
    lineas.push(`*TOTAL: ${fmtCOP(total)}*`);
    lineas.push('------------------------');
    lineas.push(`Método de pago: ${ETIQUETA_PAGO[metodoPago] ?? metodoPago}`);
    if (metodoPago !== 'efectivo') {
      lineas.push(`Llave Bre-B: ${CUENTA_QR[metodoPago]?.llave ?? ''}`);
      lineas.push('*Adjunto el comprobante de pago por este chat.*');
    } else {
      lineas.push('Pago contra entrega.');
    }
    if (usarMismosDatos) {
      lineas.push('Facturación: mismos datos del cliente');
    } else {
      lineas.push(`Facturación: ${facturaNombre} ${facturaApellido} - Doc ${facturaDocumento}`);
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
            /* ---- Pedido registrado: confirmacion + acceso al chat ---- */
            <section className="checkout-card">
              <div className="checkout-encabezado">
                <h2>¡Pedido realizado con éxito!</h2>
                <p>
                  Te abrimos el chat de WhatsApp del local para que envíes el comprobante de pago
                  y el detalle del pedido.
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
                      <strong>Pedido {pedidoConfirmado.id ? `#${pedidoConfirmado.id}` : 'registrado'}</strong>
                      <p>Total a pagar: {fmtCOP(pedidoConfirmado.total)}</p>
                    </div>
                  </div>

                  <a
                    className="btn-pagar-ahora"
                    href={pedidoConfirmado.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Enviar comprobante por WhatsApp
                  </a>

                  <div className="checkout-grid-2">
                    <button
                      type="button"
                      className="btn-ubicacion"
                      onClick={() => navigate('/mis-pedidos')}
                    >
                      Ver mis pedidos
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
          ) : (
          <section className="checkout-card">
            <div className="checkout-encabezado">
              <h2>Finaliza tu pedido</h2>
              <p>Completa los pasos y paga con el método que prefieras.</p>
            </div>

            {/* ---- Paso 1: Entrega ---- */}
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
                  {avisoUbicacion && (<p className="checkout-aviso"><span></span> {avisoUbicacion}</p>)}

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

                </div>
              ) : (
                <div className="checkout-info-row">
                  <span className="checkout-info-icon">🕒</span>
                  <div>
                    <strong>{resumenEntrega}</strong>
                    <p>{cuando === 'Lo antes posible' ? 'Lo antes posible' : `${fechaProgramada} · ${horaProgramada}`}</p>
                  </div>
                </div>
              )}
            </div>

            {/* ---- Paso 2: Tus datos ---- */}
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

              <div className="checkout-subtitulo">Facturación electrónica</div>
              <label className="checkout-checkbox-row">
                <input type="checkbox" checked={usarMismosDatos} onChange={(e) => setUsarMismosDatos(e.target.checked)} />
                <span>Utilizar mi información para la facturación</span>
              </label>

              {!usarMismosDatos && (
                <div className="checkout-form" style={{ marginTop: 12 }}>
                  <div className="checkout-grid-2">
                    <div className="form-group">
                      <label>Nombre</label>
                      <input value={facturaNombre} onChange={(e) => setFacturaNombre(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Apellido</label>
                      <input value={facturaApellido} onChange={(e) => setFacturaApellido(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Número de documento</label>
                    <input value={facturaDocumento} onChange={(e) => setFacturaDocumento(e.target.value.replace(/\D/g, ''))} />
                  </div>
                </div>
              )}
            </div>

            {/* ---- Paso 3: Método de pago ---- */}
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
                        onChange={() => setMetodoPago(m.id)}
                      />
                      <span className={`pago-icono pago-icono-${m.id}`}>{m.icono}</span>
                      <span className="pago-chip-texto">{m.etiqueta}</span>
                    </label>
                  ))}
                </div>

                {metodoPago !== 'efectivo' && (
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
                      Al finalizar tu compra se abrirá WhatsApp para que envíes el comprobante de pago.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
          )}
        </div>

        {/* ---- Resumen / botón pagar ---- */}
        {!pedidoConfirmado && (
        <aside className="checkout-resumen">
          <div className="checkout-resumen-titulo">Tu pedido</div>
          <div className="checkout-resumen-items">
            {items.map((i) => (
              <div className="checkout-resumen-item" key={i.id}>
                <span className="checkout-resumen-item-nombre">{i.cantidad}x {i.nombre}</span>
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
      <Footer />
    </div>
  );
}
