import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Home.css';

const modules = [
  { icon: '🧾', title: 'Pedidos', description: 'Gestiona los pedidos del día' },
  { icon: '🍔', title: 'Menú', description: 'Administra productos y precios' },
  { icon: '👥', title: 'Clientes', description: 'Historial y datos de clientes' },
  { icon: '📊', title: 'Reportes', description: 'Ventas y métricas del negocio' },
];

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="home">
      <header className="home-header">
        <span className="home-header-brand">🍔 Burguersoft</span>
        <div className="home-header-user">
          <span className="home-user-name">
            {user?.name ?? user?.email ?? 'Usuario'}
          </span>
          <button type="button" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="home-content">
        <h2>Bienvenido{user?.name ? `, ${user.name}` : ''} 👋</h2>
        <p className="home-subtitle">¿Qué quieres hacer hoy?</p>

        <div className="home-grid">
          {modules.map((module) => (
            <article key={module.title} className="home-card">
              <div className="home-card-icon" aria-hidden="true">
                {module.icon}
              </div>
              <h3>{module.title}</h3>
              <p>{module.description}</p>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
