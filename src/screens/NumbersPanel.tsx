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
import { AddFold } from '../ui/AddFold';
import { useMemo, useState } from 'react';
import { nav } from '../state/useRoute';
import { readNumber } from '../lib/format';
import { MeasureChart } from '../charts/MeasureChart';
import { useMeasures, type MeasuresState } from '../lib/useMeasures';
import { lineSeries, perMinuteMeasure, seriesFor, say, todayISO, type Measure, type Reading } from '../lib/measures';
import { useLineCapacity } from '../lib/useLineCapacity';
import { countedRate } from '../lib/ie/losses';
import type { PaceLineRow } from '../db';
import { Icon } from '../ui/Icon';
import { DateInput } from '../ui/DateInput';
import { DraftNumber } from '../ui/Draft';
import { useAccess } from '../cloud/access';

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

  /* A number, or nothing to add. "12,5" off a phone keyboard that writes a
     decimal comma is twelve and a half; "abc" left the button lit and a tap
     on it did nothing at all. */
  // "3,1" (a European decimal keypad) and "1,200" (a UK thousand) both read as
  // meant — lib/format readNumber; "abc" is no number, and the button stays off.
  const n = readNumber(value);
  const valid = n != null;
  const add = async () => {
    if (n == null || !at) return;
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
      <button className="btn btn-primary nm-add-btn" disabled={!valid || !at} onClick={() => void add()}>
        Add reading
      </button>
    </div>
  );
}

/** The readings themselves, newest first — so a mistyped number can be found
 *  and taken out. The grid this replaced had no way to delete a row at all.
 *  Taking one out is deleting, which is the owner's (lib/access): anyone else
 *  gets no `onRemove`, and no ✕. */
function Recent({ rows, onRemove, onSave, unit, limit = 8 }: {
  rows: Reading[];
  onRemove?: (id: string) => Promise<void>;
  /** Somebody who records readings may also put one right (lib/access). */
  onSave?: (r: Reading) => Promise<void>;
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
            {onSave ? <>
              <DateInput className="pset-cell nm-when" aria-label={`Day of the reading of ${r.value}`} value={r.at}
                onCommit={v => { if (v) void onSave({ ...r, at: v }); }} />
              <DraftNumber className="pset-cell is-num nm-val" label={`The reading on ${r.at}`} value={Math.round(r.value * 1e6) / 1e6}
                onSave={v => { if (v != null) void onSave({ ...r, value: v }); }} />
              {unit && <span className="nm-what">{unit}</span>}
            </> : <>
              <span className="nm-when">{shortDay(r.at)}</span>
              <span className="nm-val">{say(r.value, unit)}</span>
            </>}
            {r.note && <span className="nm-note">{r.note}</span>}
            {onRemove && <button className="pset-x" aria-label={`Remove the reading of ${r.value} on ${r.at}`}
              onClick={() => { if (window.confirm(`Delete the reading of ${say(r.value, unit)} on ${shortDay(r.at)}?`)) void onRemove(r.id); }}><Icon name="close" size="0.85em" /></button>}
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

/** COUNTED ON THE LINE — A READING IN ONE TAP (flow audit #8: "The gap is
 *  typed, not counted. Line 7's pace is On target at 44 a minute. Line 7's
 *  own count says 91 a minute against a plate speed of 100").
 *
 *  Each shift counted on one of the job's lines — a Loss count, by hand:
 *  the good packs made ÷ the planned minutes (lib/ie/losses countedRate) —
 *  is offered as a reading of the rate the job is judged on (lib/measures
 *  perMinuteMeasure), said as counted, until it is recorded; recorded, it
 *  is a reading like any other, on its day, against the target, and its
 *  note says it was counted. The gap starts from what the line counted, not
 *  only from what somebody typed. The team's (it records a reading). */
function CountedOffers({ projectId, lines, state }: { projectId: string; lines: PaceLineRow[]; state: MeasuresState }) {
  const { counts } = useLineCapacity(projectId, lines);
  const m = perMinuteMeasure(state.measures);
  if (!m) return null;
  const recorded = (lineId: string, day: string, v: number) =>
    state.readings.some(r => !r.deletedAt && r.lineId === lineId && r.measureId === m.id && r.at === day && Math.abs(r.value - v) < 0.05);
  const offers = lines.flatMap(l => (counts.get(l.id) ?? [])
    .flatMap(s => { const c = countedRate(s.facts.losses); return c && !recorded(l.id, c.day, c.perMin) ? [{ l, s, c }] : []; })
    .slice(0, 3));
  if (!offers.length) return null;
  return (
    <div className="card nm-card nm-counted" aria-label="Counted on the line">
      <div className="field-label">Counted on the line — a reading in one tap</div>
      <ul className="nm-list">
        {offers.map(({ l, s, c }) => (
          <li key={s.id} className="nm-row nm-offer">
            <span className="nm-offer-t">{lines.length > 1 && <b className="nm-line">{l.name} · </b>}{c.words}, counted</span>
            <button type="button" className="btn btn-sm nm-offer-go"
              onClick={() => void state.addReading(l.id, m.id, c.day, c.perMin, `Counted — loss count, ${c.words}`)}>
              Record {say(c.perMin, m.unit)}
            </button>
          </li>
        ))}
      </ul>
      <p className="sub nm-offer-s">
        A shift counted by hand is the line’s {m.name.toLowerCase()} as it ran — good packs ÷ planned minutes. Recorded,
        it is a reading like any other, judged against the target.
      </p>
    </div>
  );
}

/** Nothing measured yet, said once, with the way out. Shown instead of an empty
 *  chart, because "no measures defined" and "no readings yet" are two different
 *  problems with two different next moves. */
function NoMeasures({ projectId, agree }: { projectId: string; agree: boolean }) {
  return (
    <div className="pace-empty">
      <p className="sub">
        This project hasn’t said what it measures yet. A measure is a name, a unit and which way is
        good — packs per minute, waste, first-pass yield, whatever this business counts.
        {/* What the lines are judged on is agreed, so it is the owner's to set
            (ProjectSetupScreen shows anyone else the measures read-only). */}
        {!agree && ' The project’s owner sets them.'}
      </p>
      {agree && <button className="btn btn-primary" style={{ marginTop: 10 }}
        onClick={() => nav(`/project/${projectId}/setup`)}>Set the measures up</button>}
    </div>
  );
}

/* ================================ one line ================================ */

export function LineNumbers({ projectId, line }: { projectId: string; line: PaceLineRow }) {
  const state = useMeasures(projectId);
  // A client reads the numbers; the team records them; deleting one is the owner's.
  const can = useAccess(projectId);
  if (state.loading) return null;
  if (!state.measures.length) return <NoMeasures projectId={projectId} agree={can.agree} />;

  return (
    <>
      {can.edit && <CountedOffers projectId={projectId} lines={[line]} state={state} />}
      {state.measures.map(m => {
        const series = lineSeries(state.measures, state.periods, state.targets, state.readings, line.id, m.id);
        const rows = seriesFor(state.readings, line.id, m.id);
        return (
          <div key={m.id} className="nm-measure">
            {series && <MeasureChart series={series} who={{ name: line.name, owner: line.owner, sponsor: line.sponsor, variant: line.variant }} />}
            {can.edit && <AddFold label="Record a reading" start={rows.length === 0}>
              <AddReading measure={m}
                onAdd={(at, v, note) => state.addReading(line.id, m.id, at, v, note)} />
            </AddFold>}
            <Recent rows={rows} unit={m.unit} onRemove={can.remove ? state.removeReading : undefined}
              onSave={can.edit ? state.saveReading : undefined} />
          </div>
        );
      })}
      {/* No spreadsheet paste: every reading is recorded here, as it is
          taken. Rowland: "switch to full app only." */}
    </>
  );
}

/* ============================== the project =============================== */

/** Every line's numbers in one place, typed in as they are taken. The Numbers
 *  lens draws every line's chart above this, so the readings and what they
 *  draw are one page; this is where the numbers go in. */
export function ProjectNumbers({ projectId, lines }: { projectId: string; lines: PaceLineRow[] }) {
  const state = useMeasures(projectId);
  const can = useAccess(projectId);
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

  /* The stored row, not the labelled copy above, is what is written back. */
  const fix = (id: string, p: Partial<Reading>) => {
    const was = state.readings.find(x => x.id === id);
    if (was) void state.saveReading({ ...was, ...p });
  };

  if (state.loading) return null;
  if (!state.measures.length) return <NoMeasures projectId={projectId} agree={can.agree} />;
  if (!lines.length) {
    return (
      <div className="pace-empty">
        <p className="sub">No lines on this project yet — a reading belongs to a line.</p>
        {can.edit && <button className="btn btn-primary" style={{ marginTop: 10 }}
          onClick={() => nav(`/project/${projectId}/setup`)}>Add the first line</button>}
      </div>
    );
  }

  return (
    <>
      {can.edit && <CountedOffers projectId={projectId} lines={lines} state={state} />}
      {can.edit && <AddFold label="Record a reading" start={newest.length === 0}>
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
      </AddFold>}


      {newest.length > 0 && (
        <div className="card nm-card">
          <div className="field-label">Latest in</div>
          <ul className="nm-list">
            {newest.map(r => (
              <li key={r.id} className="nm-row">
                {/* A wrong one is put right where it is found (6 October). */}
                {can.edit ? <>
                  <DateInput className="pset-cell nm-when" aria-label={`Day of ${r.lineName}’s ${r.measure.name} reading`} value={r.at}
                    onCommit={v => { if (v) fix(r.id, { at: v }); }} />
                  <span className="nm-line">{r.lineName}</span>
                  <span className="nm-what">{r.measure.name}</span>
                  <DraftNumber className="pset-cell is-num nm-val" label={`${r.lineName}’s ${r.measure.name} on ${r.at}`} value={Math.round(r.value * 1e6) / 1e6}
                    onSave={v => { if (v != null) fix(r.id, { value: v }); }} />
                  {r.measure.unit && <span className="nm-what">{r.measure.unit}</span>}
                </> : <>
                  <span className="nm-when">{shortDay(r.at)}</span>
                  <span className="nm-line">{r.lineName}</span>
                  <span className="nm-what">{r.measure.name}</span>
                  <span className="nm-val">{say(r.value, r.measure.unit)}</span>
                </>}
                {r.note && <span className="nm-note">{r.note}</span>}
                {can.remove && <button className="pset-x" aria-label={`Remove ${r.lineName} ${r.measure.name} on ${r.at}`}
                  onClick={() => { if (window.confirm(`Delete ${r.lineName}’s ${r.measure.name} of ${say(r.value, r.measure.unit)} on ${shortDay(r.at)}?`)) void state.removeReading(r.id); }}><Icon name="close" size="0.85em" /></button>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
