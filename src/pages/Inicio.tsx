import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import usuarioPerfil from '../assets/img/usuario-perfil.png';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/client';
import AdminLoading from '../components/AdminLoading';

interface Movimiento {
  id: number;
  modulo: string;
  descripcion: string;
  fecha: string;
  nombre?: string;
  apellido?: string;
}

function formatReloj(fecha: Date): string {
  let horas = fecha.getHours();
  const sufijo = horas >= 12 ? 'pm' : 'am';
  horas %= 12;
  if (horas === 0) horas = 12;
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  const segundos = String(fecha.getSeconds()).padStart(2, '0');
  return `${horas}:${minutos}:${segundos} ${sufijo}`;
}

function formatFecha(fecha: Date): string {
  return fecha.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function Inicio() {
  const { user } = useAuth();
  const [ahora, setAhora] = useState(() => new Date());
  const [toastVisible, setToastVisible] = useState(false);
  const [movs, setMovs] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let vivo = true;
    setLoading(true);
    apiClient
      .get('/reportes/historial', { params: user?.id ? { usuario_id: user.id } : {} })
      .then(({ data }) => {
        const lista: Movimiento[] = Array.isArray(data) ? data : data?.data ?? [];
        if (vivo) setMovs(lista);
      })
      .catch(() => {
        if (vivo) setMovs([]);
      })
      .finally(() => {
        if (vivo) setLoading(false);
      });
    return () => {
      vivo = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (location.state?.toast === 'login_ok') {
      const mostrar = setTimeout(() => setToastVisible(true), 100);
      const ocultar = setTimeout(() => setToastVisible(false), 3500);
      return () => {
        clearTimeout(mostrar);
        clearTimeout(ocultar);
      };
    }
  }, [location.state]);

  const rol = user?.role ?? 'Cliente';
  const nombre = user?.name ?? 'Usuario';

  return (
    <div className="dashboard-wrap">
      <div className="welcome-banner">
        <div className="welcome-text">
          <h2>Bienvenido {nombre} ({rol})</h2>
          <div style={{ fontWeight: 700 }}>{formatFecha(ahora)}</div>
          <div style={{ color: 'var(--brand)', fontWeight: 900 }}>
            {formatReloj(ahora)}
          </div>
        </div>
        <img src={usuarioPerfil} alt="" className="welcome-img" />
      </div>

      <div className="dashboard-row">
        <div className="historial-section">
          <div className="historial-header">
            <h3>Tus Últimos Movimientos:</h3>
          </div>
          <div className="historial-columnas">
            <div className="historial-col-apartado">Apartado</div>
            <div className="historial-col-accion">Acción</div>
          </div>
          <div className="historial-lista">
            {loading ? (
              <AdminLoading texto="Cargando movimientos" subtexto="Revisando tu actividad reciente" />
            ) : movs.length === 0 ? (
              <div className="historial-vacio">Aún no tienes movimientos registrados.</div>
            ) : (
              movs.slice(0, 8).map((m) => (
                <div
                  key={m.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '9px 6px', borderBottom: '1px solid var(--border)' }}
                >
                  <span
                    className="badge badge-info"
                    style={{ flexShrink: 0, minWidth: 88, textAlign: 'center' }}
                  >
                    {m.modulo ?? '—'}
                  </span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--text-900)' }}>
                    {m.descripcion ?? '—'}
                  </span>
                  <span style={{ flexShrink: 0, fontSize: 11, color: 'var(--text-400)' }}>
                    {m.fecha ? new Date(m.fecha).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Total de movimientos</div>
          <div className="kpi-val">{movs.length}</div>
          <div className="kpi-sub">Acciones registradas en tu cuenta</div>
        </div>
      </div>

      <div className={`toast-bienvenida${toastVisible ? ' mostrar' : ''}`}>
        ¡Bienvenido a BurguerSoft, Administrador!
      </div>
    </div>
  );
}