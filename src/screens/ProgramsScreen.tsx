/* WHAT THE MACHINE CAN RUN — the same two halves as Materials, on purpose.
 *
 *   THE GRID answers "can we run it?" — every row a program, every column a
 *   week. Green from the week it was proved, amber where it is on the machine
 *   but unproved, hollow where it does not exist, and a ring on the week its
 *   test is booked. The same picture the films are read off, so nobody has to
 *   learn a second one.
 *
 *   THE LIST answers "what is going to bite?" — the test dates that have gone
 *   first, then what is booked, then what nobody has dated, then what is
 *   proved. This is where the editing happens, so nothing is typed into a cell.
 *
 * The one thing this screen insists on that Materials does not: PROVED NEEDS A
 * DATE. Marking something proved asks which day, because the word on its own is
 * an opinion and the date is the fact.
 */
import { useState } from 'react';
import { nav } from '../state/useRoute';
import { AccountMenu } from '../ui/AccountMenu';
import { Crumbs } from '../ui/Crumbs';
import { Peers, projectPeers } from '../ui/Peers';
import { useStanding } from '../lib/useStanding';
import { DraftText } from '../ui/Draft';
import { useProject } from '../lib/useProjects';
import { usePaceLines } from '../lib/usePaceLines';
import { usePrograms } from '../lib/usePrograms';
import {
  daysOverdue, fillIn, isProved, monthSpans, readProgramPaste, standingOf,
  STATE_WORD, stateOf, testedIn, todayISO,
  type Program, type Week,
} from '../lib/programs';

const nice = (iso?: string): string => {
  if (!iso) return '—';
  const t = Date.parse(iso + 'T12:00:00');
  return Number.isFinite(t) ? new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : iso;
};

/** When it is settled, in words — "in 4 days" is read faster than a date, and
 *  the date is right beside it anyway. */
function when(p: Program, today: string): string {
  if (isProved(p)) return `proved ${nice(p.provedOn)}`;
  if (!p.testOn) return 'no test date';
  const late = daysOverdue(p, today);
  if (late != null) return late === 1 ? 'test was yesterday' : `test was ${late} days ago`;
  const days = Math.round((Date.parse(p.testOn + 'T12:00:00') - Date.parse(today + 'T12:00:00')) / 86_400_000);
  if (days === 0) return 'testing today';
  if (days === 1) return 'testing tomorrow';
  return `testing in ${days} days`;
}

/* ================================== the grid ================================ */

/* `today` is used for ONE thing here: whether a booked test date has gone. The
   colours themselves come off the program's own two dates, not off a comparison
   with now — something proved in March is green in March. */
function Grid({ rows, weeks, today }: { rows: Program[]; weeks: Week[]; today: string }) {
  if (!rows.length || !weeks.length) return null;
  return (
    <div className="mt-grid-wrap">
      <table className="mt-grid">
        <thead>
          <tr>
            <th className="mt-grid-item" rowSpan={2} scope="col">Program</th>
            <th className="mt-grid-when" rowSpan={2} scope="col">Where it&rsquo;s got to</th>
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
          {rows.map(p => (
            <tr key={p.id}>
              <th scope="row" className="mt-grid-item">
                {p.what}
                {p.runs && <span className="pg-grid-runs">{p.runs}</span>}
              </th>
              {/* The state AND its date. The word alone cannot answer "when are
                  we testing them", which is half of what this screen is for,
                  and the report's version of this grid already said both —
                  the two drawings of one picture should not disagree. */}
              <td className={'mt-grid-when is-pg-' + stateOf(p)}>
                {isProved(p) ? nice(p.provedOn) : STATE_WORD[stateOf(p)]}
                {!isProved(p) && p.testOn && (
                  <span className="mt-grid-test">test {nice(p.testOn)}</span>
                )}
                {daysOverdue(p, today) != null && (
                  <span className="mt-grid-late">{daysOverdue(p, today)}d ago</span>
                )}
              </td>
              {weeks.map(w => {
                const fill = fillIn(p, w);
                const booked = testedIn(p, w);
                return (
                  <td key={w.start}
                    className={`mt-cell pg-cell is-${fill}` + (booked ? ' is-booked' : '')}
                    aria-label={`${p.what}: ${
                      fill === 'proved' ? 'proved' : fill === 'machine' ? 'on the machine, not proved' : 'not written'
                    }${booked ? ', test booked' : ''} in the week of ${nice(w.start)}`} />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="pg-key">
        <span className="pg-key-i"><span className="pg-sw is-proved" aria-hidden /> Proved</span>
        <span className="pg-key-i"><span className="pg-sw is-machine" aria-hidden /> On the machine</span>
        <span className="pg-key-i"><span className="pg-sw is-none" aria-hidden /> Not written</span>
        <span className="pg-key-i"><span className="pg-ring" aria-hidden /> Test booked</span>
      </p>
    </div>
  );
}

/* ================================== the list ================================ */

function Row({ p, today, lineName, state }: {
  p: Program; today: string; lineName?: string;
  state: ReturnType<typeof usePrograms>;
}) {
  const [proving, setProving] = useState(false);
  const [on, setOn] = useState(todayISO());
  const where = standingOf(p, today);
  const got = stateOf(p);

  const facts = [p.runs && `runs ${p.runs}`, lineName, p.from && `from ${p.from}`].filter(Boolean).join(' · ');

  return (
    <div className={'mt-row is-pg-' + where}>
      <div className="mt-row-main">
        <DraftText className="mt-what" value={p.what} placeholder="Program name or number"
          onSave={v => void state.save({ ...p, what: v || p.what })} />
        {facts && <div className="mt-facts">{facts}</div>}
        {p.note && <div className="mt-facts">{p.note}</div>}
        {isProved(p) && !p.testId && (
          <div className="mt-facts pg-byhand">signed off by hand — no test behind it</div>
        )}
      </div>

      {/* Where it's got to. A select, not a toggle: three states are three
          states, and a cycling button hides the one you are not looking at. */}
      <label className="pg-state">
        <span className="field-label">Where it&rsquo;s got to</span>
        <select className={'text-input pg-state-sel is-pg-' + got}
          value={got} aria-label={`Where ${p.what} has got to`}
          onChange={e => {
            const next = e.target.value as typeof got;
            if (next === 'proved') { setOn(todayISO()); setProving(true); return; }
            void state.save({ ...p, state: next, provedOn: undefined });
          }}>
          <option value="needed">Not written</option>
          <option value="onMachine">On the machine</option>
          <option value="proved">Proved</option>
        </select>
      </label>

      <div className="mt-when">
        <span className={'mt-when-n is-pg-' + where}>{when(p, today)}</span>
        {!isProved(p) && (
          <input className="mt-due" type="date" aria-label={`Date ${p.what} is being tested`}
            value={p.testOn ?? ''} onChange={e => void state.save({ ...p, testOn: e.target.value || undefined })} />
        )}
      </div>

      {proving ? (
        <div className="mt-mark">
          <label className="mt-mark-l" htmlFor={`pv-${p.id}`}>Proved on</label>
          <input id={`pv-${p.id}`} className="mt-due" type="date" value={on} onChange={e => setOn(e.target.value)} />
          <button className="btn btn-primary btn-sm"
            onClick={() => { void state.markProved(p.id, on); setProving(false); }}>It&rsquo;s proved</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setProving(false)}>Cancel</button>
        </div>
      ) : isProved(p) ? (
        <button className="btn btn-ghost btn-sm mt-act" onClick={() => void state.markUnproved(p.id)}>
          Not proved after all
        </button>
      ) : (
        <button className="btn btn-sm mt-act mt-in" onClick={() => { setOn(todayISO()); setProving(true); }}>
          Mark it proved
        </button>
      )}

      <button className="pset-x" aria-label={`Remove ${p.what}`}
        onClick={() => { if (window.confirm(`Take “${p.what}” off the list?`)) void state.remove(p.id); }}>×</button>
    </div>
  );
}

function AddProgram({ state, lines }: {
  state: ReturnType<typeof usePrograms>;
  lines: { id: string; name: string }[];
}) {
  const [what, setWhat] = useState('');
  const [runs, setRuns] = useState('');
  const [testOn, setTestOn] = useState('');
  const [lineId, setLineId] = useState('');
  const [from, setFrom] = useState('');

  const add = async () => {
    if (!what.trim()) return;
    await state.add({ what, runs, testOn, lineId, from });
    setWhat(''); setRuns(''); setTestOn(''); setFrom('');
  };

  return (
    <div className="card mt-add-card">
      <div className="field-label">Add a program</div>
      <div className="mt-add">
        <label className="proj-field mt-add-what">
          <span className="field-label">Name or number</span>
          <input className="text-input" value={what} maxLength={160} placeholder="P-104 perforation"
            onChange={e => setWhat(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void add(); }} />
        </label>
        <label className="proj-field mt-add-much">
          <span className="field-label">What it runs</span>
          <input className="text-input" value={runs} maxLength={80} placeholder="Finest Red 2kg"
            onChange={e => setRuns(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void add(); }} />
        </label>
        <label className="proj-field mt-add-due">
          <span className="field-label">Testing on</span>
          <input className="text-input" type="date" value={testOn} onChange={e => setTestOn(e.target.value)} />
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
          <input className="text-input" value={from} maxLength={80} placeholder="Who owes it"
            onChange={e => setFrom(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void add(); }} />
        </label>
        <button className="btn btn-primary mt-add-btn" disabled={!what.trim()} onClick={() => void add()}>Add it</button>
      </div>
      <p className="chip-hint">
        Only the first box is needed. A new program starts as <b>not written</b>, and a program nobody has
        booked a test for says so rather than being given a date it has not got.
      </p>
    </div>
  );
}

/** The list, pasted straight out of wherever it lives — a spreadsheet, or the
 *  OEM's email. Reads each ROW, not the headings: the first cell with words in
 *  it is the program, a date to its right is when it is being tested, a word
 *  like "proved" or "on machine" sets where it has got to, and anything else
 *  wordy is taken as what it runs. */
function PasteList({ state }: { state: ReturnType<typeof usePrograms> }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [said, setSaid] = useState('');
  const [busy, setBusy] = useState(false);

  const rows = readProgramPaste(text);
  const ok = rows.filter(r => !r.problem);
  const bad = rows.filter(r => r.problem);

  const doImport = async () => {
    setBusy(true);
    try {
      await state.importRows(ok.map(r => ({
        what: r.what, runs: r.runs, state: r.state, testOn: r.testOn, provedOn: r.provedOn,
      })));
      setSaid(`${ok.length} added.`);
      setText('');
    } finally { setBusy(false); }
  };

  return (
    <section className="ppm-editor">
      <button className="ppm-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="ppm-toggle-ic" aria-hidden>{open ? '▾' : '▸'}</span>
        Paste a list of programs
        <span className="ppm-toggle-sub">headings and all · it takes what it recognises</span>
      </button>

      {open && (
        <div className="ppm-body">
          <label className="proj-field">
            <span className="field-label">Paste it in</span>
            <textarea className="text-input pn-text" rows={6} value={text}
              placeholder={'P-104 perforation\tFinest Red 2kg\tproved\nP-121 perforation\tAll Rounder 2kg\t29-Sep\nP-141 perforation\tExpress Piper 1.25kg'}
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
                      <span className="mt-preview-when">
                        {r.provedOn ? `proved ${nice(r.provedOn)}` : r.testOn ? `test ${nice(r.testOn)}` : STATE_WORD[r.state]}
                      </span>
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
                  A row with a name and nothing else is still a program — needing one, with no date agreed, is
                  the commonest row on a list like this. Nothing is written until you press Add.
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

export function ProgramsScreen({ projectId }: { projectId: string }) {
  const { loading, project } = useProject(projectId);
  const lines = usePaceLines(projectId);
  const state = usePrograms(projectId);
  /* The numbers on the peers row come from lib/standing.ts, the same call the
     dashboard and the client report make — a row that said something different
     from the page under it would be the whole problem back again. */
  const stand = useStanding(projectId);
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
        { label: 'Programs' },
      ]} />
      <Peers peers={projectPeers(projectId, 'programs', stand.counts)} />

      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pace-eyebrow">What the machine can run</p>
          <h1 className="pace-title">Programs</h1>
          <p className="pace-lede">
            What this line has to be able to run, whether the program exists yet, and when we find out
            it works. Having a program is not the same as trusting it — so there are three states here,
            not two, and proved always carries the day it was proved.
          </p>
        </div>
        <div className="pace-head-actions">
          <AccountMenu />
        </div>
      </header>

      {t.total === 0 ? (
        <>
          <div className="pace-empty">
            <p className="sub">
              Nothing on the list yet. Add the programs this line needs, or paste the list from wherever it
              already lives.
            </p>
          </div>
          <PasteList state={state} />
          <AddProgram state={state} lines={lines.lines} />
        </>
      ) : (
        <>
          <div className="pace-kpis">
            <div className={'pace-kpi' + (t.proved > 0 ? ' is-good' : '')}>
              <span className="pace-kpi-n">{t.proved}</span>
              <span className="pace-kpi-l">proved</span>
              <span className="pace-kpi-s">of {t.total} on the list</span>
            </div>
            <div className="pace-kpi">
              <span className="pace-kpi-n">{t.onMachine}</span>
              <span className="pace-kpi-l">on the machine</span>
              <span className="pace-kpi-s">written, not proved</span>
            </div>
            <div className="pace-kpi">
              <span className="pace-kpi-n">{t.needed}</span>
              <span className="pace-kpi-l">not written</span>
              <span className="pace-kpi-s">
                {t.nextTest ? `next test ${nice(t.nextTest)}` : 'nobody has made them'}
              </span>
            </div>
            {t.overdue > 0 && (
              <div className="pace-kpi is-bad">
                <span className="pace-kpi-n">{t.overdue}</span>
                <span className="pace-kpi-l">test date gone</span>
                <span className="pace-kpi-s">the day came and went</span>
              </div>
            )}
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
              <h2 className="pace-sec-title">Can we run it?</h2>
              <p className="pace-sec-sub">
                Every row a program, every column a week · green from the week it was proved · this prints on the report
              </p>
            </div>
            <Grid rows={state.programs} weeks={state.weeks} today={today} />
          </section>

          <section className="pace-sec">
            <div className="pace-sec-head">
              <h2 className="pace-sec-title">What is going to bite</h2>
              <p className="pace-sec-sub">Test dates that have gone first, then what is booked, then what nobody has dated, then what is proved</p>
            </div>
            <div className="mt-list">
              {state.programs.map(p => (
                <Row key={p.id} p={p} today={today} lineName={lineName(p.lineId)} state={state} />
              ))}
            </div>
          </section>

          <PasteList state={state} />
          <AddProgram state={state} lines={lines.lines} />
        </>
      )}

      <footer className="pace-foot">
        <p>{project.name} · what the machine can run</p>
      </footer>
    </div>
  );
}
