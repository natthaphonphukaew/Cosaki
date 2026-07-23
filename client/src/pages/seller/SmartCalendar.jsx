import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, X, ChevronDown,
  User, Calendar, Tag,
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { listBookings } from '@/api/bookings';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, parseISO, isBefore, isAfter,
  startOfDay, endOfDay,
} from 'date-fns';

/* ─── colour palette ──────────────────────────────────────────────── */
const PALETTE = [
  { bg: '#7C3AED', text: '#fff' },
  { bg: '#EC4899', text: '#fff' },
  { bg: '#F59E0B', text: '#fff' },
  { bg: '#3B82F6', text: '#fff' },
  { bg: '#22C55E', text: '#fff' },
  { bg: '#FB7185', text: '#fff' },
  { bg: '#6366F1', text: '#fff' },
  { bg: '#14B8A6', text: '#fff' },
];

const DAY_HEADERS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

const STATUS_LABEL = {
  escrowed:  'รอยืนยัน',
  shipped:   'จัดส่งแล้ว',
  returned:  'ส่งคืนแล้ว',
  completed: 'เสร็จสิ้น',
  disputed:  'มีข้อพิพาท',
  cancelled:  'ยกเลิก',
};

const ACTIVE_STATUSES = ['escrowed', 'shipped', 'returned', 'completed', 'disputed'];
const BAR_H = 20;   // px height of each bar
const BAR_GAP = 3;  // px gap between bars
const DATE_ROW_H = 28; // px for date number row

/* ── Lane assignment: greedy, per week-row ───────────────────────── */
function assignLanes(segments) {
  // sort by startCol then bookingId for stable order
  const sorted = [...segments].sort((a, b) => a.startCol - b.startCol || a.booking.id - b.booking.id);
  const laneEnds = []; // laneEnds[lane] = last endCol used in that lane
  sorted.forEach((seg) => {
    let lane = laneEnds.findIndex((end) => end <= seg.startCol);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = seg.startCol + seg.span;
    seg.lane = lane;
  });
  return sorted;
}

export default function SmartCalendar() {
  const navigate  = useNavigate();
  const [month, setMonth]       = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [popup, setPopup]       = useState(null);
  const [filterItem, setFilterItem] = useState('all');
  const [showFilter, setShowFilter] = useState(false);
  const popupRef = useRef(null);

  useEffect(() => {
    listBookings({ as: 'shop', limit: 100 })
      .then(({ data }) => setBookings(data.data.bookings))
      .catch(() => {});
  }, []);

  /* Close popup on outside click */
  useEffect(() => {
    if (!popup) return;
    const h = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) setPopup(null);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [popup]);

  /* ── derived ────────────────────────────────────────────────────── */
  const activeBookings = useMemo(() =>
    bookings.filter((b) =>
      ACTIVE_STATUSES.includes(b.status) && b.rental_start && b.rental_end,
    ), [bookings]);

  /* assign a stable colour per item_id */
  const itemMap = useMemo(() => {
    const map = {};
    activeBookings.forEach((b) => {
      if (!map[b.item_id]) {
        const idx = Object.keys(map).length % PALETTE.length;
        map[b.item_id] = { id: b.item_id, name: b.item_name, color: PALETTE[idx] };
      }
    });
    return map;
  }, [activeBookings]);

  const displayed = useMemo(() =>
    filterItem === 'all'
      ? activeBookings
      : activeBookings.filter((b) => String(b.item_id) === String(filterItem)),
    [activeBookings, filterItem]);

  /* ── Build calendar weeks ────────────────────────────────────────── */
  const startPad = startOfMonth(month).getDay();
  const days     = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const totalCells = startPad + days.length;
  const endPad   = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  const allCells = [
    ...Array(startPad).fill(null),
    ...days,
    ...Array(endPad).fill(null),
  ];
  const weeks = [];
  for (let i = 0; i < allCells.length; i += 7) {
    weeks.push(allCells.slice(i, i + 7));
  }

  /* ── For a given week, compute positioned booking segments ──────── */
  function getWeekSegments(week) {
    const realDays = week.filter(Boolean);
    if (!realDays.length) return [];

    const segments = [];

    displayed.forEach((booking) => {
      const bStart = startOfDay(parseISO(booking.rental_start));
      const bEnd   = endOfDay(parseISO(booking.rental_end));

      // find first & last real day in this week
      const weekFirstDay = realDays[0];
      const weekLastDay  = realDays[realDays.length - 1];

      if (isAfter(bStart, endOfDay(weekLastDay))) return;
      if (isBefore(bEnd,  startOfDay(weekFirstDay))) return;

      // clamp segment to this week
      const segStart = isAfter(bStart, startOfDay(weekFirstDay)) ? bStart : startOfDay(weekFirstDay);
      const segEnd   = isBefore(bEnd, endOfDay(weekLastDay))     ? bEnd   : endOfDay(weekLastDay);

      // find column indices within the 7-col week array
      const startCol = week.findIndex(
        (d) => d && isSameDay(d, segStart),
      );
      const endCol = week.findIndex(
        (d) => d && isSameDay(d, startOfDay(segEnd)),
      );

      if (startCol === -1) return; // safety

      const resolvedEnd = endCol === -1 ? 6 : endCol;
      const span = resolvedEnd - startCol + 1;

      segments.push({
        booking,
        startCol,
        span,
        isStart: isSameDay(segStart, bStart),           // booking starts here
        isEnd:   isSameDay(startOfDay(segEnd), startOfDay(bEnd)), // booking ends here
      });
    });

    return assignLanes(segments);
  }

  return (
    <AppShell>
      <div className="px-3 pt-5 pb-32">

        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">ปฏิทินการเช่า</h2>
            <p className="text-xs text-gray-400">ติดตามสถานะการจองแต่ละชิ้น</p>
          </div>

          {/* Item filter dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFilter((v) => !v)}
              className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm"
            >
              {filterItem === 'all'
                ? 'ทั้งหมด'
                : (itemMap[filterItem]?.name?.split(' ').slice(0, 2).join(' ') || 'กรอง')}
              <ChevronDown size={12} />
            </button>
            {showFilter && (
              <div className="absolute right-0 top-10 z-50 min-w-[180px] rounded-2xl bg-white p-2 shadow-xl border border-gray-100">
                <button
                  onClick={() => { setFilterItem('all'); setShowFilter(false); }}
                  className={`w-full text-left rounded-xl px-3 py-2 text-sm font-medium transition-colors ${filterItem === 'all' ? 'bg-brand-purple text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  ทั้งหมด
                </button>
                {Object.values(itemMap).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setFilterItem(String(item.id)); setShowFilter(false); }}
                    className="w-full text-left flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium hover:bg-gray-50"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ background: item.color.bg }}
                    />
                    <span className="truncate text-gray-700">{item.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Month nav */}
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => setMonth(subMonths(month, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-gray-800">
            {format(month, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setMonth(addMonths(month, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Colour legend */}
        {Object.values(itemMap).length > 0 && (
          <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1.5">
            {Object.values(itemMap).map((item) => (
              <button
                key={item.id}
                onClick={() =>
                  setFilterItem(String(filterItem) === String(item.id) ? 'all' : String(item.id))
                }
                className="flex items-center gap-1.5 text-xs text-gray-600"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{
                    background: item.color.bg,
                    boxShadow: String(filterItem) === String(item.id) ? `0 0 0 2px #fff, 0 0 0 3.5px ${item.color.bg}` : 'none',
                  }}
                />
                <span className="max-w-[80px] truncate">{item.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Day headers */}
        <div className="grid grid-cols-7 text-center mb-0.5">
          {DAY_HEADERS.map((d) => (
            <span key={d} className="text-[11px] font-semibold text-gray-400 py-1">{d}</span>
          ))}
        </div>

        {/* ── Calendar: week rows ─────────────────────────────────── */}
        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          {weeks.map((week, wi) => {
            const segments  = getWeekSegments(week);
            const maxLane   = segments.reduce((m, s) => Math.max(m, s.lane), -1);
            const barsHeight = maxLane >= 0 ? (maxLane + 1) * (BAR_H + BAR_GAP) + 4 : 0;

            return (
              <div
                key={wi}
                className={`border-b border-gray-100 last:border-b-0`}
              >
                {/* Date number row */}
                <div className="grid grid-cols-7">
                  {week.map((day, di) => {
                    const isToday = day && isSameDay(day, new Date());
                    return (
                      <div
                        key={di}
                        className={`border-r border-gray-100 last:border-r-0 flex items-center justify-center`}
                        style={{ height: DATE_ROW_H }}
                      >
                        {day && (
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium
                              ${isToday
                                ? 'bg-brand-purple text-white font-bold'
                                : 'text-gray-500'}`}
                          >
                            {format(day, 'd')}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Booking bars layer */}
                {barsHeight > 0 && (
                  <div className="relative px-0.5" style={{ height: barsHeight }}>
                    {segments.map((seg) => {
                      const { startCol, span, isStart, isEnd, lane, booking } = seg;
                      const color = itemMap[booking.item_id]?.color || PALETTE[0];
                      const CELL_W = 100 / 7; // percent

                      const leftPct  = startCol * CELL_W;
                      const widthPct = span * CELL_W;
                      const top      = lane * (BAR_H + BAR_GAP) + 2;

                      // rounding: full pill if single cell start+end, else half-rounded on start/end
                      const borderRadius = [
                        isStart ? '999px' : '0',
                        isEnd   ? '999px' : '0',
                        isEnd   ? '999px' : '0',
                        isStart ? '999px' : '0',
                      ].join(' ');

                      // margin so bar doesn't bleed to cell edge on start/end
                      const ML = isStart ? 2 : 0;
                      const MR = isEnd   ? 2 : 0;

                      return (
                        <button
                          key={`${booking.id}-w${wi}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPopup({ booking });
                          }}
                          title={booking.item_name}
                          style={{
                            position: 'absolute',
                            left:   `calc(${leftPct}% + ${ML}px)`,
                            width:  `calc(${widthPct}% - ${ML + MR}px)`,
                            top,
                            height: BAR_H,
                            background:   color.bg,
                            color:        color.text,
                            borderRadius,
                            fontSize: 10,
                            fontWeight: 700,
                            lineHeight: `${BAR_H}px`,
                            paddingLeft: isStart ? 8 : 4,
                            paddingRight: 4,
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            textAlign: 'left',
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                          }}
                        >
                          {isStart ? booking.item_name : ''}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Padding row when no bars */}
                {barsHeight === 0 && <div style={{ height: 6 }} />}
              </div>
            );
          })}
        </div>

        {/* Quick stats */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: 'กำลังเช่า',  value: displayed.filter(b => b.status === 'shipped').length },
            { label: 'รอยืนยัน',   value: displayed.filter(b => b.status === 'escrowed').length },
            { label: 'เสร็จสิ้น',  value: displayed.filter(b => b.status === 'completed').length },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-2xl bg-white p-3 shadow-sm text-center">
              <p className="text-xl font-bold text-brand-purple">{value}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Recent bookings list */}
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-semibold text-gray-900 text-sm">การจองล่าสุด</h3>
          {displayed.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">ไม่มีการจอง</p>
          )}
          {displayed.slice(0, 5).map((b) => {
            const color = itemMap[b.item_id]?.color || PALETTE[0];
            return (
              <button
                key={b.id}
                onClick={() => navigate(`/seller/orders/${b.id}`)}
                className="w-full flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 text-left"
              >
                <span
                  className="h-9 w-1.5 rounded-full flex-shrink-0"
                  style={{ background: color.bg }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{b.item_name}</p>
                  <p className="text-xs text-gray-400">
                    {b.rental_start && format(parseISO(b.rental_start), 'd MMM')} –{' '}
                    {b.rental_end   && format(parseISO(b.rental_end),   'd MMM')}
                    {' · '}{b.renter_name}
                  </p>
                </div>
                <span
                  className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: color.bg, color: color.text }}
                >
                  {STATUS_LABEL[b.status] || b.status}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Booking popup ────────────────────────────────────────────── */}
      {popup && (() => {
        const b = popup.booking;
        const color = itemMap[b.item_id]?.color || PALETTE[0];
        const img = Array.isArray(b.image_urls) ? b.image_urls[0] : null;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={() => setPopup(null)}
          >
            <div
              ref={popupRef}
              className="w-full max-w-[320px] rounded-3xl bg-white shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Coloured header */}
              <div style={{ background: color.bg }} className="px-4 pt-4 pb-3">
                <div className="flex items-start gap-3">
                  <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl bg-white/20">
                    {img
                      ? <img src={img} alt="" className="h-full w-full object-cover" />
                      : <div className="flex h-full w-full items-center justify-center text-2xl">👘</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-white leading-tight">{b.item_name}</p>
                    <span className="mt-1 inline-block rounded-full bg-white/25 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wide">
                      {STATUS_LABEL[b.status] || b.status}
                    </span>
                  </div>
                  <button onClick={() => setPopup(null)} className="text-white/70 mt-0.5">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Details */}
              <div className="px-4 py-4 space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-gray-400 font-medium">
                    <User size={14} /> ผู้เช่า
                  </span>
                  <span className="font-semibold text-gray-800">{b.renter_name || '—'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-gray-400 font-medium">
                    <Calendar size={14} /> ช่วงเช่า
                  </span>
                  <span className="font-semibold text-gray-800">
                    {b.rental_start && format(parseISO(b.rental_start), 'd MMM')}
                    {' – '}
                    {b.rental_end && format(parseISO(b.rental_end), 'd MMM')}
                  </span>
                </div>
                {b.total_amount && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-gray-400 font-medium">
                      <Tag size={14} /> ยอดรวม
                    </span>
                    <span className="font-semibold text-gray-800">฿{b.total_amount}</span>
                  </div>
                )}
              </div>

              {/* CTA */}
              <div className="px-4 pb-5">
                <button
                  onClick={() => { setPopup(null); navigate(`/seller/orders/${b.id}`); }}
                  className="w-full rounded-full py-3 text-sm font-bold tracking-wide text-white"
                  style={{ background: color.bg }}
                >
                  ดูรายละเอียดการจอง
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </AppShell>
  );
}
