import type ExcelJS from 'exceljs';
import logoUrl from '../assets/img/logo-burguersoft.png';

export const NEGOCIO_REPORTE = {
  nombre: 'Burguersoft',
  empresa: 'El Oriente',
};

async function logoBase64(): Promise<{ base64: string; extension: 'png' } | null> {
  try {
    const respuesta = await fetch(logoUrl);
    const buffer = await respuesta.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binario = '';
    for (let i = 0; i < bytes.length; i += 1) binario += String.fromCharCode(bytes[i]);
    return { base64: btoa(binario), extension: 'png' };
  } catch {
    return null;
  }
}

/**
 * Agrega una hoja "Portada" al libro con logo, nombre del negocio,
 * empresa, título del reporte y fecha de generación.
 * Debe llamarse antes de crear las demás hojas para que quede de primera.
 */
export async function agregarPortada(
  libro: ExcelJS.Workbook,
  titulo: string,
  subtitulo?: string,
): Promise<ExcelJS.Worksheet> {
  const hoja = libro.addWorksheet('Portada');
  hoja.views = [{ showGridLines: false }];
  hoja.columns = [{ width: 4 }, { width: 46 }, { width: 34 }];

  const logo = await logoBase64();
  if (logo) {
    const id = libro.addImage({ base64: logo.base64, extension: logo.extension });
    hoja.addImage(id, { tl: { col: 0.2, row: 0.2 }, ext: { width: 96, height: 96 } });
  }

  hoja.mergeCells('B2:C2');
  const nombre = hoja.getCell('B2');
  nombre.value = NEGOCIO_REPORTE.nombre;
  nombre.font = { bold: true, size: 22, color: { argb: 'FF8A3F00' } };

  hoja.mergeCells('B3:C3');
  const empresa = hoja.getCell('B3');
  empresa.value = NEGOCIO_REPORTE.empresa;
  empresa.font = { bold: true, size: 13, color: { argb: 'FFB5651D' } };

  hoja.mergeCells('B5:C5');
  const tituloCelda = hoja.getCell('B5');
  tituloCelda.value = titulo;
  tituloCelda.font = { bold: true, size: 16, color: { argb: 'FF333333' } };
  tituloCelda.alignment = { wrapText: true };

  if (subtitulo) {
    hoja.mergeCells('B6:C6');
    const sub = hoja.getCell('B6');
    sub.value = subtitulo;
    sub.font = { size: 11, color: { argb: 'FF666666' } };
    sub.alignment = { wrapText: true };
  }

  const fecha = hoja.getCell('B8');
  fecha.value = `Generado el ${new Date().toLocaleString('es-CO')}`;
  fecha.font = { size: 10, color: { argb: 'FF777777' } };

  hoja.getRow(2).height = 30;
  hoja.getRow(3).height = 20;

  return hoja;
}
