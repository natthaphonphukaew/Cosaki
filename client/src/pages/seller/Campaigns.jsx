import { useEffect, useState } from 'react';
import { Megaphone, Plus, Tag, X } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { createShopCoupon, listShopCoupons, toggleShopCoupon } from '@/api/shops';
import toast from 'react-hot-toast';

// Shop Campaign Builder (§3.4) — create shop-scoped discount codes.
export default function Campaigns() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding]   = useState(false);
  const [busy, setBusy]       = useState(false);
  const [form, setForm] = useState({ code: '', discount_type: 'percent', discount_value: '', min_spend: '' });

  const load = () => listShopCoupons()
    .then(({ data }) => setCoupons(data.data.coupons))
    .catch(() => {})
    .finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.code.trim() || !form.discount_value) return toast.error('กรอกโค้ดและมูลค่าส่วนลด');
    try {
      setBusy(true);
      await createShopCoupon({
        code: form.code.trim().toUpperCase(),
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        min_spend: Number(form.min_spend) || 0,
      });
      toast.success('สร้างแคมเปญแล้ว');
      setAdding(false);
      setForm({ code: '', discount_type: 'percent', discount_value: '', min_spend: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'สร้างไม่สำเร็จ');
    } finally { setBusy(false); }
  };

  const handleToggle = async (id) => {
    try {
      const { data } = await toggleShopCoupon(id);
      setCoupons((list) => list.map((c) => (c.id === id ? data.data.coupon : c)));
    } catch { toast.error('เปลี่ยนสถานะไม่สำเร็จ'); }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title="Campaign Builder" />
      <div className="px-4 pb-10 space-y-4">
        {/* Idea banner */}
        <div className="rounded-2xl bg-brand-gradient p-4 text-white">
          <div className="flex items-center gap-2">
            <Megaphone size={18} />
            <p className="text-sm font-bold">สร้างโค้ดส่วนลดเฉพาะร้าน</p>
          </div>
          <p className="mt-1 text-xs opacity-80">เช่น โปร 7.7, โปรปิดเทอม, โปรเดือนเกิดลูกค้า — ลูกค้าใส่โค้ดตอน Checkout</p>
        </div>

        <button onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-purple/30 bg-brand-light/30 py-4 text-sm font-semibold text-brand-purple">
          <Plus size={18} /> สร้างแคมเปญใหม่
        </button>

        {loading ? (
          <div className="space-y-3"><CardSkeleton /><CardSkeleton /></div>
        ) : coupons.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl bg-white py-10 text-center shadow-sm">
            <Tag size={32} className="mb-2 text-gray-300" />
            <p className="text-sm font-medium text-gray-600">ยังไม่มีแคมเปญ</p>
          </div>
        ) : (
          <div className="space-y-2">
            {coupons.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light">
                  <Tag size={18} className="text-brand-purple" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800">{c.code}</p>
                  <p className="text-xs text-gray-400">
                    ลด {c.discount_type === 'percent' ? `${Number(c.discount_value)}%` : `฿${Number(c.discount_value)}`}
                    {Number(c.min_spend) > 0 ? ` · ขั้นต่ำ ฿${Number(c.min_spend)}` : ''} · ใช้แล้ว {c.used_count} ครั้ง
                  </p>
                </div>
                <button onClick={() => handleToggle(c.id)}
                  className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${c.active ? 'bg-brand-purple' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${c.active ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create sheet */}
      {adding && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30" onClick={() => setAdding(false)}>
          <div className="w-full max-w-[390px] space-y-3 rounded-t-3xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">สร้างแคมเปญ</h3>
              <button onClick={() => setAdding(false)} className="text-gray-400"><X size={20} /></button>
            </div>
            <Input label="โค้ด (A-Z, 0-9)" value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="เช่น SUMMER77" />
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">ประเภทส่วนลด</label>
              <div className="flex gap-2">
                {[['percent', 'เปอร์เซ็นต์ (%)'], ['fixed', 'จำนวนเงิน (฿)']].map(([v, l]) => (
                  <button key={v} onClick={() => setForm({ ...form, discount_type: v })}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-medium ${form.discount_type === v ? 'bg-brand-purple text-white' : 'border border-gray-200 text-gray-600'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label={form.discount_type === 'percent' ? 'ส่วนลด (%)' : 'ส่วนลด (฿)'} type="number"
                value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} />
              <Input label="ยอดขั้นต่ำ (฿)" type="number"
                value={form.min_spend} onChange={(e) => setForm({ ...form, min_spend: e.target.value })} />
            </div>
            <Button className="mt-2 w-full" loading={busy} onClick={handleCreate}>สร้างแคมเปญ</Button>
          </div>
        </div>
      )}
    </div>
  );
}
