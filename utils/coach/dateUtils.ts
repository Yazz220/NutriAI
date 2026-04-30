const ISO_DATE_LENGTH = 10;

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, ISO_DATE_LENGTH);
}

export function parseISODate(dateISO: string): Date {
  const [year, month, day] = dateISO.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function getWeekStartISO(dateISO: string): string {
  const date = parseISODate(dateISO);
  const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 1 = Monday
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return toISODate(date);
}

export function shiftDate(dateISO: string, days: number): string {
  const date = parseISODate(dateISO);
  date.setUTCDate(date.getUTCDate() + days);
  return toISODate(date);
}

export function shiftWeek(dateISO: string, weeks: number): string {
  return shiftDate(dateISO, weeks * 7);
}

export function isToday(dateISO: string): boolean {
  return dateISO === toISODate(new Date());
}

export function isYesterday(dateISO: string): boolean {
  return dateISO === shiftDate(toISODate(new Date()), -1);
}

export function isFuture(dateISO: string): boolean {
  return parseISODate(dateISO).getTime() > parseISODate(toISODate(new Date())).getTime();
}
