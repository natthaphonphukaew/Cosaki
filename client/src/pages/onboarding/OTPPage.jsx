import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import PageHeader from '@/components/layout/PageHeader';
import { verifyOTP, sendOTP } from '@/api/auth';
import useAuthStore from '@/store/authStore';
import { Delete } from 'lucide-react';

export default function OTPPage() {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const { state } = useLocation();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const phone = state?.phone || '';
  const demoCode = state?.demoCode;

  const press = (d) => setCode((c) => c.length < 6 ? c + d : c);
  const del   = () => setCode((c) => c.slice(0, -1));

  const handleVerify = useCallback(async (value) => {
    const otp = value ?? code;
    if (otp.length < 6 || submitting.current) return;
    submitting.current = true;
    try {
      setLoading(true);
      const { data } = await verifyOTP(phone, otp);
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken);
      const u = data.data.user;
      // Don't gate login on KYC — let users browse. KYC is requested at booking.
      if (u.role === 'shop_admin') navigate('/seller/dashboard');
      // Mandatory fandom pick on first login (§1.3) — feeds the Home ordering.
      else if (!u.fandoms || u.fandoms.length === 0) navigate('/onboarding/fandoms');
      else navigate('/home');
    } catch (err) {
      toast.error(err.response?.data?.message || t('onboarding.invalidOtp'));
      setCode('');
      submitting.current = false;
    } finally {
      setLoading(false);
    }
  }, [code, phone, setAuth, navigate]);

  // Auto-verify the moment all 6 digits are entered.
  useEffect(() => {
    if (code.length === 6) handleVerify(code);
  }, [code, handleVerify]);

  const [secondsLeft, setSecondsLeft] = useState(59);
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  const handleResend = async () => {
    if (secondsLeft > 0) return;
    try {
      await sendOTP(phone);
      toast.success(t('onboarding.otpResent'));
      setSecondsLeft(59);
    } catch {
      toast.error(t('onboarding.otpResendFail'));
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col bg-surface-base">
      <PageHeader />
      <div className="flex flex-col items-center px-6 pt-6">
        <h2 className="text-2xl font-bold text-gray-900">{t('onboarding.otpTitle')}</h2>
        <p className="mt-2 text-sm text-gray-500">{t('onboarding.otpDesc', { phone })}</p>

        {demoCode && (
          <button
            onClick={() => setCode(demoCode)}
            className="mt-3 rounded-full bg-amber-50 border border-amber-200 px-4 py-1.5 text-xs font-semibold text-amber-700"
          >
            🧪 {t('onboarding.otpDemo')}: {demoCode}
          </button>
        )}

        {/* OTP dots */}
        <div className="mt-8 flex gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`flex h-12 w-12 items-center justify-center rounded-full border-2 text-xl font-semibold ${
                i < code.length
                  ? 'border-brand-purple text-brand-purple'
                  : 'border-gray-200 text-transparent'
              }`}
            >
              {code[i] ? '•' : ''}
            </div>
          ))}
        </div>

        <button onClick={handleResend} disabled={secondsLeft > 0} className={`mt-4 text-sm font-semibold ${secondsLeft > 0 ? 'text-gray-400' : 'text-brand-pink'}`}>
          {secondsLeft > 0 ? t('onboarding.otpResendIn', { time: `0:${String(secondsLeft).padStart(2, '0')}` }) : t('onboarding.otpResend')}
        </button>

        {/* Decoration */}
        <div className="my-6 flex h-32 w-32 items-center justify-center rounded-full bg-brand-light/50">
          <div className="grid grid-cols-3 gap-1.5">
            {[...Array(9)].map((_, i) => (
              <div key={i} className={`h-4 w-4 rounded-full ${i % 3 === 1 ? 'bg-brand-purple/60' : 'bg-brand-purple/30'}`} />
            ))}
          </div>
        </div>

        {/* Custom numpad */}
        <div className="w-full rounded-3xl bg-white p-4 shadow-sm">
          <div className="grid grid-cols-3 gap-3">
            {['1','2','3','4','5','6','7','8','9'].map((d) => (
              <button
                key={d}
                onClick={() => press(d)}
                className="flex h-14 items-center justify-center rounded-2xl text-xl font-semibold text-gray-800 active:bg-brand-light"
              >
                {d}
              </button>
            ))}
            <div />
            <button onClick={() => press('0')} className="flex h-14 items-center justify-center rounded-2xl text-xl font-semibold text-gray-800 active:bg-brand-light">0</button>
            <button onClick={del} className="flex h-14 items-center justify-center rounded-2xl text-gray-500 active:bg-brand-light">
              <Delete size={22} />
            </button>
          </div>
        </div>

        <div className="mt-5 flex h-6 items-center justify-center">
          {loading && (
            <span className="flex items-center gap-2 text-sm font-medium text-brand-purple">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
              {t('common.verifying')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
