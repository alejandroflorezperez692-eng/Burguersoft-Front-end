import { Link } from 'react-router-dom';

export default function AdminFooter() {
  return (
    <footer className="admin-footer">
      <p>&copy; 2026 BURGUERSOFT – EL ORIENTE. Todos los derechos reservados.</p>
      <p>
        <Link to="/politica-legal" target="_blank" rel="noopener noreferrer" className="footer-legal-link">
          Términos, Datos Personales y Condiciones de Uso
        </Link>
      </p>
    </footer>
  );
}