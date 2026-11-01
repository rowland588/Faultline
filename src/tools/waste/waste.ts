/* THE WASTE WALK — the eight wastes seen, classed and costed (FC-005; knowledge/specs/FC-005-waste-walk.md;
 * knowledge/methods/lean/seven-wastes.md).
 *
 * Ohno's seven wastes — transport, inventory, motion, waiting, over-production, over-processing, defects — and Liker's eighth,
 * unused talent, are a vocabulary for a walk: each thing seen that adds cost without changing the product is named, placed and,
 * by the one cost model, priced, so the list is ranked by what it costs rather than by how often it was noticed.
 *
 * Nothing new is kept but the CLASS: a waste is a PROBLEM on the register (a `Snag`, the filmed walk's own record) that says which
 * of the eight it is. Where it is (its machine), how big it is (the minutes a day, the rejects a day, the packs it holds) and what
 * that costs (lib/problemCost, FC-154: labour for the minutes, packs and contribution only where it stops the line, materials for
 * the rejects, money tied up for product held) are the problem's already. This module reads rows that carry a class and says, in
 * the module's words, what the walk found — by kind and by place, ranked, with where each kind points. Pure: the page, the paper and
 * the acceptance script read these sentences and no others. No AI, nothing read from a machine, no figure invented. */
import { fmtGBP, fmtPacks } from '../../lib/cost';
import type { ProblemCost } from '../../lib/problemCost';

export type WasteKind = 'transport' | 'inventory' | 'motion' | 'waiting' | 'overproduction' | 'overprocessing' | 'defects' | 'talent';

/** The eight in the order Ohno and Liker give them (TIMWOODS). */
export const WASTE_KINDS: readonly WasteKind[] = ['transport', 'inventory', 'motion', 'waiting', 'overproduction', 'overprocessing', 'defects', 'talent'];
export const isWaste = (v: unknown): v is WasteKind => (WASTE_KINDS as readonly unknown[]).includes(v);

export interface WasteInfo {
  key: WasteKind;
  name: string;
  /** In the floor's words: what it is. */
  means: string;
  /** A line it is easy to recognise, in food. */
  food: string;
  /** Which of a problem's three sizes says it best — the editor's hint, never a rule. */
  sizedIn: string;
  /** The tools the catalogue has for it (knowledge/methods/lean/seven-wastes.md, "Purpose and principle"). */
  points: { id: string; name: string }[];
}

export const WASTES: Record<WasteKind, WasteInfo> = {
  transport: {
    key: 'transport', name: 'Transport', sizedIn: 'minutes a day',
    means: 'Moving product, film or cases from one place to another without changing them.',
    food: 'Film reels walked from the store; trays pushed to a far chiller.',
    points: [{ id: 'FC-003', name: 'Process flow chart' }, { id: 'FC-004', name: 'Spaghetti diagram' }],
  },
  inventory: {
    key: 'inventory', name: 'Inventory', sizedIn: 'packs on hold',
    means: 'More product, film or packaging waiting than the next step needs.',
    food: 'Packs held warm for a release; a month of film beside the line.',
    points: [{ id: 'FC-009', name: 'Kanban sizing' }, { id: 'FC-044', name: 'WIP and lead time (Little’s law)' }],
  },
  motion: {
    key: 'motion', name: 'Motion', sizedIn: 'minutes a day',
    means: 'People reaching, bending or walking more than the work needs.',
    food: 'Reaching over a guard; fetching the scale from the next bay.',
    points: [{ id: 'FC-004', name: 'Spaghetti diagram' }, { id: 'FC-022', name: 'Work sampling' }],
  },
  waiting: {
    key: 'waiting', name: 'Waiting', sizedIn: 'minutes a day',
    means: 'People or product idle, waiting for the step before.',
    food: 'A pallet waiting for QA release; the packer waiting for film.',
    points: [{ id: 'FC-052', name: 'Stops Pareto' }, { id: 'FC-015', name: 'Andon calls' }],
  },
  overproduction: {
    key: 'overproduction', name: 'Over-production', sizedIn: 'rejects a day (packs dumped)',
    means: 'Making more, or sooner, than the next step or the customer needs.',
    food: 'Short-life product made ahead and dumped; a run longer than the order.',
    points: [{ id: 'FC-011', name: 'Heijunka box' }],
  },
  overprocessing: {
    key: 'overprocessing', name: 'Over-processing', sizedIn: 'minutes a day',
    means: 'Doing more to the product than the customer values.',
    food: 'A double label check; over-wrapping; weighing a tray twice.',
    points: [{ id: 'FC-006', name: 'Line standard' }, { id: 'FC-007', name: 'Standard work combination table' }],
  },
  defects: {
    key: 'defects', name: 'Defects', sizedIn: 'rejects a day',
    means: 'Product that has to be reworked, downgraded or thrown away.',
    food: 'Light packs reworked; mis-sealed trays scrapped.',
    points: [{ id: 'FC-125', name: 'Defect Pareto' }, { id: 'FC-094', name: 'Capability' }],
  },
  talent: {
    key: 'talent', name: 'Unused talent', sizedIn: 'minutes a day',
    means: 'The skill and ideas of people not used.',
    food: 'A skilled operator used as a labourer because the standard was never written.',
    points: [{ id: 'FC-017', name: 'Improvement Kata' }],
  },
};

/** The window the walk's "last weeks" speak of — four weeks, the line page's own (tools/gemba FOUND_DAYS). */
export const WALK_DAYS = 28;
const DAY = 86_400_000;

/** One problem as the walk reads it. */
export interface WasteRow {
  id: string;
  waste?: WasteKind;
  /** Looked at and said not to be a waste (a hazard, a breakdown): neither classed nor waiting to be. */
  notWaste?: boolean;
  status: 'open' | 'in_progress' | 'closed';
  cost?: ProblemCost;
  /** The machine it is on ('' or absent: the line). */
  machine?: string;
  raisedAt: number;
  closedAt?: number;
}

/** What one kind of waste adds up to, over the problems still open. */
export interface WasteLine {
  kind: WasteKind;
  name: string;
  open: number;
  /** Put right (closed) — kept, never counted in the money. */
  closed: number;
  /** Of the open ones, how many say a size (minutes, rejects or packs held). */
  sized: number;
  minutes: number;
  labour: number;
  packs: number;
  contribution: number;
  materials: number;
  tiedUp: number;
  /** What is lost a day (labour + contribution + materials) — the rank's key, never said as one figure. */
  flow: number;
  /** The machine each open one is on, most first. */
  machines: string[];
  /** The money, said: "£600 labour · 39,600 packs lost · £7.9k contribution a day"; or what the line still needs; or that it is not sized. */
  money: string;
  words: string;
}

export interface WastePlace { machine: string; open: number; flow: number; minutes: number }

export interface WasteWalk {
  /** Open problems classed as a waste / not yet classed. */
  classed: number;
  unclassed: number;
  /** Every kind with a problem against it, the biggest first. */
  lines: WasteLine[];
  places: WastePlace[];
  /** The last four weeks: classed problems raised, put right since, still open. */
  found: { raised: number; closed: number; open: number };
  says: string;
  /** Where the biggest points. */
  next?: string;
  foundSays: string;
  caveats: string[];
}

const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;
const minWord = (n: number): string => `${Number(n.toFixed(n >= 10 ? 0 : 1))} min a day`;
const live = (r: WasteRow): boolean => r.status !== 'closed';

/** "£600 labour · 39,600 packs lost · £7.9k contribution a day · £18.0k of product tied up", or what the line still needs. */
function moneyWords(l: Omit<WasteLine, 'words' | 'name' | 'machines' | 'money'>, missing: string[]): string {
  const flow = [l.labour > 0 ? `${fmtGBP(l.labour)} labour` : '', l.packs > 0 ? `${fmtPacks(l.packs)} lost` : '', l.contribution > 0 ? `${fmtGBP(l.contribution)} contribution` : '', l.materials > 0 ? `${fmtGBP(l.materials)} materials` : ''].filter(Boolean).join(' · ');
  const parts = [flow ? `${flow} a day` : '', l.tiedUp > 0 ? `${fmtGBP(l.tiedUp)} of product tied up` : ''].filter(Boolean);
  const asks = [
    missing.includes('wage') ? 'give the line a wage (Set up the line) to say the labour' : '',
    missing.includes('speed') ? 'give the line a speed to say the packs lost' : '',
    missing.includes('margin') ? 'give the line a margin a pack to say the contribution lost' : '',
    missing.includes('materials') ? 'give the line a pack’s materials to price the rejects and the product held' : '',
  ].filter(Boolean);
  const size = l.minutes > 0 ? minWord(l.minutes) : '';
  if (!parts.length && !asks.length) return l.sized ? '' : 'not sized yet — say the minutes, the rejects or the packs on hold on each';
  if (!parts.length) return `${size ? `${size}; ` : ''}${asks.join('; ')}`;
  return `${parts.join('; ')}${asks.length ? `; ${asks.join('; ')}` : ''}`;
}

/** The tools a kind points to, said honestly about whether they are built (the catalogue's own words, passed in). */
export function pointsSays(kind: WasteKind, status: (id: string) => string | undefined): string {
  return WASTES[kind].points.map(p => {
    const s = status(p.id);
    return `${p.name} (${p.id}${s && s !== 'available' && s !== 'partial' ? ', not built yet' : ''})`;
  }).join(' and ');
}

/** The walk over the problems given — the caller has already narrowed them to the line, the project or the person on show. */
export function wasteWalk(rows: readonly WasteRow[], o: { status?: (id: string) => string | undefined; today?: number } = {}): WasteWalk {
  const today = o.today ?? Date.now();
  const classed = rows.filter(r => r.waste);
  const openAll = rows.filter(live);
  const lines: WasteLine[] = [];
  for (const kind of WASTE_KINDS) {
    const mine = classed.filter(r => r.waste === kind);
    if (!mine.length) continue;
    const open = mine.filter(live);
    const costs = open.map(r => r.cost).filter((c): c is ProblemCost => !!c);
    const sum = (f: (c: ProblemCost) => number | undefined): number => costs.reduce((n, c) => n + (f(c) ?? 0), 0);
    const by = new Map<string, number>();
    for (const r of open) { const m = (r.machine ?? '').trim(); by.set(m, (by.get(m) ?? 0) + 1); }
    const base = {
      kind, open: open.length, closed: mine.length - open.length, sized: costs.length,
      minutes: sum(c => c.minutes), labour: sum(c => c.labour), packs: sum(c => c.packs), contribution: sum(c => c.contribution),
      materials: sum(c => c.materials), tiedUp: sum(c => c.tiedUp), flow: 0,
    };
    base.flow = base.labour + base.contribution + base.materials;
    const missing = [...new Set(costs.flatMap(c => c.missing))];
    const money = open.length ? moneyWords(base, missing) : '';
    const unsized = open.length - costs.length;
    const head = `${WASTES[kind].name} — ${open.length ? `${plural(open.length, 'problem')} open` : 'none open'}${base.closed ? `, ${base.closed} put right` : ''}`;
    const tail = open.length ? `${money ? `: ${money}` : ''}${unsized > 0 && costs.length > 0 ? `; ${unsized} of them not sized yet` : ''}` : '';
    lines.push({ ...base, name: WASTES[kind].name, money, machines: [...by.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([m]) => m || 'the line'),
      words: `${head}${tail}.` });
  }
  /* biggest first: what is lost a day, then the money tied up, then the minutes said, then how many; the eight's own order breaks a tie */
  lines.sort((a, b) => b.flow - a.flow || b.tiedUp - a.tiedUp || b.minutes - a.minutes || b.open - a.open || WASTE_KINDS.indexOf(a.kind) - WASTE_KINDS.indexOf(b.kind));

  const places = new Map<string, WastePlace>();
  for (const r of classed.filter(live)) {
    const m = (r.machine ?? '').trim() || 'the line';
    const p = places.get(m) ?? { machine: m, open: 0, flow: 0, minutes: 0 };
    p.open++; p.flow += (r.cost?.labour ?? 0) + (r.cost?.contribution ?? 0) + (r.cost?.materials ?? 0); p.minutes += r.cost?.minutes ?? 0;
    places.set(m, p);
  }
  const placeList = [...places.values()].sort((a, b) => b.flow - a.flow || b.minutes - a.minutes || b.open - a.open || a.machine.localeCompare(b.machine));

  const recent = classed.filter(r => today - r.raisedAt < WALK_DAYS * DAY);
  const found = { raised: recent.length, closed: recent.filter(r => !live(r)).length, open: recent.filter(live).length };

  const classedOpen = classed.filter(live).length, unclassed = openAll.filter(r => !r.waste && !r.notWaste).length;
  const top = lines.find(l => l.open > 0);
  const where = top && placeList[0] && placeList[0].machine !== 'the line' && classedOpen > 1 ? `, most of it at ${placeList[0].machine}` : '';
  const says = !classed.length
    ? (unclassed ? 'No problem is classed as a waste yet — open one and pick which of the eight it is.' : openAll.length ? 'Every open problem here is said not to be a waste.' : 'No problems here to class as waste.')
    : !top ? `Every problem classed as a waste is put right — ${plural(classed.length, 'problem')} in all.`
    : `${plural(classedOpen, 'open problem')} classed as waste${unclassed > 0 ? ` (${unclassed} more not yet classed)` : ''}. The biggest is ${top.name}${top.sized > 0 && top.money ? `: ${top.money}` : ' — not sized yet'}${where}.`;
  const next = top && o.status ? `${top.name} points to ${pointsSays(top.kind, o.status)}.` : undefined;
  const foundSays = found.raised
    ? `Last 4 weeks: ${plural(found.raised, 'waste')} raised, ${found.closed} put right, ${found.open} still open.`
    : 'No waste raised in the last 4 weeks.';
  return {
    classed: classedOpen, unclassed, lines, places: placeList, found, says, ...(next ? { next } : {}), foundSays,
    caveats: [
      'Estimates from a walk are indicative — measure the big ones with the tool the waste points to.',
      'Waste is in the process, not the person. Storage and inspection the law or the HACCP plan requires are not waste to remove, though they may be waste to shorten.',
    ],
  };
}

/** A problem's own sentence about its class, for its row and its card: "Waiting — people or product idle, waiting for the step before." */
export const wasteTag = (k: WasteKind): string => `${WASTES[k].name} waste`;

/** Where the wastes are, the biggest place first: "Where: Packer (1 problem, £8.5k a day), Labeller (3 problems, £163 a day) and 2 more places." */
export function placesSays(w: WasteWalk, show = 3): string {
  if (!w.places.length) return '';
  const said = (p: WastePlace): string => `${p.machine} (${plural(p.open, 'problem')}${p.flow > 0 ? `, ${fmtGBP(p.flow)} a day` : p.minutes > 0 ? `, ${minWord(p.minutes)}` : ''})`;
  const first = w.places.slice(0, show).map(said), more = w.places.length - first.length;
  const list = first.length > 1 ? `${first.slice(0, -1).join(', ')}${more > 0 ? ',' : ' and'} ${first[first.length - 1]}` : first[0];
  return `Where: ${list}${more > 0 ? ` and ${more} more ${more === 1 ? 'place' : 'places'}` : ''}.`;
}
