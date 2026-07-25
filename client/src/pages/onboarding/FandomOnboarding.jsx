import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from '@/components/ui/Button';
import { updateMe } from '@/api/users';
import useAuthStore from '@/store/authStore';
import toast from 'react-hot-toast';

const FANDOMS = [
  ['Genshin Impact', '⚔️'], ['Honkai: Star Rail', '🚂'], ['Jujutsu Kaisen', '👁️'],
  ['Demon Slayer', '🗡️'], ['Arcane', '💥'], ['Valorant', '🎯'],
  ['Spy x Family', '🕵️'], ['Chainsaw Man', '🪚'], ['VTuber', '🎤'],
  ['One Piece', '🏴‍☠️'], ['Cyberpunk Edgerunners', '🤖'], ['Original', '✨'],
];

// Mandatory fandom pick (§1.3) — powers the Home feed ordering.
export default function FandomOnboarding() {
  const { t } = useTranslation();
  const [picked, setPicked] = useState([]);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { updateUser } = useAuthStore();

  const toggle = (f) =>
    setPicked((p) => (p.includes(f) ? p.filter((x) => x !== f) : [...p, f]));

  const handleSave = async () => {
    if (!picked.length) return toast.error(t('onboarding.fandomMin'));
    try {
      setBusy(true);
      await updateMe({ fandoms: picked });
      updateUser({ fandoms: picked });
      navigate('/home');
    } catch (err) {
      toast.error(err.response?.data?.message || t('onboarding.fandomSaveFailed'));
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <div className="px-6 pt-14 pb-32">
        <h1 className="text-2xl font-bold text-gray-900">{t('onboarding.fandomQ')}</h1>
        <p className="mt-2 text-sm text-gray-500">
          {t('onboarding.fandomHint')}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {FANDOMS.map(([f, emoji]) => (
            <button
              key={f}
              onClick={() => toggle(f)}
              className={`flex items-center gap-2 rounded-2xl p-3.5 text-left text-sm font-medium transition-all ${
                picked.includes(f)
                  ? 'bg-brand-gradient text-white shadow-md scale-[1.02]'
                  : 'bg-white text-gray-700 shadow-sm'
              }`}
            >
              <span className="text-lg">{emoji}</span>
              <span className="flex-1 truncate">{f}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 border-t border-gray-100 bg-white p-4">
        <Button className="w-full" loading={busy} disabled={!picked.length} onClick={handleSave}>
          {picked.length ? t('onboarding.fandomStartCount', { n: picked.length }) : t('onboarding.fandomMin')}
        </Button>
      </div>
    </div>
  );
}
