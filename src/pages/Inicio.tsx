import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import usuarioPerfil from '../assets/img/usuario-perfil.png';
import { useAuth } from '../hooks/useAuth';
import AlertasIA from '../components/AlertasIA';

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

function saludo(fecha: Date): string {
  const h = fecha.getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function capitalizar(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export default function Inicio() {
  const { user } = useAuth();
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

  const rol = user?.role ?? 'Cliente';
  const nombre = user?.name ?? 'Usuario';

  return (
    <div className="dashboard-wrap">
      <div className="wb">
        <div className="wb-info">
          <span className="wb-saludo">{saludo(ahora)}</span>
          <h2 className="wb-nombre">{nombre}</h2>
          <span className="wb-rol">{rol}</span>
          <div className="wb-fecha">
            <span>{capitalizar(formatFecha(ahora))}</span>
            <span className="wb-punto">•</span>
            <span className="wb-hora">{formatReloj(ahora)}</span>
          </div>
        </div>
        <div className="wb-avatar">
          <img src={usuarioPerfil} alt="" />
        </div>
      </div>

      {rol !== 'Cliente' && <AlertasIA />}

      <div className={`toast-bienvenida${toastVisible ? ' mostrar' : ''}`}>
        ¡Bienvenido a BurguerSoft, Administrador!
      </div>
    </div>
  );
}