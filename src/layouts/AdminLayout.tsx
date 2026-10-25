import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
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
import accesibilidad from '../assets/img/accesibilidad.png';
import cerrarSesion from '../assets/img/cerrar-sesion.png';
import usuarioPerfil from '../assets/img/usuario-perfil.png';
import { useAuth } from '../hooks/useAuth';
import '../styles/admin.css';
import AdminLoading from '../components/AdminLoading';
import AsistenteIA from '../components/AsistenteIA';
import NotificacionesBoton from '../components/NotificacionesBoton';
import { normalizarRol } from '../utils/roles';

const navItemsAdmin = [
  { to: '/inicio', label: 'Inicio', icono: casa },
  { to: '/menu', label: 'Menú', icono: cena },
  { to: '/ventas', label: 'Ventas', icono: insignia },
  { to: '/pedidos', label: 'Pedidos', icono: cena },
  { to: '/materia-prima', label: 'Materia Prima', icono: hierbas },
  { to: '/compras', label: 'Compras', icono: buy },
  { to: '/cierre-inventario', label: 'Cierre de inventario', icono: hierbas },
  { to: '/gestion-marca', label: 'Marcas', icono: marca },
  { to: '/promociones', label: 'Promociones', icono: promocion },
  { to: '/copias-de-seguridad', label: 'Copias de seguridad', icono: engranaje },
  { to: '/usuarios', label: 'Usuarios', icono: equipo },
  { to: '/ayuda-admin', label: 'Ayuda', icono: accesibilidad },
];

const navItemsCajero = [
  { to: '/ventas', label: 'Ventas', icono: insignia },
  { to: '/pedidos', label: 'Pedidos', icono: cena },
];

const navItemsCocinero = [
  { to: '/pedidos', label: 'Cocina', icono: cena },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const cerrarMenu = () => setMenuOpen(false);
  const rol = normalizarRol(user?.role);
  const esAdmin = rol === 'admin';
  const navItems =
    rol === 'cajero' ? navItemsCajero : rol === 'cocinero' ? navItemsCocinero : navItemsAdmin;



  const handleSalir = () => {
    setSaliendo(true);
    setTimeout(() => {
      logout();
      navigate('/login', { replace: true });
      setSaliendo(false);
    }, 500);
  };

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (menuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  if (saliendo) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#fff' }}>
        <AdminLoading texto="Cerrando sesión" subtexto="Hasta pronto" />
      </div>
    );
  }

  return (
    <div className="admin-body">
      <aside className={`sidebar${menuOpen ? ' open' : ''}`}>
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
                onClick={cerrarMenu}
                className={({ isActive }) => (isActive ? 'active' : undefined)}
              >
                <img src={item.icono} alt="" className="icono-sidebar" />
                {item.label}
              </NavLink>
            </div>
          ))}
        </div>

        <div className="sidebar-item sidebar-salir">
          <button type="button" onClick={() => { cerrarMenu(); handleSalir(); }}>
            <img src={cerrarSesion} alt="" className="icono-sidebar" />
            Cerrar sesión
          </button>
        </div>
      </aside>
      <div className={`sidebar-backdrop${menuOpen ? ' show' : ''}`} onClick={cerrarMenu} />

      <nav className="header-nav">
        <button type="button" className="topbar-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menú">☰</button>
          <div className="header-actions">
            {esAdmin && <NotificacionesBoton />}
            {esAdmin && <span className="header-sep" aria-hidden="true" />}
            <NavLink to="/configuracion" className="header-user" onClick={cerrarMenu} title="Mi perfil">
              <img src={usuarioPerfil} alt="" className="header-avatar" />
              <span className="header-user-info">
                <span className="header-user-name">{user?.name ?? user?.email ?? 'Administrador'}</span>
                <span className="header-user-role">{user?.role ?? 'Administrador'}</span>
              </span>
            </NavLink>
          </div>
        </nav>

      {menuOpen && <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} aria-hidden="true" />}

      <div className="main-content">
        <Outlet />

        <footer
          style={{
            background: '#2c1810',
            borderTop: '1px solid #33261e',
            color: '#fff',
            textAlign: 'center',
            padding: '26px 20px 30px',
            marginTop: 'auto',
          }}
        >
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            &copy; 2026 BURGUERSOFT – EL ORIENTE. Todos los derechos reservados.
          </p>
        </footer>
      </div>

      {esAdmin && <AsistenteIA />}
    </div>
  );
}