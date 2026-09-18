/* COMMISSIONING — is the line ready, and what is stopping it?
 *
 * A commissioning job is not an improvement project and it does not fit the 3P
 * board. Nothing is "in progress" in a useful sense: a thing either exists or
 * it does not, and if it exists it has either been proven against a number or
 * it has not. Handing that to a Kanban turns every real question — have we got
 * the film? has the 250g program run at rate? — into a card that says
 * "in progress" and answers neither.
 *
 * So the model is the four questions an OEM handover actually turns on, which
 * are also the loop somebody runs the job by:
 *
 *   where are we      -> readiness, counted
 *   what are we after -> the acceptance target on each check
 *   what is the result-> passed, failed, or not yet run
 *   what is next      -> the shortest list of things blocking the next step
 *
 * THREE KINDS OF ITEM, because the job has three kinds of question in it and
 * flattening them loses the answer:
 *
 *   check   a thing that must be PROVEN against a number. A product program at
 *           75ppm and 98% efficiency. It runs none -> have -> testing ->
 *           passed/failed, which is the real vocabulary: "what programs do we
 *           have" and "which have passed" are different questions and a single
 *           done/not-done flag cannot hold both.
 *   supply  a thing you need a QUANTITY of. Film, spares, pallets. Need, have,
 *           on order, when it lands. Short is not the same as ordered.
 *   task    a thing somebody must DO. The ordinary next step.
 *
 * Everything is typed in the app, not read from a workbook. That is the whole
 * difference between this and Project Pace: Pace reports on a system the
 * business already runs in Excel, so the app can only ever be a viewer of it.
 * The commissioning of a line has no system yet — so this IS the system, and
 * the file somebody sends round is drawn from it rather than the other way
 * about.
 */

/** The five states everything in the app already speaks, so a commissioning
 *  item wears the same colours as an action on the board and nobody has to
 *  learn a second vocabulary. */
import type { MediaRef } from '../types';

export type ReadyState = 'n' | 'w' | 'a' | 'r' | 'g';

export type ItemKind = 'check' | 'supply' | 'task';

/** A check's own progression. Deliberately NOT a boolean: "we have written the
 *  program" and "the program has run at rate" are different facts and a
 *  commissioning meeting asks for both. */
export type CheckStage = 'none' | 'have' | 'testing' | 'passed' | 'failed';

export type TaskStage = 'todo' | 'doing' | 'waiting' | 'done';

/* ONE PASS AT ONE ITEM — the unit the flow actually produces.
 *
 * A commissioning list is not filled in once. You run the 250g program, it does
 * 61ppm, you write down why, you change the film, you run it again. Keeping only
 * the latest result throws away the half that matters: a line is signed off on
 * the STORY of how it got to rate, and "61 then 74 after the film change" is an
 * argument where "74" on its own is only a number.
 *
 * So every pass is kept, in the order it happened. The item's current state is
 * the newest one; the rest is how it got there. */
export interface Finding {
  id: string;
  /** When this pass happened. */
  at: number;
  /** Who ran it — usually you and the OEM engineer. */
  by?: string;
  /** WHAT ACTUALLY HAPPENED. The measurement, in the units the target was set
   *  in, so the two can be read against each other without arithmetic. */
  happened?: string;
  /** The finding itself — why it did that, what it means. Commentary. */
  note?: string;
  /** What this pass decided to do next. Not a task somebody else owns; the very
   *  next move on this item. */
  next?: string;
  /** Pictures taken during this pass. */
  photos?: MediaRef[];
  /** Line-walk snags raised or pointed at during this pass. */
  snagIds?: string[];
  /** The state the item was moved to by this pass, so the timeline reads as a
   *  progression rather than as a pile of notes. */
  movedTo?: CheckStage | TaskStage;
}

export interface CommissionItem {
  id: string;
  projectId: string;
  /** WHICH ASSET THIS BELONGS TO.
   *
   *  A production line is made of many assets and each asset is commissioned in
   *  its own right — Line 2 has two new machines on it, both needing their own
   *  programs, their own materials, their own acceptance run — and all of it
   *  rolls back up to the line. So the asset is a real level, not a label: "the
   *  bagger is 70% and the palletiser has not started" is the sentence somebody
   *  running a line handover actually says, and a list that could only total
   *  the whole project could not produce it.
   *
   *  ABSENT MEANS THE LINE ITSELF. The 72-hour run at rate, the signed
   *  performance agreement, operator training across the line — those belong to
   *  no single machine, and forcing them under one would be a lie about who
   *  owns them. */
  asset?: string;

  /** The workstream it sits under — Programs, Film, SAT, Training. A plain
   *  string, and the groups on screen are derived from it, exactly as the
   *  board's areas are derived from the tracker's Line column. One less thing
   *  to set up before the first item can be written down.
   *
   *  Every asset has its OWN workstreams: the bagger's Programs and the
   *  palletiser's Programs are different work that happen to share a name. */
  stream: string;
  kind: ItemKind;
  title: string;
  /** What "good" looks like, in the units it will be argued about in: "75 ppm
   *  @ 98% OEE", "12 reels", "signed off by QA". Free text on purpose — an OEM
   *  acceptance criterion is a sentence, not a number, and forcing it into
   *  fields loses the half that matters. */
  target?: string;
  /** What actually happened. Only meaningful once it has been run. */
  result?: string;

  /* check */
  stage?: CheckStage;

  /* supply */
  need?: number;
  have?: number;
  onOrder?: number;
  /** ISO date the outstanding quantity is promised for. */
  dueIn?: string;

  /* task */
  taskStage?: TaskStage;

  /** PICTURES OF THE THING ITSELF.
   *
   *  A commissioning argument is settled by a photograph more often than by a
   *  sentence: "film creasing at the infeed" is a claim, and a picture of the
   *  crease is the end of the conversation. They hang off the ITEM rather than
   *  the workstream because that is the grain an argument happens at.
   *
   *  Lightweight refs only — the blobs live in the media store, the same bag
   *  the line-walk evidence uses, so they sync by the same route and nothing
   *  heavy ever travels inside the item row. */
  photos?: MediaRef[];

  /** FILMED EVIDENCE, LINKED RATHER THAN COPIED.
   *
   *  A picture you took is a photo on this item. A snag is something else: a
   *  fault pinned on a frame of the line walk, with its own problem statement,
   *  owner and lifecycle, living in the project's workspace. Linking by id
   *  rather than copying the still means closing the snag on the walk closes it
   *  here — two copies of the same fault drifting apart is precisely the mess
   *  the app exists to stop.
   *
   *  A snag can be linked to more than one item, and an item to more than one
   *  snag: one crease in the film can be the reason two programs failed. */
  snagIds?: string[];

  owner?: string;
  /** ISO date this is wanted by. */
  due?: string;
  note?: string;

  /** Every pass at this item, oldest first. The current `result` is the newest
   *  one's `happened`; this is the record of how it got there. */
  findings?: Finding[];

  sort: number;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

const todayISO = (): string => new Date().toISOString().slice(0, 10);
const overdue = (iso?: string): boolean => !!iso && iso < todayISO();

/** One item's state, by its own rules. This is the only place that decides,
 *  because a screen and a report that each work it out separately is how a page
 *  ends up saying 7 of 12 beside a list with eight ticks on it. */
export function stateOf(i: CommissionItem): ReadyState {
  if (i.kind === 'check') {
    switch (i.stage ?? 'none') {
      case 'passed': return 'g';
      case 'failed': return 'r';
      case 'testing': return 'w';
      // We have it but it is unproven. Amber once the date has gone by, because
      // an untested program the week of handover is a risk, not a to-do.
      case 'have': return overdue(i.due) ? 'a' : 'w';
      default: return overdue(i.due) ? 'a' : 'n';
    }
  }
  if (i.kind === 'supply') {
    const need = i.need ?? 0, have = i.have ?? 0, onOrder = i.onOrder ?? 0;
    if (need > 0 && have >= need) return 'g';
    // Covered on paper, but only until the promised date passes. After that
    // "it is on order" is the problem rather than the answer.
    if (have + onOrder >= need && need > 0) return overdue(i.dueIn) ? 'a' : 'w';
    // Short with nothing coming is the one thing on a commissioning list that
    // genuinely stops the line, so it is red rather than merely unstarted.
    return onOrder > 0 ? 'a' : 'r';
  }
  switch (i.taskStage ?? 'todo') {
    case 'done': return 'g';
    case 'doing': return overdue(i.due) ? 'a' : 'w';
    case 'waiting': return overdue(i.due) ? 'r' : 'a';
    default: return overdue(i.due) ? 'a' : 'n';
  }
}

export const STATE_LABEL: Record<ReadyState, string> = {
  n: 'Not started', w: 'In hand', a: 'At risk', r: 'Blocked', g: 'Done',
};

/** What an item says about itself in one line, in its own units. */
export function itemLine(i: CommissionItem): string {
  if (i.kind === 'supply') {
    const need = i.need ?? 0, have = i.have ?? 0, onOrder = i.onOrder ?? 0;
    const short = Math.max(0, need - have - onOrder);
    const bits = [`${have} of ${need}`];
    if (onOrder > 0) bits.push(`${onOrder} on order${i.dueIn ? ` for ${i.dueIn}` : ''}`);
    if (short > 0) bits.push(`${short} not ordered`);
    return bits.join(' · ');
  }
  if (i.kind === 'check') {
    const stage = i.stage ?? 'none';
    const word = stage === 'none' ? 'not written'
      : stage === 'have' ? 'written, not run'
      : stage === 'testing' ? 'under test'
      : stage === 'passed' ? 'passed' : 'failed';
    return [word, i.result].filter(Boolean).join(' · ');
  }
  const t = i.taskStage ?? 'todo';
  return t === 'done' ? 'done' : t === 'doing' ? 'in hand' : t === 'waiting' ? 'waiting' : 'to do';
}

export interface StreamRoll {
  name: string;
  items: CommissionItem[];
  total: number;
  done: number;
  /** 0-1. Plain count of finished over total: a commissioning percentage that
   *  weights items by some notion of size is a percentage nobody can check. */
  pct: number;
  risk: number;
}

/** What the line calls the work that belongs to no single machine. */
export const LINE_LEVEL = 'The line itself';

export interface AssetRoll {
  name: string;
  /** True for the work that belongs to the line rather than to a machine. */
  isLine: boolean;
  total: number;
  done: number;
  pct: number;
  risk: number;
  /** Its own workstreams — the bagger's Programs, not the project's. */
  streams: StreamRoll[];
}

export interface Readiness {
  /** One per asset, in the order they were first written down, with the
   *  line-level work last: the machines are the job, and the line's own
   *  acceptance is what happens once they are done. */
  assets: AssetRoll[];
  /** True once any item names an asset. Until then this is a single-machine
   *  job and every screen should stay flat rather than growing a level with one
   *  thing in it. */
  hasAssets: boolean;
  streams: StreamRoll[];
  total: number;
  done: number;
  pct: number;
  /** Acceptance — of the CHECKS only, because that is what the line is signed
   *  off against. Tasks and film are how you get there; they are not the test. */
  checks: { total: number; passed: number; failed: number; untested: number };
  /** Anything red or amber, worst first — "what is next" without being asked. */
  attention: CommissionItem[];
}

const RANK: Record<ReadyState, number> = { r: 0, a: 1, w: 2, n: 3, g: 4 };

/** Streams in the order they were first written down, not alphabetically: the
 *  order somebody enters the workstreams is the order they think about them. */
function streamsOf(items: CommissionItem[]): StreamRoll[] {
  const order: string[] = [];
  const by = new Map<string, CommissionItem[]>();
  for (const i of items) {
    const s = i.stream.trim() || 'Unassigned';
    if (!by.has(s)) { by.set(s, []); order.push(s); }
    by.get(s)!.push(i);
  }
  return order.map(name => {
    const list = [...by.get(name)!].sort((a, b) =>
      RANK[stateOf(a)] - RANK[stateOf(b)] || a.sort - b.sort);
    const done = list.filter(i => stateOf(i) === 'g').length;
    return {
      name, items: list, total: list.length, done,
      pct: list.length ? done / list.length : 0,
      risk: list.filter(i => { const s = stateOf(i); return s === 'r' || s === 'a'; }).length,
    };
  });
}

export function readiness(items: CommissionItem[]): Readiness {
  const streams = streamsOf(items);

  /* The same roll-up, one level up. Built from the same streamsOf helper so an
     asset's numbers and the project's cannot be computed two different ways. */
  const assetOrder: string[] = [];
  const byAsset = new Map<string, CommissionItem[]>();
  for (const i of items) {
    const a = (i.asset ?? '').trim();
    if (!byAsset.has(a)) { byAsset.set(a, []); assetOrder.push(a); }
    byAsset.get(a)!.push(i);
  }
  const assets: AssetRoll[] = assetOrder
    .sort((x, y) => (x === '' ? 1 : 0) - (y === '' ? 1 : 0))
    .map(name => {
      const list = byAsset.get(name)!;
      const d = list.filter(i => stateOf(i) === 'g').length;
      return {
        name: name || LINE_LEVEL,
        isLine: name === '',
        total: list.length,
        done: d,
        pct: list.length ? d / list.length : 0,
        risk: list.filter(i => { const st = stateOf(i); return st === 'r' || st === 'a'; }).length,
        streams: streamsOf(list),
      };
    });

  const checks = items.filter(i => i.kind === 'check');
  const done = items.filter(i => stateOf(i) === 'g').length;

  return {
    assets,
    hasAssets: items.some(i => (i.asset ?? '').trim() !== ''),
    streams,
    total: items.length,
    done,
    pct: items.length ? done / items.length : 0,
    checks: {
      total: checks.length,
      passed: checks.filter(i => i.stage === 'passed').length,
      failed: checks.filter(i => i.stage === 'failed').length,
      untested: checks.filter(i => i.stage !== 'passed' && i.stage !== 'failed').length,
    },
    attention: items
      .filter(i => { const s = stateOf(i); return s === 'r' || s === 'a'; })
      .sort((a, b) => RANK[stateOf(a)] - RANK[stateOf(b)]
        || (a.due ?? a.dueIn ?? '9999').localeCompare(b.due ?? b.dueIn ?? '9999')),
  };
}

/** The one sentence at the top of the page and the top of the report. It leads
 *  with what is WRONG when anything is, because a readiness number on its own
 *  is the easiest thing in the world to nod at. */
export function readinessLine(r: Readiness): string {
  if (r.total === 0) return 'Nothing on the list yet.';
  const pct = Math.round(r.pct * 100);
  const blocked = r.attention.filter(i => stateOf(i) === 'r').length;
  const risk = r.attention.length - blocked;
  const tail = blocked > 0
    ? `${blocked} blocked${risk > 0 ? `, ${risk} at risk` : ''}`
    : risk > 0 ? `${risk} at risk` : 'nothing blocked';
  return `${pct}% ready · ${r.done} of ${r.total} done · ${tail}`;
}

/** The workstreams a commissioning job usually has, offered on an empty board
 *  so the first item can be written without inventing a filing system first.
 *  Suggestions on a menu, not a schema — rename them, ignore them, add your own. */
/** The newest pass, which is what the item currently says about itself. */
export const latestFinding = (i: CommissionItem): Finding | undefined =>
  i.findings?.length ? i.findings[i.findings.length - 1] : undefined;

/** Every open next-step across the list, newest first — what the last run left
 *  behind. These are not tasks somebody else owns; they are the moves this job
 *  decided on and has not made yet. */
export function openNextSteps(items: CommissionItem[]): {
  item: CommissionItem; finding: Finding;
}[] {
  return items
    .flatMap(item => (item.findings ?? []).map(finding => ({ item, finding })))
    .filter(({ item, finding }) =>
      !!finding.next?.trim()
      // A next step on a finding that is not the latest has been overtaken by a
      // later pass; only the most recent word on an item still stands.
      && latestFinding(item)?.id === finding.id
      && stateOf(item) !== 'g')
    .sort((a, b) => b.finding.at - a.finding.at);
}

export const SUGGESTED_STREAMS = [
  'Programs', 'Film & materials', 'SAT & acceptance', 'Training',
  'Documentation', 'Spares', 'Safety',
];
