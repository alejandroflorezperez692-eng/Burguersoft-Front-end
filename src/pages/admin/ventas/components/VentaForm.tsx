import { desglosarIVA } from '../../../../utils/iva';
import { METODOS, TIPOS_ENTREGA, type Producto } from '../types';

interface Props {
  productos: Producto[];
  productoId: number;
  setProductoId: (v: number) => void;
  cantidad: string;
  setCantidad: (v: string) => void;
  metodoPago: string;
  setMetodoPago: (v: string) => void;
  tipoEntrega: string;
  setTipoEntrega: (v: string) => void;
  selectedProd?: Producto;
  onCancel: () => void;
  onSave: () => void;
}

export default function VentaForm({
  productos, productoId, setProductoId, cantidad, setCantidad,
  metodoPago, setMetodoPago, tipoEntrega, setTipoEntrega,
  selectedProd, onCancel, onSave,
}: Props) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 28, marginBottom: 28, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--text-900)' }}>Registrar Venta</h3>
      <div className="grid-registro">
        <div className="form-group">
          <label>Producto</label>
          <select value={productoId} onChange={(e) => setProductoId(Number(e.target.value))}>
            <option value={0}>Seleccionar...</option>
            {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre} — ${Number(p.valor).toLocaleString()}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Cantidad</label>
          <input type="number" min={1} value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Método de pago</label>
          <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
            {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Tipo de entrega</label>
          <select value={tipoEntrega} onChange={(e) => setTipoEntrega(e.target.value)}>
            {TIPOS_ENTREGA.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>
      {selectedProd && (
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-900)' }}>
          Subtotal: ${(Number(selectedProd.valor) * Number(cantidad || 0)).toLocaleString()} (IVA incl.: $
          {desglosarIVA(Number(selectedProd.valor) * Number(cantidad || 0)).iva.toLocaleString('es-CO', { maximumFractionDigits: 0 })})
        </p>
      )}
      <div className="modal-actions" style={{ marginTop: 8 }}>
        <button className="btn-cancel" onClick={onCancel}>Cancelar</button>
        <button className="btn-save" onClick={onSave}>Registrar</button>
      </div>
    </div>
  );
}
