import PublicHeader from '../components/PublicHeader';
import Footer from '../components/Footer';

export default function TerminosPrivacidad() {
  return (
    <div className="public-body">
      <PublicHeader />
      <main style={{ maxWidth: 900, margin: '40px auto', padding: '0 24px 60px' }}>
        <h1 style={{ color: 'var(--brand, #E8821A)', marginBottom: 8 }}>Términos y Condiciones</h1>
        <p style={{ marginBottom: 24, color: 'var(--text-700)' }}>
          Bienvenido a El Oriente. Al usar nuestro sitio y servicios, aceptas los siguientes términos y condiciones.
        </p>

        <section id="terminos" style={{ marginBottom: 40 }}>
          <h2>Términos y Condiciones de Uso</h2>
          <p>
            El acceso y uso de la plataforma Burguersoft está sujeto a las presentes condiciones. El usuario se compromete a
            proporcionar información veraz y a hacer un uso adecuado de los servicios ofrecidos por El Oriente.
          </p>
          <p>
            El Oriente se reserva el derecho de modificar estos términos en cualquier momento. El uso continuado de la
            plataforma implica la aceptación de las modificaciones.
          </p>
          <p>
            Los pedidos realizados a través de la plataforma están sujetos a disponibilidad de productos y confirmación del
            establecimiento.
          </p>
        </section>

        <section id="privacidad">
          <h1 style={{ color: 'var(--brand, #E8821A)', marginBottom: 8 }}>Política de Privacidad</h1>
          <p style={{ marginBottom: 24, color: 'var(--text-700)' }}>
            En El Oriente protegemos tus datos personales conforme a la normatividad vigente.
          </p>
          <p>
            Recopilamos la información necesaria para procesar tus pedidos y mejorar tu experiencia, incluyendo nombre, correo
            electrónico, documento de identidad y datos de contacto.
          </p>
          <p>
            Tus datos no serán compartidos con terceros sin tu autorización, salvo cuando sea requerido por la ley o necesario
            para la prestación del servicio.
          </p>
          <p>
            Puedes solicitar la actualización, corrección o eliminación de tus datos personales contactándonos a través de
            nuestros canales oficiales.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
