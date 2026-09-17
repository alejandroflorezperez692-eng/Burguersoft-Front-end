import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/client';
import '../styles/public.css';
import '../styles/checkout.css';
import PublicHeader from '../components/PublicHeader';
import Footer from '../components/Footer';
import logoPse from '../assets/img/pse.svg';
import logoBancolombia from '../assets/img/bancolombia.svg';
import logoEfectivo from '../assets/img/efectivo.svg';

const IVA_RATE = 0.08;
const TIPOS_DOCUMENTO = ['CC', 'CE', 'NIT', 'Pasaporte', 'Otro'];

function IconoLinea() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function IconoPSE() {
  return <img src={logoPse} alt="PSE" className="pago-logo-img" />;
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
  ciudad: string;
  referencia: string;
  lat: number | null;
  lng: number | null;
};

const direccionVacia: Direccion = { linea1: '', barrio: '', ciudad: '', referencia: '', lat: null, lng: null };

// WhatsApp del local (línea principal de Contáctanos: 311 538 7534)
const WHATSAPP_LOCAL = '573115387534';

const ETIQUETA_PAGO: Record<string, string> = {
  pse: 'PSE',
  bancolombia: 'Botón Bancolombia',
  efectivo: 'Efectivo (contra entrega)',
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

  // El AuthContext guarda "name" como nombre completo (nombre + apellido juntos),
  // así que lo separamos para llenar los dos campos del formulario.
  const partesNombre = (user?.name ?? '').trim().split(' ');
  const nombreInicial = partesNombre[0] ?? '';
  const apellidoInicial = partesNombre.slice(1).join(' ');

  // ---- Dirección de entrega (solo aplica si tipoEntrega === 'Domicilio') ----
  const [direccion, setDireccion] = useState<Direccion>(direccionVacia);
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);

    const usarUbicacionActual = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización. Ingresa la dirección manualmente.');
      return;
    }
    setBuscandoUbicacion(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&zoom=18`,
          );
          const data = await res.json();
          const a = data.address || {};

          const linea1 = [a.road, a.house_number].filter(Boolean).join(' #');

          // Nominatim usa distintos nombres de campo según el sector mapeado,
          // probamos varios antes de dejarlo vacío.
          const barrio =
            a.suburb || a.neighbourhood || a.quarter || a.residential ||
            a.city_district || a.borough || a.hamlet || a.locality || '';

          const ciudad =
            a.city || a.town || a.village || a.municipality || a.county || '';

          setDireccion({
            linea1: linea1 || data.display_name || '',
            barrio,
            ciudad,
            referencia: '',
            lat: latitude,
            lng: longitude,
          });

          if (!barrio) {
            showToastUbicacion('Ubicación encontrada. Completa el barrio manualmente, no estaba disponible en el mapa.');
          }
        } catch {
          alert('No se pudo obtener la dirección desde tu ubicación. Ingrésala manualmente.');
        } finally {
          setBuscandoUbicacion(false);
        }
      },
      () => {
        alert('No pudimos acceder a tu ubicación. Revisa los permisos del navegador.');
        setBuscandoUbicacion(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const [avisoUbicacion, setAvisoUbicacion] = useState<string | null>(null);
  const showToastUbicacion = (msg: string) => {
    setAvisoUbicacion(msg);
    setTimeout(() => setAvisoUbicacion(null), 4000);
  };
  
  const [tipoDocumento, setTipoDocumento] = useState('CC');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [nombre, setNombre] = useState(nombreInicial);
  const [apellido, setApellido] = useState(apellidoInicial);
  const [correo, setCorreo] = useState(user?.email ?? '');
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
  const [metodoPago, setMetodoPago] = useState<'pse' | 'bancolombia' | 'efectivo'>('pse');

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
    pse: 'PSE',
    bancolombia: 'Transferencia',
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
    if (requiereDireccion && (!direccion.linea1 || !direccion.ciudad)) {
      return 'Completa la dirección de entrega (o usa el botón de ubicación actual).';
    }
    if (!numeroDocumento || !nombre || !apellido || !correo || !telefono) {
      return 'Completa todos los datos de la compra.';
    }
    return null;
  };

  const pagarAhora = async () => {
    if (!isAuthenticated) {
      alert('Debes iniciar sesión para realizar el pago.');
      navigate('/login');
      return;
    }
    const error = validar();
    if (error) {
      alert(error);
      return;
    }

    // Se abre la pestaña de forma sincrónica (dentro del gesto del clic)
    // para que el navegador no la bloquee como ventana emergente.
    const ventanaWsp = window.open('', '_blank');

    setEnviando(true);
    try {
      await apiClient.post('/ventas', {
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

      const urlWsp = `https://wa.me/${WHATSAPP_LOCAL}?text=${encodeURIComponent(construirFacturaWhatsApp())}`;
      if (ventanaWsp) {
        ventanaWsp.location.href = urlWsp;
      } else {
        window.location.href = urlWsp;
      }

      vaciar();
      navigate('/');
      alert('¡Pedido realizado con éxito! Te abrimos el WhatsApp del local con tu factura.');
    } catch (err) {
      ventanaWsp?.close();
      alert(mensajeErrorPago(err));
    } finally {
      setEnviando(false);
    }
  };

  // Arma el texto de la factura que se envía al WhatsApp del local.
  const construirFacturaWhatsApp = (): string => {
    const lineas: string[] = [];
    const fechaPedido = new Date().toLocaleString('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    lineas.push('🧾 *NUEVO PEDIDO - BURGUERSOFT EL ORIENTE*');
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
      lineas.push(`Ciudad: ${direccion.ciudad}`);
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

  return (
    <div className="public-body checkout-wrapper">
      <PublicHeader />
      <div className="checkout-page">
      <div className="checkout-main">
        {/* ---- Dirección de entrega ---- */}
        <section className="checkout-card">
          <h3>{requiereDireccion ? 'Dirección de entrega' : 'Detalles del pedido'}</h3>

          {requiereDireccion ? (
            <div className="checkout-form">
              <button type="button" className="btn-ubicacion" onClick={usarUbicacionActual} disabled={buscandoUbicacion}>
                📍 {buscandoUbicacion ? 'Buscando tu ubicación...' : 'Usar mi ubicación actual'}
              </button>
              {avisoUbicacion && (<p className="checkout-aviso"><span>ℹ️</span> {avisoUbicacion}</p>)}

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
                <div className="form-group">
                  <label>Ciudad <span className="checkout-required">*</span></label>
                  <input value={direccion.ciudad} onChange={(e) => setDireccion({ ...direccion, ciudad: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label>Referencia (opcional)</label>
                <input
                  value={direccion.referencia}
                  onChange={(e) => setDireccion({ ...direccion, referencia: e.target.value })}
                  placeholder="Portón negro, casa esquinera..."
                />
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
        </section>

        {/* ---- Datos de la compra ---- */}
         <section className="checkout-card">
          <h3>Datos de la compra</h3>
          <div className="checkout-form">
            <div className="form-group">
              <label>Tipo de documento</label>
              <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)} disabled>
                {TIPOS_DOCUMENTO.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Número de documento</label>
              <input value={numeroDocumento} onChange={(e) => setNumeroDocumento(e.target.value.replace(/\D/g, ''))} placeholder="0000000000" disabled />
            </div>
            <div className="checkout-grid-2">
              <div className="form-group">
                <label>Nombre</label>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" disabled />
              </div>
              <div className="form-group">
                <label>Apellido</label>
                <input value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder="Apellido" disabled />
              </div>
            </div>
            <div className="form-group">
              <label>Correo electrónico</label>
              <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="hola@email.com" disabled />
            </div>
              <div className="form-group">
              <label>Teléfono</label>
              <input value={formatearTelefono(telefono)} placeholder="300 345 8970" disabled />
            </div>
          </div>
        </section>

        {/* ---- Facturación ---- */}
        <section className="checkout-card">
          <h3>Datos de facturación electrónica</h3>
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
        </section>

        {/* ---- Método de pago ---- */}
        <section className="checkout-card">
          <h3>Método de pago</h3>

          <label className="checkout-radio-row">
            <input type="radio" checked readOnly />
            <span className="pago-icono pago-icono-linea">
              <IconoLinea />
            </span>
            <span>Pago En Línea</span>
          </label>

          <div className="checkout-subopciones">

            <label className="checkout-radio-row">
              <input type="radio" name="metodo" checked={metodoPago === 'pse'} onChange={() => setMetodoPago('pse')} />
              <span className="pago-icono pago-icono-pse">
                <IconoPSE />
              </span>
              <span>Paga con PSE</span>
            </label>

            <label className="checkout-radio-row">
              <input type="radio" name="metodo" checked={metodoPago === 'bancolombia'} onChange={() => setMetodoPago('bancolombia')} />
              <span className="pago-icono pago-icono-bancolombia">
                <IconoBancolombia />
              </span>
              <span>Botón Bancolombia</span>
            </label>

            <label className="checkout-radio-row">
              <input type="radio" name="metodo" checked={metodoPago === 'efectivo'} onChange={() => setMetodoPago('efectivo')} />
              <span className="pago-icono pago-icono-efectivo">
                <IconoEfectivo />
              </span>
              <span>Pago contra entrega (efectivo)</span>
            </label>
          </div>
        </section>
      </div>

      {/* ---- Resumen / botón pagar ---- */}
        <aside className="checkout-resumen">
        <div className="checkout-resumen-rows">
          <div><span>Subtotal</span><span>${subtotal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span></div>
          <div><span>Impuestos</span><span>${impuestos.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span></div>
          <div className="checkout-resumen-total"><span>Total</span><span>${total.toLocaleString('es-CO')}</span></div>
        </div>
        <button className="btn-pagar-ahora" onClick={pagarAhora} disabled={enviando}>
          {enviando ? 'Procesando...' : 'Pagar ahora'}
        </button>
      </aside>
      </div>
      <Footer />
    </div>
  );
}