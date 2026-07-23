const db = require('../config/db');

// Booking date rules (PRD update):
//   • A fixed shipping buffer means an item can only be booked starting today + 7.
//   • After a rental's return date the item is frozen for 10 days (ซัก/รีด/พับ)
//     before it can be rented again. So an item is "occupied" over the half-open
//     span [rental_start, rental_end + 10): the next bookable day is rental_end + 10.
//   • Only COMMITTED (paid) bookings occupy the calendar. Unpaid pending/draft
//     selections never reserve a slot — the slot is claimed at payment.
const SHIP_BUFFER_DAYS = 7;
const RETURN_FREEZE_DAYS = 10;
const COMMITTED_STATUSES = ['escrowed', 'shipped', 'returned', 'completed'];

// Find COMMITTED bookings whose occupied span overlaps [start, end + freeze).
// Two half-open spans [a1,a2) and [b1,b2) overlap iff a1 < b2 AND b1 < a2, i.e.
//   start < rental_end + 10  AND  rental_start < end + 10
async function findCommittedConflicts({ itemId, start, end, excludeBookingId = null }) {
  const params = [itemId, COMMITTED_STATUSES, RETURN_FREEZE_DAYS, start, end];
  let sql = `
    SELECT id, rental_start, rental_end FROM bookings
    WHERE item_id = $1
      AND status = ANY($2)
      AND $4::date < (rental_end + $3::int)
      AND rental_start < ($5::date + $3::int)`;
  if (excludeBookingId) {
    params.push(excludeBookingId);
    sql += ` AND id <> $${params.length}`;
  }
  const { rows } = await db.query(sql, params);
  return rows;
}

module.exports = {
  SHIP_BUFFER_DAYS,
  RETURN_FREEZE_DAYS,
  COMMITTED_STATUSES,
  findCommittedConflicts,
};
