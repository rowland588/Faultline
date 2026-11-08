/* THE CLIENT'S STORY — the continuous journey, a chapter at a time (8 November, docs/STORY.md).
 *
 * Rowland, 8 November: "the story so far is a continuous journey … I run an update and it pulls it all into a beautiful report." A
 * story is one record a client (lib/study AgreedStory, tool 'story'); each Run an update makes a chapter: a SNAPSHOT of what the
 * Factory page's own readers say that day (lib/useFactoryRead — the register's problems priced by the line's cost model, the actions,
 * the fixes proved, the tools used), what has changed SINCE the chapter before (by the records' ids, never a guess), and a NARRATIVE in
 * plain English — assembled here from the modules' own sentences, or drafted by the assistant (S3) — the consultant's to edit before
 * he approves it. Pure: records in, the chapter's parts out; every figure is a reader's, nothing is invented. */
import type { ToolStudy, StoryChapter, StorySince, StorySnapshot, AgreedStory } from './study';
import type { ProjectAction } from './projectActions';
import type { ProvedFix } from '../tools/yokoten/yokoten';
import { wrongOf, doingOf, sentenceOf, whoOf, type WrongRow } from './factoryQuestions';
import { fmtGBP } from './cost';
import type { LeanTile } from './lean';
import { studyTitle } from './studyLinks';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export const dayWord = (t: number): string => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
export const dayWordYear = (t: number): string => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/** A line is the client's when it names them (Workspace.clientName); with no client named anywhere, every line is. */
export function linesOfClient<T extends { clientName?: string }>(lines: readonly T[], client: string): T[] {
  const c = client.trim().toLowerCase();
  if (!c) return [...lines];
  return lines.filter(w => (w.clientName ?? '').trim().toLowerCase() === c);
}

export interface SnapshotInputs {
  at: number;
  lines: readonly { id: string; name: string }[];
  wrong: readonly Omit<WrongRow, 'pounds'>[];
  actions: readonly ProjectAction[];
  proved: readonly ProvedFix[];
  studies: readonly ToolStudy[];
  today: string;
}

/** THE SNAPSHOT — the readers' figures, frozen. */
export function snapshotOf(i: SnapshotInputs): StorySnapshot {
  const names = new Set(i.lines.map(l => l.name));
  const ids = new Set(i.lines.map(l => l.id));
  const wrong = wrongOf(i.wrong.filter(r => names.has(r.line)), Number.MAX_SAFE_INTEGER);
  const doing = doingOf(i.actions, i.today, 12);
  const who = whoOf(i.actions);
  const provedHere = i.proved.filter(p => ids.has(p.lineId));
  const byTool = new Map<string, { label: string; n: number }>();
  for (const s of i.studies) {
    if (s.deletedAt || s.tool === 'story' || !s.workspaceId || !ids.has(s.workspaceId)) continue;
    const label = studyTitle({ tool: s.tool, name: '', agreed: s.agreed }).split(' — ')[0].trim() || s.tool;
    const k = `${s.tool}:${label}`;
    byTool.set(k, { label, n: (byTool.get(k)?.n ?? 0) + 1 });
  }
  return {
    at: i.at,
    lines: i.lines.length,
    found: { open: wrong.open, critical: wrong.critical, late: wrong.late, priced: wrong.priced, ...(wrong.costDay != null ? { costDay: wrong.costDay } : {}) },
    fixing: { open: doing.open, late: doing.late, nobody: who.nobody },
    proved: provedHere.length,
    findings: wrong.top.map(r => ({ id: r.id, what: r.what, line: r.line, priority: r.priority, late: r.late, ...(r.owner ? { owner: r.owner } : {}), ...(r.cost?.machine ? { machine: r.cost.machine } : {}), ...(r.pounds != null ? { poundsDay: r.pounds } : {}), ...(r.cost?.words ? { words: r.cost.words } : {}) })),
    actions: doing.top.map(a => ({ what: a.what, who: a.who, ...(a.due ? { due: a.due } : {}), late: a.late, ...(a.where ? { where: a.where } : {}), kind: a.kind })),
    provedFixes: provedHere.map(p => ({ id: p.id, what: p.what, machine: p.machine, line: p.lineName, proof: p.proof })),
    toolsUsed: [...byTool.entries()].map(([k, v]) => ({ tool: k.split(':')[0], label: v.label, n: v.n })).sort((a, b) => b.n - a.n || a.label.localeCompare(b.label)),
  };
}

/** WHAT HAS CHANGED since the chapter before — by the records' ids; with no chapter before, everything is new. */
export function sinceOf(now: StorySnapshot, prev: StorySnapshot | undefined): StorySince {
  if (!prev) return { newFindings: now.findings, closed: 0, newProved: now.provedFixes, newTools: now.toolsUsed.reduce((n, t) => n + t.n, 0) };
  const had = new Set(prev.findings.map(f => f.id)), have = new Set(now.findings.map(f => f.id));
  const hadProved = new Set(prev.provedFixes.map(p => p.id));
  const toolsBefore = prev.toolsUsed.reduce((n, t) => n + t.n, 0), toolsNow = now.toolsUsed.reduce((n, t) => n + t.n, 0);
  return {
    from: prev.at,
    newFindings: now.findings.filter(f => !had.has(f.id)),
    closed: prev.findings.filter(f => !have.has(f.id)).length,
    newProved: now.provedFixes.filter(p => !hadProved.has(p.id)),
    newTools: Math.max(0, toolsNow - toolsBefore),
    ...(prev.found.costDay != null ? { costDayBefore: prev.found.costDay } : {}),
  };
}

/** The sentence under the story's name — the four questions in a line, as the Factory page says them. */
export function storySentence(s: StorySnapshot): string {
  return sentenceOf(s.lines, { open: s.found.open, critical: s.found.critical, late: s.found.late, priced: s.found.priced, ...(s.found.costDay != null ? { costDay: s.found.costDay } : {}), top: [] },
    { open: s.fixing.open, late: s.fixing.late, week: 0, nobody: s.fixing.nobody, top: [] }, { people: [], nobody: s.fixing.nobody }, { proved: s.provedFixes.map(p => ({ id: p.id, what: p.what, machine: p.machine, lineId: '', lineName: p.line, proof: p.proof })) });
}

/** What has changed since, in one line — the Story page's "Since the last update". */
export function sinceSentence(x: StorySince): string {
  if (!x.from) return `Everything is new: ${plural(x.newFindings.length, 'finding')}, ${plural(x.newProved.length, 'fix', 'fixes')} proved, ${plural(x.newTools, 'tool record')} used.`;
  const parts = [
    x.newFindings.length ? `${plural(x.newFindings.length, 'new finding')}` : '',
    x.closed ? `${x.closed} closed` : '',
    x.newProved.length ? `${plural(x.newProved.length, 'fix', 'fixes')} proved` : '',
    x.newTools ? `${x.newTools} tool ${x.newTools === 1 ? 'record' : 'records'} used` : '',
  ].filter(Boolean);
  return parts.length ? `Since ${dayWord(x.from)}: ${parts.join(' · ')}.` : `Nothing new since ${dayWord(x.from)}.`;
}

/** THE FOUR FIGURES, as the client reads them: found so far · the biggest loss · being fixed · proved. */
export function storyTiles(s: StorySnapshot): LeanTile[] {
  const top = s.findings[0];
  return [
    { k: 'Found so far', v: s.found.costDay != null ? `${fmtGBP(s.found.costDay)} a day` : String(s.found.open), of: s.found.costDay != null ? `${plural(s.found.open, 'problem')} open${s.found.priced < s.found.open ? ` · ${s.found.open - s.found.priced} not priced` : ''}` : `${plural(s.found.open, 'problem')} open — none priced yet`, tone: s.found.critical || s.found.late ? 'r' : s.found.open ? 'a' : 'g' },
    { k: 'Biggest loss', v: top ? (top.machine ?? top.line) : '—', of: top ? (top.poundsDay != null ? `${fmtGBP(top.poundsDay)} a day · ${top.what}` : top.what) : 'nothing open', tone: top ? (top.priority === 'critical' ? 'r' : 'n') : 'g' },
    { k: 'Being fixed', v: String(s.fixing.open), of: s.fixing.late ? `${plural(s.fixing.open, 'action')} · ${s.fixing.late} late` : s.fixing.nobody ? `${plural(s.fixing.open, 'action')} · ${s.fixing.nobody} with nobody yet` : `${plural(s.fixing.open, 'action')} · none late`, tone: s.fixing.late ? 'r' : s.fixing.nobody ? 'a' : 'n' },
    { k: 'Proved', v: String(s.proved), of: s.proved ? `${plural(s.proved, 'fix', 'fixes')} — before → after moved the right way` : 'no fix proved yet', tone: s.proved ? 'g' : 'n' },
  ];
}

/** A headline offered for the chapter — the biggest loss, else the four in a few words. He changes it as he likes. */
export function headlineOf(s: StorySnapshot, since: StorySince): string {
  const top = s.findings[0];
  if (since.newProved.length && !since.newFindings.length) return `${since.newProved[0].what} — proved`;
  if (top?.poundsDay != null) return `${top.what} — ${fmtGBP(top.poundsDay)} a day`;
  if (top) return top.what;
  if (s.proved) return `${plural(s.proved, 'fix', 'fixes')} proved, nothing open`;
  return 'Nothing open on the register';
}

/** THE NARRATIVE ASSEMBLED from the modules' own sentences — the chapter's words when the assistant is off, and the facts it is held
 *  to when it is on. Paragraphs: where we are · what is new · the biggest loss · what happens next · what is proved. */
export function assembledNarrative(brief: string, s: StorySnapshot, since: StorySince): string[] {
  const out: string[] = [];
  out.push(`${brief ? `${brief.replace(/[.?!]+$/, '')}. ` : ''}${storySentence(s)}`);
  if (since.from) {
    const bits = [
      since.newFindings.length ? `${plural(since.newFindings.length, 'new finding')}: ${since.newFindings.slice(0, 3).map(f => f.what).join('; ')}${since.newFindings.length > 3 ? ` and ${since.newFindings.length - 3} more` : ''}` : '',
      since.closed ? `${plural(since.closed, 'problem')} closed` : '',
      since.newProved.length ? `${plural(since.newProved.length, 'fix', 'fixes')} proved: ${since.newProved.map(p => p.what).join('; ')}` : '',
      since.costDayBefore != null && s.found.costDay != null && since.costDayBefore !== s.found.costDay ? `the open problems now cost ${fmtGBP(s.found.costDay)} a day, ${s.found.costDay < since.costDayBefore ? 'down' : 'up'} from ${fmtGBP(since.costDayBefore)}` : '',
    ].filter(Boolean);
    out.push(bits.length ? `Since ${dayWord(since.from)}: ${bits.join('; ')}.` : `Nothing has changed on the register since ${dayWord(since.from)}.`);
  }
  const top = s.findings[0];
  if (top) out.push(`The biggest loss is ${top.what} on ${top.line}${top.machine ? ` (${top.machine})` : ''}${top.words ? ` — ${top.words.replace(/[.]+$/, '')}` : top.poundsDay != null ? ` — ${fmtGBP(top.poundsDay)} a day` : ''}.${s.findings.length > 1 ? ` ${plural(s.findings.length - 1, 'other problem')} ${s.findings.length - 1 === 1 ? 'is' : 'are'} open behind it.` : ''}`);
  const late = s.actions.filter(a => a.late);
  if (s.actions.length) {
    const next = (late.length ? late : s.actions).slice(0, 3).map(a => `${a.what}${a.who ? ` (${a.who}${a.due ? `, ${a.late ? 'was due' : 'due'} ${dayWord(Date.parse(a.due))}` : ''})` : a.due ? ` (${a.late ? 'was due' : 'due'} ${dayWord(Date.parse(a.due))}, nobody yet)` : ' (nobody yet)'}`);
    out.push(`${late.length ? `${plural(late.length, 'action is', 'actions are')} late. ` : ''}Next: ${next.join('; ')}.`);
  }
  if (s.provedFixes.length) out.push(`Proved so far: ${s.provedFixes.map(p => `${p.what} on ${p.line} — ${p.proof}`).join('; ')}.`);
  return out;
}

/** A new chapter from a snapshot — the assembled draft, not yet approved. */
export function draftChapter(id: string, story: AgreedStory, chapters: readonly StoryChapter[], s: StorySnapshot): StoryChapter {
  const prev = chapters[chapters.length - 1];
  const since = sinceOf(s, prev?.snapshot);
  return { id, at: s.at, from: prev?.at ?? story.startedAt, headline: headlineOf(s, since), narrative: assembledNarrative(story.brief, s, since), snapshot: s, since, by: 'assembled' };
}

/** The story in a line — on its row and its band: "3 chapters since 20 October · last 4 Nov". */
export function storySays(story: AgreedStory, chapters: readonly StoryChapter[]): string {
  const approved = chapters.filter(c => c.approvedAt);
  const last = approved[approved.length - 1];
  return `${plural(approved.length, 'chapter')} since ${dayWordYear(story.startedAt)}${last ? ` · last ${dayWord(last.at)}` : ''}${story.closedAt ? ` · closed ${dayWord(story.closedAt)}` : ''}`;
}

/** Every figure in a text, as digits — "£2,900", "60", "4,820" → "2900", "60", "4820" — for the check against the snapshot (S3). */
export const figuresIn = (text: string): string[] => [...text.matchAll(/£?\d[\d,]*(?:\.\d+)?/g)].map(m => m[0].replace(/[£,]/g, ''));

/** The figures a snapshot holds, as digits, so a narrative's figures can be checked against them. */
export function snapshotFigures(s: StorySnapshot): Set<string> {
  const out = new Set<string>();
  const add = (v: number | undefined) => { if (v != null && Number.isFinite(v)) { out.add(String(Math.round(v))); out.add(v.toFixed(2).replace(/\.?0+$/, '')); out.add(String(v)); } };
  add(s.lines); add(s.found.open); add(s.found.critical); add(s.found.late); add(s.found.priced); add(s.found.costDay); add(s.fixing.open); add(s.fixing.late); add(s.fixing.nobody); add(s.proved);
  add(s.findings.length); add(s.actions.length); add(s.provedFixes.length);
  for (const f of s.findings) { add(f.poundsDay); for (const x of figuresIn(f.words ?? '')) out.add(x); for (const x of figuresIn(f.what)) out.add(x); }
  for (const p of s.provedFixes) for (const x of figuresIn(`${p.what} ${p.proof}`)) out.add(x);
  for (const a of s.actions) for (const x of figuresIn(a.what)) out.add(x);
  for (const t of s.toolsUsed) add(t.n);
  return out;
}

/** The figures in a narrative that the snapshot does not hold — to be marked "check this" beside them, never silently printed. */
export function unsureIn(narrative: readonly string[], s: StorySnapshot): string[] {
  const have = snapshotFigures(s);
  const seen = new Set<string>();
  for (const p of narrative) for (const f of figuresIn(p)) {
    /* a day of the month or a year is not a figure of the story */
    if (/^\d{1,2}$/.test(f) && Number(f) <= 31 && have.size && !have.has(f)) continue;
    if (/^(19|20)\d\d$/.test(f)) continue;
    if (!have.has(f) && !have.has(f.replace(/\.0+$/, ''))) seen.add(f);
  }
  return [...seen];
}
