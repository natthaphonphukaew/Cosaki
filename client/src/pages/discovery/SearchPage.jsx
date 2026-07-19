import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, Heart, Bookmark, History, X, Plus } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import ProductImage from '@/components/ui/ProductImage';
import Input from '@/components/ui/Input';
import { searchItems } from '@/api/items';
import { getFavorites, toggleFavorite } from '@/utils/favorites';
import toast from 'react-hot-toast';
import useAuthStore from '@/store/authStore';

const EMPTY_FILTER = { fandom: null, size: null, price_min: '', price_max: '', bust: '', waist: '', hip: '', date_from: '', date_to: '', allow_event: false };

const loadLS = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };

export default function SearchPage() {
  const [q, setQ]           = useState('');
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filter, setFilter] = useState(EMPTY_FILTER);
  const [favs, setFavs]     = useState([]);
  const [history, setHistory] = useState(() => loadLS('cosaki-search-history', []));
  const navigate            = useNavigate();
  const { user }            = useAuthStore();

  useEffect(() => { setFavs(getFavorites().map((x) => x.id)); }, []);

  const activeCount = Object.entries(filter).filter(([k, v]) =>
    k === 'allow_event' ? v : v !== null && v !== '' ).length;

  const buildParams = (query, f) => {
    const p = {};
    if (query?.trim()) p.q = query.trim();
    if (f.fandom) p.fandom = f.fandom;
    if (f.size) p.size = f.size;
    if (f.price_min) p.price_min = f.price_min;
    if (f.price_max) p.price_max = f.price_max;
    if (f.bust) p.bust = f.bust;
    if (f.waist) p.waist = f.waist;
    if (f.hip) p.hip = f.hip;
    if (f.date_from && f.date_to) { p.date_from = f.date_from; p.date_to = f.date_to; }
    if (f.allow_event) p.allow_event = 'true';
    return p;
  };

  const run = async (query = q, f = filter) => {
    const params = buildParams(query, f);
    if (!Object.keys(params).length) { setItems([]); return; }
    try {
      setLoading(true);
      const { data } = await searchItems(params);
      setItems(data.data.items);
      // Search history (§2.1) — keep the last 6 keywords.
      if (query?.trim()) {
        const next = [query.trim(), ...history.filter((x) => x !== query.trim())].slice(0, 6);
        setHistory(next); localStorage.setItem('cosaki-search-history', JSON.stringify(next));
      }
    } catch { } finally { setLoading(false); }
  };

  const doSearch = (val) => { setQ(val); run(val); };
  const set = (k, v) => setFilter((p) => ({ ...p, [k]: v }));
  const applyFilters = () => { setShowFilter(false); run(); };
  const clearFilters = () => { setFilter(EMPTY_FILTER); run(q, EMPTY_FILTER); };

  // Save Filter (§2.1): one saved preset in localStorage.
  const saveFilter = () => {
    localStorage.setItem('cosaki-saved-filter', JSON.stringify(filter));
    toast.success('บันทึกฟิลเตอร์แล้ว');
  };
  const loadSaved = () => {
    const f = loadLS('cosaki-saved-filter', null);
    if (!f) return toast('ยังไม่มีฟิลเตอร์ที่บันทึกไว้');
    setFilter(f); setShowFilter(false); run(q, f);
    toast.success('ใช้ฟิลเตอร์ที่บันทึกไว้');
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
              placeholder="ค้นหาตัวละคร, ชื่อเรื่อง, ด้อม..."
              className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-brand-purple"
            />
          </div>
          <button
            onClick={() => setShowFilter(true)}
            className={`relative flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm ${activeCount ? 'bg-brand-purple text-white' : 'bg-white text-gray-700'}`}
          >
            <SlidersHorizontal size={18} />
            {activeCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-pink px-1 text-[10px] font-bold text-white border-2 border-surface-base">{activeCount}</span>
            )}
          </button>
        </div>

        {/* Search history */}
        {!q && history.length > 0 && (
          <div className="mt-3">
            <div className="mb-1.5 flex items-center gap-1 text-xs text-gray-400"><History size={12} /> ค้นหาล่าสุด</div>
            <div className="flex flex-wrap gap-2">
              {history.map((hk) => (
                <button key={hk} onClick={() => doSearch(hk)}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600">{hk}</button>
              ))}
            </div>
          </div>
        )}

        {/* Active filter chips */}
        {activeCount > 0 && (
          <div className="mt-3 flex items-center gap-2 overflow-x-auto hide-scrollbar">
            {filter.fandom && <Chip label={filter.fandom} onClear={() => { set('fandom', null); run(q, { ...filter, fandom: null }); }} />}
            {filter.size && <Chip label={`ไซส์ ${filter.size}`} onClear={() => { set('size', null); run(q, { ...filter, size: null }); }} />}
            {(filter.price_min || filter.price_max) && <Chip label={`฿${filter.price_min || 0}–${filter.price_max || '∞'}`} onClear={() => { const f = { ...filter, price_min: '', price_max: '' }; setFilter(f); run(q, f); }} />}
            {filter.date_from && filter.date_to && <Chip label={`${filter.date_from} → ${filter.date_to}`} onClear={() => { const f = { ...filter, date_from: '', date_to: '' }; setFilter(f); run(q, f); }} />}
            <button onClick={clearFilters} className="flex-shrink-0 text-xs font-semibold text-gray-400">ล้างทั้งหมด</button>
          </div>
        )}

        {/* Results */}
        <div className="mt-4">
          {loading && (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
            </div>
          )}
          {!loading && (q || activeCount > 0) && items.length === 0 && (
            <div className="flex flex-col items-center py-16 text-center">
              <span className="mb-3 text-5xl">🔍</span>
              <p className="font-semibold text-gray-700">ไม่พบผลลัพธ์</p>
              <p className="mt-1 text-sm text-gray-400">ลองปรับคีย์เวิร์ดหรือฟิลเตอร์</p>
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
                  {item.express_delivery && (
                    <div className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                      🚀 ส่งด่วน
                    </div>
                  )}
                  <ProductImage item={item} emojiClassName="text-5xl" />
                  <button onClick={(e) => onFav(e, item)} className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/80">
                    <Heart size={14} className={favs.includes(item.id) ? 'text-brand-pink' : 'text-gray-500'} fill={favs.includes(item.id) ? '#EC4899' : 'none'} />
                  </button>
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-semibold text-gray-800">{item.name}</p>
                  <p className="truncate text-xs text-gray-400">{item.fandom || 'Cosplay'}</p>
                  <div className="mt-1 flex flex-col">
                    <p className="text-[13px] font-bold text-brand-purple">เทส ฿{item.test_rate ?? item.daily_rate}<span className="font-normal text-gray-400"> / day</span></p>
                    <p className="text-[13px] font-bold text-brand-pink">ไพร ฿{item.private_rate ?? item.daily_rate}<span className="font-normal text-gray-400"> / day</span></p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Advanced Filter sheet (§2.1) */}
      {showFilter && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30" onClick={() => setShowFilter(false)}>
          <div className="max-h-[85vh] w-full max-w-[390px] overflow-y-auto rounded-t-3xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">ตัวกรองอัจฉริยะ</h3>
              <button onClick={() => setShowFilter(false)} className="text-gray-400 text-lg">✕</button>
            </div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">ช่วงราคา (฿/วัน)</p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="ต่ำสุด" type="number" value={filter.price_min} onChange={(e) => set('price_min', e.target.value)} />
              <Input label="สูงสุด" type="number" value={filter.price_max} onChange={(e) => set('price_max', e.target.value)} />
            </div>

            <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-gray-400">สัดส่วนของฉัน (ซม.) — ระบบแมตช์กับไซส์ชุด</p>
            <div className="grid grid-cols-3 gap-2">
              <Input label="อก" type="number" value={filter.bust} onChange={(e) => set('bust', e.target.value)} />
              <Input label="เอว" type="number" value={filter.waist} onChange={(e) => set('waist', e.target.value)} />
              <Input label="สะโพก" type="number" value={filter.hip} onChange={(e) => set('hip', e.target.value)} />
            </div>

            <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-gray-400">วันที่ต้องการใช้ — ตัดชุดที่ไม่ว่างออก</p>
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={filter.date_from} onChange={(e) => set('date_from', e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-purple" />
              <input type="date" value={filter.date_to} onChange={(e) => set('date_to', e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-purple" />
            </div>

            <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-gray-400">ไซส์</p>
            <div className="flex gap-2 flex-wrap">
              {['XS','S','M','L','XL','XXL'].map((s) => (
                <button key={s} onClick={() => set('size', filter.size === s ? null : s)}
                  className={`flex h-10 min-w-10 items-center justify-center rounded-full px-2 text-sm font-medium ${filter.size === s ? 'bg-brand-purple text-white' : 'border border-gray-200 text-gray-700'}`}>
                  {s}
                </button>
              ))}
            </div>

            <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Fandom</p>
            <div className="flex flex-wrap gap-2">
              {(user?.fandoms?.length ? user.fandoms : ['Genshin Impact', 'Honkai Star Rail', 'Valorant']).map((f) => (
                <button key={f} onClick={() => set('fandom', filter.fandom === f ? null : f)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium ${filter.fandom === f ? 'bg-brand-purple text-white' : 'border border-gray-200 bg-white text-gray-600'}`}>
                  {f}
                </button>
              ))}
              <button 
                onClick={() => {
                  setShowFilter(false);
                  navigate('/profile/fandoms');
                }}
                className="flex items-center justify-center rounded-full border border-gray-200 bg-white px-3 py-1.5 text-gray-600 transition-colors hover:bg-gray-50"
              >
                <Plus size={16} />
              </button>
            </div>

            <button onClick={() => set('allow_event', !filter.allow_event)}
              className={`mt-4 w-full rounded-xl p-3 text-left text-sm font-medium ${filter.allow_event ? 'border-2 border-brand-purple bg-brand-light/30 text-brand-purple' : 'border border-gray-200 text-gray-600'}`}>
              🎭 เฉพาะชุดที่อนุญาตออกงาน/กิจกรรม
            </button>

            <div className="mt-5 flex gap-2">
              <button onClick={saveFilter} className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-brand-purple py-3 text-sm font-semibold text-brand-purple">
                <Bookmark size={15} /> Save Filter
              </button>
              <button onClick={loadSaved} className="flex-1 rounded-full border border-gray-200 py-3 text-sm font-semibold text-gray-600">
                ใช้ที่บันทึกไว้
              </button>
            </div>
            <button onClick={applyFilters} className="mt-3 w-full rounded-full bg-brand-gradient py-4 text-base font-semibold text-white">
              ค้นหา
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

const Chip = ({ label, onClear }) => (
  <span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand-purple">
    {label}
    <button onClick={onClear} className="text-brand-purple/70"><X size={11} /></button>
  </span>
);
