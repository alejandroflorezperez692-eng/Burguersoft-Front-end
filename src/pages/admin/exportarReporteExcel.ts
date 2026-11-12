// src/pages/admin/exportarReporteExcel.ts
// Requiere: npm i exceljs
//
// Genera un .xlsx con las hojas que correspondan a lo que se le pase:
//   Resumen · Ventas · Detalle de ventas · Productos · Compras · Detalle de insumos

import type { Row, Workbook, Worksheet } from 'exceljs';

/* ---------- Tipos de entrada ---------- */
export interface VentaExport {
  id: number;
  fecha: string; // YYYY-MM-DD (ya en hora local)
  cliente?: string;
  metodo_pago: string;
  tipo_entrega: string;
  estado: string;
  valor_total: number;
  detalles: {
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    producto?: { nombre?: string };
  }[];
  promociones: { nombre: string }[];
}

export interface ProductoExport {
  nombre: string;
  cantidad: number;
  total: number;
}

export interface CompraExport {
  id: number;
  fecha: string;
  metodo_pago: string;
  valor_total: number;
  detalles: {
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    materia_prima?: { nombre: string; unidad_medida?: string | null };
    marca?: { nombre: string };
  }[];
}

export interface OpcionesReporte {
  desde: string; // YYYY-MM-DD
  hasta: string; // YYYY-MM-DD
  nombre: string; // nombre del archivo sin extensión
  ventas?: VentaExport[];
  productos?: ProductoExport[];
  compras?: { lista: CompraExport[]; totalPrevio: number };
}

/* ---------- Constantes y utilidades ---------- */
const COLOR = 'FFE8821A'; // naranja de la marca
// Contraseña para desbloquear las hojas (el archivo se entrega de solo lectura)
const CLAVE_HOJAS = 'burguersoft-reportes';
const FMT_MONEDA = '"$"#,##0';
const FMT_FECHA = 'dd/mm/yyyy';
const FMT_PCT = '0.0%';
const CONTABLES = ['Pagado'];

const num = (v: unknown) => Number(v) || 0;
const dia = (f?: string | null) => String(f ?? '').slice(0, 10);
const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const noContable = (estado?: string) => !CONTABLES.includes(estado ?? '');

// Fecha real de Excel (UTC medianoche para que no se corra un día)
const aFecha = (iso: string) => {
  const [y, m, d] = dia(iso).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

const estiloEncabezado = (row: Row) => {
  row.height = 22;
  row.eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
    c.border = { bottom: { style: 'thin', color: { argb: 'FFB86410' } } };
  });
};

const bordeSuave = (row: Row) => {
  row.eachCell((c) => {
    c.border = { bottom: { style: 'hair', color: { argb: 'FFD9D9D9' } } };
  });
};

const estiloTotal = (row: Row) => {
  row.eachCell({ includeEmpty: true }, (c) => {
    c.font = { bold: true };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDEBD3' } };
    c.border = { top: { style: 'thin', color: { argb: COLOR } } };
  });
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

const agrupar = <T,>(items: T[], clave: (x: T) => string, valor: (x: T) => number) => {
  const m = new Map<string, { n: number; t: number }>();
  items.forEach((x) => {
    const k = clave(x) || 'Sin dato';
    const a = m.get(k) ?? { n: 0, t: 0 };
    a.n += 1;
    a.t += valor(x);
    m.set(k, a);
  });
  return [...m.entries()].map(([nombre, d]) => ({ nombre, n: d.n, t: d.t })).sort((a, b) => b.t - a.t);
};

const sumarPor = (pares: [string, number][]) => {
  const m = new Map<string, number>();
  pares.forEach(([k, v]) => m.set(k, (m.get(k) ?? 0) + v));
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

/* ---------- Exportador ---------- */
export async function exportarReporteExcel(op: OpcionesReporte) {
  // Import dinámico: ExcelJS solo se descarga cuando se usa el botón
  const ExcelJS = (await import('exceljs')).default;

  const ventas = (op.ventas ?? [])
    .slice()
    .sort((a, b) => dia(a.fecha).localeCompare(dia(b.fecha)) || a.id - b.id);
  const productos = op.productos ?? [];
  const compras = (op.compras?.lista ?? [])
    .slice()
    .sort((a, b) => dia(a.fecha).localeCompare(dia(b.fecha)) || a.id - b.id);

  const hayV = ventas.length > 0;
  const hayP = productos.length > 0;
  const hayC = compras.length > 0;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Reportes';
  wb.created = new Date();

  // El resumen va primero; se llena al final cuando ya se conocen las demás hojas
  const wsRes = wb.addWorksheet('Resumen');
  wsRes.views = [{ showGridLines: false }];
  wsRes.properties.tabColor = { argb: COLOR };
  wsRes.pageSetup = { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  /* ===================== VENTAS ===================== */
  let ultV = 1;
  const validas = ventas.filter((v) => !noContable(v.estado));
  const ingresos = validas.reduce((a, v) => a + Math.round(num(v.valor_total)), 0);

  if (hayV) {
    const ws = nuevaHoja(wb, 'Ventas', [
      { header: '#', key: 'id', width: 8 },
      { header: 'Fecha', key: 'fecha', width: 14 },
      { header: 'Cliente', key: 'cliente', width: 28 },
      { header: 'Método de pago', key: 'metodo', width: 18 },
      { header: 'Entrega', key: 'entrega', width: 16 },
      { header: 'Estado', key: 'estado', width: 16 },
      { header: 'Combos', key: 'combos', width: 28 },
      { header: 'Total', key: 'total', width: 16 },
    ]);

    ventas.forEach((v) => {
      const combos = (v.promociones ?? []).map((p) => p?.nombre).filter(Boolean).join(', ');
      const r = ws.addRow({
        id: v.id,
        fecha: aFecha(v.fecha),
        cliente: v.cliente || '—',
        metodo: v.metodo_pago || 'Sin dato',
        entrega: v.tipo_entrega || 'Sin dato',
        estado: v.estado || 'Sin dato',
        combos: combos || '—',
        total: Math.round(num(v.valor_total)),
      });
      r.getCell('fecha').numFmt = FMT_FECHA;
      r.getCell('fecha').alignment = { horizontal: 'center' };
      r.getCell('total').numFmt = FMT_MONEDA;
      bordeSuave(r);
      // Sin pagar / anuladas en gris para distinguirlas
      if (noContable(v.estado)) {
        r.eachCell((c) => {
          c.font = { italic: true, color: { argb: 'FF999999' } };
        });
      }
    });

    ultV = ventas.length + 1;
    const rt = ws.getRow(ultV + 1);
    rt.getCell(1).value = 'TOTAL (solo pedidos pagados)';
    rt.getCell(8).value = {
      formula: `SUMIFS(H2:H${ultV},F2:F${ultV},"Pagado")`,
      result: ingresos,
    };
    rt.getCell(8).numFmt = FMT_MONEDA;
    estiloTotal(rt);
    ws.autoFilter = { from: 'A1', to: `H${ultV}` };

    // ----- Detalle de ventas (una fila por producto vendido) -----
    const wd = nuevaHoja(wb, 'Detalle de ventas', [
      { header: '# venta', key: 'venta', width: 10 },
      { header: 'Fecha', key: 'fecha', width: 14 },
      { header: 'Producto', key: 'producto', width: 32 },
      { header: 'Cantidad', key: 'cant', width: 12 },
      { header: 'Precio unitario', key: 'precio', width: 17 },
      { header: 'Subtotal', key: 'subtotal', width: 17 },
      { header: 'Estado', key: 'estado', width: 16 },
    ]);
    ventas.forEach((v) => {
      (v.detalles ?? []).forEach((d) => {
        const r = wd.addRow({
          venta: v.id,
          fecha: aFecha(v.fecha),
          producto: d?.producto?.nombre ?? 'Producto',
          cant: num(d?.cantidad),
          precio: Math.round(num(d?.precio_unitario)),
          estado: v.estado || 'Sin dato',
        });
        r.getCell('subtotal').value = {
          formula: `D${r.number}*E${r.number}`,
          result: Math.round(num(d?.subtotal)),
        };
        r.getCell('fecha').numFmt = FMT_FECHA;
        r.getCell('fecha').alignment = { horizontal: 'center' };
        r.getCell('precio').numFmt = FMT_MONEDA;
        r.getCell('subtotal').numFmt = FMT_MONEDA;
        bordeSuave(r);
        if (noContable(v.estado)) {
          r.eachCell((c) => {
            c.font = { italic: true, color: { argb: 'FF999999' } };
          });
        }
      });
    });
    if (wd.rowCount > 1) wd.autoFilter = { from: 'A1', to: `G${wd.rowCount}` };
  }

  /* ===================== PRODUCTOS ===================== */
  let ultP = 1;
  if (hayP) {
    const ws = nuevaHoja(wb, 'Productos', [
      { header: 'Producto', key: 'nombre', width: 34 },
      { header: 'Unidades vendidas', key: 'cant', width: 20 },
      { header: 'Total vendido', key: 'total', width: 18 },
      { header: '% del total', key: 'pct', width: 14 },
    ]);
    ultP = productos.length + 1;
    const granTotal = productos.reduce((a, p) => a + Math.round(num(p.total)), 0);

    productos.forEach((p) => {
      const r = ws.addRow({
        nombre: p.nombre,
        cant: num(p.cantidad),
        total: Math.round(num(p.total)),
      });
      r.getCell('pct').value = {
        formula: `IF($C$${ultP + 1}=0,0,C${r.number}/$C$${ultP + 1})`,
        result: granTotal ? Math.round(num(p.total)) / granTotal : 0,
      };
      r.getCell('total').numFmt = FMT_MONEDA;
      r.getCell('pct').numFmt = FMT_PCT;
      bordeSuave(r);
    });

    const rt = ws.getRow(ultP + 1);
    rt.getCell(1).value = 'TOTAL';
    rt.getCell(2).value = {
      formula: `SUBTOTAL(109,B2:B${ultP})`,
      result: productos.reduce((a, p) => a + num(p.cantidad), 0),
    };
    rt.getCell(3).value = { formula: `SUBTOTAL(109,C2:C${ultP})`, result: granTotal };
    rt.getCell(3).numFmt = FMT_MONEDA;
    estiloTotal(rt);
    ws.autoFilter = { from: 'A1', to: `D${ultP}` };
  }

  /* ===================== COMPRAS ===================== */
  let ultC = 1;
  let ultDC = 1;
  const totalCompras = compras.reduce((a, c) => a + Math.round(num(c.valor_total)), 0);
  const paresInsumo: [string, number][] = [];
  const paresMarca: [string, number][] = [];

  if (hayC) {
    const ws = nuevaHoja(wb, 'Compras', [
      { header: '#', key: 'id', width: 8 },
      { header: 'Fecha', key: 'fecha', width: 14 },
      { header: 'Método de pago', key: 'metodo', width: 20 },
      { header: 'Marcas / proveedores', key: 'marcas', width: 40 },
      { header: 'Total', key: 'total', width: 16 },
    ]);

    compras.forEach((c) => {
      const marcas = [...new Set((c.detalles ?? []).map((d) => d?.marca?.nombre).filter(Boolean))];
      const r = ws.addRow({
        id: c.id,
        fecha: aFecha(c.fecha),
        metodo: c.metodo_pago || 'Sin dato',
        marcas: marcas.length ? marcas.join(', ') : '—',
        total: Math.round(num(c.valor_total)),
      });
      r.getCell('fecha').numFmt = FMT_FECHA;
      r.getCell('fecha').alignment = { horizontal: 'center' };
      r.getCell('total').numFmt = FMT_MONEDA;
      bordeSuave(r);
    });

    ultC = compras.length + 1;
    const rt = ws.getRow(ultC + 1);
    rt.getCell(1).value = 'TOTAL';
    rt.getCell(5).value = { formula: `SUBTOTAL(109,E2:E${ultC})`, result: totalCompras };
    rt.getCell(5).numFmt = FMT_MONEDA;
    estiloTotal(rt);
    ws.autoFilter = { from: 'A1', to: `E${ultC}` };

    // ----- Detalle de insumos (una fila por insumo comprado) -----
    const wd = nuevaHoja(wb, 'Detalle de insumos', [
      { header: '# compra', key: 'compra', width: 10 },
      { header: 'Fecha', key: 'fecha', width: 14 },
      { header: 'Insumo', key: 'insumo', width: 30 },
      { header: 'Marca', key: 'marca', width: 22 },
      { header: 'Cantidad', key: 'cant', width: 12 },
      { header: 'Unidad', key: 'unidad', width: 12 },
      { header: 'Precio unitario', key: 'precio', width: 17 },
      { header: 'Subtotal', key: 'subtotal', width: 17 },
    ]);
    compras.forEach((c) => {
      (c.detalles ?? []).forEach((d) => {
        const insumo = d?.materia_prima?.nombre ?? 'Insumo';
        const marca = d?.marca?.nombre ?? 'Sin marca';
        const r = wd.addRow({
          compra: c.id,
          fecha: aFecha(c.fecha),
          insumo,
          marca,
          cant: num(d?.cantidad),
          unidad: d?.materia_prima?.unidad_medida ?? '',
          precio: Math.round(num(d?.precio_unitario)),
        });
        r.getCell('subtotal').value = {
          formula: `E${r.number}*G${r.number}`,
          result: Math.round(num(d?.subtotal)),
        };
        r.getCell('fecha').numFmt = FMT_FECHA;
        r.getCell('fecha').alignment = { horizontal: 'center' };
        r.getCell('precio').numFmt = FMT_MONEDA;
        r.getCell('subtotal').numFmt = FMT_MONEDA;
        bordeSuave(r);
        paresInsumo.push([insumo, num(d?.subtotal)]);
        paresMarca.push([marca, num(d?.subtotal)]);
      });
    });
    ultDC = wd.rowCount;
    if (ultDC > 1) wd.autoFilter = { from: 'A1', to: `H${ultDC}` };
  }

  /* ===================== RESUMEN ===================== */
  wsRes.columns = [{ width: 38 }, { width: 18 }, { width: 18 }, { width: 14 }];
  wsRes.views = [{ showGridLines: false }];

  wsRes.mergeCells('A1:D1');
  wsRes.getCell('A1').value = 'Reporte';
  wsRes.getCell('A1').font = { bold: true, size: 18, color: { argb: COLOR } };
  wsRes.getCell('A2').value = 'Rango de fechas';
  wsRes.getCell('A2').font = { bold: true };
  wsRes.getCell('B2').value = `${dmy(op.desde)} al ${dmy(op.hasta)}`;
  wsRes.getCell('A3').value = 'Generado';
  wsRes.getCell('A3').font = { bold: true };
  wsRes.getCell('B3').value = new Date();
  wsRes.getCell('B3').numFmt = 'dd/mm/yyyy hh:mm';
  wsRes.getCell('B3').alignment = { horizontal: 'left' };
  wsRes.getCell('B2').alignment = { horizontal: 'left' };

  let f = 5;

  const seccion = (t: string) => {
    const c = wsRes.getCell(`A${f}`);
    c.value = t;
    c.font = { bold: true, size: 14, color: { argb: COLOR } };
    f++;
  };

  const subtitulo = (t: string) => {
    const c = wsRes.getCell(`A${f}`);
    c.value = t;
    c.font = { bold: true, size: 12, color: { argb: 'FF333333' } };
    f++;
  };

  const kpi = (etiqueta: string, valor: any, fmt?: string) => {
    const a = wsRes.getCell(`A${f}`);
    a.value = etiqueta;
    a.font = { bold: true };
    const b = wsRes.getCell(`B${f}`);
    b.value = valor;
    b.alignment = { horizontal: 'right' };
    b.font = { bold: true, size: 12 };
    if (fmt) b.numFmt = fmt;
    bordeSuave(wsRes.getRow(f));
    return f++;
  };

  const tabla = <T,>(
    cabeceras: string[],
    items: T[],
    celdas: (it: T, r: number, i: number) => any[],
    fmts: (string | undefined)[]
  ) => {
    if (!items.length) return;
    const h = wsRes.getRow(f);
    cabeceras.forEach((t, i) => (h.getCell(i + 1).value = t));
    estiloEncabezado(h);
    f++;
    items.forEach((it, i) => {
      const r = wsRes.getRow(f);
      celdas(it, f, i).forEach((v, j) => {
        const c = r.getCell(j + 1);
        c.value = v;
        const fm = fmts[j];
        if (fm) c.numFmt = fm;
      });
      bordeSuave(r);
      f++;
    });
    f++;
  };

  let refIngresos = 0;
  let refCompras = 0;

  /* ----- Resumen de ventas ----- */
  if (hayV) {
    seccion('Ventas');
    const rango = (col: string) => `Ventas!$${col}$2:$${col}$${ultV}`;
    const crit = `${rango('F')},"Pagado"`;

    const rCant = kpi('Ventas pagadas', {
      formula: `COUNTIFS(${crit})`,
      result: validas.length,
    });
    refIngresos = kpi(
      'Ingresos',
      { formula: `SUMIFS(${rango('H')},${crit})`, result: ingresos },
      FMT_MONEDA
    );
    kpi(
      'Ticket promedio',
      {
        formula: `IF(B${rCant}=0,0,B${refIngresos}/B${rCant})`,
        result: validas.length ? ingresos / validas.length : 0,
      },
      FMT_MONEDA
    );
    kpi('Sin pagar / anuladas', {
      formula: `COUNTA(${rango('F')})-B${rCant}`,
      result: ventas.length - validas.length,
    });
    f++;

    const tablaVentas = (titulo: string, cab: string, col: 'D' | 'E', clave: (v: VentaExport) => string) => {
      const datos = agrupar(validas, clave, (v) => Math.round(num(v.valor_total)));
      if (!datos.length) return;
      subtitulo(titulo);
      tabla(
        [cab, 'Ventas', 'Total', '% del total'],
        datos,
        (d, r) => [
          d.nombre,
          { formula: `COUNTIFS(${rango(col)},A${r},${crit})`, result: d.n },
          { formula: `SUMIFS(${rango('H')},${rango(col)},A${r},${crit})`, result: d.t },
          { formula: `IF($B$${refIngresos}=0,0,C${r}/$B$${refIngresos})`, result: ingresos ? d.t / ingresos : 0 },
        ],
        [undefined, undefined, FMT_MONEDA, FMT_PCT]
      );
    };
    tablaVentas('Por método de pago', 'Método de pago', 'D', (v) => v.metodo_pago);
    tablaVentas('Por tipo de entrega', 'Entrega', 'E', (v) => v.tipo_entrega);
  }

  /* ----- Resumen de productos (top 10) ----- */
  if (hayP) {
    seccion('Productos más vendidos (top 10)');
    tabla(
      ['Producto', 'Unidades', 'Total vendido'],
      productos.slice(0, 10),
      (p, _r, i) => [
        { formula: `Productos!A${i + 2}`, result: p.nombre },
        { formula: `Productos!B${i + 2}`, result: num(p.cantidad) },
        { formula: `Productos!C${i + 2}`, result: Math.round(num(p.total)) },
      ],
      [undefined, undefined, FMT_MONEDA]
    );
  }

  /* ----- Resumen de compras ----- */
  if (hayC) {
    seccion('Compras');
    const totalPrevio = op.compras?.totalPrevio ?? 0;

    refCompras = kpi(
      'Total invertido',
      { formula: `SUM(Compras!E2:E${ultC})`, result: totalCompras },
      FMT_MONEDA
    );
    const rN = kpi('Número de compras', { formula: `COUNT(Compras!A2:A${ultC})`, result: compras.length });
    kpi(
      'Promedio por compra',
      { formula: `IF(B${rN}=0,0,B${refCompras}/B${rN})`, result: compras.length ? totalCompras / compras.length : 0 },
      FMT_MONEDA
    );
    const rPrev = kpi('Total periodo anterior', Math.round(totalPrevio), FMT_MONEDA);
    kpi(
      'Variación vs periodo anterior',
      {
        formula: `IF(B${rPrev}=0,"Sin dato",(B${refCompras}-B${rPrev})/B${rPrev})`,
        result: totalPrevio ? (totalCompras - totalPrevio) / totalPrevio : 'Sin dato',
      },
      FMT_PCT
    );
    f++;

    subtitulo('Por método de pago');
    tabla(
      ['Método de pago', 'Compras', 'Total', '% del total'],
      agrupar(compras, (c) => c.metodo_pago, (c) => Math.round(num(c.valor_total))),
      (d, r) => [
        d.nombre,
        { formula: `COUNTIF(Compras!$C$2:$C$${ultC},A${r})`, result: d.n },
        { formula: `SUMIF(Compras!$C$2:$C$${ultC},A${r},Compras!$E$2:$E$${ultC})`, result: d.t },
        { formula: `IF($B$${refCompras}=0,0,C${r}/$B$${refCompras})`, result: totalCompras ? d.t / totalCompras : 0 },
      ],
      [undefined, undefined, FMT_MONEDA, FMT_PCT]
    );

    const topDetalle = (titulo: string, cab: string, pares: [string, number][], col: 'C' | 'D') => {
      const top = sumarPor(pares).slice(0, 10);
      if (!top.length) return;
      subtitulo(titulo);
      const det = (c: string) => `'Detalle de insumos'!$${c}$2:$${c}$${ultDC}`;
      tabla(
        [cab, 'Total', '% del total'],
        top,
        ([nombre, valor], r) => [
          nombre,
          { formula: `SUMIF(${det(col)},A${r},${det('H')})`, result: Math.round(valor) },
          { formula: `IF($B$${refCompras}=0,0,B${r}/$B$${refCompras})`, result: totalCompras ? valor / totalCompras : 0 },
        ],
        [undefined, FMT_MONEDA, FMT_PCT]
      );
    };
    topDetalle('Insumos con más gasto (top 10)', 'Insumo', paresInsumo, 'C');
    topDetalle('Marcas / proveedores con más gasto (top 10)', 'Marca', paresMarca, 'D');
  }

  /* ----- Balance (solo si hay ventas y compras) ----- */
  if (hayV && hayC) {
    seccion('Balance del rango');
    const a = kpi('Ingresos por ventas', { formula: `B${refIngresos}`, result: ingresos }, FMT_MONEDA);
    const b = kpi('Invertido en compras', { formula: `B${refCompras}`, result: totalCompras }, FMT_MONEDA);
    kpi('Ventas menos compras', { formula: `B${a}-B${b}`, result: ingresos - totalCompras }, FMT_MONEDA);
  }

  /* ===================== ACABADO Y PROTECCIÓN ===================== */
  // Filas alternas en gris muy suave para que se lea mejor (solo hojas de datos)
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

  // Solo lectura: se puede ver, seleccionar, copiar y ajustar el ancho de columnas,
  // pero no editar celdas ni fórmulas.
  for (const ws of wb.worksheets) {
    await ws.protect(CLAVE_HOJAS, {
      selectLockedCells: true,
      selectUnlockedCells: true,
      formatColumns: true,
      formatRows: true,
    });
  }

  /* ===================== DESCARGA ===================== */
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${op.nombre}_${op.desde}_a_${op.hasta}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}