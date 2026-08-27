import { useRef, useState } from 'react';

export type ToastPayload = { msg: string; error?: boolean };

export function useToast() {
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const showToast = (msg: string, error = false) => {
    setToast({ msg, error });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3200);
  };

  return { toast, showToast };
}

export default function ToastMessage({ toast }: { toast: ToastPayload | null }) {
  if (!toast) return null;
  return <div className={`toast-marca${toast.error ? ' toast-error' : ''}`}>{toast.msg}</div>;
}