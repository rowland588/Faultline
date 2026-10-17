/* THE LEAN PAGE — the model every report and every tool's page is drawn from
 * (docs/LEAN-PAGE.md). Rowland, 17 October: "the lean report is actually how
 * we would want the app's UI".
 *
 * Eight parts in the order of the three questions: the band (what, where,
 * when), the tiles (where are we — a few big numbers, each of what it should
 * be and since last time), the trend, the tool's own picture, the top causes,
 * what it means, the action plan (action · owner · due) and the closing line.
 * The picture and the table are the tool's own and drawn by it; the rest is
 * this model, drawn once on screen (ui/Lean) and once on paper
 * (lib/report/lean), so the two never part.
 *
 * Pure. Nothing here works a figure out: each tool's builder reads its own
 * module's figures and sentences into it. */
import { niceDay, todayISO } from './weeks';

/** The house's five meanings, as a tile or a line wears them: red wrong or
 *  late, amber waiting or to check, green met, grey nothing to say. */
export type LeanTone = 'r' | 'a' | 'g' | 'n';

/** A change against the record before — "▲ 4,400 on 15 Oct". */
export interface LeanChange {
  dir: 'up' | 'down' | 'same';
  /** "4,400 on 15 Oct" — the size of the change and what it is against. */
  text: string;
  /** Better, worse, or neither — the colour; never the only carrier. */
  better?: boolean;
}

export interface LeanTile {
  /** "Good packs" */
  k: string;
  /** "40,900" — or "—" when it cannot be said yet. */
  v: string;
  /** "of 45,000 expected · 91%" — what it should be, or why there is no figure. */
  of?: string;
  change?: LeanChange;
  tone?: LeanTone;
}

export interface LeanPoint {
  /** "15 Oct" */
  label: string;
  v: number;
  /** What it should have been — the dashed mark. */
  target?: number;
  /** The record this page is about. */
  now?: boolean;
}

export interface LeanTrend {
  title: string;
  /** "packs" — said on the axis and the marks. */
  unit: string;
  points: LeanPoint[];
  /** The legend's words for the bar and the mark. */
  bar: string;
  mark?: string;
}

export interface LeanInsight { text: string; tone: LeanTone }

/** One row of the action plan. */
export interface LeanAction {
  what: string;
  who?: string;
  /** "21 Oct" — or "done 16 Oct". */
  due?: string;
  /** "Open", "Late", "Waiting", "Done". */
  state: string;
  tone: LeanTone;
  /** What it was raised from, when that helps: "from Breakdown". */
  from?: string;
  /** The record behind the row, for a screen to open. */
  open?: { kind: 'action' | 'fix'; ref: string };
}

export interface LeanPage {
  /** "LOSS COUNT" — the band's small line. */
  eyebrow: string;
  title: string;
  /** "Line 7 · Maris Piper 2kg" */
  sub: string;
  /** Where it stands in a few words — "6 min slow running" — in its colour. */
  verdict?: { text: string; tone: LeanTone };
  /** The band's right side: [["Day", "Fri 16 Oct"], ["Shift", "Shift 1 · 06:00–14:00"]]. */
  facts: [string, string][];
  tiles: LeanTile[];
  trend?: LeanTrend;
  insights: LeanInsight[];
  actions: LeanAction[];
  /** What the plan says when nothing has been raised yet. */
  actionsEmpty: string;
  closing: { text: string; tone: LeanTone };
}

/** A CHANGE AGAINST THE RECORD BEFORE — "4,400 more than 15 Oct". `fmt`
 *  says the size; `higher` whether a higher number is the better one;
 *  `against` the record's day; `counted` for things counted one by one
 *  (fewer, not less). Equal (within `same`) is the same, said so. */
export function since(now: number, before: number | undefined, o: { fmt: (n: number) => string; higher: boolean; against: string; same?: number; counted?: boolean }): LeanChange | undefined {
  if (before === undefined || !Number.isFinite(before) || !Number.isFinite(now)) return undefined;
  const d = now - before;
  if (Math.abs(d) <= (o.same ?? 0)) return { dir: 'same', text: `the same as ${o.against}` };
  const up = d > 0;
  return { dir: up ? 'up' : 'down', text: `${o.fmt(Math.abs(d))} ${up ? 'more' : o.counted ? 'fewer' : 'less'} than ${o.against}`, better: up === o.higher };
}

/** The arrow a change is drawn with on a screen — ▲ ▼ or =. */
export const arrow = (c: LeanChange): string => (c.dir === 'up' ? '▲' : c.dir === 'down' ? '▼' : '=');

/** A change's tone: better green, worse red, the same grey. */
export const changeTone = (c: LeanChange): LeanTone => (c.better === undefined ? 'n' : c.better ? 'g' : 'r');

/* ------------------------------------------------------------- the plan */

/** An action on a running line's board (6M, lever tree), as the plan reads it. */
export interface ActionLike { what: string; who?: string; due?: string; state: 'todo' | 'waiting' | 'done'; doneOn?: string }
/** A fix on a stage-gate job, as the plan reads it. */
export interface FixLike { title: string; withWhom?: string; plannedFor?: string; ranOn?: string; result?: string }

/** A board action as a row of the plan: late when its day has gone and it is
 *  not done; waiting in amber; done quiet green with its day. */
export function actionOf(a: ActionLike, today = todayISO(), from?: string): LeanAction {
  const done = a.state === 'done';
  const late = !done && !!a.due && a.due < today;
  return {
    what: a.what.trim() || 'An action with no words yet',
    ...(a.who?.trim() ? { who: a.who.trim() } : {}),
    ...(done ? { due: a.doneOn ? `done ${niceDay(a.doneOn)}` : 'done' } : a.due ? { due: niceDay(a.due) } : {}),
    state: done ? 'Done' : late ? 'Late' : a.state === 'waiting' ? 'Waiting' : 'Open',
    tone: done ? 'g' : late ? 'r' : a.state === 'waiting' ? 'a' : 'n',
    ...(from ? { from } : {}),
  };
}

/** A fix as a row of the plan: done once it ran (its day), late when its
 *  planned day has gone, else open. */
export function fixOf(t: FixLike, today = todayISO(), from?: string): LeanAction {
  const done = !!t.ranOn;
  const late = !done && !!t.plannedFor && t.plannedFor < today;
  return {
    what: t.title.trim() || 'A fix with no words yet',
    ...(t.withWhom?.trim() ? { who: t.withWhom.trim() } : {}),
    ...(done ? { due: `done ${niceDay(t.ranOn)}` } : t.plannedFor ? { due: niceDay(t.plannedFor) } : {}),
    state: done ? 'Done' : late ? 'Late' : 'Open',
    tone: done ? 'g' : late ? 'r' : 'n',
    ...(from ? { from } : {}),
  };
}

/** The plan in the order a lead reads it: late first, then open and waiting
 *  by their day, the done last. */
export function planOrder(rows: LeanAction[]): LeanAction[] {
  const rank = (r: LeanAction) => (r.state === 'Late' ? 0 : r.state === 'Done' ? 2 : 1);
  return rows.map((r, i) => ({ r, i })).sort((a, b) => rank(a.r) - rank(b.r) || a.i - b.i).map(x => x.r);
}
