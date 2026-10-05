/* ONE DOOR TO PAPER. Every project page lists everything printable here, with
 * one line each saying what it is — the client report, today's story, the line
 * standard, the evidence cards of each line's walk, and the spreadsheet of
 * everything. Each screen keeps its own PDF button for the thing it shows; this
 * is the index, so nobody has to know which page a document lives on. */
import { useEffect, useState } from 'react';
import type { Project } from '../types';
import { planModel } from '../lib/planModel';
import { usePaceLines } from '../lib/usePaceLines';
import { getPaceWorkspaceId } from '../db';
import { nav } from '../state/useRoute';
import { Sheet } from './Sheet';

function Door({ title, says, onClick }: { title: string; says: string; onClick: () => void }) {
  return (
    <button type="button" className="meet-report" onClick={onClick}>
      <b>{title}</b><small>{says}</small>
    </button>
  );
}

export function ReportsSheet({ project, onClose }: { project: Project; onClose: () => void }) {
  const stageGate = planModel(project) === 'commissioning';
  const tree = planModel(project) === 'tree';
  const { lines } = usePaceLines(project.id);
  const [walk, setWalk] = useState<string | null>(null);
  const [said, setSaid] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { void getPaceWorkspaceId(project.id).then(setWalk); }, [project.id]);
  const go = (to: string) => { onClose(); nav(to); };
  const spreadsheet = async () => {
    setBusy(true); setSaid('');
    try {
      const { exportEverything } = await import('../lib/exportAll');
      const r = await exportEverything();
      setSaid(r.how === 'downloaded' ? `Saved ${r.name}.` : `${r.name} is ready — send it from the bar below.`);
    } catch (e) { setSaid(`The spreadsheet could not be built — ${e instanceof Error ? e.message : 'try again'}.`); }
    finally { setBusy(false); }
  };
  const withWalk = lines.filter(l => l.workspaceId);
  return (
    <Sheet open onClose={onClose} title="On paper">
      <div className="meet-reports">
        {/* A lever tree job's report leads with the tree; the door said only
            what a 3P job's carries. */}
        <Door title="Client report" says={stageGate ? 'The job in the order it is run — the gates, the plan, the fixes, who owes what.'
          : tree ? 'The outcome and what has to be true for it, the numbers, the board, the walk.'
          /* A 6M job's report is the root cause story (lib/sixmReportPdf);
             the old 3P words were not what it prints. */
          : 'The gap, where the loss is, each problem’s fishbone and what is being done about it, the board by bone, the walk.'}
          onClick={() => go(stageGate ? `/project/${project.id}/report` : `/pace-report?project=${project.id}`)} />
        {!stageGate && lines.map(l => (
          <Door key={l.id} title={`Client report — ${l.name}`} says="The same report, for one line." onClick={() => go(`/pace-report?project=${project.id}&line=${l.id}`)} />
        ))}
        {/* What the method prints (lib/planModel: "the tree on one page") was
            the one printable thing this index did not list. */}
        {tree && <Door title="The lever tree" says="The tree on one page — print it from the tree itself." onClick={() => go(`/project/${project.id}/tree`)} />}
        {stageGate && <Door title="Today" says="The day's story — what got done, what was found, with the pictures — one page." onClick={() => go(`/project/${project.id}/day`)} />}
        {stageGate && <Door title="Line standard" says="Who stands where and what they do, one page per product." onClick={() => go(`/project/${project.id}/standard`)} />}
        {walk && <Door title="Evidence cards" says="One page per snag on the walk, with its picture." onClick={() => go(`/w/${walk}/snaglist`)} />}
        {withWalk.map(l => (
          <Door key={l.id} title={`Evidence cards — ${l.name}`} says="One page per snag on this line's walk, with its picture." onClick={() => go(`/w/${l.workspaceId}/snaglist`)} />
        ))}
        {withWalk.map(l => (
          <Door key={`r${l.id}`} title={`One-page report — ${l.name}`} says="The week on this line in one page — lost time, where it went, the snags needing a push." onClick={() => go(`/w/${l.workspaceId}/report`)} />
        ))}
        <Door title="Spreadsheet" says={busy ? 'Building…' : 'The start-up record of every project — machines, tests, fixes, materials, programs, line standard and walks — in one Excel file.'} onClick={() => { if (!busy) void spreadsheet(); }} />
        {said && <p className="sub" role="status">{said}</p>}
      </div>
    </Sheet>
  );
}
