export type RolNormalizado = 'admin' | 'cliente' | 'cajero' | 'cocinero';

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
  return '';
}

/**
 * Quién puede entrar a cada grupo de secciones.
 * Para cambiar permisos, edita SOLO este objeto (menú y rutas lo usan).
 */
export const ACCESO: Record<'personal' | 'caja' | 'cocina' | 'soloAdmin', RolNormalizado[]> = {
  // Inicio, Materia prima, Compras
  personal: ['admin', 'cajero', 'cocinero'],
  // Ventas
  caja: ['admin', 'cajero'],
  // Menú, Cierre de inventario, Marcas, Promociones, Ayuda
  cocina: ['admin', 'cocinero'],
  // Usuarios, Copias de seguridad
  soloAdmin: ['admin'],
};

/** Pantalla a la que va cada rol después de iniciar sesión. */
export function rutaInicio(rol?: string): string {
  return normalizarRol(rol) === 'cliente' ? '/' : '/inicio';
}