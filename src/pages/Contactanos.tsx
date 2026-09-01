import { useState } from 'react';
import PublicHeader from '../components/PublicHeader';
import HeroCarousel from '../components/HeroCarousel';
import Footer from '../components/Footer';
import Accesibilidad from '../components/Accesibilidad';
import '../styles/public.css';
import '../styles/contactanos.css';

export default function Contactanos() {
  const [showWspMenu, setShowWspMenu] = useState(false);

  return (
    <div className="public-body">
      <PublicHeader />

      <HeroCarousel />

      <section className="contact-section">
        <h1>¡Contáctanos!</h1>
        <br />
        <p className="descripcion">
          ¿Tienes alguna pregunta, quieres hacer un pedido especial
          o simplemente quieres saludarnos? Estamos disponibles
          en todas nuestras plataformas. ¡Con gusto te atendemos!
          
        </p>

        <div className="icons-container">
          <div className="icon-box">
            <button
              className="icon-button"
              onClick={() => setShowWspMenu(!showWspMenu)}
            >
              <img src="/estilos/img/whatsapp.png" alt="WhatsApp" />
            </button>

            {showWspMenu && (
              <div className="wsp-menu">
                <a
                  href="https://wa.link/h48kng"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  311 538 7534
                </a>
                <hr />
                <a
                  href="https://wa.link/ej3tjx"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  312 361 6372
                </a>
              </div>
            )}
            <p>WhatsApp</p>
          </div>

          <div className="icon-box">
            <button className="icon-button">
              <a href="https://www.facebook.com/ComidasElOriente" target="_blank" rel="noopener noreferrer">
                <img src="/estilos/img/facebook.png" alt="Facebook" />
              </a>
            </button>
            <p>Comidas El Oriente</p>
          </div>

          <div className="icon-box">
            <button className="icon-button">
              <a href="https://www.instagram.com/ComidasElOriente" target="_blank" rel="noopener noreferrer">
                <img src="/estilos/img/instagram.png" alt="Instagram" />
              </a>
            </button>
            <p>@ComidasElOriente</p>
          </div>

          <div className="icon-box">
            <button className="icon-button">
              <a href="mailto:ComidasElOriente@gmail.com">
                <img src="/estilos/img/gmail.png" alt="Correo" />
              </a>
            </button>
            <p>ElOriente@gmail.com</p>
          </div>
        </div>
      </section>

      <Footer />
      <Accesibilidad />
    </div>
  );
}
