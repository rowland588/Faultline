/* PRODUCT ON HOLD — what is held, since when, why, who decides, what became of it and what it cost (FC-135; knowledge/specs/FC-135-product-on-hold.md;
 * knowledge/methods/quality/nonconformance-hold.md).
 *
 * A register of holds, a card each: the product and lot, how many packs, where it sits and whether it is segregated and labelled, why it was held and the cause
 * (for the Pareto), who raised it and when, WHO MAY RELEASE it and the day the decision is due — then the fate: released as it is, released under concession,
 * reworked, regraded or destroyed, with who decided, when and on what grounds. The money keeps the record's two-parts rule: what is TIED UP while a hold is open
 * (packs × what a pack has cost to this point — not lost unless the product is) and what was LOST once it is decided (by its fate); the two are never added.
 * Pure; the page and the paper read this module. */
import type { HoldData, ScoredRow } from '../../lib/study';
import type { LeanTile, LeanTone } from '../../lib/lean';
import type { ScoredContext, ScoredRanked, ScoredResult, ScoredTable } from '../scored/types';
import { daysBetween, niceDay, todayISO } from '../../lib/weeks';

export type Fate = NonNullable<HoldData['fate']>;
export const FATES: { key: Fate; word: string; means: string }[] = [
  { key: 'release', word: 'Released', means: 'shown to conform — re-tested, or the failed check was in error' },
  { key: 'concession', word: 'Released under concession', means: 'does not conform, the customer accepted in writing' },
  { key: 'rework', word: 'Reworked', means: 'brought to conform and re-inspected' },
  { key: 'regrade', word: 'Regraded', means: 'sold as a lower grade' },
  { key: 'destroy', word: 'Destroyed', means: 'scrapped, or diverted where lawful' },
];
export const FATE_WORD: Record<Fate, string> = Object.fromEntries(FATES.map(f => [f.key, f.word])) as Record<Fate, string>;
export const CAUSES = ['Seal', 'Weight', 'Code or label', 'Metal detection', 'Allergen', 'Supplier material', 'Complaint', 'Other'];
/** A cause that returns this many times is said worth an 8D — Faultline's choice, not a standard's. */
export const REPEAT_AT = 3;
export type Part = 'qty' | 'reason' | 'raised' | 'decider' | 'segregated';
export const PART_WORD: Record<Part, string> = { qty: 'how many packs', reason: 'why it is held', raised: 'the day it was raised', decider: 'who may release it', segregated: 'that it is segregated' };

const plural = (n: number, one: string, many = `${one}s`): string => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;
const gbp = (v: number): string => `£${v.toLocaleString('en-GB', { minimumFractionDigits: v < 100 && v % 1 ? 2 : 0, maximumFractionDigits: v < 100 ? 2 : 0 })}`;
const pos = (v: number | undefined): v is number => v !== undefined && Number.isFinite(v) && v > 0;
const iso = (v: string | undefined): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
const num1 = (n: number): string => n.toLocaleString('en-GB', { maximumFractionDigits: 1 });

export interface HoldInputs { rate?: number; costToDate?: number; margin?: number; carryPct?: number }
export interface HoldRead {
  id: string; no: number; name: string; f: HoldData; named: boolean; open: boolean; qty?: number;
  missing: Part[]; days?: number; overdue: boolean; noDay: boolean;
  tiedUp?: number; carry?: number; lifeUsed?: number;
  /** what a decided hold lost, and the parts it could not be told for */
  lost?: number; lostMissing: string[];
}
export function readHold(row: ScoredRow, no: number, today: string, inp: HoldInputs): HoldRead {
  const f = row.hold ?? {}, name = row.name.trim(), open = !f.fate, qty = pos(f.qty) ? Math.round(f.qty) : undefined;
  const missing: Part[] = [];
  if (qty === undefined) missing.push('qty');
  if (!f.reason?.trim()) missing.push('reason');
  if (!iso(f.raisedOn)) missing.push('raised');
  if (!f.decider?.trim()) missing.push('decider');
  if (open && !f.segregated) missing.push('segregated');
  const end = !open && iso(f.decidedOn) ? f.decidedOn : today;
  const days = iso(f.raisedOn) ? Math.max(0, daysBetween(f.raisedOn, end)) : undefined;
  const tiedUp = open && qty !== undefined && pos(inp.costToDate) ? qty * inp.costToDate : undefined;
  const carry = tiedUp !== undefined && days !== undefined && pos(inp.carryPct) ? tiedUp * inp.carryPct / 100 * days / 365 : undefined;
  const lifeUsed = days !== undefined && pos(f.life) ? days / f.life : undefined;
  let lost: number | undefined; const lostMissing: string[] = [];
  if (!open && f.fate) {
    const labourOf = (): number | undefined => {
      if (!pos(f.hours)) { lostMissing.push('the hours it took'); return undefined; }
      if (!pos(inp.rate)) { lostMissing.push('£ an hour'); return undefined; }
      return f.hours * inp.rate;
    };
    if (f.fate === 'release') lost = labourOf();
    else if (f.fate === 'rework') { const l = labourOf(); lost = l === undefined ? undefined : l + (f.extra ?? 0); }
    else if (f.fate === 'concession' || f.fate === 'regrade') {
      if (qty !== undefined && pos(f.lossPerPack)) lost = qty * f.lossPerPack; else lostMissing.push('the price lost a pack');
    } else {
      if (!pos(inp.costToDate)) lostMissing.push('what a pack cost to this point (materials and labour)');
      if (!pos(inp.margin)) lostMissing.push('the margin a pack');
      if (qty !== undefined && pos(inp.costToDate) && pos(inp.margin)) lost = qty * (inp.costToDate + inp.margin) + (f.disposal ?? 0);
    }
  }
  return { id: row.id, no, name, f, named: !!name, open, ...(qty !== undefined ? { qty } : {}), missing, ...(days !== undefined ? { days } : {}),
    overdue: open && iso(f.decideBy) && f.decideBy < today, noDay: open && !iso(f.decideBy), ...(tiedUp !== undefined ? { tiedUp } : {}), ...(carry !== undefined ? { carry } : {}),
    ...(lifeUsed !== undefined ? { lifeUsed } : {}), ...(lost !== undefined ? { lost } : {}), lostMissing };
}

export interface HoldOut { result: ScoredResult; table: ScoredTable; ranked: ScoredRanked[]; reads: HoldRead[]; causes: { cause: string; holds: number; packs: number }[] }
export function holdAnalyse(a: { rows: ScoredRow[]; ctx: ScoredContext }): { problems: string[] } | HoldOut {
  const inp: HoldInputs = { rate: a.ctx.inputs?.rate, costToDate: a.ctx.inputs?.costToDate, margin: a.ctx.inputs?.margin, carryPct: a.ctx.inputs?.carryPct };
  const reads = a.rows.map((r, i) => readHold(r, i + 1, a.ctx.today, inp)), all = reads.filter(r => r.named);
  if (!all.length) return { problems: ['Name at least one hold — what is held, e.g. “Maris 500 g — failed seal check”.'] };
  const open = all.filter(r => r.open).sort((x, y) => (y.days ?? -1) - (x.days ?? -1) || x.no - y.no), done = all.filter(r => !r.open);
  const packs = open.reduce((n, r) => n + (r.qty ?? 0), 0), oldest = open[0]?.days;
  const overdue = open.filter(r => r.overdue), noDay = open.filter(r => r.noDay), unsaid = open.filter(r => r.missing.length);
  const priced = open.filter(r => r.tiedUp !== undefined), tied = priced.reduce((n, r) => n + (r.tiedUp as number), 0), carry = priced.reduce((n, r) => n + (r.carry ?? 0), 0);
  const lostRows = done.filter(r => r.lost !== undefined), lost = lostRows.reduce((n, r) => n + (r.lost as number), 0), lostUnknown = done.filter(r => r.lost === undefined);
  const byFate = (k: Fate) => done.filter(r => r.f.fate === k);
  /* the Pareto of causes — decided and open together, the holds of the register */
  const cmap = new Map<string, { cause: string; holds: number; packs: number }>();
  for (const r of all) { const c = (r.f.cause ?? '').trim(); if (!c) continue; const k = c.toLowerCase(), e = cmap.get(k) ?? { cause: c, holds: 0, packs: 0 }; e.holds++; e.packs += r.qty ?? 0; cmap.set(k, e); }
  const causes = [...cmap.values()].sort((x, y) => y.holds - x.holds || y.packs - x.packs || x.cause.localeCompare(y.cause));
  const repeats = causes.filter(c => c.holds >= REPEAT_AT);
  const verdict = open.length ? `${open.length} on hold` : 'None on hold';
  const tone: LeanTone = overdue.length ? 'r' : unsaid.length || noDay.length ? 'a' : open.length ? 'n' : 'g';
  const oldestRead = open[0];
  const parts: string[] = [];
  parts.push(open.length ? `${plural(open.length, 'hold')} open — ${plural(packs, 'pack')} held, the oldest ${oldest === undefined ? 'with no raised day' : plural(oldest, 'day')} (${oldestRead.name}).` : 'Nothing is on hold.');
  if (overdue.length) parts.push(`${plural(overdue.length, 'decision')} past ${overdue.length === 1 ? 'its' : 'their'} day: ${overdue.slice(0, 3).map(r => `${r.name} (due ${niceDay(r.f.decideBy)})`).join('; ')}${overdue.length > 3 ? `; and ${overdue.length - 3} more` : ''}.`);
  if (noDay.length) parts.push(`${plural(noDay.length, 'open hold')} ${noDay.length === 1 ? 'has' : 'have'} no day for the decision — a hold with no decision day is a slow destroy, the shelf life runs out.`);
  if (unsaid.length) parts.push(`${unsaid[0].name} still has to say ${unsaid[0].missing.map(m => PART_WORD[m]).join(', ')}${unsaid.length > 1 ? `; and ${unsaid.length - 1} more hold${unsaid.length === 2 ? '' : 's'} have gaps` : ''}.`);
  if (done.length) parts.push(`${plural(done.length, 'hold')} decided: ${FATES.map(f => [f.word.toLowerCase(), byFate(f.key).length] as const).filter(([, n]) => n).map(([w, n]) => `${n} ${w}`).join(', ')}.`);
  if (repeats.length) parts.push(`${repeats[0].cause} has held product ${repeats[0].holds} times (${plural(repeats[0].packs, 'pack')}) — a repeating cause is worth an 8D.`);
  const worstLife = open.filter(r => r.lifeUsed !== undefined).sort((x, y) => (y.lifeUsed as number) - (x.lifeUsed as number))[0];
  const tiles: LeanTile[] = [
    { k: 'On hold', v: String(open.length), ...(done.length || open.length ? { of: `of ${all.length} holds` } : {}), ...(open.length ? { tone: (overdue.length ? 'r' : 'a') as LeanTone } : {}) },
    { k: 'Packs held', v: packs.toLocaleString('en-GB') },
    { k: 'Oldest', v: oldest === undefined ? '—' : `${oldest} d`, ...(overdue.length ? { tone: 'r' as LeanTone } : {}) },
    { k: 'Tied up', v: priced.length ? gbp(Math.round(tied)) : '—', of: priced.length ? 'not lost' : 'cost not given' },
    { k: 'Lost, decided', v: lostRows.length ? gbp(Math.round(lost)) : '—', of: lostRows.length ? `${plural(lostRows.length, 'hold')}` : done.length ? 'inputs not given' : 'none decided' },
  ];
  const money: string[] = [];
  if (priced.length) money.push(`${gbp(Math.round(tied))} is tied up in ${plural(priced.length, 'open hold')} (packs × ${gbp(inp.costToDate as number)} a pack to this point)${carry > 0 ? `, carried at ${num1(inp.carryPct as number)}% a year ≈ ${gbp(Math.round(carry))} so far` : ''} — money held, not lost unless the product is.`);
  if (worstLife && worstLife.lifeUsed !== undefined) money.push(`${worstLife.name} has used ${Math.round(worstLife.lifeUsed * 100)}% of its shelf life on hold (${plural(worstLife.days ?? 0, 'day')} of ${worstLife.f.life}) — the cost that may force a regrade.`);
  if (lostRows.length) money.push(`Decided holds lost ${gbp(Math.round(lost))}: ${FATES.map(f => { const rr = byFate(f.key).filter(r => r.lost !== undefined); return rr.length ? `${f.word.toLowerCase()} ${gbp(Math.round(rr.reduce((n, r) => n + (r.lost as number), 0)))}` : ''; }).filter(Boolean).join(', ')}. Tied up and lost are never added.`);
  const miss = new Set<string>();
  if (open.length && !pos(inp.costToDate)) miss.add('what a pack cost to this point (materials and labour)');
  for (const r of lostUnknown) for (const m of r.lostMissing) miss.add(m);
  if (open.length && priced.length && !pos(inp.carryPct)) miss.add('the carrying rate, % a year');
  if (miss.size) money.push(`To say it in money give ${[...miss].join(', ')}. Nothing waits on it.`);
  const closing = `${verdict}${open.length ? ` — ${plural(packs, 'pack')}, the oldest ${oldest ?? '?'} d${overdue.length ? `, ${overdue.length} decision${overdue.length === 1 ? '' : 's'} late` : ''}` : ''}.`;
  const caveats = [
    'Held product must be physically segregated or locked in the system, with its label: the record alone releases nothing and holds nothing.',
    'Release is decided by the person named as the authority — quality, not production under pressure; the page records who decided and on what grounds, it does not decide.',
    'The money tied up is not a loss and is never added to the losses; only a decided hold says what was lost. A rework with no re-inspection is a release.',
    'Allergen and food-safety holds are HACCP matters with their own rules; this register records them, it does not replace the HACCP plan (not built, FC-168).',
    `A cause counted ${REPEAT_AT} times is called repeating — Faultline’s cut, not a standard’s; the Pareto here is of this register only, not of the problems register.`,
  ];
  const result: ScoredResult = { verdict, tone, sentence: parts.join(' '), tiles, closing, caveats, ...(money.length ? { money } : {}),
    ...(causes.length ? { also: { title: 'Holds by cause', lines: causes.map(c => `${c.cause} — ${plural(c.holds, 'hold')}, ${plural(c.packs, 'pack')}${c.holds >= REPEAT_AT ? ' · repeating' : ''}`) } } : {}) };
  const order = [...open, ...done.slice().sort((x, y) => (y.f.decidedOn ?? '').localeCompare(x.f.decidedOn ?? '') || x.no - y.no)];
  const fate = (r: HoldRead): string => (r.open ? `Held${r.f.decideBy ? ` — decide by ${niceDay(r.f.decideBy)}${r.overdue ? ' — LATE' : ''}` : ' — no decision day'}` : `${FATE_WORD[r.f.fate as Fate]}${r.f.decidedBy ? ` by ${r.f.decidedBy}` : ''}${iso(r.f.decidedOn) ? ` on ${niceDay(r.f.decidedOn)}` : ''}${r.f.grounds?.trim() ? ` — ${r.f.grounds.trim()}` : ''}`);
  const table: ScoredTable = {
    head: ['#', 'Hold · lot', 'Packs', 'Where', 'Why · cause', 'Raised', 'Days', 'Who may release', 'State · decision', 'Money'],
    rows: order.map((r, i) => [String(i + 1), [r.name, r.f.lot?.trim() ? `lot ${r.f.lot.trim()}` : '', r.f.label?.trim() ? `label ${r.f.label.trim()}` : ''].filter(Boolean).join(' · '), r.qty !== undefined ? r.qty.toLocaleString('en-GB') : '—',
      [r.f.where?.trim() || '—', r.open ? (r.f.segregated ? 'segregated' : 'not segregated') : ''].filter(Boolean).join(' · '), [r.f.reason?.trim(), r.f.cause?.trim()].filter(Boolean).join(' — ') || '—',
      iso(r.f.raisedOn) ? niceDay(r.f.raisedOn) : '—', r.days !== undefined ? String(r.days) : '—', [r.f.decider?.trim(), r.f.ref?.trim() ? `ref ${r.f.ref.trim()}` : ''].filter(Boolean).join(' · ') || '—', fate(r),
      r.open ? (r.tiedUp !== undefined ? `${gbp(Math.round(r.tiedUp))} tied up` : '—') : (r.lost !== undefined ? `${gbp(Math.round(r.lost))} lost` : r.lostMissing.length ? `needs ${r.lostMissing.join(', ')}` : '—')]),
    foot: [], shares: [0.035, 0.15, 0.06, 0.1, 0.13, 0.075, 0.04, 0.11, 0.18, 0.12], columnIds: [],
  };
  const rankedOut: ScoredRanked[] = order.map((r, i) => ({ id: r.id, name: r.name, score: i + 1, class: r.open ? 'open' : 'decided' }));
  return { result, table, ranked: rankedOut, reads, causes };
}

/** A fresh register: one blank hold, raised today. */
export const holdStart = (uid: () => string, today: string = todayISO()): ScoredRow[] => [{ id: uid(), name: '', hold: { raisedOn: today } }];
