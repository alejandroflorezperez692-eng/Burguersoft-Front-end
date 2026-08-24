import { useEffect, useRef, useState } from 'react';
import iconoAcc from '../assets/img/accesibilidad.png';

const SELECTOR_TEXTO =
  'p, h1, h2, h3, h4, h5, h6, span, a, li, button, label, b, i, strong, td, th';

function aplicarEscala(factor: number) {
  document.querySelectorAll<HTMLElement>(SELECTOR_TEXTO).forEach((el) => {
    if (!el.dataset.origSize) {
      el.dataset.origSize = window.getComputedStyle(el).fontSize;
    }
    el.style.setProperty(
      'font-size',
      `${parseFloat(el.dataset.origSize) * factor}px`,
      'important',
    );
  });
}

export default function Accesibilidad() {
  const [abierto, setAbierto] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const factorRef = useRef(
    Number.parseFloat(localStorage.getItem('acc_factor') ?? '') || 1,
  );

  useEffect(() => {
    if (localStorage.getItem('acc_tema') === 'oscuro') {
      document.body.classList.add('dark-mode');
    }
    const fuenteGuardada = localStorage.getItem('acc_font');
    if (fuenteGuardada) {
      document.body.style.fontFamily = fuenteGuardada;
    }
    if (factorRef.current !== 1) {
      aplicarEscala(factorRef.current);
    }
  }, []);

  useEffect(() => {
    const manejarClic = (event: MouseEvent) => {
      const objetivo = event.target as Node;
      if (
        panelRef.current?.classList.contains('open') &&
        !panelRef.current.contains(objetivo) &&
        !fabRef.current?.contains(objetivo)
      ) {
        setAbierto(false);
      }
    };
    document.addEventListener('click', manejarClic);
    return () => document.removeEventListener('click', manejarClic);
  }, []);

  const setTema = (modo: 'claro' | 'oscuro') => {
    if (modo === 'oscuro') {
      document.body.classList.add('dark-mode');
      localStorage.setItem('acc_tema', 'oscuro');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('acc_tema', 'claro');
    }
  };

  const cambiarFuente = (direccion: number) => {
    const nuevoFactor =
      Math.round((factorRef.current + direccion * 0.1) * 10) / 10;
    if (nuevoFactor >= 0.8 && nuevoFactor <= 2.0) {
      factorRef.current = nuevoFactor;
      aplicarEscala(nuevoFactor);
      localStorage.setItem('acc_factor', String(nuevoFactor));
    }
  };

  const aplicarFuente = (fuente: string) => {
    document.body.style.fontFamily = fuente;
    localStorage.setItem('acc_font', fuente);
  };

  const restablecer = () => {
    ['acc_tema', 'acc_factor', 'acc_font'].forEach((clave) =>
      localStorage.removeItem(clave),
    );
    window.location.reload();
  };

  return (
    <>
      <div
        className={`acc-panel${abierto ? ' open' : ''}`}
        id="accPanel"
        ref={panelRef}
      >
        <div className="acc-panel-title">Accesibilidad</div>
        <div className="acc-row">
          <div className="acc-row-label">Tema</div>
          <div className="acc-row-btns">
            <button
              type="button"
              className="acc_tema"
              onClick={() => setTema('claro')}
            >
              Claro
            </button>
            <button
              type="button"
              className="acc_tema"
              onClick={() => setTema('oscuro')}
            >
              Oscuro
            </button>
          </div>
        </div>
        <div className="acc-row">
          <div className="acc-row-label">Tamaño de letra</div>
          <div className="acc-row-btns">
            <button
              type="button"
              className="acc-btn-option"
              onClick={() => cambiarFuente(-1)}
            >
              A−
            </button>
            <button
              type="button"
              className="acc-btn-option"
              onClick={() => cambiarFuente(1)}
            >
              A+
            </button>
          </div>
        </div>
        <div className="acc-row">
          <div className="acc-row-label">Tipo de letra</div>
          <div className="acc-row-btns">
            <button
              type="button"
              className="acc-btn-option"
              onClick={() => aplicarFuente('Georgia, serif')}
            >
              Serif
            </button>
            <button
              type="button"
              className="acc-btn-option"
              onClick={() => aplicarFuente('Arial, sans-serif')}
            >
              Sans
            </button>
          </div>
        </div>
        <button type="button" className="acc-btn-reset" onClick={restablecer}>
          Restablecer
        </button>
      </div>
      <button
        type="button"
        className="acc-fab"
        id="accFab"
        aria-label="Accesibilidad"
        ref={fabRef}
        onClick={() => setAbierto((v) => !v)}
      >
        <img src={iconoAcc} alt="" />
      </button>
    </>
  );
}
