import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import { uploadKYC } from '@/api/kyc';
import useAuthStore from '@/store/authStore';
import { Upload, Shield, CheckCircle } from 'lucide-react';

export default function KYCPage() {
  const [idFile, setIdFile]       = useState(null);
  const [selfieFile, setSelfie]   = useState(null);
  const [step, setStep]           = useState('id'); // 'id' | 'selfie' | 'done'
  const [verified, setVerified]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const navigate                  = useNavigate();
  const { state }                 = useLocation();
  const { updateUser }            = useAuthStore();
  const next = state?.next || '/home';

  const handleSubmit = async () => {
    if (!idFile || !selfieFile) return toast.error('Both photos required');
    try {
      setLoading(true);
      const fd = new FormData();
      fd.append('id_image', idFile);
      fd.append('selfie', selfieFile);
      const { data } = await uploadKYC(fd);
      const status = data?.data?.kyc_status || 'pending';
      updateUser({ kyc_status: status });
      setVerified(status === 'verified');
      setStep('done');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'done') {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col items-center justify-center bg-surface-base px-6 text-center">
        <CheckCircle size={72} className="mb-4 text-green-500" />
        <h2 className="text-2xl font-bold text-gray-900">{verified ? 'Identity Verified!' : 'Submitted!'}</h2>
        <p className="mt-2 text-sm text-gray-500">
          {verified
            ? 'You can now complete your rental.'
            : 'Your identity is being verified. This usually takes a few minutes.'}
        </p>
        <Button className="mt-8 w-full" onClick={() => navigate(verified ? next : '/home')}>
          {verified && next !== '/home' ? 'Continue to Checkout' : 'Go to Home'}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title="Identity" />
      <div className="px-6 pt-4">
        <h2 className="text-center text-2xl font-bold text-brand-purple">Verify your Identity</h2>
        <p className="mt-2 text-center text-sm text-gray-500">
          {step === 'id'
            ? 'Position the front of your ID card within the frame.'
            : 'Take a clear selfie to match your ID.'}
        </p>

        {/* Upload frame */}
        <label className="mt-6 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-brand-purple/40 bg-brand-light/30 p-8">
          {step === 'id' ? (
            idFile
              ? <img src={URL.createObjectURL(idFile)} className="max-h-44 rounded-xl object-cover" alt="ID" />
              : <>
                  <div className="rounded-xl bg-white p-4 shadow-sm">
                    <Shield size={36} className="text-brand-purple" />
                  </div>
                  <span className="text-sm font-medium text-brand-purple">Tap to upload ID card</span>
                </>
          ) : (
            selfieFile
              ? <img src={URL.createObjectURL(selfieFile)} className="max-h-44 rounded-xl object-cover" alt="Selfie" />
              : <>
                  <div className="rounded-xl bg-white p-4 shadow-sm">
                    <Upload size={36} className="text-brand-purple" />
                  </div>
                  <span className="text-sm font-medium text-brand-purple">Tap to take selfie</span>
                </>
          )}
          <input
            type="file" accept="image/*" capture={step === 'selfie' ? 'user' : 'environment'} className="hidden"
            onChange={(e) => { if (!e.target.files[0]) return; step === 'id' ? setIdFile(e.target.files[0]) : setSelfie(e.target.files[0]); }}
          />
        </label>

        {/* Scanning indicator */}
        <div className="mt-4 flex items-center justify-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-xs text-white w-fit mx-auto">
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
          {step === 'id' ? 'SCANNING FRONT SIDE' : 'LIVENESS CHECK'}
        </div>

        <button onClick={() => {}} className="mt-4 flex items-center gap-2 text-sm font-medium text-brand-purple mx-auto">
          <Upload size={16} />
          UPLOAD FROM GALLERY
        </button>

        {/* Trust badges */}
        <div className="mt-6 flex justify-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1"><Shield size={12} /> Secure SSL</div>
          <div className="flex items-center gap-1"><CheckCircle size={12} /> GDPR Compliant</div>
          <div className="flex items-center gap-1"><CheckCircle size={12} /> Identity Verified</div>
        </div>

        {/* Photo requirements */}
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-light">
              <Shield size={16} className="text-brand-purple" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Photo Requirements</p>
              <p className="mt-1 text-xs text-gray-500">Keep the document within the frame and avoid shadows or glare. The document must be original and not a digital copy.</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-3 pb-8">
          {step === 'selfie' && (
            <Button variant="secondary" className="flex-1" onClick={() => setStep('id')}>Back</Button>
          )}
          {step === 'id' ? (
            <Button className="flex-1" onClick={() => idFile && setStep('selfie')} disabled={!idFile}>
              Next
            </Button>
          ) : (
            <Button className="flex-1" onClick={handleSubmit} loading={loading} disabled={!selfieFile}>
              Submit
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
