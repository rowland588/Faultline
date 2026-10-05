/* A ROW OF LENSES on one page — today only the line page's (Overview ·
 * Actions · Wins · Evidence · Numbers · Line balance).
 *
 * This was the sideways move for the whole app: the gates of a stage-gate job,
 * the lenses of a 6M or tree job and the four screens of a line study were
 * each a row of these under the header, one row per level — five different
 * rows. Those three rows are the rail now (ui/Frame, ui/rail): the structure
 * drawn once, on the left, with the same counts. Rowland: "too many doors
 * opening… what's home is home, really home, or the project home? it's just
 * messy."
 *
 * The line page keeps its row until its lenses become sections of one page
 * (the redesign's fifth slice); it is the one row left, so this stays small.
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
  /** A few words on what the tab holds — the line page's "what worked",
   *  "record and chart". Said beside the name where the row has the room (a
   *  desk), left off on a phone where it never had room. */
  hint?: string;
}

/* THE COUNT, AND WHAT IS LATE IN IT, SAID APART. The whole number used to turn
 * red when any of it was late, so "Board 5" read as five things late when one
 * was. Five open is the work and stays neutral; the late part is the abnormal
 * number, so it alone is red, and it says "late" in words so it survives a
 * black-and-white print and colour-blind eyes (CLAUDE.md, visual management
 * rules 3 and 4). */
function Count({ n, late }: { n?: number; late?: number }) {
  if (!n) return null;
  return (
    <>
      <span className="peer-n">{n}</span>
      {!!late && <span className="peer-late">{late} late</span>}
    </>
  );
}

export function Peers({ peers, label = 'The rest of this project' }: { peers: Peer[]; label?: string }) {
  const shown = peers.filter(p => p.label);
  if (shown.length < 2) return null;

  return (
    /* On a phone the row is a grid (styles.css, THE PEERS ROW): three to a
       row for six, four for seven or eight, so nothing sits alone below. */
    <nav className="peers" aria-label={label} style={{ '--peer-cols': shown.length > 6 && shown.length <= 8 ? 4 : 3 } as React.CSSProperties}>
      {shown.map(p => (
        p.on
          ? (
            <span key={p.to} className="peer is-on" aria-current="page">
              <span className="peer-l">{p.label}</span>
              {p.hint && <span className="peer-hint">{p.hint}</span>}
              <Count n={p.n} late={p.late} />
            </span>
          )
          : (
            <button key={p.to} className="peer" onClick={() => nav(p.to)}>
              <span className="peer-l">{p.label}</span>
              {p.hint && <span className="peer-hint">{p.hint}</span>}
              <Count n={p.n} late={p.late} />
            </button>
          )
      ))}
    </nav>
  );
}
