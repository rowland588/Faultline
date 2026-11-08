/* THE FACTORY READ LIVE — the one reading the Factory page's four questions and the Story's snapshot both rest on (8 November,
 * docs/STORY.md): the register's open problems on the lines priced by each line's own cost model (lib/problemCost), every project's
 * actions and every line's own problems (lib/useProjectActions useEveryAction), the fixes proved on the lines (tools/yokoten
 * provedFixes), and every study, for the tools used. Read again when anything is written. One reader, so the two never disagree. */
import { useEffect, useState } from 'react';
import type { Project, Workspace } from '../types';
import type { Snag } from '../snag/types';
import { allPaceLines, listAllPaceTodos, listAllSnags, listAllStandards, listAllStudies, onDataChange } from '../db';
import { neckOf } from './lineLoss';
import { problemCost } from './problemCost';
import { isOpenOnLine } from './lineWork';
import { useEveryAction } from './useProjectActions';
import type { ProjectAction } from './projectActions';
import { provedFixes, type ProvedFix } from '../tools/yokoten/yokoten';
import type { WrongRow } from './factoryQuestions';
import type { ToolStudy } from './study';
import { isOverdue } from '../snag/types';

export interface FactoryRead {
  wrong: Omit<WrongRow, 'pounds'>[];
  proved: ProvedFix[];
  actions: ProjectAction[];
  today: string;
  studies: ToolStudy[];
  snags: Snag[];
}

export function useFactoryRead(projects: Project[], lines: readonly Workspace[]): FactoryRead | null {
  const actions = useEveryAction(projects);
  const [read, setRead] = useState<Omit<FactoryRead, 'actions' | 'today'> | null>(null);
  const key = lines.map(w => `${w.id}:${w.name}:${w.labourRatePerHour ?? ''}:${w.packsPerMin ?? ''}:${w.marginPerPack ?? ''}:${w.materialsPerPack ?? ''}:${w.crew ?? ''}`).join('|');
  useEffect(() => {
    let on = true; let t: number | undefined;
    const load = () => void Promise.all([listAllSnags(), listAllStandards(), allPaceLines(), listAllPaceTodos(), listAllStudies()]).then(([snags, standards, pl, todos, studies]) => {
      if (!on) return;
      const ref = Date.now();
      const wrong: Omit<WrongRow, 'pounds'>[] = [];
      for (const w of lines) {
        const neck = neckOf(standards, w.id);
        for (const s of snags) {
          if (!isOpenOnLine(s, w.id)) continue;
          const cost = problemCost(s, s.targetAsset, w, neck);
          wrong.push({ id: s.id, what: s.problem, line: w.name, priority: s.priority ?? 'low', late: isOverdue(s, ref), ...(s.owner ? { owner: s.owner } : {}), ...(cost ? { cost } : {}) });
        }
      }
      const proved = provedFixes(todos, pl, studies, lines.map(w => ({ id: w.id, name: w.name, machines: w.assets ?? [], ...(w.madeOf?.length ? { madeOf: w.madeOf } : {}) })));
      setRead({ wrong, proved, studies: studies.filter(s => !s.deletedAt), snags });
    });
    load();
    const off = onDataChange(() => { window.clearTimeout(t); t = window.setTimeout(load, 150); });
    return () => { on = false; window.clearTimeout(t); off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the lines by their cost facts
  }, [key]);
  return read && actions ? { ...read, actions: actions.rows, today: actions.today } : null;
}
