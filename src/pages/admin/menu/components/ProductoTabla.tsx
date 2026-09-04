import type { Producto } from '../types';
import ProductoThumb from './ProductoThumb';

interface Props {
  grouped: Record<string, Producto[]>;
  onEdit: (p: Producto) => void;
  onDelete: (id: number) => void;
}

export default function ProductoTabla({ grouped, onEdit, onDelete }: Props) {
  if (Object.keys(grouped).length === 0) {
    return <p style={{ textAlign: 'center', padding: 40, color: 'var(--text-400)' }}>No se encontraron productos</p>;
  }
  return (
    <>
      {Object.entries(grouped).map(([cat, prods]) => (
        <div key={cat} style={{ marginBottom: 28 }}>
          <div className="meta-bar">
            <span>{cat} ({prods.length})</span>
          </div>
          <div className="tabla-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Precio</th>
                  <th>Descripción</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {prods.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <ProductoThumb img={p.img} nombre={p.nombre} />
                        <span style={{ fontWeight: 600 }}>{p.nombre}</span>
                      </div>
                    </td>
                    <td>${Number(p.valor).toLocaleString()}</td>
                    <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.descripcion || '—'}
                    </td>
                    <td>
                      <button className="btn-icon btn-icon-edit" onClick={() => onEdit(p)} title="Editar">✏</button>
                      <button className="btn-icon btn-icon-del" onClick={() => onDelete(p.id)} title="Eliminar" style={{ marginLeft: 6 }}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  );
}
