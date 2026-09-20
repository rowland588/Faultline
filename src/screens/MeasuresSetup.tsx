/* WHAT THIS PROJECT MEASURES — set once, by the business, in its own words.
 *
 * This is the page that took the app off one factory's spreadsheet. It used to
 * be four columns in the lines table headed Q1 Q2 Q3 Q4, holding packs per
 * minute, because that is what the business it was written for measures. A
 * bakery on cases per hour, a pharma line on first-pass yield, anybody running
 * four-week periods instead of quarters, had nowhere to put a number.
 *
 * Three lists, in the order you fill them in:
 *   1. the MEASURES  — what you judge a line on, and which way is good
 *   2. the PERIODS   — what you call your periods, and the dates they run
 *   3. the TARGETS   — one number per line, per measure, per period
 *
 * Quarters are OFFERED, never imposed: one button fills four of them in from a
 * start date, and is gone once there are periods, because the whole point of
 * this screen is that the business names its own.
 *
 * Everything saves as you type. There is no Save button to forget. */
import { useState } from 'react';
import { DraftText, DraftNumber } from '../ui/Draft';
import { useMeasures } from '../lib/useMeasures';
import { todayISO, type Direction } from '../lib/measures';
import type { PaceLineRow } from '../db';

const DIRECTIONS: { id: Direction; label: string }[] = [
  { id: 'up', label: 'higher is better' },
  { id: 'down', label: 'lower is better' },
];

function Measures({ state }: { state: ReturnType<typeof useMeasures> }) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [dir, setDir] = useState<Direction>('up');

  const add = async () => {
    if (!name.trim()) return;
    await state.addMeasure(name, unit, dir);
    setName(''); setUnit(''); setDir('up');
  };

  return (
    <div className="card ms-card">
      <div className="field-label">Measures</div>
      {state.measures.length === 0
        ? <p className="sub">Nothing yet. A measure is what you judge a line on — its name, its unit, and which way is good.</p>
        : (
          <div className="ms-table-wrap">
            <table className="ms-table">
              <thead>
                <tr><th>Measure</th><th className="ms-unit">Unit</th><th>Which way is good</th><th className="ms-x" /></tr>
              </thead>
              <tbody>
                {state.measures.map(m => (
                  <tr key={m.id}>
                    <td>
                      <DraftText value={m.name} placeholder="Packs per minute"
                        onSave={v => void state.saveMeasure({ ...m, name: v || m.name })} />
                    </td>
                    <td className="ms-unit">
                      <DraftText value={m.unit ?? ''} placeholder="ppm" max={16}
                        onSave={v => void state.saveMeasure({ ...m, unit: v || undefined })} />
                    </td>
                    <td>
                      <select className="pset-cell pset-pick" value={m.direction}
                        onChange={e => void state.saveMeasure({ ...m, direction: e.target.value as Direction })}>
                        {DIRECTIONS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                      </select>
                    </td>
                    <td className="ms-x">
                      {/* The numbers are NOT deleted with the measure. Somebody
                          tidying up a list they no longer track must not lose a
                          year of readings by it, and putting the measure back
                          brings them all with it. */}
                      <button className="pset-x" aria-label={`Remove ${m.name}`}
                        onClick={() => {
                          if (!window.confirm(`Stop measuring ${m.name}?\n\nIts readings and targets are kept — put the measure back and they are all still here.`)) return;
                          void state.removeMeasure(m.id);
                        }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      <div className="ms-add">
        <label className="proj-field">
          <span className="field-label">Measure</span>
          <input className="text-input" value={name} maxLength={80} placeholder="Packs per minute"
            onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void add(); }} />
        </label>
        <label className="proj-field ms-add-unit">
          <span className="field-label">Unit</span>
          <input className="text-input" value={unit} maxLength={16} placeholder="ppm"
            onChange={e => setUnit(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void add(); }} />
        </label>
        <label className="proj-field">
          <span className="field-label">Which way is good</span>
          <select className="text-input" value={dir} onChange={e => setDir(e.target.value as Direction)}>
            {DIRECTIONS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </label>
        <button className="btn btn-primary ms-add-btn" disabled={!name.trim()} onClick={() => void add()}>Add measure</button>
      </div>
      <p className="chip-hint">
        Which way is good is not decoration — it is what tells the app that waste at 2.4 against 2.0 is
        bad while 61 ppm against 60 is good.
      </p>
    </div>
  );
}

function Periods({ state }: { state: ReturnType<typeof useMeasures> }) {
  const [name, setName] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [start, setStart] = useState(todayISO());

  const add = async () => {
    if (!name.trim()) return;
    await state.addPeriod(name, from || undefined, to || undefined);
    setName(''); setFrom(''); setTo('');
  };

  return (
    <div className="card ms-card">
      <div className="field-label">Periods</div>
      {state.periods.length === 0 ? (
        <>
          <p className="sub">
            A period is a name and two dates — “Q1”, “January”, “Vertical start-up”. Whatever this
            business calls the stretch of time a target belongs to.
          </p>
          <div className="ms-quarters">
            <label className="proj-field">
              <span className="field-label">Starting</span>
              <input className="text-input" type="date" value={start} onChange={e => setStart(e.target.value)} />
            </label>
            <button className="btn" onClick={() => void state.offerQuarters(start)}>
              Give me four quarters
            </button>
            <span className="chip-hint">Or add your own below — quarters are just the common case, not the rule.</span>
          </div>
        </>
      ) : (
        <div className="ms-table-wrap">
          <table className="ms-table">
            <thead><tr><th>Period</th><th>From</th><th>To</th><th className="ms-x" /></tr></thead>
            <tbody>
              {state.periods.map(p => (
                <tr key={p.id}>
                  <td><DraftText value={p.name} placeholder="Q1"
                    onSave={v => void state.savePeriod({ ...p, name: v || p.name })} /></td>
                  <td>
                    <input className="pset-cell" type="date" value={p.from ?? ''}
                      onChange={e => void state.savePeriod({ ...p, from: e.target.value || undefined })} />
                  </td>
                  <td>
                    <input className="pset-cell" type="date" value={p.to ?? ''}
                      onChange={e => void state.savePeriod({ ...p, to: e.target.value || undefined })} />
                  </td>
                  <td className="ms-x">
                    <button className="pset-x" aria-label={`Remove ${p.name}`}
                      onClick={() => {
                        if (!window.confirm(`Remove the period ${p.name}?\n\nThe readings stay; the targets set against it stop being shown.`)) return;
                        void state.removePeriod(p.id);
                      }}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="ms-add">
        <label className="proj-field">
          <span className="field-label">Period</span>
          <input className="text-input" value={name} maxLength={40} placeholder="Q1"
            onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void add(); }} />
        </label>
        <label className="proj-field">
          <span className="field-label">From</span>
          <input className="text-input" type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </label>
        <label className="proj-field">
          <span className="field-label">To</span>
          <input className="text-input" type="date" value={to} onChange={e => setTo(e.target.value)} />
        </label>
        <button className="btn btn-primary ms-add-btn" disabled={!name.trim()} onClick={() => void add()}>Add period</button>
      </div>
      <p className="chip-hint">
        The dates are what decide which period a reading falls in, and therefore which target it is
        judged against. A reading outside every period simply has no target — which the app says,
        rather than picking one.
      </p>
    </div>
  );
}

/** One number per line, per period, for one measure. A grid rather than a form
 *  per target: setting a quarter's aims for every line is one pass with Tab. */
function Targets({ state, lines }: { state: ReturnType<typeof useMeasures>; lines: PaceLineRow[] }) {
  if (!state.measures.length || !state.periods.length || !lines.length) return null;
  return (
    <>
      {state.measures.map(m => (
        <div key={m.id} className="card ms-card">
          <div className="field-label">
            {m.name} — target per line{m.unit && <span className="ms-unit-tag"> {m.unit}</span>}
          </div>
          <div className="ms-table-wrap">
            <table className="ms-table ms-targets">
              <thead>
                <tr>
                  <th>Line</th>
                  {state.periods.map(p => <th key={p.id} className="ms-tnum">{p.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {lines.map(l => {
                  const row = state.targetsAcross(l.id, m.id);
                  return (
                    <tr key={l.id}>
                      <th scope="row" className="ms-line">{l.name}</th>
                      {row.map(({ period, value }) => (
                        <td key={period.id} className="ms-tnum">
                          <DraftNumber value={value} label={`${l.name}, ${m.name}, ${period.name}`}
                            onSave={v => void state.setTarget(l.id, m.id, period.id, v)} />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="chip-hint">Leave a cell blank for a period with no target — the app then says “no target set” rather than judging the line against nothing.</p>
        </div>
      ))}
    </>
  );
}

export function MeasuresSetup({ projectId, lines }: { projectId: string; lines: PaceLineRow[] }) {
  const state = useMeasures(projectId);
  if (state.loading) return null;
  return (
    <section className="pace-sec">
      <div className="pace-sec-head">
        <h2 className="pace-sec-title">What this project measures</h2>
        <p className="pace-sec-sub">
          Your measures, your periods, your targets — in your own words and units · every number on the
          line packs and the report comes from these
        </p>
      </div>
      <Measures state={state} />
      <Periods state={state} />
      <Targets state={state} lines={lines} />
    </section>
  );
}
