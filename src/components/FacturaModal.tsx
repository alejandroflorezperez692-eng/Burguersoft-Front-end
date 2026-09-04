import { useCart } from '../hooks/useCart';

export default function FacturaModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { items, total } = useCart();

  if (!isOpen) return null;

  const fecha = new Date().toLocaleString('es-CO');

  const handlePrint = () => window.print();

  return (
    <>
      <div id="modalFacturaOverlay" className="fac-show" onClick={onClose} style={{
        display: 'block', position: 'fixed', inset: 0, background: 'rgba(26,9,13,.6)', backdropFilter: 'blur(4px)', zIndex: 10002
      }} />
      <div id="modalFactura" className="fac-show" style={{
        display: 'block', position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 'min(520px,94vw)', maxHeight: '85vh', overflowY: 'auto', background: '#fff', borderRadius: 16,
        boxShadow: '0 20px 60px rgba(26,9,13,.35)', zIndex: 10003, fontFamily: 'Lato,sans-serif'
      }}>
        <div style={{ background: '#1a090d', color: 'white', padding: '20px 24px', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 8 }}>FACTURA</div>
            <div style={{ fontSize: 11, opacity: .6, marginTop: 2 }}>El Oriente — BurguerSoft</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: 'white', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ textAlign: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '2px dashed #E0D5C5' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#1C1410', letterSpacing: 1, fontFamily: 'Playfair Display,serif' }}>El Oriente</div>
            <div style={{ fontSize: 11, color: '#7A6855', marginTop: 4, letterSpacing: '.5px', textTransform: 'uppercase' }}>{fecha}</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
            <thead>
              <tr style={{ background: '#F7F2EA' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', color: '#7A6855', borderRadius: '6px 0 0 6px' }}>Producto</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', color: '#7A6855' }}>Cant</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', color: '#7A6855' }}>Precio</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', color: '#7A6855', borderRadius: '0 6px 6px 0' }}>Subtotal</th>
              </tr>
            </thead>
            <tbody style={{ color: '#1C1410' }}>
              {items.map((it) => (
                <tr key={String(it.id)}>
                  <td style={{ padding: '8px 10px' }}>{it.nombre}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>{it.cantidad}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>${Number(it.precio ?? 0).toLocaleString('es-CO')}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>${(Number(it.precio ?? 0) * Number(it.cantidad ?? 0)).toLocaleString('es-CO')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ borderTop: '2px dashed #E0D5C5', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#7A6855', textTransform: 'uppercase', letterSpacing: '.5px' }}>Total a pagar</span>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#EF9F27' }}>${Number(total ?? 0).toLocaleString('es-CO')}</span>
          </div>
          <div style={{ marginTop: 16, padding: '10px 14px', background: '#FFF8EE', border: '1px solid #FAEEDA', borderRadius: 8, fontSize: 11, color: '#7A6855', textAlign: 'center' }}>
            ¡Gracias por tu compra! Este es un resumen antes de confirmar tu pedido.
          </div>
        </div>
        <div style={{ padding: '0 24px 24px', display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 11, borderRadius: 10, border: '1px solid #E0D5C5', background: '#F0EAE0', color: '#7A6855', fontWeight: 600, fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>Cerrar</button>
          <button onClick={handlePrint} style={{ flex: 1, padding: 11, borderRadius: 10, border: 'none', background: '#EF9F27', color: '#412402', fontWeight: 700, fontFamily: 'inherit', fontSize: 13, cursor: 'pointer', boxShadow: '0 2px 12px rgba(239,159,39,.3)' }}>Imprimir</button>
        </div>
      </div>
    </>
  );
}
