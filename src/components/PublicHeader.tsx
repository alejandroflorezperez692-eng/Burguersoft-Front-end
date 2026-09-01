import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import logo from '../assets/img/icono1-oscuro.png';
import iconoPersona from '../assets/img/icono-persona.png';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import PerfilModal from './PerfilModal';
import CartPanel from './CartPanel';

const enlaces = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/nosotros', label: 'Nosotros', end: false },
  { to: '/menu-publico', label: 'Menú', end: false },
  { to: '/contactanos', label: 'Contactanos', end: false },
];

export default function PublicHeader() {
  const { isAuthenticated, user, logout } = useAuth();
  const { count, toggle } = useCart();
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [perfilOpen, setPerfilOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuAbierto(false);
      }
    };
    document.addEventListener('click', onClickOutside);
    return () => document.removeEventListener('click', onClickOutside);
  }, []);

  return (
    <>
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
            <>
              <button className="btn-icono" id="toggleCart" title="Carrito" onClick={toggle} type="button">
                <div className="icono-circulo">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                  <span className="badge-carrito" id="badge-carrito">{count}</span>
                </div>
              </button>

              <div className="perfil-dropdown" ref={dropdownRef}>
                <button type="button" className="btn-perfil" id="btnPerfilDropdown" onClick={(e) => { e.stopPropagation(); setMenuAbierto((v) => !v); }}>
                  <span className="icono-circulo-perfil">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <span className="perfil-nombre">{user?.name ?? 'Usuario'}</span>
                </button>

                <div className={`dropdown-menu${menuAbierto ? ' abierto' : ''}`} id="perfilDropdownMenu">
                  <button type="button" onClick={() => { setMenuAbierto(false); setPerfilOpen(true); }}>
                    <span style={{ width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>👤</span>
                    Editar perfil
                  </button>
                  <button type="button" onClick={() => { setMenuAbierto(false); navigate('/mis-pedidos'); }}>
                    <span style={{ width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>🛍️</span>
                    Mis pedidos
                  </button>
                  <button type="button" className="cerrar-sesion" onClick={() => { logout(); setMenuAbierto(false); navigate('/', { replace: true }); }}>
                    <span style={{ width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>↪</span>
                    Cerrar sesión
                  </button>
                </div>
              </div>
            </>
          ) : (
            <Link to="/login" className="link-sesion">
              <button type="button" className="btn-sesion">
                <img src={iconoPersona} alt="Iniciar sesión" />
              </button>
            </Link>
          )}
        </div>
      </header>

      {isAuthenticated && (
        <>
          <CartPanel />
          <PerfilModal isOpen={perfilOpen} onClose={() => setPerfilOpen(false)} />
        </>
      )}
    </>
  );
}
