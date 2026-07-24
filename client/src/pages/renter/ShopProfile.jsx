import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Star, Store, Users, MessageCircle, Truck, MapPin } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import ProductImage from '@/components/ui/ProductImage';
import Spinner from '@/components/ui/Spinner';
import { getShop, getShopItems, toggleFollowShop, getFollowState } from '@/api/shops';
import { getShopReviews } from '@/api/reviews';
import { openChat } from '@/api/chats';
import useAuthStore from '@/store/authStore';
import useRequireAuth from '@/hooks/useRequireAuth';
import toast from 'react-hot-toast';

const TABS = ['สินค้าทั้งหมด', 'รีวิว'];

// Public shop profile (§2.3): items + search-in-shop, rating, followers.
export default function ShopProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, accessToken } = useAuthStore();
  const requireAuth = useRequireAuth();
  const [shop, setShop]       = useState(null);
  const [items, setItems]     = useState([]);
  const [reviews, setReviews] = useState([]);
  const [tab, setTab]         = useState('สินค้าทั้งหมด');
  const [q, setQ]             = useState('');
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getShop(id).then(({ data }) => setShop(data.data.shop)),
      getShopItems(id).then(({ data }) => setItems(data.data.items)),
      getShopReviews(id).then(({ data }) => setReviews(data.data.reviews)).catch(() => {}),
      accessToken
        ? getFollowState(id).then(({ data }) => setFollowing(data.data.following)).catch(() => {})
        : Promise.resolve(),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  // Search-in-shop (debounced-lite).
  useEffect(() => {
    const t = setTimeout(() => {
      getShopItems(id, q.trim() || undefined).then(({ data }) => setItems(data.data.items)).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [q, id]);

  const handleFollow = () => requireAuth(async () => {
    try {
      const { data } = await toggleFollowShop(id);
      setFollowing(data.data.following);
      setShop((s) => ({ ...s, follower_count: data.data.follower_count }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'ทำรายการไม่สำเร็จ');
    }
  });

  const handleChat = () => requireAuth(async () => {
    try {
      const { data } = await openChat(id);
      navigate(`/chats/${data.data.conversation.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'เปิดแชทไม่สำเร็จ');
    }
  });

  if (loading || !shop) return <div className="flex min-h-screen items-center justify-center bg-surface-base"><Spinner /></div>;

  const isOwner = user?.id === shop.owner_id;

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title={shop.shop_name} />

      {/* Shop header */}
      <div className="px-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-light">
              {shop.logo_url
                ? <img src={shop.logo_url} alt="" className="h-full w-full object-cover" />
                : <Store size={24} className="text-brand-purple" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-base font-bold text-gray-900">{shop.shop_name}</p>
              <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1 text-amber-500">
                  <Star size={12} fill="currentColor" /> {Number(shop.rating || 5).toFixed(1)}
                  <span className="text-gray-400">({shop.review_count || 0})</span>
                </span>
                <span className="flex items-center gap-1"><Users size={12} /> {shop.follower_count} ผู้ติดตาม</span>
                <span>{shop.item_count} ชุด</span>
              </div>
            </div>
          </div>
          {shop.description && <p className="mt-3 text-xs text-gray-500">{shop.description}</p>}
          {shop.shop_address?.province && (
            <p className="mt-2 flex items-start gap-1 text-xs text-gray-500">
              <MapPin size={13} className="mt-0.5 flex-shrink-0 text-gray-400" />
              <span>{[shop.shop_address.detail, shop.shop_address.subdistrict, shop.shop_address.district, shop.shop_address.province, shop.shop_address.postal_code].filter(Boolean).join(' ')}</span>
            </p>
          )}
          {!isOwner && (
            <div className="mt-3 flex gap-2">
              <button onClick={handleFollow}
                className={`flex-1 rounded-full py-2 text-sm font-semibold ${following ? 'border border-gray-200 text-gray-500' : 'bg-brand-gradient text-white'}`}>
                {following ? 'กำลังติดตาม' : '+ ติดตาม'}
              </button>
              <button onClick={handleChat}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-brand-purple py-2 text-sm font-semibold text-brand-purple">
                <MessageCircle size={15} /> แชท
              </button>
            </div>
          )}
        </div>

        {/* Shipping / courier info */}
        {(shop.ship_couriers?.length > 0 || shop.return_couriers?.length > 0) && (
          <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Truck size={16} className="text-brand-purple" /> การจัดส่ง
            </h3>
            {shop.ship_couriers?.length > 0 && (
              <div className="mb-2">
                <p className="mb-1 text-xs text-gray-400">จัดส่งโดย</p>
                <div className="flex flex-wrap gap-1.5">
                  {shop.ship_couriers.map((c) => (
                    <span key={c} className="rounded-full bg-brand-light px-2.5 py-0.5 text-xs font-medium text-brand-purple">{c}</span>
                  ))}
                </div>
              </div>
            )}
            {shop.return_couriers?.length > 0 && (
              <div>
                <p className="mb-1 text-xs text-gray-400">รับคืนผ่าน</p>
                <div className="flex flex-wrap gap-1.5">
                  {shop.return_couriers.map((c) => (
                    <span key={c} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Shop rules */}
        {(shop.rules_text || shop.rules_image_url) && (
          <div className="mt-3 rounded-2xl border border-brand-purple/15 bg-brand-light/30 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">📋 กฎของร้าน</h3>
            {shop.rules_text && <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">{shop.rules_text}</p>}
            {shop.rules_image_url && (
              <img src={shop.rules_image_url} alt="กฎของร้าน" className="mt-3 w-full rounded-xl border border-gray-100 object-cover" />
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="mt-4 flex gap-2">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab === t ? 'bg-brand-purple text-white' : 'border border-gray-200 bg-white text-gray-600'}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'สินค้าทั้งหมด' && (
          <>
            {/* Search in shop (§2.3) */}
            <div className="relative mt-3">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)}
                placeholder={`ค้นหาในร้าน ${shop.shop_name}...`}
                className="w-full rounded-2xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand-purple" />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 pb-10">
              {items.length === 0 && <p className="col-span-2 py-10 text-center text-sm text-gray-400">ไม่พบสินค้า</p>}
              {items.map((item) => (
                <div key={item.id} onClick={() => navigate(`/items/${item.id}`)}
                  className="cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm active:scale-[0.97] transition-transform">
                  <div className="relative h-40"><ProductImage item={item} emojiClassName="text-5xl" /></div>
                  <div className="p-3">
                    <p className="truncate text-sm font-semibold text-gray-800">{item.name}</p>
                    <p className="truncate text-xs text-gray-400">{item.fandom || 'Cosplay'}</p>
                    <p className="mt-1 text-sm font-bold text-brand-purple">฿{item.test_rate ?? item.daily_rate}<span className="font-normal text-gray-400"> / day</span></p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'รีวิว' && (
          <div className="mt-3 space-y-3 pb-10">
            {reviews.length === 0 && <p className="py-10 text-center text-sm text-gray-400">ยังไม่มีรีวิว</p>}
            {reviews.map((r) => (
              <div key={r.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">{r.reviewer_name || 'Cosplayer'}</span>
                  <span className="flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: r.rating }).map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-gray-400">{r.item_name}</p>
                {r.comment && <p className="mt-1 text-sm text-gray-600">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
