/* AI MODE'S DOOR — Ask Luna (AI Mode), in the top bar on every page (the shared contract §3; 8 November).
 *
 * Not a line of the menu (nothing is added to the menu, docs/STRUCTURE.md): a button beside Problem. It carries where
 * you are — on a line it opens AI Mode on that line (#/ai?line=), in a project on that project (#/ai?project=), so the
 * conversation starts there; any record it names opens back in Manual Mode. Hidden while AI Mode is off (the account
 * menu's switch). */
import { deskWide, setLunaPanel, useLunaPanel } from './lunaPanel';
import type { Scope } from '../lib/scope';
import { Icon } from '../ui/Icon';
import { useAiMode } from './aiMode';

/** Where the door goes from a scope. */
export const aiHref = (scope: Scope): string =>
  scope.kind === 'line' ? `/ai?line=${encodeURIComponent(scope.wsId)}` : scope.kind === 'project' ? `/ai?project=${encodeURIComponent(scope.projectId)}` : '/ai';

/** THE DOOR OPENS LUNA BESIDE THE PAGE (docs/LUNA-WORKSPACE.md W2): pressed on any page it opens her panel there — the page stays the
 *  work — and pressed again puts her away; on #/ai she is the page already. */
export function AiDoor({ scope }: { scope: Scope }) {
  const on = useAiMode();
  const panel = useLunaPanel();
  if (!on) return null;
  const here = typeof window !== 'undefined' && /^#\/ai(\?|$)/.test(window.location.hash);
  const open = panel === 'open' || (panel === 'min' && deskWide());
  void scope;
  return (
    <button type="button" className={'ai-door' + (here || open ? ' is-on' : '')} aria-pressed={here ? undefined : open} data-ai-door
      onClick={() => { if (here) return; setLunaPanel(open ? 'closed' : 'open'); }} aria-label="Ask Luna" title={open ? 'Put Luna away' : 'Ask Luna — beside this page'}>
      <Icon name="spark" size={17} />
      <span className="ai-door-l">Ask Luna</span>
    </button>
  );
}
