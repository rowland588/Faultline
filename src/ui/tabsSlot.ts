/* WHERE A SCOPE'S TABS SIT (minimal v2, 19 November — docs/design/minimal-v2: a page's tabs under its title, as Teams and Planner
 * draw them). The frame owns the tabs (ui/ScopeTabs, from the scope's own list); the page header offers a slot at its foot and the
 * frame draws the same tabs into it. A page with no header keeps them where the frame always drew them. Presentation only: the
 * tabs, their order, their words and what they open are unchanged. */
import { useSyncExternalStore } from 'react';

let slot: HTMLElement | null = null;
const listeners = new Set<() => void>();
const tell = () => listeners.forEach(l => l());

/** The page header's ref: the last header mounted holds the slot; leaving gives it back. */
export function tabsSlotRef(el: HTMLElement | null): void {
  if (el) { if (slot !== el) { slot = el; tell(); } return; }
  if (slot && !slot.isConnected) { slot = null; tell(); }
}

export function useTabsSlot(): HTMLElement | null {
  return useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, () => (slot && slot.isConnected ? slot : null), () => null);
}
