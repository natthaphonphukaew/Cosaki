import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { chatUnreadCount } from '@/api/chats';

// Chat button with an unread badge; sits next to NotificationBell on top bars.
export default function ChatButton({ size = 18, className = 'h-9 w-9 bg-white shadow-sm' }) {
  const [count, setCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    chatUnreadCount().then(({ data }) => setCount(data.data.count)).catch(() => {});
  }, []);

  return (
    <button
      onClick={() => navigate('/chats')}
      className={`relative flex items-center justify-center rounded-full ${className}`}
    >
      <MessageCircle size={size} className="text-gray-600" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-pink px-1 text-[10px] font-bold text-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}
