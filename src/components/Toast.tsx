import { useRef, useState } from 'react';

/**
 * Colores del toast según la señal:
 *  - verde  → éxito (movimientos/validaciones correctos)
 *  - rojo   → error (errores, validaciones fallidas, movimientos inválidos)
 *  - amarillo → información / advertencia
 */
export type ToastPayload = { msg: string; error?: boolean; aviso?: boolean };

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

export default function ToastMessage({ toast }: { toast: ToastPayload | null }) {
  if (!toast) return null;
  const clase = toast.error ? ' toast-error' : toast.aviso ? ' toast-aviso' : '';
  return <div className={`toast-marca${clase}`}>{toast.msg}</div>;
}
