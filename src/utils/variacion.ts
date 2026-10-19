/** Utilidades compartidas de formato y comparación mes a mes (pesos colombianos). */

export type TonoVariacion = 'bien' | 'mal' | 'neutro';

/** $144.643 — signo peso + punto de miles, sin decimales. */
export function peso(v: number | string | null | undefined): string {
  const n = Number(v ?? 0);
  if (!isFinite(n)) return '$0';
  return '$' + Math.round(n).toLocaleString('es-CO');
}

/** Clave 'YYYY-MM' del mes actual desplazada N meses (0 = actual, -1 = anterior). */
export function claveMes(desplazamiento = 0): string {
  const f = new Date();
  f.setDate(1);
  f.setMonth(f.getMonth() + desplazamiento);
  const mm = String(f.getMonth() + 1).padStart(2, '0');
  return `${f.getFullYear()}-${mm}`;
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Nombre del mes en español desplazado N meses (0 = actual, -1 = anterior). */
export function nombreMes(desplazamiento = 0): string {
  const f = new Date();
  f.setMonth(f.getMonth() + desplazamiento);
  return MESES[f.getMonth()];
}

export interface ResultadoVariacion {
  tono: TonoVariacion;
  texto: string;
  pct: number | null;
}

/** Compara el valor actual con el del mes anterior y devuelve tono + texto listo para mostrar. */
export function variacion(actual: number, anterior: number, nombreMesAnt: string): ResultadoVariacion {
  const a = Number(actual) || 0;
  const b = Number(anterior) || 0;
  if (b <= 0) {
    return { tono: 'neutro', texto: 'sin mes anterior para comparar', pct: null };
  }
  const pct = Math.round(((a - b) / b) * 100);
  const signo = pct > 0 ? '+' : '';
  return {
    tono: pct > 0 ? 'bien' : pct < 0 ? 'mal' : 'neutro',
    texto: `${signo}${pct}% frente a ${nombreMesAnt}`,
    pct,
  };
}

/** Color para el tono de una variación (uso en style inline). */
export function colorVariacion(tono: TonoVariacion | string): string {
  if (tono === 'bien') return '#1e8e3e';
  if (tono === 'mal') return '#d93025';
  return '#9aa0a6';
}
