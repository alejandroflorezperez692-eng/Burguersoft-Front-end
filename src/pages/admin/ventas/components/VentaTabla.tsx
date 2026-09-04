import { desglosarIVA } from '../../../../utils/iva';
import { ESTADOS, type Venta } from '../types';

interface Props {
  ventas: Venta[];
  onEstado: (id: number, estado: string) => void;
  onCancelar: (id: number) => void;
}

export default function VentaTabla({ ventas, onEstado, onCancelar }: Props) {
  return (
    <div className="tabla-responsive">
      <table className="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Productos</th>
            <th>Total</th>
            <th>IVA 19%</th>
            <th>Método</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {ventas.map((v) => (
            <tr key={v.id}>
              <td>{v.id}</td>
              <td>
                <div className="venta-detalles">
                  {(v.detalles ?? []).map((d) => (
                    <span key={d.id} style={{ fontSize: 12, color: 'var(--text-600)' }}>
                      {d.producto?.nombre ?? 'Producto'} x{d.cantidad}
                    </span>
                  ))}
                  {(v.promociones ?? []).map((p) => (
                    <span key={p.id} className="badge badge-info" style={{ fontSize: 10 }}>{p.nombre ?? 'Promo'}</span>
                  ))}
                  {(v.detalles ?? []).length === 0 && (v.promociones ?? []).length === 0 && (
                    <span style={{ fontSize: 12, color: 'var(--text-400)' }}>—</span>
                  )}
                </div>
              </td>
              <td style={{ fontWeight: 700 }}>${Number(v.valor_total ?? 0).toLocaleString()}</td>
              <td style={{ fontSize: 12, color: 'var(--text-600)' }}>${desglosarIVA(Number(v.valor_total ?? 0)).iva.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
              <td><span className="badge badge-info">{v.metodo_pago ?? '—'}</span></td>
              <td>
                <select
                  value={v.estado}
                  onChange={(e) => onEstado(v.id, e.target.value)}
                  style={{ padding: '4px 8px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  {ESTADOS.map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </td>
              <td>
                <button className="btn-icon btn-icon-del" onClick={() => onCancelar(v.id)} title="Cancelar">🗑</button>
              </td>
            </tr>
          ))}
          {ventas.length === 0 && (
            <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>No se encontraron ventas</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
