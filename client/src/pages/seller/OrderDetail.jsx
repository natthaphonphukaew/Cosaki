import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package, Truck, CheckCircle, User, Calendar, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ProductImage from '@/components/ui/ProductImage';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import { getBooking, updateStatus, acceptBooking, rejectBooking } from '@/api/bookings';
import { createBill } from '@/api/bills';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

// Next action the shop can take once the queue is accepted.
const NEXT_ACTION = {
  escrowed: { to: 'shipped',   label: 'seller.order.markShipped',   icon: Truck },
  shipped:  { to: 'returned',  label: 'seller.order.markReturned',  icon: Package },
  returned: { to: 'completed', label: 'seller.order.inspectRelease', icon: CheckCircle },
};

export default function OrderDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [acting, setActing]   = useState(false);

  const load = () => {
    setLoading(true); setError(false);
    getBooking(id)
      .then(({ data }) => setBooking(data.data.booking))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const advance = async (to) => {
    try {
      setActing(true);
      const { data } = await updateStatus(id, to);
      setBooking((b) => ({ ...b, status: data.data.booking.status }));
      toast.success(t('seller.order.orderUpdated'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('seller.order.updateFailed'));
    } finally {
      setActing(false);
    }
  };

  const handleAccept = async () => {
    try {
      setActing(true);
      await acceptBooking(id);
      setBooking((b) => ({ ...b, accepted_at: new Date().toISOString() }));
      toast.success(t('seller.order.acceptedReady'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('seller.order.acceptFailed'));
    } finally { setActing(false); }
  };

  const handleReject = async () => {
    if (!window.confirm(t('seller.order.rejectConfirm'))) return;
    try {
      setActing(true);
      await rejectBooking(id, t('seller.order.rejectReason'));
      setBooking((b) => ({ ...b, status: 'cancelled' }));
      toast.success(t('seller.order.rejectedRefunded'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('seller.order.rejectFailed'));
    } finally { setActing(false); }
  };

  const needsAcceptance = booking?.status === 'escrowed' && !booking?.accepted_at;

  // Generate a penalty bill (§3.4) — sent straight to the renter's screen.
  const handleBill = async () => {
    const amount = window.prompt(t('seller.order.billAmountPrompt'));
    if (!amount) return;
    const reason = window.prompt(t('seller.order.billReasonPrompt'));
    if (!reason) return;
    try {
      await createBill(id, Number(amount), reason);
      toast.success(t('seller.order.billSent', { amount: Number(amount).toFixed(2) }));
    } catch (err) {
      toast.error(err.response?.data?.message || t('seller.order.billFailed'));
    }
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-surface-base"><Spinner /></div>
  );
  if (error || !booking) return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title={t('header.orderDetail')} />
      <ErrorState message={t('seller.order.loadFailed')} onRetry={load} />
    </div>
  );

  const action = NEXT_ACTION[booking.status];

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title={t('header.orderDetail')} />

      <div className="px-4 pb-32 space-y-4">
        {/* Item */}
        <div className="flex gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl">
            <ProductImage item={{ image_urls: booking.image_urls, name: booking.item_name }} emojiClassName="text-3xl" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold text-gray-900">{booking.item_name}</p>
              <Badge status={booking.status} />
            </div>
            <p className="mt-1 text-xs text-gray-400">{t('seller.order.orderNumPrefix')}{String(booking.id).slice(0, 8)}</p>
            <p className="mt-2 text-lg font-bold text-brand-purple">฿{booking.total_amount}</p>
          </div>
        </div>

        {/* Renter */}
        <div className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-light">
              <User size={16} className="text-brand-purple" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-400">{t('seller.order.renter')}</p>
              <p className="text-sm font-semibold text-gray-800">{booking.renter_name || '—'}</p>
            </div>
            {booking.renter_trust_score != null && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                🛡️ {Number(booking.renter_trust_score).toFixed(1)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-light">
              <Calendar size={16} className="text-brand-purple" />
            </div>
            <div>
              <p className="text-xs text-gray-400">{t('seller.order.rentalPeriod')}</p>
              <p className="text-sm font-semibold text-gray-800">
                {booking.rental_start && format(parseISO(booking.rental_start), 'MMM d')} –{' '}
                {booking.rental_end && format(parseISO(booking.rental_end), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
        </div>

        {/* Payment breakdown */}
        <div className="rounded-2xl bg-white p-4 shadow-sm space-y-2">
          <p className="text-sm font-semibold text-gray-800">{t('seller.order.payment')}</p>
          <Row label={t('seller.order.rentalFee')} value={`฿${booking.rental_fee}`} />
          <Row label={t('seller.order.protectionFee')} value={`฿${booking.cosaki_fee}`} />
          {booking.shipping_fee != null && <Row label={t('seller.order.shippingFee')} value={`฿${booking.shipping_fee}`} />}
          <Row label={t('seller.order.bookingFee')} value={`฿${booking.booking_fee}`} />
          <div className="my-1 border-t border-gray-100" />
          <Row label={t('seller.order.customerPaid')} value={`฿${booking.total_amount}`} bold />
          <Row label={t('seller.order.shopReceives')} value={`฿${booking.seller_payout}`} />
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-purple-50 p-3">
            <ShieldCheck size={16} className="text-brand-purple" />
            <p className="text-xs text-purple-700">
              {t('seller.order.escrowNote')}
            </p>
          </div>
        </div>

        {booking.notes && (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-400 mb-1">{t('seller.order.noteFromRenter')}</p>
            <p className="text-sm text-gray-700">{booking.notes}</p>
          </div>
        )}
      </div>

      {/* Footer action */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 border-t border-gray-100 bg-white p-4 space-y-2">
        {needsAcceptance ? (
          <>
            <p className="text-center text-xs text-gray-400">{t('seller.order.newOrderHint')}</p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" loading={acting} onClick={handleReject}>{t('seller.order.rejectQueue')}</Button>
              <Button className="flex-1" loading={acting} onClick={handleAccept}>{t('seller.order.acceptQueue')}</Button>
            </div>
          </>
        ) : action ? (
          <Button className="w-full" loading={acting} icon={<action.icon size={18} />} onClick={() => advance(action.to)}>
            {t(action.label)}
          </Button>
        ) : (
          <p className="py-2 text-center text-sm text-gray-400">{t('seller.order.noActions')}</p>
        )}
        {['shipped','returned','disputed','completed'].includes(booking.status) && (
          <button onClick={handleBill} className="w-full rounded-full border border-amber-300 bg-amber-50 py-2.5 text-sm font-semibold text-amber-700">
            {t('seller.order.generateBill')}
          </button>
        )}
        {['escrowed','shipped'].includes(booking.status) && !needsAcceptance && (
          <Button variant="secondary" className="w-full" onClick={() => navigate(`/seller/disputes/${booking.id}`)}>
            {t('seller.order.reportIssue')}
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex justify-between text-sm">
      <span className={bold ? 'font-bold text-gray-900' : 'text-gray-500'}>{label}</span>
      <span className={bold ? 'font-bold text-brand-purple' : 'text-gray-700'}>{value}</span>
    </div>
  );
}
