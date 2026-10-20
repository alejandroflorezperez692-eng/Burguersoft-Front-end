import { useCallback, useEffect, useRef, useState } from 'react';
import slide1 from '../assets/img/carrusel-1.png';
import slide2 from '../assets/img/carrusel-2.png';
import slide3 from '../assets/img/carrusel-3.png';
import slide4 from '../assets/img/carrusel-4.png';
import slide5 from '../assets/img/carrusel-5.png';
import slide6 from '../assets/img/carrusel-6.png';
import slide7 from '../assets/img/carrusel-7.png';

const SLIDES = [slide1, slide2, slide3, slide4, slide5, slide6, slide7];

export default function HeroCarousel() {
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

  return (
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
              aria-label={`Imagen ${i + 1}`}
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
  );
}
