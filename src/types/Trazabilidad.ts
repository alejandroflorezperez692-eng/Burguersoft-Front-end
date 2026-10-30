/* Tipos de trazabilidad de pedidos/ventas:
   - MapaTransiciones: qué estados se pueden pasar de uno dado (y cuáles exigen motivo).
   - mensajeDeError: saca un mensaje legible de una respuesta de error de la API. */

export interface TransicionesEstado {
  /** Estados a los que se puede pasar sin marcar motivo. */
  directas: string[];
  /** Estados a los que solo se puede pasar indicando un motivo (quedan en el historial). */
  con_motivo: string[];
}

/** Respuesta de GET /pedidos/transiciones: estado actual → transiciones permitidas. */
export type MapaTransiciones = Record<string, TransicionesEstado>;

/** Extrae el mensaje de error de una respuesta axios (string plano, {error} o {message}). */
export function mensajeDeError(e: unknown, fallback: string): string {
  const data = (e as { response?: { data?: unknown } } | undefined)?.response?.data ?? e;
  let msg = '';
  if (typeof data === 'string') {
    msg = data;
  } else if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    msg = (typeof obj.error === 'string' && obj.error) || (typeof obj.message === 'string' && obj.message) || '';
  }
  return msg.trim() || fallback;
}

/* ------------------------------------------------------------ */
/* Registro de trazabilidad (usado por TrazabilidadModal)        */
/* ------------------------------------------------------------ */

/** Evento del historial de un pedido. Los campos llegan con nombres variables
 *  según el endpoint, así que se leen de forma tolerante. */
export interface RegistroTrazabilidad {
  fecha?: string;
  /** Estado del que pasó el pedido (si aplica). */
  de?: string;
  /** Estado al que pasó (si aplica). */
  a?: string;
  /** Estado resultante del registro. */
  estado?: string;
  motivo?: string;
  /** Quién hizo el cambio (string o objeto usuario). */
  usuario?: string | { nombre?: string | null; apellido?: string | null } | null;
}

/** Normaliza la respuesta del historial: [{...}] o { data: [{...}] }. */
export function registrosDeTrazabilidad(data: unknown): RegistroTrazabilidad[] {
  const lista = Array.isArray(data)
    ? data
    : (data as { data?: unknown[] } | null)?.data;
  return Array.isArray(lista) ? (lista as RegistroTrazabilidad[]) : [];
}

/** Nombre del usuario que generó el registro, tolerante a formatos. */
export function nombreUsuario(r: RegistroTrazabilidad): string {
  const u = r.usuario;
  if (typeof u === 'string') return u;
  return [u?.nombre, u?.apellido].filter(Boolean).join(' ').trim() || 'El sistema';
}
