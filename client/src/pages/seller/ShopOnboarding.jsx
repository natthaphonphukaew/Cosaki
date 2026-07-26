import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Camera, ImagePlus, CheckCircle, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import useAuthStore from '@/store/authStore';
import { createShop } from '@/api/shops';
import useImageCropper from '@/hooks/useImageCropper';
import toast from 'react-hot-toast';

export default function ShopOnboarding() {
  const { t } = useTranslation();
  const CATEGORIES = [t('seller.shopOnboard.catAnime'), t('seller.shopOnboard.catGame'), t('seller.shopOnboard.catMovie'), t('seller.shopOnboard.catKpop'), t('seller.shopOnboard.catOriginal'), t('seller.shopOnboard.catProps')];
  const { open, element } = useImageCropper();
  const navigate = useNavigate();
  const { applyShopCreated } = useAuthStore();
  const [step, setStep]     = useState(0);   // 0 = details, 1 = success
  const [loading, setLoading] = useState(false);
  const [cover, setCover]   = useState(null);
  const [logo, setLogo]     = useState(null);
  const [form, setForm] = useState({
    shop_name: '', description: '', location: 'Bangkok', categories: [],
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const toggleCat = (c) =>
    set('categories', form.categories.includes(c)
      ? form.categories.filter((x) => x !== c)
      : [...form.categories, c]);

  const pick = (setter, cropOpts) => async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const url = await open(file, cropOpts);
      if (url) setter(url);
    } catch {
      toast.error(t('seller.shopOnboard.photoReadFailed'));
    }
  };

  const handleCreate = async () => {
    if (!form.shop_name.trim()) return toast.error(t('seller.shopOnboard.nameYourShop'));
    setLoading(true);
    try {
      const { data } = await createShop({
        shop_name:   form.shop_name.trim(),
        description: form.description.trim(),
        location:    form.location,
        categories:  form.categories,
        logo_url:    logo,
        cover_url:   cover,
      });
      // Persist shop + the fresh shop_admin token; flips into seller mode.
      applyShopCreated(data.data);
      setStep(1);
    } catch (err) {
      toast.error(err.response?.data?.message || t('seller.shopOnboard.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  /* ── Success ── */
  if (step === 1) return (
    <div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col items-center justify-center bg-surface-base px-6 text-center">
      <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-green-100">
        <CheckCircle size={56} className="text-green-500" strokeWidth={1.5} />
      </div>
      <h2 className="text-2xl font-bold text-gray-900">{t('seller.shopOnboard.shopLive')}</h2>
      <p className="mt-2 text-sm text-gray-500">
        {t('seller.shopOnboard.readyIn', { shop: form.shop_name })} <span className="font-semibold text-brand-purple">{t('seller.shopOnboard.sellingMode')}</span>.
      </p>
      <Button className="mt-8 w-full" onClick={() => navigate('/seller/dashboard')}>{t('seller.shopOnboard.goDashboard')}</Button>
      <Button variant="secondary" className="mt-3 w-full" onClick={() => navigate('/seller/items/new')}>
        {t('seller.shopOnboard.addFirstCostume')}
      </Button>
    </div>
  );

  /* ── Form ── */
  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      {element}
      <PageHeader title={t('header.openShop')} />

      <div className="pb-32">
        {/* Cover + logo */}
        <div className="relative mb-12 px-4">
          <label className="block h-32 w-full cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-brand-purple/30 bg-brand-light/40">
            {cover
              ? <img src={cover} alt="cover" className="h-full w-full object-cover" />
              : <div className="flex h-full flex-col items-center justify-center gap-1 text-brand-purple">
                  <ImagePlus size={26} />
                  <span className="text-xs font-medium">{t('seller.shopOnboard.addCoverPhoto')}</span>
                </div>
            }
            <input type="file" accept="image/*" className="hidden" onChange={pick(setCover, { aspect: 16 / 9 })} />
          </label>

          {/* Logo overlapping bottom-left */}
          <label className="absolute -bottom-8 left-8 flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-4 border-surface-base bg-white shadow-md">
            {logo
              ? <img src={logo} alt="logo" className="h-full w-full object-cover" />
              : <div className="flex flex-col items-center text-brand-purple">
                  <Camera size={20} />
                  <span className="text-[9px] font-medium">{t('seller.shopOnboard.logo')}</span>
                </div>
            }
            <input type="file" accept="image/*" className="hidden" onChange={pick(setLogo, { aspect: 1 })} />
          </label>
        </div>

        <div className="space-y-5 px-4">
          <Input
            label={t('seller.shopOnboard.shopNameLabel')}
            placeholder={t('seller.shopOnboard.shopNamePlaceholder')}
            value={form.shop_name}
            onChange={(e) => set('shop_name', e.target.value)}
          />

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">{t('seller.shopOnboard.aboutShop')}</label>
            <textarea
              rows={3}
              placeholder={t('seller.shopOnboard.aboutPlaceholder')}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className="w-full resize-none rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none focus:border-brand-purple"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">{t('seller.shopOnboard.location')}</label>
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-3">
              <MapPin size={16} className="text-brand-purple" />
              <input
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder={t('seller.shopOnboard.cityPlaceholder')}
                className="flex-1 text-sm outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">{t('seller.shopOnboard.whatRent')}</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => toggleCat(c)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    form.categories.includes(c)
                      ? 'bg-brand-purple text-white'
                      : 'border border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-brand-light p-4">
            <Store size={18} className="mt-0.5 flex-shrink-0 text-brand-purple" />
            <div>
              <p className="text-sm font-semibold text-brand-purple">{t('seller.shopOnboard.switchAnytime')}</p>
              <p className="mt-0.5 text-xs text-brand-purple/80">
                {t('seller.shopOnboard.switchDesc')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 border-t border-gray-100 bg-white p-4">
        <Button className="w-full" loading={loading} onClick={handleCreate}>
          {t('seller.shopOnboard.createShop')}
        </Button>
      </div>
    </div>
  );
}
