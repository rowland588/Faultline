/* THE LINE REPORT — EVERYTHING ON THE LINE (23 October).
 *
 * Rowland: "I am at a production line. I do a capability test. I do a line
 * balance. I do capacity ... three different tools, but it's on the same line
 * ... I want to be able to provide an immersive combined report ... including
 * even programs"; "Machines live on production lines. Lines don't live on
 * machines ... everything comes under the line name"; "you should be able to
 * do a combined report as long as everything is associated to that line."
 *
 * So this reads everything that carries the line's name — its problems, its
 * programs, every tool used on it — and lays it out as one report. It is the
 * full version of the one-page line report (lib/lineLean, lib/lineReportPdf),
 * not a third kind of paper: the same tiles and closing line, then each
 * part in turn. A dual line (lib/lines dualOf — "2a 2b" made of Line 2a and
 * line 2b) is three parts: each line it is made of, then the dual line's own
 * work as "Both lines together"; a single line's report says only what is
 * on it. Nothing is worked out here that a tool does not already work out:
 * every sentence is the tool's own (lib/studyLinks studyLine, lib/lineWork,
 * lib/lineRecords), and the paper (lib/lineBundlePdf) prints each tool's
 * section with the blocks that tool's own paper prints, so the two can never
 * disagree. No AI: every figure is a formula's.
 *
 * Pure: records in, the report's shape out — the page (screens/
 * LineReportScreen) and the paper both read it. */
import type { Workspace } from '../../types';
import type { Snag } from '../../snag/types';
import type { Asset } from '../../lib/testing';
import type { Program } from '../../lib/programs';
import { isProved, standingOf, todayISO } from '../../lib/programs';
import type { Standard } from '../../tools/linestandard/standard';
import { hasMap, headcount, inCapacityTool } from '../../tools/linestandard/standard';
import type { ToolStudy, StudyTool } from '../../lib/study';
import { lineKit, machineKey, type JobLine, type LineKit } from '../../lib/lineRecords';
import { lineProblems, type LineProblems } from '../../lib/lineWork';
import type { SnagRow } from '../../lib/snagsReport';
import { studyLine, studyTitle, type StudyContext } from '../../lib/studyLinks';
import { capacitySays } from '../../lib/together';
import { byFloor } from '../../lib/lines';
import type { LeanAction, LeanTone } from '../../lib/lean';
import { APP_TOOLS } from '../../catalogue/registry';
import { niceDay } from '../../lib/weeks';

/** One thing that can go in: a study, a product's Line capacity or line standard. */
export interface BundleItem {
  /** `study:<id>` · `capacity:<standardId>` · `standard:<standardId>`. */
  key: string;
  /** The tool, as the rail names it — "Capability study", "Line capacity", "Line standard". */
  tool: string;
  /** Its own name — "Weight accuracy 400 g", "Maris Piper 2kg". */
  name: string;
  /** Its sentence, as its own list says it (lib/studyLinks studyLine; lib/together capacitySays). */
  says: string;
  tone: LeanTone;
  /** When it was last touched — the newest of a tool is in by default. */
  at: number;
  /** The machine it names, when it names one — joins it to the line's machine. */
  machine?: string;
  study?: ToolStudy;
  standard?: Standard;
}

/** One finding about one machine, from one record. */
export interface WhereFinding { from: string; says: string; tone: LeanTone }
/** Where on the line a finding points — a machine, and what every record says of it. */
export interface WhereRow { machine: string; findings: WhereFinding[] }

/** One line's part of the report — a line on its own, or one part of a dual line's. */
export interface LinePart {
  line: Workspace;
  /** "Line 2a" — or "Both lines together" for the dual line's own work. */
  title: string;
  kit: LineKit;
  problems: LineProblems;
  /** Every tool's records on it, newest first within a tool, the tools in the rail's order. */
  items: BundleItem[];
  where: WhereRow[];
  /** Who owes what by when — every open problem and every program to prove, the late first. */
  actions: LeanAction[];
}

export interface LineBundle {
  line: Workspace;
  /** A dual line's lines first, then its own as "Both lines together"; a single line is one part. */
  parts: LinePart[];
  /** `${part.line.id}` → a dual line's part is the whole; absent for a single line. */
  dual: boolean;
}

export interface BundleRecords {
  lines: readonly Workspace[];
  machines: readonly Asset[];
  programs: readonly Program[];
  jobLines: readonly JobLine[];
  snags: readonly Snag[];
  standards: readonly Standard[];
  studies: readonly ToolStudy[];
  jobName?: (id: string) => string | undefined;
  ctx?: StudyContext;
  today?: string;
  ref?: number;
}

const TOOL_LABEL: Record<string, string> = Object.fromEntries(APP_TOOLS.filter(t => t.reads).map(t => [t.reads as string, t.label]));
const toolLabel = (tool: StudyTool): string => TOOL_LABEL[tool] ?? tool;
/** The rail's order for the tools' sections — a study tool by its place among APP_TOOLS, capacity and the standard after. */
const toolRank = (tool: string): number => { const i = APP_TOOLS.findIndex(t => t.reads === tool); return i < 0 ? 99 : i; };

const toneOf = (t: string): LeanTone => (t === 'r' || t === 'a' || t === 'g' ? t : 'n');

/** EVERYTHING ON ONE LINE, as items — each study on it; each product's Line capacity and line standard. */
export function itemsOn(line: Pick<Workspace, 'id'>, r: Pick<BundleRecords, 'standards' | 'studies' | 'ctx'>): BundleItem[] {
  const out: BundleItem[] = [];
  for (const s of r.studies) {
    if (s.deletedAt || s.workspaceId !== line.id) continue;
    const l = studyLine(s, r.ctx);
    /* the tool's name once — the heading says "SMED — Finest Red 2kg → Express 1.25 kg · Bagger", never "SMED — SMED — …" */
    out.push({ key: `study:${s.id}`, tool: toolLabel(s.tool), name: `${s.name.trim() || studyTitle(s)}${s.machine ? ` · ${s.machine}` : ''}`, says: l.text, tone: toneOf(l.tone), at: s.updatedAt ?? s.startedAt, ...(s.machine ? { machine: s.machine } : {}), study: s });
  }
  for (const st of r.standards) {
    if (st.deletedAt || st.workspaceId !== line.id) continue;
    if (inCapacityTool(st)) {
      const c = capacitySays(st.capacity);
      out.push({ key: `capacity:${st.id}`, tool: 'Line capacity', name: st.product, says: c.text, tone: c.short ? 'r' : 'n', at: st.updatedAt, standard: st });
    }
    if (hasMap(st)) {
      const n = headcount(st);
      out.push({ key: `standard:${st.id}`, tool: 'Line standard', name: st.product, says: n ? `${n} ${n === 1 ? 'person' : 'people'} placed` : 'the board, nobody placed yet', tone: 'n', at: st.updatedAt, standard: st });
    }
  }
  return out.sort((a, b) => toolRank(a.study?.tool ?? (a.key.startsWith('capacity') ? 'zz-capacity' : 'zz-standard')) - toolRank(b.study?.tool ?? (b.key.startsWith('capacity') ? 'zz-capacity' : 'zz-standard')) || a.tool.localeCompare(b.tool) || b.at - a.at);
}

/** WHAT GOES IN BY DEFAULT — the newest record of each tool. */
export function defaultPicks(items: readonly BundleItem[]): Set<string> {
  const seen = new Set<string>(), picks = new Set<string>();
  for (const it of items) { if (seen.has(it.tool)) continue; seen.add(it.tool); picks.add(it.key); }
  return picks;
}

/** WHERE ON THE LINE — only the machines a finding points at: the problems
 *  naming it, the programs on it not yet proved, the studies of it. A finding
 *  about the whole line stays at the top; a machine nothing points at is left
 *  out. In the line's flow order, machines not on its list after. */
export function whereOnLine(kit: LineKit, problems: readonly SnagRow[], items: readonly BundleItem[], today = todayISO()): WhereRow[] {
  const rows = new Map<string, WhereRow>();
  const order: string[] = [];
  const at = (name: string): WhereRow => {
    const k = machineKey(name);
    let row = rows.get(k);
    if (!row) { row = { machine: name.trim(), findings: [] }; rows.set(k, row); order.push(k); }
    return row;
  };
  for (const m of kit.machines) { const k = machineKey(m.name); if (k && !rows.has(k)) { rows.set(k, { machine: m.name, findings: [] }); order.push(k); } }
  for (const p of problems) if (p.machine && machineKey(p.machine) !== 'whole line') at(p.machine).findings.push({ from: 'Problem', says: `${p.what} — ${p.word}${p.owner ? `, ${p.owner}` : ''}`, tone: p.late || p.priority === 'critical' ? 'r' : p.priority === 'high' ? 'a' : 'n' });
  for (const p of kit.programs) {
    if (isProved(p)) continue;
    const m = kit.machines.find(x => x.record?.id === p.assetId);
    if (!m) continue;
    const late = standingOf(p, today) === 'overdue';
    at(m.name).findings.push({ from: 'Program', says: `${p.what} not proved${p.testOn ? ` — ${late ? 'test was' : 'test'} ${niceDay(p.testOn)}` : ' — no test day'}`, tone: late ? 'r' : 'a' });
  }
  for (const it of items) if (it.machine && machineKey(it.machine) !== 'whole line') at(it.machine).findings.push({ from: it.tool, says: `${it.name}: ${it.says}`, tone: it.tone });
  return order.flatMap(k => { const r = rows.get(k); return r && r.findings.length > 0 ? [r] : []; });
}

/** WHERE ON THE LINE for what is ticked in — the report's page and its paper show the same machines,
 *  so a record left out of the report is left out of Where on the line as well. */
export function whereFor(part: LinePart, picks: ReadonlySet<string>, today = todayISO()): WhereRow[] {
  return whereOnLine(part.kit, part.problems.rows, part.items.filter(it => picks.has(it.key)), today);
}

/** EVERY RECORD OF THE TOOLS NAMED — what the line's Tools page asks for when tools are ticked there:
 *  all of their records are ticked in (not only the newest), the rest left out. */
export function picksForTools(b: LineBundle, labels: readonly string[]): Set<string> {
  const want = new Set(labels);
  return new Set(b.parts.flatMap(p => p.items.filter(it => want.has(it.tool)).map(it => it.key)));
}

/** WHO OWES WHAT BY WHEN — every open problem and every program to prove, the late first. */
export function actionsOn(kit: LineKit, problems: readonly SnagRow[], today = todayISO()): LeanAction[] {
  const out: LeanAction[] = [];
  for (const p of problems) out.push({ what: p.what, ...(p.owner ? { who: p.owner } : {}), ...(p.due ? { due: p.due } : {}), state: p.late ? 'Late' : p.status === 'in_progress' ? 'In hand' : 'Open', tone: p.late || p.priority === 'critical' ? 'r' : p.priority === 'high' ? 'a' : 'n', from: 'Problem' });
  for (const p of kit.programs) {
    if (isProved(p)) continue;
    const late = standingOf(p, today) === 'overdue';
    out.push({ what: `Prove program ${p.what}`, ...(p.from ? { who: p.from } : {}), ...(p.testOn ? { due: niceDay(p.testOn) } : {}), state: late ? 'Late' : p.testOn ? 'Booked' : 'No test day', tone: late ? 'r' : p.testOn ? 'n' : 'a', from: 'Programs' });
  }
  const rank = (a: LeanAction) => (a.tone === 'r' ? 0 : a.tone === 'a' ? 1 : 2);
  return out.sort((a, b) => rank(a) - rank(b));
}

function partFor(line: Workspace, title: string, r: BundleRecords): LinePart {
  const today = r.today ?? todayISO();
  const kit = lineKit(line, r.machines, r.programs, r.jobLines, today);
  const problems = lineProblems(r.snags, { id: line.id, name: line.name }, { ...(r.ref ? { ref: r.ref } : {}), ...(r.jobName ? { jobName: r.jobName } : {}), assetName: s => s.targetAsset?.trim() || undefined });
  const items = itemsOn(line, r);
  return { line, title, kit, problems, items, where: whereOnLine(kit, problems.rows, items, today), actions: actionsOn(kit, problems.rows, today) };
}

/** THE REPORT'S SHAPE for a line: one part; for a dual line, each line it is
 *  made of (floor order) then its own as "Both lines together". */
export function lineBundle(line: Workspace, r: BundleRecords): LineBundle {
  const made = (line.madeOf ?? []).map(id => r.lines.find(w => w.id === id && !w.archived)).filter((w): w is Workspace => !!w).sort(byFloor);
  if (!made.length) return { line, parts: [partFor(line, line.name, r)], dual: false };
  return { line, parts: [...made.map(w => partFor(w, w.name, r)), partFor(line, 'Both lines together', r)], dual: true };
}

/** What the report holds, in a line: "3 tools · 4 problems open · 2 programs to prove" — of every part. */
export function bundleSays(b: LineBundle, picks: ReadonlySet<string>): string {
  const tools = new Set<string>(), prog = { n: 0 }, prob = { n: 0 };
  for (const p of b.parts) {
    for (const it of p.items) if (picks.has(it.key)) tools.add(it.tool);
    prog.n += p.kit.programs.filter(x => !isProved(x)).length;
    prob.n += p.problems.open;
  }
  return [
    tools.size ? `${tools.size} tool${tools.size === 1 ? '' : 's'}` : 'no tool used yet',
    `${prob.n} problem${prob.n === 1 ? '' : 's'} open`,
    `${prog.n} program${prog.n === 1 ? '' : 's'} to prove`,
    ...(b.dual ? [`${b.parts.length - 1} lines and both together`] : []),
  ].join(' · ');
}
