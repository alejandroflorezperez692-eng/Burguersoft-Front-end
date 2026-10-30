import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const ELEMENTOS_CON_TOOLTIP = [
  'button',
  'a[href]',
  '[role="button"]',
  '[role="menuitem"]',
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="reset"]',
  'input[type="image"]',
  'img[alt]:not([alt=""])',
  'svg[class*="lucide-"]',
  'svg[aria-label]',
  'svg[role="img"]',
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
  debajo: boolean;
};

function limitarTexto(texto: string): string {
  const normalizado = texto.replace(/\s+/g, ' ').trim();
  return normalizado.length > 120 ? `${normalizado.slice(0, 117)}...` : normalizado;
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
  const textoAccesible = elemento.getAttribute('aria-label')
    || elemento.getAttribute('aria-labelledby')
      ?.split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
    || elemento.getAttribute('data-tooltip')
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

function encontrarElemento(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) return null;
  return target.closest(ELEMENTOS_CON_TOOLTIP);
}

export default function TooltipsGlobales() {
  const [tooltip, setTooltip] = useState<TooltipVisible | null>(null);
  const elementoActivo = useRef<Element | null>(null);
  const descripcionPrevia = useRef<string | null>(null);

  useEffect(() => {
    const ocultar = () => {
      if (elementoActivo.current) {
        if (descripcionPrevia.current === null) {
          elementoActivo.current.removeAttribute('aria-describedby');
        } else {
          elementoActivo.current.setAttribute('aria-describedby', descripcionPrevia.current);
        }
      }
      elementoActivo.current = null;
      descripcionPrevia.current = null;
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
      }

      const rect = elemento.getBoundingClientRect();
      const debajo = rect.top < 56;
      const centro = rect.left + rect.width / 2;
      const margenCentro = Math.min(152, window.innerWidth / 2 - 12);
      const izquierda = Math.max(
        margenCentro,
        Math.min(centro, window.innerWidth - margenCentro),
      );
      setTooltip({
        texto,
        izquierda,
        arriba: debajo ? rect.bottom + 10 : rect.top - 10,
        debajo,
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

    document.addEventListener('pointerover', alPasar);
    document.addEventListener('pointerout', alSalir);
    document.addEventListener('focusin', alEnfocar);
    document.addEventListener('focusout', alDesenfocar);
    window.addEventListener('scroll', ocultar, true);
    window.addEventListener('resize', ocultar);

    return () => {
      document.removeEventListener('pointerover', alPasar);
      document.removeEventListener('pointerout', alSalir);
      document.removeEventListener('focusin', alEnfocar);
      document.removeEventListener('focusout', alDesenfocar);
      window.removeEventListener('scroll', ocultar, true);
      window.removeEventListener('resize', ocultar);
      ocultar();
    };
  }, []);

  if (!tooltip) return null;

  return createPortal(
    <div
      id="burguersoft-tooltip"
      className={`burguersoft-tooltip${tooltip.debajo ? ' burguersoft-tooltip-debajo' : ''}`}
      role="tooltip"
      style={{ left: tooltip.izquierda, top: tooltip.arriba }}
    >
      {tooltip.texto}
    </div>,
    document.body,
  );
}
