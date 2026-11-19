import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { normalizarRol, rutaInicio, ACCESO, type RolNormalizado } from '../utils/roles';
import AccesoDenegado from '../pages/AccesoDenegado';

type ProtectedRouteProps = {
  roles?: RolNormalizado[];
  redirect?: string;
  allowGuest?: boolean;
};

export default function ProtectedRoute({
  roles,
  redirect = '/login',
  allowGuest = false,
}: ProtectedRouteProps) {
  const { isAuthenticated, user, loading, cerrandoSesion } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) {
    if (cerrandoSesion) return null;
    return allowGuest ? <Outlet /> : <AccesoDenegado />;
  }

  const rol = normalizarRol(user?.role);

  // Páginas públicas (allowGuest): son para visitantes y clientes.
  // El personal con sesión va siempre a su panel, sin importar la URL.
  if (allowGuest && rol && ACCESO.personal.includes(rol)) {
    return <Navigate to={rutaInicio(user?.role)} replace />;
  }

  if (roles && (!rol || !roles.includes(rol))) {
    return <Navigate to={redirect} replace />;
  }

  return <Outlet />;
}