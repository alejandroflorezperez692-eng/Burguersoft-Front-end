import { Copy, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import logoUrl from '../assets/img/logo-burguersoft.png';
import { useToast } from './Toast';
import '../styles/barra-exportar.css';

type Celda = string | number | null | undefined;
type Props = {
  titulo: string;       // nombre del reporte
  columnas: string[];   // encabezados
  filas: Celda[][];     // TODAS las filas filtradas (no solo la página)
  archivo?: string;     // nombre del archivo sin extensión
};

const EMPRESA = 'El Oriente - Burguersoft';
const texto = (c: Celda) => (c === null || c === undefined || c === '' ? '—' : String(c));
const fecha = () => new Date().toLocaleString('es-CO');

async function logoBase64(): Promise<string> {
  const blob = await (await fetch(logoUrl)).blob();
  return new Promise((ok) => {
    const r = new FileReader();
    r.onload = () => ok(r.result as string);
    r.readAsDataURL(blob);
  });
}

export default function BarraExportar({ titulo, columnas, filas, archivo }: Props) {
  const { showToast } = useToast();
  const nombre = archivo ?? titulo.toLowerCase().replace(/\s+/g, '-');
  const vacio = filas.length === 0;

  const copiar = async () => {
    const tsv = [columnas, ...filas.map((f) => f.map(texto))].map((f) => f.join('\t')).join('\n');
    try {
      await navigator.clipboard.writeText(tsv);
      showToast(`Se copiaron ${filas.length} filas al portapapeles`);
    } catch {
      showToast('No se pudo copiar la tabla', true);
    }
  };

  const excel = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(titulo.slice(0, 31));
      ws.addRow([EMPRESA]).font = { bold: true, size: 14 };
      ws.addRow([titulo]).font = { bold: true, size: 12 };
      ws.addRow([`Generado: ${fecha()}`]);
      ws.addRow([]);
      const enc = ws.addRow(columnas);
      enc.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      enc.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8821A' } }; });
      filas.forEach((f) => ws.addRow(f.map(texto)));
      ws.columns.forEach((c) => { c.width = 22; });
      const buf = await wb.xlsx.writeBuffer();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      a.download = `${nombre}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
      showToast('Excel generado correctamente');
    } catch {
      showToast('No se pudo generar el Excel', true);
    }
  };

  const pdf = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF({ orientation: columnas.length > 6 ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
      try { doc.addImage(await logoBase64(), 'PNG', 14, 10, 18, 18); } catch { /* sin logo */ }
      doc.setFontSize(14); doc.setFont('helvetica', 'bold');
      doc.text(EMPRESA, 36, 17);
      doc.setFontSize(11); doc.text(titulo, 36, 23);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text(`Generado: ${fecha()}`, 36, 28);
      autoTable(doc, {
        startY: 34,
        head: [columnas],
        body: filas.map((f) => f.map(texto)),
        headStyles: { fillColor: [232, 130, 26] },
        styles: { fontSize: 8 },
        didDrawPage: () => {
          doc.setFontSize(8);
          doc.text(`Página ${doc.getNumberOfPages()}`, doc.internal.pageSize.getWidth() - 25, doc.internal.pageSize.getHeight() - 8);
        },
      });
      doc.save(`${nombre}.pdf`);
      showToast('PDF generado correctamente');
    } catch {
      showToast('No se pudo generar el PDF', true);
    }
  };

  const imprimir = async () => {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let logo = '';
    try { logo = await logoBase64(); } catch { /* sin logo */ }
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { showToast('El navegador bloqueó la ventana de impresión', true); return; }
    w.document.write(`<html><head><title>${esc(titulo)}</title><style>
      body{font-family:Arial,sans-serif;padding:24px;color:#000}
      .enc{display:flex;align-items:center;gap:14px;margin-bottom:16px}
      .enc img{width:56px;height:56px}.enc h1{font-size:18px;margin:0}.enc p{margin:2px 0;font-size:12px}
      table{border-collapse:collapse;width:100%;font-size:12px}
      th{background:#e8821a;color:#fff;text-align:left}
      th,td{border:1px solid #ccc;padding:6px 8px}
    </style></head><body>
      <div class="enc">${logo ? `<img src="${logo}" alt="Logo">` : ''}<div><h1>${esc(EMPRESA)}</h1><p><b>${esc(titulo)}</b></p><p>Generado: ${esc(fecha())}</p></div></div>
      <table><thead><tr>${columnas.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>
      <tbody>${filas.map((f) => `<tr>${f.map((c) => `<td>${esc(texto(c))}</td>`).join('')}</tr>`).join('')}</tbody></table>
    </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 300);
  };

  const btn = (onClick: () => void, Icono: typeof Copy, etiqueta: string) => (
    <button type="button" className="btn-cancel" onClick={onClick} disabled={vacio}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <Icono size={16} aria-hidden="true" /> {etiqueta}
    </button>
  );

  return (
    <div className="barra-exportar" role="group" aria-label="Exportar tabla">
      {btn(copiar, Copy, 'Copiar')}
      {btn(excel, FileSpreadsheet, 'Excel')}
      {btn(pdf, FileText, 'PDF')}
      {btn(imprimir, Printer, 'Imprimir')}
    </div>
  );
}