import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

import { ConAsistenteCliente } from './components/AsistenteCliente';
import { ACCESO } from './utils/roles';
import { ToastProvider } from './components/Toast';
import TooltipsGlobales from './components/TooltipsGlobales';
import ScrollToTop from './components/ScrollToTop';
import AvisoComprobanteDevuelto from './components/AvisoComprobanteDevuelto';
import AdminLoading from './components/AdminLoading';
import Accesibilidad from './components/Accesibilidad';

/* Las páginas se cargan "por partes": cada una se descarga solo cuando
   el usuario entra a su ruta. Así la primera visita no baja todo el
   panel de administración, las gráficas ni los generadores de Excel/PDF. */
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const Contactanos = lazy(() => import('./pages/Contactanos'));
const MenuPublico = lazy(() => import('./pages/MenuPublico'));
const Login = lazy(() => import('./pages/Login'));
const SocialCallback = lazy(() => import('./pages/SocialCallback'));
const Registro = lazy(() => import('./pages/Registro'));
const TerminosCondiciones = lazy(() => import('./pages/TerminosCondiciones'));
const PoliticaPrivacidad = lazy(() => import('./pages/PoliticaPrivacidad'));
const RecuperarContrasena = lazy(() => import('./pages/RecuperarContrasena'));
const VerificarCodigo = lazy(() => import('./pages/VerificarCodigo'));
const RestablecerContrasena = lazy(() => import('./pages/RestablecerContrasena'));
const Inicio = lazy(() => import('./pages/Inicio'));
const Home = lazy(() => import('./pages/Home'));
const Nosotros = lazy(() => import('./pages/Nosotros'));
const MisCompras = lazy(() => import('./pages/MisCompras'));
const ProveedoresAdmin = lazy(() => import('./pages/admin/ProveedoresAdmin'));
const UsuariosAdmin = lazy(() => import('./pages/admin/UsuariosAdmin'));
const MenuAdmin = lazy(() => import('./pages/admin/MenuAdmin'));
const MateriaPrimaAdmin = lazy(() => import('./pages/admin/MateriaPrimaAdmin'));
const ComprasAdmin = lazy(() => import('./pages/admin/ComprasAdmin'));
const PromocionesAdmin = lazy(() => import('./pages/admin/PromocionesAdmin'));
const VentasAdmin = lazy(() => import('./pages/admin/VentasAdmin'));
const PedidosTurno = lazy(() => import('./pages/staff/PedidosTurno'));
const ReportesAdmin = lazy(() => import('./pages/admin/ReportesAdmin'));
const BackupsAdmin = lazy(() => import('./pages/admin/BackupsAdmin'));
const ConfiguracionAdmin = lazy(() => import('./pages/admin/ConfiguracionAdmin'));
const AyudaAdmin = lazy(() => import('./pages/admin/AyudaAdmin'));
const Checkout = lazy(() => import('./pages/Checkout'));
const CierreInventarioAdmin = lazy(() => import('./pages/admin/CierreInventarioAdmin'));
const TerminosPrivacidad = lazy(() => import('./pages/TerminosPrivacidad'));
const Ayuda = lazy(() => import('./pages/admin/Ayuda'));
const AyudaCliente = lazy(() => import('./pages/AyudaCliente'));
const InventarioAdmin = lazy(() => import('./pages/admin/InventarioAdmin'));

export default function App() {
  return (
    <ToastProvider>
      <TooltipsGlobales />
      <AvisoComprobanteDevuelto />
      <Suspense fallback={<AdminLoading compact texto="Cargando" subtexto="Un momento, por favor" />}>
        <Routes>
          {/* Páginas públicas: se pueden ver con o sin sesión. */}
          <Route element={<ProtectedRoute allowGuest />}>
            <Route element={<ConAsistenteCliente />}>
              <Route path="/" element={<Home />} />
              <Route path="/nosotros" element={<Nosotros />} />
              <Route path="/menu-publico" element={<MenuPublico />} />
              <Route path="/contactanos" element={<Contactanos />} />
              <Route path="/terminos-y-condiciones" element={<TerminosPrivacidad />} />
            </Route>
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

          {/* Solo clientes con sesión: sus compras, checkout y ayuda. */}
          <Route element={<ProtectedRoute roles={['cliente']} redirect="/inicio" />}>
            <Route element={<ConAsistenteCliente />}>
              <Route path="/mis-compras" element={<MisCompras />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/ayuda-cliente" element={<AyudaCliente />} />
            </Route>
          </Route>

          {/* Panel interno: admin, cajero, cocinero y mesero comparten el mismo layout */}
          <Route element={<ProtectedRoute roles={ACCESO.personal} redirect="/" />}>
            <Route element={<AdminLayout />}>
              {/* Todo el personal */}
              <Route path="/inicio" element={<Inicio />} />
              <Route path="/pedidos-en-vivo" element={<PedidosTurno />} />
              <Route path="/configuracion" element={<ConfiguracionAdmin />} />
              <Route path="/ayuda-admin" element={<AyudaAdmin />} />

              {/* Menú y promociones: todo el personal */}
              <Route element={<ProtectedRoute roles={ACCESO.menu} />}>
                <Route path="/menu" element={<MenuAdmin />} />
                <Route path="/promociones" element={<PromocionesAdmin />} />
              </Route>

              {/* Ventas: admin + cajero + mesero */}
              <Route element={<ProtectedRoute roles={ACCESO.ventas} />}>
                <Route path="/ventas" element={<VentasAdmin />} />
              </Route>

              {/* Inventario y compras: admin + cajero + cocinero */}
              <Route element={<ProtectedRoute roles={ACCESO.inventario} />}>
                <Route path="/materia-prima" element={<MateriaPrimaAdmin />} />
                <Route path="/inventario" element={<InventarioAdmin />} />
                <Route path="/compras" element={<ComprasAdmin />} />
                <Route path="/cierre-inventario" element={<CierreInventarioAdmin />} />
                <Route path="/gestion-proveedores" element={<ProveedoresAdmin />} />
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

          {/* Ruta anterior: se conserva para no romper enlaces o favoritos viejos */}
          <Route path="/mis-pedidos" element={<Navigate to="/mis-compras" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <ScrollToTop />
      <Accesibilidad />
    </ToastProvider>
  );
}