import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package, Truck, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ProductImage from '@/components/ui/ProductImage';
import { getBooking, updateStatus, cancelBooking } from '@/api/bookings';
import { payBalance } from '@/api/payments';
import { createDispute } from '@/api/disputes';
import { listBills, payBill } from '@/api/bills';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const STEPS = [
  { key: 'escrowed',  label: 'tracking.paymentConfirmed', icon: CheckCircle, desc: 'tracking.escrowSecured' },
  { key: 'shipped',   label: 'tracking.itemShipped',      icon: Truck,       desc: 'tracking.onTheWay' },
  { key: 'returned',  label: 'tracking.itemReturned',     icon: Package,     desc: 'tracking.awaitInspect' },
  { key: 'completed', label: 'tracking.completedStep',    icon: CheckCircle, desc: 'tracking.escrowReleased' },
];

const ORDER = ['escrowed','shipped','returned','completed'];

export default function RentalTracking() {
  const { t } = useTranslation();
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [bills, setBills]     = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getBooking(bookingId).then(({ data }) => setBooking(data.data.booking));
    listBills().then(({ data }) =>
      setBills(data.data.bills.filter((b) => b.booking_id === bookingId && b.status === 'pending'))
    ).catch(() => {});
  }, [bookingId]);

  const handlePayBill = async (billId) => {
    try {
      await payBill(billId);
      setBills((list) => list.filter((b) => b.id !== billId));
      toast.success(t('tracking.billPaid'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('tracking.payFailed'));
    }
  };

  const currentIdx = booking ? ORDER.indexOf(booking.status) : -1;

  const handleDispute = async () => {
    const reason = window.prompt(t('tracking.describeIssue'));
    if (!reason) return;
    try {
      await createDispute(bookingId, reason);
      toast.success(t('tracking.disputeOpened'));
      setBooking((b) => ({ ...b, status: 'disputed' }));
    } catch (err) {
      toast.error(err.response?.data?.message || t('tracking.disputeFailed'));
    }
  };

  const handlePayBalance = async () => {
    try {
      setLoading(true);
      await payBalance(bookingId);
      const { data } = await getBooking(bookingId);
      setBooking(data.data.booking);
      toast.success(t('tracking.balancePaid'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('tracking.payFailed'));
    } finally { setLoading(false); }
  };

  const handleCancel = async () => {
    if (!window.confirm(t('tracking.cancelConfirm'))) return;
    try {
      const { data } = await cancelBooking(bookingId);
      toast.success(t('tracking.cancelledRefund', { amount: Number(data.data.refunded).toFixed(2) }));
      setBooking((b) => ({ ...b, status: 'cancelled' }));
    } catch (err) {
      toast.error(err.response?.data?.message || t('tracking.cancelFailed'));
    }
  };

  const handleConfirmReturn = async () => {
    try {
      setLoading(true);
      await updateStatus(bookingId, 'returned');
      setBooking((b) => ({ ...b, status: 'returned' }));
      toast.success(t('tracking.returnConfirmed'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  if (!booking) return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
    </div>
  );

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title={t('header.tracking')} />
      <div className="px-4 pb-10 space-y-4">

        {/* Order card */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">{t('tracking.order')}</p>
              <p className="font-bold text-brand-purple">#CSK-{booking.id.slice(0,8).toUpperCase()}</p>
            </div>
            <Badge status={booking.status} />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-14 w-14 overflow-hidden rounded-xl flex-shrink-0">
              <ProductImage item={{ image_urls: booking.image_urls, name: booking.item_name }} emojiClassName="text-2xl" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{booking.item_name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {booking.rental_start && format(new Date(booking.rental_start), 'MMM d')} –{' '}
                {booking.rental_end   && format(new Date(booking.rental_end),   'MMM d')}
              </p>
            </div>
          </div>
        </div>

        {/* Progress steps */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-4 text-sm font-semibold text-gray-700">{t('tracking.shipmentStatus')}</p>
          <div className="space-y-4">
            {STEPS.map((step, i) => {
              const done    = currentIdx >= i;
              const current = currentIdx === i;
              return (
                <div key={step.key} className="flex items-start gap-3">
                  <div className={`relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full
                    ${done ? 'bg-brand-purple' : 'bg-gray-100'}`}>
                    <step.icon size={15} className={done ? 'text-white' : 'text-gray-400'} />
                    {i < STEPS.length - 1 && (
                      <div className={`absolute top-8 left-1/2 -translate-x-1/2 w-0.5 h-4
                        ${done && currentIdx > i ? 'bg-brand-purple' : 'bg-gray-200'}`} />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className={`text-sm font-semibold ${done ? 'text-gray-800' : 'text-gray-400'}`}>{t(step.label)}</p>
                    <p className={`text-xs mt-0.5 ${current ? 'text-brand-purple font-medium' : 'text-gray-400'}`}>{t(step.desc)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        {booking.status === 'shipped' && (
          <div className="space-y-3">
            <Button className="w-full" onClick={handleConfirmReturn} loading={loading}>
              {t('tracking.confirmReceived')}
            </Button>
            <button onClick={() => navigate(`/bookings/${bookingId}/return-upload`)}
              className="flex w-full items-center justify-between rounded-2xl bg-white p-4 shadow-sm text-sm font-medium text-gray-700">
              {t('tracking.uploadPhotos')} <ChevronRight size={16} className="text-gray-400" />
            </button>
          </div>
        )}

        {booking.status === 'disputed' && (
          <div className="rounded-2xl bg-red-50 p-4 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">{t('tracking.disputeReview')}</p>
              <p className="text-xs text-red-500 mt-0.5">{t('tracking.disputeReviewDesc')}</p>
            </div>
          </div>
        )}

        {/* Pending penalty bills (§3.4) */}
        {bills.map((bill) => (
          <div key={bill.id} className="rounded-2xl bg-red-50 border border-red-100 p-4">
            <p className="text-sm font-semibold text-red-700">{t('tracking.penaltyBillAmount', { amount: Number(bill.amount).toFixed(2) })}</p>
            <p className="text-xs text-red-500 mt-0.5">{bill.reason}</p>
            <Button className="mt-3 w-full" onClick={() => handlePayBill(bill.id)}>{t('tracking.payBill')}</Button>
          </div>
        ))}

        {/* Reserved — balance due */}
        {booking.status === 'pending_payment' && Number(booking.balance_due) > 0 && (
          <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
            <p className="text-sm font-semibold text-amber-800">{t('tracking.reservedBalance', { amount: Number(booking.balance_due).toFixed(2) })}</p>
            <p className="text-xs text-amber-600 mt-0.5">{t('tracking.payBeforeShip')}</p>
            <Button className="mt-3 w-full" loading={loading} onClick={handlePayBalance}>{t('tracking.payBalance')}</Button>
          </div>
        )}

        {booking.status === 'completed' && (
          <Button className="w-full" onClick={() => navigate(`/bookings/${bookingId}/review`)}>
            {t('tracking.leaveReview')}
          </Button>
        )}

        {/* Cancel / reschedule (before shipping) */}
        {['pending_payment', 'escrowed'].includes(booking.status) && (
          <div className="flex gap-2">
            {!booking.reschedule_used && (
              <button onClick={() => navigate(`/items/${booking.item_id}/dates`, { state: { rescheduleBookingId: bookingId } })}
                className="flex-1 rounded-2xl border border-gray-200 bg-white py-3 text-sm font-medium text-gray-700">
                {t('tracking.rescheduleFree')}
              </button>
            )}
            <button onClick={handleCancel} className="flex-1 rounded-2xl border border-red-200 bg-white py-3 text-sm font-medium text-red-500">
              {t('tracking.cancel')}
            </button>
          </div>
        )}

        {['escrowed','shipped','returned'].includes(booking.status) && (
          <button onClick={handleDispute} className="w-full text-center text-sm font-semibold text-red-500 py-2">
            {t('tracking.reportProblem')}
          </button>
        )}
      </div>
    </div>
  );
}
