/* THE GEMBA WALK — HOW FRESH THE LOOKING IS (FC-199; knowledge/specs/FC-199-gemba-walk.md).
 *
 * Observation-based measurement is only as true as the last time someone stood at the line, so the silence is
 * made visible: the days since anyone looked at a line, and at each machine on it, and what the looking found.
 * Nothing is stored and nothing is asked — it is a read over four records that already exist, each a person at
 * the line leaving a mark: a stop timed (Observation), a filmed-walk clip (Segment), a frame marked on a walk
 * (SnagAsset) and a problem raised on the spot (Snag pinned on a frame, or a quick snag). A problem raised from
 * the Pareto board is raised at a desk and is not a look. The house's rule (fresh ≤ 7 days, fading 8–14, stale
 * beyond or never) is lib/gemba's, once. Pure — the screens, the papers and the acceptance script read these
 * sentences and no others. */
import type { Observation } from '../../types';
import type { Segment, Snag, SnagAsset } from '../../snag/types';
import { isQuickSnag } from '../../snag/types';
import { DAY, levelOfDays, type Level } from '../../lib/gemba';
import { machineKey } from '../../lib/lineRecords';

export type LookKind = 'stop' | 'walk' | 'frame' | 'problem';
/** One look: when, what kind, and the machine it names (a filmed clip names none). */
export interface Look { at: number; kind: LookKind; machine?: string }

export const KIND_WORD: Record<LookKind, string> = {
  stop: 'a stop timed', walk: 'a filmed walk', frame: 'a frame marked', problem: 'a problem raised',
};

/** The windows (Faultline's choice, said on the screen): the rhythm over 14 days, what was found over 28. */
export const RHYTHM_DAYS = 14;
export const FOUND_DAYS = 28;

export const NOT_RECORDED = 'Counts what was recorded in the app — a walk nobody wrote down is not here.';

const notAMachine = (name: string | undefined) => !name?.trim() || machineKey(name) === 'whole line';
const daysAgo = (at: number, ref: number) => Math.max(0, Math.floor((ref - at) / DAY));

export interface LookSources {
  obs: readonly Pick<Observation, 'startedAt' | 'asset' | 'deletedAt'>[];
  segments: readonly Pick<Segment, 'createdAt'>[];
  assets: readonly Pick<SnagAsset, 'id' | 'createdAt' | 'name'>[];
  snags: readonly Snag[];
}

/** A snag is a look when it was raised standing at the line: pinned on a frame, or taken from the Snag button. */
export const isLookSnag = (s: Snag): boolean => s.deletedAt == null && (!!s.assetId || isQuickSnag(s));

/** Every look on a line, newest first. */
export function looksOf(src: LookSources): Look[] {
  const out: Look[] = [];
  for (const o of src.obs) if (o.deletedAt == null) out.push({ at: o.startedAt, kind: 'stop', ...(notAMachine(o.asset) ? {} : { machine: o.asset.trim() }) });
  for (const s of src.segments) out.push({ at: s.createdAt, kind: 'walk' });
  for (const a of src.assets) out.push({ at: a.createdAt, kind: 'frame', ...(notAMachine(a.name) ? {} : { machine: a.name.trim() }) });
  for (const s of src.snags) {
    if (!isLookSnag(s)) continue;
    const m = s.targetAsset?.trim() || src.assets.find(a => a.id === s.assetId)?.name?.trim();
    out.push({ at: s.raisedAt, kind: 'problem', ...(notAMachine(m) ? {} : { machine: m as string }) });
  }
  return out.sort((a, b) => b.at - a.at);
}

export interface MachineLooking { name: string; days: number | null; level: Level; last?: Look }
export interface Found { raised: number; closed: number; open: number; oldestOpen: number | null }
export interface Looking {
  last?: Look;
  days: number | null;
  level: Level;
  /** The distinct days of the last RHYTHM_DAYS with at least one look. */
  rhythm: number;
  /** Stalest first, never-looked-at first of all. */
  machines: MachineLooking[];
  found: Found;
}

/** What the looking found: the problems raised on looks, and where they stand. */
export function foundOf(snags: readonly Snag[], ref: number): Found {
  const mine = snags.filter(isLookSnag);
  const recent = mine.filter(s => daysAgo(s.raisedAt, ref) < FOUND_DAYS);
  const open = mine.filter(s => s.status !== 'closed' && s.archivedAt == null);
  return {
    raised: recent.length,
    closed: recent.filter(s => s.status === 'closed').length,
    open: open.length,
    oldestOpen: open.length ? Math.max(...open.map(s => daysAgo(s.raisedAt, ref))) : null,
  };
}

/** The line, and each machine on its list, read at `ref`. */
export function lookingAt(src: LookSources, machines: readonly string[], ref: number): Looking {
  const looks = looksOf(src);
  const last = looks[0];
  const days = last ? daysAgo(last.at, ref) : null;
  const rhythm = new Set(looks.map(l => daysAgo(l.at, ref)).filter(d => d < RHYTHM_DAYS)).size;
  const seen = new Set<string>();
  const list: MachineLooking[] = [];
  for (const raw of machines) {
    const name = raw.trim();
    if (notAMachine(name) || seen.has(machineKey(name))) continue;
    seen.add(machineKey(name));
    const l = looks.find(x => x.machine && machineKey(x.machine) === machineKey(name));
    const d = l ? daysAgo(l.at, ref) : null;
    list.push({ name, days: d, level: levelOfDays(d), ...(l ? { last: l } : {}) });
  }
  /* never first, then the stalest; the line's own order among equals */
  const rank = (m: MachineLooking) => (m.days == null ? Infinity : m.days);
  list.sort((a, b) => rank(b) - rank(a));
  return { ...(last ? { last } : {}), days, level: levelOfDays(days), rhythm, machines: list, found: foundOf(src.snags, ref) };
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const ago = (d: number) => (d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`);

/** The line's sentence, in the floor's words — the level in words, never colour alone. */
export function lookingSays(name: string, l: Looking): string {
  if (l.days == null || !l.last) return `${name}: nothing recorded of anyone looking at it — stale, go and see.`;
  const kind = KIND_WORD[l.last.kind];
  if (l.level === 'fresh') return `${name} looked at ${ago(l.days)} — ${kind}.`;
  if (l.level === 'fading') return `${name} last looked at ${ago(l.days)} (${kind}) — fading, go and see.`;
  return `${name} not looked at for ${plural(l.days, 'day')} (${kind}) — stale, go and see.`;
}

/** The machines nobody has looked at lately (the first three), or nothing to say. */
export function machinesSays(l: Looking): string | undefined {
  const late = l.machines.filter(m => m.level !== 'fresh');
  if (!late.length) return undefined;
  const one = (m: MachineLooking) => (m.days == null ? `${m.name} (never)` : `${m.name} ${plural(m.days, 'day')}`);
  const more = late.length - 3;
  return `Not looked at lately: ${late.slice(0, 3).map(one).join(', ')}${more > 0 ? ` and ${more} more` : ''}.`;
}

export const rhythmSays = (l: Looking): string | undefined =>
  l.last ? `Looked at on ${l.rhythm} of the last ${RHYTHM_DAYS} days.` : undefined;

/** What the looking found, and whether it was closed. */
export function foundSays(f: Found): string {
  if (!f.raised && !f.open) return `No problem raised on a look in the last ${FOUND_DAYS / 7} weeks.`;
  const head = f.raised
    ? `Last ${FOUND_DAYS / 7} weeks: ${plural(f.raised, 'problem')} raised on looks, ${f.closed} closed, ${f.raised - f.closed} still open`
    : `No problem raised on a look in the last ${FOUND_DAYS / 7} weeks`;
  return `${head}${f.open && f.oldestOpen != null ? `; the oldest open ${plural(f.oldestOpen, 'day')}` : ''}.`;
}

/** The band's short fact on paper: "9 days ago — fading". */
export function lookingFact(l: Looking): string {
  return l.days == null ? 'nothing recorded — stale' : `${ago(l.days)}${l.level === 'fresh' ? '' : ` — ${l.level}`}`;
}

export interface LineLooking { id: string; name: string; looking: Looking }

/** The stalest first — never-looked-at before any date, then the most days; the factory's order among equals. */
export function stalestFirst<T extends { looking: Looking }>(lines: readonly T[]): T[] {
  const rank = (x: T) => (x.looking.days == null ? Infinity : x.looking.days);
  return lines.map((x, i) => ({ x, i })).sort((a, b) => rank(b.x) - rank(a.x) || a.i - b.i).map(r => r.x);
}

/** A project's several lines in one sentence: the stalest line's, with how many more are not fresh. */
export function projectSays(lines: readonly LineLooking[]): string | undefined {
  if (!lines.length) return undefined;
  const [worst] = stalestFirst(lines);
  const others = lines.filter(x => x !== worst && x.looking.level !== 'fresh').length;
  return `${lookingSays(worst.name, worst.looking)}${others ? ` ${plural(others, 'other line')} not fresh.` : ''}`;
}

/** One short line for a card: "Looked at yesterday" · "Last looked at 9 days ago — fading" · "Not looked at for 16 days — stale". */
export function lookingShort(l: Looking): string {
  if (l.days == null) return 'Nothing recorded of anyone looking — stale';
  if (l.level === 'fresh') return `Looked at ${ago(l.days)}`;
  if (l.level === 'fading') return `Last looked at ${ago(l.days)} — fading`;
  return `Not looked at for ${plural(l.days, 'day')} — stale`;
}

/** What a line's report says of the looking — the band's fact, the sentence and the rest, from the same words as the page. */
export function lookingReading(name: string, l: Looking): { fact: string; says: string; more: string } {
  return { fact: lookingFact(l), says: lookingSays(name, l), more: [machinesSays(l), rhythmSays(l), foundSays(l.found), NOT_RECORDED].filter(Boolean).join(' ') };
}
