import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LifeBuoy } from 'lucide-react';
import ModalLegal, { type DocumentoLegal } from '../../components/ModalLegal';
import PublicHeader from '../../components/PublicHeader';
import Footer from '../../components/Footer';
import '../../styles/ayuda.css';

export default function Ayuda() {
  const [acordeonAbierto, setAcordeonAbierto] = useState<string | null>(null);
  const [documentoLegal, setDocumentoLegal] = useState<DocumentoLegal | null>(null);

  const alternarAcordeon = (id: string) => {
    setAcordeonAbierto((abierto) => (abierto === id ? null : id));
  };

  return (
    <div className="public-body">
      <PublicHeader />

      <main className="ayuda-page">
        <section className="ayuda-hero" aria-labelledby="ayuda-title">
          <LifeBuoy className="ayuda-hero-icono" size={40} aria-hidden="true" />
          <div className="ayuda-hero-contenido">
            <span className="ayuda-etiqueta">CENTRO DE AYUDA</span>
            <h1 id="ayuda-title">Estamos aquí para ayudarte</h1>
            <p>
              Encuentra una guía sencilla para crear tu cuenta, iniciar sesión,
              recuperar tu contraseña y conocer las opciones disponibles antes
              de hacer un pedido.
            </p>
          </div>
        </section>

        <div className="ayuda-temas">
          <section className="ayuda-seccion" id="crear-cuenta">
          <div className="ayuda-seccion-numero" aria-hidden="true">01</div>
          <div className={`ayuda-acordeon${acordeonAbierto === 'crear-cuenta' ? ' ayuda-acordeon-abierto' : ''}`}>
            <button
              type="button"
              className="ayuda-acordeon-titulo"
              aria-expanded={acordeonAbierto === 'crear-cuenta'}
              aria-controls="contenido-crear-cuenta"
              onClick={() => alternarAcordeon('crear-cuenta')}
            >
              <span className="ayuda-etiqueta">NUEVO CLIENTE</span>
              <h2>¿Cómo crear una cuenta?</h2>
            </button>
            {acordeonAbierto === 'crear-cuenta' && (
              <div className="ayuda-seccion-contenido" id="contenido-crear-cuenta">
                <p>
                  Regístrate para acceder a las opciones de pedido. Ten a la mano
                  tus datos y un correo electrónico al que puedas ingresar.
                </p>
                <ol className="ayuda-pasos">
                  <li>En la barra superior, selecciona el botón de inicio de sesión y luego <strong>Crear cuenta</strong>, o entra directamente al registro.</li>
                  <li>Completa tus nombres, apellidos, tipo y número de documento, correo y contraseña.</li>
                  <li>La contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un símbolo.</li>
                  <li>Confirma la contraseña, acepta los Términos y Condiciones y la Política de Privacidad.</li>
                  <li>Selecciona <strong>Registrarse</strong> y verifica tu correo con el código de 6 dígitos para completar el proceso.</li>
                </ol>
                <p className="ayuda-nota">
                  Si no ves el código, revisa la bandeja de spam y confirma que
                  escribiste correctamente tu correo.
                </p>
                <Link className="ayuda-enlace" to="/registro">Ir a crear una cuenta <span aria-hidden="true"></span></Link>
              </div>
            )}
          </div>
          </section>

          <section className="ayuda-seccion" id="iniciar-sesion">
          <div className="ayuda-seccion-numero" aria-hidden="true">02</div>
          <div className={`ayuda-acordeon${acordeonAbierto === 'iniciar-sesion' ? ' ayuda-acordeon-abierto' : ''}`}>
            <button
              type="button"
              className="ayuda-acordeon-titulo"
              aria-expanded={acordeonAbierto === 'iniciar-sesion'}
              aria-controls="contenido-iniciar-sesion"
              onClick={() => alternarAcordeon('iniciar-sesion')}
            >
              <span className="ayuda-etiqueta">YA TENGO UNA CUENTA</span>
              <h2>¿Cómo iniciar sesión?</h2>
            </button>
            {acordeonAbierto === 'iniciar-sesion' && (
              <div className="ayuda-seccion-contenido" id="contenido-iniciar-sesion">
                <p>
                  Abre <strong>Iniciar sesión</strong> desde el icono de usuario en
                  la barra de navegación. Ingresa el correo y la contraseña que
                  registraste y selecciona <strong>Iniciar sesión</strong>.
                </p>
                <ol className="ayuda-lista">
                  <li>También puedes usar la opción <strong>Continuar con Google</strong> que aparece en esa página.</li>
                  <li>Si la contraseña no es correcta o no la recuerdas, utiliza el enlace <strong>¿Recuperar tu contraseña?</strong>.</li>
                  <li>Al iniciar sesión podrás continuar con las opciones de pedido disponibles en el menú.</li>
                </ol>
                <Link className="ayuda-enlace" to="/login">Ir a iniciar sesión <span aria-hidden="true"></span></Link>
              </div>
            )}
          </div>
          </section>

          <section className="ayuda-seccion" id="recuperar-contrasena">
          <div className="ayuda-seccion-numero" aria-hidden="true">03</div>
          <div className={`ayuda-acordeon${acordeonAbierto === 'recuperar-contrasena' ? ' ayuda-acordeon-abierto' : ''}`}>
            <button
              type="button"
              className="ayuda-acordeon-titulo"
              aria-expanded={acordeonAbierto === 'recuperar-contrasena'}
              aria-controls="contenido-recuperar-contrasena"
              onClick={() => alternarAcordeon('recuperar-contrasena')}
            >
              <span className="ayuda-etiqueta">RECUPERACIÓN DE ACCESO</span>
              <h2>¿Olvidaste tu contraseña?</h2>
            </button>
            {acordeonAbierto === 'recuperar-contrasena' && (
              <div className="ayuda-seccion-contenido" id="contenido-recuperar-contrasena">
                <p>Sigue estos pasos para crear una contraseña nueva:</p>
                <ol className="ayuda-pasos">
                  <li>En la página de inicio de sesión, selecciona <strong>¿Recuperar tu contraseña?</strong>.</li>
                  <li>Escribe el correo asociado a tu cuenta y solicita el código de recuperación.</li>
                  <li>Ingresa los 6 dígitos recibidos en tu correo. Revisa también la carpeta de spam.</li>
                  <li>Escribe y confirma una contraseña nueva. Debe tener mínimo 8 caracteres, una mayúscula, un número y un símbolo.</li>
                  <li>Cuando se confirme el cambio, vuelve al inicio de sesión con tu nueva contraseña.</li>
                </ol>
                <p className="ayuda-nota">
                  Por seguridad, después de varios códigos incorrectos puede ser
                  necesario esperar antes de solicitar otro.
                </p>
                <Link className="ayuda-enlace" to="/recuperar-contrasena">Recuperar mi contraseña <span aria-hidden="true"></span></Link>
              </div>
            )}
          </div>
          </section>

          <section className="ayuda-explorar" id="explorar">
          <div className={`ayuda-explorar-acordeon${acordeonAbierto === 'explorar' ? ' ayuda-acordeon-abierto' : ''}`}>
            <button
              type="button"
              className="ayuda-acordeon-titulo"
              aria-expanded={acordeonAbierto === 'explorar'}
              aria-controls="contenido-explorar"
              onClick={() => alternarAcordeon('explorar')}
            >
              <span className="ayuda-etiqueta">ANTES DE INICIAR SESIÓN</span>
              <h2>Explora el sitio</h2>
              <p>Puedes conocer el local y consultar el menú sin iniciar sesión.</p>
            </button>
            {acordeonAbierto === 'explorar' && (
              <div className="ayuda-enlaces-explorar" id="contenido-explorar">
                <Link to="/">Inicio <span>Conoce las novedades y promociones.</span></Link>
                <Link to="/nosotros">Nosotros <span>Conoce nuestra historia y ubicación.</span></Link>
                <Link to="/menu-publico">Menú <span>Consulta los productos disponibles.</span></Link>
                <Link to="/contactanos">Contáctanos <span>Encuentra nuestros canales de atención.</span></Link>
                <button type="button" onClick={() => setDocumentoLegal('terminos')} aria-haspopup="dialog">
                  Términos y condiciones <span>Consulta las condiciones de uso.</span>
                </button>
                <button type="button" onClick={() => setDocumentoLegal('privacidad')} aria-haspopup="dialog">
                  Política de privacidad <span>Conoce cómo se tratan tus datos.</span>
                </button>
              </div>
            )}
          </div>
          </section>
        </div>

        <section className="ayuda-contacto">
          <p>¿Necesitas más ayuda?</p>
          <Link to="/contactanos">Visita nuestra página de contactanos <span aria-hidden="true"></span></Link>
        </section>
      </main>

      {documentoLegal && (
        <ModalLegal
          documentoInicial={documentoLegal}
          onClose={() => setDocumentoLegal(null)}
        />
      )}
      <Footer />
    </div>
  );
}