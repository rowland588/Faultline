/* SMED AS A LEAN PAGE (docs/LEAN-PAGE.md, slice 6) — the band, the tiles,
 * the action plan and the closing line SMED's page (screens/ChangeoverScreen)
 * and its paper (lib/studiesPdf) both draw, read from lib/ie/changeover: the
 * figures (changeoverFigures), the ladder (ladderOf), what the changeovers
 * cost (extrapolationSays, extrapolate — the one cost model: the line's speed,
 * its crew × rate, its margin a pack) and the sentence (changeoverSays).
 * Nothing is worked out here but a difference of two of the module's own.
 *
 * The tiles: the changeover now (against its standard when there is one);
 * what is left inside the stop once the external work is done while the line
 * runs; what the plan takes it to, against single-digit minutes; what the
 * changeovers stop the line a week (a year when its weeks are said) in packs
 * and pounds; and what the plan buys back. Missing, said: never a guess. */
import { planOrder, type LeanAction, type LeanPage, type LeanTile, type LeanTone } from '../../lib/lean';
import type { ChangeoverStep, StandardChangeover, ToolStudy } from '../../lib/study';
import { niceDay, todayISO } from '../../lib/weeks';
import {
  actionWords, changeoversPer, costOf, extrapolate, mins, onTarget, poundsOf, RUNG_WORD, runningOf, SMED_TARGET_SEC, span,
  type ChangeoverFigures, type ChangeoverSays, type Cost, type CostScale, type Ladder, type Rung, type SmedMoney,
} from './changeover';

const tone = (t: string): LeanTone => (t === 'r' || t === 'a' || t === 'g' ? t : 'n');
const sourceWords = (f: ChangeoverFigures): string => (f.source === 'none' ? 'not timed' : f.source === 'carried' ? 'some carried from before' : f.source);

/** What the plan buys back a week: the changeovers now, less the furthest
 *  rung there is a plan for (separated when there is none) — each figure the
 *  module's own (extrapolate). Nothing when how the line runs is not said. */
export function boughtBack(l: Ladder, s: Pick<ToolStudy, 'facts'>, money?: SmedMoney): { rung: Rung; cost: Cost } | undefined {
  const { run } = runningOf(s.facts.running);
  const per = changeoversPer(s.facts.changeovers, run);
  if (!run || !per || l.now.elapsedSec <= 0) return undefined;
  const rung: Rung = l.planned ? l.last : 'separated';
  if (l[rung].elapsedSec >= l.now.elapsedSec) return undefined;
  const rate = s.facts.ratePerMin && s.facts.ratePerMin > 0 ? s.facts.ratePerMin : undefined;
  const a = extrapolate(l.now.elapsedSec, per, run, rate, money).week, b = extrapolate(l[rung].elapsedSec, per, run, rate, money).week;
  const less = (x?: number, y?: number) => (x !== undefined && y !== undefined ? x - y : undefined);
  const packs = less(a.packs, b.packs), labour = less(a.labour, b.labour), contribution = less(a.contribution, b.contribution);
  return { rung, cost: { sec: a.sec - b.sec, ...(packs !== undefined ? { packs } : {}), ...(labour !== undefined ? { labour } : {}), ...(contribution !== undefined ? { contribution } : {}) } };
}

export function smedTiles(i: { f: ChangeoverFigures; l: Ladder; scale?: CostScale; costText: string; back?: ReturnType<typeof boughtBack>; agreed?: Pick<StandardChangeover, 'minutes'> }): LeanTile[] {
  const { f, l, scale, back } = i;
  const std = i.agreed && i.agreed.minutes > 0 ? i.agreed.minutes : undefined;
  const over = std !== undefined && f.nowSec / 60 - std > 0.5;
  const best = l[l.last].elapsedSec;
  const rungs = [l.converts ? `${mins(l.converted.elapsedSec)} converted` : '', l.streamlines ? `${mins(l.streamlined.elapsedSec)} streamlined` : ''].filter(Boolean).join(' · ');
  const stopped = scale?.year ?? scale?.week;
  const pounds = stopped && (stopped.labour !== undefined || stopped.contribution !== undefined);
  return [
    f.enough
      ? { k: 'Now', v: mins(f.nowSec), of: `${f.untimed ? 'at least · ' : ''}${f.steps} element${f.steps === 1 ? '' : 's'}, ${sourceWords(f)}${std !== undefined ? ` · the standard ${mins(std * 60)}` : ''}`, ...(over ? { tone: 'r' as LeanTone } : {}) }
      : { k: 'Now', v: '—', of: f.steps ? `${f.steps} element${f.steps === 1 ? '' : 's'}, none timed yet` : 'record it element by element' },
    f.enough
      ? { k: 'Inside the stop', v: mins(f.afterSec), of: f.externalSec > 0 ? `once the ${mins(f.externalSec)} of external work is done while the line runs` : 'all of it with the line stopped — no external work found yet', ...(f.externalSec > 0 ? { tone: 'a' as LeanTone } : {}) }
      : { k: 'Inside the stop', v: '—', of: 'said once an element is timed' },
    l.planned && f.enough
      ? { k: 'Planned to', v: mins(best), of: `${rungs}${onTarget(best) ? ' — single digits' : ` — ${mins(Math.max(1, best - SMED_TARGET_SEC))} still to find`}`, ...(onTarget(best) ? { tone: 'g' as LeanTone } : {}) }
      : { k: 'Planned to', v: '—', of: f.enough ? `no plan yet — SMED's target is under ${mins(SMED_TARGET_SEC)}` : `SMED's target: under ${mins(SMED_TARGET_SEC)}` },
    stopped
      ? { k: scale?.year ? 'A year stopped' : 'A week stopped', v: span(stopped.sec), of: `${costOf(stopped) || 'give the line its speed for the packs'}${pounds ? '' : ' · give the line its crew, rate and margin in Your factory for the pounds'}` }
      : { k: 'A week stopped', v: '—', of: i.costText ? i.costText.replace(/^What the changeovers cost needs how the line runs — /, 'say ').replace(/\.$/, '') : 'said once an element is timed' },
    back
      ? { k: back.rung === 'separated' ? 'Separating buys back' : 'The plan buys back', v: span(back.cost.sec), of: `a week${costOf(back.cost) ? ` — ${costOf(back.cost)}` : ''}${back.rung === 'separated' ? '' : ', if the plan holds'}` }
      : { k: 'Buys back', v: '—', of: scale ? 'nothing yet — move work out, or plan to convert and streamline' : 'said once what they cost is' },
  ];
}

/** THE CLOSING LINE — the minutes now against single digits (and the
 *  standard), what the changeovers stop the line a week in pounds, and what
 *  the plan buys back. */
export function smedClosing(i: { f: ChangeoverFigures; said: ChangeoverSays; scale?: CostScale; back?: ReturnType<typeof boughtBack>; agreed?: Pick<StandardChangeover, 'minutes'> }): { text: string; tone: LeanTone } {
  const { f, scale, back } = i;
  if (!f.enough) return { text: i.said.text, tone: 'n' };
  const std = i.agreed && i.agreed.minutes > 0 ? i.agreed.minutes : undefined;
  const over = std !== undefined ? f.nowSec / 60 - std : undefined;
  const now = `${f.untimed ? 'At least ' : ''}${mins(f.nowSec)} now`;
  const against = over !== undefined && over > 0.5 ? ` — ${mins(over * 60)} over the ${mins((std as number) * 60)} standard`
    : onTarget(f.nowSec) ? ' — single digits' : ` — ${mins(f.nowSec - SMED_TARGET_SEC)} from single digits`;
  const week = scale ? `; the changeovers stop the line ${span(scale.week.sec)} a week${poundsOf(scale.week) ? ` — ${poundsOf(scale.week)}` : ''}` : '; what they cost needs how the line runs';
  const buys = back ? `; ${back.rung === 'separated' ? 'separating' : 'the plan'} buys back ${span(back.cost.sec)} a week` : '';
  return { text: `${now}${against}${week}${buys}.`, tone: over !== undefined && over > 0.5 ? 'r' : f.externalSec > 0 ? 'a' : onTarget(f.nowSec) ? 'g' : 'n' };
}

/** THE ACTION PLAN — what was raised from an element (a fix, a
 *  countermeasure) first, then every element with a plan, in its SMED
 *  action's words. */
export function smedActions(seq: readonly ChangeoverStep[], raised: LeanAction[]): LeanAction[] {
  const planned = seq.filter(st => st.plan).map(st => ({
    what: `${st.name.trim() || 'An element'} — ${actionWords(st)}`,
    ...((st.plan?.crew ?? st.crew)?.length ? { who: (st.plan?.crew ?? st.crew ?? []).join(', ') } : {}),
    state: 'Planned', tone: 'n' as LeanTone,
  }));
  return [...planOrder(raised), ...planned];
}

/** SMED, read into the lean page. */
export function smedLean(i: {
  s: ToolStudy; f: ChangeoverFigures; l: Ladder; said: ChangeoverSays; cost: { text: string; scale?: CostScale };
  money?: SmedMoney; line?: string; agreed?: Pick<StandardChangeover, 'minutes'>; raised?: LeanAction[];
}): LeanPage {
  const { s, f, l, said, cost } = i;
  const back = boughtBack(l, s, i.money);
  const from = s.facts.fromProduct?.trim(), to = (s.facts.toProduct ?? s.product)?.trim();
  const seq = [...(s.facts.sequence ?? [])].sort((a, b) => a.order - b.order);
  return {
    eyebrow: 'SMED — quick changeover',
    title: s.name,
    sub: [from || to ? `From ${from || 'a product'} to ${to || 'a product'}` : '', s.machine ?? ''].filter(Boolean).join(' · '),
    verdict: { text: said.verdict, tone: tone(said.tone) },
    facts: [['Line', i.line ?? 'a quick session'], ['Started', niceDay(todayISO(new Date(s.startedAt)))], ...(l.planned ? [['The plan', `${RUNG_WORD[l.last]} to ${mins(l[l.last].elapsedSec)}`] as [string, string]] : [])],
    tiles: smedTiles({ f, l, ...(cost.scale ? { scale: cost.scale } : {}), costText: cost.text, ...(back ? { back } : {}), ...(i.agreed ? { agreed: i.agreed } : {}) }),
    insights: [],
    actions: smedActions(seq, i.raised ?? []),
    actionsEmpty: 'No element has a plan yet — convert or streamline one on the grid, or raise a fix from it.',
    closing: smedClosing({ f, said, ...(cost.scale ? { scale: cost.scale } : {}), ...(back ? { back } : {}), ...(i.agreed ? { agreed: i.agreed } : {}) }),
  };
}

