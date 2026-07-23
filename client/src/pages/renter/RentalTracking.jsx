import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package, Truck, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react';
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
  { key: 'escrowed',  label: 'Payment Confirmed',  icon: CheckCircle, desc: 'Escrow secured' },
  { key: 'shipped',   label: 'Item Shipped',         icon: Truck,        desc: 'On the way to you' },
  { key: 'returned',  label: 'Item Returned',        icon: Package,      desc: 'Awaiting inspection' },
  { key: 'completed', label: 'Completed',            icon: CheckCircle,  desc: 'Escrow released' },
];

const ORDER = ['escrowed','shipped','returned','completed'];

export default function RentalTracking() {
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
      toast.success('ชำระบิลค่าปรับแล้ว');
    } catch (err) {
      toast.error(err.response?.data?.message || 'ชำระไม่สำเร็จ');
    }
  };

  const currentIdx = booking ? ORDER.indexOf(booking.status) : -1;

  const handleDispute = async () => {
    const reason = window.prompt('Describe the issue:');
    if (!reason) return;
    try {
      await createDispute(bookingId, reason);
      toast.success('Dispute opened — our team will review within 24h');
      setBooking((b) => ({ ...b, status: 'disputed' }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not open dispute');
    }
  };

  const handlePayBalance = async () => {
    try {
      setLoading(true);
      await payBalance(bookingId);
      const { data } = await getBooking(bookingId);
      setBooking(data.data.booking);
      toast.success('ชำระยอดคงเหลือสำเร็จ');
    } catch (err) {
      toast.error(err.response?.data?.message || 'ชำระไม่สำเร็จ');
    } finally { setLoading(false); }
  };

  const handleCancel = async () => {
    if (!window.confirm('ยกเลิกการจอง? ค่าจองคิว ฿100 ไม่คืน')) return;
    try {
      const { data } = await cancelBooking(bookingId);
      toast.success(`ยกเลิกแล้ว — คืนเงิน ฿${Number(data.data.refunded).toFixed(2)}`);
      setBooking((b) => ({ ...b, status: 'cancelled' }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'ยกเลิกไม่สำเร็จ');
    }
  };

  const handleConfirmReturn = async () => {
    try {
      setLoading(true);
      await updateStatus(bookingId, 'returned');
      setBooking((b) => ({ ...b, status: 'returned' }));
      toast.success('Return confirmed!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
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
      <PageHeader title="Rental Tracking" />
      <div className="px-4 pb-10 space-y-4">

        {/* Order card */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Order</p>
              <p className="font-bold text-brand-purple">#CSK-{booking.id.slice(0,8).toUpperCase()}</p>
            </div>
            <Badge status={booking.status} label={booking.status.replace('_',' ').toUpperCase()} />
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
          <p className="mb-4 text-sm font-semibold text-gray-700">Shipment Status</p>
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
                    <p className={`text-sm font-semibold ${done ? 'text-gray-800' : 'text-gray-400'}`}>{step.label}</p>
                    <p className={`text-xs mt-0.5 ${current ? 'text-brand-purple font-medium' : 'text-gray-400'}`}>{step.desc}</p>
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
              Confirm Item Received
            </Button>
            <button onClick={() => navigate(`/bookings/${bookingId}/return-upload`)}
              className="flex w-full items-center justify-between rounded-2xl bg-white p-4 shadow-sm text-sm font-medium text-gray-700">
              Upload Return Photos <ChevronRight size={16} className="text-gray-400" />
            </button>
          </div>
        )}

        {booking.status === 'disputed' && (
          <div className="rounded-2xl bg-red-50 p-4 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Dispute Under Review</p>
              <p className="text-xs text-red-500 mt-0.5">Our team will resolve this within 24–48 hours.</p>
            </div>
          </div>
        )}

        {/* Pending penalty bills (§3.4) */}
        {bills.map((bill) => (
          <div key={bill.id} className="rounded-2xl bg-red-50 border border-red-100 p-4">
            <p className="text-sm font-semibold text-red-700">🧾 บิลค่าปรับ ฿{Number(bill.amount).toFixed(2)}</p>
            <p className="text-xs text-red-500 mt-0.5">{bill.reason}</p>
            <Button className="mt-3 w-full" onClick={() => handlePayBill(bill.id)}>ชำระค่าปรับ</Button>
          </div>
        ))}

        {/* Reserved — balance due */}
        {booking.status === 'pending_payment' && Number(booking.balance_due) > 0 && (
          <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
            <p className="text-sm font-semibold text-amber-800">จองคิวแล้ว — ค้างชำระ ฿{Number(booking.balance_due).toFixed(2)}</p>
            <p className="text-xs text-amber-600 mt-0.5">ต้องชำระให้ครบก่อนวันจัดส่ง</p>
            <Button className="mt-3 w-full" loading={loading} onClick={handlePayBalance}>จ่ายส่วนที่เหลือ</Button>
          </div>
        )}

        {booking.status === 'completed' && (
          <Button className="w-full" onClick={() => navigate(`/bookings/${bookingId}/review`)}>
            Leave a Review
          </Button>
        )}

        {/* Cancel / reschedule (before shipping) */}
        {['pending_payment', 'escrowed'].includes(booking.status) && (
          <div className="flex gap-2">
            {!booking.reschedule_used && (
              <button onClick={() => navigate(`/items/${booking.item_id}/dates`, { state: { rescheduleBookingId: bookingId } })}
                className="flex-1 rounded-2xl border border-gray-200 bg-white py-3 text-sm font-medium text-gray-700">
                เลื่อนคิว (ฟรี 1 ครั้ง)
              </button>
            )}
            <button onClick={handleCancel} className="flex-1 rounded-2xl border border-red-200 bg-white py-3 text-sm font-medium text-red-500">
              ยกเลิกการจอง
            </button>
          </div>
        )}

        {['escrowed','shipped','returned'].includes(booking.status) && (
          <button onClick={handleDispute} className="w-full text-center text-sm font-semibold text-red-500 py-2">
            Report an Issue
          </button>
        )}
      </div>
    </div>
  );
}
