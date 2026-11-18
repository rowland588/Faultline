import { useEffect, useMemo } from 'react';
import { useLineRecords } from '../lib/useLineRecords';
import { setActiveClient, useClientScope } from '../lib/activeClient';
import { studyHref } from '../lib/studyLinks';
import { toolsHref } from '../lib/toolWorkspace';
import { APP_TOOLS } from '../catalogue/registry';
import { toolLabel } from '../catalogue/registry';
import { openOf } from '../screens/LineToolsScreen';
import { LineUseList, type SavedLineUse } from '../line/LineUseList';
import { isConversation } from '../colleague/conversation';
import {unfiledActions,unfiledCount,lunaSavedWork,hasNoLocation,isSavedWork,isUnfiledWork,workLocation,UNFILED_HREF} from '../lib/workLocation';
import {nav,useRoute} from '../state/useRoute';
import { sixmsOf, sixmHref } from '../tools/sixm/sixmTool';

/** A view over saved records, not a second library or another copy of their data. */
export function SavedToolWork() {
  const rec = useLineRecords();
  const cs = useClientScope();
  const unfiled=useRoute().query.get('place')==='unfiled';
  useEffect(()=>{if(unfiled)setActiveClient('');},[unfiled]);
  const uses = useMemo(() => {
    const place = (r: { workspaceId?: string; projectId?: string }, machine?: string) => [cs.all ? cs.whose(r) : '', r.workspaceId?workLocation(rec.all.find(w => w.id === r.workspaceId)).label:'', machine].filter(Boolean).join(' · ') || 'Standalone';
    const studies: SavedLineUse[] = rec.studies.filter(s => isSavedWork(s) && cs.record(s) && !isConversation(s) && (!unfiled || isUnfiledWork(s,rec.all))).map(s => {
      const href = studyHref(s);
      const path = href.split('?')[0];
      const tool = s.tool === 'balance' ? APP_TOOLS.find(t => t.key === 'linework') : APP_TOOLS.filter(t => path === t.to || path.startsWith(`${t.to}/`)).sort((a, b) => b.to.length - a.to.length)[0];
      return { key: `study:${s.id}`, id: s.id, tool: tool?.label ?? toolLabel(s.tool), toolKey: tool?.key ?? s.tool, name: s.name, place: place(s, s.machine), product: s.product, href: toolsHref(href), at: s.updatedAt };
    });
    const standards: SavedLineUse[] = rec.standards.filter(s => cs.record(s) && (!unfiled || hasNoLocation(s,rec.all))).flatMap(s => [
      ...(s.capacity ? [{ key: `capacity:${s.id}`, id: s.id, tool: 'Line capacity', toolKey: 'linebalance', name: s.product, place: place(s), href: toolsHref(openOf(s, 'balance')), at: s.updatedAt }] : []),
      ...(s.marks.length || !s.capacity ? [{ key: `standard:${s.id}`, id: s.id, tool: 'Line standard', toolKey: 'linestandard', name: s.product, place: place(s), href: toolsHref(openOf(s, 'map')), at: s.updatedAt }] : []),
    ]);
    const sixms: SavedLineUse[] = sixmsOf(rec.jobs).filter(p => !unfiled && cs.project(p.id)).map(p => {
      const workspaceId = rec.jobLines.find(l => l.projectId === p.id && l.workspaceId)?.workspaceId;
      return { key: `sixm:${p.id}`, id: p.id, tool: '6M', toolKey: 'sixm', name: p.name, place: place({ projectId: p.id, workspaceId }), href: toolsHref(sixmHref(p.id, { line: workspaceId })), at: p.updatedAt };
    });
    const luna=lunaSavedWork(rec.studies,rec.all).filter(r=>cs.record(r)&&(!unfiled||r.unfiled));
    const tasks=unfiled?unfiledActions(rec.actions).filter(a=>!cs.filtering||a.clientName===cs.client||(!a.clientName&&cs.record({}))):[];
    return [...studies, ...standards, ...sixms,...luna,...tasks];
  }, [rec, cs,unfiled]);
  if (rec.loading || !cs.ready) return <p role="status" className="sub">Loading saved work…</p>;
  const loose=unfiledCount(rec.studies,rec.all,rec.actions);
  return <section aria-label="Your saved tool work">
    {unfiled&&<h2>Unfiled work</h2>}
    <label className="field"><span className="field-label">Location</span><select className="text-input" aria-label="Saved work location" value={unfiled?'unfiled':'all'} onChange={e=>nav(e.target.value==='unfiled'?UNFILED_HREF:'/tools?view=saved')}><option value="all">All saved work</option><option value="unfiled">Unfiled work</option></select></label>
    {unfiled?<p className="sub">Saved before a location was chosen. Open an item to place it in an area or on a line.</p>:loose>0&&<p className="sub"><a className="cw-link" href={`#${UNFILED_HREF}`}>{loose} saved item{loose===1?'':'s'} {loose===1?'has':'have'} no location · Unfiled work ›</a></p>}
    <LineUseList uses={uses} searchable empty={unfiled?'No unfiled work in this client view. Choose All clients to see work that has no client yet.':'No saved work yet. Choose a tool from the library to start.'} />
  </section>;
}
