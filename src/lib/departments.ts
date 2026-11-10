/* A DEPARTMENT OF THE FACTORY — a record of its own (10 November, docs/FACTORY-WALK.md — Rowland: "A department should be a proper
 * record in the Factory Knowledge Model, even if it has no production lines, machines or equipment registered yet. For example,
 * Dispatch should exist as a department in its own right … Do not force the creation of child records.").
 *
 * It is a study record (tool 'department', supabase/DEPARTMENT.sql) — synced, kept and guarded like every other — whose words are the
 * same three the lines carry (client · site · area, docs/CONSULTANT.md K1). So an AREA of lib/areas is now the lines whose words say it
 * AND, when there is one, the department record of the same words: a department with no line is still an area, its page opens, and
 * the Lines tab lists it with "no lines yet". Nothing here makes a line, a machine or a child of any kind. Pure. */
import type { KnownFact } from '../types';
import type { ToolStudy } from './study';
import { areaKey, type AreaId } from './areas';

export interface DepartmentFacts {
  client?: string;
  site?: string;
  /** Its name, as the floor says it — "Dispatch". The same word as `areaName` on the lines in it. */
  area: string;
  /** How each word is known — reported in a conversation, from a document, or typed. */
  known?: Partial<Record<'client' | 'site' | 'area', KnownFact>>;
}

/** The department a study is, or none. */
export function departmentOf(s: Pick<ToolStudy, 'tool' | 'facts' | 'deletedAt'>): DepartmentFacts | undefined {
  if (s.tool !== 'department' || s.deletedAt) return undefined;
  const d = (s.facts as { department?: DepartmentFacts }).department;
  return d && typeof d.area === 'string' && d.area.trim() ? d : undefined;
}

/** The department's words as an area. `withClient` keeps its client (when the factory holds more than one). */
export function departmentArea(d: DepartmentFacts, withClient = true): AreaId {
  const client = d.client?.trim(), site = d.site?.trim();
  return { area: d.area.trim(), ...(withClient && client ? { client } : {}), ...(site ? { site } : {}) };
}

export interface Department { id: string; facts: DepartmentFacts; area: AreaId; at: number }

/** The departments among the studies, in name order. */
export function departmentsOf(studies: readonly ToolStudy[]): Department[] {
  const out: Department[] = [];
  for (const s of studies) {
    const d = departmentOf(s);
    if (d) out.push({ id: s.id, facts: d, area: departmentArea(d), at: s.createdAt });
  }
  return out.sort((a, b) => a.facts.area.localeCompare(b.facts.area) || a.id.localeCompare(b.id));
}

const low = (s: string | undefined) => (s ?? '').trim().toLowerCase();

/** The department of an area's words — its site and name the same (any case), its client when the area names one. */
export function departmentFor(list: readonly Department[], a: AreaId): Department | undefined {
  return list.find(d => low(d.facts.area) === low(a.area) && low(d.facts.site) === low(a.site) && (a.client === undefined || !d.facts.client || low(d.facts.client) === low(a.client)));
}

/** The departments with no line in them — the areas the lines do not already name. `areaKeys` are lib/areas areaKey of the areas the
 *  lines make (as areasOf gives them, with or without the client). */
export function departmentsWithoutLines(list: readonly Department[], areaKeys: ReadonlySet<string>, withClient: boolean): Department[] {
  return list.filter(d => !areaKeys.has(areaKey(departmentArea(d.facts, withClient))));
}

/** A new department's facts, its words trimmed; refused with a reason when it has no name. */
export function newDepartment(input: { client?: string; site?: string; area: string }, known?: DepartmentFacts['known']): { ok: true; facts: DepartmentFacts } | { ok: false; why: string } {
  const area = input.area.trim();
  if (!area) return { ok: false, why: 'A department needs its name — what the floor calls it, such as Dispatch.' };
  const client = input.client?.trim(), site = input.site?.trim();
  return { ok: true, facts: { area, ...(client ? { client } : {}), ...(site ? { site } : {}), ...(known ? { known } : {}) } };
}
