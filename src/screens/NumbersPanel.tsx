/* THE NUMBERS — recorded, charted, and judged against the target.
 *
 * One panel for a line's own pack and one for the project, both reading the same
 * four things: the measures this business defined, its periods, its targets and
 * its readings. There is nothing in here that knows what a pack or a minute is.
 *
 * A reading is a DATE and a NUMBER. Not a week index into a fixed calendar,
 * which is what the grid this replaced stored — and which meant every reading
 * anybody entered was counted from one Monday in July 2026, for ever.
 *
 * The chart appears as soon as there is a reading. That is the whole of what
 * Rowland asked for: "is there a way for users to set their measurements and
 * then a graph will appear". */
import { useMemo, useState } from 'react';
import { nav } from '../state/useRoute';
import { MeasureChart } from '../charts/MeasureChart';
import { PasteNumbers } from './PasteNumbers';
import { useMeasures } from '../lib/useMeasures';
import { lineSeries, seriesFor, say, todayISO, type Measure } from '../lib/measures';
import type { PaceLineRow } from '../db';

const shortDay = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** Record one reading. The date defaults to today, because that is when almost
 *  every reading is typed — and stays editable, because the other case is
 *  catching up on Monday for the week that has just gone. */
function AddReading({ measure, onAdd }: {
  measure: Measure;
  onAdd: (at: string, value: number, note?: string) => Promise<void>;
}) {
  const [at, setAt] = useState(todayISO());
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');

  const add = async () => {
    const n = Number(value.trim());
    if (!Number.isFinite(n) || !at) return;
    await onAdd(at, n, note.trim() || undefined);
    setValue(''); setNote('');
  };

  return (
    <div className="nm-add">
      <label className="proj-field nm-add-date">
        <span className="field-label">On</span>
        <input className="text-input" type="date" value={at} onChange={e => setAt(e.target.value)} />
      </label>
      <label className="proj-field nm-add-val">
        <span className="field-label">{measure.name}{measure.unit ? ` (${measure.unit})` : ''}</span>
        <input className="text-input" inputMode="decimal" value={value} placeholder="—"
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void add(); }} />
      </label>
      <label className="proj-field nm-add-note">
        <span className="field-label">Note — optional</span>
        <input className="text-input" value={note} maxLength={120} placeholder="What was different about it"
          onChange={e => setNote(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void add(); }} />
      </label>
      <button className="btn btn-primary nm-add-btn" disabled={!value.trim() || !at} onClick={() => void add()}>
        Add reading
      </button>
    </div>
  );
}

/** The readings themselves, newest first — so a mistyped number can be found
 *  and taken out. The grid this replaced had no way to delete a row at all. */
function Recent({ rows, onRemove, unit, limit = 8 }: {
  rows: { id: string; at: string; value: number; note?: string }[];
  onRemove: (id: string) => Promise<void>;
  unit?: string;
  limit?: number;
}) {
  const [all, setAll] = useState(false);
  if (!rows.length) return null;
  const newest = [...rows].reverse();
  const shown = all ? newest : newest.slice(0, limit);
  return (
    <div className="nm-recent">
      <p className="field-label">Readings</p>
      <ul className="nm-list">
        {shown.map(r => (
          <li key={r.id} className="nm-row">
            <span className="nm-when">{shortDay(r.at)}</span>
            <span className="nm-val">{say(r.value, unit)}</span>
            {r.note && <span className="nm-note">{r.note}</span>}
            <button className="pset-x" aria-label={`Remove the reading of ${r.value} on ${r.at}`}
              onClick={() => { if (window.confirm(`Delete the reading of ${say(r.value, unit)} on ${shortDay(r.at)}?`)) void onRemove(r.id); }}>×</button>
          </li>
        ))}
      </ul>
      {newest.length > limit && (
        <button className="btn btn-ghost btn-sm" onClick={() => setAll(a => !a)}>
          {all ? 'Show fewer' : `All ${newest.length}`}
        </button>
      )}
    </div>
  );
}

/** Nothing measured yet, said once, with the way out. Shown instead of an empty
 *  chart, because "no measures defined" and "no readings yet" are two different
 *  problems with two different next moves. */
function NoMeasures({ projectId }: { projectId: string }) {
  return (
    <div className="pace-empty">
      <p className="sub">
        This project hasn’t said what it measures yet. A measure is a name, a unit and which way is
        good — packs per minute, waste, OEE, first-pass yield, whatever this business runs on.
      </p>
      <button className="btn btn-primary" style={{ marginTop: 10 }}
        onClick={() => nav(`/project/${projectId}/setup`)}>Set the measures up</button>
    </div>
  );
}

/* ================================ one line ================================ */

export function LineNumbers({ projectId, line }: { projectId: string; line: PaceLineRow }) {
  const state = useMeasures(projectId);
  if (state.loading) return null;
  if (!state.measures.length) return <NoMeasures projectId={projectId} />;

  return (
    <>
      {state.measures.map(m => {
        const series = lineSeries(state.measures, state.periods, state.targets, state.readings, line.id, m.id);
        const rows = seriesFor(state.readings, line.id, m.id);
        return (
          <div key={m.id} className="nm-measure">
            {series && <MeasureChart series={series} who={{ name: line.name, owner: line.owner, sponsor: line.sponsor, variant: line.variant }} />}
            <AddReading measure={m}
              onAdd={(at, v, note) => state.addReading(line.id, m.id, at, v, note)} />
            <Recent rows={rows} unit={m.unit} onRemove={state.removeReading} />
          </div>
        );
      })}
      <PasteNumbers lines={[line]} measures={state.measures} only={line}
        onImport={state.importReadings} />
    </>
  );
}

/* ============================== the project =============================== */

/** Every line's numbers in one place: type one in, or paste a block. The charts
 *  live on the project's overview — this is the door for getting the numbers in,
 *  not for reading them. */
export function ProjectNumbers({ projectId, lines }: { projectId: string; lines: PaceLineRow[] }) {
  const state = useMeasures(projectId);
  const [lineId, setLineId] = useState('');
  const [measureId, setMeasureId] = useState('');

  const line = lines.find(l => l.id === lineId) ?? lines[0];
  const measure = state.measures.find(m => m.id === measureId) ?? state.measures[0];

  /* The newest across every line, so a number typed on somebody's phone is
     visible here — and so a wrong one can be found without hunting for which
     line it went onto. */
  const newest = useMemo(() => {
    const byLine = new Map(lines.map(l => [l.id, l.name]));
    const byMeasure = new Map(state.measures.map(m => [m.id, m]));
    return state.readings
      .filter(r => !r.deletedAt)
      .sort((a, b) => b.at.localeCompare(a.at) || b.createdAt - a.createdAt)
      /* A reading whose line or measure has since gone is left out rather than
         asserted into existence — removing a measure keeps its readings on
         purpose, and they have nothing to be labelled with here. */
      .flatMap(r => {
        const lineName = byLine.get(r.lineId), measure = byMeasure.get(r.measureId);
        return lineName && measure ? [{ ...r, lineName, measure }] : [];
      })
      .slice(0, 14);
  }, [state.readings, state.measures, lines]);

  if (state.loading) return null;
  if (!state.measures.length) return <NoMeasures projectId={projectId} />;
  if (!lines.length) {
    return (
      <div className="pace-empty">
        <p className="sub">No lines on this project yet — a reading belongs to a line.</p>
        <button className="btn btn-primary" style={{ marginTop: 10 }}
          onClick={() => nav(`/project/${projectId}/setup`)}>Add the first line</button>
      </div>
    );
  }

  return (
    <>
      <div className="card nm-card">
        <div className="field-label">Record a reading</div>
        <div className="nm-pick">
          <label className="proj-field">
            <span className="field-label">Line</span>
            <select className="text-input" value={line?.id ?? ''} onChange={e => setLineId(e.target.value)}>
              {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
          <label className="proj-field">
            <span className="field-label">Measure</span>
            <select className="text-input" value={measure?.id ?? ''} onChange={e => setMeasureId(e.target.value)}>
              {state.measures.map(m => <option key={m.id} value={m.id}>{m.name}{m.unit ? ` (${m.unit})` : ''}</option>)}
            </select>
          </label>
        </div>
        {line && measure && (
          <AddReading measure={measure}
            onAdd={(at, v, note) => state.addReading(line.id, measure.id, at, v, note)} />
        )}
      </div>

      <PasteNumbers lines={lines} measures={state.measures} onImport={state.importReadings} />

      {newest.length > 0 && (
        <div className="card nm-card">
          <div className="field-label">Latest in</div>
          <ul className="nm-list">
            {newest.map(r => (
              <li key={r.id} className="nm-row">
                <span className="nm-when">{shortDay(r.at)}</span>
                <span className="nm-line">{r.lineName}</span>
                <span className="nm-what">{r.measure.name}</span>
                <span className="nm-val">{say(r.value, r.measure.unit)}</span>
                {r.note && <span className="nm-note">{r.note}</span>}
                <button className="pset-x" aria-label={`Remove ${r.lineName} ${r.measure.name} on ${r.at}`}
                  onClick={() => { if (window.confirm(`Delete ${r.lineName}’s ${r.measure.name} of ${say(r.value, r.measure.unit)} on ${shortDay(r.at)}?`)) void state.removeReading(r.id); }}>×</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
