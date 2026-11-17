import { IndependentActionSheet } from './IndependentActionSheet';
/** One action editor from the shared tracker or any source, including work on no project. */
import { useEffect, useState } from 'react';
import { listAllPaceTodos, loadPaceLines, type PaceLineRow, type PaceTodoRow } from '../db';
import { ActionSheet } from './ActionSheet';
let open: ((id: string) => void) | null = null;
export const openActionRecord = (id: string): void => open?.(id);
export function ActionRecordHost() {
  const [record, setRecord] = useState<{row:PaceTodoRow;lines:PaceLineRow[]} | null>(null);
  useEffect(() => {
    let live = true; let request = 0;
    open = id => { const n=++request; void listAllPaceTodos().then(async rows => {
      const row=rows.find(r=>r.id===id); if(!row) return;
      const lines=row.projectId ? await loadPaceLines(row.projectId) : [];
      if(live && n===request) setRecord({row,lines});
    }); };
    return ()=>{live=false;open=null;};
  },[]);
  if(record?.row.standalone && !record.row.projectId)return <IndependentActionSheet key={record.row.id} row={record.row} onClose={()=>setRecord(null)} />;
  return record ? <ActionSheet key={record.row.id} editing={{step:record.row,isNew:false}} lines={record.lines} onClose={()=>setRecord(null)} /> : null;
}
