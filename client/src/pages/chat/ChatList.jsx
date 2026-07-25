import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Store, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/layout/PageHeader';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { listChats } from '@/api/chats';
import { formatDistanceToNow } from 'date-fns';

export default function ChatList() {
  const { t } = useTranslation();
  const [chats, setChats]     = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    listChats()
      .then(({ data }) => setChats(data.data.conversations))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title={t('chat.title')} />
      <div className="px-4 pb-10 space-y-2">
        {loading && <><CardSkeleton /><CardSkeleton /><CardSkeleton /></>}

        {!loading && chats.length === 0 && (
          <div className="flex flex-col items-center py-20 text-center">
            <MessageCircle size={44} className="mb-3 text-gray-300" />
            <p className="font-semibold text-gray-600">{t('chat.noConversations')}</p>
            <p className="mt-1 text-sm text-gray-400">{t('chat.startHint')}</p>
          </div>
        )}

        {!loading && chats.map((c) => (
          <button
            key={c.id}
            onClick={() => navigate(`/chats/${c.id}`)}
            className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm active:bg-gray-50"
          >
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-light">
              {c.counterpart_avatar
                ? <img src={c.counterpart_avatar} alt="" className="h-full w-full object-cover" />
                : (c.my_role === 'shop' ? <User size={18} className="text-brand-purple" /> : <Store size={18} className="text-brand-purple" />)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="truncate text-sm font-semibold text-gray-800">{c.counterpart_name}</p>
                {c.last_at && (
                  <span className="flex-shrink-0 text-[11px] text-gray-400">
                    {formatDistanceToNow(new Date(c.last_at), { addSuffix: true })}
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex items-center justify-between">
                <p className="truncate text-xs text-gray-400">{c.last_message || t('chat.startConversation')}</p>
                {c.unread > 0 && (
                  <span className="ml-2 flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-pink px-1.5 text-[10px] font-bold text-white">
                    {c.unread > 9 ? '9+' : c.unread}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
