import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '@/store/authStore';

export default function SplashScreen() {
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();

  useEffect(() => {
    const { user } = useAuthStore.getState();
    // Guests land on Home and can browse/search; login is prompted on gated actions.
    const dest = !accessToken ? '/home'
      : user?.role === 'shop_admin' ? '/seller/dashboard'
      : '/home';
    const t = setTimeout(() => navigate(dest), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex h-screen w-full max-w-[390px] mx-auto flex-col items-center justify-center bg-brand-gradient-br">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
          <circle cx="10" cy="10" r="4" fill="white" />
          <circle cx="22" cy="10" r="4" fill="white" />
          <circle cx="34" cy="10" r="4" fill="white" />
          <circle cx="10" cy="22" r="4" fill="white" />
          <circle cx="22" cy="22" r="4" fill="white" opacity="0.5" />
          <circle cx="10" cy="34" r="4" fill="white" />
          <circle cx="22" cy="34" r="4" fill="white" />
          <path d="M30 28 L38 36" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      </div>
      <h1 className="text-4xl font-bold text-white tracking-tight">Cosaki</h1>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-px w-8 bg-white/40" />
        <p className="text-xs font-semibold tracking-[0.2em] text-white/80 uppercase">Cosplay Marketplace</p>
        <div className="h-px w-8 bg-white/40" />
      </div>
      <div className="mt-16 flex gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-white" />
        <div className="h-1.5 w-1.5 rounded-full bg-white/40" />
      </div>
      <p className="mt-4 text-xs text-white/60">Loading your world...</p>
    </div>
  );
}
