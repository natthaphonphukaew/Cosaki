import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ThaiRegionPicker from '@/components/ui/ThaiRegionPicker';
import MockMap from '@/components/ui/MockMap';
import { listAddresses, createAddress, updateAddress } from '@/api/addresses';
import toast from 'react-hot-toast';

const LABELS = ['บ้าน', 'ที่ทำงาน'];

export default function AddressForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = !!id;
  const [ready, setReady]   = useState(!editing);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    recipient_name: '', phone: '', detail_line: '', label: '', is_default: false,
    region: { province: '', district: '', subdistrict: '', postal_code: '', latitude: null, longitude: null },
  });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // Edit mode: load the existing address (list + find).
  useEffect(() => {
    if (!editing) return;
    listAddresses().then(({ data }) => {
      const a = data.data.addresses.find((x) => x.id === id);
      if (!a) { toast.error('ไม่พบที่อยู่'); navigate('/addresses'); return; }
      setForm({
        recipient_name: a.recipient_name, phone: a.phone, detail_line: a.detail_line,
        label: a.label || '', is_default: a.is_default,
        region: { province: a.province, district: a.district, subdistrict: a.subdistrict,
          postal_code: a.postal_code, latitude: a.latitude, longitude: a.longitude },
      });
    }).catch(() => toast.error('โหลดที่อยู่ไม่สำเร็จ')).finally(() => setReady(true));
  }, [id]);

  const save = async () => {
    const r = form.region;
    if (!form.recipient_name.trim()) return toast.error('กรุณากรอกชื่อ-นามสกุล');
    if (!form.phone.trim())          return toast.error('กรุณากรอกเบอร์โทรศัพท์');
    if (!r.province)                 return toast.error('กรุณาเลือกจังหวัด/เขต/แขวง');
    if (!form.detail_line.trim())    return toast.error('กรุณากรอกบ้านเลขที่/ถนน');
    const payload = {
      recipient_name: form.recipient_name.trim(), phone: form.phone.trim(),
      province: r.province, district: r.district, subdistrict: r.subdistrict, postal_code: r.postal_code,
      detail_line: form.detail_line.trim(), label: form.label || null,
      latitude: r.latitude, longitude: r.longitude, is_default: form.is_default,
    };
    setSaving(true);
    try {
      if (editing) await updateAddress(id, payload);
      else await createAddress(payload);
      toast.success('บันทึกที่อยู่แล้ว');
      navigate('/addresses');
    } catch (err) {
      toast.error(err.response?.data?.message || 'บันทึกไม่สำเร็จ');
    } finally { setSaving(false); }
  };

  if (!ready) return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
    </div>
  );

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title={editing ? 'แก้ไขที่อยู่' : 'เพิ่มที่อยู่ใหม่'} />
      <div className="space-y-4 px-4 pb-32 pt-2">
        <div className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
          <Input label="ชื่อ-นามสกุล" value={form.recipient_name} onChange={(e) => set('recipient_name', e.target.value)} placeholder="ชื่อผู้รับ" />
          <Input label="หมายเลขโทรศัพท์" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="0xx-xxx-xxxx" />
          <ThaiRegionPicker value={form.region} onChange={(v) => set('region', v)} />
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">บ้านเลขที่, ซอย, หมู่, ถนน, แขวง/ตำบล</label>
            <textarea rows={3} value={form.detail_line} onChange={(e) => set('detail_line', e.target.value)}
              placeholder="เช่น 85 ซอยประชาอุทิศ 27 แขวงบางมด เขตทุ่งครุ"
              className="w-full resize-none rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none focus:border-brand-purple" />
          </div>
        </div>

        {/* Label + default */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">ติดป้ายเป็น (ไม่บังคับ)</p>
          <div className="flex gap-2">
            {LABELS.map((l) => (
              <button key={l} onClick={() => set('label', form.label === l ? '' : l)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium ${form.label === l ? 'bg-brand-purple text-white' : 'border border-gray-200 text-gray-600'}`}>
                {l}
              </button>
            ))}
          </div>
          <label className="mt-4 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">ตั้งเป็นที่อยู่เริ่มต้น</span>
            <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_default ? 'bg-brand-purple' : 'bg-gray-200'}`}>
              <input type="checkbox" className="sr-only" checked={form.is_default} onChange={(e) => set('is_default', e.target.checked)} />
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.is_default ? 'translate-x-6' : 'translate-x-1'}`} />
            </div>
          </label>
        </div>

        <MockMap latitude={form.region.latitude} longitude={form.region.longitude} />
      </div>

      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 border-t border-gray-100 bg-white p-4">
        <Button className="w-full" loading={saving} onClick={save}>ยืนยัน</Button>
      </div>
    </div>
  );
}
