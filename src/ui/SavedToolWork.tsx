import { useMemo } from 'react';
import { useLineRecords } from '../lib/useLineRecords';
import { useClientScope } from '../lib/activeClient';
import { studyHref } from '../lib/studyLinks';
import { toolsHref } from '../lib/toolWorkspace';
import { APP_TOOLS } from '../catalogue/registry';
import { toolLabel } from '../catalogue/registry';
import { openOf } from '../screens/LineToolsScreen';
import { LineUseList, type SavedLineUse } from '../line/LineUseList';

/** A view over saved records, not a second library or another copy of their data. */
export function SavedToolWork() {
  const rec = useLineRecords();
  const cs = useClientScope();
  const uses = useMemo(() => {
    const place = (r: { workspaceId?: string; projectId?: string }, machine?: string) => [cs.all ? cs.whose(r) : '', rec.all.find(w => w.id === r.workspaceId)?.name, machine].filter(Boolean).join(' · ') || 'Standalone';
    const studies: SavedLineUse[] = rec.studies.filter(s => !s.deletedAt && cs.record(s) && s.tool !== 'story').map(s => {
      const href = studyHref(s);
      const tool = APP_TOOLS.find(t => t.to.split('?')[0].split('/')[1] === href.split('/')[1]);
      return { key: `study:${s.id}`, id: s.id, tool: tool?.label ?? toolLabel(s.tool), toolKey: tool?.key ?? s.tool, name: s.name, place: place(s, s.machine), product: s.product, href: toolsHref(href), at: s.updatedAt };
    });
    const standards: SavedLineUse[] = rec.standards.filter(s => cs.record(s)).flatMap(s => [
      ...(s.capacity ? [{ key: `capacity:${s.id}`, id: s.id, tool: 'Line capacity', toolKey: 'linebalance', name: s.product, place: place(s), href: toolsHref(openOf(s, 'balance')), at: s.updatedAt }] : []),
      ...(s.marks.length || !s.capacity ? [{ key: `standard:${s.id}`, id: s.id, tool: 'Line standard', toolKey: 'linestandard', name: s.product, place: place(s), href: toolsHref(openOf(s, 'map')), at: s.updatedAt }] : []),
    ]);
    return [...studies, ...standards];
  }, [rec, cs]);
  if (rec.loading || !cs.ready) return <p role="status" className="sub">Loading saved work…</p>;
  return <section aria-label="Your saved tool work"><LineUseList uses={uses} searchable empty="No saved work yet. Choose a tool from the library to start." /></section>;
}
