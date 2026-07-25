import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Package, CreditCard, Truck, CheckCircle, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/layout/PageHeader';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { listNotifications, markAllRead } from '@/api/notifications';
import { formatDistanceToNow } from 'date-fns';

const ICON = {
  booking_new:      { icon: Package,     color: 'text-brand-purple bg-brand-light' },
  payment_received: { icon: CreditCard,  color: 'text-green-600 bg-green-100' },
  shipped:          { icon: Truck,       color: 'text-blue-600 bg-blue-100' },
  returned:         { icon: Package,     color: 'text-amber-600 bg-amber-100' },
  completed:        { icon: CheckCircle, color: 'text-green-600 bg-green-100' },
  dispute:          { icon: AlertTriangle, color: 'text-red-600 bg-red-100' },
};

export default function NotificationsPage() {
  const { t } = useTranslation();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    listNotifications()
      .then(({ data }) => setItems(data.data.notifications))
      .catch(() => {})
      .finally(() => setLoading(false));
    // Mark everything read when the page opens.
    markAllRead().catch(() => {});
  }, []);

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title={t('header.notifications')} />
      <div className="px-4 pb-10 space-y-2">
        {loading && <><CardSkeleton /><CardSkeleton /><CardSkeleton /></>}

        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center py-20 text-center">
            <Bell size={44} className="mb-3 text-gray-300" />
            <p className="font-semibold text-gray-600">{t('notifications.empty')}</p>
            <p className="mt-1 text-sm text-gray-400">{t('notifications.emptyDesc')}</p>
          </div>
        )}

        {!loading && items.map((n) => {
          const meta = ICON[n.type] || { icon: Bell, color: 'text-gray-500 bg-gray-100' };
          const Icon = meta.icon;
          return (
            <button
              key={n.id}
              onClick={() => n.booking_id && navigate(`/bookings/${n.booking_id}/tracking`)}
              className={`flex w-full items-start gap-3 rounded-2xl p-4 text-left shadow-sm ${n.is_read ? 'bg-white' : 'bg-brand-light/40'}`}
            >
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${meta.color}`}>
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{n.title}</p>
                {n.body && <p className="mt-0.5 text-xs text-gray-500">{n.body}</p>}
                <p className="mt-1 text-[11px] text-gray-400">
                  {n.created_at && formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </p>
              </div>
              {!n.is_read && <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-brand-pink" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
