/* AI MODE'S TIMERS — "remind me in twenty minutes to look at the wrapper again".
 *
 * The colleague's start_timer capability (src/capabilities) keeps a timer on this device in localStorage
 * ('faultline.timers') and says so by the 'faultline-timers' event. Here they are read back: a small countdown in AI
 * Mode's header while one runs, and when it ends a sound and a buzz where the device has them, and a line in the
 * conversation's header saying what it was for. Read defensively — a timer written by an older or newer build keeps its
 * label and its end, whatever else it carries. */
import { useEffect, useRef, useState } from 'react';
import { TIMERS_EVENT, TIMERS_KEY, type DeviceTimer } from '../capabilities/types';

export { TIMERS_EVENT, TIMERS_KEY, type DeviceTimer };

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() && Number.isFinite(Number(v)) ? Number(v) : undefined);

/** One timer as it was kept — its end from endsAt, else from when it started and its minutes. */
export function readTimer(x: unknown): DeviceTimer | undefined {
  const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
  const startedAt = num(o.startedAt) ?? num(o.at) ?? num(o.started);
  const minutes = num(o.minutes);
  const endsAt = num(o.endsAt) ?? num(o.ends) ?? num(o.until) ?? (startedAt !== undefined && minutes !== undefined ? startedAt + minutes * 60_000 : undefined);
  if (endsAt === undefined) return undefined;
  const id = typeof o.id === 'string' ? o.id : String(endsAt);
  const label = typeof o.label === 'string' && o.label.trim() ? o.label.trim() : 'A timer';
  return { id, label, endsAt };
}

export function readTimers(raw: string | null): DeviceTimer[] {
  try {
    const v = JSON.parse(raw ?? '[]') as unknown;
    const list = Array.isArray(v) ? v : v && typeof v === 'object' ? Object.values(v as Record<string, unknown>) : [];
    return list.flatMap(x => { const t = readTimer(x); return t ? [t] : []; }).sort((a, b) => a.endsAt - b.endsAt);
  } catch { return []; }
}

const load = (): DeviceTimer[] => { try { return readTimers(localStorage.getItem(TIMERS_KEY)); } catch { return []; } };

/** Take a timer off the device's list — it has ended, or the person dismissed it. */
export function dropTimer(id: string): void {
  try {
    const v = JSON.parse(localStorage.getItem(TIMERS_KEY) ?? '[]') as unknown;
    if (Array.isArray(v)) localStorage.setItem(TIMERS_KEY, JSON.stringify(v.filter(x => (readTimer(x)?.id ?? '') !== id)));
  } catch { /* nothing kept */ }
  window.dispatchEvent(new Event(TIMERS_EVENT));
}

/** "4:05" — minutes and seconds left; "1:02:00" past an hour. */
export function leftSaid(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
}

/** A short tone and a buzz — where the device lets a page make them. */
function ring(): void {
  try { (navigator as Navigator & { vibrate?: (p: number[]) => boolean }).vibrate?.([200, 100, 200]); } catch { /* no buzz */ }
  try {
    const AC = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ac = new AC();
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = 880; g.gain.value = 0.08;
    o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + 0.35);
    o.onended = () => { void ac.close().catch(() => undefined); };
  } catch { /* no sound */ }
}

/** The running timers with the time now, and the ones that have ended this visit (to be said once and dismissed). */
export function useTimers(): { running: DeviceTimer[]; ended: DeviceTimer[]; now: number; dismiss: (id: string) => void } {
  const [list, setList] = useState<DeviceTimer[]>(load);
  const [ended, setEnded] = useState<DeviceTimer[]>([]);
  const [t, setT] = useState(() => Date.now());
  const rung = useRef(new Set<string>());
  useEffect(() => {
    const read = () => setList(load());
    window.addEventListener(TIMERS_EVENT, read);
    window.addEventListener('storage', read);
    return () => { window.removeEventListener(TIMERS_EVENT, read); window.removeEventListener('storage', read); };
  }, []);
  useEffect(() => {
    if (!list.length) return;
    const h = window.setInterval(() => setT(Date.now()), 1000);
    return () => window.clearInterval(h);
  }, [list.length]);
  useEffect(() => {
    const done = list.filter(x => x.endsAt <= t && !rung.current.has(x.id));
    if (!done.length) return;
    for (const d of done) rung.current.add(d.id);
    ring();
    setEnded(e => [...e, ...done]);
    for (const d of done) dropTimer(d.id);
  }, [list, t]);
  return { running: list.filter(x => x.endsAt > t), ended, now: t, dismiss: id => setEnded(e => e.filter(x => x.id !== id)) };
}
