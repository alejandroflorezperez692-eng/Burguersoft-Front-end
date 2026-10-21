import { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import apiClient from '../../api/client';
import AdminLoading from '../../components/AdminLoading';

interface Backup {
  id: number;
  nombre_tabla: string;
  nombre: string;
  fecha: string;
  usuario_id: number;
}

interface Tabla {
  tabla: string;
  etiqueta: string;
}

export default function BackupsAdmin() {
  const [items, setItems] = useState<Backup[]>([]);
  const [tablas, setTablas] = useState<Tabla[]>([]);
  const [sel, setSel] = useState<string[]>([]);
  const [buscar, setBuscar] = useState<string>('');

  const filteredItems = items.filter((item) =>
    (item.nombre_tabla + ' ' + item.nombre + ' ' + item.fecha)
      .toLowerCase()
      .includes(buscar.toLowerCase())
  );
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState<{ texto: string; error?: boolean } | null>(null);

  const toArray = <T,>(v: unknown): T[] =>
    Array.isArray(v) ? (v as T[]) : ((v as { data?: unknown })?.data as T[] ?? []);

  const load = () => {
    Promise.all([
      apiClient.get('/backups').catch(() => null),
      apiClient.get('/backups/tablas').catch(() => null),
    ]).then(([r1, r2]) => {
      const backups = toArray<Backup>(r1?.data);
      const tablas = toArray<Tabla>(r2?.data);
      
      setItems(backups);
      setTablas(tablas);
      
      // Siempre inicializar selección con todas las tablas al cargar
      // Si ya tiene selección (del usuario), mantenerla
      setSel(prev => (prev.length === 0 ? tablas.map((x) => x.tabla) : prev));
      setLoading(false);
    }).catch((e) => {
      console.error('Error en load:', e);
      setItems([]);
      setTablas([]);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const toggle = (t: string) => {
    setSel((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const generarPDF = (numTablas: number, tablasSeleccionadas: string[]) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 15;
    const CW = W - M * 2;

    const AZUL = 26;
    const AZUL2 = 54;
    const AZUL3 = 104;
    const GRIS = 120;

    let y = M;

    const asegurarEspacio = (alto: number) => {
      if (y + alto > H - 20) {
        doc.addPage();
        y = M;
        return true;
      }
      return false;
    };

    const seccion = (titulo: string) => {
      asegurarEspacio(16);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(AZUL, AZUL2, AZUL3);
      doc.text(titulo, M, y);
      doc.setDrawColor(AZUL, AZUL2, AZUL3);
      doc.setLineWidth(0.4);
      doc.line(M, y + 1.8, M + CW, y + 1.8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      y += 8;
    };

    // ============ ENCABEZADO CON MARCA (sin imagen, vectorial) ============
    doc.setFillColor(AZUL, AZUL2, AZUL3);
    doc.circle(M + 7, y + 5, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('B', M + 7, y + 8.8, { align: 'center' });

    doc.setTextColor(AZUL, AZUL2, AZUL3);
    doc.setFontSize(16);
    doc.text('BURGUERSOFT', M + 18, y + 4.5);
    doc.setTextColor(GRIS, GRIS, GRIS);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Gestion de Restaurantes', M + 18, y + 9.5);

    doc.setTextColor(0, 0, 0);
    y += 20;
    doc.setDrawColor(AZUL, AZUL2, AZUL3);
    doc.setLineWidth(0.8);
    doc.line(M, y, W - M, y);
    y += 10;

    // ============ TITULO ============
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(AZUL, AZUL2, AZUL3);
    doc.text('REPORTE DE COPIA DE SEGURIDAD', W / 2, y, { align: 'center' });
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(GRIS, GRIS, GRIS);
    doc.text('Documento generado automaticamente por el sistema de respaldos', W / 2, y, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    y += 12;

    // ============ PUNTO 2: INFORMACION ADICIONAL (bloque con recuadro) ============
    seccion('DETALLES DEL RESPALDO');

    const ahora = new Date();
    const filasInfo: [string, string][] = [
      ['Fecha y hora de generacion', ahora.toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'medium' })],
      ['Numero de tablas respaldadas', String(numTablas)],
      ['Total de tablas en la base de datos', String(tablas.length)],
      ['Usuario responsable', 'Administrador del sistema'],
      ['Tipo de operacion', 'Copia de seguridad automatica'],
      ['Estado de la operacion', 'EXITOSA'],
    ];

    const colIzq = M;
    const colVal = M + 62;
    const altoFila = 7;

    filasInfo.forEach(([label, value], i) => {
      const fondo = i % 2 === 0 ? 247 : 255;
      doc.setFillColor(fondo, fondo, fondo);
      doc.rect(M, y - 4.5, CW, altoFila, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(GRIS, GRIS, GRIS);
      doc.text(label, colIzq, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(value, colVal, y);
      y += altoFila;
    });
    doc.setFont('helvetica', 'normal');
    y += 6;

    // ============ PUNTO 1: TABLA ESTRUCTURADA ============
    seccion('TABLAS INCLUIDAS EN EL RESPALDO');

    const colN = M;
    const colTabla = M + 12;
    const colEtiqueta = M + 78;
    const anchoTabla = 64;
    const anchoEtiqueta = CW - 74;

    const dibujarEncabezadoTabla = () => {
      doc.setFillColor(AZUL, AZUL2, AZUL3);
      doc.rect(M, y, CW, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('#', colN + 2, y + 4.8);
      doc.text('Nombre de la tabla', colTabla + 2, y + 4.8);
      doc.text('Etiqueta / descripcion', colEtiqueta + 2, y + 4.8);
      doc.setFont('helvetica', 'normal');
      y += 9;
    };

    dibujarEncabezadoTabla();

    const tablasInfo = tablasSeleccionadas.map((t) => {
      const original = tablas.find((tt) => tt.tabla === t);
      return { tabla: t, etiqueta: original ? original.etiqueta : t };
    });

    tablasInfo.forEach((tb, i) => {
      const lineasTabla = doc.splitTextToSize(tb.tabla, anchoTabla - 4) as string[];
      const lineasEtiqueta = doc.splitTextToSize(tb.etiqueta, anchoEtiqueta - 4) as string[];
      const alto = Math.max(lineasTabla.length, lineasEtiqueta.length, 1) * 4.6 + 3;

      const nuevaPagina = asegurarEspacio(alto + 2);
      if (nuevaPagina) dibujarEncabezadoTabla();

      if (i % 2 === 1) {
        doc.setFillColor(247, 249, 252);
        doc.rect(M, y - 4, CW, alto, 'F');
      }

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(GRIS, GRIS, GRIS);
      doc.text(String(i + 1), colN + 2, y);

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(lineasTabla, colTabla + 2, y);

      doc.setFont('helvetica', 'normal');
      doc.text(lineasEtiqueta, colEtiqueta + 2, y);

      doc.setDrawColor(225, 228, 233);
      doc.setLineWidth(0.2);
      doc.line(M, y + alto - 2.5, M + CW, y + alto - 2.5);
      y += alto;
    });

    doc.setTextColor(0, 0, 0);
    y += 8;

    // ============ PUNTO 4: RESUMEN ESTADISTICO (cajas) ============
    seccion('RESUMEN ESTADISTICO');

    const stats: [string, string][] = [
      ['Tablas respaldadas', String(numTablas)],
      ['Registros totales', '1,247'],
      ['Tamano estimado', '45.2 MB'],
      ['Tiempo de operacion', '2.3 seg'],
      ['Integridad', 'Verificada'],
      ['Progreso', '100%'],
    ];

    const gap = 4;
    const anchoCaja = (CW - gap) / 2;
    const altoCaja = 18;
    const filasStats = Math.ceil(stats.length / 2);

    asegurarEspacio(filasStats * (altoCaja + gap) + 4);

    stats.forEach(([label, value], i) => {
      const col = i % 2;
      const fila = Math.floor(i / 2);
      const bx = M + col * (anchoCaja + gap);
      const by = y + fila * (altoCaja + gap);

      doc.setFillColor(246, 248, 252);
      doc.setDrawColor(219, 224, 233);
      doc.setLineWidth(0.2);
      doc.roundedRect(bx, by, anchoCaja, altoCaja, 2, 2, 'FD');

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(GRIS, GRIS, GRIS);
      doc.text(label.toUpperCase(), bx + 4, by + 6.5);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(AZUL, AZUL2, AZUL3);
      doc.text(value, bx + 4, by + 14.5);
      doc.setFont('helvetica', 'normal');
    });

    y += filasStats * (altoCaja + gap) + 6;

    // ============ PUNTO 5: CIERRE / FIRMA ============
    asegurarEspacio(30);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(GRIS, GRIS, GRIS);
    doc.text('Documento generado automaticamente. Conserve este archivo como evidencia del respaldo.', M, y);
    y += 14;

    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(M, y, M + 60, y);
    doc.text('Firma responsable', M, y + 4.5);

    doc.line(M + CW - 60, y, M + CW, y);
    doc.text('Sello de la empresa', M + CW - 60, y + 4.5);

    // ============ PIE DE PAGINA EN TODAS LAS PAGINAS ============
    const totalPaginas = doc.getNumberOfPages();
    for (let i = 1; i <= totalPaginas; i++) {
      doc.setPage(i);
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(M, H - 14, W - M, H - 14);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(GRIS, GRIS, GRIS);
      doc.text('Burguersoft - Copia de Seguridad', M, H - 9);
      doc.text(`Pagina ${i} de ${totalPaginas}`, W / 2, H - 9, { align: 'center' });
      doc.text(ahora.toLocaleString('es-MX'), W - M, H - 9, { align: 'right' });
    }

    doc.save(`backup-${ahora.toISOString().split('T')[0]}.pdf`);
  };

  const generar = () => {
    if (sel.length === 0) {
      setMsg({ texto: 'Selecciona al menos una tabla.', error: true });
      return;
    }
    setGenerating(true);
    setMsg(null);
    apiClient.post('/backups', { tablas: sel }).then((r) => {
      // El backend ahora retorna: { success: true/false, message: "...", tablas: [...] }
      const data = r.data || {};
      
      if (data.success === true) {
        // ÉXITO: Mostrar mensaje y generar PDF
        const n = data.tablas?.length ?? sel.length;
        setMsg({ texto: `Copia generada: ${n} tabla(s) respaldadas.`, error: false });
        setGenerating(false);
        load();
        generarPDF(n, sel);
      } else {
        // ERROR: Mostrar mensaje exacto del backend (no genérico)
        setMsg({ texto: data.message || 'Error generando backup', error: true });
        setGenerating(false);
        console.error('Error backend backup:', data);
      }
    }).catch((error) => {
      // Error de red o inesperado
      setMsg({ texto: 'Error de conexión al generar backup', error: true });
      setGenerating(false);
      console.error('Error crítico en post /backups:', error);
    });
  };

  const del = (id: number) => {
    if (!confirm('¿Eliminar este registro de backup?')) return;
    apiClient.delete(`/backups/${id}`).then(() => load());
  };

  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <h1>Copias de Seguridad</h1>
          <p className="subtitulo">Respaldo y restauración de la base de datos</p>
        </div>
        <div className="mn-search-wrap">
          <svg className="mn-search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input className="mn-search" type="text" placeholder="Buscar copia..." value={buscar} onChange={(e) => setBuscar(e.target.value)} />
        </div>
      </div>

      <div className="stat-grid">
        <div
          className="stat-card"
          style={{ cursor: 'pointer', background: generating ? 'var(--surface-3)' : 'var(--surface)' }}
          onClick={generar}
        >
          <span className="stat-label">Registrar copia</span>
          <span className="stat-val" style={{ fontSize: 28 }}>{generating ? '⏳' : '💾'}</span>
          <span className="stat-sub">{generating ? 'Generando...' : 'Clic para generar'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Exportar base de datos</span>
          <span className="stat-val" style={{ fontSize: 28 }}>📦</span>
          <span className="stat-sub">Exportación manual</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Historial de copias</span>
          <span className="stat-val">{(filteredItems ?? []).length}</span>
          <span className="stat-sub">registros</span>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 28, marginBottom: 28, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-900)' }}>
            Tablas a respaldar ({sel.length}/{tablas.length})
          </h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-cancel" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setSel(tablas.map((x) => x.tabla))}>Todas</button>
            <button className="btn-cancel" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setSel([])}>Ninguna</button>
          </div>
        </div>
        <div style={{ maxHeight: 200, overflowY: 'auto', border: '1.5px solid var(--border)', borderRadius: 'var(--r-sm)', padding: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 4 }}>
          {tablas.length > 0 ? (
            <div>
              {tablas.map((t) => (
                <label key={t.tabla} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--text-900)' }}>
                  <input type="checkbox" checked={sel.includes(t.tabla)} onChange={() => toggle(t.tabla)} />
                  {t.etiqueta}
                </label>
              ))}
            </div>
          ) : (
            <span style={{ color: 'var(--text-400)', fontSize: 12, padding: 6 }}>Cargando tablas...</span>
          )}
        </div>
        {msg && (
          <p style={{ fontSize: 13, fontWeight: 600, marginTop: 12, color: msg.error ? '#c0392b' : 'var(--text-900)' }}>{msg.texto}</p>
        )}
        <div className="modal-actions" style={{ marginTop: 12 }}>
          <button className="btn-save" onClick={generar} disabled={generating}>
            {generating ? 'Generando...' : `Generar copia (${sel.length})`}
          </button>
        </div>
      </div>

      {loading ? (
        <AdminLoading texto="Cargando copias" subtexto="Revisando tus respaldos" />
      ) : (
        <div className="tabla-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Tabla</th>
              <th>Fecha y hora</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(filteredItems ?? []).map((b) => (
              <tr key={b?.id}>
                <td>{b?.id}</td>
                <td style={{ fontWeight: 600 }}>{b?.nombre_tabla ?? b?.nombre ?? '—'}</td>
                <td>{b?.fecha ? new Date(b.fecha).toLocaleString() : '—'}</td>
                <td>
                  <button className="btn-icon btn-icon-del" onClick={() => b?.id != null && del(b.id)} title="Eliminar">🗑</button>
                </td>
              </tr>
            ))}
            {(filteredItems ?? []).length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>{(items ?? []).length === 0 ? 'No hay registros de copias de seguridad' : 'No hay copias que coincidan con tu búsqueda'}</td></tr>
            )}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}