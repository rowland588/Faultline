/* THE CONTROL ROOM AS A LEAN PAGE (docs/LEAN-PAGE.md, slice 5) — the tiles
 * and the closing line the control room's band and its one page say, read
 * from the board's own reading (lib/portfolio), so the page, its band and
 * its paper say one thing. Nothing about a job is worked out here.
 *
 * The tiles are the band's numbers, each *of* what it is: the jobs running
 * (and how many are behind target), what is late (and how much of it is a
 * line's own work), the critical (only when there is one — a zero is not
 * said on the band, CLAUDE.md visual rule 3), what is late or due this week,
 * and the money: what the slips cost — each running job's days past its
 * agreed handover × a day of its lines not making, in margin (lib/lineLoss
 * linesDay, from Your factory) — the stage gate's money tile
 * (lib/stageGateLean moneyTile) added up across the jobs, never a second
 * cost model. A job whose lines say nothing of their speed, shifts or margin
 * is named, with what to give and where; never a blank, never a guess.
 *
 * No "outstanding": Rowland, on the band, "states loads open but they are
 * gates" — the planned gate steps are the work ahead, not what is owed. */
import { fmtGBP } from './cost';
import type { LeanTile, LeanTone } from './lean';
import type { LinesDay } from './lineLoss';
import type { JobView, Portfolio } from './portfolio';
import { daysLate } from './standing';

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);
const and = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0] ?? '');

type Job = Pick<JobView, 'id' | 'name' | 'handedOver' | 'slipDays' | 'onTarget'> & Partial<Pick<JobView, 'method' | 'daysToGo'>>;
export type Room = { jobs: readonly Job[]; totals: Pick<Portfolio['totals'], 'jobs' | 'handedOver' | 'late' | 'lineLate' | 'critical' | 'week'> };

export interface RoomMoney {
  /** The running jobs past their agreed handover, furthest first. */
  slipping: { name: string; days: number; cost?: number }[];
  /** What the priced ones cost between them, in margin. */
  cost?: number;
  /** Days late across the priced jobs. */
  days: number;
  /** A slipping job whose lines cannot be priced yet, and what to give. */
  missing: string[];
}

/** WHAT THE SLIPS COST — undefined while the jobs' lines are still being read. */
export function roomMoney(jobs: readonly Job[], days: ReadonlyMap<string, LinesDay> | undefined): RoomMoney | undefined {
  if (!days) return undefined;
  /* Late is late whether or not the day was re-forecast (lib/standing daysLate):
     a job past its expected handover counts every day since. */
  const slipping = jobs.filter(j => isGate(j) && !j.handedOver && daysLate(j) > 0)
    .map(j => {
      const d = days.get(j.id), n = daysLate(j);
      return { name: j.name, days: n, ...(d?.margin != null ? { cost: n * d.margin } : {}), give: !d || !d.lines.length ? `${j.name}: its line` : d.margin == null ? and(d.missing) : '' };
    })
    .sort((a, b) => b.days - a.days);
  const priced = slipping.filter(s => s.cost != null);
  return {
    slipping: slipping.map(({ give: _g, ...s }) => s),
    ...(priced.length ? { cost: priced.reduce((n, s) => n + (s.cost as number), 0) } : {}),
    days: priced.reduce((n, s) => n + s.days, 0),
    missing: slipping.filter(s => s.give).map(s => s.give),
  };
}

/* A handover to slip is a stage-gate job's: a 6M or lever tree job has none. */
const isGate = (j: Job) => (j.method ?? 'commissioning') === 'commissioning';

/* Two named, then how many more — a busy board's tile stays a tile. */
const named = (xs: string[]) => (xs.length > 2 ? `${xs.slice(0, 2).join(', ')} and ${xs.length - 2} more` : and(xs));

const WAIT: LeanTile = { k: 'The slips cost', v: '…', of: 'reading the projects’ lines' };

function moneyTile(m: RoomMoney | undefined): LeanTile | undefined {
  if (!m) return WAIT;
  if (!m.slipping.length) return { k: 'The slips cost', v: '£0', of: 'every stage-gate project on its agreed handover', tone: 'g' };
  if (m.cost == null) return { k: 'The slips cost', v: '—', of: `give ${named(m.missing)} on the Factory’s Lines page` };
  const n = m.slipping.filter(s => s.cost != null).length;
  const rest = m.missing.length ? ` · ${named(m.missing.map(x => x.split(':')[0]))} not priced yet` : '';
  return { k: 'The slips cost', v: fmtGBP(m.cost), of: `${m.days} ${plural(m.days, 'day')} late on ${n} ${plural(n, 'project')} × a day of their lines not making, in margin${rest}`, tone: 'r' };
}

const running = (r: Room) => r.jobs.filter(j => !j.handedOver);
const behind = (r: Room) => running(r).filter(j => j.onTarget?.tone === 'behind').length;

export function roomTiles(r: Room, m: RoomMoney | undefined): LeanTile[] {
  const t = r.totals, b = behind(r);
  const tiles: LeanTile[] = [
    { k: 'Projects running', v: String(t.jobs), of: [b ? `${b} behind target` : t.jobs ? 'none behind target' : 'none yet', t.handedOver ? `${t.handedOver} handed over` : ''].filter(Boolean).join(' · ') },
    { k: 'Late', v: String(t.late), of: t.late ? `owed past its day${t.lineLate ? ` — ${t.lineLate} a line’s own` : ''}` : 'nothing past its day', tone: t.late ? 'r' : 'n' },
    ...(t.critical ? [{ k: 'Critical', v: String(t.critical), of: 'open — stopping a line or a project', tone: 'r' as LeanTone }] : []),
    { k: 'This week', v: String(t.week), of: 'late or due in the next 7 days' },
  ];
  const money = running(r).some(isGate) ? moneyTile(m) : undefined;
  return money ? [...tiles, money] : tiles;
}

/** The closing line: how many jobs are behind, the furthest named, what is
 *  late and critical, and what the slips cost — what the control room can
 *  say to the business. */
export function roomClosing(r: Room, m: RoomMoney | undefined): { text: string; tone: LeanTone } {
  const t = r.totals, b = behind(r), run = running(r).length;
  const far = m?.slipping[0];
  const where = !run ? (t.handedOver ? `Every project handed over (${t.handedOver})` : 'No project running')
    : b ? `${b} of ${run} ${plural(run, 'project')} behind target${far ? ` — ${far.name} furthest, ${far.days} ${plural(far.days, 'day')} past its agreed handover` : ''}`
      : `${run === 1 ? 'The project is' : `All ${run} projects are`} on target`;
  const wrong = [t.late ? `${t.late} late` : '', t.critical ? `${t.critical} critical` : ''].filter(Boolean);
  const cost = m?.cost != null ? `; the slips cost ${fmtGBP(m.cost)} of margin` : '';
  return {
    text: `${where}${wrong.length ? `; ${and(wrong)}` : ''}${cost}.`,
    tone: b || t.late || t.critical ? 'r' : run ? 'g' : 'n',
  };
}
