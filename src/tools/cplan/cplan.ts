/* THE CONTROL PLAN — what is checked, against what, how, how often, by whom, and what is done when it is not (FC-133; knowledge/specs/FC-133-control-plan.md;
 * knowledge/methods/quality/control-plan.md).
 *
 * A register of characteristics, a card each: the step, the characteristic, its specification, the method and gauge, the sample, how often (minutes between
 * checks, or what triggers it), who, where it is recorded, and the REACTION when it is out. A row can point at the FMEA failure mode it controls (so the plan
 * says which High and Medium risks have no check) and at a check of a check log (so it says whether that check is due, overdue or failed, and whether the log
 * runs at the interval the plan promises). The money is the checks' labour a shift and the product at risk between two checks — arithmetic of the plan's own
 * numbers, no drift frequency invented. Pure; the page and the paper read this module. */
import type { PlanData, ScoredRow, ToolStudy } from '../../lib/study';
import type { LeanTile, LeanTone } from '../../lib/lean';
import type { ScoredContext, ScoredRanked, ScoredResult, ScoredTable } from '../scored/types';
import { readRow, needsAction, AP_WORD } from '../fmea/fmea';
import { checkState, intervalOf, type CheckState } from '../checks/checks';
import { defOf } from '../checks/registry';
import { logOf } from '../checks/checks';

const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;
const gbp = (v: number): string => `£${v.toLocaleString('en-GB', { maximumFractionDigits: v < 100 ? 2 : 0 })}`;
const num = (n: number): string => n.toLocaleString('en-GB', { maximumFractionDigits: 1 });
const pos = (v: number | undefined): v is number => v !== undefined && Number.isFinite(v) && v > 0;

/** The words of the control plan's missing parts — each a part a plan row must say before it is a check. */
export const PART_WORD = { spec: 'what it is checked against', method: 'how (the method and the gauge)', sample: 'the sample', often: 'how often', owner: 'who', reaction: 'what is done when it is out' } as const;
export type Part = keyof typeof PART_WORD;

/** What the plan can see beside it: the FMEAs and the check logs of the same line or project. */
export interface Beside {
  fmeas: { study: ToolStudy; modes: { id: string; mode: string; step?: string; ap: 'H' | 'M' | 'L'; s: number; needs: boolean; detection?: string; haccp?: boolean }[] }[];
  checks: { logId: string; log: string; checkId: string; name: string; interval?: number; who?: string; reaction?: string; state?: CheckState }[];
}
const sameScope = (self: ScoredContext['self'], s: ToolStudy): boolean =>
  !s.deletedAt && s.id !== self?.id && ((!!self?.workspaceId && s.workspaceId === self.workspaceId) || (!!self?.projectId && s.projectId === self.projectId));

/** The FMEAs and the check logs beside this plan: same line or same project, never deleted. */
export function besideOf(ctx: ScoredContext): Beside {
  const fmeas: Beside['fmeas'] = [], checks: Beside['checks'] = [];
  for (const s of ctx.studies) {
    if (!sameScope(ctx.self, s)) continue;
    if (s.tool === 'scored' && s.agreed?.scored?.key === 'fmea') {
      const modes = (s.agreed.scored.rows ?? []).map((r, i) => readRow(r, i + 1, ctx.today)).filter(r => r.rated && r.ap)
        .map(r => ({ id: r.id, mode: r.mode, ...(r.f.step ? { step: r.f.step } : {}), ap: r.ap as 'H' | 'M' | 'L', s: r.f.s as number, needs: needsAction(r), ...(r.f.detection ? { detection: r.f.detection } : {}), ...(r.f.haccp ? { haccp: true } : {}) }));
      fmeas.push({ study: s, modes });
    } else if (s.tool === 'log' && s.agreed?.log) {
      const log = logOf(s), def = defOf(log.key);
      for (const c of log.checks) {
        if (c.removed) continue;
        const iv = intervalOf(c.when, log.shiftHours);
        checks.push({ logId: s.id, log: s.name, checkId: c.id, name: c.name, ...(iv !== undefined ? { interval: iv / 60_000 } : {}), ...(c.who ? { who: c.who } : {}), ...(c.reaction ? { reaction: c.reaction } : {}), state: checkState(c, log, s.facts?.results, ctx.now, def) });
      }
    }
  }
  return { fmeas, checks };
}

export interface PlanRead {
  id: string; no: number; name: string; f: PlanData; named: boolean;
  /** which of the six parts are still unsaid */
  missing: Part[]; complete: boolean;
  /** minutes between checks — typed, else the linked check's */
  every?: number; eventOnly: boolean;
  fmea?: { mode: string; ap: 'H' | 'M' | 'L'; study: string }; linkedState?: CheckState; linkedName?: string;
  /** the plan says one interval, the log runs another */
  mismatch?: { plan: number; log: number };
  checksShift?: number; labourShift?: number; atRisk?: number; atRiskGbp?: number;
}

export function readPlanRow(row: ScoredRow, no: number, beside: Beside, inputs: ScoredContext['inputs'] = {}): PlanRead {
  const f = row.plan ?? {}, name = row.name.trim();
  const link = f.link ? beside.checks.find(c => c.logId === f.link?.logId && c.checkId === f.link?.checkId) : undefined;
  const typedEvery = pos(f.everyMin) ? f.everyMin : undefined, event = !!f.event?.trim();
  const every = typedEvery ?? (link?.interval);
  const missing: Part[] = [];
  if (!f.spec?.trim()) missing.push('spec');
  if (!f.method?.trim()) missing.push('method');
  if (!f.sample?.trim() && !pos(f.n)) missing.push('sample');
  if (every === undefined && !event) missing.push('often');
  if (!f.owner?.trim() && !link?.who) missing.push('owner');
  if (!f.reaction?.trim() && !link?.reaction) missing.push('reaction');
  const fm = f.fmea ? beside.fmeas.find(x => x.study.id === f.fmea?.studyId)?.modes.find(m => m.id === f.fmea?.rowId) : undefined;
  const fmeaStudy = f.fmea ? beside.fmeas.find(x => x.study.id === f.fmea?.studyId)?.study.name : undefined;
  const shiftMin = pos(inputs.shiftMin) ? inputs.shiftMin : undefined;
  const checksShift = every !== undefined && shiftMin !== undefined ? shiftMin / every : undefined;
  const labourShift = checksShift !== undefined && pos(f.minutes) && pos(inputs.rate) ? checksShift * f.minutes / 60 * inputs.rate : undefined;
  const atRisk = every !== undefined && pos(inputs.speed) ? every * inputs.speed : undefined;
  return {
    id: row.id, no, name, f, named: !!name, missing, complete: !!name && missing.length === 0, ...(every !== undefined ? { every } : {}), eventOnly: every === undefined && event,
    ...(fm ? { fmea: { mode: fm.mode, ap: fm.ap, study: fmeaStudy ?? '' } } : {}), ...(link?.state ? { linkedState: link.state } : {}), ...(link ? { linkedName: `${link.log} — ${link.name}` } : {}),
    ...(link?.interval !== undefined && typedEvery !== undefined && Math.abs(link.interval - typedEvery) > 0.5 ? { mismatch: { plan: typedEvery, log: link.interval } } : {}),
    ...(checksShift !== undefined ? { checksShift } : {}), ...(labourShift !== undefined ? { labourShift } : {}), ...(atRisk !== undefined ? { atRisk } : {}),
    ...(atRisk !== undefined && pos(inputs.packCost) ? { atRiskGbp: atRisk * inputs.packCost } : {}),
  };
}

const everyWords = (r: PlanRead): string => (r.every !== undefined ? `every ${num(r.every)} min` : r.eventOnly ? (r.f.event ?? '').trim() : '—');

export interface CplanOut { result: ScoredResult; table: ScoredTable; ranked: ScoredRanked[]; reads: PlanRead[]; uncovered: { mode: string; ap: 'H' | 'M' | 'L'; step?: string; study: string }[] }
export function cplanAnalyse(a: { rows: ScoredRow[]; ctx: ScoredContext }): { problems: string[] } | CplanOut {
  const beside = besideOf(a.ctx), inputs = a.ctx.inputs ?? {};
  const reads = a.rows.map((r, i) => readPlanRow(r, i + 1, beside, inputs)), named = reads.filter(r => r.named);
  if (!named.length) return { problems: ['Name at least one characteristic — what is checked, e.g. “Seal strength”, “Net weight”, “Metal detector sensitivity”.'] };
  const complete = named.filter(r => r.complete), partial = named.filter(r => !r.complete);
  /* the High and Medium failure modes of the FMEAs beside, and which of them a row points at */
  const pointed = new Set(named.filter(r => r.f.fmea).map(r => `${r.f.fmea?.studyId}/${r.f.fmea?.rowId}`));
  const uncovered: CplanOut['uncovered'] = [];
  let risks = 0, covered = 0;
  for (const fm of beside.fmeas) for (const m of fm.modes) {
    if (m.ap === 'L' && m.s < 8) continue;
    risks++;
    if (pointed.has(`${fm.study.id}/${m.id}`)) covered++; else uncovered.push({ mode: m.mode, ap: m.ap, ...(m.step ? { step: m.step } : {}), study: fm.study.name });
  }
  uncovered.sort((x, y) => 'HML'.indexOf(x.ap) - 'HML'.indexOf(y.ap));
  const states = named.filter(r => r.linkedState), failed = states.filter(r => r.linkedState?.key === 'failed'), overdue = states.filter(r => r.linkedState?.key === 'overdue'), due = states.filter(r => r.linkedState?.key === 'due');
  const mismatch = named.filter(r => r.mismatch);
  const noFmea = named.filter(r => !r.f.fmea && !r.f.haccp);
  /* money */
  const labour = named.reduce((n, r) => n + (r.labourShift ?? 0), 0), labourRows = named.filter(r => r.labourShift !== undefined).length;
  const checksShift = named.reduce((n, r) => n + (r.checksShift ?? 0), 0);
  const worst = named.filter(r => r.atRisk !== undefined).sort((x, y) => (y.atRisk as number) - (x.atRisk as number))[0];
  const gaps = partial.length + uncovered.filter(u => u.ap === 'H').length + failed.length + overdue.length;
  const verdict = gaps ? `${plural(gaps, 'gap')}` : 'Complete';
  const tone: LeanTone = failed.length || overdue.length ? 'r' : gaps ? 'a' : 'g';
  const parts: string[] = [];
  parts.push(`${plural(named.length, 'characteristic')} on the plan: ${complete.length} complete${partial.length ? `, ${partial.length} with something unsaid` : ''}.`);
  if (partial.length) {
    const p = partial[0];
    parts.push(`${p.name} — still to say: ${p.missing.map(m => PART_WORD[m]).join(', ')}${partial.length > 1 ? `; and ${partial.length - 1} more` : ''}.`);
  }
  if (risks) parts.push(`${covered} of ${plural(risks, 'High or Medium failure mode')} ${covered === 1 ? 'has' : 'have'} a check on the plan${uncovered.length ? `; without one: ${uncovered.slice(0, 3).map(u => `${u.mode} (${AP_WORD[u.ap]})`).join(', ')}${uncovered.length > 3 ? ` and ${uncovered.length - 3} more` : ''}` : ''}.`);
  else parts.push('No FMEA on this line or project to read the risks from — start one, or point each row at the risk it controls.');
  if (states.length) parts.push(`${plural(states.length, 'row')} ${states.length === 1 ? 'reads' : 'read'} a check log: ${failed.length} failed, ${overdue.length} overdue, ${due.length} due now.`);
  if (mismatch.length) parts.push(`${mismatch[0].name}: the plan says every ${num(mismatch[0].mismatch?.plan ?? 0)} min, its log runs every ${num(mismatch[0].mismatch?.log ?? 0)} min${mismatch.length > 1 ? ` (and ${mismatch.length - 1} more differ)` : ''}.`);
  const tiles: LeanTile[] = [
    { k: 'Characteristics', v: String(named.length) },
    { k: 'Complete', v: String(complete.length), of: `of ${named.length}`, ...(partial.length ? { tone: 'a' as LeanTone } : {}) },
    { k: 'Risks with a check', v: risks ? String(covered) : '—', of: risks ? `of ${risks}` : 'no FMEA', ...(uncovered.some(u => u.ap === 'H') ? { tone: 'a' as LeanTone } : {}) },
    { k: 'Checks owed', v: states.length ? String(failed.length + overdue.length + due.length) : '—', of: states.length ? `${failed.length} failed · ${overdue.length} overdue` : 'no log linked', ...(failed.length || overdue.length ? { tone: 'r' as LeanTone } : {}) },
    { k: 'Checks a shift', v: checksShift > 0 ? num(Math.round(checksShift * 10) / 10) : '—', of: checksShift > 0 ? (labourRows ? `${gbp(Math.round(labour * 100) / 100)} of labour` : 'labour not priced') : 'shift minutes not given' },
  ];
  /* money lines — arithmetic of the plan's own numbers; a missing input is named, nothing waits on it */
  const money: string[] = [];
  if (labourRows) money.push(`The checks cost ${gbp(Math.round(labour * 100) / 100)} of labour a shift (${num(Math.round(checksShift * 10) / 10)} checks × the minutes each takes × ${gbp(inputs.rate as number)} an hour) — appraisal cost, the price of knowing.`);
  if (worst && worst.atRisk !== undefined) money.push(`The most product a failed check can find: ${worst.name}, every ${num(worst.every as number)} min at ${num(inputs.speed as number)} packs a minute — ${num(Math.round(worst.atRisk))} packs made since the last good check${worst.atRiskGbp !== undefined ? `, worth ${gbp(Math.round(worst.atRiskGbp))} at ${gbp(inputs.packCost as number)} a pack held` : ''}. A shorter interval holds less and costs more checks.`);
  const missingIn: string[] = [];
  if (!pos(inputs.shiftMin)) missingIn.push('the minutes of a shift');
  if (!pos(inputs.rate)) missingIn.push('£ an hour for the people checking');
  if (named.some(r => r.every !== undefined && !pos(r.f.minutes))) missingIn.push('the minutes one check takes');
  if (!pos(inputs.speed)) missingIn.push('the line’s speed (packs a minute)');
  if (!pos(inputs.packCost)) missingIn.push('what a pack held is worth');
  if (missingIn.length) money.push(`To price the plan give ${missingIn.join(', ')}. Nothing waits on it.`);
  const closing = `${verdict} — ${plural(named.length, 'characteristic')}, ${complete.length} complete${uncovered.filter(u => u.ap === 'H').length ? `, ${plural(uncovered.filter(u => u.ap === 'H').length, 'High risk')} without a check` : ''}${failed.length ? `, ${failed.length} check${failed.length === 1 ? '' : 's'} failed` : ''}.`;
  const caveats = [
    'A row is complete when it says what it is checked against, how, the sample, how often, who and the reaction: a check with no reaction is data collection, and “every hour” with no sample or gauge named is not a check.',
    'The plan lists what the team wrote. Whether the interval is right is a trade of the checks’ labour against the product at risk between them — the money lines give both sides from the numbers typed; the chance of a drift is not guessed here.',
    'The risks read from the FMEA are its High and Medium failure modes and any rated 8 or more for severity, whatever their priority.',
    'A critical control point of the HACCP plan is referenced here (tick it), not specified: its limits, monitoring and verification belong to the HACCP plan, which is not built in Luna yet.',
    ...(noFmea.length ? [`${plural(noFmea.length, 'row')} ${noFmea.length === 1 ? 'is' : 'are'} not tied to a failure mode or a food-safety hazard — a check needs a reason (a risk, a customer specification, a legal limit); say which, or question it.`] : []),
    ...(states.length ? [] : ['No row reads a check log yet: link a row to a check of a log on this line or project and the plan says whether it is due, overdue or failed.']),
  ];
  const result: ScoredResult = { verdict, tone, sentence: parts.join(' '), tiles, closing, caveats, ...(money.length ? { money } : {}),
    ...(uncovered.length ? { also: { title: 'Risks without a check', lines: uncovered.map(u => `${u.mode}${u.step ? ` (${u.step})` : ''} — ${AP_WORD[u.ap]}, from ${u.study}`) } } : {}) };
  const table: ScoredTable = {
    head: ['#', 'Step · characteristic', 'Against', 'How · sample', 'How often · who', 'Record', 'If it is out', 'Controls · state'],
    rows: named.map((r, i) => [String(i + 1), [r.f.step?.trim(), r.name].filter(Boolean).join(' · '), r.f.spec?.trim() || '—',
      [r.f.method?.trim(), r.f.sample?.trim() || (pos(r.f.n) ? `n = ${r.f.n}` : '')].filter(Boolean).join(' · ') || '—',
      [everyWords(r), r.f.owner?.trim() || ''].filter(s => s && s !== '—').join(' · ') || '—', r.f.record?.trim() || '—', r.f.reaction?.trim() || '—',
      [r.fmea ? `${r.fmea.mode} (${AP_WORD[r.fmea.ap]})` : '', r.f.haccp ? 'HACCP' : '', r.linkedState ? `${r.linkedName}: ${r.linkedState.key}` : '', r.missing.length ? `to say: ${r.missing.map(m => PART_WORD[m]).join(', ')}` : ''].filter(Boolean).join(' — ') || '—']),
    foot: [], shares: [0.04, 0.15, 0.13, 0.17, 0.14, 0.1, 0.12, 0.15], columnIds: [],
  };
  const rankedOut: ScoredRanked[] = named.map((r, i) => ({ id: r.id, name: r.name, score: i + 1, class: r.complete ? 'complete' : 'open' }));
  return { result, table, ranked: rankedOut, reads, uncovered };
}

/** A fresh plan: one blank card. */
export const cplanStart = (uid: () => string): ScoredRow[] => [{ id: uid(), name: '', plan: {} }];
/** Characteristics to start from: one card for each High or Medium failure mode (or any rated 8 or more) that no row points at yet, the FMEA's step and detection carried over. */
export function fromFmea(rows: ScoredRow[], beside: Beside, uid: () => string): ScoredRow[] {
  const pointed = new Set(rows.filter(r => r.plan?.fmea).map(r => `${r.plan?.fmea?.studyId}/${r.plan?.fmea?.rowId}`));
  const out: ScoredRow[] = [];
  for (const fm of beside.fmeas) for (const m of fm.modes) {
    if ((m.ap === 'L' && m.s < 8) || pointed.has(`${fm.study.id}/${m.id}`)) continue;
    out.push({ id: uid(), name: m.detection ?? m.mode, plan: { ...(m.step ? { step: m.step } : {}), ...(m.detection ? { method: m.detection } : {}), fmea: { studyId: fm.study.id, rowId: m.id }, ...(m.haccp ? { haccp: true } : {}) } });
  }
  return out;
}
