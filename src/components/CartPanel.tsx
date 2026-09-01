import { useState } from 'react';
import { useCart } from '../hooks/useCart';
import FacturaModal from './FacturaModal';
import apiClient from '../api/client';

export default function CartPanel() {
  const { items, total, isOpen, close, quitar, actualizarCantidad, vaciar } = useCart();
  const [showFactura, setShowFactura] = useState(false);
  const [comprando, setComprando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

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
    setComprando(true);
    try {
      // intenta enviar al backend como venta
      await apiClient.post('/venta', {
        productos: items.map((i) => ({ id: i.id, cantidad: i.cantidad, precio: i.precio })),
        total,
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {items.map((it) => (
                <div key={String(it.id)} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px', background: '#F7F2EA', borderRadius: 10 }}>
                  {it.imagen && <img src={it.imagen} alt={it.nombre} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1410' }}>{it.nombre}</div>
                    <div style={{ fontSize: 12, color: '#7A6855' }}>${it.precio.toLocaleString('es-CO')} x {it.cantidad} = ${(it.precio * it.cantidad).toLocaleString('es-CO')}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => actualizarCantidad(it.id, it.cantidad - 1)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #E0D5C5', background: '#fff', cursor: 'pointer' }}>-</button>
                    <span style={{ minWidth: 20, textAlign: 'center', fontSize: 13 }}>{it.cantidad}</span>
                    <button onClick={() => actualizarCantidad(it.id, it.cantidad + 1)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #E0D5C5', background: '#fff', cursor: 'pointer' }}>+</button>
                  </div>
                  <button onClick={() => quitar(it.id)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#e63946', fontSize: 18 }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="cart-footer">
          <div className="subtotal">
            <span>Total a pagar:</span>
            <strong id="cartTotal">${total.toLocaleString('es-CO')}</strong>
          </div>
          <div className="cart-actions-grid">
            <button type="button" className="btn-cart-action btn-vaciar" onClick={handleVaciar}>Vaciar Carrito</button>
            <button type="button" className="btn-cart-action" onClick={() => { if (items.length===0) showToast('El carrito está vacío.'); else setShowFactura(true); }}>Ver Factura</button>
          </div>
          <button className="btn-checkout" disabled={items.length === 0 || comprando} onClick={handleCheckout} style={{ opacity: items.length===0?0.5:1, cursor: items.length===0?'not-allowed':'pointer' }}>
            {comprando ? 'Procesando...' : 'Finalizar Compra'}
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
