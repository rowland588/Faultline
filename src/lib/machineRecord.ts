/* A MACHINE IS A PLACE (docs/FLOW.md item 2).
 *
 * Rowland, 10 October, on the flow audit: "Do all of them." On the floor the
 * unit is the machine — "what is left on the weigher?" — and its life was
 * spread over Install, Set up, Programs, Commission, Hand over, Fixes and the
 * plan, with its name doing something different on each. This is the
 * machine's own record read whole: where it stands, when it came, its gates
 * in order with every stage and test (state, day, who), and what is open on
 * it — the screen's version of the page the handover report prints for it.
 *
 * No new noun: it is the Asset, read off the lists that already name it.
 * Every word and colour is lib/install's, lib/fixTone's and lib/noted's, so
 * the panel and the gates cannot disagree. Pure. */
import { fixTone } from './fixTone';
import { GATE_TONE_WORD, JOURNEY, installOf, journeyOf, lateOrProblemSays, machineAt, stillOpenOn, type GateTone, type JourneyGate } from './install';
import { notedProblems } from './noted';
import { stateOf as programState, type Program } from './programs';
import {
  ASSET_STATE_WORD, assetStateOf, assetStateOn, isOverdue, isSettled, latestAttempts, live, needsVerdict, outcomeWord, plannedEnd, testOfFix,
  type Asset, type Test, type TestItem,
} from './testing';
import { niceDay } from './weeks';

/** done · didn't pass · late · a problem (no time lost) · waiting on a verdict
 *  · still ahead (a day booked) · not started (no day) — the app's five
 *  colours, said in words beside them (CLAUDE.md, visual management). */
export type MachineTone = 'done' | 'failed' | 'late' | 'problem' | 'asking' | 'ahead' | 'none';

export interface MachineLine {
  /** The record it is — opened in the drawer from the panel. */
  id: string;
  title: string;
  /** Its state and day in words: "done 7 Oct", "late — was 8 Oct", "12 Oct",
   *  "no day set", "didn't pass 3 Oct". */
  word: string;
  tone: MachineTone;
  who?: string;
}

export interface MachineGate {
  gate: JourneyGate;
  label: string;
  /** The gate's state for this machine (lib/install journeyOf). */
  tone: GateTone;
  /** "3 of 5 done · 1 late" — or the gate's word when nothing is kept. */
  says: string;
  lines: MachineLine[];
}

export interface MachineRecord {
  id: string;
  name: string;
  oem?: string;
  /** "at Set up", "due on site", "Handed over · 1 fix open" (machineAt). */
  at: string;
  /** "On site since 2 Oct", "Due on site 12 Oct", "Not here yet — no day". */
  arrival: string;
  arrivalLate: boolean;
  gates: MachineGate[];
  /** Its programs, in a line, when it has any: "5 programs · 4 on the machine
   *  · 1 not written yet". They are worked on the Programs page. */
  programs?: string;
  /** Its fixes still open, late first. */
  fixes: MachineLine[];
  fixesDone: number;
  /** Problems found on it with no fix booked, still open (lib/noted). */
  problems: (MachineLine & { critical?: boolean; risk?: boolean })[];
  /** Everything still open, counted — "1 install step not done · 2 tests not
   *  run · 1 fix open" (lib/install stillOpenOn). Empty when nothing is. */
  open: string[];
}

const day = (iso?: string) => (iso ? niceDay(iso) : '');

/** A stage at a gate, said as the gate's own grid says it. */
function stepLine(t: Test, items: TestItem[], today: string): MachineLine {
  const who = t.withWhom?.trim() || undefined;
  const base = { id: t.id, title: t.title, ...(who ? { who } : {}) };
  if (t.outcome === 'passed') return { ...base, word: `done ${day(t.ranTo ?? t.ranOn)}`.trim(), tone: 'done' };
  const which = lateOrProblemSays(t, items, today);
  const end = plannedEnd(t) ?? t.plannedFor;
  if (which?.which === 'late') return { ...base, word: `${which.words}${end && end < today ? ` — was ${day(end)}` : ''}`, tone: 'late' };
  if (which?.which === 'problem') return { ...base, word: which.words, tone: 'problem' };
  if (needsVerdict(t)) return { ...base, word: 'worked on — not called yet', tone: 'asking' };
  if (t.outcome === 'notRun') return { ...base, word: 'did not happen', tone: 'late' };
  if (isOverdue(t, today)) return { ...base, word: `late — was ${day(end)}`, tone: 'late' };
  return end ? { ...base, word: day(end), tone: 'ahead' } : { ...base, word: 'no day set', tone: 'none' };
}

/** A test as it stands now — its latest attempt (testing latestAttempts). */
function testLine(t: Test, today: string): MachineLine {
  const who = t.withWhom?.trim() || undefined;
  const base = { id: t.id, title: t.title, ...(who ? { who } : {}) };
  const ran = t.ranTo ?? t.ranOn;
  if (t.outcome === 'passed') return { ...base, word: `${outcomeWord(t).toLowerCase()} ${day(ran)}`.trim(), tone: 'done' };
  if (t.outcome === 'failed' || t.outcome === 'notRun') return { ...base, word: `${outcomeWord(t).toLowerCase()} ${day(ran)}`.trim(), tone: 'failed' };
  if (needsVerdict(t)) return { ...base, word: `${outcomeWord(t).toLowerCase()}`, tone: 'asking' };
  const end = plannedEnd(t) ?? t.plannedFor;
  if (isOverdue(t, today)) return { ...base, word: `late — was ${day(end)}`, tone: 'late' };
  return end ? { ...base, word: day(end), tone: 'ahead' } : { ...base, word: 'no day set', tone: 'none' };
}

const counted = (lines: MachineLine[], tone: GateTone): string => {
  if (!lines.length) return GATE_TONE_WORD[tone];
  const done = lines.filter(l => l.tone === 'done').length;
  const late = lines.filter(l => l.tone === 'late').length;
  const failed = lines.filter(l => l.tone === 'failed').length;
  const problem = lines.filter(l => l.tone === 'problem').length;
  return [`${done} of ${lines.length} done`, late ? `${late} late` : '', failed ? `${failed} didn’t pass` : '', problem ? `${problem} a problem` : '']
    .filter(Boolean).join(' · ');
};

export function machineRecord(asset: Asset, x: { tests: Test[]; items: TestItem[]; programs?: readonly Program[]; today: string }): MachineRecord {
  const { today } = x;
  const tests = live(x.tests), items = live(x.items), programs = (x.programs ?? []).filter(p => !p.deletedAt);
  const j = journeyOf(asset, tests, items, today, programs);
  const open = stillOpenOn(asset, tests, items, today, programs).counts;
  const at = machineAt(asset, j, j[j.length - 1]?.tone === 'done' ? open : []).says;

  const state = assetStateOf(asset);
  const on = assetStateOn(asset);
  const arrivalLate = state === 'awaited' && !!asset.dueOn && asset.dueOn < today;
  const arrival = state === 'awaited'
    ? (on ? `Due on site ${day(on)}${arrivalLate ? ' — late' : ''}` : 'Not here yet — no day set')
    : `${ASSET_STATE_WORD[state]}${on ? ` since ${day(on)}` : ''}`;

  const gates: MachineGate[] = JOURNEY.map((g, i) => {
    const lines = g.gate === 'commission'
      ? latestAttempts(tests).filter(t => t.assetId === asset.id && (t.kind ?? 'test') === 'test').sort((a, b) => a.sort - b.sort).map(t => testLine(t, today))
      : installOf(asset, tests, items, today, g.gate).steps.map(v => stepLine(v.step, items, today));
    const tone = j[i]?.tone ?? 'none';
    return { gate: g.gate, label: g.label, tone, says: counted(lines, tone), lines };
  });

  const mine = programs.filter(p => p.assetId === asset.id);
  const onIt = mine.filter(p => programState(p) !== 'needed').length;
  const progs = mine.length
    ? [`${mine.length} program${mine.length === 1 ? '' : 's'}`, onIt ? `${onIt} on the machine` : '', mine.length - onIt ? `${mine.length - onIt} not written yet` : ''].filter(Boolean).join(' · ')
    : undefined;

  const fixesAll = tests.filter(t => t.kind === 'fix' && (t.assetId ?? testOfFix(t, tests)?.assetId) === asset.id);
  const rank: Record<string, number> = { late: 0, notRun: 1, soon: 2, ahead: 3, done: 4 };
  const fixes = fixesAll.filter(t => !isSettled(t))
    .map(t => ({ t, f: fixTone(t, today) }))
    .sort((a, b) => rank[a.f.tone] - rank[b.f.tone] || (plannedEnd(a.t) ?? '￿').localeCompare(plannedEnd(b.t) ?? '￿'))
    .map(({ t, f }): MachineLine => ({
      id: t.id, title: t.title, word: f.when,
      tone: f.tone === 'late' ? 'late' : f.tone === 'soon' ? 'problem' : f.tone === 'notRun' ? 'none' : plannedEnd(t) ? 'ahead' : 'none',
      ...(t.withWhom?.trim() ? { who: t.withWhom.trim() } : {}),
    }));

  const problems = notedProblems(tests, items, [asset]).open
    .filter(n => n.on?.assetId === asset.id)
    .map(n => ({
      id: n.item.id, title: n.item.what, word: `${n.on?.title ?? ''} · ${day(n.day)}`.replace(/^ · /, ''),
      tone: (n.item.critical ? 'failed' : 'problem') as MachineTone,
      ...(n.item.critical ? { critical: true } : {}), ...(n.item.risk && !n.item.critical ? { risk: true } : {}),
    }));

  return {
    id: asset.id, name: asset.name, ...(asset.oem?.trim() ? { oem: asset.oem.trim() } : {}),
    at, arrival, arrivalLate, gates, ...(progs ? { programs: progs } : {}),
    fixes, fixesDone: fixesAll.length - fixes.length, problems, open,
  };
}
