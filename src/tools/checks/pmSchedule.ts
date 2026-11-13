/* THE MAINTENANCE SCHEDULE (13 November — Rowland: "make it a report, based on what a PM should look like. I give the report to the
 * business"; docs/ASSET-DOCUMENTS.md). A Planned maintenance list read as the document a business is handed: every task under its
 * interval, shortest first, each with the manual's own words for the interval and the page it was read from. Pure — the page's
 * Report ▾ and the paper (pmSchedulePaper) read this and nothing else. It states what the list holds: a task's hours and who does it
 * are printed only where somebody typed them, and nothing is supplied that the list does not carry. */
import type { LogCheck, LogFreq, ToolStudy } from '../../lib/study';
import { freqWords } from './checks';

export interface PmRow { n: number; task: string; where: string; says: string; page: string; who: string; hours: string }
export interface PmGroup { heading: string; rows: PmRow[] }
export interface PmSchedule {
  title: string; machine: string; line: string; customer: string;
  /** "13 tasks: 3 every day · 3 every week …" */
  sentence: string;
  counts: { heading: string; n: number }[];
  groups: PmGroup[];
  /** The documents the tasks were read from, with how many tasks each gave. */
  sources: string[];
  showWho: boolean; showHours: boolean; showPage: boolean; showWhere: boolean;
  notes: string[];
}

const MIN: Record<string, number> = { min: 1, hour: 60, shift: 480, day: 1440, week: 10080 };
/** An interval's length for ordering only — clock intervals first by length, then the ones that are an event. */
const orderOf = (f: LogFreq): number => ('when' in f ? Number.MAX_SAFE_INTEGER : f.every * MIN[f.unit]);
const keyOf = (f: LogFreq): string => ('when' in f ? `when:${f.when}:${f.note ?? ''}` : `${f.every}${f.unit}`);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** An interval as a business reads it: the list keeps a month as 30 days and a year as 365, and the heading says month and year. */
const CALENDAR: Record<number, string> = { 30: 'every month', 91: 'every 3 months', 182: 'every 6 months', 365: 'every year', 730: 'every 2 years' };
const plainFreq = (f: LogFreq): string => (!('when' in f) && f.unit === 'day' && CALENDAR[f.every]) || freqWords(f);

/** A group's heading: the manual's own words where every task under it says the same ("Every 500 operating hours"), else the interval. */
function headingOf(checks: readonly LogCheck[]): string {
  const said = new Set(checks.map(c => c.src?.oem.trim().toLowerCase() ?? ''));
  const one = said.size === 1 ? checks[0].src?.oem.trim() : undefined;
  return cap(one || plainFreq(checks[0].when));
}

export function pmSchedule(s: ToolStudy, where: { line?: string; customer?: string }): PmSchedule {
  const checks = (s.agreed?.log?.checks ?? []).filter(c => !c.removed);
  const by = new Map<string, LogCheck[]>();
  for (const c of checks) by.set(keyOf(c.when), [...(by.get(keyOf(c.when)) ?? []), c]);
  const ordered = [...by.values()].sort((a, b) => orderOf(a[0].when) - orderOf(b[0].when));
  const machine = s.machine ?? '';
  const showWhere = checks.some(c => !!c.where && c.where !== machine);
  let n = 0;
  const groups: PmGroup[] = ordered.map(g => ({
    heading: headingOf(g),
    rows: g.map(c => ({
      n: ++n, task: c.name, where: c.where && c.where !== machine ? c.where : '',
      says: c.src?.oem ?? freqWords(c.when), page: c.src ? `p.${c.src.page}` : '', who: c.who ?? '',
      hours: c.stdHours !== undefined ? `${+c.stdHours.toFixed(2)} h` : '',
    })),
  }));
  const counts = groups.map(g => ({ heading: g.heading, n: g.rows.length }));
  const docs = new Map<string, number>();
  for (const c of checks) if (c.src) docs.set(c.src.doc, (docs.get(c.src.doc) ?? 0) + 1);
  const fromManual = [...docs.values()].reduce((a, b) => a + b, 0);
  const hourTasks = checks.some(c => !('when' in c.when) && c.when.unit === 'hour');
  const noHours = checks.filter(c => c.stdHours === undefined).length;
  const notes: string[] = [];
  if (fromManual) notes.push(`${fromManual === checks.length ? (checks.length === 1 ? 'The task is' : `All ${checks.length} tasks are`) : `${fromManual} of the ${checks.length} tasks are`} as the manufacturer’s manual states ${fromManual === 1 ? 'it' : 'them'}, each with the interval the manual gives and the page it is on. Nothing has been added to what the manual says.`);
  if (checks.length - fromManual > 0 && fromManual) notes.push(`${plural(checks.length - fromManual, 'task')} ${checks.length - fromManual === 1 ? 'was' : 'were'} written by hand on the list and ${checks.length - fromManual === 1 ? 'carries' : 'carry'} no page.`);
  if (hourTasks) notes.push('Where an interval is in operating hours it is the machine’s running hours that count. Read them from the machine’s hour counter; calendar time is not the same thing.');
  if (noHours === checks.length && checks.length) notes.push('How long each task takes is not stated — the manual gives no time for a task, and none has been estimated.');
  else if (noHours) notes.push(`${plural(noHours, 'task')} ${noHours === 1 ? 'has' : 'have'} no time stated.`);
  if (checks.some(c => c.src && /month|annual|year|quarter/i.test(c.src.oem))) notes.push('A month is counted as 30 days, a quarter as 91, six months as 182 and a year as 365 when the list works out what is due.');
  notes.push('Isolate and lock off the machine as its manual requires before any task. This schedule lists what is to be done and how often; how to do each task safely is in the manual at the page given.');
  return {
    title: s.name, machine, line: where.line ?? '', customer: where.customer ?? '',
    sentence: checks.length ? `${plural(checks.length, 'maintenance task')}${machine ? ` for ${machine}` : ''}: ${counts.map(c => `${c.n} ${c.heading.toLowerCase()}`).join(' · ')}.` : 'No task is on this list yet.',
    counts, groups, sources: [...docs.entries()].map(([d, k]) => `${d} — ${plural(k, 'task')}`),
    showWho: checks.some(c => !!c.who), showHours: checks.some(c => c.stdHours !== undefined), showPage: fromManual > 0, showWhere, notes,
  };
}
