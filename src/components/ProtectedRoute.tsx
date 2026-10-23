import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

type RolNormalizado = 'admin' | 'cliente';

type ProtectedRouteProps = {
  roles?: RolNormalizado[];
  redirect?: string;
  allowGuest?: boolean;
};

function normalizarRol(rol?: string): RolNormalizado | '' {
  const limpio = String(rol ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (limpio === 'admin' || limpio === 'administrador') return 'admin';
  if (limpio === 'cliente') return 'cliente';
  return '';
}

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
      return <Navigate to={redirect} replace />;
    }
  }

  return <Outlet />;
}
