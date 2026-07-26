import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Shield, CheckCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from '@/components/ui/Button';
import { getBooking } from '@/api/bookings';
import { format } from 'date-fns';
import logoWordmark from '@/assets/logo-wordmark.png';

export default function PaymentSuccess() {
  const { t } = useTranslation();
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    getBooking(bookingId).then(({ data }) => setBooking(data.data.booking)).catch(() => {});
  }, [bookingId]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col bg-white px-6">
      {/* Close */}
      <div className="flex justify-between pt-14">
        <img src={logoWordmark} alt="Cosaki" className="h-7 w-auto" />
        <button onClick={() => navigate('/home')}><X size={22} className="text-gray-500" /></button>
      </div>

      {/* Success icon */}
      <div className="mt-10 flex justify-center">
        <div className="flex h-36 w-36 items-center justify-center rounded-3xl bg-green-50">
          <CheckCircle size={72} className="text-green-500" strokeWidth={1.5} />
        </div>
      </div>

      <h1 className="mt-6 text-center text-3xl font-bold text-gray-900">{t('payment.successTitle')}</h1>
      <p className="mt-2 text-center text-sm text-gray-500">{t('payment.successDesc')}</p>

      {/* Order card */}
      {booking && (
        <div className="mt-6 rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400 uppercase tracking-wider">{t('payment.orderRef')}</span>
            <span className="font-bold text-brand-purple">#CSK-{booking.id.slice(0,8).toUpperCase()}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">{t('payment.rentalPeriod')}</p>
              <p className="mt-1 text-sm font-semibold text-gray-800 flex items-center gap-1">
                📅 {booking.rental_start ? format(new Date(booking.rental_start), 'MMM d') : '—'} – {booking.rental_end ? format(new Date(booking.rental_end), 'MMM d') : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">{t('payment.totalPaid')}</p>
              <p className="mt-1 text-sm font-semibold text-gray-800 flex items-center gap-1">
                💳 ฿{booking.total_amount}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3">
            <Shield size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-700">{t('payment.protectionActive')}</p>
              <p className="text-xs text-amber-600 mt-0.5">{t('payment.protectionDesc')}</p>
            </div>
          </div>
        </div>
      )}

      <Button className="mt-6 w-full" onClick={() => navigate(`/bookings/${bookingId}/tracking`)}>
        {t('payment.trackOrder')}
      </Button>
      <Button variant="secondary" className="mt-3 w-full" onClick={() => navigate('/home')}>
        {t('payment.backHome')}
      </Button>

      <p className="mt-4 mb-8 text-center text-xs text-gray-400">{t('payment.emailSent')}</p>
    </div>
  );
}
