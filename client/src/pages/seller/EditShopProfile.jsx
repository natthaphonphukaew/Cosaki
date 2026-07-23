import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Camera, Store, MapPin, FileText, CreditCard,
  Truck, Package, ChevronDown, ChevronUp, X
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ThaiAddressSelector from '@/components/ui/ThaiAddressSelector';
import { getMyShop, updateShop } from '@/api/shops';
import { fileToDataUrl } from '@/utils/image';
import useAuthStore from '@/store/authStore';
import toast from 'react-hot-toast';

const COURIERS = ['Flash', 'EMS', 'Kerry', 'J&T', 'ไปรษณีย์', 'Lalamove', 'DHL'];
const BANKS = [
  'กสิกรไทย (KBANK)', 'ไทยพาณิชย์ (SCB)', 'กรุงเทพ (BBL)',
  'กรุงไทย (KTB)', 'ทหารไทยธนชาต (TTB)', 'กรุงศรี (BAY)',
  'ออมสิน', 'ธอส.', 'ซิตี้แบงก์', 'พร้อมเพย์',
];

function Section({ icon: Icon, title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-4"
      >
        <div className="flex items-center gap-2.5 font-semibold text-gray-800 text-sm">
          <Icon size={18} className="text-brand-purple" />
          {title}
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && <div className="px-4 pb-5 space-y-4 border-t border-gray-50 pt-4">{children}</div>}
    </div>
  );
}

function CourierPills({ label, selected, onChange }) {
  const toggle = (c) =>
    onChange(selected.includes(c) ? selected.filter((x) => x !== c) : [...selected, c]);
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <div className="flex flex-wrap gap-2">
        {COURIERS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => toggle(c)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              selected.includes(c)
                ? 'bg-brand-purple text-white shadow-sm'
                : 'border border-gray-200 bg-white text-gray-600'
            }`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function EditShopProfile() {
  const navigate = useNavigate();
  const { shop, setShop } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [cover, setCover] = useState(null);   // new cover (dataUrl)
  const [logo, setLogo]   = useState(null);   // new logo (dataUrl)

  const [form, setForm] = useState({
    shop_name: '',
    description: '',
    rules: '',
    rules_images: [],
    couriers_out: [],
    couriers_return: [],
    bank_name: '',
    bank_account_number: '',
    bank_account_name: '',
  });

  // address fields managed separately so ThaiAddressSelector can init from saved data
  const [addressStr, setAddressStr]     = useState('');
  const [addressObj, setAddressObj]     = useState(null);
  const [initAddressObj, setInitAddressObj] = useState(null);

  useEffect(() => {
    getMyShop()
      .then(({ data }) => {
        const s = data.data.shop;
        const ba = s.bank_account || {};
        const ad = s.address_detail || {};
        setForm({
          shop_name: s.shop_name || '',
          description: s.description || '',
          rules: s.rules || '',
          rules_images: s.rules_images || [],
          couriers_out: s.couriers_out || [],
          couriers_return: s.couriers_return || [],
          bank_name: ba.bank_name || '',
          bank_account_number: ba.account_number || '',
          bank_account_name: ba.account_name || '',
        });
        // Restore saved address
        if (s.address_detail) {
          const full = s.location || '';
          setAddressStr(full);
          setInitAddressObj(ad);
          setAddressObj(ad);
        }
        setCover(s.cover_url || null);
        setLogo(s.logo_url || null);
      })
      .catch(() => toast.error('โหลดข้อมูลร้านไม่ได้'))
      .finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const pickImage = (setter) => async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setter(await fileToDataUrl(file));
    } catch {
      toast.error('ไม่สามารถอ่านรูปภาพได้');
    }
  };

  const addRulesPhotos = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    try {
      const urls = await Promise.all(files.map(fileToDataUrl));
      setForm((p) => ({ ...p, rules_images: [...p.rules_images, ...urls].slice(0, 5) }));
    } catch {
      toast.error('ไม่สามารถอ่านรูปภาพได้');
    }
  };

  const removeRulesPhoto = (i) => {
    setForm((p) => ({ ...p, rules_images: p.rules_images.filter((_, idx) => idx !== i) }));
  };

  const handleSave = async () => {
    if (!form.shop_name.trim()) return toast.error('กรุณาใส่ชื่อร้าน');
    setSaving(true);
    try {
      const payload = {
        shop_name: form.shop_name.trim(),
        description: form.description.trim() || null,
        // location stores the human-readable full address for display
        location: addressStr.trim() || null,
        address_detail: addressObj || null,
        rules: form.rules.trim() || null,
        rules_images: form.rules_images,
        couriers_out: form.couriers_out,
        couriers_return: form.couriers_return,
        cover_url: cover || null,
        logo_url: logo || null,
        bank_account:
          form.bank_account_number.trim()
            ? {
                bank_name: form.bank_name,
                account_number: form.bank_account_number.trim(),
                account_name: form.bank_account_name.trim(),
              }
            : undefined,
      };
      const { data } = await updateShop(payload);
      if (setShop) setShop(data.data.shop);
      toast.success('บันทึกข้อมูลร้านสำเร็จ');
      navigate(-1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-purple border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/80 px-4 py-4 backdrop-blur-md">
        <button
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-700"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">แก้ไขโปรไฟล์ร้าน</h1>
        <div className="w-10" />
      </div>

      <div className="px-4 py-5 space-y-4 pb-32">
        {/* Cover + Logo */}
        <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
          {/* Cover image */}
          <label className="relative block h-36 cursor-pointer bg-gray-100 overflow-hidden">
            {cover ? (
              <img src={cover} alt="cover" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-300">
                <Camera size={32} />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-700">
                <Camera size={14} /> เปลี่ยนรูปปก
              </div>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={pickImage(setCover)} />
          </label>
          {/* Logo */}
          <div className="flex items-center gap-4 px-4 py-4">
            <label className="relative h-16 w-16 cursor-pointer overflow-hidden rounded-full border-4 border-white bg-brand-light shadow-md flex-shrink-0">
              {logo ? (
                <img src={logo} alt="logo" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-brand-purple font-bold text-xl">
                  {form.shop_name?.[0] || 'S'}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity rounded-full">
                <Camera size={14} className="text-white" />
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={pickImage(setLogo)} />
            </label>
            <div>
              <p className="text-xs text-gray-400">โลโก้ร้าน</p>
              <p className="text-xs text-gray-300 mt-0.5">แตะเพื่อเปลี่ยน</p>
            </div>
          </div>
        </div>

        {/* Basic info */}
        <Section icon={Store} title="ข้อมูลร้าน">
          <Input
            label="ชื่อร้าน *"
            value={form.shop_name}
            onChange={(e) => set('shop_name', e.target.value)}
            placeholder="เช่น Sakura Cosplay Studio"
          />
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              คำอธิบายร้าน
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="แนะนำร้านของคุณ..."
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm outline-none focus:border-brand-purple"
            />
          </div>
        </Section>

        {/* Location */}
        <Section icon={MapPin} title="ที่อยู่ร้าน">
          <ThaiAddressSelector
            value={addressStr}
            initialAddressObj={initAddressObj}
            onChange={(full, obj) => {
              setAddressStr(full);
              if (obj) setAddressObj(obj);
            }}
          />
        </Section>

        {/* Shop rules */}
        <Section icon={FileText} title="กฎของร้าน">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              ระบุกฎหรือเงื่อนไขการเช่า
            </label>
            <textarea
              rows={5}
              value={form.rules}
              onChange={(e) => set('rules', e.target.value)}
              placeholder={`เช่น:\n- ห้ามนำชุดไปออกงานโดยไม่แจ้ง\n- ต้องส่งคืนภายใน 3 วันหลังใช้งาน\n- หากชุดเสียหายจะหักจากเงินมัดจำ`}
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm outline-none focus:border-brand-purple mb-3"
            />
            {/* Rules images */}
            <div className="flex flex-wrap gap-2">
              {form.rules_images.map((img, i) => (
                <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 flex-shrink-0">
                  <img src={img} alt="rule" className="h-full w-full object-cover" />
                  <button
                    onClick={() => removeRulesPhoto(i)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              {form.rules_images.length < 5 && (
                <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-gray-400 flex-shrink-0 hover:bg-gray-50">
                  <Camera size={20} />
                  <input type="file" accept="image/*" multiple className="hidden" onChange={addRulesPhotos} />
                </label>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-400">ใส่ได้สูงสุด 5 รูป สำหรับอธิบายกฎต่างๆ เพิ่มเติม</p>
          </div>
        </Section>

        {/* Couriers */}
        <Section icon={Truck} title="ขนส่ง">
          <CourierPills
            label="ขนส่งที่ร้านส่งให้ลูกค้า"
            selected={form.couriers_out}
            onChange={(v) => set('couriers_out', v)}
          />
          <CourierPills
            label="ขนส่งที่ร้านอนุญาตให้ส่งคืน"
            selected={form.couriers_return}
            onChange={(v) => set('couriers_return', v)}
          />
        </Section>

        {/* Bank account */}
        <Section icon={CreditCard} title="บัญชีธนาคาร">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              ธนาคาร
            </label>
            <select
              value={form.bank_name}
              onChange={(e) => set('bank_name', e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm outline-none focus:border-brand-purple"
            >
              <option value="">เลือกธนาคาร</option>
              {BANKS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <Input
            label="เลขบัญชี"
            value={form.bank_account_number}
            onChange={(e) => set('bank_account_number', e.target.value)}
            placeholder="เช่น 012-3-45678-9"
          />
          <Input
            label="ชื่อบัญชี"
            value={form.bank_account_name}
            onChange={(e) => set('bank_account_name', e.target.value)}
            placeholder="ชื่อ-นามสกุล ที่ผูกกับบัญชี"
          />
          <p className="text-[11px] text-gray-400">
            ข้อมูลบัญชีใช้สำหรับรับโอนเงินค่าเช่าจาก Cosaki เท่านั้น
          </p>
        </Section>
      </div>

      {/* Sticky save button */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 border-t border-gray-100 bg-white p-4">
        <Button className="w-full" loading={saving} onClick={handleSave}>
          บันทึกการเปลี่ยนแปลง
        </Button>
      </div>
    </div>
  );
}
