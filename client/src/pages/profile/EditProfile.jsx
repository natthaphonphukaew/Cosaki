import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { getMe, updateMe } from '@/api/users';
import useAuthStore from '@/store/authStore';
import useImageCropper from '@/hooks/useImageCropper';
import toast from 'react-hot-toast';

export default function EditProfile() {
  const { t } = useTranslation();
  const { open, element } = useImageCropper();
  const { user, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [name, setName]     = useState(user?.display_name || '');
  const [avatar, setAvatar] = useState(user?.avatar_url || '');
  const [m, setM]           = useState({ bust: '', waist: '', hip: '', height: '' });
  const [busy, setBusy]     = useState(false);

  // Load latest measurements (not always in the auth store). Address now lives in
  // the dedicated address book (/addresses), not on the profile.
  useEffect(() => {
    getMe().then(({ data }) => {
      const u = data.data.user;
      setM({ bust: u.bust ?? '', waist: u.waist ?? '', hip: u.hip ?? '', height: u.height ?? '' });
    }).catch(() => {});
  }, []);

  const pickAvatar = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const url = await open(file, { aspect: 1, round: true, maxDim: 400 });
      if (url) setAvatar(url);
    } catch { toast.error(t('edit.photoFailed')); }
  };

  const num = (v) => (v === '' || v === null ? null : Number(v));

  const handleSave = async () => {
    if (!name.trim()) return toast.error(t('edit.nameRequired'));
    try {
      setBusy(true);
      const { data } = await updateMe({
        display_name: name.trim(), avatar_url: avatar || null,
        bust: num(m.bust), waist: num(m.waist), hip: num(m.hip), height: num(m.height),
      });
      updateUser({ display_name: data.data.user.display_name, avatar_url: data.data.user.avatar_url });
      toast.success(t('edit.updated'));
      navigate('/profile');
    } catch (err) {
      toast.error(err.response?.data?.message || t('edit.saveFailed'));
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      {element}
      <PageHeader title={t('header.editProfile')} />
      <div className="px-4 pt-4 pb-10 space-y-5">
        <div className="flex flex-col items-center">
          <label className="relative cursor-pointer">
            <div className="h-24 w-24 overflow-hidden rounded-full bg-brand-light flex items-center justify-center text-4xl font-bold text-brand-purple border-4 border-white shadow-md">
              {avatar ? <img src={avatar} alt="avatar" className="h-full w-full object-cover" /> : (name[0] || 'C')}
            </div>
            <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-brand-purple text-white border-2 border-white">
              <Camera size={15} />
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={pickAvatar} />
          </label>
        </div>

        <Input label={t('edit.displayName')} value={name} onChange={(e) => setName(e.target.value)} />
        <Input label={t('edit.phone')} value={user?.phone || ''} disabled />

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">{t('edit.bodyMeasure')}</label>
          <div className="grid grid-cols-4 gap-2">
            {[['bust','edit.bust'],['waist','edit.waist'],['hip','edit.hip'],['height','edit.height']].map(([k, l]) => (
              <Input key={k} label={t(l)} type="number" value={m[k]} onChange={(e) => setM({ ...m, [k]: e.target.value })} />
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-400">{t('edit.measureHint')}</p>
        </div>

        <Button className="w-full" loading={busy} onClick={handleSave}>{t('edit.saveChanges')}</Button>
      </div>
    </div>
  );
}
