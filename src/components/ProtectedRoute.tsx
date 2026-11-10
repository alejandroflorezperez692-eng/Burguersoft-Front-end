import { Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { type RolNormalizado } from '../utils/roles';

type ProtectedRouteProps = {
  roles?: RolNormalizado[];
  redirect?: string;
  allowGuest?: boolean;
};

export default function ProtectedRoute({
  allowGuest = false,
}: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    if (allowGuest) {
      return <Outlet />;
    }
    return null;
  }

  return <Outlet />;
}
