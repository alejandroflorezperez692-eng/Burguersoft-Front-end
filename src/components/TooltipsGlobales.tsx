import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const SELECTOR_ICONOS = [
  'svg[class*="lucide-"]',
  'svg[aria-label]',
  'svg[role="img"]',
].join(',');

const SELECTOR_ACCIONES = [
  'button',
  'a[href]',
  '[role="button"]',
  '[role="menuitem"]',
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="reset"]',
  'input[type="image"]',
].join(',');

const DESCRIPCIONES_ICONOS: Record<string, string> = {
  'arrow-left': 'Volver',
  bell: 'Ver notificaciones',
  check: 'Confirmar',
  'chevron-down': 'Mostrar opciones',
  'circle-help': 'Ver ayuda',
  copy: 'Copiar',
  download: 'Descargar',
  'eye-off': 'Ocultar contraseña',
  eye: 'Mostrar contraseña',
  filter: 'Filtrar resultados',
  'log-out': 'Cerrar sesión',
  menu: 'Abrir menú',
  minus: 'Quitar',
  pencil: 'Editar',
  plus: 'Agregar',
  printer: 'Imprimir',
  'refresh-cw': 'Actualizar',
  save: 'Guardar',
  search: 'Buscar',
  settings: 'Abrir configuración',
  'shopping-cart': 'Ver carrito',
  'trash-2': 'Eliminar',
  trash: 'Eliminar',
  upload: 'Subir archivo',
  user: 'Ver perfil',
  x: 'Cerrar',
};

type TooltipVisible = {
  texto: string;
  izquierda: number;
  arriba: number;
  anchoMaximo: number;
  posicion: 'lado' | 'vertical';
  fondoOscuro: boolean;
};

function limitarTexto(texto: string): string {
  const normalizado = texto.replace(/\s+/g, ' ').trim();
  return normalizado.length > 120 ? `${normalizado.slice(0, 117)}...` : normalizado;
}

function detectarFondoOscuro(elemento: Element | null): boolean {
  let actual = elemento;
  while (actual) {
    const color = getComputedStyle(actual).backgroundColor;
    const valores = color.match(/[\d.]+/g)?.map(Number);
    if (valores && valores.length >= 3 && (valores[3] ?? 1) >= 0.9) {
      const [rojo, verde, azul] = valores;
      return (0.2126 * rojo + 0.7152 * verde + 0.0722 * azul) < 128;
    }
    actual = actual.parentElement;
  }
  return false;
}

function descripcionDelIcono(elemento: Element): string | undefined {
  const svg = elemento.matches('svg')
    ? elemento
    : elemento.querySelector('svg[class*="lucide-"]');
  const clase = svg
    ? Array.from(svg.classList).find((nombre) => nombre.startsWith('lucide-'))
    : undefined;

  if (clase) {
    const nombre = clase.slice('lucide-'.length);
    return DESCRIPCIONES_ICONOS[nombre]
      ?? `Icono de ${nombre.replace(/-/g, ' ')}`;
  }

  const imagen = elemento.matches('img')
    ? elemento
    : elemento.querySelector('img[alt]:not([alt=""])');
  return imagen?.getAttribute('alt')?.trim() || undefined;
}

function obtenerDescripcion(elemento: Element): string {
  const textoAccesible = elemento.getAttribute('data-tooltip')
    || elemento.getAttribute('aria-label')
    || elemento.getAttribute('aria-labelledby')
      ?.split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
    || elemento.getAttribute('data-bs-title')
    || elemento.getAttribute('title');

  if (textoAccesible?.trim()) return limitarTexto(textoAccesible);

  if (elemento instanceof HTMLInputElement && elemento.value.trim()) {
    return limitarTexto(elemento.value);
  }

  const textoVisible = elemento.textContent ?? '';
  if (/[a-záéíóúñü]/i.test(textoVisible)) return limitarTexto(textoVisible);

  const textoIcono = elemento.querySelector('svg title')?.textContent?.trim();
  if (textoIcono) return limitarTexto(textoIcono);

  const descripcionIcono = descripcionDelIcono(elemento);
  if (descripcionIcono) return limitarTexto(descripcionIcono);

  return elemento.matches('a[href]') ? 'Abrir enlace' : 'Realizar acción';
}

function sinTextoVisible(elemento: Element): boolean {
  const copia = elemento.cloneNode(true) as Element;
  copia.querySelectorAll('svg, img, [class*="badge"]').forEach((n) => n.remove());
  return !/[a-záéíóúñü0-9]/i.test(copia.textContent ?? '');
}

function encontrarElemento(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) return null;
  const accion = target.closest(SELECTOR_ACCIONES);

  const itemSidebar = target.closest('.sidebar-collapsed .sidebar-item > a');
  if (itemSidebar) return itemSidebar;

  // Iconos de contacto
  const cajaContacto = target.closest('.icon-box[data-tooltip]');
  if (cajaContacto) return cajaContacto;

  // Chip de usuario del header (tiene texto, pero igual debe mostrar descripción)
  const chipUsuario = target.closest('.header-user[data-tooltip]');
  if (chipUsuario) return chipUsuario;

  // Enlace que envuelve un icono o un "+" (ej. el + que lleva al login)
  const enlace = target.closest('a[data-tooltip]');
  if (enlace && sinTextoVisible(enlace)) return enlace;

  // Botones o enlaces SOLO si son de icono (sin texto visible)
  if (accion && !(accion instanceof HTMLInputElement)) {
    return sinTextoVisible(accion) ? accion : null;
  }

  // Icono suelto, fuera de cualquier botón o enlace
  return target.closest(SELECTOR_ICONOS);
}

export default function TooltipsGlobales() {
  const [tooltip, setTooltip] = useState<TooltipVisible | null>(null);
  const elementoActivo = useRef<Element | null>(null);
  const descripcionPrevia = useRef<string | null>(null);
  const tituloPrevio = useRef<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const elemento = elementoActivo.current;
    const tooltipElement = tooltipRef.current;
    if (!elemento || !tooltipElement) return;

    const ancla = elemento.getBoundingClientRect();
    const descripcion = tooltipElement.getBoundingClientRect();
    const margen = 8;
    const esOpcionMenu = elemento.matches('[role="menuitem"]')
      || Boolean(elemento.closest('.dropdown-menu'));
    const esControlCabecera = elemento.matches(
      '.header-user, .notif-btn, .btn-icono, .btn-perfil',
    );
    const esBotonFlotante = elemento.matches('.acc-fab, .burgi-btn');
    const esEnlaceSesion = elemento.matches('.link-sesion');
    const esSesionHeader = esEnlaceSesion && Boolean(elemento.closest('header'));
    const tarjetaPromocion = elemento.closest('.promo-card-pub')?.getBoundingClientRect();
    const esAccionTarjeta = Boolean(elemento.closest('.mn-card-actions'));
    const esPestanaPerfil = elemento.matches('.mp-tab');
    const esCajaContacto = elemento.matches('.icon-box');
    const espacio = 10;
    const espacioLateral = esOpcionMenu ? 20 : espacio;
    const espacioVertical = esControlCabecera ? 6
      : esAccionTarjeta ? 16
        : esPestanaPerfil ? 2
          : esCajaContacto ? 10 : 6;
    const espacioDerecha = window.innerWidth
      - (tarjetaPromocion?.right ?? ancla.right) - espacioLateral - margen;
    const espacioIzquierda = (tarjetaPromocion?.left ?? ancla.left) - espacioLateral - margen;
    const aLaDerecha = espacioDerecha >= espacioIzquierda;
    const anchoLateral = Math.min(
      280,
      aLaDerecha ? espacioDerecha : espacioIzquierda,
    );
    const esItemSidebar = elemento.matches('.sidebar-item > a');
    const posicionLateral = !tarjetaPromocion && (esOpcionMenu || esBotonFlotante || esItemSidebar
      || (esEnlaceSesion && !esSesionHeader))
      && anchoLateral >= 100;
    const posicion = posicionLateral ? 'lado' : 'vertical';
    const anchoMaximo = posicionLateral
      ? anchoLateral
      : Math.min(280, window.innerWidth - margen * 2);
    const anchoDescripcion = Math.min(descripcion.width, anchoMaximo);
    const izquierdaVertical = Math.max(
      margen,
      Math.min(
        (tarjetaPromocion ? tarjetaPromocion.left + tarjetaPromocion.width / 2 : ancla.left + ancla.width / 2)
          - anchoDescripcion / 2,
        window.innerWidth - anchoDescripcion - margen,
      ),
    );
    const izquierdaLateral = aLaDerecha
      ? (tarjetaPromocion?.right ?? ancla.right) + espacioLateral
      : (tarjetaPromocion?.left ?? ancla.left) - espacioLateral - anchoDescripcion;
    const izquierda = posicionLateral ? izquierdaLateral : izquierdaVertical;
    const contenedorCabecera = esControlCabecera
      ? elemento.closest('.header-actions, .header-right')?.getBoundingClientRect()
      : undefined;
    const filaContacto = esCajaContacto ? elemento.closest('.icons-container') : null;
    const finFilaContacto = filaContacto
      ? Array.from(filaContacto.querySelectorAll('.icon-box'))
        .map((caja) => caja.getBoundingClientRect())
        .filter((rect) => Math.abs(rect.top - ancla.top) < 4)
        .reduce((fin, rect) => Math.max(fin, rect.bottom), ancla.bottom)
      : undefined;
    const anclaVertical = tarjetaPromocion?.bottom ?? ancla.bottom;
    const abajo = (contenedorCabecera?.bottom ?? finFilaContacto ?? anclaVertical)
      + espacioVertical;
    const arriba = abajo + descripcion.height <= window.innerHeight - margen
      ? abajo
      : (tarjetaPromocion?.top ?? ancla.top)
        - descripcion.height - espacioVertical;
    const top = posicionLateral
      ? Math.max(
        margen,
        Math.min(
          ancla.top + (ancla.height - descripcion.height) / 2,
          window.innerHeight - descripcion.height - margen,
        ),
      )
      : Math.max(margen, Math.min(arriba, window.innerHeight - descripcion.height - margen));
    const fondoOscuro = detectarFondoOscuro(
      document.elementFromPoint(
        izquierda + anchoDescripcion / 2,
        top + descripcion.height / 2,
      ),
    );

    setTooltip((actual) => {
      if (!actual || (Math.abs(actual.izquierda - izquierda) < 1
        && Math.abs(actual.arriba - top) < 1
        && Math.abs(actual.anchoMaximo - anchoMaximo) < 1
        && actual.posicion === posicion
        && actual.fondoOscuro === fondoOscuro)) {
        return actual;
      }
      return {
        ...actual,
        izquierda,
        arriba: top,
        anchoMaximo,
        posicion,
        fondoOscuro,
      };
    });
  }, [tooltip]);

  useEffect(() => {
    const ocultar = () => {
      if (elementoActivo.current) {
        if (descripcionPrevia.current === null) {
          elementoActivo.current.removeAttribute('aria-describedby');
        } else {
          elementoActivo.current.setAttribute('aria-describedby', descripcionPrevia.current);
        }
        if (tituloPrevio.current !== null) {
          elementoActivo.current.setAttribute('title', tituloPrevio.current);
        }
      }
      elementoActivo.current = null;
      descripcionPrevia.current = null;
      tituloPrevio.current = null;
      setTooltip(null);
    };

    const mostrar = (elemento: Element | null) => {
      if (!elemento || elemento.getAttribute('aria-hidden') === 'true') {
        ocultar();
        return;
      }

      const texto = obtenerDescripcion(elemento);
      if (!texto) {
        ocultar();
        return;
      }

      if (elementoActivo.current !== elemento) {
        ocultar();
        elementoActivo.current = elemento;
        descripcionPrevia.current = elemento.getAttribute('aria-describedby');
        const ids = new Set((descripcionPrevia.current ?? '').split(/\s+/).filter(Boolean));
        ids.add('burguersoft-tooltip');
        elemento.setAttribute('aria-describedby', Array.from(ids).join(' '));
        tituloPrevio.current = elemento.getAttribute('title');
        elemento.removeAttribute('title');
      }

      const rect = elemento.getBoundingClientRect();
      setTooltip({
        texto,
        izquierda: rect.left + rect.width / 2,
        arriba: rect.top,
        anchoMaximo: Math.min(280, window.innerWidth - 16),
        posicion: elemento.matches('[role="menuitem"]') ? 'lado' : 'vertical',
        fondoOscuro: false,
      });
    };

    const alPasar = (event: PointerEvent) => mostrar(encontrarElemento(event.target));
    const alSalir = (event: PointerEvent) => {
      const anterior = encontrarElemento(event.target);
      const siguiente = encontrarElemento(event.relatedTarget);
      if (anterior && anterior !== siguiente && elementoActivo.current === anterior) ocultar();
    };
    const alEnfocar = (event: FocusEvent) => mostrar(encontrarElemento(event.target));
    const alDesenfocar = (event: FocusEvent) => {
      const anterior = encontrarElemento(event.target);
      const siguiente = encontrarElemento(event.relatedTarget);
      if (anterior && anterior !== siguiente && elementoActivo.current === anterior) ocultar();
    };
    const alHacerClick = (event: MouseEvent) => {
      const accion = event.target instanceof Element
        ? event.target.closest(SELECTOR_ACCIONES)
        : null;
      if (!accion || !accion.hasAttribute('aria-expanded')) return;
      if (accion.getAttribute('aria-expanded') === 'true') {
        ocultar();
      } else if (accion.matches(':hover')) {
        mostrar(encontrarElemento(accion));
      }
    };

    document.addEventListener('pointerover', alPasar);
    document.addEventListener('pointerout', alSalir);
    document.addEventListener('focusin', alEnfocar);
    document.addEventListener('focusout', alDesenfocar);
    document.addEventListener('click', alHacerClick);
    window.addEventListener('scroll', ocultar, true);
    window.addEventListener('resize', ocultar);

    return () => {
      document.removeEventListener('pointerover', alPasar);
      document.removeEventListener('pointerout', alSalir);
      document.removeEventListener('focusin', alEnfocar);
      document.removeEventListener('focusout', alDesenfocar);
      document.removeEventListener('click', alHacerClick);
      window.removeEventListener('scroll', ocultar, true);
      window.removeEventListener('resize', ocultar);
      ocultar();
    };
  }, []);

  if (!tooltip) return null;

  return createPortal(
    <div
      id="burguersoft-tooltip"
      className={`burguersoft-tooltip${tooltip.fondoOscuro ? ' burguersoft-tooltip-fondo-oscuro' : ''}`}
      ref={tooltipRef}
      role="tooltip"
      style={{
        left: tooltip.izquierda,
        top: tooltip.arriba,
        maxWidth: tooltip.anchoMaximo,
        width: 'max-content',
        transform: 'none',
        textAlign: tooltip.posicion === 'vertical' ? 'center' : 'left',
      }}
    >
      {tooltip.texto}
    </div>,
    document.body,
  );
}
