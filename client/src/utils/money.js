// Single Thai-Baht money formatter for the whole app.
//   baht(690)      → "฿690.00"
//   baht(690, 0)   → "฿690"
export const baht = (n, decimals = 2) => `฿${Number(n || 0).toFixed(decimals)}`;
