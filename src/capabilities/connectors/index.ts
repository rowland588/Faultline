/* THE TOOL CONNECTORS — how the AI operates the tools Faultline already has (10 November, docs/AI-OPERATING.md).
 *
 * Rowland, 10 November: "don't build another collection of tools … Your proposed Describe, Fill, Capture, Read and Report connectors
 * are the right direction. Make this the standard architecture for the existing tools and future tools. When a new tool is added to
 * Faultline, it should be straightforward to expose its capabilities to AI without having to redesign the AI itself."
 *
 * ONE ENTRY A TOOL, keyed by its key in the catalogue's registry (src/catalogue/registry APP_TOOLS), saying which of the five parts it
 * has — and each part is the tool's OWN code, never a copy:
 *   Describe  read from the catalogue (its name, what it is for, what it needs and gives) — nothing written here
 *   Fill      a draft of the tool's own shape (src/capabilities/drafts: calc · doc · check · scored · smed), or a diagram said aloud
 *             (Line Talk's capture shapes, made into the tool's record by the same functions Line Talk's Make it uses — draw_diagram),
 *             or readings added to its record (add_readings)
 *   Capture   a live measurement adapter (./measure) — the same writes as the tool's capture screen
 *   Read      what the record says (lib/studyLinks studyLine — the tool's own sentence) and its data, its readings where it has them
 *   Report    the tool's own paper: made on arrival at its page (?save=1 — ui/StudyActs StudyBand, lib/useSaveOnArrival), or its page
 * A new tool is one entry here (and its catalogue entry): the colleague learns of it through tool_guide and describe_faultline, and its
 * parts are run by the same capabilities. The verbs a tool does not have are said, never claimed. */
import { APP_TOOLS, type AppTool } from '../../catalogue/registry';
import { ENTRIES } from '../../catalogue/index';
import type { ToolStudy, StudyReading } from '../../lib/study';
import { studyHref, studyLine, studyTitle } from '../../lib/studyLinks';
import { savingAt } from '../../lib/useSaveOnArrival';
import type { DraftKind } from '../types';
import { CAPTURE_ADAPTERS, type MeasureTool } from './measure';

/** The kinds of work a conversation can be — said apart, never one workflow for all (Rowland, 10 November: "It must distinguish
 *  between generating a report, conducting an investigation, using a calculator, carrying out a live measurement and analysing
 *  existing data"). */
export const INTENTS = {
  report: 'a report or document from what is known — the tools’ own papers, a project’s or a line’s report, or a document written from the conversation',
  fill: 'a structured study with an existing tool, filled in as the person talks',
  measure: 'a live measurement — the tool’s clock or taps, each event captured as it is said',
  calculate: 'a calculator run on figures the person gives',
  analyse: 'analysing data already in Faultline — a record’s readings, its findings, a statistical question',
  investigate: 'several tools combined into one investigation, in a project with a method, ending in its report',
} as const;
export type Intent = keyof typeof INTENTS;

export type Diagram = 'flow' | 'spag' | 'vs';
/** How a tool's paper is made: on arrival at its record's page (?save=1), on its own page only, or none. */
export type ReportWay = 'paper' | 'page' | 'none';

export interface ToolConnector {
  /** The tool's key in the registry — or 'stops' for Stops timed, the line's first log. */
  key: string;
  /** Does a record belong to this tool? */
  owns?: (s: ToolStudy) => boolean;
  fill?: { kind: DraftKind; keys?: readonly string[] };
  diagram?: Diagram;
  /** Readings can be added to its record and asked of (add_readings, run_analysis). */
  readings?: boolean;
  capture?: MeasureTool;
  report: ReportWay;
  /** The camera: the video study (docs/VIDEO.md) — its footage read by movement, its events named, reviewed, the line balance from them. */
  camera?: boolean;
  /** Said when a part is not there, so the colleague can tell the person how it is done by hand. */
  byHand?: string;
}

const calcOf = (key: string) => (s: ToolStudy): boolean => s.tool === 'calc' && s.agreed?.calc?.key === key;

/** THE TABLE — every tool a person can open, plus Stops timed. The parts listed are the parts built and proved. */
export const CONNECTORS: readonly ToolConnector[] = [
  { key: 'stops', capture: 'stops', report: 'none', byHand: 'Its Pareto and the loss count read the stops; the line report prints them.' },
  { key: 'linestandard', report: 'page', byHand: 'The board is drawn by hand on its page; its card is under Report ▾ there.' },
  { key: 'linework', owns: s => s.tool === 'balance' && !s.facts?.video, report: 'page', byHand: 'The people’s work is timed with the page’s own stopwatch; its paper is under Report ▾.' },
  { key: 'linebalance', report: 'page', byHand: 'Stations and speeds are set on the page; its paper is under Report ▾ there.' },
  { key: 'capability', owns: s => s.tool === 'capability', readings: true, report: 'paper' },
  { key: 'chart', owns: s => s.tool === 'chart', readings: true, report: 'paper' },
  { key: 'analysis', owns: s => s.tool === 'analysis', readings: true, report: 'paper' },
  { key: 'calc', owns: s => s.tool === 'calc', fill: { kind: 'calc' }, report: 'paper' },
  { key: 'doc', owns: s => s.tool === 'doc', fill: { kind: 'doc' }, report: 'paper' },
  { key: 'rsm', owns: s => s.tool === 'scored' && s.agreed?.scored?.key === 'rsm', report: 'paper', byHand: 'The runs are typed on its page.' },
  { key: 'valuestream', owns: s => s.tool === 'map', diagram: 'vs', report: 'paper' },
  { key: 'processflow', owns: calcOf('process-flow'), diagram: 'flow', fill: { kind: 'calc', keys: ['process-flow'] }, report: 'paper' },
  { key: 'spaghetti', owns: s => s.tool === 'calc' && (s.agreed?.calc?.key === 'spaghetti' || s.agreed?.calc?.key === 'spaghetti-walkers'), diagram: 'spag', fill: { kind: 'calc', keys: ['spaghetti', 'spaghetti-walkers'] }, report: 'paper' },
  { key: 'changeover', owns: s => s.tool === 'changeover', fill: { kind: 'smed' }, capture: 'changeover', report: 'paper' },
  { key: 'sampling', owns: s => s.tool === 'sampling', capture: 'sampling', report: 'paper' },
  { key: 'losses', owns: s => s.tool === 'losses', report: 'paper', byHand: 'A shift is counted on its page (the good packs, the breaks).' },
  { key: 'reliability', owns: s => s.tool === 'reliability', capture: 'reliability', report: 'paper' },
  { key: 'workstops', owns: calcOf('workstation-stops'), fill: { kind: 'calc', keys: ['workstation-stops'] }, capture: 'workstops', report: 'paper' },
  { key: 'video', owns: s => !!s.facts?.video, camera: true, report: 'page', byHand: 'Footage is filmed or uploaded and reviewed on the video study’s page; its report is there.' },
  { key: 'micro', owns: calcOf('micro-movements'), fill: { kind: 'calc', keys: ['micro-movements'] }, report: 'paper' },
  { key: 'talk', owns: s => s.tool === 'talk' && !(s.facts as { colleague?: boolean }).colleague, report: 'page', byHand: 'A document written in AI Mode is kept as a Line Talk; its PDF is on its page.' },
  { key: 'logs', owns: s => s.tool === 'log', fill: { kind: 'check' }, report: 'paper', byHand: 'The checks themselves are done on the log’s round.' },
  { key: 'criticality', owns: s => s.tool === 'scored' && s.agreed?.scored?.key === 'criticality', fill: { kind: 'scored', keys: ['criticality'] }, report: 'paper' },
  { key: 'impact-effort', owns: s => s.tool === 'scored' && s.agreed?.scored?.key === 'impact-effort', fill: { kind: 'scored', keys: ['impact-effort'] }, report: 'paper' },
  { key: 'pugh', owns: s => s.tool === 'scored' && s.agreed?.scored?.key === 'pugh', report: 'paper', byHand: 'The matrix is scored on its page.' },
  { key: 'fmea', owns: s => s.tool === 'scored' && s.agreed?.scored?.key === 'fmea', report: 'paper', byHand: 'Each failure mode is a card rated on its page.' },
  { key: 'control-plan', owns: s => s.tool === 'scored' && s.agreed?.scored?.key === 'control-plan', report: 'paper', byHand: 'The plan’s rows are typed on its page.' },
  { key: 'fault-tree', owns: s => s.tool === 'scored' && s.agreed?.scored?.key === 'fault-tree', report: 'paper', byHand: 'The tree is built on its page.' },
  { key: 'maintenance', owns: s => s.tool === 'board', report: 'paper', byHand: 'The month’s hours are typed on its page.' },
  { key: 'holds', report: 'paper', byHand: 'A hold is raised and decided on its page.' },
  { key: 'skills', owns: s => s.tool === 'scored' && s.agreed?.scored?.key === 'skills', report: 'paper', byHand: 'The matrix is filled on its page.' },
  { key: 'readiness', owns: s => s.tool === 'scored' && s.agreed?.scored?.key === 'readiness', report: 'paper', byHand: 'Each item is marked on its page.' },
  { key: 'problems', report: 'page' },
  { key: 'actions', report: 'page' },
];

export const connectorOf = (key: string): ToolConnector | undefined => CONNECTORS.find(c => c.key === key);
/** The connector whose tool a record is — the most specific first (a calculator that is a tool of its own before Calculators). */
export const connectorForStudy = (s: ToolStudy): ToolConnector | undefined => {
  const hits = CONNECTORS.filter(c => c.owns?.(s));
  return hits.find(c => c.key !== 'calc' && c.key !== 'linework') ?? hits[0];
};

/** The five parts a tool has, in words — never one it has not. */
export function partsOf(c: ToolConnector): string[] {
  return [
    'describe',
    ...(c.fill || c.diagram ? ['fill'] : []),
    ...(c.capture ? ['capture'] : []),
    'read',
    ...(c.report !== 'none' ? ['report'] : []),
  ];
}

/** What the colleague is told of a tool: the catalogue's words and the connector's parts, with what is done by hand. */
export interface ToolGuide {
  key: string; label: string; says: string; needs: string; gives: string; kind?: string; page?: string;
  parts: string[];
  fill?: string; capture?: { tool: MeasureTool; events: { event: string; says: string; needs?: string[] }[] }; readings?: boolean;
  report?: ReportWay; camera?: boolean; byHand?: string;
}
export function toolGuide(c: ToolConnector, t?: AppTool): ToolGuide {
  const app = t ?? APP_TOOLS.find(a => a.key === c.key);
  const e = app ? ENTRIES.find(x => x.id === app.id) : undefined;
  const cap = c.capture ? CAPTURE_ADAPTERS[c.capture] : undefined;
  return {
    key: c.key, label: app?.label ?? cap?.label ?? c.key, says: app?.says ?? cap?.says ?? '', needs: e?.inputs ?? '', gives: e?.outputs ?? '', ...(app ? { kind: app.kind, page: app.to } : {}),
    parts: partsOf(c),
    ...(c.fill ? { fill: `a ${c.fill.kind} draft${c.fill.keys ? ` (${c.fill.keys.join(', ')})` : ''} — start_draft, fill_draft, make_record` } : {}),
    ...(c.diagram ? { fill: `said aloud as a diagram — draw_diagram with set “${c.diagram}”` } : {}),
    ...(cap ? { capture: { tool: cap.tool, events: cap.events.map(x => ({ event: x.event, says: x.says, ...(x.needs ? { needs: x.needs as string[] } : {}) })) } } : {}),
    ...(c.readings ? { readings: true } : {}),
    report: c.report, ...(c.camera ? { camera: true } : {}), ...(c.byHand ? { byHand: c.byHand } : {}),
  };
}

/** Every tool's guide, in the floor's order, Stops timed first. */
export const allGuides = (): ToolGuide[] => CONNECTORS.map(c => toolGuide(c));

/* ------------------------------------------------------------------ Read */

const READINGS_SENT = 150;
/** A reading as the colleague is given it — its value(s) and where it sits, never more than it holds. */
const readingSaid = (r: StudyReading): Record<string, unknown> => ({
  ...(r.value !== undefined ? { value: r.value } : {}), ...(r.ok !== undefined ? { ok: r.ok } : {}), ...(r.made !== undefined ? { made: r.made } : {}),
  ...(r.rejected !== undefined ? { rejected: r.rejected } : {}), ...(r.arm ? { arm: r.arm } : {}), ...(r.with !== undefined ? { with: r.with } : {}),
  ...(r.group !== undefined ? { group: r.group } : {}), ...(r.product ? { product: r.product } : {}), ...(r.note ? { note: r.note } : {}),
});

export interface RecordRead {
  id: string; title: string; tool: string; href: string; says: string; tone: string;
  connector?: string; parts?: string[];
  lineId?: string; projectId?: string; machine?: string; product?: string;
  readings?: { n: number; struck: number; sent: number; list: Record<string, unknown>[] };
  remarks?: string[];
  report?: { way: ReportWay; href?: string };
}

/** READ — what a record says in its tool's own sentence, where it sits, and its data. Every figure is the tool's. */
export function readRecord(s: ToolStudy, ctx?: Parameters<typeof studyLine>[1]): RecordRead {
  const c = connectorForStudy(s);
  const line = studyLine(s, ctx);
  const rs = Array.isArray(s.facts?.readings) ? s.facts.readings as StudyReading[] : [];
  const live = rs.filter(r => !r.struck);
  const remarks = (s.facts?.remarks ?? []).filter(r => !r.struck).slice(-8).map(r => r.text);
  const href = studyHref(s);
  return {
    id: s.id, title: studyTitle(s), tool: s.tool, href, says: line.text, tone: line.tone,
    ...(c ? { connector: c.key, parts: partsOf(c) } : {}),
    ...(s.workspaceId ? { lineId: s.workspaceId } : {}), ...(s.projectId ? { projectId: s.projectId } : {}), ...(s.machine ? { machine: s.machine } : {}), ...(s.product ? { product: s.product } : {}),
    ...(rs.length ? { readings: { n: live.length, struck: rs.length - live.length, sent: Math.min(READINGS_SENT, live.length), list: live.slice(0, READINGS_SENT).map(readingSaid) } } : {}),
    ...(remarks.length ? { remarks } : {}),
    ...(c ? { report: { way: c.report, ...(c.report === 'paper' ? { href: savingAt(href) } : c.report === 'page' ? { href } : {}) } } : {}),
  };
}
