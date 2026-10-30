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
type AjusteAccesibilidad =
  | 'contraste'
  | 'grises'
  | 'enlaces'
  | 'espaciado'
  | 'cursor'
  | 'movimiento'
  | 'guia';

const AJUSTES: { id: AjusteAccesibilidad; etiqueta: string }[] = [
  { id: 'contraste', etiqueta: 'Alto contraste' },
  { id: 'grises', etiqueta: 'Escala de grises' },
  { id: 'enlaces', etiqueta: 'Resaltar enlaces' },
  { id: 'espaciado', etiqueta: 'Espaciado de texto' },
  { id: 'cursor', etiqueta: 'Cursor grande' },
  { id: 'movimiento', etiqueta: 'Detener animaciones y movimiento' },
  { id: 'guia', etiqueta: 'Guía de lectura' },
];

function leerAjustesGuardados(): Record<AjusteAccesibilidad, boolean> {
  const guardado = (id: AjusteAccesibilidad) => localStorage.getItem(`acc_${id}`);
  const movimiento = guardado('movimiento');
  const prefiereMenosMovimiento =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return {
    contraste: guardado('contraste') === '1',
    grises: guardado('grises') === '1',
    enlaces: guardado('enlaces') === '1',
    espaciado: guardado('espaciado') === '1',
    cursor: guardado('cursor') === '1',
    movimiento: movimiento === null ? prefiereMenosMovimiento : movimiento === '1',
    guia: guardado('guia') === '1',
  };
}

function leerFactorGuardado(): number {
  const guardado = Number.parseFloat(localStorage.getItem('acc_factor') ?? '');
  if (!Number.isFinite(guardado)) return 1;
  return Math.min(FACTOR_MAXIMO, Math.max(FACTOR_MINIMO, guardado));
}

function aplicarEscala(factor: number) {
  const elementos = Array.from(document.querySelectorAll<HTMLElement>(SELECTOR_TEXTO));
  const tamanosOriginales = elementos.map((el) => {
    if (!el.dataset.origSize) {
      el.dataset.origSize = window.getComputedStyle(el).fontSize;
    }
    return parseFloat(el.dataset.origSize);
  });

  elementos.forEach((el, indice) => {
    el.style.setProperty(
      'font-size',
      `${tamanosOriginales[indice] * factor}px`,
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
  const [ajustes, setAjustes] = useState(leerAjustesGuardados);
  const [leyendo, setLeyendo] = useState(false);
  const [guiaY, setGuiaY] = useState(() => window.innerHeight / 2);
  const panelRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const factorRef = useRef(factor);
  const fuenteRef = useRef(localStorage.getItem('acc_font') ?? '');
  const lecturaRef = useRef<SpeechSynthesisUtterance | null>(null);
  const videosEnReproduccionRef = useRef(new Set<HTMLVideoElement>());
  const gifsPausadosRef = useRef(
    new Map<HTMLImageElement, { src: string; srcSet: string }>(),
  );

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
    AJUSTES.forEach(({ id }) => {
      document.body.classList.toggle(`acc-${id}`, ajustes[id]);
    });
    document.body.classList.toggle(
      'acc-movimiento-configurado',
      localStorage.getItem('acc_movimiento') !== null,
    );
  }, [ajustes]);

  useEffect(() => {
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)');
    const actualizarPreferencia = () => {
      if (localStorage.getItem('acc_movimiento') === null) {
        setAjustes((actuales) => ({ ...actuales, movimiento: consulta.matches }));
      }
    };
    consulta.addEventListener('change', actualizarPreferencia);
    return () => consulta.removeEventListener('change', actualizarPreferencia);
  }, []);

  useEffect(() => {
    if (!ajustes.movimiento) {
      videosEnReproduccionRef.current.forEach((video) => {
        if (video.isConnected) {
          void video.play().catch((error: unknown) => {
            console.error('No se pudo reanudar el video:', error);
          });
        }
      });
      videosEnReproduccionRef.current.clear();
      gifsPausadosRef.current.forEach(({ src, srcSet }, imagen) => {
        if (!imagen.isConnected) return;
        imagen.src = src;
        if (srcSet) imagen.srcset = srcSet;
      });
      gifsPausadosRef.current.clear();
      return;
    }

    const pausarGif = (imagen: HTMLImageElement) => {
      const src = imagen.currentSrc || imagen.src;
      if (
        !/\.gif(?:$|[?#])|^data:image\/gif/i.test(src) ||
        gifsPausadosRef.current.has(imagen) ||
        !imagen.complete ||
        imagen.naturalWidth === 0
      ) {
        return;
      }

      try {
        const canvas = document.createElement('canvas');
        canvas.width = imagen.naturalWidth;
        canvas.height = imagen.naturalHeight;
        const contexto = canvas.getContext('2d');
        if (!contexto) {
          console.error('No se pudo pausar el GIF: el navegador no permite crear el lienzo.');
          return;
        }
        contexto.drawImage(imagen, 0, 0);
        const imagenEstatica = canvas.toDataURL('image/png');
        gifsPausadosRef.current.set(imagen, {
          src: imagen.getAttribute('src') ?? imagen.src,
          srcSet: imagen.getAttribute('srcset') ?? '',
        });
        imagen.removeAttribute('srcset');
        imagen.src = imagenEstatica;
      } catch (error) {
        console.error('No se pudo pausar el GIF animado:', error);
      }
    };

    const pausarVideo = (video: HTMLVideoElement) => {
      if (!video.paused) {
        videosEnReproduccionRef.current.add(video);
        video.pause();
      }
    };
    document.querySelectorAll('video').forEach(pausarVideo);
    document.querySelectorAll('img').forEach(pausarGif);

    const observador = new MutationObserver((mutaciones) => {
      mutaciones.forEach((mutacion) => {
        mutacion.addedNodes.forEach((nodo) => {
          if (nodo instanceof HTMLVideoElement) pausarVideo(nodo);
          if (nodo instanceof HTMLImageElement) pausarGif(nodo);
          if (nodo instanceof Element) {
            nodo.querySelectorAll('video').forEach(pausarVideo);
            nodo.querySelectorAll('img').forEach(pausarGif);
          }
        });
      });
    });
    observador.observe(document.body, { childList: true, subtree: true });
    const alCargarImagen = (event: Event) => {
      if (event.target instanceof HTMLImageElement) pausarGif(event.target);
    };
    document.addEventListener('load', alCargarImagen, true);
    return () => {
      observador.disconnect();
      document.removeEventListener('load', alCargarImagen, true);
    };
  }, [ajustes.movimiento]);

  useEffect(() => {
    if (!ajustes.guia) return;
    const seguirPuntero = (event: PointerEvent) => setGuiaY(event.clientY);
    window.addEventListener('pointermove', seguirPuntero);
    return () => window.removeEventListener('pointermove', seguirPuntero);
  }, [ajustes.guia]);

  useEffect(
    () => () => {
      if (lecturaRef.current) window.speechSynthesis.cancel();
    },
    [],
  );

  useEffect(() => {
    document.body.classList.toggle('dark-mode', tema === 'oscuro');
  }, [tema]);

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

  const cambiarAjuste = (ajuste: AjusteAccesibilidad) => {
    const activo = !ajustes[ajuste];
    localStorage.setItem(`acc_${ajuste}`, activo ? '1' : '0');
    setAjustes((actuales) => ({ ...actuales, [ajuste]: activo }));
  };

  const alternarLectura = () => {
    if (!('speechSynthesis' in window)) return;
    if (leyendo) {
      window.speechSynthesis.cancel();
      lecturaRef.current = null;
      setLeyendo(false);
      return;
    }

    const principal =
      document.querySelector<HTMLElement>('main, [role="main"], .main-content') ??
      document.body;
    const copia = principal.cloneNode(true) as HTMLElement;
    copia.querySelectorAll('.acc-panel, .acc-fab, [aria-hidden="true"]').forEach((elemento) =>
      elemento.remove(),
    );
    const texto = copia.innerText.trim();
    if (!texto) return;

    const lectura = new SpeechSynthesisUtterance(texto);
    lectura.lang = navigator.language;
    lectura.onend = () => {
      lecturaRef.current = null;
      setLeyendo(false);
    };
    lectura.onerror = (event) => {
      lecturaRef.current = null;
      setLeyendo(false);
      if (event.error !== 'canceled' && event.error !== 'interrupted') {
        console.error('Falló la lectura en voz alta:', event.error);
      }
    };
    lecturaRef.current = lectura;
    setLeyendo(true);
    window.speechSynthesis.speak(lectura);
  };

  const restablecer = () => {
    [
      'acc_tema',
      'acc_factor',
      'acc_font',
      ...AJUSTES.map(({ id }) => `acc_${id}`),
    ].forEach((clave) =>
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
              Claro
            </button>
            <button
              type="button"
              className={`acc_tema${tema === 'oscuro' ? ' activa' : ''}`}
              aria-pressed={tema === 'oscuro'}
              onClick={() => setTema('oscuro')}
            >
              Oscuro
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
              Serif
            </button>
            <button
              type="button"
              className={`acc-btn-option${fuente === FUENTES.sans ? ' activa' : ''}`}
              aria-pressed={fuente === FUENTES.sans}
              onClick={() => aplicarFuenteSelect(FUENTES.sans)}
            >
              Sans
            </button>
          </div>
        </div>
        <div className="acc-row">
          <div className="acc-row-label">Herramientas de accesibilidad</div>
          <div className="acc-tools-grid">
            {AJUSTES.map(({ id, etiqueta }) => (
              <button
                key={id}
                type="button"
                className={`acc-btn-option acc-btn-toggle${ajustes[id] ? ' activa' : ''}`}
                aria-pressed={ajustes[id]}
                onClick={() => cambiarAjuste(id)}
              >
                {etiqueta}
              </button>
            ))}
            <button
              type="button"
              className="acc-btn-option acc-btn-toggle"
              aria-pressed={leyendo}
              disabled={!('speechSynthesis' in window)}
              onClick={alternarLectura}
            >
              {!('speechSynthesis' in window)
                ? 'Lectura en voz alta no disponible'
                : leyendo
                  ? 'Detener lectura en voz alta'
                  : 'Leer contenido en voz alta'}
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
      {ajustes.guia && (
        <div
          className="acc-guia-lectura"
          style={{ top: `${guiaY}px` }}
          aria-hidden="true"
        />
      )}
    </>
  );
}