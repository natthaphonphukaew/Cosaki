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
import { th } from 'date-fns/locale';

/* ─── colour palette – one per unique item ───────────────────────── */
const PALETTE = [
  { bg: 'bg-brand-purple',  text: 'text-white', hex: '#7C3AED' },
  { bg: 'bg-pink-500',      text: 'text-white', hex: '#EC4899' },
  { bg: 'bg-amber-500',     text: 'text-white', hex: '#F59E0B' },
  { bg: 'bg-blue-500',      text: 'text-white', hex: '#3B82F6' },
  { bg: 'bg-green-500',     text: 'text-white', hex: '#22C55E' },
  { bg: 'bg-rose-400',      text: 'text-white', hex: '#FB7185' },
  { bg: 'bg-indigo-500',    text: 'text-white', hex: '#6366F1' },
  { bg: 'bg-teal-500',      text: 'text-white', hex: '#14B8A6' },
];

const DAY_HEADERS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const STATUS_LABEL = {
  escrowed:  'รอยืนยัน',
  shipped:   'จัดส่งแล้ว',
  returned:  'ส่งคืนแล้ว',
  completed: 'เสร็จสิ้น',
  disputed:  'มีข้อพิพาท',
  cancelled: 'ยกเลิก',
};

const ACTIVE_STATUSES = ['escrowed', 'shipped', 'returned', 'completed', 'disputed'];

export default function SmartCalendar() {
  const navigate  = useNavigate();
  const [month, setMonth]       = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [popup, setPopup]       = useState(null);   // { booking, anchorRect }
  const [filterItem, setFilterItem] = useState('all'); // 'all' | item_id
  const [showFilter, setShowFilter] = useState(false);
  const popupRef = useRef(null);

  useEffect(() => {
    listBookings({ as: 'shop', limit: 100 })
      .then(({ data }) => setBookings(data.data.bookings))
      .catch(() => {});
  }, []);

  /* Close popup on outside click */
  useEffect(() => {
    const h = (e) => {
      if (popup && popupRef.current && !popupRef.current.contains(e.target)) {
        setPopup(null);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [popup]);

  /* ── derived ─────────────────────────────────────────────────── */
  const activeBookings = useMemo(() =>
    bookings.filter((b) =>
      ACTIVE_STATUSES.includes(b.status) && b.rental_start && b.rental_end,
    ), [bookings]);

  /* unique items for filter + colour mapping */
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

  /* calendar layout */
  const days      = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const startPad  = startOfMonth(month).getDay();
  const totalCells = startPad + days.length;
  const endPad    = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);

  /* bookings that touch a given day */
  const bookingsOnDay = (day) =>
    displayed.filter((b) => {
      const s = startOfDay(parseISO(b.rental_start));
      const e = endOfDay(parseISO(b.rental_end));
      return !isAfter(s, endOfDay(day)) && !isBefore(e, startOfDay(day));
    });

  /* For a booking bar: is this the first day of the bar in this month? */
  const isBarStart = (b, day) => {
    const s = startOfDay(parseISO(b.rental_start));
    return isSameDay(day, s) || isSameDay(day, startOfMonth(month));
  };

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
              {filterItem === 'all' ? 'ทั้งหมด' : (itemMap[filterItem]?.name?.split(' ').slice(0,2).join(' ') || 'กรอง')}
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
                    className={`w-full text-left flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${String(filterItem) === String(item.id) ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${item.color.bg}`} />
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
                onClick={() => setFilterItem(String(filterItem) === String(item.id) ? 'all' : String(item.id))}
                className="flex items-center gap-1.5 text-xs text-gray-600"
              >
                <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${item.color.bg} ${String(filterItem) === String(item.id) ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`} />
                <span className="max-w-[80px] truncate">{item.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Day headers */}
        <div className="grid grid-cols-7 text-center mb-0.5">
          {DAY_HEADERS.map((d) => (
            <span key={d} className="text-[10px] font-semibold text-gray-400 py-1">{d}</span>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="rounded-2xl bg-white shadow-sm overflow-hidden border border-gray-100">
          <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
            {/* Padding before month start */}
            {Array.from({ length: startPad }).map((_, i) => (
              <div key={`pre-${i}`} className="min-h-[72px] bg-gray-50/50 p-1" />
            ))}

            {/* Month days */}
            {days.map((day) => {
              const isToday = isSameDay(day, new Date());
              const dayBks  = bookingsOnDay(day);
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[72px] p-1 relative ${isToday ? 'bg-brand-light/60' : ''}`}
                >
                  {/* Date number */}
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium mb-0.5 mx-auto
                      ${isToday ? 'bg-brand-purple text-white font-bold' : 'text-gray-500'}`}
                  >
                    {format(day, 'd')}
                  </span>

                  {/* Booking bars (max 3 visible) */}
                  <div className="flex flex-col gap-0.5">
                    {dayBks.slice(0, 3).map((b) => {
                      const color = itemMap[b.item_id]?.color || PALETTE[0];
                      const showLabel = isBarStart(b, day);
                      return (
                        <button
                          key={b.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            setPopup({ booking: b, rect });
                          }}
                          className={`w-full rounded-[4px] px-1 py-0.5 text-left text-[9px] font-semibold leading-tight ${color.bg} ${color.text} truncate`}
                          title={b.item_name}
                        >
                          {showLabel ? b.item_name?.split(' ').slice(0, 3).join(' ') : ''}
                        </button>
                      );
                    })}
                    {dayBks.length > 3 && (
                      <span className="text-[9px] text-gray-400 text-center">+{dayBks.length - 3}</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* End padding to complete grid */}
            {Array.from({ length: endPad }).map((_, i) => (
              <div key={`post-${i}`} className="min-h-[72px] bg-gray-50/50 p-1" />
            ))}
          </div>
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

        {/* Upcoming bookings list */}
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
                <span className={`h-9 w-1.5 rounded-full flex-shrink-0 ${color.bg}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{b.item_name}</p>
                  <p className="text-xs text-gray-400">
                    {b.rental_start && format(parseISO(b.rental_start), 'd MMM')} –{' '}
                    {b.rental_end   && format(parseISO(b.rental_end),   'd MMM')}
                    {' · '}{b.renter_name}
                  </p>
                </div>
                <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${color.bg} ${color.text}`}>
                  {STATUS_LABEL[b.status] || b.status}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Booking popup ────────────────────────────────────────── */}
      {popup && (() => {
        const b = popup.booking;
        const color = itemMap[b.item_id]?.color || PALETTE[0];
        const img = Array.isArray(b.image_urls) ? b.image_urls[0] : b.image_urls?.[0];
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
              {/* Top strip with colour */}
              <div className={`${color.bg} px-4 pt-4 pb-3`}>
                <div className="flex items-start gap-3">
                  {/* Item thumbnail */}
                  <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl bg-white/20">
                    {img
                      ? <img src={img} alt="" className="h-full w-full object-cover" />
                      : <div className="flex h-full w-full items-center justify-center text-white text-2xl">👘</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-base font-bold ${color.text} leading-tight`}>{b.item_name}</p>
                    <span className="mt-1 inline-block rounded-full bg-white/25 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wide">
                      {STATUS_LABEL[b.status] || b.status}
                    </span>
                  </div>
                  <button onClick={() => setPopup(null)} className={`${color.text} opacity-70`}>
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
                  className={`w-full rounded-full py-3 text-sm font-bold tracking-wide ${color.bg} ${color.text}`}
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
