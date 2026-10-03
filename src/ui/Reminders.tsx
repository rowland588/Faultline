/* REMINDERS — the three places a note's reminder speaks up. See lib/reminders.
 *
 *  · ReminderNotifier  — mounted once at the root: on the day, this device
 *    shows a notification for each reminder due (or gone), once a day each,
 *    while Faultline is open. When the app is closed the cloud does the same
 *    job (supabase/functions/remind → cloud/push.ts), to every device that
 *    has said yes; the notifier re-registers this one on every start. The
 *    cards below are the reminder that always works.
 *  · ReminderPermission — the one switch that lets this device do that.
 *  · ProjectReminders   — the card at the top of a project while one is due.
 */
import { useEffect, useState } from 'react';
import { listTestItems, onDataChange } from '../db';
import { useProjects } from '../lib/useProjects';
import { useTesting } from '../lib/useTesting';
import { dueNow, remindersOf, remindWords } from '../lib/reminders';
import { todayISO } from '../lib/weeks';
import { nav } from '../state/useRoute';
import { offerUndo } from './Undo';
import { pushRegistered, pushSupported, subscribePush } from '../cloud/push';

const SAID_KEY = 'faultline.reminded';
const supported = () => typeof window !== 'undefined' && 'Notification' in window;

/** The reminders already shown today, so one is never said twice in a day. */
function saidToday(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(SAID_KEY) ?? '{}') as { day?: string; ids?: string[] };
    return new Set(raw.day === todayISO() ? raw.ids ?? [] : []);
  } catch { return new Set(); }
}
function markSaid(ids: Set<string>) {
  try { localStorage.setItem(SAID_KEY, JSON.stringify({ day: todayISO(), ids: [...ids] })); } catch { /* fine */ }
}

async function show(title: string, body: string, url: string, tag: string) {
  try {
    const n = new Notification(title, { body, tag, icon: '/icon-192.png' });
    n.onclick = () => { window.focus(); nav(url); n.close(); };
  } catch {
    /* Android will not construct one from the page — it has to come from the
       service worker. Tapping it opens the app. */
    try { const reg = await navigator.serviceWorker?.ready; await reg?.showNotification(title, { body, tag, icon: '/icon-192.png' }); } catch { /* the cards still say it */ }
  }
}

export function ReminderNotifier() {
  const { projects } = useProjects();
  const ids = projects.map(p => p.id).join('|');
  useEffect(() => {
    if (!supported()) return;
    let live = true, timer: number | undefined;
    const check = async () => {
      if (Notification.permission !== 'granted') return;
      const said = saidToday();
      for (const p of projects) {
        const due = dueNow(remindersOf(await listTestItems(p.id), todayISO()));
        for (const r of due) {
          if (!live || said.has(r.id)) continue;
          said.add(r.id);
          void show(`Reminder · ${p.name}`, `${r.what}\n${remindWords(r)}`, `/project/${p.id}/notes`, `faultline-${r.id}`);
        }
      }
      markSaid(said);
    };
    void check();
    void subscribePush();   // keep this device reachable while the app is closed
    const every = window.setInterval(() => void check(), 15 * 60_000);
    const off = onDataChange(() => { window.clearTimeout(timer); timer = window.setTimeout(() => void check(), 1500); });
    return () => { live = false; window.clearInterval(every); window.clearTimeout(timer); off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `ids` is the projects
  }, [ids]);
  return null;
}

/** Whether this device will say a reminder out loud, and the switch to let it. */
export function ReminderPermission() {
  const [state, setState] = useState<NotificationPermission | 'none'>(() => (supported() ? Notification.permission : 'none'));
  // Whether the cloud can reach this device when the app is closed — true only
  // once the push address is registered, so the sentence is never ahead of it.
  const [reach, setReach] = useState<boolean | null>(null);
  useEffect(() => { if (state === 'granted') void pushRegistered().then(setReach); }, [state]);
  /* Dismissing the browser's question leaves the permission at "default": the
     button came back as if nothing had happened. Say it was not turned on. */
  const [asked, setAsked] = useState(false);
  const grant = async () => {
    const s = await Notification.requestPermission();
    setState(s); setAsked(true);
    if (s === 'granted') setReach(await subscribePush());
  };
  if (state === 'none') return <p className="sub nt-perm">This device cannot show notifications — reminders show on Home and on the project instead.</p>;
  if (state === 'granted') {
    return (
      <p className="sub nt-perm">
        {reach
          ? 'This device will notify you on the day, even when Faultline is closed. Reminders also show on Home and on the project.'
          : reach === false && pushSupported()
            ? <>This device will notify you on the day while Faultline is open. It could not be registered for reminders when the app is closed — {/iPhone|iPad/.test(navigator.userAgent) ? 'on an iPhone, add Faultline to the Home Screen first, then' : ''} <button type="button" className="cw-link" onClick={() => void subscribePush().then(setReach)}>try again</button>.</>
            : 'This device will notify you on the day, while Faultline is open. Reminders also show on Home and on the project.'}
      </p>
    );
  }
  if (state === 'denied') return <p className="sub nt-perm">Notifications are blocked for Faultline in this browser’s settings — reminders still show on Home and on the project.</p>;
  return (
    <p className="sub nt-perm">
      <button type="button" className="btn btn-sm" onClick={() => void grant()}>Notify me on this device</button>
      {' '}{asked
        ? 'Not turned on — the browser’s question was closed without a yes. Press it again to be asked again; reminders still show on Home and on the project.'
        : 'Reminders always show on Home and on the project; this adds a notification on the day, even when Faultline is closed.'}
    </p>
  );
}

/** The card at the top of a project while a reminder is due today, has gone,
 *  or is coming this week. Tick one off here, the same tick as on the note. */
export function ProjectReminders({ projectId }: { projectId: string }) {
  const tt = useTesting(projectId);
  if (tt.loading) return null;
  const rs = remindersOf(tt.items, todayISO());
  if (!rs.length) return null;
  const now = rs.filter(r => r.days <= 0).length;
  return (
    <section className="rem-card" aria-label="Reminders">
      <div className="rem-h">
        <b><i className="nt-rem-dot" aria-hidden /> {now ? `${now} reminder${now === 1 ? '' : 's'} today or gone` : `${rs.length} reminder${rs.length === 1 ? '' : 's'} this week`}</b>
        <button type="button" className="cw-link" onClick={() => nav(`/project/${projectId}/notes`)}>Meeting notes ›</button>
      </div>
      <ul className="rem-list">
        {rs.map(r => {
          const item = tt.items.find(i => i.id === r.id);
          return (
            <li key={r.id} className={r.days < 0 ? 'is-late' : r.days === 0 ? 'is-today' : ''}>
              <button type="button" className="tw-tick" aria-label="Talked about — done"
                onClick={() => {
                  if (!item) return;
                  void tt.saveItem({ ...item, doneAt: Date.now() });
                  offerUndo('Reminder done', () => tt.saveItem(item));
                }} />
              <span className="rem-what">{r.what}</span>
              <span className="rem-when">{remindWords(r)}{r.onPlan ? ' · on the plan' : ''}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
