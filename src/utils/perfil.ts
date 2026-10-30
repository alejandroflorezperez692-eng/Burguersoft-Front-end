export const tiposDoc = [
  'Cédula de Ciudadanía',
  'Tarjeta de Identidad',
  'Pasaporte',
  'Cédula de Extranjería',
] as const;

export function formatearTelefono(v: string): string {
  const limpio = v.replace(/[^0-9]/g, '');
  const partes = [limpio.slice(0, 3), limpio.slice(3, 6), limpio.slice(6, 10)];
  return partes.filter(Boolean).join(' ');
}

export function maxLenDocumento(tdoc: string): number {
  if (tdoc === 'Cédula de Ciudadanía') return 10;
  if (tdoc === 'Tarjeta de Identidad') return 11;
  if (tdoc === 'Cédula de Extranjería') return 10;
  if (tdoc === 'Pasaporte') return 9;
  return 12;
}

export function validarDatos(d: {
  nombre: string;
  apellido: string;
  tdoc: string;
  ndoc: string;
  telefono: string;
}, opciones: { validarNumeroDocumento?: boolean } = {}): string | null {
  const validarNumeroDocumento = opciones.validarNumeroDocumento ?? true;
  if (!d.nombre.trim() || !d.apellido.trim()) return 'Nombre y apellido son obligatorios.';
  if (!d.tdoc) return 'Debes seleccionar un tipo de documento.';
  if (validarNumeroDocumento) {
    if (!d.ndoc.trim()) return 'El número de documento es obligatorio.';
    const len = d.ndoc.trim().length;
    if (d.tdoc === 'Cédula de Ciudadanía' && (len < 6 || len > 10)) return 'La cédula debe tener entre 6 y 10 dígitos.';
    if (d.tdoc === 'Tarjeta de Identidad' && (len < 10 || len > 11)) return 'La tarjeta de identidad debe tener entre 10 y 11 dígitos.';
    if (d.tdoc === 'Cédula de Extranjería' && (len < 6 || len > 10)) return 'La cédula de extranjería debe tener entre 6 y 10 dígitos.';
    if (d.tdoc === 'Pasaporte' && (len < 6 || len > 9)) return 'El pasaporte debe tener entre 6 y 9 caracteres.';
  }
  if (!d.telefono.trim()) return 'El teléfono es obligatorio.';
  const limpio = d.telefono.replace(/\s/g, '');
  if (!/^(\+57|57)?3[0-9]{9}$/.test(limpio)) return 'El teléfono debe ser un número colombiano válido (ej: 3001234567).';
  return null;
}

export type ReglasPassword = {
  longitud: boolean;
  mayuscula: boolean;
  numero: boolean;
  especial: boolean;
};

export function reglasPassword(nueva: string): ReglasPassword {
  return {
    longitud: nueva.length >= 8,
    mayuscula: /[A-Z]/.test(nueva),
    numero: /[0-9]/.test(nueva),
    especial: /[^A-Za-z0-9]/.test(nueva),
  };
}

export function validarPassword(nueva: string, actual?: string): string | null {
  if (nueva.length < 8) return 'La nueva contraseña debe tener al menos 8 caracteres.';
  if (actual !== undefined && nueva === actual) return 'La nueva contraseña debe ser diferente a la actual.';
  const r = reglasPassword(nueva);
  if (!r.mayuscula || !r.numero || !r.especial) return 'La contraseña debe tener al menos una mayúscula, un número y un símbolo.';
  return null;
}
