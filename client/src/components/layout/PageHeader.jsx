import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import logoWordmark from '@/assets/logo-wordmark.png';

export default function PageHeader({ title, onBack, right, transparent }) {
  const navigate = useNavigate();
  const handleBack = onBack || (() => navigate(-1));

  return (
    <header className={`safe-top sticky top-0 z-30 relative flex h-14 items-center justify-center px-4 ${transparent ? '' : 'bg-surface-base/95 backdrop-blur-sm'}`}>
      <button
        onClick={handleBack}
        className="absolute left-4 flex h-9 w-9 items-center justify-center rounded-full text-gray-700 active:bg-gray-100"
      >
        <ArrowLeft size={22} />
      </button>
      {title
        ? <span className="text-base font-semibold text-brand-purple">{title}</span>
        : <img src={logoWordmark} alt="Cosaki" className="h-6 w-auto" />}
      {right && <div className="absolute right-4 flex items-center gap-2">{right}</div>}
    </header>
  );
}
