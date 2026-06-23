import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { listBookings } from '@/api/bookings';
import { format, addMonths, subMonths, startOfMonth, endOfMonth,
         eachDayOfInterval, isSameDay, parseISO } from 'date-fns';

export default function CalendarPage() {
  const [month, setMonth]     = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [selected, setSelected] = useState(null);
  const navigate              = useNavigate();

  useEffect(() => {
    listBookings({ as: 'renter', limit: 50 }).then(({ data }) => setBookings(data.data.bookings)).catch(() => {});
  }, []);

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const startPad = startOfMonth(month).getDay();

  const bookingsOnDay = (day) =>
    bookings.filter((b) => {
      if (!b.rental_start || !b.rental_end) return false;
      return day >= parseISO(b.rental_start) && day <= parseISO(b.rental_end);
    });

  return (
    <AppShell>
      <div className="px-4 pt-5">
        <h2 className="mb-4 text-xl font-bold text-gray-900">My Schedule</h2>

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

        <div className="mb-1 grid grid-cols-7 text-center">
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
            <span key={d} className="text-xs font-semibold text-gray-400">{d}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: startPad }).map((_, i) => <div key={`p${i}`} />)}
          {days.map((day) => {
            const hits    = bookingsOnDay(day);
            const isToday = isSameDay(day, new Date());
            return (
              <div key={day.toISOString()} onClick={() => hits.length && setSelected({ day, bookings: hits })}
                className={`min-h-[52px] rounded-lg p-1 ${hits.length ? 'cursor-pointer' : ''} ${isToday ? 'bg-brand-light' : 'hover:bg-gray-50'}`}>
                <span className={`block text-center text-xs font-medium mb-0.5 ${isToday ? 'font-bold text-brand-purple' : 'text-gray-600'}`}>
                  {format(day, 'd')}
                </span>
                {hits.slice(0,1).map((b) => (
                  <div key={b.id} className="truncate rounded bg-brand-purple px-1 text-[9px] font-semibold text-white">
                    {b.item_name?.split(' ')[0]}
                  </div>
                ))}
                {hits.length > 1 && <div className="text-[9px] text-gray-400 text-center">+{hits.length - 1}</div>}
              </div>
            );
          })}
        </div>

        {/* Upcoming rentals */}
        <div className="mt-5">
          <p className="mb-3 text-sm font-semibold text-gray-800">Upcoming Rentals</p>
          {bookings.filter((b) => ['escrowed','shipped'].includes(b.status)).length === 0
            ? <p className="text-sm text-gray-400">No upcoming rentals</p>
            : bookings.filter((b) => ['escrowed','shipped'].includes(b.status)).map((b) => (
              <button key={b.id} onClick={() => navigate(`/bookings/${b.id}/tracking`)}
                className="mb-2 flex w-full items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
                <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-brand-light flex items-center justify-center text-lg">🎭</div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-gray-800 truncate">{b.item_name}</p>
                  <p className="text-xs text-gray-400">
                    {b.rental_start && format(parseISO(b.rental_start), 'MMM d')} – {b.rental_end && format(parseISO(b.rental_end), 'MMM d')}
                  </p>
                </div>
                <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${b.status === 'escrowed' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                  {b.status.toUpperCase()}
                </span>
              </button>
            ))
          }
        </div>
      </div>

      {/* Booking day detail */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30" onClick={() => setSelected(null)}>
          <div className="w-full max-w-[390px] rounded-t-3xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 font-bold text-gray-800">{format(selected.day, 'EEEE, MMM d')}</p>
            {selected.bookings.map((b) => (
              <button key={b.id} onClick={() => navigate(`/bookings/${b.id}/tracking`)}
                className="mb-2 w-full rounded-xl border border-gray-100 p-3 text-left">
                <p className="text-sm font-semibold text-gray-800">{b.item_name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{b.status}</p>
              </button>
            ))}
            <button onClick={() => setSelected(null)} className="mt-2 w-full rounded-full bg-gray-100 py-2.5 text-sm font-medium text-gray-600">Close</button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
