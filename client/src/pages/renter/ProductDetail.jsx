import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Share2, Shield, Star, Truck, Zap } from 'lucide-react';
import Button from '@/components/ui/Button';
import ProductImage from '@/components/ui/ProductImage';
import { getItem } from '@/api/items';
import { getShopReviews } from '@/api/reviews';
import { isFavorite, toggleFavorite } from '@/utils/favorites';
import toast from 'react-hot-toast';

export default function ProductDetail() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [slide, setSlide] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [faved, setFaved] = useState(false);
  const [rateType, setRateType] = useState('test');

  useEffect(() => {
    setFaved(isFavorite(id));
    getItem(id).then(({ data }) => {
      const it = data.data.item;
      setItem(it);
      if (it?.shop_id) getShopReviews(it.shop_id).then(({ data }) => setReviews(data.data.reviews)).catch(() => {});
    }).finally(() => setLoading(false));
  }, [id]);

  const onFav = () => { toggleFavorite(item); setFaved((f) => !f); };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: item?.name, url });
      else { await navigator.clipboard.writeText(url); toast.success('Link copied to clipboard'); }
    } catch { /* user cancelled share */ }
  };

  const [following, setFollowing] = useState(false);
  useEffect(() => {
    if (item?.shop_id) {
      const f = JSON.parse(localStorage.getItem('cosaki-follows') || '[]');
      setFollowing(f.includes(item.shop_id));
    }
  }, [item?.shop_id]);
  const toggleFollow = () => {
    const f = JSON.parse(localStorage.getItem('cosaki-follows') || '[]');
    const next = f.includes(item.shop_id) ? f.filter((x) => x !== item.shop_id) : [...f, item.shop_id];
    localStorage.setItem('cosaki-follows', JSON.stringify(next));
    setFollowing(next.includes(item.shop_id));
    toast.success(next.includes(item.shop_id) ? `Following ${item.shop_name}` : 'Unfollowed');
  };

  const onScroll = (e) => {
    const w = e.target.clientWidth;
    setSlide(Math.round(e.target.scrollLeft / w));
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
    </div>
  );
  if (!item) return <div className="flex h-screen items-center justify-center text-gray-400">Item not found</div>;

  // Two rates (fall back to legacy daily_rate); renter also pays a 10% protection fee.
  const testRate     = Number(item.test_rate ?? item.daily_rate ?? 0);
  const privateRate  = Number(item.private_rate ?? item.test_rate ?? item.daily_rate ?? 0);
  const selectedRate = rateType === 'private' ? privateRate : testRate;
  const protectionFee = Math.round(selectedRate * 0.10);

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-white">
      {/* Hero carousel */}
      <div className="relative h-72">
        {(() => {
          const imgs = item.image_urls?.length ? item.image_urls : [null];
          return (
            <div onScroll={onScroll} className="flex h-full snap-x snap-mandatory overflow-x-auto hide-scrollbar">
              {imgs.map((url, i) => (
                <div key={i} className="h-full w-full flex-shrink-0 snap-center">
                  <ProductImage
                    item={url ? { image_urls: [url], name: item.name } : item}
                    emojiClassName="text-8xl"
                  />
                </div>
              ))}
            </div>
          );
        })()}

        {/* Dots */}
        {item.image_urls?.length > 1 && (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
            {item.image_urls.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-5 bg-white' : 'w-1.5 bg-white/60'}`} />
            ))}
          </div>
        )}

        <button onClick={() => navigate(-1)} className="absolute left-4 top-12 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-sm">
          <ArrowLeft size={20} />
        </button>
        <div className="absolute right-4 top-12 flex gap-2">
          <button onClick={onFav} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-sm">
            <Heart size={18} className={faved ? 'text-brand-pink' : 'text-gray-700'} fill={faved ? '#EC4899' : 'none'} />
          </button>
          <button onClick={handleShare} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-sm">
            <Share2 size={18} className="text-gray-700" />
          </button>
        </div>
        {item.fandom && (
          <span className="absolute left-4 top-24 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-brand-purple backdrop-blur-sm shadow-sm">
            {item.fandom}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="rounded-t-3xl -mt-4 bg-white px-4 pt-5 pb-28">
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-400 uppercase tracking-wider">{item.character || item.fandom}</p>
          {item.min_age > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">{item.min_age}+</span>
          )}
        </div>
        <h1 className="mt-1 text-xl font-bold text-gray-900">{item.name}</h1>

        <div className="mt-2 flex items-center gap-3">
          <div className="flex items-center gap-1 text-amber-500">
            <Star size={14} fill="currentColor" />
            <span className="text-sm font-semibold">{Number(item.shop_rating || 5).toFixed(1)}</span>
            {item.shop_review_count > 0 && (
              <span className="text-xs text-gray-400">({item.shop_review_count})</span>
            )}
          </div>
          <span className="text-sm text-gray-400">{item.shop_name}</span>
          <button onClick={toggleFollow} className={`ml-auto text-xs font-semibold ${following ? 'text-gray-400' : 'text-brand-purple'}`}>
            {following ? 'FOLLOWING' : 'FOLLOW'}
          </button>
        </div>

        {/* Rental options — pick a rate */}
        <div className="mt-4 space-y-3">
          <button
            onClick={() => setRateType('test')}
            className={`flex w-full items-center justify-between rounded-xl p-3 text-left ${rateType === 'test' ? 'border-2 border-brand-purple bg-brand-light/30' : 'border border-gray-200'}`}
          >
            <div className="flex items-center gap-2">
              <Truck size={16} className={rateType === 'test' ? 'text-brand-purple' : 'text-gray-400'} />
              <span className="text-sm font-medium text-gray-700">เทสที่บ้าน (Test at Home)</span>
            </div>
            <span className={`font-bold ${rateType === 'test' ? 'text-brand-purple' : 'text-gray-700'}`}>฿{testRate}</span>
          </button>
          <button
            onClick={() => setRateType('private')}
            className={`flex w-full items-center justify-between rounded-xl p-3 text-left ${rateType === 'private' ? 'border-2 border-brand-purple bg-brand-light/30' : 'border border-gray-200'}`}
          >
            <div className="flex items-center gap-2">
              <Zap size={16} className={rateType === 'private' ? 'text-brand-purple' : 'text-gray-400'} />
              <span className="text-sm font-medium text-gray-700">ไพรเวท / ออกงาน (Event)</span>
            </div>
            <span className={`font-bold ${rateType === 'private' ? 'text-brand-purple' : 'text-gray-700'}`}>฿{privateRate}</span>
          </button>
        </div>

        {/* Cosaki protection fee banner (replaces deposit) */}
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-purple-50 p-3">
          <Shield size={20} className="text-brand-purple flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-brand-purple">ค่าธรรมเนียมคุ้มครองความเสียหาย 10%</p>
            <p className="text-xs text-gray-500 mt-0.5">เก็บเพิ่ม ฿{protectionFee} (10% ของค่าเช่า) เข้ากองทุนประกันกลาง Cosaki — ไม่มีเงินมัดจำ</p>
          </div>
        </div>

        {/* Outfit details */}
        <div className="mt-5">
          <h3 className="font-semibold text-gray-900">Outfit Details</h3>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {['Includes Wig','Classic Professional','Next Day'].map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1 rounded-xl bg-gray-50 p-3 text-center">
                <span className="text-lg">{['👗','⭐','🚀'][i]}</span>
                <span className="text-xs text-gray-600">{d}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Available sizes */}
        {item.sizes?.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold text-gray-700">Sizes: {item.sizes.join(', ')}</p>
          </div>
        )}

        {/* Reviews */}
        <div className="mt-5">
          <h3 className="font-semibold text-gray-900">
            Reviews {reviews.length > 0 && <span className="text-sm font-normal text-gray-400">({reviews.length})</span>}
          </h3>
          {reviews.length === 0 ? (
            <p className="mt-2 text-sm text-gray-400">No reviews yet — be the first to rent &amp; review.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {reviews.slice(0, 5).map((r) => (
                <div key={r.id} className="rounded-xl bg-gray-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800">{r.reviewer_name || 'Cosplayer'}</span>
                    <span className="flex items-center gap-0.5 text-amber-500">
                      {Array.from({ length: r.rating }).map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                    </span>
                  </div>
                  {r.comment && <p className="mt-1 text-sm text-gray-600">{r.comment}</p>}
                  {r.tags?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {r.tags.map((t) => (
                        <span key={t} className="rounded-full bg-white px-2 py-0.5 text-[11px] text-brand-purple">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 border-t border-gray-100 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400">{rateType === 'private' ? 'ไพรเวท' : 'เทสที่บ้าน'}</span>
            <p className="text-lg font-bold text-brand-purple">฿{selectedRate}<span className="text-sm font-normal text-gray-400"> / day</span></p>
          </div>
          <Button className="w-40" onClick={() => navigate(`/items/${item.id}/dates`, { state: { rateType } })}>
            Book Now
          </Button>
        </div>
      </div>
    </div>
  );
}
