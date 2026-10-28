import { useEffect, useRef } from 'react';

// Cierra con la tecla Esc el primer cuadro que esté abierto de la lista.
// Se pone de primero el que está más arriba (ej. confirmación antes que formulario).
export function useEscape(cierres: Array<[boolean, () => void]>) {
  const ref = useRef(cierres);
  ref.current = cierres;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const activo = ref.current.find(([abierto]) => abierto);
      if (activo) {
        e.preventDefault();
        activo[1]();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}