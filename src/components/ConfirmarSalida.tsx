import { useEffect } from 'react';
import '../styles/ConfirmarSalida.css';
import Boton from './Boton';

export default function ConfirmarSalida({
  onConfirmar,
  onCancelar,
  mensaje = '¿Cerrar sesión? Tendrás que iniciar sesión de nuevo para hacer pedidos.',
}: {
  onConfirmar: () => void;
  onCancelar: () => void;
  mensaje?: string;
}) {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancelar();
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [onCancelar]);

  return (
    <div className="cs-overlay" style={{ zIndex: 100000 }}>
      <div
        className="cs-box"
        role="alertdialog"
        aria-modal="true"
      >
        <div className="cs-icon">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </div>

        <p>{mensaje}</p>

        <div className="cs-actions">
          <Boton variante="cancelar" type="button" className="cs-btn-cancel" onClick={onCancelar}>Cancelar</Boton>
          <Boton variante="salir" type="button" className="cs-btn-confirm" onClick={onConfirmar}>Sí, salir</Boton>
        </div>
      </div>
    </div>
  );
}