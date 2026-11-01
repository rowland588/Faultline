/* SPEED LOSS — running against ideal speed: slow running told from short stops (FC-056; knowledge/specs/FC-056-speed-loss.md;
 * knowledge/methods/equipment/short-stops-speed.md; Nakajima, Introduction to TPM, 1988 — the two hidden losses).
 *
 * After the stops the floor timed are taken out of a shift, the packs still fall short of what the running minutes at the ideal
 * speed would make. Two losses hide in that gap: the machine running slower than its ideal (SLOW RUNNING) and stops too short to
 * time (SHORT STOPS). The loss count tells them apart with one measurement, the running speed timed while it runs (lossFigures:
 * net operating time = packs run ÷ running speed; slow running = net − packs ÷ ideal; short stops = run time − net). This reads
 * those figures, never works them a second way, and adds what the person acts on:
 *
 *   the two in PACKS at the ideal speed (min × ideal) and in money — idle labour and lost contribution, two parts, never one
 *   which is bigger, said as the record says it: slow running → the speed setting or the product; short stops → the jams
 *   how OFTEN they come and how long each lasts, once short stops are counted over a watched period (typed, or copied from a
 *   reliability study's count of them): frequency = counted ÷ watched hours; stops in the run = frequency × run hours;
 *   mean length = short-stop minutes ÷ stops in the run
 *   what running below the plate does to the crew's labour a pack (the labour spread over fewer packs)
 *
 * The count's rate is the pace-setter's ideal speed, so both losses are line time at the constraint by definition and are
 * priced there; off the constraint, behind a buffer, a short stop costs nothing until the buffer runs out (FC-046) — the
 * limits say so. Without a timed running speed they are not told apart and the lump is said as one: never a guess. Pure. */
import type { ShortStopTally, ToolStudy } from '../../lib/study';
import type { LossBar, LossFigures } from './losses';
import { relAll } from '../reliability/reliability';

/** The reliability counts that count short stops — a count named for them. */
export const SHORT_STOP_NAME = /short stop|minor stop|micro.?stop|jam|mis.?feed|blockage|snag/i;

export interface SpeedLoss {
  /** Slow running and short stops are told apart (a running speed is timed). */
  told: boolean;
  runMin: number;
  /** The ideal speed the count is judged against, and the running speed timed. */
  ideal: number;
  running?: number;
  /** The running speed as a share of the ideal. */
  runningPct?: number;
  /** Minutes and packs at the ideal speed — slow running, short stops; the lump when not told apart. */
  slowMin?: number;
  slowPacks?: number;
  shortMin?: number;
  shortPacks?: number;
  lumpMin: number;
  lumpPacks: number;
  /** Which is the bigger loss — told apart only. */
  bigger?: 'slow' | 'short' | 'level';
  /** Short stops an hour of running, stops in the run, and the mean length in minutes — once counted. */
  perHour?: number;
  inRun?: number;
  meanMin?: number;
  /** £ the two parts, each loss: idle labour and lost contribution. */
  slowMoney?: { labour?: number; contribution?: number };
  shortMoney?: { labour?: number; contribution?: number };
  lumpMoney?: { labour?: number; contribution?: number };
  /** The crew's labour a pack at the ideal speed and at the speed it ran, £ — when the line has the crew and a speed is timed. */
  labourPerPack?: { ideal: number; running: number };
  tone: 'n' | 'a';
  verdict: string;
  /** The one sentence, then the lines under it. */
  says: string;
  lines: string[];
  /** The money, in words — or nothing when the line has no cost. */
  money?: string;
  /** What to give to say more, each a sentence. */
  missing: string[];
  /** One line for the paper. */
  paper: string;
}

const int = (n: number) => Math.round(n).toLocaleString('en-GB');
const one = (n: number) => String(Number(n.toFixed(1)));
const mins = (m: number) => `${one(m)} min`;
const gbp = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`;
const part = (b?: LossBar): { labour?: number; contribution?: number } | undefined => (b && (b.labour != null || b.contribution != null)
  ? { ...(b.labour != null ? { labour: b.labour } : {}), ...(b.contribution != null ? { contribution: b.contribution } : {}) } : undefined);
const said = (m?: { labour?: number; contribution?: number }): string => (m ? [m.contribution != null ? `${gbp(m.contribution)} of lost contribution` : '', m.labour != null ? `${gbp(m.labour)} of idle labour` : ''].filter(Boolean).join(' and ') : '');
/** How long a stop lasts, said as the floor says it: seconds under two minutes. */
export const lengthWords = (m: number): string => (m < 2 ? `${Math.round(m * 60)} s` : mins(m));

/** The speed loss of a counted shift — undefined until the shift is counted and the stops are in. */
export function speedLoss(f: LossFigures, tally?: ShortStopTally, unit = 'packs'): SpeedLoss | undefined {
  if (!f.enough || !f.split || f.runMin === undefined || f.rate === undefined || f.performanceMin === undefined) return undefined;
  const ideal = f.rate, runMin = f.runMin;
  const lumpMin = f.performanceMin;
  const lumpPacks = lumpMin * ideal;
  const slowBar = f.bars.find(b => b.key === 'slow'), shortBar = f.bars.find(b => b.key === 'short'), lumpBar = f.bars.find(b => b.key === 'performance');
  const told = f.slowMin !== undefined && f.shortMin !== undefined;
  const running = f.running && f.running.perMin > 0 ? f.running.perMin : undefined;
  const lines: string[] = [];
  const missing: string[] = [];
  if (!(lumpMin > 0.5)) {
    return { told, runMin, ideal, ...(running ? { running, runningPct: running / ideal } : {}), lumpMin, lumpPacks, tone: 'n', verdict: 'No speed loss', missing,
      says: `No speed loss: the packs made are what the ${mins(runMin)} of running at ${one(ideal)} a minute would make — no slow running and no short stops left over.`,
      lines, paper: 'no speed loss left over after the stops, changeovers and rejects.' };
  }
  const anyCost = f.contributionPerPack != null || f.labourPerHour != null;
  if (f.contributionPerPack == null) missing.push('Give the line a margin a pack (Set up the line) to say the lost packs in money.');
  if (f.labourPerHour == null) missing.push('Give the line its crew and a wage (Set up the line) to say the idle labour.');

  if (!told) {
    const lumpMoney = part(lumpBar);
    const says = `${mins(lumpMin)} of the shift — ${int(lumpPacks)} ${unit} at ${one(ideal)} a minute — went to running below the ${f.ideal} and stops too short to log; they are not yet told apart. Time the running speed while the machine runs to split them.`;
    return { told: false, runMin, ideal, lumpMin, lumpPacks, ...(lumpMoney ? { lumpMoney } : {}), tone: lumpBar?.abnormal ? 'a' : 'n', verdict: `${mins(lumpMin)} speed loss`, says, lines: [], ...(anyCost && lumpMoney ? { money: `Together: ${said(lumpMoney)}, if it cannot be made up.` } : {}), missing,
      paper: `${mins(lumpMin)} (${int(lumpPacks)} ${unit}) of speed loss, slow running and short stops not yet told apart — the running speed is not timed.` };
  }

  const slowMin = f.slowMin as number, shortMin = f.shortMin as number;
  const slowPacks = slowMin * ideal, shortPacks = shortMin * ideal;
  const runningPct = running ? running / ideal : undefined;
  const total = slowMin + shortMin;
  const bigger: SpeedLoss['bigger'] = Math.abs(slowMin - shortMin) <= 0.05 * total ? 'level' : slowMin > shortMin ? 'slow' : 'short';
  const slowMoney = part(slowBar), shortMoney = part(shortBar);
  const under = runningPct != null && runningPct < 1 ? Math.round((1 - runningPct) * 100) : 0;
  const slowWords = f.abovePlate || !(slowMin > 0.5) ? 'no slow running' : `${mins(slowMin)} of slow running (${int(slowPacks)} ${unit} — it ran at ${one(running as number)} a minute against the ${f.ideal} of ${one(ideal)}, ${under}% under)`;
  const shortWords = shortMin > 0.5 ? `${mins(shortMin)} of short stops (${int(shortPacks)} ${unit})` : 'no short stops';
  const verdictWords = bigger === 'level' ? 'Slow running and short stops cost about the same — fix both, the speed setting and the jams.'
    : bigger === 'slow' ? 'Slow running costs more than the short stops — the speed setting, or the product.'
      : 'Short stops cost more than slow running — the jams: count them by reason.';
  const says = `Speed loss ${mins(total)}: ${slowWords} and ${shortWords}. ${verdictWords}`;
  if (f.abovePlate) lines.push(`Timed above the ${f.ideal} — no slow running; check the ${f.ideal} or the timing.`);
  if ((f.slowRawMin ?? 0) > lumpMin + 0.5 && !f.abovePlate) lines.push(`The running speed says more slow running (${mins(f.slowRawMin as number)}) than the count leaves (${mins(lumpMin)}) — time it again, or check the counts. Shown capped at what the count leaves.`);

  /* how often, how long — once short stops are counted over a watched stretch */
  let perHour: number | undefined, inRun: number | undefined, meanMin: number | undefined;
  if (tally && tally.n > 0 && tally.watchedMin > 0) {
    perHour = tally.n / (tally.watchedMin / 60);
    inRun = perHour * (runMin / 60);
    meanMin = shortMin > 0.5 && inRun > 0 ? shortMin / inRun : undefined;
    const whole = tally.watchedMin >= runMin - 0.5;
    lines.push(`${int(tally.n)} short stop${tally.n === 1 ? '' : 's'} counted in ${tally.watchedMin >= 120 ? `${one(tally.watchedMin / 60)} h` : mins(tally.watchedMin)} of running${tally.from ? ` (${tally.from})` : ''}: ${one(perHour)} an hour${whole ? '' : `, about ${int(inRun)} in the ${mins(runMin)} run`}${meanMin != null ? ` — ${lengthWords(meanMin)} each` : ''}.`);
    if (tally.meanMin != null && meanMin != null) lines.push(`Timed one at a time they averaged ${lengthWords(tally.meanMin)}; the count leaves ${lengthWords(meanMin)} each — ${Math.abs(tally.meanMin - meanMin) > 0.5 * Math.max(tally.meanMin, meanMin) ? 'a long way apart: check the counts or time them again' : 'close'}.`);
  } else if (shortMin > 0.5) lines.push('How often they come and how long each lasts needs the short stops counted over a watched stretch — tap them on a reliability study, or type how many you counted and for how long.');

  /* what running below the plate does to the crew's labour a pack */
  const labourPerPack = f.labourPerHour != null && running ? { ideal: f.labourPerHour / (ideal * 60), running: f.labourPerHour / (running * 60) } : undefined;
  if (labourPerPack && runningPct != null && runningPct < 1) lines.push(`Running at ${one(running as number)} a minute instead of ${one(ideal)} puts the crew's labour up from ${(labourPerPack.ideal * 100).toFixed(2)}p to ${(labourPerPack.running * 100).toFixed(2)}p a pack.`);

  const moneyWords = [slowMoney && slowMin > 0.5 ? `slow running ${said(slowMoney)}` : '', shortMoney && shortMin > 0.5 ? `short stops ${said(shortMoney)}` : ''].filter(Boolean).join('; ');
  const money = moneyWords ? `${moneyWords} — at the ${f.ideal}, where a minute is a minute of the line, if it cannot be made up.` : undefined;
  const tone: 'n' | 'a' = (slowBar?.abnormal || shortBar?.abnormal || (f.slowRawMin ?? 0) > lumpMin + 0.5 || f.abovePlate) ? 'a' : 'n';
  const paper = `${mins(total)} — ${slowMin > 0.5 ? `${mins(slowMin)} slow running (${int(slowPacks)} ${unit}, ${under}% under the ${f.ideal})` : 'no slow running'}, ${shortMin > 0.5 ? `${mins(shortMin)} short stops (${int(shortPacks)} ${unit}${perHour != null ? `, ${one(perHour)} an hour${meanMin != null ? `, ${lengthWords(meanMin)} each` : ''}` : ''})` : 'no short stops'}; ${bigger === 'level' ? 'about equal' : bigger === 'slow' ? 'slow running the bigger' : 'short stops the bigger'}.`;
  return { told: true, runMin, ideal, ...(running ? { running } : {}), ...(runningPct != null ? { runningPct } : {}), slowMin, slowPacks, shortMin, shortPacks, lumpMin, lumpPacks, bigger,
    ...(perHour != null ? { perHour } : {}), ...(inRun != null ? { inRun } : {}), ...(meanMin != null ? { meanMin } : {}),
    ...(slowMoney ? { slowMoney } : {}), ...(shortMoney ? { shortMoney } : {}), ...(labourPerPack ? { labourPerPack } : {}), tone, verdict: `${mins(total)} speed loss`, says, lines, ...(money ? { money } : {}), missing, paper };
}

/** The reliability counts on a line that count short stops, each as a tally a count could take: how many in how long a watch, and the
 *  mean length when they were timed one at a time. Newest study first. */
export interface ShortStopOffer { studyId: string; study: string; count: string; tally: ShortStopTally; says: string }

export function shortStopOffers(studies: readonly ToolStudy[], now: number, machine?: string): ShortStopOffer[] {
  const out: ShortStopOffer[] = [];
  for (const s of studies.filter(x => x.tool === 'reliability' && !x.deletedAt).sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))) {
    if (machine && s.machine && s.machine.trim().toLowerCase() !== machine.trim().toLowerCase()) continue;
    for (const it of relAll(s.agreed?.reliability, s.facts.watch ?? [], s.facts.events ?? [], now)) {
      if (!SHORT_STOP_NAME.test(it.c.event) || !(it.f.n > 0) || !(it.f.hours > 0)) continue;
      const watchedMin = it.f.hours * 60;
      const meanMin = it.r?.meanMin;
      const tally: ShortStopTally = { n: it.f.n, watchedMin, from: `the reliability study “${s.name}”`, ...(meanMin != null ? { meanMin } : {}) };
      out.push({ studyId: s.id, study: s.name, count: it.c.event, tally, says: `${it.f.n} ${it.c.event} in ${one(it.f.hours)} h watched${meanMin != null ? `, ${lengthWords(meanMin)} each when timed` : ''}` });
    }
  }
  return out;
}
