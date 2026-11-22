import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/img/icono.png';
import Footer from '../components/Footer';
import FondoParticulas from '../components/FondoParticulas';
import '../styles/auth.css';
import '../styles/public.css';
import Boton from '../components/Boton';

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
      navigate('/');
    }
  };

  return (
    <div className="auth-shell">
      <FondoParticulas />
      <nav className="auth-navbar">
        <img src={logo} alt="Burguersoft" className="auth-logo" />
        <Boton variante="volver" type="button" className="btn-regresar" onClick={handleRegresar}>Regresar</Boton>
      </nav>

      <div className="auth-center">{children}</div>

      <div className="public-body auth-site-footer">
        <Footer />
      </div>
    </div>
  );
}
