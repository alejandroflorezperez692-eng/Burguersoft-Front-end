import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { normalizarRol, rutaInicio, type RolNormalizado } from '../utils/roles';

type ProtectedRouteProps = {
  roles?: RolNormalizado[];
  redirect?: string;
  allowGuest?: boolean;
};

export default function ProtectedRoute({
  roles,
  redirect = '/inicio',
  allowGuest = false,
}: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    if (allowGuest) {
      return <Outlet />;
    }
    return <Navigate to="/login" replace />;
  }

  if (roles && roles.length > 0) {
    const rol = normalizarRol(user?.role);
    if (!rol || !roles.includes(rol)) {
      // Cada rol vuelve a SU pantalla de inicio (así no hay bucles de redirección)
      return <Navigate to={rol ? rutaInicio(rol) : redirect} replace />;
    }
  }

  return <Outlet />;
}