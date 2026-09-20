/* PASTE THE NUMBERS IN — from whatever spreadsheet this business already keeps.
 *
 * The app used to READ ONE WORKBOOK. Not one shape of workbook: one workbook,
 * whose sheets it knew by name and whose columns it knew by position. That is
 * fine for the factory it was written in and useless everywhere else, and it is
 * the thing Rowland put his finger on — "it's built for one business model".
 *
 * So: paste a block out of any sheet, and the app says what it thinks each
 * column is. Every guess is shown and every one can be changed before a single
 * number is written. It handles the three shapes people actually keep —
 *
 *   Line | Date | Packs per minute | Waste      a column per measure
 *   Line | 27 Jul | 3 Aug | 10 Aug             a column per date
 *   Line | Date | Reading                      the simple one
 *
 * — and it reports what it could not place rather than importing less than was
 * pasted and saying nothing. A blank cell is skipped in silence, because a blank
 * week is a week nobody measured, not a mistake. */
import { useMemo, useState } from 'react';
import { parsePaste, guessMap, readPaste, matchLine, type ColumnRole, type Measure, type PasteMap } from '../lib/measures';
import type { PaceLineRow } from '../db';

const PROBLEMS_SHOWN = 6;

export function PasteNumbers({ lines, measures, onImport, only }: {
  lines: PaceLineRow[];
  measures: Measure[];
  onImport: (rows: { lineId: string; measureId: string; at: string; value: number }[]) => Promise<void>;
  /** Pasting inside one line's pack: there is no line column to map, because the
   *  line is the page you are on. */
  only?: PaceLineRow;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [override, setOverride] = useState<PasteMap | null>(null);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState('');

  const parsed = useMemo(() => parsePaste(text), [text]);
  const guessed = useMemo(() => guessMap(parsed.headings, measures), [parsed.headings, measures]);
  /* The guess is the starting point, and a change to one column keeps the rest.
     Re-guessing on every keystroke would undo somebody's correction the moment
     they pasted a second block. */
  const map = override && override.roles.length === parsed.headings.length ? override : guessed;

  const rows = useMemo(() => {
    const read = readPaste(parsed, map);
    return read.map(r => {
      const line = only ?? (r.lineKey ? matchLine(lines, r.lineKey) : undefined);
      const problem = r.problem
        ?? (line ? undefined : `“${r.lineKey ?? ''}” is not a line on this project`);
      return { ...r, lineId: line?.id, problem };
    });
  }, [parsed, map, lines, only]);

  /* The rows that will be written, narrowed rather than asserted — every field
     the import needs is proved present here, once, instead of four times at the
     point of use. */
  const ok = rows.flatMap(r => (!r.problem && r.lineId && r.measureId && r.at && r.value != null)
    ? [{ lineId: r.lineId, measureId: r.measureId, at: r.at, value: r.value }]
    : []);
  /* One line per PROBLEM, not per cell. A sheet with a column per date repeats
     the same fault once per column — "Cellox is not a line on this project"
     three times is the same news three times. */
  const bad = rows.filter(r => r.problem)
    .filter((r, i, all) => all.findIndex(o => o.rowNo === r.rowNo && o.problem === r.problem) === i);
  const needsMeasure = map.roles.some(r => r.kind === 'on') && !map.measureId;

  const setRole = (i: number, role: ColumnRole) => {
    const roles = [...map.roles];
    roles[i] = role;
    setOverride({ ...map, roles });
  };

  const doImport = async () => {
    setBusy(true);
    try {
      await onImport(ok);
      setSaid(`${ok.length} reading${ok.length === 1 ? '' : 's'} added.`);
      setText(''); setOverride(null);
    } finally { setBusy(false); }
  };

  if (measures.length === 0) return null;

  return (
    <section className="ppm-editor">
      <button className="ppm-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="ppm-toggle-ic" aria-hidden>{open ? '▾' : '▸'}</span>
        Paste from a spreadsheet
        <span className="ppm-toggle-sub">any columns · you say what each one is</span>
      </button>

      {open && (
        <div className="ppm-body">
          <label className="proj-field">
            <span className="field-label">Paste the block, headings and all</span>
            <textarea className="text-input pn-text" rows={5} value={text}
              placeholder={only
                ? 'Date\tPacks per minute\n15/09/2026\t61'
                : 'Line\tDate\tPacks per minute\nLine 2A\t15/09/2026\t61'}
              onChange={e => { setText(e.target.value); setOverride(null); setSaid(''); }} />
          </label>

          {said && <p className="chip-note is-good">{said}</p>}

          {parsed.headings.length > 0 && (
            <>
              <p className="field-label pn-lbl">What each column is</p>
              <div className="pn-cols">
                {parsed.headings.map((h, i) => {
                  const role = map.roles[i];
                  const value =
                    role.kind === 'measure' ? `m:${role.measureId}`
                    : role.kind === 'on' ? 'on'
                    : role.kind;
                  return (
                    <label key={h + i} className="pn-col">
                      <span className="pn-col-h">{h || <i>(no heading)</i>}</span>
                      <select className="pset-cell pset-pick" value={value}
                        onChange={e => {
                          const v = e.target.value;
                          if (v.startsWith('m:')) setRole(i, { kind: 'measure', measureId: v.slice(2) });
                          else if (v === 'on') setRole(i, { kind: 'on', at: role.kind === 'on' ? role.at : '' });
                          else setRole(i, { kind: v as 'ignore' | 'line' | 'date' });
                        }}>
                        <option value="ignore">— ignore —</option>
                        {!only && <option value="line">the line</option>}
                        <option value="date">the date</option>
                        {measures.map(m => <option key={m.id} value={`m:${m.id}`}>{m.name}</option>)}
                        {role.kind === 'on' && <option value="on">readings on {role.at}</option>}
                      </select>
                      {role.kind === 'on' && <span className="pn-col-s">a date column</span>}
                    </label>
                  );
                })}
              </div>

              {map.roles.some(r => r.kind === 'on') && (
                <label className="proj-field pn-which">
                  <span className="field-label">The date columns are readings of</span>
                  <select className="text-input" value={map.measureId ?? ''}
                    onChange={e => setOverride({ ...map, measureId: e.target.value || undefined })}>
                    <option value="">— pick a measure —</option>
                    {measures.map(m => <option key={m.id} value={m.id}>{m.name}{m.unit ? ` (${m.unit})` : ''}</option>)}
                  </select>
                </label>
              )}

              <div className="pn-verdict">
                <span className={'pn-count' + (ok.length ? ' is-good' : '')}>{ok.length} to add</span>
                {bad.length > 0 && (
                  <span className="pn-count is-bad">
                    {bad.length} {bad.length === 1 ? 'row' : 'rows'} can’t be read
                  </span>
                )}
              </div>

              {bad.length > 0 && (
                <ul className="pn-problems">
                  {bad.slice(0, PROBLEMS_SHOWN).map((r, i) => (
                    <li key={i}>Row {r.rowNo}{r.lineKey ? ` (${r.lineKey})` : ''} — {r.problem}</li>
                  ))}
                  {bad.length > PROBLEMS_SHOWN && <li className="sub">…and {bad.length - PROBLEMS_SHOWN} more like it</li>}
                </ul>
              )}

              <div className="ppm-week-actions">
                <button className="btn btn-primary" disabled={busy || !ok.length || needsMeasure}
                  onClick={() => void doImport()}>
                  {busy ? 'Adding…' : `Add ${ok.length} reading${ok.length === 1 ? '' : 's'}`}
                </button>
                <button className="btn btn-ghost" onClick={() => { setText(''); setOverride(null); setSaid(''); }}>Clear</button>
                <span className="ppm-hint">
                  {needsMeasure
                    ? 'Say which measure the date columns hold, and this opens up.'
                    : 'Nothing is written until you press this. Rows that can’t be read are left out and listed above.'}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
