import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function PageHeader({ title, onBack, right, transparent }) {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const handleBack = onBack || (() => navigate(-1));

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'th' ? 'en' : 'th');
  };

  return (
    <header className={`safe-top sticky top-0 z-30 relative flex h-14 items-center justify-center px-4 ${transparent ? '' : 'bg-surface-base/95 backdrop-blur-sm'}`}>
      <button
        onClick={handleBack}
        className="absolute left-4 flex h-9 w-9 items-center justify-center rounded-full text-gray-700 active:bg-gray-100"
      >
        <ArrowLeft size={22} />
      </button>
      <span className="text-base font-semibold text-brand-purple">{title || 'Cosaki'}</span>
      <div className="absolute right-4 flex items-center gap-2">
        {right}
        <button 
          onClick={toggleLanguage}
          className="rounded-full bg-brand-purple/10 px-2.5 py-1 text-[11px] font-bold text-brand-purple transition-transform active:scale-95"
        >
          {i18n.language === 'th' ? 'EN' : 'TH'}
        </button>
      </div>
    </header>
  );
}
