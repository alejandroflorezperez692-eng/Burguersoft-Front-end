export type RolNormalizado = 'admin' | 'cliente' | 'cajero' | 'cocinero' | 'mesero';

/** Convierte el nombre del rol que manda el backend a un valor fijo. */
export function normalizarRol(rol?: string): RolNormalizado | '' {
  const limpio = String(rol ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (limpio === 'admin' || limpio === 'administrador') return 'admin';
  if (limpio === 'cliente') return 'cliente';
  if (limpio === 'cajero') return 'cajero';
  if (limpio === 'cocinero') return 'cocinero';
  if (limpio === 'mesero') return 'mesero';
  return '';
}

export const ACCESO: Record<'personal' | 'menu' | 'pedidos' | 'ventas' | 'inventario' | 'cierre' | 'soloAdmin', RolNormalizado[]> = {
  personal: ['admin', 'cajero', 'cocinero', 'mesero'],
  menu: ['admin', 'cajero', 'cocinero', 'mesero'],
  pedidos: ['admin', 'cajero', 'cocinero', 'mesero'],
  // F-022: el mesero usa "Pedidos" (Nuevo pedido y Mesas); el historial de
  // ventas es solo para admin y cajero.
  ventas: ['admin', 'cajero'],
  inventario: ['admin', 'cajero', 'cocinero'],
  cierre: ['admin', 'cajero'],
  soloAdmin: ['admin'],
};

/** Pantalla a la que va cada rol después de iniciar sesión. */
export function rutaInicio(rol?: string): string {
  return normalizarRol(rol) === 'cliente' ? '/' : '/inicio';
}