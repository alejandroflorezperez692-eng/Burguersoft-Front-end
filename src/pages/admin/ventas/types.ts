// Tipos y constantes del módulo Ventas.
export interface DetalleVenta {
  id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  producto?: { id?: number; nombre?: string };
}

export interface PromocionVenta {
  id: number;
  nombre?: string;
}

export interface Venta {
  id: number;
  fecha: string;
  valor_total: number;
  metodo_pago: string;
  estado: string;
  tipo_entrega?: string;
  detalles?: DetalleVenta[];
  promociones?: PromocionVenta[];
}

export interface Producto {
  id: number;
  nombre: string;
  valor: number;
}

export const METODOS = ['Efectivo', 'Tarjeta', 'Transferencia', 'Nequi', 'Daviplata', 'PSE'];
export const TIPOS_ENTREGA = ['Recoger', 'Domicilio', 'Consumir'];
export const ESTADOS = ['En cocina', 'En barra', 'En camino', 'Listo para recoger', 'Entregado', 'Pendiente de pago', 'Pagado', 'Cancelado'];
