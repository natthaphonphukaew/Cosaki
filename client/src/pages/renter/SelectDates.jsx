import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import { createBooking } from '@/api/bookings';
import toast from 'react-hot-toast';
import { format, addMonths, subMonths, startOfMonth, endOfMonth,
         eachDayOfInterval, isSameMonth, isSameDay, isAfter, isBefore, startOfToday } from 'date-fns';

export default function SelectDates() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const rateType = state?.rateType || 'test';
  const today = startOfToday();

  const [month, setMonth]       = useState(new Date());
  const [startDate, setStart]   = useState(null);
  const [endDate, setEnd]       = useState(null);
  const [loading, setLoading]   = useState(false);

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const startPad = startOfMonth(month).getDay(); // 0=Sun

  const handleDay = (day) => {
    if (isBefore(day, today)) return;
    if (!startDate || (startDate && endDate)) {
      setStart(day); setEnd(null);
    } else {
      if (isBefore(day, startDate)) { setStart(day); setEnd(null); }
      else setEnd(day);
    }
  };

  const isInRange = (day) => startDate && endDate && isAfter(day, startDate) && isBefore(day, endDate);
  const isStart   = (day) => startDate && isSameDay(day, startDate);
  const isEnd     = (day) => endDate && isSameDay(day, endDate);
  const isPast    = (day) => isBefore(day, today);

  const nights = startDate && endDate
    ? Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
    : 0;

  const handleBook = async () => {
    if (!startDate || !endDate) return toast.error('Please select dates');
    try {
      setLoading(true);
      const { data } = await createBooking({
        item_id: id,
        rate_type: rateType,
        rental_start: format(startDate, 'yyyy-MM-dd'),
        rental_end:   format(endDate,   'yyyy-MM-dd'),
      });
      const b = data.data.booking;
      const checkoutUrl = `/bookings/${b.id}/checkout`;
      // Identity check is required before payment — do it now, then continue.
      if (b.status === 'pending_kyc') {
        navigate('/kyc', { state: { next: checkoutUrl } });
      } else {
        navigate(checkoutUrl);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title="Select Dates" />

      <div className="px-4 pb-32">
        {/* Month nav */}
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => setMonth(subMonths(month, 1))} className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm">
            <ChevronLeft size={18} />
          </button>
          <span className="font-semibold text-gray-800">{format(month, 'MMMM yyyy')}</span>
          <button onClick={() => setMonth(addMonths(month, 1))} className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day headers */}
        <div className="mb-2 grid grid-cols-7 text-center">
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
            <span key={d} className="text-xs font-semibold text-gray-400">{d}</span>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
          {days.map((day) => {
            const inRange = isInRange(day);
            const start   = isStart(day);
            const end     = isEnd(day);
            const past    = isPast(day);
            const active  = start || end;
            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDay(day)}
                disabled={past}
                className={`relative flex h-10 items-center justify-center text-sm font-medium transition-all
                  ${past        ? 'text-gray-300 cursor-not-allowed' : 'cursor-pointer'}
                  ${inRange     ? 'bg-brand-light text-brand-purple' : ''}
                  ${start       ? 'rounded-l-full bg-brand-gradient text-white' : ''}
                  ${end         ? 'rounded-r-full bg-brand-gradient text-white' : ''}
                  ${!active && !inRange && !past ? 'hover:bg-brand-light rounded-full' : ''}
                `}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>

        {/* Selected range summary */}
        {startDate && (
          <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Check-in</p>
                <p className="mt-1 font-semibold text-gray-800">{format(startDate, 'MMM d, yyyy')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Check-out</p>
                <p className="mt-1 font-semibold text-gray-800">{endDate ? format(endDate, 'MMM d, yyyy') : '—'}</p>
              </div>
            </div>
            {nights > 0 && (
              <div className="mt-3 border-t border-gray-100 pt-3 flex justify-between text-sm">
                <span className="text-gray-500">{nights} day{nights > 1 ? 's' : ''}</span>
                <span className="font-semibold text-brand-purple">Tap confirm to continue</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 border-t border-gray-100 bg-white p-4">
        <Button className="w-full" onClick={handleBook} loading={loading} disabled={!startDate || !endDate}>
          {nights > 0 ? `Confirm ${nights} day${nights > 1 ? 's' : ''}` : 'Select dates'}
        </Button>
      </div>
    </div>
  );
}
