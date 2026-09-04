interface Props {
  total: number;
  disponibles: number;
  agotados: number;
  valorInv: number;
}

export default function MateriaStats({ total, disponibles, agotados, valorInv }: Props) {
  return (
    <div className="stat-grid">
      <div className="stat-card">
        <span className="stat-label">Total insumos</span>
        <span className="stat-val">{total}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Disponibles</span>
        <span className="stat-val">{disponibles}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Agotados</span>
        <span className="stat-val">{agotados}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Valor inventario</span>
        <span className="stat-val" style={{ fontSize: 24 }}>${valorInv.toLocaleString()}</span>
      </div>
    </div>
  );
}
