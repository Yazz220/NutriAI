/**
 * Utility functions for Coach date handling and calculations
 */

export const getWeekStartISO = (isoDateStr: string): string => {
  const target = new Date(isoDateStr);
  const dayOfWeek = target.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // treat Sunday as last day
  const monday = new Date(target);
  monday.setDate(target.getDate() + mondayOffset);
  return monday.toISOString().split('T')[0];
};

export const formatWeekRange = (anyIsoInWeek: string): string => {
  const startISO = getWeekStartISO(anyIsoInWeek);
  const start = new Date(startISO);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const s = start.toLocaleDateString(undefined, opts);
  const e = end.toLocaleDateString(undefined, opts);
  return `${s} — ${e}`;
};

export const shiftDate = (currentISO: string, deltaDays: number): string => {
  const d = new Date(currentISO);
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().split('T')[0];
};

export const shiftWeek = (currentISO: string, deltaWeeks: number): string => {
  const d = new Date(currentISO);
  d.setDate(d.getDate() + deltaWeeks * 7);
  return d.toISOString().split('T')[0];
};

export const isToday = (isoDateStr: string): boolean => {
  const todayISO = new Date().toISOString().split('T')[0];
  return isoDateStr === todayISO;
};

export const isYesterday = (isoDateStr: string): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayISO = yesterday.toISOString().split('T')[0];
  return isoDateStr === yesterdayISO;
};

export const isFuture = (isoDateStr: string): boolean => {
  const todayISO = new Date().toISOString().split('T')[0];
  return new Date(isoDateStr) > new Date(todayISO);
};

export const getDayLabel = (isoDateStr: string): string => {
  const d = new Date(isoDateStr);
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
};