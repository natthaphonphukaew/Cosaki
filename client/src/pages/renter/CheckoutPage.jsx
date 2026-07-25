import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Shield, Lock, Tag, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import ProductImage from '@/components/ui/ProductImage';
import { getBooking, applyCoupon } from '@/api/bookings';
import { listAddresses } from '@/api/addresses';
import useAuthStore from '@/store/authStore';
import toast from 'react-hot-toast';
import { format, differenceInCalendarDays } from 'date-fns';

export default function CheckoutPage() {
  const { t } = useTranslation();
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [booking, setBooking] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [pickOpen, setPickOpen] = useState(false);
  const [coupon, setCoupon]   = useState('');
  const [payMode, setPayMode] = useState('full'); // full | deposit
  const [applying, setApplying] = useState(false);

  const load = () => getBooking(bookingId).then(({ data }) => {
    setBooking(data.data.booking);
    setCoupon(data.data.booking.coupon_code || '');
  });
  useEffect(() => { load(); }, [bookingId]);

  // Load the renter's saved addresses; preselect the default. Re-runs on focus so
  // an address added on /addresses/new shows up when they come back.
  const loadAddresses = () => listAddresses().then(({ data }) => {
    const list = data.data.addresses;
    setAddresses(list);
    setSelectedId((cur) => cur || list.find((a) => a.is_default)?.id || list[0]?.id || null);
  }).catch(() => {});
  useEffect(() => {
    loadAddresses();
    const onFocus = () => loadAddresses();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const selectedAddress = addresses.find((a) => a.id === selectedId) || null;

  const handleApplyCoupon = async () => {
    try {
      setApplying(true);
      const { data } = await applyCoupon(bookingId, coupon.trim());
      setBooking((b) => ({ ...b, ...data.data.booking }));
      toast.success(coupon.trim() ? t('checkout.couponApplied', { amount: data.data.discount }) : t('checkout.couponRemoved'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('checkout.couponFailed'));
    } finally { setApplying(false); }
  };

  if (!booking) return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
    </div>
  );

  const start = booking.rental_start ? format(new Date(booking.rental_start), 'MMM d') : '—';
  const end   = booking.rental_end   ? format(new Date(booking.rental_end),   'MMM d') : '—';
  const days  = booking.rental_start && booking.rental_end
    ? differenceInCalendarDays(new Date(booking.rental_end), new Date(booking.rental_start)) : 0;
  const total   = Number(booking.total_amount);
  const bookingFee = Number(booking.booking_fee || 100);
  const dueToday = payMode === 'deposit' ? bookingFee : total;
  const dueLater = payMode === 'deposit' ? total - bookingFee : 0;

  const goPay = () => {
    if (!selectedAddress) return toast.error(t('checkout.selectAddressFirst'));
    navigate(`/bookings/${bookingId}/pay`, {
      state: { payMode, amount: dueToday, shipping_address_id: selectedAddress.id },
    });
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title={t('header.checkout')} />
      <div className="px-4 pb-32 space-y-4">
        {/* Shipping address — pick from the saved address book */}
        <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><MapPin size={18} className="text-gray-400" /> {t('checkout.shippingAddress')}</h3>
            {addresses.length > 0 && (
              <button onClick={() => setPickOpen(true)} className="text-sm font-medium text-brand-purple">{t('common.change')}</button>
            )}
          </div>
          {selectedAddress ? (
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-800">{selectedAddress.recipient_name}</span>
                <span className="text-gray-300">|</span>
                <span className="text-sm text-gray-500">{selectedAddress.phone}</span>
                {selectedAddress.is_default && (
                  <span className="rounded border border-brand-pink px-1.5 py-0.5 text-[10px] font-semibold text-brand-pink">{t('checkout.default')}</span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-600">{selectedAddress.detail_line}</p>
              <p className="text-sm text-gray-600">{[selectedAddress.subdistrict, selectedAddress.district, selectedAddress.province, selectedAddress.postal_code].filter(Boolean).join(' ')}</p>
            </div>
          ) : (
            <button onClick={() => navigate('/addresses/new')}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand-purple/40 py-3 text-sm font-semibold text-brand-purple">
              <Plus size={16} /> {t('checkout.addAddress')}
            </button>
          )}
        </div>

        {/* Address picker sheet */}
        {pickOpen && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30" onClick={() => setPickOpen(false)}>
            <div className="flex max-h-[80vh] w-full max-w-[390px] flex-col rounded-t-3xl bg-white" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <h3 className="text-base font-bold text-gray-900">{t('checkout.selectAddress')}</h3>
                <button onClick={() => setPickOpen(false)} className="text-gray-400 text-lg">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-2 space-y-2">
                {addresses.map((a) => (
                  <button key={a.id} onClick={() => { setSelectedId(a.id); setPickOpen(false); }}
                    className={`w-full rounded-xl border p-3 text-left ${a.id === selectedId ? 'border-2 border-brand-purple bg-brand-light/30' : 'border-gray-200'}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">{a.recipient_name}</span>
                      <span className="text-sm text-gray-500">{a.phone}</span>
                      {a.is_default && <span className="rounded border border-brand-pink px-1.5 py-0.5 text-[10px] font-semibold text-brand-pink">ค่าเริ่มต้น</span>}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{a.detail_line} {[a.subdistrict, a.district, a.province, a.postal_code].filter(Boolean).join(' ')}</p>
                  </button>
                ))}
              </div>
              <div className="border-t border-gray-100 bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                <button onClick={() => { setPickOpen(false); navigate('/addresses/new'); }}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-brand-purple py-3 text-sm font-semibold text-brand-purple">
                  <Plus size={16} /> {t('checkout.addNewAddress')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Order */}
        <div className="rounded-2xl bg-white p-4 shadow-sm flex gap-3 items-center">
          <div className="h-14 w-14 overflow-hidden rounded-xl flex-shrink-0">
            <ProductImage item={{ image_urls: booking.image_urls, name: booking.item_name }} emojiClassName="text-2xl" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{booking.item_name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{t('checkout.dayRental', { days })} • {start} – {end}</p>
          </div>
        </div>

        {/* Coupon */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{t('checkout.coupon')}</p>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Tag size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                placeholder={t('checkout.couponPlaceholder')}
                className="h-11 w-full rounded-full border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-brand-purple" />
            </div>
            <button onClick={handleApplyCoupon} disabled={applying}
              className="flex h-11 items-center justify-center rounded-full border-2 border-brand-purple px-7 text-sm font-semibold text-brand-purple disabled:opacity-50">
              {applying ? '...' : (booking.coupon_code ? t('common.change') : t('common.apply'))}
            </button>
          </div>
        </div>

        {/* Payment mode */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{t('checkout.payMode')}</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setPayMode('full')}
              className={`rounded-xl p-3 text-left text-sm ${payMode === 'full' ? 'border-2 border-brand-purple bg-brand-light/30' : 'border border-gray-200'}`}>
              <p className="font-semibold text-gray-800">{t('checkout.payFull')}</p>
              <p className="text-xs text-gray-400">฿{total.toFixed(2)}</p>
            </button>
            <button onClick={() => setPayMode('deposit')}
              className={`rounded-xl p-3 text-left text-sm ${payMode === 'deposit' ? 'border-2 border-brand-purple bg-brand-light/30' : 'border border-gray-200'}`}>
              <p className="font-semibold text-gray-800">{t('checkout.payDeposit')}</p>
              <p className="text-xs text-gray-400">฿{bookingFee.toFixed(2)} · {t('checkout.balance', { amount: (total - bookingFee).toFixed(2) })}</p>
            </button>
          </div>
        </div>

        {/* Payment summary */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{t('checkout.summary')}</p>
          <div className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
            <Row label={t('checkout.rentalFee', { type: booking.rate_type === 'private' ? t('common.private_rate') : t('common.test_rate') })} value={booking.rental_fee} />
            <div className="flex items-center justify-between rounded-xl bg-purple-50 px-3 py-2">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-brand-purple" />
                <span className="text-sm text-brand-purple font-medium">{t('checkout.protection')}</span>
              </div>
              <span className="text-sm font-semibold text-brand-purple">฿{booking.cosaki_fee}</span>
            </div>

            {booking.is_express ? (
              <div className="flex justify-between text-sm text-amber-600">
                <span>{t('checkout.expressFee')}</span>
                <span className="font-medium text-xs rounded-full bg-amber-100 px-2 py-0.5">{t('checkout.expressCod')}</span>
              </div>
            ) : (
              <Row label={t('checkout.shipping')} value={booking.shipping_fee || 0} />
            )}

            <Row label={t('checkout.bookingFee')} value={bookingFee} />
            {Number(booking.discount) > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>{t('checkout.discount')} ({booking.coupon_code})</span>
                <span className="font-medium">−฿{booking.discount}</span>
              </div>
            )}
            <div className="border-t border-gray-100 pt-3 flex justify-between">
              <span className="font-semibold text-gray-800">{t('checkout.total')}</span>
              <span className="text-lg font-bold text-brand-purple">฿{total.toFixed(2)}</span>
            </div>
            {payMode === 'deposit' && (
              <div className="rounded-xl bg-amber-50 p-2 text-xs text-amber-700">
                {t('checkout.payToday', { today: dueToday.toFixed(2), later: dueLater.toFixed(2) })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-green-600 font-medium">
          <Shield size={14} /> {t('checkout.secured')}
        </div>
      </div>

      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 border-t border-gray-100 bg-white p-4">
        <Button className="w-full" onClick={goPay} icon={<Lock size={16} />}>
          {t('checkout.payViaQr', { amount: dueToday.toFixed(2) })}
        </Button>
      </div>
    </div>
  );
}

const Row = ({ label, value }) => (
  <div className="flex justify-between text-sm">
    <span className="text-gray-600">{label}</span>
    <span className="font-medium">฿{Number(value).toFixed(2)}</span>
  </div>
);
