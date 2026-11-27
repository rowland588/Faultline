/* LUNA'S REMINDERS — "remind me tomorrow to look at the wrapper" (24 November 2026).
 *
 * The colleague's remind_me capability keeps a reminder on this device in localStorage
 * (`faultline.lunaReminders`) and says so by the `faultline-luna-reminders` event. AI Mode draws
 * them: upcoming as a line above the conversation, due as a note with OK. They are Luna's, on
 * her page — never a Faultline action, never a note on a problem, never an overnight G6 job.
 * Honest: they show when Luna is opened on or after the day; they do not fire while the app is shut. */
import { useEffect, useRef, useState } from 'react';
import { REMINDERS_EVENT, REMINDERS_KEY, type LunaReminder } from '../capabilities/types';
import { todayISO } from '../lib/weeks';

export { REMINDERS_EVENT, REMINDERS_KEY, type LunaReminder };

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

export function readReminder(x: unknown): LunaReminder | undefined {
  const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
  const due = str(o.due);
  const what = str(o.what);
  if (!due || !/^\d{4}-\d{2}-\d{2}$/.test(due) || !what) return undefined;
  const id = str(o.id) ?? due;
  const at = typeof o.at === 'number' && Number.isFinite(o.at) ? o.at : 0;
  const conversationId = str(o.conversationId);
  const ownerId = str(o.ownerId);
  return { id, what, due, at, ...(conversationId ? { conversationId } : {}), ...(ownerId ? { ownerId } : {}) };
}

export function readReminders(raw: string | null): LunaReminder[] {
  try {
    const v = JSON.parse(raw ?? '[]') as unknown;
    const list = Array.isArray(v) ? v : [];
    return list.flatMap(x => { const t = readReminder(x); return t ? [t] : []; }).sort((a, b) => a.due.localeCompare(b.due) || a.at - b.at);
  } catch { return []; }
}

const load = (): LunaReminder[] => { try { return readReminders(localStorage.getItem(REMINDERS_KEY)); } catch { return []; } };

/** Reminders belong to the signed-in person. Unsigned sessions only see unscoped (legacy) ones. */
export function remindersFor(list: LunaReminder[], ownerId?: string): LunaReminder[] {
  return ownerId ? list.filter(r => r.ownerId === ownerId) : list.filter(r => !r.ownerId);
}

/** Take a reminder off this device — the person dismissed it. */
export function dropReminder(id: string): void {
  try {
    const v = JSON.parse(localStorage.getItem(REMINDERS_KEY) ?? '[]') as unknown;
    if (Array.isArray(v)) localStorage.setItem(REMINDERS_KEY, JSON.stringify(v.filter(x => (readReminder(x)?.id ?? '') !== id)));
  } catch { /* nothing kept */ }
  try { window.dispatchEvent(new Event(REMINDERS_EVENT)); } catch { /* no window */ }
}

/** Upcoming (a later day) and due (today or past), with OK taking one off. */
export function useReminders(ownerId?: string): { upcoming: LunaReminder[]; due: LunaReminder[]; dismiss: (id: string) => void } {
  const [list, setList] = useState<LunaReminder[]>(() => remindersFor(load(), ownerId));
  const [today, setToday] = useState(() => todayISO());
  const rung = useRef(new Set<string>());
  useEffect(() => {
    const read = () => { setList(remindersFor(load(), ownerId)); setToday(todayISO()); };
    read();
    window.addEventListener(REMINDERS_EVENT, read);
    window.addEventListener('storage', read);
    document.addEventListener('visibilitychange', read);
    return () => {
      window.removeEventListener(REMINDERS_EVENT, read);
      window.removeEventListener('storage', read);
      document.removeEventListener('visibilitychange', read);
    };
  }, [ownerId]);
  useEffect(() => {
    const dueNow = list.filter(x => x.due <= today && !rung.current.has(x.id));
    if (!dueNow.length) return;
    for (const d of dueNow) rung.current.add(d.id);
    try { (navigator as Navigator & { vibrate?: (p: number[]) => boolean }).vibrate?.([200, 100, 200]); } catch { /* no buzz */ }
  }, [list, today]);
  return {
    upcoming: list.filter(x => x.due > today),
    due: list.filter(x => x.due <= today),
    dismiss: id => dropReminder(id),
  };
}
