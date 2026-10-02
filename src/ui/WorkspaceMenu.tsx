/* THE LINE'S QUIETER DESTINATIONS — one sheet, behind the "More" tab.
 *
 * A line's working screens used to carry a title bar of their own — the
 * workspace's name, a switcher caret, a people button — directly above the
 * breadcrumb that already said which line you were on. Two bars saying the
 * same thing, and the app's one way of knowing where you are was the second
 * of them. The bar is gone; what its menu held is here: the log, who is on it,
 * its settings, and the delete. The three floor modes stay on the tab bar, and
 * signing out and going Home are the account button's, as on every screen. */
import { useWorkspace } from '../state/WorkspaceProvider';
import { nav } from '../state/useRoute';
import { Sheet, SheetRow } from './Sheet';
import { cloudConfigured } from '../cloud/client';

export function WorkspaceMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { workspace, observations } = useWorkspace();
  const go = (to: string) => { onClose(); nav(to); };

  // Deleting a workspace is the most destructive tap in the app — it gets a
  // confirm AND an undo window. Nothing is actually deleted here: Home holds
  // the workspace in limbo for a few seconds and only then commits.
  const remove = () => {
    if (!window.confirm(`Delete "${workspace.name}" and everything in it?`)) return;
    onClose();
    sessionStorage.setItem('faultline-pending-delete', JSON.stringify({
      id: workspace.id, name: workspace.name, until: Date.now() + 8000,
    }));
    nav('/');
  };

  return (
    <Sheet open={open} onClose={onClose} title={workspace.name}>
      <SheetRow label="The log" hint={`${observations.length} logged`} onClick={() => go(`/w/${workspace.id}/log`)} />
      {cloudConfigured && <SheetRow label="People" hint="invite someone to this line" onClick={() => go(`/w/${workspace.id}/people`)} />}
      <SheetRow label="Settings" hint="the categories, the labour rate" onClick={() => go(`/w/${workspace.id}/settings`)} />
      <SheetRow label="Delete everything captured on this line" danger onClick={remove} />
    </Sheet>
  );
}
