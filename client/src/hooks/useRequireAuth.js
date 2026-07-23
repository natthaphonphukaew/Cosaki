import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '@/store/authStore';

// Gate an action behind login. Guests may browse/search, but renting, opening a
// shop, following, or chatting requires an account. Returns a guard:
//   const requireAuth = useRequireAuth();
//   onClick={() => requireAuth(() => doThing())}
// If the user is a guest it shows a sign-up prompt and routes to /login instead.
export default function useRequireAuth() {
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();

  return (action, msg = 'สมัครหรือเข้าสู่ระบบก่อนเพื่อใช้ฟีเจอร์นี้') => {
    if (!accessToken) {
      toast(msg, { icon: '🔒' });
      navigate('/login');
      return false;
    }
    if (typeof action === 'function') action();
    return true;
  };
}
