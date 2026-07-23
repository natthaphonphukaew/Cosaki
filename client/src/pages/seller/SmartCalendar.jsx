import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { listBookings } from '@/api/bookings';
import { format, addMonths, subMonths, startOfMonth, endOfMonth,
         eachDayOfInterval, isSameDay, parseISO } from 'date-fns';

const VIEW_TABS = ['MONTHLY', 'WEEKLY', 'LIST'];

const BOOKING_COLORS = [
  'bg-brand-purple text-white',
  'bg-pink-400 text-white',
  'bg-amber-400 text-white',
  'bg-blue-400 text-white',
  'bg-green-400 text-white',
];

export default function SmartCalendar() {
  const [view, setView]       = useState('MONTHLY');
  const [month, setMonth]     = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    listBookings({ as: 'shop', limit: 50 })
      .then(({ data }) => setBookings(data.data.bookings))
      .catch(() => {});
  }, []);

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const startPad = startOfMonth(month).getDay();

  const bookingsOnDay = (day) =>
    bookings.filter((b) => {
      const isConfirmed = ['shipped', 'returned', 'completed', 'disputed'].includes(b.status) || 
                          (b.status === 'escrowed' && b.accepted_at);
      if (!isConfirmed) return false;
      if (!b.rental_start || !b.rental_end) return false;
      const s = parseISO(b.rental_start);
      const e = parseISO(b.rental_end);
      return day >= s && day <= e;
    });

  const todayBookings = bookings.filter((b) => {
    const isConfirmed = ['shipped', 'returned', 'completed', 'disputed'].includes(b.status) || 
                        (b.status === 'escrowed' && b.accepted_at);
    if (!isConfirmed) return false;
    if (!b.rental_start || !b.rental_end) return false;
    const now = new Date();
    return now >= parseISO(b.rental_start) && now <= parseISO(b.rental_end);
  });

  const pendingCount = bookings.filter((b) => b.status === 'escrowed').length;

  return (
    <AppShell>
      <div className="px-4 pt-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Inventory Scheduler</h2>
            <p className="text-xs text-gray-400">Track your rentals and costume availability</p>
          </div>
          <button onClick={() => navigate('/seller/items/new')} className="flex items-center gap-1 rounded-full bg-brand-purple px-3 py-2 text-xs font-semibold text-white">
            <Plus size={14} /> LIST NEW
          </button>
        </div>

        {/* View tabs */}
        <div className="mb-4 flex rounded-xl bg-gray-100 p-1">
          {VIEW_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setView(t)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                view === t ? 'bg-white text-brand-purple shadow-sm' : 'text-gray-500'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {view === 'MONTHLY' && (
          <>
            {/* Month nav */}
            <div className="mb-3 flex items-center justify-between">
              <button onClick={() => setMonth(subMonths(month, 1))} className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-semibold text-gray-800">{format(month, 'MMMM yyyy')}</span>
              <button onClick={() => setMonth(addMonths(month, 1))} className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Day headers */}
            <div className="mb-1 grid grid-cols-7 text-center">
              {['SUN','MON','TUE','WED','THU','FRI','SAT'].map((d) => (
                <span key={d} className="text-[10px] font-semibold text-gray-400">{d}</span>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-y-1">
              {Array.from({ length: startPad }).map((_, i) => <div key={`p${i}`} />)}
              {days.map((day) => {
                const dayBookings = bookingsOnDay(day);
                const isToday = isSameDay(day, new Date());
                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => setSelected(dayBookings.length ? { day, bookings: dayBookings } : null)}
                    className={`min-h-[52px] rounded-lg p-1 cursor-pointer transition-colors ${isToday ? 'bg-brand-light' : 'hover:bg-gray-50'}`}
                  >
                    <span className={`block text-center text-xs font-medium mb-0.5 ${isToday ? 'font-bold text-brand-purple' : 'text-gray-600'}`}>
                      {format(day, 'd')}
                    </span>
                    {dayBookings.slice(0,2).map((b, i) => (
                      <div key={b.id} className={`truncate rounded px-1 text-[9px] font-semibold mb-0.5 ${BOOKING_COLORS[i % BOOKING_COLORS.length]}`}>
                        {b.item_name?.split(' ').slice(0,2).join(' ')}
                      </div>
                    ))}
                    {dayBookings.length > 2 && (
                      <div className="text-[9px] text-gray-400 text-center">+{dayBookings.length - 2}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {view === 'LIST' && (
          <div className="space-y-3 mt-2">
            {bookings.length === 0
              ? <p className="text-center text-sm text-gray-400 py-8">No bookings yet</p>
              : bookings.map((b, i) => (
                <div key={b.id} className={`flex items-center gap-3 rounded-2xl p-3 ${BOOKING_COLORS[i % BOOKING_COLORS.length]}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{b.item_name}</p>
                    <p className="text-xs opacity-80">
                      {b.rental_start && format(parseISO(b.rental_start), 'MMM d')} –{' '}
                      {b.rental_end   && format(parseISO(b.rental_end),   'MMM d')}
                    </p>
                  </div>
                  <span className="text-xs font-semibold opacity-80 uppercase">{b.status}</span>
                </div>
              ))
            }
          </div>
        )}

        {/* Booking detail popover */}
        {selected && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30" onClick={() => setSelected(null)}>
            <div className="w-full max-w-[390px] rounded-t-3xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
              <p className="mb-3 text-sm font-bold text-gray-800">{format(selected.day, 'EEEE, MMM d')}</p>
              {selected.bookings.map((b) => (
                <div key={b.id} className="mb-3 rounded-xl border border-gray-100 p-3">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-semibold text-gray-800">{b.item_name}</p>
                    <span className="text-xs font-semibold text-brand-purple uppercase">{b.status}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Renter: {b.renter_name}</p>
                </div>
              ))}
              <button onClick={() => setSelected(null)} className="w-full rounded-full bg-gray-100 py-2.5 text-sm font-medium text-gray-600">Close</button>
            </div>
          </div>
        )}

        {/* Pending shipments */}
        <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Pending Shipments</h3>
            {pendingCount > 0 && (
              <span className="rounded-full bg-brand-purple px-2.5 py-0.5 text-xs font-bold text-white">{pendingCount} NEW</span>
            )}
          </div>
          {bookings.filter((b) => b.status === 'escrowed').slice(0,3).map((b) => (
            <div key={b.id} className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0">
              <div className="h-2 w-2 rounded-full bg-brand-purple flex-shrink-0" />
              <p className="text-sm text-gray-700">Ship "{b.item_name?.split(' ')[0]}"</p>
            </div>
          ))}
          {bookings.filter((b) => b.status === 'escrowed').length === 0 && (
            <p className="text-sm text-gray-400">No pending shipments</p>
          )}
        </div>

        {/* Quick insights */}
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm mb-4">
          <h3 className="mb-3 font-semibold text-gray-900">Quick Insights</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'OCCUPANCY',   value: `${Math.round((todayBookings.length / Math.max(bookings.length, 1)) * 100)}%` },
              { label: 'TOP EARNER',  value: bookings[0]?.item_name?.split(' ')[0] || '—' },
              { label: 'REVENUE',     value: `฿${bookings.filter((b) => b.status === 'completed').reduce((s, b) => s + Number(b.rental_fee || 0), 0).toFixed(0)}` },
              { label: 'COMPLETED',   value: String(bookings.filter((b) => b.status === 'completed').length) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
                <p className="mt-1 text-lg font-bold text-gray-800">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
