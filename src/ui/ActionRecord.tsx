import { IndependentActionSheet } from './IndependentActionSheet';
/** One action editor from the shared tracker or any source, including work on no project. */
import { useEffect, useState } from 'react';
import { listAllPaceTodos, loadPaceLines, type PaceLineRow, type PaceTodoRow } from '../db';
import { ActionSheet } from './ActionSheet';
import { DEFAULT_PROJECT_ID } from '../db/projects';
import { useMeasures } from '../lib/useMeasures';
import { headline } from '../lib/measures';
import { impactOfAction } from '../lib/impact';
let open: ((id: string) => void) | null = null;
export const openActionRecord = (id: string): void => open?.(id);
export function ActionRecordHost() {
  const [record, setRecord] = useState<{row:PaceTodoRow;lines:PaceLineRow[]} | null>(null);
  useEffect(() => {
    let live = true; let request = 0;
    open = id => { const n=++request; void listAllPaceTodos().then(async rows => {
      const found=rows.find(r=>r.id===id); if(!found) return;
      const row=found.projectId || found.standalone ? found : { ...found, projectId: DEFAULT_PROJECT_ID };
      const lines=row.projectId ? await loadPaceLines(row.projectId) : [];
      if(live && n===request) setRecord({row,lines});
    }); };
    return ()=>{live=false;open=null;};
  },[]);
  if(record?.row.standalone && !record.row.projectId)return <IndependentActionSheet key={record.row.id} row={record.row} onClose={()=>setRecord(null)} />;
  return record ? <ProjectRecord key={record.row.id} row={record.row} lines={record.lines} onClose={()=>setRecord(null)} /> : null;
}

function ProjectRecord({ row, lines, onClose }: { row: PaceTodoRow; lines: PaceLineRow[]; onClose: () => void }) {
  const { measures, readings } = useMeasures(row.projectId ?? DEFAULT_PROJECT_ID);
  const impact = impactOfAction(row, headline(measures), readings);
  return <ActionSheet editing={{ step: row, isNew: false }} lines={lines} impact={impact} onClose={onClose} />;
}
