import { Navigate, Route, Routes } from 'react-router-dom';
import Contactanos from './pages/Contactanos';
import MenuPublico from './pages/MenuPublico';
import AdminLayout from './layouts/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import SocialCallback from './pages/SocialCallback';
import Registro from './pages/Registro';
import TerminosCondiciones from './pages/TerminosCondiciones';
import PoliticaPrivacidad from './pages/PoliticaPrivacidad';
import RecuperarContrasena from './pages/RecuperarContrasena';
import VerificarCodigo from './pages/VerificarCodigo';
import RestablecerContrasena from './pages/RestablecerContrasena';
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
import PedidosTurno from './pages/staff/PedidosTurno';
import ReportesAdmin from './pages/admin/ReportesAdmin';
import BackupsAdmin from './pages/admin/BackupsAdmin';
import ConfiguracionAdmin from './pages/admin/ConfiguracionAdmin';
import AyudaAdmin from './pages/admin/AyudaAdmin';
import Accesibilidad from './components/Accesibilidad';
import DemoAccess from './components/DemoAccess';
import Checkout from './pages/Checkout';
import { ConAsistenteCliente } from './components/AsistenteCliente';
import CierreInventarioAdmin from './pages/admin/CierreInventarioAdmin';
import TerminosPrivacidad from './pages/TerminosPrivacidad';
import Ayuda from './pages/admin/Ayuda';
import AyudaCliente from './pages/AyudaCliente';
import { ACCESO } from './utils/roles';
import { ToastProvider } from './components/Toast';
import InventarioAdmin from './pages/admin/InventarioAdmin';


function App() {
  return (
    <ToastProvider>
      <DemoAccess />
      <Routes>
      <Route element={<ProtectedRoute roles={['cliente']} allowGuest redirect="/inicio" />}>

        <Route element={<ConAsistenteCliente />}>
          <Route path="/" element={<Home />} />
          <Route path="/nosotros" element={<Nosotros />} />
          <Route path="/menu-publico" element={<MenuPublico />} />
          <Route path="/contactanos" element={<Contactanos />} />
          <Route path="/mis-pedidos" element={<MisPedidos />} />
          <Route path="/checkout" element={<Checkout />} />
        </Route>
        <Route path="/" element={<Home />} />
        <Route path="/nosotros" element={<Nosotros />} />
        <Route path="/menu-publico" element={<MenuPublico />} />
        <Route path="/contactanos" element={<Contactanos />} />
        <Route path="/terminos-y-condiciones" element={<TerminosPrivacidad />} />
        <Route path="/mis-pedidos" element={<MisPedidos />} />
        <Route path="/checkout" element={<Checkout />} />
      </Route>

      <Route path="/login" element={<Login />} />
      <Route path="/social-callback" element={<SocialCallback />} /> 
      <Route path="/registro" element={<Registro />} />
      <Route path="/terminos" element={<TerminosCondiciones />} />
      <Route path="/privacidad" element={<PoliticaPrivacidad />} />
      <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />
      <Route path="/verificar-codigo" element={<VerificarCodigo />} />
      <Route path="/restablecer-contrasena" element={<RestablecerContrasena />} />
      <Route path="/ayuda" element={<Ayuda />} />

      <Route element={<ProtectedRoute roles={['cliente']} redirect="/" />}>
        <Route path="/ayuda-cliente" element={<AyudaCliente />} />
      </Route>

      {/* Panel interno: admin, cajero, cocinero y mesero comparten el mismo layout */}
      <Route element={<ProtectedRoute roles={ACCESO.personal} redirect="/" />}>
        <Route element={<AdminLayout />}>

          {/* Todo el personal */}
          <Route path="/inicio" element={<Inicio />} />
          <Route path="/pedidos-en-vivo" element={<PedidosTurno />} />
          <Route path="/configuracion" element={<ConfiguracionAdmin />} />
          <Route path="/ayuda-admin" element={<AyudaAdmin />} />

          {/* Admin + cajero + mesero */}
          <Route element={<ProtectedRoute roles={ACCESO.menu} />}>
            <Route path="/menu" element={<MenuAdmin />} />
            <Route path="/promociones" element={<PromocionesAdmin />} />
          </Route>

          {/* Admin + cocinero + mesero */}
          <Route element={<ProtectedRoute roles={ACCESO.ventas} />}>
            <Route path="/ventas" element={<VentasAdmin />} />
          </Route>

          {/* Admin + cajero + cocinero */}
          <Route element={<ProtectedRoute roles={ACCESO.inventario} />}>
            <Route path="/materia-prima" element={<MateriaPrimaAdmin />} />
            <Route path="/inventario" element={<InventarioAdmin />} />
            <Route path="/compras" element={<ComprasAdmin />} />
            <Route path="/cierre-inventario" element={<CierreInventarioAdmin />} />
            <Route path="/gestion-marca" element={<MarcasAdmin />} />
          </Route>

          {/* Solo admin */}
          <Route element={<ProtectedRoute roles={ACCESO.soloAdmin} />}>
            <Route path="/copias-de-seguridad" element={<BackupsAdmin />} />
            <Route path="/backups" element={<Navigate to="/copias-de-seguridad" replace />} />
            <Route path="/usuarios" element={<UsuariosAdmin />} />
            <Route path="/reportes" element={<ReportesAdmin />} />
          </Route>

        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Accesibilidad />
    </ToastProvider>
  );
}

export default App;