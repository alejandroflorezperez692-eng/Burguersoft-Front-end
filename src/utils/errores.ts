import { isAxiosError } from 'axios';

/**
 * Utilidades para mostrar errores SIEMPRE en español y entendibles.
 *
 * Reglas:
 *  - Si el backend manda un mensaje claro en español, se respeta.
 *  - Si el mensaje viene en inglés, es un texto técnico (SQL, stack trace,
 *    HTML, excepciones de PHP) o es un error 5xx, NO se muestra tal cual:
 *    se reemplaza por un aviso en español que invita a contactar al desarrollador.
 */

export const CONTACTO_DESARROLLADOR = 'Si el problema continúa, contacta al desarrollador.';

export const MENSAJE_DESCONOCIDO =
  `Ocurrió un error inesperado. Intenta de nuevo. ${CONTACTO_DESARROLLADOR}`;

export const MENSAJE_SERVIDOR =
  `Ocurrió un error en el servidor. Intenta de nuevo. ${CONTACTO_DESARROLLADOR}`;

export const MENSAJE_SESION_EXPIRADA = 'Tu sesión expiró. Inicia sesión de nuevo.';

/** Quita los agregados de Laravel: "(and 1 more error)" / "(y 2 errores más)". */
export function limpiarMensaje(texto: string): string {
  return String(texto ?? '')
    .replace(/\s*\((?:and\s+\d+\s+more\s+errors?|y\s+\d+\s+errores?\s+más)\)\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Mensajes en inglés que ya sabemos traducir. */
function traducirConocido(mensaje: string): string | null {
  const m = mensaje.toLowerCase();
  if (m.includes('the correo field must be a valid email address')) return 'El campo correo debe ser una dirección de correo válida.';
  if (m.includes('correo field') && m.includes('valid email')) return 'El campo correo debe ser una dirección de correo válida.';
  if (m.includes('email field') && m.includes('valid')) return 'El campo correo debe ser una dirección de correo válida.';
  if (m.includes('must be a valid email')) return 'Debe ser una dirección de correo válida.';
  if (m.includes('invalid email')) return 'Correo electrónico inválido.';
  if (m.includes('given data was invalid')) return 'Los datos ingresados no son válidos.';
  if (m.includes('password confirmation') && m.includes('match')) return 'Las contraseñas no coinciden.';
  if (m.includes('password') && m.includes('required')) return 'La contraseña es obligatoria.';
  if (m.includes('correo') && m.includes('required')) return 'El correo es obligatorio.';
  if (m.includes('email') && m.includes('required')) return 'El correo es obligatorio.';
  if (m.includes('unauthenticated') || m.includes('invalid credentials')) return 'Correo o contraseña incorrectos.';
  if (m.includes('these credentials do not match')) return 'Correo o contraseña incorrectos.';
  if (m.includes('too many attempts')) return 'Demasiados intentos. Por favor, inténtalo más tarde.';
  if (m.includes('unauthorized')) return 'No autorizado. Inicia sesión de nuevo.';
  if (m.includes('forbidden') || m.includes('this action is unauthorized')) return 'No tienes permisos para realizar esta acción.';
  if (m.includes('not found') || m.includes('no query results')) return 'No se encontró la información solicitada.';
  if (m.includes('server error') || m.includes('internal error')) return MENSAJE_SERVIDOR;
  if (m.includes('network error') || m.includes('failed to fetch')) return 'No se pudo conectar con el servidor. Revisa tu conexión.';
  if (m.includes('timeout') || m.includes('timed out')) return 'El servidor tardó demasiado en responder. Intenta de nuevo.';
  if (m.includes('method not allowed')) return 'La acción solicitada no está permitida.';
  if (m.includes('csrf') || m.includes('page expired')) return 'Tu sesión expiró. Recarga la página e inicia sesión de nuevo.';
  return null;
}

/** Textos que delatan un error técnico que el usuario no debe ver. */
const PATRON_TECNICO =
  /(sqlstate|stack trace|pdoexception|typeerror|referenceerror|syntaxerror|fatal error|parse error|undefined (variable|index|array|property|method)|call to (a member function|undefined)|htmlspecialchars|vendor[\\/]|app[\\/]http|<br\s*\/?>|<\/?[a-z][^>]*>|\bat\s+\w+\.php:\d+|on line \d+)/i;

export function esMensajeTecnico(texto: string): boolean {
  return PATRON_TECNICO.test(texto);
}

const PALABRAS_EN = /\b(the|this|that|these|those|is|are|was|were|has|have|had|must|should|cannot|can't|invalid|required|failed|failure|not found|unauthorized|forbidden|internal|server error|network error|timeout|timed out|request|unable|denied|already|exists|given|data|too many|attempts|credentials|email address|password|field|value|token|user|users|record|query|database|connection|something|went|wrong|unexpected|occurred|please|try|again|could|would|which|with|from|your|you|we|our|it|its|there|here|while|processing|saving|loading|delete|update|create|select|insert|constraint|violates|duplicate|entry|column|table|row|missing|denied|expired|locked|disabled)\b/gi;
const PALABRAS_ES = /\b(el|la|los|las|un|una|unos|unas|de|del|que|no|se|con|para|por|pudo|puede|debe|deben|contraseña|contraseñas|correo|usuario|usuarios|campo|campos|inválid[oa]s?|sesión|intenta|inténtalo|datos|pedido|pedidos|producto|productos|stock|insuficiente|código|expirado|caducado|obligatorio|fecha|fecha|hora|servidor|conexión|error|errores|permisos|acción|información|encontrada|encontrado|guardar|cargar|actualizar|eliminar|revisa)\b/gi;

/** Heurística: ¿el texto está mayormente en inglés? */
export function pareceIngles(texto: string): boolean {
  const en = (texto.match(PALABRAS_EN) ?? []).length;
  const es = (texto.match(PALABRAS_ES) ?? []).length;
  return en > es;
}

/**
 * Devuelve un mensaje listo para mostrar o '' si no es apto para el usuario.
 * @param status código HTTP (para descartar los 5xx).
 */
export function mensajeSeguro(texto: unknown, status?: number): string {
  if (typeof texto !== 'string') return '';
  const limpio = limpiarMensaje(texto);
  if (!limpio) return '';

  const traducido = traducirConocido(limpio);
  if (traducido) return traducido;

  if (esMensajeTecnico(limpio)) return '';
  // Los errores del servidor (500/502/503...) nunca se muestran en crudo.
  if (status && status >= 500) return '';
  if (pareceIngles(limpio)) return '';

  return limpio;
}

interface RespuestaError {
  message?: unknown;
  error?: unknown;
  errors?: Record<string, unknown> | unknown;
}

/** Mensaje de error de una respuesta del backend (data), ya saneado. */
export function mensajeDeRespuesta(data: unknown, status?: number): string {
  const generico = status && status >= 500 ? MENSAJE_SERVIDOR : MENSAJE_DESCONOCIDO;

  if (typeof data === 'string') {
    return mensajeSeguro(data, status) || generico;
  }

  if (data && typeof data === 'object') {
    const d = data as RespuestaError;

    const errores = d.errors;
    if (errores && typeof errores === 'object' && !Array.isArray(errores)) {
      const lista: string[] = [];
      Object.values(errores as Record<string, unknown>).forEach((val) => {
        const primero = Array.isArray(val) ? val[0] : val;
        const msg = mensajeSeguro(primero, status);
        if (msg) lista.push(msg);
      });
      const unicos = Array.from(new Set(lista));
      if (unicos.length > 0) return unicos.join(' ');
    }

    const candidatos = [d.error, d.message];
    for (const c of candidatos) {
      const msg = mensajeSeguro(c, status);
      if (msg) return msg;
    }
  }

  return generico;
}

/**
 * Mensaje de error unificado para cualquier `catch`.
 * Siempre devuelve algo en español; si no hay información confiable,
 * usa `porDefecto` + invitación a contactar al desarrollador.
 */
export function mensajeError(err: unknown, porDefecto = 'No se pudo completar la operación'): string {
  if (isAxiosError(err)) {
    if (!err.response) {
      const msg = String(err.message ?? '');
      if (err.code === 'ECONNABORTED' || /timeout|timed out/i.test(msg)) {
        return 'El servidor tardó demasiado en responder. Intenta de nuevo.';
      }
      return 'No se pudo conectar con el servidor. Revisa tu conexión.';
    }

    const status = err.response.status;
    const data = err.response.data;

    // 401 fuera del login = la sesión expiró (no "credenciales incorrectas").
    if (status === 401) {
      const url = String(err.config?.url ?? '');
      if (!/login|auth/i.test(url)) return MENSAJE_SESION_EXPIRADA;
    }

    const directo = mensajeSeguro(data, status) || mensajeSeguro((data as RespuestaError)?.error, status) || mensajeSeguro((data as RespuestaError)?.message, status);
    if (directo) return directo;

    const desdeRespuesta = mensajeDeRespuesta(data, status);
    // Si la respuesta no traía nada útil, mensajeDeRespuesta cae al genérico.
    if (status >= 400 && status < 500) {
      if (status === 403) return 'No tienes permisos para realizar esta acción.';
      if (status === 404) return 'No se encontró la información solicitada.';
      if (status === 419) return 'Tu sesión expiró. Recarga la página e inicia sesión de nuevo.';
      if (status === 429) return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
    }
    return desdeRespuesta;
  }

  if (err instanceof Error) {
    const msg = mensajeSeguro(err.message);
    if (msg) return msg;
  }

  return `${porDefecto}. ${CONTACTO_DESARROLLADOR}`;
}
