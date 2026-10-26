import { useRef, useState } from 'react';

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

export function useToast() {
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const showToast = (msg: string, error = false, aviso = false) => {
    setToast({ msg, error, aviso });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3200);
  };

  return { toast, showToast };
}

/** Tipo del toast a partir de sus banderas. */
export function tipoDeToast(t: ToastPayload): IconoTipo {
  return t.error ? 'error' : t.aviso ? 'aviso' : 'exito';
}

export default function ToastMessage({ toast }: { toast: ToastPayload | null }) {
  if (!toast) return null;
  const clase = toast.error ? ' toast-error' : toast.aviso ? ' toast-aviso' : '';
  return (
    <div className={`toast-marca${clase}`}>
      <IconoToast tipo={tipoDeToast(toast)} />
      <span>{toast.msg}</span>
    </div>
  );
}
