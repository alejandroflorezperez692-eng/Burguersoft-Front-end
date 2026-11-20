import logoUrl from '../assets/img/logo-burguersoft.png';
import { imprimirEnPagina } from './imprimirEnPagina';

export const NEGOCIO = {
  nombre: 'Burguersoft',
  eslogan: 'El Oriente',
};

export type DatosTabla = {
  titulo: string;
  encabezados: string[];
  filas: string[][];
};

const COLUMNAS_ACCION = new Set(['acciones', 'acción', 'opciones', 'historial']);

function limpiarTexto(valor: string): string {
  return valor.replace(/\s+/g, ' ').trim();
}

/** Extrae encabezados y filas visibles de una tabla del DOM. */
export function leerTabla(tabla: HTMLTableElement): DatosTabla {
  const filasEncabezado = Array.from(tabla.querySelectorAll('thead tr'));
  const encabezado =
    filasEncabezado[filasEncabezado.length - 1] ??
    tabla.querySelector('tr');

  const celdasEncabezado = encabezado
    ? Array.from(encabezado.querySelectorAll('th,td'))
    : [];

  let indices = celdasEncabezado.map((_, i) => i);
  celdasEncabezado.forEach((celda, i) => {
    const texto = limpiarTexto(celda.textContent ?? '').toLowerCase();
    if (COLUMNAS_ACCION.has(texto) || texto.includes('acciones')) {
      indices = indices.filter((indice) => indice !== i);
    }
  });

  const encabezados = indices.map((i) => {
    const texto = limpiarTexto(celdasEncabezado[i]?.textContent ?? '');
    return texto || `Columna ${i + 1}`;
  });

  const filas = Array.from(tabla.querySelectorAll('tbody tr'))
    .filter((fila) => !fila.classList.contains('sin-datos'))
    .map((fila) =>
      indices.map((i) => {
        const celda = fila.querySelectorAll('td')[i];
        return limpiarTexto(celda?.textContent ?? '');
      }),
    )
    .filter((fila) => fila.some((celda) => celda !== ''));

  return {
    titulo: tituloDeTabla(tabla),
    encabezados,
    filas,
  };
}

/** Título legible: encabezado de la página, caption o título del documento. */
export function tituloDeTabla(tabla: HTMLTableElement): string {
  const caption = limpiarTexto(tabla.querySelector('caption')?.textContent ?? '');
  if (caption) return caption;

  const contenedor = tabla.closest('section, .page, .page-inner, .main-content, main');
  const encabezado = contenedor?.querySelector('h1, h2, .page-title, .mn-title');
  const texto = limpiarTexto(encabezado?.textContent ?? '');
  if (texto) return texto;

  const titulo = limpiarTexto(document.title);
  return titulo && titulo !== 'Burguersoft' ? titulo : 'Reporte';
}

/** Copia la tabla al portapapeles en formato TSV (se pega en Excel). */
export async function copiarTabla(datos: DatosTabla): Promise<void> {
  const contenido = [datos.encabezados, ...datos.filas]
    .map((fila) => fila.map((celda) => celda.replace(/\t/g, ' ')).join('\t'))
    .join('\n');

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(contenido);
    return;
  }

  const area = document.createElement('textarea');
  area.value = contenido;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  area.remove();
}

function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Imprime un reporte con nombre del negocio, logo y fecha. */
export function imprimirTabla(datos: DatosTabla): void {
  const fecha = new Date().toLocaleString('es-CO');
  const filas = datos.filas
    .map(
      (fila) =>
        `<tr>${fila.map((celda) => `<td>${escaparHtml(celda)}</td>`).join('')}</tr>`,
    )
    .join('');

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${escaparHtml(datos.titulo)}</title>
<style>
  @page { size: A4 landscape; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #222; margin: 0; }
  header { display: flex; align-items: center; gap: 16px; border-bottom: 3px solid #e8821a; padding-bottom: 10px; margin-bottom: 14px; }
  header img { width: 64px; height: 64px; object-fit: contain; }
  .negocio { font-size: 20px; font-weight: 800; color: #8a3f00; }
  .eslogan { font-size: 12px; letter-spacing: 1px; color: #b5651d; text-transform: uppercase; }
  h1 { font-size: 17px; margin: 0 0 4px; }
  .fecha { font-size: 11px; color: #666; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { background: #f7e7d3; color: #6b3200; text-transform: uppercase; letter-spacing: .4px; }
  th, td { border: 1px solid #d9c6b2; padding: 5px 6px; text-align: left; vertical-align: top; }
  tbody tr:nth-child(even) { background: #fffaf3; }
  footer { margin-top: 12px; font-size: 10px; color: #777; display: flex; justify-content: space-between; }
</style>
</head>
<body>
  <header>
    <img src="${logoUrl}" alt="Logo">
    <div>
      <div class="negocio">${NEGOCIO.nombre} · ${NEGOCIO.eslogan}</div>
      <div class="eslogan">Reporte generado desde el sistema</div>
    </div>
  </header>
  <h1>${escaparHtml(datos.titulo)}</h1>
  <div class="fecha">Generado el ${escaparHtml(fecha)}</div>
  <table>
    <thead><tr>${datos.encabezados.map((h) => `<th>${escaparHtml(h)}</th>`).join('')}</tr></thead>
    <tbody>${filas}</tbody>
  </table>
  <footer><span>${NEGOCIO.nombre} · ${NEGOCIO.eslogan}</span><span>${escaparHtml(fecha)}</span></footer>
</body>
</html>`;

  imprimirEnPagina(html);
}

async function logoEnBase64(): Promise<{ dataUrl: string; base64: string } | null> {
  try {
    const respuesta = await fetch(logoUrl);
    const buffer = await respuesta.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binario = '';
    for (let i = 0; i < bytes.length; i += 1) binario += String.fromCharCode(bytes[i]);
    const base64 = btoa(binario);
    return { dataUrl: `data:image/png;base64,${base64}`, base64 };
  } catch {
    return null;
  }
}

/** Genera un Excel con logo, nombre del negocio, título y fecha. */
export async function exportarTablaExcel(datos: DatosTabla): Promise<void> {
  const { default: ExcelJS } = await import('exceljs');
  const libro = new ExcelJS.Workbook();
  libro.creator = NEGOCIO.nombre;
  libro.created = new Date();

  const hoja = libro.addWorksheet('Reporte', {
    views: [{ state: 'frozen', ySplit: 5 }],
  });

  const totalColumnas = Math.max(1, datos.encabezados.length);
  const ultimaColumna = totalColumnas;

  hoja.mergeCells(1, 1, 1, Math.max(3, ultimaColumna));
  const tituloNegocio = hoja.getCell(1, 1);
  tituloNegocio.value = `${NEGOCIO.nombre} · ${NEGOCIO.eslogan}`;
  tituloNegocio.font = { bold: true, size: 16, color: { argb: 'FF8A3F00' } };
  // Deja libre el espacio de la izquierda para que el logo no tape el título.
  tituloNegocio.alignment = { vertical: 'middle', indent: 9 };
  hoja.getRow(1).height = 34;

  hoja.mergeCells(2, 1, 2, Math.max(3, ultimaColumna));
  const tituloReporte = hoja.getCell(2, 1);
  tituloReporte.value = datos.titulo;
  tituloReporte.font = { bold: true, size: 13, color: { argb: 'FF333333' } };

  hoja.mergeCells(3, 1, 3, Math.max(3, ultimaColumna));
  const fecha = hoja.getCell(3, 1);
  fecha.value = `Generado el ${new Date().toLocaleString('es-CO')}`;
  fecha.font = { size: 10, color: { argb: 'FF777777' } };

  const logo = await logoEnBase64();
  if (logo) {
    const idLogo = libro.addImage({ base64: logo.base64, extension: 'png' });
    hoja.addImage(idLogo, { tl: { col: 0, row: 0 }, ext: { width: 70, height: 52 } });
  }

  const filaEncabezado = 5;
  datos.encabezados.forEach((encabezado, i) => {
    const celda = hoja.getCell(filaEncabezado, i + 1);
    celda.value = encabezado;
    celda.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8821A' } };
    celda.alignment = { vertical: 'middle', horizontal: 'left' };
  });

  datos.filas.forEach((fila, indice) => {
    fila.forEach((valor, i) => {
      hoja.getCell(filaEncabezado + 1 + indice, i + 1).value = valor;
    });
  });

  hoja.columns.forEach((columna, i) => {
    const valores = [datos.encabezados[i] ?? '', ...datos.filas.map((f) => f[i] ?? '')];
    const largo = Math.min(48, Math.max(10, ...valores.map((v) => String(v).length + 2)));
    columna.width = largo;
  });

  hoja.eachRow((fila, numero) => {
    if (numero > filaEncabezado) {
      fila.eachCell((celda) => {
        celda.alignment = { vertical: 'top', wrapText: true };
        celda.border = {
          top: { style: 'thin', color: { argb: 'FFE5D8C9' } },
          left: { style: 'thin', color: { argb: 'FFE5D8C9' } },
          bottom: { style: 'thin', color: { argb: 'FFE5D8C9' } },
          right: { style: 'thin', color: { argb: 'FFE5D8C9' } },
        };
      });
    }
  });

  const buffer = await libro.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(blob);
  enlace.download = `${nombreArchivo(datos.titulo)}.xlsx`;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

/** Genera un PDF con logo, nombre del negocio, título y fecha. */
export async function exportarTablaPdf(datos: DatosTabla): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const columnas = Math.max(1, datos.encabezados.length);
  const horizontal = columnas > 6;
  const doc = new jsPDF({ orientation: horizontal ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });

  const anchoPagina = doc.internal.pageSize.getWidth();
  const altoPagina = doc.internal.pageSize.getHeight();
  const margen = 36;
  let y = 40;

  const logo = await logoEnBase64();
  if (logo) {
    try {
      doc.addImage(logo.dataUrl, 'PNG', margen, y, 46, 46);
    } catch {
      /* si el formato no es compatible, se omite el logo */
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(138, 63, 0);
  doc.text(`${NEGOCIO.nombre} · ${NEGOCIO.eslogan}`, margen + 58, y + 16);

  doc.setFontSize(9);
  doc.setTextColor(150, 100, 50);
  doc.text('REPORTE GENERADO DESDE EL SISTEMA', margen + 58, y + 32);

  y += 62;
  doc.setFontSize(13);
  doc.setTextColor(40, 40, 40);
  doc.text(datos.titulo, margen, y);
  y += 15;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generado el ${new Date().toLocaleString('es-CO')}`, margen, y);
  y += 18;

  const anchoTabla = anchoPagina - margen * 2;
  const anchoColumna = anchoTabla / columnas;
  const altoFila = 16;

  const dibujarEncabezado = () => {
    doc.setFillColor(232, 130, 26);
    doc.rect(margen, y, anchoTabla, altoFila, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    datos.encabezados.forEach((encabezado, i) => {
      const lineas = doc.splitTextToSize(encabezado, anchoColumna - 8);
      doc.text(lineas, margen + 4 + i * anchoColumna, y + 11);
    });
    y += altoFila;
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'normal');
  };

  dibujarEncabezado();

  datos.filas.forEach((fila, indice) => {
    const textos = fila.map((celda) =>
      doc.splitTextToSize(String(celda), anchoColumna - 8) as string[],
    );
    const lineas = Math.max(1, ...textos.map((t) => t.length));
    const alto = Math.max(altoFila, lineas * 9 + 6);

    if (y + alto > altoPagina - 34) {
      doc.addPage();
      y = 40;
      dibujarEncabezado();
    }

    if (indice % 2 === 1) {
      doc.setFillColor(255, 250, 243);
      doc.rect(margen, y, anchoTabla, alto, 'F');
    }

    doc.setDrawColor(229, 216, 201);
    doc.rect(margen, y, anchoTabla, alto);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(50, 50, 50);
    textos.forEach((lineasCelda, i) => {
      doc.text(lineasCelda, margen + 4 + i * anchoColumna, y + 11);
    });

    y += alto;
  });

  doc.setFontSize(7.5);
  doc.setTextColor(130, 130, 130);
  doc.text(
    `${NEGOCIO.nombre} · ${NEGOCIO.eslogan}`,
    margen,
    altoPagina - 20,
  );
  const paginas = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina += 1) {
    doc.setPage(pagina);
    doc.text(
      `Página ${pagina} de ${paginas}`,
      anchoPagina - margen,
      altoPagina - 20,
      { align: 'right' },
    );
  }

  doc.save(`${nombreArchivo(datos.titulo)}.pdf`);
}

function nombreArchivo(titulo: string): string {
  return titulo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60) || 'reporte';
}
