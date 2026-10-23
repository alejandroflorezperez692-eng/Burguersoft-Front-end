export interface DiaEstadistica {
  dia: string;
  total: number;
  pedidos: number;
}

export interface ProductoEstadistica {
  nombre: string;
  cantidad: number;
}

export interface PagoEstadistica {
  metodo: string;
  total: number;
}

export interface EstadisticasVentas {
  dias: number;
  total_periodo: number;
  pedidos_periodo: number;
  total_previo: number;
  ventas_hoy: number;
  ingresos_hoy: number;
  total_ventas: number;
  ingresos_totales: number;
  por_dia: DiaEstadistica[];
  por_producto: ProductoEstadistica[];
  por_pago: PagoEstadistica[];
}
