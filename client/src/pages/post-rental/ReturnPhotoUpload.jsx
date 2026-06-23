import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, CheckCircle, Shield } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import { uploadEvidence } from '@/api/disputes';
import toast from 'react-hot-toast';

export default function ReturnPhotoUpload() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [files, setFiles]   = useState([]);
  const [stage]             = useState('unboxing');
  const [loading, setLoading] = useState(false);
  const [done, setDone]     = useState(false);

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...selected].slice(0, 5));
  };

  const handleSubmit = async () => {
    if (!files.length) return toast.error('Upload at least one photo');
    try {
      setLoading(true);
      const fd = new FormData();
      fd.append('booking_id', bookingId);
      fd.append('stage', stage);
      files.forEach((f) => fd.append('files', f));
      await uploadEvidence(fd);
      setDone(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col items-center justify-center bg-surface-base px-6 text-center">
      <CheckCircle size={72} className="mb-4 text-green-500" strokeWidth={1.5} />
      <h2 className="text-2xl font-bold text-gray-900">Photos Submitted!</h2>
      <p className="mt-2 text-sm text-gray-500">Your return evidence has been recorded and secured.</p>
      <Button className="mt-8 w-full" onClick={() => navigate(`/bookings/${bookingId}/tracking`)}>
        Back to Tracking
      </Button>
    </div>
  );

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title="Return Verification" right={
        <div className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
          <Shield size={12} /> SECURE PROOF
        </div>
      } />

      <div className="px-4 pb-32 space-y-5">
        {/* Instruction */}
        <div className="text-center pt-2">
          <h2 className="text-xl font-bold text-gray-900">Verify Condition</h2>
          <p className="mt-1 text-sm text-gray-500">
            Take photos of the item from all angles before packing. Cosaki uses this as proof to protect your refund.
          </p>
        </div>

        {/* Preview area */}
        <label className="block cursor-pointer">
          <div className="relative flex min-h-52 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-brand-purple/40 bg-brand-light/20 overflow-hidden">
            {files.length > 0 ? (
              <div className="flex w-full flex-wrap gap-2 p-3">
                {files.map((f, i) => (
                  <div key={i} className="relative h-24 w-24 overflow-hidden rounded-xl">
                    <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                    <button
                      onClick={(e) => { e.preventDefault(); setFiles((p) => p.filter((_, j) => j !== i)); }}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white text-xs"
                    >✕</button>
                  </div>
                ))}
                {files.length < 5 && (
                  <div className="flex h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-brand-purple/30 text-brand-purple">
                    <Camera size={24} />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-10">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-light">
                  <Camera size={32} className="text-brand-purple" />
                </div>
                <p className="text-sm font-semibold text-brand-purple">Tap to take photos</p>
                <p className="text-xs text-gray-400">Up to 5 photos</p>
              </div>
            )}
          </div>
          <input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={handleFiles} />
        </label>

        {/* Thumbnail row */}
        {files.length > 0 && (
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            {files.map((f, i) => (
              <div key={i} className={`h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border-2 ${i === 0 ? 'border-brand-purple' : 'border-transparent'}`}>
                <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        )}

        {/* Stage badge */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <Shield size={12} /> Recognised Proof Collection
        </div>

        {/* Requirements */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-800 mb-2">Photo Tips</p>
          <ul className="space-y-1.5 text-xs text-gray-500">
            <li>• Photograph in good lighting, no shadows</li>
            <li>• Include all parts of the costume</li>
            <li>• Capture any existing damage clearly</li>
            <li>• Original item only — no digital copies</li>
          </ul>
        </div>
      </div>

      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 border-t border-gray-100 bg-white p-4">
        <Button className="w-full" onClick={handleSubmit} loading={loading} disabled={!files.length}>
          Complete Verification
        </Button>
      </div>
    </div>
  );
}
