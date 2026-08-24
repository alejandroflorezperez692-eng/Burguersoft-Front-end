import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import usuarioPerfil from '../assets/img/usuario-perfil.png';

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
  const [ahora, setAhora] = useState(() => new Date());
  const [toastVisible, setToastVisible] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

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

  return (
    <div className="dashboard-wrap">
      <div className="welcome-banner">
        <div className="welcome-text">
          <h2>Bienvenido Administrador</h2>
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
            <div className="historial-vacio">Aún no tienes movimientos registrados.</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Total de movimientos</div>
          <div className="kpi-val">0</div>
          <div className="kpi-sub">Acciones registradas en tu cuenta</div>
        </div>
      </div>

      <div className={`toast-bienvenida${toastVisible ? ' mostrar' : ''}`}>
        ¡Bienvenido a BurguerSoft, Administrador!
      </div>
    </div>
  );
}
