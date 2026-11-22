import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import HeroCarousel from '../components/HeroCarousel';
import Footer from '../components/Footer';
import nosotrosImg1 from '../assets/img/nosotros-1.png';
import nosotrosImg2 from '../assets/img/nosotros-2.png';

const IMAGENES_NOSOTROS = [nosotrosImg1, nosotrosImg2];

export default function Nosotros() {
  const [indice, setIndice] = useState(0);
  const total = IMAGENES_NOSOTROS.length;
  const { hash } = useLocation();

  useEffect(() => {
    const temporizador = window.setInterval(() => setIndice((i) => (i + 1) % total), 3000);
    return () => window.clearInterval(temporizador);
  }, [total]);

  useEffect(() => {
    if (!hash) return;
    const id = hash.slice(1);
    const temporizador = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'instant', block: 'start' });
    }, 120);
    return () => window.clearTimeout(temporizador);
  }, [hash]);

  return (
    <div className="public-body">
      <PublicHeader />

      <HeroCarousel />

      <section className="nosotros-section" id="quienes-somos">
        <div className="nosotros-content">
          <h2>Quiénes somos</h2>
          <p>
            En Comidas Rápidas El Oriente llevamos 14 años compartiendo sabor y
            tradición con Sogamoso. Desde nuestro inicio, hemos trabajado con
            pasión para ofrecer hamburguesas, salchipapas y mucho más,
            preparados con ingredientes frescos y un toque único que nos ha
            convertido en el favorito de la ciudad para las comidas rápidas.
          </p>
          <p>
            Somos un lugar donde la buena atención, las porciones generosas y el
            ambiente familiar hacen que cada visita sea una experiencia que vale
            la pena repetir.
          </p>
        </div>
        <div className="nosotros-img">
          <div className="nosotros-carousel">
            <img key={indice} src={IMAGENES_NOSOTROS[indice]} alt="Nuestro Local" />
          </div>
        </div>
      </section>

      <section className="nosotros-section nosotros-info" id="historia">
        <div className="nosotros-content">
          <h2>Nuestra historia</h2>
          <p>
            Todo comenzó hace 14 años en el barrio El Oriente de Sogamoso, con
            una idea sencilla: preparar comida rápida con el sabor de siempre y
            servirla con una sonrisa. Aquella pequeña cocina se convirtió, poco a
            poco, en un punto de encuentro para familias, estudiantes y
            trabajadores de la ciudad.
          </p>
          <p>
            Hoy seguimos guiados por la misma receta: ingredientes frescos,
            porciones generosas y atención cercana. Cada plato que servimos lleva
            el sabor y la tradición que nos han acompañado durante más de una
            década.
          </p>
          <p>14 años de sabor y tradición. Calidad en cada plato, calidez en cada visita.</p>
        </div>
      </section>

      <section className="nosotros-section nosotros-info" id="mision-vision">
        <div className="nosotros-content">
          <h2>Misión y visión</h2>
          <div className="nosotros-info-grid" id="mision">
            <article className="nosotros-tarjeta">
              <h3>Misión</h3>
              <p>
                Ofrecer comidas rápidas deliciosas, frescas y accesibles,
                preparadas con altos estándares de calidad y servidas con una
                atención cálida que haga sentir en casa a cada cliente de
                Sogamoso.
              </p>
            </article>
            <article className="nosotros-tarjeta" id="vision">
              <h3>Visión</h3>
              <p>
                Ser la marca de comidas rápidas preferida en nuestra ciudad,
                reconocida por su sabor auténtico, su compromiso con la calidad
                y su capacidad de innovar sin perder la esencia familiar que nos
                caracteriza.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="nosotros-section nosotros-info" id="valores">
        <div className="nosotros-content">
          <h2>Nuestros valores</h2>
          <div className="nosotros-info-grid">
            <article className="nosotros-tarjeta">
              <h3>Calidad</h3>
              <p>Ingredientes frescos y preparación cuidada en cada pedido.</p>
            </article>
            <article className="nosotros-tarjeta">
              <h3>Calidez</h3>
              <p>Atención cercana y respetuosa con clientes y colaboradores.</p>
            </article>
            <article className="nosotros-tarjeta">
              <h3>Compromiso</h3>
              <p>Cumplir lo que prometemos, siempre y con puntualidad.</p>
            </article>
            <article className="nosotros-tarjeta">
              <h3>Innovación</h3>
              <p>Nuevas opciones que mantienen vivo el sabor de siempre.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="nosotros-section nosotros-info" id="portafolio">
        <div className="nosotros-content">
          <h2>Portfolio de productos y servicios</h2>
          <div className="nosotros-info-grid">
            <article className="nosotros-tarjeta">
              <h3>Hamburguesas</h3>
              <p>Clásicas, dobles y especiales, preparadas con carne a la parrilla.</p>
            </article>
            <article className="nosotros-tarjeta">
              <h3>Salchipapas y acompañamientos</h3>
              <p>Porciones generosas para compartir o disfrutar solo.</p>
            </article>
            <article className="nosotros-tarjeta">
              <h3>Combos y promociones</h3>
              <p>Opciones económicas pensadas para toda la familia.</p>
            </article>
            <article className="nosotros-tarjeta">
              <h3>Bebidas y adiciones</h3>
              <p>El complemento perfecto para cada pedido.</p>
            </article>
          </div>
          <p style={{ marginTop: 18 }}>
            <Link to="/menu-publico" className="footer-legal-link">Ver menú completo</Link>
          </p>
        </div>
      </section>

      <section className="nosotros-ubicacion" id="contacto">
        <h2 className="section-title">¿Dónde nos encontramos?</h2>
        <p className="section-text">
          Encuéntranos en el corazón de Sogamoso. Ven y disfruta de nuestros
          deliciosos platos en un ambiente acogedor y familiar.
        </p>
        <br />
        <p className="section-text">Calle 9 # 1A-43, Barrio El Oriente</p>
        <p className="section-text">Sogamoso, Boyacá</p>
        <br />
        <p className="section-text">¡Te esperamos con el mejor sabor de la ciudad!</p>
      </section>

      <section className="map-content">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1211.7190490619414!2d-72.92133471077832!3d5.707706883119887!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e6a45e9b0c4a911%3A0x995f54933198b328!2sCl.%209%20%23%201A-43%2C%20Sogamoso%2C%20Boyac%C3%A1!5e1!3m2!1ses-419!2sco!4v1782927865632!5m2!1ses-419!2sco"
          title="Ubicación El Oriente"
          className="nosotros-map"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </section>

      <Footer />
    </div>
  );
}
