import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import GanttCalendar from '@/components/calendar/GanttCalendar';
import ProductImage from '@/components/ui/ProductImage';
import { listBookings } from '@/api/bookings';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';

export default function CalendarPage() {
  const [bookings, setBookings] = useState([]);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    listBookings({ as: 'renter', limit: 50 }).then(({ data }) => setBookings(data.data.bookings)).catch(() => {});
  }, []);

  const upcoming = bookings.filter((b) => ['escrowed', 'shipped'].includes(b.status));

  return (
    <AppShell>
      <div className="px-4 pt-5">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900">{t('calendar.title', 'My Schedule')}</h2>
        </div>

        {/* Gantt-style month calendar (colored bars per item) */}
        <GanttCalendar bookings={bookings} onOpenDetail={(b) => navigate(`/bookings/${b.id}/tracking`)} />

        {/* Upcoming rentals */}
        <div className="mt-5">
          <p className="mb-3 text-sm font-semibold text-gray-800">{t('calendar.upcoming', 'Upcoming Rentals')}</p>
          {upcoming.length === 0
            ? <p className="text-sm text-gray-400">{t('calendar.no_upcoming', 'No upcoming rentals')}</p>
            : upcoming.map((b) => (
              <button key={b.id} onClick={() => navigate(`/bookings/${b.id}/tracking`)}
                className="mb-2 flex w-full items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-xl">
                  <ProductImage item={{ image_urls: b.image_urls, name: b.item_name }} emojiClassName="text-lg" />
                </div>
                <div className="flex-1 text-left min-w-0">
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
    </AppShell>
  );
}
