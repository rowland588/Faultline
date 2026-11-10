/* A department made or found (10 November, docs/FACTORY-WALK.md; lib/departments) — one record of its words, never a second. */
import type { ToolStudy } from '../lib/study';
import { departmentFor, departmentsOf, newDepartment, type Department, type DepartmentFacts } from '../lib/departments';
import { uid, now } from '../lib/ids';
import { listAllStudies, putStudy } from './studies';

export async function listDepartments(): Promise<Department[]> {
  return departmentsOf(await listAllStudies());
}

/** The department of these words — found when it is already a record, else made. Makes nothing else: no line, no machine. */
export async function addDepartment(input: { client?: string; site?: string; area: string }, known?: DepartmentFacts['known']): Promise<{ ok: true; id: string; made: boolean; facts: DepartmentFacts } | { ok: false; why: string }> {
  const n = newDepartment(input, known);
  if (!n.ok) return n;
  const had = departmentFor(await listDepartments(), { area: n.facts.area, ...(n.facts.site ? { site: n.facts.site } : {}), ...(n.facts.client ? { client: n.facts.client } : {}) });
  if (had) return { ok: true, id: had.id, made: false, facts: had.facts };
  const t = now();
  const s: ToolStudy = { id: uid(), tool: 'department', name: n.facts.area, facts: { department: n.facts } as unknown as ToolStudy['facts'], uses: [], startedAt: t, createdAt: t, updatedAt: t };
  await putStudy(s);
  return { ok: true, id: s.id, made: true, facts: n.facts };
}
