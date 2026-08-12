import { useState } from 'react';
import { useWorkspace } from '../state/WorkspaceProvider';
import { nav } from '../state/useRoute';
import { Sheet, SheetRow } from './Sheet';
import { LogoMark } from './Logo';
import { cloudConfigured } from '../cloud/client';
import { useSession, signOut } from '../cloud/session';

/** The workspace's title bar. The name is the switcher handle; the menu holds
 *  the quieter destinations (log, settings), the account, and the danger zone. */
export function TopBar() {
  const { workspace, observations } = useWorkspace();
  const { session } = useSession();
  const [menu, setMenu] = useState(false);

  const go = (to: string) => { setMenu(false); nav(to); };
  // Deleting a workspace is the most destructive tap in the app — it gets a
  // confirm AND an undo window. Nothing is actually deleted here: Home holds
  // the workspace in limbo for a few seconds and only then commits.
  const remove = () => {
    if (!window.confirm(`Delete "${workspace.name}" and everything in it?`)) return;
    setMenu(false);
    sessionStorage.setItem('faultline-pending-delete', JSON.stringify({
      id: workspace.id, name: workspace.name, until: Date.now() + 8000,
    }));
    nav('/');
  };
  const logout = async () => {
    if (!window.confirm('Sign out of Faultline on this device? Your work is saved and will sync back when you sign in again.')) return;
    setMenu(false);
    await signOut(); // session clears → the app returns to the sign-in screen
  };

  return (
    <header className="topbar">
      <button className="brand-btn" onClick={() => nav('/')} aria-label="All workspaces (home)">
        <LogoMark size={22} />
      </button>
      <button className="ws-name" onClick={() => setMenu(true)}>
        <span className="ws-dot" style={{ background: workspace.color }} />
        <span className="ws-name-txt">{workspace.name}</span>
        <span className="ws-caret" aria-hidden>▾</span>
      </button>
      {cloudConfigured && (
        <button className="people-btn" onClick={() => nav(`/w/${workspace.id}/people`)}
          aria-label="People — invite someone to this workspace">
          👥
        </button>
      )}

      <Sheet open={menu} onClose={() => setMenu(false)} title={workspace.name}>
        <SheetRow label="Capture" hint="log what you see" onClick={() => go(`/w/${workspace.id}/capture`)} />
        <SheetRow label="Analyse" hint="the board" onClick={() => go(`/w/${workspace.id}/analyse`)} />
        <SheetRow label="Snag list" hint="video walk · pinned faults" onClick={() => go(`/w/${workspace.id}/snags`)} />
        <SheetRow label="The log" hint={`${observations.length} logged`} onClick={() => go(`/w/${workspace.id}/log`)} />
        {cloudConfigured && <SheetRow label="People" hint="invite someone to this workspace" onClick={() => go(`/w/${workspace.id}/people`)} />}
        <SheetRow label="Workspace settings" onClick={() => go(`/w/${workspace.id}/settings`)} />
        <SheetRow label="All workspaces" hint="switch" onClick={() => go('/')} />
        <SheetRow label="Delete this workspace" danger onClick={remove} />
        {cloudConfigured && session && (
          <SheetRow label="Sign out" hint={session.user.email ?? 'signed in'} onClick={logout} />
        )}
      </Sheet>
    </header>
  );
}
