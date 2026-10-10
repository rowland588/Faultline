/* SINCE YOU LAST LOOKED — the line at the top of a job (lib/since).
 *
 * The last visit is kept on THIS device only: a phone and a laptop each have
 * their own, and nothing is written to the job or the cloud. The job's front
 * page counts from it and then starts a new visit; the control room only reads
 * it, so a row says what changed since you last opened that job. Storage can
 * be refused (a private window, cleared site data): then there is simply no
 * line, never an error. */
import { useEffect, useState } from 'react';
import type { Since } from '../lib/since';
import { openRecord } from './RecordDrawer';
import { nav } from '../state/useRoute';

const KEY = (projectId: string) => `faultline.seen.${projectId}`;

/** When this device last opened the job — undefined on a first visit. */
export function readSeen(projectId: string): number | undefined {
  try {
    const v = Number(localStorage.getItem(KEY(projectId)));
    return Number.isFinite(v) && v > 0 ? v : undefined;
  } catch { return undefined; }
}

function markSeen(projectId: string, at: number): void {
  try { localStorage.setItem(KEY(projectId), String(at)); } catch { /* storage refused — no line next time, nothing else */ }
}

/** The visit this page counts from: read once as it opens, then a new visit begins. */
export function useSeenAt(projectId: string): number | undefined {
  const [seenAt] = useState(() => readSeen(projectId));
  useEffect(() => { markSeen(projectId, Date.now()); }, [projectId]);
  return seenAt;
}

/** Where a part goes when it names more than one thing. */
const PAGE: Record<Since['parts'][number]['kind'], string> = { late: 'plan', failed: 'testing', problem: 'fixes', done: 'day' };

export function SinceLine({ projectId, since, compact }: { projectId: string; since?: Since; compact?: boolean }) {
  if (!since) return null;
  const open = (p: Since['parts'][number]) => (p.ids.length === 1 ? openRecord(projectId, p.ids[0]) : nav(`/project/${projectId}/${PAGE[p.kind]}`));
  /* In the control room the line sits inside the row's own button, so it is
     words only — a span, never a button inside a button. */
  if (compact) {
    return (
      <span className="sn is-compact">
        <span className="sn-from">{since.from}:</span>{' '}
        {since.parts.map((p, i) => <span key={p.kind}>{i > 0 && ' · '}<span className={'sn-p is-' + p.tone}>{p.text}</span></span>)}
      </span>
    );
  }
  return (
    <p className="sn" role="status" aria-label={`${since.from}: ${since.parts.map(p => p.text).join(' · ')}`}>
      <span className="sn-from">{since.from}:</span>{' '}
      {since.parts.map((p, i) => (
        <span key={p.kind}>
          {i > 0 && <span className="sn-sep" aria-hidden> · </span>}
          <button type="button" className={'sn-p is-' + p.tone} onClick={() => open(p)}>{p.text}</button>
        </span>
      ))}
    </p>
  );
}
