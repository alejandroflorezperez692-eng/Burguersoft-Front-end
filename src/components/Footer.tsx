import { useEffect, useState } from 'react';

export default function Footer() {
  const [mostrarSubir, setMostrarSubir] = useState(false);

  useEffect(() => {
    const actualizarVisibilidad = () => {
      setMostrarSubir(window.matchMedia('(max-width: 768px)').matches && window.scrollY > 240);
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
    <>
    <footer>
      <div className="footer-container">
        <div className="footer-brand">
          <div className="footer-brand-text">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                justifyContent: 'center',
                marginBottom: 10,
                marginTop: -30,
              }}
            >
              <img src="/estilos/img/icono1-oscuro.png" alt="Logo de El Oriente" className="footer-logo" />
              <hr />
              <h3 style={{ margin: 6 }}>El Oriente</h3>
            </div>
            <p>El sabor auténtico de El Oriente. Calidad y servicio en cada mordida.</p>
          </div>
        </div>

        <div className="footer-section">
          <h4>Horarios de atención</h4>
          <ul className="footer-horarios">
            <li><span>Lunes – Viernes:</span> <span>3:30 p. m. – 10:00 p. m.</span></li>
            <li><span>Sábado:</span> <span>3:00 p. m. – 11:00 p. m.</span></li>
            <li><span>Domingo:</span> <span>3:00 p. m. – 10:00 p. m.</span></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; 2026 BURGUERSOFT – EL ORIENTE. Todos los derechos reservados.</p>
      </div>
    </footer>
    <button
      type="button"
      className={`footer-scroll-top${mostrarSubir ? ' footer-scroll-top-visible' : ''}`}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Subir al inicio de la página"
      tabIndex={mostrarSubir ? 0 : -1}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
    </>
  );
}
