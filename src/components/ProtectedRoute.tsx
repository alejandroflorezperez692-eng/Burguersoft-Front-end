import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { normalizarRol, type RolNormalizado } from '../utils/roles';

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
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) {
    return allowGuest ? <Outlet /> : <Navigate to="/login" replace />;
  }

  const rol = normalizarRol(user?.role);

  // Si la ruta exige roles y el usuario no tiene uno permitido, se redirige.
  if (roles && (!rol || !roles.includes(rol))) {
    return <Navigate to={redirect} replace />;
  }

  return <Outlet />;
}
