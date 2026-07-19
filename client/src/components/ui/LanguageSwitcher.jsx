import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'th' ? 'en' : 'th');
  };

  return (
    <button 
      onClick={toggleLanguage}
      className="rounded-full bg-brand-purple/10 px-2.5 py-1 text-[11px] font-bold text-brand-purple transition-transform active:scale-95"
    >
      {i18n.language === 'th' ? 'EN' : 'TH'}
    </button>
  );
}
