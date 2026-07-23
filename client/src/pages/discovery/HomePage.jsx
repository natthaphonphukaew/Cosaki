import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Plus, LogIn } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import ProductImage from '@/components/ui/ProductImage';
import NotificationBell from '@/components/ui/NotificationBell';
import ChatButton from '@/components/ui/ChatButton';
import { searchItems } from '@/api/items';
import { getFavorites, toggleFavorite } from '@/utils/favorites';
import useAuthStore from '@/store/authStore';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import { POPULAR_FANDOMS } from '@/constants/fandoms';

export default function HomePage() {
  const [items, setItems]   = useState([]);
  const [fandom, setFandom] = useState('All');
  const [favs, setFavs]     = useState([]);
  const { user, accessToken } = useAuthStore();
  const navigate            = useNavigate();
  const { t }               = useTranslation();

  useEffect(() => { setFavs(getFavorites().map((x) => x.id)); }, []);

  // Pick a random item to feature as the special-offers banner background.
  const heroItem = useMemo(
    () => (items.length ? items[Math.floor(Math.random() * items.length)] : null),
    [items]
  );

  // New users have no fandoms yet — fall back to a curated popular list so the
  // chip row isn't empty (§1.3).
  const chipFandoms = user?.fandoms?.length ? user.fandoms : POPULAR_FANDOMS;

  useEffect(() => {
    // "All" boosts the user's own fandoms to the top of the feed (§1.3).
    const params = fandom !== 'All'
      ? { fandom }
      : (user?.fandoms?.length ? { fandoms: user.fandoms.join(',') } : {});
    searchItems(params)
      .then(({ data }) => setItems(data.data.items))
      .catch(() => {});
  }, [fandom, user?.fandoms]);

  const onFav = (e, item) => {
    e.stopPropagation();
    toggleFavorite(item);
    setFavs((f) => f.includes(item.id) ? f.filter((x) => x !== item.id) : [...f, item.id]);
  };

  return (
    <AppShell>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <button onClick={() => navigate('/profile')} className="flex items-center gap-3 min-w-0 active:opacity-80">
          <div className="h-9 w-9 overflow-hidden rounded-full bg-brand-light flex items-center justify-center flex-shrink-0">
            {user?.avatar_url
              ? <img src={user.avatar_url} alt="me" className="h-full w-full object-cover" />
              : <span className="text-sm font-bold text-brand-purple">{user?.display_name?.[0] || 'C'}</span>}
          </div>
          <div className="text-left">
            <p className="text-xs text-gray-400">{t('home.welcome_back', 'Welcome back')}</p>
            <p className="text-sm font-semibold text-gray-800 truncate max-w-[150px]">{user?.display_name || t('home.cosplayer', 'Cosplayer')}</p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {accessToken ? (
            <>
              <ChatButton size={20} className="h-10 w-10 bg-white shadow-sm" />
              <NotificationBell size={20} className="h-10 w-10 bg-white shadow-sm" />
            </>
          ) : (
            <button onClick={() => navigate('/login')}
              className="flex items-center gap-1 rounded-full bg-brand-gradient px-3 py-2 text-xs font-semibold text-white">
              <LogIn size={14} /> {t('home.login', 'เข้าสู่ระบบ')}
            </button>
          )}
        </div>
      </div>

      {/* Special-offers banner — random product as the backdrop */}
      <button
        onClick={() => navigate(heroItem ? `/items/${heroItem.id}` : '/search')}
        className="relative mx-4 mb-5 block h-40 w-full max-w-[calc(100%-2rem)] overflow-hidden rounded-2xl bg-brand-gradient text-left"
      >
        {heroItem && (
          <div className="absolute inset-0">
            <ProductImage item={heroItem} emojiClassName="text-6xl" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
          </div>
        )}
        <div className="relative flex h-full flex-col justify-end p-5">
          <span className="w-fit rounded-full bg-white/25 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">{t('home.limited_offer', 'LIMITED OFFER')}</span>
          <h2 className="mt-2 text-xl font-bold text-white drop-shadow-sm">{heroItem?.name || t('home.new_season', 'New Season Drops')}</h2>
          <span className="mt-2 w-fit rounded-full bg-white px-5 py-2 text-sm font-semibold text-brand-purple">
            {t('home.rent_now', 'เช่าเลย')}
          </span>
        </div>
      </button>

      {/* Trending fandoms */}
      <div className="mb-4 px-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{t('home.trending_fandoms', 'My Fandoms')}</h3>
          <button onClick={() => navigate('/search')} className="text-sm font-medium text-brand-purple">{t('home.view_all', 'View All')}</button>
        </div>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {['All', ...chipFandoms].map((f) => (
            <button
              key={f}
              onClick={() => setFandom(f)}
              className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                fandom === f
                  ? 'bg-brand-purple text-white'
                  : 'border border-gray-200 bg-white text-gray-600'
              }`}
            >
              {f}
            </button>
          ))}
          <button 
            onClick={() => navigate('/profile/fandoms')}
            className="flex-shrink-0 flex items-center justify-center rounded-full border border-gray-200 bg-white px-3 py-1.5 text-gray-600 transition-colors hover:bg-gray-50"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Recommended grid */}
      <div className="px-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{t('home.recommended', 'Recommended for You')}</h3>
          <button onClick={() => navigate('/search')} className="text-sm font-medium text-brand-purple">{t('home.view_all', 'View All')}</button>
        </div>
        {items.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="mb-3 text-5xl">🎭</div>
            <p className="text-sm text-gray-400">{t('home.no_items', 'No costumes found yet')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/items/${item.id}`)}
                className="cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm active:scale-[0.97] transition-transform"
              >
                <div className="relative h-40">
                  {item.express_delivery && (
                    <div className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                      🚀 ส่งด่วน
                    </div>
                  )}
                  <ProductImage item={item} emojiClassName="text-5xl" />
                  <button onClick={(e) => onFav(e, item)} className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm">
                    <Heart size={14} className={favs.includes(item.id) ? 'text-brand-pink' : 'text-gray-500'} fill={favs.includes(item.id) ? '#EC4899' : 'none'} />
                  </button>
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-semibold text-gray-800">{item.name}</p>
                  <p className="truncate text-xs text-gray-400">{item.fandom || 'Cosplay'}</p>
                  <div className="mt-1 flex flex-col">
                    <p className="text-[13px] font-bold text-brand-purple">{t('common.test_rate', 'เทส')} ฿{item.test_rate ?? item.daily_rate}<span className="font-normal text-gray-400"> / {t('common.day', 'วัน')}</span></p>
                    <p className="text-[13px] font-bold text-brand-pink">{t('common.private_rate', 'ไพร')} ฿{item.private_rate ?? item.daily_rate}<span className="font-normal text-gray-400"> / {t('common.day', 'วัน')}</span></p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
