import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ThaiRegionPicker from '@/components/ui/ThaiRegionPicker';
import MockMap from '@/components/ui/MockMap';
import { listAddresses, createAddress, updateAddress } from '@/api/addresses';
import toast from 'react-hot-toast';

export default function AddressForm() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = !!id;
  const LABELS = [{ key: 'home', label: t('address.home') }, { key: 'work', label: t('address.work') }];
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
      if (!a) { toast.error(t('address.notFound')); navigate('/addresses'); return; }
      setForm({
        recipient_name: a.recipient_name, phone: a.phone, detail_line: a.detail_line,
        label: a.label || '', is_default: a.is_default,
        region: { province: a.province, district: a.district, subdistrict: a.subdistrict,
          postal_code: a.postal_code, latitude: a.latitude, longitude: a.longitude },
      });
    }).catch(() => toast.error(t('address.loadFailed'))).finally(() => setReady(true));
  }, [id]);

  const save = async () => {
    const r = form.region;
    if (!form.recipient_name.trim()) return toast.error(t('address.reqName'));
    if (!form.phone.trim())          return toast.error(t('address.reqPhone'));
    if (!r.province)                 return toast.error(t('address.reqRegion'));
    if (!form.detail_line.trim())    return toast.error(t('address.reqDetail'));
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
      toast.success(t('address.saved'));
      navigate('/addresses');
    } catch (err) {
      toast.error(err.response?.data?.message || t('address.saveFailed'));
    } finally { setSaving(false); }
  };

  if (!ready) return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
    </div>
  );

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title={editing ? t('address.editTitle') : t('address.newTitle')} />
      <div className="space-y-4 px-4 pb-32 pt-2">
        <div className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
          <Input label={t('address.name')} value={form.recipient_name} onChange={(e) => set('recipient_name', e.target.value)} placeholder={t('address.namePlaceholder')} />
          <Input label={t('address.phone')} type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="0xx-xxx-xxxx" />
          <ThaiRegionPicker value={form.region} onChange={(v) => set('region', v)} />
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">{t('address.detail')}</label>
            <textarea rows={3} value={form.detail_line} onChange={(e) => set('detail_line', e.target.value)}
              placeholder={t('address.detailPlaceholder')}
              className="w-full resize-none rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none focus:border-brand-purple" />
          </div>
        </div>

        {/* Label + default */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">{t('address.labelAs')}</p>
          <div className="flex gap-2">
            {LABELS.map((l) => (
              <button key={l.key} onClick={() => set('label', form.label === l.label ? '' : l.label)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium ${form.label === l.label ? 'bg-brand-purple text-white' : 'border border-gray-200 text-gray-600'}`}>
                {l.label}
              </button>
            ))}
          </div>
          <label className="mt-4 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{t('address.setAsDefault')}</span>
            <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_default ? 'bg-brand-purple' : 'bg-gray-200'}`}>
              <input type="checkbox" className="sr-only" checked={form.is_default} onChange={(e) => set('is_default', e.target.checked)} />
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.is_default ? 'translate-x-6' : 'translate-x-1'}`} />
            </div>
          </label>
        </div>

        <MockMap latitude={form.region.latitude} longitude={form.region.longitude} />
      </div>

      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 border-t border-gray-100 bg-white p-4">
        <Button className="w-full" loading={saving} onClick={save}>{t('address.confirm')}</Button>
      </div>
    </div>
  );
}
