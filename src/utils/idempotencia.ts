/**
 * F-012: clave única por intento de venta. Si el navegador reintenta el mismo
 * envío (doble clic, red lenta), el backend devuelve la venta ya creada.
 */
export function nuevaClaveIdempotencia(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
