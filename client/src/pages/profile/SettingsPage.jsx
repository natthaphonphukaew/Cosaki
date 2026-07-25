import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/layout/PageHeader';

const OPTIONS = [
  { key: 'push',      label: 'settings.push_label',      desc: 'settings.push_desc' },
  { key: 'email',     label: 'settings.email_label',     desc: 'settings.email_desc' },
  { key: 'marketing', label: 'settings.marketing_label', desc: 'settings.marketing_desc' },
];
const LANGS = [{ code: 'th', label: 'ไทย' }, { code: 'en', label: 'English' }];

const read = () => { try { return JSON.parse(localStorage.getItem('cosaki-settings') || '{}'); } catch { return {}; } };

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const [prefs, setPrefs] = useState(() => ({ push: true, email: true, marketing: false, ...read() }));
  const [lang, setLang] = useState(i18n.language);

  const toggle = (key) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    localStorage.setItem('cosaki-settings', JSON.stringify(next));
  };
  const changeLang = (code) => { i18n.changeLanguage(code); setLang(code); };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title={t('header.settings')} />
      <div className="px-4 pt-4 space-y-3">
        {/* Language */}
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{t('settings.language')}</p>
        <div className="grid grid-cols-2 gap-2">
          {LANGS.map((l) => (
            <button key={l.code} onClick={() => changeLang(l.code)}
              className={`rounded-2xl border p-4 text-sm font-semibold transition-colors ${
                lang === l.code ? 'border-2 border-brand-purple bg-brand-light/40 text-brand-purple' : 'border-gray-200 bg-white text-gray-600'}`}>
              {l.label}
            </button>
          ))}
        </div>

        {/* Notifications */}
        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-gray-400">{t('settings.notifications')}</p>
        {OPTIONS.map((o) => (
          <button key={o.key} onClick={() => toggle(o.key)}
            className="flex w-full items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
            <div className="text-left">
              <p className="text-sm font-medium text-gray-800">{t(o.label)}</p>
              <p className="text-xs text-gray-400">{t(o.desc)}</p>
            </div>
            <span className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${prefs[o.key] ? 'bg-brand-purple' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${prefs[o.key] ? 'left-[22px]' : 'left-0.5'}`} />
            </span>
          </button>
        ))}

        {/* About */}
        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-gray-400">{t('settings.about')}</p>
        <div className="rounded-2xl bg-white p-4 shadow-sm text-sm text-gray-600">
          <div className="flex justify-between"><span>{t('settings.version')}</span><span className="text-gray-400">1.0.0 (beta)</span></div>
        </div>
      </div>
    </div>
  );
}
