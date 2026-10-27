import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Colores del toast según la señal:
 *  - verde  → éxito (movimientos/validaciones correctos)
 *  - rojo   → error (errores, validaciones fallidas, movimientos inválidos)
 *  - amarillo → información / advertencia
 */
export type ToastPayload = { msg: string; error?: boolean; aviso?: boolean };

export type IconoTipo = 'exito' | 'error' | 'aviso';

/** Iconos SVG (sin emojis) de cada tipo de alerta. Heredan el color del texto. */
export function IconoToast({ tipo, size = 18 }: { tipo: IconoTipo; size?: number }) {
  const base = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    style: { flexShrink: 0 },
  };

  if (tipo === 'exito') {
    return (
      <svg {...base}>
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }
  if (tipo === 'error') {
    return (
      <svg {...base}>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    );
  }
  // aviso: icono de información
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-5" />
      <path d="M12 8h.01" />
    </svg>
  );
}

/** Tipo del toast a partir de sus banderas. */
export function tipoDeToast(t: ToastPayload): IconoTipo {
  return t.error ? 'error' : t.aviso ? 'aviso' : 'exito';
}

export default function ToastMessage({ toast }: { toast: ToastPayload | null }) {
  if (!toast) return null;
  const clase = toast.error ? ' toast-error' : toast.aviso ? ' toast-aviso' : '';
  return (
    <div className={`toast-marca${clase}`} role="status" aria-live="polite">
      <IconoToast tipo={tipoDeToast(toast)} />
      <span>{toast.msg}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Contexto global: un único toast + confirm, renderizados por portal  */
/* ------------------------------------------------------------------ */

interface ToastContextValue {
  toast: ToastPayload | null;
  showToast: (msg: string, error?: boolean, aviso?: boolean) => void;
  confirmar: (msg: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback seguro por si se usa fuera del provider
    // (no debería ocurrir, pero evita romper la app)
    return {
      toast: null,
      showToast: (msg, error, aviso) => {
        // eslint-disable-next-line no-console
        console.warn('useToast fuera de ToastProvider:', msg, error, aviso);
      },
      confirmar: async () => false,
    };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const [confirmState, setConfirmState] = useState<{ msg: string; resolve: (v: boolean) => void } | null>(null);

  const showToast = useCallback((msg: string, error = false, aviso = false) => {
    setToast({ msg, error, aviso });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  const confirmar = useCallback((msg: string) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ msg, resolve });
    });
  }, []);

  const resolverConfirm = (valor: boolean) => {
    setConfirmState((prev) => {
      if (prev) prev.resolve(valor);
      return null;
    });
  };

  const value: ToastContextValue = { toast, showToast, confirmar };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <>
            <ToastMessage toast={toast} />
            {confirmState && (
              <div className="toast-confirm-overlay" onClick={() => resolverConfirm(false)}>
                <div className="toast-confirm-box toast-marca toast-aviso" onClick={(e) => e.stopPropagation()}>
                  <IconoToast tipo="aviso" />
                  <div className="toast-confirm-content">
                    <span>{confirmState.msg}</span>
                    <div className="toast-confirm-actions">
                      <button type="button" className="toast-confirm-btn toast-confirm-cancel" onClick={() => resolverConfirm(false)}>
                        Cancelar
                      </button>
                      <button type="button" className="toast-confirm-btn toast-confirm-ok" onClick={() => resolverConfirm(true)}>
                        Aceptar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}
