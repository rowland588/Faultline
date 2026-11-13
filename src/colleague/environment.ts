/* THE ENVIRONMENT — Faultline with LUNA at its centre (11 November, docs/LUNAR-ENVIRONMENT.md — Rowland: "When I open Faultline … I should feel
 * as though I've entered an intelligent operational environment where LUNA is ready to work with me. Everything else is there,
 * incredibly powerful, but it sits behind her and comes into view when we need it.")
 *
 * With AI Mode on, the front of the app (#/) and #/ai are the environment: Luna's conversation, the work it brings into view beside it,
 * and one discreet way to everything else (Everything). With AI Mode off, #/ is the app as it was — the Story, or the consultant's home —
 * and nothing here changes it. Every other page keeps its address and its frame. */
import type { Route } from '../state/useRoute';

/** Is this route the environment — Luna at the centre, no menu around her? */
export function isEnvRoute(r: Pick<Route, 'name' | 'query'>, aiOn: boolean): boolean {
  return aiOn && (r.name === 'ai' || (r.name === 'home' && r.query.get('present') !== '1'));
}

/* ---- A page shown AS THE WORK beside Luna in the environment (Everything, a context row): the real page in the work pane */
const SHOW = 'lunar-show-work';
export const showInEnvironment = (href: string, label: string): void => { window.dispatchEvent(new CustomEvent(SHOW, { detail: { href, label } })); };
export const onShowInEnvironment = (f: (w: { href: string; label: string }) => void): (() => void) => {
  const h = (e: Event) => f((e as CustomEvent<{ href: string; label: string }>).detail);
  window.addEventListener(SHOW, h); return () => window.removeEventListener(SHOW, h);
};

/* ---- Everything, opened from anywhere (the environment's bar, ⌘. , a command) */
const OPEN = 'lunar-everything';
export const openEverything = (): void => { window.dispatchEvent(new Event(OPEN)); };
export const onEverything = (f: () => void): (() => void) => { window.addEventListener(OPEN, f); return () => window.removeEventListener(OPEN, f); };
