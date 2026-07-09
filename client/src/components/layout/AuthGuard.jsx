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
  let dest = (mode === 'seller' || user?.role === 'shop_admin') ? '/seller/dashboard' : '/home';
  // First login: renters must pick their fandoms before the feed (§1.3).
  if (dest === '/home' && (!user?.fandoms || user.fandoms.length === 0)) dest = '/onboarding/fandoms';
  return <Navigate to={dest} replace />;
}

export function RoleGuard({ role }) {
  const { user } = useAuthStore();
  return user?.role === role ? <Outlet /> : <Navigate to="/home" replace />;
}
