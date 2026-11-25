const LONDON = "Europe/London";
const WD: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

export const londonDay = (t = Date.now()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: LONDON, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(t));

function londonParts(t = Date.now()) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23",
  });
  const p = Object.fromEntries(fmt.formatToParts(new Date(t)).filter((x) => x.type !== "literal").map((x) => [x.type, x.value]));
  return { h: Number(p.hour), min: Number(p.minute), wd: WD[p.weekday] ?? 1 };
}

export function periodKey(schedule: string, t = Date.now()): string {
  if (schedule === "daily" || schedule === "weekdays") return londonDay(t);
  const thursday = new Date(londonDay(t) + 'T12:00:00Z');
  thursday.setUTCDate(thursday.getUTCDate() + 3 - (thursday.getUTCDay() + 6) % 7);
  const year = thursday.getUTCFullYear();
  const week = 1 + Math.floor((thursday.getTime() - Date.UTC(year, 0, 1, 12)) / (7 * 86400000));
  return year + '-W' + String(week).padStart(2, '0');
}

export function due(job: { schedule: string; weekday: number; hour: number; minute: number; last_period_key: string | null }, t = Date.now()): boolean {
  const cur = periodKey(job.schedule, t);
  if (job.last_period_key === cur) return false;
  const p = londonParts(t);
  if (job.schedule === "weekly" && p.wd !== job.weekday) return false;
  if (job.schedule === "weekdays" && p.wd > 5) return false;
  if (p.h < job.hour || (p.h === job.hour && p.min < job.minute)) return false;
  return true;
}


/** Enabling or resuming after today's time starts with the next occurrence. */
export function activatedBeforeDue(job: Parameters<typeof due>[0], enabledAt: number | undefined, now: number) {
  if (!enabledAt || periodKey(job.schedule, enabledAt) !== periodKey(job.schedule, now)) return true;
  return !due({ ...job, last_period_key: null }, enabledAt);
}
