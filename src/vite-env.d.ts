/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_FIREBASE_API_KEY?: string
  // Opcional: geocodificación de Google Maps. Requiere billing activo en el
  // proyecto de Google Cloud; sin ella el checkout usa ArcGIS + OpenStreetMap.
  readonly VITE_GOOGLE_MAPS_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
