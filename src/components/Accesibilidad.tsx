import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  BookOpen,
  CaseSensitive,
  Contrast,
  Link2,
  Minus,
  Moon,
  MousePointer2,
  Plus,
  RotateCcw,
  Sun,
  Text,
  Volume1,
  Volume2,
} from 'lucide-react';
import iconoAcc from '../assets/img/accesibilidad.png';

const SELECTOR_TEXTO =
  'p, h1, h2, h3, h4, h5, h6, span, a, li, button, label, b, i, strong, td, th, div, select, input, textarea';
const FUENTE_LEGIBLE = '"Atkinson Hyperlegible", Arial, sans-serif';
const VELOCIDADES_LECTURA = [
  { id: 'lento', etiqueta: 'Lento', velocidad: 0.75 },
  { id: 'normal', etiqueta: 'Normal', velocidad: 1 },
  { id: 'rapido', etiqueta: 'Rápido', velocidad: 1.25 },
] as const;
type VelocidadLectura = (typeof VELOCIDADES_LECTURA)[number]['id'];
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

function IconoAjuste({ id }: { id: AjusteAccesibilidad }) {
  const props = { size: 23, strokeWidth: 2, 'aria-hidden': true as const };
  switch (id) {
    case 'grises':
      return <Contrast {...props} />;
    case 'enlaces':
      return <Link2 {...props} />;
    case 'espaciado':
      return <Text {...props} />;
    case 'cursor':
      return <MousePointer2 {...props} />;
    case 'guia':
      return <BookOpen {...props} />;
    default:
      return <CaseSensitive {...props} />;
  }
}

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

function leerVelocidadGuardada(): VelocidadLectura {
  const guardada = localStorage.getItem('acc_velocidad_lectura');
  return VELOCIDADES_LECTURA.find(({ id }) => id === guardada)?.id ?? 'normal';
}

function leerVelocidadSeleccionada(): VelocidadLectura | null {
  const guardada = localStorage.getItem('acc_velocidad_lectura');
  return VELOCIDADES_LECTURA.find(({ id }) => id === guardada)?.id ?? null;
}

function aplicarEscala(factor: number) {
  const elementosPagina = Array.from(
    document.querySelectorAll<HTMLElement>(SELECTOR_TEXTO),
  ).filter((el) => !el.closest('.acc-panel'));
  const titulosPanel = Array.from(
    document.querySelectorAll<HTMLElement>('.acc-panel-title > span, .acc-row-label'),
  );
  const elementos = [...new Set([...elementosPagina, ...titulosPanel])];
  const tamanosOriginales = elementos.map((el) => {
    if (!el.dataset.origSize) {
      const estilo = window.getComputedStyle(el);
      const tamanoActual = Number.parseFloat(estilo.fontSize);
      let ancestro = el.parentElement;
      while (ancestro && !ancestro.dataset.origSize) {
        ancestro = ancestro.parentElement;
      }
      const estiloAncestro = ancestro ? window.getComputedStyle(ancestro) : null;
      const tamanoAncestro = estiloAncestro
        ? Number.parseFloat(estiloAncestro.fontSize)
        : Number.NaN;
      const tamanoOriginalAncestro = Number.parseFloat(
        ancestro?.dataset.origSize ?? '',
      );
      const heredaTamanoEscalado =
        Number.isFinite(tamanoAncestro) &&
        Number.isFinite(tamanoOriginalAncestro) &&
        Math.abs(tamanoActual - tamanoAncestro) < 0.1;
      el.dataset.origSize = String(
        heredaTamanoEscalado ? tamanoOriginalAncestro : tamanoActual,
      );
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

function quitarFuente() {
  document.body.style.removeProperty('font-family');
  document
    .querySelectorAll<HTMLElement>(SELECTOR_TEXTO)
    .forEach((el) => el.style.removeProperty('font-family'));
}

function obtenerTextoVisibleDePagina(): string {
  const pagina = document.querySelector<HTMLElement>(
    '.main-content, .public-body, .auth-shell, main, [role="main"]',
  ) ?? document.getElementById('root') ?? document.body;
  const copia = pagina.cloneNode(true) as HTMLElement;
  const elementosOriginales = pagina.querySelectorAll<HTMLElement>('*');
  const elementosCopia = copia.querySelectorAll<HTMLElement>('*');
  elementosOriginales.forEach((elemento, indice) => {
    let actual: HTMLElement | null = elemento;
    let oculto = false;
    while (actual && actual !== pagina) {
      const estilo = window.getComputedStyle(actual);
      if (
        actual.hidden ||
        actual.getAttribute('aria-hidden') === 'true' ||
        estilo.display === 'none' ||
        estilo.visibility === 'hidden' ||
        estilo.visibility === 'collapse'
      ) {
        oculto = true;
        break;
      }
      actual = actual.parentElement;
    }
    if (oculto) elementosCopia[indice]?.remove();
  });

  copia.querySelectorAll(
    'header, nav, .acc-panel, .acc-fab, [aria-hidden="true"], [hidden], [role="status"], input, select, textarea, .btn-regresar, .boton-mostrar-password, .password-toggle, .required-marker, .input-group-append, .input-group-prepend, .input-group-text, svg, iframe, canvas, [data-no-read-aloud]',
  ).forEach((elemento) => elemento.remove());

  copia.querySelectorAll<HTMLElement>('button, a[href], [role="button"]').forEach((control) => {
    if (control.matches('.boton-mostrar-password, .password-toggle')) {
      control.remove();
      return;
    }
    if (!/[\p{L}]/u.test(control.textContent ?? '')) {
      control.remove();
      return;
    }
    control.querySelectorAll('img, picture').forEach((icono) => icono.remove());
  });

  const contenido = copia.innerText
    .split(/\n+/)
    .map((linea) => linea
      .replace(/[^\p{L}\p{N}\s.,;:!?¿¡…-]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLocaleLowerCase('es-CO'))
    .filter((linea) => /[\p{L}\p{N}]/u.test(linea))
    .join('\n');
  const seccionActiva = document.querySelector<HTMLElement>(
    'header nav a.activo, header nav a[aria-current="page"]',
  )?.innerText.trim().replace(/\s+/g, ' ');
  return seccionActiva ? `${seccionActiva}.\n${contenido}`.trim() : contenido;
}

export default function Accesibilidad() {
  const location = useLocation();
  const [abierto, setAbierto] = useState(false);
  const [factor, setFactor] = useState(leerFactorGuardado);
  const [tema, setTemaActual] = useState<'claro' | 'oscuro'>(
    localStorage.getItem('acc_tema') === 'oscuro' ? 'oscuro' : 'claro',
  );
  const [fuente, setFuenteActual] = useState(
    localStorage.getItem('acc_font') === FUENTE_LEGIBLE ? FUENTE_LEGIBLE : '',
  );
  const [velocidadLectura, setVelocidadLectura] = useState(leerVelocidadGuardada);
  const [velocidadSeleccionada, setVelocidadSeleccionada] = useState(
    leerVelocidadSeleccionada,
  );
  const [ajustes, setAjustes] = useState(leerAjustesGuardados);
  const [leyendo, setLeyendo] = useState(false);
  const [guiaY, setGuiaY] = useState(() => window.innerHeight / 2);
  const panelRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const factorRef = useRef(factor);
  const fuenteRef = useRef(
    localStorage.getItem('acc_font') === FUENTE_LEGIBLE ? FUENTE_LEGIBLE : '',
  );
  const lecturaRef = useRef<SpeechSynthesisUtterance | null>(null);
  const lecturaIdRef = useRef(0);
  const lecturaActivaRef = useRef(false);
  const velocidadLecturaRef = useRef(velocidadLectura);
  const rutaAnteriorRef = useRef(location.pathname);
  const temporizadorCambioPaginaRef = useRef<number | null>(null);
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
    if (fuenteGuardada === FUENTE_LEGIBLE) {
      aplicarFuente(FUENTE_LEGIBLE);
    } else if (fuenteGuardada) {
      localStorage.removeItem('acc_font');
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
      lecturaIdRef.current += 1;
      lecturaActivaRef.current = false;
      if (temporizadorCambioPaginaRef.current !== null) {
        window.clearTimeout(temporizadorCambioPaginaRef.current);
      }
      if (lecturaRef.current) window.speechSynthesis.cancel();
    },
    [],
  );

  useEffect(() => {
    document.body.classList.toggle('dark-mode', tema === 'oscuro');
  }, [tema]);

  useEffect(() => {
    document.body.classList.toggle('acc-texto-ampliado', factor > 1);
  }, [factor]);

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
  // (En la carga inicial no se enfoca nada: el foco automático disparaba el tooltip al recargar.)
  const panelEstuvoAbierto = useRef(false);

  useEffect(() => {
    if (abierto) {
      panelEstuvoAbierto.current = true;
      const primerBoton = panelRef.current?.querySelector<HTMLElement>('button');
      primerBoton?.focus();
    } else if (panelEstuvoAbierto.current) {
      panelEstuvoAbierto.current = false;
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

  const alternarFuenteLegible = () => {
    const nuevaFuente = fuente === FUENTE_LEGIBLE ? '' : FUENTE_LEGIBLE;
    setFuenteActual(nuevaFuente);
    fuenteRef.current = nuevaFuente;
    if (nuevaFuente) {
      aplicarFuente(nuevaFuente);
      localStorage.setItem('acc_font', nuevaFuente);
    } else {
      quitarFuente();
      localStorage.removeItem('acc_font');
    }
  };

  const cambiarAjuste = (ajuste: AjusteAccesibilidad) => {
    const activo = !ajustes[ajuste];
    localStorage.setItem(`acc_${ajuste}`, activo ? '1' : '0');
    setAjustes((actuales) => ({ ...actuales, [ajuste]: activo }));
  };

  const iniciarLectura = (velocidad: VelocidadLectura) => {
    if (!('speechSynthesis' in window)) {
      lecturaActivaRef.current = false;
      setLeyendo(false);
      return;
    }

    const texto = obtenerTextoVisibleDePagina();
    if (!texto) {
      lecturaActivaRef.current = false;
      setLeyendo(false);
      return;
    }

    const lecturaId = ++lecturaIdRef.current;
    const lectura = new SpeechSynthesisUtterance(texto.replace(/\n+/g, '. '));
    const voces = window.speechSynthesis.getVoices();
    const vozEspanol = voces.find(
      (voz) => voz.lang.toLowerCase().startsWith('es-co'),
    ) ?? voces.find(
      (voz) => voz.lang.toLowerCase().startsWith('es-mx'),
    ) ?? voces.find(
      (voz) => voz.lang.toLowerCase().startsWith('es'),
    );
    lectura.lang = vozEspanol?.lang ?? 'es-CO';
    if (vozEspanol) lectura.voice = vozEspanol;
    lectura.rate = VELOCIDADES_LECTURA.find(({ id }) => id === velocidad)?.velocidad ?? 1;
    lectura.onend = () => {
      if (lecturaId !== lecturaIdRef.current) return;
      lecturaRef.current = null;
      lecturaActivaRef.current = false;
      setLeyendo(false);
    };
    lectura.onerror = (event) => {
      if (lecturaId !== lecturaIdRef.current) return;
      lecturaRef.current = null;
      lecturaActivaRef.current = false;
      setLeyendo(false);
      if (event.error !== 'canceled' && event.error !== 'interrupted') {
        console.error('Falló la lectura en voz alta:', event.error);
      }
    };
    lecturaRef.current = lectura;
    lecturaActivaRef.current = true;
    setLeyendo(true);
    window.speechSynthesis.speak(lectura);
  };

  useEffect(() => {
    if (rutaAnteriorRef.current === location.pathname) return;
    rutaAnteriorRef.current = location.pathname;
    if (!lecturaActivaRef.current) return;

    window.speechSynthesis.cancel();
    lecturaIdRef.current += 1;
    lecturaRef.current = null;
    temporizadorCambioPaginaRef.current = window.setTimeout(() => {
      temporizadorCambioPaginaRef.current = null;
      iniciarLectura(velocidadLecturaRef.current);
    }, 250);
  }, [location.pathname]);

  const detenerLectura = () => {
    lecturaIdRef.current += 1;
    lecturaActivaRef.current = false;
    if (temporizadorCambioPaginaRef.current !== null) {
      window.clearTimeout(temporizadorCambioPaginaRef.current);
      temporizadorCambioPaginaRef.current = null;
    }
    window.speechSynthesis.cancel();
    lecturaRef.current = null;
    setLeyendo(false);
  };

  const alternarLectura = () => {
    if (!('speechSynthesis' in window)) return;
    if (leyendo) {
      detenerLectura();
      return;
    }

    iniciarLectura(velocidadLectura);
  };

  const cambiarVelocidadLectura = (velocidad: VelocidadLectura) => {
    setVelocidadLectura(velocidad);
    setVelocidadSeleccionada(velocidad);
    velocidadLecturaRef.current = velocidad;
    localStorage.setItem('acc_velocidad_lectura', velocidad);
    if (!leyendo) return;

    detenerLectura();
    iniciarLectura(velocidad);
  };

  const restablecer = () => {
    [
      'acc_tema',
      'acc_factor',
      'acc_font',
      'acc_velocidad_lectura',
      'acc_fab_x',
      'acc_fab_y',
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
        <div className="acc-panel-title">
          <span>Accesibilidad</span>
          <button type="button" className="acc-reset-header" onClick={restablecer}>
            <RotateCcw size={14} strokeWidth={2} aria-hidden="true" />
            <span>Restablecer</span>
          </button>
        </div>
        <div className="acc-row">
          <div className="acc-row-label">Tema</div>
          <div className="acc-row-btns acc-row-tiles">
            <button
              type="button"
              className={`acc_tema acc-btn-tile${tema === 'claro' ? ' activa' : ''}`}
              aria-pressed={tema === 'claro'}
              onClick={() => setTema('claro')}
            >
              <Sun size={23} strokeWidth={2} aria-hidden="true" />
              <span>Claro</span>
            </button>
            <button
              type="button"
              className={`acc_tema acc-btn-tile${tema === 'oscuro' ? ' activa' : ''}`}
              aria-pressed={tema === 'oscuro'}
              onClick={() => setTema('oscuro')}
            >
              <Moon size={23} strokeWidth={2} aria-hidden="true" />
              <span>Oscuro</span>
            </button>
          </div>
        </div>
        <div className="acc-row">
          <div className="acc-row-label">Tamaño de letra: {Math.round(factor * 100)} %</div>
          <div className="acc-row-btns acc-row-tiles">
            <button
              type="button"
              className="acc-btn-option acc-btn-tile"
              aria-label="Reducir tamaño de letra"
              disabled={factor <= FACTOR_MINIMO}
              onClick={() => cambiarFuente(-1)}
            >
              <Minus size={23} strokeWidth={2} aria-hidden="true" />
              <span>Reducir letra</span>
            </button>
            <button
              type="button"
              className="acc-btn-option acc-btn-tile"
              aria-label="Aumentar tamaño de letra"
              disabled={factor >= FACTOR_MAXIMO}
              onClick={() => cambiarFuente(1)}
            >
              <Plus size={23} strokeWidth={2} aria-hidden="true" />
              <span>Aumentar letra</span>
            </button>
          </div>
        </div>
        <div className="acc-row">
          <div className="acc-row-label">Herramientas de accesibilidad</div>
          <div className="acc-tools-grid">
            {AJUSTES.filter(({ id }) => id !== 'contraste' && id !== 'movimiento')
              .map(({ id, etiqueta }) => (
              <button
                key={id}
                type="button"
                className={`acc-btn-option acc-btn-toggle acc-btn-tile${ajustes[id] ? ' activa' : ''}`}
                aria-pressed={ajustes[id]}
                onClick={() => cambiarAjuste(id)}
              >
                <IconoAjuste id={id} />
                <span>{etiqueta}</span>
              </button>
              ))}
            <button
              type="button"
              className={`acc-btn-option acc-btn-toggle acc-btn-tile${fuente === FUENTE_LEGIBLE ? ' activa' : ''}`}
              aria-pressed={fuente === FUENTE_LEGIBLE}
              onClick={alternarFuenteLegible}
            >
              <CaseSensitive size={23} strokeWidth={2} aria-hidden="true" />
              <span>Fuente para dislexia</span>
            </button>
          </div>
          <div className="acc-row acc-lectura-grupo">
            <div className="acc-row-label" id="acc-velocidad-label">
              Lectura en voz alta
            </div>
            <div className="acc-lectura-controles" role="group" aria-labelledby="acc-velocidad-label">
              <button
                type="button"
                className="acc-btn-option acc-btn-tile"
                aria-pressed={leyendo}
                disabled={!('speechSynthesis' in window)}
                onClick={alternarLectura}
              >
                <Volume2 size={23} strokeWidth={2} aria-hidden="true" />
                {!('speechSynthesis' in window)
                  ? <span>No disponible</span>
                  : leyendo
                    ? <span>Detener lectura</span>
                    : <span>Leer contenido</span>}
              </button>
              {VELOCIDADES_LECTURA.map(({ id, etiqueta }) => (
                <button
                  key={id}
                  type="button"
                  className={`acc-btn-option acc-btn-tile${velocidadSeleccionada === id ? ' activa' : ''}`}
                  aria-pressed={velocidadSeleccionada === id}
                  onClick={() => cambiarVelocidadLectura(id)}
                >
                  {id === 'lento'
                    ? <Volume1 size={23} strokeWidth={2} aria-hidden="true" />
                    : <Volume2 size={23} strokeWidth={2} aria-hidden="true" />}
                  <span>{etiqueta}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <button
        type="button"
        className="acc-fab"
        id="accFab"
        aria-label="Accesibilidad"
        data-tooltip="Accesibilidad"
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