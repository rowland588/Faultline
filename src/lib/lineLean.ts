/* A LINE AS A LEAN PAGE (docs/LEAN-PAGE.md; docs/BLUEPRINT.md Stage 3 — the
 * line is the hub) — the tiles and the closing line the line's page
 * (screens/ProductionLineScreen) and the line report (lib/lineReportPdf) both
 * say, read from the line's own readings: its problems (lib/lineWork
 * lineProblems), its programs (lib/lineRecords lineKit), its stops timed the
 * last four weeks, and a day of it in
 * margin (lib/lineLoss lineDay — the one cost model Your factory's tile and
 * the stage gate's money read). Nothing is worked out here.
 *
 * Only the abnormal carries colour: the late and the critical red; the counts
 * of work stay neutral. A day of the line it cannot price says what to give,
 * never a blank. (Its products, ready or not, came off on 23 October — Rowland:
 * "You've invented products ... The program is the product".) */
import { fmtGBP } from './cost';
import type { LeanTile, LeanTone } from './lean';
import type { LineDay } from './lineLoss';

export interface LineReading {
  name: string;
  problems: { open: number; late: number; critical: number };
  programs: { n: number; proved: number; late: number;
    /** Programs typed only on a project's Commission (Programs loaded), on no list — said beside the count (23 October). */
    onStage?: number };
  stops: { n: number; minutes: number; worst?: string };
  day: Pick<LineDay, 'margin' | 'missing'>;
  jobs: number;
  /** The line's check logs (src/tools/checks/owed scopeCounts): how many, and the checks overdue, failed or due now. A tile only once there is a log. */
  checks?: { logs: number; overdue: number; failed: number; due: number };
}

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);
const and = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0] ?? '');

export function lineTiles(r: LineReading): LeanTile[] {
  const { problems: p, programs: g, stops: s } = r;
  const red = [p.late ? `${p.late} late` : '', p.critical ? `${p.critical} critical` : ''].filter(Boolean);
  const c = r.checks;
  const checkTile: LeanTile[] = c && c.logs ? [{
    k: 'Checks', v: c.overdue + c.failed ? String(c.overdue + c.failed) : '0',
    of: c.overdue + c.failed ? `${[c.overdue ? `${c.overdue} overdue` : '', c.failed ? `${c.failed} failed` : ''].filter(Boolean).join(' · ')}${c.due ? ` · ${c.due} due now` : ''}` : `${c.logs} check ${plural(c.logs, 'log')}, every check up to date${c.due ? ` · ${c.due} due now` : ''}`,
    ...(c.overdue + c.failed ? { tone: 'r' as LeanTone } : c.due ? { tone: 'a' as LeanTone } : {}),
  }] : [];
  return [
    { k: 'Problems open', v: String(p.open), of: p.open ? (red.length ? and(red) : 'none late') : 'nothing open on the line', ...(red.length ? { tone: 'r' as LeanTone } : {}) },
    g.n
      ? { k: 'Programs proved', v: `${g.proved}`, of: `of ${g.n}${g.late ? ` · ${g.late} past its test day` : ''}${g.onStage ? ` · ${g.onStage} more on a project’s Commission` : ''}`, ...(g.late ? { tone: 'r' as LeanTone } : {}) }
      : g.onStage
        ? { k: 'Programs proved', v: '—', of: `${g.onStage} on a project’s Commission, on no Programs list yet` }
        : { k: 'Programs proved', v: '—', of: 'no program planned on the line' },
    s.n
      ? { k: 'Stops timed', v: `${Math.round(s.minutes)} min`, of: `lost in ${s.n} ${plural(s.n, 'stop')}, the last four weeks${s.worst ? ` — the ${s.worst} most` : ''}` }
      : { k: 'Stops timed', v: '0', of: 'none the last four weeks' },
    r.day.margin != null
      ? { k: 'A day of the line', v: fmtGBP(r.day.margin), of: `of margin — its speed × its shifts × its margin a pack${r.jobs ? ` · ${r.jobs} ${plural(r.jobs, 'project')} on it` : ''}` }
      : { k: 'A day of the line', v: '—', of: `give ${and(r.day.missing ?? [])} on the Factory’s Lines page` },
    ...checkTile,
  ];
}

/** The closing line: what is open on it, its programs to prove, and what a
 *  day of it is worth. */
export function lineClosing(r: LineReading): { text: string; tone: LeanTone } {
  const { problems: p, programs: g } = r;
  const red = [p.late ? `${p.late} late` : '', p.critical ? `${p.critical} critical` : ''].filter(Boolean);
  const open = p.open ? `${p.open} ${plural(p.open, 'problem')} open${red.length ? ` — ${and(red)}` : ''}` : 'no problem open';
  const progs = g.n > g.proved ? `; ${g.n - g.proved} ${plural(g.n - g.proved, 'program')} to prove${g.late ? `, ${g.late} late` : ''}` : '';
  const worth = r.day.margin != null ? `; a day of it is worth ${fmtGBP(r.day.margin)} of margin` : '';
  const ck = r.checks && r.checks.overdue + r.checks.failed > 0 ? `; ${r.checks.overdue + r.checks.failed} ${plural(r.checks.overdue + r.checks.failed, 'check')} overdue or failed` : '';
  return {
    text: `${r.name}: ${open}${progs}${ck}${worth}.`,
    tone: p.late || p.critical || g.late || ck ? 'r' : p.open ? 'a' : 'g',
  };
}
