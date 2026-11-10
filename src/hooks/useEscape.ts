import { useEffect, useRef } from 'react';


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