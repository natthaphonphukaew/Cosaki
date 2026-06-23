import { NavLink } from 'react-router-dom';
import { Home, Search, Calendar, User } from 'lucide-react';
import useAuthStore from '@/store/authStore';

const renterTabs = [
  { to: '/home',     icon: Home,     label: 'Home'     },
  { to: '/search',   icon: Search,   label: 'Search'   },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/profile',  icon: User,     label: 'Profile'  },
];

const sellerTabs = [
  { to: '/seller/dashboard', icon: Home,     label: 'Home'     },
  { to: '/seller/orders',    icon: Search,   label: 'Orders'   },
  { to: '/seller/calendar',  icon: Calendar, label: 'Calendar' },
  { to: '/profile',          icon: User,     label: 'Profile'  },
];

export default function BottomNav() {
  const { mode } = useAuthStore();
  const tabs = mode === 'seller' ? sellerTabs : renterTabs;

  return (
    <nav className="fixed bottom-0 left-1/2 z-50 flex h-16 w-full max-w-[390px] -translate-x-1/2 items-center justify-around border-t border-gray-100 bg-white px-2">
      {tabs.map(({ to, icon: Icon, label }) => (
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
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
