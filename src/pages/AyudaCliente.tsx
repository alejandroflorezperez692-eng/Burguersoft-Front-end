import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LifeBuoy } from 'lucide-react';
import PublicHeader from '../components/PublicHeader';
import Footer from '../components/Footer';
import '../styles/ayuda.css';

const TEMAS = [
  'Explorar el menú',
  'Usar el carrito',
  'Completar y pagar un pedido',
  'Consultar o cancelar pedidos',
  'Administrar mi cuenta',
];

export default function AyudaCliente() {
  const [temaAbierto, setTemaAbierto] = useState<string | null>(null);

  const alternarTema = (tema: string) => {
    setTemaAbierto((actual) => (actual === tema ? null : tema));
  };

  return (
    <div className="public-body">
      <PublicHeader />

      <main className="ayuda-page ayuda-cliente-page">
        <section className="ayuda-hero" aria-labelledby="ayuda-cliente-title">
          <LifeBuoy className="ayuda-hero-icono" size={40} aria-hidden="true" />
          <div className="ayuda-hero-contenido">
            <span className="ayuda-etiqueta">AYUDA PARA CLIENTES</span>
            <h1 id="ayuda-cliente-title">Disfruta tu experiencia en El Oriente</h1>
            <p>
              Aprende a explorar el menú, realizar un pedido, revisar su estado
              y administrar tu cuenta.
            </p>
          </div>
        </section>

        <div className="ayuda-temas">
          <section className="ayuda-seccion" id="ayuda-menu">
            <div className="ayuda-seccion-numero" aria-hidden="true">01</div>
            <div className={`ayuda-acordeon${temaAbierto === TEMAS[0] ? ' ayuda-acordeon-abierto' : ''}`}>
              <button
                type="button"
                className="ayuda-acordeon-titulo"
                aria-expanded={temaAbierto === TEMAS[0]}
                aria-controls="ayuda-cliente-menu-contenido"
                onClick={() => alternarTema(TEMAS[0])}
              >
                <span className="ayuda-etiqueta">PRODUCTOS Y PROMOCIONES</span>
                <h2>{TEMAS[0]}</h2>
              </button>
              {temaAbierto === TEMAS[0] && (
                <div className="ayuda-seccion-contenido" id="ayuda-cliente-menu-contenido">
                  <p>Consulta los productos y agrégalos a tu carrito cuando quieras pedir.</p>
                  <ol className="ayuda-pasos">
                    <li>Abre <strong>Menú</strong> para ver los productos organizados por categoría. En <strong>Inicio</strong> también puedes consultar las promociones disponibles.</li>
                    <li>Selecciona el botón <strong>+</strong> del producto que quieras agregar. Debes haber iniciado sesión para pedir.</li>
                    <li>Abre el carrito desde el icono de la parte superior para revisar lo que agregaste.</li>
                  </ol>
                  <Link className="ayuda-enlace" to="/menu-publico">Ir al menú <span aria-hidden="true" /></Link>
                </div>
              )}
            </div>
          </section>

          <section className="ayuda-seccion" id="ayuda-carrito">
            <div className="ayuda-seccion-numero" aria-hidden="true">02</div>
            <div className={`ayuda-acordeon${temaAbierto === TEMAS[1] ? ' ayuda-acordeon-abierto' : ''}`}>
              <button
                type="button"
                className="ayuda-acordeon-titulo"
                aria-expanded={temaAbierto === TEMAS[1]}
                aria-controls="ayuda-cliente-carrito-contenido"
                onClick={() => alternarTema(TEMAS[1])}
              >
                <span className="ayuda-etiqueta">REVISA TU SELECCIÓN</span>
                <h2>{TEMAS[1]}</h2>
              </button>
              {temaAbierto === TEMAS[1] && (
                <div className="ayuda-seccion-contenido" id="ayuda-cliente-carrito-contenido">
                  <ol className="ayuda-pasos">
                    <li>Usa los botones <strong>+</strong> y <strong>−</strong> para cambiar cantidades; selecciona <strong>Eliminar</strong> para quitar un producto o <strong>Vaciar carrito</strong> para retirar todo.</li>
                    <li>Elige si tu pedido será a <strong>Domicilio</strong>, <strong>Para recoger</strong> o <strong>En restaurante</strong>.</li>
                    <li>Indica <strong>Lo antes posible</strong> o <strong>Programar para más tarde</strong>. Si programas el pedido, selecciona una fecha y una hora disponible.</li>
                    <li>Confirma el tipo de pedido y selecciona <strong>Ir a pagar</strong> para continuar.</li>
                  </ol>
                </div>
              )}
            </div>
          </section>

          <section className="ayuda-seccion" id="ayuda-pago">
            <div className="ayuda-seccion-numero" aria-hidden="true">03</div>
            <div className={`ayuda-acordeon${temaAbierto === TEMAS[2] ? ' ayuda-acordeon-abierto' : ''}`}>
              <button
                type="button"
                className="ayuda-acordeon-titulo"
                aria-expanded={temaAbierto === TEMAS[2]}
                aria-controls="ayuda-cliente-pago-contenido"
                onClick={() => alternarTema(TEMAS[2])}
              >
                <span className="ayuda-etiqueta">FINALIZA TU COMPRA</span>
                <h2>{TEMAS[2]}</h2>
              </button>
              {temaAbierto === TEMAS[2] && (
                <div className="ayuda-seccion-contenido" id="ayuda-cliente-pago-contenido">
                  <ol className="ayuda-pasos">
                    <li>Revisa los datos de tu pedido. Para domicilio, completa la dirección y el barrio; puedes usar tu ubicación actual o escribirlos manualmente.</li>
                    <li>Verifica tus datos y agrega un teléfono de contacto. Si necesitas otros datos en la factura, desmarca la opción de usar tu información.</li>
                    <li>Escoge pago por <strong>Nequi</strong>, <strong>Daviplata</strong>, <strong>Bancolombia</strong> o <strong>efectivo contra entrega</strong>.</li>
                    <li>Selecciona <strong>Pagar ahora</strong>. Si pagaste por transferencia, envía el comprobante por el chat de WhatsApp que se abre al confirmar el pedido.</li>
                  </ol>
                  <p className="ayuda-nota">
                    Si el navegador bloquea WhatsApp, usa el botón para volver a abrir el chat en la pantalla de confirmación. La factura también puede enviarse al correo mostrado allí.
                  </p>
                  <Link className="ayuda-enlace" to="/checkout">Ir a finalizar pedido <span aria-hidden="true" /></Link>
                </div>
              )}
            </div>
          </section>

          <section className="ayuda-seccion" id="ayuda-pedidos">
            <div className="ayuda-seccion-numero" aria-hidden="true">04</div>
            <div className={`ayuda-acordeon${temaAbierto === TEMAS[3] ? ' ayuda-acordeon-abierto' : ''}`}>
              <button
                type="button"
                className="ayuda-acordeon-titulo"
                aria-expanded={temaAbierto === TEMAS[3]}
                aria-controls="ayuda-cliente-pedidos-contenido"
                onClick={() => alternarTema(TEMAS[3])}
              >
                <span className="ayuda-etiqueta">ESTADO DE TU COMPRA</span>
                <h2>{TEMAS[3]}</h2>
              </button>
              {temaAbierto === TEMAS[3] && (
                <div className="ayuda-seccion-contenido" id="ayuda-cliente-pedidos-contenido">
                  <ol className="ayuda-pasos">
                    <li>Abre tu menú de perfil y selecciona <strong>Mis pedidos</strong> para ver el estado, el tipo de entrega, los productos y el total.</li>
                    <li>La lista se actualiza automáticamente y también puedes usar <strong>Actualizar</strong> para consultar el estado más reciente.</li>
                    <li>Si el pedido aún está <strong>Registrado</strong>, <strong>Por verificar</strong> o <strong>Recepcionado</strong>, puedes seleccionar <strong>Cancelar pedido</strong> y confirmar la acción.</li>
                  </ol>
                  <p className="ayuda-nota">
                    Cuando el pedido avance a otro estado, la opción de cancelación puede dejar de estar disponible. En ese caso, comunícate con el local.
                  </p>
                  <Link className="ayuda-enlace" to="/mis-pedidos">Ver mis pedidos <span aria-hidden="true" /></Link>
                </div>
              )}
            </div>
          </section>

          <section className="ayuda-seccion" id="ayuda-cuenta">
            <div className="ayuda-seccion-numero" aria-hidden="true">05</div>
            <div className={`ayuda-acordeon${temaAbierto === TEMAS[4] ? ' ayuda-acordeon-abierto' : ''}`}>
              <button
                type="button"
                className="ayuda-acordeon-titulo"
                aria-expanded={temaAbierto === TEMAS[4]}
                aria-controls="ayuda-cliente-cuenta-contenido"
                onClick={() => alternarTema(TEMAS[4])}
              >
                <span className="ayuda-etiqueta">PERFIL Y SEGURIDAD</span>
                <h2>{TEMAS[4]}</h2>
              </button>
              {temaAbierto === TEMAS[4] && (
                <div className="ayuda-seccion-contenido" id="ayuda-cliente-cuenta-contenido">
                  <ol className="ayuda-pasos">
                    <li>Abre el menú de tu perfil en la parte superior y selecciona <strong>Editar perfil</strong>.</li>
                    <li>En <strong>Mis datos</strong>, actualiza tu información personal, documento o teléfono y guarda los cambios. El correo registrado no se puede cambiar desde allí.</li>
                    <li>En la pestaña <strong>Contraseña</strong>, ingresa tu contraseña actual y la nueva; debe cumplir los requisitos de seguridad y confirmarse correctamente.</li>
                    <li>Consulta los datos guardados y el estado de tu cuenta desde la pestaña <strong>Cuenta</strong>.</li>
                  </ol>
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="ayuda-contacto">
          <p>¿Necesitas ayuda con tu pedido?</p>
          <Link to="/contactanos">Visita nuestra página de contactanos <span aria-hidden="true" /></Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}