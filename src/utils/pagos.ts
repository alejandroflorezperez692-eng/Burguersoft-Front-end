/**
 * F-032: una sola fuente para los métodos de pago del negocio.
 * Debe coincidir con `Venta::METODOS_PAGO` y `Venta::METODOS_ELECTRONICOS`
 * del backend (app/Models/Venta.php).
 */

/** Métodos que el personal de mostrador puede cobrar. */
export const METODOS_MOSTRADOR = ['Efectivo', 'Daviplata', 'Bancolombia', 'Nequi'];

/** Métodos que exigen comprobante de pago aprobado. */
export const METODOS_CON_COMPROBANTE = [
  'Nequi',
  'Daviplata',
  'Bancolombia',
  'Transferencia',
  'Tarjeta',
  'PSE',
];

/** True si el método de pago exige comprobante (sin distinguir mayúsculas). */
export const esPagoElectronico = (metodo?: string | null): boolean => {
  const k = (metodo ?? '').trim().toLowerCase();
  return METODOS_CON_COMPROBANTE.some((m) => m.toLowerCase() === k);
};
