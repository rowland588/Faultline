/* Luna's conversation shell and the links from conversations into Faultline. Operational pages keep their
 * own routes. The factory control room is the default destination when leaving a conversation with no scope. */
import type { CapRef } from '../capabilities/types';
import type { Route } from '../state/useRoute';

/** Is this route the Luna product shell — no factory rail or scope tabs (docs/DIRECTION.md 23 November)? */
export function isEnvRoute(r: Pick<Route, 'name' | 'query'>, aiOn: boolean): boolean {
  if (!aiOn) return false;
  if (r.name === 'ai' || r.name === 'aiPresent' || r.name === 'aiConversation' || r.name === 'aiUsage' || r.name === 'aiExam') return true;
  return r.name === 'home' && r.query.get('present') !== '1';
}

/** Calculated results live in their chat. Operational records have a real Faultline page. */
export function workDestination(ref: Pick<CapRef, 'kind'> & { href?: string }): 'conversation' | 'faultline' | undefined {
  if (ref.kind === 'result' || ref.kind === 'chart' || ref.kind === 'convreport') return 'conversation';
  if (ref.href?.startsWith('/') && !ref.href.startsWith('//')) return 'faultline';
}

export function faultlineReturn(scope?: { lineId?: string; projectId?: string }): string {
  if (scope?.lineId) return `/lines/${encodeURIComponent(scope.lineId)}`;
  if (scope?.projectId) return `/project/${encodeURIComponent(scope.projectId)}`;
  return '/room';
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
