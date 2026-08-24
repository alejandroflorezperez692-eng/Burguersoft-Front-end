import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import logoClaro from '../assets/img/icono1.png';
import logoOscuro from '../assets/img/icono1-oscuro.png';
import casa from '../assets/img/casa.png';
import cena from '../assets/img/cena.png';
import insignia from '../assets/img/insignia.png';
import hierbas from '../assets/img/tratamiento-a-base-de-hierbas.png';
import buy from '../assets/img/buy.png';
import marca from '../assets/img/marca-comercial.png';
import promocion from '../assets/img/promocion.png';
import engranaje from '../assets/img/engranaje.png';
import equipo from '../assets/img/equipo.png';
import cerrarSesion from '../assets/img/cerrar-sesion.png';
import usuarioPerfil from '../assets/img/usuario-perfil.png';
import Accesibilidad from '../components/Accesibilidad';
import { useAuth } from '../hooks/useAuth';
import '../styles/admin.css';

const navItems = [
  { to: '/inicio', label: 'Inicio', icono: casa },
  { to: '/menu', label: 'Menú', icono: cena },
  { to: '/ventas', label: 'Ventas', icono: insignia },
  { to: '/materia-prima', label: 'Materia Prima', icono: hierbas },
  { to: '/compras', label: 'Compras', icono: buy },
  { to: '/gestion-marca', label: 'Marcas', icono: marca },
  { to: '/promociones', label: 'Promociones', icono: promocion },
  { to: '/backups', label: 'Copias de seguridad', icono: engranaje },
  { to: '/usuarios', label: 'Usuarios', icono: equipo },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSalir = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="admin-body">
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src={logoClaro} alt="Logo" className="logo logo-claro" />
          <img src={logoOscuro} alt="Logo" className="logo logo-oscuro" />
          <hr className="sidebar-divider" />
          <span className="nom-local">El Oriente</span>
        </div>

        <div className="sidebar-footer">
          {navItems.map((item) => (
            <div className="sidebar-item" key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => (isActive ? 'active' : undefined)}
              >
                <img src={item.icono} alt="" className="icono-sidebar" />
                {item.label}
              </NavLink>
            </div>
          ))}
        </div>
      </aside>

      <nav className="header-nav">
        <NavLink to="/configuracion" className="nav-item admin-name">
          <img src={usuarioPerfil} alt="perfil" className="icono-sidebar-perfil" />
          <span>{user?.name ?? user?.email ?? 'Administrador'}</span>
        </NavLink>
        <hr />
        <button type="button" className="nav-item nav-logout" onClick={handleSalir}>
          <img src={cerrarSesion} alt="" className="icono" />
          Salir
        </button>
      </nav>

      <div className="main-content">
        <Outlet />
      </div>

      <Accesibilidad />
    </div>
  );
}
