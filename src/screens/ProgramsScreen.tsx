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
import { Crumbs } from '../ui/Crumbs';
import { Peers, projectPeers } from '../ui/Peers';
import { useStanding } from '../lib/useStanding';
import { DraftText } from '../ui/Draft';
import { useProject } from '../lib/useProjects';
import { usePaceLines } from '../lib/usePaceLines';
import { useAssets } from '../lib/useTesting';
import type { Asset } from '../lib/testing';
import { usePrograms } from '../lib/usePrograms';
import {
  busiestMachine, daysOverdue, fillIn, isProved, monthSpans, readProgramPaste, standingOf,
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
function Grid({ rows, weeks, today, assets }: { rows: Program[]; weeks: Week[]; today: string; assets: Asset[] }) {
  if (!rows.length || !weeks.length) return null;
  /* WHICH MACHINE, but only once there is more than one in play. Rowland, on
     giving a second machine the programs the first one has: "a lot of them
     could be real correlated with the same name." Two rows reading "P-104
     perforation" with nothing between them is a grid nobody can use — and on a
     job with one machine, printing its name against every row is noise. The
     list below has always said it; the grid is the same picture and must not
     say less than the thing beside it. */
  const machineOf = (p: Program) => assets.find(a => a.id === p.assetId)?.name;
  const several = new Set(rows.map(p => p.assetId ?? '')).size > 1;
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
                {several && <span className="pg-grid-on">{machineOf(p) ?? 'the line itself'}</span>}
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

/* ================= EVERY PROGRAM ONTO A MACHINE, IN ONE GO =================
 *
 * Rowland: "when I go on program, I want the ability to pick the machine,
 * because different machines have different programs. And all the current
 * existing programs set to the machine called pick and place."
 *
 * The per-row picker was already here, and it was invisible, because it draws
 * only when the project HAS machines — and a project whose programs were pasted
 * from the OEM has a full list of programs and no machines typed in at all. So
 * the one screen that wants to say which machine a program is for was the one
 * screen with no way to get a machine, and nothing on it said why. It read
 * exactly as "you never updated the programs", which is what it was.
 *
 * TWO THINGS, ONE STRIP, and it only exists while there is something to fix:
 *   · a machine can be NAMED from here, so an empty project is not a dead end;
 *   · every program still on no machine goes onto it in ONE tap, because doing
 *     thirty of them a dropdown at a time is the job the app is supposed to be
 *     doing.
 *
 * It disappears the moment every program says which machine it is for, so it is
 * a way through rather than a permanent fixture.
 */
function PutAllOn({ state, assets, addAsset }: {
  state: ReturnType<typeof usePrograms>;
  assets: Asset[];
  addAsset: (name: string) => Promise<string>;
}) {
  const [pick, setPick] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);

  const loose = state.programs.filter(p => !p.assetId);
  if (loose.length === 0) return null;

  const go = async () => {
    const typed = name.trim();
    if (!typed && !pick) return;
    setBusy(true);
    try {
      /* A typed name wins over the dropdown: somebody who has just written one
         means that one, whatever was left selected behind it. */
      const id = typed ? await addAsset(typed) : pick;
      await state.putAllOn(loose.map(p => p.id), id);
      const on = typed || assets.find(a => a.id === pick)?.name || 'the machine';
      setSaid(`${loose.length} ${loose.length === 1 ? 'program is' : 'programs are'} on ${on}.`);
      setName(''); setPick('');
    } finally { setBusy(false); }
  };

  return (
    <div className="pg-onto">
      <p className="pg-onto-h">
        <b>{loose.length} {loose.length === 1 ? 'program does' : 'programs do'} not say which machine</b>
        <span className="sub">
          {assets.length === 0
            ? 'No machines on this project yet — name one and they all go onto it.'
            : 'Put them all on one, then change the odd one on its own row.'}
        </span>
      </p>
      <div className="pg-onto-row">
        {assets.length > 0 && (
          <label className="pg-onto-f">
            <span className="field-label">A machine you have</span>
            <select className="text-input" value={pick} aria-label="Which machine to put them all on"
              onChange={e => { setPick(e.target.value); setName(''); }}>
              <option value="">Pick one…</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
        )}
        <label className="pg-onto-f">
          <span className="field-label">{assets.length > 0 ? 'Or a new one' : 'Name the machine'}</span>
          <input className="text-input" value={name} placeholder="Pick and place"
            aria-label="Name a machine to put them all on"
            onChange={e => { setName(e.target.value); if (e.target.value) setPick(''); }} />
        </label>
        <button className="btn btn-primary" disabled={busy || (!name.trim() && !pick)}
          onClick={() => void go()}>
          {busy ? 'Putting them on…' : `Put all ${loose.length} on it`}
        </button>
      </div>
      {said && <p className="sub pg-onto-said" role="status">{said}</p>}
    </div>
  );
}

function Row({ p, today, lineName, assets, state }: {
  p: Program; today: string; lineName?: string; assets: Asset[];
  state: ReturnType<typeof usePrograms>;
}) {
  const [proving, setProving] = useState(false);
  const [on, setOn] = useState(todayISO());
  const where = standingOf(p, today);
  const got = stateOf(p);

  const machine = assets.find(a => a.id === p.assetId)?.name;
  /* The machine leads the facts line: with several machines each running
     several programs, WHICH ONE is the first thing that tells two rows of the
     same name apart. */
  const facts = [machine, p.runs && `runs ${p.runs}`, lineName, p.from && `from ${p.from}`]
    .filter(Boolean).join(' · ');

  return (
    <div className={'mt-row is-pg-' + where}>
      <div className="mt-row-main">
        <DraftText className="mt-what" value={p.what} placeholder="Program name or number"
          onSave={v => void state.save({ ...p, what: v || p.what })} />
        {facts && <div className="mt-facts">{facts}</div>}
        {p.note && <div className="mt-facts">{p.note}</div>}
        {/* Changing it here rather than only on the way in: a list pasted from
            the OEM arrives with no machine on any row, and re-typing them was
            the alternative. */}
        {assets.length > 0 && (
          <label className="pg-machine">
            <span className="field-label">Machine</span>
            <select className="text-input" value={p.assetId ?? ''}
              aria-label={`Which machine ${p.what} is for`}
              onChange={e => void state.save({ ...p, assetId: e.target.value || undefined })}>
              <option value="">The line itself</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
        )}
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

function AddProgram({ state, lines, assets }: {
  state: ReturnType<typeof usePrograms>;
  lines: { id: string; name: string }[];
  assets: Asset[];
}) {
  const [what, setWhat] = useState('');
  const [runs, setRuns] = useState('');
  const [testOn, setTestOn] = useState('');
  const [lineId, setLineId] = useState('');
  /* null means NOBODY HAS CHOSEN YET, which is not the same as '' — that is a
     real choice meaning the line itself. Until somebody picks, the form sits on
     the machine most programs are already on, because the machines arrive from
     their own hook a beat after this mounts and a value captured at mount would
     have been '' for ever. */
  const [assetId, setAssetId] = useState<string | null>(null);
  const [from, setFrom] = useState('');

  const onMachine = assetId ?? busiestMachine(state.programs, assets);

  const add = async () => {
    if (!what.trim()) return;
    await state.add({ what, runs, testOn, lineId, assetId: onMachine, from });
    setWhat(''); setRuns(''); setTestOn(''); setFrom('');
    /* The machine and the line STAY. Adding programs is done in runs — five
       for the pick and place, then five for the wrapper — and clearing the
       machine after each one makes you set it five times. */
  };

  /* NAMES ALREADY IN USE, on any machine. Rowland: "I can pick from what is
     existing in another program from another asset, because there could be a
     correlation — or it might be a completely new one. I need the ability to
     do both."
     The same product runs on more than one machine, so the same program name
     turns up against more than one asset. Tapping one fills the box; typing
     over it is still typing. Only names NOT already on the machine being added
     to are offered — the same name twice on one machine is the mistake this
     would otherwise help you make. */
  const taken = new Set(state.programs.filter(p => (p.assetId ?? '') === onMachine).map(p => p.what.trim().toLowerCase()));
  const seen = new Map<string, { name: string; on?: string }>();
  for (const p of state.programs) {
    const key = p.what.trim().toLowerCase();
    if (!key || taken.has(key) || seen.has(key)) continue;
    /* The NAME is kept, not a display string to be taken apart again. It used
       to split the label on ' · ' to get it back, which quietly truncated any
       program whose own name had one in it. */
    seen.set(key, { name: p.what, on: assets.find(a => a.id === p.assetId)?.name });
  }
  const reuse = [...seen.entries()].slice(0, 12);

  return (
    <div className="card mt-add-card">
      <div className="field-label">Add a program</div>
      <div className="mt-add">
        <label className="proj-field mt-add-what">
          <span className="field-label">Name or number</span>
          <input className="text-input" value={what} maxLength={160} placeholder="P-104 perforation"
            onChange={e => setWhat(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void add(); }} />
          {/* DIRECTLY UNDER THE BOX THEY FILL. They used to sit at the foot of
              the card, 350px below it on a phone — so tapping one filled a box
              that was off the top of the screen and the whole thing read as
              having done nothing. A control that fills a box belongs beside
              the box. */}
          {reuse.length > 0 && (
            <span className="pg-reuse">
              <span className="field-label">Same one as</span>
              <span className="tw-chips">
                {reuse.map(([key, r]) => (
                  <button key={key} type="button" className={'tw-chip' + (what === r.name ? ' on' : '')}
                    aria-pressed={what === r.name}
                    onClick={() => setWhat(r.name)}>
                    {r.name}{r.on && <span className="pg-reuse-on">{r.on}</span>}
                  </button>
                ))}
              </span>
            </span>
          )}
        </label>
        {/* WHICH MACHINE. Several machines each need several programs, and
            until now a program could not say which one it was for — so the
            list read as one pile and the same name on two machines was
            indistinguishable. The field was always on the record; nothing on
            screen ever set it. */}
        {assets.length > 0 && (
          <label className="proj-field">
            <span className="field-label">Machine</span>
            <select className="text-input" value={onMachine} onChange={e => setAssetId(e.target.value)}>
              <option value="">The line itself</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
        )}
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
  /* The machines, so a program can say which one it is for. */
  const { assets, addAsset } = useAssets(projectId);
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
            <Grid rows={state.programs} weeks={state.weeks} today={today} assets={assets} />
          </section>

          <section className="pace-sec">
            <div className="pace-sec-head">
              <h2 className="pace-sec-title">What is going to bite</h2>
              <p className="pace-sec-sub">Test dates that have gone first, then what is booked, then what nobody has dated, then what is proved</p>
            </div>
            <PutAllOn state={state} assets={assets} addAsset={addAsset} />
            <div className="mt-list">
              {state.programs.map(p => (
                <Row key={p.id} p={p} today={today} lineName={lineName(p.lineId)} assets={assets} state={state} />
              ))}
            </div>
          </section>

        </>
      )}

      {/* OUTSIDE THE BRANCH ON PURPOSE. These sat inside both arms of the
          empty/not-empty conditional, so adding the FIRST program swapped
          React from one arm to the other, unmounted the form and threw away
          what was in it — which meant the machine you had just picked was
          gone by the time you typed the second program for it. Rendered once,
          in one position, it keeps its state across that change. */}
      <PasteList state={state} />
      <AddProgram state={state} lines={lines.lines} assets={assets} />

      <footer className="pace-foot">
        <p>{project.name} · what the machine can run</p>
      </footer>
    </div>
  );
}
