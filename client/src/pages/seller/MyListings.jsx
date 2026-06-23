import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import ProductImage from '@/components/ui/ProductImage';
import { ItemGridSkeleton } from '@/components/ui/Skeleton';
import { listMyItems } from '@/api/items';

export default function MyListings() {
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate            = useNavigate();

  useEffect(() => {
    listMyItems()
      .then(({ data }) => setItems(data.data.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="px-4 pt-5 pb-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">MY SHOP</p>
            <h2 className="text-xl font-bold text-gray-900">Listings</h2>
          </div>
          <button
            onClick={() => navigate('/seller/items/new')}
            className="flex items-center gap-1.5 rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-md active:opacity-90"
          >
            <Plus size={16} /> Add
          </button>
        </div>

        {loading ? (
          <ItemGridSkeleton />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="mb-3 text-5xl">🪄</span>
            <p className="font-semibold text-gray-600">No costumes yet</p>
            <p className="mt-1 text-sm text-gray-400">Add your first costume to start renting</p>
            <button
              onClick={() => navigate('/seller/items/new')}
              className="mt-5 rounded-full bg-brand-gradient px-6 py-3 text-sm font-semibold text-white shadow-md"
            >
              + Add Product
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <div key={item.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                <div className="relative h-40">
                  <ProductImage item={item} emojiClassName="text-5xl" />
                  <button
                    onClick={() => navigate(`/seller/items/${item.id}/edit`)}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow"
                  >
                    <Pencil size={13} className="text-gray-600" />
                  </button>
                  {!item.is_available && (
                    <span className="absolute left-2 top-2 rounded-full bg-gray-800/80 px-2 py-0.5 text-[10px] font-semibold text-white">
                      Hidden
                    </span>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="truncate text-sm font-semibold text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-400 truncate">{item.fandom || 'Cosplay'}</p>
                  <p className="mt-1 text-sm font-bold text-brand-purple">
                    ${item.daily_rate}<span className="font-normal text-gray-400"> /day</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
