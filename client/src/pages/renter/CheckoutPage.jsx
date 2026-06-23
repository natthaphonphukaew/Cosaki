import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, Shield, Lock } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import ProductImage from '@/components/ui/ProductImage';
import { getBooking } from '@/api/bookings';
import { createCharge } from '@/api/payments';
import useAuthStore from '@/store/authStore';
import toast from 'react-hot-toast';
import { format, differenceInCalendarDays } from 'date-fns';

export default function CheckoutPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [booking, setBooking] = useState(null);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getBooking(bookingId).then(({ data }) => setBooking(data.data.booking));
  }, [bookingId]);

  const handlePay = async () => {
    if (!address.trim()) return toast.error('Please enter a shipping address');
    try {
      setLoading(true);
      await createCharge(bookingId, 'mock_token');
      navigate(`/bookings/${bookingId}/success`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  if (!booking) return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
    </div>
  );

  const start = booking.rental_start ? format(new Date(booking.rental_start), 'MMM d') : '—';
  const end   = booking.rental_end   ? format(new Date(booking.rental_end),   'MMM d') : '—';
  const days  = booking.rental_start && booking.rental_end
    ? differenceInCalendarDays(new Date(booking.rental_end), new Date(booking.rental_start))
    : 0;

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title="Checkout" />
      <div className="px-4 pb-28 space-y-4">
        {/* Shipping address */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Shipping Address</p>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={16} className="text-brand-purple flex-shrink-0" />
              <p className="text-sm font-semibold text-gray-800">{user?.display_name || 'Recipient'}</p>
            </div>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter your full shipping address..."
              className="w-full resize-none rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none focus:border-brand-purple"
            />
          </div>
        </div>

        {/* Order */}
        <div className="rounded-2xl bg-white p-4 shadow-sm flex gap-3 items-center">
          <div className="h-14 w-14 overflow-hidden rounded-xl flex-shrink-0">
            <ProductImage item={{ image_urls: booking.image_urls, name: booking.item_name }} emojiClassName="text-2xl" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{booking.item_name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{days}-Day Rental • {start} – {end}</p>
          </div>
        </div>

        {/* Payment summary */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Payment Summary</p>
          <div className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Rental Fee</span>
              <span className="font-medium">${booking.rental_fee}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Shipping & Handling</span>
              <span className="font-medium">${booking.shipping_fee || '0.00'}</span>
            </div>
            {/* Escrow row */}
            <div className="flex items-center justify-between rounded-xl bg-purple-50 px-3 py-2">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-brand-purple" />
                <span className="text-sm text-brand-purple font-medium">Refundable Escrow Deposit</span>
              </div>
              <span className="text-sm font-semibold text-brand-purple">${booking.deposit_amount}</span>
            </div>
            <div className="border-t border-gray-100 pt-3 flex justify-between">
              <span className="font-semibold text-gray-800">Total Amount</span>
              <span className="text-lg font-bold text-brand-purple">${booking.total_amount}</span>
            </div>
          </div>
        </div>

        {/* Trust note */}
        <div className="flex items-center justify-center gap-2 text-xs text-green-600 font-medium">
          <Shield size={14} /> 100% SECURE PAYMENT
        </div>

        <p className="text-center text-xs text-gray-400">
          By clicking Pay Now, you agree to our Rental Agreement and confirm the selected dates
        </p>
      </div>

      {/* Sticky pay button */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 border-t border-gray-100 bg-white p-4">
        <Button className="w-full" onClick={handlePay} loading={loading} icon={<Lock size={16} />}>
          Pay Now
        </Button>
      </div>
    </div>
  );
}
