// Lightweight client-side wishlist (localStorage). Stores a compact snapshot of
// each saved item so the Saved page can render without re-fetching.
const KEY = 'cosaki-favorites';

const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
};
const write = (list) => localStorage.setItem(KEY, JSON.stringify(list));

export const getFavorites = () => read();

export const isFavorite = (id) => read().some((x) => x.id === id);

// Toggle by item object; returns the new favorited state.
export const toggleFavorite = (item) => {
  if (!item?.id) return false;
  const list = read();
  const exists = list.some((x) => x.id === item.id);
  if (exists) {
    write(list.filter((x) => x.id !== item.id));
    return false;
  }
  write([
    { id: item.id, name: item.name, daily_rate: item.daily_rate, fandom: item.fandom, image_urls: item.image_urls },
    ...list,
  ]);
  return true;
};
