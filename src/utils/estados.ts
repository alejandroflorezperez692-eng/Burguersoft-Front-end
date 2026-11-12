/**
 * F-003: "Servido" se muestra como "Entregado" cuando el pedido es para
 * domicilio o para recoger. En el local sigue siendo "Servido".
 * No cambia el estado guardado en la base de datos.
 */
export function etiquetaEstado(estado: string, tipoEntrega?: string | null): string {
  if (estado === 'Servido' && tipoEntrega && tipoEntrega !== 'Consumir') {
    return 'Entregado';
  }

  return estado;
}
