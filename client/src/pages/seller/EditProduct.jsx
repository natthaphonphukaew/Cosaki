import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, X, Trash2, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import { getItem, updateItem, deleteItem } from '@/api/items';
import { fileToDataUrl } from '@/utils/image';
import { COURIERS } from '@/constants/couriers';
import toast from 'react-hot-toast';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];
const FANDOMS = ['Genshin Impact', 'Arcane', 'Valorant', 'Demon Slayer', 'Spy x Family', 'Chainsaw Man', 'JJK', 'Original'];

export default function EditProduct() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [photos, setPhotos]   = useState([]);
  const [form, setForm] = useState({
    name: '', character: '', fandom: '', description: '',
    test_rate: '', private_rate: '', shipping_fee: '', min_age: 0, sizes: [], is_available: true,
    bust: '', waist: '', hip: '', height_recommended: '',
    return_days: 2, allow_event: false, express_delivery: false, return_couriers: [],
  });

  useEffect(() => {
    getItem(id).then(({ data }) => {
      const i = data.data.item;
      setPhotos(i.image_urls || []);
      setForm({
        name: i.name || '', character: i.character || '', fandom: i.fandom || '',
        description: i.description || '',
        test_rate: String(i.test_rate ?? i.daily_rate ?? ''),
        private_rate: String(i.private_rate ?? ''),
        shipping_fee: String(i.shipping_fee ?? ''),
        min_age: Number(i.min_age ?? 0),
        sizes: i.sizes || [], is_available: i.is_available !== false,
        bust: String(i.bust ?? ''), waist: String(i.waist ?? ''), hip: String(i.hip ?? ''),
        height_recommended: i.height_recommended || '',
        return_days: Number(i.return_days ?? 2),
        allow_event: !!i.allow_event, express_delivery: !!i.express_delivery,
        return_couriers: i.return_couriers || [],
      });
    }).catch(() => toast.error(t('seller.form.loadFailed')))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const toggleSize = (s) =>
    set('sizes', form.sizes.includes(s) ? form.sizes.filter((x) => x !== s) : [...form.sizes, s]);
  const toggleCourier = (c) =>
    set('return_couriers', form.return_couriers.includes(c) ? form.return_couriers.filter((x) => x !== c) : [...form.return_couriers, c]);

  const addPhotos = async (e) => {
    const files = Array.from(e.target.files).slice(0, 9 - photos.length);
    try {
      const urls = await Promise.all(files.map((f) => fileToDataUrl(f)));
      setPhotos((p) => [...p, ...urls].slice(0, 9));
    } catch { toast.error(t('seller.form.photoReadFailed')); }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.test_rate) return toast.error(t('seller.form.nameRateReq'));
    try {
      setSaving(true);
      await updateItem(id, {
        name: form.name.trim(), character: form.character, fandom: form.fandom,
        description: form.description,
        test_rate: parseFloat(form.test_rate),
        private_rate: form.private_rate ? parseFloat(form.private_rate) : parseFloat(form.test_rate),
        shipping_fee: parseFloat(form.shipping_fee || 0),
        min_age: Number(form.min_age) || 0,
        sizes: form.sizes, is_available: form.is_available, image_urls: photos,
        bust: form.bust ? Number(form.bust) : null,
        waist: form.waist ? Number(form.waist) : null,
        hip: form.hip ? Number(form.hip) : null,
        height_recommended: form.height_recommended || null,
        return_days: Number(form.return_days) || 2,
        allow_event: form.allow_event, express_delivery: form.express_delivery,
        return_couriers: form.return_couriers,
      });
      toast.success(t('seller.form.updated'));
      navigate('/seller/items');
    } catch (err) {
      toast.error(err.response?.data?.message || t('seller.form.updateFailedShort'));
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('seller.form.deleteConfirm'))) return;
    try {
      await deleteItem(id);
      toast.success(t('seller.form.deleted'));
      navigate('/seller/items');
    } catch (err) {
      toast.error(err.response?.data?.message || t('seller.form.deleteFailed'));
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-surface-base"><Spinner /></div>;

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader
        title={t('seller.form.editListing')}
        right={<button onClick={handleDelete} className="flex h-9 w-9 items-center justify-center rounded-full text-red-500 active:bg-red-50"><Trash2 size={18} /></button>}
      />

      <div className="px-4 pb-32 space-y-5">
        {/* Photos */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">{t('seller.form.photos')}</label>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((url, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                <img src={url} alt="" className="h-full w-full object-cover" />
                {i === 0 && <span className="absolute left-1 top-1 flex items-center gap-0.5 rounded bg-brand-purple px-1.5 py-0.5 text-[9px] font-bold text-white"><Star size={9} />{t('seller.form.cover')}</span>}
                <button onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"><X size={10} /></button>
              </div>
            ))}
            {photos.length < 9 && (
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-brand-purple/30 bg-brand-light/30 text-brand-purple">
                <Camera size={22} /><span className="text-[10px] font-semibold">{t('seller.form.addShort')}</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={addPhotos} />
              </label>
            )}
          </div>
        </div>

        <Input label={t('seller.form.costumeName')} value={form.name} onChange={(e) => set('name', e.target.value)} />
        <Input label={t('seller.form.character')} value={form.character} onChange={(e) => set('character', e.target.value)} />

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">{t('seller.form.fandom')}</label>
          <input value={form.fandom} onChange={(e) => set('fandom', e.target.value)} placeholder={t('seller.form.fandomPlaceholderShort')}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-purple" />
          <div className="mt-2 flex flex-wrap gap-2">
            {FANDOMS.map((f) => (
              <button key={f} onClick={() => set('fandom', f)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${form.fandom === f ? 'bg-brand-purple text-white' : 'border border-gray-200 bg-white text-gray-600'}`}>{f}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">{t('seller.form.sizes')}</label>
          <div className="flex flex-wrap gap-2">
            {SIZES.map((s) => (
              <button key={s} onClick={() => toggleSize(s)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${form.sizes.includes(s) ? 'bg-brand-purple text-white' : 'border border-gray-200 bg-white text-gray-600'}`}>{s}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">{t('seller.form.description')}</label>
          <textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)}
            className="w-full resize-none rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none focus:border-brand-purple" />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">{t('seller.form.rentalRates')}</label>
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('seller.form.testAtHome')} type="number" value={form.test_rate} onChange={(e) => set('test_rate', e.target.value)} />
            <Input label={t('seller.form.privateEvent')} type="number" value={form.private_rate} onChange={(e) => set('private_rate', e.target.value)} />
          </div>
        </div>
        <Input label={t('seller.form.shippingFeeLabel')} type="number" value={form.shipping_fee} onChange={(e) => set('shipping_fee', e.target.value)} />

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">{t('seller.form.minAge')}</label>
          <div className="flex flex-wrap gap-2">
            {[{v:0,l:t('seller.form.ageUnlimited')},{v:15,l:'15+'},{v:18,l:'18+'},{v:20,l:'20+'}].map((o) => (
              <button key={o.v} onClick={() => set('min_age', o.v)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium ${Number(form.min_age) === o.v ? 'bg-brand-purple text-white' : 'border border-gray-200 bg-white text-gray-600'}`}>
                {o.l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">{t('seller.form.costumeMeasure')}</label>
          <div className="grid grid-cols-3 gap-2">
            <Input label={t('edit.bust')} type="number" value={form.bust} onChange={(e) => set('bust', e.target.value)} />
            <Input label={t('edit.waist')} type="number" value={form.waist} onChange={(e) => set('waist', e.target.value)} />
            <Input label={t('edit.hip')} type="number" value={form.hip} onChange={(e) => set('hip', e.target.value)} />
          </div>
          <div className="mt-2"><Input label={t('seller.form.heightRec')} value={form.height_recommended} onChange={(e) => set('height_recommended', e.target.value)} placeholder={t('seller.form.heightPlaceholder')} /></div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">{t('seller.form.slaLabel')}</label>
          <Input label={t('seller.form.returnWithin')} type="number" value={form.return_days} onChange={(e) => set('return_days', e.target.value)} />
          <p className="mt-1 text-xs text-gray-400">{t('seller.form.slaHint')}</p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">{t('seller.form.quickOptions')}</label>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => set('allow_event', !form.allow_event)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${form.allow_event ? 'bg-brand-purple text-white' : 'border border-gray-200 bg-white text-gray-600'}`}>{t('seller.form.allowEvent')}</button>
            <button onClick={() => set('express_delivery', !form.express_delivery)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${form.express_delivery ? 'bg-brand-purple text-white' : 'border border-gray-200 bg-white text-gray-600'}`}>{t('seller.form.expressInProvince')}</button>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">{t('seller.form.returnCouriers')}</label>
          <div className="flex flex-wrap gap-2">
            {COURIERS.map((c) => (
              <button key={c} onClick={() => toggleCourier(c)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${form.return_couriers.includes(c) ? 'bg-brand-purple text-white' : 'border border-gray-200 bg-white text-gray-600'}`}>{c}</button>
            ))}
          </div>
        </div>

        {/* Availability toggle */}
        <button
          onClick={() => set('is_available', !form.is_available)}
          className="flex w-full items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
        >
          <div className="text-left">
            <p className="text-sm font-medium text-gray-800">{t('seller.form.visibleToRenters')}</p>
            <p className="text-xs text-gray-400">{form.is_available ? t('seller.form.listingLive') : t('seller.form.hiddenFromSearch')}</p>
          </div>
          <span className={`relative h-6 w-11 rounded-full transition-colors ${form.is_available ? 'bg-brand-purple' : 'bg-gray-300'}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${form.is_available ? 'left-[22px]' : 'left-0.5'}`} />
          </span>
        </button>
      </div>

      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 border-t border-gray-100 bg-white p-4">
        <Button className="w-full" loading={saving} onClick={handleSave}>{t('seller.form.saveChanges')}</Button>
      </div>
    </div>
  );
}
