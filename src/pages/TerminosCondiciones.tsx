import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';

export default function TerminosCondiciones() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <AuthLayout regresarA="/registro">
      <div className="legal-page">
        <h1 className="legal-titulo">TÉRMINOS Y CONDICIONES DE USO</h1>
        <p>
          Bienvenido a Burguersoft. Al registrarte y usar nuestra plataforma aceptas los
          siguientes términos y condiciones. Si no estás de acuerdo, no utilices el servicio.
        </p>
        <h2>1. Uso del servicio</h2>
        <p>
          El usuario se compromete a usar la plataforma de forma responsable y conforme a la
          ley. Está prohibido el uso fraudulento, el acceso no autorizado y cualquier acción
          que afecte el funcionamiento del sistema.
        </p>
        <h2>2. Cuenta de usuario</h2>
        <p>
          El usuario es responsable de mantener la confidencialidad de sus credenciales y de
          todas las actividades realizadas desde su cuenta. Debe notificar de inmediato
          cualquier uso no autorizado.
        </p>
        <h2>3. Pedidos y pagos</h2>
        <p>
          Los pedidos realizados a través de la plataforma están sujetos a disponibilidad y
          confirmación. Los precios pueden variar sin previo aviso. El pago se procesa
          conforme a los métodos disponibles.
        </p>
        <h2>4. Privacidad y datos personales</h2>
        <p>
          Los datos personales se tratan conforme a nuestra{' '}
          <Link to="/privacidad" className="auth-legal-link">Política de Privacidad</Link>.
          Al registrarte autorizas el tratamiento de tus datos para la prestación del servicio.
        </p>
        <h2>5. Modificaciones</h2>
        <p>
          Burguersoft puede modificar estos términos en cualquier momento. Los cambios se
          publicarán en esta página y el uso continuado implica su aceptación.
        </p>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Link to="/registro" className="link">Volver al registro</Link>
        </div>
      </div>
    </AuthLayout>
  );
}
