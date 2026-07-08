import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Package, X } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import { listMessages, sendMessage } from '@/api/chats';
import useAuthStore from '@/store/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function ChatRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [convo, setConvo]       = useState(null);
  const [messages, setMessages] = useState([]);
  const [orders, setOrders]     = useState([]);
  const [text, setText]         = useState('');
  const [attach, setAttach]     = useState(null);   // booking id to attach
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const bottomRef = useRef(null);

  const load = () => listMessages(id).then(({ data }) => {
    setConvo(data.data.conversation);
    setMessages(data.data.messages);
    setOrders(data.data.active_orders);
  }).catch(() => {});

  // Initial load + light polling (5s) for new messages.
  useEffect(() => {
    load().finally?.(() => setLoading(false));
    setLoading(false);
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const handleSend = async () => {
    if (!text.trim() && !attach) return;
    try {
      setSending(true);
      await sendMessage(id, text.trim(), attach || undefined);
      setText(''); setAttach(null);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'ส่งไม่สำเร็จ');
    } finally { setSending(false); }
  };

  if (loading && !convo) return <div className="flex min-h-screen items-center justify-center bg-surface-base"><Spinner /></div>;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col bg-surface-base">
      <PageHeader title={convo?.counterpart_name || 'แชท'} />

      {/* Order context chips (PRD §4.2 — show which order is being discussed) */}
      {orders.length > 0 && (
        <div className="flex gap-2 overflow-x-auto hide-scrollbar px-4 pb-2">
          {orders.map((o) => (
            <button
              key={o.id}
              onClick={() => setAttach(attach === o.id ? null : o.id)}
              className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                attach === o.id ? 'bg-brand-purple text-white' : 'border border-gray-200 bg-white text-gray-600'
              }`}
            >
              📦 {o.item_name} · {o.status.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-gray-400">เริ่มบทสนทนา — สอบถามรายละเอียดชุดหรือออเดอร์ได้เลย</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] space-y-1 ${mine ? 'items-end' : 'items-start'}`}>
                {/* Order card attachment */}
                {m.booking_id && m.booking_item_name && (
                  <button
                    onClick={() => navigate(`/bookings/${m.booking_id}/tracking`)}
                    className={`flex w-full items-center gap-2 rounded-xl border p-2.5 text-left ${mine ? 'border-brand-purple/30 bg-brand-light/40' : 'border-gray-200 bg-white'}`}
                  >
                    <Package size={16} className="flex-shrink-0 text-brand-purple" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-gray-800">{m.booking_item_name}</p>
                      <p className="text-[10px] text-gray-400">
                        {m.rental_start && format(new Date(m.rental_start), 'MMM d')} – {m.rental_end && format(new Date(m.rental_end), 'MMM d')} · ฿{m.total_amount}
                      </p>
                    </div>
                    <Badge status={m.booking_status} label={String(m.booking_status || '').toUpperCase()} />
                  </button>
                )}
                {m.body && (
                  <div className={`rounded-2xl px-3.5 py-2 text-sm ${mine ? 'bg-brand-gradient text-white' : 'bg-white text-gray-800 shadow-sm'}`}>
                    {m.body}
                  </div>
                )}
                <p className={`text-[10px] text-gray-400 ${mine ? 'text-right' : ''}`}>
                  {m.created_at && format(new Date(m.created_at), 'HH:mm')}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="sticky bottom-0 border-t border-gray-100 bg-white p-3">
        {attach && (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-brand-light/50 px-3 py-1.5 text-xs text-brand-purple">
            <Package size={13} />
            <span className="flex-1 truncate">แนบออเดอร์: {orders.find((o) => o.id === attach)?.item_name}</span>
            <button onClick={() => setAttach(null)}><X size={13} /></button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="พิมพ์ข้อความ…"
            className="flex-1 rounded-full border border-gray-200 bg-surface-base px-4 py-2.5 text-sm outline-none focus:border-brand-purple"
          />
          <button
            onClick={handleSend}
            disabled={sending || (!text.trim() && !attach)}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-gradient text-white disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
