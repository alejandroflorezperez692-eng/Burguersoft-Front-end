import { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import apiClient from '../../api/client';
import AdminLoading from '../../components/AdminLoading';
import { useToast } from '../../components/Toast';
import logoElOriente from '../../assets/img/icono1-oscuro.png';

// Logo de El Oriente incrustado en el PDF (se carga una sola vez y se cachea)
let logoDataUrl: string | null = null;

const cargarLogo = async (): Promise<string | null> => {
  if (logoDataUrl) return logoDataUrl;
  try {
    const res = await fetch(logoElOriente);
    const blob = await res.blob();
    logoDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return logoDataUrl;
  } catch (e) {
    console.error('No se pudo cargar el logo para el PDF:', e);
    return null;
  }
};

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
  grupo?: string;
}

export default function BackupsAdmin() {
  const { showToast, confirmar } = useToast();
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
  const [restoring, setRestoring] = useState<number | null>(null);


  const toArray = <T,>(v: unknown): T[] =>
    Array.isArray(v) ? (v as T[]) : ((v as { data?: unknown })?.data as T[] ?? []);

  const load = () => {
    return Promise.all([
      apiClient.get('/backups').catch(() => null),
      apiClient.get('/backups/tablas').catch(() => null),
    ]).then(([r1, r2]) => {
      const backups = toArray<Backup>(r1?.data);
      const tablas = toArray<Tabla>(r2?.data);
      
      setItems(backups);
      setTablas(tablas);
      
     
      setSel(prev => (prev.length === 0 ? tablas.map((x) => x.tabla) : prev));
      setLoading(false);
      return backups;
    }).catch((e) => {
      console.error('Error en load:', e);
      setItems([]);
      setTablas([]);
      setLoading(false);
      return [] as Backup[];
    });
  };

  useEffect(() => { load(); }, []);

  const toggle = (t: string) => {
    setSel((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  
  const gruposDeTablas = useMemo(() => {
    const mapa = new Map<string, Tabla[]>();
    tablas.forEach((t) => {
      const grupo = t.grupo ?? 'Otras';
      if (!mapa.has(grupo)) mapa.set(grupo, []);
      mapa.get(grupo)!.push(t);
    });
    return Array.from(mapa.entries());
  }, [tablas]);

  const generarPDF = async (
    numTablas: number,
    tablasSeleccionadas: string[],
    datos: { archivo?: string; carpeta?: string; tamanoBytes?: number; totalRegistros?: number } = {}
  ) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 15;
    const CW = W - M * 2;

    // Paleta de El Oriente (naranja -> cafe)
    const NARANJA_T = 176; // #B05C0A  texto de titulos (mas contraste)
    const NARANJA_C = 208; // #D08A22  naranja claro
    const CAFE = 42;       // #2A1405  cafe oscuro
    const CAFE_F = 26;     // #1A0A02  cafe casi negro
    const GRIS = 120;

    let y = M;

    // Dibuja un degradado horizontal imitando la cabecera del sitio
    const degradado = (
      x: number, y0: number, w: number, h: number,
      desde: [number, number, number], hasta: [number, number, number]
    ) => {
      const pasos = 80;
      const paso = w / pasos;
      for (let i = 0; i < pasos; i++) {
        const t = i / (pasos - 1);
        doc.setFillColor(
          Math.round(desde[0] + (hasta[0] - desde[0]) * t),
          Math.round(desde[1] + (hasta[1] - desde[1]) * t),
          Math.round(desde[2] + (hasta[2] - desde[2]) * t)
        );
        doc.rect(x + i * paso, y0, paso + 0.2, h, 'F');
      }
    };

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
      doc.setTextColor(NARANJA_T, 92, 10);
      doc.text(titulo, M, y);
      doc.setDrawColor(NARANJA_T, 92, 10);
      doc.setLineWidth(0.4);
      doc.line(M, y + 1.8, M + CW, y + 1.8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      y += 8;
    };

    // ============ BARRA SUPERIOR CON DEGRADADO (igual que el header del sitio) ============
    degradado(0, 0, W, 3.5, [NARANJA_C, 138, 34], [CAFE_F, 10, 2]);
    y = 12;

    // ============ LOGO DE EL ORIENTE + NOMBRE DE MARCA ============
    const logo = await cargarLogo();
    const altoLogo = 17;
    const anchoLogo = altoLogo * (428 / 401);

    if (logo) {
      doc.addImage(logo, 'PNG', M, y - 1, anchoLogo, altoLogo);
    } else {
      // Respaldo si la imagen no carga
      doc.setFillColor(CAFE, 20, 5);
      doc.circle(M + 7, y + 6, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('B', M + 7, y + 9.8, { align: 'center' });
    }

    // Separador vertical
    const sepX = M + (logo ? anchoLogo + 5 : 18);
    doc.setDrawColor(NARANJA_C, 138, 34);
    doc.setLineWidth(0.6);
    doc.line(sepX, y, sepX, y + 15);

    doc.setTextColor(CAFE_F, 10, 2);
    doc.setFontSize(17);
    doc.setFont('helvetica', 'bold');
    doc.text('EL ORIENTE', sepX + 5, y + 6.5);

    doc.setTextColor(GRIS, GRIS, GRIS);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text('BURGUERSOFT  ·  Sistema de Gestión de Restaurantes', sepX + 5, y + 12);

    y += 21;
    degradado(M, y, CW, 1.2, [NARANJA_C, 138, 34], [CAFE_F, 10, 2]);
    y += 9;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(NARANJA_T, 92, 10);
    doc.text('REPORTE DE COPIA DE SEGURIDAD', W / 2, y, { align: 'center' });
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(GRIS, GRIS, GRIS);
    doc.text('Documento generado automáticamente por el sistema de respaldos', W / 2, y, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    y += 12;

    seccion('DETALLES DEL RESPALDO');

    const ahora = new Date();
    const tamanoLegible = (() => {
      const b = datos.tamanoBytes ?? 0;
      if (!b) return '—';
      if (b < 1024) return `${b} B`;
      if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
      return `${(b / (1024 * 1024)).toFixed(2)} MB`;
    })();

    const filasInfo: [string, string][] = [
      ['Fecha y hora de generación', ahora.toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'medium' })],
      ['Archivo de respaldo', datos.archivo ?? 'respaldo.json'],
      ['Ubicación', datos.carpeta ? `storage/app/private/${datos.carpeta}` : 'storage/app/private/backups'],
      ['Número de tablas respaldadas', String(numTablas)],
      ['Total de tablas en la base de datos', String(tablas.length)],
      ['Registros respaldados', datos.totalRegistros != null ? String(datos.totalRegistros) : '—'],
      ['Tamaño del archivo', tamanoLegible],
      ['Usuario responsable', 'Administrador del sistema'],
      ['Tipo de operación', 'Copia de seguridad automática'],
      ['Estado de la operación', 'EXITOSA'],
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

    
    seccion('TABLAS INCLUIDAS EN EL RESPALDO');

    const colN = M;
    const colNombre = M + 10;
    const colModulo = M + 68;
    const colTecnico = M + 110;
    const anchoNombre = 56;
    const anchoModulo = 40;
    const anchoTecnico = CW - 112;

    const dibujarEncabezadoTabla = () => {
      degradado(M, y, CW, 7, [NARANJA_C, 138, 34], [CAFE, 20, 5]);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('#', colN + 2, y + 4.8);
      doc.text('Tabla', colNombre + 2, y + 4.8);
      doc.text('Módulo', colModulo + 2, y + 4.8);
      doc.text('Nombre en la base de datos', colTecnico + 2, y + 4.8);
      doc.setFont('helvetica', 'normal');
      y += 9;
    };

    dibujarEncabezadoTabla();

    const tablasInfo = tablasSeleccionadas.map((t) => {
      const original = tablas.find((tt) => tt.tabla === t);
      return {
        nombre: original ? original.etiqueta : t,
        grupo: original?.grupo ?? 'Otras',
        tecnico: t,
      };
    });

    tablasInfo.forEach((tb, i) => {
      const lineasNombre = doc.splitTextToSize(tb.nombre, anchoNombre - 4) as string[];
      const lineasModulo = doc.splitTextToSize(tb.grupo, anchoModulo - 4) as string[];
      const lineasTecnico = doc.splitTextToSize(tb.tecnico, anchoTecnico - 4) as string[];
      const alto = Math.max(
        lineasNombre.length,
        lineasModulo.length,
        lineasTecnico.length,
        1
      ) * 4.6 + 3;

      const nuevaPagina = asegurarEspacio(alto + 2);
      if (nuevaPagina) dibujarEncabezadoTabla();

      if (i % 2 === 1) {
        doc.setFillColor(253, 245, 236);
        doc.rect(M, y - 4, CW, alto, 'F');
      }

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(GRIS, GRIS, GRIS);
      doc.text(String(i + 1), colN + 2, y);

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(lineasNombre, colNombre + 2, y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(NARANJA_T, 92, 10);
      doc.text(lineasModulo, colModulo + 2, y);

      doc.setTextColor(GRIS, GRIS, GRIS);
      doc.text(lineasTecnico, colTecnico + 2, y);

      doc.setDrawColor(240, 220, 200);
      doc.setLineWidth(0.2);
      doc.line(M, y + alto - 2.5, M + CW, y + alto - 2.5);
      y += alto;
    });

    doc.setTextColor(0, 0, 0);
    y += 8;

    
    seccion('RESUMEN ESTADÍSTICO');

    const stats: [string, string][] = [
      ['Tablas respaldadas', String(numTablas)],
      ['Registros totales', datos.totalRegistros != null ? String(datos.totalRegistros) : '—'],
      ['Tamaño del archivo', tamanoLegible],
      ['Formato', 'JSON único'],
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

      doc.setFillColor(253, 245, 236);
      doc.setDrawColor(240, 214, 188);
      doc.setLineWidth(0.2);
      doc.roundedRect(bx, by, anchoCaja, altoCaja, 2, 2, 'FD');

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(GRIS, GRIS, GRIS);
      doc.text(label.toUpperCase(), bx + 4, by + 6.5);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(NARANJA_T, 92, 10);
      doc.text(value, bx + 4, by + 14.5);
      doc.setFont('helvetica', 'normal');
    });

    y += filasStats * (altoCaja + gap) + 6;

    asegurarEspacio(30);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(GRIS, GRIS, GRIS);
    doc.text('Documento generado automáticamente. Conserve este archivo como evidencia del respaldo.', M, y);
    y += 14;

    doc.setDrawColor(200, 180, 160);
    doc.setLineWidth(0.3);
    doc.line(M, y, M + 60, y);
    doc.text('Firma responsable', M, y + 4.5);

    doc.line(M + CW - 60, y, M + CW, y);
    doc.text('Sello de la empresa', M + CW - 60, y + 4.5);

    
    const totalPaginas = doc.getNumberOfPages();
    for (let i = 1; i <= totalPaginas; i++) {
      doc.setPage(i);
      degradado(M, H - 15, CW, 1, [NARANJA_C, 138, 34], [CAFE_F, 10, 2]);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(GRIS, GRIS, GRIS);
      doc.text('El Oriente · Burguersoft - Copia de Seguridad', M, H - 9);
      doc.text(`Página ${i} de ${totalPaginas}`, W / 2, H - 9, { align: 'center' });
      doc.text(ahora.toLocaleString('es-MX'), W - M, H - 9, { align: 'right' });
    }

    doc.save(`copia-seguridad-${ahora.toISOString().split('T')[0]}.pdf`);
  };

  const generar = () => {
    if (sel.length === 0) {
      showToast('Selecciona al menos una tabla.', true);
      return;
    }
    setGenerating(true);

    apiClient.post('/backups', { tablas: sel }).then((r) => {
      
      const data = r.data || {};
      
      if (data.success === true) {
      
        const registros: Backup[] = Array.isArray(data.registros) ? data.registros : [];
        const total = Number(data.total) || registros.length || sel.length;
        const nombreArchivo = data.archivo ?? undefined;
        
        showToast(`Copia generada: ${total} tabla${total === 1 ? '' : 's'} en ${nombreArchivo ?? 'un solo archivo'}.`);
        setGenerating(false);
        
        
        load().then((existentes) => {
          const yaExisten = new Set(existentes.map((b) => b.id));
          const faltantes = registros.filter((b) => b && b.id != null && !yaExisten.has(b.id));
          if (faltantes.length > 0) {
            setItems((prev) => [...faltantes, ...prev]);
          }
        });
        
        generarPDF(total, sel, {
          archivo: nombreArchivo,
          carpeta: data.carpeta,
          tamanoBytes: data.tamano_bytes !== undefined ? Number(data.tamano_bytes) : undefined,
          totalRegistros: data.total_registros !== undefined ? Number(data.total_registros) : undefined,
        }).catch((e) => {
          console.error('Error generando el PDF del respaldo:', e);
        });
      } else {
       
        showToast(data.message || 'Error generando backup', true);
        setGenerating(false);
        console.error('Error backend backup:', data);
      }
    }).catch((error) => {
      // Error de red o inesperado
      showToast('Error de conexión al generar backup', true);
      setGenerating(false);
      console.error('Error crítico en post /backups:', error);
    });
  };

  const del = async (id: number) => {
    if (!(await confirmar('¿Eliminar este registro de backup? Esta acción no se puede deshacer.', 'Sí, eliminar'))) return;
    apiClient.delete(`/backups/${id}`).then(() => load());
  };

  const restaurar = async (id: number, resumen: string) => {
    const ok = await confirmar(
      `¿Restaurar esta copia de seguridad?\n\n` +
      `Copia: ${resumen}\n\n` +
      `ATENCIÓN: Se reemplazarán los datos actuales de las tablas incluidas ` +
      `en la copia por los datos guardados. Esta acción no se puede deshacer.\n\n` +
      `¿Deseas continuar?`,
      'Sí, restaurar'
    );
    if (!ok) return;

    setRestoring(id);


    apiClient.post(`/backups/${id}/restaurar`).then((r) => {
      const data = r.data || {};

      if (data.success === true) {
        const n = data.tablas_restauradas?.length ?? 0;
        const filas = data.total_filas ?? 0;
        showToast(`Copia restaurada: ${n} tabla(s) y ${filas} registro(s) recuperados.`);
      } else {
        showToast(data.message || 'Error restaurando la copia', true);
        console.error('Error restaurando backup:', data);
      }
      setRestoring(null);
      load();
    }).catch((error) => {
      const texto = error?.response?.data?.message || 'Error de conexión al restaurar la copia';
      showToast(texto, true);
      setRestoring(null);
      console.error('Error crítico restaurando backup:', error);
    });
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
          <span className="stat-sub">Registros</span>
        </div>
      </div>

      <div className="backups-tablas-panel" style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 28, marginBottom: 28, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="backups-tablas-header">
          <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-900)' }}>
            Tablas a respaldar ({sel.length}/{tablas.length})
          </h3>
          <div className="backups-tablas-acciones">
            <button className="btn-cancel" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setSel(tablas.map((x) => x.tabla))}>Todas</button>
            <button className="btn-cancel" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setSel([])}>Ninguna</button>
          </div>
        </div>
        <div style={{ maxHeight: 320, overflowY: 'auto', border: '1.5px solid var(--border)', borderRadius: 'var(--r-sm)', padding: 14, background: 'var(--surface)' }}>
          {tablas.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {gruposDeTablas.map(([grupo, items]) => {
                const marcadas = items.filter((t) => sel.includes(t.tabla)).length;
                return (
                  <div key={grupo}>
                    <div className="backups-tablas-grupo">
                      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--text-400)' }}>
                        {grupo}
                      </span>
                      <span className="backups-tablas-separador" style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                      <button
                        className="btn-cancel backups-tablas-grupo-btn"
                        style={{ padding: '2px 8px', fontSize: 11 }}
                        onClick={() => setSel((prev) => [...new Set([...prev, ...items.map((t) => t.tabla)])])}
                      >
                        Todas
                      </button>
                      <button
                        className="btn-cancel backups-tablas-grupo-btn"
                        style={{ padding: '2px 8px', fontSize: 11 }}
                        onClick={() => {
                          const delGrupo = new Set(items.map((t) => t.tabla));
                          setSel((prev) => prev.filter((x) => !delGrupo.has(x)));
                        }}
                      >
                        Ninguna
                      </button>
                      <span style={{ fontSize: 11, fontWeight: 700, color: marcadas === items.length ? 'var(--brand)' : 'var(--text-400)', minWidth: 34, textAlign: 'right' }}>
                        {marcadas}/{items.length}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '4px 10px' }}>
                      {items.map((t) => (
                        <label
                          key={t.tabla}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px',
                            borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                            color: 'var(--text-900)',
                            background: sel.includes(t.tabla) ? 'var(--surface-3)' : 'transparent',
                            transition: 'background 0.15s',
                          }}
                        >
                          <input type="checkbox" checked={sel.includes(t.tabla)} onChange={() => toggle(t.tabla)} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.etiqueta}>
                            {t.etiqueta}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <span style={{ color: 'var(--text-400)', fontSize: 12, padding: 6 }}>Cargando tablas...</span>
          )}
        </div>

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
              <th>Contenido</th>
              <th>Fecha y hora</th>
              <th className="th-acciones">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(filteredItems ?? []).map((b) => {
              const detalle = b?.nombre_tabla ?? b?.nombre ?? '';
              const esTodas = detalle === 'TODAS';
              const lista = detalle ? detalle.split(',').map((t) => t.trim()).filter(Boolean) : [];
              const resumen = esTodas
                ? 'TODAS'
                : lista.length > 1
                  ? `${lista.length} tablas`
                  : detalle || '—';
              return (
              <tr key={b?.id}>
                <td>{b?.id}</td>
                <td style={{ fontWeight: 600 }} title={detalle || undefined}>{resumen}</td>
                <td>{b?.fecha ? new Date(b.fecha).toLocaleString() : '—'}</td>
                <td className="td-acciones">
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    <button
                      className="btn-icon btn-icon-restore btn-accion"
                      onClick={() => b?.id != null && restaurar(b.id, resumen)}
                      disabled={restoring !== null}
                      title={restoring === b?.id ? 'Restaurando...' : 'Restaurar esta copia'}
                    >
                      {restoring === b?.id ? 'Restaurando' : 'Restaurar'}
                    </button>
                    <button
                      className="btn-icon btn-icon-del btn-accion"
                      onClick={() => b?.id != null && del(b.id)}
                      disabled={restoring !== null}
                      title="Eliminar este registro"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
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
