/* WHAT A RUN'S SHORTFALL IS WORTH, AND WHAT THE CLIMB HAS COST SO FAR
 * (knowledge/specs/FC-076-run-money.md; knowledge/MONEY.md §2 causation T,
 * §4 FC-076 and FC-077).
 *
 * Rowland, 24 October: every tool says its cost where the industry has one,
 * "merely one of the outputs ... don't block anything". A performance run
 * proves the line's rate, so every pack a product fell short of the agreed
 * rate is a pack the line did not make: the shortfall a minute × the minutes
 * run, valued at contribution a pack (price − materials, else the margin —
 * throughput accounting, the one rule in tools/losses contributionOf), and
 * what a day of the line's shifts at that rate leaves behind (lib/lineLoss
 * lineDay), said as "at this rate" — a projection, never a loss booked. The
 * climb to rate (lib/rampUp) sums the packs below the agreed rate over its
 * measured runs. Said only on a product short on its rate and on a climb
 * with packs below the rate; nothing on a pass. The margin missing is named,
 * the packs still said. Pure: records in, words out; nothing stored. */
import type { Workspace } from '../types';
import { lineOfMachine, onlyLineOf, type JobLine } from './lineRecords';
import type { Asset, Test } from './testing';
import { fmtGBP, fmtPacks } from './cost';
import { lineDay } from './lineLoss';
import { contributionOf } from '../tools/losses/losses';
import { num, type ProductReading } from './run';
import type { Climb } from './rampUp';

/** The line a run is on — its margin (or price and materials) and its shifts. */
export type RunLine = Partial<Pick<Workspace, 'name' | 'packsPerMin' | 'shifts'>> & Pick<Workspace, 'marginPerPack'> & { pricePerPack?: number; materialsPerPack?: number };

export interface RunWorth {
  /** Packs a minute short of the agreed rate. */
  shortPpm: number;
  /** The minutes run, and the packs short over them. */
  minutes: number;
  packs: number;
  contribution?: number;
  /** A day of the line's shifts at this rate. */
  dayH?: number;
  packsDay?: number;
  contributionDay?: number;
  missing: ('margin')[];
  words: string;
}

const MARGIN_ASK = 'give the line a margin a pack (Set up the line) to say it in money';
const hours = (min: number) => `${Number((min / 60).toFixed(1))} h`;

/** What a product short on its rate left behind — nothing on a pass, or while it cannot be judged. */
export function runWorth(p: Pick<ProductReading, 'r' | 'state'>, line?: RunLine): RunWorth | undefined {
  const { r } = p;
  const rate = r.checks.find(c => c.what === 'rate');
  /* a program's test aims at a speed — only a net rate it was given is a shortfall worth pricing */
  const aim = r.agreed.of === 'speed' ? r.agreed.net : r.agreed.rate;
  if (p.state !== 'short' || !rate || rate.ok || r.net == null || typeof aim !== 'number' || typeof r.day.minutes !== 'number' || !(r.day.minutes > 0)) return undefined;
  const shortPpm = aim - r.net;
  if (!(shortPpm > 0)) return undefined;
  const minutes = r.day.minutes;
  const packs = shortPpm * minutes;
  const k = contributionOf(line);
  const out: RunWorth = { shortPpm, minutes, packs, missing: k ? [] : ['margin'], words: '' };
  if (k) out.contribution = packs * k.perPack;
  const day = line ? lineDay({ name: line.name ?? '', packsPerMin: line.packsPerMin, marginPerPack: line.marginPerPack, shifts: line.shifts }).minutes : undefined;
  if (day && day > 0) {
    out.dayH = day / 60;
    out.packsDay = shortPpm * day;
    if (k) out.contributionDay = out.packsDay * k.perPack;
  }
  const head = `${num(shortPpm)} ppm short: ${fmtPacks(packs)} over the ${num(minutes)} min run`;
  if (!k) out.words = `${head} — ${MARGIN_ASK}.`;
  else out.words = `${head} — ${fmtGBP(out.contribution ?? 0)} contribution${out.packsDay !== undefined ? `; at this rate a day of the line’s shifts (${hours(day as number)}) is ${fmtPacks(out.packsDay)}, ${fmtGBP(out.contributionDay ?? 0)}` : ''}.`;
  return out;
}

export interface ClimbWorth {
  /** Packs below the agreed rate over the runs that know their minutes, and how many runs that is. */
  packs: number;
  runs: number;
  contribution?: number;
  missing: ('margin')[];
  words: string;
}

/** What the climb has cost so far — nothing once at the rate, or before a run knows its minutes. */
export function climbWorth(c: Pick<Climb, 'points' | 'agreed'>, line?: RunLine): ClimbWorth | undefined {
  const timed = c.points.filter(p => typeof p.minutes === 'number' && p.minutes > 0);
  if (!timed.length) return undefined;
  const packs = timed.reduce((n, p) => n + Math.max(0, c.agreed - p.net) * (p.minutes as number), 0);
  if (!(packs > 0)) return undefined;
  const k = contributionOf(line);
  const out: ClimbWorth = { packs, runs: timed.length, missing: k ? [] : ['margin'], words: '' };
  if (k) out.contribution = packs * k.perPack;
  const head = `The climb so far: ${fmtPacks(packs)} below the agreed ${num(c.agreed)} over ${timed.length} run${timed.length === 1 ? '' : 's'}`;
  out.words = k ? `${head} — ${fmtGBP(out.contribution ?? 0)} contribution.` : `${head} — ${MARGIN_ASK}.`;
  return out;
}

/** THE LINE A RUN IS ON — its machine's line (Asset.workspaceId, else the
 *  project's one line — lib/lineRecords lineOfMachine), else the project's
 *  one line when the test names no machine; nothing when the project runs on
 *  several lines and the machine says none. */
export function runLineOf<W extends { id: string }>(t: Pick<Test, 'assetId' | 'projectId'>, assets: readonly Pick<Asset, 'id' | 'workspaceId' | 'projectId' | 'deletedAt'>[], jobLines: readonly JobLine[], workspaces: readonly W[]): W | undefined {
  const a = t.assetId ? assets.find(x => x.id === t.assetId && !x.deletedAt) : undefined;
  const wsId = a ? lineOfMachine(a, jobLines) : onlyLineOf(t.projectId, jobLines);
  return wsId ? workspaces.find(w => w.id === wsId) : undefined;
}
