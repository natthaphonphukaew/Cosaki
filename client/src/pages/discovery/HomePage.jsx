import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import ProductImage from '@/components/ui/ProductImage';
import NotificationBell from '@/components/ui/NotificationBell';
import ChatButton from '@/components/ui/ChatButton';
import { searchItems } from '@/api/items';
import { getFavorites, toggleFavorite } from '@/utils/favorites';
import useAuthStore from '@/store/authStore';

const FANDOMS = ['All','Genshin','Arcane','Valorant','Demon Slayer','JJK'];

export default function HomePage() {
  const [items, setItems]   = useState([]);
  const [fandom, setFandom] = useState('All');
  const [favs, setFavs]     = useState([]);
  const { user }            = useAuthStore();
  const navigate            = useNavigate();

  useEffect(() => { setFavs(getFavorites().map((x) => x.id)); }, []);

  useEffect(() => {
    searchItems(fandom !== 'All' ? { fandom } : {})
      .then(({ data }) => setItems(data.data.items))
      .catch(() => {});
  }, [fandom]);

  const onFav = (e, item) => {
    e.stopPropagation();
    toggleFavorite(item);
    setFavs((f) => f.includes(item.id) ? f.filter((x) => x !== item.id) : [...f, item.id]);
  };

  return (
    <AppShell>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-brand-light flex items-center justify-center">
            <span className="text-sm font-bold text-brand-purple">{user?.display_name?.[0] || 'C'}</span>
          </div>
          <div>
            <p className="text-xs text-gray-400">Welcome back</p>
            <p className="text-sm font-semibold text-gray-800">{user?.display_name || 'Cosplayer'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ChatButton size={20} className="h-10 w-10 bg-white shadow-sm" />
          <NotificationBell size={20} className="h-10 w-10 bg-white shadow-sm" />
        </div>
      </div>

      {/* Hero banner */}
      <div className="mx-4 mb-5 overflow-hidden rounded-2xl bg-brand-gradient p-5">
        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">LIMITED OFFER</span>
        <h2 className="mt-2 text-xl font-bold text-white">New Season Drops</h2>
        <button onClick={() => navigate('/search')} className="mt-3 rounded-full bg-white px-5 py-2 text-sm font-semibold text-brand-purple">
          Rent Now
        </button>
      </div>

      {/* Trending fandoms */}
      <div className="mb-4 px-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Trending Fandoms</h3>
          <button onClick={() => navigate('/search')} className="text-sm font-medium text-brand-purple">View All</button>
        </div>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {FANDOMS.map((f) => (
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
        </div>
      </div>

      {/* Recommended grid */}
      <div className="px-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Recommended for You</h3>
          <button onClick={() => navigate('/search')} className="text-sm font-medium text-brand-purple">View All</button>
        </div>
        {items.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="mb-3 text-5xl">🎭</div>
            <p className="text-sm text-gray-400">No costumes found yet</p>
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
                  <ProductImage item={item} emojiClassName="text-5xl" />
                  <button onClick={(e) => onFav(e, item)} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm">
                    <Heart size={14} className={favs.includes(item.id) ? 'text-brand-pink' : 'text-gray-500'} fill={favs.includes(item.id) ? '#EC4899' : 'none'} />
                  </button>
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-semibold text-gray-800">{item.name}</p>
                  <p className="truncate text-xs text-gray-400">{item.fandom || 'Cosplay'}</p>
                  <p className="mt-1 text-sm text-brand-purple font-bold">${item.daily_rate}<span className="font-normal text-gray-400"> / day</span></p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
