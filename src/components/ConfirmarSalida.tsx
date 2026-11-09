import { useEffect } from 'react';

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
    <div className="mn-modal-overlay" style={{ zIndex: 100000 }} onClick={onCancelar}>
      <div
        className="mn-modal-box"
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            margin: '0 auto 14px',
            background: 'rgba(200, 56, 42, 0.12)',
            color: 'var(--danger, #C8382A)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
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

        <div className="mn-modal-actions">
          <button type="button" className="mn-btn-cancel" onClick={onCancelar}>
            Cancelar
          </button>
          <button type="button" className="mn-btn-confirm" onClick={onConfirmar}>
            Sí, salir
          </button>
        </div>
      </div>
    </div>
  );
}