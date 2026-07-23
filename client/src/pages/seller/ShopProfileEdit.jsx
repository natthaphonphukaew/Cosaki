import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Camera, ImagePlus, MapPin, ScrollText } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import useAuthStore from '@/store/authStore';
import { getMyShop, updateShop } from '@/api/shops';
import { fileToDataUrl } from '@/utils/image';
import toast from 'react-hot-toast';

const CATEGORIES = ['Anime', 'Game', 'Movie & TV', 'K-Pop', 'Original Design', 'Props & Wigs'];

export default function ShopProfileEdit() {
  const navigate = useNavigate();
  const { setShop: setStoreShop } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [ready, setReady]     = useState(false);
  const [cover, setCover]     = useState(null);
  const [logo, setLogo]       = useState(null);
  const [rulesImage, setRulesImage] = useState(null);
  const [form, setForm] = useState({
    shop_name: '', description: '', location: '', categories: [], rules_text: '',
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const toggleCat = (c) =>
    set('categories', form.categories.includes(c)
      ? form.categories.filter((x) => x !== c)
      : [...form.categories, c]);

  // Load the shop's current profile into the form.
  useEffect(() => {
    getMyShop().then(({ data }) => {
      const s = data.data.shop;
      setForm({
        shop_name: s.shop_name || '',
        description: s.description || '',
        location: s.location || '',
        categories: s.categories || [],
        rules_text: s.rules_text || '',
      });
      setCover(s.cover_url || null);
      setLogo(s.logo_url || null);
      setRulesImage(s.rules_image_url || null);
    }).catch(() => toast.error('โหลดข้อมูลร้านไม่สำเร็จ')).finally(() => setReady(true));
  }, []);

  const pick = (setter) => async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { setter(await fileToDataUrl(file)); }
    catch { toast.error('อ่านรูปไม่สำเร็จ'); }
  };

  const handleSave = async () => {
    if (!form.shop_name.trim()) return toast.error('กรุณาตั้งชื่อร้าน');
    setLoading(true);
    try {
      const { data } = await updateShop({
        shop_name:   form.shop_name.trim(),
        description: form.description.trim(),
        location:    form.location.trim(),
        categories:  form.categories,
        logo_url:    logo,
        cover_url:   cover,
        rules_text:      form.rules_text.trim(),
        rules_image_url: rulesImage,
      });
      // Keep the seller dashboard's cached shop in sync.
      setStoreShop(data.data.shop);
      toast.success('บันทึกโปรไฟล์ร้านแล้ว');
      navigate('/seller/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  if (!ready) return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
    </div>
  );

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title="แก้ไขโปรไฟล์ร้าน" />

      <div className="pb-32">
        {/* Cover + logo */}
        <div className="relative mb-12 px-4">
          <label className="block h-32 w-full cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-brand-purple/30 bg-brand-light/40">
            {cover
              ? <img src={cover} alt="cover" className="h-full w-full object-cover" />
              : <div className="flex h-full flex-col items-center justify-center gap-1 text-brand-purple">
                  <ImagePlus size={26} />
                  <span className="text-xs font-medium">เพิ่มรูปปก</span>
                </div>}
            <input type="file" accept="image/*" className="hidden" onChange={pick(setCover)} />
          </label>
          <label className="absolute -bottom-8 left-8 flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-4 border-surface-base bg-white shadow-md">
            {logo
              ? <img src={logo} alt="logo" className="h-full w-full object-cover" />
              : <div className="flex flex-col items-center text-brand-purple">
                  <Camera size={20} />
                  <span className="text-[9px] font-medium">โลโก้</span>
                </div>}
            <input type="file" accept="image/*" className="hidden" onChange={pick(setLogo)} />
          </label>
        </div>

        <div className="space-y-5 px-4">
          <Input label="ชื่อร้าน *" placeholder="เช่น Studio Hanjiku"
            value={form.shop_name} onChange={(e) => set('shop_name', e.target.value)} />

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">เกี่ยวกับร้าน</label>
            <textarea rows={3} placeholder="เล่าเกี่ยวกับคอลเลกชัน สไตล์ และจุดเด่นของร้าน..."
              value={form.description} onChange={(e) => set('description', e.target.value)}
              className="w-full resize-none rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none focus:border-brand-purple" />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">ที่ตั้ง</label>
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-3">
              <MapPin size={16} className="text-brand-purple" />
              <input value={form.location} onChange={(e) => set('location', e.target.value)}
                placeholder="เมือง/จังหวัด" className="flex-1 text-sm outline-none" />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">หมวดหมู่ที่ให้เช่า</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button key={c} onClick={() => toggleCat(c)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    form.categories.includes(c) ? 'bg-brand-purple text-white' : 'border border-gray-200 bg-white text-gray-600'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Shop rules — text and/or image, both optional */}
          <div className="rounded-2xl border border-brand-purple/15 bg-brand-light/30 p-4">
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-800">
              <ScrollText size={16} className="text-brand-purple" /> กฎของร้าน (แสดงบนหน้าสินค้า)
            </label>
            <textarea rows={4} placeholder="เช่น ห้ามตัด/ซักวิก, ราคาเทสใส่ในห้องเท่านั้น, ไม่ให้ผู้อื่นเช่าแทน... (จะใส่แค่รูปก็ได้)"
              value={form.rules_text} onChange={(e) => set('rules_text', e.target.value)}
              className="w-full resize-none rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none focus:border-brand-purple" />
            <label className="mt-3 block cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-brand-purple/30 bg-white">
              {rulesImage
                ? <img src={rulesImage} alt="กฎของร้าน" className="max-h-56 w-full object-contain" />
                : <div className="flex h-24 flex-col items-center justify-center gap-1 text-brand-purple">
                    <ImagePlus size={22} />
                    <span className="text-xs font-medium">เพิ่มรูปกฎของร้าน (ไม่บังคับ)</span>
                  </div>}
              <input type="file" accept="image/*" className="hidden" onChange={pick(setRulesImage)} />
            </label>
            {rulesImage && (
              <button onClick={() => setRulesImage(null)} className="mt-2 text-xs text-gray-400 underline">ลบรูปกฎ</button>
            )}
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-brand-light p-4">
            <Store size={18} className="mt-0.5 flex-shrink-0 text-brand-purple" />
            <p className="text-xs text-brand-purple/80">
              ข้อมูลนี้จะแสดงในหน้าโปรไฟล์ร้านและบนสินค้าทุกชิ้นของคุณ
            </p>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 border-t border-gray-100 bg-white p-4">
        <Button className="w-full" loading={loading} onClick={handleSave}>บันทึก</Button>
      </div>
    </div>
  );
}
