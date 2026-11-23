/* When a standing job is due — Europe/London calendar, pure (G7, docs/LUNA-AGENT.md). */
export type StandingSchedule = 'weekly' | 'daily';

const LONDON = 'Europe/London';

/** YYYY-MM-DD in London — matches SQL date checks for the scheduler stub. */
export function londonDay(t = Date.now()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: LONDON, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t));
}

/** ISO weekday 1=Mon … 7=Sun in London. */
export function londonWeekday(t = Date.now()): number {
  const wd = new Intl.DateTimeFormat('en-GB', { timeZone: LONDON, weekday: 'short' }).format(new Date(t));
  return ({ Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 } as Record<string, number>)[wd] ?? 1;
}

/** Period key: daily is the London day; weekly is year-Www (ISO week via Thursday rule). */
export function periodKey(schedule: StandingSchedule, t = Date.now()): string {
  if (schedule === 'daily') return londonDay(t);
  const d = new Date(new Date(t).toLocaleString('en-US', { timeZone: LONDON }));
  d.setHours(12, 0, 0, 0);
  const th = new Date(d);
  th.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 3);
  const y = th.getFullYear();
  const jan4 = new Date(y, 0, 4);
  const w = 1 + Math.round(((th.getTime() - jan4.getTime()) / 86_400_000 - ((jan4.getDay() + 6) % 7) + 3) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}

export function scheduleDue(schedule: StandingSchedule, lastPeriod: string | undefined, weekday = 1, t = Date.now()): boolean {
  const cur = periodKey(schedule, t);
  if (lastPeriod === cur) return false;
  if (schedule === 'weekly' && londonWeekday(t) !== weekday) return false;
  return true;
}