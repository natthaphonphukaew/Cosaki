// Deterministic item → bar color for the calendar. Tailwind purges dynamic
// class names, so we return inline hex (used via style={{ backgroundColor }}).
// The same item_id always maps to the same color across days, months and both
// (seller + renter) calendars.
export const PALETTE = [
  '#7C3AED', '#EC4899', '#F59E0B', '#3B82F6', '#10B981', '#EF4444',
  '#8B5CF6', '#14B8A6', '#F97316', '#6366F1', '#DB2777', '#0EA5E9',
];

const hash = (s = '') => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

// Single-item fallback (hash). Prefer buildColorMap when a set of items is known,
// so distinct items always get distinct colors (no hash collisions).
export const itemColor = (id) => PALETTE[hash(String(id)) % PALETTE.length];

// Assign each distinct item id a distinct palette color by index. Given a stable
// input order (e.g. items sorted by name), the mapping is stable for that set.
export const buildColorMap = (ids) => {
  const map = new Map();
  ids.forEach((id, i) => map.set(id, PALETTE[i % PALETTE.length]));
  return map;
};
