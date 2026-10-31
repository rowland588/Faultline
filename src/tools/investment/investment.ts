/* WHAT AN IMPROVEMENT IS WORTH — FC-191 (knowledge/specs/FC-191-payback-npv.md; knowledge/methods/cost/investment-appraisal.md).
 *
 * A one-off cost against a constant saving: payback in running weeks, NPV at the business's discount rate over a life in whole years
 * (the saving a year at each year's end, the cost at time zero), the IRR (the rate at which the NPV is zero) and the return a year
 * (saving a year ÷ cost, the simple ROI). Pure arithmetic — the page, the paper and the tests read it. Brealey, Myers & Allen;
 * Drury (the record). The rate and the life are the business's own and are never defaulted here. */

export interface Case {
  /** What it costs, once (£). */ cost?: number;
  /** The saving a week (£). */ weekly: number;
  /** Weeks a year the line runs. */ weeks?: number;
  /** Whole years the saving is counted for. */ life?: number;
  /** The business's discount rate, a fraction (0.10 = 10%). */ rate?: number;
}

/** The present value of one pound a year at each year's end for n years at rate r: n at r = 0, else (1 − (1 + r)⁻ⁿ) ÷ r. */
export function annuity(rate: number, years: number): number {
  if (Math.abs(rate) < 1e-12) return years;
  return (1 - Math.pow(1 + rate, -years)) / rate;
}

/** Net present value of a constant yearly saving, the cost paid now. */
export const npv = (annual: number, rate: number, years: number, cost: number): number => annual * annuity(rate, years) - cost;

/** The rate at which the NPV is zero — undefined when there is none to find between −99% and 1,000,000%. */
export function irr(annual: number, years: number, cost: number): number | undefined {
  if (!(annual > 0) || !(cost > 0) || !(years >= 1)) return undefined;
  const f = (r: number) => annual * annuity(r, years) - cost;
  let lo = -0.99, hi = 10000;
  if (f(lo) < 0 || f(hi) > 0) return undefined;
  for (let k = 0; k < 400; k++) {
    const mid = (lo + hi) / 2;
    if (f(mid) > 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

export interface Figures {
  weekly: number;
  /** Cost ÷ saving a week: running weeks. */
  paybackWeeks?: number;
  annual?: number;
  /** The payback as a share of the life in running weeks (>1 = longer than the life). */
  paybackOfLife?: number;
  npv?: number;
  irr?: number;
  /** Saving a year ÷ cost. */
  returnYear?: number;
}

export function figures(c: Case): Figures {
  const weekly = c.weekly;
  const annual = c.weeks !== undefined ? weekly * c.weeks : undefined;
  const out: Figures = { weekly };
  if (c.cost !== undefined && c.cost > 0) out.paybackWeeks = c.cost / weekly;
  if (annual !== undefined) out.annual = annual;
  if (out.paybackWeeks !== undefined && c.weeks !== undefined && c.life !== undefined && c.life > 0) out.paybackOfLife = out.paybackWeeks / (c.weeks * c.life);
  if (annual !== undefined && c.cost !== undefined && c.cost > 0) out.returnYear = annual / c.cost;
  if (annual !== undefined && c.cost !== undefined && c.cost >= 0 && c.life !== undefined && c.rate !== undefined) out.npv = npv(annual, c.rate, c.life, c.cost);
  if (annual !== undefined && c.cost !== undefined && c.life !== undefined) { const r = irr(annual, c.life, c.cost); if (r !== undefined) out.irr = r; }
  return out;
}

/** The record's two checks: the saving halved, and the cost up a quarter. */
export const halved = (c: Case): Figures => figures({ ...c, weekly: c.weekly / 2 });
export const costUp = (c: Case): Figures => figures({ ...c, ...(c.cost !== undefined ? { cost: c.cost * 1.25 } : {}) });

/** The saving a week from a loss and the share the fix recovers (a share is 0–100). */
export const fromShare = (lossWeekly: number, sharePct: number): number => (lossWeekly * sharePct) / 100;
/** The saving a week from hours saved at one person's cost an hour. */
export const fromHours = (hoursWeekly: number, rate: number): number => hoursWeekly * rate;
