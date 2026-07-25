import { useEffect, useState } from 'react';
import { TrendingUp, ArrowDownLeft, ArrowUpRight, Shield, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { getWallet, withdraw } from '@/api/wallet';
import { updateShop } from '@/api/shops';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

export default function MyWallet() {
  const { t } = useTranslation();
  const [wallet, setWallet]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null); // 'withdraw' | 'bank' | null
  const [amount, setAmount]   = useState('');
  const [bank, setBank]       = useState({ bank: '', account_name: '', account_number: '' });
  const [busy, setBusy]       = useState(false);

  const load = () => getWallet()
    .then(({ data }) => {
      setWallet(data.data);
      if (data.data.bank_account) setBank(data.data.bank_account);
    })
    .catch(() => {})
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const balance     = wallet?.balance ?? 0;
  const totalEarned = wallet?.totalEarned ?? 0;
  const payouts     = wallet?.payouts ?? [];

  const handleWithdraw = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error(t('seller.enterValidAmount'));
    try {
      setBusy(true);
      await withdraw(amt);
      toast.success(t('seller.withdrawn2', { amount: amt.toFixed(2) }));
      setModal(null); setAmount('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('seller.withdrawFail'));
    } finally { setBusy(false); }
  };

  const handleSaveBank = async () => {
    if (!bank.bank || !bank.account_number) return toast.error(t('seller.bankReq'));
    try {
      setBusy(true);
      await updateShop({ bank_account: bank });
      toast.success(t('seller.bankSaved'));
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('address.saveFailed'));
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title={t('header.wallet')} />

      <div className="px-4 pb-10 space-y-4">
        {/* Balance card */}
        <div className="rounded-2xl bg-brand-gradient p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{t('seller.availableBalance')}</p>
          <p className="mt-1 text-4xl font-bold">฿{balance.toFixed(2)}</p>
          <p className="mt-1 text-xs opacity-70">
            {t('seller.earnedAllTime2', { amount: totalEarned.toFixed(2) })}
            {wallet?.billEarnings > 0 ? t('seller.billEarn', { amount: Number(wallet.billEarnings).toFixed(2) }) : ''})
          </p>
          {wallet?.next_payout_date && (
            <p className="mt-1 text-xs opacity-80">{t('seller.nextPayout', { date: wallet.next_payout_date })}</p>
          )}
          <div className="mt-4 flex gap-3">
            <button onClick={() => setModal('withdraw')} className="flex-1 rounded-full bg-white py-2 text-sm font-semibold text-brand-purple">
              {t('seller.withdraw')}
            </button>
            <button onClick={() => setModal('bank')} className="flex-1 rounded-full border border-white/40 py-2 text-sm font-semibold text-white">
              {t('seller.bankDetails')}
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-green-500" />
              <p className="text-xs text-gray-400">{t('seller.totalEarned')}</p>
            </div>
            <p className="text-xl font-bold text-gray-800">฿{totalEarned.toFixed(2)}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpRight size={14} className="text-brand-purple" />
              <p className="text-xs text-gray-400">{t('seller.withdrawn')}</p>
            </div>
            <p className="text-xl font-bold text-gray-800">฿{(wallet?.totalPaidOut ?? 0).toFixed(2)}</p>
          </div>
        </div>

        {/* Payout history */}
        <div>
          <p className="mb-3 text-sm font-semibold text-gray-800">{t('seller.withdrawHistory')}</p>
          {loading ? (
            <div className="space-y-3"><CardSkeleton /><CardSkeleton /></div>
          ) : payouts.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl bg-white py-10 text-center shadow-sm">
              <span className="mb-2 text-3xl">💸</span>
              <p className="text-sm font-medium text-gray-600">{t('seller.noWithdraw')}</p>
              <p className="text-xs text-gray-400">{t('seller.withdrawDesc')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {payouts.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-purple-100">
                    <ArrowUpRight size={18} className="text-brand-purple" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">{t('seller.withdrawalToBank')}</p>
                    <p className="text-xs text-gray-400">{p.created_at && format(parseISO(p.created_at), 'MMM d, yyyy')}</p>
                  </div>
                  <p className="text-sm font-bold flex-shrink-0 text-gray-800">−฿{Number(p.amount).toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Withdraw modal */}
      {modal === 'withdraw' && (
        <Sheet title={t('seller.withdrawFunds')} onClose={() => setModal(null)}>
          <p className="text-sm text-gray-500">{t('seller.availableColon', { amount: balance.toFixed(2) })}</p>
          <Input label={t('seller.amountLabel')} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          <button onClick={() => setAmount(String(balance))} className="text-xs font-semibold text-brand-purple">{t('seller.withdrawAll')}</button>
          <Button className="mt-4 w-full" loading={busy} onClick={handleWithdraw}>{t('seller.confirmWithdraw')}</Button>
        </Sheet>
      )}

      {/* Bank details modal */}
      {modal === 'bank' && (
        <Sheet title={t('seller.bankDetails')} onClose={() => setModal(null)}>
          <Input label={t('seller.bankName')} value={bank.bank} onChange={(e) => setBank({ ...bank, bank: e.target.value })} placeholder={t('seller.bankPlaceholder')} />
          <Input label={t('seller.accountName')} value={bank.account_name} onChange={(e) => setBank({ ...bank, account_name: e.target.value })} />
          <Input label={t('seller.accountNumber')} value={bank.account_number} onChange={(e) => setBank({ ...bank, account_number: e.target.value })} />
          <Button className="mt-4 w-full" loading={busy} onClick={handleSaveBank}>{t('common.save')}</Button>
        </Sheet>
      )}
    </div>
  );
}

function Sheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30" onClick={onClose}>
      <div className="w-full max-w-[390px] rounded-t-3xl bg-white p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
