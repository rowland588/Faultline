/* DRUM–BUFFER–ROPE AND BUFFER MANAGEMENT (FC-043; knowledge/specs/FC-043-drum-buffer-rope.md;
 * knowledge/methods/capacity/dbr-buffer.md — Goldratt & Fox, The Race 1986; Schragenheim & Dettmer, Manufacturing at Warp Speed 2000).
 *
 * The constraint is the DRUM: its schedule is the week's schedule (tools/plan/schedule). A BUFFER of time — work released far enough ahead
 * that it waits in front of the constraint — protects the drum so it never starves; on a packing line it is everything the run needs
 * (film, trays, labels, the changeover kit, product from process) staged B hours of the drum's running time ahead. The ROPE ties the
 * release of work to the drum: an order is released when the drum is B hours from starting it, no earlier (WIP piles up) and no later (a
 * hole in the drum). BUFFER MANAGEMENT watches each order's place in the buffer:
 *
 *   consumed = (B − the time left until the order is due at the constraint) ÷ B
 *   plenty   under a third consumed          watch   a third to two thirds          expedite   two thirds or more, not yet arrived
 *
 * and the pattern of arrivals tunes B: red arrivals rare (5% or under) with the buffer mostly plenty on arrival → shorten it by 15%; red
 * arrivals frequent (over 10%) → lengthen it by 20%; and only from ten arrivals (a week of data is premature). The stock the buffer
 * costs is the constraint's rate × B (Little's law); a hole in the drum costs the run's minutes × the rate × what a pack earns.
 *
 * Time here is the DRUM'S running time — the minutes the constraint runs — not the clock: the buffer is staged in the drum's hours. The
 * drum's position now is where the orders marked done and part-done leave it: the first order not done, that far through. Nothing reads
 * a machine; every order's progress and arrival is a person's tap. Pure. */
import type { RunRow, Schedule } from './schedule';
import { hoursWords } from './schedule';
import type { PlanOrder } from './types';

export const THIRD = 1 / 3, TWO_THIRDS = 2 / 3;
/** Arrivals recorded before the buffer is tuned from them. */
export const MIN_ARRIVALS = 10;

export type Zone = 'done' | 'here' | 'outside' | 'plenty' | 'watch' | 'expedite';
export interface DbrRow {
  orderId: string;
  product: string;
  qty: number;
  runMin: number;
  zone: Zone;
  /** The zone in words — never by colour alone. */
  word: string;
  /** Share of the buffer consumed, for an order in it. */
  consumed?: number;
  /** Hours of the drum's running time until the order is due at the constraint. */
  timeLeftH?: number;
  /** Where the rope says to release it, in the drum's own words. */
  release?: string;
  tone: 'n' | 'g' | 'a' | 'r';
  says: string;
}
export interface Tune { arrivals: number; red: number; green: number; says: string; suggestH?: number }
export interface Dbr {
  bufferH: number;
  /** The drum's position now, in running minutes from the week's start. */
  drumMin: number;
  rows: DbrRow[];
  expedite: DbrRow[];
  /** The stock the buffer holds at the constraint's rate, and what it stands at when the line's materials a pack are given. */
  wip?: { units: number; pounds?: number };
  /** What a hole in the drum costs: the expedite orders' runs, in contribution. */
  hole?: { min: number; pounds?: number };
  tune: Tune;
  says: string;
  missing: string[];
  lines: string[];
  paper: string;
  tone: 'n' | 'a' | 'r';
}

/** A drum position in words: "when Maris 2kg is 60% done", "during the changeover into Tesco", "now". */
export function driveWords(min: number, rows: readonly RunRow[]): string {
  if (min <= 0) return 'now — before the drum starts the week';
  for (const r of rows) {
    if (min > r.startMin - r.changeMin - 1e-9 && min < r.startMin - 1e-9) return `during the changeover into ${r.product}`;
    if (min >= r.startMin - 1e-9 && min <= r.endMin + 1e-9) return `when ${r.product} is ${Math.round(((min - r.startMin) / (r.endMin - r.startMin)) * 100)}% done`;
  }
  return 'after the week’s last run';
}

const pctW = (x: number) => `${Math.round(x * 100)}%`;

export function dbr(s: Schedule, orders: readonly PlanOrder[], o: { bufferH: number; ratePerMin?: number; contribution?: number; materialsPerPack?: number; unit?: string }): Dbr | undefined {
  if (!s.rows.length || !(o.bufferH > 0)) return undefined;
  const B = o.bufferH, unit = o.unit ?? 'packs';
  const byId = new Map(orders.map(x => [x.id, x]));
  const done = (r: RunRow) => Math.max(0, Math.min(100, byId.get(r.orderId)?.done ?? 0));
  const cur = s.rows.find(r => done(r) < 100);
  const drumMin = cur ? cur.startMin + (done(cur) / 100) * cur.runMin : s.rows[s.rows.length - 1].endMin;
  const rows: DbrRow[] = s.rows.map(r => {
    const base = { orderId: r.orderId, product: r.product, qty: r.qty, runMin: r.runMin };
    const ord = byId.get(r.orderId);
    if (done(r) >= 100) return { ...base, zone: 'done' as const, word: 'Done', tone: 'g' as const, says: `${r.product} is done.` };
    if (r === cur) return { ...base, zone: 'here' as const, word: 'On the drum', tone: 'n' as const, says: `${r.product} is on the constraint now${done(r) > 0 ? `, ${Math.round(done(r))}% done` : ''}.` };
    const left = (r.startMin - drumMin) / 60;
    const release = driveWords(r.startMin - B * 60, s.rows);
    if (ord?.arrived) return { ...base, zone: 'here' as const, word: 'Arrived', timeLeftH: left, release, tone: 'n' as const,
      says: `${r.product} has arrived at the constraint${ord.arrived.consumed >= TWO_THIRDS ? ` — it came in the red (${pctW(ord.arrived.consumed)} of the buffer gone)` : ` with ${pctW(1 - Math.min(1, ord.arrived.consumed))} of the buffer left`}.` };
    if (left > B) return { ...base, zone: 'outside' as const, word: 'Not due yet', timeLeftH: left, release, tone: 'n' as const,
      says: `${r.product} is due at the constraint in ${hoursWords(left * 60)} of running — outside the ${hoursWords(B * 60)} buffer. Release it ${release}.` };
    const consumed = Math.min(1.5, (B - left) / B);
    const zone: Zone = consumed < THIRD ? 'plenty' : consumed < TWO_THIRDS ? 'watch' : 'expedite';
    const word = zone === 'plenty' ? 'Plenty of time' : zone === 'watch' ? 'Watch' : 'Expedite';
    return { ...base, zone, word, consumed, timeLeftH: left, release, tone: zone === 'plenty' ? 'g' as const : zone === 'watch' ? 'a' as const : 'r' as const,
      says: `${r.product}: ${pctW(Math.min(1, consumed))} of the buffer is gone — due at the constraint in ${hoursWords(left * 60)} of running. ${zone === 'expedite' ? 'Expedite it: find what it is waiting for upstream.' : zone === 'watch' ? 'Watch it; do not expedite yet.' : 'No action.'}` };
  });
  const expedite = rows.filter(r => r.zone === 'expedite');
  const rate = o.ratePerMin;
  const wipUnits = rate ? rate * B * 60 : undefined;
  const wip = wipUnits != null ? { units: wipUnits, ...(o.materialsPerPack != null ? { pounds: wipUnits * o.materialsPerPack } : {}) } : undefined;
  const holeMin = expedite.reduce((n, r) => n + r.runMin, 0);
  const holeUnits = expedite.reduce((n, r) => n + r.qty, 0);
  const hole = expedite.length ? { min: holeMin, ...(o.contribution != null ? { pounds: holeUnits * o.contribution } : {}) } : undefined;

  /* tuning from the arrivals recorded: how many came in the red, how many in plenty of time */
  const arr = orders.map(x => x.arrived).filter((x): x is NonNullable<PlanOrder['arrived']> => !!x);
  const red = arr.filter(a => a.consumed >= TWO_THIRDS).length, green = arr.filter(a => a.consumed < THIRD).length;
  let tune: Tune;
  if (arr.length < MIN_ARRIVALS) tune = { arrivals: arr.length, red, green, says: `${arr.length} arrival${arr.length === 1 ? '' : 's'} recorded — about ${MIN_ARRIVALS} are wanted before the buffer is tuned from them; a week of them is premature.` };
  else if (red / arr.length <= 0.05 && green / arr.length >= 0.5) tune = { arrivals: arr.length, red, green, suggestH: B * 0.85, says: `Of ${arr.length} arrivals ${red} came in the red and ${green} with plenty of time: the buffer is longer than it needs to be — try ${hoursWords(B * 0.85 * 60)} (15% shorter), which also cuts the stock it holds.` };
  else if (red / arr.length > 0.1) tune = { arrivals: arr.length, red, green, suggestH: B * 1.2, says: `Of ${arr.length} arrivals ${red} came in the red: the buffer is too short or something upstream is chronically late — try ${hoursWords(B * 1.2 * 60)} (20% longer), and look at which upstream step held the red ones.` };
  else tune = { arrivals: arr.length, red, green, says: `Of ${arr.length} arrivals ${red} came in the red and ${green} with plenty of time: the buffer is about right.` };

  const missing: string[] = [];
  if (!rate) missing.push('The stock the buffer holds needs the speed of the order next on the drum — work out its Line capacity.');
  else if (o.materialsPerPack == null) missing.push('Give the line what a pack’s materials cost (Set up the line) to say the stock the buffer holds in money.');
  if (expedite.length && o.contribution == null) missing.push('Give the line a margin a pack (Set up the line) to say what a hole in the drum would cost.');
  const gbp = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`;
  const int = (n: number) => Math.round(n).toLocaleString('en-GB');
  const says = expedite.length
    ? `${expedite.length === 1 ? 'One order is' : `${expedite.length} orders are`} in the red for the drum: ${expedite.map(r => r.product).join(', ')} — expedite ${expedite.length === 1 ? 'it' : 'them'}; ${hole ? `if ${expedite.length === 1 ? 'it does' : 'they do'} not arrive the drum cannot make ${expedite.length === 1 ? 'its' : 'their'} run — ${hoursWords(hole.min)}${hole.pounds != null ? `, ${gbp(hole.pounds)} of contribution if it cannot be made up` : ''}` : ''}.`
    : `No order is in the red. The drum is ${Math.round((drumMin / Math.max(1, s.weekMin)) * 100)}% of the way through the week’s running time; the buffer is ${hoursWords(B * 60)} of running.`;
  const lines = [
    ...rows.filter(r => r.zone !== 'done').map(r => `${r.product} — ${r.word}${r.consumed != null ? ` (${pctW(Math.min(1, r.consumed))} of the buffer gone)` : ''}${r.release && r.zone !== 'here' ? `; release ${r.release}` : ''}.`),
    ...(wip ? [`The buffer holds about ${int(wip.units)} ${unit} in front of the constraint (its rate × ${hoursWords(B * 60)})${wip.pounds != null ? ` — ${gbp(wip.pounds)} at the materials` : ''}; on a packing line that is mostly material staged, not product queued.`] : []),
    tune.says,
  ];
  const tone: Dbr['tone'] = expedite.length ? 'r' : rows.some(r => r.zone === 'watch') ? 'a' : 'n';
  const paper = `buffer ${hoursWords(B * 60)}; ${expedite.length ? `${expedite.length} in the red (${expedite.map(r => r.product).join(', ')})` : 'none in the red'}${rows.some(r => r.zone === 'watch') ? `, ${rows.filter(r => r.zone === 'watch').length} to watch` : ''}${wip ? `; it holds about ${int(wip.units)} ${unit}` : ''}.`;
  return { bufferH: B, drumMin, rows, expedite, ...(wip ? { wip } : {}), ...(hole ? { hole } : {}), tune, says, missing, lines, paper, tone };
}
