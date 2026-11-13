/* THE FACTORY OVERVIEW — one customer's factory as the consultant sees it, read from the records already kept (13 November,
 * docs/OVERVIEW.md — Rowland: "a collective view that I can present to a customer … It should tell the story of the factory as I see
 * it … a living picture that develops as I carry out further work, retaining the original baseline … I do not want to enter
 * information twice or maintain a separate set of dashboard data").
 *
 * Nothing here is typed, and nothing is kept: every line is a reading of what the app already holds, by the readers its pages use —
 *   WHAT IS WRONG        the register's open problems priced by each line's own cost model (lib/useFactoryRead, lib/factoryQuestions)
 *   WHAT HOLDS EACH LINE the bottleneck its Line capacity works out (lib/lineLoss neckOf) — or said not worked out yet
 *   WHERE WE HAVE LOOKED the customer's areas, lines and machines, and what was done on each: studies, problems, visits (lib/areas)
 *   WHAT Faultline FOUND     the findings engine's own sentences on each line (lib/brain)
 *   WHAT NEEDS ATTENTION critical and late work, work nobody owns, lines never looked at
 *   WHAT HAS IMPROVED    the fixes proved with their before → after (tools/yokoten) and whether each fix held (lib/knowledge)
 *   SINCE THE BASELINE   the Story's first chapter is the baseline — its figures were frozen that day (lib/clientStory snapshotOf) —
 *                        set against the same figures read now. With no chapter yet there is no baseline, and that is said.
 * Money is the cost model's and is never added across kinds: a figure a day is said only for the problems a line can price, with how
 * many it could not. A value in pounds for a proved fix is NOT claimed here — a fix says its own before and after in its own units.
 * Pure. */
import type { Workspace } from '../types';
import type { Snag } from '../snag/types';
import type { StorySnapshot, ToolStudy } from './study';
import type { ProjectAction } from './projectActions';
import type { ProvedFix } from '../tools/yokoten/yokoten';
import type { Finding } from './brain/engine';
import { VERDICT_STANCE, type Outcome } from './knowledge/outcomes';
import type { LeanTile } from './lean';
import { wrongOf, doingOf, whoOf, type WrongRow } from './factoryQuestions';
import { areasOf } from './areas';
import { machineKey } from './lineRecords';
import { fmtGBP } from './cost';

export interface OverviewInputs {
  client: string;
  now: number; today: string;
  /** The customer's lines, in floor order (a "not yet placed" holding line left out by the caller). */
  lines: readonly Workspace[];
  wrong: readonly Omit<WrongRow, 'pounds'>[];
  actions: readonly ProjectAction[];
  proved: readonly ProvedFix[];
  studies: readonly ToolStudy[];
  snags: readonly Snag[];
  /** Each line's bottleneck by its Line capacity, where one is worked out. */
  necks: ReadonlyMap<string, readonly string[]>;
  findings: readonly Finding[];
  outcomes: readonly Outcome[];
  /** The visits made to this customer, by when each started. */
  visits: readonly { startedAt: number; endedAt?: number }[];
  /** The Story's first chapter — the baseline — and when it was taken. */
  baseline?: StorySnapshot;
}

export interface LossRow { id: string; what: string; line: string; machine?: string; priority: 'critical' | 'high' | 'low'; late: boolean; owner?: string; poundsDay?: number }
export interface ConstraintRow { lineId: string; line: string; neck?: string[]; open: number }
export interface CoverLine { lineId: string; line: string; studies: number; tools: string[]; problems: number; machines: number; machinesLooked: number; last?: number }
export interface CoverArea { title: string; lines: CoverLine[] }
export interface RiskRow { tone: 'r' | 'a'; says: string }
export interface Moved { k: string; before: string; now: string; better?: boolean }
export interface Overview {
  client: string;
  says: string;
  tiles: LeanTile[];
  losses: LossRow[];
  /** How many open problems carry no cost a day (the line cannot price them, or no minutes are said). */
  unpriced: number;
  constraints: ConstraintRow[];
  coverage: { areas: CoverArea[]; lines: number; looked: number; machines: number; machinesLooked: number; visits: number; says: string };
  findings: { line: string; says: string; money?: string; sure: string }[];
  risks: RiskRow[];
  improved: { proved: ProvedFix[]; held: number; notHeld: number; tooSoon: number; says: string };
  progress: { since?: number; rows: Moved[]; says: string };
}

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;
const day = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const SURE: Record<Finding['sure'], string> = { measured: 'Measured', significant: 'Unlikely to be chance', suggestive: 'Suggestive', thin: 'Thin — few stops' };

export function overviewOf(i: OverviewInputs): Overview {
  const names = new Set(i.lines.map(l => l.name)), ids = new Set(i.lines.map(l => l.id));
  const wrong = wrongOf(i.wrong.filter(r => names.has(r.line)), Number.MAX_SAFE_INTEGER);
  const doing = doingOf(i.actions, i.today, 12);
  const who = whoOf(i.actions);
  const proved = i.proved.filter(p => ids.has(p.lineId));

  /* ---- what is wrong, worst first: the priced by their cost a day, then by priority ---- */
  const losses: LossRow[] = wrong.top.slice(0, 8).map(r => ({ id: r.id, what: r.what, line: r.line, priority: r.priority, late: r.late, ...(r.owner ? { owner: r.owner } : {}), ...(r.cost?.machine ? { machine: r.cost.machine } : {}), ...(r.pounds != null ? { poundsDay: r.pounds } : {}) }));
  const unpriced = wrong.open - wrong.priced;

  /* ---- what holds each line ---- */
  const constraints: ConstraintRow[] = i.lines.map(l => ({ lineId: l.id, line: l.name, ...(i.necks.get(l.id)?.length ? { neck: [...(i.necks.get(l.id) as readonly string[])] } : {}), open: i.wrong.filter(r => r.line === l.name).length }));

  /* ---- where we have looked ---- */
  const cover = (l: Workspace): CoverLine => {
    const st = i.studies.filter(s => !s.deletedAt && s.workspaceId === l.id && s.tool !== 'story' && s.tool !== 'talk' && s.tool !== 'notebook');
    const sn = i.snags.filter(s => !s.deletedAt && s.workspaceId === l.id);
    const machines = (l.assets ?? []).filter(a => a.trim() && machineKey(a) !== 'whole line');
    const named = new Set([...st.map(s => s.machine), ...sn.map(s => s.targetAsset)].filter((x): x is string => !!x?.trim()).map(machineKey));
    const last = Math.max(0, ...st.map(s => s.updatedAt ?? s.createdAt), ...sn.map(s => s.updatedAt ?? s.raisedAt));
    return { lineId: l.id, line: l.name, studies: st.length, tools: [...new Set(st.map(s => s.tool as string))], problems: sn.length, machines: machines.length, machinesLooked: machines.filter(m => named.has(machineKey(m))).length, ...(last ? { last } : {}) };
  };
  const grouped = areasOf(i.lines);
  const areas: CoverArea[] = [...grouped.areas.map(a => ({ title: a.title, lines: a.lines.map(cover) })), ...(grouped.noArea.length ? [{ title: grouped.areas.length ? 'No area yet' : 'Lines', lines: grouped.noArea.map(cover) }] : [])];
  const flat = areas.flatMap(a => a.lines);
  const looked = flat.filter(l => l.studies + l.problems > 0).length;
  const machinesAll = flat.reduce((t, l) => t + l.machines, 0), machinesLooked = flat.reduce((t, l) => t + l.machinesLooked, 0);
  const never = flat.filter(l => l.studies + l.problems === 0);
  const coverSays = !i.lines.length ? 'No line is set up for this customer yet.'
    : `${looked} of ${plural(i.lines.length, 'line')} looked at${machinesAll ? `, ${machinesLooked} of ${plural(machinesAll, 'machine')}` : ''}${i.visits.length ? `, over ${plural(i.visits.length, 'visit')}` : ''}.${never.length ? ` Not looked at yet: ${never.slice(0, 4).map(l => l.line).join(', ')}${never.length > 4 ? ` and ${never.length - 4} more` : ''}.` : ''}`;

  /* ---- what Faultline found, in the engine's own sentences: the measured and the unlikely-to-be-chance first ---- */
  const rank: Record<Finding['sure'], number> = { measured: 0, significant: 1, suggestive: 2, thin: 3 };
  const lineName = new Map(i.lines.map(l => [l.id, l.name]));
  const findings = i.findings.filter(f => ids.has(f.lineId)).sort((a, b) => rank[a.sure] - rank[b.sure] || (b.money?.perDay ?? 0) - (a.money?.perDay ?? 0)).slice(0, 6)
    .map(f => ({ line: lineName.get(f.lineId) ?? '', says: f.says, ...(f.money?.words ? { money: f.money.words } : {}), sure: SURE[f.sure] }));

  /* ---- what needs attention ---- */
  const risks: RiskRow[] = [];
  if (wrong.critical) risks.push({ tone: 'r', says: `${plural(wrong.critical, 'critical problem')} open.` });
  if (wrong.late) risks.push({ tone: 'r', says: `${plural(wrong.late, 'open problem')} past ${wrong.late === 1 ? 'its' : 'their'} day.` });
  if (doing.late) risks.push({ tone: 'r', says: `${plural(doing.late, 'action')} late.` });
  if (who.nobody) risks.push({ tone: 'a', says: `${plural(who.nobody, 'action')} with nobody's name on ${who.nobody === 1 ? 'it' : 'them'}.` });
  const noNeck = constraints.filter(c => !c.neck && flat.find(l => l.lineId === c.lineId && l.studies + l.problems > 0));
  if (noNeck.length) risks.push({ tone: 'a', says: `The bottleneck is not worked out on ${noNeck.slice(0, 3).map(c => c.line).join(', ')}${noNeck.length > 3 ? ` and ${noNeck.length - 3} more` : ''} — a loss there cannot be priced in packs.` });
  if (unpriced > 0) risks.push({ tone: 'a', says: `${plural(unpriced, 'open problem')} with no cost a day yet — the minutes it takes, or the line's rate, is not said.` });
  if (never.length) risks.push({ tone: 'a', says: `${plural(never.length, 'line')} not looked at yet.` });

  /* ---- what has improved ---- */
  const mine = i.outcomes.filter(o => ids.has(o.fix.lineId));
  const held = mine.filter(o => VERDICT_STANCE[o.verdict] === 'supports').length;
  const tooSoon = mine.filter(o => VERDICT_STANCE[o.verdict] === 'neutral').length;
  const notHeld = mine.length - held - tooSoon;
  const improvedSays = !proved.length && !mine.length ? 'Nothing is proved yet — a fix is proved when its own number is measured again and has moved.'
    : `${proved.length ? `${plural(proved.length, 'fix', 'fixes')} proved by ${proved.length === 1 ? 'its' : 'their'} own before and after` : 'No fix is proved by its own before and after yet'}${mine.length ? `; of ${plural(mine.length, 'closed problem')} checked against the stops since, ${held} improved${notHeld ? `, ${notHeld} did not` : ''}${tooSoon ? `, ${tooSoon} not yet clear` : ''}` : ''}.`;

  /* ---- since the baseline ---- */
  const b = i.baseline;
  const money = (v: number | undefined) => (v == null ? 'not priced' : `${fmtGBP(v)} a day`);
  const rows: Moved[] = b ? [
    { k: 'Open problems', before: String(b.found.open), now: String(wrong.open), better: wrong.open < b.found.open ? true : wrong.open > b.found.open ? false : undefined },
    { k: 'Critical', before: String(b.found.critical), now: String(wrong.critical), better: wrong.critical < b.found.critical ? true : wrong.critical > b.found.critical ? false : undefined },
    { k: 'What the open problems cost', before: money(b.found.costDay), now: money(wrong.costDay), ...(b.found.costDay != null && wrong.costDay != null && b.found.costDay !== wrong.costDay ? { better: wrong.costDay < b.found.costDay } : {}) },
    { k: 'Fixes proved', before: String(b.proved), now: String(proved.length), better: proved.length > b.proved ? true : undefined },
    { k: 'Lines', before: String(b.lines), now: String(i.lines.length) },
  ].map(r => { const { better, ...rest } = r as Moved; return better === undefined ? rest : { ...rest, better }; }) : [];
  const stillOpen = b ? b.findings.filter(f => i.wrong.some(r => r.id === f.id)).length : 0;
  const progressSays = !b ? 'No baseline yet — the first update run on the Story fixes the figures of that day, and every later reading is set against it.'
    : `Against the baseline of ${day(b.at)}: ${b.found.open} open then, ${wrong.open} now${b.findings.length ? ` — ${b.findings.length - stillOpen === 0 ? 'none' : b.findings.length - stillOpen} of the ${plural(b.findings.length, 'problem')} listed then ${b.findings.length - stillOpen <= 1 ? 'is' : 'are'} closed` : ''}; ${proved.length - b.proved > 0 ? `${plural(proved.length - b.proved, 'more fix', 'more fixes')} proved` : 'no more fixes proved'}.`;

  /* ---- the sentence and the tiles ---- */
  const worst = losses.find(l => l.poundsDay != null);
  const says = !i.lines.length ? `${i.client || 'This customer'} has no line set up yet — add one, and what is found on it is read here.`
    : `${coverSays.split('.')[0]}. ${wrong.open ? `${plural(wrong.open, 'problem')} open${wrong.costDay != null ? `, costing ${fmtGBP(wrong.costDay)} a day where they can be priced` : ''}${worst ? ` — the biggest ${worst.what} on ${worst.line}` : ''}` : 'No problem is open'}. ${proved.length ? `${plural(proved.length, 'fix', 'fixes')} proved.` : 'Nothing proved yet.'}`;
  const tiles: LeanTile[] = [
    { k: 'Lines looked at', v: String(looked), of: `of ${i.lines.length}${machinesAll ? ` · ${machinesLooked} of ${plural(machinesAll, 'machine')}` : ''}`, ...(never.length ? { tone: 'a' as const } : {}) },
    { k: 'Open problems', v: String(wrong.open), of: wrong.critical ? `${wrong.critical} critical` : 'none critical', ...(wrong.critical ? { tone: 'r' as const } : {}) },
    { k: 'Costing', v: wrong.costDay != null ? fmtGBP(wrong.costDay) : '—', of: wrong.costDay != null ? `a day · ${wrong.priced} of ${wrong.open} priced` : wrong.open ? 'no problem is priced yet' : 'nothing open' },
    { k: 'Fixes proved', v: String(proved.length), of: b ? `${b.proved} at the baseline` : 'by their own before and after', ...(proved.length ? { tone: 'g' as const } : {}) },
  ];

  return { client: i.client, says, tiles, losses, unpriced, constraints,
    coverage: { areas, lines: i.lines.length, looked, machines: machinesAll, machinesLooked, visits: i.visits.length, says: coverSays },
    findings, risks, improved: { proved, held, notHeld, tooSoon, says: improvedSays }, progress: { ...(b ? { since: b.at } : {}), rows, says: progressSays } };
}
