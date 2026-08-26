/**
 * Calendar-day helpers. Meal dates and week starts represent *local* calendar
 * days, so everything here must be built from local year/month/day — never
 * from `toISOString()`, which shifts to UTC and rolls the day over in the
 * evening for anyone west of UTC (plan would silently regenerate each night).
 */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

export function startOfWeek(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  return toIsoDate(d);
}

export function daysAgo(isoDateTime: string): number {
  const then = new Date(isoDateTime).getTime();
  const now = Date.now();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function weekdayLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  return WEEKDAY_LABELS[d.getDay()];
}

export function shortDateLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatRelativeScanTime(isoDateTime?: string): string {
  if (!isoDateTime) return 'Never scanned';
  const days = daysAgo(isoDateTime);
  if (days <= 0) return 'Scanned today';
  if (days === 1) return 'Last scanned yesterday';
  return `Last scanned ${days} days ago`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}
