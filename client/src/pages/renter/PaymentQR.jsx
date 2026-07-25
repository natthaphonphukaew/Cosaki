import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import { createCharge } from '@/api/payments';
import toast from 'react-hot-toast';

// Deterministic QR-like pattern (mock — not a scannable code) from a seed string.
function fakeQr(seed) {
  let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const N = 21, cells = [];
  for (let i = 0; i < N * N; i++) { h = (h * 1103515245 + 12345) & 0x7fffffff; cells.push((h >> 8) & 1); }
  // Force finder-pattern corners so it reads as a QR.
  const corner = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= N - 7) || (r >= N - 7 && c < 7);
  return { N, cells, corner };
}

const STEPS = ['payment.step0', 'payment.step1', 'payment.step2'];

export default function PaymentQR() {
  const { t } = useTranslation();
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const payMode = state?.payMode || 'full';
  const amount = state?.amount;
  const shippingAddressId = state?.shipping_address_id || null;
  const [stage, setStage] = useState(0);   // 0 waiting, 1 paid, 2 confirmed
  const [loading, setLoading] = useState(false);
  const ref = `CSK-${bookingId.slice(0, 8).toUpperCase()}`;
  const { N, cells, corner } = fakeQr(bookingId);

  const handlePaid = async () => {
    try {
      setLoading(true);
      await createCharge(bookingId, payMode, shippingAddressId);   // mock webhook confirms payment
      setStage(1);
      setTimeout(() => setStage(2), 900);            // simulate shop auto-confirm
      setTimeout(() => navigate(`/bookings/${bookingId}/success`), 1700);
    } catch (err) {
      toast.error(err.response?.data?.message || t('payment.failed'));
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title={t('header.paymentQr')} />
      <div className="px-4 pt-4 space-y-4">
        {/* QR card */}
        <div className="rounded-2xl bg-white p-5 shadow-sm text-center">
          <div className="mx-auto mb-3 w-fit rounded-lg bg-[#003d6a] px-4 py-1.5 text-sm font-bold text-white">PromptPay</div>
          <div className="mx-auto grid w-52 gap-0 rounded-lg border-4 border-gray-900 p-2"
            style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }}>
            {cells.map((v, i) => {
              const r = Math.floor(i / N), c = i % N;
              const on = corner(r, c) ? ((r % 6 < 5) && (c % 6 < 5)) : v;
              return <div key={i} className={on ? 'bg-gray-900' : 'bg-white'} style={{ aspectRatio: '1' }} />;
            })}
          </div>
          <p className="mt-3 text-xs text-gray-400">{t('payment.account')}</p>
          <p className="mt-1 text-3xl font-bold text-brand-purple">฿{Number(amount || 0).toFixed(2)}</p>
          <p className="text-xs text-gray-400">{t('payment.ref', { ref })}</p>
        </div>

        {/* Webhook status stepper */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-gray-700">{t('payment.statusRealtime')}</p>
          <div className="space-y-3">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full ${stage >= i ? 'bg-brand-purple text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {stage > i ? <CheckCircle size={15} /> : stage === i && loading ? <Loader size={14} className="animate-spin" /> : i + 1}
                </div>
                <span className={`text-sm ${stage >= i ? 'font-medium text-gray-800' : 'text-gray-400'}`}>{t(s)}</span>
              </div>
            ))}
          </div>
        </div>

        {stage === 0 && (
          <Button className="w-full" loading={loading} onClick={handlePaid}>{t('payment.paidDemo')}</Button>
        )}
        {stage > 0 && (
          <p className="text-center text-sm font-medium text-green-600">{t('payment.goingNext')}</p>
        )}
      </div>
    </div>
  );
}
