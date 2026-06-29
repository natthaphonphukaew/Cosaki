import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Settings, HelpCircle, Heart, ShoppingBag,
         CreditCard, Store, ArrowLeftRight, Repeat } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import NotificationBell from '@/components/ui/NotificationBell';
import useAuthStore from '@/store/authStore';
import { getMyShop } from '@/api/shops';

const menuItems = [
  { icon: ShoppingBag, label: 'My Rentals',      to: '/rentals'  },
  { icon: Heart,       label: 'Saved Outfits',   to: '/saved'    },
  { icon: CreditCard,  label: 'Payment Methods', to: '/payments' },
  { divider: true },
  { icon: Settings,    label: 'Account Settings',to: '/settings' },
  { icon: HelpCircle,  label: 'Help & Support',  to: '/support'  },
];

export default function ProfilePage() {
  const { user, shop, mode, hasShop, setMode, setShop, clear } = useAuthStore();
  const navigate = useNavigate();

  const trustScore = user?.trust_score || 5.0;
  const isSeller   = hasShop();

  // Hydrate the cached shop record for sellers (persists "My Shop" across sessions).
  useEffect(() => {
    if (isSeller && !shop) {
      getMyShop().then(({ data }) => setShop(data.data.shop)).catch(() => {});
    }
  }, [isSeller, shop, setShop]);
  const myShop     = shop || (user?.role === 'shop_admin'
    ? { shop_name: user?.display_name, logo_url: user?.avatar_url }
    : null);

  const goSelling = () => { setMode('seller'); navigate('/seller/dashboard'); };
  const goBuying  = () => { setMode('renter'); navigate('/home'); };

  return (
    <AppShell>
      <div className="px-4 pt-8 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-xl font-bold text-brand-purple">Cosaki</span>
          <NotificationBell />
        </div>

        {/* Avatar + info */}
        <div className="flex flex-col items-center text-center">
          <button onClick={() => navigate('/profile/edit')} className="relative mb-3">
            <div className="h-20 w-20 rounded-full bg-brand-light flex items-center justify-center text-3xl font-bold text-brand-purple border-4 border-white shadow-md overflow-hidden">
              {user?.avatar_url
                ? <img src={user.avatar_url} alt="avatar" className="h-full w-full rounded-full object-cover" />
                : (user?.display_name?.[0] || 'C')
              }
            </div>
            {user?.kyc_status === 'verified' && (
              <div className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-brand-purple border-2 border-white">
                <span className="text-white text-xs">✓</span>
              </div>
            )}
          </button>
          <button onClick={() => navigate('/profile/edit')} className="text-lg font-bold text-gray-900">{user?.display_name || 'Cosplayer'}</button>
          <span className={`mt-1 text-[11px] font-semibold ${user?.kyc_status === 'verified' ? 'text-green-600' : 'text-amber-600'}`}>
            {user?.kyc_status === 'verified' ? '✓ Identity Verified' : 'Identity not verified'}
          </span>
          <p className="text-sm text-gray-400 mt-0.5">
            {isSeller ? 'Cosplayer & Shop Owner' : 'Cosplayer & Pro Stylist'} • Bangkok
          </p>
          {/* Trust score */}
          <div className="mt-3 flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5">
            <span className="text-sm">🛡️</span>
            <span className="text-sm font-semibold text-amber-700">Trust Score: {trustScore}/5</span>
            <span className="text-amber-500">⭐</span>
          </div>
        </div>

        {/* ── Mode / Shop section ── */}
        {isSeller ? (
          <div className="mt-6 space-y-3">
            {/* My Shop card */}
            <button
              onClick={goSelling}
              className="flex w-full items-center gap-3 overflow-hidden rounded-2xl bg-brand-gradient p-4 text-left shadow-md active:opacity-90"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/20">
                {myShop?.logo_url
                  ? <img src={myShop.logo_url} alt="shop" className="h-full w-full object-cover" />
                  : <Store size={22} className="text-white" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-base font-bold text-white">{myShop?.shop_name || 'My Shop'}</p>
                <p className="text-xs text-white/80">Manage listings, orders & earnings</p>
              </div>
              <ChevronRight size={18} className="text-white flex-shrink-0" />
            </button>

            {/* Mode toggle */}
            <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-light">
                <ArrowLeftRight size={18} className="text-brand-purple" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">
                  Current mode: <span className="font-bold text-brand-purple">{mode === 'seller' ? 'Selling' : 'Buying'}</span>
                </p>
                <p className="text-xs text-gray-400">Switch between renting and selling</p>
              </div>
              <button
                onClick={mode === 'seller' ? goBuying : goSelling}
                className="flex items-center gap-1.5 rounded-full bg-brand-light px-3 py-1.5 text-xs font-semibold text-brand-purple"
              >
                <Repeat size={13} />
                {mode === 'seller' ? 'Buy' : 'Sell'}
              </button>
            </div>
          </div>
        ) : (
          /* Upsell — not yet a seller */
          <div className="mt-6 overflow-hidden rounded-2xl bg-brand-purple p-5">
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs text-white font-medium">EARN EXTRA</span>
            <h3 className="mt-2 text-lg font-bold text-white">Sell your own costumes</h3>
            <p className="mt-1 text-xs text-white/70">Open your own shop and start monetizing your wardrobe today.</p>
            <button
              onClick={() => navigate('/seller/onboarding')}
              className="mt-4 rounded-full border border-white px-5 py-2 text-sm font-semibold text-white"
            >
              Get Started
            </button>
          </div>
        )}

        {/* Menu */}
        <div className="mt-5 space-y-1">
          {menuItems.map((item, i) =>
            item.divider ? (
              <div key={i} className="my-3 border-t border-gray-100" />
            ) : (
              <button
                key={item.label}
                onClick={() => navigate(item.to)}
                className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-sm active:bg-gray-50"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-light">
                  <item.icon size={18} className="text-brand-purple" />
                </div>
                <span className="flex-1 text-left text-sm font-medium text-gray-800">{item.label}</span>
                <ChevronRight size={16} className="text-gray-300" />
              </button>
            )
          )}
        </div>

        <button
          onClick={() => { clear(); navigate('/login'); }}
          className="mt-6 w-full text-center text-sm font-semibold text-red-500 py-3"
        >
          Sign Out
        </button>
      </div>
    </AppShell>
  );
}
