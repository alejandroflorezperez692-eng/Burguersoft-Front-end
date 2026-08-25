import { useCallback, useEffect, useRef, useState } from 'react';

const SLIDES = [
  'https://www.recetasnestle.com.ec/sites/default/files/srh_recipes/4e4293857c03d819e4ae51de1e86d66a.jpg',
  'https://ranchera.com.co/wp-content/uploads/2022/11/perro-colombiano-1.jpg',
  'https://chefstv.net/wp-content/uploads/2024/03/0045-empanadas-saltenas-fritas-wide-web.webp',
  'https://www.elespectador.com/resizer/v2/4YMEEW2QBVGALOUC7LSPUFNKMU.jpg?auth=1913090d3e141e8a3ccce35509259201363e9dddf853024e2f30ac71ce6383a9&width=1110&height=739&smart=true&quality=60',
];

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
  );
}
