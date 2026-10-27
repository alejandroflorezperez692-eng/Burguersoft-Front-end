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

/* Estilos del modal de confirmación (autocontenidos: no dependen de index.css) */
const CONFIRM_CSS = `
.confirm-modal-overlay{position:fixed;inset:0;background:rgba(22,8,0,.55);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:2147483646;animation:confirmFade .2s}
@keyframes confirmFade{from{opacity:0}to{opacity:1}}
@keyframes confirmSlide{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
.confirm-modal-box{background:var(--surface,#fff);border-radius:var(--r-lg,20px);padding:32px;max-width:380px;width:92%;box-shadow:var(--shadow-lg,0 16px 56px rgba(22,8,0,.18));text-align:center;animation:confirmSlide .22s}
.confirm-modal-box p{font-size:15px;color:var(--text-900,#160800);margin:0 0 24px;line-height:1.5;white-space:pre-line}
.confirm-modal-actions{display:flex;gap:10px;justify-content:center}
.confirm-modal-actions button{font-family:var(--font-sans,'Plus Jakarta Sans',system-ui,sans-serif);font-weight:700;font-size:13px;cursor:pointer}
.confirm-btn-cancel{padding:11px 24px;background:transparent;border:1.5px solid var(--border-strong,rgba(232,130,26,.35));border-radius:var(--r-sm,8px);color:var(--text-600,#6b4c38)}
.confirm-btn-cancel:hover{background:var(--surface-3,#fff)}
.confirm-btn-ok{padding:10px 28px;background:var(--danger,#C8382A);color:#fff;border:none;border-radius:var(--r-sm,8px);box-shadow:0 4px 14px rgba(200,56,42,.3)}
.confirm-btn-ok:hover{background:#a82d22}
`;

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
  confirmar: (msg: string, textoConfirmar?: string, peligro?: boolean) => Promise<boolean>;
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

  const [confirmState, setConfirmState] = useState<{ msg: string; textoConfirmar: string; peligro: boolean; resolve: (v: boolean) => void } | null>(null);

  const showToast = useCallback((msg: string, error = false, aviso = false) => {
    setToast({ msg, error, aviso });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  const confirmar = useCallback((msg: string, textoConfirmar = 'Aceptar', peligro = false) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ msg, textoConfirmar, peligro, resolve });
    });
  }, []);

  const resolverConfirm = (valor: boolean) => {
    const actual = confirmState;
    setConfirmState(null);
    if (actual) actual.resolve(valor);
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
              <>
              <style>{CONFIRM_CSS}</style>
              <div className="confirm-modal-overlay" onClick={() => resolverConfirm(false)}>
                <div className="confirm-modal-box" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                  <p>{confirmState.msg}</p>
                  <div className="confirm-modal-actions">
                    <button type="button" className="confirm-btn-cancel" onClick={() => resolverConfirm(false)}>
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className={`confirm-btn-ok${confirmState.peligro ? ' confirm-btn-danger' : ''}`}
                      onClick={() => resolverConfirm(true)}
                      autoFocus
                    >
                      {confirmState.textoConfirmar}
                    </button>
                  </div>
                </div>
              </div>
              </>
            )}
          </>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}