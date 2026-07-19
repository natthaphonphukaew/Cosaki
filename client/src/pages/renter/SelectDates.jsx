import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import { useEffect } from 'react';
import { createBooking, rescheduleBooking } from '@/api/bookings';
import { getAvailability, getItem } from '@/api/items';
import toast from 'react-hot-toast';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, addDays, getHours,
         eachDayOfInterval, isSameMonth, isSameDay, isAfter, isBefore, startOfToday } from 'date-fns';

export default function SelectDates() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const rateType = state?.rateType || 'test';
  const rescheduleId = state?.rescheduleBookingId;
  const today = startOfToday();

  const [month, setMonth]       = useState(new Date());
  const [startDate, setStart]   = useState(null);
  const [endDate, setEnd]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const [booked, setBooked]     = useState([]);   // [{rental_start, rental_end}]
  const [item, setItem]         = useState(state?.item || null);
  const [isExpress, setIsExpress] = useState(false);

  useEffect(() => {
    getAvailability(id).then(({ data }) => setBooked(data.data.booked)).catch(() => {});
    if (!item) {
      getItem(id).then(({ data }) => setItem(data.data.item)).catch(() => {});
    }
  }, [id]);

  // Compute minimum bookable date based on shipping logic
  const leadDays = item?.ship_lead_days ?? 7; // Default 7 days
  const nowHour = getHours(new Date());
  
  let minBookableDate = addDays(today, leadDays);
  if (isExpress) {
    minBookableDate = nowHour < 12 ? today : addDays(today, 1);
  }

  // A day is unavailable if it falls inside any active booking range.
  const isBooked = (day) => booked.some((b) => {
    const s = new Date(b.rental_start); s.setHours(0,0,0,0);
    const e = new Date(b.rental_end);   e.setHours(0,0,0,0);
    const d = new Date(day);            d.setHours(0,0,0,0);
    return d >= s && d <= e;
  });

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const startPad = startOfMonth(month).getDay(); // 0=Sun

  const handleDay = (day) => {
    if (isBefore(day, minBookableDate) || isBooked(day)) return;
    
    // Auto-lock end date to 2 days after start date
    const end = addDays(day, 2);
    
    // Check if the 3-day block overlaps with any booked dates
    for (let i = 0; i <= 2; i++) {
      if (isBooked(addDays(day, i))) {
        toast.error('วันที่คืนสินค้าติดคิวจองอื่น กรุณาเลือกวันอื่น');
        return;
      }
    }

    setStart(day);
    setEnd(end);
  };

  const isInRange = (day) => startDate && endDate && isAfter(day, startDate) && isBefore(day, endDate);
  const isStart   = (day) => startDate && isSameDay(day, startDate);
  const isEnd     = (day) => endDate && isSameDay(day, endDate);
  const isPast    = (day) => isBefore(day, minBookableDate);

  // Rental is calculated as 1 usage
  const nights = startDate && endDate ? 1 : 0;

  const handleBook = async () => {
    if (!startDate || !endDate) return toast.error('Please select dates');
    try {
      setLoading(true);
      const s = format(startDate, 'yyyy-MM-dd');
      const e = format(endDate,   'yyyy-MM-dd');

      // Reschedule an existing booking (free once) instead of creating a new one.
      if (rescheduleId) {
        await rescheduleBooking(rescheduleId, s, e);
        toast.success('เลื่อนคิวเรียบร้อย');
        navigate(`/bookings/${rescheduleId}/tracking`);
        return;
      }

      const { data } = await createBooking({ 
        item_id: id, 
        rate_type: rateType, 
        rental_start: s, 
        rental_end: e,
        is_express: isExpress 
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
        {item?.express_delivery && (
          <div className="mb-4 mt-2 rounded-xl border border-brand-purple/20 bg-brand-light/30 p-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-semibold text-brand-purple">🚀 รับส่งด่วนในจังหวัด (Express)</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {nowHour < 12 ? 'จองก่อนเที่ยง รับของวันนี้ได้เลย' : 'จองหลังเที่ยง รับของได้เร็วสุดวันพรุ่งนี้'}
                </p>
              </div>
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isExpress ? 'bg-brand-purple' : 'bg-gray-200'}`}>
                <input type="checkbox" className="sr-only" checked={isExpress} onChange={(e) => {
                  setIsExpress(e.target.checked);
                  setStart(null); setEnd(null);
                }} />
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isExpress ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </label>
          </div>
        )}

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
            const bookedDay = !past && isBooked(day);
            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDay(day)}
                disabled={past || bookedDay}
                className={`relative flex h-10 items-center justify-center text-sm font-medium transition-all
                  ${past        ? 'text-gray-300 cursor-not-allowed' : 'cursor-pointer'}
                  ${bookedDay   ? 'text-gray-300 line-through cursor-not-allowed' : ''}
                  ${inRange     ? 'bg-brand-light text-brand-purple' : ''}
                  ${start       ? 'rounded-l-full bg-brand-gradient text-white' : ''}
                  ${end         ? 'rounded-r-full bg-brand-gradient text-white' : ''}
                  ${!active && !inRange && !past && !bookedDay ? 'hover:bg-brand-light rounded-full' : ''}
                `}
              >
                {format(day, 'd')}
                {bookedDay && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-amber-400" />}
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
