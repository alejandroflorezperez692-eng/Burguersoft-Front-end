// src/utils/exportarHistorialInsumoExcel.ts
// Genera un .xlsx (solo lectura) con el historial de UN insumo:
//   Resumen · Compras vs Cierres · Detalle de compras

import type { Row, Workbook, Worksheet } from 'exceljs';

/* ---------- Tipos ---------- */
export interface InsumoExport {
  nombre: string;
  tipo?: string | null;
  unidad_medida?: string | null;
  cantidad: number;
  valor: number;
  proveedor?: string | null;
  estado?: string | null;
}

export interface CompraInsumo {
  compra_id: number;
  fecha: string;
  creada?: string | null;
  numero_factura?: string | null;
  metodo_pago?: string | null;
  estado?: string | null;
  cantidad: string | number;
  precio_unitario: string | number;
  subtotal: string | number;
  proveedor?: string | null;
  usuario?: string | null;
}

export interface CierreInsumo {
  cierre_id: number;
  fecha: string;
  observacion?: string | null;
  usuario?: string | null;
  stock_inicial: string | number;
  compras: string | number;
  consumo_ventas: string | number;
  stock_esperado: string | number;
  conteo_real: string | number;
  diferencia: string | number;
}

/* ---------- Compras vs Cierres (por período) ---------- */
export interface PeriodoInsumo {
  clave: string;
  titulo: string; // "Cierre #5" o "Período actual"
  desde: string | null; // fecha-hora del cierre anterior
  hasta: string | null; // fecha-hora de este cierre (null = en curso)
  esActual: boolean;
  nCompras: number;
  cantidad: number;
  gastado: number;
  cierre: CierreInsumo | null;
}

const norm = (s?: string | null) => String(s ?? '').replace('T', ' ').slice(0, 19);

/**
 * Une compras y cierres: cada fila es el período entre dos cierres, con lo que se
 * compró en ese período frente a lo que dijo el cierre. Devuelve primero el más reciente.
 */
export function armarPeriodos(compras: CompraInsumo[], cierres: CierreInsumo[]): PeriodoInsumo[] {
  if (!compras.length && !cierres.length) return [];

  const tiempo = (c: CompraInsumo) => norm(c.creada) || `${norm(c.fecha).slice(0, 10)} 00:00:00`;
  const asc = cierres
    .slice()
    .sort((a, b) => norm(a.fecha).localeCompare(norm(b.fecha)) || a.cierre_id - b.cierre_id);

  const sumar = (lista: CompraInsumo[]) => ({
    nCompras: new Set(lista.map((c) => c.compra_id)).size,
    cantidad: lista.reduce((a, c) => a + (Number(c.cantidad) || 0), 0),
    gastado: lista.reduce((a, c) => a + (Number(c.subtotal) || 0), 0),
  });

  const periodos: PeriodoInsumo[] = [];
  let desde = '';
  asc.forEach((k) => {
    const hasta = norm(k.fecha);
    const delPeriodo = compras.filter((c) => tiempo(c) >= desde && tiempo(c) < hasta);
    periodos.push({
      clave: `k${k.cierre_id}`,
      titulo: `Cierre #${k.cierre_id}`,
      desde: desde || null,
      hasta,
      esActual: false,
      ...sumar(delPeriodo),
      cierre: k,
    });
    desde = hasta;
  });

  const actuales = compras.filter((c) => tiempo(c) >= desde);
  periodos.push({
    clave: 'actual',
    titulo: 'Período actual',
    desde: desde || null,
    hasta: null,
    esActual: true,
    ...sumar(actuales),
    cierre: null,
  });

  return periodos.reverse();
}

/* ---------- Constantes y utilidades ---------- */
const COLOR = 'FFE8821A'; // naranja de la marca
// Contraseña para desbloquear las hojas (el archivo se entrega de solo lectura)
const CLAVE_HOJAS = 'burguersoft-reportes';
const FMT_MONEDA = '"$"#,##0';
const FMT_NUM = '#,##0.##';
const FMT_FECHA = 'dd/mm/yyyy';
const FMT_FECHA_HORA = 'dd/mm/yyyy hh:mm';

const num = (v: unknown) => Number(v) || 0;

// Fecha real de Excel construida en UTC para que no se corra por zona horaria
const aFechaExcel = (s?: string | null): Date | null => {
  const m = String(s ?? '').match(/(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0)));
};

const estiloEncabezado = (row: Row) => {
  row.height = 24;
  row.eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR } };
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    c.border = { bottom: { style: 'thin', color: { argb: 'FFB86410' } } };
  });
};

const bordeSuave = (row: Row) => {
  row.eachCell({ includeEmpty: true }, (c) => {
    c.border = { bottom: { style: 'hair', color: { argb: 'FFD9D9D9' } } };
  });
};

const estiloTotal = (row: Row, hasta: number) => {
  for (let i = 1; i <= hasta; i++) {
    const c = row.getCell(i);
    c.font = { bold: true };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDEBD3' } };
    c.border = { top: { style: 'thin', color: { argb: COLOR } } };
  }
};

const nuevaHoja = (
  wb: Workbook,
  nombre: string,
  cols: { header: string; key: string; width: number }[]
): Worksheet => {
  const ws = wb.addWorksheet(nombre);
  ws.columns = cols;
  estiloEncabezado(ws.getRow(1));
  ws.views = [{ state: 'frozen', ySplit: 1, showGridLines: false }];
  ws.properties.tabColor = { argb: COLOR };
  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  return ws;
};

/* ---------- Exportador ---------- */
export async function exportarHistorialInsumoExcel(op: {
  insumo: InsumoExport;
  compras: CompraInsumo[];
  cierres: CierreInsumo[];
}) {
  // Import dinámico: ExcelJS solo se descarga cuando se usa el botón
  const ExcelJS = (await import('exceljs')).default;
  const { insumo, compras, cierres } = op;
  const unidad = insumo.unidad_medida ? ` (${insumo.unidad_medida})` : '';

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Reportes';
  wb.created = new Date();

  /* ===== Resumen (va primero) ===== */
  const wsRes = wb.addWorksheet('Resumen');
  wsRes.views = [{ showGridLines: false }];
  wsRes.properties.tabColor = { argb: COLOR };
  wsRes.pageSetup = { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  wsRes.getColumn(1).width = 34;
  wsRes.getColumn(2).width = 30;

  wsRes.getCell('A1').value = `Historial · ${insumo.nombre}`;
  wsRes.getCell('A1').font = { bold: true, size: 18, color: { argb: COLOR } };
  wsRes.getCell('A2').value = 'Generado';
  wsRes.getCell('A2').font = { bold: true };
  wsRes.getCell('B2').value = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
  wsRes.getCell('B2').numFmt = FMT_FECHA_HORA;
  wsRes.getCell('B2').alignment = { horizontal: 'left' };
  wsRes.getCell('A3').value = 'Empresa';
  wsRes.getCell('A3').font = { bold: true };
  wsRes.getCell('B3').value = 'El Oriente';
  wsRes.getCell('B3').alignment = { horizontal: 'left' };

  let f = 4;
  const seccion = (t: string) => {
    const c = wsRes.getCell(`A${f}`);
    c.value = t;
    c.font = { bold: true, size: 14, color: { argb: COLOR } };
    f++;
  };
  const dato = (etiqueta: string, valor: any, fmt?: string) => {
    wsRes.getCell(`A${f}`).value = etiqueta;
    wsRes.getCell(`A${f}`).font = { bold: true };
    const b = wsRes.getCell(`B${f}`);
    b.value = valor;
    b.font = { bold: true, size: 12 };
    b.alignment = { horizontal: 'right' };
    if (fmt) b.numFmt = fmt;
    bordeSuave(wsRes.getRow(f));
    f++;
  };

  seccion('Insumo');
  dato('Nombre', insumo.nombre);
  dato('Tipo', insumo.tipo || '—');
  dato('Proveedor', insumo.proveedor || '—');
  dato('Estado', insumo.estado || '—');
  dato(`Stock actual${unidad}`, num(insumo.cantidad), FMT_NUM);
  dato('Precio por unidad', num(insumo.valor), FMT_MONEDA);
  dato('Valor total en inventario', Math.round(num(insumo.valor) * num(insumo.cantidad)), FMT_MONEDA);
  f++;

  seccion('Compras');
  const totalCant = compras.reduce((a, c) => a + num(c.cantidad), 0);
  const totalGastado = compras.reduce((a, c) => a + num(c.subtotal), 0);
  dato('Número de compras', compras.length);
  dato(`Cantidad comprada${unidad}`, totalCant, FMT_NUM);
  dato('Total gastado', Math.round(totalGastado), FMT_MONEDA);
  f++;

  seccion('Cierres de inventario');
  dato('Número de cierres', cierres.length);
  if (cierres.length) {
    const ultimo = cierres[0]; // vienen del más reciente al más antiguo
    dato('Último conteo real', num(ultimo.conteo_real), FMT_NUM);
    dato('Última diferencia', num(ultimo.diferencia), FMT_NUM);
  }

  /* ===== Compras vs Cierres (una sola tabla, dos bloques) ===== */
  const periodos = armarPeriodos(compras, cierres);
  const wsV = wb.addWorksheet('Compras vs Cierres');
  wsV.properties.tabColor = { argb: COLOR };
  wsV.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  wsV.views = [{ state: 'frozen', ySplit: 2, showGridLines: false }];
  wsV.columns = [
    { key: 'periodo', width: 18 },
    { key: 'desde', width: 17 },
    { key: 'hasta', width: 17 },
    { key: 'n', width: 11 },
    { key: 'cant', width: 16 },
    { key: 'gastado', width: 16 },
    { key: 'inicial', width: 15 },
    { key: 'esperado', width: 15 },
    { key: 'real', width: 14 },
    { key: 'dif', width: 14 },
    { key: 'usuario', width: 22 },
    { key: 'obs', width: 32 },
  ];

  const grupo = (rango: string, texto: string, argb: string) => {
    wsV.mergeCells(rango);
    const c = wsV.getCell(rango.split(':')[0]);
    c.value = texto;
    c.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    const [ini, fin] = rango.split(':');
    const col = (x: string) => x.charCodeAt(0) - 64;
    for (let i = col(ini); i <= col(fin); i++) {
      wsV.getCell(1, i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
    }
  };
  wsV.getRow(1).height = 24;
  grupo('A1:C1', 'PERÍODO', 'FF6B5D4C');
  grupo('D1:F1', 'COMPRAS', COLOR);
  grupo('G1:J1', 'CIERRE DE INVENTARIO', 'FF1D7A46');
  grupo('K1:L1', 'DETALLE DEL CIERRE', 'FF6B5D4C');

  const cabeceras = [
    'Período', 'Desde', 'Hasta',
    '# Compras', `Cantidad${unidad}`, 'Total gastado',
    'Stock inicial', 'Esperado', 'Conteo real', 'Diferencia',
    'Registró', 'Observación',
  ];
  const hRow = wsV.getRow(2);
  cabeceras.forEach((t, i) => (hRow.getCell(i + 1).value = t));
  estiloEncabezado(hRow);
  // El bloque de cierre lleva su propio tono para que se lea el "contra"
  for (let i = 7; i <= 10; i++) hRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E9D5F' } };
  for (let i = 1; i <= 3; i++) hRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8C7B67' } };
  for (let i = 11; i <= 12; i++) hRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8C7B67' } };

  if (periodos.length === 0) {
    wsV.getCell('A3').value = 'Este insumo no tiene compras ni cierres de inventario.';
    wsV.getCell('A3').font = { italic: true, color: { argb: 'FF999999' } };
  } else {
    periodos.forEach((p) => {
      const r = wsV.addRow({
        periodo: p.titulo,
        desde: p.desde ? aFechaExcel(p.desde) : '—',
        hasta: p.hasta ? aFechaExcel(p.hasta) : 'En curso',
        n: p.nCompras,
        cant: p.cantidad,
        gastado: p.gastado,
        inicial: p.cierre ? num(p.cierre.stock_inicial) : null,
        esperado: p.cierre ? num(p.cierre.stock_esperado) : null,
        real: p.cierre ? num(p.cierre.conteo_real) : null,
        dif: p.cierre ? num(p.cierre.diferencia) : null,
        usuario: p.cierre?.usuario || '',
        obs: p.cierre?.observacion || '',
      });
      r.getCell('periodo').font = { bold: true };
      r.getCell('desde').numFmt = FMT_FECHA_HORA;
      r.getCell('hasta').numFmt = FMT_FECHA_HORA;
      r.getCell('desde').alignment = { horizontal: 'left' };
      r.getCell('hasta').alignment = { horizontal: 'left' };
      r.getCell('cant').numFmt = FMT_NUM;
      r.getCell('gastado').numFmt = FMT_MONEDA;
      ['inicial', 'esperado', 'real', 'dif'].forEach((k) => (r.getCell(k).numFmt = FMT_NUM));
      if (p.cierre) {
        const d = num(p.cierre.diferencia);
        r.getCell('dif').font = {
          bold: true,
          color: { argb: d < 0 ? 'FFC0392B' : d > 0 ? 'FFB45F06' : 'FF1D7A46' },
        };
      } else {
        wsV.mergeCells(`G${r.number}:J${r.number}`);
        const c = wsV.getCell(`G${r.number}`);
        c.value = `Pendiente de cierre · stock actual ${num(insumo.cantidad).toLocaleString('es-CO')}${insumo.unidad_medida ? ` ${insumo.unidad_medida}` : ''}`;
        c.font = { italic: true, color: { argb: 'FF8C7B67' } };
        c.alignment = { horizontal: 'center' };
      }
      // Línea más marcada entre los dos bloques
      r.getCell('inicial').border = { left: { style: 'medium', color: { argb: 'FFD6D1CC' } }, bottom: { style: 'hair', color: { argb: 'FFD9D9D9' } } };
      r.getCell('n').border = { left: { style: 'medium', color: { argb: 'FFD6D1CC' } }, bottom: { style: 'hair', color: { argb: 'FFD9D9D9' } } };
      ['periodo', 'desde', 'hasta', 'cant', 'gastado', 'real', 'dif', 'esperado', 'usuario', 'obs'].forEach((k) => {
        r.getCell(k).border = { bottom: { style: 'hair', color: { argb: 'FFD9D9D9' } } };
      });
    });

    const ult = periodos.length + 2;
    const rt = wsV.getRow(ult + 1);
    rt.getCell(1).value = 'TOTAL';
    rt.getCell(4).value = { formula: `SUM(D3:D${ult})`, result: periodos.reduce((a, p) => a + p.nCompras, 0) };
    rt.getCell(5).value = { formula: `SUM(E3:E${ult})`, result: periodos.reduce((a, p) => a + p.cantidad, 0) };
    rt.getCell(5).numFmt = FMT_NUM;
    rt.getCell(6).value = { formula: `SUM(F3:F${ult})`, result: periodos.reduce((a, p) => a + p.gastado, 0) };
    rt.getCell(6).numFmt = FMT_MONEDA;
    rt.getCell(10).value = {
      formula: `SUM(J3:J${ult})`,
      result: periodos.reduce((a, p) => a + (p.cierre ? num(p.cierre.diferencia) : 0), 0),
    };
    rt.getCell(10).numFmt = FMT_NUM;
    estiloTotal(rt, 12);
  }

  /* ===== Detalle de compras (cada línea comprada) ===== */
  const wsC = nuevaHoja(wb, 'Detalle de compras', [
    { header: 'Fecha', key: 'fecha', width: 13 },
    { header: 'Compra #', key: 'compra', width: 11 },
    { header: 'Factura', key: 'factura', width: 16 },
    { header: 'Proveedor', key: 'proveedor', width: 22 },
    { header: `Cantidad${unidad}`, key: 'cantidad', width: 16 },
    { header: 'Precio unitario', key: 'precio', width: 16 },
    { header: 'Subtotal', key: 'subtotal', width: 16 },
    { header: 'Método de pago', key: 'metodo', width: 16 },
    { header: 'Registró', key: 'usuario', width: 22 },
  ]);
  if (compras.length === 0) {
    wsC.getCell('A2').value = 'Este insumo no tiene compras registradas.';
    wsC.getCell('A2').font = { italic: true, color: { argb: 'FF999999' } };
  } else {
    compras.forEach((c) => {
      const r = wsC.addRow({
        fecha: aFechaExcel(c.fecha),
        compra: c.compra_id,
        factura: c.numero_factura || '—',
        proveedor: c.proveedor || '—',
        cantidad: num(c.cantidad),
        precio: num(c.precio_unitario),
        subtotal: num(c.subtotal),
        metodo: c.metodo_pago || '—',
        usuario: c.usuario || '—',
      });
      r.getCell('fecha').numFmt = FMT_FECHA;
      r.getCell('cantidad').numFmt = FMT_NUM;
      r.getCell('precio').numFmt = FMT_MONEDA;
      r.getCell('subtotal').numFmt = FMT_MONEDA;
      r.getCell('fecha').alignment = { horizontal: 'left' };
      bordeSuave(r);
    });
    const ult = compras.length + 1;
    const rt = wsC.getRow(ult + 1);
    rt.getCell(1).value = 'TOTAL';
    rt.getCell(5).value = { formula: `SUM(E2:E${ult})`, result: totalCant };
    rt.getCell(5).numFmt = FMT_NUM;
    rt.getCell(7).value = { formula: `SUM(G2:G${ult})`, result: totalGastado };
    rt.getCell(7).numFmt = FMT_MONEDA;
    estiloTotal(rt, 9);
  }

  /* ===== Acabado y protección ===== */
  // Filas alternas con fondo cálido muy suave (solo hojas de datos)
  wb.worksheets.forEach((ws) => {
    if (ws === wsRes) return;
    ws.eachRow((row, n) => {
      if (n <= 1 || n % 2 !== 0) return;
      let tieneFondo = false;
      row.eachCell((c) => {
        if (c.fill && c.fill.type === 'pattern') tieneFondo = true;
      });
      if (tieneFondo) return;
      row.eachCell((c) => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAF7F3' } };
      });
    });
  });

  // Solo lectura: se puede ver, seleccionar, copiar y ajustar columnas, pero no editar
  for (const ws of wb.worksheets) {
    await ws.protect('', {
      selectLockedCells: true,
      selectUnlockedCells: true,
      formatColumns: true,
      formatRows: true,
    });
  }

  /* ===== Descarga ===== */
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const limpio = insumo.nombre.replace(/[^\w\-]+/g, '_').slice(0, 40) || 'insumo';
  const hoy = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `historial-${limpio}_${hoy}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}