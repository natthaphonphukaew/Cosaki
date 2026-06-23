import { useEffect, useState } from 'react';
import { TrendingUp, ArrowDownLeft, ArrowUpRight, Shield } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { listBookings } from '@/api/bookings';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { format, parseISO } from 'date-fns';

export default function MyWallet() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]  = useState(true);

  useEffect(() => {
    listBookings({ as: 'shop', status: 'completed', limit: 20 })
      .then(({ data }) => setBookings(data.data.bookings))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalEarned = bookings.reduce((s, b) => s + Number(b.rental_fee || 0), 0);
  const totalEscrow = bookings.reduce((s, b) => s + Number(b.deposit_amount || 0), 0);

  // Real transactions derived from completed bookings (one escrow-release each).
  const transactions = bookings.map((b) => ({
    type:   'in',
    label:  `Escrow Released — ${b.item_name}`,
    amount: Number(b.rental_fee || 0),
    date:   b.updated_at || b.created_at,
  }));

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title="My Wallet" />

      <div className="px-4 pb-10 space-y-4">
        {/* Balance card */}
        <div className="rounded-2xl bg-brand-gradient p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Available Balance</p>
          <p className="mt-1 text-4xl font-bold">${totalEarned.toFixed(2)}</p>
          <p className="mt-1 text-xs opacity-70">From {bookings.length} completed rentals</p>
          <div className="mt-4 flex gap-3">
            <button className="flex-1 rounded-full border border-white/40 py-2 text-sm font-semibold text-white">
              Withdraw
            </button>
            <button className="flex-1 rounded-full bg-white/20 py-2 text-sm font-semibold text-white">
              Bank Details
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-green-500" />
              <p className="text-xs text-gray-400">Total Earned</p>
            </div>
            <p className="text-xl font-bold text-gray-800">${totalEarned.toFixed(2)}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={14} className="text-brand-purple" />
              <p className="text-xs text-gray-400">In Escrow</p>
            </div>
            <p className="text-xl font-bold text-gray-800">${totalEscrow.toFixed(2)}</p>
          </div>
        </div>

        {/* Transaction list */}
        <div>
          <p className="mb-3 text-sm font-semibold text-gray-800">Transaction History</p>
          {loading ? (
            <div className="space-y-3"><CardSkeleton /><CardSkeleton /></div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl bg-white py-10 text-center shadow-sm">
              <span className="mb-2 text-3xl">💸</span>
              <p className="text-sm font-medium text-gray-600">No transactions yet</p>
              <p className="text-xs text-gray-400">Earnings appear here once rentals complete</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                    <ArrowDownLeft size={18} className="text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">{tx.label}</p>
                    <p className="text-xs text-gray-400">{tx.date && format(parseISO(tx.date), 'MMM d, yyyy')}</p>
                  </div>
                  <p className="text-sm font-bold flex-shrink-0 text-green-600">
                    +${Math.abs(tx.amount).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
