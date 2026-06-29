import { useState } from 'react';
import { ChevronDown, Mail, MessageCircle } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import toast from 'react-hot-toast';

const FAQS = [
  { q: 'How does the escrow deposit work?', a: 'Your security deposit is held safely in escrow during the rental and refunded after the item is returned in good condition.' },
  { q: 'When do I get paid as a seller?', a: 'Funds are released to your wallet once a rental is completed. You can then withdraw to your bank from the Wallet page.' },
  { q: 'What if an item is damaged?', a: 'Open a dispute from the rental tracking page. The shop reviews evidence in the Resolution Center and a fair deduction is applied.' },
  { q: 'How do I verify my identity?', a: 'You will be asked to upload an ID and a selfie the first time you book. Verification is quick.' },
];

export default function HelpSupport() {
  const [open, setOpen] = useState(null);

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title="Help & Support" />
      <div className="px-4 pt-4 space-y-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">FAQ</p>
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
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Contact us</p>
          <div className="space-y-2">
            <button onClick={() => { window.location.href = 'mailto:support@cosaki.app'; }} className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-light"><Mail size={18} className="text-brand-purple" /></div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-800">Email support</p>
                <p className="text-xs text-gray-400">support@cosaki.app</p>
              </div>
            </button>
            <button onClick={() => toast('Live chat coming soon')} className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-light"><MessageCircle size={18} className="text-brand-purple" /></div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-800">Live chat</p>
                <p className="text-xs text-gray-400">Typically replies within minutes</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
