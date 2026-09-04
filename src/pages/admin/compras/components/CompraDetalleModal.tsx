import { fechaCorta, type Compra } from '../types';

interface Props {
  compra: Compra;
  materiaNombre: (id: number) => string;
  marcaNombre: (id: number) => string;
  onClose: () => void;
}

export default function CompraDetalleModal({ compra, materiaNombre, marcaNombre, onClose }: Props) {
  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <h2>Factura Compra #{compra.id}</h2>
        <p style={{ marginBottom: 8, fontSize: 13, color: 'var(--text-400)' }}>
          {fechaCorta(compra.fecha)} — {compra.metodo_pago ?? '—'}
        </p>
        <div className="tabla-responsive" style={{ marginBottom: 16 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Proveedor</th>
                <th>Cant.</th>
                <th>Precio Unit.</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {(compra.detalles ?? []).map((d) => (
                <tr key={d.id}>
                  <td>{materiaNombre(d.materia_prima_id)}</td>
                  <td>{marcaNombre(d.marca_id)}</td>
                  <td>{d.cantidad}</td>
                  <td>${Number(d.precio_unitario ?? 0).toLocaleString()}</td>
                  <td style={{ fontWeight: 600 }}>${Number(d.subtotal ?? 0).toLocaleString()}</td>
                </tr>
              ))}
              {(compra.detalles ?? []).length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: 'var(--text-400)' }}>Sin detalle</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ textAlign: 'right', fontWeight: 800, fontSize: 16 }}>
          Total: ${Number(compra.valor_total ?? 0).toLocaleString()}
        </div>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
