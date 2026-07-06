import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, TrendingUp, Plus } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import ProductImage from '@/components/ui/ProductImage';
import NotificationBell from '@/components/ui/NotificationBell';
import { listMyItems } from '@/api/items';
import { listBookings } from '@/api/bookings';
import useAuthStore from '@/store/authStore';

export default function SellerDashboard() {
  const { user, shop } = useAuthStore();
  const navigate = useNavigate();
  const [items, setItems]     = useState([]);
  const [bookings, setBookings] = useState([]);

  const shopName = shop?.shop_name || user?.display_name || 'My Shop';

  useEffect(() => {
    listMyItems().then(({ data }) => setItems(data.data.items)).catch(() => {});
    listBookings({ as: 'shop', limit: 20 }).then(({ data }) => setBookings(data.data.bookings)).catch(() => {});
  }, []);

  const pendingActions = bookings.filter((b) => ['escrowed','returned'].includes(b.status));

  // Earnings = seller payout (rental − 10% commission) of completed rentals.
  const earnings = bookings
    .filter((b) => b.status === 'completed')
    .reduce((s, b) => s + Number(b.seller_payout ?? b.rental_fee ?? 0), 0);

  return (
    <AppShell>
      <div className="px-4 pt-5">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-full bg-brand-light flex items-center justify-center font-bold text-brand-purple">
              {shop?.logo_url
                ? <img src={shop.logo_url} alt="shop" className="h-full w-full object-cover" />
                : (shopName[0] || 'S')}
            </div>
            <span className="text-base font-bold text-gray-800 truncate max-w-[180px]">{shopName}</span>
          </div>
          <NotificationBell />
        </div>

        {/* Earnings card */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Earnings</p>
          <div className="flex items-end justify-between mt-1">
            <h2 className="text-3xl font-bold text-gray-900">${earnings.toFixed(2)}</h2>
            {earnings > 0 && (
              <div className="flex items-center gap-1 text-green-500 text-sm font-semibold">
                <TrendingUp size={16} /> Active
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {bookings.filter((b) => b.status === 'completed').length} rentals completed · หลังหักค่าบริการ 10%
          </p>
        </div>

        {/* To-Do list */}
        {pendingActions.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-3 font-semibold text-gray-900">To-Do List</h3>
            <div className="space-y-2">
              {pendingActions.slice(0,3).map((b) => (
                <button
                  key={b.id}
                  onClick={() => navigate(`/seller/orders/${b.id}`)}
                  className="flex w-full items-center gap-3 rounded-xl bg-white p-4 shadow-sm active:bg-gray-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-xl">📦</div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-gray-800">{b.item_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{b.status === 'escrowed' ? 'Ready to ship' : 'Waiting for inspection'}</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-300" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-400">Listings</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{items.length}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-400">Active Rentals</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">
              {bookings.filter((b) => ['escrowed','shipped'].includes(b.status)).length}
            </p>
          </div>
        </div>

        {/* Pro Seller banner */}
        <div className="mt-4 rounded-2xl bg-brand-purple p-5 overflow-hidden">
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs text-white font-medium">PRO SELLER STATUS</span>
          <h3 className="mt-2 text-lg font-bold text-white">Level Up Your Store</h3>
          <button onClick={() => navigate('/seller/items')} className="mt-3 rounded-full border border-white px-4 py-1.5 text-sm font-semibold text-white">
            View Roadmap
          </button>
        </div>

        {/* Top listings */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">My Listings</h3>
            <button className="text-sm font-medium text-brand-purple" onClick={() => navigate('/seller/items')}>View All</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* Persistent Add card — always first */}
            <button
              onClick={() => navigate('/seller/items/new')}
              className="flex h-full min-h-[196px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-purple/30 bg-brand-light/30 text-brand-purple active:bg-brand-light"
            >
              <Plus size={28} />
              <span className="text-sm font-semibold">Add Product</span>
            </button>
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/seller/items/${item.id}/edit`)}
                className="cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm active:scale-[0.97] transition-transform"
              >
                <div className="relative h-40">
                  <ProductImage item={item} emojiClassName="text-5xl" />
                  {!item.is_available && (
                    <span className="absolute left-2 top-2 rounded-full bg-gray-800/80 px-2 py-0.5 text-[10px] font-semibold text-white">Hidden</span>
                  )}
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
    </AppShell>
  );
}
