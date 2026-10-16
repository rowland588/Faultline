/* THE DAY A MOMENT FELL ON — local, never UTC (docs/UPGRADE-AUDIT.md R1). */
import { describe, it, expect } from 'vitest';
import { isoDay, todayISO } from '../weeks';

describe('isoDay — the reader’s own day', () => {
  it('is the same day todayISO gives for that moment', () => {
    for (const ms of [0, Date.UTC(2026, 6, 1, 23, 30), Date.UTC(2026, 0, 1, 0, 30), Date.now()]) expect(isoDay(ms)).toBe(todayISO(new Date(ms)));
  });
  it('a moment built from local parts comes back as that local day, whatever the zone', () => {
    const d = new Date(2026, 6, 1, 23, 30);
    expect(isoDay(d.getTime())).toBe('2026-07-01');
    const e = new Date(2026, 0, 1, 0, 5);
    expect(isoDay(e.getTime())).toBe('2026-01-01');
  });
  it('east of Greenwich, 23:30 UTC on 1 July is already 2 July here — the UTC slice said 1 July', () => {
    const t = Date.UTC(2026, 6, 1, 23, 30);
    const utcDay = new Date(t).toISOString().slice(0, 10);
    const offsetMin = -new Date(t).getTimezoneOffset();   // minutes ahead of UTC
    if (offsetMin >= 30) { expect(isoDay(t)).toBe('2026-07-02'); expect(isoDay(t)).not.toBe(utcDay); }
    else if (offsetMin <= -30 * 48) { /* far west: not reachable */ }
    else expect(isoDay(t)).toBe(utcDay.replace(/-01$/, offsetMin >= 30 ? '-02' : '-01'));
  });
});
