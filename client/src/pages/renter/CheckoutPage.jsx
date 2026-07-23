import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Shield, Lock, Tag } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import ThaiAddressSelector from '@/components/ui/ThaiAddressSelector';
import ProductImage from '@/components/ui/ProductImage';
import { getBooking, applyCoupon } from '@/api/bookings';
import { getAddresses } from '@/api/addresses';
import { getMyCoupons } from '@/api/coupons';
import useAuthStore from '@/store/authStore';
import toast from 'react-hot-toast';
import { format, differenceInCalendarDays } from 'date-fns';

export default function CheckoutPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [booking, setBooking] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [address, setAddress] = useState('');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [coupon, setCoupon]   = useState('');
  const [payMode, setPayMode] = useState('full'); // full | deposit
  const [applying, setApplying] = useState(false);

  const load = async () => {
    try {
      const { data } = await getBooking(bookingId);
      const b = data.data.booking;
      setBooking(b);
      if (b.coupon_code) setCoupon(b.coupon_code);

      const [addrRes, coupRes] = await Promise.all([
        getAddresses(),
        getMyCoupons()
      ]);
      
      const addrList = addrRes.data.data.addresses || [];
      setAddresses(addrList);
      const def = addrList.find(a => a.is_default) || addrList[0];
      if (def) setAddress(def.address);

      setAvailableCoupons(coupRes.data.data.available || []);
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => { load(); }, [bookingId]);

  const handleApplyCoupon = async () => {
    try {
      setApplying(true);
      const { data } = await applyCoupon(bookingId, coupon.trim());
      setBooking((b) => ({ ...b, ...data.data.booking }));
      toast.success(coupon.trim() ? `ใช้คูปองแล้ว −฿${data.data.discount}` : 'ลบคูปองแล้ว');
    } catch (err) {
      toast.error(err.response?.data?.message || 'คูปองใช้ไม่ได้');
    } finally { setApplying(false); }
  };

  if (!booking) return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
    </div>
  );

  const start = booking.rental_start ? format(new Date(booking.rental_start), 'MMM d') : '—';
  const end   = booking.rental_end   ? format(new Date(booking.rental_end),   'MMM d') : '—';
  const days  = booking.rental_start && booking.rental_end
    ? differenceInCalendarDays(new Date(booking.rental_end), new Date(booking.rental_start)) : 0;
  const total   = Number(booking.total_amount);
  const bookingFee = Number(booking.booking_fee || 100);
  const dueToday = payMode === 'deposit' ? bookingFee : total;
  const dueLater = payMode === 'deposit' ? total - bookingFee : 0;

  const goPay = async () => {
    if (!address.trim()) return toast.error('กรุณากรอกที่อยู่จัดส่ง');
    navigate(`/bookings/${bookingId}/pay`, { state: { payMode, amount: dueToday, shipping_address: address.trim() } });
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title="Checkout" />
      <div className="px-4 pb-32 space-y-4">
        {/* Shipping address */}
        <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><MapPin size={18} className="text-gray-400" /> Shipping Address</h3>
            <button className="text-xs font-semibold text-brand-purple" onClick={() => setShowAddressModal(true)}>เปลี่ยน</button>
          </div>
          {address ? (
            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-xl">{address}</p>
          ) : (
            <p className="text-sm text-red-500 bg-red-50 p-3 rounded-xl">กรุณาเลือกที่อยู่จัดส่ง</p>
          )}
        </div>

        {showAddressModal && (
          <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
            <div className="w-full max-w-[390px] rounded-t-3xl bg-white p-6 pb-10 sm:rounded-3xl sm:pb-6 max-h-[80vh] overflow-y-auto">
              <h3 className="mb-4 text-lg font-bold text-gray-900">เลือกที่อยู่จัดส่ง</h3>
              <div className="space-y-3 mb-6">
                {addresses.map(a => (
                  <div key={a.id} onClick={() => { setAddress(a.address); setShowAddressModal(false); }} className={`p-3 rounded-xl border ${address === a.address ? 'border-brand-purple bg-purple-50' : 'border-gray-200'} cursor-pointer`}>
                    <p className="text-sm">{a.address}</p>
                  </div>
                ))}
              </div>
              <Button variant="secondary" className="w-full mb-3" onClick={() => navigate('/profile/addresses')}>+ เพิ่มที่อยู่ใหม่</Button>
              <Button className="w-full" onClick={() => setShowAddressModal(false)}>ปิด</Button>
            </div>
          </div>
        )}

        {/* Order */}
        <div className="rounded-2xl bg-white p-4 shadow-sm flex gap-3 items-center">
          <div className="h-14 w-14 overflow-hidden rounded-xl flex-shrink-0">
            <ProductImage item={{ image_urls: booking.image_urls, name: booking.item_name }} emojiClassName="text-2xl" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{booking.item_name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{days}-Day Rental • {start} – {end}</p>
          </div>
        </div>

        {/* Coupon */}
        <div>
          <div className="mb-2 flex justify-between items-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">คูปองส่วนลด</p>
            <button onClick={() => setShowCouponModal(true)} className="text-xs font-semibold text-brand-purple">
              ดูคูปองของฉัน
            </button>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                placeholder="เช่น COSAKI10"
                className="w-full h-11 rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-purple" />
            </div>
            <Button variant="secondary" className="w-24 h-11 !py-0 flex items-center justify-center" loading={applying} onClick={handleApplyCoupon}>
              {booking.coupon_code ? 'เปลี่ยน' : 'ใช้'}
            </Button>
          </div>
        </div>

        {showCouponModal && (
          <div className="fixed inset-0 z-[60] flex items-end bg-black/40 sm:items-center sm:justify-center" onClick={() => setShowCouponModal(false)}>
            <div className="w-full max-w-[390px] rounded-t-3xl bg-white p-6 pb-10 sm:rounded-3xl sm:pb-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h3 className="mb-4 text-lg font-bold text-gray-900">เลือกคูปองส่วนลด</h3>
              
              <div className="space-y-3 mb-6">
                {availableCoupons.length === 0 ? (
                  <p className="text-center text-sm text-gray-500 py-4">ไม่มีคูปองที่ใช้งานได้</p>
                ) : (
                  availableCoupons.map(c => (
                    <div key={c.id} className="relative overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-100 flex h-[100px]">
                      <div className="w-[80px] flex-shrink-0 bg-brand-gradient flex flex-col justify-center items-center text-white relative">
                        <Tag size={24} className="mb-1" />
                        <span className="text-[10px] font-bold tracking-widest">{c.scope === 'cosaki' ? 'COSAKI' : 'SHOP'}</span>
                        <div className="absolute right-0 top-0 bottom-0 w-2 flex flex-col justify-between py-1">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-3 w-3 rounded-full bg-white -mr-1.5" />
                          ))}
                        </div>
                      </div>
                      <div className="flex-1 p-3 flex flex-col justify-center relative">
                        <h3 className="text-sm font-bold text-gray-900 leading-tight">ส่วนลด {c.discount_type === 'percent' ? `${c.discount_value}%` : `฿${c.discount_value}`}</h3>
                        <p className="text-[11px] text-gray-500 mt-0.5">{c.max_discount ? `ลดสูงสุด ฿${c.max_discount}` : ''}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs font-mono font-semibold text-brand-purple bg-brand-light/50 px-2 py-0.5 rounded">{c.code}</span>
                          <button onClick={async () => {
                            setShowCouponModal(false);
                            setCoupon(c.code);
                            try {
                              setApplying(true);
                              const { data } = await applyCoupon(bookingId, c.code);
                              setBooking((b) => ({ ...b, ...data.data.booking }));
                              toast.success(`ใช้คูปองแล้ว −฿${data.data.discount}`);
                            } catch (err) {
                              toast.error(err.response?.data?.message || 'คูปองใช้ไม่ได้');
                            } finally { setApplying(false); }
                          }} className="text-xs font-semibold text-white bg-brand-purple px-3 py-1.5 rounded-full">
                            ใช้คูปอง
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <Button className="w-full" onClick={() => setShowCouponModal(false)}>ปิด</Button>
            </div>
          </div>
        )}

        {/* Payment mode */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">รูปแบบการจ่าย</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setPayMode('full')}
              className={`rounded-xl p-3 text-left text-sm ${payMode === 'full' ? 'border-2 border-brand-purple bg-brand-light/30' : 'border border-gray-200'}`}>
              <p className="font-semibold text-gray-800">จ่ายเต็ม</p>
              <p className="text-xs text-gray-400">฿{total.toFixed(2)}</p>
            </button>
            <button onClick={() => setPayMode('deposit')}
              className={`rounded-xl p-3 text-left text-sm ${payMode === 'deposit' ? 'border-2 border-brand-purple bg-brand-light/30' : 'border border-gray-200'}`}>
              <p className="font-semibold text-gray-800">จองคิวก่อน</p>
              <p className="text-xs text-gray-400">฿{bookingFee.toFixed(2)} · ค้าง ฿{(total - bookingFee).toFixed(2)}</p>
            </button>
          </div>
        </div>

        {/* Payment summary */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Payment Summary</p>
          <div className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
            <Row label={`ค่าเช่า (${booking.rate_type === 'private' ? 'ไพรเวท' : 'เทสที่บ้าน'})`} value={booking.rental_fee} />
            <div className="flex items-center justify-between rounded-xl bg-purple-50 px-3 py-2">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-brand-purple" />
                <span className="text-sm text-brand-purple font-medium">ค่าคุ้มครองความเสียหาย (10%)</span>
              </div>
              <span className="text-sm font-semibold text-brand-purple">฿{booking.cosaki_fee}</span>
            </div>
            
            {booking.is_express ? (
              <div className="flex justify-between text-sm text-amber-600">
                <span>ค่าส่งด่วน (Express)</span>
                <span className="font-medium text-xs rounded-full bg-amber-100 px-2 py-0.5">ชำระตามจริง (เก็บปลายทาง)</span>
              </div>
            ) : (
              <Row label="ค่าส่ง (Shipping)" value={booking.shipping_fee || 0} />
            )}
            
            <Row label="ค่าจองคิว (§5.2)" value={bookingFee} />
            {Number(booking.discount) > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>ส่วนลด ({booking.coupon_code})</span>
                <span className="font-medium">−฿{booking.discount}</span>
              </div>
            )}
            <div className="border-t border-gray-100 pt-3 flex justify-between">
              <span className="font-semibold text-gray-800">รวมทั้งสิ้น (Total)</span>
              <span className="text-lg font-bold text-brand-purple">฿{total.toFixed(2)}</span>
            </div>
            {payMode === 'deposit' && (
              <div className="rounded-xl bg-amber-50 p-2 text-xs text-amber-700">
                จ่ายวันนี้ ฿{dueToday.toFixed(2)} · ค้าง ฿{dueLater.toFixed(2)} (ต้องชำระก่อนวันจัดส่ง)
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-green-600 font-medium">
          <Shield size={14} /> ชำระผ่าน PromptPay · ยอดถูกล็อกอัตโนมัติ
        </div>
      </div>

      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 border-t border-gray-100 bg-white p-4">
        <Button className="w-full" onClick={goPay} icon={<Lock size={16} />}>
          จ่าย ฿{dueToday.toFixed(2)} ผ่าน QR
        </Button>
      </div>
    </div>
  );
}

const Row = ({ label, value }) => (
  <div className="flex justify-between text-sm">
    <span className="text-gray-600">{label}</span>
    <span className="font-medium">฿{Number(value).toFixed(2)}</span>
  </div>
);
