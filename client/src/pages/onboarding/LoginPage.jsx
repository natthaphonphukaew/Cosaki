import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { sendOTP } from '@/api/auth';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleContinue = async () => {
    if (!phone.trim()) return toast.error('Please enter your phone number');
    // Normalize: strip leading 0, prepend +66
    const digits = phone.trim().replace(/\D/g, '');
    const normalized = '+66' + (digits.startsWith('66') ? digits.slice(2) : digits.startsWith('0') ? digits.slice(1) : digits);
    try {
      setLoading(true);
      const { data } = await sendOTP(normalized);
      navigate('/otp', { state: { phone: normalized, demoCode: data?.data?.demoCode } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-[390px] flex-col bg-surface-base">
      {/* Purple blob top-right */}
      <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-brand-gradient-br opacity-20 blur-3xl" />

      <div className="flex flex-col items-center px-6 pt-20">
        {/* Logo */}
        <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-light">
          <span className="text-2xl font-bold text-brand-purple">C</span>
        </div>

        <h1 className="mb-2 text-center text-3xl font-bold text-gray-900">
          Welcome to Cosaki
        </h1>
        <p className="mb-10 text-center text-sm text-gray-500">
          Join our curated community of cosplay creators and enthusiasts.
        </p>

        {/* Phone input */}
        <div className="w-full">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
            Phone Number
          </label>
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm">
              <span>🇹🇭</span>
              <span className="text-gray-600">+66</span>
              <span className="text-gray-400">▾</span>
            </div>
            <input
              type="tel"
              placeholder="Enter number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20"
            />
          </div>
        </div>

        <Button onClick={handleContinue} loading={loading} className="mt-6 w-full">
          Continue
        </Button>

        {/* Divider */}
        <div className="my-6 flex w-full items-center gap-3">
          <div className="flex-1 border-t border-gray-200" />
          <span className="text-xs text-gray-400 font-medium">OR</span>
          <div className="flex-1 border-t border-gray-200" />
        </div>

        {/* Social auth */}
        <Button
          variant="google"
          className="w-full"
          onClick={() => window.location.href = '/api/v1/auth/google'}
          icon={<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="h-5 w-5" alt="G" />}
        >
          Continue with Google
        </Button>
        <Button
          variant="facebook"
          className="mt-3 w-full"
          onClick={() => window.location.href = '/api/v1/auth/facebook'}
          icon={<span className="text-xl leading-none">f</span>}
        >
          Continue with Facebook
        </Button>

        <p className="mt-8 px-4 text-center text-xs text-gray-400">
          By continuing, you agree to Cosaki's{' '}
          <span className="font-semibold text-brand-purple">Terms of Service</span> and{' '}
          <span className="font-semibold text-brand-purple">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
