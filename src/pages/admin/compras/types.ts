// Tipos y constantes del módulo Compras (abastecimiento de insumos).
export interface DetalleCompra {
  id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  materia_prima_id: number;
  marca_id: number;
}

export interface Compra {
  id: number;
  fecha: string;
  metodo_pago: string;
  valor_total: number;
  detalles?: DetalleCompra[];
}

export interface MateriaPrima { id: number; nombre: string; }
export interface Marca { id: number; nombre: string; }

export interface Linea {
  materia_prima_id: number | null;
  cantidad: string;
  precio_unitario: string;
  marca_id: number;
  nombre_nuevo: string;
  tipo: string;
  unidad_medida: string;
}

export const METODOS = ['Efectivo', 'Tarjeta', 'Transferencia', 'Nequi', 'Daviplata'];

export const lineaVacia = (marcaId = 0): Linea => ({
  materia_prima_id: null, cantidad: '', precio_unitario: '',
  marca_id: marcaId, nombre_nuevo: '', tipo: '', unidad_medida: '',
});

export function fechaCorta(f: string | undefined): string {
  if (!f) return '—';
  const d = new Date(f);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

export function esDelMesActual(f: string): boolean {
  const d = new Date(f);
  const now = new Date();
  return !isNaN(d.getTime()) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}
