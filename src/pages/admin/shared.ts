// Helpers compartidos por los módulos del panel admin.
// La API Laravel a veces devuelve el listado directo y a veces envuelto en { data: [...] }.
export function unwrap<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: T[] }).data;
  }
  return [];
}
