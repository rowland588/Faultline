import { useMemo } from 'react';
import { useLineRecords } from '../lib/useLineRecords';
import { useClientScope } from '../lib/activeClient';
import { studyHref } from '../lib/studyLinks';
import { toolsHref } from '../lib/toolWorkspace';
import { APP_TOOLS } from '../catalogue/registry';
import { toolLabel } from '../catalogue/registry';
import { openOf } from '../screens/LineToolsScreen';
import { LineUseList, type SavedLineUse } from '../line/LineUseList';
import { isConversation } from '../colleague/conversation';
import { sixmsOf, sixmHref } from '../tools/sixm/sixmTool';

/** A view over saved records, not a second library or another copy of their data. */
export function SavedToolWork() {
  const rec = useLineRecords();
  const cs = useClientScope();
  const uses = useMemo(() => {
    const place = (r: { workspaceId?: string; projectId?: string }, machine?: string) => [cs.all ? cs.whose(r) : '', rec.all.find(w => w.id === r.workspaceId)?.name, machine].filter(Boolean).join(' · ') || 'Standalone';
    const studies: SavedLineUse[] = rec.studies.filter(s => !s.deletedAt && cs.record(s) && s.tool !== 'story' && !isConversation(s)).map(s => {
      const href = studyHref(s);
      const path = href.split('?')[0];
      const tool = s.tool === 'balance' ? APP_TOOLS.find(t => t.key === 'linework') : APP_TOOLS.filter(t => path === t.to || path.startsWith(`${t.to}/`)).sort((a, b) => b.to.length - a.to.length)[0];
      return { key: `study:${s.id}`, id: s.id, tool: tool?.label ?? toolLabel(s.tool), toolKey: tool?.key ?? s.tool, name: s.name, place: place(s, s.machine), product: s.product, href: toolsHref(href), at: s.updatedAt };
    });
    const standards: SavedLineUse[] = rec.standards.filter(s => cs.record(s)).flatMap(s => [
      ...(s.capacity ? [{ key: `capacity:${s.id}`, id: s.id, tool: 'Line capacity', toolKey: 'linebalance', name: s.product, place: place(s), href: toolsHref(openOf(s, 'balance')), at: s.updatedAt }] : []),
      ...(s.marks.length || !s.capacity ? [{ key: `standard:${s.id}`, id: s.id, tool: 'Line standard', toolKey: 'linestandard', name: s.product, place: place(s), href: toolsHref(openOf(s, 'map')), at: s.updatedAt }] : []),
    ]);
    const sixms: SavedLineUse[] = sixmsOf(rec.jobs).filter(p => cs.project(p.id)).map(p => {
      const workspaceId = rec.jobLines.find(l => l.projectId === p.id && l.workspaceId)?.workspaceId;
      return { key: `sixm:${p.id}`, id: p.id, tool: '6M', toolKey: 'sixm', name: p.name, place: place({ projectId: p.id, workspaceId }), href: toolsHref(sixmHref(p.id, { line: workspaceId })), at: p.updatedAt };
    });
    return [...studies, ...standards, ...sixms];
  }, [rec, cs]);
  if (rec.loading || !cs.ready) return <p role="status" className="sub">Loading saved work…</p>;
  return <section aria-label="Your saved tool work"><LineUseList uses={uses} searchable empty="No saved work yet. Choose a tool from the library to start." /></section>;
}
