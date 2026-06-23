import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '@/store/authStore';

export function AuthGuard() {
  const { accessToken } = useAuthStore();
  return accessToken ? <Outlet /> : <Navigate to="/login" replace />;
}

export function GuestGuard() {
  const { accessToken, user, mode } = useAuthStore();
  if (!accessToken) return <Outlet />;
  // Send already-authenticated users to the right home for their active mode.
  const dest = (mode === 'seller' || user?.role === 'shop_admin') ? '/seller/dashboard' : '/home';
  return <Navigate to={dest} replace />;
}

export function RoleGuard({ role }) {
  const { user } = useAuthStore();
  return user?.role === role ? <Outlet /> : <Navigate to="/home" replace />;
}
