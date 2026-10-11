/* A SHIFT'S LOSSES, BY HAND — and what they cost (docs/TOOLKIT.md, Part 4,
 * tool 7; docs/BUILD.md, E; the worked example in docs/LEAN40.md's appendix).
 *
 * The question: of what the line should have made this shift, where did the
 * rest go — and how much do we not yet know? Rowland, 10 October: "This is
 * about manual inputs. This is about industrial engineering." So the facts
 * are two counts at the end of the shift (packs made, rejects), the planned
 * minutes, the rate — and the stops the floor already timed in Capture
 * through the shift. Nothing reads a machine, and there is no OEE: minutes
 * and pounds, never a percentage score.
 *
 * FACTS → FIGURES → READING → VERDICT. Pure: the count, the stops in its
 * window and the line's cost model in; the figures and the sentence out.
 *
 *   expected      = planned minutes × rate
 *   lost minutes  = (expected − made) ÷ rate
 *   explained     = the stops by cause + the changeovers + rejects ÷ rate
 *   not yet explained = lost − explained, never below zero
 *
 * THE HONESTY RULES, as this tool keeps them:
 *   enough?        the planned minutes, the packs made and a rate — until
 *                  all three are in it is "not yet counted", not a number
 *   how known      every number says how: the window from the shift, the
 *                  packs counted, the rate from the standard or typed, the
 *                  stops timed in Capture; the part not yet explained is
 *                  exactly that — what nobody has logged
 *   what it does   slow running is not a bar of its own: nobody measured it,
 *   not claim      so it sits inside "not yet explained" and the sentence
 *                  says so; stops that exceed the loss are said, not hidden
 *                  ("check the counts"); pounds only when the line has a
 *                  cost model, else simply not said
 *   people decide  the biggest bars are offered to the fishbone as
 *                  suggestions; a person puts them on a bone */
import type { Observation, Workspace } from '../../types';
import type { LossCount } from '../study';
import type { SixM } from '../sixm';
import { boneOfStop } from '../sixm';
import { costPerHour } from '../cost';
import type { Tone } from './sample';

const DAY = 86_400_000;

/** A changeover is a stop logged under the changeover category — Capture's
 *  taxonomy ships it as "Changeover" (lib/taxonomy). */
export const isChangeover = (o: Pick<Observation, 'category'>): boolean => /change\s*-?\s*over/i.test(o.category ?? '');

/** The line's stops in the window: live rows that started inside it. */
export function inWindow(obs: Observation[], from: number, to: number, workspaceId?: string): Observation[] {
  return obs.filter(o => o.deletedAt == null && (!workspaceId || o.workspaceId === workspaceId) && o.startedAt >= from && o.startedAt < to);
}

const stopsOf = (o: Observation) => Math.max(1, o.count || 1);
const minsOf = (o: Observation) => (o.durationMs > 0 ? o.durationMs / 60_000 : 0);

/** What the line's cost model is read from — a workspace, or nothing. */
export type CostModel = Pick<Workspace, 'crew' | 'labourRatePerHour' | 'labourBurden' | 'packsPerMin' | 'marginPerPack'>;

/** One bar of the waterfall: a cause (stops under one category), the
 *  changeovers, the rejects, or the part not yet explained. */
export interface LossBar {
  /** "cause:Breakdown" · "changeover" · "rejects" · "unexplained" — what a
   *  record raised from the bar names (StudyUse.step). */
  key: string;
  kind: 'cause' | 'changeover' | 'rejects' | 'unexplained';
  /** The floor's words: the category, "Changeovers", "Rejects", "Not yet explained". */
  label: string;
  min: number;
  /** Stops under it — a batch counts its count. */
  stops?: number;
  /** The machine carrying most of its minutes, when the stops name one. */
  asset?: string;
  /** The bone it most likely belongs on: the floor's own taps when it gave
   *  them (Observation.causeM), else the category's usual bone (lib/sixm). */
  bone: SixM;
  /** How it is known: timed on the stopwatch, typed, counted (the rejects),
   *  or not known at all (the part nobody logged). */
  grade: 'measured' | 'typed' | 'counted' | 'none';
  pounds?: number;
  /** Packs — the rejects. */
  packs?: number;
}

export interface LossFigures {
  /** Planned minutes, packs made and a rate are all in. */
  enough: boolean;
  /** What is still to put in, in words. */
  missing: string[];
  plannedMin?: number;
  rate?: number;
  made?: number;
  rejects: number;
  expected?: number;
  /** Packs short of expected (0 when more were made). */
  shortPacks?: number;
  /** Packs made over what was expected — the rate or the count wants checking. */
  overPacks?: number;
  lostMin?: number;
  /** Whether the stops were given: without them the split is unknown. */
  split: boolean;
  /** Stops in the window, every category: how many rows, how many stops. */
  logged: number;
  stopsN: number;
  /** Minutes of stops that are not changeovers. */
  stopsMin: number;
  byCause: LossBar[];
  changeoverMin: number;
  changeoverN: number;
  rejectsMin?: number;
  explainedMin: number;
  /** lost − explained, never below zero. */
  unexplainedMin?: number;
  /** explained − lost, when the stops logged exceed the loss. */
  excessMin?: number;
  /** unexplained ÷ lost. */
  unexplainedShare?: number;
  /** £ an hour the line loses stopped (lib/cost); absent when the line has no cost model. */
  costPerHour?: number;
  /** The waterfall, in order: the causes (biggest first), the changeovers,
   *  the rejects, the part not yet explained. Only bars with something in them. */
  bars: LossBar[];
}

const whole = (n: number) => Math.round(n);

/** £ for minutes lost, when the line has a cost model. */
export const poundsOf = (min: number, perHour?: number): number | undefined => (perHour && perHour > 0 ? (min / 60) * perHour : undefined);

/** The bone a group of stops most likely sits on: the floor's taps carry the
 *  minutes they were given; else the category's usual bone (lib/sixm
 *  boneOfStop), weighed by minutes — a stop with no time weighs one minute,
 *  so a bar of count-only stops still finds a bone. */
function boneOf(rows: Observation[]): SixM {
  const weigh = (of: (o: Observation) => SixM | undefined) => {
    const w = new Map<SixM, number>();
    for (const o of rows) { const m = of(o); if (m) w.set(m, (w.get(m) ?? 0) + Math.max(1, minsOf(o))); }
    return [...w.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  };
  return weigh(o => o.causeM) ?? weigh(o => boneOfStop(o.category, o.subcategory, o.note)) ?? 'machine';
}

/** The machine carrying most of a group's minutes, when any names one. */
function assetOf(rows: Observation[]): string | undefined {
  const w = new Map<string, number>();
  for (const o of rows) { const a = (o.asset ?? '').trim(); if (a) w.set(a, (w.get(a) ?? 0) + Math.max(1, minsOf(o))); }
  return [...w.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

const gradeOf = (rows: Observation[]): LossBar['grade'] => (rows.every(o => o.timing === 'stopwatch') ? 'measured' : 'typed');

/** The figures, from the count, the stops in its window and the line's cost
 *  model. `obs` undefined: the stops were not given (a list, a card) — the
 *  loss is worked out, the split is not. */
export function lossFigures(count: LossCount | undefined, obs?: Observation[], cost?: CostModel): LossFigures {
  const planned = count?.plannedMin !== undefined && count.plannedMin > 0 ? count.plannedMin : undefined;
  const rate = count?.ratePerMin !== undefined && count.ratePerMin > 0 ? count.ratePerMin : undefined;
  const made = count?.made !== undefined && count.made >= 0 ? count.made : undefined;
  const rejects = count?.rejects !== undefined && count.rejects > 0 ? count.rejects : 0;
  const missing = [...(planned === undefined ? ['the planned minutes'] : []), ...(made === undefined ? ['the packs made'] : []), ...(rate === undefined ? ['the rate a minute'] : [])];
  const perHour = cost ? costPerHour(cost) : 0;
  const money = (min: number) => poundsOf(min, perHour);

  /* the stops in the window, by cause — the changeovers their own bar */
  const rows = obs ? inWindow(obs, count?.from ?? -Infinity, count?.to ?? Infinity) : [];
  const groups = new Map<string, Observation[]>();
  const co: Observation[] = [];
  for (const o of rows) {
    if (isChangeover(o)) { co.push(o); continue; }
    const k = (o.category || 'Uncategorised').trim();
    groups.set(k, [...(groups.get(k) ?? []), o]);
  }
  const sum = (xs: Observation[], f: (o: Observation) => number) => xs.reduce((n, o) => n + f(o), 0);
  const byCause: LossBar[] = [...groups.entries()].map(([label, g]): LossBar => {
    const min = sum(g, minsOf), asset = assetOf(g);
    return { key: `cause:${label}`, kind: 'cause', label, min, stops: sum(g, stopsOf), ...(asset ? { asset } : {}), bone: boneOf(g), grade: gradeOf(g), ...(money(min) !== undefined ? { pounds: money(min) } : {}) };
  }).sort((a, b) => b.min - a.min || (b.stops ?? 0) - (a.stops ?? 0) || a.label.localeCompare(b.label));
  const stopsMin = byCause.reduce((n, b) => n + b.min, 0);
  const changeoverMin = sum(co, minsOf), changeoverN = sum(co, stopsOf);

  const base: LossFigures = {
    enough: !missing.length, missing, ...(planned !== undefined ? { plannedMin: planned } : {}), ...(rate !== undefined ? { rate } : {}), ...(made !== undefined ? { made } : {}),
    rejects, split: !!obs, logged: rows.length, stopsN: sum(rows.filter(o => !isChangeover(o)), stopsOf), stopsMin, byCause, changeoverMin, changeoverN,
    explainedMin: 0, ...(perHour > 0 ? { costPerHour: perHour } : {}), bars: [],
  };
  if (planned === undefined || rate === undefined || made === undefined) return base;

  const expected = planned * rate;
  const shortPacks = Math.max(0, expected - made);
  const overPacks = Math.max(0, made - expected);
  const lostMin = shortPacks / rate;
  const rejectsMin = rejects / rate;
  const explained = stopsMin + changeoverMin + rejectsMin;
  const unexplained = Math.max(0, lostMin - explained);
  const excess = Math.max(0, explained - lostMin);
  const bars: LossBar[] = [
    ...byCause.filter(b => b.min > 0 || (b.stops ?? 0) > 0),
    ...(changeoverN > 0 ? [{ key: 'changeover', kind: 'changeover' as const, label: 'Changeovers', min: changeoverMin, stops: changeoverN, ...(assetOf(co) ? { asset: assetOf(co) } : {}), bone: boneOf(co), grade: gradeOf(co), ...(money(changeoverMin) !== undefined ? { pounds: money(changeoverMin) } : {}) }] : []),
    ...(rejects > 0 ? [{ key: 'rejects', kind: 'rejects' as const, label: 'Rejects', min: rejectsMin, packs: rejects, bone: boneOfStop('Quality'), grade: 'counted' as const, ...(money(rejectsMin) !== undefined ? { pounds: money(rejectsMin) } : {}) }] : []),
    ...(obs && unexplained > 0.5 ? [{ key: 'unexplained', kind: 'unexplained' as const, label: 'Not yet explained', min: unexplained, bone: 'measurement' as const, grade: 'none' as const, ...(money(unexplained) !== undefined ? { pounds: money(unexplained) } : {}) }] : []),
  ];
  return {
    ...base, expected, shortPacks, ...(overPacks > 0 ? { overPacks } : {}), lostMin, rejectsMin, explainedMin: explained,
    ...(obs ? { unexplainedMin: unexplained, ...(excess > 0 ? { excessMin: excess } : {}), ...(lostMin > 0 ? { unexplainedShare: unexplained / lostMin } : {}) } : {}),
    bars,
  };
}

/* ------------------------------------------------------------------ the words */

/** A rate as the floor says it: "100 a minute", "58.4 a minute". */
export const rateWords = (r: number): string => `${Number.isInteger(r) ? r : r.toFixed(1)} a minute`;
/** Packs with their thousands: "45,000". */
export const packs = (n: number): string => whole(n).toLocaleString('en-GB');
/** Whole pounds: "£3,600" (docs/TOOLKIT.md 3.4). */
export const gbp = (n: number): string => `£${whole(n).toLocaleString('en-GB')}`;
const inGbp = (n?: number) => (n !== undefined ? ` (${gbp(n)})` : '');
/** Whole minutes: "85 min". */
export const minWords = (m: number): string => `${whole(m)} min`;

/** The shift as the sentence names it. */
export const shiftWords = (c?: Pick<LossCount, 'shift'>): string => c?.shift?.trim() || 'The shift';

/** The day a count's shift started, relative to now — "today", "yesterday",
 *  else the day: "Fri 10 Oct". */
export function dayWords(from: number, now = Date.now()): string {
  const d0 = new Date(from); d0.setHours(0, 0, 0, 0);
  const n0 = new Date(now); n0.setHours(0, 0, 0, 0);
  const days = Math.round((n0.getTime() - d0.getTime()) / DAY);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return new Date(from).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** "06:00–14:00" */
export const windowWords = (c: Pick<LossCount, 'from' | 'to'>): string => {
  const hm = (ms: number) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${hm(c.from)}–${hm(c.to)}`;
};

/** The unexplained part is abnormal when it is more than a tenth of the loss. */
export const UNEXPLAINED_TENTH = 0.1;

export interface LossSays { text: string; tone: Tone; verdict: string; lines: { text: string; tone: Tone }[] }

/** What the count says — the one sentence, then the lines under it: how
 *  each number is known, and what wants checking. */
export function lossSays(f: LossFigures, c?: LossCount, o: { product?: string } = {}): LossSays {
  const who = shiftWords(c);
  if (!f.enough) {
    return { text: `Count the shift: ${f.missing.join(', ')} still to put in — then the waterfall draws itself from the stops already timed.`, tone: 'n', verdict: 'Not yet counted', lines: [] };
  }
  const lost = f.lostMin ?? 0, rate = f.rate ?? 0;
  const head = `${who} should have made ${packs(f.expected ?? 0)} at ${rateWords(rate)}; made ${packs(f.made ?? 0)}`;
  const lines: LossSays['lines'] = [];
  const known: string[] = [];
  if (c) known.push(`${c.plannedMin !== undefined && c.plannedMin > 0 ? `${whole(c.plannedMin)} planned minutes` : 'the planned minutes'}${c.shift ? ` from ${c.shift}'s window (${windowWords(c)})` : ` in a window typed by hand (${windowWords(c)})`}`);
  known.push('the packs made and the rejects counted');
  if (c?.rateFrom === 'standard') known.push(`the rate from the line standard${o.product ? ` for ${o.product}` : ''}`);
  else known.push('the rate typed');
  if (f.split) known.push(f.logged ? `${f.logged} stop${f.logged === 1 ? '' : 's'} timed in Capture in the window` : 'no stops logged in the window');

  if (f.overPacks && f.overPacks > 0) {
    lines.push({ text: `Made ${packs(f.overPacks)} more than expected at ${rateWords(rate)} — check the rate or the count.`, tone: 'a' });
    lines.push({ text: `How known: ${known.join(' · ')}.`, tone: 'n' });
    return { text: `${head} — nothing lost against the rate.`, tone: 'a', verdict: 'Nothing lost', lines };
  }
  if (!f.split) {
    lines.push({ text: `How known: ${known.join(' · ')}.`, tone: 'n' });
    return { text: `${head} — ${minWords(lost)} lost${inGbp(poundsOf(lost, f.costPerHour))}. Where it went is read from the line's stops in the window.`, tone: 'n', verdict: `${minWords(lost)} lost`, lines };
  }
  const unex = f.unexplainedMin ?? 0;
  const parts = [
    `${minWords(f.stopsMin)} of stops`,
    ...(f.changeoverN > 0 ? [`${minWords(f.changeoverMin)} of changeovers`] : []),
    f.rejects > 0 ? `${minWords(f.rejectsMin ?? 0)} of rejects (${packs(f.rejects)} packs)` : 'no rejects',
    ...(f.excessMin && f.excessMin > 0 ? [] : [unex > 0.5 ? `${minWords(unex)} not yet explained${inGbp(poundsOf(unex, f.costPerHour))}` : 'all of it explained']),
  ];
  const text = `${head} — ${minWords(lost)} lost${inGbp(poundsOf(lost, f.costPerHour))}: ${parts.join(' · ')}.`;
  if (f.excessMin && f.excessMin > 0.5) lines.push({ text: `Stops logged exceed the loss by ${minWords(f.excessMin)} — check the counts.`, tone: 'a' });
  if (lost > 0 && !f.logged) lines.push({ text: 'No stops logged in the window — the Pareto is empty for this shift.', tone: 'n' });
  if (unex > 0.5) lines.push({ text: 'Not yet explained is what nobody logged — stops missed, and running slow, which is not measured by hand.', tone: 'n' });
  lines.push({ text: `How known: ${known.join(' · ')}.`, tone: 'n' });
  const amber = (f.unexplainedShare ?? 0) > UNEXPLAINED_TENTH && unex > 0.5;
  const tone: Tone = amber || (f.excessMin ?? 0) > 0.5 ? 'a' : 'n';
  const verdict = lost <= 0 ? 'Nothing lost' : amber ? `${minWords(unex)} not yet explained` : `${minWords(lost)} lost`;
  return { text, tone, verdict, lines };
}

/** A bar in its own words — the figure a fix or a countermeasure is raised
 *  with: "Breakdown on the Bagger — 32 min of stops this shift (£168)". */
export function barWords(b: LossBar, c?: LossCount, now?: number): string {
  const when = c ? ` on ${shiftWords(c)}, ${dayWords(c.from, now)}` : ' this shift';
  const at = b.asset ? ` on the ${b.asset}` : '';
  switch (b.kind) {
    case 'cause': return `${b.label}${at} — ${minWords(b.min)} of stops (${b.stops ?? 0} stop${b.stops === 1 ? '' : 's'})${when}${inGbp(b.pounds)}`;
    case 'changeover': return `Changeovers${at} — ${minWords(b.min)} (${b.stops ?? 0})${when}${inGbp(b.pounds)}`;
    case 'rejects': return `Rejects — ${packs(b.packs ?? 0)} packs, ${minWords(b.min)} at the rate${when}${inGbp(b.pounds)}`;
    default: return `${minWords(b.min)} not yet explained${when}${inGbp(b.pounds)} — stops not logged, or running slow`;
  }
}

/** What a countermeasure raised from a bar should change — said before it is
 *  done, held against the next shift's count. */
export function barExpect(b: LossBar): string {
  if (b.kind === 'unexplained') return 'Every stop logged on the next shift counted — the part not yet explained down';
  return `${b.label}${b.asset ? ` on the ${b.asset}` : ''}: ${minWords(b.min)} a shift — fewer on the next shift counted`;
}

/* ------------------------------------------------------------- before → after */

/** BEFORE → AFTER on two counts of the same shift: lost minutes and the
 *  part not yet explained — and first, when the fix was raised from a bar,
 *  that bar. It says "the number moved", never "the fix did it". */
export function compareLosses(before: LossFigures, after: LossFigures, bar?: string): { text: string; tone: Tone } {
  if (!before.enough || !after.enough) return { text: 'Too early — the next shift is not counted yet.', tone: 'n' };
  const b = before.lostMin ?? 0, a = after.lostMin ?? 0;
  const parts: string[] = [];
  if (bar) {
    const x = before.bars.find(y => y.key === bar), y = after.bars.find(z => z.key === bar);
    const label = x?.label ?? y?.label;
    if (label) parts.push(`${label}${x?.asset ? ` on the ${x.asset}` : ''}: ${minWords(x?.min ?? 0)} → ${minWords(y?.min ?? 0)}`);
  }
  parts.push(whole(a) === whole(b) ? `Lost ${minWords(b)} a shift, no change` : `Lost ${minWords(b)} → ${minWords(a)} a shift`);
  if (before.split && after.split) {
    const ub = before.unexplainedMin ?? 0, ua = after.unexplainedMin ?? 0;
    parts.push(whole(ub) === whole(ua) ? `not yet explained ${minWords(ub)}, no change` : `not yet explained ${minWords(ub)} → ${minWords(ua)}`);
  }
  const tone: Tone = whole(a) < whole(b) ? 'g' : whole(a) > whole(b) ? 'r' : 'n';
  return { text: `${parts.join('; ')}. The number moved; what moved it is the fix's to say.`, tone };
}

/** PROVE IT: the next shift's count, the same shift pattern — the window
 *  moved on by whole days to the one `at` falls in (or the last one before
 *  it), the rate and the planned minutes carried, nothing counted yet. */
export function nextShift(c: LossCount, at: number): LossCount {
  const k = Math.max(1, Math.floor((at - c.from) / DAY));
  const { made: _m, rejects: _r, ...rest } = c;
  void _m; void _r;
  return { ...rest, from: c.from + k * DAY, to: c.to + k * DAY };
}

/* ---------------------------------------------------------- one line, paper */

/** The count in one line for a card or a row: "Shift 1 yesterday: 85 min
 *  lost · 9 not yet explained". `abnormal` when the unexplained part is over
 *  a tenth, or the counts want checking — the one part that wears amber. */
export function lossLine(f: LossFigures, c: LossCount, now = Date.now()): { text: string; abnormal: boolean } {
  const when = `${shiftWords(c)} ${dayWords(c.from, now)}`;
  if (!f.enough) return { text: `${when}: not yet counted`, abnormal: false };
  if (f.overPacks && f.overPacks > 0) return { text: `${when}: made ${packs(f.overPacks)} over the rate — check the count`, abnormal: true };
  const unex = f.unexplainedMin ?? 0;
  const tail = !f.split ? '' : f.excessMin && f.excessMin > 0.5 ? ` · stops exceed the loss by ${minWords(f.excessMin)}` : unex > 0.5 ? ` · ${minWords(unex)} not yet explained` : ' · all explained';
  return { text: `${when}: ${minWords(f.lostMin ?? 0)} lost${tail}`, abnormal: ((f.unexplainedShare ?? 0) > UNEXPLAINED_TENTH && unex > 0.5) || (f.excessMin ?? 0) > 0.5 };
}

/** One row of the waterfall as paper says it (lib/report/lossTable): every
 *  figure already in words, so the PDF only draws. */
export interface LossRow { cause: string; stops: string; minutes: string; pounds: string; kind: LossBar['kind']; abnormal?: boolean }

/** THE WATERFALL AS A TABLE: a row per bar — cause · stops · minutes · £ —
 *  and the total lost; the head says what was planned and made. */
export function lossRows(f: LossFigures): { head: string; rows: LossRow[]; total: { minutes: string; pounds: string } } | undefined {
  if (!f.enough) return undefined;
  const money = (n?: number) => (n !== undefined ? gbp(n) : '');
  const rows: LossRow[] = f.bars.map(b => ({
    cause: b.kind === 'cause' && b.asset ? `${b.label} — ${b.asset}` : b.kind === 'rejects' ? `Rejects (${packs(b.packs ?? 0)} packs)` : b.label,
    stops: b.stops !== undefined ? String(b.stops) : '—', minutes: minWords(b.min), pounds: money(b.pounds), kind: b.kind,
    ...(b.kind === 'unexplained' && (f.unexplainedShare ?? 0) > UNEXPLAINED_TENTH ? { abnormal: true } : {}),
  }));
  const lost = f.lostMin ?? 0;
  return {
    head: `${whole(f.plannedMin ?? 0)} planned minutes at ${rateWords(f.rate ?? 0)} — ${packs(f.expected ?? 0)} expected, ${packs(f.made ?? 0)} made`,
    rows, total: { minutes: minWords(lost), pounds: money(poundsOf(lost, f.costPerHour)) },
  };
}
