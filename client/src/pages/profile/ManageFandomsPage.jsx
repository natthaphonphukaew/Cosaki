import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Plus, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import { updateMe } from '@/api/users';
import useAuthStore from '@/store/authStore';
import toast from 'react-hot-toast';

const ALL_FANDOMS = [
  ['Genshin Impact', '⚔️'], ['Honkai: Star Rail', '🚂'], ['Jujutsu Kaisen', '👁️'],
  ['Demon Slayer', '🗡️'], ['Arcane', '💥'], ['Valorant', '🎯'],
  ['Spy x Family', '🕵️'], ['Chainsaw Man', '🪚'], ['VTuber', '🎤'],
  ['One Piece', '🏴‍☠️'], ['Cyberpunk Edgerunners', '🤖'], ['Original', '✨'],
  ['Naruto', '🦊'], ['Bleach', '🗡️'], ['League of Legends', '⚔️'],
  ['Tokyo Revengers', '🏍️'], ['My Hero Academia', '🦸'], ['Attack on Titan', '⚔️'],
  ['Zzz (Zenless Zone Zero)', '📺'], ['Wuthering Waves', '🌊']
];

export default function ManageFandomsPage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  
  const getFandomsArray = (f) => {
    if (Array.isArray(f)) return f;
    if (typeof f === 'string') {
      try { return JSON.parse(f); } catch { return f.replace(/^\{|\}$/g, '').split(',').map(s => s.trim()).filter(Boolean); }
    }
    return [];
  };

  const [picked, setPicked] = useState(() => getFandomsArray(user?.fandoms));
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');

  const toggle = (f) =>
    setPicked((p) => {
      const arr = Array.isArray(p) ? p : [];
      return arr.includes(f) ? arr.filter((x) => x !== f) : [...arr, f];
    });

  const handleSave = async () => {
    try {
      setBusy(true);
      await updateMe({ fandoms: picked });
      updateUser({ fandoms: picked });
      toast.success('บันทึก Fandom สำเร็จ');
      navigate(-1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'บันทึกไม่สำเร็จ');
    } finally { 
      setBusy(false); 
    }
  };

  const filteredFandoms = useMemo(() => {
    if (!q.trim()) return ALL_FANDOMS;
    const lowerQ = q.toLowerCase();
    return ALL_FANDOMS.filter(([f]) => f.toLowerCase().includes(lowerQ));
  }, [q]);

  const customFandom = q.trim();
  const showAddCustom = customFandom && !ALL_FANDOMS.some(([f]) => f.toLowerCase() === customFandom.toLowerCase());

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-700">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">จัดการ Fandom</h1>
        <div className="w-10" />
      </div>

      <div className="px-4 pt-5 pb-32">
        <div className="relative mb-6">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาชื่อ Fandom..."
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-brand-purple"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {filteredFandoms.map(([f, emoji]) => (
            <button
              key={f}
              onClick={() => toggle(f)}
              className={`flex items-center gap-2 rounded-2xl p-3.5 text-left text-sm font-medium transition-all ${
                picked.includes(f)
                  ? 'bg-brand-gradient text-white shadow-md scale-[1.02]'
                  : 'bg-white text-gray-700 shadow-sm'
              }`}
            >
              <span className="text-lg">{emoji}</span>
              <span className="flex-1 truncate">{f}</span>
            </button>
          ))}
        </div>
        
        {showAddCustom && (
          <div className="mt-6 text-center">
            <button 
              onClick={() => toggle(customFandom)}
              className={`w-full flex items-center justify-center gap-2 rounded-xl border-2 p-3 text-sm font-semibold transition-all ${
                picked.includes(customFandom)
                  ? 'border-brand-purple bg-brand-light/30 text-brand-purple'
                  : 'border-dashed border-gray-300 text-gray-500 hover:border-brand-purple hover:text-brand-purple'
              }`}
            >
              {picked.includes(customFandom) ? <X size={16} /> : <Plus size={16} />}
              {picked.includes(customFandom) ? `ยกเลิกการเลือก "${customFandom}"` : `เพิ่ม "${customFandom}" เป็น Fandom ใหม่`}
            </button>
          </div>
        )}
        
        {filteredFandoms.length === 0 && !showAddCustom && (
          <div className="mt-10 text-center text-sm text-gray-500">
            ไม่พบ Fandom ที่ค้นหา
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 border-t border-gray-100 bg-white p-4">
        <Button className="w-full" loading={busy} onClick={handleSave}>
          บันทึกการเปลี่ยนแปลง ({(picked || []).length})
        </Button>
      </div>
    </div>
  );
}
