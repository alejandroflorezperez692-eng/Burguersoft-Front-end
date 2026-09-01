import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/img/icono.png';
import Footer from '../components/Footer';
import '../styles/auth.css';
import '../styles/public.css';

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

      <div className="auth-center">{children}</div>

      <div className="public-body auth-site-footer">
        <Footer />
      </div>
    </div>
  );
}
