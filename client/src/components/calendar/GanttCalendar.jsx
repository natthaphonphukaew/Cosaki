import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO, startOfDay, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
         eachDayOfInterval, isSameDay, isSameMonth, differenceInCalendarDays } from 'date-fns';
import ProductImage from '@/components/ui/ProductImage';
import Badge from '@/components/ui/Badge';
import { buildColorMap } from '@/utils/itemColor';

const MAX_LANES = 3;
const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
// The API serializes DATE columns as full UTC timestamps (pg → local-midnight →
// UTC), so parseISO recovers the correct local calendar day (matches the rest of
// the app). startOfDay normalizes for column math.
const dateOnly = (s) => startOfDay(parseISO(s));
const fmt = (s) => format(parseISO(s), 'd MMM yyyy');

export default function GanttCalendar({ bookings = [], onOpenDetail }) {
  const { t } = useTranslation();
  const [month, setMonth]     = useState(new Date());
  const [filterId, setFilterId] = useState(null);
  const [selected, setSelected] = useState(null);

  // Only bookings with real dates and not cancelled/draft occupy the calendar.
  const active = useMemo(() => bookings.filter(
    (b) => b.rental_start && b.rental_end && !['cancelled', 'draft'].includes(b.status)
  ), [bookings]);

  // Legend = unique items across the active bookings, sorted by name so the
  // color assignment is stable regardless of booking order.
  const legendItems = useMemo(() => {
    const map = new Map();
    active.forEach((b) => { if (!map.has(b.item_id)) map.set(b.item_id, b.item_name); });
    return [...map.entries()]
      .map(([item_id, item_name]) => ({ item_id, item_name }))
      .sort((a, b) => String(a.item_name).localeCompare(String(b.item_name)));
  }, [active]);

  // Distinct color per distinct item (index-based → no hash collisions).
  const colorMap = useMemo(() => buildColorMap(legendItems.map((it) => it.item_id)), [legendItems]);
  const colorOf = (id) => colorMap.get(id) || '#7C3AED';

  // When the filter no longer matches any item, reset it.
  useEffect(() => {
    if (filterId && !legendItems.some((it) => it.item_id === filterId)) setFilterId(null);
  }, [legendItems, filterId]);

  const shown = filterId ? active.filter((b) => b.item_id === filterId) : active;
  const spans = useMemo(() => shown.map((b) => ({ b, start: dateOnly(b.rental_start), end: dateOnly(b.rental_end) })), [shown]);

  // Full-week grid so multi-day bars can span cleanly.
  const weeks = useMemo(() => {
    const all = eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) });
    const rows = [];
    for (let i = 0; i < all.length; i += 7) rows.push(all.slice(i, i + 7));
    return rows;
  }, [month]);

  // Lock background scroll while the popup is open.
  useEffect(() => {
    if (!selected) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [selected]);

  // For one week, produce lane-assigned segments + per-column overflow counts.
  const buildWeek = (week) => {
    const weekStart = week[0], weekEnd = week[6];
    const segs = spans
      .filter((s) => s.start <= weekEnd && s.end >= weekStart)
      .map((s) => {
        const rawStart = differenceInCalendarDays(s.start, weekStart);
        const rawEnd   = differenceInCalendarDays(s.end, weekStart);
        return { b: s.b, startCol: clamp(rawStart, 0, 6), endCol: clamp(rawEnd, 0, 6), roundL: rawStart >= 0, roundR: rawEnd <= 6 };
      })
      .sort((a, z) => a.startCol - z.startCol || a.endCol - z.endCol);

    const lanes = [];
    const overflow = new Array(7).fill(0);
    segs.forEach((seg) => {
      let placed = false;
      for (let li = 0; li < lanes.length; li++) {
        if (lanes[li].every((o) => seg.endCol < o.startCol || seg.startCol > o.endCol)) {
          lanes[li].push(seg); placed = true; break;
        }
      }
      if (!placed) {
        if (lanes.length < MAX_LANES) lanes.push([seg]);
        else for (let c = seg.startCol; c <= seg.endCol; c++) overflow[c]++;
      }
    });
    return { lanes, overflow };
  };

  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm">
      {/* Month nav + filter dropdown (top-right) */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button onClick={() => setMonth(subMonths(month, 1))} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"><ChevronLeft size={16} /></button>
          <span className="min-w-[110px] text-center text-sm font-semibold text-gray-800">{format(month, 'MMMM yyyy')}</span>
          <button onClick={() => setMonth(addMonths(month, 1))} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"><ChevronRight size={16} /></button>
        </div>
        <select value={filterId || ''} onChange={(e) => setFilterId(e.target.value || null)}
          className="max-w-[130px] truncate rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 outline-none focus:border-brand-purple">
          <option value="">{t('calendar.allItems')}</option>
          {legendItems.map((it) => <option key={it.item_id} value={it.item_id}>{it.item_name}</option>)}
        </select>
      </div>

      {/* Legend (top-right area, clickable) */}
      {legendItems.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {legendItems.map((it) => (
            <button key={it.item_id} onClick={() => setFilterId(filterId === it.item_id ? null : it.item_id)}
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${filterId === it.item_id ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600'}`}>
              <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: colorOf(it.item_id) }} />
              <span className="max-w-[92px] truncate">{it.item_name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 text-center">
        {DOW.map((d) => <span key={d} className="text-[10px] font-semibold text-gray-400">{d}</span>)}
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => {
        const { lanes, overflow } = buildWeek(week);
        return (
          <div key={wi} className="border-b border-gray-50 pb-1 last:border-0">
            {/* Day numbers */}
            <div className="grid grid-cols-7 pt-1 text-center">
              {week.map((day) => {
                const inMonth = isSameMonth(day, month);
                const today = isSameDay(day, new Date());
                return (
                  <div key={day.toISOString()} className="flex justify-center">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${today ? 'bg-brand-purple font-bold text-white' : inMonth ? 'text-gray-700' : 'text-gray-300'}`}>
                      {format(day, 'd')}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Bar lanes */}
            <div className="mt-0.5 space-y-0.5" style={{ minHeight: 6 }}>
              {lanes.map((lane, li) => (
                <div key={li} className="grid grid-cols-7">
                  {lane.map((seg) => (
                    <button key={seg.b.id} onClick={() => setSelected(seg.b)}
                      title={seg.b.item_name}
                      style={{ gridColumn: `${seg.startCol + 1} / ${seg.endCol + 2}`, backgroundColor: colorOf(seg.b.item_id) }}
                      className={`mx-[1px] h-4 overflow-hidden whitespace-nowrap px-1 text-left text-[9px] font-semibold leading-4 text-white active:opacity-80 ${seg.roundL ? 'rounded-l-md' : ''} ${seg.roundR ? 'rounded-r-md' : ''}`}>
                      {seg.roundL ? seg.b.item_name : ''}
                    </button>
                  ))}
                </div>
              ))}
              {overflow.some((n) => n > 0) && (
                <div className="grid grid-cols-7">
                  {overflow.map((n, c) => (
                    <span key={c} style={{ gridColumn: `${c + 1} / ${c + 2}` }} className="text-center text-[8px] font-medium text-gray-400">
                      {n > 0 ? `+${n}` : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {active.length === 0 && (
        <p className="py-6 text-center text-sm text-gray-400">{t('calendar.noBookings')}</p>
      )}

      {/* Booking popup */}
      {selected && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30" onClick={() => setSelected(null)}>
          <div className="w-full max-w-[390px] rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200" />
            <div className="flex gap-3">
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl">
                <ProductImage item={{ image_urls: selected.image_urls, name: selected.item_name }} emojiClassName="text-2xl" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-gray-900">{selected.item_name}</p>
                {selected.shop_name && <p className="truncate text-xs text-gray-400">{selected.shop_name}</p>}
                <div className="mt-1"><Badge status={selected.status} /></div>
              </div>
            </div>
            <div className="mt-3 space-y-2 rounded-xl bg-gray-50 p-3 text-sm">
              <Row label={t('calendar.rentDate')} value={fmt(selected.rental_start)} />
              <Row label={t('calendar.returnDate')} value={fmt(selected.rental_end)} />
              <Row label={t('calendar.total')} value={`฿${Number(selected.total_amount || 0).toFixed(2)}`} strong />
            </div>
            <button onClick={() => onOpenDetail?.(selected)}
              className="mt-4 w-full rounded-full bg-brand-gradient py-3 text-sm font-semibold text-white">
              {t('calendar.viewDetail')}
            </button>
            <button onClick={() => setSelected(null)}
              className="mt-2 w-full rounded-full py-2.5 text-sm font-medium text-gray-500">{t('common.close')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

const Row = ({ label, value, strong }) => (
  <div className="flex items-center justify-between">
    <span className="text-gray-500">{label}</span>
    <span className={strong ? 'font-bold text-brand-purple' : 'font-medium text-gray-800'}>{value}</span>
  </div>
);
