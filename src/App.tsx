
import { Navigate, Route, Routes } from 'react-router-dom';
import PaginaModulo from './components/PaginaModulo';
import Contactanos from './pages/Contactanos';
import PublicPlaceholder from './components/PublicPlaceholder';
import AdminLayout from './layouts/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Registro from './pages/Registro';
import RecuperarContrasena from './pages/RecuperarContrasena';
import Inicio from './pages/Inicio';
import Home from './pages/Home';
import Nosotros from './pages/Nosotros';
import MisPedidos from './pages/MisPedidos';
import MarcasAdmin from './pages/admin/MarcasAdmin';
import UsuariosAdmin from './pages/admin/UsuariosAdmin';
import MenuAdmin from './pages/admin/menu/MenuAdmin';
import MateriaPrimaAdmin from './pages/admin/materia-prima/MateriaPrimaAdmin';
import ComprasAdmin from './pages/admin/compras/ComprasAdmin';
import PromocionesAdmin from './pages/admin/PromocionesAdmin';
import VentasAdmin from './pages/admin/ventas/VentasAdmin';
import BackupsAdmin from './pages/admin/BackupsAdmin';
import ConfiguracionAdmin from './pages/admin/ConfiguracionAdmin';
import AsistenteAdmin from './pages/admin/AsistenteAdmin';
import Accesibilidad from './components/Accesibilidad';
import DemoAccess from './components/DemoAccess';

function App() {
  return (
    <>
      <DemoAccess />
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
        element={<Contactanos />}
      />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />
      <Route path="/mis-pedidos" element={<MisPedidos />} />


      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/inicio" element={<Inicio />} />
          <Route path="/menu" element={<MenuAdmin />} />
          <Route path="/ventas" element={<VentasAdmin />} />
          <Route path="/materia-prima" element={<MateriaPrimaAdmin />} />
          <Route path="/compras" element={<ComprasAdmin />} />
          <Route path="/gestion-marca" element={<MarcasAdmin />} />
          <Route path="/promociones" element={<PromocionesAdmin />} />
          <Route path="/backups" element={<BackupsAdmin />} />
          <Route path="/configuracion" element={<ConfiguracionAdmin />} />
          <Route path="/usuarios" element={<UsuariosAdmin />} />
          <Route path="/asistente-ia" element={<AsistenteAdmin />} />
          <Route path="/pedidos" element={<PaginaModulo titulo="Pedidos" />} />
          <Route path="/mis-pedidos" element={<PaginaModulo titulo="Mis Pedidos" />} />
        </Route>

      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Accesibilidad />
    </>
  );
}

export default App;
