import { useEffect, useState } from 'react';
import apiClient from '../../api/client';

interface Backup {
  id: number;
  nombre_tabla: string;
  nombre: string;
  fecha: string;
  usuario_id: number;
}

export default function BackupsAdmin() {
  const [items, setItems] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = () => {
    apiClient.get('/backups').then((r) => {
      const lista = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
      setItems(Array.isArray(lista) ? lista : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const generar = () => {
    setGenerating(true);
    apiClient.post('/backups', {}).then(() => {
      setGenerating(false);
      load();
    }).catch(() => setGenerating(false));
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
          <span className="stat-val">{items.length}</span>
          <span className="stat-sub">registros</span>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-400)', padding: 20 }}>Cargando...</p>
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
            {items.map((b) => {
              const f = b.fecha ? new Date(b.fecha) : null;
              return (
              <tr key={b.id}>
                <td>{b.id}</td>
                <td style={{ fontWeight: 600 }}>{b.nombre_tabla ?? b.nombre ?? '—'}</td>
                <td>{f && !isNaN(f.getTime()) ? f.toLocaleString() : '—'}</td>
                <td>
                  <button className="btn-icon btn-icon-del" onClick={() => del(b.id)} title="Eliminar">🗑</button>
                </td>
              </tr>
              );
            })}
            {items.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 30, color: 'var(--text-400)' }}>No hay registros de copias de seguridad</td></tr>
            )}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
