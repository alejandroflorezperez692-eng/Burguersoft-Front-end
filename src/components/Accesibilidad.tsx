import { useEffect, useRef, useState } from 'react';
import iconoAcc from '../assets/img/accesibilidad.png';

const SELECTOR_TEXTO =
  'p, h1, h2, h3, h4, h5, h6, span, a, li, button, label, b, i, strong, td, th, div, select, input, textarea';
const FUENTES = {
  serif: 'Georgia, serif',
  sans: 'Arial, sans-serif',
};
const FACTOR_MINIMO = 0.8;
const FACTOR_MAXIMO = 1.5;

function leerFactorGuardado(): number {
  const guardado = Number.parseFloat(localStorage.getItem('acc_factor') ?? '');
  if (!Number.isFinite(guardado)) return 1;
  return Math.min(FACTOR_MAXIMO, Math.max(FACTOR_MINIMO, guardado));
}

type AjusteVisual = 'contraste' | 'enlaces' | 'espaciado';

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
  const [factor, setFactor] = useState(leerFactorGuardado);
  const [tema, setTemaActual] = useState<'claro' | 'oscuro'>(
    localStorage.getItem('acc_tema') === 'oscuro' ? 'oscuro' : 'claro',
  );
  const [fuente, setFuenteActual] = useState(localStorage.getItem('acc_font') ?? '');
  const [ajustes, setAjustes] = useState<Record<AjusteVisual, boolean>>({
    contraste: localStorage.getItem('acc_contraste') === '1',
    enlaces: localStorage.getItem('acc_enlaces') === '1',
    espaciado: localStorage.getItem('acc_espaciado') === '1',
  });
  const panelRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const factorRef = useRef(factor);
  const fuenteRef = useRef(localStorage.getItem('acc_font') ?? '');

  useEffect(() => {
    const factorGuardado = localStorage.getItem('acc_factor');
    if (factorGuardado && Number.parseFloat(factorGuardado) !== factorRef.current) {
      localStorage.setItem('acc_factor', String(factorRef.current));
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
    document.body.classList.toggle('dark-mode', tema === 'oscuro');
  }, [tema]);

  useEffect(() => {
    (Object.keys(ajustes) as AjusteVisual[]).forEach((ajuste) => {
      document.body.classList.toggle(`acc-${ajuste}`, ajustes[ajuste]);
    });
  }, [ajustes]);

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
    setTemaActual(modo);
    document.body.classList.toggle('dark-mode', modo === 'oscuro');
    localStorage.setItem('acc_tema', modo);
  };

  const cambiarFuente = (direccion: number) => {
    const nuevoFactor =
      Math.round((factorRef.current + direccion * 0.1) * 10) / 10;
    if (nuevoFactor >= FACTOR_MINIMO && nuevoFactor <= FACTOR_MAXIMO) {
      factorRef.current = nuevoFactor;
      setFactor(nuevoFactor);
      aplicarEscala(nuevoFactor);
      localStorage.setItem('acc_factor', String(nuevoFactor));
    }
  };

  const aplicarFuenteSelect = (fuente: string) => {
    setFuenteActual(fuente);
    fuenteRef.current = fuente;
    aplicarFuente(fuente);
    localStorage.setItem('acc_font', fuente);
  };

  const cambiarAjuste = (ajuste: AjusteVisual) => {
    setAjustes((actuales) => {
      const activo = !actuales[ajuste];
      localStorage.setItem(`acc_${ajuste}`, activo ? '1' : '0');
      return { ...actuales, [ajuste]: activo };
    });
  };

  const restablecer = () => {
    ['acc_tema', 'acc_factor', 'acc_font', 'acc_contraste', 'acc_enlaces', 'acc_espaciado'].forEach((clave) =>
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
              className={`acc_tema${tema === 'claro' ? ' activa' : ''}`}
              aria-pressed={tema === 'claro'}
              onClick={() => setTema('claro')}
            >
              Claro{tema === 'claro' ? ' ✓' : ''}
            </button>
            <button
              type="button"
              className={`acc_tema${tema === 'oscuro' ? ' activa' : ''}`}
              aria-pressed={tema === 'oscuro'}
              onClick={() => setTema('oscuro')}
            >
              Oscuro{tema === 'oscuro' ? ' ✓' : ''}
            </button>
          </div>
        </div>
        <div className="acc-row">
          <div className="acc-row-label">Tamaño de letra: {Math.round(factor * 100)} %</div>
          <div className="acc-row-btns">
            <button
              type="button"
              className="acc-btn-option"
              aria-label="Reducir tamaño de letra"
              disabled={factor <= FACTOR_MINIMO}
              onClick={() => cambiarFuente(-1)}
            >
              A−
            </button>
            <button
              type="button"
              className="acc-btn-option"
              aria-label="Aumentar tamaño de letra"
              disabled={factor >= FACTOR_MAXIMO}
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
              className={`acc-btn-option${fuente === FUENTES.serif ? ' activa' : ''}`}
              aria-pressed={fuente === FUENTES.serif}
              onClick={() => aplicarFuenteSelect(FUENTES.serif)}
            >
              Serif{fuente === FUENTES.serif ? ' ✓' : ''}
            </button>
            <button
              type="button"
              className={`acc-btn-option${fuente === FUENTES.sans ? ' activa' : ''}`}
              aria-pressed={fuente === FUENTES.sans}
              onClick={() => aplicarFuenteSelect(FUENTES.sans)}
            >
              Sans{fuente === FUENTES.sans ? ' ✓' : ''}
            </button>
          </div>
        </div>
        <div className="acc-row">
          <div className="acc-row-label">Lectura</div>
          <div className="acc-row-btns acc-row-btns-vertical">
            {([
              ['contraste', 'Alto contraste'],
              ['enlaces', 'Resaltar enlaces'],
              ['espaciado', 'Más espacio en el texto'],
            ] as const).map(([ajuste, etiqueta]) => (
              <button
                key={ajuste}
                type="button"
                className={`acc-btn-option acc-btn-toggle${ajustes[ajuste] ? ' activa' : ''}`}
                aria-pressed={ajustes[ajuste]}
                onClick={() => cambiarAjuste(ajuste)}
              >
                <span>{etiqueta}</span>
                <span aria-hidden="true">{ajustes[ajuste] ? '✓' : ''}</span>
              </button>
            ))}
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