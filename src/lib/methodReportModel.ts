/* THE PROJECT REPORT — ONE MODEL (docs/METHODS.md §17; Rowland, 1 November 2026: "each method is also a project — its own full
 * ecosystem: its own dashboard, connecting the tools and everything the user writes; let me view what everything is telling me
 * right now; then a beautiful dynamic report appropriately presenting everything. Must be correct. Do not skip on the reports.").
 *
 * A pure function from (the method, the project, what the team wrote, the studies it used, what is owed, today) to a structured
 * report: sections made of typed items. The page (project/method/MethodReportScreen) draws these items; the paper
 * (lib/report/methodReport) pours the SAME items through the report engine — so what the screen says and what the paper says
 * cannot part. Nothing here works a figure out that a tool does not already work out: a tool's finding is its own sentence
 * (lib/studyLinks studyLine, through lib/methodDashboard); where the tool has a paper, the paper prints that tool's own blocks
 * (lib/studiesPdf studyBlocks — the way the line's combined report does). No AI. A missing input is named, never invented; money
 * is each tool's own, by tool, never summed.
 *
 * Order: (a) the cover band · (b) the journey · (c) what everything is telling us now · (d) what needs attention · (e) the
 * method's own sections (the registry project/method/report, empty until a method fills its entry) · (f) what we wrote · (g) the
 * closing line. Pure. */
import { methodDashboard, type DashAttention, type DashFinding, type DashIn, type DashOwed, type DashTone, type Dashboard } from './methodDashboard';
import { fieldsOf } from './methodSheet';
import type { ActionSource } from './actionSources';
import type { ProjectMethod } from './methods';
import type { LeanPage, LeanTile } from './lean';
import type { ToolStudy } from './study';
import type { StudyContext } from './studyLinks';
import type { CauseRead } from '../project/method/shapes/a3Model';
import { savedTalkReports, type SavedTalkReport } from '../tools/talk/reportDocuments';
import { methodPhaseOf } from './methodPlacement';
import type { Snag } from '../snag/types';
import { SNAG_STATUS_META } from '../snag/types';
import { capacityPaper } from '../tools/linebalance/capacityPaper';
import { capacitySays } from './together';
import { labourInputs } from '../tools/linebalance/capacity';
import { headcount, peopleOf } from '../tools/linestandard/standard';
import { isoDay, niceDay } from './weeks';

export type ReportTone = DashTone;

/** One thing on the report. Additive: a method's sections use these and a new kind is one more member. */
export type ReportItem =
  | { kind: 'paragraph'; text: string; tone?: ReportTone }
  | { kind: 'talkDocument'; phase: string; report: SavedTalkReport }
  | { kind: 'facts'; rows: [string, string][] }
  | { kind: 'bullets'; items: { text: string; tone?: ReportTone }[] }
  | { kind: 'table'; head: string[]; rows: string[][]; /** column shares, summing to 1 */ shares?: number[]; /** rows drawn in their tone's word colour */ tones?: (ReportTone | undefined)[] }
  /** A call-out: a tone and its WORD beside it (a colour is never the only carrier). */
  | { kind: 'callout'; tone: ReportTone; word: string; text: string }
  /** What a tool says in money — its own, for its own record. `missing` when an input is not given (named in the text). */
  | { kind: 'money'; tool: string; title: string; text: string; missing: boolean }
  /** Small bars where a record already says a share: label, 0–1, the words beside it. */
  | { kind: 'bars'; title: string; bars: { label: string; v: number; text: string; here?: boolean }[] }
  /** A tool's result: its sentence here; on paper, that tool's own paper blocks follow it. */
  | { kind: 'tool'; id: string; run?: string; tool: string; key: string; title: string; section: string; says: string; tone: ReportTone; href: string; more: number; where: string; notes: { text: string; at: number; by?: string }[] }
  /** Questions and the team's answers. */
  | { kind: 'qa'; title: string; rows: { q: string; a: string; written: boolean }[] };

export interface ReportSection {
  id: string;
  title: string;
  /** The one line under the title. */
  lead?: string;
  items: ReportItem[];
  /** Things this section adds to "what needs attention" (a method's own rules). */
  flags?: { text: string; tone: 'r' | 'a' | 'n' }[];
}

export interface ReportOwed extends DashOwed {
  id?: string;
  state?: 'todo' | 'waiting' | 'done';
  doneOn?: string;
  outcome?: string;
  expected?: string;
}

export interface ReportCover {
  eyebrow: string;
  title: string;
  sub: string;
  verdict: { text: string; tone: ReportTone };
  /** Method · Line · Lead — the printed date is separate. */
  facts: [string, string][];
  printed: string;
  tiles: LeanTile[];
}

export interface MethodReport {
  cover: ReportCover;
  sections: ReportSection[];
  closing: { text: string; tone: 'r' | 'a' | 'g' | 'n' };
  dash: Dashboard;
}

/** What a method's own sections are given (docs/METHODS.md §17). */
export interface MethodReportCtx {
  causes?: readonly CauseRead[];
  method: ProjectMethod;
  project: { id?: string; name: string; lead?: string };
  line: string;
  answers: Readonly<Record<string, string>>;
  /** The project's live studies. */
  studies: readonly ToolStudy[];
  findings: readonly DashFinding[];
  dash: Dashboard;
  owed: readonly ReportOwed[];
  today: string;
  /** What the tools' sentences read of their lines — the line standards, stops and cost models (a method's own sections may read the same records). */
  ctx?: StudyContext;
  /** A written answer by field id, '' when not written. */
  answer: (field: string) => string;
}
export type MethodReportFn = (ctx: MethodReportCtx) => ReportSection[];

export interface ReportIn extends Omit<DashIn, 'owed'> {
  causes?: readonly CauseRead[];
  problems?: readonly Snag[];
  project: { id?: string; name: string; lead?: string };
  /** The line(s) the project is on, said as the page says them; '' when none. */
  line: string;
  /** The printed date, as the page says it. */
  printed: string;
  owed: readonly ReportOwed[];
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
/** The cover's verdict, in its word (a colour is never the only carrier). */
const VERDICT: Record<ReportTone, string> = { r: 'Needs attention', a: 'Watch', g: 'Every section written', w: 'Under way', n: 'No phase activity recorded' };
const WORD: Record<string, string> = { r: 'Needs attention', a: 'Watch', n: 'Note', g: 'Fine', w: 'Under way' };

/** The money each study tool can say, and the input it needs when it cannot — named, never filled. */
const MONEY_NEEDS: Partial<Record<ToolStudy['tool'], string>> = {
  capability: 'the cost a kilo of the product (for give-away) or the margin a pack',
  losses: 'the line’s crew, its wage and the margin a pack',
  changeover: 'the line’s crew, its wage and the margin a pack',
  balance: 'the people’s hourly rate and the margin a pack',
  map: 'the line’s labour rate and the cost of what waits',
  reliability: 'the fitter’s rate and, on the bottleneck, the margin a pack',
  sampling: 'the line’s wage',
};

/** The clauses of a tool's sentence that carry pounds — its own words, cut at the sentence's own breaks, never rewritten. */
export function moneyClauses(says: string): string[] {
  return says.split(/(?<=[.;])\s+|\s+[—–]\s+/).map(c => c.trim()).filter(c => c.includes('£'));
}

const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function methodReportModel(x: ReportIn, own?: MethodReportFn): MethodReport {
  const m = x.method;
  const live = x.studies.filter(s => !s.deletedAt && !s.facts.template && !['talk', 'story', 'brain', 'department', 'notebook'].includes(s.tool));
  const talks = x.studies.flatMap(study => {
    const docs = savedTalkReports(study, x.ctx?.workspaces?.find(w => w.id === study.workspaceId)?.name);
    return docs.length ? [{ study, docs }] : [];
  });
  const dash = methodDashboard({ ...x, studies: [...live, ...talks.map(({ study }) => ({ ...study, facts: {} }))] });
  const findingsByStudy = new Map(dash.findings.map(f => [f.id, f]));
  const toolFindings = dash.findings.filter(f => f.key !== 'talk');
  // Repeated uses can have identical names and phase. Keep the same run number on the evidence and its action.
  const groups = new Map<string, ToolStudy[]>();
  for (const study of live) {
    const finding = findingsByStudy.get(study.id);
    if (!finding) continue;
    const group = groups.get(finding.title) ?? [];
    group.push(study);
    groups.set(finding.title, group);
  }
  const runs = new Map<string, string>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => a.startedAt - b.startedAt || a.id.localeCompare(b.id));
    group.forEach((s, i) => runs.set(s.id, `Run ${i + 1} of ${group.length}`));
  }
  const answer = (id: string) => (x.answers[id] ?? '').trim();
  const open = x.owed.filter(i => (i.kind === 'next' || i.kind === 'found') && !i.doneAt && !(i.testId ?? '').startsWith('method:'));
  const askable = dash.sections.filter(s => s.fields > 0);

  /* (e) the method's own sections — the registry's entry, if the method has one */
  const ownSections = own ? own({ causes: x.causes, method: m, project: x.project, line: x.line, answers: x.answers, studies: live, findings: dash.findings, dash, owed: x.owed, today: x.today, answer, ...(x.ctx ? { ctx: x.ctx } : {}) }) : [];
  const flags: DashAttention[] = ownSections.flatMap(s => (s.flags ?? []).map(f => ({ kind: 'finding' as const, tone: f.tone, text: f.text })));
  const attention = [...dash.attention, ...flags].filter(a => a.tone !== 'n').sort((a, b) => ({ r: 0, a: 1, n: 2 }[a.tone] - { r: 0, a: 1, n: 2 }[b.tone]));
  const toLook = attention.length;
  const standards = (x.ctx?.standards ?? []).filter(s => !s.deletedAt);
  const results = dash.findings.length + standards.length;
  const tools = new Set([...dash.findings.map(f => f.tool), ...(standards.length ? ['Line standard'] : []), ...(talks.length ? ['Line Talk'] : [])]);

  /* (a) the cover */
  const tiles: LeanTile[] = [
    { k: 'Worksheets complete', v: String(dash.written), of: askable.length ? `of ${askable.length}` : 'this method keeps its own screens', tone: askable.length && dash.written === askable.length ? 'g' : 'n' },
    { k: 'Saved tool records', v: String(results), of: results ? `from ${plural(tools.size, 'tool')}` : 'no tool used yet', tone: 'n' },
    { k: 'To look at', v: String(toLook), of: toLook ? 'flagged — see below' : 'nothing flagged', tone: attention.some(a => a.tone === 'r') ? 'r' : toLook ? 'a' : 'n' },
    { k: 'Late actions', v: String(dash.actions.late), of: `of ${plural(dash.actions.open, 'open action')}`, tone: dash.actions.late ? 'r' : 'n' },
  ];
  const tone: ReportTone = attention.some(a => a.tone === 'r') ? 'r' : attention.some(a => a.tone === 'a') ? 'a' : dash.tone;
  const cover: ReportCover = {
    eyebrow: `PROJECT REPORT · ${m.name.toUpperCase()}`,
    title: x.project.name,
    sub: dash.says,
    verdict: { text: VERDICT[tone], tone },
    facts: [['Method', m.name], ['Line', x.line || 'No line yet'], ['Lead', x.project.lead?.trim() || 'Not named yet']],
    printed: x.printed,
    tiles,
  };

  /* (b) the journey */
  const journey: ReportSection = {
    id: 'journey', title: 'The journey', lead: askable.length ? `${dash.written} of ${askable.length} worksheets complete.` : m.name,
    items: [
      ...(askable.length ? [{ kind: 'bars', title: 'What is written, by section', bars: dash.sections.filter(s => s.fields > 0).map(s => ({ label: `${s.index + 1}. ${s.name}`, v: s.written / s.fields, text: `${s.written} of ${s.fields} written` })) } as ReportItem] : []),
      { kind: 'table', head: ['Step', 'Recorded activity', 'Written', 'Tool records'], shares: [0.46, 0.2, 0.17, 0.17],
        rows: dash.sections.map(s => [`${s.index + 1}. ${s.name}`, s.progress, s.fields ? `${s.written} of ${s.fields}` : '—', s.results ? String(s.results) : '—']) },
    ],
  };

  /* (c) what everything is telling us now — each tool, in its own words; its paper's blocks follow on paper */
  const telling: ReportSection = {
    id: 'telling', title: 'What everything is telling us now',
    lead: results ? `${plural(results, 'saved tool record')} from this project.` : 'No saved tool records for this project.',
    items: toolFindings.map((f): ReportItem => ({ kind: 'tool', id: f.id, run: runs.get(f.id), tool: f.tool, key: f.key, title: f.title, section: f.section, says: f.says, tone: f.tone, href: f.href, more: f.more, notes: f.notes, where: `${f.section} · ${x.project.name}` })),
  };
  for (const standard of standards) {
    const phase = methodPhaseOf(x.owed, m.key, 'standard', standard.id) ?? 'Project evidence';
    const rows: [string, string][] = [['Phase', phase]];
    if (standard.capacity?.stations.length) rows.push(['Capacity', capacitySays(standard.capacity).text]);
    for (const person of peopleOf(standard)) rows.push([person.label || 'Operator', person.task?.trim() || 'Task unrecorded']);
    if (standard.note?.trim()) rows.push(['Notes', standard.note]);
    telling.items.push({ kind: 'paragraph', text: standard.product || 'Line standard' }, { kind: 'facts', rows });
    if (standard.capacity?.stations.length) {
      const line = x.ctx?.workspaces?.find(w => w.id === standard.workspaceId);
      const capacity = capacityPaper({ product: standard.product, line: line?.name ?? '', printed: x.printed, capacity: standard.capacity,
        labour: labourInputs(standard.capacity, headcount(standard) || undefined, line) });
      telling.items.push({ kind: 'table', head: ['Station', 'Speed entered', 'Effective rate', 'Compared with bottleneck'],
        rows: capacity.rows.map(s => [s.name, s.speed, s.perMin, s.ofNeck]) });
    }
  }
  for (const { study, docs } of talks) {
    const phase = findingsByStudy.get(study.id)?.section ?? 'Project evidence';
    for (const report of docs) telling.items.push({ kind: 'talkDocument', phase, report });
  }
  const moneyItems: ReportItem[] = [];
  for (const f of toolFindings) {
    const cl = moneyClauses(f.says);
    if (cl.length) moneyItems.push({ kind: 'money', tool: f.tool, title: f.title, text: cl.join(' '), missing: false });
    else if (MONEY_NEEDS[f.key]) moneyItems.push({ kind: 'money', tool: f.tool, title: f.title, text: `${f.tool} (${f.title}) says no money yet — it needs ${MONEY_NEEDS[f.key]}. Nothing is estimated.`, missing: true });
  }
  if (moneyItems.length) {
    telling.items.push({ kind: 'paragraph', text: 'The money the tools say — each tool’s own, for its own record. They are never added together: the same pound can sit in two tools.' }, ...moneyItems);
  }

  /* (d) what needs attention, and who owes what by when */
  const rank = (i: ReportOwed) => (i.due && i.due < x.today ? 0 : 1);
  const owing = [...open].sort((a, b) => rank(a) - rank(b) || (a.due ?? '9999').localeCompare(b.due ?? '9999'));
  const completed = x.owed.filter(i => (i.kind === 'next' || i.kind === 'found') && i.doneAt && !i.testId?.startsWith('method:'));
  const issues = (x.problems ?? []).filter(s => !s.deletedAt && !s.archivedAt);
  const sources = new Map<string, { label: string; says?: string }>();
  for (const f of toolFindings) sources.set('study:' + f.id, {
    label: [f.section, f.title, runs.get(f.id)].filter(Boolean).join(' · '), says: f.says,
  });
  for (const { study, docs } of talks) sources.set('study:' + study.id, {
    label: [findingsByStudy.get(study.id)?.section, study.name, ...docs.map(d => d.doc.title)].filter(Boolean).join(' · '),
  });
  for (const st of standards) sources.set('standard:' + st.id, {
    label: [methodPhaseOf(x.owed, m.key, 'standard', st.id) ?? 'Project evidence', st.product || 'Line standard'].join(' · '),
    says: st.capacity?.stations.length ? capacitySays(st.capacity).text : st.note?.trim(),
  });
  for (const problem of issues) sources.set('problem:' + problem.id, { label: 'Problem · ' + problem.problem });
  const historicalLinks = new Map<string, Set<string>>();
  for (const study of live) for (const use of study.uses ?? []) {
    if (use.kind !== 'action') continue;
    const records = historicalLinks.get(use.ref) ?? new Set<string>();
    records.add(study.id);
    historicalLinks.set(use.ref, records);
  }
  const evidenceFor = (ref: ActionSource): {label: string; says?: string} | undefined => {
    if (ref.kind === 'study' && ref.part && findingsByStudy.get(ref.id)?.key === 'talk') {
      const talk = talks.find(row => row.study.id === ref.id);
      const current = talk?.docs.find(doc => doc.id === ref.id + ':' + ref.part);
      return current ? {label: [findingsByStudy.get(ref.id)?.section, current.doc.title].filter(Boolean).join(' · ')} : undefined;
    }
    if (ref.kind === 'method' && x.project.id && ref.id === x.project.id && ref.part?.startsWith(m.key + ':')) {
      const query = new URLSearchParams(ref.href.split('?')[1]);
      const phase = m.sections.find(s => s.name === query.get('phase') || ref.part === m.key + ':' + s.name);
      const field = phase && fieldsOf(m.key, phase.name).find(f => f.id === query.get('finding'));
      return { label: [m.name, phase?.name, field?.label].filter(Boolean).join(' · '), says: field && answer(field.id) };
    }
    return sources.get(ref.kind + ':' + ref.id);
  };
  const statusOf = (i: ReportOwed) => {
    if (i.doneAt) return 'Completed';
    const late = i.due && i.due < x.today;
    if (i.state === 'waiting') return late ? 'Waiting · late' : 'Waiting';
    return late ? 'Late' : 'Open';
  };
  const actionDetails = new Map<ReportOwed, ReportItem>();
  for (const action of [...owing, ...completed]) {
    const evidence = (action.sources ?? []).flatMap(ref => {
      const record = evidenceFor(ref);
      if (!record) return [];
      const privateTalk = ref.kind === 'study' && findingsByStudy.get(ref.id)?.key === 'talk';
      const excerpt = privateTalk ? undefined : ref.excerpt?.trim();
      const label = ref.how === 'ai' ? record.label + ' · Luna suggestion (unverified)' : record.label;
      return [{ label, excerpt, read: record.says }];
    });
    // Historical links can be stored on the exact study instead of on the action.
    for (const studyId of historicalLinks.get(action.id ?? '') ?? []) {
      if (action.sources?.some(ref => ref.kind === 'study' && ref.id === studyId)) continue;
      const found = sources.get('study:' + studyId);
      if (found) evidence.push({label: found.label, excerpt: undefined, read: found.says});
    }
    if (!evidence.length && !action.expected?.trim()) continue;
    const rows: [string, string][] = [['Action', action.what]];
    evidence.forEach((e, index) => {
      rows.push([evidence.length > 1 ? `Source ${index + 1}` : 'Source', e.label]);
      if (e.excerpt) rows.push(['When linked', e.excerpt]);
      else if (e.read) rows.push(['Latest saved finding', e.read]);
    });
    rows.push(['Owner', action.owner?.trim() || 'Unassigned'], ['Status', statusOf(action)]);
    if (action.due) rows.push(['Due', niceDay(action.due, { year: true })]);
    if (action.doneOn) rows.push(['Completed', niceDay(action.doneOn, { year: true })]);
    if (action.expected?.trim()) rows.push(['Expected change', action.expected.trim()]);
    if (action.outcome?.trim() || action.doneAt) rows.push(['Observed outcome', action.outcome?.trim() || 'Outcome unrecorded']);
    actionDetails.set(action, {kind: 'facts', rows});
  }
  const outstanding = owing.filter(i => !actionDetails.has(i));
  const attn: ReportSection = {
    id: 'attention', title: 'What needs attention', lead: toLook ? `${plural(toLook, 'thing')} to look at.` : 'Nothing is flagged.',
    items: [
      ...attention.map((a): ReportItem => ({ kind: 'callout', tone: a.tone, word: WORD[a.tone] ?? '', text: a.text })),
      ...(outstanding.length
        ? [{ kind: 'table', head: ['Action', 'Who', 'By when', 'State'], shares: [0.5, 0.18, 0.16, 0.16],
          rows: outstanding.map(i => [i.what.trim() || 'An action with no words yet', i.owner?.trim() || 'Nobody yet', i.due ? niceDay(i.due) : 'No day', statusOf(i)]),
          tones: outstanding.map(i => (i.due && i.due < x.today ? 'r' : undefined)) } as ReportItem]
        : owing.length ? [] : [{ kind: 'paragraph', text: 'No open actions on this project.' } as ReportItem]),
    ],
  };

  const unlinkedDone = completed.filter(i => !actionDetails.has(i));
  if (unlinkedDone.length) {
    attn.items.push({ kind: 'table', head: ['Completed action', 'Owner', 'Completed', 'Recorded outcome'], shares: [0.34, 0.17, 0.15, 0.34],
      rows: unlinkedDone.map(i => [i.what, i.owner?.trim() || 'Unassigned', i.doneOn ? niceDay(i.doneOn) : i.state ? 'Date unrecorded' : i.doneAt ? niceDay(isoDay(i.doneAt)) : 'Date unrecorded', i.outcome?.trim() || 'Outcome unrecorded']) });
  }
  const decisions: ReportSection[] = actionDetails.size ? [{
    id: 'action-outcomes', title: 'Actions and outcomes', items: [...actionDetails.values()],
  }] : [];
  const findings: ReportSection[] = issues.length ? [{
    id: 'project-problems', title: 'Project problems', items: issues.map(s => ({ kind: 'facts', rows: [
      ['Problem', s.problem], ['State', SNAG_STATUS_META[s.status].label],
      ...(s.owner ? [['Owner', s.owner] as [string, string]] : []),
      ...(s.proposedSolution ? [['Proposed solution', s.proposedSolution] as [string, string]] : []),
      ...(s.closeNote ? [['Close-out', s.closeNote] as [string, string]] : []),
    ] })),
  }] : [];
  /* (f) what we wrote — every question and the team’s answer */
  const wrote: ReportSection = {
    id: 'wrote', title: ownSections.length ? 'Everything we wrote' : `What we wrote — ${m.name}`,
    lead: askable.length ? 'The method’s own questions, as the team answered them.' : 'This method keeps its own screens — what was written is on its pages.',
    items: m.sections.flatMap((s): ReportItem[] => {
      const fs = fieldsOf(m.key, s.name);
      if (!fs.length) return [];
      return [{ kind: 'qa', title: s.name, rows: fs.map(f => ({ q: f.label, a: answer(f.id) || 'Not written yet.', written: !!answer(f.id) })) }];
    }),
  };

  /* (g) the closing line — where are we, why, what we are doing about it */
  const where = dash.closing || `${m.name}.`;
  const why = attention[0] ? `Why: ${attention[0].text}` : 'Why: nothing is flagged.';
  const late = dash.actions.late;
  const doing = `Doing about it: ${late ? `${plural(late, 'action')} late, ` : ''}${plural(dash.actions.open, 'action')} open — ${lc(dash.next)}`;
  const closing = { text: `${where} ${why} ${doing}`.replace(/\s+/g, ' ').trim(), tone: (tone === 'w' ? 'n' : tone) as 'r' | 'a' | 'g' | 'n' };

  return { cover, sections: [...decisions, journey, telling, attn, ...findings, ...ownSections, wrote], closing, dash };
}

/** The paper keeps answers and a count of unanswered questions, rather than printing an empty form.
 * The journey table already carries the progress, so its duplicate bars stay on screen. */
export function paperReport(r: MethodReport): MethodReport {
  return { ...r, sections: r.sections.map(s => ({ ...s, items: s.items.flatMap((it): ReportItem[] => {
    if (s.id === 'journey' && s.items.some(x => x.kind === 'table') && it.kind === 'bars') return [];
    if (it.kind !== 'qa') return [it];
    const written = it.rows.filter(row => row.written);
    const missing = it.rows.length - written.length;
    return [{ ...it, rows: written }, ...(missing ? [{ kind: 'paragraph', text: `${missing} question${missing === 1 ? '' : 's'} not answered yet — open this phase in the project to complete them.`, tone: 'n' } as ReportItem] : [])];
  }) })) };
}

/** Every line of words an item puts on the page (or in the compact paper model). */
export function itemLines(it: ReportItem): string[] {
  switch (it.kind) {
    case 'paragraph': return [it.text];
    case 'talkDocument': {
      const doc = it.report.doc;
      return [doc.title, ...(doc.status ? [doc.status.line] : []), ...doc.sections.flatMap(s => [s.heading, s.text,
        ...s.points.flatMap(p => [p.text, p.owner, p.due]), ...s.photos.map(p => p.caption)])].filter(Boolean);
    }
    case 'facts': return it.rows.flatMap(([k, v]) => [k, v]);
    case 'bullets': return it.items.map(b => b.text);
    case 'table': return [...it.head, ...it.rows.flat()];
    case 'callout': return [it.word, it.text];
    case 'money': return [it.text];
    case 'bars': return [it.title, ...it.bars.flatMap(b => [b.label, b.text])];
    case 'tool': return [it.says, ...it.notes.map(n => n.text)];
    case 'qa': return [it.title, ...it.rows.flatMap(r => [r.q, r.a])];
  }
}

/** All the words of a report, in order — the cover, every item, the closing line. */
export function reportLines(r: MethodReport): string[] {
  return [
    r.cover.title, r.cover.sub, r.cover.verdict.text, ...r.cover.facts.flat(), ...r.cover.tiles.flatMap(t => [t.k, t.v, ...(t.of ? [t.of] : [])]),
    ...r.sections.flatMap(s => [s.title, ...(s.lead ? [s.lead] : []), ...s.items.flatMap(itemLines)]),
    r.closing.text,
  ];
}

/** The cover as the lean page's band, tiles and closing line — the screen (ui/Lean) and the paper (lib/report/lean) both draw this. */
export function leanPageOf(r: MethodReport): LeanPage {
  const c = r.cover;
  return { eyebrow: c.eyebrow, title: c.title, sub: c.sub, verdict: { text: c.verdict.text, tone: c.verdict.tone === 'r' || c.verdict.tone === 'a' || c.verdict.tone === 'g' ? c.verdict.tone : 'n' },
    facts: c.facts, tiles: c.tiles, insights: [], actions: [], actionsEmpty: '', closing: r.closing };
}
