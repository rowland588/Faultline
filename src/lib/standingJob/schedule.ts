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
  const thursday = new Date(londonDay(t) + 'T12:00:00Z');
  thursday.setUTCDate(thursday.getUTCDate() + 3 - (thursday.getUTCDay() + 6) % 7);
  const year = thursday.getUTCFullYear();
  const week = 1 + Math.floor((thursday.getTime() - Date.UTC(year, 0, 1, 12)) / (7 * 86400000));
  return year + '-W' + String(week).padStart(2, '0');
}

export function scheduleDue(schedule: StandingSchedule, lastPeriod: string | undefined, weekday = 1, t = Date.now(), hour = 0, minute = 0): boolean {
  const cur = periodKey(schedule, t);
  if (lastPeriod === cur) return false;
  if (schedule === 'weekly' && londonWeekday(t) !== weekday) return false;
  const clock = new Intl.DateTimeFormat('en-GB', { timeZone: LONDON, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(t));
  return clock >= String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
}