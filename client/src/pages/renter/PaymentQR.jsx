import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Loader, Upload, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import { getPromptPayQr, submitSlip } from '@/api/payments';
import { uploadImage } from '@/api/uploads';
import toast from 'react-hot-toast';

export default function PaymentQR() {
  const { t } = useTranslation();
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const fileRef = useRef(null);
  const [qr, setQr]         = useState(null);
  const [amount, setAmount] = useState(state?.amount ?? null);
  const [ref, setRef]       = useState(`CSK-${bookingId.slice(0, 8).toUpperCase()}`);
  const [phase, setPhase]   = useState('loading');  // loading | ready | uploading | submitted
  const [err, setErr]       = useState(null);

  // Fetch the PromptPay QR for this booking (amount is authoritative from server).
  useEffect(() => {
    getPromptPayQr(bookingId)
      .then(({ data }) => {
        setQr(data.data.qr);
        setAmount(data.data.amount);
        setRef(data.data.ref);
        setPhase('ready');
      })
      .catch((e) => {
        setErr(e.response?.data?.message || t('payment.qrFailed'));
        setPhase('ready');
      });
  }, [bookingId]);

  const pickSlip = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setPhase('uploading');
      const { data } = await uploadImage(file, 'uploads');
      const url = data?.data?.url;
      if (!url) throw new Error('no url');
      await submitSlip(bookingId, url);
      setPhase('submitted');
    } catch (e2) {
      toast.error(e2.response?.data?.message || t('payment.slipFailed'));
      setPhase('ready');
    }
  };

  /* ── Submitted: awaiting admin confirmation ── */
  if (phase === 'submitted') return (
    <div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col items-center justify-center bg-surface-base px-6 text-center">
      <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-amber-100">
        <Clock size={52} className="text-amber-500" strokeWidth={1.5} />
      </div>
      <h2 className="text-xl font-bold text-gray-900">{t('payment.slipSubmitted')}</h2>
      <p className="mt-2 text-sm text-gray-500">{t('payment.slipSubmittedDesc')}</p>
      <Button className="mt-8 w-full" onClick={() => navigate('/rentals')}>{t('payment.backToRentals')}</Button>
    </div>
  );

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title={t('header.paymentQr')} />
      <div className="px-4 pt-4 space-y-4">
        {/* QR card */}
        <div className="rounded-2xl bg-white p-5 shadow-sm text-center">
          <div className="mx-auto mb-3 w-fit rounded-lg bg-[#003d6a] px-4 py-1.5 text-sm font-bold text-white">PromptPay</div>

          {phase === 'loading' ? (
            <div className="mx-auto flex h-52 w-52 items-center justify-center">
              <Loader size={28} className="animate-spin text-brand-purple" />
            </div>
          ) : qr ? (
            <img src={qr} alt="PromptPay QR" className="mx-auto h-52 w-52 rounded-lg border-4 border-gray-900" />
          ) : (
            <div className="mx-auto flex h-52 w-52 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 px-4 text-center text-xs text-gray-400">
              {err || t('payment.qrFailed')}
            </div>
          )}

          <p className="mt-3 text-xs text-gray-400">{t('payment.account')}</p>
          <p className="mt-1 text-3xl font-bold text-brand-purple">฿{Number(amount || 0).toFixed(2)}</p>
          <p className="text-xs text-gray-400">{t('payment.ref', { ref })}</p>
          <p className="mt-2 text-xs text-gray-400">{t('payment.scanToPay')}</p>
        </div>

        {/* Attach slip */}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickSlip} />
        <Button
          className="w-full"
          loading={phase === 'uploading'}
          disabled={phase === 'loading'}
          onClick={() => fileRef.current?.click()}
        >
          <span className="inline-flex items-center gap-2"><Upload size={17} />{t('payment.slipUpload')}</span>
        </Button>
        <p className="pb-8 text-center text-xs text-gray-400">
          <CheckCircle size={12} className="mr-1 inline text-green-500" />
          {t('payment.slipSubmittedDesc')}
        </p>
      </div>
    </div>
  );
}
