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
import { fieldsOf, sectionState } from './methodSheet';
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
  /** The section you are in — the first not all written (the last, when every one is). */
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
  at: number;
}
export interface DashAttention { text: string; tone: 'r' | 'a' | 'n'; kind: 'finding' | 'unwritten' | 'unproved' | 'late' }
export interface DashOwed { kind: string; what: string; owner?: string; due?: string; doneAt?: number | null; testId?: string }
export interface DashIn {
  method: ProjectMethod;
  answers: Readonly<Record<string, string>>;
  studies: readonly ToolStudy[];
  /** The project's own actions and fixes (items kind 'next' or 'found'), method answers left out. */
  owed: readonly DashOwed[];
  today: string;
  /** Which study tool each catalogue tool of a section reads (registry), so a record is placed in the section that lists its tool. */
  readsOf: (fcId: string) => ToolStudy['tool'] | undefined;
  nameOf?: (fcId: string) => string | undefined;
  /** What the tools' sentences read of their lines (stops, cost models) — so the sentence is the one the tool's own page says. */
  ctx?: StudyContext;
}
export interface Dashboard {
  sections: DashSection[];
  here: number;
  written: number;
  findings: DashFinding[];
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
  /* the section that lists a study tool first is where its records are placed */
  const placeOf = new Map<string, string>();
  const toolsIn = new Map<string, string[]>();
  for (const s of m.sections) {
    for (const id of s.tools) {
      const k = x.readsOf(id);
      if (!k) continue;
      if (!placeOf.has(k)) placeOf.set(k, s.name);
      toolsIn.set(s.name, [...(toolsIn.get(s.name) ?? []), x.nameOf?.(id) ?? TOOL_NAME[k] ?? id]);
    }
  }
  const live = x.studies.filter(s => !s.deletedAt);
  const byTool = new Map<string, ToolStudy[]>();
  for (const s of live) { if (!placeOf.has(s.tool)) continue; byTool.set(s.tool, [...(byTool.get(s.tool) ?? []), s]); }
  const findings: DashFinding[] = [];
  for (const [tool, list] of byTool) {
    const sorted = [...list].sort((a, b) => b.updatedAt - a.updatedAt);
    const s = sorted[0];
    if (!s) continue;
    const said = studyLine(s, { ...(x.ctx ?? {}), studies: live as ToolStudy[] });
    findings.push({ id: s.id, key: s.tool, tool: TOOL_NAME[s.tool] ?? tool, section: placeOf.get(tool) ?? '', title: studyTitle(s), says: said.text, tone: said.tone as DashTone, href: studyHref(s), more: sorted.length - 1, at: s.updatedAt });
  }
  const order = new Map(m.sections.map((s, i) => [s.name, i] as const));
  findings.sort((a, b) => (order.get(a.section) ?? 0) - (order.get(b.section) ?? 0) || b.at - a.at);

  const sections: DashSection[] = m.sections.map((s, i) => {
    const st = sectionState(m.key, s.name, x.answers);
    return { name: s.name, what: s.what, index: i, fields: st.fields, written: st.written, state: st.word, results: findings.filter(f => f.section === s.name).reduce((n, f) => n + 1 + f.more, 0), here: false };
  });
  const askable = sections.filter(s => s.fields > 0);
  const firstOpen = sections.findIndex(s => s.fields > 0 && s.state !== 'All written');
  const here = firstOpen >= 0 ? firstOpen : Math.max(0, sections.length - 1);
  const hereSection = sections[here];
  if (hereSection) hereSection.here = true;
  const written = askable.filter(s => s.state === 'All written').length;

  const attention: DashAttention[] = [];
  for (const f of findings) if (f.tone === 'r' || f.tone === 'a') attention.push({ kind: 'finding', tone: f.tone, text: `${f.tool} (${f.title}): ${f.says}` });
  for (const s of sections) {
    if (s.results > 0 && s.written === 0 && s.fields > 0) attention.push({ kind: 'unwritten', tone: 'a', text: `${s.name} has ${plural(s.results, 'tool result')} but nothing written — say what ${s.results === 1 ? 'it means' : 'they mean'} for this project.` });
  }
  for (const s of sections) {
    if (s.results > 0 || s.written === 0) continue;
    const offered = fieldsOf(m.key, s.name).filter(f => (f.tools?.length ?? 0) > 0 && (x.answers[f.id] ?? '').trim() !== '');
    const names = [...new Set(toolsIn.get(s.name) ?? [])].slice(0, 2);
    if (offered.length && names.length) attention.push({ kind: 'unproved', tone: 'n', text: `${s.name} is written with no number from a tool behind it — ${names.join(' or ')} would show how you know.` });
  }
  const open = x.owed.filter(i => (i.kind === 'next' || i.kind === 'found') && !i.doneAt && !(i.testId ?? '').startsWith('method:'));
  const late = open.filter(i => !!i.due && i.due < x.today);
  if (late.length) attention.push({ kind: 'late', tone: 'r', text: `${plural(late.length, 'action')} ${late.length === 1 ? 'is' : 'are'} late: ${late.slice(0, 2).map(i => i.what.trim() || 'an action').join('; ')}${late.length > 2 ? ` and ${late.length - 2} more` : ''}.` });
  attention.sort((a, b) => ({ r: 0, a: 1, n: 2 }[a.tone] - { r: 0, a: 1, n: 2 }[b.tone]));

  const cur = sections[here];
  const curName = cur?.name ?? '';
  const last = findings[findings.length - 1];
  const nextField = cur ? fieldsOf(m.key, cur.name).find(f => (x.answers[f.id] ?? '').trim() === '') : undefined;
  const next = !askable.length ? 'This method keeps its own screens — open them from the project’s tabs.'
    : firstOpen < 0 ? 'Every section is written — view the report and print it for the meeting.'
      : nextField ? `Next: in ${curName}, write “${nextField.label}”.` : `Next: finish ${curName}.`;

  const lead = askable.length ? `${m.name}: ${written} of ${askable.length} sections written; you are in ${curName} (step ${here + 1} of ${sections.length}).` : `${m.name}.`;
  const evidence = findings.length ? `${plural(findings.reduce((n, f) => n + 1 + f.more, 0), 'tool result')} so far — ${attention.find(a => a.kind === 'finding')?.text ?? `latest: ${last?.tool ?? ''}, ${lc(last?.says ?? '')}`}`
    : 'No tool has been used yet — a tool falls in where a question needs a number.';
  const owed = late.length ? ` ${plural(late.length, 'action')} late.` : open.length ? ` ${plural(open.length, 'action')} open, none late.` : '';
  const says = `${lead} ${evidence}${owed} ${next}`.replace(/\s+/g, ' ').trim();
  const tone: DashTone = attention.some(a => a.tone === 'r') ? 'r' : attention.some(a => a.tone === 'a') ? 'a' : askable.length && firstOpen < 0 ? 'g' : written || findings.length ? 'w' : 'n';
  const closing = askable.length ? `${written} of ${askable.length} sections written · ${plural(findings.length, 'tool')} reporting · ${plural(attention.filter(a => a.tone !== 'n').length, 'thing')} to look at · ${late.length} late.` : '';
  return { sections, here, written, findings, attention, actions: { open: open.length, late: late.length }, next, says, tone, closing };
}
