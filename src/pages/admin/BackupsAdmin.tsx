import { useEffect, useState } from 'react';
import axios from 'axios';
import apiClient from '../../api/client';
import AdminLoading from '../../components/AdminLoading';
import Paginacion, { paginar } from '../../components/Paginacion';
import { useToast } from '../../components/Toast';

/* ------------------------------------------------------------------ */
/* Estilos locales (autocontenidos, mismas variables que el resto)      */
/* ------------------------------------------------------------------ */
const BACKUPS_CSS = `
.bk-pw{position:relative}
.bk-pw-toggle{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;padding:0;font-family:inherit;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--text-600)}
.bk-hint{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--brand)}
.bk-badge{display:inline-block;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:700;line-height:1.6;white-space:nowrap}
.bk-badge-yes{background:rgba(29,153,84,.13);color:#1d7a44}
.bk-badge-no{background:var(--surface-3);color:var(--text-400)}
.bk-desc{font-size:13px;color:var(--text-600);line-height:1.55;margin:0 0 16px}
.bk-modo{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border:1.5px solid var(--border);border-radius:var(--r-sm);cursor:pointer;margin-bottom:10px;background:var(--surface);transition:border-color .15s,background .15s}
.bk-modo.activo{border-color:var(--brand);background:var(--surface-3)}
.bk-modo input{margin-top:3px;accent-color:var(--brand)}
.bk-modo strong{display:block;font-size:13px;color:var(--text-900);margin-bottom:3px}
.bk-modo p{margin:0;font-size:12px;color:var(--text-600);line-height:1.45}
.bk-opcion{display:block;width:100%;text-align:left;background:var(--surface);border:1.5px solid var(--border);border-radius:var(--r-sm);padding:13px 15px;cursor:pointer;margin-bottom:10px;transition:border-color .15s,background .15s;font-family:inherit}
.bk-opcion:hover:not(:disabled){border-color:var(--brand);background:var(--surface-3)}
.bk-opcion:disabled{opacity:.6;cursor:wait}
.bk-opcion strong{display:block;font-size:13.5px;color:var(--text-900);margin-bottom:4px;font-weight:700}
.bk-opcion span{display:block;font-size:12px;color:var(--text-600);line-height:1.45}
.bk-warn{font-size:12px;color:#a2651a;background:rgba(232,130,26,.1);border:1px solid rgba(232,130,26,.3);border-radius:var(--r-sm);padding:10px 12px;line-height:1.5;margin:0 0 14px}
.bk-archivo{display:flex;justify-content:space-between;gap:10px;padding:9px 10px;border-bottom:1px solid var(--border);font-size:13px;color:var(--text-900)}
.bk-archivo span:last-child{color:var(--text-400);font-size:12px;white-space:nowrap}
.bk-drive{display:flex;justify-content:space-between;align-items:center;gap:18px;flex-wrap:wrap;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:22px 26px;box-shadow:var(--shadow-sm)}
.bk-drive h3{margin:0 0 4px;font-size:15px;font-weight:700;color:var(--text-900)}
.bk-drive p{margin:0;font-size:12.5px;color:var(--text-600);line-height:1.5;max-width:560px}
.bk-check{display:flex;gap:10px;align-items:flex-start;margin:16px 0 0;font-size:13px;font-weight:600;color:var(--text-900);cursor:pointer}
.bk-check input{margin-top:3px;accent-color:var(--brand)}
.bk-check small{display:block;font-weight:400;font-size:12px;color:var(--text-600);margin-top:2px;line-height:1.45}
`;

/* ------------------------------------------------------------------ */
/* Tipos de las respuestas del API                                      */
/* ------------------------------------------------------------------ */
interface Backup {
  id: number;
  nombre: string;
  nombre_tabla: string;
  fecha: string;
  usuario_id: number;
  archivo?: string | null;
  ruta?: string | null;
  modo?: string | null;
  tamano_bytes?: number | null;
  total_registros?: number | null;
  tablas_incluidas?: string[] | string | null;
  subido_drive?: boolean | number | null;
  drive_file_id?: string | null;
}

interface Tabla {
  tabla: string;
  etiqueta: string;
  grupo?: string;
}

interface RespuestaGeneracion {
  success?: boolean;
  message?: string;
  archivo?: string;
  carpeta?: string;
  tablas?: string[];
  total?: number;
  registros?: number | unknown[];
  tamano_bytes?: number;
  total_registros?: number;
  id?: number;
  drive?: { success?: boolean; message?: string } | null;
}

interface RespuestaRestauracion {
  success?: boolean;
  message?: string;
  tablas_restauradas?: string[];
  total_filas?: number;
}

interface ArchivoDrive {
  id?: string;
  name?: string;
  nombre?: string;
  size?: number | string;
  createdTime?: string;
}

interface EstadoDrive {
  configurada: boolean;
  conectada: boolean;
}

type ModoRestauracion = 'replace' | 'merge';

/* ------------------------------------------------------------------ */
/* Utilidades                                                           */
/* ------------------------------------------------------------------ */
const mensajeDeError = async (e: unknown): Promise<string> => {
  if (axios.isAxiosError(e)) {
    const data: unknown = e.response?.data;
    if (data instanceof Blob) {
      try {
        const json = JSON.parse(await data.text()) as { message?: unknown; error?: unknown };
        if (typeof json?.message === 'string' && json.message) return json.message;
        if (typeof json?.error === 'string' && json.error) return json.error;
      } catch { /* el cuerpo no era JSON */ }
    } else if (data && typeof data === 'object') {
      const obj = data as { message?: unknown; error?: unknown };
      if (typeof obj.message === 'string' && obj.message) return obj.message;
      if (typeof obj.error === 'string' && obj.error) return obj.error;
    }
    return 'No se pudo conectar con el servidor. Intenta de nuevo.';
  }
  return 'Ocurrió un error inesperado.';
};

const descargarBlob = (blob: Blob, nombre: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const nombreDesdeDisposition = (h: unknown): string | null => {
  if (typeof h !== 'string') return null;
  const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(h);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1].trim());
  } catch {
    return m[1].trim();
  }
};

const formatBytes = (b?: number | null): string => {
  if (!b || b <= 0) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
};

const extraerBackups = (payload: unknown): { items: Backup[]; total?: number } => {
  if (Array.isArray(payload)) return { items: payload as Backup[] };
  if (payload && typeof payload === 'object') {
    const obj = payload as { data?: unknown; total?: unknown };
    const items = Array.isArray(obj.data) ? (obj.data as Backup[]) : [];
    const total = typeof obj.total === 'number' ? obj.total : undefined;
    return { items, total };
  }
  return { items: [] };
};

const extraerArreglo = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const data = (payload as { data?: unknown }).data;
    if (Array.isArray(data)) return data as T[];
  }
  return [];
};

const asegurarExtension = (base: string, ext: '.sql.enc' | '.sql'): string => {
  if (ext === '.sql.enc') {
    return /\.sql\.enc$/i.test(base) ? base : `${base}.sql.enc`;
  }
  const sinCifrar = base.replace(/\.enc$/i, '');
  return /\.sql$/i.test(sinCifrar) ? sinCifrar : `${sinCifrar}.sql`;
};

export default function BackupsAdmin() {
  const { showToast, confirmar } = useToast();
  const [items, setItems] = useState<Backup[]>([]);
  const [tablas, setTablas] = useState<Tabla[]>([]);
  const [buscar, setBuscar] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Paginación
  const [pagina, setPagina] = useState(1);

  // Modal de generación (contraseña)
  const [modalGen, setModalGen] = useState(false);
  const [passGen, setPassGen] = useState('');
  const [verPassGen, setVerPassGen] = useState(false);
  const [generando, setGenerando] = useState(false);

  // Modal de restauración
  const [restoreSel, setRestoreSel] = useState<Backup | null>(null);
  const [restoreModo, setRestoreModo] = useState<ModoRestauracion>('replace');
  const [restorePass, setRestorePass] = useState('');
  const [verRestorePass, setVerRestorePass] = useState(false);
  const [restaurando, setRestaurando] = useState(false);

  // Modal de descarga
  const [dlSel, setDlSel] = useState<Backup | null>(null);
  const [dlPidiendoPass, setDlPidiendoPass] = useState(false);
  const [dlPass, setDlPass] = useState('');
  const [verDlPass, setVerDlPass] = useState(false);
  const [descargandoPlano, setDescargandoPlano] = useState(false);

  // Descargas / subidas en curso
  const [descargandoId, setDescargandoId] = useState<number | null>(null);
  const [subiendoDrive, setSubiendoDrive] = useState<number | null>(null);

  // Estado de la conexión con Google Drive
  const [drive, setDrive] = useState<EstadoDrive>({ configurada: false, conectada: false });
  const [subirAlGenerar, setSubirAlGenerar] = useState(false);
  const [desconectando, setDesconectando] = useState(false);

  // Listado de copias en Google Drive
  const [modalDrive, setModalDrive] = useState(false);
  const [driveArchivos, setDriveArchivos] = useState<ArchivoDrive[]>([]);
  const [cargandoDrive, setCargandoDrive] = useState(false);

  const filteredItems = items.filter((item) =>
    `${item.nombre_tabla ?? ''} ${item.nombre ?? ''} ${item.fecha ?? ''} ${item.archivo ?? ''}`
      .toLowerCase()
      .includes(buscar.toLowerCase())
  );

  // Aplicamos la paginación a los items filtrados
  const { visibles: copiasVisibles, paginaActual } = paginar(filteredItems, pagina);

  const load = () => {
    return Promise.all([
      apiClient.get('/backups').catch(() => null),
      apiClient.get('/backups/tablas').catch(() => null),
    ]).then(([r1, r2]) => {
      const { items: backups } = extraerBackups(r1?.data);
      const listaTablas = extraerArreglo<Tabla>(r2?.data);
      setItems(backups);
      setTablas(listaTablas);
      setLoading(false);
    }).catch((e) => {
      console.error('Error en load:', e);
      setItems([]);
      setTablas([]);
      setLoading(false);
    });
  };

  const cargarEstadoDrive = async () => {
    try {
      const r = await apiClient.get<Partial<EstadoDrive>>('/backups/drive/estado');
      setDrive({ configurada: Boolean(r.data?.configurada), conectada: Boolean(r.data?.conectada) });
    } catch {
      setDrive({ configurada: false, conectada: false });
    }
  };

  useEffect(() => {
    load();
    cargarEstadoDrive();
    const alVolver = () => { cargarEstadoDrive(); };
    window.addEventListener('focus', alVolver);
    return () => window.removeEventListener('focus', alVolver);
  }, []);

  const esBackupCompleto = (b: Backup): boolean => {
    const detalle = (b.nombre_tabla ?? '').trim();
    if (!detalle || detalle.toUpperCase() === 'TODAS') return true;
    const incl = b.tablas_incluidas;
    if (Array.isArray(incl) && incl.length === tablas.length && tablas.length > 0) return true;
    return false;
  };

  const resumenContenido = (b: Backup): { texto: string; titulo: string } => {
    const incl = Array.isArray(b.tablas_incluidas)
      ? b.tablas_incluidas.join(', ')
      : typeof b.tablas_incluidas === 'string' && b.tablas_incluidas
        ? b.tablas_incluidas
        : (b.nombre_tabla ?? '');
    if (esBackupCompleto(b)) {
      return { texto: 'Base completa', titulo: 'Todas las tablas de la base de datos' };
    }
    const lista = incl.split(',').map((t) => t.trim()).filter(Boolean);
    if (lista.length > 1) return { texto: `${lista.length} tablas`, titulo: lista.join(', ') };
    return { texto: lista[0] ?? '—', titulo: lista[0] ?? '' };
  };

  /* Generar copia */
  const abrirModalGen = () => {
    setPassGen('');
    setVerPassGen(false);
    setSubirAlGenerar(false);
    setModalGen(true);
  };

  const generar = async () => {
    if (!passGen.trim()) {
      showToast('Ingresa tu contraseña para generar la copia.', true);
      return;
    }
    setGenerando(true);
    try {
      const r = await apiClient.post<RespuestaGeneracion>('/backups', {
        password: passGen,
        subir_drive: drive.conectada && subirAlGenerar,
      });
      const data = r.data ?? {};

      if (data.success === false) {
        showToast(data.message || 'Error al generar la copia de seguridad.', true);
        return;
      }

      const registrosTotales = typeof data.registros === 'number'
        ? data.registros
        : Array.isArray(data.registros)
          ? data.registros.length
          : Number(data.total_registros) || 0;

      const numRegistros = registrosTotales > 0 ? ` · ${registrosTotales.toLocaleString('es-MX')} registros` : '';
      if (data.drive?.success === false) {
        showToast(`Copia generada y guardada en el servidor, pero no se pudo subir a Drive: ${data.drive.message ?? 'error desconocido'}`, true);
      } else if (data.drive?.success) {
        showToast(`Copia de seguridad generada${numRegistros}. Guardada en el servidor y en Google Drive.`);
      } else {
        showToast(`Copia de seguridad generada${numRegistros}. Ya está guardada en el servidor.`);
      }

      setModalGen(false);
      setPassGen('');
      load();
    } catch (e) {
      showToast(await mensajeDeError(e), true);
      console.error('Error generando backup:', e);
    } finally {
      setGenerando(false);
    }
  };

  /* Restaurar */
  const abrirModalRestore = (b: Backup) => {
    setRestoreSel(b);
    setRestoreModo('replace');
    setRestorePass('');
    setVerRestorePass(false);
  };

  const confirmarRestaurar = async () => {
    if (!restoreSel) return;
    if (!restorePass.trim()) {
      showToast('Ingresa tu contraseña para restaurar la copia.', true);
      return;
    }
    setRestaurando(true);
    try {
      const r = await apiClient.post<RespuestaRestauracion>(
        `/backups/${restoreSel.id}/restaurar`,
        { password: restorePass, modo: restoreModo }
      );
      const data = r.data ?? {};
      if (data.success === false) {
        showToast(data.message || 'Error al restaurar la copia.', true);
        return;
      }
      const n = data.tablas_restauradas?.length ?? 0;
      const filas = data.total_filas ?? 0;
      showToast(`Copia restaurada: ${n} tabla${n === 1 ? '' : 's'} y ${filas} registro${filas === 1 ? '' : 's'} recuperados.`);
      setRestoreSel(null);
      setRestorePass('');
      load();
    } catch (e) {
      showToast(await mensajeDeError(e), true);
      console.error('Error restaurando backup:', e);
    } finally {
      setRestaurando(false);
    }
  };

  /* Descargas */
  const descargarCifrado = async (b: Backup) => {
    setDescargandoId(b.id);
    try {
      const r = await apiClient.get<Blob>(`/backups/${b.id}/descargar`, { responseType: 'blob' });
      const cd: unknown = r.headers?.['content-disposition'];
      const nombre = nombreDesdeDisposition(cd)
        ?? asegurarExtension(b.archivo ?? b.nombre ?? `backup-${b.id}`, '.sql.enc');
      descargarBlob(r.data, nombre);
      showToast('Descarga iniciada: archivo cifrado (.sql.enc).');
    } catch (e) {
      showToast(await mensajeDeError(e), true);
    } finally {
      setDescargandoId(null);
    }
  };

  const abrirModalDescarga = (b: Backup) => {
    setDlSel(b);
    setDlPidiendoPass(false);
    setDlPass('');
    setVerDlPass(false);
  };

  const cerrarModalDescarga = () => {
    if (descargandoPlano) return;
    setDlSel(null);
    setDlPidiendoPass(false);
    setDlPass('');
    setVerDlPass(false);
  };

  const empezarDescargaPlana = () => {
    setDlPidiendoPass(true);
    setDlPass('');
    setVerDlPass(false);
  };

  const descargarPlano = async () => {
    if (!dlSel) return;
    if (!dlPass.trim()) {
      showToast('Ingresa tu contraseña para descifrar el archivo.', true);
      return;
    }
    setDescargandoPlano(true);
    try {
      const r = await apiClient.post<Blob>(
        `/backups/${dlSel.id}/descargar-plano`,
        { password: dlPass },
        { responseType: 'blob' }
      );
      const cd: unknown = r.headers?.['content-disposition'];
      const nombre = nombreDesdeDisposition(cd)
        ?? asegurarExtension(dlSel.archivo ?? dlSel.nombre ?? `backup-${dlSel.id}`, '.sql');
      descargarBlob(r.data, nombre);
      showToast('Descarga iniciada: archivo SQL sin cifrar (.sql).');
      cerrarModalDescarga();
    } catch (e) {
      showToast(await mensajeDeError(e), true);
    } finally {
      setDescargandoPlano(false);
    }
  };

  /* Google Drive */
  const conectarDrive = async () => {
    try {
      const r = await apiClient.get<{ url?: string }>('/backups/drive/auth');
      const url = r.data?.url;
      if (!url) {
        showToast('No se pudo obtener el enlace de autorización de Google.', true);
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
      showToast('Se abrió la autorización de Google Drive en una pestaña nueva.', false, true);
    } catch (e) {
      showToast(await mensajeDeError(e), true);
      console.error('Error conectando con Google Drive:', e);
    }
  };

  const desconectarDrive = async () => {
    const ok = await confirmar(
      '¿Desconectar Google Drive? Las copias que ya están en Drive se conservan, pero no podrás subir ni descargar desde aquí hasta volver a conectar.',
      'Sí, desconectar',
      true
    );
    if (!ok) return;
    setDesconectando(true);
    try {
      const r = await apiClient.post<{ message?: string }>('/backups/drive/desconectar');
      showToast(r.data?.message ?? 'Google Drive desconectado.');
      await cargarEstadoDrive();
    } catch (e) {
      showToast(await mensajeDeError(e), true);
    } finally {
      setDesconectando(false);
    }
  };

  const verCopiasDrive = async () => {
    setCargandoDrive(true);
    try {
      const r = await apiClient.get<{ archivos?: ArchivoDrive[] }>('/backups/drive/listar');
      setDriveArchivos(Array.isArray(r.data?.archivos) ? r.data.archivos : []);
      setModalDrive(true);
    } catch (e) {
      showToast(await mensajeDeError(e), true);
      console.error('Error listando copias de Drive:', e);
      cargarEstadoDrive();
    } finally {
      setCargandoDrive(false);
    }
  };

  const subirDrive = async (b: Backup) => {
    setSubiendoDrive(b.id);
    try {
      const r = await apiClient.post<{ success?: boolean; message?: string }>(`/backups/${b.id}/drive/subir`);
      showToast(r.data?.message ?? 'Copia subida a Google Drive correctamente.');
      load();
    } catch (e) {
      showToast(await mensajeDeError(e), true);
      console.error('Error subiendo backup a Drive:', e);
      cargarEstadoDrive();
    } finally {
      setSubiendoDrive(null);
    }
  };

  const descargarDeDrive = async (b: Backup) => {
    setDescargandoId(b.id);
    try {
      const r = await apiClient.get<Blob>(`/backups/${b.id}/drive/descargar`, { responseType: 'blob' });
      const cd: unknown = r.headers?.['content-disposition'];
      const nombre = nombreDesdeDisposition(cd)
        ?? asegurarExtension(b.archivo ?? b.nombre ?? `backup-${b.id}`, '.sql.enc');
      descargarBlob(r.data, nombre);
      showToast('Descarga iniciada desde Google Drive.');
    } catch (e) {
      showToast(await mensajeDeError(e), true);
    } finally {
      setDescargandoId(null);
    }
  };

  /* Eliminar */
  const del = async (b: Backup) => {
    const ok = await confirmar(
      b.subido_drive
        ? '¿Eliminar esta copia de seguridad? El archivo cifrado se borrará del servidor. La copia que está en Google Drive no se elimina. Esta acción no se puede deshacer.'
        : '¿Eliminar esta copia de seguridad? El archivo cifrado también se borrará del servidor. Esta acción no se puede deshacer.',
      'Sí, eliminar',
      true
    );
    if (!ok) return;
    try {
      await apiClient.delete(`/backups/${b.id}`);
      showToast('Copia de seguridad eliminada correctamente.');
      load();
    } catch (e) {
      showToast(await mensajeDeError(e), true);
    }
  };

  /* UI auxiliar */
  const inputPassword = (
    valor: string,
    setValor: (v: string) => void,
    ver: boolean,
    setVer: (v: boolean) => void,
    onEnter?: () => void,
    placeholder = 'Contraseña de tu cuenta'
  ) => (
    <div className="bk-pw">
      <input
        type={ver ? 'text' : 'password'}
        value={valor}
        maxLength={64}
        autoComplete="current-password"
        placeholder={placeholder}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) onEnter(); }}
      />
      <button
        type="button"
        className="bk-pw-toggle"
        onClick={() => setVer(!ver)}
        aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        title={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {ver ? 'Ocultar' : 'Mostrar'}
      </button>
    </div>
  );

  return (
    <div className="page-inner">
      <style>{BACKUPS_CSS}</style>

      <div className="page-header">
        <div>
          <h1>Copias de Seguridad</h1>
          <p className="subtitulo">Respaldo cifrado y restauración de la base de datos</p>
        </div>

        <div className="mn-search-wrap">
          <svg className="mn-search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input 
            className="mn-search" 
            type="text" 
            placeholder="Buscar copia..." 
            value={buscar} 
            onChange={(e) => { setBuscar(e.target.value); setPagina(1); }} 
          />
        </div>
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 28, marginBottom: 28, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: 'var(--text-900)' }}>
          Generar copia de seguridad
        </h3>
        <p className="bk-desc">
          Se respalda <strong>toda la base de datos</strong> (usuarios, ventas, compras, productos, inventario y configuración)
          en un archivo cifrado con tu contraseña. Te la pediremos antes de generarla para confirmar que eres tú.
        </p>
        <button
          className="btn-save"
          onClick={abrirModalGen}
          disabled={generando}
          style={{ width: '100%', padding: '13px 20px', fontSize: 14 }}
        >
          {generando ? 'Generando copia…' : 'Generar copia de seguridad'}
        </button>
      </div>

      {loading ? (
        <AdminLoading texto="Cargando copias" subtexto="Revisando tus respaldos" />
      ) : (
        <>
          <div className="tabla-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Contenido</th>
                  <th>Fecha y hora</th>
                  <th>Tamaño</th>
                  <th>Registros</th>
                  {drive.configurada && <th>Drive</th>}
                  <th className="th-acciones">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {copiasVisibles.map((b) => {
                  const { texto, titulo } = resumenContenido(b);
                  const ocupado = restaurando || generando;
                  const enDrive = Boolean(b.subido_drive);
                  return (
                    <tr key={b.id}>
                      <td>{b.id}</td>
                      <td style={{ fontWeight: 600 }} title={titulo || undefined}>{texto}</td>
                      <td>{b.fecha ? new Date(b.fecha).toLocaleString() : '—'}</td>
                      <td>{formatBytes(b.tamano_bytes)}</td>
                      <td>{b.total_registros != null ? Number(b.total_registros).toLocaleString('es-MX') : '—'}</td>
                      {drive.configurada && (
                        <td>
                          <span className={`bk-badge ${enDrive ? 'bk-badge-yes' : 'bk-badge-no'}`}>
                            {enDrive ? 'En Drive' : 'Solo servidor'}
                          </span>
                        </td>
                      )}
                      <td className="td-acciones">
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button
                            className="btn-icon btn-icon-restore btn-accion"
                            onClick={() => abrirModalRestore(b)}
                            disabled={ocupado}
                            title="Restaurar esta copia"
                          >
                            Restaurar
                          </button>
                          <button
                            className="btn-icon btn-icon-edit btn-accion"
                            onClick={() => abrirModalDescarga(b)}
                            disabled={ocupado}
                            title="Descargar esta copia a tu PC"
                          >
                            Descargar
                          </button>
                          {drive.conectada && (
                            !enDrive ? (
                              <button
                                className="btn-accion"
                                onClick={() => subirDrive(b)}
                                disabled={ocupado || subiendoDrive === b.id}
                                title="Subir esta copia a Google Drive"
                              >
                                {subiendoDrive === b.id ? 'Subiendo…' : 'A Drive'}
                              </button>
                            ) : (
                              <button
                                className="btn-accion"
                                onClick={() => descargarDeDrive(b)}
                                disabled={ocupado || descargandoId === b.id}
                                title="Descargar esta copia desde Google Drive"
                              >
                                {descargandoId === b.id ? 'Descargando…' : 'De Drive'}
                              </button>
                            )
                          )}
                          <button
                            className="btn-icon btn-icon-del btn-accion"
                            onClick={() => del(b)}
                            disabled={ocupado}
                            title="Eliminar este registro"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredItems.length === 0 && (
                  <tr><td colSpan={drive.configurada ? 7 : 6} style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>{items.length === 0 ? 'No hay registros de copias de seguridad' : 'No hay copias que coincidan con tu búsqueda'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Componente de paginación */}
          <Paginacion total={filteredItems.length} pagina={paginaActual} onCambiar={setPagina} />
        </>
      )}

      {/* ===================== Google Drive ===================== */}
      <div className="bk-drive" style={{ marginTop: 28 }}>
        <div>
          <h3>
            Google Drive{' '}
            {drive.conectada && <span className="bk-badge bk-badge-yes">Conectado</span>}
          </h3>
          <p>
            {!drive.configurada
              ? 'Google Drive no está habilitado en el servidor. Pide al administrador del sistema que configure las credenciales de Google.'
              : drive.conectada
                ? 'Tus copias cifradas pueden guardarse en tu Drive y descargarse desde cualquier dispositivo. Usa "A Drive" en cada copia, o márcalo al generar una nueva.'
                : 'Conecta tu cuenta de Google para guardar tus copias cifradas en la nube. Burguersoft solo accede a los archivos que él mismo sube.'}
          </p>
        </div>
        {drive.configurada && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {!drive.conectada ? (
              <button className="btn-save" onClick={conectarDrive}>Conectar con Google Drive</button>
            ) : (
              <>
                <button className="btn-cancel" onClick={verCopiasDrive} disabled={cargandoDrive}>
                  {cargandoDrive ? 'Cargando…' : 'Ver copias en Drive'}
                </button>
                <button className="btn-cancel" onClick={desconectarDrive} disabled={desconectando}>
                  {desconectando ? 'Desconectando…' : 'Desconectar'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ===================== Modal: generar copia ===================== */}
      {modalGen && (
        <div className="modal-overlay open" onClick={() => { if (!generando) setModalGen(false); }}>
          <div className="modal-box" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <h2>Generar copia de seguridad</h2>
            <p className="bk-desc">
              Se generará una copia <strong>completa de la base de datos</strong> en un archivo SQL cifrado
              (.sql.enc, AES-256-GCM). Ingresa tu contraseña para confirmar tu identidad.
            </p>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Contraseña de tu cuenta <span className="mn-req">*</span></label>
              {inputPassword(passGen, setPassGen, verPassGen, setVerPassGen, generar)}
            </div>
            {drive.conectada && (
              <label className="bk-check">
                <input
                  type="checkbox"
                  checked={subirAlGenerar}
                  onChange={(e) => setSubirAlGenerar(e.target.checked)}
                  disabled={generando}
                />
                <span>
                  Subir también a Google Drive
                  <small>Se guarda una copia cifrada en tu Drive además del servidor.</small>
                </span>
              </label>
            )}
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModalGen(false)} disabled={generando}>Cancelar</button>
              <button className="btn-save" onClick={generar} disabled={generando}>
                {generando ? 'Generando...' : 'Generar copia'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== Modal: restaurar ===================== */}
      {restoreSel && (
        <div className="modal-overlay open" onClick={() => { if (!restaurando) setRestoreSel(null); }}>
          <div className="modal-box" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <h2>Restaurar copia de seguridad</h2>
            <p className="bk-desc">
              Copia <strong>#{restoreSel.id}</strong> — {resumenContenido(restoreSel).texto}, del{' '}
              {restoreSel.fecha ? new Date(restoreSel.fecha).toLocaleString() : '—'}.
            </p>

            <label className={`bk-modo ${restoreModo === 'replace' ? 'activo' : ''}`}>
              <input
                type="radio"
                name="bk-modo-restaurar"
                checked={restoreModo === 'replace'}
                onChange={() => setRestoreModo('replace')}
              />
              <div>
                <strong>Reemplazar datos (restauración completa)</strong>
                <p>
                  Vacía las tablas incluidas en la copia y vuelve a cargar sus datos tal como estaban.
                  Los datos actuales de esas tablas se perderán por completo.
                </p>
              </div>
            </label>

            <label className={`bk-modo ${restoreModo === 'merge' ? 'activo' : ''}`}>
              <input
                type="radio"
                name="bk-modo-restaurar"
                checked={restoreModo === 'merge'}
                onChange={() => setRestoreModo('merge')}
              />
              <div>
                <strong>Combinar con datos actuales</strong>
                <p>
                  Inserta los registros de la copia sin borrar lo que ya existe. Puede generar duplicados
                  si los registros ya se encuentran en la base de datos.
                </p>
              </div>
            </label>

            <p className="bk-warn">
              ATENCIÓN: antes de restaurar, el sistema creará automáticamente una copia de seguridad de
              prevención (PRE-RESTAURACION) por si necesitas deshacer el proceso.
            </p>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Contraseña de tu cuenta <span className="mn-req">*</span></label>
              {inputPassword(restorePass, setRestorePass, verRestorePass, setVerRestorePass, confirmarRestaurar)}
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setRestoreSel(null)} disabled={restaurando}>Cancelar</button>
              <button
                className="btn-save"
                onClick={confirmarRestaurar}
                disabled={restaurando}
                style={restoreModo === 'replace' ? { background: 'var(--danger)', boxShadow: '0 4px 14px rgba(200,56,42,.3)' } : undefined}
              >
                {restaurando ? 'Restaurando...' : 'Confirmar restauración'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== Modal: descargar copia ===================== */}
      {dlSel && (
        <div className="modal-overlay open" onClick={cerrarModalDescarga}>
          <div className="modal-box" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            {!dlPidiendoPass ? (
              <>
                <h2>Descargar copia de seguridad</h2>
                <p className="bk-desc">
                  Copia <strong>#{dlSel.id}</strong> · {resumenContenido(dlSel).texto}
                  <br />
                  Elige cómo quieres llevarla a tu PC. Las dos son copias válidas; cambian en si quedan abiertas o cerradas.
                </p>

                <button
                  className="bk-opcion"
                  onClick={() => { cerrarModalDescarga(); descargarCifrado(dlSel); }}
                  disabled={descargandoId === dlSel.id}
                >
                  <strong>{descargandoId === dlSel.id ? 'Descargando…' : 'Archivo cifrado (.sql.enc)'}</strong>
                  <span>Se baja tal como está guardada, con candado. Sirve para moverla a otro servidor de Burguersoft.</span>
                </button>

                <button
                  className="bk-opcion"
                  onClick={empezarDescargaPlana}
                  disabled={descargandoId === dlSel.id}
                >
                  <strong>SQL abierto (.sql)</strong>
                  <span>Pide tu contraseña y te la deja legible. Para emergencias: se abre con cualquier programa de bases de datos.</span>
                </button>

                <div className="modal-actions">
                  <button className="btn-cancel" onClick={cerrarModalDescarga}>Cancelar</button>
                </div>
              </>
            ) : (
              <>
                <h2>Descargar SQL abierto</h2>
                <p className="bk-desc">
                  Ingresa tu contraseña para que el servidor descifre la copia <strong>#{dlSel.id}</strong> y te la entregue en texto plano.
                </p>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Contraseña de tu cuenta <span className="mn-req">*</span></label>
                  {inputPassword(dlPass, setDlPass, verDlPass, setVerDlPass, descargarPlano)}
                </div>
                <div className="modal-actions">
                  <button
                    className="btn-cancel"
                    onClick={() => setDlPidiendoPass(false)}
                    disabled={descargandoPlano}
                  >
                    Volver
                  </button>
                  <button className="btn-save" onClick={descargarPlano} disabled={descargandoPlano}>
                    {descargandoPlano ? 'Descargando...' : 'Descargar .sql'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}


      {/* ===================== Modal: copias en Drive ===================== */}
      {modalDrive && (
        <div className="modal-overlay open" onClick={() => setModalDrive(false)}>
          <div className="modal-box" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <h2>Copias en Google Drive</h2>
            {driveArchivos.length > 0 ? (
              <div style={{ maxHeight: 340, overflowY: 'auto', marginBottom: 8 }}>
                {driveArchivos.map((f, i) => (
                  <div className="bk-archivo" key={f.id ?? i}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.name ?? f.nombre}>
                      {f.name ?? f.nombre ?? `Archivo ${i + 1}`}
                    </span>
                    <span>
                      {[
                        f.createdTime ? new Date(f.createdTime).toLocaleDateString('es-MX') : '',
                        f.size != null && f.size !== '' ? formatBytes(Number(f.size)) : '',
                      ].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="bk-desc">No hay copias almacenadas en Google Drive todavía.</p>

            )}
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModalDrive(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}