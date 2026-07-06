// Compute integer age (years) from a date-of-birth value. Returns null if absent.
const ageFromDob = (dob) => {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
};

// Whether a renter may book an item of the given min_age, per PRD §1.2/§5.1.
// Rules: min age 15 overall; 18+ items allow parent-approved minors; 20+ strict.
const canRentAge = ({ age, isMinor, parentApproved }, minAge) => {
  if (age !== null && age < 15) return { ok: false, reason: 'ผู้เช่าต้องมีอายุ 15 ปีขึ้นไป' };
  const req = Number(minAge) || 0;
  if (req <= 0) return { ok: true };
  if (req === 18) {
    if ((age !== null && age >= 18) || (isMinor && parentApproved)) return { ok: true };
    return { ok: false, reason: 'ชุดนี้จำกัดผู้เช่าอายุ 18+ หรือเด็กที่ผู้ปกครองยืนยันแล้ว' };
  }
  // 15 or 20 (or other explicit threshold): require actual age.
  if (age !== null && age >= req) return { ok: true };
  return { ok: false, reason: `ชุดนี้จำกัดผู้เช่าอายุ ${req}+ ปี` };
};

module.exports = { ageFromDob, canRentAge };
