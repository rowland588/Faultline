/* BUSINESS-WIDE FIGURES — the same sums worked out in the database and on the device (11 November, docs/ORGANISATION.md O4b;
 * supabase/BUSINESS_SUMMARIES.sql; docs/LUNA-PLATFORM.md § "Business-wide reads run on the device").
 *
 * Rowland, 11 November: "Luna must be useful both to someone standing beside a production machine and someone sitting in the
 * boardroom … an authorised senior manager should be able to ask meaningful questions across departments and production lines."
 *
 * Three question families, each a row shape shared by the database's function and the device's own sum, so a figure Luna quotes is
 * the same whichever worked it out:
 *   losses    the stops timed on each line in a period — how many, the minutes, the crew's idle labour for them where the line has a
 *             crew and a wage (lib/cost labourPerHour; never a figure where an input is missing)        luna_losses_by_line
 *   problems  the open problems by site, area and priority — how many, past their day, the minutes a day typed  luna_problems_by_area
 *   late      what is owed past its day, by whom (a problem's owner and due day)                            luna_actions_late
 *   output    output against target by line and day — only where production records are imported         luna_output_by_line
 * Pure: no database, no screen. The sentence says each figure's source and period. */
import type { Observation, Workspace } from '../types';
import { fmtGBP } from '../lib/cost';

export interface LossRow { workspaceId: string; line: string; site?: string; area?: string; stops: number; timed: number; minutes: number; labour?: number }
export interface ProblemAreaRow { site?: string; area?: string; priority: string; open: number; late: number; minutesPerDay: number; withMinutes: number; lines: number }
export interface LateRow { who: string; late: number; oldestDue?: number; lines: number }
export interface OutputRow { workspaceId: string; line: string; day: string; output?: number; target?: number; good?: number; records: number }

export interface Period { from: number; to: number; says: string }
export type PeriodKey = 'today' | 'week' | 'last_week' | 'month' | 'four_weeks';
export const PERIODS: readonly PeriodKey[] = ['today', 'week', 'last_week', 'month', 'four_weeks'];

const DAY = 86_400_000;
const startOfDay = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
/** Monday 00:00 of the week `t` falls in, on the device's clock. */
export function weekStart(t: number): number { const d = new Date(startOfDay(t)); const back = (d.getDay() + 6) % 7; d.setDate(d.getDate() - back); return d.getTime(); }
const dayWords = (t: number) => new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

/** A period in words and in milliseconds, to `now` (or its end). */
export function periodOf(key: PeriodKey, now: number): Period {
  if (key === 'today') { const from = startOfDay(now); return { from, to: now + 1, says: `today (${dayWords(now)})` }; }
  if (key === 'last_week') { const to = weekStart(now), from = to - 7 * DAY; return { from, to, says: `last week (${dayWords(from)} – ${dayWords(to - 1)})` }; }
  if (key === 'month') { const d = new Date(startOfDay(now)); d.setDate(1); const from = d.getTime(); return { from, to: now + 1, says: `this month (since ${dayWords(from)})` }; }
  if (key === 'four_weeks') { const from = startOfDay(now) - 27 * DAY; return { from, to: now + 1, says: `the last four weeks (${dayWords(from)} – ${dayWords(now)})` }; }
  const from = weekStart(now); return { from, to: now + 1, says: `this week (${dayWords(from)} – ${dayWords(now)})` };
}

const word = (s?: string) => { const t = s?.trim(); return t ? t : undefined; };
const timedMs = (o: Pick<Observation, 'timing' | 'durationMs'>) => (o.timing !== 'instant' && o.durationMs > 0 ? o.durationMs : 0);
const round2 = (n: number) => Math.round(n * 100) / 100;
/** The crew's idle labour an hour — lib/cost labourPerHour's rule, here so the database's sum is matched to the penny. */
const labourHour = (w: Pick<Workspace, 'crew' | 'labourRatePerHour' | 'labourBurden'>): number | undefined =>
  (w.crew ?? 0) > 0 && (w.labourRatePerHour ?? 0) > 0 ? (w.crew as number) * (w.labourRatePerHour as number) * ((w.labourBurden ?? 0) > 0 ? (w.labourBurden as number) : 1) : undefined;

/** THE DEVICE'S OWN SUM of luna_losses_by_line — the lines given (already the ones the person may see), the stops in [from, to). */
export function lossesOnDevice(lines: readonly Workspace[], obs: readonly Observation[], from: number, to: number): LossRow[] {
  return lines.filter(w => !w.archived).map(w => {
    const mine = obs.filter(o => o.workspaceId === w.id && !o.deletedAt && o.startedAt >= from && o.startedAt < to);
    const ms = mine.reduce((n, o) => n + timedMs(o), 0);
    const rate = labourHour(w);
    return {
      workspaceId: w.id, line: w.name, ...(word(w.siteName) ? { site: word(w.siteName) } : {}), ...(word(w.areaName) ? { area: word(w.areaName) } : {}),
      stops: mine.length, timed: mine.filter(o => timedMs(o) > 0).length, minutes: round2(ms / 60_000),
      ...(rate !== undefined ? { labour: round2((ms / 3_600_000) * rate) } : {}),
    };
  }).sort((a, b) => b.minutes - a.minutes || a.line.localeCompare(b.line));
}

export interface DeviceProblem { workspaceId: string; status: string; priority?: string; owner?: string; dueAt?: number; minutesPerDay?: number; deletedAt?: number; archivedAt?: number }
const openP = (s: DeviceProblem) => !s.deletedAt && !s.archivedAt && s.status !== 'closed';

/** THE DEVICE'S OWN SUM of luna_problems_by_area. */
export function problemsOnDevice(lines: readonly Workspace[], snags: readonly DeviceProblem[], now: number): ProblemAreaRow[] {
  const on = new Map(lines.filter(w => !w.archived).map(w => [w.id, w]));
  const by = new Map<string, ProblemAreaRow & { ids: Set<string> }>();
  for (const s of snags) {
    const w = on.get(s.workspaceId);
    if (!w || !openP(s)) continue;
    const site = word(w.siteName), area = word(w.areaName), priority = s.priority ?? 'none';
    const k = `${site ?? ''}|${area ?? ''}|${priority}`;
    const g = by.get(k) ?? { ...(site ? { site } : {}), ...(area ? { area } : {}), priority, open: 0, late: 0, minutesPerDay: 0, withMinutes: 0, lines: 0, ids: new Set<string>() };
    g.open++; if (s.dueAt != null && s.dueAt < now) g.late++;
    if (s.minutesPerDay != null) { g.minutesPerDay += s.minutesPerDay; g.withMinutes++; }
    g.ids.add(s.workspaceId); g.lines = g.ids.size;
    by.set(k, g);
  }
  return [...by.values()].map(({ ids: _ids, ...r }) => r)
    .sort((a, b) => (a.site ?? '￿').localeCompare(b.site ?? '￿') || (a.area ?? '￿').localeCompare(b.area ?? '￿') || a.priority.localeCompare(b.priority));
}

/** THE DEVICE'S OWN SUM of luna_actions_late — a problem's owner and its day gone. */
export function lateOnDevice(lines: readonly Workspace[], snags: readonly DeviceProblem[], now: number): LateRow[] {
  const on = new Set(lines.filter(w => !w.archived).map(w => w.id));
  const by = new Map<string, LateRow & { ids: Set<string> }>();
  for (const s of snags) {
    if (!on.has(s.workspaceId) || !openP(s) || s.dueAt == null || s.dueAt >= now) continue;
    const who = word(s.owner) ?? '(nobody yet)';
    const g = by.get(who) ?? { who, late: 0, lines: 0, ids: new Set<string>() };
    g.late++; g.oldestDue = g.oldestDue === undefined ? s.dueAt : Math.min(g.oldestDue, s.dueAt);
    g.ids.add(s.workspaceId); g.lines = g.ids.size; by.set(who, g);
  }
  return [...by.values()].map(({ ids: _ids, ...r }) => r).sort((a, b) => b.late - a.late || (a.oldestDue ?? 0) - (b.oldestDue ?? 0));
}

/* ------------------------------------------------------------------ the database's rows, as the app reads them */
const num = (v: unknown): number | undefined => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? undefined : Number(v));
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
export const lossFromRow = (r: Record<string, unknown>): LossRow => ({
  workspaceId: String(r.workspace_id), line: String(r.line ?? ''), ...(str(r.site) ? { site: str(r.site) } : {}), ...(str(r.area) ? { area: str(r.area) } : {}),
  stops: num(r.stops) ?? 0, timed: num(r.timed) ?? 0, minutes: num(r.minutes) ?? 0, ...(num(r.labour) !== undefined ? { labour: num(r.labour) } : {}),
});
export const problemFromRow = (r: Record<string, unknown>): ProblemAreaRow => ({
  ...(str(r.site) ? { site: str(r.site) } : {}), ...(str(r.area) ? { area: str(r.area) } : {}), priority: String(r.priority ?? 'none'),
  open: num(r.open) ?? 0, late: num(r.late) ?? 0, minutesPerDay: num(r.minutes_per_day) ?? 0, withMinutes: num(r.with_minutes) ?? 0, lines: num(r.lines) ?? 0,
});
export const lateFromRow = (r: Record<string, unknown>): LateRow => ({ who: String(r.who ?? '(nobody yet)'), late: num(r.late) ?? 0, ...(num(r.oldest_due) !== undefined ? { oldestDue: num(r.oldest_due) } : {}), lines: num(r.lines) ?? 0 });
export const outputFromRow = (r: Record<string, unknown>): OutputRow => ({
  workspaceId: String(r.workspace_id), line: String(r.line ?? ''), day: String(r.day ?? ''),
  ...(num(r.output) !== undefined ? { output: num(r.output) } : {}), ...(num(r.target) !== undefined ? { target: num(r.target) } : {}), ...(num(r.good) !== undefined ? { good: num(r.good) } : {}),
  records: num(r.records) ?? 0,
});

/* ------------------------------------------------------------------ in words */
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;
const mins = (n: number) => `${n >= 100 ? Math.round(n).toLocaleString('en-GB') : round2(n)} min`;
const place = (r: { site?: string; area?: string }) => [r.site, r.area].filter(Boolean).join(' › ') || 'no area said';

/** One line's loss: "3 stops · 42 min · £120 of idle labour" — the money only where the line has a crew and a wage, else said. */
export function lossSays(r: Pick<LossRow, 'stops' | 'timed' | 'minutes' | 'labour'>): string {
  if (!r.stops) return 'no stop recorded';
  const counted = r.stops - r.timed;
  return [plural(r.stops, 'stop'), r.timed ? mins(r.minutes) : 'none timed', counted && r.timed ? `${counted} counted only` : '',
    r.timed ? (r.labour !== undefined ? `${fmtGBP(r.labour)} of idle labour` : 'no crew and wage on the line to price it') : ''].filter(Boolean).join(' · ');
}

export type FigureSource = 'database' | 'device';
export const SOURCE_SAYS: Record<FigureSource, string> = {
  database: 'Worked out in the database over every line you may read (your access decides which)',
  device: 'Worked out on this device from the records it holds',
};

export interface Summary { losses?: LossRow[]; problems?: ProblemAreaRow[]; late?: LateRow[]; output?: OutputRow[]; outputMissing?: string }

/** THE SENTENCE Luna says — each part names its period (losses, output) or "now" (problems, late), and where it was worked out. */
export function summarySays(s: Summary, source: FigureSource, period: Period, scope: string, now: number): string {
  const parts: string[] = [`${SOURCE_SAYS[source]} — ${scope}.`];
  if (s.losses) {
    const live = s.losses.filter(r => r.stops);
    const total = live.reduce((n, r) => n + r.minutes, 0), priced = live.filter(r => r.timed && r.labour !== undefined), money = priced.reduce((n, r) => n + (r.labour ?? 0), 0);
    parts.push(live.length
      ? `Stops ${period.says}: ${mins(round2(total))} over ${plural(live.length, 'line')}${priced.length ? `, ${fmtGBP(money)} of idle labour on the ${plural(priced.length, 'line')} with a crew and wage` : ''} — ${live.slice(0, 8).map(r => `${r.line} (${place(r)}) ${lossSays(r)}`).join('; ')}${live.length > 8 ? `; and ${live.length - 8} more` : ''}.`
      : `Stops ${period.says}: none recorded on ${plural(s.losses.length, 'line')}.`);
  }
  if (s.problems) {
    const open = s.problems.reduce((n, r) => n + r.open, 0), late = s.problems.reduce((n, r) => n + r.late, 0);
    const areas = new Map<string, { open: number; critical: number; late: number; minutes: number }>();
    for (const r of s.problems) {
      const k = place(r); const a = areas.get(k) ?? { open: 0, critical: 0, late: 0, minutes: 0 };
      a.open += r.open; a.late += r.late; a.minutes += r.minutesPerDay; if (r.priority === 'critical') a.critical += r.open; areas.set(k, a);
    }
    parts.push(open
      ? `Open problems now: ${open}${late ? `, ${late} past their day` : ''} — ${[...areas.entries()].map(([k, a]) => `${k} ${a.open}${a.critical ? ` (${a.critical} critical)` : ''}${a.late ? `, ${a.late} late` : ''}${a.minutes ? `, ${mins(a.minutes)} a day typed on them` : ''}`).join('; ')}.`
      : 'Open problems now: none.');
  }
  if (s.late) {
    const total = s.late.reduce((n, r) => n + r.late, 0);
    parts.push(total
      ? `Owed past its day now (${new Date(now).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}): ${s.late.slice(0, 10).map(r => `${r.who} ${r.late}${r.oldestDue !== undefined ? ` (oldest due ${dayWords(r.oldestDue)})` : ''}`).join('; ')}.`
      : 'Owed past its day now: nothing.');
  }
  if (s.output) {
    parts.push(s.output.length
      ? `Output against target ${period.says}, as imported: ${s.output.slice(0, 10).map(r => `${r.line} ${r.day} ${r.output ?? 'not recorded'}${r.target !== undefined ? ` of ${r.target}` : ''}`).join('; ')}.`
      : `Output against target ${period.says}: no production record imported for these lines.`);
  } else if (s.outputMissing) parts.push(s.outputMissing);
  return parts.join(' ');
}
