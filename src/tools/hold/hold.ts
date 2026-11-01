/* PRODUCT ON HOLD — THE NONCONFORMANCE RECORD, ITS DISPOSITION AND WHAT IT COSTS (FC-135; knowledge/specs/FC-135-product-on-hold.md;
 * knowledge/methods/quality/nonconformance-hold.md).
 *
 * A hold is product that may not be right, put aside with a number, a reason and an owner until someone with the authority decides
 * what becomes of it: released as it is (shown to conform), released under concession (the customer agreed), reworked, regraded or
 * destroyed. The register is a line's: every hold on it, since when, why, who decides by when, and what it has cost. Pure — a
 * register's holds in, the figures and the sentences out; nothing here is stored and nothing is guessed (ISO 9001:2015 clause 8.7
 * is the requirement it serves; the clause was not re-read — knowledge/GAPS.md).
 *
 * MONEY (knowledge/MONEY.md, causation H and M, the record's two-parts rule): what is TIED UP while product waits is a tied-up
 * sum, never a loss; only a disposition says what was lost. Each input is optional and a missing one is named, never invented:
 *   tied up        quantity held × the cost a piece to this point (typed on the hold, else the line's materials a pack for packs)
 *   carried        tied up × (annual rate ÷ 365) × days held — only when a rate is given; the industry quotes a range, none is assumed
 *   lost           released: nothing (the review's hours are not priced) · concession and regrade: the price lost (typed)
 *                  · rework: its cost (typed) · destroyed: quantity × cost a piece, plus any disposal cost (typed)
 *   not earned     destroyed quantity × the line's margin a pack, said apart — the sale not made, never added to what was lost */

export type Disposition = 'release' | 'concession' | 'rework' | 'regrade' | 'destroy';
export const DISPOSITIONS: { key: Disposition; word: string; done: string; help: string; extra?: string }[] = [
  { key: 'release', word: 'Release', done: 'released', help: 'shown to conform — the failed check was in error, or a re-test passed' },
  { key: 'concession', word: 'Concession', done: 'released on concession', help: 'does not conform and the customer agreed in writing', extra: 'Price lost, £ in all' },
  { key: 'rework', word: 'Rework', done: 'reworked', help: 'brought to conform, then re-inspected and re-released', extra: 'What the rework cost, £ in all' },
  { key: 'regrade', word: 'Regrade', done: 'regraded', help: 'sold as a lower grade', extra: 'Price lost, £ in all' },
  { key: 'destroy', word: 'Destroy', done: 'destroyed', help: 'destroyed, or diverted where that is lawful', extra: 'What disposal cost, £ in all' },
];
export const dispositionWord = (d: Disposition): string => DISPOSITIONS.find(x => x.key === d)?.done ?? d;

export const UNITS = ['packs', 'cases', 'trays', 'pallets', 'kg'] as const;
export type HoldUnit = typeof UNITS[number];

/** One decision on part (or all) of a hold: a fate, a quantity, who decided and on what grounds. */
export interface HoldOutcome {
  id: string;
  disposition: Disposition;
  qty: number;
  /** The day it was decided (YYYY-MM-DD) and the moment. */
  on: string;
  at: number;
  by?: string;
  grounds?: string;
  /** £ in all, typed: the price lost (concession, regrade), the rework's cost, the disposal's cost. */
  extra?: number;
  struck?: boolean;
}

export interface HoldFrom {
  kind: 'check' | 'problem';
  /** A failed check: the log, the check and the result that failed. */
  studyId?: string; checkId?: string; resultId?: string;
  /** A problem on the register. */
  problemId?: string;
  /** In words, for the row: "Label-presence sensor failed 08:10". */
  words?: string;
}

export interface Hold {
  id: string;
  /** The hold's number on its label: H-001, in the order raised on this register. */
  no: number;
  product: string;
  lot?: string;
  qty: number;
  unit: HoldUnit;
  /** Where the product is (the chiller, the hold cage). */
  where?: string;
  reason: string;
  from?: HoldFrom;
  raisedOn: string;
  raisedAt: number;
  raisedBy?: string;
  /** Who decides, and by which day. */
  owner?: string;
  decideBy?: string;
  /** £ a unit to this point (materials and labour), typed. */
  costEach?: number;
  /** The product's whole shelf life in days, typed — to say how much of it the hold has used. */
  lifeDays?: number;
  outcomes?: HoldOutcome[];
  struck?: boolean;
}

/** The register's agreement: who may release (named), and the carrying rate to say what waiting costs. */
export interface AgreedHolds {
  since: number;
  /** The names that may decide a hold's fate (quality, not production). Empty: anyone — the page says so. */
  authority?: string[];
  /** The annual carrying rate, % — typed; none is assumed. */
  carryPct?: number;
}

export interface HoldCtx { materialsPerPack?: number; marginPerPack?: number }

/* ------------------------------------------------------------------------------------------------ the arithmetic */

export const label = (h: Pick<Hold, 'no'>): string => `H-${String(h.no).padStart(3, '0')}`;
export const liveHolds = (hs: readonly Hold[] | undefined): Hold[] => (hs ?? []).filter(h => !h.struck).sort((a, b) => a.no - b.no || a.raisedAt - b.raisedAt);
export const outcomesOf = (h: Hold): HoldOutcome[] => (h.outcomes ?? []).filter(o => !o.struck).sort((a, b) => a.at - b.at);
export const decidedQty = (h: Hold): number => outcomesOf(h).reduce((n, o) => n + o.qty, 0);
export const heldQty = (h: Hold): number => Math.max(0, +(h.qty - decidedQty(h)).toFixed(6));
export const isOpen = (h: Hold): boolean => heldQty(h) > 0;
/** The next hold's number on a register. */
export const nextNo = (hs: readonly Hold[] | undefined): number => Math.max(0, ...(hs ?? []).map(h => h.no)) + 1;

const dayMs = (iso: string): number => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, (m || 1) - 1, d || 1); };
/** Whole days from one ISO day to another (b − a). */
export const daysBetween = (a: string, b: string): number => Math.round((dayMs(b) - dayMs(a)) / 86_400_000);

/** Days held: still open, to today; decided in full, to the last decision. */
export function daysHeld(h: Hold, today: string): number {
  const last = outcomesOf(h).map(o => o.on).sort().pop();
  return Math.max(0, daysBetween(h.raisedOn, isOpen(h) || !last ? today : last));
}
export const pastDecideBy = (h: Hold, today: string): boolean => isOpen(h) && !!h.decideBy && h.decideBy < today;
/** Share of the product's shelf life the hold has used, % — when the life is given. */
export const lifeUsedPct = (h: Hold, today: string): number | undefined => (h.lifeDays && h.lifeDays > 0 ? Math.round((daysHeld(h, today) / h.lifeDays) * 100) : undefined);

/** The cost a unit to this point, and where it came from: typed on the hold, else the line's materials a pack (materials only). */
export function costEachOf(h: Hold, ctx: HoldCtx): { value: number; from: 'typed' | 'line' } | undefined {
  if (h.costEach !== undefined && h.costEach >= 0) return { value: h.costEach, from: 'typed' };
  if (h.unit === 'packs' && ctx.materialsPerPack && ctx.materialsPerPack > 0) return { value: ctx.materialsPerPack, from: 'line' };
  return undefined;
}
const r2 = (n: number): number => Math.round(n * 100) / 100;

/** What is tied up in the product still held. */
export function tiedUpOf(h: Hold, ctx: HoldCtx): number | undefined {
  const c = costEachOf(h, ctx);
  return c ? r2(heldQty(h) * c.value) : undefined;
}
/** What waiting has cost so far at the annual rate: tied up × rate ÷ 365 × days. */
export function carriedOf(h: Hold, ctx: HoldCtx, carryPct: number | undefined, today: string): number | undefined {
  const t = tiedUpOf(h, ctx);
  return t !== undefined && carryPct !== undefined && carryPct >= 0 ? r2((t * (carryPct / 100) / 365) * daysHeld(h, today)) : undefined;
}

export interface Loss { lost?: number; notEarned?: number; missing?: string }
/** What one decision cost — only a disposition says what was lost. */
export function lossOf(o: HoldOutcome, h: Hold, ctx: HoldCtx): Loss {
  if (o.disposition === 'release') return { lost: 0 };
  if (o.disposition === 'destroy') {
    const c = costEachOf(h, ctx);
    if (!c) return { ...(o.extra !== undefined ? { lost: r2(o.extra) } : {}), missing: 'Give the cost of a piece to say what destroying it lost.' };
    const margin = ctx.marginPerPack && h.unit === 'packs' ? r2(o.qty * ctx.marginPerPack) : undefined;
    return { lost: r2(o.qty * c.value + (o.extra ?? 0)), ...(margin !== undefined ? { notEarned: margin } : {}) };
  }
  return o.extra !== undefined ? { lost: r2(o.extra) } : { missing: o.disposition === 'rework' ? 'Give what the rework cost to say it in money.' : 'Give the price lost to say it in money.' };
}

/** "12,400 packs", "20 cases and 3 pallets" — quantities by unit, never added across units. */
export function qtyWords(by: Partial<Record<HoldUnit, number>>): string {
  const parts = UNITS.filter(u => by[u]).map(u => `${(by[u] as number).toLocaleString('en-GB')} ${u}`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0] ?? 'nothing';
}
export const gbp = (n: number): string => `£${n.toLocaleString('en-GB', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;

export interface ByFate { disposition: Disposition; holds: number; by: Partial<Record<HoldUnit, number>>; lost: number; notEarned: number; missing: boolean }
export interface ByReason { reason: string; n: number; qty: Partial<Record<HoldUnit, number>> }

export interface HoldFigures {
  holds: number;
  open: Hold[];
  closed: Hold[];
  openBy: Partial<Record<HoldUnit, number>>;
  tiedUp?: number;
  /** Open holds whose cost a piece is not known — the money is missing for them. */
  tiedUpMissing: number;
  carried?: number;
  oldest?: { hold: Hold; days: number };
  late: Hold[];
  noDay: Hold[];
  noOwner: Hold[];
  fates: ByFate[];
  lost: number;
  lostMissing: number;
  notEarned: number;
  reasons: ByReason[];
  /** A reason that has held product this many times in the last 28 days (Faultline's choice: three) — an 8D is the next step. */
  repeat?: { reason: string; n: number };
  /** Decided by someone who is not on the authority list. */
  unauthorised: { hold: Hold; outcome: HoldOutcome }[];
}

/** A reason that holds product again and again opens an 8D: this many holds for it in this many days (Faultline's choice, said on the page). */
export const REPEAT_HOLDS = 3, REPEAT_DAYS = 28;
const norm = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, ' ');

export function holdFigures(all: readonly Hold[] | undefined, today: string, ctx: HoldCtx, agreed?: Pick<AgreedHolds, 'authority' | 'carryPct'>): HoldFigures {
  const holds = liveHolds(all);
  const open = holds.filter(isOpen), closed = holds.filter(h => !isOpen(h));
  const openBy: Partial<Record<HoldUnit, number>> = {};
  for (const h of open) openBy[h.unit] = +((openBy[h.unit] ?? 0) + heldQty(h)).toFixed(6);
  const tied = open.map(h => tiedUpOf(h, ctx));
  const carr = open.map(h => carriedOf(h, ctx, agreed?.carryPct, today));
  const tiedKnown = tied.filter((x): x is number => x !== undefined), carrKnown = carr.filter((x): x is number => x !== undefined);
  const oldest = open.map(h => ({ hold: h, days: daysHeld(h, today) })).sort((a, b) => b.days - a.days)[0];
  const fates: ByFate[] = DISPOSITIONS.map(d => ({ disposition: d.key, holds: 0, by: {}, lost: 0, notEarned: 0, missing: false }));
  const unauthorised: HoldFigures['unauthorised'] = [];
  const auth = (agreed?.authority ?? []).map(norm).filter(Boolean);
  for (const h of holds) {
    const seen = new Set<Disposition>();
    for (const o of outcomesOf(h)) {
      const f = fates.find(x => x.disposition === o.disposition) as ByFate;
      if (!seen.has(o.disposition)) { f.holds++; seen.add(o.disposition); }
      f.by[h.unit] = +((f.by[h.unit] ?? 0) + o.qty).toFixed(6);
      const l = lossOf(o, h, ctx);
      f.lost = r2(f.lost + (l.lost ?? 0)); f.notEarned = r2(f.notEarned + (l.notEarned ?? 0)); if (l.missing) f.missing = true;
      if (auth.length && (!o.by || !auth.includes(norm(o.by)))) unauthorised.push({ hold: h, outcome: o });
    }
  }
  const byReason = new Map<string, ByReason>();
  for (const h of holds) {
    const k = norm(h.reason) || 'no reason given';
    const r = byReason.get(k) ?? { reason: h.reason.trim() || 'No reason given', n: 0, qty: {} };
    r.n++; r.qty[h.unit] = +((r.qty[h.unit] ?? 0) + h.qty).toFixed(6);
    byReason.set(k, r);
  }
  const reasons = [...byReason.values()].sort((a, b) => b.n - a.n || a.reason.localeCompare(b.reason));
  const recent = new Map<string, { reason: string; n: number }>();
  for (const h of holds) if (daysBetween(h.raisedOn, today) <= REPEAT_DAYS) { const k = norm(h.reason); if (!k) continue; const r = recent.get(k) ?? { reason: h.reason.trim(), n: 0 }; r.n++; recent.set(k, r); }
  const repeat = [...recent.values()].filter(r => r.n >= REPEAT_HOLDS).sort((a, b) => b.n - a.n)[0];
  return {
    holds: holds.length, open, closed, openBy,
    ...(tiedKnown.length ? { tiedUp: r2(tiedKnown.reduce((a, b) => a + b, 0)) } : {}), tiedUpMissing: tied.filter(x => x === undefined).length,
    ...(carrKnown.length ? { carried: r2(carrKnown.reduce((a, b) => a + b, 0)) } : {}),
    ...(oldest ? { oldest } : {}),
    late: open.filter(h => pastDecideBy(h, today)), noDay: open.filter(h => !h.decideBy), noOwner: open.filter(h => !h.owner?.trim()),
    fates, lost: r2(fates.reduce((a, f) => a + f.lost, 0)), lostMissing: fates.filter(f => f.missing).length, notEarned: r2(fates.reduce((a, f) => a + f.notEarned, 0)),
    reasons, ...(repeat ? { repeat } : {}), unauthorised,
  };
}

const n = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;
export type Tone = 'r' | 'a' | 'g' | 'n';

/** The register in a sentence, a verdict and a tone. */
export function holdSays(f: HoldFigures): { text: string; verdict: string; tone: Tone } {
  if (!f.holds) return { text: 'Nothing has been put on hold on this line yet. When a check fails or a problem sets product aside, raise a hold so it has a number, an owner and a day to be decided by.', verdict: 'No holds yet', tone: 'n' };
  if (!f.open.length) {
    const lost = f.lost > 0 ? ` What they lost: ${gbp(f.lost)}.` : '';
    return { text: `No product is on hold now — ${n(f.holds, 'hold')} raised and decided.${lost}`, verdict: 'Nothing on hold', tone: 'g' };
  }
  const tied = f.tiedUp !== undefined ? `, ${gbp(f.tiedUp)} tied up${f.tiedUpMissing ? ` (${n(f.tiedUpMissing, 'hold')} with no cost a piece yet)` : ''}` : '';
  const old = f.oldest ? `; the oldest ${n(f.oldest.days, 'day')}` : '';
  const late = f.late.length ? `, ${f.late.length} past the day to decide by` : '';
  const gaps = [f.noDay.length ? `${n(f.noDay.length, 'hold')} with no day to decide by` : '', f.noOwner.length ? `${n(f.noOwner.length, 'hold')} with nobody to decide` : ''].filter(Boolean);
  return {
    text: `${n(f.open.length, 'hold')} open — ${qtyWords(f.openBy)}${tied}${old}${late}.${gaps.length ? ` ${gaps.join(' and ')}: a hold with no decision day is a slow destroy.` : ''}`,
    verdict: f.late.length ? `${f.late.length} past the day to decide` : `${n(f.open.length, 'hold')} open`,
    tone: f.late.length ? 'r' : 'a',
  };
}

/** One hold in a line of words, for its row and its paper. */
export function holdWords(h: Hold, today: string, ctx: HoldCtx): { text: string; tone: Tone } {
  const t = tiedUpOf(h, ctx);
  if (!isOpen(h)) return { text: `${qtyWords({ [h.unit]: h.qty })} — ${outcomesOf(h).map(o => `${o.qty.toLocaleString('en-GB')} ${dispositionWord(o.disposition)}`).join(', ')}; held ${n(daysHeld(h, today), 'day')}`, tone: 'g' };
  const part = decidedQty(h) > 0 ? ` (${heldQty(h).toLocaleString('en-GB')} of ${h.qty.toLocaleString('en-GB')} still held)` : '';
  const when = h.decideBy ? (pastDecideBy(h, today) ? `${n(daysBetween(h.decideBy, today), 'day')} past its decide-by day` : `decide by ${h.decideBy}`) : 'no day to decide by';
  return { text: `${qtyWords({ [h.unit]: heldQty(h) })}${part} — held ${n(daysHeld(h, today), 'day')}, ${when}${t !== undefined ? `, ${gbp(t)} tied up` : ''}`, tone: pastDecideBy(h, today) ? 'r' : 'a' };
}

/** The register's closing line: where we are, why, and what is being done. */
export function holdClosing(f: HoldFigures): { text: string; tone: Tone } {
  if (!f.holds) return { text: 'No hold has been raised on this line.', tone: 'n' };
  if (!f.open.length) return { text: `Nothing is on hold. ${n(f.holds, 'hold')} decided${f.repeat ? `; ${f.repeat.reason} has held product ${f.repeat.n} times in ${REPEAT_DAYS} days — an 8D is the next step` : ''}.`, tone: f.repeat ? 'a' : 'g' };
  const who = f.open.filter(h => h.owner?.trim()).map(h => h.owner as string);
  const owners = [...new Set(who)];
  return {
    text: `${n(f.open.length, 'hold')} open (${qtyWords(f.openBy)}); ${f.late.length ? `${f.late.length} past the day to decide by` : 'none past its day'}; ${owners.length ? `with ${owners.join(', ')} to decide` : 'nobody named to decide'}.${f.repeat ? ` ${f.repeat.reason} has held product ${f.repeat.n} times in ${REPEAT_DAYS} days — an 8D is the next step.` : ''}`,
    tone: f.late.length ? 'r' : 'a',
  };
}

/** What the register says about its money, in words — the figures it has and the one input still wanted. */
export function holdMoney(f: HoldFigures, agreed?: Pick<AgreedHolds, 'carryPct'>): string[] {
  const out: string[] = [];
  if (f.open.length) {
    if (f.tiedUp !== undefined) out.push(`Tied up in product on hold: ${gbp(f.tiedUp)} — money waiting, not money lost.${f.carried !== undefined ? ` Waiting has cost ${gbp(f.carried)} so far at ${agreed?.carryPct}% a year.` : ''}`);
    if (f.tiedUpMissing) out.push(`${n(f.tiedUpMissing, 'open hold')} ${f.tiedUpMissing === 1 ? 'has' : 'have'} no cost a piece. Give the cost a piece on the hold (or the line’s materials a pack in Set up the line) to say what is tied up.`);
    if (f.tiedUp !== undefined && agreed?.carryPct === undefined) out.push('Give the register a carrying rate to say what waiting costs.');
  }
  if (f.fates.some(x => x.holds)) {
    out.push(f.lost > 0 || f.fates.some(x => x.disposition !== 'release' && x.holds) ? `What the decisions lost: ${gbp(f.lost)} (${f.fates.filter(x => x.holds && x.lost > 0).map(x => `${dispositionWord(x.disposition)} ${gbp(x.lost)}`).join(', ') || 'nothing priced'}).` : 'The decisions lost nothing priced.');
    if (f.notEarned > 0) out.push(`Margin not earned on what was destroyed: ${gbp(f.notEarned)} — the sale not made, said apart from what was lost.`);
    if (f.lostMissing) out.push('A decision has no figure for its cost yet — give the price lost, the rework’s cost or the cost of a piece on it.');
  }
  return out;
}

/** The lean page's actions: each open hold that needs a decision, who owes it and by when. */
export function holdActions(f: HoldFigures, today: string): { what: string; who?: string; due?: string; state: string; tone: Tone }[] {
  return f.open.map(h => ({
    what: `Decide ${label(h)} — ${h.product || 'product'} ${h.lot ? `(lot ${h.lot}) ` : ''}${qtyWords({ [h.unit]: heldQty(h) })}`,
    ...(h.owner?.trim() ? { who: h.owner.trim() } : {}), ...(h.decideBy ? { due: h.decideBy } : {}),
    state: pastDecideBy(h, today) ? 'Late' : h.decideBy ? 'Open' : 'No day set', tone: pastDecideBy(h, today) ? 'r' as const : h.decideBy ? 'n' as const : 'a' as const,
  })).sort((a, b) => (a.tone === 'r' ? 0 : a.tone === 'a' ? 1 : 2) - (b.tone === 'r' ? 0 : b.tone === 'a' ? 1 : 2));
}
