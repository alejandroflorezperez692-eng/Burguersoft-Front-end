import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import '/estilos/estilos-login.css';
import '/estilos/accesibilidad.css';
import '/estilos/estilos-registro.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
