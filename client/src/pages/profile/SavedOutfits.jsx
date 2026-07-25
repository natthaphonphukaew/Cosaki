import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/layout/PageHeader';
import ProductImage from '@/components/ui/ProductImage';
import { getFavorites, toggleFavorite } from '@/utils/favorites';

export default function SavedOutfits() {
  const { t } = useTranslation();
  const [items, setItems] = useState(getFavorites);
  const navigate = useNavigate();

  const remove = (e, item) => {
    e.stopPropagation();
    toggleFavorite(item);
    setItems((list) => list.filter((x) => x.id !== item.id));
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title={t('header.saved')} />
      <div className="px-4 pt-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <Heart size={44} className="mb-3 text-gray-300" />
            <p className="font-semibold text-gray-600">{t('saved.empty')}</p>
            <button onClick={() => navigate('/home')} className="mt-3 text-sm font-semibold text-brand-purple">{t('rentals.browse')}</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/items/${item.id}`)}
                className="cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm active:scale-[0.97] transition-transform"
              >
                <div className="relative h-40">
                  {item.express_delivery && (
                    <div className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                      🚀 {t('common.expressShort')}
                    </div>
                  )}
                  <ProductImage item={item} emojiClassName="text-5xl" />
                  <button onClick={(e) => remove(e, item)} className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/80">
                    <Heart size={14} className="text-brand-pink" fill="#EC4899" />
                  </button>
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-semibold text-gray-800">{item.name}</p>
                  <p className="truncate text-xs text-gray-400">{item.fandom || 'Cosplay'}</p>
                  <div className="mt-1 flex flex-col">
                    <p className="text-[13px] font-bold text-brand-purple">{t('common.test_rate')} ฿{item.test_rate ?? item.daily_rate}<span className="font-normal text-gray-400"> {t('common.perDay')}</span></p>
                    <p className="text-[13px] font-bold text-brand-pink">{t('common.private_rate')} ฿{item.private_rate ?? item.daily_rate}<span className="font-normal text-gray-400"> {t('common.perDay')}</span></p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
