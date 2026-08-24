import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import apiClient from '../api/client';
import logoOscuro from '../assets/img/icono1-oscuro.png';
import promocionFallback from '../assets/img/promocion.png';
import '../styles/public.css';

const SLIDES = [
  'https://www.recetasnestle.com.ec/sites/default/files/srh_recipes/4e4293857c03d819e4ae51de1e86d66a.jpg',
  'https://ranchera.com.co/wp-content/uploads/2022/11/perro-colombiano-1.jpg',
  'https://chefstv.net/wp-content/uploads/2024/03/0045-empanadas-saltenas-fritas-wide-web.webp',
  'https://www.elespectador.com/resizer/v2/4YMEEW2QBVGALOUC7LSPUFNKMU.jpg?auth=1913090d3e141e8a3ccce35509259201363e9dddf853024e2f30ac71ce6383a9&width=1110&height=739&smart=true&quality=60',
];

type Promocion = {
  id: number;
  nombre: string;
  descripcion?: string | null;
  precio: number;
  imagen?: string | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
};

function formatCOP(valor: number): string {
  return `$${valor.toLocaleString('es-CO')}`;
}

export default function Home() {
  const [indice, setIndice] = useState(0);
  const pausadoRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  const reiniciarTimer = useCallback(() => {
    if (timerRef.current !== null) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!pausadoRef.current) {
        setIndice((i) => (i + 1) % SLIDES.length);
      }
    }, 3000);
  }, []);

  useEffect(() => {
    reiniciarTimer();
    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current);
    };
  }, [reiniciarTimer]);

  const mostrarSlide = (i: number) => {
    setIndice(((i % SLIDES.length) + SLIDES.length) % SLIDES.length);
    reiniciarTimer();
  };

  const [promos, setPromos] = useState<Promocion[] | null>(null);

  useEffect(() => {
    let cancelado = false;
    apiClient
      .get<Promocion[]>('/promociones')
      .then(({ data }) => {
        if (!cancelado) setPromos(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelado) setPromos([]);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const hoy = new Date().toISOString().slice(0, 10);
  const activas = (promos ?? []).filter((p) => {
    if (p.fecha_fin && p.fecha_fin < hoy) return false;
    if (p.fecha_inicio && p.fecha_inicio > hoy) return false;
    return true;
  });

  return (
    <div className="public-body">
      <PublicHeader />

      <section className="hero">
        <div className="carousel-container">
          {SLIDES.map((url, i) => (
            <div
              key={url}
              className={`carousel-slide${i === indice ? ' active' : ''}`}
              style={{ backgroundImage: `url('${url}')` }}
            />
          ))}
          <button
            type="button"
            className="carousel-prev"
            aria-label="Anterior"
            onClick={() => mostrarSlide(indice - 1)}
          >
            ❮
          </button>
          <button
            type="button"
            className="carousel-next"
            aria-label="Siguiente"
            onClick={() => mostrarSlide(indice + 1)}
          >
            ❯
          </button>
          <div className="carousel-indicators">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Slide ${i + 1}`}
                className={`carousel-indicator${i === indice ? ' active' : ''}`}
                onMouseEnter={() => {
                  pausadoRef.current = true;
                }}
                onMouseLeave={() => {
                  pausadoRef.current = false;
                }}
                onClick={() => mostrarSlide(i)}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="promociones">
        <h2>Combos Diarios</h2>
        <p>Disfruta de nuestros combos exclusivos por tiempo limitado.</p>
        <div className="grid-promociones">
          {promos === null ? null : activas.length === 0 ? (
            <p className="promo-vacio">No hay promociones activas en este momento.</p>
          ) : (
            activas.map((promo) => (
              <div className="promo-card-pub" key={promo.id}>
                <div className="promo-img-pub">
                  <img
                    src={promo.imagen || promocionFallback}
                    alt={promo.nombre}
                    onError={(e) => {
                      e.currentTarget.src = promocionFallback;
                    }}
                  />
                  <span className="promo-badge-pub">PROMO</span>
                </div>
                <div className="promo-info-pub">
                  <h3>{promo.nombre}</h3>
                  {promo.descripcion && <p>{promo.descripcion}</p>}
                  {(promo.fecha_inicio || promo.fecha_fin) && (
                    <div className="promo-fechas">
                      {promo.fecha_inicio && <>Desde {promo.fecha_inicio}</>}
                      {promo.fecha_fin && <> hasta {promo.fecha_fin}</>}
                    </div>
                  )}
                  <div className="promo-footer-pub">
                    <div className="promo-precio-pub">
                      {formatCOP(Number(promo.precio))}
                    </div>
                    <Link to="/login" title="Inicia sesión para pedir">
                      <button type="button" className="btn-circular-add btn-login">
                        +
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <footer>
        <div className="footer-container">
          <div className="footer-brand">
            <div className="footer-brand-text">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  justifyContent: 'center',
                  marginBottom: 10,
                }}
              >
                <img src={logoOscuro} alt="Logo de El Oriente" className="footer-logo" />
                <hr />
                <h3>El Oriente</h3>
              </div>
              <p>El sabor auténtico de El Oriente. Calidad y servicio en cada mordida.</p>
            </div>
          </div>
          <div className="footer-section">
            <h4>Horarios de atención</h4>
            <ul className="footer-horarios">
              <li>
                <span>Lunes – Viernes:</span> <span>3:30 PM – 10:00 PM</span>
              </li>
              <li>
                <span>Sábado:</span> <span>3:00 PM – 11:00 PM</span>
              </li>
              <li>
                <span>Domingo:</span> <span>3:00 PM – 10:00 PM</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 BURGUERSOFT - EL ORIENTE. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
