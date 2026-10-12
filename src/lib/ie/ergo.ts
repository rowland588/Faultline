/* ERGONOMICS — can people do it all shift? docs/TOOLKIT.md Part 4 §11;
 * docs/BUILD.md, H3.
 *
 * The first method: the NIOSH revised lifting equation (1991; the
 * Applications Manual, 1994 — US public domain). For one lifting task:
 *   RWL = LC × HM × VM × DM × AM × FM × CM, LC = 23 kg
 *   LI  = the load ÷ RWL
 * The multipliers are the equation's own formulae; the frequency and
 * coupling multipliers are its two tables, copied here as published (Tables
 * 5 and 7 of the manual). A frequency between the table's rows takes the
 * next row up — the more careful reading.
 *
 * Proved by the CCOHS worked example: 23 × 0.83 × 0.78 × 0.85 × 1 × 1 × 0.90
 * = 11.4 kg; 13 ÷ 11.4 = 1.14 — increased risk.
 *
 * Always said with it: a screening tool, for a trained assessor — not a full
 * risk assessment. It never replaces one, and the sentence says so. */

export const CAVEAT = 'A screening tool, for a trained assessor — not a full risk assessment.';
export const LOAD_CONSTANT_KG = 23;

export type Coupling = 'good' | 'fair' | 'poor';
export type LiftHours = 1 | 2 | 8;

export interface Lift {
  /** The weight lifted, kg. */
  loadKg: number;
  /** Horizontal distance of the hands from the mid-point between the ankles, cm. */
  hCm: number;
  /** Height of the hands above the floor at the start of the lift, cm. */
  vCm: number;
  /** Vertical travel of the lift, cm. */
  dCm: number;
  /** Twist of the body from the sagittal plane, degrees. */
  aDeg: number;
  /** Lifts a minute. */
  liftsPerMin: number;
  /** How long the lifting goes on: up to 1, 2 or 8 hours (with the recovery the manual asks for). */
  hours: LiftHours;
  coupling: Coupling;
}

export interface Multipliers { hm: number; vm: number; dm: number; am: number; fm: number; cm: number }

export type LiftBand = 'nominal' | 'increased' | 'high' | 'outside';

export interface LiftResult {
  m: Multipliers;
  /** The recommended weight limit, kg. 0 when the task is outside the equation's range. */
  rwl: number;
  /** The lifting index. Infinity when the RWL is 0. */
  li: number;
  band: LiftBand;
  /** "Lift: 13 kg against a limit of 11.4 kg — index 1.14, increased risk." */
  sentence: string;
  /** Which multiplier took the task outside the equation, when one did. */
  notes: string[];
}

const r2 = (n: number): number => Math.round(n * 100) / 100;

/** Horizontal: 25 ÷ H, 1 under 25 cm, 0 beyond 63 cm. */
export const hm = (h: number): number => (h <= 25 ? 1 : h > 63 ? 0 : 25 / h);
/** Vertical: 1 − 0.003 |V − 75|, 0 above 175 cm. */
export const vm = (v: number): number => (v < 0 || v > 175 ? 0 : 1 - 0.003 * Math.abs(v - 75));
/** Distance: 0.82 + 4.5 ÷ D, 1 under 25 cm, 0 beyond 175 cm. */
export const dm = (d: number): number => (d <= 25 ? 1 : d > 175 ? 0 : 0.82 + 4.5 / d);
/** Asymmetry: 1 − 0.0032 A, 0 beyond 135°. */
export const am = (a: number): number => (a < 0 || a > 135 ? 0 : 1 - 0.0032 * a);

/** Table 5: frequency multiplier — rows by lifts a minute, columns ≤1 h, ≤2 h,
 *  ≤8 h, each split V < 75 cm · V ≥ 75 cm. */
const FM_TABLE: [number, [number, number], [number, number], [number, number]][] = [
  [0.2, [1.00, 1.00], [0.95, 0.95], [0.85, 0.85]],
  [0.5, [0.97, 0.97], [0.92, 0.92], [0.81, 0.81]],
  [1, [0.94, 0.94], [0.88, 0.88], [0.75, 0.75]],
  [2, [0.91, 0.91], [0.84, 0.84], [0.65, 0.65]],
  [3, [0.88, 0.88], [0.79, 0.79], [0.55, 0.55]],
  [4, [0.84, 0.84], [0.72, 0.72], [0.45, 0.45]],
  [5, [0.80, 0.80], [0.60, 0.60], [0.35, 0.35]],
  [6, [0.75, 0.75], [0.50, 0.50], [0.27, 0.27]],
  [7, [0.70, 0.70], [0.42, 0.42], [0.22, 0.22]],
  [8, [0.60, 0.60], [0.35, 0.35], [0.18, 0.18]],
  [9, [0.52, 0.52], [0.30, 0.30], [0.00, 0.15]],
  [10, [0.45, 0.45], [0.26, 0.26], [0.00, 0.13]],
  [11, [0.41, 0.41], [0.00, 0.23], [0.00, 0.00]],
  [12, [0.37, 0.37], [0.00, 0.21], [0.00, 0.00]],
  [13, [0.00, 0.34], [0.00, 0.00], [0.00, 0.00]],
  [14, [0.00, 0.31], [0.00, 0.00], [0.00, 0.00]],
  [15, [0.00, 0.28], [0.00, 0.00], [0.00, 0.00]],
];
export function fm(liftsPerMin: number, hours: LiftHours, vCm: number): number {
  if (liftsPerMin > 15) return 0;
  const row = FM_TABLE.find(r => r[0] >= liftsPerMin) ?? FM_TABLE[FM_TABLE.length - 1];
  if (!row) return 0;
  const col = row[hours === 1 ? 1 : hours === 2 ? 2 : 3];
  return col[vCm < 75 ? 0 : 1];
}

/** Table 7: coupling multiplier. */
export const cm = (c: Coupling, vCm: number): number => (c === 'good' ? 1 : c === 'fair' ? (vCm < 75 ? 0.95 : 1) : 0.90);

export const multipliers = (l: Lift): Multipliers => ({ hm: hm(l.hCm), vm: vm(l.vCm), dm: dm(l.dCm), am: am(l.aDeg), fm: fm(l.liftsPerMin, l.hours, l.vCm), cm: cm(l.coupling, l.vCm) });

/** The limit from six multipliers — the step the worked example checks. */
export const rwlFrom = (m: Multipliers, lc = LOAD_CONSTANT_KG): number => lc * m.hm * m.vm * m.dm * m.am * m.fm * m.cm;

export const liftBand = (li: number): LiftBand => (!isFinite(li) ? 'outside' : li <= 1 ? 'nominal' : li <= 3 ? 'increased' : 'high');

const BAND_WORDS: Record<LiftBand, string> = { nominal: 'nominal risk', increased: 'increased risk', high: 'high risk', outside: 'outside the equation' };

export function assessLift(l: Lift): LiftResult {
  const m = multipliers(l);
  const notes: string[] = [];
  if (m.hm === 0) notes.push('the hands are more than 63 cm out — beyond the equation');
  if (m.vm === 0) notes.push('the hands start above 175 cm — beyond the equation');
  if (m.dm === 0) notes.push('the lift travels more than 175 cm — beyond the equation');
  if (m.am === 0) notes.push('the body twists more than 135° — beyond the equation');
  if (m.fm === 0) notes.push('that many lifts a minute, for that long, is beyond the equation');
  const rwl = rwlFrom(m);
  const li = rwl > 0 ? l.loadKg / rwl : Infinity;
  const band = liftBand(li);
  const sentence = rwl > 0
    ? `Lift: ${r2(l.loadKg)} kg against a limit of ${rwl.toFixed(1)} kg — index ${li.toFixed(2)}, ${BAND_WORDS[band]}.`
    : `Lift: ${r2(l.loadKg)} kg — the task is outside the equation's range (${notes[0] ?? 'see the multipliers'}).`;
  return { m, rwl, li, band, sentence, notes };
}
