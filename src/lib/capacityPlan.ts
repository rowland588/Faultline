/* THE WAY TO THE TARGET — worked out for you.
 *
 * Rowland, 15 October, on his two lines into one wrapper: "we need as much
 * automation and intelligence behind the code as possible ... to interpret
 * before and after and merges and cycle times ... to make sure that the user
 * clearly can see what is happening."
 *
 * The line is short of its target: who has to be added, where, in what order,
 * and what each one buys. It is worked the way a person would on paper — the
 * station that holds the whole back gets one more (a person at it, or one more
 * machine beside it), the line is worked out again, and the next to hold it
 * back gets one — until the target is met. Each step is the line as the sums
 * (lib/capacity analyse) say it, several lines feeding one place included, so
 * it is the same answer the page gives; nothing here is a second model.
 *
 * It claims no more than the sums do: a machine is "another one beside it",
 * never a faster one; and where adding to a station cannot be the answer (a
 * dozen of them already) the plan stops and says so. Pure. */
import { analyse, fmtN, type Capacity, type Station } from './capacity';

export interface PlanStep {
  stationId: string;
  /** "palletiser" — with its line when there are several: "palletiser (Line A)". */
  name: string;
  kind: Station['kind'];
  from: number;
  to: number;
  /** What the line makes once this step is done, line units a minute. */
  lineAfter: number;
  /** "Pallet wrapper: 1 → 3 people — then the line makes 137 a minute". */
  text: string;
}

export interface Plan {
  target: number;
  /** The line as it stands. */
  before: number;
  /** The line once every step is done. */
  after: number;
  reached: boolean;
  steps: PlanStep[];
  /** People added across the steps (machines are not people). */
  people: number;
  machines: number;
  /** The new crew of every station the plan changes. */
  crews: Record<string, number>;
  /** Why it stopped short, when it did. */
  stuck?: string;
  /** The whole in one sentence. */
  sentence: string;
}

const MAX_CREW = 12;

export function planToTarget(cap: Capacity): Plan | undefined {
  const first = analyse(cap);
  const target = first.target;
  if (target == null || first.line == null || !(first.line > 0)) return undefined;
  const lanes = cap.lanes ?? [];
  const laneName = (id?: string) => {
    const i = lanes.findIndex(l => l.id === id);
    return i < 0 ? '' : lanes[i].name.trim() || `Line ${String.fromCharCode(65 + (i % 26))}`;
  };
  const label = (s: Station) => {
    const n = s.name.trim() || 'the station';
    const l = laneName(s.lane);
    return l ? `${n} (${l})` : n;
  };
  const crewOf = (s: Station) => (s.crew != null && s.crew > 0 ? s.crew : 1);
  const per = `${first.unit}/min`;
  const work = { ...cap, stations: cap.stations.map(s => ({ ...s })) };
  const original = new Map(cap.stations.map(s => [s.id, crewOf(s)]));
  const moves: { id: string; lineAfter: number }[] = [];
  let stuck: string | undefined;
  let now = first.line;
  for (let guard = 0; now < target - 1e-9 && guard < 200; guard++) {
    const r = analyse(work);
    const lim = r.limit;
    now = r.line ?? now;
    if (now >= target - 1e-9) break;
    const s = lim && work.stations.find(x => x.id === lim.station.id);
    if (!s) { stuck = 'the station holding the line back cannot be found'; break; }
    if (crewOf(s) >= MAX_CREW) { stuck = `${label(s)} already has ${MAX_CREW} — more of them is not the answer: its speed, or the way it is counted, is`; break; }
    /* identical lines move together: a line that is a copy of this one (the
       same station, the same speed, the same crew) gets the same one more */
    const speedKey = (x: Station) => JSON.stringify([x.name, x.kind, x.unit, x.contains, x.rate, x.ratePer, x.cycleSec, x.perCycle, x.speedIn, x.allowancePct, x.runningPct, x.goodPct, x.crew ?? 1]);
    const group = s.lane ? [s, ...work.stations.filter(x => x.id !== s.id && x.lane && x.lane !== s.lane && speedKey(x) === speedKey(s))] : [s];
    group.forEach(x => { x.crew = crewOf(x) + 1; });
    const after = analyse(work).line ?? now;
    if (!(after > now + 1e-9)) { group.forEach(x => { x.crew = crewOf(x) - 1; }); stuck = `one more at ${label(s)} does not make the line faster — something after it holds it`; break; }
    now = after;
    group.forEach(x => moves.push({ id: x.id, lineAfter: after }));
  }

  /* the steps, a station once: its crew from where it was to where it ended,
     placed when its LAST one was added, with what the line made then — so
     read in order the line only ever rises (a station added to early and
     again late used to sit first with its late figure, and the next step
     read as a fall; docs/UPGRADE-AUDIT.md M6) */
  const order: string[] = [];
  const lastAfter = new Map<string, number>();
  moves.forEach(m => { const i = order.indexOf(m.id); if (i >= 0) order.splice(i, 1); order.push(m.id); lastAfter.set(m.id, m.lineAfter); });
  const steps: PlanStep[] = order.map(id => {
    const s = work.stations.find(x => x.id === id) as Station;
    const from = original.get(id) ?? 1, to = crewOf(s);
    const who = s.kind === 'people' ? (to === 1 ? 'person' : 'people') : 'running';
    const lineAfter = lastAfter.get(id) as number;
    return { stationId: id, name: label(s), kind: s.kind, from, to, lineAfter,
      text: `${label(s)}: ${fmtN(from)} → ${fmtN(to)} ${who}${s.kind === 'people' ? '' : ' (another beside it)'} — the line then makes ${fmtN(lineAfter)} ${per}` };
  });
  const people = steps.filter(s => s.kind === 'people').reduce((n, s) => n + s.to - s.from, 0);
  const machines = steps.filter(s => s.kind !== 'people').reduce((n, s) => n + s.to - s.from, 0);
  const crews = Object.fromEntries(steps.map(s => [s.stationId, s.to]));
  const reached = now >= target - 1e-9;
  const adds = [people > 0 && `${fmtN(people)} more ${people === 1 ? 'person' : 'people'}`, machines > 0 && `${fmtN(machines)} more ${machines === 1 ? 'machine' : 'machines'}`].filter(Boolean).join(' and ');
  const sentence = steps.length === 0
    ? (first.line >= target - 1e-9 ? `The line already makes ${fmtN(first.line)} ${per} — ${fmtN(first.line - target)} over the ${fmtN(target)} target.` : (stuck ? `It cannot be worked out: ${stuck}.` : ''))
    : reached
      ? `To make ${fmtN(target)} ${per}: ${steps.map(s => s.text.split(' — ')[0]).join(' · ')} — ${adds}. The line then makes ${fmtN(now)}.`
      : `${adds ? `${adds} would take the line from ${fmtN(first.line)} to ${fmtN(now)} ${per}, ` : ''}still ${fmtN(target - now)} short of ${fmtN(target)} — ${stuck ?? 'it cannot be worked out further'}.`;
  return { target, before: first.line, after: now, reached, steps, people, machines, crews, ...(stuck ? { stuck } : {}), sentence };
}
