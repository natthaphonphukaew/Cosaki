import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { getUnreadCount } from '@/api/notifications';

// Bell button with an unread badge; taps through to the notifications page.
export default function NotificationBell({ size = 18, className = 'h-9 w-9 bg-white shadow-sm' }) {
  const [count, setCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    getUnreadCount().then(({ data }) => setCount(data.data.count)).catch(() => {});
  }, []);

  return (
    <button
      onClick={() => navigate('/notifications')}
      className={`relative flex items-center justify-center rounded-full ${className}`}
    >
      <Bell size={size} className="text-gray-600" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-pink px-1 text-[10px] font-bold text-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}
