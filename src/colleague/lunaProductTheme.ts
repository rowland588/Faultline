/* LUNA PRODUCT LOOK (23 November, docs/LUNA-LOOK.md) — Sunrise morning sky, large orb and glass bar only on Luna env routes
 * with AI Mode on. Manual Faultline and Luna’s panel beside a page stay minimal v2 — no data-luna-product on the document. */
import { useEffect } from 'react';
import type { Route } from '../state/useRoute';
import { parseRoute } from '../state/useRoute';
import { aiModeOn } from './aiMode';
import { isEnvRoute } from './environment';

const ATTR = 'data-luna-product';

export function lunaProductThemeOn(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.getAttribute(ATTR) === 'on';
}

export function setLunaProductTheme(on: boolean): void {
  if (typeof document === 'undefined') return;
  if (on) document.documentElement.setAttribute(ATTR, 'on');
  else document.documentElement.removeAttribute(ATTR);
  /* legacy: nothing sets data-luna globally any more (workspace.css flattened Sunrise when it did). */
  document.documentElement.removeAttribute('data-luna');
}

/** Call from the router whenever the route or AI Mode changes. */
export function syncLunaProductTheme(route: Pick<Route, 'name' | 'query'>): void {
  setLunaProductTheme(aiModeOn() && isEnvRoute(route, true));
}

export function LunaProductTheme({ route }: { route: Route }) {
  useEffect(() => {
    const apply = () => syncLunaProductTheme(route);
    apply();
    const onHash = () => syncLunaProductTheme(parseRoute(window.location.hash.slice(1) || '/'));
    window.addEventListener('faultline-ai-mode', apply);
    window.addEventListener('hashchange', onHash);
    return () => {
      window.removeEventListener('faultline-ai-mode', apply);
      window.removeEventListener('hashchange', onHash);
      setLunaProductTheme(false);
    };
  }, [route]);
  return null;
}