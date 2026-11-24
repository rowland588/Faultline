/* THE ENVIRONMENT — Faultline with LUNA at its centre (11 November, docs/LUNAR-ENVIRONMENT.md — Rowland: "When I open Faultline … I should feel
 * as though I've entered an intelligent operational environment where LUNA is ready to work with me. Everything else is there,
 * incredibly powerful, but it sits behind her and comes into view when we need it.")
 *
 * With AI Mode on, the front of the app (#/) and #/ai are the environment: Luna's conversation, the work it brings into view beside it,
 * and a thin bar (☰ the left drawer of chats, Projects and Library; Settings). Back to Faultline is in the drawer foot. Everything is in Settings and ⌘., not the first screen. With AI Mode off, #/ is
 * the app as it was — the Story, or the consultant's home — and nothing here changes it. Every other page keeps its address and its frame. */
import type { Route } from '../state/useRoute';

/** Is this route the Luna product shell — no factory rail or scope tabs (docs/DIRECTION.md 23 November)? */
export function isEnvRoute(r: Pick<Route, 'name' | 'query'>, aiOn: boolean): boolean {
  if (!aiOn) return false;
  if (r.name === 'ai' || r.name === 'aiPresent' || r.name === 'aiConversation' || r.name === 'aiUsage' || r.name === 'aiExam' || r.name === 'today') return true;
  return r.name === 'home' && r.query.get('present') !== '1';
}

/* ---- A page shown AS THE WORK beside Luna (kept for conversation-made charts/results; Everything destinations navigate instead) */
const SHOW = 'lunar-show-work';
export const showInEnvironment = (href: string, label: string): void => { window.dispatchEvent(new CustomEvent(SHOW, { detail: { href, label } })); };
export const onShowInEnvironment = (f: (w: { href: string; label: string }) => void): (() => void) => {
  const h = (e: Event) => f((e as CustomEvent<{ href: string; label: string }>).detail);
  window.addEventListener(SHOW, h); return () => window.removeEventListener(SHOW, h);
};

/* ---- Everything, opened from anywhere (⌘. , Settings, a command — not on the first screen, 24 November) */
const OPEN = 'lunar-everything';
export const openEverything = (): void => { window.dispatchEvent(new Event(OPEN)); };
export const onEverything = (f: () => void): (() => void) => { window.addEventListener(OPEN, f); return () => window.removeEventListener(OPEN, f); };

/* ---- Conversations, one click (24 November — ChatGPT ☰ left drawer; the env bar’s hamburger, never buried in ⋯) */
const CHATS = 'lunar-chats';
export const openChats = (): void => { window.dispatchEvent(new Event(CHATS)); };
export const onChats = (f: () => void): (() => void) => { window.addEventListener(CHATS, f); return () => window.removeEventListener(CHATS, f); };
