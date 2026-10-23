import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';

export default function PoliticaPrivacidad() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <AuthLayout regresarA="/registro">
      <div className="legal-page">
        <h1 className="legal-titulo">POLÍTICA DE PRIVACIDAD</h1>
        <p>
          En Burguersoft nos comprometemos a proteger tu privacidad y tus datos personales.
        </p>
        <h2>1. Datos que recopilamos</h2>
        <p>
          Recopilamos nombre, apellido, documento, correo electrónico y teléfono para la
          creación y gestión de tu cuenta, así como para procesar tus pedidos.
        </p>
        <h2>2. Uso de los datos</h2>
        <p>
          Los datos se utilizan para prestar el servicio, mejorar la experiencia, enviar
          notificaciones relacionadas con tus pedidos y cumplir obligaciones legales.
        </p>
        <h2>3. Compartición de datos</h2>
        <p>
          No compartimos tus datos personales con terceros, salvo cuando sea necesario para
          la prestación del servicio o por requerimiento legal.
        </p>
        <h2>4. Seguridad</h2>
        <p>
          Implementamos medidas de seguridad para proteger tus datos. Sin embargo, ningún
          sistema es completamente seguro.
        </p>
        <h2>5. Derechos del usuario</h2>
        <p>
          Puedes solicitar la actualización, corrección o eliminación de tus datos
          personales contactándonos a través de nuestros canales oficiales.
        </p>
        <h2>6. Cookies</h2>
        <p>
          El sitio puede usar cookies para mejorar la experiencia de navegación. Puedes
          configurar tu navegador para rechazarlas.
        </p>
        <h2>7. Términos y condiciones</h2>
        <p>
          El uso de la plataforma también se rige por nuestros{' '}
          <Link to="/terminos" className="auth-legal-link">Términos y Condiciones</Link>.
        </p>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Link to="/registro" className="link">Volver al registro</Link>
        </div>
      </div>
    </AuthLayout>
  );
}
