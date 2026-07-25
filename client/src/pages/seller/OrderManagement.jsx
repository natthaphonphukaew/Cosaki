import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppShell from '@/components/layout/AppShell';
import Badge from '@/components/ui/Badge';
import ProductImage from '@/components/ui/ProductImage';
import { listBookings } from '@/api/bookings';
import { format } from 'date-fns';

const TABS = [
  { key: 'queue', label: 'seller.tabQueue' },
  { key: 'prep', label: 'seller.tabPrep' },
  { key: 'renting', label: 'seller.tabRenting' },
  { key: 'done', label: 'seller.tabDone' },
];

// Client-side bucketing (needs accepted_at, which a single status filter can't express).
const bucket = (b) => {
  if (b.status === 'escrowed' && !b.accepted_at) return 'queue';
  if (b.status === 'escrowed' && b.accepted_at)  return 'prep';
  if (['shipped', 'returned', 'disputed'].includes(b.status)) return 'renting';
  if (['completed', 'cancelled'].includes(b.status)) return 'done';
  return 'prep';
};

export default function OrderManagement() {
  const { t } = useTranslation();
  const [tab, setTab]         = useState('queue');
  const [bookings, setBookings] = useState([]);
  const navigate              = useNavigate();

  useEffect(() => {
    listBookings({ as: 'shop', limit: 100 })
      .then(({ data }) => setBookings(data.data.bookings))
      .catch(() => {});
  }, []);

  const shown = bookings.filter((b) => bucket(b) === tab);
  const newCount = bookings.filter((b) => bucket(b) === 'queue').length;

  return (
    <AppShell>
      <div className="px-4 pt-5">
        <div className="mb-5">
          <p className="text-xs text-gray-400">{t('seller.storeManagement')}</p>
          <h2 className="text-xl font-bold text-gray-900">{t('seller.actionCenter')}</h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto hide-scrollbar">
          {TABS.map((x) => (
            <button key={x.key} onClick={() => setTab(x.key)}
              className={`relative flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === x.key ? 'bg-brand-purple text-white' : 'border border-gray-200 bg-white text-gray-600'
              }`}>
              {t(x.label)}
              {x.key === 'queue' && newCount > 0 && (
                <span className="ml-1 rounded-full bg-brand-pink px-1.5 text-[10px] font-bold text-white">{newCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Order cards */}
        <div className="space-y-3">
          {shown.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <span className="text-4xl mb-3">📋</span>
              <p className="text-sm text-gray-400">{t('seller.noOrdersCategory')}</p>
            </div>
          ) : shown.map((b) => (
            <div key={b.id} onClick={() => navigate(`/seller/orders/${b.id}`)}
              className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm cursor-pointer active:bg-gray-50">
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl">
                <ProductImage item={{ image_urls: b.image_urls, name: b.item_name }} emojiClassName="text-2xl" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-bold text-gray-800 truncate pr-2">{b.item_name}</p>
                  <Badge status={b.status} />
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="text-xs text-gray-400">{t('seller.customerLabel')} {b.renter_name}</p>
                  {b.renter_trust_score != null && (
                    <span className="text-[11px] font-semibold text-amber-600">🛡️ {Number(b.renter_trust_score).toFixed(1)}</span>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  {b.rental_start && b.rental_end
                    ? `${format(new Date(b.rental_start), 'MMM d')} – ${format(new Date(b.rental_end), 'MMM d')}` : '—'}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-brand-purple">฿{b.total_amount}</span>
                  {bucket(b) === 'queue' && (
                    <span className="rounded-full bg-brand-light px-2.5 py-0.5 text-[11px] font-semibold text-brand-purple">{t('seller.tapAcceptReject')}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
