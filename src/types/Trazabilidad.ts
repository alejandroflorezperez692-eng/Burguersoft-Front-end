export interface TransicionesEstado {
  directas: string[];
  con_motivo: string[];
}

export type MapaTransiciones = Record<string, TransicionesEstado>;

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

export interface RegistroTrazabilidad {
  fecha?: string;
  de?: string | null;
  a?: string;
  estado?: string;
  motivo?: string | null;
  evento?: string | null;
  rol?: string | null;
  usuario?: string | { nombre?: string | null; apellido?: string | null } | null;
  fuera_de_rol?: boolean;
  es_correccion?: boolean;
  duracion_segundos?: number | null;
}

export function registrosDeTrazabilidad(data: unknown): RegistroTrazabilidad[] {
  const obj = data as { registros?: unknown; data?: unknown } | null;
  const lista = Array.isArray(data)
    ? data
    : Array.isArray(obj?.registros)
      ? obj?.registros
      : obj?.data;
  if (!Array.isArray(lista)) return [];
  return lista.map((r) => {
    const x = r as Record<string, unknown>;
    return {
      ...x,
      de: (x.de ?? x.estado_anterior ?? undefined) as string | undefined,
      a: (x.a ?? x.estado_nuevo ?? undefined) as string | undefined,
    } as RegistroTrazabilidad;
  });
}

export function nombreUsuario(r: RegistroTrazabilidad): string {
  const u = r.usuario;
  if (typeof u === 'string') return u;
  return [u?.nombre, u?.apellido].filter(Boolean).join(' ').trim() || 'El sistema';
}
