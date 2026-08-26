import { toIsoDate, addDays, startOfWeek, weekdayLabel } from '../src/utils/date';

describe('date utils (local calendar semantics)', () => {
  it('toIsoDate uses local calendar day, not UTC', () => {
    // 23:30 local on a date whose UTC representation is the next day west of UTC.
    const lateEvening = new Date(2026, 7, 24, 23, 30, 0);
    expect(toIsoDate(lateEvening)).toBe('2026-08-24');
  });

  it('toIsoDate zero-pads month and day', () => {
    expect(toIsoDate(new Date(2026, 0, 5, 12, 0, 0))).toBe('2026-01-05');
  });

  it('startOfWeek returns Monday of the local week even late in the evening', () => {
    // Wed Aug 26 2026, 22:00 local time.
    const wedNight = new Date(2026, 7, 26, 22, 0, 0);
    expect(startOfWeek(wedNight)).toBe('2026-08-24'); // that Monday
    expect(weekdayLabel(startOfWeek(wedNight))).toBe('Monday');
  });

  it('startOfWeek rolls Sunday back to the prior Monday', () => {
    const sunday = new Date(2026, 7, 30, 15, 0, 0); // Sun Aug 30 2026
    expect(startOfWeek(sunday)).toBe('2026-08-24');
  });

  it('startOfWeek on a Monday returns itself', () => {
    const monday = new Date(2026, 7, 24, 9, 0, 0);
    expect(startOfWeek(monday)).toBe('2026-08-24');
  });

  it('addDays crosses month and year boundaries correctly', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('startOfWeek is stable across a full evening window (no nightly rollover)', () => {
    // The bug this pins: same local evening, UTC date already rolled.
    for (const hour of [12, 18, 20, 23]) {
      const moment = new Date(2026, 7, 26, hour, 0, 0); // Wednesday
      expect(startOfWeek(moment)).toBe('2026-08-24');
    }
  });
});
