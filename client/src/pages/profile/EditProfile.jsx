import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { updateMe } from '@/api/users';
import useAuthStore from '@/store/authStore';
import { fileToDataUrl } from '@/utils/image';
import toast from 'react-hot-toast';

export default function EditProfile() {
  const { user, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [name, setName]     = useState(user?.display_name || '');
  const [avatar, setAvatar] = useState(user?.avatar_url || '');
  const [busy, setBusy]     = useState(false);

  const pickAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { setAvatar(await fileToDataUrl(file, 400)); }
    catch { toast.error('Could not read image'); }
  };

  const handleSave = async () => {
    if (!name.trim()) return toast.error('Name is required');
    try {
      setBusy(true);
      const { data } = await updateMe({ display_name: name.trim(), avatar_url: avatar || null });
      updateUser({ display_name: data.data.user.display_name, avatar_url: data.data.user.avatar_url });
      toast.success('Profile updated');
      navigate('/profile');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save');
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title="Edit Profile" />
      <div className="px-4 pt-4 space-y-5">
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

        <Input label="Display Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Phone" value={user?.phone || ''} disabled />

        <Button className="w-full" loading={busy} onClick={handleSave}>Save Changes</Button>
      </div>
    </div>
  );
}
