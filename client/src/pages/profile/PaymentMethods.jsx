import { useState } from 'react';
import { CreditCard, Plus, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';

const read = () => { try { return JSON.parse(localStorage.getItem('cosaki-cards') || '[]'); } catch { return []; } };
const save = (cards) => localStorage.setItem('cosaki-cards', JSON.stringify(cards));

export default function PaymentMethods() {
  const { t } = useTranslation();
  const [cards, setCards] = useState(read);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ number: '', name: '', exp: '' });

  const addCard = () => {
    const digits = form.number.replace(/\D/g, '');
    if (digits.length < 12) return toast.error(t('payments.invalidCard'));
    const card = { id: Date.now(), last4: digits.slice(-4), name: form.name || t('payments.cardholderDefault'), exp: form.exp || '12/29' };
    const next = [...cards, card];
    setCards(next); save(next);
    setAdding(false); setForm({ number: '', name: '', exp: '' });
    toast.success(t('payments.cardAdded'));
  };

  const removeCard = (id) => {
    const next = cards.filter((c) => c.id !== id);
    setCards(next); save(next);
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title={t('header.payments')} />
      <div className="px-4 pt-4 space-y-3">
        {cards.length === 0 && (
          <div className="flex flex-col items-center rounded-2xl bg-white py-10 text-center shadow-sm">
            <CreditCard size={36} className="mb-2 text-gray-300" />
            <p className="text-sm font-medium text-gray-600">{t('payments.noCards')}</p>
          </div>
        )}

        {cards.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light">
              <CreditCard size={18} className="text-brand-purple" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">•••• {c.last4}</p>
              <p className="text-xs text-gray-400">{c.name} · {c.exp}</p>
            </div>
            <button onClick={() => removeCard(c.id)} className="text-gray-300"><Trash2 size={18} /></button>
          </div>
        ))}

        <button onClick={() => setAdding(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-purple/30 bg-brand-light/30 py-4 text-sm font-semibold text-brand-purple">
          <Plus size={18} /> {t('payments.addCard')}
        </button>

        <p className="px-1 text-center text-xs text-gray-400">{t('payments.demoNote')}</p>
      </div>

      {adding && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30" onClick={() => setAdding(false)}>
          <div className="w-full max-w-[390px] space-y-3 rounded-t-3xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">{t('payments.addCard')}</h3>
              <button onClick={() => setAdding(false)} className="text-gray-400"><X size={20} /></button>
            </div>
            <Input label={t('payments.cardNumber')} value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="4242 4242 4242 4242" />
            <Input label={t('payments.cardholder')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label={t('payments.expiry')} value={form.exp} onChange={(e) => setForm({ ...form, exp: e.target.value })} placeholder="MM/YY" />
            <Button className="mt-2 w-full" onClick={addCard}>{t('payments.addCard')}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
