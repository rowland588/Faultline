/* OPERATIONAL READINESS — FC-082 (knowledge/specs/FC-082-operational-readiness.md; knowledge/methods/commissioning/operational-readiness.md).
 *
 * A machine that passed its tests is not a line production can run: the people trained and signed off, the standards issued, the HACCP plan
 * amended and validated, the spares on the shelf, the PM schedule loaded, the cleaning validated. Operational readiness is the list of
 * everything that is not the machine, each item with an owner, a day and — when it is done — its evidence; the gate is every item done, not the
 * average. Counted by area and by owner, never only as a percentage: a percentage hides the one item that stops production.
 *
 *   ready / total, per area and overall      open items by owner; past their day (due before today)
 *   would stop day one = an open item marked so (a food-safety item is never "nice to have")
 *   a wish = an open item with no owner or no day;  a tick = a ready item with no evidence written
 *
 * Pure counts — no AI, nothing invented. Independent case: scripts/knowledge/cases-operations.py, the readiness block (a second implementation):
 * 72 items in six areas — 56 ready, 16 open, 3 past their day, two that stop day one. Held by __tests__/readiness.test.ts. */
import type { LeanTile, LeanTone } from '../../lib/lean';
import { fmtGBP } from '../../lib/cost';
import type { ScoredRow } from '../../lib/study';
import { niceDay, todayISO } from '../../lib/weeks';
import type { ScoredChecklist, ScoredMatrixOut, ScoredResult, ScoredTable } from '../scored/types';

export const CHECKLIST: ScoredChecklist = {
  noun: 'item',
  groupLabel: 'Area',
  states: [{ key: 'open', label: 'Not yet' }, { key: 'ready', label: 'Ready' }, { key: 'na', label: 'Not needed here' }],
  fields: ['evidence', 'owner', 'due', 'note', 'stopper'],
  labels: { evidence: 'What will prove it', note: 'Evidence — what was seen, the record’s number', stopper: 'Would stop day one' },
};

const list = (xs: string[]): string => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
export const NO_AREA = 'Other';
export const NO_OWNER = 'Nobody yet';

export interface ReadinessItem {
  id: string;
  name: string;
  area: string;
  state: 'open' | 'ready' | 'na';
  owner: string;
  due?: string;
  evidenceWanted: string;
  evidence: string;
  stopper: boolean;
  late: boolean;
}

export interface ReadinessArea { area: string; total: number; ready: number; na: number; open: number }
export interface ReadinessOwner { owner: string; open: ReadinessItem[]; late: number }

export interface ReadinessResult {
  items: ReadinessItem[];
  total: number;
  ready: number;
  na: number;
  open: number;
  late: ReadinessItem[];
  stoppers: ReadinessItem[];
  /** open items with no owner, or no day */
  wishes: { noOwner: number; noDay: number; either: number };
  /** ready items with nothing written as evidence */
  noEvidence: ReadinessItem[];
  areas: ReadinessArea[];
  owners: ReadinessOwner[];
}

export interface ReadinessIn { rows: ScoredRow[]; today?: string }

export function readiness(input: ReadinessIn): { ok: ReadinessResult } | { problems: string[] } {
  const today = input.today ?? todayISO();
  const named = input.rows.filter(r => r.name.trim());
  const problems: string[] = [];
  if (!named.length) problems.push('Add at least one item — what must be ready before production takes the line.');
  for (const r of named) {
    const st = r.status ?? 'open';
    if (st !== 'open' && st !== 'ready' && st !== 'na') problems.push(`“${r.name.trim()}”: its state must be Not yet, Ready or Not needed here.`);
    if (r.due && !ISO.test(r.due)) problems.push(`“${r.name.trim()}”: the day is not a date.`);
  }
  if (problems.length) return { problems };

  const items: ReadinessItem[] = named.map(r => {
    const state = (r.status ?? 'open') as ReadinessItem['state'];
    const due = r.due && ISO.test(r.due) ? r.due : undefined;
    return {
      id: r.id, name: r.name.trim(), area: (r.group ?? '').trim() || NO_AREA, state, owner: (r.owner ?? '').trim(), ...(due ? { due } : {}),
      evidenceWanted: (r.evidence ?? '').trim(), evidence: (r.note ?? '').trim(), stopper: !!r.stopper, late: state === 'open' && !!due && due < today,
    };
  });
  const open = items.filter(i => i.state === 'open');
  const areaOrder: string[] = [];
  for (const i of items) if (!areaOrder.includes(i.area)) areaOrder.push(i.area);
  const areas = areaOrder.map(a => {
    const mine = items.filter(i => i.area === a);
    return { area: a, total: mine.length, ready: mine.filter(i => i.state === 'ready').length, na: mine.filter(i => i.state === 'na').length, open: mine.filter(i => i.state === 'open').length };
  });
  const ownerOrder: string[] = [];
  for (const i of open) { const o = i.owner || NO_OWNER; if (!ownerOrder.some(x => x.toLowerCase() === o.toLowerCase())) ownerOrder.push(o); }
  const owners = ownerOrder.map(o => {
    const mine = open.filter(i => (i.owner || NO_OWNER).toLowerCase() === o.toLowerCase());
    return { owner: o, open: mine, late: mine.filter(i => i.late).length };
  });
  return {
    ok: {
      items, total: items.length, ready: items.filter(i => i.state === 'ready').length, na: items.filter(i => i.state === 'na').length, open: open.length,
      late: open.filter(i => i.late), stoppers: open.filter(i => i.stopper),
      wishes: { noOwner: open.filter(i => !i.owner).length, noDay: open.filter(i => !i.due).length, either: open.filter(i => !i.owner || !i.due).length },
      noEvidence: items.filter(i => i.state === 'ready' && !i.evidence), areas, owners,
    },
  };
}

const lower = (s: string): string => (/^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
/** Names run into a sentence: the first as written, the rest in running words. */
const run = (names: string[]): string => list(names.map((n, i) => (i ? lower(n) : n)));
/** A tile's small line: the names when there are two or fewer, else the first and how many more. */
const few = (names: string[]): string => (names.length <= 2 ? list(names) : `${names[0]} and ${names.length - 1} more`);

/** The sentence, tiles, lists, money, closing line and caveats — one source for the page, the paper and the tests. */
export function summarizeReadiness(r: ReadinessResult, o: { dayCost?: number } = {}): ScoredResult {
  const done = r.open === 0;
  const verdict = done ? 'Ready to hand over' : `${r.open} open${r.late.length ? `, ${r.late.length} late` : ''}`;
  const tone: LeanTone = done ? 'g' : r.stoppers.length || r.late.length ? 'r' : 'a';
  const stop = r.stoppers.length ? ` ${run(r.stoppers.map(i => i.name))} would stop day one.` : '';
  const sentence = done
    ? `Readiness: ${r.ready} of ${r.total} items ready${r.na ? `, ${r.na} not needed here` : ''} — every item is done or not needed, so the gate is met.${r.noEvidence.length ? ` ${plural(r.noEvidence.length, 'ready item')} ${r.noEvidence.length === 1 ? 'has' : 'have'} no evidence written — a tick is not a record.` : ''}`
    : `Readiness: ${r.ready} of ${r.total} items ready${r.na ? `, ${r.na} not needed here` : ''}; ${r.open} open${r.late.length ? `, ${r.late.length} past their day` : ''}.${stop}${r.noEvidence.length ? ` ${plural(r.noEvidence.length, 'ready item')} ${r.noEvidence.length === 1 ? 'has' : 'have'} no evidence written.` : ''}`;

  const tiles: LeanTile[] = [
    { k: 'Ready', v: `${r.ready} of ${r.total}`, of: r.na ? `${r.na} not needed here` : 'items', tone: done ? 'g' : 'n' },
    { k: 'Open', v: String(r.open), of: done ? 'the gate is every item' : `${plural(r.owners.length, 'owner')}`, tone: r.open ? 'a' : 'n' },
    { k: 'Past their day', v: String(r.late.length), of: r.late.length ? few(r.late.map(i => i.name)) : 'none late', tone: r.late.length ? 'r' : 'n' },
    { k: 'Would stop day one', v: String(r.stoppers.length), of: r.stoppers.length ? few(r.stoppers.map(i => i.name)) : 'none open', tone: r.stoppers.length ? 'r' : 'n' },
    { k: 'Without an owner or a day', v: String(r.wishes.either), of: `${r.wishes.noOwner} with no owner · ${r.wishes.noDay} with no day`, tone: r.wishes.noOwner || r.wishes.noDay ? 'a' : 'n' },
  ];

  const money: string[] = [];
  if (r.stoppers.length) {
    money.push(o.dayCost !== undefined
      ? `While ${plural(r.stoppers.length, 'item')} that would stop day one ${r.stoppers.length === 1 ? 'is' : 'are'} open, each day production cannot start is a day of the line not making: ${fmtGBP(o.dayCost)} (the figure you gave).`
      : 'Give what a day of the line not making costs to say what a day’s wait for start-up is worth — readiness is the cheapest insurance the project buys.');
  }

  const closing = done
    ? 'Production can take the line over: every item is ready or not needed. Check that each ready item has its evidence written, then hand over.'
    : `Not ready to hand over: ${plural(r.open, 'item')} open${r.stoppers.length ? ` — chase ${list(r.stoppers.map(i => lower(i.name)))} first, ${r.stoppers.length === 1 ? 'it stops' : 'they stop'} day one` : ''}${r.late.length ? `${r.stoppers.length ? ', then' : ' —'} the ${r.late.length} past their day` : ''}. An item with no owner and no day is a wish — give each both.`;

  const lists: NonNullable<ScoredResult['lists']> = [];
  if (r.stoppers.length) lists.push({ title: 'Would stop day one', lines: r.stoppers.map(i => `${i.name}${i.owner ? ` — ${i.owner}` : ' — nobody owns it yet'}${i.due ? `, by ${niceDay(i.due)}${i.late ? ' (late)' : ''}` : ', no day set'}.`) });
  if (r.owners.length) lists.push({ title: 'Open, by who owns them', lines: r.owners.map(x => `${x.owner}: ${x.open.map(i => `${i.name}${i.late ? ' (late)' : ''}`).join('; ')}.`) });
  lists.push({ title: 'By area', lines: r.areas.map(a => `${a.area}: ${a.ready} of ${a.total} ready${a.open ? `, ${a.open} open` : ''}${a.na ? `, ${a.na} not needed here` : ''}.`) });

  const caveats = [
    'It counts what the team says is ready; it validates nothing. The food-safety items — the HACCP amendment, cleaning validation, allergen controls — are legal requirements with their own validation evidence: the tick says where the evidence is, it is not the evidence.',
    'The gate is every item, not the average: the counts and the names are the figure. A percentage would hide the one item that stops production.',
    'An item with no owner and no day is a wish, not an action; “ready” with no evidence written is attendance, not readiness (training is only ready when each person is signed off on the station — the skills matrix says who).',
    'The starter list is a starting point for a new line, never the standard: add what your site needs, mark what does not apply “Not needed here” with the reason, and read it again at the project’s start, not in the last fortnight.',
  ];
  return { verdict, tone, sentence, tiles, closing, caveats, ...(money.length ? { money } : {}), lists };
}

const STATE_WORD: Record<ReadinessItem['state'], string> = { open: 'Not yet', ready: 'Ready', na: 'Not needed here' };

/** The list as a table for the page's foot and the paper: area, item (and that it would stop day one), owner, day, state, what proved it. */
export function readinessTable(r: ReadinessResult): ScoredTable {
  const dash = '—';
  const ordered = r.areas.flatMap(a => r.items.filter(i => i.area === a.area));
  const rows = ordered.map(i => [i.area, `${i.name}${i.stopper ? ' (would stop day one)' : ''}`, i.owner || dash, i.due ? niceDay(i.due) : dash, `${STATE_WORD[i.state]}${i.late ? ' — late' : ''}`, i.evidence || (i.state === 'ready' ? 'none written' : i.evidenceWanted || dash)]);
  const foot = r.areas.map(a => [a.area, `${a.ready} of ${a.total} ready`, '', '', a.open ? `${a.open} open` : 'done', '']);
  return { head: ['Area', 'Item', 'Owner', 'Day', 'State', 'Evidence'], rows, foot, shares: [0.15, 0.27, 0.12, 0.08, 0.13, 0.25], columnIds: ordered.map(i => i.id) };
}

export const START = {
  name: 'Which line or machine is this for?',
  placeholder: 'e.g. Line 2 — new wrapper, readiness for handover',
  empty: 'No readiness list yet — start one, name an owner and a day for each item, and mark each ready when its evidence is written.',
};

export function analyseReadiness(a: { rows: ScoredRow[]; dayCost?: number; today?: string }): ScoredMatrixOut {
  const out = readiness({ rows: a.rows, ...(a.today ? { today: a.today } : {}) });
  if (!('ok' in out)) return { problems: out.problems };
  return { result: summarizeReadiness(out.ok, { dayCost: a.dayCost }), table: readinessTable(out.ok), leaders: [] };
}

/* ------------------------------------------------------------------ the starter list */

type Starter = Omit<ScoredRow, 'id'>;
const item = (group: string, name: string, evidence: string, stopper = false): Starter => ({ name, group, evidence, status: 'open', ...(stopper ? { stopper: true } : {}) });

/** A starting point for a NEW LINE — never the standard (knowledge/methods/commissioning/operational-readiness.md: "the list for the kind of change").
 *  Food-safety items and the people who must be signed off are marked as stopping day one; every mark is the team's to change. */
export const STARTER: Starter[] = [
  item('People', 'Operators trained and signed off on every station they will run', 'A signed training record for each operator, on the skills matrix', true),
  item('People', 'Setters and engineers trained by the OEM on the new machines', 'The OEM’s training record, names and dates'),
  item('People', 'Cleaning team trained on the cleaning procedure for the new equipment', 'A signed training record', true),
  item('People', 'QA and hygiene staff trained on the new checks', 'A signed training record'),
  item('People', 'Cover agreed for every shift — who runs it when the trained person is off', 'The skills matrix with no single point of cover'),
  item('Standards and documents', 'Standard operating procedures issued for running, changeover and cleaning', 'The SOP numbers and issue dates', true),
  item('Standards and documents', 'Work instructions and the line standard posted at the line', 'The line standard on the wall, dated'),
  item('Standards and documents', 'Labels, codes and packaging specifications set up and approved', 'The approved specification and a first-off check', true),
  item('Food safety and quality', 'HACCP plan amended for the new equipment', 'The amended plan, with its review date', true),
  item('Food safety and quality', 'HACCP amendment validated', 'The validation record', true),
  item('Food safety and quality', 'Cleaning procedure validated', 'The validation record — swab results after a clean', true),
  item('Food safety and quality', 'Allergen controls and changeover checked for the new line', 'The allergen risk assessment and a clean-down check', true),
  item('Food safety and quality', 'Foreign-body controls tested (metal detection, sieves, magnets)', 'The test-piece record', true),
  item('Food safety and quality', 'Control plan updated — checks, limits and who does them', 'The updated control plan'),
  item('Food safety and quality', 'Food-contact materials and declarations of conformity received', 'The declarations, filed'),
  item('Maintenance and spares', 'Critical spares on the shelf', 'The spares list agreed and stocked'),
  item('Maintenance and spares', 'Planned maintenance schedule loaded', 'The schedule in the maintenance system'),
  item('Maintenance and spares', 'Food-grade lubricants and consumables in stores', 'The stores list'),
  item('Maintenance and spares', 'Calibration schedule set up for the new instruments', 'The calibration register entry'),
  item('Planning and systems', 'Product, recipe and rate set up in planning', 'A test order planned and costed'),
  item('Health and safety', 'Risk assessment and safety sign-off complete', 'The signed risk assessment and PUWER sign-off', true),
  item('Health and safety', 'Lock-out and tag-out procedure written and trained', 'The procedure and the training record'),
];
