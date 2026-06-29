import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';

const OPTIONS = [
  { key: 'push',     label: 'Push notifications', desc: 'Booking updates & messages' },
  { key: 'email',    label: 'Email updates',      desc: 'Receipts and announcements' },
  { key: 'marketing',label: 'Promotions',         desc: 'Offers and new drops' },
];

const read = () => { try { return JSON.parse(localStorage.getItem('cosaki-settings') || '{}'); } catch { return {}; } };

export default function SettingsPage() {
  const [prefs, setPrefs] = useState(() => ({ push: true, email: true, marketing: false, ...read() }));

  const toggle = (key) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    localStorage.setItem('cosaki-settings', JSON.stringify(next));
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title="Account Settings" />
      <div className="px-4 pt-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Notifications</p>
        {OPTIONS.map((o) => (
          <button
            key={o.key}
            onClick={() => toggle(o.key)}
            className="flex w-full items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
          >
            <div className="text-left">
              <p className="text-sm font-medium text-gray-800">{o.label}</p>
              <p className="text-xs text-gray-400">{o.desc}</p>
            </div>
            <span className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${prefs[o.key] ? 'bg-brand-purple' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${prefs[o.key] ? 'left-[22px]' : 'left-0.5'}`} />
            </span>
          </button>
        ))}

        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-gray-400">About</p>
        <div className="rounded-2xl bg-white p-4 shadow-sm text-sm text-gray-600">
          <div className="flex justify-between"><span>Version</span><span className="text-gray-400">1.0.0 (beta)</span></div>
        </div>
      </div>
    </div>
  );
}
