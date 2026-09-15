import { useState } from 'react';
import { useCart } from '../hooks/useCart';
import FacturaModal from './FacturaModal';
import apiClient from '../api/client';

const IVA_RATE = 0.08; // IVA reducido para servicio de alimentos; ajusta si tu tasa real es distinta
const TIPOS_ENTREGA = ['Domicilio', 'Para recoger', 'En restaurante'] as const;
const CUANDO_OPCIONES = ['Lo antes posible', 'Programar para más tarde'] as const;

// Mismos horarios que ya tienes en el footer. 0 = domingo ... 6 = sábado.
const HORARIOS: Record<number, { inicio: string; fin: string } | null> = {
  0: { inicio: '15:00', fin: '22:00' }, // Domingo
  1: { inicio: '15:30', fin: '22:00' }, // Lunes
  2: { inicio: '15:30', fin: '22:00' },
  3: { inicio: '15:30', fin: '22:00' },
  4: { inicio: '15:30', fin: '22:00' },
  5: { inicio: '15:30', fin: '22:00' },
  6: { inicio: '15:00', fin: '23:00' }, // Sábado
};

function obtenerRangoHorario(fechaStr: string): { min: string; max: string } | null {
  if (!fechaStr) return null;
  const fecha = new Date(`${fechaStr}T00:00:00`);
  const horario = HORARIOS[fecha.getDay()];
  if (!horario) return null;

  const ahora = new Date();
  const esHoy = fechaStr === ahora.toISOString().slice(0, 10);
  if (!esHoy) return { min: horario.inicio, max: horario.fin };

  // Si es hoy, el mínimo no puede ser antes de la hora actual + 20 min de margen
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes() + 20;
  const [hIni, mIni] = horario.inicio.split(':').map(Number);
  const minutosIni = hIni * 60 + mIni;
  const minutosMin = Math.max(minutosAhora, minutosIni);
  const min = `${String(Math.floor(minutosMin / 60)).padStart(2, '0')}:${String(minutosMin % 60).padStart(2, '0')}`;
  return { min, max: horario.fin };
}

function horaValida(fechaStr: string, horaStr: string): boolean {
  const rango = obtenerRangoHorario(fechaStr);
  if (!rango || !horaStr) return false;
  return horaStr >= rango.min && horaStr <= rango.max;
}

export default function CartPanel() {
  const { items, total, isOpen, close, quitar, actualizarCantidad, vaciar } = useCart();
  const [showFactura, setShowFactura] = useState(false);
  const [comprando, setComprando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [tipoEntrega, setTipoEntrega] = useState<(typeof TIPOS_ENTREGA)[number]>(TIPOS_ENTREGA[0]);
  const [cuando, setCuando] = useState<(typeof CUANDO_OPCIONES)[number]>(CUANDO_OPCIONES[0]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState('');
  const [horaSeleccionada, setHoraSeleccionada] = useState('');
  const [confirmado, setConfirmado] = useState(false);

  const rangoHorario = obtenerRangoHorario(fechaSeleccionada);
  const hoyStr = new Date().toISOString().slice(0, 10);

  const descuentos = 0; // placeholder hasta que exista lógica de cupones
  const subtotal = total / (1 + IVA_RATE);
  const impuestos = total - subtotal;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleVaciar = () => {
    if (items.length === 0) { showToast('No hay productos en el carrito para vaciarlo.'); return; }
    if (!confirm('¿Estás seguro de que deseas vaciar el carrito?')) return;
    vaciar();
    showToast('Tu carrito ha sido vaciado.');
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;
    if (cuando === 'Programar para más tarde') {
      if (!fechaSeleccionada || !horaSeleccionada) {
        showToast('Selecciona la fecha y la hora para tu pedido programado.');
        return;
      }
      if (!horaValida(fechaSeleccionada, horaSeleccionada)) {
        showToast(`Elige una hora entre ${rangoHorario?.min ?? ''} y ${rangoHorario?.max ?? ''} para ese día.`);
        return;
      }
    }
    setComprando(true);
    try {
      // intenta enviar al backend como venta
      await apiClient.post('/venta', {
        productos: items.map((i) => ({ id: i.id, cantidad: i.cantidad, precio: i.precio })),
        total,
        tipo_entrega: tipoEntrega,
        cuando,
        fecha_programada: cuando === 'Programar para más tarde' ? `${fechaSeleccionada}T${horaSeleccionada}` : null,
      });
      showToast('Compra finalizada con éxito.');
      vaciar();
      close();
    } catch {
      // fallback demo: simula éxito si backend no está
      showToast('Compra simulada - backend no configurado. Carrito vaciado.');
      vaciar();
      close();
    } finally {
      setComprando(false);
    }
  };

  return (
    <>
      <div className={`cart-panel ${isOpen ? 'active' : ''}`} id="cartPanel" style={{ visibility: isOpen ? 'visible' : 'hidden' }}>
        <div className="cart-header-title">
          <span>MI CARRITO</span>
          <button className="close-cart" onClick={close}>&times;</button>
        </div>

        <div className="cart-entrega-toggle">
          {TIPOS_ENTREGA.map((t) => (
            <button
              key={t}
              type="button"
              className={tipoEntrega === t ? 'active' : ''}
              onClick={() => setTipoEntrega(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="cart-cuando-row">
          <span className="cart-cuando-label">Cuándo:</span>
          <select value={cuando} onChange={(e) => setCuando(e.target.value as (typeof CUANDO_OPCIONES)[number])}>
            {CUANDO_OPCIONES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {cuando === 'Programar para más tarde' && (
          <div className="cart-fecha-row">
            <input
              type="date"
              value={fechaSeleccionada}
              min={hoyStr}
              onChange={(e) => { setFechaSeleccionada(e.target.value); setHoraSeleccionada(''); }}
            />
            {fechaSeleccionada && rangoHorario && (
              <>
                <input
                  type="time"
                  value={horaSeleccionada}
                  min={rangoHorario.min}
                  max={rangoHorario.max}
                  onChange={(e) => setHoraSeleccionada(e.target.value)}
                />
                <p className="cart-hora-hint">Horario disponible ese día: {rangoHorario.min} - {rangoHorario.max}</p>
                {horaSeleccionada && !horaValida(fechaSeleccionada, horaSeleccionada) && (
                  <p className="cart-hora-error">Esa hora está fuera del horario de atención.</p>
                )}
              </>
            )}
          </div>
        )}

        <div className="cart-items" id="cartItems">
          {items.length === 0 ? (
            <div className="empty-cart" id="emptyCart">
              <svg viewBox="0 0 24 24" width={80} height={80} style={{ stroke: '#ccc', fill: 'none', marginBottom: 15 }}>
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
              <p>Tu carrito está vacío</p>
            </div>
          ) : (
            <div className="cart-item-list">
              {items.map((it) => (
                <div key={String(it.id)} className="cart-item-row">
                  <div className="cart-item-top">
                    {it.imagen && <img src={it.imagen} alt={it.nombre} className="cart-item-img" />}
                    <div className="cart-item-info">
                      <div className="cart-item-name">{it.nombre}</div>
                      {it.descripcion && <div className="cart-item-desc">{it.descripcion}</div>}
                    </div>
                    <div className="cart-item-price">${(it.precio * it.cantidad).toLocaleString('es-CO')}</div>
                  </div>
                  <div className="cart-item-actions">
                    <button type="button" className="link-action link-eliminar" onClick={() => quitar(it.id)}>Eliminar</button>
                    <div className="cart-item-edit">
                      <span className="link-action link-editar">Editar</span>
                      <div className="qty-stepper">
                        <button type="button" onClick={() => actualizarCantidad(it.id, it.cantidad - 1)}>−</button>
                        <span>{it.cantidad}</span>
                        <button type="button" onClick={() => actualizarCantidad(it.id, it.cantidad + 1)}>+</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" className="btn-vaciar-pill" onClick={handleVaciar}>Vaciar carrito</button>
            </div>
          )}
        </div>
        <div className="cart-footer">
          <div className="cart-breakdown">
            <div className="cart-breakdown-row"><span>Subtotal:</span><span>${subtotal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span></div>
            <div className="cart-breakdown-row"><span>Descuentos:</span><span className="cart-descuento">-${descuentos.toLocaleString('es-CO')}</span></div>
            <div className="cart-breakdown-row"><span>Impuestos:</span><span>${impuestos.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span></div>
            <div className="cart-breakdown-row cart-breakdown-total"><span>Total a pagar:</span><span id="cartTotal">${total.toLocaleString('es-CO')}</span></div>
          </div>

          <label className="cart-confirm-row">
            <input type="checkbox" checked={confirmado} onChange={(e) => setConfirmado(e.target.checked)} />
            <span>
              Confirmo que quiero hacer mi pedido para <strong>{tipoEntrega}</strong>
            </span>
          </label>

          <button
            className="btn-ir-pagar"
            disabled={items.length === 0 || comprando || !confirmado}
            onClick={handleCheckout}
          >
            <span>{comprando ? 'Procesando...' : 'Ir a pagar'}</span>
            <span>${total.toLocaleString('es-CO')}</span>
          </button>
        </div>
      </div>

      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: '#2f2a1f', color: '#fff', border: '2.5px solid #E8821A', padding: '12px 20px', borderRadius: 10,
          fontSize: 13, fontWeight: 600, zIndex: 99999, boxShadow: '0 8px 20px rgba(0,0,0,.25)'
        }}>{toast}</div>
      )}

      <FacturaModal isOpen={showFactura} onClose={() => setShowFactura(false)} />
    </>
  );
}