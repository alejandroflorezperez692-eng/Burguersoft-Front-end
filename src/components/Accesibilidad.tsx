import { useEffect, useRef, useState } from 'react';
import iconoAcc from '../assets/img/accesibilidad.png';

const SELECTOR_TEXTO =
  'p, h1, h2, h3, h4, h5, h6, span, a, li, button, label, b, i, strong, td, th, div, select, input, textarea';

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

function aplicarFuente(fuente: string) {
  document.body.style.setProperty('font-family', fuente, 'important');
  document
    .querySelectorAll<HTMLElement>(SELECTOR_TEXTO)
    .forEach((el) => el.style.setProperty('font-family', fuente, 'important'));
}

export default function Accesibilidad() {
  const [abierto, setAbierto] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const factorRef = useRef(
    Number.parseFloat(localStorage.getItem('acc_factor') ?? '') || 1,
  );
  const fuenteRef = useRef(localStorage.getItem('acc_font') ?? '');

  useEffect(() => {
    if (localStorage.getItem('acc_tema') === 'oscuro') {
      document.body.classList.add('dark-mode');
    }
    const fuenteGuardada = localStorage.getItem('acc_font');
    if (fuenteGuardada) {
      aplicarFuente(fuenteGuardada);
    }
    if (factorRef.current !== 1) {
      aplicarEscala(factorRef.current);
    }
  }, []);

  useEffect(() => {
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    const reaplicar = () => {
      if (factorRef.current !== 1) aplicarEscala(factorRef.current);
      if (fuenteRef.current) aplicarFuente(fuenteRef.current);
    };
    const observador = new MutationObserver(() => {
      if (temporizador) clearTimeout(temporizador);
      temporizador = setTimeout(reaplicar, 150);
    });
    observador.observe(document.body, { childList: true, subtree: true });
    return () => {
      if (temporizador) clearTimeout(temporizador);
      observador.disconnect();
    };
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

  // Cierra el panel con la tecla Escape, como se espera en cualquier panel/diálogo accesible.
  useEffect(() => {
    if (!abierto) return;
    const manejarTecla = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAbierto(false);
      }
    };
    document.addEventListener('keydown', manejarTecla);
    return () => document.removeEventListener('keydown', manejarTecla);
  }, [abierto]);

  // Mueve el foco de teclado al panel al abrirlo, y lo regresa al botón flotante al cerrarlo,
  // para que la navegación por teclado no "se pierda" en la página.
  useEffect(() => {
    if (abierto) {
      const primerBoton = panelRef.current?.querySelector<HTMLElement>('button');
      primerBoton?.focus();
    } else {
      fabRef.current?.focus();
    }
  }, [abierto]);

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

  const aplicarFuenteSelect = (fuente: string) => {
    fuenteRef.current = fuente;
    aplicarFuente(fuente);
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
        role="dialog"
        aria-modal="true"
        aria-label="Opciones de accesibilidad"
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
              onClick={() => aplicarFuenteSelect('Georgia, serif')}
            >
              Serif
            </button>
            <button
              type="button"
              className="acc-btn-option"
              onClick={() => aplicarFuenteSelect('Arial, sans-serif')}
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
        aria-expanded={abierto}
        aria-controls="accPanel"
        ref={fabRef}
        onClick={() => setAbierto((v) => !v)}
      >
        <img src={iconoAcc} alt="" />
      </button>
    </>
  );
}