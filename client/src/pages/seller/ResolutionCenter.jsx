import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, Phone } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import { getBooking } from '@/api/bookings';
import { getDisputeByBooking, resolveDispute } from '@/api/disputes';
import toast from 'react-hot-toast';

const PENALTY_ITEMS = [
  { label: 'Penalty Matrix',   value: '5%'   },
  { label: 'Minor Stain/Mark', value: '15%'  },
  { label: 'Minor Fabric Tear', value: '30%' },
  { label: 'Full Replacement', value: '100%' },
];

export default function ResolutionCenter() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking]     = useState(null);
  const [dispute, setDispute]     = useState(null);
  const [deduction, setDeduction] = useState(15);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    getBooking(bookingId).then(({ data }) => setBooking(data.data.booking)).catch(() => {});
    getDisputeByBooking(bookingId).then(({ data }) => setDispute(data.data.dispute)).catch(() => {});
  }, [bookingId]);

  const deposit     = booking ? Number(booking.deposit_amount) : 0;
  const deductAmt   = ((deposit * deduction) / 100).toFixed(2);
  const refundAmt   = (deposit - Number(deductAmt)).toFixed(2);
  const resolved    = booking && booking.status !== 'disputed';

  const handleConfirm = async () => {
    if (!dispute) return toast.error('No open dispute for this booking');
    try {
      setLoading(true);
      // Any deduction means the shop is compensated; zero means full refund.
      const resolution = deduction > 0 ? 'resolved_shop' : 'resolved_renter';
      await resolveDispute(dispute.id, {
        resolution,
        compensation_amount: Number(deductAmt),
        resolution_note: `${deduction}% deducted from deposit ($${deductAmt}); $${refundAmt} refunded to renter.`,
      });
      toast.success(`Resolved — $${deductAmt} deducted, $${refundAmt} refunded to renter`);
      navigate(-1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not resolve dispute');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title="Resolution Center" right={
        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-600">DISPUTE</span>
      } />

      <div className="px-4 pb-32 space-y-4">
        {/* Evidence image */}
        <div className="relative overflow-hidden rounded-2xl bg-gray-900" style={{ height: 200 }}>
          <div className="flex h-full items-center justify-center text-6xl opacity-30">🎭</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-red-500/60">
              <div className="h-12 w-12 rounded-full border-2 border-red-500" />
            </div>
          </div>
          <div className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
            PRIMARY EVIDENCE
          </div>
        </div>

        {/* Booking info */}
        {booking && (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Booking</p>
            <p className="font-bold text-gray-800">{booking.item_name}</p>
            <p className="text-xs text-gray-400 mt-1">Renter: {booking.renter_name}</p>
            {dispute?.reason && (
              <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-600">“{dispute.reason}”</p>
            )}
          </div>
        )}

        {/* Penalty matrix */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-amber-500" />
            <p className="text-sm font-semibold text-gray-800">Penalty Matrix</p>
          </div>
          <div className="space-y-2">
            {PENALTY_ITEMS.map(({ label, value }) => (
              <button
                key={label}
                onClick={() => setDeduction(parseInt(value))}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  deduction === parseInt(value)
                    ? 'bg-brand-light border border-brand-purple text-brand-purple font-semibold'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{label}</span>
                <span className="font-bold">{value}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Deduction calculation */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-gray-800">Escrow Deposit Balance</p>
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl font-bold text-gray-900">${deposit.toFixed(2)}</span>
            <Shield size={20} className="text-brand-purple" />
          </div>

          {/* Slider */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Deduction</span>
              <span className="font-semibold text-brand-purple">{deduction}%</span>
            </div>
            <input
              type="range" min="0" max="100" step="5" value={deduction}
              onChange={(e) => setDeduction(Number(e.target.value))}
              className="w-full accent-brand-purple"
            />
          </div>

          <div className="rounded-xl bg-brand-light p-3 text-center">
            <p className="text-xs text-gray-500">Deduct <span className="font-bold text-brand-purple">{deduction}%</span> for Minor Stain</p>
            <p className="text-xl font-bold text-brand-purple mt-1">${deductAmt}</p>
            <p className="text-xs text-gray-400 mt-0.5">Renter refund: ${refundAmt}</p>
          </div>
        </div>

        {/* Contact admin */}
        <button onClick={() => navigate('/support')} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-medium text-gray-700 shadow-sm">
          <Phone size={16} /> Contact Admin
        </button>
      </div>

      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 border-t border-gray-100 bg-white p-4">
        <Button className="w-full" onClick={handleConfirm} loading={loading} disabled={resolved}>
          {resolved ? 'Dispute Resolved' : `Confirm Deduction — $${deductAmt}`}
        </Button>
      </div>
    </div>
  );
}
