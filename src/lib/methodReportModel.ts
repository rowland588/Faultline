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
import type { ProjectMethod } from './methods';
import type { LeanPage, LeanTile } from './lean';
import type { ToolStudy } from './study';
import type { StudyContext } from './studyLinks';
import { niceDay } from './weeks';

export type ReportTone = DashTone;

/** One thing on the report. Additive: a method's sections use these and a new kind is one more member. */
export type ReportItem =
  | { kind: 'paragraph'; text: string; tone?: ReportTone }
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
  | { kind: 'tool'; id: string; tool: string; key: string; title: string; section: string; says: string; tone: ReportTone; href: string; more: number; where: string; notes: { text: string; at: number; by?: string }[] }
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

export interface ReportOwed extends DashOwed { owner?: string }

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
  method: ProjectMethod;
  project: { name: string; lead?: string };
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
  project: { name: string; lead?: string };
  /** The line(s) the project is on, said as the page says them; '' when none. */
  line: string;
  /** The printed date, as the page says it. */
  printed: string;
  owed: readonly ReportOwed[];
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
/** The cover's verdict, in its word (a colour is never the only carrier). */
const VERDICT: Record<ReportTone, string> = { r: 'Needs attention', a: 'Watch', g: 'Every section written', w: 'Under way', n: 'Not started yet' };
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
  const dash = methodDashboard({ ...x, owed: x.owed });
  const live = x.studies.filter(s => !s.deletedAt);
  const answer = (id: string) => (x.answers[id] ?? '').trim();
  const open = x.owed.filter(i => (i.kind === 'next' || i.kind === 'found') && !i.doneAt && !(i.testId ?? '').startsWith('method:'));
  const askable = dash.sections.filter(s => s.fields > 0);

  /* (e) the method's own sections — the registry's entry, if the method has one */
  const ownSections = own ? own({ method: m, project: x.project, line: x.line, answers: x.answers, studies: live, findings: dash.findings, dash, owed: x.owed, today: x.today, answer, ...(x.ctx ? { ctx: x.ctx } : {}) }) : [];
  const flags: DashAttention[] = ownSections.flatMap(s => (s.flags ?? []).map(f => ({ kind: 'finding' as const, tone: f.tone, text: f.text })));
  const attention = [...dash.attention, ...flags].sort((a, b) => ({ r: 0, a: 1, n: 2 }[a.tone] - { r: 0, a: 1, n: 2 }[b.tone]));
  const toLook = attention.filter(a => a.tone !== 'n').length;
  const results = dash.findings.reduce((n, f) => n + 1 + f.more, 0);

  /* (a) the cover */
  const here = dash.sections[dash.here];
  const tiles: LeanTile[] = [
    { k: 'Sections written', v: String(dash.written), of: askable.length ? `of ${askable.length}` : 'this method keeps its own screens', tone: askable.length && dash.written === askable.length ? 'g' : 'n' },
    { k: 'Tool results', v: String(results), of: results ? `from ${plural(dash.findings.length, 'tool')}` : 'no tool used yet', tone: 'n' },
    { k: 'To look at', v: String(toLook), of: toLook ? 'flagged — see below' : 'nothing flagged', tone: attention.some(a => a.tone === 'r') ? 'r' : toLook ? 'a' : 'n' },
    { k: 'Late actions', v: String(dash.actions.late), of: `of ${plural(dash.actions.open, 'open action')}`, tone: dash.actions.late ? 'r' : 'n' },
  ];
  const tone: ReportTone = attention.some(a => a.tone === 'r') ? 'r' : attention.some(a => a.tone === 'a') ? 'a' : dash.tone;
  const cover: ReportCover = {
    eyebrow: `PROJECT REPORT · ${m.name.toUpperCase()}`,
    title: x.project.name,
    sub: dash.says,
    verdict: { text: VERDICT[tone], tone },
    facts: [['Method', m.name], ['Line', x.line || 'No line yet'], ['Lead', x.project.lead?.trim() || 'Not named yet'], ...(here && askable.length ? [['You are in', `${here.name} (step ${here.index + 1} of ${dash.sections.length})`] as [string, string]] : [])],
    printed: x.printed,
    tiles,
  };

  /* (b) the journey */
  const journey: ReportSection = {
    id: 'journey', title: 'The journey', lead: askable.length ? `${m.name}: ${dash.written} of ${askable.length} sections written; you are in ${here?.name ?? ''}.` : `${m.name}.`,
    items: [
      ...(askable.length ? [{ kind: 'bars', title: 'What is written, by section', bars: dash.sections.filter(s => s.fields > 0).map(s => ({ label: `${s.index + 1}. ${s.name}`, v: s.written / s.fields, text: `${s.written} of ${s.fields} written`, here: s.here })) } as ReportItem] : []),
      { kind: 'table', head: ['Step', 'State', 'Written', 'Tool results'], shares: [0.46, 0.2, 0.17, 0.17],
        rows: dash.sections.map(s => [`${s.index + 1}. ${s.name}${s.here ? ' — you are here' : ''}`, s.state, s.fields ? `${s.written} of ${s.fields}` : '—', s.results ? String(s.results) : '—']),
        tones: dash.sections.map(s => (s.here ? 'w' : undefined)) },
    ],
  };

  /* (c) what everything is telling us now — each tool, in its own words; its paper's blocks follow on paper */
  const telling: ReportSection = {
    id: 'telling', title: 'What everything is telling us now',
    lead: dash.findings.length ? `${plural(results, 'tool result')} from ${plural(dash.findings.length, 'tool')} — each in the tool’s own sentence, with its own figures.` : 'No tool has been used in this project yet — a tool falls in where a question needs a number.',
    items: dash.findings.map((f): ReportItem => ({ kind: 'tool', id: f.id, tool: f.tool, key: f.key, title: f.title, section: f.section, says: f.says, tone: f.tone, href: f.href, more: f.more, notes: f.notes, where: `${f.section} · ${x.project.name}` })),
  };
  const moneyItems: ReportItem[] = [];
  for (const f of dash.findings) {
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
  const attn: ReportSection = {
    id: 'attention', title: 'What needs attention', lead: toLook ? `${plural(toLook, 'thing')} to look at.` : 'Nothing is flagged.',
    items: [
      ...attention.map((a): ReportItem => ({ kind: 'callout', tone: a.tone, word: WORD[a.tone] ?? '', text: a.text })),
      ...(owing.length
        ? [{ kind: 'table', head: ['Action', 'Who', 'By when', 'State'], shares: [0.5, 0.18, 0.16, 0.16],
          rows: owing.map(i => [i.what.trim() || 'An action with no words yet', i.owner?.trim() || 'Nobody yet', i.due ? niceDay(i.due) : 'No day', i.due && i.due < x.today ? 'Late' : 'Open']),
          tones: owing.map(i => (i.due && i.due < x.today ? 'r' : undefined)) } as ReportItem]
        : [{ kind: 'paragraph', text: 'No open actions on this project.' } as ReportItem]),
    ],
  };

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

  return { cover, sections: [journey, telling, attn, ...ownSections, wrote], closing, dash };
}

/** Every line of words an item puts on the page — the screen and the paper both say each of them (the acceptance script reads both). */
export function itemLines(it: ReportItem): string[] {
  switch (it.kind) {
    case 'paragraph': return [it.text];
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
