import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/layout/PageHeader';
import Badge from '@/components/ui/Badge';
import ProductImage from '@/components/ui/ProductImage';
import { CardSkeleton } from '@/components/ui/Skeleton';
import ErrorState from '@/components/ui/ErrorState';
import { listBookings } from '@/api/bookings';
import { format, parseISO } from 'date-fns';

const TABS = [
  { key: 'Active',    label: 'rentals.tabActive',    statuses: ['escrowed', 'shipped', 'returned', 'pending_payment', 'pending_kyc'] },
  { key: 'Completed', label: 'rentals.tabCompleted', statuses: ['completed'] },
  { key: 'Cancelled', label: 'rentals.tabCancelled', statuses: ['cancelled'] },
];

export default function MyRentals() {
  const { t } = useTranslation();
  const [tab, setTab]           = useState('Active');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const navigate                = useNavigate();

  const load = () => {
    setLoading(true); setError(false);
    listBookings({ as: 'renter', limit: 30 })
      .then(({ data }) => {
        const statuses = TABS.find((x) => x.key === tab)?.statuses || [];
        setBookings(data.data.bookings.filter((b) => statuses.includes(b.status)));
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [tab]);

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title={t('header.myRentals')} />

      <div className="flex gap-2 px-4 pb-4">
        {TABS.map((x) => (
          <button key={x.key} onClick={() => setTab(x.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === x.key ? 'bg-brand-purple text-white' : 'border border-gray-200 bg-white text-gray-600'
            }`}>
            {t(x.label)}
          </button>
        ))}
      </div>

      <div className="px-4 pb-6 space-y-3">
        {loading && <><CardSkeleton /><CardSkeleton /><CardSkeleton /></>}
        {error && <ErrorState message={t('rentals.loadFailed')} onRetry={load} />}
        {!loading && !error && bookings.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="text-5xl mb-3">🎭</span>
            <p className="font-semibold text-gray-600">{t('rentals.empty')}</p>
            {tab === 'Active' && (
              <button onClick={() => navigate('/home')} className="mt-3 text-sm font-semibold text-brand-purple">
                {t('rentals.browse')}
              </button>
            )}
          </div>
        )}
        {!loading && !error && bookings.map((b) => (
          <button key={b.id} onClick={() => navigate(`/bookings/${b.id}/tracking`)}
            className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 shadow-sm text-left active:bg-gray-50">
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl">
              <ProductImage item={{ image_urls: b.image_urls, name: b.item_name }} emojiClassName="text-2xl" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-gray-800">{b.item_name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{b.shop_name}</p>
              <p className="text-xs text-gray-400">
                {b.rental_start && format(parseISO(b.rental_start), 'd MMM')} – {b.rental_end && format(parseISO(b.rental_end), 'd MMM')}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Badge status={b.status} />
                <span className="text-xs font-bold text-brand-purple">฿{b.total_amount}</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
