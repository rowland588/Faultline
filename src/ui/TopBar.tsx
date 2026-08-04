import { useState } from 'react';
import { useWorkspace } from '../state/WorkspaceProvider';
import { nav } from '../state/useRoute';
import { deleteWorkspace } from '../db';
import { Sheet, SheetRow } from './Sheet';
import { LogoMark } from './Logo';

/** The workspace's title bar. The name is the switcher handle; the menu holds
 *  the quieter destinations (log, settings) and the danger zone. */
export function TopBar() {
  const { workspace, observations } = useWorkspace();
  const [menu, setMenu] = useState(false);

  const remove = async () => {
    if (!window.confirm(`Delete "${workspace.name}" and everything in it? This cannot be undone.`)) return;
    await deleteWorkspace(workspace.id);
    nav('/');
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

      <Sheet open={menu} onClose={() => setMenu(false)} title={workspace.name}>
        <SheetRow label="All workspaces" hint="switch" onClick={() => nav('/')} />
        <SheetRow label="The log" hint={`${observations.length} logged`} onClick={() => nav(`/w/${workspace.id}/log`)} />
        <SheetRow label="Workspace settings" onClick={() => nav(`/w/${workspace.id}/settings`)} />
        <SheetRow label="Delete this workspace" danger onClick={remove} />
      </Sheet>
    </header>
  );
}
