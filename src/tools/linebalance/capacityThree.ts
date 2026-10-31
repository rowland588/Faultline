/* CAPACITY'S THREE NUMBERS, ON LINE CAPACITY (FC-041 — knowledge/specs/FC-041-capacity-three-numbers.md;
 * docs/CAPACITY.md §2, §5; knowledge/methods/capacity/three-capacities.md).
 *
 * "The line can do 100 a minute" is three numbers depending on who says it:
 *
 *   design     what the line was built to make — the plate speed of the station that sets the pace (a machine's
 *              plate, a person's standard time) × every minute of the shift, nothing taken off;
 *   effective  what it can really make, planned — the shift's good packs once the breaks the line stops for, the
 *              changeovers SMED timed into the product and the line's own stops and rejects (the capacity sheet)
 *              are out: capacity a shift, `shiftCapacity`, unchanged;
 *   actual     what it made — a counted shift's good packs (the loss count).
 *
 * Two ratios, never confused (Stevenson): utilisation = actual ÷ design (how much of the asset was used — a
 * decision about shifts and orders) and efficiency = actual ÷ effective (how well the planned time ran — the
 * floor's). Loading = what the target asks of the shift ÷ effective. The gap from design to effective is not a
 * single "loss": it is three plain things in packs that add up exactly — the breaks (plate × their minutes), the
 * changeovers (plate × theirs) and the line's own stops and rejects ((plate − the sheet's pace) × the minutes
 * making) — so design − effective = their sum, always. The gap from effective to actual is the loss count's to
 * read (its waterfall), and the only part priced: packs short × the line's contribution a pack (throughput, at
 * the constraint — knowledge/MONEY.md, T), "if it cannot be made up". Headroom (design − effective) is a plan,
 * not a loss, and is not priced.
 *
 * Nothing is assumed: a break not said, a changeover not timed, a count not made is said so and the figure left
 * out. Nothing reads a machine; the plate is the nameplate, the count a person's. No OEE. Pure. */
import type { LossCount } from '../../lib/study';
import { plannedOf } from '../losses/losses';
import { fmtN } from './capacityWords';
import { ownSpeed, shiftCapacity, type CapacityResult, type ChangeoverIn, type ShiftIn, type ShiftRow } from './capacity';

const big = (n: number): string => Math.round(n).toLocaleString('en-GB');
const pct = (f: number): string => `${Math.round(f * 100)}%`;
const minWord = (m: number): string => `${fmtN(Math.round(m * 10) / 10)} min`;

/** A counted shift, from a loss count: the window, the planned minutes (the window less its breaks, or the day's
 *  own with a reason) and the good packs made. */
export interface CountedShift {
  /** The study it came from, so the screen can open it. */
  id?: string;
  /** The shift as the line names it, when one was picked. */
  shift?: string;
  /** The day, as the floor says it ("Mon 27 Oct"). */
  day: string;
  windowMin: number;
  plannedMin: number;
  /** Good packs — counted. */
  made: number;
}

/** How the design speed is known. */
export interface DesignSpeed { perMin: number; station: string; how: 'plate' | 'standard-time' | 'timed' | 'typed'; words: string }

/** The design speed: the slowest station at running speed, at its own speed in the line's unit (`ownSpeed`) — a
 *  machine on its plate, a person on their standard time; a typed or guessed speed is used and said not to be a
 *  plate. Undefined while no station can be counted. */
export function designSpeed(r: CapacityResult): DesignSpeed | undefined {
  const x = r.limitAtRunning;
  if (!x || !(x.running > 0)) return undefined;
  const perMin = ownSpeed(x);
  if (!(perMin > 0)) return undefined;
  const st = x.station, station = st.name.trim() || `Station ${x.index + 1}`;
  if (st.kind === 'machine') {
    return st.source === 'plate'
      ? { perMin, station, how: 'plate', words: `the plate speed of the ${station}` }
      : { perMin, station, how: 'typed', words: `the ${station}’s speed — typed or timed, not from its plate` };
  }
  return st.source === 'standard' ? { perMin, station, how: 'standard-time', words: `${station}’s standard time (the line balance)` }
    : st.source === 'timed' ? { perMin, station, how: 'timed', words: `${station}’s timed pace` }
      : { perMin, station, how: 'typed', words: `${station}’s speed — a guess, not a standard time` };
}

export interface ThreeRow {
  name: string;
  /** The shift's whole minutes. */
  min: number;
  /** Plate × the whole shift. */
  design: number;
  /** Capacity a shift (the sheet's) — absent while the shift's breaks are not said. */
  effective?: number;
  /** Where design went on the way to effective, in packs; they add to design − effective. */
  breaks?: number;
  changeovers?: number;
  /** The line's own stops and rejects: (plate − the sheet's good pace) × the minutes making. */
  pace?: number;
  /** effective ÷ design. */
  share?: number;
  /** What the target asks of the shift's planned minutes, and that ÷ effective. */
  asks?: number;
  loading?: number;
}

export interface ThreeCounted {
  name: string;
  design: number;
  effective?: number;
  actual: number;
  utilisation: number;
  efficiency?: number;
  /** effective − actual, packs: short when above nothing, above the plan when below. */
  short?: number;
  /** £ the packs short would have earned, at the line's contribution a pack; absent while it is not given. */
  worth?: number;
  loading?: number;
  asks?: number;
}

export interface Three {
  speed: DesignSpeed;
  rows: ThreeRow[];
  counted?: ThreeCounted;
  /** The three numbers and where design went, in words. */
  sentence: string;
  /** The counted shift against them: the two ratios, loading and the shortfall. */
  countSays?: string;
  /** What the shortfall is worth, or what to give to say it. */
  money?: string;
  /** The same facts in one short paragraph, for the paper's page (it holds one product to one page): the counted shift against
   *  design and effective when one is counted, else what a shift is built to make, can really make and where it went. */
  paper: string;
  /** Said apart: what is not worked out and what to give. */
  notes: string[];
}

export interface ThreeOptions {
  /** £ a pack the line earns (price less materials, else its margin) — for the shortfall in money. */
  contribution?: number;
  /** What the target asks a minute (the sheet's target). */
  targetPerMin?: number;
}

/** The three numbers for each of the line's shifts, and for a counted one. Undefined where the sheet cannot be
 *  counted, or several lines feed one place (those are held by their lanes, not one pace). */
export function threeCapacities(r: CapacityResult, shifts: ShiftIn[], co?: ChangeoverIn, counted?: CountedShift, o: ThreeOptions = {}): Three | undefined {
  if (r.lanes || r.line == null || !(r.line > 0)) return undefined;
  const speed = designSpeed(r);
  if (!speed) return undefined;
  const sc = shiftCapacity(r, shifts, co);
  if (!sc) return undefined;
  const rate = r.goodOut ?? r.line;
  /* the sheet's good pace cannot top the plate: it is the pace-setter's own speed less its stops and every
     station's rejects (the identity design − effective = breaks + changeovers + pace needs it) */
  const plate = Math.max(speed.perMin, rate);
  const unit = r.unit;
  const target = o.targetPerMin != null && o.targetPerMin > 0 ? o.targetPerMin : undefined;

  const rowOf = (x: ShiftRow): ThreeRow => {
    const design = plate * x.min;
    if (x.planned == null || x.made == null || x.making == null) return { name: x.name, min: x.min, design };
    const asks = target != null ? target * x.planned : undefined;
    return {
      name: x.name, min: x.min, design, effective: x.made,
      breaks: plate * (x.breakMin ?? 0), changeovers: plate * (x.changeoverMin ?? 0), pace: (plate - rate) * x.making,
      share: design > 0 ? x.made / design : 0,
      ...(asks != null ? { asks } : {}),
      ...(asks != null && x.made > 0 ? { loading: asks / x.made } : {}),
    };
  };
  const rows = sc.rows.map(rowOf);
  const said = rows.filter(x => x.effective != null);
  const notes: string[] = [];
  const unsaid = rows.filter(x => x.effective == null).map(x => x.name);
  if (unsaid.length) notes.push(`${unsaid.join(', ')}: the breaks are not said on the line’s settings, so only what it was built to make is worked out for ${unsaid.length === 1 ? 'it' : 'them'}.`);
  if (sc.rows.length && !co) notes.push('No changeover is timed into this product yet, so none comes off what the line can really make.');
  else if (co && co.perShift == null) notes.push('How many changeovers a shift is not said on the SMED, so none comes off what the line can really make.');
  if (target == null) notes.push('Give the line a target to say how loaded it is.');

  /* THE THREE NUMBERS, in words — one sentence for one shift (or shifts alike), each shift's figures for several */
  const how = speed.words;
  const head = `At ${how} — ${fmtN(speed.perMin)} ${unit} a minute —`;
  const split = (x: ThreeRow): string => {
    const parts = [
      (x.breaks ?? 0) > 0 ? `breaks take ${big(x.breaks as number)}` : '',
      (x.changeovers ?? 0) > 0 ? `changeovers ${big(x.changeovers as number)}` : '',
      `the line’s own stops and rejects ${big(x.pace ?? 0)}`,
    ].filter(Boolean);
    return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
  };
  const loadWord = (x: ThreeRow) => (x.loading != null ? ` The target asks ${big(x.asks as number)} of its planned minutes — ${pct(x.loading)} of what it can really make.` : '');
  const alike = said.length > 0 && said.every(x => x.design === said[0].design && x.effective === said[0].effective);
  let sentence: string;
  if (!said.length) sentence = rows.length ? `${head} a shift of ${minWord(rows[0].min)} is built to make ${big(rows[0].design)} ${unit}. What it can really make needs the breaks said on the line’s settings.` : '';
  else if (alike) {
    const x = said[0];
    sentence = `${head} a shift is built to make ${big(x.design)} ${unit}. ${split(x).charAt(0).toUpperCase()}${split(x).slice(1)}: it can really make ${big(x.effective as number)}, ${pct(x.share as number)} of that.${loadWord(x)}`;
  } else {
    sentence = `${head} ${said.map(x => `${x.name} is built to make ${big(x.design)}, really ${big(x.effective as number)} (${pct(x.share as number)})`).join('; ')}.${said.length === 1 ? loadWord(said[0]) : ''}`;
  }

  /* THE COUNTED SHIFT — like for like: the count's own window and planned minutes through the same sheet */
  let c: ThreeCounted | undefined;
  let countSays: string | undefined;
  let money: string | undefined;
  if (counted && counted.windowMin > 0 && counted.plannedMin > 0 && counted.plannedMin <= counted.windowMin && counted.made >= 0) {
    const name = counted.shift?.trim() || 'The counted shift';
    const one = shiftCapacity(r, [{ name, min: counted.windowMin, breakMin: counted.windowMin - counted.plannedMin }], co);
    const row = one?.rows[0];
    const design = plate * counted.windowMin;
    const effective = row?.made;
    const asks = target != null ? target * counted.plannedMin : undefined;
    const short = effective != null ? effective - counted.made : undefined;
    const worth = short != null && short > 0 && o.contribution != null && o.contribution > 0 ? short * o.contribution : undefined;
    c = {
      name, design, actual: counted.made, utilisation: design > 0 ? counted.made / design : 0,
      ...(effective != null ? { effective } : {}),
      ...(effective != null && effective > 0 ? { efficiency: counted.made / effective } : {}),
      ...(short != null ? { short } : {}),
      ...(worth != null ? { worth } : {}),
      ...(asks != null ? { asks } : {}),
      ...(asks != null && effective != null && effective > 0 ? { loading: asks / effective } : {}),
    };
    const when = `${counted.shift?.trim() ? `${counted.shift.trim()}, ` : ''}${counted.day}`;
    countSays = c.effective != null && c.efficiency != null
      ? `Counted — ${when}: ${big(counted.made)} good ${unit} made. Of the ${big(design)} the shift was built to make that is ${pct(c.utilisation)} — how much of the asset was used; of the ${big(c.effective)} it could really make that is ${pct(c.efficiency)} — how well the planned time ran.`
      : `Counted — ${when}: ${big(counted.made)} good ${unit} made — ${pct(c.utilisation)} of the ${big(design)} the shift was built to make.`;
    if (short != null && short > 1e-9) {
      money = worth != null
        ? `${big(short)} ${unit} short of what it could really make — worth ${`£${Math.round(worth).toLocaleString('en-GB')}`} of contribution if it cannot be made up. The loss count says where they went.`
        : `${big(short)} ${unit} short of what it could really make. Give the line a margin a pack (Set up the line) to say that in money.`;
    } else if (short != null) {
      money = `${big(-short)} ${unit} above what the sheet says it can really make — the sheet may be too careful: check its stops and speeds.`;
    }
  } else if (counted) {
    notes.push('The last count’s planned minutes are longer than its window, so it is not set against the three numbers.');
  } else {
    notes.push('No shift has been counted yet — count one in the loss count to set what it made against these.');
  }
  /* THE PAPER'S PARAGRAPH — one product is one page, so the facts are said once and in a line */
  let paper = '';
  if (c && c.effective != null && c.efficiency != null) {
    const when = `${counted?.shift?.trim() ? `${counted.shift.trim()}, ` : ''}${counted?.day ?? ''}`;
    const tail = c.short != null && c.short > 1e-9 ? `; ${big(c.short)} short${c.worth != null ? `, £${Math.round(c.worth).toLocaleString('en-GB')}` : ''}` : c.short != null ? `; ${big(-c.short)} above the sheet` : '';
    paper = `counted ${when}: ${big(c.actual)} made — ${pct(c.utilisation)} of ${big(c.design)} built to make, ${pct(c.efficiency)} of ${big(c.effective)} it can really make${tail}.`;
  } else if (said.length) {
    paper = alike
      ? `built to make ${big(said[0].design)} a shift, can really make ${big(said[0].effective as number)} (${pct(said[0].share as number)}).`
      : `built to make → can really make: ${said.map(x => `${x.name} ${big(x.design)} → ${big(x.effective as number)}`).join(' · ')}.`;
  } else if (rows.length) paper = `built to make ${big(rows[0].design)} a shift.`;
  return { speed, rows, ...(c ? { counted: c } : {}), sentence, ...(countSays ? { countSays } : {}), ...(money ? { money } : {}), paper, notes };
}

/** The newest counted shift among a line's loss counts, as the three numbers read it: its window, its planned minutes
 *  (the day's own when changed with a reason, else the window less its breaks) and the good packs counted. A count
 *  made for another product's standard, or without its good packs or planned minutes, is passed over. */
export function countedShiftOf(studies: readonly { id: string; standardId?: string; facts: { losses?: LossCount } }[], standardId?: string): CountedShift | undefined {
  const live = studies.filter(s => s.facts.losses && s.facts.losses.made != null && s.facts.losses.made >= 0 && (!s.standardId || !standardId || s.standardId === standardId))
    .sort((a, b) => (b.facts.losses?.from ?? 0) - (a.facts.losses?.from ?? 0));
  for (const s of live) {
    const c = s.facts.losses as LossCount;
    const p = plannedOf(c);
    const plannedMin = p.planned ?? p.workedOut;
    if (!(p.windowMin > 0) || !(plannedMin > 0)) continue;
    return {
      id: s.id, ...(c.shift ? { shift: c.shift } : {}),
      day: new Date(c.from).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
      windowMin: p.windowMin, plannedMin, made: c.made as number,
    };
  }
  return undefined;
}
