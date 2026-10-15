interface Props {
  ventasHoy: number;
  ingresosHoy: number;
  ivaHoy: number;
  totalVentas: number;
  ingresosTotal: number;
  ivaTotal: number;
}

export default function VentaStats({ ventasHoy, ingresosHoy, ivaHoy, totalVentas, ingresosTotal, ivaTotal }: Props) {
  return (
    <div className="stat-grid">
      <div className="stat-card">
        <span className="stat-label">Ventas hoy</span>
        <span className="stat-val">{ventasHoy}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Ingresos hoy</span>
        <span className="stat-val">${ingresosHoy.toLocaleString()}</span>
        <span className="stat-sub">IVA 19% incl.: ${ivaHoy.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Total ventas</span>
        <span className="stat-val">{totalVentas}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Ingresos totales</span>
        <span className="stat-val">${ingresosTotal.toLocaleString()}</span>
        <span className="stat-sub">IVA 19% incl.: ${ivaTotal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
      </div>
    </div>
  );
}
