import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import logoClaro from '../assets/img/icono1.png';
import logoOscuro from '../assets/img/icono1-oscuro.png';
import casa from '../assets/img/casa.png';
import cena from '../assets/img/cena.png';
import insignia from '../assets/img/insignia.png';
import hierbas from '../assets/img/tratamiento-a-base-de-hierbas.png';
import buy from '../assets/img/buy.png';
import inventarioIcono from '../assets/img/inventario.svg';
import cierreInventarioIcono from '../assets/img/cierre-inventario.svg';
import proveedoresIcono from '../assets/img/proveedores.svg';
import promocion from '../assets/img/promocion.png';
import engranaje from '../assets/img/engranaje.png';
import equipo from '../assets/img/equipo.png';
import accesibilidad from '../assets/img/accesibilidad.png';
import cerrarSesion from '../assets/img/cerrar-sesion.png';
import usuarioPerfil from '../assets/img/usuario-perfil.png';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/client';
import { ACCESO, normalizarRol } from '../utils/roles';
import '../styles/admin.css';
import '../styles/nu-admin.css';
import AdminLoading from '../components/AdminLoading';
import AdminFooter from '../components/AdminFooter';
import AsistenteIA from '../components/AsistenteIA';
import NotificacionesBoton from '../components/NotificacionesBoton';
import ConfirmarSalida from '../components/ConfirmarSalida';

const todosLosItems = [
  { to: '/inicio', label: 'Inicio', icono: casa, roles: ACCESO.personal },
  { to: '/menu', label: 'Menú', icono: cena, roles: ACCESO.menu },
  { to: '/promociones', label: 'Promociones', icono: promocion, roles: ACCESO.menu },
  { to: '/pedidos-en-vivo', label: 'Pedidos', icono: cena, roles: ACCESO.ventas },
  { to: '/ventas', label: 'Ventas', icono: insignia, roles: ACCESO.ventas },
  { to: '/compras', label: 'Compras', icono: buy, roles: ACCESO.inventario },
  { to: '/materia-prima', label: 'Materia Prima', icono: hierbas, roles: ACCESO.inventario },
  { to: '/inventario', label: 'Inventario', icono: inventarioIcono, roles: ACCESO.inventario },
  { to: '/cierre-inventario', label: 'Cierre de inventario', icono: cierreInventarioIcono, roles: ACCESO.inventario },
  { to: '/gestion-marca', label: 'Proveedores', icono: proveedoresIcono, roles: ACCESO.inventario },
  { to: '/reportes', label: 'Reportes', icono: insignia, roles: ACCESO.soloAdmin },
  { to: '/copias-de-seguridad', label: 'Copias de seguridad', icono: engranaje, roles: ACCESO.soloAdmin },
  { to: '/usuarios', label: 'Usuarios', icono: equipo, roles: ACCESO.soloAdmin },
  { to: '/ayuda-admin', label: 'Ayuda', icono: accesibilidad, roles: ACCESO.personal },
];

const estiloItemMenu: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  padding: '10px 14px',
  background: 'transparent',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 14,
  fontWeight: 600,
  textAlign: 'left',
  color: 'var(--text-900, #1a1a1a)',
};

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const cerrarMenu = () => setMenuOpen(false);
  const rol = normalizarRol(user?.role);
  const esPersonal = rol !== '' && ACCESO.personal.includes(rol);
  const navItems = todosLosItems.filter((item) => rol !== '' && item.roles.includes(rol));

  useEffect(() => {
    if (sessionStorage.getItem('token') === 'demo-token-sin-backend') return;
    apiClient.get('/me').catch((err) => {
      console.error('[AdminLayout] Error validando sesión:', err.message);
      // No redirigir aquí; el interceptor de la API maneja el 401.
    });
    }, []);

  const handleSalir = () => {
  setSaliendo(true);
  setTimeout(() => {
    logout();
    navigate('/', { replace: true, state: { toast: 'logout_ok' } }); // ← antes era '/login'
    setSaliendo(false);
  }, 500);
};

  const irAMiPerfil = () => {
  setUserMenuOpen(false);
  navigate('/configuracion');
};

const salirDesdeMenuUsuario = () => {
  setUserMenuOpen(false);
  setConfirmarSalida(true);
};

  useEffect(() => {
    setMenuOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (menuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const onClickFuera = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', onClickFuera);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickFuera);
      document.removeEventListener('keydown', onEscape);
    };
  }, [userMenuOpen]);

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
      </aside>
      <div className={`sidebar-backdrop${menuOpen ? ' show' : ''}`} onClick={cerrarMenu} />

      <nav className="header-nav">
        <button type="button" className="topbar-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menú">☰</button>

        <div className="header-actions">
          {esPersonal && <NotificacionesBoton />}
          {esPersonal && <span className="header-sep" aria-hidden="true" />}

          <div ref={userMenuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="header-user"
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              title="Cuenta"
              data-tooltip="Abrir menú de cuenta"
              style={{ cursor: 'pointer', font: 'inherit', textAlign: 'left' }}
            >
              <img src={usuarioPerfil} alt="" className="header-avatar" />
              <span className="header-user-info">
                <span className="header-user-name">{user?.name ?? user?.email ?? 'Administrador'}</span>
                <span className="header-user-role">{user?.role ?? 'Administrador'}</span>
              </span>
            </button>

            {userMenuOpen && (
              <div
                role="menu"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  minWidth: 190,
                  padding: 6,
                  background: 'var(--surface, #fff)',
                  border: '1px solid var(--border, #eee)',
                  borderRadius: 12,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
                  zIndex: 500,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <button
                  type="button"
                  role="menuitem"
                  data-tooltip="Ver mi perfil"
                  style={estiloItemMenu}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-3, #f3ece4)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  onClick={irAMiPerfil}
                >
                  <img src={usuarioPerfil} alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
                  Mi perfil
                </button>
                <button
                  type="button"
                  role="menuitem"
                  data-tooltip="Cerrar sesión"
                  style={{ ...estiloItemMenu, color: 'var(--danger, #d32f2f)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(211, 47, 47, 0.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  onClick={salirDesdeMenuUsuario}
                >
                  <img
                    src={cerrarSesion}
                    alt=""
                    style={{
                      width: 18,
                      height: 18,
                      objectFit: 'contain',
                      filter: 'brightness(0) saturate(100%) invert(22%) sepia(90%) saturate(3500%) hue-rotate(350deg)',
                    }}
                  />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {menuOpen && <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} aria-hidden="true" />}

      <div className="main-content">
        <Outlet />
        <AdminFooter />
      </div>

      {confirmarSalida && (
        <ConfirmarSalida
        mensaje="¿Cerrar sesión? Tendrás que iniciar sesión de nuevo para volver al panel."
        onCancelar={() => setConfirmarSalida(false)}
        onConfirmar={() => { setConfirmarSalida(false); handleSalir(); }}
        />
      )}

      {esPersonal && <AsistenteIA />}
    </div>
  );
}