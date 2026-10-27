/* A PROJECT'S ADDRESS FOR A MACHINE — #/project/:id/machine/:assetId (docs/STAGEGATE-UX.md slice 3; one page since
 * 27 October).
 *
 * Rowland, 27 October, from Factory › Machines › Pick and place: "there's a small line. It says everything on line 2A,
 * every project works on it ... I then end up on a different machine 2A pick and place". One machine had two pages —
 * this project's and its line's. Now it has one, the line's (line/LineMachineScreen), and while this project works
 * on it the top of that page is this project's part (project/machines/MachineInProject): where it is up to, its four
 * gates, what is open, its tests, its programs, the machine itself. So this address opens the line's page, keeping
 * whatever the address asked for (?open= a record in the drawer), and the back button walks past it. A machine on a
 * project with no line yet has no line page to open: its project's part is drawn here, as before. */
import { useEffect } from 'react';
import { useTesting } from '../lib/useTesting';
import { live } from '../lib/testing';
import { nav, navReplace, useRoute } from '../state/useRoute';
import { useLineRecords } from '../lib/useLineRecords';
import { lineOfMachine } from '../lib/lineRecords';
import { MachineOffLine } from '../project/machines/MachineInProject';

/** Where a machine's one page is — its line's page for it, or none when it is on no line. */
export const lineMachineHref = (wsId: string, name: string): string => `/lines/${encodeURIComponent(wsId)}/machine/${encodeURIComponent(name.trim())}`;

export function MachineScreen({ projectId, assetId }: { projectId: string; assetId: string }) {
  const tt = useTesting(projectId);
  const rec = useLineRecords();
  const route = useRoute();
  const asset = tt.loading ? undefined : live(tt.assets).find(a => a.id === assetId);
  const lineId = asset && !rec.loading ? lineOfMachine(asset, rec.jobLines) : undefined;
  /* a record asked for in the drawer keeps its project once the address is the line's (ui/RecordDrawer's ?job=) */
  const q = new URLSearchParams(route.query);
  if (q.has('open') && !q.has('job')) q.set('job', projectId);
  const qs = q.toString();
  useEffect(() => {
    if (asset && lineId) navReplace(`${lineMachineHref(lineId, asset.name)}${qs ? `?${qs}` : ''}`);
  }, [asset, lineId, qs]);

  if (tt.loading || rec.loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  if (!asset) {
    return (
      <div className="wrap pace">
        <p className="sub" style={{ marginTop: 24 }}>That machine is not on this project any more.</p>
        <button type="button" className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => nav(`/project/${projectId}`)}>Back to the project</button>
      </div>
    );
  }
  if (lineId) return <div className="wrap pace"><p className="sub">Opening {asset.name}…</p></div>;
  return <MachineOffLine projectId={projectId} assetId={asset.id} name={asset.name} />;
}
