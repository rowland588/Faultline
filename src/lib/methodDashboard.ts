import { standardHref } from '../tools/linestandard/standard';
/* WHERE A PROJECT IS ON ITS METHOD'S JOURNEY, AND WHAT ITS TOOLS ARE SHOWING (docs/METHODS.md §17 — Rowland, 1 November 2026: "this
 * isn't about doing tools and then they're independently showing you information ... each tool has to create insightfulness ... an
 * ongoing summary of what's actually happening ... then a report ultimately puts it all together ... where are we on the journey?
 * what's the tool showing us? does it all feed into a dashboard?").
 *
 * One module, so the dashboard on the project's method page and the project report on paper cannot part. It reads three things that
 * already exist and invents nothing: what the method asks and what has been written (lib/methodSheet), what each tool the project has
 * used says in its own words (lib/studyLinks studyLine — the same sentence the tool's page and paper say), and what is owed
 * (the project's actions). From them it says: the journey (each section: written, tools used, where you are), the findings (each
 * tool's latest, in its own sentence, placed in the section it serves), what needs attention — a red or amber finding, a tool result
 * nobody has written up, a claim with no number behind it, late actions — and what to do next; then one sentence that sums it up.
 * A missing input is said, never filled. Pure. */
import type { ActionSource } from './actionSources';
import { methodPhaseOf, methodStandardView, studyPhase } from './methodPlacement';
import { isConversation } from '../colleague/conversation';

import { fieldsOf, sectionState } from './methodSheet';
import { METHOD_INSIGHT } from './methodInsight';
import type { ProjectMethod } from './methods';
import { studyHref, studyLine, studyTitle, TOOL_NAME, type StudyContext } from './studyLinks';
import type { ToolStudy } from './study';

export type DashTone = 'r' | 'a' | 'w' | 'g' | 'n';
export interface DashSection {
  name: string; what: string; index: number;
  fields: number; written: number;
  state: 'Not started' | 'Under way' | 'All written';
  /** How many tool results sit in this section. */
  results: number;
  /** Evidence, worksheet entries, linked actions and recorded DMAIC reviews. */
  activity: number;
  progress: 'No activity recorded' | 'Activity recorded' | 'Worksheet written';
  /** First unfinished worksheet, suggested for the next edit. */
  here: boolean;
}
export interface DashFinding {
  /** The study behind it, and the study tool it is a record of (the project report prints that tool's own paper blocks). */
  id: string;
  key: ToolStudy['tool'];
  /** The tool, as the app names it. */
  tool: string;
  section: string;
  title: string;
  /** What the tool says, in its own sentence. */
  says: string;
  tone: DashTone;
  href: string;
  /** More records of the same tool in the project than the one shown. */
  more: number;
  /** What the person wrote on the study while it ran (facts.remarks), oldest first — the report draws it with the finding (Rowland, 2 November: notes are part of the report structure). */
  notes: { text: string; at: number; by?: string }[];
  at: number;
}
/** The live notes on a study, oldest first. */
export const notesOf = (s: ToolStudy): DashFinding['notes'] =>
  (s.facts.remarks ?? []).filter(r => !r.struck && r.text.trim()).sort((a, b) => a.at - b.at).map(r => ({ text: r.text.trim(), at: r.at, ...(r.by ? { by: r.by } : {}) }));

export interface DashAttention { text: string; tone: 'r' | 'a' | 'n'; kind: 'finding' | 'unwritten' | 'unproved' | 'late' }
export interface DashOwed {
  kind: string; what: string; note?: string; owner?: string; due?: string; doneAt?: number | null; testId?: string;
  /** When the item was first written — a method answer's moment, so a Kata prediction can be read against its result (lib/kataBoard writtenAtOf). */
  createdAt?: number;
  projectId?: string;
  sources?: readonly ActionSource[];
}
export interface DashIn {
  method: ProjectMethod;
  answers: Readonly<Record<string, string>>;
  studies: readonly ToolStudy[];
  /** The project's own actions and fixes (items kind 'next' or 'found'), method answers left out. */
  owed: readonly DashOwed[];
  today: string;
  /** Which study tool each catalogue tool of a section reads (registry), so a record is placed in the section that lists its tool. */
  readsOf: (fcId: string) => ToolStudy['tool'] | undefined;
  matches?: (fcId: string, study: ToolStudy) => boolean;
  nameOf?: (fcId: string) => string | undefined;
  /** What the tools' sentences read of their lines (stops, cost models) — so the sentence is the one the tool's own page says. */
  ctx?: StudyContext;
}
export interface Dashboard {
  sections: DashSection[];
  here: number;
  written: number;
  findings: DashFinding[];
  standards: { id: string; title: string; section: string; href: string; tool: string }[];
  attention: DashAttention[];
  actions: { open: number; late: number };
  next: string;
  says: string;
  tone: DashTone;
  /** The one line the paper and the project's row carry. */
  closing: string;
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function methodDashboard(x: DashIn): Dashboard {
  const m = x.method;
  /* Recommended tools can suggest next steps even before any work has been recorded. */

  const toolsIn = new Map<string, string[]>();
  for (const s of m.sections) {
    for (const id of s.tools) {
      const k = x.readsOf(id);
      if (!k) continue;

      toolsIn.set(s.name, [...(toolsIn.get(s.name) ?? []), x.nameOf?.(id) ?? TOOL_NAME[k] ?? id]);
    }
  }
  const live = x.studies.filter(s => !s.deletedAt && !s.facts.template && !isConversation(s) && !(s.tool === 'talk' && ((s.facts as { lunaFolder?: boolean }).lunaFolder || (s.facts as { lunaArtifact?: boolean }).lunaArtifact)) && !!TOOL_NAME[s.tool] && s.tool !== 'story');
  const findings: DashFinding[] = [];
  for (const s of live) {
    const section = studyPhase(m, s, x.owed, x.matches ?? ((id, study) => x.readsOf(id) === study.tool));
    const said = studyLine(s, { ...(x.ctx ?? {}), studies: live });
    findings.push({ id: s.id, key: s.tool, tool: TOOL_NAME[s.tool] ?? 'Study', section, title: studyTitle(s), says: said.text, tone: said.tone as DashTone, href: studyHref(s), more: 0, notes: notesOf(s), at: s.updatedAt });
  }
  const order = new Map(m.sections.map((s, i) => [s.name, i] as const));
  findings.sort((a, b) => (order.get(a.section) ?? Infinity) - (order.get(b.section) ?? Infinity) || b.at - a.at);
  const standards = (x.ctx?.standards ?? []).filter(s => !s.deletedAt).map(st => {
    const view = methodStandardView(x.owed, m.key, st.id) ?? (st.capacity ? 'balance' : 'map');
    return { id: st.id, title: st.product, section: methodPhaseOf(x.owed, m.key, 'standard', st.id) ?? 'Project evidence',
      href: standardHref(st, view), tool: view === 'balance' ? 'Line capacity' : view === 'work' ? 'Line balance' : 'Line standard' };
  });

  const sections: DashSection[] = m.sections.map((s, i) => {
    const st = sectionState(m.key, s.name, x.answers);
    const results = findings.filter(f => f.section === s.name).length + standards.filter(st => st.section === s.name).length;
    const actions = x.owed.filter(item => (item.kind === 'next' || item.kind === 'found') && item.sources?.some(source => {
      if (source.kind === 'study') return findings.some(f => f.id === source.id && f.section === s.name);
      if (source.kind === 'standard') return standards.some(st => st.id === source.id && st.section === s.name);
      if (source.kind !== 'method' || (item.projectId && source.id !== item.projectId) || !source.part?.startsWith(m.key + ':')) return false;
      return source.part === `${m.key}:${s.name}` || new URLSearchParams(source.href.split('?')[1]).get('phase') === s.name;
    })).length;
    const review = m.key === 'dmaic' && Object.entries(x.answers).some(([key, value]) => key.startsWith(`rv_${s.name.toLowerCase()}_`) && value.trim());
    const activity = st.written + results + actions + Number(review);
    return { name: s.name, what: s.what, index: i, fields: st.fields, written: st.written, state: st.word, results, activity,
      progress: st.fields && st.written === st.fields ? 'Worksheet written' : activity ? 'Activity recorded' : 'No activity recorded', here: false };
  });
  const askable = sections.filter(s => s.fields > 0);
  const firstOpen = sections.findIndex(s => s.fields > 0 && s.state !== 'All written');
  const here = firstOpen;
  const hereSection = sections[here];
  if (hereSection) hereSection.here = true;
  const written = askable.filter(s => s.state === 'All written').length;

  const attention: DashAttention[] = [];
  for (const f of findings) if (f.tone === 'r' || f.tone === 'a') attention.push({ kind: 'finding', tone: f.tone, text: `${f.tool} (${f.title}): ${f.says}` });
  for (const s of sections) {
    if (s.results > 0 && s.written === 0 && s.fields > 0) attention.push({ kind: 'unwritten', tone: 'n', text: `${s.name} has ${plural(s.results, 'saved tool record')} and no worksheet notes.` });
  }
  for (const s of sections) {
    if (s.results > 0 || s.written === 0) continue;
    const offered = fieldsOf(m.key, s.name).filter(f => (f.tools?.length ?? 0) > 0 && (x.answers[f.id] ?? '').trim() !== '');
    const names = [...new Set(toolsIn.get(s.name) ?? [])].slice(0, 2);
    if (offered.length && names.length) attention.push({ kind: 'unproved', tone: 'n', text: `${s.name} has a worksheet entry without a linked tool record. Suggested tool: ${names.join(' or ')}.` });
  }
  const actions = x.owed.filter(i => (i.kind === 'next' || i.kind === 'found') && !(i.testId ?? '').startsWith('method:'));
  const open = actions.filter(i => !i.doneAt);
  const late = open.filter(i => !!i.due && i.due < x.today);
  if (late.length) attention.push({ kind: 'late', tone: 'r', text: `${plural(late.length, 'action')} ${late.length === 1 ? 'is' : 'are'} late: ${late.slice(0, 2).map(i => i.what.trim() || 'an action').join('; ')}${late.length > 2 ? ` and ${late.length - 2} more` : ''}.` });
  const insight = METHOD_INSIGHT[m.key]?.({ answers: x.answers, studies: live as ToolStudy[], owed: x.owed, today: x.today });
  if (insight?.attention) attention.push(...insight.attention);
  attention.sort((a, b) => ({ r: 0, a: 1, n: 2 }[a.tone] - { r: 0, a: 1, n: 2 }[b.tone]));

  const cur = sections[here];
  const curName = cur?.name ?? '';
  const last = findings.reduce<DashFinding | undefined>((newest, f) => !newest || f.at > newest.at ? f : newest, undefined);
  const nextField = cur ? fieldsOf(m.key, cur.name).find(f => (x.answers[f.id] ?? '').trim() === '') : undefined;
  const next = insight?.next ? insight.next : !askable.length ? 'This method keeps its own screens — open them from the project’s tabs.'
    : firstOpen < 0 ? 'Every section is written — view the report and print it for the meeting.'
      : nextField ? `Next: in ${curName}, write “${nextField.label}”.` : `Next: finish ${curName}.`;

  const recorded = sections.filter(s => s.activity > 0).map(s => s.name);
  const lead = [m.name + '.', askable.length ? `${written} of ${askable.length} worksheets complete.` : '', recorded.length ? `Activity recorded in ${recorded.join(', ')}.` : ''].filter(Boolean).join(' ');
  const evidence = findings.length ? `${plural(findings.reduce((n, f) => n + 1 + f.more, 0), 'saved tool record')} — ${attention.find(a => a.kind === 'finding')?.text ?? `latest: ${last?.tool ?? ''}, ${lc(last?.says ?? '')}`}`
    : standards.length ? `${plural(standards.length, 'line standard')} recorded.` : 'No saved tool records.';
  const owed = late.length ? ` ${plural(late.length, 'action')} late.` : open.length ? ` ${plural(open.length, 'action')} open, none late.` : '';
  /* the money the tools say, in their own words (first £ clause of the first finding that has one) — never worked out here */
  const pounds = findings.map(f => f.says.split(/(?<=[.;])\s+|\s+[—–]\s+/).map(c => c.trim()).find(c => c.includes('£'))).find(Boolean);
  const money = pounds ? ` In money: ${pounds.replace(/\.$/, '')}.` : '';
  const says = `${lead} ${evidence}${money}${owed} ${next}`.replace(/\s+/g, ' ').trim();
  const anyActivity = recorded.length > 0 || actions.length > 0 || findings.length > 0 || standards.length > 0 || Object.values(x.answers).some(value => value.trim());
  const tone: DashTone = attention.some(a => a.tone === 'r') ? 'r' : attention.some(a => a.tone === 'a') ? 'a' : askable.length && firstOpen < 0 ? 'g' : anyActivity ? 'w' : 'n';
  const closing = askable.length ? `${written} of ${askable.length} worksheets complete${recorded.length ? ` · Activity in ${recorded.join(', ')}` : ''} · ${plural(findings.length + standards.length, 'saved tool record')} · ${plural(attention.filter(a => a.tone !== 'n').length, 'thing')} to look at · ${late.length} late.` : '';
  return { sections, here, written, findings, standards, attention, actions: { open: open.length, late: late.length }, next, says, tone, closing };
}
