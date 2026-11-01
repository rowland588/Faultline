/* UTILISATION AND VARIABILITY — why queues explode (knowledge/specs/FC-045-utilisation-variability.md;
 * knowledge/methods/capacity/kingman-vut.md). Pure, units explicit (minutes, units an hour), every function proved against the
 * exact M/M/1 queue, Erlang C and a Lindley-recursion simulation in __tests__/queue.test.ts (scripts/knowledge/cases-toc.py) — never
 * against its own output.
 *
 *   utilisation       u = arrival rate × process time ÷ machines
 *   waitingTime       Kingman (1961), as Hopp & Spearman (Factory Physics) give it: the wait in the queue before one machine is
 *                     ((c_a² + c_e²) ÷ 2) × (u ÷ (1 − u)) × t_e — variability × utilisation × time; for m identical machines
 *                     Sakasegawa's (1977) form ((c_a² + c_e²) ÷ 2) × (u^(√(2(m+1)) − 1) ÷ (m (1 − u))) × t_e
 *   queueLength       Little's law: the units waiting = arrivals a minute × the wait
 *   departureCv2      c_d² = u² c_e² + (1 − u²) c_a² — what a busy station passes on (one machine)
 *   effectiveFromStops  t_e = t_0 ÷ A and c_e² = c_0² + (1 + c_r²) A (1 − A) m_r ÷ t_0 — a machine's own stops make its variability
 *   cvWord            "low" under 0.75, "moderate" to 1.33, "high" above (the textbook's classes)
 *
 * An approximation for a steady state, exact only for the M/M/1 queue (c_a = c_e = 1, one machine); within about 10% of the truth
 * below 90% utilisation and it understates above that (6% low at 92% in the simulation of the independent cases). A guide, not a
 * forecast; u must be below 1 — a station asked for more than it can do has no steady queue, only a growing pile. */

export interface VutIn {
  /** Units arriving an hour, and one unit's effective process time at one machine in minutes, and the machines side by side. */
  perHour: number; te: number; machines: number;
  /** The coefficients of variation (standard deviation ÷ mean) of the arrivals and of the process time. */
  ca: number; ce: number;
}
export interface VutOut {
  u: number;
  /** The wait in the queue and the time through the station (wait + process time), minutes. */
  wait: number; through: number;
  /** The wait in process times. */
  waitInTe: number;
  /** Units waiting, by Little's law. */
  queue: number;
  /** The variability term (c_a² + c_e²) ÷ 2 and the utilisation term, the two the wait is made of. */
  v: number; ut: number;
  /** What the station passes on to the next, as a coefficient of variation — one machine only. */
  cd?: number;
}

/** Utilisation: the share of its time the station would be busy. */
export const utilisation = (perHour: number, te: number, machines = 1): number => (perHour / 60) * te / machines;

/** The wait in the queue, minutes. Undefined when the station is asked for all of its time or more (u ≥ 1) or a figure is not usable. */
export function waitingTime(x: VutIn): VutOut | undefined {
  const { perHour, te, machines: m, ca, ce } = x;
  if (!(perHour > 0) || !(te > 0) || !(m >= 1) || !(ca >= 0) || !(ce >= 0)) return undefined;
  const u = utilisation(perHour, te, m);
  if (!(u < 1)) return undefined;
  const v = (ca * ca + ce * ce) / 2;
  const ut = m === 1 ? u / (1 - u) : u ** (Math.sqrt(2 * (m + 1)) - 1) / (m * (1 - u));
  const wait = v * ut * te;
  return { u, wait, through: wait + te, waitInTe: wait / te, queue: (perHour / 60) * wait, v, ut,
    ...(m === 1 ? { cd: Math.sqrt(u * u * ce * ce + (1 - u * u) * ca * ca) } : {}) };
}

/** The machine's effective process time and variability from its own stops (Hopp & Spearman): ideal cycle t0 minutes with
 *  variability c0, up a share A of the time, repairs averaging mr minutes with variability cr. */
export function effectiveFromStops(t0: number, c0: number, availability: number, mr: number, cr: number): { te: number; ce: number } | undefined {
  if (!(t0 > 0) || !(c0 >= 0) || !(availability > 0 && availability <= 1) || !(mr >= 0) || !(cr >= 0)) return undefined;
  const A = availability;
  return { te: t0 / A, ce: Math.sqrt(c0 * c0 + (1 + cr * cr) * A * (1 - A) * mr / t0) };
}

export type CvClass = 'low' | 'moderate' | 'high';
/** The textbook's classes of variability. */
export const cvClass = (c: number): CvClass => (c < 0.75 ? 'low' : c <= 1.33 ? 'moderate' : 'high');
