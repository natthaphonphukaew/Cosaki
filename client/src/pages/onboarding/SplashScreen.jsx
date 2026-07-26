import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '@/store/authStore';
import logoFull from '@/assets/logo-full.png';

export default function SplashScreen() {
  const { t } = useTranslation();
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
    <div className="flex h-screen w-full max-w-[390px] mx-auto flex-col items-center justify-center bg-white">
      <img src={logoFull} alt="Cosaki" className="w-56 max-w-[70%]" />
      <div className="mt-8 flex gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-brand-purple animate-pulse" />
        <div className="h-1.5 w-1.5 rounded-full bg-brand-purple/30" />
      </div>
      <p className="mt-4 text-xs text-gray-400">{t('onboarding.loadingWorld')}</p>
    </div>
  );
}
