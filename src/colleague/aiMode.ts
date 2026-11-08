/* AI MODE, ON OR OFF — a switch on this device (the account menu's AI Mode row).
 *
 * On by default. Off, the top bar's Ask Faultline door is hidden and #/ai says AI Mode is off, with the way to turn it
 * on; Manual Mode — the app as built — is the same either way and never needs it. Kept in localStorage (one device's
 * preference, like the bell's name); every reader hears a change at once by the 'faultline-ai-mode' event. */
import { useEffect, useState } from 'react';

const KEY = 'faultline.aiMode';
const EVENT = 'faultline-ai-mode';

export function aiModeOn(): boolean {
  try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; }
}

export function setAiMode(on: boolean): void {
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* the page still follows the event */ }
  window.dispatchEvent(new Event(EVENT));
}

export function useAiMode(): boolean {
  const [on, setOn] = useState(aiModeOn);
  useEffect(() => {
    const read = () => setOn(aiModeOn());
    window.addEventListener(EVENT, read);
    window.addEventListener('storage', read);
    return () => { window.removeEventListener(EVENT, read); window.removeEventListener('storage', read); };
  }, []);
  return on;
}

/** A small device setting of AI Mode's (Speak replies, Conversation) — on or off, kept on this device. */
export function useDeviceFlag(key: string, start = false): [boolean, (on: boolean) => void] {
  const read = () => { try { const v = localStorage.getItem(key); return v === null ? start : v === 'on'; } catch { return start; } };
  const [on, setOn] = useState(read);
  const set = (v: boolean) => { try { localStorage.setItem(key, v ? 'on' : 'off'); } catch { /* kept for this visit */ } setOn(v); };
  return [on, set];
}
