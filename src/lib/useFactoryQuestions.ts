/* THE FOUR QUESTIONS, READ LIVE (lib/factoryQuestions; docs/LOOK.md §1) — the register's open problems on the
 * factory's live lines priced by each line's own cost model (lib/problemCost, the Problems page's reader), every
 * project's actions and every line's own problems (lib/useProjectActions useEveryAction — the control room's
 * Actions), and the fixes proved on the lines (tools/yokoten provedFixes). Read again when anything is written. */
import { useEffect, useMemo, useState } from 'react';
import type { Project, Workspace } from '../types';
import { allPaceLines, listAllPaceTodos, listAllSnags, listAllStandards, listAllStudies, onDataChange } from '../db';
import { neckOf } from './lineLoss';
import { problemCost } from './problemCost';
import { isOpenOnLine } from './lineWork';
import { useEveryAction } from './useProjectActions';
import { provedFixes } from '../tools/yokoten/yokoten';
import { fourQuestions, type FourQuestions, type WrongRow } from './factoryQuestions';
import { isOverdue } from '../snag/types';

interface Read { wrong: Omit<WrongRow, 'pounds'>[]; proved: ReturnType<typeof provedFixes> }

export function useFactoryQuestions(projects: Project[], lines: readonly Workspace[]): FourQuestions | null {
  const actions = useEveryAction(projects);
  const [read, setRead] = useState<Read | null>(null);
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
      setRead({ wrong, proved });
    });
    load();
    const off = onDataChange(() => { window.clearTimeout(t); t = window.setTimeout(load, 150); });
    return () => { on = false; window.clearTimeout(t); off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the lines by their cost facts
  }, [key]);
  return useMemo(() => (read && actions ? fourQuestions({ wrong: read.wrong, actions: actions.rows, proved: read.proved, lines: lines.length, today: actions.today }) : null), [read, actions, lines.length]);
}
