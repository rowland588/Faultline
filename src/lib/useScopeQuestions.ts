/* THE FOUR QUESTIONS FOR AN AREA OR A LINE (15 November — agreed 14 November with Rowland: "the Factory's four answers shown for an
 * area and for a line — today they exist only for the whole factory"). The very reading the Factory's cards rest on
 * (lib/useFactoryRead, lib/factoryQuestions), given only the lines in view: their open problems priced by each line's own cost model,
 * the actions of the projects on those lines and the lines' own problems, and the fixes proved on them. So an area's figures are the
 * sum of its lines' and a factory's of its areas' — never a second count (docs/STEADY.md, one number everywhere). Each card's door is
 * the answer on the same page (`#fq-wrong` …), or what the page names for it. */
import { useEffect, useMemo, useState } from 'react';
import type { Project, Workspace } from '../types';
import { allPaceLines, ensureProjects, onDataChange } from '../db';
import { projectsOnLines } from './useJobFloor';
import { loadFactoryParts, useFactoryRead } from './useFactoryRead';
import { everyActionOf, loadActionParts } from './useProjectActions';
import { loadJobInputs } from './useJobInputs';
import { todayISO } from './weeks';
import { fourQuestions, type FourQuestions, type Question } from './factoryQuestions';
import type { RegisterProblem } from './projectActions';

/** The projects on these lines, read once — by the rule every line page reads them (lib/useJobFloor projectsOnLines). */
export async function loadProjectsOn(ids: ReadonlySet<string>): Promise<Project[]> {
  const [ps, jl] = await Promise.all([ensureProjects(), allPaceLines()]);
  const live = new Set(ps.filter(p => !p.archivedAt && !p.deletedAt).map(p => p.id));
  const named = new Set(projectsOnLines([...ids], jl, id => live.has(id)));
  return ps.filter(p => named.has(p.id));
}

/** THE SAME FOUR ANSWERS READ ONCE, no hook — for Luna, a paper or a check that the page says what the records say. */
export async function loadScopeQuestions(lines: readonly Workspace[], today: string = todayISO()): Promise<FourQuestions> {
  const ids = new Set(lines.map(w => w.id));
  const projects = await loadProjectsOn(ids);
  const [parts, inputs, acts] = await Promise.all([loadFactoryParts(lines), loadJobInputs(projects), loadActionParts(projects)]);
  const read = everyActionOf(projects, inputs, acts.register.filter(r => !!r.workspaceId && ids.has(r.workspaceId)), acts.steps, today);
  return fourQuestions({ wrong: parts.wrong, actions: read.rows, proved: parts.proved, lines: lines.length, today: read.today });
}

export function useScopeQuestions(lines: readonly Workspace[] | null | undefined, to: Partial<Record<Question['key'], string>> = {}): FourQuestions | null {
  const list = useMemo(() => lines ?? [], [lines]);
  const key = list.map(w => w.id).join('|');
  const ids = useMemo(() => new Set(list.map(w => w.id)), [key]); // eslint-disable-line react-hooks/exhaustive-deps -- by the lines' ids
  const [projects, setProjects] = useState<Project[] | null>(null);
  useEffect(() => {
    let on = true;
    /* the projects on these lines by the rule every line page reads them (lib/useJobFloor projectsOnLines) */
    const load = () => void loadProjectsOn(ids).then(ps => { if (on) setProjects(ps); });
    load();
    const off = onDataChange(load);
    return () => { on = false; off(); };
  }, [ids]);
  const keep = useMemo(() => (r: RegisterProblem) => !!r.workspaceId && ids.has(r.workspaceId), [ids]);
  const read = useFactoryRead(projects ?? [], list, keep);
  const toKey = JSON.stringify(to);
  return useMemo(() => {
    if (!read || !projects || !lines) return null;
    const q = fourQuestions({ wrong: read.wrong, actions: read.actions, proved: read.proved, lines: list.length, today: read.today });
    const doors: Record<Question['key'], string> = { wrong: '#fq-wrong', doing: '#fq-doing', who: '#fq-doing', worked: '#fq-worked', ...to };
    return { ...q, cards: q.cards.map(c => ({ ...c, to: doors[c.key] })) };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the doors by their words
  }, [read, projects, lines, list.length, toKey]);
}
