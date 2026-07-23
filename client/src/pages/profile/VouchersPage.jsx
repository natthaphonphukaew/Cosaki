import React, { useEffect, useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { getMyCoupons } from '@/api/coupons';

function CouponCard({ coupon, used = false }) {
  const handleCopy = (code) => {
    if (used) return;
    navigator.clipboard.writeText(code);
    toast.success('คัดลอกโค้ดส่วนลดแล้ว!');
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl shadow-sm border border-gray-100 flex h-[110px] ${used ? 'bg-gray-50 opacity-60' : 'bg-white'}`}>
      <div className={`w-[100px] flex-shrink-0 flex flex-col justify-center items-center text-white relative ${used ? 'bg-gray-400' : 'bg-brand-gradient'}`}>
        <Tag size={28} className="mb-1" />
        <span className="text-[10px] font-bold tracking-widest">{coupon.scope === 'cosaki' ? 'COSAKI' : 'SHOP'}</span>
        <div className="absolute right-0 top-0 bottom-0 w-2 flex flex-col justify-between py-1">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`h-3 w-3 rounded-full -mr-1.5 ${used ? 'bg-gray-50' : 'bg-white'}`} />
          ))}
        </div>
      </div>
      
      <div className="flex-1 p-3 flex flex-col justify-center relative">
        <h3 className="text-sm font-bold text-gray-900 leading-tight">
          ส่วนลด {coupon.discount_type === 'percent' ? `${coupon.discount_value}%` : `฿${coupon.discount_value}`}
        </h3>
        <p className="text-[11px] text-gray-500 mt-0.5">
          {coupon.max_discount ? `ลดสูงสุด ฿${coupon.max_discount}` : ''} {Number(coupon.min_spend) > 0 ? `(ขั้นต่ำ ฿${coupon.min_spend})` : '(ไม่มีขั้นต่ำ)'}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${used ? 'text-gray-500 bg-gray-200' : 'text-brand-purple bg-brand-light/50'}`}>
            {coupon.code}
          </span>
          <button onClick={() => handleCopy(coupon.code)} disabled={used} className={`text-xs font-semibold ${used ? 'text-gray-400 cursor-not-allowed' : 'text-brand-purple'}`}>
            {used ? 'ใช้ไปแล้ว' : 'คัดลอกโค้ด'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VouchersPage() {
  const [available, setAvailable] = useState([]);
  const [used, setUsed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyCoupons().then(({ data }) => {
      setAvailable(data.data.available);
      setUsed(data.data.used);
    }).catch(err => {
      console.error(err);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base pb-20">
      <PageHeader title="คูปองส่วนลดของฉัน" />
      
      <div className="px-4 pt-4 pb-8 space-y-8">
        {loading ? (
          <div className="py-10 text-center text-sm text-gray-400 flex justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-gray-800">คูปองที่ใช้งานได้ ({available.length})</h2>
              {available.length === 0 && <p className="text-xs text-gray-400">ไม่มีคูปองที่ใช้งานได้ในขณะนี้</p>}
              {available.map(c => <CouponCard key={c.id} coupon={c} />)}
            </div>
            
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-gray-800">ประวัติการใช้คูปอง ({used.length})</h2>
              {used.length === 0 && <p className="text-xs text-gray-400">ยังไม่มีประวัติการใช้งาน</p>}
              {used.map(c => <CouponCard key={c.id} coupon={c} used />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
