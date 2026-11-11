/* LUNA BESIDE THE PAGE (10 November, docs/LUNA-WORKSPACE.md W2 — Rowland: "Luna becoming a persistent panel within the application, with
 * the actual working page alongside her"). Whether her panel is open beside the page, kept on this device like AI Mode's own switch:
 *   'closed'  the app as built — Manual Mode exactly as ever
 *   'open'    beside the page on a desk; over it as a sheet on a phone
 *   'min'     on a phone: the page in front, Luna one tap away in a bar at the foot (still answering, still listening) — set when she
 *             opens a record for the person to see; on a desk it reads as open.
 * Every reader hears a change at once ('faultline-luna-panel'). Pure but for localStorage and the event. */
import { useEffect, useState } from 'react';

export type PanelState = 'closed' | 'open' | 'min';
const KEY = 'faultline.lunaPanel';
const EVENT = 'faultline-luna-panel';

export function lunaPanel(): PanelState {
  try { const v = localStorage.getItem(KEY); return v === 'open' || v === 'min' ? v : 'closed'; } catch { return 'closed'; }
}
export function setLunaPanel(s: PanelState): void {
  try { localStorage.setItem(KEY, s); } catch { /* followed for this visit by the event */ }
  window.dispatchEvent(new Event(EVENT));
}
export function useLunaPanel(): PanelState {
  const [s, set] = useState(lunaPanel);
  useEffect(() => {
    const read = () => set(lunaPanel());
    window.addEventListener(EVENT, read);
    window.addEventListener('storage', read);
    return () => { window.removeEventListener(EVENT, read); window.removeEventListener('storage', read); };
  }, []);
  return s;
}
/** A desk wide enough for the page and Luna side by side. */
export const deskWide = (): boolean => typeof window !== 'undefined' && window.matchMedia('(min-width: 1100px)').matches;

/** Open Luna beside the page on a conversation (the case file's Continue with Luna): the panel opened, the conversation brought in by
 *  AI Mode's screen, which listens for it ('faultline-luna-open'). */
export const OPEN_EVENT = 'faultline-luna-open';
let pending: string | undefined;
/** The conversation asked for before Luna was alive — taken once by AI Mode's screen as it starts. */
export const takePendingOpen = (): string | undefined => { const p = pending; pending = undefined; return p; };
/** Read without taking — a start-up that may run twice reads it, then takes it once it has started. */
export const peekPendingOpen = (): string | undefined => pending;
export function openLunaOn(conversationId: string): void {
  pending = conversationId;
  setLunaPanel('open');
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: conversationId }));
}

/** Ask Luna something from another page (Today's box, 10 November, docs/LUNA-WORKSPACE.md W7): the panel opened and the words sent into
 *  the open conversation through its own Send — kept until the conversation is there to take them. */
export const SAY_EVENT = 'faultline-luna-say';
let pendingSay: string | undefined;
export const takePendingSay = (): string | undefined => { const p = pendingSay; pendingSay = undefined; return p; };
export function askLuna(words: string): void {
  const w = words.trim();
  if (!w) return;
  pendingSay = w;
  setLunaPanel('open');
  window.dispatchEvent(new Event(SAY_EVENT));
}

/** Talk to Luna from another page (Today's voice beside the box, 11 November): the panel opened and her voice conversation started in
 *  the open conversation — the voice bar at the foot of the page, the page kept (docs/VOICE.md, LUNA-WORKSPACE W6). */
export const VOICE_EVENT = 'faultline-luna-voice';
let pendingVoice = false;
export const takePendingVoice = (): boolean => { const p = pendingVoice; pendingVoice = false; return p; };
export function talkToLuna(): void {
  pendingVoice = true;
  setLunaPanel('open');
  window.dispatchEvent(new Event(VOICE_EVENT));
}
