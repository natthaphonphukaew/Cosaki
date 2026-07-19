import { NavLink } from 'react-router-dom';
import { Home, Search, Calendar, User } from 'lucide-react';
import useAuthStore from '@/store/authStore';
import { useTranslation } from 'react-i18next';

const renterTabs = [
  { to: '/home',     icon: Home,     key: 'nav.home'     },
  { to: '/search',   icon: Search,   key: 'nav.search'   },
  { to: '/calendar', icon: Calendar, key: 'nav.calendar' },
  { to: '/profile',  icon: User,     key: 'nav.profile'  },
];

const sellerTabs = [
  { to: '/seller/dashboard', icon: Home,     key: 'nav.home'     },
  { to: '/seller/orders',    icon: Search,   key: 'nav.orders'   },
  { to: '/seller/calendar',  icon: Calendar, key: 'nav.calendar' },
  { to: '/profile',          icon: User,     key: 'nav.profile'  },
];

export default function BottomNav() {
  const { mode } = useAuthStore();
  const { t } = useTranslation();
  const tabs = mode === 'seller' ? sellerTabs : renterTabs;

  return (
    <nav className="fixed bottom-0 left-1/2 z-50 flex h-16 w-full max-w-[390px] -translate-x-1/2 items-center justify-around border-t border-gray-100 bg-white px-2">
      {tabs.map(({ to, icon: Icon, key }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 text-xs font-medium transition-colors ${
              isActive ? 'text-brand-purple' : 'text-gray-400'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span>{t(key)}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
