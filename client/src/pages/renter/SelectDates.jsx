import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import { useEffect } from 'react';
import { createBooking, rescheduleBooking } from '@/api/bookings';
import { getAvailability, getItem } from '@/api/items';
import toast from 'react-hot-toast';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, addDays, getHours,
         eachDayOfInterval, isSameMonth, isSameDay, isAfter, isBefore, startOfToday } from 'date-fns';

export default function SelectDates() {
  const { t } = useTranslation();
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

  // Fixed 7-day shipping buffer: non-express items are bookable from today + 7.
  // Express skips the queue: before noon → today, after noon → tomorrow.
  const SHIP_BUFFER_DAYS = 7;
  const RETURN_FREEZE_DAYS = 10;
  const returnDays = Math.max(1, Number(item?.return_days ?? 2));
  const nowHour = getHours(new Date());

  let minBookableDate = addDays(today, SHIP_BUFFER_DAYS);
  if (isExpress) {
    minBookableDate = nowHour < 12 ? today : addDays(today, 1);
  }

  // Each PAID booking occupies [rental_start, blocked_until) — the return date
  // plus a 10-day wash/iron freeze. A day sits inside an existing block if:
  const midnight = (v) => { const d = new Date(v); d.setHours(0,0,0,0); return d; };
  const inExistingBlock = (day) => booked.some((b) => {
    const s = midnight(b.rental_start);
    const until = midnight(b.blocked_until);   // exclusive: first free day
    const d = midnight(day);
    return d >= s && d < until;
  });

  // Picking `day` as start would occupy [day, day + returnDays + freeze). It is
  // invalid if that span overlaps any existing block (mirrors the server rule).
  const startConflicts = (day) => {
    const myStart = midnight(day);
    const myUntil = midnight(addDays(day, returnDays + RETURN_FREEZE_DAYS)); // exclusive
    return booked.some((b) => {
      const s = midnight(b.rental_start);
      const until = midnight(b.blocked_until);
      return myStart < until && s < myUntil;   // half-open overlap
    });
  };

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const startPad = startOfMonth(month).getDay(); // 0=Sun

  const handleDay = (day) => {
    if (isBefore(day, minBookableDate)) return;
    if (startConflicts(day)) {
      toast.error(t('dates.slotBusy'));
      return;
    }
    // Return-by date = start + the shop's return_days.
    setStart(day);
    setEnd(addDays(day, returnDays));
  };

  const isInRange = (day) => startDate && endDate && isAfter(day, startDate) && isBefore(day, endDate);
  const isStart   = (day) => startDate && isSameDay(day, startDate);
  const isEnd     = (day) => endDate && isSameDay(day, endDate);
  const isPast    = (day) => isBefore(day, minBookableDate);

  // Rental is calculated as 1 usage
  const nights = startDate && endDate ? 1 : 0;

  const handleBook = async () => {
    if (!startDate || !endDate) return toast.error(t('dates.selectDatesFirst'));
    try {
      setLoading(true);
      const s = format(startDate, 'yyyy-MM-dd');
      const e = format(endDate,   'yyyy-MM-dd');

      // Reschedule an existing booking (free once) instead of creating a new one.
      if (rescheduleId) {
        await rescheduleBooking(rescheduleId, s, e);
        toast.success(t('dates.rescheduled'));
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
      toast.error(err.response?.data?.message || t('dates.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title={t('header.selectDates')} />

      <div className="px-4 pb-32">
        {item?.express_delivery && (
          <div className="mb-4 mt-2 rounded-xl border border-brand-purple/20 bg-brand-light/30 p-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-semibold text-brand-purple">{t('dates.expressTitle')}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {nowHour < 12 ? t('dates.expressBefore') : t('dates.expressAfter')}
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

        {/* Earliest-bookable hint (fixed 7-day shipping buffer) */}
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600">
          <span>📦</span>
          {isExpress ? (
            <span>{t('dates.expressHint')} <b className="text-brand-purple">{format(minBookableDate, 'd MMM')}</b></span>
          ) : (
            <span>{t('dates.bufferHint', { days: SHIP_BUFFER_DAYS })} <b className="text-brand-purple">{format(minBookableDate, 'd MMM')}</b></span>
          )}
        </div>

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
            const bookedDay = !past && (inExistingBlock(day) || startConflicts(day));
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
                <p className="text-xs text-gray-400 uppercase tracking-wider">{t('dates.checkIn')}</p>
                <p className="mt-1 font-semibold text-gray-800">{format(startDate, 'd MMM yyyy')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">{t('dates.checkOut')}</p>
                <p className="mt-1 font-semibold text-gray-800">{endDate ? format(endDate, 'd MMM yyyy') : '—'}</p>
              </div>
            </div>
            {nights > 0 && (
              <div className="mt-3 border-t border-gray-100 pt-3 flex justify-between text-sm">
                <span className="text-gray-500">{nights} {t('common.day')}</span>
                <span className="font-semibold text-brand-purple">{t('dates.tapConfirm')}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 border-t border-gray-100 bg-white p-4">
        <Button className="w-full" onClick={handleBook} loading={loading} disabled={!startDate || !endDate}>
          {nights > 0 ? t('dates.confirmDays', { n: nights }) : t('dates.selectDates')}
        </Button>
      </div>
    </div>
  );
}
