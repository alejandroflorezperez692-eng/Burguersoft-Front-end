import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import Boton from '../components/Boton';
import apiClient from '../api/client';

const RESPONSABLE = {
  razonSocial: 'Comidas Rápidas El Oriente (BurguerSoft)',
  direccion: 'Calle 9 # 1A-43, Barrio El Oriente, Sogamoso, Boyacá, Colombia',
  correo: 'ComidasElOriente@gmail.com',
  telefonos: '311 538 7534 y 312 361 6372',
};

const ACTUALIZACION = '21 de noviembre de 2026';

export default function PoliticaLegal() {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const [nit, setNit] = useState('Por confirmar');

  useEffect(() => {
    let vivo = true;
    apiClient
      .get<{ nit?: string }>('/negocio')
      .then(({ data }) => {
        const valor = String(data?.nit ?? '').trim();
        if (vivo && valor) setNit(valor);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    const destino = hash.slice(1);
    const temporizador = window.setTimeout(() => {
      document.getElementById(destino)?.scrollIntoView({ behavior: 'instant', block: 'start' });
    }, 120);
    return () => window.clearTimeout(temporizador);
  }, [hash]);

  const volver = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/login');
  };

  return (
    <AuthLayout regresarA="/login">
      <div className="legal-page">
        <h1 className="legal-titulo">TÉRMINOS, DATOS PERSONALES Y CONDICIONES DE USO</h1>
        <p style={{ textAlign: 'center', fontSize: 13, opacity: 0.8 }}>
          Última actualización: {ACTUALIZACION}
        </p>

        <nav aria-label="Contenido" className="legal-indice">
          <strong>Contenido</strong>
          <ul>
            <li><a href="#terminos">1. Términos y Condiciones de Uso</a></li>
            <li><a href="#datos">2. Política de Tratamiento de Datos Personales (Habeas Data)</a></li>
            <li><a href="#derechos">3. Derechos del titular y cómo ejercerlos</a></li>
            <li><a href="#cookies">4. Cookies, seguridad y cambios</a></li>
          </ul>
        </nav>

        {/* ===================== 1. TÉRMINOS ===================== */}
        <section id="terminos">
          <h2>1. Términos y Condiciones de Uso</h2>

          <h3>1.1 Aceptación</h3>
          <p>
            Al registrarte, iniciar sesión o usar la plataforma BurguerSoft aceptas estos términos
            y la Política de Tratamiento de Datos Personales. Si no estás de acuerdo, no debes usar
            el servicio.
          </p>

          <h3>1.2 Cuenta de usuario</h3>
          <p>
            Debes entregar información veraz, completa y actualizada. Eres responsable de la
            confidencialidad de tu contraseña y de las acciones hechas con tu cuenta. Los menores
            de 18 años solo pueden usar la plataforma con autorización y supervisión de su
            representante legal.
          </p>

          <h3>1.3 Pedidos, precios y pagos</h3>
          <p>
            Los pedidos están sujetos a disponibilidad de productos y a la confirmación del
            establecimiento. Los precios se expresan en pesos colombianos (COP) e incluyen los
            impuestos que apliquen. Los medios de pago y comprobantes se gestionan según lo
            indicado en el proceso de compra.
          </p>

          <h3>1.4 Derechos del consumidor</h3>
          <p>
            Las compras se rigen por el Estatuto del Consumidor (Ley 1480 de 2011) y por la Ley
            527 de 1999 sobre comercio electrónico. Puedes presentar peticiones, quejas o reclamos
            por los canales de contacto de esta página.
          </p>

          <h3>1.5 Uso adecuado y propiedad intelectual</h3>
          <p>
            Te comprometes a no usar la plataforma para fines ilícitos, a no intentar acceder sin
            autorización a otras cuentas o sistemas, y a no alterar su funcionamiento. El nombre,
            logos, textos, imágenes y software de la plataforma pertenecen a {RESPONSABLE.razonSocial}
            {' '}o a sus licenciantes y no pueden copiarse sin autorización.
          </p>

          <h3>1.6 Limitación de responsabilidad</h3>
          <p>
            Hacemos lo posible por mantener el servicio disponible, pero no garantizamos que esté
            libre de interrupciones o errores. No respondemos por fallas ajenas a nuestro control,
            como caídas de internet o de servicios de terceros.
          </p>

          <h3>1.7 Ley aplicable</h3>
          <p>
            Estos términos se rigen por las leyes de la República de Colombia. Cualquier
            controversia se resolverá ante las autoridades competentes en Colombia.
          </p>
        </section>

        {/* ===================== 2. DATOS PERSONALES ===================== */}
        <section id="datos">
          <h2>2. Política de Tratamiento de Datos Personales (Habeas Data)</h2>

          <h3>2.1 Marco normativo</h3>
          <p>
            Esta política se expide en cumplimiento de los artículos 15 y 20 de la Constitución
            Política de Colombia, la <strong>Ley 1581 de 2012</strong> (régimen general de
            protección de datos personales) y el <strong>Decreto 1377 de 2013</strong>, compilado en
            el Decreto Único 1074 de 2015, la Ley 1273 de 2009 y las disposiciones sobre el
            Registro Nacional de Bases de Datos (RNBD), y demás normas que los modifiquen o
            complementen.
          </p>

          <h3>2.2 Responsable del tratamiento</h3>
          <ul>
            <li><strong>Razón social:</strong> {RESPONSABLE.razonSocial}</li>
            <li><strong>NIT:</strong> {nit}{nit === 'Por confirmar' ? ' (dato pendiente de confirmación)' : ''}</li>
            <li><strong>Dirección:</strong> {RESPONSABLE.direccion}</li>
            <li><strong>Correo electrónico:</strong> {RESPONSABLE.correo}</li>
            <li><strong>Teléfonos:</strong> {RESPONSABLE.telefonos}</li>
          </ul>

          <h3>2.3 Datos que recolectamos</h3>
          <p>
            Nombre y apellido, tipo y número de documento de identidad, correo electrónico,
            teléfono, datos necesarios para la entrega y facturación de los pedidos, comprobantes
            de pago y datos técnicos de uso (por ejemplo, dirección IP y tipo de navegador). Si
            inicias sesión con Google, recibimos tu nombre y correo según los permisos que
            autorices. No solicitamos datos sensibles.
          </p>

          <h3>2.4 Finalidades del tratamiento</h3>
          <ul>
            <li>Crear y administrar tu cuenta y verificar tu identidad.</li>
            <li>Procesar, entregar y facturar tus pedidos y gestionar los pagos.</li>
            <li>Enviarte notificaciones sobre el estado de tus pedidos y avisos del servicio.</li>
            <li>Atender tus peticiones, quejas y reclamos.</li>
            <li>Cumplir obligaciones legales, contables y tributarias.</li>
            <li>Mejorar la plataforma y garantizar su seguridad.</li>
          </ul>
          <p>No usaremos tus datos para finalidades distintas sin pedirte una nueva autorización.</p>

          <h3>2.5 Autorización</h3>
          <p>
            El tratamiento de tus datos requiere tu autorización previa, expresa e informada
            (artículo 9 de la Ley 1581 de 2012). La das al marcar la casilla de aceptación en el
            registro. Puedes revocarla en cualquier momento, salvo que exista un deber legal o
            contractual de conservar los datos.
          </p>

          <h3>2.6 Datos de menores de edad</h3>
          <p>
            No tratamos datos de niños, niñas y adolescentes sin autorización de su representante
            legal, y siempre respetando su interés superior y sus derechos fundamentales
            (artículo 7 de la Ley 1581 de 2012).
          </p>

          <h3>2.7 Transmisión y transferencia de datos</h3>
          <p>
            No vendemos tus datos. Podemos compartirlos con proveedores que nos prestan servicios
            (alojamiento, correo electrónico, autenticación y pagos) únicamente para cumplir las
            finalidades de esta política, o con autoridades cuando la ley lo exija.
          </p>

          <h3>2.8 Conservación</h3>
          <p>
            Conservamos tus datos mientras mantengas tu cuenta y durante el tiempo que exijan las
            obligaciones legales, contables y tributarias. Después los eliminamos o anonimizamos.
          </p>
        </section>

        {/* ===================== 3. DERECHOS ===================== */}
        <section id="derechos">
          <h2>3. Derechos del titular y cómo ejercerlos</h2>

          <h3>3.1 Tus derechos (artículo 8, Ley 1581 de 2012)</h3>
          <ul>
            <li>Conocer, actualizar y rectificar tus datos personales.</li>
            <li>Solicitar prueba de la autorización que nos diste.</li>
            <li>Ser informado, previa solicitud, del uso que se ha dado a tus datos.</li>
            <li>Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) por
              infracciones a la ley.</li>
            <li>Revocar la autorización y/o solicitar la supresión de tus datos cuando no se
              respeten los principios, derechos y garantías legales.</li>
            <li>Acceder de forma gratuita a tus datos personales.</li>
          </ul>

          <h3>3.2 Consultas</h3>
          <p>
            Puedes consultar los datos que tenemos sobre ti escribiendo a {RESPONSABLE.correo}.
            Responderemos en un máximo de <strong>10 días hábiles</strong>. Si no podemos hacerlo
            en ese plazo, te informaremos los motivos y la nueva fecha, que no superará 5 días
            hábiles adicionales (artículo 14 de la Ley 1581 de 2012).
          </p>

          <h3>3.3 Reclamos</h3>
          <p>
            Si quieres corregir, actualizar o suprimir tus datos, o revocar tu autorización, envía
            un reclamo a {RESPONSABLE.correo} con tu nombre, documento, descripción de los hechos y
            los datos de contacto. Si está incompleto, te pediremos corregirlo dentro de los 5 días
            siguientes. Resolveremos en un máximo de <strong>15 días hábiles</strong>, prorrogables
            por 8 días hábiles más si es necesario, informándote los motivos (artículo 15 de la
            Ley 1581 de 2012).
          </p>

          <h3>3.4 Derechos ARCO y derecho de oposición</h3>
          <p>
            Estas garantías se resumen en la sigla <strong>ARCO</strong>: Acceso, Rectificación,
            Cancelación y Oposición. En Colombia se conocen como derechos de Habeas Data y se
            ejercen conforme a la Ley 1581 de 2012. El <strong>derecho de oposición</strong> te
            permite oponerte al tratamiento de tus datos cuando no sea necesario para las
            finalidades informadas, cuando se les quiera dar un uso distinto o cuando la ley lo
            autorice. También puedes revocar tu autorización y solicitar la supresión o
            cancelación de tus datos, salvo que exista un deber legal o contractual de
            conservarlos. Para ejercer cualquiera de estos derechos, escribe a {RESPONSABLE.correo}.
          </p>

          <h3>3.5 Autoridad de control</h3>
          <p>
            Si consideras que no atendimos tu solicitud, puedes presentar una queja ante la
            Superintendencia de Industria y Comercio (www.sic.gov.co), una vez agotado el trámite
            de consulta o reclamo ante nosotros.
          </p>
        </section>

        {/* ===================== 4. COOKIES, SEGURIDAD, CAMBIOS ===================== */}
        <section id="cookies">
          <h2>4. Cookies, seguridad y cambios</h2>

          <h3>4.1 Cookies</h3>
          <p>
            El sitio usa cookies y almacenamiento local para mantener tu sesión, recordar tus
            preferencias y mejorar la experiencia. Puedes configurar tu navegador para
            rechazarlas, aunque algunas funciones podrían dejar de funcionar.
          </p>

          <h3>4.2 Seguridad</h3>
          <p>
            Aplicamos medidas técnicas y organizativas para proteger tus datos contra acceso no
            autorizado, pérdida o alteración. Ningún sistema es completamente infalible, por lo
            que te recomendamos usar una contraseña segura y no compartirla.
          </p>

          <h3>4.3 Cambios y vigencia</h3>
          <p>
            Podemos actualizar este documento. Los cambios sustanciales se informarán en la
            plataforma. Esta versión rige desde el {ACTUALIZACION} y permanece vigente mientras se
            traten datos personales para las finalidades descritas.
          </p>
        </section>

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
          <Boton variante="volver" onClick={volver}>Volver</Boton>
        </div>
      </div>
    </AuthLayout>
  );
}
