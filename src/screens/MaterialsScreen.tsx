/* WHAT WE ARE WAITING ON — the sheet, in the app.
 *
 * Two halves, deliberately, because they answer two different questions:
 *
 *   THE GRID answers "are we covered?" — every row a thing we need, every
 *   column a week, green from the week it lands. That is the picture Rowland
 *   already reads his line off, and it is the one thing a list cannot show: you
 *   can see the whole plan close up week by week without reading a date.
 *
 *   THE LIST answers "what is holding us up?" — late first, then what is
 *   coming, then what nobody has dated, then what is already in. This is where
 *   the editing happens, so nothing has to be typed into a grid cell.
 *
 * The plan is PASTED, not retyped: it lives in a spreadsheet and always will.
 */
import { useState } from 'react';
import { nav } from '../state/useRoute';
import { AccountMenu } from '../ui/AccountMenu';
import { Crumbs } from '../ui/Crumbs';
import { DraftText } from '../ui/Draft';
import { useProject } from '../lib/useProjects';
import { usePaceLines } from '../lib/usePaceLines';
import { useMaterials } from '../lib/useMaterials';
import {
  coveredIn, daysLate, isHere, landsIn, readMaterialPaste, stateOf, todayISO,
  type Material, type Week,
} from '../lib/materials';

const nice = (iso?: string): string => {
  if (!iso) return '—';
  const t = Date.parse(iso + 'T12:00:00');
  return Number.isFinite(t) ? new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : iso;
};

/** How far off it is, in words, because "in 4 days" is read faster than a date
 *  and the date is right beside it anyway. */
function when(m: Material, today: string): string {
  if (isHere(m)) return m.inOn ? `in on ${nice(m.inOn)}` : 'in stock';
  if (!m.due) return 'no date';
  const late = daysLate(m, today);
  if (late != null) return late === 1 ? '1 day late' : `${late} days late`;
  const days = Math.round((Date.parse(m.due + 'T12:00:00') - Date.parse(today + 'T12:00:00')) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

/* ================================== the grid ================================ */

/** The month band across the top: each month printed once, over the run of
 *  weeks that share it. */
function monthSpans(weeks: Week[]): { month: string; span: number }[] {
  const out: { month: string; span: number }[] = [];
  for (const w of weeks) {
    const last = out[out.length - 1];
    if (last && last.month === w.month) last.span += 1;
    else out.push({ month: w.month, span: 1 });
  }
  return out;
}

function Grid({ rows, weeks, today }: { rows: Material[]; weeks: Week[]; today: string }) {
  if (!rows.length || !weeks.length) return null;
  return (
    <div className="mt-grid-wrap">
      <table className="mt-grid">
        <thead>
          <tr>
            <th className="mt-grid-item" rowSpan={2} scope="col">What we need</th>
            <th className="mt-grid-when" rowSpan={2} scope="col">Planned for arrival</th>
            {monthSpans(weeks).map(m => (
              <th key={m.month} colSpan={m.span} scope="colgroup" className="mt-grid-month">{m.month}</th>
            ))}
          </tr>
          <tr>
            {weeks.map(w => (
              <th key={w.start} scope="col" className="mt-grid-wk" title={`week commencing ${nice(w.start)}`}>
                {w.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(m => (
            <tr key={m.id}>
              <th scope="row" className="mt-grid-item">{m.what}</th>
              <td className={'mt-grid-when is-' + stateOf(m, today)}>
                {isHere(m) ? 'In stock' : m.due ? nice(m.due) : '—'}
              </td>
              {weeks.map(w => {
                const on = coveredIn(m, w, today);
                const lands = landsIn(m, w, today);
                return (
                  /* The date goes IN the week it lands, not only in the column
                     at the side. The grid said whether a week was covered and
                     never when, so anybody wanting the day had to break off,
                     find the row in the side column and come back. */
                  <td key={w.start} className={'mt-cell' + (on ? ' is-on' : '') + (lands ? ' is-lands' : '')}
                    aria-label={`${m.what}: ${on ? 'covered' : 'not covered'} in the week of ${nice(w.start)}${
                      lands ? `, due ${nice(m.due)}` : ''}`}>
                    {lands && <span className="mt-cell-d">{nice(m.due)}</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ================================== the list ================================ */

function Row({ m, today, lineName, state }: {
  m: Material; today: string; lineName?: string;
  state: ReturnType<typeof useMaterials>;
}) {
  const [marking, setMarking] = useState(false);
  const [on, setOn] = useState(todayISO());
  const where = stateOf(m, today);

  const facts = [m.howMuch, lineName, m.from && `from ${m.from}`].filter(Boolean).join(' · ');

  return (
    <div className={'mt-row is-' + where}>
      <div className="mt-row-main">
        <DraftText className="mt-what" value={m.what} placeholder="What it is"
          onSave={v => void state.save({ ...m, what: v || m.what })} />
        {facts && <div className="mt-facts">{facts}</div>}
        {m.note && <div className="mt-facts">{m.note}</div>}
      </div>

      <div className="mt-when">
        <span className={'mt-when-n is-' + where}>{when(m, today)}</span>
        {!isHere(m) && (
          <input className="mt-due" type="date" aria-label={`Date ${m.what} is due`}
            value={m.due ?? ''} onChange={e => void state.save({ ...m, due: e.target.value || undefined })} />
        )}
      </div>

      {marking ? (
        <div className="mt-mark">
          <label className="mt-mark-l" htmlFor={`in-${m.id}`}>In on</label>
          <input id={`in-${m.id}`} className="mt-due" type="date" value={on} onChange={e => setOn(e.target.value)} />
          <button className="btn btn-primary btn-sm"
            onClick={() => { void state.markIn(m.id, on); setMarking(false); }}>It’s in</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setMarking(false)}>Cancel</button>
        </div>
      ) : isHere(m) ? (
        <button className="btn btn-ghost btn-sm mt-act" onClick={() => void state.markOut(m.id)}>
          Not in after all
        </button>
      ) : (
        <button className="btn btn-sm mt-act mt-in" onClick={() => { setOn(todayISO()); setMarking(true); }}>
          Mark it in
        </button>
      )}

      <button className="pset-x" aria-label={`Remove ${m.what}`}
        onClick={() => { if (window.confirm(`Take “${m.what}” off the list?`)) void state.remove(m.id); }}>×</button>
    </div>
  );
}

function AddMaterial({ state, lines }: {
  state: ReturnType<typeof useMaterials>;
  lines: { id: string; name: string }[];
}) {
  const [what, setWhat] = useState('');
  const [howMuch, setHowMuch] = useState('');
  const [due, setDue] = useState('');
  const [lineId, setLineId] = useState('');
  const [from, setFrom] = useState('');

  const add = async () => {
    if (!what.trim()) return;
    await state.add({ what, howMuch, due, lineId, from });
    setWhat(''); setHowMuch(''); setDue(''); setFrom('');
  };

  return (
    <div className="card mt-add-card">
      <div className="field-label">Add what you need</div>
      <div className="mt-add">
        <label className="proj-field mt-add-what">
          <span className="field-label">What it is</span>
          <input className="text-input" value={what} maxLength={160} placeholder="TESC03163A Finest Red 2kg"
            onChange={e => setWhat(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void add(); }} />
        </label>
        <label className="proj-field mt-add-much">
          <span className="field-label">How much</span>
          <input className="text-input" value={howMuch} maxLength={40} placeholder="10 reels"
            onChange={e => setHowMuch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void add(); }} />
        </label>
        <label className="proj-field mt-add-due">
          <span className="field-label">Due</span>
          <input className="text-input" type="date" value={due} onChange={e => setDue(e.target.value)} />
        </label>
        {lines.length > 0 && (
          <label className="proj-field">
            <span className="field-label">For</span>
            <select className="text-input" value={lineId} onChange={e => setLineId(e.target.value)}>
              <option value="">the whole project</option>
              {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
        )}
        <label className="proj-field">
          <span className="field-label">From</span>
          <input className="text-input" value={from} maxLength={80} placeholder="Who is bringing it"
            onChange={e => setFrom(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void add(); }} />
        </label>
        <button className="btn btn-primary mt-add-btn" disabled={!what.trim()} onClick={() => void add()}>Add it</button>
      </div>
      <p className="chip-hint">Only the first box is needed. A thing with no date agreed is a real state, and the list says so rather than inventing one.</p>
    </div>
  );
}

/** The plan, pasted straight out of the spreadsheet it lives in.
 *
 *  It reads each ROW rather than the column headings, because the sheet has a
 *  merged title, a heading row and a dozen week columns that mean nothing here.
 *  The first cell with words in it is the thing; somewhere to its right is
 *  either a date or the words "in stock". A row with neither is not a material,
 *  which is how the title and the headings take themselves out. */
function PastePlan({ state }: { state: ReturnType<typeof useMaterials> }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [said, setSaid] = useState('');
  const [busy, setBusy] = useState(false);

  const rows = readMaterialPaste(text);
  const ok = rows.filter(r => !r.problem);
  const bad = rows.filter(r => r.problem);

  const doImport = async () => {
    setBusy(true);
    try {
      await state.importRows(ok.map(r => ({ what: r.what, due: r.due, here: r.here })));
      setSaid(`${ok.length} added.`);
      setText('');
    } finally { setBusy(false); }
  };

  return (
    <section className="ppm-editor">
      <button className="ppm-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="ppm-toggle-ic" aria-hidden>{open ? '▾' : '▸'}</span>
        Paste the plan from a spreadsheet
        <span className="ppm-toggle-sub">title row and all · it takes what it recognises</span>
      </button>

      {open && (
        <div className="ppm-body">
          <label className="proj-field">
            <span className="field-label">Paste it in</span>
            <textarea className="text-input pn-text" rows={6} value={text}
              placeholder={'TESC03163A Finest Red 2kg\t\t21-Sep\nTESC03185B Jacks White 2kg\tIn stock'}
              onChange={e => { setText(e.target.value); setSaid(''); }} />
          </label>

          {said && <p className="chip-note is-good">{said}</p>}

          {rows.length > 0 && (
            <>
              <div className="pn-verdict">
                <span className={'pn-count' + (ok.length ? ' is-good' : '')}>{ok.length} to add</span>
                {bad.length > 0 && (
                  <span className="pn-count">{bad.length} {bad.length === 1 ? 'row' : 'rows'} skipped</span>
                )}
              </div>

              {ok.length > 0 && (
                <ul className="mt-preview">
                  {ok.slice(0, 6).map(r => (
                    <li key={r.rowNo}>
                      <span className="mt-preview-what">{r.what}</span>
                      <span className="mt-preview-when">{r.here ? 'in stock' : nice(r.due)}</span>
                    </li>
                  ))}
                  {ok.length > 6 && <li className="sub">…and {ok.length - 6} more</li>}
                </ul>
              )}

              {bad.length > 0 && (
                <ul className="pn-problems">
                  {bad.slice(0, 4).map(r => <li key={r.rowNo}>Row {r.rowNo} — {r.problem}</li>)}
                  {bad.length > 4 && <li className="sub">…and {bad.length - 4} more like it</li>}
                </ul>
              )}

              <div className="ppm-week-actions">
                <button className="btn btn-primary" disabled={busy || !ok.length} onClick={() => void doImport()}>
                  {busy ? 'Adding…' : `Add ${ok.length}`}
                </button>
                <button className="btn btn-ghost" onClick={() => { setText(''); setSaid(''); }}>Clear</button>
                <span className="ppm-hint">
                  The rows it skips are the title and the headings — nothing is written until you press Add.
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

/* ================================ the screen ================================ */

export function MaterialsScreen({ projectId }: { projectId: string }) {
  const { loading, project } = useProject(projectId);
  const lines = usePaceLines(projectId);
  const state = useMaterials(projectId);
  const today = todayISO();

  if (loading || state.loading || lines.loading) {
    return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  }
  if (!project) {
    return (
      <div className="wrap pace">
        <p className="sub" style={{ marginTop: 24 }}>That project isn’t here any more.</p>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => nav('/projects')}>All projects</button>
      </div>
    );
  }

  const { tally: t } = state;
  const lineName = (id?: string) => lines.lines.find(l => l.id === id)?.name;

  return (
    <div className="wrap pace">
      <Crumbs trail={[
        { label: 'Projects', to: '/projects' },
        { label: project.name, to: `/project/${projectId}` },
        { label: 'Materials' },
      ]} />

      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pace-eyebrow">What we need</p>
          <h1 className="pace-title">Materials</h1>
          <p className="pace-lede">
            What this job needs before it can run properly, when each thing is due, and whether it has
            turned up. The same list you keep in the plan — except it works out what is late.
          </p>
        </div>
        <div className="pace-head-actions">
          <button className="btn btn-primary" onClick={() => nav(`/project/${projectId}`)}>Open project</button>
          <AccountMenu />
        </div>
      </header>

      {t.total === 0 ? (
        <>
          <div className="pace-empty">
            <p className="sub">
              Nothing on the list yet. Add what you are waiting on, or paste the plan straight out of the
              spreadsheet it already lives in.
            </p>
          </div>
          <PastePlan state={state} />
          <AddMaterial state={state} lines={lines.lines} />
        </>
      ) : (
        <>
          <div className="pace-kpis">
            <div className={'pace-kpi' + (t.late > 0 ? ' is-bad' : '')}>
              <span className="pace-kpi-n">{t.late}</span>
              <span className="pace-kpi-l">late</span>
              <span className="pace-kpi-s">past the date, still not here</span>
            </div>
            <div className="pace-kpi">
              <span className="pace-kpi-n">{t.waiting}</span>
              <span className="pace-kpi-l">waiting</span>
              <span className="pace-kpi-s">{t.nextDue ? `next one due ${nice(t.nextDue)}` : 'nothing dated'}</span>
            </div>
            <div className={'pace-kpi' + (t.here > 0 ? ' is-good' : '')}>
              <span className="pace-kpi-n">{t.here}</span>
              <span className="pace-kpi-l">here</span>
              <span className="pace-kpi-s">of {t.total} on the list</span>
            </div>
            {t.undated > 0 && (
              <div className="pace-kpi is-warn">
                <span className="pace-kpi-n">{t.undated}</span>
                <span className="pace-kpi-l">no date</span>
                <span className="pace-kpi-s">nobody has said when</span>
              </div>
            )}
          </div>

          <section className="pace-sec">
            <div className="pace-sec-head">
              <h2 className="pace-sec-title">Are we covered?</h2>
              <p className="pace-sec-sub">
                Every row a thing we need, every column a week · green from the week it lands · this prints on the report
              </p>
            </div>
            <Grid rows={state.materials} weeks={state.weeks} today={today} />
          </section>

          <section className="pace-sec">
            <div className="pace-sec-head">
              <h2 className="pace-sec-title">What is holding us up</h2>
              <p className="pace-sec-sub">Late first, then what is coming, then what nobody has dated, then what is in</p>
            </div>
            <div className="mt-list">
              {state.materials.map(m => (
                <Row key={m.id} m={m} today={today} lineName={lineName(m.lineId)} state={state} />
              ))}
            </div>
          </section>

          <PastePlan state={state} />
          <AddMaterial state={state} lines={lines.lines} />
        </>
      )}

      <footer className="pace-foot">
        <p>{project.name} · what we are waiting on</p>
      </footer>
    </div>
  );
}
