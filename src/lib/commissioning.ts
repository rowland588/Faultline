/* A LINE BEING COMMISSIONED.
 *
 * Four rebuilds got this wrong in the same way: each one invented a process —
 * gates, phases, criteria, sign-off ceremonies — and then asked the job to fit
 * it. What the job is actually made of, in the words of the person doing it:
 *
 *   "Machinery is on site. I'm testing the assets with the OEM and agreeing what
 *    happens next. The modified film isn't here, and old film changes how the
 *    wrapper runs. Programs are missing — including on a line commissioned years
 *    ago. And I need to be able to say where we are."
 *
 * So there is ONE rule, and everything below is it:
 *
 *   A THING — an asset, a material, a pack —
 *   and A CLAIM ABOUT IT that has to become true,
 *   with THE EVIDENCE, INCLUDING WHAT IT WAS RUN ON,
 *   and if it is not true yet, WHO does WHAT by WHEN, graded A / B / C.
 *
 * THE CONDITIONS ARE PART OF THE EVIDENCE. This is the thing every earlier cut
 * missed and it is the one that silently lies. A rate proved on 40µ film is not
 * evidence for 35µ film, because the machine does not run it the same. So a
 * result records the material spec it was got ON, and when that spec is replaced
 * the result stops counting — automatically, on the day the new stock lands,
 * without anybody remembering. A number with no conditions is how you end up
 * re-arguing a rate with an OEM in three weeks' time.
 *
 * ASSETS ARE RECORDS, NOT A TEXT FIELD. Two machines today, more next month, and
 * each one carries its own state, its own proofs and its own paperwork. A
 * free-text asset name cannot be given a PDF or counted.
 *
 * PACKS ARE THE OTHER AXIS. A rate, a seal and a weight check are proved PER
 * PACK, never once for the line — which is why "the line is commissioned" was
 * never a true sentence, and why a program is one (asset, pack) cell. A cell
 * with no program at all is a hole you can see, on a new line and on one that
 * was signed off in 2024 alike.
 *
 * NOTHING IS TYPED THAT CAN BE DERIVED. No status field, no readiness flag, no
 * percentage anybody maintains. Every sentence on every screen and on the A3 is
 * read off these records, so it cannot flatter the job.
 */
import type { ID, MediaRef } from '../types';

/** Where the line itself is meant, rather than a machine on it. */
export const LINE_ITSELF = 'The line itself';

/** A blocks it running · B before handover · C cosmetic, follows.
 *
 *  The same three letters every punch list in the industry uses. They are what
 *  makes a list of complaints into a list of work. */
export type Severity = 'A' | 'B' | 'C';

export const SEVERITY_WHAT: Record<Severity, string> = {
  A: 'Stops it running',
  B: 'Before handover',
  C: 'Cosmetic — can follow',
};

/** n not started · w in progress · a at risk · r blocked/failed · g done.
 *  The same five letters the line walk uses, so a colour means one thing. */
export type ReadyState = 'n' | 'w' | 'a' | 'r' | 'g';

export const STATE_WORD: Record<ReadyState, string> = {
  n: 'not started', w: 'in progress', a: 'at risk', r: 'blocked', g: 'done',
};

/* ================================== ASSETS ==================================
 *
 * A machine on the line. Two today on Line 2; the whole point of this being a
 * record rather than a string is that the third one is a button, not a deploy.
 */

export type AssetState = 'awaited' | 'onSite' | 'installed' | 'running';

export const ASSET_STATE_WORD: Record<AssetState, string> = {
  awaited: 'Not here yet',
  onSite: 'On site',
  installed: 'Installed',
  running: 'Running',
};

export const ASSET_STATE_ORDER: AssetState[] = ['awaited', 'onSite', 'installed', 'running'];

/** A file the OEM sent — a FAT report, a film spec, an O&M manual.
 *
 *  The OEM will never log into this. Their paperwork still has to live where the
 *  work does, and open on a factory floor with no signal, so the bytes go in the
 *  same blob store as a snag photo and sync the same way. `name` exists because
 *  "document 3" is not a thing anybody can find later. */
export interface DocRef {
  id: ID;
  name: string;
  blobKey: string;
  mime: string;
  bytes?: number;
  savedAt: number;
  /** Set the first time somebody opens it. An unread FAT report is worth
   *  surfacing — it is usually where the caveats are. */
  readAt?: number;
}

export interface Asset {
  id: ID;
  projectId: ID;
  name: string;
  /** Who supplied it, for the conversation about whose job a fix is. */
  oem?: string;
  state: AssetState;
  /** When it landed on site, when it was installed. Plain ISO dates. */
  arrivedAt?: string;
  installedAt?: string;
  docs?: DocRef[];
  note?: string;
  sort: number;
  updatedAt: number;
  deletedAt?: number;
}

/* =================================== PACKS ==================================
 *
 * What the line has to run: "400g pack", "1kg catering". Named by the person
 * whose line it is, in their words, because a pack list that ships with the app
 * is a pack list that is wrong everywhere.
 */

export interface Pack {
  id: ID;
  projectId: ID;
  name: string;
  sort: number;
  updatedAt: number;
  deletedAt?: number;
}

/* =================================== ITEMS ==================================
 *
 * Five shapes, because there are five genuinely different things a claim can be
 * evidenced by, and flattening them cost two rebuilds. What is shared is what
 * every claim has: whose it is, when it is wanted, how badly it matters.
 */

export type CommissionKind = 'program' | 'material' | 'check' | 'punch' | 'task';

interface Base {
  id: ID;
  projectId: ID;
  /** Which machine. Absent means the line itself. */
  assetId?: ID;
  /** LEGACY. Before assets were records, this held a typed-in machine name.
   *  Read as a display fallback so nothing written on a phone before the
   *  rebuild loses the one thing it said about itself. Never written now. */
  asset?: string;
  /** Which pack this is about, for anything proved per pack. */
  packId?: ID;
  title: string;
  owner?: string;
  /** ISO date this is wanted by. */
  due?: string;
  /** How badly it matters, on every kind of item rather than only defects.
   *  A missing program stops the line as hard as a broken guard does. */
  grade?: Severity;
  note?: string;
  photos?: MediaRef[];
  /** Line-walk evidence this is proved by — ids only; the snag keeps its own
   *  lifecycle, so closing it on the walk closes it here. */
  snagIds?: ID[];
  sort: number;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

/* ---------- PROGRAM: this asset, this pack, at the agreed rate ---------- */

/** One attempt at rate. THE evidence a commissioning file is built on: we ran
 *  this for this long, on this material, and got this. */
export interface Run {
  id: ID;
  at: number;
  /** Who watched it. A rate nobody witnessed is a claim, not a result. */
  by?: string;
  minutes?: number;
  packs?: number;
  /** Achieved rate, in the same unit as the agreed rate. */
  achieved: number;
  /** Give-away waste as a percentage, when it was measured. */
  wastePct?: number;
  /** THE CONDITIONS. Which material spec this run was got on — the id of a
   *  material item. Absent means the result does not depend on a material at
   *  all, which is the honest state for an e-stop test and the wrong state for
   *  a rate. When the spec named here is superseded, this run stops counting. */
  provenOn?: ID;
  note?: string;
  photos?: MediaRef[];
}

export interface Program extends Base {
  kind: 'program';
  /** The contractual figure, agreed before the machine shipped. */
  agreedRate: number;
  /** Packs per minute unless somebody says otherwise. */
  rateUnit?: string;
  /** Has the recipe been written on the machine at all? False is MISSING — the
   *  OEM's job, and a different conversation from written-but-unproven. */
  written: boolean;
  runs?: Run[];
}

/* ---------- MATERIAL: what the line needs, and what replaces it ---------- */

export interface Material extends Base {
  kind: 'material';
  need: number;
  have: number;
  onOrder?: number;
  /** Rolls, cases, kg — whatever it is counted in. */
  unit?: string;
  /** The spec, when it matters: "40µ", "35µ modified". This is what a result is
   *  pinned to, so two rows of the same film are two different conditions. */
  spec?: string;
  /** THE TRANSITION. The material this one replaces. A changeover is not a
   *  top-up: the old stock may be plentiful and still be the wrong thing to
   *  prove anything on. One pointer turns a stock count into a transition, and
   *  every result got on the old spec into a re-run. */
  supersedes?: ID;
}

/* ---------- CHECK: a test with an agreed answer ---------- */

export interface Check extends Base {
  kind: 'check';
  /** What good looks like, agreed in advance. */
  criterion: string;
  result?: string;
  outcome: 'notRun' | 'pass' | 'fail';
  witnessedBy?: string;
  at?: number;
  /** Which material spec it was got on — see Run.provenOn. A seal test is
   *  film-sensitive; an e-stop test is not, and leaves this empty. */
  provenOn?: ID;
}

/* ---------- PUNCH: a defect ---------- */

export interface Punch extends Base {
  kind: 'punch';
  severity: Severity;
  raisedAt: number;
  closedAt?: number;
  /** Whose to fix — usually the OEM or us. */
  fixBy?: string;
}

/* ---------- TASK: the rest of the obligation ---------- */

export interface Task extends Base {
  kind: 'task';
  state: 'todo' | 'doing' | 'waiting' | 'done';
}

export type CommissionItem = Program | Material | Check | Punch | Task;

/* ================================ derived ================================= */

const todayISO = (): string => new Date().toISOString().slice(0, 10);
const late = (iso?: string): boolean => !!iso && iso < todayISO();

export const live = <T extends { deletedAt?: number }>(rows: T[]): T[] => rows.filter(r => !r.deletedAt);

/** How badly an item matters. Defects carry their grade as a required field;
 *  everything else may be graded or not. One accessor so the rest of the app
 *  never has to know which. */
export const gradeOf = (i: CommissionItem): Severity | undefined =>
  i.kind === 'punch' ? i.severity : i.grade;

const bestOf = (runs: Run[]): Run | undefined =>
  runs.reduce<Run | undefined>((b, r) => (!b || r.achieved > b.achieved ? r : b), undefined);

/** The runs whose conditions still hold — the ones that are still evidence. */
export const runsCounting = (p: Program, superseded: Set<ID>): Run[] =>
  (p.runs ?? []).filter(r => !staleOn(r.provenOn, superseded));

/** THE RUN THIS PROGRAM IS JUDGED ON.
 *
 *  The best of the runs that still count, and only if none of them do, the best
 *  run overall — so a row can still print what it once did while saying the
 *  spec has gone.
 *
 *  The first version of this simply took the highest number, which meant
 *  re-proving 61 ppm on the new film left the program reading "stale" because a
 *  withdrawn 66 ppm outranked it. A test caught it. Evidence first, then size:
 *  the biggest number on the page is not the same thing as the best evidence. */
export const bestRun = (p: Program, superseded: Set<ID> = new Set()): Run | undefined =>
  bestOf(runsCounting(p, superseded)) ?? bestOf(p.runs ?? []);

/* ---------------------------- the conditions rule --------------------------
 *
 * The whole film problem, in two functions. `supersededIds` asks the material
 * rows which specs have been replaced; `staleOn` asks one result whether it was
 * got on one of them. Nothing else in the app needs to know the rule, and the
 * day the new stock lands nobody has to go and mark anything.
 */

/** Every material id that something else now replaces. */
export function supersededIds(items: CommissionItem[]): Set<ID> {
  const out = new Set<ID>();
  for (const i of live(items)) if (i.kind === 'material' && i.supersedes) out.add(i.supersedes);
  return out;
}

/** Was this evidence got on a spec that has since been replaced? */
export const staleOn = (provenOn: ID | undefined, superseded: Set<ID>): boolean =>
  !!provenOn && superseded.has(provenOn);

/** Which material spec an item's evidence was got on, if any. */
export function provenOnOf(i: CommissionItem, superseded: Set<ID> = new Set()): ID | undefined {
  if (i.kind === 'program') return bestRun(i, superseded)?.provenOn;
  if (i.kind === 'check') return i.outcome === 'notRun' ? undefined : i.provenOn;
  return undefined;
}

/** Is this item's evidence no longer evidence? True only where there IS a
 *  result and it was got on a withdrawn spec — an unrun test is not stale, it
 *  is simply unrun, and calling those the same thing hides both. */
export const isStale = (i: CommissionItem, superseded: Set<ID>): boolean =>
  staleOn(provenOnOf(i, superseded), superseded);

/* ------------------------------ item statuses ----------------------------- */

export type ProgramStatus = 'missing' | 'untested' | 'below' | 'proven' | 'stale';

/** Where a program has got to.
 *
 *  `missing` is deliberately separate from `untested`: a program nobody has
 *  written is a different conversation, with a different person, than one that
 *  exists and has not been run. `stale` is separate from both: it ran, it was
 *  fine, and it proves nothing about the film this line is moving to. */
export function programStatus(p: Program, superseded: Set<ID> = new Set()): ProgramStatus {
  if (!p.written) return 'missing';
  if (!(p.runs ?? []).length) return 'untested';
  const best = bestOf(runsCounting(p, superseded));
  // It ran, and nothing it ran on is still the spec. That is not "below rate"
  // and it is certainly not "proven": it is a re-run nobody has done yet.
  if (!best) return 'stale';
  return best.achieved >= p.agreedRate ? 'proven' : 'below';
}

export type MaterialStatus = 'have' | 'awaited' | 'short' | 'late';

/** Have we got the stuff. `short` means nothing is even on order. */
export function materialStatus(m: Material): MaterialStatus {
  if (m.have >= m.need) return 'have';
  const coming = m.onOrder ?? 0;
  if (coming <= 0) return 'short';
  return late(m.due) ? 'late' : 'awaited';
}

export const isOpen = (p: Punch): boolean => p.closedAt == null;

/** One record's colour, whatever kind it is. */
export function stateOf(i: CommissionItem, superseded: Set<ID> = new Set()): ReadyState {
  switch (i.kind) {
    case 'program':
      return ({ missing: 'r', untested: 'n', below: 'a', proven: 'g', stale: 'a' } as const)[programStatus(i, superseded)];
    case 'material':
      return ({ have: 'g', awaited: 'w', short: 'a', late: 'r' } as const)[materialStatus(i)];
    case 'check':
      if (i.outcome === 'fail') return 'r';
      if (i.outcome === 'pass') return isStale(i, superseded) ? 'a' : 'g';
      return late(i.due) ? 'a' : 'n';
    case 'punch':
      return !isOpen(i) ? 'g' : i.severity === 'A' ? 'r' : i.severity === 'B' ? 'a' : 'w';
    case 'task':
      return i.state === 'done' ? 'g' : i.state === 'waiting' ? 'a'
        : i.state === 'doing' ? 'w' : late(i.due) ? 'a' : 'n';
  }
}

/** Is this claim true, and still true? What the counts and the bar are made of.
 *  A stale result is deliberately NOT done: that is the entire point of it. */
export const isSettled = (i: CommissionItem, superseded: Set<ID> = new Set()): boolean =>
  stateOf(i, superseded) === 'g';

/** What a row shows instead of a status word: "51 ppm against 60 agreed",
 *  "10 of 40 rolls here", "3 leaked". One line, in its own kind's terms. */
export function standsAt(i: CommissionItem, superseded: Set<ID> = new Set()): string {
  switch (i.kind) {
    case 'program': {
      const unit = i.rateUnit ?? 'ppm';
      if (!i.written) return `No program written · ${i.agreedRate} ${unit} agreed`;
      const best = bestRun(i, superseded);
      if (!best) return `Not run yet · ${i.agreedRate} ${unit} agreed`;
      return `${best.achieved} ${unit} against ${i.agreedRate} agreed`;
    }
    case 'material': {
      const unit = i.unit ? ' ' + i.unit : '';
      if (i.have >= i.need) return `All ${i.need}${unit} here`;
      const on = i.onOrder ?? 0;
      return `${i.have} of ${i.need}${unit} here` + (on > 0 ? `, ${on} on order` : ', nothing on order');
    }
    case 'check':
      return i.outcome === 'pass' ? `Passed${i.witnessedBy ? ` · witnessed by ${i.witnessedBy}` : ''}`
        : i.outcome === 'fail' ? `Failed${i.result ? ` · ${i.result}` : ''}`
          : `Not run${i.criterion ? ` · agreed: ${i.criterion}` : ''}`;
    case 'punch':
      return isOpen(i) ? `Defect, grade ${i.severity} · open` : `Defect, grade ${i.severity} · closed`;
    case 'task':
      return ({ todo: 'Not started', doing: 'In progress', waiting: 'Waiting on somebody', done: 'Done' } as const)[i.state];
  }
}

/** The conditions line, when there are any: "on 40µ old film — not proof".
 *  Undefined when the result does not depend on a material, which is a real
 *  answer and not a missing one. */
export function conditionOf(i: CommissionItem, materials: Material[], superseded: Set<ID>): string | undefined {
  const on = provenOnOf(i, superseded);
  if (!on) return undefined;
  const m = materials.find(x => x.id === on);
  if (!m) return undefined;
  const what = m.spec ? `${m.title}, ${m.spec}` : m.title;
  return staleOn(on, superseded) ? `on ${what} — withdrawn, not proof` : `on ${what}`;
}

/* ============================ THE ANSWER ITSELF ============================
 *
 * "Where are we now" is one question and it gets one answer, composed in one
 * place, so the phone, the desktop and the A3 can never disagree about it.
 */

export interface Blocker {
  /** What is in the way, in the words somebody would use in the meeting. */
  what: string;
  /** How badly. Undefined means nobody has graded it yet. */
  grade?: Severity;
  assetId?: ID;
  /** The record it came from, so a row can link straight to it. */
  id: ID;
  kind: CommissionKind;
}

export interface Counts {
  programs: { total: number; proven: number; below: number; untested: number; missing: number; stale: number };
  materials: { total: number; have: number; short: number; awaited: number; late: number };
  checks: { total: number; pass: number; fail: number; notRun: number };
  punch: { openA: number; openB: number; openC: number; closed: number };
  tasks: { total: number; done: number };
}

export interface Standing {
  /** Nothing is in the way. Never typed, and false for an empty job — a line
   *  with no claims recorded is not a line that is ready. */
  clear: boolean;
  /** Everything in the way, worst first. Read from the top in a meeting, which
   *  is why the order is the design and not an accident. */
  blockers: Blocker[];
  counts: Counts;
  /** Claims that are true, and how many there are in total. */
  done: number;
  total: number;
  pct: number;
  /** Results that were got on a spec since withdrawn. The film number. */
  stale: number;
  /** One paragraph, in plain words. The same sentence everywhere. */
  sentence: string;
}

const only = <K extends CommissionKind>(items: CommissionItem[], kind: K) =>
  items.filter((i): i is Extract<CommissionItem, { kind: K }> => i.kind === kind);

export const materialsOf = (items: CommissionItem[]): Material[] => only(live(items), 'material');

const plural = (n: number, one: string, many = one + 's'): string => `${n} ${n === 1 ? one : many}`;

/** Read the whole picture off the records.
 *
 *  Blocker order: an open A defect, then a failed test, then a program nobody
 *  has written, then material that is short or late, then a result that no
 *  longer counts, then short of rate, then the merely unrun. Whatever is at the
 *  bottom of this list does not get said in the meeting, so the order matters
 *  more than it looks. */
export function standing(items: CommissionItem[]): Standing {
  const rows = live(items);
  const superseded = supersededIds(rows);
  const programs = only(rows, 'program');
  const materials = only(rows, 'material');
  const checks = only(rows, 'check');
  const punch = only(rows, 'punch');
  const tasks = only(rows, 'task');

  const ps = { total: programs.length, proven: 0, below: 0, untested: 0, missing: 0, stale: 0 };
  for (const p of programs) ps[programStatus(p, superseded)]++;

  const ms = { total: materials.length, have: 0, short: 0, awaited: 0, late: 0 };
  for (const m of materials) ms[materialStatus(m)]++;

  const cs = { total: checks.length, pass: 0, fail: 0, notRun: 0 };
  for (const c of checks) cs[c.outcome === 'pass' ? 'pass' : c.outcome === 'fail' ? 'fail' : 'notRun']++;

  const open = punch.filter(isOpen);
  const pu = {
    openA: open.filter(p => p.severity === 'A').length,
    openB: open.filter(p => p.severity === 'B').length,
    openC: open.filter(p => p.severity === 'C').length,
    closed: punch.length - open.length,
  };

  const ts = { total: tasks.length, done: tasks.filter(t => t.state === 'done').length };

  const b = (what: string, i: CommissionItem): Blocker =>
    ({ what, grade: gradeOf(i), assetId: i.assetId, id: i.id, kind: i.kind });

  const blockers: Blocker[] = [
    ...open.filter(p => p.severity === 'A').map(p => b(`Grade A defect open: ${p.title}`, p)),
    ...checks.filter(c => c.outcome === 'fail').map(c => b(`Failed: ${c.title}${c.result ? ` — ${c.result}` : ''}`, c)),
    ...programs.filter(p => programStatus(p, superseded) === 'missing').map(p => b(`No program written — ${p.title}`, p)),
    ...materials.filter(m => ['late', 'short'].includes(materialStatus(m)))
      .map(m => b(`${m.title}: ${standsAt(m, superseded)}`, m)),
    ...programs.filter(p => programStatus(p, superseded) === 'stale')
      .map(p => b(`${p.title} needs re-proving — its result was got on a withdrawn spec`, p)),
    ...checks.filter(c => c.outcome === 'pass' && isStale(c, superseded))
      .map(c => b(`${c.title} needs re-testing — its result was got on a withdrawn spec`, c)),
    ...programs.filter(p => programStatus(p, superseded) === 'below')
      .map(p => b(`${p.title} short of rate — ${standsAt(p, superseded)}`, p)),
    ...open.filter(p => p.severity === 'B').map(p => b(`Grade B defect open: ${p.title}`, p)),
    ...programs.filter(p => programStatus(p, superseded) === 'untested').map(p => b(`${p.title} not run yet`, p)),
    ...checks.filter(c => c.outcome === 'notRun').map(c => b(`Not run: ${c.title}`, c)),
    ...tasks.filter(t => t.state !== 'done').map(t => b(t.title, t)),
  ];

  const done = rows.filter(i => isSettled(i, superseded)).length;
  const stale = rows.filter(i => isStale(i, superseded)).length;

  return {
    clear: rows.length > 0 && blockers.length === 0,
    blockers,
    counts: { programs: ps, materials: ms, checks: cs, punch: pu, tasks: ts },
    done,
    total: rows.length,
    pct: rows.length ? done / rows.length : 0,
    stale,
    sentence: sentenceFor(rows, { ps, ms, pu, done, stale, superseded }),
  };
}

interface SentenceInput {
  ps: Counts['programs'];
  ms: Counts['materials'];
  pu: Counts['punch'];
  done: number;
  stale: number;
  superseded: Set<ID>;
}

/** The paragraph at the top of every surface.
 *
 *  Written as a sentence rather than a row of tiles on purpose: a tile says
 *  "6" and a sentence says "6 proofs don't count for the film we're moving to",
 *  and only one of those can be read out loud in a meeting. */
function sentenceFor(rows: CommissionItem[], { ps, ms, pu, done, stale }: SentenceInput): string {
  if (!rows.length) return 'Nothing recorded yet. Add the assets, then what each one has to prove.';

  const parts: string[] = [];
  if (pu.openA) parts.push(`${plural(pu.openA, 'grade A defect')} open`);
  if (ms.short || ms.late) parts.push(`${plural(ms.short + ms.late, 'material')} not here`);
  if (ps.missing) parts.push(`${plural(ps.missing, 'program')} never written`);
  if (stale) parts.push(`${plural(stale, 'proof')} got on a withdrawn spec`);
  if (ps.below) parts.push(`${plural(ps.below, 'pack')} short of rate`);
  if (pu.openB) parts.push(`${plural(pu.openB, 'grade B defect')} open`);

  const tally = `${done} of ${rows.length} done.`;
  if (!parts.length) return `Nothing in the way. ${tally}`;

  const list = parts.length === 1 ? parts[0]
    : parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
  // "1 grade A defect open IS in the way"; anything else is plural.
  const verb = parts.length === 1 && /^1 /.test(parts[0]) ? 'is' : 'are';
  return `${list[0].toUpperCase()}${list.slice(1)} ${verb} in the way. ${tally}`;
}

/* ============================== BY ASSET ==================================== */

export interface AssetGroup {
  asset?: Asset;
  /** The heading, whether or not there is an asset record behind it. */
  name: string;
  items: CommissionItem[];
  open: number;
  done: number;
  stale: number;
}

/** The work grouped by machine, with the line itself last. A single project
 *  percentage cannot say "the checkweigher is proved and the wrapper is on the
 *  wrong film", which is the sentence somebody actually wants. */
export function byAsset(assets: Asset[], items: CommissionItem[]): AssetGroup[] {
  const rows = live(items);
  const superseded = supersededIds(rows);
  const named = live(assets).slice().sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));

  const group = (name: string, mine: CommissionItem[], asset?: Asset): AssetGroup => ({
    asset,
    name,
    items: mine.slice().sort((a, b) => a.sort - b.sort),
    open: mine.filter(i => !isSettled(i, superseded)).length,
    done: mine.filter(i => isSettled(i, superseded)).length,
    stale: mine.filter(i => isStale(i, superseded)).length,
  });

  const out = named.map(a => group(a.name, rows.filter(i => i.assetId === a.id), a));

  const ids = new Set(named.map(a => a.id));
  const orphans = rows.filter(i => !i.assetId || !ids.has(i.assetId));
  if (orphans.length) {
    /* Anything whose asset was deleted, or that was typed in before assets were
     * records, belongs to the line. It is never silently dropped: a row nobody
     * can see is worse than a row in the wrong place. */
    const legacy = [...new Set(orphans.map(i => i.asset).filter((n): n is string => !!n))];
    out.push(group(legacy.length === 1 ? legacy[0] : LINE_ITSELF, orphans));
  }
  return out;
}

/* =============================== THE GRID ==================================
 *
 * Every asset against every pack. On a line being commissioned it is the test
 * plan; on one signed off two years ago it is the gap register, and it is the
 * only way "I think we're missing some programs" becomes a list.
 */

/** `na` — this asset does not run that pack, and no claim is implied. Distinct
 *  from `missing`, which is a program that ought to exist and does not. Getting
 *  those two confused is what makes a matrix useless. */
export type Cell = 'na' | ProgramStatus;

export interface GridCell {
  assetId: ID;
  packId: ID;
  cell: Cell;
  program?: Program;
}

export interface Grid {
  assets: Asset[];
  packs: Pack[];
  cells: GridCell[];
  at: (assetId: ID, packId: ID) => GridCell;
  /** Programs that ought to exist and do not. The number worth shouting. */
  holes: number;
}

export function grid(assets: Asset[], packs: Pack[], items: CommissionItem[]): Grid {
  const rows = live(items);
  const superseded = supersededIds(rows);
  const programs = only(rows, 'program');
  const as = live(assets).slice().sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
  const ps = live(packs).slice().sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));

  const cells: GridCell[] = [];
  for (const a of as) {
    for (const p of ps) {
      const program = programs.find(x => x.assetId === a.id && x.packId === p.id);
      cells.push({ assetId: a.id, packId: p.id, program, cell: program ? programStatus(program, superseded) : 'na' });
    }
  }

  const index = new Map(cells.map(c => [c.assetId + '\u0000' + c.packId, c]));
  return {
    assets: as,
    packs: ps,
    cells,
    at: (assetId, packId) => index.get(assetId + '\u0000' + packId) ?? { assetId, packId, cell: 'na' },
    holes: cells.filter(c => c.cell === 'missing').length,
  };
}

export const CELL_WORD: Record<Cell, string> = {
  na: '—',
  missing: 'no program',
  untested: 'not run',
  below: 'short of rate',
  proven: 'proved',
  stale: 'needs re-proving',
};

/* ============================ THE TRANSITIONS ==============================
 *
 * A material that replaces another one, and the cost of it: exactly which
 * results stop counting the day the new stock lands. This is the screen the film
 * problem needed, and it is four lines of logic because the rule lives on the
 * records rather than in a screen.
 */

export interface Transition {
  /** What we are moving to. */
  to: Material;
  /** What it replaces, when that row still exists. */
  from?: Material;
  /** Results that were got on the old spec and now need doing again. */
  invalidated: CommissionItem[];
  /** How much of the new spec has landed, 0–1. */
  landed: number;
}

export function transitions(items: CommissionItem[]): Transition[] {
  const rows = live(items);
  const materials = only(rows, 'material');
  const superseded = supersededIds(rows);
  return materials
    .filter(m => m.supersedes)
    .map(to => ({
      to,
      from: materials.find(m => m.id === to.supersedes),
      invalidated: rows.filter(i => isStale(i, superseded) && provenOnOf(i, superseded) === to.supersedes),
      landed: to.need > 0 ? Math.min(1, to.have / to.need) : 0,
    }));
}

/* ============================== small helpers ============================== */

const DAY = 86_400_000;

/** Whole days between two ISO dates, positive when `b` is later. */
export function daysBetween(a?: string, b?: string): number | undefined {
  if (!a || !b) return undefined;
  const x = Date.parse(a), y = Date.parse(b);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
  return Math.round((y - x) / DAY);
}

/** Weeks from today to an ISO date, for "— 5 weeks". Negative is overdue. */
export function weeksTo(iso?: string, today = new Date()): number | undefined {
  const d = daysBetween(today.toISOString().slice(0, 10), iso);
  return d === undefined ? undefined : Math.round(d / 7);
}

/** A sort key between two rows, so one can be inserted without renumbering the
 *  world. Fractional on purpose. */
export function sortBetween(rows: { sort: number }[], afterSort?: number): number {
  const sorted = rows.map(r => r.sort).sort((a, b) => a - b);
  if (afterSort === undefined) return (sorted[0] ?? 1) - 1;
  const next = sorted.find(s => s > afterSort);
  return next === undefined ? afterSort + 1 : (afterSort + next) / 2;
}

/** SOMETHING A MACHINE MIGHT HAVE TO PROVE.
 *
 *  A suggestion, never a default. The cut before this one put four of these on
 *  every new machine automatically and called it a starting point, which is the
 *  same mistake as the six stages and the five gates before them: deciding
 *  somebody else's process for them and making them delete the half that does
 *  not apply. A checkweigher has no seal integrity and a wrapper has no weight
 *  accuracy.
 *
 *  So nothing is ever added by the app. This is a list to PICK from, every entry
 *  is editable once it is on the machine, and typing your own is always the
 *  shortest route to a claim this list has never heard of. */
export interface Suggestion {
  title: string;
  criterion: string;
}

export interface SuggestionGroup {
  /** The question the group answers, in the words of the job. */
  name: string;
  items: Suggestion[];
}

/** The library, grouped the way an acceptance is actually argued.
 *
 *  Drawn from how commissioning is run rather than invented here: the safety and
 *  guarding checks that gate any product going through, the running behaviour an
 *  OEM is held to, the quality checks a food site cannot start without, the
 *  hygiene clearance that comes before first product, and the paperwork that
 *  holds up a handover exactly as hard as a broken guard does. */
export const SUGGESTED_CHECKS: SuggestionGroup[] = [
  {
    name: 'Safe to run',
    items: [
      { title: 'Emergency stops', criterion: 'Every e-stop halts the machine inside 2 seconds' },
      { title: 'Guarding and interlocks', criterion: 'All guards fitted, interlocks proved, nothing defeatable' },
      { title: 'Lock-off (LOTO)', criterion: 'Every energy source isolates and locks off, points labelled' },
      { title: 'Noise at the operator position', criterion: 'Inside the agreed dB(A) at full rate' },
      { title: 'Guard-open restart', criterion: 'Opening a guard mid-run stops it and needs a deliberate restart' },
    ],
  },
  {
    name: 'Runs the way it was sold',
    items: [
      { title: 'Changeover time', criterion: 'Agreed changeover achieved by our own people, twice' },
      { title: 'Start-up and shutdown', criterion: 'Starts, runs and stops to the agreed sequence with no manual help' },
      { title: 'Micro-stops over a full run', criterion: 'Under the agreed number of stops across an uninterrupted run' },
      { title: 'Waste and giveaway', criterion: 'Within the agreed percentage over a measured run' },
      { title: 'Runs unattended between interventions', criterion: 'The agreed minutes with nobody touching it' },
    ],
  },
  {
    name: 'Makes good product',
    items: [
      { title: 'Seal integrity', criterion: '0 leaks in 20, tested off the running machine' },
      { title: 'Weight accuracy', criterion: 'Within the agreed tolerance over 200 packs' },
      { title: 'Metal detection', criterion: 'Rejects the agreed test pieces at full rate' },
      { title: 'X-ray / foreign body', criterion: 'Rejects the agreed test pieces at full rate' },
      { title: 'Date code and label accuracy', criterion: 'Right code, right place, readable, on every pack checked' },
      { title: 'Reject verification', criterion: 'A rejected pack actually leaves the line, and it is recorded' },
      { title: 'Pack presentation', criterion: 'Meets the agreed standard sample at full rate' },
    ],
  },
  {
    name: 'Clean and safe to eat',
    items: [
      { title: 'Clean-down time', criterion: 'Strip, clean and rebuild inside the agreed time' },
      { title: 'Swabs clear after a full clean', criterion: 'Food-contact surfaces clear on the agreed test' },
      { title: 'Allergen changeover', criterion: 'The agreed clean between allergens proves clear' },
      { title: 'CIP coverage', criterion: 'Every food-contact surface is actually reached' },
      { title: 'Drainage and standing water', criterion: 'No standing water anywhere after a wash' },
    ],
  },
  {
    name: 'Ours to run',
    items: [
      { title: 'Operators trained', criterion: 'Named operators signed off on running it and changing it over' },
      { title: 'Engineers trained', criterion: 'Named engineers signed off on maintaining and fault-finding it' },
      { title: 'Spares list agreed and on site', criterion: 'The critical spares list agreed, ordered and racked' },
      { title: 'O&M manuals received', criterion: 'Operating and maintenance manuals, as-built, in our hands' },
      { title: 'CE/UKCA file received', criterion: 'Declaration of conformity and the technical file received' },
      { title: 'Maintenance schedule loaded', criterion: 'Planned maintenance written into the system with intervals' },
    ],
  },
];

/** Every suggestion, flat — for counting, and for asking whether a machine
 *  already has one so the picker never offers a duplicate. */
export const ALL_SUGGESTIONS: Suggestion[] = SUGGESTED_CHECKS.flatMap(g => g.items);
