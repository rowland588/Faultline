/* PUT EXISTING WORK ON ITS LINE.
 *
 * Next steps and wins written before lines had packs of their own sit at
 * project level: visible on the project, invisible inside any one line. So the
 * person who owns Line 7 opens their pack and finds none of the work that is
 * actually theirs.
 *
 * This is the one-time tidy-up. It reads what each item says about WHERE it
 * happened, proposes a line, and shows the lot — the text it read and the line
 * it inferred, side by side — so the whole batch can be judged before a single
 * row is written. Nothing moves until the button is pressed.
 *
 * It disappears once there is nothing left to place, which is the point: this
 * is a job you do once, not a feature you live with.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  listPaceTodos, listPaceWins, putPaceTodo, putPaceWin,
  type PaceTodoRow, type PaceWinRow, type PaceLineRow,
} from '../db';
import { proposeLines, type LineProposal } from '../lib/guessLine';

type Row =
  | { kind: 'todo'; p: LineProposal<PaceTodoRow> }
  | { kind: 'win'; p: LineProposal<PaceWinRow> };

const label = (r: Row) =>
  r.kind === 'todo' ? (r.p.item.what || 'Untitled next step')
                    : (r.p.item.title || r.p.item.story || 'Untitled win');

export function LineTidyPanel({ projectId, lines }: { projectId: string; lines: PaceLineRow[] }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [todos, wins] = await Promise.all([listPaceTodos(projectId), listPaceWins(projectId)]);
    setRows([
      ...proposeLines(todos, lines).map(p => ({ kind: 'todo', p } as Row)),
      ...proposeLines(wins, lines).map(p => ({ kind: 'win', p } as Row)),
    ]);
  }, [projectId, lines]);

  useEffect(() => { void load(); }, [load]);

  // Nothing to place, or nowhere to place it — say nothing at all, unless
  // something was just moved, in which case say what happened.
  if (!rows || rows.length === 0 || lines.length === 0) {
    return done
      ? <p className="tidy-done">{done}</p>
      : null;
  }

  // Rebuilt per branch rather than spread: spreading a discriminated union
  // drops the tie between `kind` and the shape of `p`, and the compiler is
  // right to complain — a todo's proposal and a win's are not interchangeable.
  const set = (i: number, lineId: string | null) =>
    setRows(rs => rs!.map((r, n): Row => {
      if (n !== i) return r;
      return r.kind === 'todo'
        ? { kind: 'todo', p: { ...r.p, lineId } }
        : { kind: 'win', p: { ...r.p, lineId } };
    }));

  const guessed = rows.filter(r => r.p.lineId).length;

  const apply = async () => {
    setSaving(true);
    try {
      let n = 0;
      for (const r of rows) {
        if (!r.p.lineId) continue;           // "leave on the project" writes nothing
        if (r.kind === 'todo') await putPaceTodo({ ...r.p.item, lineId: r.p.lineId });
        else await putPaceWin({ ...r.p.item, lineId: r.p.lineId });
        n++;
      }
      setDone(n === 0
        ? 'Nothing moved — everything was left on the project.'
        : `${n} item${n === 1 ? '' : 's'} moved onto their lines. They now show in that line's pack as well as on the project.`);
      await load();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="tidy">
      {/* what the last pass did, kept on screen even though there is more to
          place — it is feedback on a button that was just pressed */}
      {done && <p className="tidy-done">{done}</p>}
      <div className="tidy-head">
        <div>
          <h3 className="tidy-title">
            {rows.length} item{rows.length === 1 ? '' : 's'} not on a line yet
          </h3>
          <p className="sub">
            These show on the project but not inside any line’s pack, so the person who owns the
            line never sees them. {guessed > 0 && <>Where it can tell, a line is already suggested — {guessed} of {rows.length}.</>}
          </p>
        </div>
        <button className="btn" onClick={() => setOpen(o => !o)}>
          {open ? 'Cancel' : 'Review them'}
        </button>
      </div>

      {open && (
        <>
          <div className="tidy-table-wrap">
            <table className="tidy-table">
              <thead>
                <tr><th>What</th><th>Where it says</th><th>Goes to</th></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.kind + r.p.item.id}>
                    <td>
                      <span className={'tidy-kind is-' + r.kind}>{r.kind === 'todo' ? 'Next step' : 'Win'}</span>
                      <span className="tidy-what">{label(r)}</span>
                    </td>
                    <td className="tidy-from">
                      {r.p.from}
                      {!r.p.lineId && <span className="tidy-why"> · {r.p.why}</span>}
                    </td>
                    <td>
                      <select className="tidy-pick" value={r.p.lineId ?? ''}
                        onChange={e => set(i, e.target.value || null)}>
                        <option value="">Leave on the project</option>
                        {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="tidy-foot">
            <button className="btn btn-primary" disabled={saving} onClick={() => void apply()}>
              {saving ? 'Moving…' : `Move ${rows.filter(r => r.p.lineId).length} onto their lines`}
            </button>
            <span className="sub">
              Anything left as “Leave on the project” stays exactly where it is.
            </span>
          </div>
        </>
      )}
    </section>
  );
}
