import { estadoKey, textoEstado, type MateriaPrima } from '../types';

interface Props {
  materias: MateriaPrima[];
  marcaNombre: (id: number) => string;
  onEdit: (m: MateriaPrima) => void;
  onDelete: (id: number) => void;
}

export default function MateriaTabla({ materias, marcaNombre, onEdit, onDelete }: Props) {
  return (
    <div className="tabla-responsive">
      <table className="data-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Tipo</th>
            <th>Valor</th>
            <th>Stock</th>
            <th>Estado</th>
            <th>Marca</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {materias.map((m) => (
            <tr key={m.id}>
              <td style={{ fontWeight: 600 }}>{m.nombre}</td>
              <td>{m.tipo || '—'}</td>
              <td>${Number(m.valor).toLocaleString()}</td>
              <td>{m.cantidad}{m.unidad_medida ? ` ${m.unidad_medida}` : ''}</td>
              <td>
                <span className={`badge ${estadoKey(Number(m.cantidad) || 0) === 'agotado' ? 'badge-danger' : estadoKey(Number(m.cantidad) || 0) === 'bajo' ? 'badge-warning' : 'badge-success'}`}>
                  {textoEstado(Number(m.cantidad) || 0)}
                </span>
              </td>
              <td>{marcaNombre(m.marca_id)}</td>
              <td>
                <button className="btn-icon btn-icon-edit" onClick={() => onEdit(m)} title="Editar">✏</button>
                <button className="btn-icon btn-icon-del" onClick={() => onDelete(m.id)} title="Eliminar" style={{ marginLeft: 6 }}>🗑</button>
              </td>
            </tr>
          ))}
          {materias.length === 0 && (
            <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>No se encontraron insumos</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
