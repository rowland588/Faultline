/* WHAT LUNA JUST CHANGED, ON THE PAGE ITSELF (10 November, docs/LUNA-WORKSPACE.md W3 — Rowland: "I should be able to see the
 * investigation taking shape as we talk. I should be able to see the study being populated").
 *
 * The page redraws on every write already (db onDataChange); this says, at the top of the page, what Luna wrote into the record on
 * screen in the last half hour — read from the conversations' own steps (each write done, with the records it touched), never by watching
 * the page or diffing it. One line: the newest change with its time and how many more; a tap opens nothing new, the page is the record.
 * Shown only while Luna is beside the page (her panel open); closed, Manual Mode's page is exactly as ever. */
import { useCallback, useEffect, useState } from 'react';
import { listAllStudies, onDataChange } from '../db';
import type { Route } from '../state/useRoute';
import { factsOfConversation, isConversation } from './conversation';
import { Icon } from '../ui/Icon';

const WINDOW = 30 * 60_000;
export interface Change { title: string; says: string; at: number }

/** The writes Luna made into the records a page shows, newest first — any of its ids (the record, its line, its project). */
export function changesFor(ids: readonly string[], conversations: readonly { facts: unknown }[], now: number): Change[] {
  const want = new Set(ids.filter(Boolean));
  if (!want.size) return [];
  const out: Change[] = [];
  for (const c of conversations) {
    for (const t of factsOfConversation(c as never).turns ?? []) {
      for (const u of t.used ?? []) {
        if (u.kind !== 'write' || u.status !== 'done' || now - u.at > WINDOW) continue;
        if (u.refs.some(r => want.has(r.id))) out.push({ title: u.title, says: u.says, at: u.at });
      }
    }
  }
  return out.sort((a, b) => b.at - a.at);
}

const hhmm = (t: number) => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

export function LunaChanged({ route }: { route: Route }) {
  const [list, setList] = useState<Change[]>([]);
  const ids = [route.id, route.wsId, route.query.get('open') ?? undefined].filter((x): x is string => !!x);
  const key = ids.join('|');
  const load = useCallback(async () => {
    const convs = (await listAllStudies()).filter(s => !s.deletedAt && isConversation(s));
    setList(changesFor(key.split('|'), convs, Date.now()));
  }, [key]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  if (!list.length) return null;
  const top = list[0];
  return (
    <p className="luna-changed" role="status" data-luna-changed>
      <span className="luna-changed-orb" aria-hidden><Icon name="spark" size={12} /></span>
      <span><b>Luna · {hhmm(top.at)}</b> — {top.title}: {top.says.length > 160 ? `${top.says.slice(0, 157)}…` : top.says}{list.length > 1 ? <span className="sub"> · and {list.length - 1} more change{list.length === 2 ? '' : 's'} here in the last half hour</span> : null}</span>
    </p>
  );
}
