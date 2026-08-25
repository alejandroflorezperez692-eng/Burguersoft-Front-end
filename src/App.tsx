
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import PaginaModulo from './components/PaginaModulo';
import PublicPlaceholder from './components/PublicPlaceholder';
import AdminLayout from './layouts/AdminLayout';
import Login from './pages/Login';
import Registro from './pages/Registro';
import RecuperarContrasena from './pages/RecuperarContrasena';
import Inicio from './pages/Inicio';
import Home from './pages/Home';
import Nosotros from './pages/Nosotros';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/nosotros"
        element={<Nosotros />}
      />
      <Route
        path="/menu-publico"
        element={<PublicPlaceholder titulo="Menú" />}
      />
      <Route
        path="/contactanos"
        element={<PublicPlaceholder titulo="Contactanos" />}
      />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/inicio" element={<Inicio />} />
          <Route
            path="/menu"
            element={<PaginaModulo titulo="Menú" />}
          />
          <Route
            path="/ventas"
            element={<PaginaModulo titulo="Ventas" />}
          />
          <Route
            path="/materia-prima"
            element={<PaginaModulo titulo="Materia Prima" />}
          />
          <Route
            path="/compras"
            element={<PaginaModulo titulo="Compras" />}
          />
          <Route
            path="/gestion-marca"
            element={<PaginaModulo titulo="Marcas" />}
          />
          <Route
            path="/promociones"
            element={<PaginaModulo titulo="Promociones" />}
          />
          <Route
            path="/backups"
            element={<PaginaModulo titulo="Copias de Seguridad" />}
          />
          <Route
            path="/configuracion"
            element={<PaginaModulo titulo="Configuración de Cuenta" />}
          />
          <Route
            path="/usuarios"
            element={<PaginaModulo titulo="Gestión de Usuarios" />}
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
