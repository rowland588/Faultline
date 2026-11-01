/* THE THEORY OF CONSTRAINTS' OWN SECTIONS OF THE PROJECT REPORT (docs/METHODS.md §17).
 *
 * Five sections, one a part of the loop, each built from the SAME model the board and the Constraint review use (shapes/tocModel —
 * never worked out a second way): the constraint and how much the line makes against what is wanted; what is lost at the constraint
 * in minutes, packs and pounds; the buffer and the rope; the option to elevate it and its worth; and the passes round the loop. Each
 * says what it MEANS for this project, then the team's own words beside it. Money is the Loss count's and the Line capacity's own,
 * never added; a missing input is named and nothing is estimated. Flags here are the ones that need the line's records (the
 * constraint written is not the constraint read; no buffer set); the ones that need only what the team wrote are the dashboard's
 * insight (lib/methodInsights/toc), so a thing is flagged once. Pure. */
import type { MethodReportCtx, ReportItem, ReportSection } from '../../../lib/methodReportModel';
import { moneyClauses } from '../../../lib/methodReportModel';
import { tocPasses } from '../../../lib/tocPasses';
import { fmtN } from '../../../tools/linebalance/capacityWords';
import type { Standard } from '../../../tools/linestandard/standard';
import type { Workspace } from '../../../types';
import { readToc, tocSteps, type TocRecords, type TocStep } from '../shapes/tocModel';

/** The project's records as the board reads them (shapes/toc loadTocRecords): the same line for the cost model and the stops. */
export function tocRecordsOf(ctx: MethodReportCtx): TocRecords {
  const standards = (ctx.ctx?.standards ?? []) as Standard[];
  const wsId = standards.find(s => s.capacity?.stations.length && s.workspaceId)?.workspaceId ?? ctx.studies.find(s => s.tool === 'losses' && s.workspaceId)?.workspaceId;
  const ws = wsId ? ctx.ctx?.workspaces?.find(w => w.id === wsId) as Workspace | undefined : undefined;
  return { standards, studies: ctx.studies, ...(ws ? { ws } : {}), ...(ctx.ctx?.observations && wsId ? { observations: ctx.ctx.observations } : {}) };
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
/** Is what the team wrote the station the line reads? Either may be the longer name ("the Wrapper" / "Wrapper"). */
export const sameStation = (written: string, read: string): boolean => { const a = norm(written), b = norm(read); return !!a && !!b && (a.includes(b) || b.includes(a)); };

const words = (rows: [string, string][]): ReportItem => ({ kind: 'facts', rows });
const said = (v: string) => v.trim() || 'Not written yet.';
const missing = (s: TocStep): ReportItem[] => s.missing.map(m => ({ kind: 'callout', tone: 'n', word: 'Missing', text: m }));

export function tocReport(ctx: MethodReportCtx): ReportSection[] {
  const rec = tocRecordsOf(ctx);
  const read = readToc(rec);
  const steps = tocSteps(ctx.answers, rec, read);
  const [s1, s2, s3, s4, s5] = steps;
  if (!s1 || !s2 || !s3 || !s4 || !s5) return [];
  const r = read.capacity?.r;
  const lim = r?.limit;
  const limit = lim ? (lim.station.name.trim() || `Station ${lim.index + 1}`) : undefined;
  const unit = r?.unit ?? 'packs';
  const a = ctx.answer;

  /* 1 the constraint */
  const one: ReportSection = { id: 'toc-constraint', title: 'The constraint — and what the line makes', lead: 'Step 1. The station that limits the whole line, read from this project’s Line capacity.', items: [], flags: [] };
  one.items.push({ kind: 'callout', tone: !r || r.gap == null ? 'n' : r.gap > 1e-9 ? 'a' : 'g', word: !r || r.gap == null ? 'Note' : r.gap > 1e-9 ? 'Watch' : 'Fine', text: s1.says });
  if (r && lim) {
    const stations = [...r.ok].sort((x, y) => x.effective - y.effective);
    one.items.push({ kind: 'table', head: ['Station', `Makes (${unit} a minute)`, 'Room to spare', 'Role'], shares: [0.34, 0.24, 0.22, 0.2],
      rows: stations.map(x => [x.station.name.trim() || `Station ${x.index + 1}`, fmtN(x.effective), x.station.id === lim.station.id ? '—' : fmtN(x.headroom), x.station.id === lim.station.id ? 'Constraint' : r.next && x.station.id === r.next.station.id ? 'Next to limit' : '']) });
    one.items.push({ kind: 'paragraph', text: `What this means: every ${unit.replace(/s$/, '')} the line makes goes through ${limit}, so ${limit}’s pace is the line’s pace. A faster station anywhere else makes no more ${unit}.` });
  }
  if (s1.lines.length) one.items.push({ kind: 'bullets', items: s1.lines.map(text => ({ text })) });
  one.items.push(...missing(s1));
  one.items.push(words([['The constraint, in the team’s words', said(a('constraint'))], ['Real or a mirage — how we know', said(a('real'))]]));
  if (limit && a('constraint').trim() && !sameStation(a('constraint'), limit)) one.flags?.push({ tone: 'a', text: `The team wrote “${a('constraint').trim()}” as the constraint, but Line capacity reads ${limit}. One of them is out of date — check the line, then correct whichever is wrong.` });
  if (limit && !a('real').trim()) one.flags?.push({ tone: 'n', text: `${limit} is named the constraint in Line capacity, but the team has not said how it is known to be real, not a mirage — a queue in front of it, stations after it waiting.` });

  /* 2 what is lost at it */
  const two: ReportSection = { id: 'toc-exploit', title: 'What is lost at the constraint', lead: 'Step 2. A minute lost here is a minute lost by the whole line; a minute lost anywhere else is not.', items: [], flags: [] };
  const loss = read.loss;
  two.items.push({ kind: 'callout', tone: loss && (loss.atConstraintMin ?? 0) > 0 ? 'a' : 'n', word: loss && (loss.atConstraintMin ?? 0) > 0 ? 'Watch' : 'Note', text: s2.says });
  if (loss && loss.bars.length) two.items.push({ kind: 'table', head: ['Where the shift’s time went', 'Time'], shares: [0.72, 0.28],
    rows: loss.bars.map(b => { const i = b.lastIndexOf(' — '); return i < 0 ? [b, ''] : [b.slice(0, i), b.slice(i + 3)]; }) });
  const atLine = s2.lines.find(l => l.startsWith('At '));
  if (atLine && loss) {
    const cl = moneyClauses(atLine);
    two.items.push({ kind: 'money', tool: 'Loss count', title: loss.name, text: cl.length ? atLine : `${atLine} ${s2.missing.find(m => m.startsWith('No margin')) ?? ''}`.trim(), missing: !cl.length });
  } else if (loss && limit) two.items.push({ kind: 'money', tool: 'Loss count', title: loss.name, text: 'No packs or pounds are said for the constraint — no stop in the count names it.', missing: true });
  two.items.push(...s2.lines.filter(l => l !== atLine && !loss?.bars.some(b => l === `${b}.`)).map((l): ReportItem => ({ kind: 'paragraph', text: l })));
  if (loss && limit) two.items.push({ kind: 'paragraph', text: `What this means: only the minutes at ${limit} cost packs. A stop at another station costs labour and tidiness, but the line runs round it — do not chase those first.` });
  two.items.push(...s2.missing.filter(m => !m.startsWith('No margin') || !atLine).map((m): ReportItem => ({ kind: 'callout', tone: 'n', word: 'Missing', text: m })));
  two.items.push(words([['When it waits — starved, blocked, or at a break', said(a('starved'))], ['What we will do to lose nothing', said(a('exploit'))]]));
  if (loss && limit && (loss.atConstraintMin ?? 0) === 0) two.flags?.push({ tone: 'a', text: `The loss count names no stop at ${limit} in that shift — check that the stops carry the machine’s name, or that ${limit} really is the limit.` });

  /* 3 subordinate */
  const three: ReportSection = { id: 'toc-subordinate', title: 'The rest of the line works to it', lead: 'Step 3. A buffer in front of the constraint keeps it fed; the rope ties the release of work to its pace.', items: [], flags: [] };
  three.items.push({ kind: 'callout', tone: s3.missing.length ? 'a' : 'g', word: s3.missing.length ? 'Watch' : 'Fine', text: s3.says });
  three.items.push({ kind: 'bullets', items: s3.lines.map(text => ({ text })) });
  three.items.push(...missing(s3));
  three.items.push(words([['The rules the rest of the line works to', said(a('rules'))], ['The buffer in front of the constraint, and how we watch it', said(a('buffer'))], ['When material is released onto the line', said(a('release'))]]));
  if (limit && s3.missing.some(m => m.startsWith('Set the buffer'))) three.flags?.push({ tone: 'a', text: `No buffer is set in front of ${limit} — nothing protects it from a minute spent waiting for material.` });

  /* 4 elevate */
  const four: ReportSection = { id: 'toc-elevate', title: 'Spending on the constraint — and what it is worth', lead: 'Step 4. Only once the capacity the line already has has been found.', items: [], flags: [] };
  four.items.push({ kind: 'callout', tone: r && r.gap != null && r.gap <= 1e-9 ? 'g' : 'n', word: r && r.gap != null && r.gap <= 1e-9 ? 'Fine' : 'Note', text: s4.says });
  const money4 = s4.lines.filter(l => moneyClauses(l).length);
  const plain4 = s4.lines.filter(l => !moneyClauses(l).length);
  if (plain4.length) four.items.push({ kind: 'bullets', items: plain4.map(text => ({ text })) });
  for (const l of money4) four.items.push({ kind: 'money', tool: 'Line capacity', title: read.capacity?.product ?? 'Line capacity', text: l, missing: false });
  const needMoney = s4.missing.find(m => m.startsWith('Give the people'));
  if (needMoney && r) four.items.push({ kind: 'money', tool: 'Line capacity', title: read.capacity?.product ?? 'Line capacity', text: needMoney, missing: true });
  four.items.push(...s4.missing.filter(m => m !== needMoney).map((m): ReportItem => ({ kind: 'callout', tone: 'n', word: 'Missing', text: m })));
  four.items.push(words([['Is it still the constraint after steps 2 and 3?', said(a('still'))], ['The option, and its worth', said(a('option'))]]));

  /* 5 go again */
  const passes = tocPasses(ctx.answers);
  const five: ReportSection = { id: 'toc-again', title: 'Going again — the passes round the loop', lead: 'Step 5. When the constraint is lifted it moves; find it again and do not let old rules become the new constraint.', items: [] };
  five.items.push({ kind: 'paragraph', text: s5.says });
  five.items.push(...s5.lines.map((l): ReportItem => ({ kind: 'paragraph', text: l })));
  five.items.push({ kind: 'table', head: ['Pass', 'The constraint', 'It moved to', 'State'], shares: [0.12, 0.34, 0.34, 0.2],
    rows: passes.map((p, i) => [`Pass ${p.n}`, p.constraint || 'Not written yet', p.moved || (i === passes.length - 1 ? 'Not moved yet' : 'Not written'), p.moved ? 'Moved on' : 'Current']) });
  five.items.push(...missing(s5));
  five.items.push(words([['Where the constraint is now', said(a('moved'))], ['The rule we set for the old constraint that no longer holds', said(a('inertia'))]]));
  return [one, two, three, four, five];
}
