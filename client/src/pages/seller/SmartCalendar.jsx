import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import GanttCalendar from '@/components/calendar/GanttCalendar';
import { listBookings } from '@/api/bookings';
import { parseISO } from 'date-fns';

export default function SmartCalendar() {
  const [bookings, setBookings] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    listBookings({ as: 'shop', limit: 50 })
      .then(({ data }) => setBookings(data.data.bookings))
      .catch(() => {});
  }, []);

  const todayBookings = bookings.filter((b) => {
    if (!b.rental_start || !b.rental_end) return false;
    const now = new Date();
    return now >= parseISO(b.rental_start) && now <= parseISO(b.rental_end);
  });
  const pendingCount = bookings.filter((b) => b.status === 'escrowed').length;

  return (
    <AppShell>
      <div className="px-4 pt-5">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900">Inventory Scheduler</h2>
          <p className="text-xs text-gray-400">Track your rentals and costume availability</p>
        </div>

        {/* Gantt-style month calendar (colored bars per item) */}
        <GanttCalendar bookings={bookings} onOpenDetail={(b) => navigate(`/seller/orders/${b.id}`)} />

        {/* Pending shipments */}
        <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Pending Shipments</h3>
            {pendingCount > 0 && (
              <span className="rounded-full bg-brand-purple px-2.5 py-0.5 text-xs font-bold text-white">{pendingCount} NEW</span>
            )}
          </div>
          {bookings.filter((b) => b.status === 'escrowed').slice(0, 3).map((b) => (
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
              { label: 'OCCUPANCY',  value: `${Math.round((todayBookings.length / Math.max(bookings.length, 1)) * 100)}%` },
              { label: 'TOP EARNER', value: bookings[0]?.item_name?.split(' ')[0] || '—' },
              { label: 'REVENUE',    value: `฿${bookings.filter((b) => b.status === 'completed').reduce((s, b) => s + Number(b.rental_fee || 0), 0).toFixed(0)}` },
              { label: 'COMPLETED',  value: String(bookings.filter((b) => b.status === 'completed').length) },
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
