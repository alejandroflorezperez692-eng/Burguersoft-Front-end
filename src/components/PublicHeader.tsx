import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import logo from '../assets/img/icono1-oscuro.png';
import iconoPersona from '../assets/img/icono-persona.png';
import { useAuth } from '../hooks/useAuth';

const enlaces = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/nosotros', label: 'Nosotros', end: false },
  { to: '/menu-publico', label: 'Menú', end: false },
  { to: '/contactanos', label: 'Contactanos', end: false },
];

export default function PublicHeader() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <header>
      <div className="header-left">
        <Link to="/" className="logo-link" aria-label="Inicio">
          <img src={logo} alt="El Oriente" className="logo" />
        </Link>
        <hr />
        <span className="nom-local">EL ORIENTE</span>
      </div>

      <nav className="header-center">
        {enlaces.map((enlace) => (
          <NavLink
            key={enlace.to}
            to={enlace.to}
            end={enlace.end}
            className={({ isActive }) => (isActive ? 'activo' : undefined)}
          >
            {enlace.label}
          </NavLink>
        ))}
      </nav>

      <div className="header-right">
        {isAuthenticated ? (
          <div
            className="perfil-dropdown"
            onMouseLeave={() => setMenuAbierto(false)}
          >
            <button
              type="button"
              className="btn-perfil"
              onClick={() => setMenuAbierto((v) => !v)}
            >
              <span className="icono-circulo-perfil">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <span className="perfil-nombre">{user?.name ?? 'Usuario'}</span>
            </button>

            <div className={`dropdown-menu${menuAbierto ? ' abierto' : ''}`}>
              <button type="button" onClick={() => navigate('/configuracion')}>
                Mi perfil
              </button>
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        ) : (
          <Link to="/login" className="link-sesion">
            <button type="button" className="btn-sesion">
              <img src={iconoPersona} alt="Iniciar sesión" />
            </button>
          </Link>
        )}
      </div>
    </header>
  );
}
