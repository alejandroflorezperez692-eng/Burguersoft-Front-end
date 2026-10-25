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

/** Pantalla a la que va cada rol después de iniciar sesión. */
export function rutaInicio(rol?: string): string {
  switch (normalizarRol(rol)) {
    case 'cliente':
      return '/';
    case 'cajero':
      return '/ventas';
    case 'cocinero':
      return '/pedidos';
    default:
      return '/inicio';
  }
}