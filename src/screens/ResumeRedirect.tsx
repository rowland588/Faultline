import { useEffect } from 'react';
import { useWorkspace } from '../state/WorkspaceProvider';
import { navReplace } from '../state/useRoute';

/** #/w/:id → replay the saved route for this workspace, or land on Capture.
 *  This is the whole "come back where you were" step. */
export function ResumeRedirect() {
  const { workspace } = useWorkspace();
  useEffect(() => {
    const saved = workspace.lastRoute;
    const to = saved && saved.startsWith(`#/w/${workspace.id}/`) ? saved : `#/w/${workspace.id}/capture`;
    navReplace(to);
  }, [workspace]);
  return null;
}
