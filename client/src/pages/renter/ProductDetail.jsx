import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Share2, Shield, Star, Truck, Zap } from 'lucide-react';
import Button from '@/components/ui/Button';
import ProductImage from '@/components/ui/ProductImage';
import { getItem, getAvailability } from '@/api/items';
import { getShopReviews } from '@/api/reviews';
import { openChat } from '@/api/chats';
import { toggleFollowShop, getFollowState } from '@/api/shops';
import { isFavorite, toggleFavorite } from '@/utils/favorites';
import useRequireAuth from '@/hooks/useRequireAuth';
import useAuthStore from '@/store/authStore';
import toast from 'react-hot-toast';
import { MessageCircle } from 'lucide-react';

function convertMeasurement(value, fromUnit, toUnit) {
  if (!value) return null;
  if (fromUnit === toUnit) return value;
  
  const parts = String(value).split('-');
  const converted = parts.map(p => {
    const num = Number(p.trim());
    if (isNaN(num)) return p;
    if (fromUnit === 'cm' && toUnit === 'inch') return Math.round(num / 2.54);
    if (fromUnit === 'inch' && toUnit === 'cm') return Math.round(num * 2.54);
    return p;
  });
  return converted.join('-');
}

export default function ProductDetail() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const requireAuth = useRequireAuth();
  const { accessToken, user } = useAuthStore();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [slide, setSlide] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [faved, setFaved] = useState(false);
  const [rateType, setRateType] = useState('test');
  const [booked, setBooked] = useState([]);
  const [agree1, setAgree1] = useState(false);
  const [agree2, setAgree2] = useState(false);
  const [displayUnit, setDisplayUnit] = useState('cm');

  useEffect(() => {
    setFaved(isFavorite(id));
    getItem(id).then(({ data }) => {
      const it = data.data.item;
      setItem(it);
      if (it.measurement_unit) setDisplayUnit(it.measurement_unit);
      if (it?.shop_id) getShopReviews(it.shop_id).then(({ data }) => setReviews(data.data.reviews)).catch(() => {});
    }).finally(() => setLoading(false));
    getAvailability(id).then(({ data }) => setBooked(data.data.booked)).catch(() => {});
  }, [id]);

  const onFav = () => { toggleFavorite(item); setFaved((f) => !f); };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: item?.name, url });
      else { await navigator.clipboard.writeText(url); toast.success('Link copied to clipboard'); }
    } catch { /* user cancelled share */ }
  };

  // Real follow via API (shop_follows table) — only for signed-in users.
  const [following, setFollowing] = useState(false);
  useEffect(() => {
    if (item?.shop_id && accessToken) {
      getFollowState(item.shop_id).then(({ data }) => setFollowing(data.data.following)).catch(() => {});
    }
  }, [item?.shop_id, accessToken]);
  const toggleFollow = () => requireAuth(async () => {
    try {
      const { data } = await toggleFollowShop(item.shop_id);
      setFollowing(data.data.following);
      toast.success(data.data.following ? `Following ${item.shop_name}` : 'Unfollowed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'ทำรายการไม่สำเร็จ');
    }
  });

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
          <button onClick={() => navigate(`/shops/${item.shop_id}`)} className="text-sm text-gray-500 underline decoration-gray-300 underline-offset-2">
            {item.shop_name}
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => requireAuth(async () => {
                try {
                  const { data } = await openChat(item.shop_id);
                  navigate(`/chats/${data.data.conversation.id}`);
                } catch (err) {
                  toast.error(err.response?.data?.message || 'เปิดแชทไม่สำเร็จ');
                }
              })}
              className="flex items-center gap-1 rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand-purple"
            >
              <MessageCircle size={13} /> แชท
            </button>
            <button onClick={toggleFollow} className={`text-xs font-semibold ${following ? 'text-gray-400' : 'text-brand-purple'}`}>
              {following ? 'FOLLOWING' : 'FOLLOW'}
            </button>
          </div>
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

        {/* Badges + rented stat */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {item.rented_count > 0 && (
            <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand-purple">🔥 เช่าไปแล้ว {item.rented_count} ครั้ง</span>
          )}
          {item.allow_event && <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">🎭 ออกงานได้</span>}
          {item.express_delivery && <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">⚡ ส่งด่วนในจังหวัด</span>}
        </div>

        {/* Measurements */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">สัดส่วนชุด</h3>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              <button 
                onClick={() => setDisplayUnit('cm')} 
                className={`px-3 py-1 text-xs font-semibold rounded-md ${displayUnit === 'cm' ? 'bg-white shadow-sm text-brand-purple' : 'text-gray-500'}`}
              >
                ซม.
              </button>
              <button 
                onClick={() => setDisplayUnit('inch')} 
                className={`px-3 py-1 text-xs font-semibold rounded-md ${displayUnit === 'inch' ? 'bg-white shadow-sm text-brand-purple' : 'text-gray-500'}`}
              >
                นิ้ว
              </button>
            </div>
          </div>
          {(item.bust || item.waist || item.hip || item.height_recommended) ? (
            <div className="grid grid-cols-4 gap-2">
              {[['อก', item.bust],['เอว', item.waist],['สะโพก', item.hip]].map(([l, v]) => {
                const cv = convertMeasurement(v, item.measurement_unit || 'cm', displayUnit);
                return (
                  <div key={l} className="rounded-xl bg-gray-50 p-3 text-center">
                    <p className="text-sm font-bold text-gray-800">{cv ? `${cv}${displayUnit === 'inch' ? '"' : ''}` : '—'}</p>
                    <p className="text-xs text-gray-400">{l}</p>
                  </div>
                )
              })}
              <div className="rounded-xl bg-gray-50 p-3 text-center">
                <p className="text-sm font-bold text-gray-800">{item.height_recommended || '—'}</p>
                <p className="text-xs text-gray-400">สูงแนะนำ</p>
              </div>
            </div>
          ) : <p className="mt-2 text-sm text-gray-400">ร้านยังไม่ได้ระบุสัดส่วน</p>}
          {item.sizes?.length > 0 && <p className="mt-2 text-sm text-gray-600">ไซส์: {item.sizes.join(', ')}</p>}
        </div>

        {/* Shop rules (กฎของร้าน) — text and/or image set by the shop */}
        {(item.shop_rules_text || item.shop_rules_image) && (
          <div className="mt-5 rounded-2xl border border-brand-purple/15 bg-brand-light/30 p-4">
            <h3 className="mb-2 flex items-center gap-2 font-semibold text-gray-900">📋 กฎของร้าน</h3>
            {item.shop_rules_text && (
              <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">{item.shop_rules_text}</p>
            )}
            {item.shop_rules_image && (
              <img
                src={item.shop_rules_image}
                alt="กฎของร้าน"
                className="mt-3 w-full rounded-xl border border-gray-100 object-cover"
              />
            )}
          </div>
        )}

        {/* SLA + couriers */}
        <div className="mt-4 rounded-xl bg-gray-50 p-3 space-y-1 text-xs text-gray-600">
          <p>🚚 เผื่อระยะเวลาขนส่ง <span className="font-semibold">7</span> วัน · ส่งคืนภายใน <span className="font-semibold">{item.return_days ?? 2}</span> วันหลังใช้งาน</p>
          {item.return_couriers?.length > 0 && <p>📦 ขนส่งขากลับที่รับ: {item.return_couriers.join(', ')}</p>}
        </div>

        {/* Live availability */}
        {booked.length > 0 && (
          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-700">
            📅 มีคิวจองแล้ว {booked.length} ช่วง — ระบบจะปิดวันที่ไม่ว่างในหน้าเลือกวัน
          </div>
        )}

        {/* Clickwrap agreement (§2.2.5) — must accept both to book */}
        <div className="mt-5 rounded-2xl border border-gray-200 p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-800">ข้อตกลงก่อนเช่า</p>
          <label className="flex items-start gap-2 text-xs text-gray-600">
            <input type="checkbox" checked={agree1} onChange={(e) => setAgree1(e.target.checked)} className="mt-0.5 accent-brand-purple" />
            <span>ยอมรับ <span className="font-medium text-brand-purple">กฎของร้านเช่า</span> (ห้ามตัด/ซักวิก, ราคาเทสใส่ในห้องเท่านั้น, ไม่ให้ผู้อื่นเช่าแทน)</span>
          </label>
          <label className="flex items-start gap-2 text-xs text-gray-600">
            <input type="checkbox" checked={agree2} onChange={(e) => setAgree2(e.target.checked)} className="mt-0.5 accent-brand-purple" />
            <span>ยอมรับ <span className="font-medium text-brand-purple">ตารางค่าปรับมาตรฐาน Cosaki</span> (เสียหาย/ส่งช้า/ของหาย)</span>
          </label>
        </div>

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
                  {(r.bust || r.waist || r.hip || r.height) && (
                    <p className="mt-0.5 text-[11px] text-gray-400">
                      สัดส่วนผู้รีวิว: {[r.bust && `อก ${r.bust}`, r.waist && `เอว ${r.waist}`, r.hip && `สะโพก ${r.hip}`, r.height && `สูง ${r.height}`].filter(Boolean).join(' · ')}
                    </p>
                  )}
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
            <p className="text-lg font-bold text-brand-purple">฿{selectedRate}<span className="text-sm font-normal text-gray-400"> / ครั้ง</span></p>
          </div>
          {user?.id && item.shop_owner_id === user.id ? (
            <Button className="w-44" disabled>นี่คือสินค้าของร้านคุณ</Button>
          ) : (
            <Button className="w-40" disabled={!agree1 || !agree2}
              onClick={() => requireAuth(() => navigate(`/items/${item.id}/dates`, { state: { rateType, item } }))}>
              {(!agree1 || !agree2) ? 'ยอมรับข้อตกลง' : 'Book Now'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
