/* SET UP THIS LINE'S STUDY — one sheet, reached from where the work is.
 *
 * The line study had a Settings page and a People page behind a "More" tab,
 * a second way of getting around that the rest of the app does not have.
 * Everything they held is here — the name, who can see it, the cost of
 * downtime, the categories, the shifts, a starter vocabulary, and the delete —
 * opened from Capture ("Set up ›") or from the £ door on Analyse, on top of
 * whatever screen you are on. `?setup=1` on any line-study screen opens it, so
 * old links to /settings and /people still land here. */
import { useWorkspace } from '../state/WorkspaceProvider';
import { Sheet } from './Sheet';
import { WorkspaceSettings } from '../screens/WorkspaceSettings';

export function StudySetupSheet({ onClose }: { onClose: () => void }) {
  const { workspace } = useWorkspace();
  return (
    <Sheet open onClose={onClose} title={`Set up ${workspace.name}`}>
      <WorkspaceSettings bare />
    </Sheet>
  );
}
