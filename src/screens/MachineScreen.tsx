/* A PROJECT'S ADDRESS FOR A MACHINE — #/project/:id/machine/:assetId (docs/STAGEGATE-UX.md slice 3; one page since
 * 27 October).
 *
 * One machine has one page (line/LineMachineScreen) — and since the navigation batch of 27 October (Rowland: "our
 * biggest problem with this app currently is navigation"; he chose "all of it": a machine opened from a project stays in
 * the project) this address draws that same page inside the project: the project's tabs, Machines lit, "‹ Machines"
 * back to the project's machines, "on <its line> ›" to the line's frame. Until then it opened the line's page and the
 * project's tabs went with it. A machine on a project with no line yet has no line page: its project's part is drawn
 * here, as before. */
import { useTesting } from '../lib/useTesting';
import { live } from '../lib/testing';
import { nav } from '../state/useRoute';
import { useLineRecords } from '../lib/useLineRecords';
import { lineOfMachine } from '../lib/lineRecords';
import { MachineOffLine } from '../project/machines/MachineInProject';
import { LineMachineScreen } from '../line/LineMachineScreen';

/** Where a machine's page is on its line. */
export const lineMachineHref = (wsId: string, name: string): string => `/lines/${encodeURIComponent(wsId)}/machine/${encodeURIComponent(name.trim())}`;

export function MachineScreen({ projectId, assetId }: { projectId: string; assetId: string }) {
  const tt = useTesting(projectId);
  const rec = useLineRecords();
  const asset = tt.loading ? undefined : live(tt.assets).find(a => a.id === assetId);
  const lineId = asset && !rec.loading ? lineOfMachine(asset, rec.jobLines) : undefined;

  if (tt.loading || rec.loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  if (!asset) {
    return (
      <div className="wrap pace">
        <p className="sub" style={{ marginTop: 24 }}>That machine is not on this project any more.</p>
        <button type="button" className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => nav(`/project/${projectId}`)}>Back to the project</button>
      </div>
    );
  }
  if (lineId) return <LineMachineScreen key={`${projectId}:${asset.id}`} wsId={lineId} name={asset.name.trim()} inProject={projectId} />;
  return <MachineOffLine projectId={projectId} assetId={asset.id} name={asset.name} />;
}
