/* AI MODE'S DOOR — Ask Luna (AI Mode), in the top bar on every page (the shared contract §3; 8 November).
 *
 * Not a line of the menu (nothing is added to the menu, docs/STRUCTURE.md): a button beside Problem. It carries where
 * you are — on a line it opens AI Mode on that line (#/ai?line=), in a project on that project (#/ai?project=), so the
 * conversation starts there; any record it names opens back in Manual Mode. Hidden while AI Mode is off (the account
 * menu's switch). */
import { nav } from '../state/useRoute';
import type { Scope } from '../lib/scope';
import { Icon } from '../ui/Icon';
import { useAiMode } from './aiMode';

/** Where the door goes from a scope. */
export const aiHref = (scope: Scope): string =>
  scope.kind === 'line' ? `/ai?line=${encodeURIComponent(scope.wsId)}` : scope.kind === 'project' ? `/ai?project=${encodeURIComponent(scope.projectId)}` : '/ai';

export function AiDoor({ scope }: { scope: Scope }) {
  const on = useAiMode();
  if (!on) return null;
  const here = typeof window !== 'undefined' && /^#\/ai(\?|$)/.test(window.location.hash);
  return (
    <button type="button" className={'ai-door' + (here ? ' is-on' : '')} onClick={() => nav(aiHref(scope))} aria-label="Ask Luna — Faultline’s AI colleague" title="Ask Luna — Faultline’s AI colleague">
      <Icon name="spark" size={17} />
      <span className="ai-door-l">Ask Luna</span>
    </button>
  );
}
