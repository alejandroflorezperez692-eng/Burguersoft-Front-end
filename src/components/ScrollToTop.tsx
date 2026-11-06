import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function ScrollToTop() {
  const [mostrar, setMostrar] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const actualizarVisibilidad = () => {
      setMostrar(window.matchMedia('(max-width: 768px)').matches && window.scrollY > 240);
    };

    actualizarVisibilidad();
    window.addEventListener('scroll', actualizarVisibilidad, { passive: true });
    window.addEventListener('resize', actualizarVisibilidad);
    return () => {
      window.removeEventListener('scroll', actualizarVisibilidad);
      window.removeEventListener('resize', actualizarVisibilidad);
    };
  }, []);

  return (
    <button
      type="button"
      className={`footer-scroll-top${!isAuthenticated ? ' footer-scroll-top-prelogin' : ''}${mostrar ? ' footer-scroll-top-visible' : ''}`}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Subir al inicio de la página"
      tabIndex={mostrar ? 0 : -1}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
