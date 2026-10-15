import { fechaCorta, type Compra } from '../types';

interface Props {
  compras: Compra[];
  onVerDetalle: (c: Compra) => void;
  onDelete: (id: number) => void;
}

export default function CompraTabla({ compras, onVerDetalle, onDelete }: Props) {
  return (
    <div className="tabla-responsive">
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Fecha</th>
            <th>Método de pago</th>
            <th>Total</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {compras.map((c) => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td>{fechaCorta(c.fecha)}</td>
              <td><span className="badge badge-info">{c.metodo_pago ?? '—'}</span></td>
              <td style={{ fontWeight: 700 }}>${Number(c.valor_total ?? 0).toLocaleString()}</td>
              <td>
                <button className="btn-icon btn-icon-edit" onClick={() => onVerDetalle(c)} title="Ver detalle">👁</button>
                <button className="btn-icon btn-icon-del" onClick={() => onDelete(c.id)} title="Eliminar" style={{ marginLeft: 6 }}>🗑</button>
              </td>
            </tr>
          ))}
          {compras.length === 0 && (
            <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>No se encontraron compras</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
