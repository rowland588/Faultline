/* A LINE'S PRODUCTS, READY OR NOT (docs/BLUEPRINT.md §3, Stage 3 — "the line
 * is the hub"): one row a product, four questions the floor asks before it
 * runs one — is its program proved? is its line standard set (who stands
 * where)? is its capacity known (and does it meet its target)? is its
 * changeover timed? Gaps in amber, failures in red, done in green, a test
 * booked and still ahead in violet — always with the word.
 *
 * WHICH RECORD: none of its own. The products are what the line's programs
 * run and what its line standards are for (D2, lib/lineRecords
 * productsOnLine), and the changeovers timed into one; each answer is read
 * from the record that holds it — the program (lib/programs stateOf,
 * standingOf), the standard (lib/standard hasMap, headcount; lib/capacity
 * analyse), the SMED study (lib/ie/changeover figuresOf). WHERE IT SHOWS: the
 * line's page (its Products), the control room's card for the line (the
 * products with gaps, counted) and the line report. */
import type { Program } from './programs';
import { daysOverdue, isProved, standingOf, stateOf, todayISO } from './programs';
import { machineKey, productsOnLine } from './lineRecords';
import { hasMap, headcount, inCapacityTool, type Standard } from './standard';
import { analyse } from './capacity';
import type { ToolStudy } from './study';
import { figuresOf, mins } from './ie/changeover';
import { niceDay } from './weeks';

export type ReadyTone = 'g' | 'a' | 'r' | 'w' | 'n';
export type ReadyKey = 'program' | 'standard' | 'capacity' | 'changeover';
export const READY_ASKS: Record<ReadyKey, string> = {
  program: 'Program proved',
  standard: 'Line standard',
  capacity: 'Capacity',
  changeover: 'Changeover timed',
};
export const READY_KEYS: ReadyKey[] = ['program', 'standard', 'capacity', 'changeover'];

export interface ReadyCell { k: ReadyKey; word: string; tone: ReadyTone }
export interface ProductReady {
  name: string;
  cells: ReadyCell[];
  /** Answers still missing (amber) and failing (red). */
  gaps: number;
  fails: number;
  ready: boolean;
}
export interface LineProducts {
  rows: ProductReady[];
  ready: number;
  /** Products with a gap and none failing; products with a failure. */
  withGaps: number;
  failing: number;
}

const same = (a?: string, b?: string) => !!a && !!b && machineKey(a) === machineKey(b);
const changeoverInto = (s: ToolStudy): string | undefined => (s.facts.toProduct ?? s.product)?.trim() || undefined;

function programCell(name: string, programs: readonly Program[], today: string): ReadyCell {
  const mine = programs.filter(p => !p.deletedAt && same(p.runs, name));
  if (!mine.length) return { k: 'program', word: 'no program', tone: 'a' };
  const proved = mine.filter(isProved);
  if (proved.length === mine.length) {
    const last = proved.map(p => p.provedOn ?? '').sort().pop();
    return { k: 'program', word: last ? `proved ${niceDay(last)}` : 'proved', tone: 'g' };
  }
  const late = mine.filter(p => standingOf(p, today) === 'overdue').sort((a, b) => (daysOverdue(b, today) ?? 0) - (daysOverdue(a, today) ?? 0))[0];
  if (late?.testOn) return { k: 'program', word: `test was ${niceDay(late.testOn)}`, tone: 'r' };
  const of = mine.length > 1 ? ` · ${proved.length} of ${mine.length} proved` : '';
  const booked = mine.filter(p => standingOf(p, today) === 'booked').sort((a, b) => (a.testOn ?? '').localeCompare(b.testOn ?? ''))[0];
  if (booked?.testOn) return { k: 'program', word: `test ${niceDay(booked.testOn)}${of}`, tone: 'w' };
  return { k: 'program', word: `${mine.some(p => stateOf(p) === 'needed') ? 'not written' : 'no test day'}${of}`, tone: 'a' };
}

function standardCell(name: string, standards: readonly Standard[]): ReadyCell {
  const s = standards.find(x => !x.deletedAt && same(x.product, name) && hasMap(x));
  if (!s) return { k: 'standard', word: 'not set', tone: 'a' };
  const n = headcount(s);
  return { k: 'standard', word: n ? `set · ${n} ${n === 1 ? 'person' : 'people'}` : 'set', tone: 'g' };
}

function capacityCell(name: string, standards: readonly Standard[]): ReadyCell {
  const s = standards.find(x => !x.deletedAt && same(x.product, name) && inCapacityTool(x));
  if (!s?.capacity) return { k: 'capacity', word: 'not known', tone: 'a' };
  const r = analyse(s.capacity);
  if (r.line == null) return { k: 'capacity', word: 'speeds to fill in', tone: 'a' };
  const n = (v: number) => (v >= 100 ? Math.round(v).toLocaleString('en-GB') : `${+v.toFixed(1)}`);
  if (r.gap != null && r.gap > 0 && r.target != null) return { k: 'capacity', word: `${n(r.line)} a min — ${n(r.gap)} short of ${n(r.target)}`, tone: 'r' };
  return { k: 'capacity', word: `${n(r.line)} ${r.unit} a min${r.target != null ? ' — target met' : ''}`, tone: 'g' };
}

function changeoverCell(name: string, studies: readonly ToolStudy[]): ReadyCell {
  const mine = studies.filter(s => !s.deletedAt && s.tool === 'changeover' && same(changeoverInto(s), name)).sort((a, b) => b.startedAt - a.startedAt);
  if (!mine.length) return { k: 'changeover', word: 'not timed', tone: 'a' };
  const f = figuresOf(mine[0].facts);
  if (!f.enough) return { k: 'changeover', word: 'started, not timed', tone: 'a' };
  return { k: 'changeover', word: `${mins(f.nowSec)} into it`, tone: 'g' };
}

/** The line's products, each with its four answers, in the order first met:
 *  what its programs run, what its standards are for, what a changeover was
 *  timed into. `programs`, `standards` and `studies` are the line's own. */
export function lineProducts(i: { programs: readonly Program[]; standards: readonly Standard[]; studies: readonly ToolStudy[]; today?: string }): LineProducts {
  const today = i.today ?? todayISO();
  const names = productsOnLine(i.programs.filter(p => !p.deletedAt), i.standards);
  for (const s of i.studies) {
    const into = s.tool === 'changeover' && !s.deletedAt ? changeoverInto(s) : undefined;
    if (into && !names.some(n => same(n, into))) names.push(into);
  }
  const rows = names.map(name => {
    const cells = [programCell(name, i.programs, today), standardCell(name, i.standards), capacityCell(name, i.standards), changeoverCell(name, i.studies)];
    const gaps = cells.filter(c => c.tone === 'a').length, fails = cells.filter(c => c.tone === 'r').length;
    return { name, cells, gaps, fails, ready: cells.every(c => c.tone === 'g') };
  });
  return {
    rows,
    ready: rows.filter(r => r.ready).length,
    withGaps: rows.filter(r => !r.fails && r.gaps).length,
    failing: rows.filter(r => r.fails).length,
  };
}

/** The products in words, as the line's page, its card and its paper say
 *  them: "3 products · 1 ready · 1 with gaps · 1 failing". */
export function productsSaid(p: LineProducts): { text: string; tone?: ReadyTone }[] {
  const n = p.rows.length;
  if (!n) return [{ text: 'No products yet' }];
  return [
    { text: `${n} product${n === 1 ? '' : 's'} · ${p.ready} ready` },
    ...(p.withGaps ? [{ text: ` · ${p.withGaps} with gaps`, tone: 'a' as ReadyTone }] : []),
    ...(p.failing ? [{ text: ` · ${p.failing} failing`, tone: 'r' as ReadyTone }] : []),
  ];
}

/** The first thing to do for the products, in a sentence — the worst row's
 *  worst answer: a failure before a gap, the program before the rest. */
export function productsNext(p: LineProducts): string | undefined {
  const row = p.rows.find(r => r.fails) ?? p.rows.find(r => r.gaps);
  if (!row) return undefined;
  const c = row.cells.find(x => x.tone === 'r') ?? row.cells.find(x => x.tone === 'a');
  if (!c) return undefined;
  const NOUN: Record<ReadyKey, string> = { program: 'program', standard: 'line standard', capacity: 'capacity', changeover: 'changeover' };
  /* "no program" says itself; "no test day" says whose; the rest take their noun */
  const phrase = c.word === 'no program' ? c.word : c.word.startsWith('no ') ? `${c.word} for its program` : `${NOUN[c.k]} ${c.word}`;
  return `${row.name} — ${phrase}`;
}
