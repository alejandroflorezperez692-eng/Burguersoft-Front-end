// IVA Colombia — tarifa general 19% (Ley 1819/2016, art. 184 ET).
// Los precios de venta en BurguerSoft se tratan como PRECIO CON IVA INCLUIDO,
// que es lo habitual en restaurantes de cara al consumidor final.
// Si tu contador te pide facturar IVA discriminado sobre base + IVA, cambia
// IVA_INCLUIDO_EN_PRECIO a false.

export const IVA_TARIFA = 0.19;
export const IVA_INCLUIDO_EN_PRECIO = true;

export interface DesgloseIVA {
  subtotal: number; // base gravable
  iva: number; // valor IVA
  total: number; // total a pagar
  tarifa: number;
}

export function desglosarIVA(totalConIVA: number, tarifa: number = IVA_TARIFA): DesgloseIVA {
  const total = Number(totalConIVA) || 0;
  if (IVA_INCLUIDO_EN_PRECIO) {
    const subtotal = total / (1 + tarifa);
    const iva = total - subtotal;
    return { subtotal, iva, total, tarifa };
  }
  const iva = total * tarifa;
  return { subtotal: total, iva, total: total + iva, tarifa };
}

export function calcularIVADesdeBase(subtotal: number, tarifa: number = IVA_TARIFA): DesgloseIVA {
  const base = Number(subtotal) || 0;
  const iva = base * tarifa;
  return { subtotal: base, iva, total: base + iva, tarifa };
}

export function formatoCOP(valor: number): string {
  return `$${(Number(valor) || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}
