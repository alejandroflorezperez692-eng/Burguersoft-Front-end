export default function Footer() {
  return (
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
            <li><span>Lunes – Viernes:</span> <span>3:30 PM – 10:00 PM</span></li>
            <li><span>Sábado:</span> <span>3:00 PM – 11:00 PM</span></li>
            <li><span>Domingo:</span> <span>3:00 PM – 10:00 PM</span></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; 2026 BURGUERSOFT - EL ORIENTE. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
