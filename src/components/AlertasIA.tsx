import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { conectarAlertas, desconectarAlertas } from '../api/echo';

interface Alerta {
  tipo: 'stock' | 'precio';
  nivel: 'alta' | 'media' | 'baja';
  icono: string;
  titulo: string;
  detalle: string;
}

interface RespuestaAlertas {
  alertas: Alerta[];
  resumen: string | null;
  resumen_ia: boolean;
}

const COLORES = {
  alta: { barra: 'var(--danger)', fondo: 'rgba(200, 56, 42, 0.07)' },
  media: { barra: 'var(--brand)', fondo: 'rgba(232, 130, 26, 0.09)' },
  baja: { barra: '#2e9e5b', fondo: 'rgba(46, 158, 91, 0.08)' },
} as const;

export default function AlertasIA() {
  const [datos, setDatos] = useState<RespuestaAlertas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [recarga, setRecarga] = useState(0);

  // Aviso en vivo por websocket
  useEffect(() => {
    const canal = conectarAlertas(() => setRecarga((n) => n + 1));
    return () => {
      if (canal) desconectarAlertas(canal, () => undefined);
    };
  }, []);

  useEffect(() => {
    let vivo = true;
    apiClient
      .get<RespuestaAlertas>('/asistente/alertas')
      .then(({ data }) => {
        if (vivo) setDatos(data);
      })
      .catch(() => {
        if (vivo) setDatos(null);
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [recarga]);

  const tarjeta = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-lg)',
    boxShadow: 'var(--shadow-sm)',
    padding: 20,
    marginBottom: 24,
  } as const;

  if (cargando) {
    return (
      <div style={{ ...tarjeta, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-400)', fontSize: 14, fontWeight: 600 }} aria-live="polite">
        <span aria-hidden="true">✨</span> Burgi está revisando tu negocio…
      </div>
    );
  }

  if (!datos || (datos.alertas.length === 0 && !datos.resumen)) return null;

  return (
    <section style={tarjeta} aria-label="Alertas inteligentes de Burgi">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span aria-hidden="true" style={{ fontSize: 18 }}>✨</span>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 800, color: 'var(--text-900)' }}>
          Burgi te avisa
        </h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, alignItems: 'start' }}>
        {datos.resumen && (
          <div style={{ padding: 16, borderRadius: 14, background: 'rgba(232, 130, 26, 0.07)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--brand-deep)' }}>
                Resumen de la semana
              </span>
              {datos.resumen_ia && (
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-400)' }}>Redactado por IA</span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, fontWeight: 500, color: 'var(--text-900)' }}>{datos.resumen}</p>
          </div>
        )}

        {datos.alertas.length > 0 && (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {datos.alertas.map((a, i) => (
              <li
                key={`${a.tipo}-${i}`}
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  padding: '10px 14px',
                  borderRadius: 12,
                  borderLeft: `4px solid ${COLORES[a.nivel].barra}`,
                  background: COLORES[a.nivel].fondo,
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 20, lineHeight: 1.2 }}>{a.icono}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-900)' }}>{a.titulo}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.5, color: 'var(--text-400)', marginTop: 2 }}>{a.detalle}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}