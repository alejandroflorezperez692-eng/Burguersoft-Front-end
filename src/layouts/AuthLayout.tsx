import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/img/icono.png';
import Footer from '../components/Footer';
import '../styles/auth.css';
import '../styles/public.css';

type AuthLayoutProps = {
  children: ReactNode;
  regresarA?: string;
};

export default function AuthLayout({ children, regresarA }: AuthLayoutProps) {
  const navigate = useNavigate();

  const handleRegresar = () => {
    if (regresarA) {
      navigate(regresarA);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="auth-shell">
      <nav className="auth-navbar">
        <img src={logo} alt="Burguersoft" className="auth-logo" />
        <button type="button" className="btn-regresar" onClick={handleRegresar}>
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
