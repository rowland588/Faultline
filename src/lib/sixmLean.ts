/* THE 6M REPORT AS A LEAN PAGE (docs/LEAN-PAGE.md, slice 4) — the tiles and
 * the closing line its full report and its one page print, read from the
 * report's own model (lib/sixmReportPdf sixmReport), so the paper's band,
 * its tiles and its sections say one thing. Nothing is worked out here.
 *
 * The tiles follow the method's journey (docs/SIXM.md): the gap (each line
 * against its target), the problems being worked (and any slipped back),
 * the roots found on the fishbone, the countermeasures on the board (and
 * the late), and the gains kept by a check (and any check missed). No money
 * yet: what a countermeasure is worth, before → after in money, is the next
 * piece (docs/BLUEPRINT.md §6, Money in every tool) — not a figure invented
 * here. */
import type { LeanTile, LeanTone } from './lean';
import type { SixMReport } from './sixmReportPdf';

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);
const and = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0] ?? '');
const WORKED = new Set(['finding', 'acting', 'proving']);
/** How far short, as the gap says it ("8 ppm short of target") — the amount alone. */
const by = (short: string) => short.replace(/\s*short\b.*$/, '');

export interface SixMFigures {
  measured: number; short: number; oneLine?: { line: string; short?: string };
  open: number; finding: number; acting: number; proving: number; slipped: number;
  causes: number; roots: number; suspected: number;
  actionsOpen: number; actionsLate: number; actionsDone: number;
  held: number; missed: number;
  /** Everything owed and past its day (lib/portfolio pacedOwed — the one late every place says), and of what. */
  owedLate: number; owedLateSaid: string; owedOpen: number;
}

/** The report's counts, as its sections say them. */
export function sixmFigures(r: SixMReport): SixMFigures {
  const open = r.problems.filter(p => !p.closed && WORKED.has(p.phase));
  const causes = r.problems.flatMap(p => p.bones.flatMap(b => b.causes));
  const rows = r.board.flatMap(b => b.rows);
  const held = r.problems.filter(p => !!p.hold);
  return {
    measured: r.gaps.length, short: r.gaps.filter(g => !!g.short).length,
    ...(r.gaps.length === 1 ? { oneLine: { line: r.gaps[0].line, ...(r.gaps[0].short ? { short: r.gaps[0].short } : {}) } } : {}),
    open: open.length, finding: open.filter(p => p.phase === 'finding').length, acting: open.filter(p => p.phase === 'acting').length,
    proving: open.filter(p => p.phase === 'proving').length, slipped: r.problems.filter(p => p.phase === 'slipped').length,
    causes: causes.length, roots: causes.filter(c => c.root && c.status === 'confirmed').length, suspected: causes.filter(c => c.status === 'suspected').length,
    actionsOpen: rows.filter(x => x.tone !== 'done').length, actionsLate: rows.filter(x => x.tone === 'late').length, actionsDone: rows.filter(x => x.tone === 'done').length,
    held: held.length, missed: held.filter(p => p.hold?.tone === 'late').length,
    owedLate: r.owed.late, owedLateSaid: r.owed.lateSaid, owedOpen: r.owed.open,
  };
}

export function sixmTiles(x: SixMFigures): LeanTile[] {
  const gap: LeanTile = !x.measured
    ? { k: 'The gap', v: '—', of: 'no line measured against a target yet' }
    : x.oneLine
      ? (x.oneLine.short
        ? { k: 'The gap', v: by(x.oneLine.short), of: `short — ${x.oneLine.line} against its target`, tone: 'r' }
        : { k: 'The gap', v: 'At target', of: `${x.oneLine.line} against its target`, tone: 'g' })
      : x.short
        ? { k: 'The gap', v: `${x.short} of ${x.measured}`, of: 'lines short of their target', tone: 'r' }
        : { k: 'The gap', v: 'At target', of: `all ${x.measured} lines`, tone: 'g' };
  const phases = [x.finding ? `${x.finding} finding the cause` : '', x.acting ? `${x.acting} acting on it` : '', x.proving ? `${x.proving} checking it worked` : ''].filter(Boolean);
  return [
    gap,
    { k: 'Problems', v: String(x.open), of: x.slipped ? `${x.slipped} slipped back${phases.length ? ` · ${phases.join(' · ')}` : ''}` : phases.length ? phases.join(' · ') : 'none being worked',
      ...(x.slipped ? { tone: 'r' as LeanTone } : {}) },
    { k: 'Roots found', v: String(x.roots), of: x.causes ? `of ${x.causes} ${plural(x.causes, 'cause')} on the fishbone${x.suspected ? ` · ${x.suspected} suspected` : ''}` : 'no cause on the fishbone yet', tone: 'n' },
    { k: 'Countermeasures', v: String(x.actionsOpen), of: x.actionsLate ? `open · ${x.actionsLate} late · ${x.actionsDone} done` : x.actionsOpen ? `open · none late · ${x.actionsDone} done` : x.actionsDone ? `none open · ${x.actionsDone} done` : 'none on the board yet',
      ...(x.actionsLate ? { tone: 'r' as LeanTone } : {}) },
    { k: 'Holding', v: String(x.held), of: x.missed ? `kept by a check · ${x.missed} ${plural(x.missed, 'check')} missed` : x.held ? 'gains kept by a check' : 'no gain to keep yet',
      ...(x.missed ? { tone: 'r' as LeanTone } : x.held ? { tone: 'g' as LeanTone } : {}) },
  ];
}

/** The closing line: where the lines are against their target, and what is
 *  wrong with the work on them — what one side can say to the other. */
export function sixmClosing(x: SixMFigures): { text: string; tone: LeanTone } {
  const where = !x.measured ? 'No line is measured against a target yet'
    : x.oneLine ? (x.oneLine.short ? `${x.oneLine.line} is ${by(x.oneLine.short)} short of its target` : `${x.oneLine.line} is at its target`)
      : x.short ? `${x.short} of ${x.measured} lines are short of their target` : `All ${x.measured} lines are at their target`;
  /* the late is everything owed past its day — the number the control room, Needs you and Actions say
     (docs/STEADY.md S1); of what, when it is not countermeasures alone */
  const lateSaid = !x.owedLate ? ''
    : x.owedLate === x.actionsLate ? `${x.owedLate} ${plural(x.owedLate, 'countermeasure')} late`
      : x.owedLate === x.missed ? `${x.missed} ${plural(x.missed, 'check')} missed`
        : `${x.owedLate} late — ${x.owedLateSaid}`;
  const wrong = [x.slipped ? `${x.slipped} ${plural(x.slipped, 'problem')} slipped back` : '', lateSaid, x.missed && !/check/.test(lateSaid) ? `${x.missed} ${plural(x.missed, 'check')} missed` : ''].filter(Boolean);
  const work = x.open ? `${x.open} ${plural(x.open, 'problem')} being worked` : 'no problem being worked';
  return {
    text: `${where}; ${work}${wrong.length ? ` — ${and(wrong)}` : ''}.`,
    tone: x.short || wrong.length ? 'r' : x.measured ? 'g' : 'n',
  };
}
