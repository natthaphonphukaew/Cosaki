import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, Heart } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import ProductImage from '@/components/ui/ProductImage';
import { searchItems } from '@/api/items';
import { getFavorites, toggleFavorite } from '@/utils/favorites';

const FANDOM_OPTIONS = ['Genshin Impact','Arcane','Valorant','Demon Slayer','Spy x Family','Chainsaw Man','Cyberpunk Edgerunners'];

export default function SearchPage() {
  const [q, setQ]           = useState('');
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [fandom, setFandom] = useState(null);
  const [size, setSize]     = useState(null);
  const [favs, setFavs]     = useState([]);
  const navigate            = useNavigate();

  useEffect(() => { setFavs(getFavorites().map((x) => x.id)); }, []);

  // Run a search from the given query string + current filters.
  const run = async (query, f = fandom, s = size) => {
    if (!query?.trim() && !f && !s) { setItems([]); return; }
    try {
      setLoading(true);
      const { data } = await searchItems({
        ...(query?.trim() ? { q: query } : {}),
        ...(f ? { fandom: f } : {}),
        ...(s ? { size: s } : {}),
      });
      setItems(data.data.items);
    } catch { } finally { setLoading(false); }
  };

  const doSearch = (val) => { setQ(val); run(val); };

  const applyFandom = (f) => {
    const next = fandom === f ? null : f;
    setFandom(next);
    setShowFilter(false);
    run(q, next, size);
  };

  const applySize = (s) => {
    const next = size === s ? null : s;
    setSize(next);
    run(q, fandom, next);
  };

  const onFav = (e, item) => {
    e.stopPropagation();
    toggleFavorite(item);
    setFavs((list) => list.includes(item.id) ? list.filter((x) => x !== item.id) : [...list, item.id]);
  };

  return (
    <AppShell>
      <div className="px-4 pt-5">
        {/* Search bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => doSearch(e.target.value)}
              placeholder="Search costumes, characters..."
              className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-brand-purple"
            />
          </div>
          <button
            onClick={() => setShowFilter(true)}
            className={`relative flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm ${fandom || size ? 'bg-brand-purple text-white' : 'bg-white text-gray-700'}`}
          >
            <SlidersHorizontal size={18} />
            {(fandom || size) && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-brand-pink border-2 border-surface-base" />}
          </button>
        </div>

        {/* Active fandom chip */}
        {fandom && (
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand-purple">
              {fandom}
              <button onClick={() => applyFandom(fandom)} className="text-brand-purple/70">✕</button>
            </span>
          </div>
        )}

        {/* Results */}
        <div className="mt-4">
          {loading && (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
            </div>
          )}
          {!loading && q && items.length === 0 && (
            <div className="flex flex-col items-center py-16 text-center">
              <span className="mb-3 text-5xl">🔍</span>
              <p className="font-semibold text-gray-700">No results for "{q}"</p>
              <p className="mt-1 text-sm text-gray-400">Try a different keyword or fandom</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/items/${item.id}`)}
                className="cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm active:scale-[0.97] transition-transform"
              >
                <div className="relative h-40">
                  <ProductImage item={item} emojiClassName="text-5xl" />
                  <button onClick={(e) => onFav(e, item)} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/80">
                    <Heart size={14} className={favs.includes(item.id) ? 'text-brand-pink' : 'text-gray-500'} fill={favs.includes(item.id) ? '#EC4899' : 'none'} />
                  </button>
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-semibold text-gray-800">{item.name}</p>
                  <p className="truncate text-xs text-gray-400">{item.fandom || 'Cosplay'}</p>
                  <p className="mt-1 text-sm font-bold text-brand-purple">${item.daily_rate}<span className="font-normal text-gray-400"> / day</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter modal */}
      {showFilter && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30" onClick={() => setShowFilter(false)}>
          <div className="w-full max-w-[390px] rounded-t-3xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Filters</h3>
              <button onClick={() => setShowFilter(false)} className="text-gray-400 text-lg">✕</button>
            </div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Size</p>
            <div className="flex gap-2">
              {['XS','S','M','L','XL','XXL'].map((s) => (
                <button
                  key={s}
                  onClick={() => applySize(s)}
                  className={`flex h-10 min-w-10 items-center justify-center rounded-full px-2 text-sm font-medium transition-colors ${
                    size === s ? 'bg-brand-purple text-white border border-brand-purple' : 'border border-gray-200 text-gray-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="mb-3 mt-5 text-xs font-semibold uppercase tracking-wider text-gray-400">Fandom</p>
            <div className="flex flex-wrap gap-2">
              {FANDOM_OPTIONS.map((f) => (
                <button
                  key={f}
                  onClick={() => applyFandom(f)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    fandom === f ? 'bg-brand-purple text-white' : 'border border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowFilter(false)}
              className="mt-6 w-full rounded-full bg-brand-gradient py-4 text-base font-semibold text-white"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
