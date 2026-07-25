import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, X, CheckCircle, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { createItem } from '@/api/items';
import { fileToDataUrl } from '@/utils/image';
import { COURIERS } from '@/constants/couriers';
import toast from 'react-hot-toast';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];
const FANDOMS = ['Genshin Impact', 'Arcane', 'Valorant', 'Demon Slayer', 'Spy x Family', 'Chainsaw Man', 'JJK', 'Original'];

export default function AddProduct() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep]     = useState(1);   // 1=photos, 2=details, 3=done
  const [photos, setPhotos] = useState([]);  // data URLs
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', character: '', fandom: '', description: '',
    test_rate: '', private_rate: '', shipping_fee: '', min_age: 0, sizes: [],
    bust: '', waist: '', hip: '', height_recommended: '',
    return_days: 2, allow_event: false, express_delivery: false, return_couriers: [],
  });

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
    } catch {
      toast.error(t('seller.form.photoReadFailed'));
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.test_rate) return toast.error(t('seller.form.nameRateReq'));
    try {
      setLoading(true);
      await createItem({
        name:         form.name.trim(),
        character:    form.character,
        fandom:       form.fandom,
        description:  form.description,
        test_rate:    parseFloat(form.test_rate),
        private_rate: form.private_rate ? parseFloat(form.private_rate) : undefined,
        shipping_fee: parseFloat(form.shipping_fee || 0),
        min_age:      Number(form.min_age) || 0,
        sizes:        form.sizes,
        bust:         form.bust ? Number(form.bust) : undefined,
        waist:        form.waist ? Number(form.waist) : undefined,
        hip:          form.hip ? Number(form.hip) : undefined,
        height_recommended: form.height_recommended || undefined,
        return_days:  Number(form.return_days) || 2,
        allow_event:  form.allow_event,
        express_delivery: form.express_delivery,
        return_couriers: form.return_couriers,
        image_urls:   photos,
      });
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || t('seller.form.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 3: Success with cover preview ── */
  if (step === 3) return (
    <div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col items-center justify-center bg-surface-base px-6 text-center">
      <div className="relative mb-5">
        <div className="h-44 w-44 overflow-hidden rounded-3xl bg-brand-light shadow-lg flex items-center justify-center text-5xl">
          {photos[0] ? <img src={photos[0]} alt="cover" className="h-full w-full object-cover" /> : '🎭'}
        </div>
        <div className="absolute -bottom-3 -right-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500 border-4 border-surface-base">
          <CheckCircle size={24} className="text-white" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-gray-900">{t('seller.form.listingPublished')}</h2>
      <p className="mt-1 text-sm font-semibold text-brand-purple">{form.name}</p>
      <p className="mt-1 text-sm text-gray-500">{t('seller.form.testPerDayVisible', { rate: form.test_rate })}</p>
      <Button className="mt-8 w-full" onClick={() => navigate('/seller/items')}>{t('seller.form.viewMyListings')}</Button>
      <Button
        variant="secondary"
        className="mt-3 w-full"
        onClick={() => { setStep(1); setPhotos([]); setForm({ name:'', character:'', fandom:'', description:'', test_rate:'', private_rate:'', shipping_fee:'', min_age:0, sizes:[], bust:'', waist:'', hip:'', height_recommended:'', ship_lead_days:2, return_days:2, allow_event:false, express_delivery:false, return_couriers:[] }); }}
      >
        {t('seller.form.addAnother')}
      </Button>
    </div>
  );

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title={step === 1 ? t('seller.form.addPhotos') : t('seller.form.detailsRules')} />

      {/* Step indicator */}
      <div className="flex items-center gap-2 px-4 pb-4">
        {[1, 2].map((s) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${step >= s ? 'bg-brand-purple text-white' : 'bg-gray-200 text-gray-400'}`}>{s}</div>
            <div className={`h-1 flex-1 rounded-full ${step > s ? 'bg-brand-purple' : 'bg-gray-200'}`} />
          </div>
        ))}
      </div>

      {/* ── Step 1: Photos ── */}
      {step === 1 && (
        <div className="px-4 pb-32 space-y-4">
          <p className="text-sm text-gray-500">{t('seller.form.upTo9')}</p>

          {/* Big cover slot */}
          <label className="block h-52 w-full cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-brand-purple/30 bg-brand-light/30">
            {photos[0]
              ? <div className="relative h-full w-full">
                  <img src={photos[0]} alt="cover" className="h-full w-full object-cover" />
                  <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-brand-purple px-2 py-0.5 text-[10px] font-bold text-white">
                    <Star size={10} /> {t('seller.form.cover')}
                  </span>
                </div>
              : <div className="flex h-full flex-col items-center justify-center gap-2 text-brand-purple">
                  <Camera size={34} />
                  <span className="text-sm font-semibold">{t('seller.form.addCoverPhoto')}</span>
                  <span className="text-xs text-brand-purple/60">{t('seller.form.tapUpload')}</span>
                </div>
            }
            <input type="file" accept="image/*" multiple className="hidden" onChange={addPhotos} />
          </label>

          {/* Thumbnail strip */}
          <div className="grid grid-cols-4 gap-2">
            {photos.slice(1).map((url, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => setPhotos((p) => p.filter((_, j) => j !== i + 1))}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            {photos.length > 0 && photos.length < 9 && (
              <label className="flex aspect-square cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
                <Camera size={18} />
                <input type="file" accept="image/*" multiple className="hidden" onChange={addPhotos} />
              </label>
            )}
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm space-y-1.5">
            <p className="text-sm font-semibold text-gray-800">{t('seller.form.photoTips')}</p>
            {[t('seller.form.photoTip1'), t('seller.form.photoTip2'), t('seller.form.photoTip3'), t('seller.form.photoTip4')].map((tip) => (
              <p key={tip} className="text-xs text-gray-500">• {tip}</p>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 2: Details ── */}
      {step === 2 && (
        <div className="px-4 pb-32 space-y-5">
          <Input label={t('seller.form.costumeName')} placeholder={t('seller.form.costumeNamePlaceholder')} value={form.name} onChange={(e) => set('name', e.target.value)} />
          <Input label={t('seller.form.character')} placeholder={t('seller.form.characterPlaceholder')} value={form.character} onChange={(e) => set('character', e.target.value)} />

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">{t('seller.form.fandom')}</label>
            <input
              value={form.fandom}
              onChange={(e) => set('fandom', e.target.value)}
              placeholder={t('seller.form.fandomPlaceholder')}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-purple"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {FANDOMS.map((f) => (
                <button key={f} onClick={() => set('fandom', f)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${form.fandom === f ? 'bg-brand-purple text-white' : 'border border-gray-200 bg-white text-gray-600'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">{t('seller.form.availableSizes')}</label>
            <div className="flex flex-wrap gap-2">
              {SIZES.map((s) => (
                <button key={s} onClick={() => toggleSize(s)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${form.sizes.includes(s) ? 'bg-brand-purple text-white' : 'border border-gray-200 bg-white text-gray-600'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">{t('seller.form.description')}</label>
            <textarea rows={3} placeholder={t('seller.form.descPlaceholder')}
              value={form.description} onChange={(e) => set('description', e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none resize-none focus:border-brand-purple" />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">{t('seller.form.rentalRates')}</label>
            <div className="grid grid-cols-2 gap-3">
              <Input label={t('seller.form.testAtHome')} type="number" placeholder="500" value={form.test_rate} onChange={(e) => set('test_rate', e.target.value)} />
              <Input label={t('seller.form.privateEvent')} type="number" placeholder="700" value={form.private_rate} onChange={(e) => set('private_rate', e.target.value)} />
            </div>
            <p className="mt-1 text-xs text-gray-400">{t('seller.form.ratesHint')}</p>
          </div>
          <Input label={t('seller.form.shippingFeeLabel')} type="number" placeholder="40" value={form.shipping_fee} onChange={(e) => set('shipping_fee', e.target.value)} />

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">{t('seller.form.minAge')}</label>
            <div className="flex flex-wrap gap-2">
              {[{v:0,l:t('seller.form.ageUnlimited')},{v:15,l:'15+'},{v:18,l:'18+'},{v:20,l:'20+'}].map((o) => (
                <button key={o.v} onClick={() => set('min_age', o.v)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${Number(form.min_age) === o.v ? 'bg-brand-purple text-white' : 'border border-gray-200 bg-white text-gray-600'}`}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>

          {/* Measurements */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">{t('seller.form.costumeMeasure')}</label>
            <div className="grid grid-cols-3 gap-2">
              <Input label={t('edit.bust')} type="number" value={form.bust} onChange={(e) => set('bust', e.target.value)} />
              <Input label={t('edit.waist')} type="number" value={form.waist} onChange={(e) => set('waist', e.target.value)} />
              <Input label={t('edit.hip')} type="number" value={form.hip} onChange={(e) => set('hip', e.target.value)} />
            </div>
            <div className="mt-2">
              <Input label={t('seller.form.heightRec')} value={form.height_recommended} onChange={(e) => set('height_recommended', e.target.value)} placeholder={t('seller.form.heightPlaceholder')} />
            </div>
          </div>

          {/* SLA */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">{t('seller.form.slaLabel')}</label>
            <Input label={t('seller.form.returnWithin')} type="number" value={form.return_days} onChange={(e) => set('return_days', e.target.value)} />
            <p className="mt-1 text-xs text-gray-400">{t('seller.form.slaHint')}</p>
          </div>

          {/* Badges */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">{t('seller.form.quickOptions')}</label>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => set('allow_event', !form.allow_event)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${form.allow_event ? 'bg-brand-purple text-white' : 'border border-gray-200 bg-white text-gray-600'}`}>
                {t('seller.form.allowEvent')}
              </button>
              <button onClick={() => set('express_delivery', !form.express_delivery)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${form.express_delivery ? 'bg-brand-purple text-white' : 'border border-gray-200 bg-white text-gray-600'}`}>
                {t('seller.form.expressInProvince')}
              </button>
            </div>
          </div>

          {/* Return couriers */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">{t('seller.form.returnCouriers')}</label>
            <div className="flex flex-wrap gap-2">
              {COURIERS.map((c) => (
                <button key={c} onClick={() => toggleCourier(c)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium ${form.return_couriers.includes(c) ? 'bg-brand-purple text-white' : 'border border-gray-200 bg-white text-gray-600'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 space-y-1">
            <p className="text-sm font-semibold text-amber-800">{t('seller.form.rentalRules')}</p>
            {[t('seller.form.rule1'), t('seller.form.rule2'), t('seller.form.rule3'), t('seller.form.rule4')].map((r) => (
              <p key={r} className="text-xs text-amber-700">• {r}</p>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 border-t border-gray-100 bg-white p-4 flex gap-3">
        {step === 2 && <Button variant="secondary" className="w-20" onClick={() => setStep(1)}>{t('common.back')}</Button>}
        {step === 1
          ? <Button className="flex-1" disabled={photos.length === 0} onClick={() => setStep(2)}>{t('seller.form.nextAddDetails')}</Button>
          : <Button className="flex-1" onClick={handleSubmit} loading={loading}>{t('seller.form.publishListing')}</Button>
        }
      </div>
    </div>
  );
}
