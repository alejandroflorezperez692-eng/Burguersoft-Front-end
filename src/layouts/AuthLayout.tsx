import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/img/icono.png';
import '../styles/auth.css';

type AuthLayoutProps = {
  children: ReactNode;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="auth-shell">
      <nav className="auth-navbar">
        <img src={logo} alt="Burguersoft" className="auth-logo" />
        <button type="button" className="btn-regresar" onClick={() => navigate(-1)}>
          Regresar
        </button>
      </nav>

      {children}

      <footer className="auth-footer">
        <p>&copy; 2026 BURGUERSOFT - EL ORIENTE. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
