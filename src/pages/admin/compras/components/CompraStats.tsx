interface Props {
  comprasMes: number;
  totalMes: number;
  totalHisto: number;
}

export default function CompraStats({ comprasMes, totalMes, totalHisto }: Props) {
  return (
    <div className="stat-grid">
      <div className="stat-card">
        <span className="stat-label">Compras este mes</span>
        <span className="stat-val">{comprasMes}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Invertido este mes</span>
        <span className="stat-val">${totalMes.toLocaleString()}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Total histórico</span>
        <span className="stat-val">${totalHisto.toLocaleString()}</span>
      </div>
    </div>
  );
}
