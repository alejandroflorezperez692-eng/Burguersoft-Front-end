
import { Navigate, Route, Routes } from 'react-router-dom';
import PaginaModulo from './components/PaginaModulo';
import PublicPlaceholder from './components/PublicPlaceholder';
import AdminLayout from './layouts/AdminLayout';
import Login from './pages/Login';
import Registro from './pages/Registro';
import RecuperarContrasena from './pages/RecuperarContrasena';
import Inicio from './pages/Inicio';
import Home from './pages/Home';
import Nosotros from './pages/Nosotros';
import MisPedidos from './pages/MisPedidos';
import MarcasAdmin from './pages/admin/MarcasAdmin';
import UsuariosAdmin from './pages/admin/UsuariosAdmin';
import MenuAdmin from './pages/admin/MenuAdmin';
import MateriaPrimaAdmin from './pages/admin/MateriaPrimaAdmin';
import ComprasAdmin from './pages/admin/ComprasAdmin';
import PromocionesAdmin from './pages/admin/PromocionesAdmin';
import VentasAdmin from './pages/admin/VentasAdmin';
import BackupsAdmin from './pages/admin/BackupsAdmin';
import ConfiguracionAdmin from './pages/admin/ConfiguracionAdmin';

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
      <Route path="/mis-pedidos" element={<MisPedidos />} />

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
        <Route path="/pedidos" element={<PaginaModulo titulo="Pedidos" />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
