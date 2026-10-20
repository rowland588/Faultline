/* WHAT A VIEW DRAWS — a step's entries laid out by its view's bindings
 * (lib/flow/views), the same for the screen (ui/flow/Views) and the paper
 * (lib/flow/reportPdf). Pure, and no arithmetic a gate reads: the fish's
 * grouping is the fishbone block's own (lib/flow/analysis bonesOf); the
 * board's "late" is the board's drawing rule — a day gone and the card not
 * in the last lane — said in words beside its red. */
import { niceDay } from '../weeks';
import { bonesOf, entryValues, type FishBones, type FlowEntry } from './analysis';
import type { FlowStepDef } from './definition';
import { entryTitle } from './links';

type Step = Pick<FlowStepDef, 'answer' | 'columns' | 'fields' | 'view' | 'analyses' | 'title'>;
const live = (entries: readonly FlowEntry[]) => entries.filter(e => !e.struck);
const byLogged = (a: FlowEntry, b: FlowEntry) => a.on.localeCompare(b.on) || a.at - b.at;

/* ---------------------------------------------------------------- the fish */

/** The causes a fishbone view draws, on their bones, by its bindings. */
export function viewBones(step: Step, entries: readonly FlowEntry[]): FishBones {
  const b = step.view?.id === 'fishbone' ? step.view.bind : undefined;
  if (!b) return [];
  return bonesOf(entries, step.columns ?? [], {
    of: b.cause, by: b.bone,
    ...(b.root ? { root: { column: b.root, op: '=', value: true } } : {}),
    ...(b.known ? { known: b.known } : {}),
  });
}

/** The problem at the fish's head: its fishbone analysis's name, else the step's title. */
export const fishHead = (step: Step): string => step.analyses?.find(a => a.block === 'fishbone')?.label ?? step.title;

/* --------------------------------------------------------------- the board */

export interface BoardCard {
  id: string;
  title: string;
  lane: string;
  owner?: string;
  due?: string;
  /** A day gone and not in the last lane. */
  late: boolean;
  /** The day in words — "Late — was due 18 Oct", "Due 22 Oct". */
  dueSaid?: string;
  /** In the last lane: done. */
  done: boolean;
}
export interface BoardLane {
  name: string;
  /** The lane column lists it (a lane only an old entry names does not). */
  listed: boolean;
  last: boolean;
  cards: BoardCard[];
}
export interface Board { lanes: BoardLane[]; cards: number; late: number; says: string }

/** A board's lanes in the lane column's order — any lane an entry names
 *  that the column no longer lists after them, cards with none in "Not
 *  placed" first — each lane's cards late first, then by their day, then as
 *  logged. */
export function boardOf(step: Step, entries: readonly FlowEntry[], today?: string): Board {
  const b = step.view?.id === 'board' ? step.view.bind : undefined;
  const cols = step.columns ?? [];
  const laneCol = cols.find(c => c.key === b?.lane);
  const listed = [...(laneCol?.options ?? [])];
  const names = [...listed];
  const last = names[names.length - 1];
  const cards: BoardCard[] = [];
  for (const e of [...live(entries)].sort(byLogged)) {
    const v = entryValues(cols, e.values);
    const raw = b?.lane ? v[b.lane] : undefined;
    const said = typeof raw === 'string' ? raw.trim() : raw === undefined ? '' : String(raw);
    const lane = names.find(n => n.toLowerCase() === said.toLowerCase()) ?? (said || 'Not placed');
    if (!names.includes(lane)) (lane === 'Not placed' ? names.unshift(lane) : names.push(lane));
    const owner = b?.owner && typeof v[b.owner] === 'string' && String(v[b.owner]).trim() ? String(v[b.owner]).trim() : undefined;
    const due = b?.due && typeof v[b.due] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(String(v[b.due])) ? String(v[b.due]) : undefined;
    const done = lane === last;
    const late = !!due && !!today && due < today && !done;
    cards.push({
      id: e.id, title: entryTitle(step, e), lane, done, late,
      ...(owner ? { owner } : {}), ...(due ? { due, dueSaid: late ? `Late — was due ${niceDay(due)}` : `${done ? 'Was due' : 'Due'} ${niceDay(due)}` } : {}),
    });
  }
  const order = (c: BoardCard) => [c.late ? 0 : 1, c.due ?? '9999-99-99'] as const;
  const lanes = names.map(name => ({
    name, listed: listed.includes(name), last: name === last,
    cards: cards.filter(c => c.lane === name).map((c, i) => ({ c, i }))
      .sort((p, q) => { const a = order(p.c), z = order(q.c); return a[0] - z[0] || a[1].localeCompare(z[1]) || p.i - q.i; })
      .map(x => x.c),
  }));
  const late = cards.filter(c => c.late).length;
  const says = cards.length
    ? `${cards.length} card${cards.length === 1 ? '' : 's'} — ${lanes.map(l => `${l.name} ${l.cards.length}`).join(' · ')}${late ? `; ${late} late` : ''}.`
    : 'No cards yet.';
  return { lanes, cards: cards.length, late, says };
}

/** The lane after a card's — where "move on" takes it: none from the last;
 *  from a lane the column does not list, or none, the first it does. */
export function nextLane(board: Board, lane: string): string | undefined {
  const real = board.lanes.filter(l => l.listed);
  const i = real.findIndex(l => l.name === lane);
  if (i < 0) return real[0]?.name;
  return i < real.length - 1 ? real[i + 1].name : undefined;
}
