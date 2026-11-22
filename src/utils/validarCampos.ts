/**
 * Ejecuta las validaciones HTML nativas (required, pattern, maxLength, min, max...)
 * sobre los campos visibles del documento.
 *
 * Los modales que no usan <form> no disparan la validación automática del
 * navegador al pulsar su botón. Llamar a esta función antes de guardar cubre
 * ese caso sin convertir botones "Cancelar" en botones de envío.
 */
export function validarCamposVisibles(): boolean {
  const campos = document.querySelectorAll<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >('input:not([type="hidden"]), textarea, select');

  for (const campo of Array.from(campos)) {
    if (campo.disabled || ('readOnly' in campo && campo.readOnly)) continue;
    // Los campos de paneles cerrados (<details>, pestañas, modales ocultos)
    // no deben bloquear el guardado de lo que sí está visible.
    if (campo.getClientRects().length === 0) continue;
    if (campo.checkValidity()) continue;

    campo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    campo.reportValidity();
    return false;
  }

  return true;
}
