import {
  getWeekStartISO,
  shiftDate,
  shiftWeek,
  isToday,
  isYesterday,
  isFuture,
} from '@/utils/coach/dateUtils';

describe('getWeekStartISO', () => {
  it('returns Monday for a Thursday', () => {
    // 2026-03-12 is a Thursday, Monday is 2026-03-09
    expect(getWeekStartISO('2026-03-12')).toBe('2026-03-09');
  });

  it('returns same day for a Monday', () => {
    // 2026-03-09 is a Monday
    expect(getWeekStartISO('2026-03-09')).toBe('2026-03-09');
  });

  it('returns previous Monday for a Sunday', () => {
    // 2026-03-15 is a Sunday, previous Monday is 2026-03-09
    expect(getWeekStartISO('2026-03-15')).toBe('2026-03-09');
  });
});

describe('shiftDate', () => {
  it('adds days forward', () => {
    expect(shiftDate('2026-03-10', 3)).toBe('2026-03-13');
  });

  it('subtracts days backward', () => {
    expect(shiftDate('2026-03-10', -5)).toBe('2026-03-05');
  });

  it('crosses month boundary', () => {
    expect(shiftDate('2026-03-30', 5)).toBe('2026-04-04');
  });
});

describe('shiftWeek', () => {
  it('shifts one week forward', () => {
    expect(shiftWeek('2026-03-09', 1)).toBe('2026-03-16');
  });

  it('shifts two weeks backward', () => {
    expect(shiftWeek('2026-03-09', -2)).toBe('2026-02-23');
  });
});

describe('isToday', () => {
  it('returns true for today', () => {
    const todayISO = new Date().toISOString().split('T')[0];
    expect(isToday(todayISO)).toBe(true);
  });

  it('returns false for a past date', () => {
    expect(isToday('2020-01-01')).toBe(false);
  });
});

describe('isYesterday', () => {
  it('returns true for yesterday', () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterdayISO = d.toISOString().split('T')[0];
    expect(isYesterday(yesterdayISO)).toBe(true);
  });

  it('returns false for today', () => {
    const todayISO = new Date().toISOString().split('T')[0];
    expect(isYesterday(todayISO)).toBe(false);
  });
});

describe('isFuture', () => {
  it('returns true for a future date', () => {
    expect(isFuture('2099-01-01')).toBe(true);
  });

  it('returns false for a past date', () => {
    expect(isFuture('2020-01-01')).toBe(false);
  });
});
