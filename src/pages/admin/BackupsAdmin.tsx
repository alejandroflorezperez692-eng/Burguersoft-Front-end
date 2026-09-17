import { useEffect, useState } from 'react';
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
      setItems(toArray<Backup>(r1?.data));
      const t = toArray<Tabla>(r2?.data);
      setTablas(t);
      setSel((prev) => (prev.length === 0 ? t.map((x) => x.tabla) : prev));
      setLoading(false);
    }).catch(() => { setItems([]); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const toggle = (t: string) => {
    setSel((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const generar = () => {
    if (sel.length === 0) {
      setMsg({ texto: 'Selecciona al menos una tabla.', error: true });
      return;
    }
    setGenerating(true);
    setMsg(null);
    apiClient.post('/backups', { tablas: sel }).then((r) => {
      const n = (r.data?.tablas as string[] | undefined)?.length ?? sel.length;
      setMsg({ texto: `Copia generada: ${n} tabla(s) respaldadas.` });
      setGenerating(false);
      load();
    }).catch(() => {
      setMsg({ texto: 'No se pudo generar la copia.', error: true });
      setGenerating(false);
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
          <span className="stat-val">{(items ?? []).length}</span>
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
          {tablas.length === 0 && (
            <span style={{ color: 'var(--text-400)', fontSize: 12, padding: 6 }}>Cargando tablas...</span>
          )}
          {tablas.map((t) => (
            <label key={t.tabla} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--text-900)' }}>
              <input type="checkbox" checked={sel.includes(t.tabla)} onChange={() => toggle(t.tabla)} />
              {t.etiqueta}
            </label>
          ))}
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
            {(items ?? []).map((b) => (
              <tr key={b?.id}>
                <td>{b?.id}</td>
                <td style={{ fontWeight: 600 }}>{b?.nombre_tabla ?? b?.nombre ?? '—'}</td>
                <td>{b?.fecha ? new Date(b.fecha).toLocaleString() : '—'}</td>
                <td>
                  <button className="btn-icon btn-icon-del" onClick={() => b?.id != null && del(b.id)} title="Eliminar">🗑</button>
                </td>
              </tr>
            ))}
            {(items ?? []).length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>No hay registros de copias de seguridad</td></tr>
            )}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
