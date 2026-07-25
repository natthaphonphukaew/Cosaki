import { useState } from 'react';
import { ChevronDown, Mail, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/layout/PageHeader';
import toast from 'react-hot-toast';

export default function HelpSupport() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(null);
  const FAQS = t('support.faqs', { returnObjects: true });

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title={t('header.help')} />
      <div className="px-4 pt-4 space-y-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{t('support.faq')}</p>
          <div className="space-y-2">
            {FAQS.map((f, i) => (
              <div key={i} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between p-4 text-left">
                  <span className="text-sm font-medium text-gray-800">{f.q}</span>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform ${open === i ? 'rotate-180' : ''}`} />
                </button>
                {open === i && <p className="px-4 pb-4 text-sm text-gray-500">{f.a}</p>}
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{t('support.contact')}</p>
          <div className="space-y-2">
            <button onClick={() => { window.location.href = 'mailto:support@cosaki.app'; }} className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-light"><Mail size={18} className="text-brand-purple" /></div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-800">{t('support.emailSupport')}</p>
                <p className="text-xs text-gray-400">support@cosaki.app</p>
              </div>
            </button>
            <button onClick={() => toast(t('support.liveChatSoon'))} className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-light"><MessageCircle size={18} className="text-brand-purple" /></div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-800">{t('support.liveChat')}</p>
                <p className="text-xs text-gray-400">{t('support.liveChatDesc')}</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
