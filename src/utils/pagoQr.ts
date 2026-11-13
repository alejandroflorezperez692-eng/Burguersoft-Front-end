/** QR Bre-B y datos de la cuenta, compartidos por Checkout y el cobro del personal. */
export const QR_RUTAS: Record<string, string> = {
  nequi: '/estilos/img/qr-breb.png',
  daviplata: '/estilos/img/qr-breb.png',
  bancolombia: '/estilos/img/qr-breb.png',
};

export const CUENTA_QR: Record<string, { titular: string; llave: string }> = {
  nequi: { titular: 'Flor Avella', llave: '@3115387534' },
  daviplata: { titular: 'Flor Avella', llave: '@3115387534' },
  bancolombia: { titular: 'Flor Avella', llave: '@3115387534' },
};

export const NOMBRE_QR: Record<string, string> = {
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  bancolombia: 'Bancolombia',
};

/** Acepta 'Nequi', 'nequi', etc. y devuelve la clave del QR o null (efectivo, tarjeta...). */
export function claveQr(metodo: string | null | undefined): string | null {
  const k = (metodo ?? '').trim().toLowerCase();
  return k in QR_RUTAS ? k : null;
}
