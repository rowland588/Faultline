/* A PLACE TO LOOK AT THE PARETO PANE ON ITS OWN — not routed, never in the
 * app. Until the fishbone page lays it out, a browser script loads the app
 * (so the session, the seeded data and the styles are all the real ones),
 * then imports this through the dev server and mounts the pane over the page
 * at a given width:
 *
 *   const m = await import('/src/dev/ParetoPanePreview.tsx');
 *   m.mount({ projectId, lineId, selectedId, width: 360 });
 *
 * Every bar's tap is logged on window.__ppOpened, so a script can read which
 * problem the page would have shown. */
import { createRoot, type Root } from 'react-dom/client';
import { useEffect, useState } from 'react';
import { ParetoPane } from '../ui/ParetoPane';
import { listCases, projectWorkspaceIds } from '../db';
import type { Case } from '../types';

declare global { interface Window { __ppOpened?: string[] } }

function Host({ projectId, lineId, selectedId, width }: { projectId: string; lineId?: string; selectedId?: string; width: number }) {
  const [sel, setSel] = useState<string | undefined>(selectedId);
  const [selected, setSelected] = useState<Case | undefined>();
  useEffect(() => {
    let alive = true;
    void (async () => {
      if (!sel) { setSelected(undefined); return; }
      const all = (await Promise.all((await projectWorkspaceIds(projectId)).map(id => listCases(id)))).flat();
      if (alive) setSelected(all.find(c => c.id === sel));
    })();
    return () => { alive = false; };
  }, [sel, projectId]);
  return (
    <div className="pp-preview" style={{ padding: 16 }}>
      <div style={{ width, maxWidth: '100%' }}>
        <ParetoPane projectId={projectId} lineId={lineId} selected={selected}
          onOpen={id => { (window.__ppOpened ??= []).push(id); setSel(id); }} />
      </div>
    </div>
  );
}

let root: Root | null = null;
export function mount(o: { projectId: string; lineId?: string; selectedId?: string; width?: number }): void {
  /* The app underneath is put out of sight (not unmounted — its session and
     stores stay live); sheets the pane opens portal in after it, on top. */
  for (const c of Array.from(document.body.children)) {
    if (c.id !== 'pp-preview-root' && c instanceof HTMLElement) c.style.display = 'none';
  }
  let el = document.getElementById('pp-preview-root');
  if (!el) el = document.body.appendChild(Object.assign(document.createElement('div'), { id: 'pp-preview-root' }));
  root?.unmount();
  root = createRoot(el);
  root.render(<Host projectId={o.projectId} lineId={o.lineId} selectedId={o.selectedId} width={o.width ?? 360} />);
}
