import PublicHeader from '../components/PublicHeader';
import HeroCarousel from '../components/HeroCarousel';
import Footer from '../components/Footer';
import Accesibilidad from '../components/Accesibilidad';
import localImg from '../assets/img/Local.png';

export default function Nosotros() {
  return (
    <div className="public-body">
      <PublicHeader />

      <HeroCarousel />

      <section className="nosotros-section">
        <div className="nosotros-content">
          <h2>Sobre Nosotros</h2>
          <p>
            En Comidas Rápidas El Oriente llevamos 14 años compartiendo sabor y
            tradición con Sogamoso. Desde nuestro inicio, hemos trabajado con
            pasión para ofrecer hamburguesas, salchipapas y mucho más,
            preparados con ingredientes frescos y un toque único que nos ha
            convertido en el favorito de las comidas rápidas en la ciudad.
          </p>
          <p>
            Somos un lugar donde la buena atención, las porciones generosas y el
            ambiente familiar hacen que cada visita sea una experiencia que vale
            la pena repetir.
          </p>
          <p>14 años de sabor y tradición. Calidad en cada plato, calidez en cada visita.</p>
        </div>
        <div className="nosotros-img">
          <img src={localImg} alt="Nuestro Local" />
        </div>
      </section>

      <section className="nosotros-ubicacion">
        <h2 className="section-title">¿Dónde nos encontramos?</h2>
        <p className="section-text">
          Encuéntranos en el corazón de Sogamoso. Ven y disfruta de nuestros
          deliciosos platos en un ambiente acogedor y familiar.
        </p>
        <br />
        <p className="section-text">Calle 9 #1A-43, Barrio El Oriente</p>
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
      <Accesibilidad />
    </div>
  );
}
