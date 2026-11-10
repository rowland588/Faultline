/* LUNA PERSISTS ACROSS THE APP (10 November, docs/LUNA-WORKSPACE.md W1 — Rowland: "Luna must genuinely persist across navigation. This
 * includes active conversations, responses in progress, pending proposals, unfinished investigations and voice interaction … We must not
 * simply preserve the visual chat panel while losing its underlying activity").
 *
 * AI Mode's screen (screens/AiModeScreen) holds the conversation's whole live state — the round being answered, the cards waiting for a
 * yes, the voice conversation, a measurement running, timers. Mounted as a page, leaving the page ended all of it. So it is mounted ONCE,
 * here, beside the router, the first time it is opened, and never unmounted while AI Mode is on: React renders it into one DOM node of
 * its own (a portal on a container that never changes), and that node is MOVED — never re-created — into wherever Luna is shown:
 *   the page slot (`<LunaSlot />`, what the router draws at #/ai), or
 *   a slot the frame offers beside a page (`<LunaSlot kind="panel" />`, docs/LUNA-WORKSPACE.md W2), or
 *   the parking place (out of sight) when no slot is on screen — still running, still answering, still listening where the browser lets it.
 * Moving a DOM node does not remount its React tree, so nothing in flight is lost. The address is the screen's only while it is shown
 * (AiModeScreen writes #/ai?c= only then).
 *
 * Closed — AI Mode switched off — the screen says so and holds nothing. Manual Mode never depends on any of this. */
import { createPortal } from 'react-dom';
import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { Route } from '../state/useRoute';

const AiModeScreen = lazy(() => import('../screens/AiModeScreen').then(m => ({ default: m.AiModeScreen })));

/* ------------------------------------------------------------------ the slots */
export type SlotKind = 'page' | 'panel';
interface Slot { el: HTMLElement; kind: SlotKind }
let slots: Slot[] = [];
const listeners = new Set<() => void>();
const emit = () => { for (const l of listeners) l(); };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
/** The slot Luna is shown in: the page when one is drawn, else a panel, else none (parked). */
const current = (): Slot | undefined => slots.find(s => s.kind === 'page') ?? slots.find(s => s.kind === 'panel');
export const useLunaSlot = (): SlotKind | undefined => useSyncExternalStore(subscribe, () => current()?.kind, () => undefined);

/** Where Luna is shown. Drawn by the router at #/ai (kind page), and by the frame beside a page (kind panel). */
export function LunaSlot({ kind = 'page', className }: { kind?: SlotKind; className?: string }) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    if (!el) return;
    const s: Slot = { el, kind };
    slots = [...slots, s];
    emit();
    return () => { slots = slots.filter(x => x !== s); emit(); };
  }, [el, kind]);
  return <div ref={setEl} className={className ?? (kind === 'page' ? 'luna-slot-page' : 'luna-slot-panel')} data-luna-slot={kind} />;
}

/* ------------------------------------------------------------------ the host */
/** Mounted once beside the router: AI Mode's screen, alive from its first opening, shown in the slot on screen. */
export function LunaHost({ route, on }: { route: Route; on: boolean }) {
  const kind = useLunaSlot();
  /* opened once, kept: the first time #/ai is visited (or a panel asks for it) */
  const [alive, setAlive] = useState(false);
  useEffect(() => { if (route.name === 'ai' || kind) setAlive(true); }, [route.name, kind]);
  useEffect(() => { if (!on) setAlive(false); }, [on]);
  /* the address the screen reads — the last one it was shown at, so a page elsewhere never changes its line, project or conversation */
  const [aiRoute, setAiRoute] = useState<Route | undefined>(route.name === 'ai' ? route : undefined);
  useEffect(() => { if (route.name === 'ai') setAiRoute(route); }, [route]);
  /* its one DOM node, made once and moved, never re-made */
  const node = useMemo(() => { const d = document.createElement('div'); d.className = 'luna-host'; d.setAttribute('data-luna-host', ''); return d; }, []);
  const parking = useMemo(() => { const d = document.createElement('div'); d.className = 'luna-parking'; d.setAttribute('aria-hidden', 'true'); d.setAttribute('data-luna-parked', ''); return d; }, []);
  useEffect(() => { document.body.appendChild(parking); return () => { parking.remove(); }; }, [parking]);
  useLayoutEffect(() => {
    const to = current()?.el ?? parking;
    if (node.parentElement !== to) to.appendChild(node);
    node.toggleAttribute('data-luna-shown', to !== parking);
  });
  if (!alive || !on) return null;
  return createPortal(<Suspense fallback={null}><AiModeScreen route={aiRoute ?? route} shown={!!kind} slot={kind} /></Suspense>, node);
}
