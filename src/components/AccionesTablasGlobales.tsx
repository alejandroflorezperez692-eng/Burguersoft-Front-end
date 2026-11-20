import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  copiarTabla,
  exportarTablaExcel,
  exportarTablaPdf,
  imprimirTabla,
  leerTabla,
} from '../utils/exportarTabla';
import { useToast } from './Toast';
import '../styles/acciones-tablas.css';

const MARCA = 'data-acciones-tabla';

function crearBoton(etiqueta: string, icono: string, titulo: string): HTMLButtonElement {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'acciones-tabla-btn';
  boton.title = titulo;
  boton.setAttribute('aria-label', titulo);
  boton.innerHTML = `<span aria-hidden="true">${icono}</span><span>${etiqueta}</span>`;
  return boton;
}

/**
 * Agrega a cada tabla de la aplicación los cuatro botones del checklist:
 * PDF, Excel, Copiar e Imprimir. Se monta una sola vez y se actualiza cuando
 * cambia la ruta o cuando React pinta nuevas tablas (modales incluidos).
 */
export default function AccionesTablasGlobales() {
  const location = useLocation();
  const { showToast } = useToast();
  const toastRef = useRef(showToast);
  toastRef.current = showToast;

  useEffect(() => {
    let temporizador = 0;
    let observando = false;

    const conectar = () => {
      if (observando) return;
      observador.observe(document.body, { childList: true, subtree: true });
      observando = true;
    };

    const desconectar = () => {
      if (!observando) return;
      observador.disconnect();
      observando = false;
    };

    const agregar = (tabla: HTMLTableElement) => {
      if (tabla.hasAttribute(MARCA)) return;
      if (tabla.closest('[data-sin-acciones]')) return;
      if (tabla.classList.contains('no-acciones')) return;
      if (tabla.querySelector('th,td') === null) return;

      const anterior = tabla.previousElementSibling;
      if (anterior instanceof HTMLElement && anterior.classList.contains('acciones-tabla')) {
        tabla.setAttribute(MARCA, '1');
        return;
      }

      const barra = document.createElement('div');
      barra.className = 'acciones-tabla';
      barra.setAttribute('role', 'group');
      barra.setAttribute('aria-label', 'Exportar tabla');

      const etiqueta = document.createElement('span');
      etiqueta.className = 'acciones-tabla-label';
      etiqueta.textContent = 'Exportar:';
      barra.appendChild(etiqueta);

      const pdf = crearBoton('PDF', '📄', 'Descargar esta tabla en PDF');
      const excel = crearBoton('Excel', '📊', 'Descargar esta tabla en Excel');
      const copiar = crearBoton('Copiar', '📋', 'Copiar esta tabla');
      const imprimir = crearBoton('Imprimir', '🖨️', 'Imprimir esta tabla');

      pdf.addEventListener('click', () => {
        void exportarTablaPdf(leerTabla(tabla)).catch(() =>
          toastRef.current('No se pudo generar el PDF. Intenta de nuevo.', true),
        );
      });

      excel.addEventListener('click', () => {
        void exportarTablaExcel(leerTabla(tabla)).catch(() =>
          toastRef.current('No se pudo generar el Excel. Intenta de nuevo.', true),
        );
      });

      copiar.addEventListener('click', () => {
        void copiarTabla(leerTabla(tabla))
          .then(() => toastRef.current('Tabla copiada al portapapeles.', false))
          .catch(() => toastRef.current('No se pudo copiar la tabla.', true));
      });

      imprimir.addEventListener('click', () => {
        try {
          imprimirTabla(leerTabla(tabla));
        } catch {
          toastRef.current('No se pudo abrir la impresión.', true);
        }
      });

      barra.append(pdf, excel, copiar, imprimir);
      tabla.parentElement?.insertBefore(barra, tabla);
      tabla.setAttribute(MARCA, '1');
    };

    const escanear = () => {
      desconectar();
      // Quita barras que quedaron huérfanas porque React desmontó su tabla.
      document.querySelectorAll('.acciones-tabla').forEach((barra) => {
        const siguiente = barra.nextElementSibling;
        if (!(siguiente instanceof HTMLTableElement) || !siguiente.hasAttribute(MARCA)) {
          barra.remove();
        }
      });
      document
        .querySelectorAll<HTMLTableElement>('table')
        .forEach((tabla) => agregar(tabla));
      conectar();
    };

    const programar = () => {
      window.clearTimeout(temporizador);
      temporizador = window.setTimeout(escanear, 180);
    };

    const observador = new MutationObserver((mutaciones) => {
      const cambiaTabla = mutaciones.some((mutacion) => {
        if (mutacion.type !== 'childList') return false;
        const nodos = [...mutacion.addedNodes, ...mutacion.removedNodes];
        return nodos.some(
          (nodo) =>
            nodo instanceof HTMLElement &&
            (nodo.tagName === 'TABLE' ||
              nodo.tagName === 'TR' ||
              nodo.querySelector?.('table') !== null ||
              nodo.classList.contains('acciones-tabla')),
        );
      });
      if (cambiaTabla) programar();
    });

    const limpiarBarras = () => {
      document.querySelectorAll('.acciones-tabla').forEach((barra) => barra.remove());
      document.querySelectorAll<HTMLTableElement>(`table[${MARCA}]`).forEach((tabla) => {
        tabla.removeAttribute(MARCA);
      });
    };

    limpiarBarras();
    programar();

    return () => {
      window.clearTimeout(temporizador);
      observador.disconnect();
    };
  }, [location.pathname]);

  return null;
}
