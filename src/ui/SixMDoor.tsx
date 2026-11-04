/* THE 6M DOOR — Rowland, 4 November: "6M is not just a project tool, it's just a tool ... just open the door".
 * The 6M tool (fishbone, five whys, countermeasure board) lives on a 6M record; this opens it in one tap from the
 * Tools gallery and from a line's Tools: the line's own 6M if it has one, else one made now on that line. Nothing is
 * asked first — the line, the problem and the causes are asked on its page, in order. */
import { useState } from 'react';
import { nav } from '../state/useRoute';
import { useProjects } from '../lib/useProjects';
import { addPaceLine, allPaceLines } from '../db';
import { kindOf } from '../project/projectKind';
import { lineKey } from '../lib/lines';

export function SixMDoor({ line, className }: { line?: { id: string; name: string }; className?: string }) {
  const { projects, create } = useProjects();
  const [busy, setBusy] = useState(false);
  const open = async (): Promise<void> => {
    setBusy(true);
    try {
      if (line) {
        const rows = await allPaceLines();
        const mine = projects.find(p => !p.archivedAt && kindOf(p) === 'sixm' && rows.some(r => r.projectId === p.id && r.workspaceId === line.id));
        if (mine) { nav(`/project/${mine.id}/fishbone`); return; }
      }
      const p = await create(line ? `${line.name} 6M` : '6M', undefined, 'board');
      if (line) await addPaceLine({ projectId: p.id, key: lineKey(line.name), name: line.name, workspaceId: line.id, sort: 1 });
      nav(`/project/${p.id}/fishbone`);
    } finally { setBusy(false); }
  };
  return (
    <button type="button" className={className ?? 'btn btn-p'} disabled={busy} data-sixm-door onClick={() => { void open(); }}>
      6M — fishbone, five whys, countermeasures
    </button>
  );
}
