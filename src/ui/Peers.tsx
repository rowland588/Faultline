/* THE SIDEWAYS MOVE — the other half of getting around.
 *
 * Rowland: "trying to go backwards into something, you lose track of where you
 * just need to go back to, or forward."
 *
 * The spine fixed UP. Nothing had ever fixed ACROSS. Testing, Materials,
 * Programs and Evidence are peers a person flips between all day, and getting
 * from one to the next meant going up to the project and back down — two taps
 * and a screen you did not want, every time.
 *
 * One button on the Programs screen said "Materials", which was somebody
 * hitting the same wall and patching it in one place. This is that patch made
 * general: the same row on every screen at this level, in the same order, with
 * the one you are on marked rather than removed. Removed is worse — a row that
 * changes shape as you move through it gives your eye nothing to anchor on.
 */
import { nav } from '../state/useRoute';

export interface Peer {
  label: string;
  to: string;
  /** You are here. Still drawn, never a link to itself. */
  on?: boolean;
  /** A number worth seeing before you decide whether to go — how many are
   *  outstanding on that list. Nothing is drawn when it is zero, because a
   *  row of zeroes teaches the eye to ignore the row. */
  n?: number;
  /** Any of that number past the day it was wanted. */
  late?: number;
}

export function Peers({ peers }: { peers: Peer[] }) {
  const shown = peers.filter(p => p.label);
  if (shown.length < 2) return null;

  return (
    <nav className="peers" aria-label="The rest of this project">
      {shown.map(p => (
        p.on
          ? (
            <span key={p.to} className="peer is-on" aria-current="page">
              {p.label}
              {!!p.n && <span className={'peer-n' + (p.late ? ' is-late' : '')}>{p.n}</span>}
            </span>
          )
          : (
            <button key={p.to} className="peer" onClick={() => nav(p.to)}>
              {p.label}
              {!!p.n && <span className={'peer-n' + (p.late ? ' is-late' : '')}>{p.n}</span>}
            </button>
          )
      ))}
    </nav>
  );
}

/** The peers of a project, in the order the job runs: what we are proving,
 *  what we are waiting on, what the machine can run, and what we filmed.
 *  `counts` comes from lib/standing.ts, so the row and the client report
 *  cannot disagree about how many are outstanding. */
export function projectPeers(projectId: string, here: string, counts?: Record<string, { n: number; late: number }>): Peer[] {
  const p = (key: string, label: string, to: string): Peer => ({
    label, to, on: here === key, n: counts?.[key]?.n, late: counts?.[key]?.late,
  });
  return [
    p('testing', 'Testing', `/project/${projectId}/testing`),
    p('materials', 'Materials', `/project/${projectId}/materials`),
    p('programs', 'Programs', `/project/${projectId}/programs`),
    p('setup', 'Lines & people', `/project/${projectId}/setup`),
  ];
}
