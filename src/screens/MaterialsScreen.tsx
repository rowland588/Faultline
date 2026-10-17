/* WHAT WE ARE WAITING ON — the sheet, in the app.
 *
 * Two halves, deliberately, because they answer two different questions:
 *
 *   THE GRID answers "are we covered?" — every row a thing we need, every
 *   column a week, filled from the week it lands. That is the picture Rowland
 *   already reads his line off, and it is the one thing a list cannot show: you
 *   can see the whole plan close up week by week without reading a date.
 *   The fill is indigo while it is still coming and green once it is in —
 *   green is done, everywhere (Rowland, 4 October); it used to be green from
 *   the week it was due, before anything had arrived.
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
import { DateInput } from '../ui/DateInput';
import { keyOf } from '../lib/story';
import { useRef, useState } from 'react';
import { nav } from '../state/useRoute';
import { ProgramsScreen } from './ProgramsScreen';
import { WeekHead, WeekStrip } from '../ui/Weeks';
import { useProject } from '../lib/useProjects';
import { usePaceLines } from '../lib/usePaceLines';
import { useMaterials } from '../lib/useMaterials';
import { LeanClosing, LeanTiles } from '../ui/Lean';
import { useJobMoney } from '../lib/useJobMoney';
import { MONEY_WAIT, materialClosing, materialTiles } from '../lib/stageGatePages';
import {
  coveredIn, isHere, landsIn, stateOf, todayISO,
  type Material, type Week,
} from '../lib/materials';
import { Icon } from '../ui/Icon';
/* "3 days late", "in 4 days" — the list's words, the same on its paper (lib/materialsReport) */
import { whenSaid } from '../lib/materialsReport';
import { useAccess } from '../cloud/access';
import { AccessNote } from '../ui/AccessNote';
import type { Can } from '../lib/access';

const nice = (iso?: string): string => {
  if (!iso) return '—';
  const t = Date.parse(iso + 'T12:00:00');
  return Number.isFinite(t) ? new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : iso;
};

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
        return <span key={w.start} className={'mt-cell' + (on ? ' is-on' : '') + (on && isHere(m) ? ' is-here' : '') + (lands ? ' is-lands' : '')}>{lands && <span className="mt-cell-d">{nice(m.due)}</span>}</span>;
      })}
    </WeekStrip>
  );
}

/* ================================== the list ================================ */

function Row({ m, today, lineName, state, weeks, can, lines }: {
  m: Material; today: string; lineName?: string; weeks: Week[];
  /** The job's lines, for "For" in its Edit. */
  lines: { id: string; name: string }[];
  state: ReturnType<typeof useMaterials>;
  /** A client reads the row; only the owner removes one (lib/access). */
  can: Can;
}) {
  const [marking, setMarking] = useState(false);
  const [on, setOn] = useState(todayISO());
  /* EDIT — every box Add asked for (docs/STAGEGATE.md). Once added, how
     much, which line and who was bringing it could not be changed, and the
     name could, but looked like plain text. The day it is due keeps its own
     box beside it, which asks why when it moves later. */
  const [editing, setEditing] = useState<{ what: string; howMuch: string; lineId: string; from: string } | null>(null);
  const where = stateOf(m, today);

  const facts = [m.howMuch, lineName, m.from && `from ${m.from}`].filter(Boolean).join(' · ');

  return (
    <div className={'mt-row is-' + where}>
      <div className="mt-row-main">
        {editing ? (
          <form className="mt-edit" onSubmit={e => {
            e.preventDefault();
            void state.save({ ...m, what: editing.what.trim() || m.what, howMuch: editing.howMuch.trim() || undefined,
              lineId: editing.lineId || undefined, from: editing.from.trim() || undefined });
            setEditing(null);
          }}>
            <label className="cw-f"><span>What it is</span>
              <input value={editing.what} maxLength={160} autoFocus onChange={e => setEditing({ ...editing, what: e.target.value })} /></label>
            <label className="cw-f"><span>How much</span>
              <input value={editing.howMuch} maxLength={40} placeholder="10 reels" onChange={e => setEditing({ ...editing, howMuch: e.target.value })} /></label>
            {lines.length > 0 && (
              <label className="cw-f"><span>For</span>
                <select value={editing.lineId} onChange={e => setEditing({ ...editing, lineId: e.target.value })}>
                  <option value="">the whole project</option>
                  {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select></label>
            )}
            <label className="cw-f"><span>From</span>
              <input value={editing.from} maxLength={80} placeholder="Who is bringing it" onChange={e => setEditing({ ...editing, from: e.target.value })} /></label>
            <span className="mt-edit-go">
              <button className="btn btn-primary btn-sm" type="submit" disabled={!editing.what.trim()}>Save</button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditing(null)}>Cancel</button>
            </span>
          </form>
        ) : (
          <>
            <div className="mt-what" style={{ borderColor: 'transparent' }}>{m.what}</div>
            {(facts || can.edit) && (
              <div className="mt-facts">
                {facts}
                {can.edit && <>{facts ? ' · ' : ''}<button type="button" className="cw-link" onClick={() => setEditing({ what: m.what, howMuch: m.howMuch ?? '', lineId: m.lineId ?? '', from: m.from ?? '' })}>Edit</button></>}
              </div>
            )}
          </>
        )}
        {m.note && <div className="mt-facts">{m.note}</div>}
      </div>

      <div className="mt-when">
        <span className={'mt-when-n is-' + where}>{whenSaid(m, today)}</span>
        {!isHere(m) && !can.edit && m.due && <span className="mt-facts">{nice(m.due)}</span>}
        {!isHere(m) && can.edit && (
          <DateWhy className="mt-due" ariaLabel={`Date ${m.what} is due`} value={m.due}
            projectId={m.projectId} storyKey={keyOf('material', m.id)} what={m.what}
            onChange={v => state.save({ ...m, due: v })} />
        )}
        {/* NOTHING IS LOCKED BY BEING IN (Rowland, 6 October: "I make
            mistakes"). The day it came in stays a box, so a wrong day is
            changed here, not by putting it back and marking it in again. */}
        {isHere(m) && can.edit && (
          <DateInput className="mt-due" aria-label={`Day ${m.what} came in`} value={m.inOn}
            onCommit={v => void state.save({ ...m, here: true, inOn: v || undefined })} />
        )}
      </div>

      {!can.edit ? null : marking ? (
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

      {can.remove && (
        <button className="pset-x" aria-label={`Remove ${m.what}`}
          onClick={() => void state.remove(m.id)}><Icon name="close" size="0.85em" /></button>
      )}
      <Strip m={m} weeks={weeks} today={today} />
    </div>
  );
}

function AddMaterial({ state, lines, first }: {
  state: ReturnType<typeof useMaterials>;
  lines: { id: string; name: string }[];
  /** Nothing on the list yet — the one time the form explains itself. */
  first: boolean;
}) {
  const [what, setWhat] = useState('');
  const [howMuch, setHowMuch] = useState('');
  const [due, setDue] = useState('');
  const [lineId, setLineId] = useState('');
  const [from, setFrom] = useState('');

  /* ONE TAP, ONE THING. The boxes cleared only once the write came back, so a
     double tap on "Add it" put the same material on the list twice. */
  const busy = useRef(false);
  const add = () => {
    if (!what.trim() || busy.current) return;
    busy.current = true;
    void state.add({ what, howMuch, due, lineId, from })
      .then(() => { setWhat(''); setHowMuch(''); setDue(''); setFrom(''); })
      .finally(() => { busy.current = false; });
  };

  return (
    <div className="card mt-add-card">
      <div className="field-label">Add what you need</div>
      <div className="mt-add">
        <label className="proj-field mt-add-what">
          <span className="field-label">What it is</span>
          <input className="text-input" value={what} maxLength={160} placeholder="TESC03163A Finest Red 2kg"
            onChange={e => setWhat(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add(); }} />
        </label>
        <label className="proj-field mt-add-much">
          <span className="field-label">How much</span>
          <input className="text-input" value={howMuch} maxLength={40} placeholder="10 reels"
            onChange={e => setHowMuch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add(); }} />
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
            onChange={e => setFrom(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add(); }} />
        </label>
        <button className="btn btn-primary mt-add-btn" disabled={!what.trim()} onClick={() => add()}>Add it</button>
      </div>
      {first && <p className="chip-hint">Only the first box is needed. A thing with no date agreed is a real state, and the list says so rather than inventing one.</p>}
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
  const can = useAccess(projectId);
  /* THE JOB'S MONEY (lib/useJobMoney) — every stage-gate page's last tile */
  const money = useJobMoney(projectId);
  const today = todayISO();

  if (loading || state.loading || lines.loading) {
    return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  }
  if (!project) {
    return (
      <div className="wrap pace">
        <p className="sub" style={{ marginTop: 24 }}>That project isn’t here any more.</p>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => nav('/')}>Back to the control room</button>
      </div>
    );
  }

  const { tally: t } = state;
  const lineName = (id?: string) => lines.lines.find(l => l.id === id)?.name;
  /* ITS PAPER (docs/AUDIT.md, bar 3) — what we are waiting on as one page:
     how many are here, the late named with why their dates moved, what is
     coming by the day, what has no date (lib/materialsReport, lib/materialsPdf) */
  const paper = async () => {
    try {
      const { saveMaterialsReport } = await import('../lib/materialsPdf');
      await saveMaterialsReport(projectId, project.name, lineName, money);
    } catch (e) {
      console.error('materials pdf failed', e);
      window.alert('Sorry — the PDF could not be made. Please try again.');
    }
  };

  return (
    <div className="wrap pace">
      {/* The header every screen wears — the screen's name, then where it
          has got to in one line. The job's name is in the top bar and the
          rail (ui/Frame). The lede says what the screen is for, so it is
          said where that is news: on the empty list. */}
      <header className="pace-head">
        <div className="pace-head-main">
          <h1 className="pace-title">Materials</h1>
          {/* …said in the tiles under the header now (lib/stageGatePages:
              here of what is needed, late, waiting and the next due, no date,
              the money) — one place, as the list below is the one list. */}
        </div>
        <div className="pace-head-actions">
          <button type="button" className="btn" disabled={t.total === 0} onClick={() => void paper()}><Icon name="document" size="1.05em" />Materials report</button>
        </div>
      </header>
      <AccessNote can={can} owner={project.lead} />
      {t.total > 0 && <LeanTiles tiles={materialTiles(t, money ?? MONEY_WAIT, iso => nice(iso))} className="sg-tiles" />}

      {t.total === 0 ? (
        <>
          <div className="pace-empty">
            <p className="sub">
              What this job needs before it can run properly, when each thing is due, and whether it has
              turned up — the same list you keep in the plan, except it works out what is late.{can.edit && ' Add what you are waiting on.'}
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
              <p className="pace-sec-sub">Late first, then what is coming, then what nobody has dated, then what is in · indigo from the week it is due, green once it is in · this prints on the report</p>
            </div>
            <div className="mt-list">
              <WeekHead weeks={state.weeks} months={monthSpans(state.weeks)} />
              {state.materials.map(m => (
                <Row key={m.id} m={m} today={today} lineName={lineName(m.lineId)} state={state} weeks={state.weeks} can={can} lines={lines.lines} />
              ))}
            </div>
          </section>
        </>
      )}

      {/* OUTSIDE THE BRANCH ON PURPOSE — the fix Programs already has. It sat
          in both arms, so adding the FIRST thing swapped arms, unmounted the
          form and folded it shut: the line just picked was gone and the
          second thing needed "+ Add what you need" first. */}
      {can.edit && <AddFold label="Add what you need" start={t.total === 0}><AddMaterial state={state} lines={lines.lines} first={t.total === 0} /></AddFold>}

      {/* WHAT THE MACHINE CAN RUN, beside what it is waiting for — the two
          answer one question between them. On a stage-gate job Programs is
          held by Set up; on a 3P or tree job it is held here, and the row of
          tabs stays six long. */}
      {!project.commissioning && <ProgramsScreen projectId={projectId} embedded />}

      {/* THE CLOSING LINE — the materials in one sentence, and the slip in money */}
      {money && t.total > 0 && <LeanClosing closing={materialClosing(t, money)} />}
      <footer className="pace-foot">
        <p>{project.name} · what we are waiting on</p>
      </footer>
    </div>
  );
}
