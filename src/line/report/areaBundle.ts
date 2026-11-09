/* THE AREA REPORT — EVERYTHING HAPPENING IN THE AREA (9 November — Rowland: "each area will have lines in them we need area reports
 * show everything happening in the area").
 *
 * An area is a group of the factory's lines (lib/areas — words on the lines, never a record). Its report is the line report's
 * parts laid one after another — each line of the area is read by lineBundle exactly as its own line report reads it, and a
 * dual line (lib/lines dualOf) is its lines and then "Both lines together", printed ONCE: a line that is part of a dual line in the
 * same area is not printed again on its own. Then "The area together": every open problem and everything owed across its lines,
 * the late first, each naming its line; the projects on its lines; the programs still to prove. Nothing is worked out here that a
 * line's own report does not already work out — the parts are lineBundle's, the rows are its actions' (problemAction,
 * programAction), the counts its readers'. No AI: every figure is a formula's.
 *
 * Pure: records in, the report's shape out — the area's page (src/line/area/AreaScreen), its report page (AreaReportScreen) and
 * its paper (areaBundlePdf) read it. */
import type { Workspace } from '../../types';
import type { LeanAction } from '../../lib/lean';
import { isProved, todayISO } from '../../lib/programs';
import { productionLines } from '../../lib/lines';
import { linesInArea, areaTitle, type AreaId, type AreaLineFacts } from '../../lib/areas';
import { owedActions } from '../../tools/checks/owed';
import { actionRank, lineBundle, problemAction, programAction, type BundleRecords, type LineBundle, type LinePart } from './lineBundle';

/** Four weeks — "used lately". */
export const LATELY_MS = 28 * 86_400_000;

/** One row of what needs doing in the area — a line's own action, naming its line, with where it opens. */
export interface AreaAction extends LeanAction {
  key: string;
  line: string;
  lineId: string;
  /** The address of its record: a problem on its line's Problems, opened; a program on its line's Programs; a check on its Logs. */
  to: string;
  kind: 'problem' | 'program' | 'check';
}

/** A project on the area's lines, and which of them. */
export interface AreaProject { id: string; name: string; lines: string[] }

export interface AreaBundle {
  area: AreaId;
  title: string;
  /** Whose lines — the area's client, else the one client its lines all name; absent when they name none or several. */
  client?: string;
  /** The lines of the area, in floor order. */
  lines: Workspace[];
  /** One a line printed on its own, or a dual line with its lines of the area — each as lineBundle reads it. */
  bundles: LineBundle[];
  /** Every part, in the order printed — each line of the area once. */
  parts: LinePart[];
  /** Each part's line as the area's sentence and tiles count it (lib/areas areaSays). */
  facts: AreaLineFacts[];
  /** Everything owed across its lines, the late first. */
  actions: AreaAction[];
  projects: AreaProject[];
}

export interface AreaRecords extends BundleRecords {
  /** The live projects on a line, by id and name. */
  projectsOn: (lineId: string) => readonly { id: string; name: string }[];
  now?: number;
}

const enc = encodeURIComponent;

/** THE AREA'S SHAPE — its lines (the production lines given, narrowed to the area), each printed once. */
export function areaBundle(area: AreaId, r: AreaRecords): AreaBundle {
  const today = r.today ?? todayISO();
  const now = r.now ?? r.ref ?? Date.now();
  const lines = linesInArea(productionLines(r.lines), area);
  const ids = new Set(lines.map(w => w.id));
  /* a line that a dual line of this area is made of is printed under the dual line, never again on its own */
  const underDual = new Set(lines.flatMap(w => (w.madeOf ?? []).filter(id => ids.has(id))));
  const bundles = lines.filter(w => !underDual.has(w.id)).map(w => {
    const b = lineBundle(w, r);
    return b.dual ? { ...b, parts: b.parts.filter(p => p.line.id === w.id || ids.has(p.line.id)) } : b;
  });
  const parts = bundles.flatMap(b => b.parts);

  const facts: AreaLineFacts[] = parts.map(p => {
    const top = p.problems.rows[0];
    return {
      name: p.line.name, open: p.problems.open, late: p.problems.late, critical: p.problems.critical,
      ...(top ? { worst: { what: top.what, red: top.priority === 'critical' || top.late } } : {}),
      programs: p.kit.programs.length, proved: p.kit.proved, programsLate: p.kit.late,
      projects: r.projectsOn(p.line.id).map(j => j.name),
      toolsLately: p.items.filter(it => now - it.at <= LATELY_MS).length,
    };
  });

  const actions: AreaAction[] = [];
  for (const p of parts) {
    const ws = p.line.id, line = p.line.name;
    const checks = owedActions(r.studies.filter(s => !s.deletedAt && s.workspaceId === ws), now);
    checks.forEach((a, i) => actions.push({ ...a, key: `check:${ws}:${i}`, line, lineId: ws, to: `/lines/${enc(ws)}?view=logs`, kind: 'check' }));
    for (const row of p.problems.rows) actions.push({ ...problemAction(row), key: `problem:${row.id}`, line, lineId: ws, to: `/snags?line=${enc(ws)}&open=${enc(row.id)}`, kind: 'problem' });
    for (const g of p.kit.programs) if (!isProved(g)) actions.push({ ...programAction(g, today), key: `program:${g.id}`, line, lineId: ws, to: `/programs?line=${enc(ws)}`, kind: 'program' });
  }
  /* the late first, then the amber, then the rest — each line's own order kept within (a stable sort) */
  actions.sort((a, b) => actionRank(a) - actionRank(b));

  const byProject = new Map<string, AreaProject>();
  for (const p of parts) for (const j of r.projectsOn(p.line.id)) {
    const got = byProject.get(j.id) ?? byProject.set(j.id, { id: j.id, name: j.name, lines: [] }).get(j.id) as AreaProject;
    if (!got.lines.includes(p.line.name)) got.lines.push(p.line.name);
  }

  const named = [...new Set(lines.map(w => w.clientName?.trim()).filter((c): c is string => !!c))];
  const client = area.client ?? (named.length === 1 && lines.every(w => w.clientName?.trim()) ? named[0] : undefined);
  return { area, title: areaTitle(area), ...(client ? { client } : {}), lines, bundles, parts, facts, actions, projects: [...byProject.values()] };
}

/** Each part's heading in the area — a line's own name; a dual line's own work "<dual> — both lines together". */
export function partName(b: LineBundle, p: LinePart): string {
  return b.dual && p.line.id === b.line.id ? `${b.line.name} — both lines together` : p.line.name;
}

/** The area's actions as the paper's rows of who owes what — each naming its line in "from". */
export function areaActionRows(a: AreaBundle): LeanAction[] {
  return a.actions.map(x => ({ what: x.what, ...(x.who ? { who: x.who } : {}), ...(x.due ? { due: x.due } : {}), state: x.state, tone: x.tone, from: `${x.line}${x.from ? ` · ${x.from}` : ''}` }));
}

/** What the report holds, in a line — "3 lines · 4 problems open · 2 programs to prove · 3 tools in". */
export function areaBundleSays(a: AreaBundle, picks: ReadonlySet<string>): string {
  const tools = a.parts.reduce((n, p) => n + p.items.filter(it => picks.has(it.key)).length, 0);
  const open = a.parts.reduce((n, p) => n + p.problems.open, 0);
  const toProve = a.parts.reduce((n, p) => n + p.kit.programs.filter(x => !isProved(x)).length, 0);
  return [
    `${a.lines.length} line${a.lines.length === 1 ? '' : 's'}`,
    `${open} problem${open === 1 ? '' : 's'} open`,
    `${toProve} program${toProve === 1 ? '' : 's'} to prove`,
    tools ? `${tools} tool record${tools === 1 ? '' : 's'} in` : 'no tool record ticked in',
  ].join(' · ');
}
