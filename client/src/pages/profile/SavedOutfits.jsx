import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import ProductImage from '@/components/ui/ProductImage';
import { getFavorites, toggleFavorite } from '@/utils/favorites';

export default function SavedOutfits() {
  const [items, setItems] = useState(getFavorites);
  const navigate = useNavigate();

  const remove = (e, item) => {
    e.stopPropagation();
    toggleFavorite(item);
    setItems((list) => list.filter((x) => x.id !== item.id));
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title="Saved Outfits" />
      <div className="px-4 pt-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <Heart size={44} className="mb-3 text-gray-300" />
            <p className="font-semibold text-gray-600">No saved outfits yet</p>
            <button onClick={() => navigate('/home')} className="mt-3 text-sm font-semibold text-brand-purple">Browse costumes →</button>
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
                  <ProductImage item={item} emojiClassName="text-5xl" />
                  <button onClick={(e) => remove(e, item)} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/80">
                    <Heart size={14} className="text-brand-pink" fill="#EC4899" />
                  </button>
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-semibold text-gray-800">{item.name}</p>
                  <p className="truncate text-xs text-gray-400">{item.fandom || 'Cosplay'}</p>
                  <p className="mt-1 text-sm font-bold text-brand-purple">${item.daily_rate}<span className="font-normal text-gray-400"> / day</span></p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
