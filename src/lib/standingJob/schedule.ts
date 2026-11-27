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

const pad = (n: number) => String(n).padStart(2, '0');

/** The instant London shows `day` at `hour`:`minute`, or undefined if that wall time does not occur. */
export function londonClockOn(day: string, hour: number, minute: number): number | undefined {
  const want = `${pad(hour)}:${pad(minute)}`;
  const guess = Date.parse(`${day}T${want}:00Z`);
  if (!Number.isFinite(guess)) return undefined;
  for (let t = guess - 3 * 3600_000; t <= guess + 3 * 3600_000; t += 60_000) {
    if (londonDay(t) !== day) continue;
    const clock = new Intl.DateTimeFormat('en-GB', { timeZone: LONDON, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(t));
    if (clock === want) return t;
  }
  return undefined;
}

export function saysLondon(t: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: LONDON, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(t));
}

/** Next fire time in Europe/London, or undefined when none falls in the next eight days. */
export function nextRunAt(
  schedule: StandingSchedule,
  weekday = 1,
  hour = 7,
  minute = 0,
  lastPeriod?: string,
  t = Date.now(),
): number | undefined {
  for (let d = 0; d <= 8; d++) {
    const day = londonDay(t + d * 86400_000);
    const at = londonClockOn(day, hour, minute);
    if (at == null || at < t) continue;
    if (scheduleDue(schedule, lastPeriod, weekday, at, hour, minute)) return at;
  }
  return undefined;
}