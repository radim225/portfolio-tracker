const czk = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 2 });
const pct = new Intl.NumberFormat('cs-CZ', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 2 });
const num = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 4 });
const dateShort = new Intl.DateTimeFormat('cs-CZ', { year: 'numeric', month: 'short', day: 'numeric' });

export const formatCzk = (v: number) => czk.format(Math.round(v));
export const formatPct = (v: number) => pct.format(v / 100);
export const formatNum = (v: number) => num.format(v);
export const formatDate = (v: string | Date) =>
  dateShort.format(typeof v === 'string' ? new Date(v) : v);

export function formatPnl(v: number): { text: string; positive: boolean } {
  return { text: (v >= 0 ? '+' : '') + formatCzk(v), positive: v >= 0 };
}
