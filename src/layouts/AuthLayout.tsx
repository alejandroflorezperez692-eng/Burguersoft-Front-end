import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/img/icono.png';
import Footer from '../components/Footer';
import FondoParticulas from '../components/FondoParticulas';
import '../styles/auth.css';
import '../styles/public.css';

type AuthLayoutProps = {
  children: ReactNode;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="auth-shell">
      <FondoParticulas />
      <nav className="auth-navbar">
        <img src={logo} alt="Burguersoft" className="auth-logo" />
        <button type="button" className="btn-regresar" onClick={() => navigate(-1)}>
          Regresar
        </button>
      </nav>

      {children}

      <div className="public-body auth-site-footer">
        <Footer />
      </div>
    </div>
  );
}
