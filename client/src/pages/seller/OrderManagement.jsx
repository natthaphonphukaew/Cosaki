import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import Badge from '@/components/ui/Badge';
import ProductImage from '@/components/ui/ProductImage';
import { listBookings } from '@/api/bookings';
import { format } from 'date-fns';

const TABS = ['Pending','Shipping','Active'];
const tabStatus = { Pending: 'pending_payment', Shipping: 'shipped', Active: 'escrowed' };

export default function OrderManagement() {
  const [tab, setTab]         = useState('Pending');
  const [bookings, setBookings] = useState([]);
  const navigate              = useNavigate();

  useEffect(() => {
    listBookings({ as: 'shop', status: tabStatus[tab] })
      .then(({ data }) => setBookings(data.data.bookings))
      .catch(() => {});
  }, [tab]);

  return (
    <AppShell>
      <div className="px-4 pt-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs text-gray-400">STORE MANAGEMENT</p>
            <h2 className="text-xl font-bold text-gray-900">Order Requests</h2>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === t ? 'bg-brand-purple text-white' : 'border border-gray-200 bg-white text-gray-600'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Order cards */}
        <div className="space-y-3">
          {bookings.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <span className="text-4xl mb-3">📋</span>
              <p className="text-sm text-gray-400">No {tab.toLowerCase()} orders</p>
            </div>
          ) : bookings.map((b) => (
            <div
              key={b.id}
              onClick={() => navigate(`/seller/orders/${b.id}`)}
              className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm cursor-pointer active:bg-gray-50"
            >
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl">
                <ProductImage item={{ image_urls: b.image_urls, name: b.item_name }} emojiClassName="text-2xl" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-bold text-gray-800 truncate pr-2">{b.item_name}</p>
                  <Badge
                    status={b.status === 'pending_payment' ? 'awaiting' : b.status === 'escrowed' ? 'confirmed' : 'shipped'}
                    label={b.status === 'pending_payment' ? 'AWAITING' : b.status === 'escrowed' ? 'CONFIRMED' : 'SHIPPED'}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Renter: {b.renter_name}</p>
                <p className="text-xs text-gray-400">
                  {b.rental_start && b.rental_end
                    ? `${format(new Date(b.rental_start), 'MMM d')} – ${format(new Date(b.rental_end), 'MMM d')}`
                    : '—'}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-brand-purple">${b.total_amount}</span>
                  <button className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700">Print Label</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
