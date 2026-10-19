/* THE GATE CHECK, AS THE SERVER RUNS IT — what supabase/functions/gatecheck
 * calls, bundled with everything it imports by scripts/build-gatecheck.mjs
 * (lib/flow/__tests__/serverCheck.test.ts fails when the bundle in the repo is
 * not this source).
 *
 * It reads a project's rows as the database holds them and maps each with the
 * sync's own mapper (cloud/mappers), so the server reads a row exactly as a
 * device does; reads the tools a step points at with the tools' own modules
 * (lib/flow/toolRead readToolsFrom, the device's own composition); and reads
 * every pass with lib/flow/gateCheck. A reading is written only when it moved,
 * and the reading of a pass that is gone — reopened, or its project no longer
 * running a method — is taken off. Pure but for the `fetch` it is handed. */
import { MAPS } from '../../cloud/mappers';
import type { Project, Workspace, Observation } from '../../types';
import type { Asset } from '../testing';
import type { Snag } from '../../snag/types';
import type { ToolStudy } from '../study';
import type { Standard } from '../standard';
import type { FlowDefinition } from './definition';
import type { FlowRecord, GateCheck, Method } from './records';
import { readToolsFrom } from './toolRead';
import { asGateCheck, readPasses, sameReading, type CheckInputs } from './gateCheck';

export type Row = Record<string, unknown>;
/** Every row of `table` whose `column` is one of `values` — deleted ones too. */
export type Fetch = (table: string, column: string, values: readonly string[]) => Promise<Row[]>;

export interface ServerResult {
  /** gate_checks rows to write (insert or replace), as the table holds them. */
  write: Row[];
  /** How many passes were read, and how many the records do not bear out. */
  read: number;
  disagrees: number;
}

const many = async <T>(fetch: Fetch, table: string, column: string, values: readonly string[], kind: keyof typeof MAPS): Promise<T[]> =>
  values.length ? (await fetch(table, column, [...new Set(values)])).map(r => MAPS[kind].fromRow(r) as unknown as T) : [];

/** Read every pass on these projects again; say what to write. */
export async function checkProjects(projectIds: readonly string[], fetch: Fetch, now: number): Promise<ServerResult> {
  const ids = [...new Set(projectIds.filter(Boolean))];
  const out: ServerResult = { write: [], read: 0, disagrees: 0 };
  if (!ids.length) return out;
  const projects = await many<Project>(fetch, 'projects', 'id', ids, 'projects');
  const running = projects.flatMap(p => (!p.deletedAt && p.flow ? [{ p, flow: p.flow }] : []));
  const [methods, records, assets, snags, kept] = await Promise.all([
    many<Method>(fetch, 'methods', 'family_id', running.map(r => r.flow.familyId), 'methods'),
    many<FlowRecord>(fetch, 'flow_records', 'project_id', ids, 'flow_records'),
    many<Asset>(fetch, 'commission_assets', 'project_id', ids, 'commission_assets'),
    many<Snag>(fetch, 'snags', 'project_id', ids, 'snags'),
    many<GateCheck>(fetch, 'gate_checks', 'project_id', ids, 'gate_checks'),
  ]);

  /* the tools the steps point at: a study, or a product's line standard */
  const studyIds = records.filter(r => !r.deletedAt && r.studyId).map(r => r.studyId as string);
  const studies = await many<ToolStudy>(fetch, 'studies', 'id', studyIds, 'studies');
  const found = new Set(studies.map(s => s.id));
  const standards = await many<Standard>(fetch, 'standards', 'id', studyIds.filter(id => !found.has(id)), 'standards');
  const lossLines = studies.filter(s => s.tool === 'losses' && s.workspaceId).map(s => s.workspaceId as string);
  const [workspaces, observations] = await Promise.all([
    many<Workspace>(fetch, 'workspaces', 'id', [...lossLines, ...standards.map(s => s.workspaceId).filter((x): x is string => !!x)], 'workspaces'),
    many<Observation>(fetch, 'observations', 'workspace_id', lossLines, 'observations'),
  ]);
  const tools = readToolsFrom(studyIds, { studies, standards, workspaces, observations });
  const toolsChanged = Object.fromEntries([...studies, ...standards].map(s => [s.id, s.updatedAt]));

  const readings = new Map<string, GateCheck>();
  for (const { p, flow } of running) {
    const family = methods.filter(m => m.familyId === flow.familyId && !m.deletedAt);
    const defs: Record<number, FlowDefinition> = Object.fromEntries(family.map(m => [m.version, m.definition]));
    const x: CheckInputs = {
      defs, current: flow.version,
      records: records.filter(r => r.projectId === p.id),
      machines: assets.filter(a => a.projectId === p.id && !a.deletedAt).sort((a, b) => a.sort - b.sort).map(a => ({ id: a.id, name: a.name, updatedAt: a.updatedAt })),
      problems: snags.filter(s => s.projectId === p.id).map(s => ({
        id: s.id, title: s.problem, open: s.status !== 'closed', priority: s.priority ?? 'low',
        raisedAt: s.raisedAt, ...(s.closedAt !== undefined ? { closedAt: s.closedAt } : {}),
        ...(s.deletedAt || s.archivedAt ? { goneAt: Math.min(s.deletedAt ?? Infinity, s.archivedAt ?? Infinity) } : {}),
      })),
      startedOn: flow.startedOn, people: flow.people, tools, toolsChanged,
    };
    for (const r of readPasses(x)) {
      out.read++;
      if (r.verdict === 'disagrees') out.disagrees++;
      readings.set(r.passId, asGateCheck(r, p.id, now, kept.find(k => k.id === r.passId)));
    }
  }

  for (const [id, c] of readings) {
    const was = kept.find(k => k.id === id);
    if (was && !was.deletedAt && sameReading(was, c)) continue;
    out.write.push(MAPS.gate_checks.toRow(c, ''));
  }
  /* a reading whose pass is gone is taken off — kept as a row, so every
     device hears it go */
  for (const k of kept) {
    if (k.deletedAt || readings.has(k.id)) continue;
    out.write.push(MAPS.gate_checks.toRow({ ...k, deletedAt: now, updatedAt: now }, ''));
  }
  return out;
}

/** The projects the hourly round reads again: a pass with no reading yet, or
 *  one the records did not bear out (a record may have reached the cloud late). */
export function toSweep(passes: readonly { id: string; project_id: string }[], checks: readonly { id: string; verdict: string; deleted_at?: number | null }[]): string[] {
  const by = new Map(checks.filter(c => !c.deleted_at).map(c => [c.id, c.verdict]));
  return [...new Set(passes.filter(p => by.get(p.id) === undefined || by.get(p.id) === 'disagrees').map(p => p.project_id))];
}
