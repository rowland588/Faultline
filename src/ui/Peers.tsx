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
  /* A gate's number is everything outstanding in it — Set up counts its
     steps and the programs not yet proved together. */
  const gate = (key: string, label: string, to: string, keys: string[]): Peer => ({
    label, to, on: here === key || (key === 'setup' && here === 'programs'),
    n: keys.reduce((n, k) => n + (counts?.[k]?.n ?? 0), 0) || undefined,
    late: keys.reduce((n, k) => n + (counts?.[k]?.late ?? 0), 0) || undefined,
  });
  return [
    /* THE GATES, IN THE ORDER THE JOB GOES THROUGH THEM. Rowland: "install —
       next gate set up, programs; next commissioning; after that handover."
       Install was the only gate drawn as one; Set up had become a list called
       Programs and Commission a list called Testing. Now the row reads as the
       journey, and the three lists every gate draws on follow it. */
    p('install', 'Install', `/project/${projectId}/install`),
    /* Programs are set up here — the record and its links are unchanged. */
    gate('setup', 'Set up', `/project/${projectId}/set-up`, ['setup', 'programs']),
    /* The tests: proving each machine against what was agreed. The key stays
       'testing' — it is the URL and the count every screen already uses. */
    gate('testing', 'Commission', `/project/${projectId}/testing`, ['testing']),
    gate('handover', 'Hand over', `/project/${projectId}/handover`, ['handover']),
    /* Not gates — what all four draw on: what is broken and what we are
       waiting for. */
    p('fixes', 'Fixes', `/project/${projectId}/fixes`),
    p('materials', 'Materials', `/project/${projectId}/materials`),
    /* NO EVIDENCE TAB. It sat last in the row, beside the gates, and Rowland
       could not see where it came in: "why can't the evidence system be inside
       what already exists, within the install section?" The filmed line is on
       Install now — the first gate, where the new line is walked — and any
       problem written on any gate can be pinned on it. */
  ];
}

/** The row on a 3P or lever tree job — the same shape as the gates row, in
 *  that method's own running order. Rowland, of the 3P page's fourteen
 *  buttons: "make it just like the other one."
 *
 *  The board (or the tree) first, because it is the meeting; then the lines
 *  it is about, the numbers that say whether it is working, what worked, the
 *  filmed line, and what it is waiting on. Programs sit inside Materials and
 *  the line standard inside Lines — the way Set up and Hand over hold them on
 *  a stage-gate job — so the row stays six long. */
export function methodPeers(projectId: string, method: 'board' | 'tree', here: string,
  counts?: Record<string, { n: number; late: number }>): Peer[] {
  const p = (key: string, label: string, to: string): Peer => ({
    label, to, on: here === key, n: counts?.[key]?.n || undefined, late: counts?.[key]?.late || undefined,
  });
  return [
    method === 'tree'
      ? p('tree', 'Tree', `/project/${projectId}/tree`)
      : p('board', 'Board', `/project/${projectId}/board`),
    p('lines', 'Lines', `/project/${projectId}?view=lines`),
    p('data', 'Numbers', `/project/${projectId}?view=data`),
    p('wins', 'Wins', `/project/${projectId}?view=wins`),
    p('snags', 'Evidence', `/project/${projectId}?view=snags`),
    p('materials', 'Materials', `/project/${projectId}/materials`),
  ];
}
