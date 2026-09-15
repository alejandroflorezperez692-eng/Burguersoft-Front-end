import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/client';
import '../styles/checkout.css';
import Footer from '../components/Footer';

const IVA_RATE = 0.08;
const TIPOS_DOCUMENTO = ['CC', 'CE', 'NIT', 'Pasaporte', 'Otro'];

type Direccion = {
  linea1: string;
  barrio: string;
  ciudad: string;
  referencia: string;
  lat: number | null;
  lng: number | null;
};

const direccionVacia: Direccion = { linea1: '', barrio: '', ciudad: '', referencia: '', lat: null, lng: null };

export default function Checkout() {
  const { items, total, vaciar, tipoEntrega, cuando, fechaProgramada, horaProgramada } = useCart();
  const { usuario } = useAuth() as any; // si tu AuthContext expone otro nombre de campo, ajústalo aquí
  const navigate = useNavigate();

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
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
          );
          const data = await res.json();
          const a = data.address || {};
          const linea1 = [a.road, a.house_number].filter(Boolean).join(' #');
          setDireccion({
            linea1: linea1 || data.display_name || '',
            barrio: a.suburb || a.neighbourhood || a.quarter || '',
            ciudad: a.city || a.town || a.village || a.county || '',
            referencia: '',
            lat: latitude,
            lng: longitude,
          });
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

  // ---- Datos de la compra ----
  const [tipoDocumento, setTipoDocumento] = useState('CC');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [nombre, setNombre] = useState(usuario?.nombre ?? '');
  const [apellido, setApellido] = useState(usuario?.apellido ?? '');
  const [correo, setCorreo] = useState(usuario?.correo ?? '');
  const [telefono, setTelefono] = useState('');

  // ---- Facturación ----
  const [usarMismosDatos, setUsarMismosDatos] = useState(true);
  const [facturaNombre, setFacturaNombre] = useState('');
  const [facturaApellido, setFacturaApellido] = useState('');
  const [facturaDocumento, setFacturaDocumento] = useState('');

  // ---- Método de pago ----
  const [metodoPago, setMetodoPago] = useState<'tarjeta' | 'pse' | 'bancolombia' | 'efectivo'>('tarjeta');
  const [nombreTitular, setNombreTitular] = useState('');
  const [numeroTarjeta, setNumeroTarjeta] = useState('');
  const [expiracion, setExpiracion] = useState('');
  const [cvv, setCvv] = useState('');

  const [enviando, setEnviando] = useState(false);

  const subtotal = total / (1 + IVA_RATE);
  const impuestos = total - subtotal;

  // Formatea "1234123412341234" -> "1234 1234 1234 1234"
  const formatearTarjeta = (v: string) =>
    v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

  // Formatea "1225" -> "12/25"
  const formatearExpiracion = (v: string) => {
    const num = v.replace(/\D/g, '').slice(0, 4);
    return num.length > 2 ? `${num.slice(0, 2)}/${num.slice(2)}` : num;
  };

  const requiereDireccion = tipoEntrega === 'Domicilio';

  const validar = (): string | null => {
    if (items.length === 0) return 'Tu carrito está vacío.';
    if (requiereDireccion && (!direccion.linea1 || !direccion.ciudad)) {
      return 'Completa la dirección de entrega (o usa el botón de ubicación actual).';
    }
    if (!numeroDocumento || !nombre || !apellido || !correo || !telefono) {
      return 'Completa todos los datos de la compra.';
    }
    if (metodoPago === 'tarjeta' && (!nombreTitular || numeroTarjeta.replace(/\s/g, '').length < 16 || !expiracion || cvv.length < 3)) {
      return 'Completa correctamente los datos de la tarjeta.';
    }
    return null;
  };

  const pagarAhora = async () => {
    const error = validar();
    if (error) {
      alert(error);
      return;
    }
    setEnviando(true);
    try {
      await apiClient.post('/venta', {
        productos: items.map((i) => ({ id: i.id, cantidad: i.cantidad, precio: i.precio })),
        total,
        tipo_entrega: tipoEntrega,
        cuando,
        fecha_programada: cuando === 'Programar para más tarde' ? `${fechaProgramada}T${horaProgramada}` : null,
        direccion: requiereDireccion ? direccion : null,
        cliente: { tipoDocumento, numeroDocumento, nombre, apellido, correo, telefono },
        facturacion: usarMismosDatos
          ? { tipoDocumento, numeroDocumento, nombre, apellido }
          : { nombre: facturaNombre, apellido: facturaApellido, numeroDocumento: facturaDocumento },
        metodo_pago: metodoPago,
      });
      vaciar();
      navigate('/');
      alert('¡Pedido realizado con éxito!');
    } catch {
      alert('No se pudo procesar el pago. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  const resumenEntrega = useMemo(() => {
    if (tipoEntrega === 'Domicilio') return 'Domicilio';
    if (tipoEntrega === 'Para recoger') return 'Para llevar';
    return 'En restaurante';
  }, [tipoEntrega]);

  return (
    <>
    <div className="checkout-page">
      <div className="checkout-main">
        {/* ---- Dirección de entrega ---- */}
        <section className="checkout-card">
          <h3>Dirección de entrega</h3>

          {requiereDireccion ? (
            <div className="checkout-form">
              <button type="button" className="btn-ubicacion" onClick={usarUbicacionActual} disabled={buscandoUbicacion}>
                📍 {buscandoUbicacion ? 'Buscando tu ubicación...' : 'Usar mi ubicación actual'}
              </button>

              <div className="form-group">
                <label>Dirección</label>
                <input
                  value={direccion.linea1}
                  onChange={(e) => setDireccion({ ...direccion, linea1: e.target.value })}
                  placeholder="Calle 10 # 20-30"
                />
              </div>
              <div className="checkout-grid-2">
                <div className="form-group">
                  <label>Barrio</label>
                  <input value={direccion.barrio} onChange={(e) => setDireccion({ ...direccion, barrio: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Ciudad</label>
                  <input value={direccion.ciudad} onChange={(e) => setDireccion({ ...direccion, ciudad: e.target.value })} />
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
              <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)}>
                {TIPOS_DOCUMENTO.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Número de documento</label>
              <input value={numeroDocumento} onChange={(e) => setNumeroDocumento(e.target.value.replace(/\D/g, ''))} placeholder="0000000000" />
            </div>
            <div className="checkout-grid-2">
              <div className="form-group">
                <label>Nombre</label>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" />
              </div>
              <div className="form-group">
                <label>Apellido</label>
                <input value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder="Apellido" />
              </div>
            </div>
            <div className="form-group">
              <label>Correo electrónico</label>
              <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="hola@email.com" />
            </div>
            <div className="form-group">
              <label>Número de teléfono</label>
              <div className="checkout-telefono">
                <span>🇨🇴 +57</span>
                <input value={telefono} onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))} placeholder="300 345 8970" maxLength={10} />
              </div>
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
            <span>Pago En Línea</span>
          </label>

          <div className="checkout-subopciones">
            <label className="checkout-radio-row">
              <input type="radio" name="metodo" checked={metodoPago === 'tarjeta'} onChange={() => setMetodoPago('tarjeta')} />
              <span>💳 Tarjeta de crédito o débito</span>
            </label>

            {metodoPago === 'tarjeta' && (
              <div className="checkout-form" style={{ paddingLeft: 26 }}>
                <div className="form-group">
                  <label>Nombre del titular</label>
                  <input value={nombreTitular} onChange={(e) => setNombreTitular(e.target.value)} placeholder="Nombre en tarjeta" />
                </div>
                <div className="form-group">
                  <label>Número de tarjeta</label>
                  <input
                    value={numeroTarjeta}
                    onChange={(e) => setNumeroTarjeta(formatearTarjeta(e.target.value))}
                    placeholder="0000 0000 0000 0000"
                  />
                </div>
                <div className="checkout-grid-2">
                  <div className="form-group">
                    <label>Fecha de expiración</label>
                    <input
                      value={expiracion}
                      onChange={(e) => setExpiracion(formatearExpiracion(e.target.value))}
                      placeholder="MM / AA"
                      maxLength={5}
                    />
                  </div>
                  <div className="form-group">
                    <label>Código de seguridad</label>
                    <input
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="000"
                      maxLength={4}
                    />
                  </div>
                </div>
              </div>
            )}

            <label className="checkout-radio-row">
              <input type="radio" name="metodo" checked={metodoPago === 'pse'} onChange={() => setMetodoPago('pse')} />
              <span>Paga con PSE</span>
            </label>

            <label className="checkout-radio-row">
              <input type="radio" name="metodo" checked={metodoPago === 'bancolombia'} onChange={() => setMetodoPago('bancolombia')} />
              <span>Botón Bancolombia</span>
            </label>

            <label className="checkout-radio-row">
              <input type="radio" name="metodo" checked={metodoPago === 'efectivo'} onChange={() => setMetodoPago('efectivo')} />
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
    </>
  );
}