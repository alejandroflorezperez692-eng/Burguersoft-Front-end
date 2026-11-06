/**
 * URL base de la API.
 *
 * Se toma de VITE_API_URL para que cada entorno (local, compañeros o
 * producción) apunte a su propio backend sin tocar el código fuente.
 * Se elimina la barra final para poder concatenar rutas sin duplicarla.
 */
export const API_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/+$/, '');
