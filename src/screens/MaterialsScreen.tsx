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
 * The plan is kept here, one thing at a time — nothing is pasted in from a
 * spreadsheet any more.
 */
import { AddFold } from '../ui/AddFold';
import { DateWhy } from '../ui/DateWhy';
import { keyOf } from '../lib/story';
import { useState } from 'react';
import { nav } from '../state/useRoute';
import { Crumbs } from '../ui/Crumbs';
import { Peers, projectPeers, methodPeers } from '../ui/Peers';
import { useMethodCounts } from '../lib/useMethodCounts';
import { ProgramsScreen } from './ProgramsScreen';
import { useStanding } from '../lib/useStanding';
import { DraftText } from '../ui/Draft';
import { WeekHead, WeekStrip } from '../ui/Weeks';
import { useProject } from '../lib/useProjects';
import { usePaceLines } from '../lib/usePaceLines';
import { useMaterials } from '../lib/useMaterials';
import {
  coveredIn, daysLate, isHere, landsIn, stateOf, todayISO,
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

/* ================== the weeks, on each row (ui/Weeks) ===================== */
function Strip({ m, weeks, today }: { m: Material; weeks: Week[]; today: string }) {
  const from = weeks.find(w => coveredIn(m, w, today));
  return (
    <WeekStrip n={weeks.length} label={`${m.what}: ${from ? `covered from the week of ${nice(from.start)}` : 'not covered in these weeks'}`}>
      {weeks.map(w => {
        const on = coveredIn(m, w, today), lands = landsIn(m, w, today);
        return <span key={w.start} className={'mt-cell' + (on ? ' is-on' : '') + (lands ? ' is-lands' : '')}>{lands && <span className="mt-cell-d">{nice(m.due)}</span>}</span>;
      })}
    </WeekStrip>
  );
}

/* ================================== the list ================================ */

function Row({ m, today, lineName, state, weeks }: {
  m: Material; today: string; lineName?: string; weeks: Week[];
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
          <DateWhy className="mt-due" ariaLabel={`Date ${m.what} is due`} value={m.due}
            projectId={m.projectId} storyKey={keyOf('material', m.id)} what={m.what}
            onChange={v => state.save({ ...m, due: v })} />
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
        onClick={() => void state.remove(m.id)}>×</button>
      <Strip m={m} weeks={weeks} today={today} />
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

/* ================================ the screen ================================ */

export function MaterialsScreen({ projectId }: { projectId: string }) {
  const { loading, project } = useProject(projectId);
  const lines = usePaceLines(projectId);
  const state = useMaterials(projectId);
  /* The numbers on the peers row come from lib/standing.ts, the same call the
     dashboard and the client report make — a row that said something different
     from the page under it would be the whole problem back again. */
  const stand = useStanding(projectId);
  const counts = useMethodCounts(projectId);
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
      {/* The header every peer of this screen wears — the project above, the
          screen's name, then where it has got to in one line. It had its own
          eyebrow, a lede paragraph and a rule, and read as a different app
          from the Install tab beside it. The lede says what the screen is for,
          so it is said where that is news: on the empty list. */}
      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pace-eyebrow">{project.name}</p>
          <h1 className="pace-title">Materials</h1>
          <p className="cw-handover">
            {t.total === 0
              ? <b>Nothing on the list yet</b>
              : <>
                <b>{t.here} of {t.total} here</b>
                {t.late > 0 && <span className="sub in-late">{t.late} late</span>}
                {t.waiting > 0 && <span className="sub">{t.waiting} waiting{t.nextDue ? `, next due ${nice(t.nextDue)}` : ''}</span>}
                {t.undated > 0 && <span className="sub">{t.undated} with no date</span>}
              </>}
          </p>
        </div>
      </header>
      {/* The row under the header — see "THE PAGE FRAME" in styles.css.
          The gates are a stage-gate job's. A 3P job's Materials showed
          Install, Set up, Commission — tabs for a method it is not run on. */}
      {project.commissioning
        ? <Peers peers={projectPeers(projectId, 'materials', stand.counts)} />
        : <Peers peers={methodPeers(projectId, project.leverTree ? 'tree' : 'board', 'materials', counts)} />}

      {t.total === 0 ? (
        <>
          <div className="pace-empty">
            <p className="sub">
              What this job needs before it can run properly, when each thing is due, and whether it has
              turned up — the same list you keep in the plan, except it works out what is late. Add what
              you are waiting on.
            </p>
          </div>
        </>
      ) : (
        <>
          {/* ONE LIST. The tiles said what the header line says; the week
              grid and the list were the same records twice. Each row carries
              its weeks now; the A3 report still prints the grid. */}
          <section className="pace-sec">
            <div className="pace-sec-head">
              <h2 className="pace-sec-title">What we are waiting on</h2>
              <p className="pace-sec-sub">Late first, then what is coming, then what nobody has dated, then what is in · green from the week it lands · this prints on the report</p>
            </div>
            <div className="mt-list">
              <WeekHead weeks={state.weeks} months={monthSpans(state.weeks)} />
              {state.materials.map(m => (
                <Row key={m.id} m={m} today={today} lineName={lineName(m.lineId)} state={state} weeks={state.weeks} />
              ))}
            </div>
          </section>
        </>
      )}

      {/* OUTSIDE THE BRANCH ON PURPOSE — the fix Programs already has. It sat
          in both arms, so adding the FIRST thing swapped arms, unmounted the
          form and folded it shut: the line just picked was gone and the
          second thing needed "+ Add what you need" first. */}
      <AddFold label="Add what you need" start={t.total === 0}><AddMaterial state={state} lines={lines.lines} /></AddFold>

      {/* WHAT THE MACHINE CAN RUN, beside what it is waiting for — the two
          answer one question between them. On a stage-gate job Programs is
          held by Set up; on a 3P or tree job it is held here, and the row of
          tabs stays six long. */}
      {!project.commissioning && <ProgramsScreen projectId={projectId} embedded />}

      <footer className="pace-foot">
        <p>{project.name} · what we are waiting on</p>
      </footer>
    </div>
  );
}
