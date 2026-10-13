/* PROGRAMS, FROM THE CONTROL ROOM — every line's programs, planned and
 * proved, no job needed (docs/BLUEPRINT.md, Stage 2).
 *
 * Rowland, 13 October: "programs should be able to pick programs from the
 * control room and plan a program for a line rather than open up a full
 * project system." A running line gets new programs too: a new product, a
 * new film, a pack size — and none of it is a project.
 *
 * WHICH RECORD: a program (lib/programs) on a line of the factory
 * (`workspaceId`), with no job (`projectId` ''), on one of the line's
 * machines (lib/lineRecords) — the same record a stage-gate job's Programs
 * list keeps, so a job's programs on the line are shown here too, each one tap
 * to the job that holds it, and a line's own program can be proved in a job's
 * Commission (ui/LineProgramsOnJob). WHERE IT SHOWS: here; the line's page
 * (its Programs, its machines' counts); a job on the line (its Programs page);
 * and on paper, the programs report of a line or of every line.
 *
 * The page answers, in order: where the programs are (the count in words,
 * only the late in red), line by line and machine by machine; and what to do
 * next — plan one, say where one has got to, and when it is tested. */
import { useMemo, useRef, useState } from 'react';
import type { Workspace } from '../types';
import type { Program, ProgramState } from '../lib/programs';
import { STATE_WORD, daysOverdue, isProved, movedOne, standingOf, stateOf } from '../lib/programs';
import { lineProgramsReading, machineOfProgram, machinesOnLine, productsOnLine, programsOnLine, type LineMachine } from '../lib/lineRecords';
import { useLineRecords, type LineRecords } from '../lib/useLineRecords';
import { asked } from '../lib/lines';
import { niceDay, todayISO } from '../lib/weeks';
import { pdfFileName } from '../lib/fileName';
import { useCanStartProjects } from '../cloud/access';
import { addLineProgram, deleteProgram, putProgram, putProgramOnMachine, putPrograms } from '../db';
import { nav } from '../state/useRoute';
import { DraftText } from '../ui/Draft';
import { DateInput } from '../ui/DateInput';
import { AddFold } from '../ui/AddFold';
import { Icon } from '../ui/Icon';
import { offerUndo } from '../ui/Undo';

/** One line's programs, read once for the page and the paper. */
interface LineRead { line: Workspace; machines: LineMachine[]; programs: Program[] }

export function readLines(rec: LineRecords, only?: string): LineRead[] {
  return rec.lines.filter(w => !only || w.id === only).map(line => ({
    line,
    machines: machinesOnLine(line, rec.machines, rec.jobLines),
    programs: programsOnLine(line.id, rec.programs, rec.jobLines),
  }));
}

/** When it is settled, in words — the Programs list's own (screens/ProgramsScreen). */
function when(p: Program, today: string): string {
  if (isProved(p)) return `proved ${niceDay(p.provedOn)}`;
  if (!p.testOn) return 'no test day';
  const late = daysOverdue(p, today);
  if (late != null) return late === 1 ? 'test was yesterday' : `test was ${late} days ago`;
  return p.testOn === today ? 'testing today' : `testing ${niceDay(p.testOn)}`;
}

export function LineProgramsScreen() {
  const rec = useLineRecords();
  const [lineF, setLineF] = useState(() => asked('line') ?? 'all');
  const adding = asked('add') === '1';
  const may = useCanStartProjects();
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const today = todayISO();

  const shown = useMemo(() => readLines(rec, lineF === 'all' ? undefined : lineF), [rec, lineF]);
  const reading = useMemo(() => lineProgramsReading(shown.map(s => ({ id: s.line.id, name: s.line.name, machines: s.machines, programs: s.programs })), today), [shown, today]);
  const counts = useMemo(() => new Map(readLines(rec).map(s => [s.line.id, s.programs.length])), [rec]);

  if (rec.loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;

  const one = lineF !== 'all' ? shown[0]?.line : undefined;
  const download = async () => {
    if (!reading || busy) return;
    setBusy(true); setSaid(null);
    try {
      const { loadPdfLib, deliverPdf } = await import('../lib/savePdf');
      const { drawProgramsReport } = await import('../lib/programsReportPdf');
      const { jsPDF } = await loadPdfLib();
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const name = one ? (one.lineType ? `${one.name} (${one.lineType})` : one.name) : 'Every line';
      await drawProgramsReport(doc, { name, printed: niceDay(today, { year: true }), reading, eyebrow: one ? 'PROGRAMS · PRODUCTION LINE' : 'PROGRAMS · YOUR FACTORY' });
      const how = await deliverPdf(doc, pdfFileName(one?.name ?? 'Your factory', 'programs', today));
      setSaid(how === 'downloaded' ? 'Saved — open or send it from the bar below.' : 'Ready — open it from the bar below.');
    } catch (e) {
      console.error('line programs report failed', e);
      setSaid('The report could not be made — try again.');
    } finally { setBusy(false); }
  };

  return (
    <div className="wrap pace lp">
      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pl-eyebrow">YOUR FACTORY · PROGRAMS · <a href="#/factory" className="pl-fac">Your factory ›</a></p>
          <h1 className="pace-title">Programs</h1>
          <p className="pace-lede">Every line&rsquo;s programs, machine by machine — planned and proved. No job needed: plan one on a line here. A job&rsquo;s own programs on the line show beside them.</p>
          {/* where they are, in words — only the late carry colour */}
          <p className="pl-says lp-says">{!reading ? 'No programs yet.' : <>
            {reading.total} program{reading.total === 1 ? '' : 's'} · {reading.done} proved
            {reading.late > 0 && <> · <b className="is-r">{reading.late} late</b></>}
            {reading.open > 0 && <> · {reading.open} to prove</>}
          </>}</p>
        </div>
        <div className="pace-head-actions">
          <button type="button" className="btn" disabled={!reading || busy} onClick={() => void download()}><Icon name="document" size="1.05em" />{busy ? 'Making it…' : 'Programs report'}</button>
        </div>
      </header>
      {said && <p className="tc-ok" role="status">{said}</p>}

      {rec.lines.length === 0 ? (
        <div className="fac-empty">
          <p>Programs are planned on a line of your factory. Set up your factory first — your lines, in floor order.</p>
          <button type="button" className="btn btn-primary" onClick={() => nav('/factory?add=1')}>Set up your factory</button>
        </div>
      ) : (
        <>
          {rec.lines.length > 1 && (
            <div className="chip-row lp-lines" role="group" aria-label="Which line">
              <button type="button" className={'chip' + (lineF === 'all' ? ' on' : '')} aria-pressed={lineF === 'all'} onClick={() => setLineF('all')}>Every line</button>
              {rec.lines.map(w => (
                <button key={w.id} type="button" className={'chip' + (lineF === w.id ? ' on' : '')} aria-pressed={lineF === w.id} onClick={() => setLineF(w.id)}>
                  {w.name}{counts.get(w.id) ? <span className="lp-n"> {counts.get(w.id)}</span> : null}
                </button>
              ))}
            </div>
          )}
          {shown.map(s => <LineBlock key={s.line.id} s={s} rec={rec} may={may} today={today} startAdding={(adding || !s.programs.length) && lineF === s.line.id} />)}
        </>
      )}
    </div>
  );
}

/** One line: its machines in flow order, each with its programs, the line
 *  itself last; then Plan a program on it. */
function LineBlock({ s, rec, may, today, startAdding }: { s: LineRead; rec: LineRecords; may: boolean; today: string; startAdding: boolean }) {
  const { line, machines, programs } = s;
  const groups = [
    ...machines.map(m => ({ key: m.record?.id ?? m.name, m, rows: programs.filter(p => machineOfProgram(p, machines) === m) })),
    { key: '', m: undefined as LineMachine | undefined, rows: programs.filter(p => !machineOfProgram(p, machines)) },
  ].filter(g => g.rows.length);
  const own = programs.filter(p => !p.projectId);
  const proved = programs.filter(isProved).length, late = programs.filter(p => standingOf(p, today) === 'overdue').length;
  const products = productsOnLine(programs, rec.standards.filter(x => x.workspaceId === line.id));
  return (
    <section className="pl-sec lp-line" aria-label={`Programs on ${line.name}`}>
      <div className="pl-sec-h">
        <h2><a href={`#/lines/${line.id}`} className="lp-line-a">{line.name}</a>{line.lineType ? <span className="sub"> · {line.lineType}</span> : null}</h2>
        <span className="sub">{programs.length ? `${programs.length} program${programs.length === 1 ? '' : 's'} · ${proved} proved` : 'No programs yet'}{late ? <> · <b className="is-r">{late} late</b></> : null}</span>
      </div>
      {groups.map(g => (
        <div key={g.key || 'line'} className="lp-m">
          <h3 className="lp-mh">{g.m ? g.m.name : 'The line itself'}{g.m?.record?.oem ? <span className="sub"> · {g.m.record.oem}</span> : null}</h3>
          <div className="mt-list">
            {g.rows.map(p => (
              <ProgramRow key={p.id} p={p} line={line} machines={machines} today={today} may={may} rec={rec}
                move={!p.projectId && may ? async by => { const changed = movedOne(own, p.id, by, q => machineOfProgram(q, machines) === g.m); if (changed.length) await putPrograms(changed); } : undefined} />
            ))}
          </div>
        </div>
      ))}
      {may && (
        <AddFold label={`Plan a program on ${line.name}`} start={startAdding}>
          <AddLineProgram line={line} machines={machines} products={products} />
        </AddFold>
      )}
    </section>
  );
}

function ProgramRow({ p, line, machines, today, may, rec, move }: {
  p: Program; line: Workspace; machines: LineMachine[]; today: string; may: boolean; rec: LineRecords;
  move?: (by: -1 | 1) => Promise<void>;
}) {
  const [proving, setProving] = useState(false);
  const [on, setOn] = useState(today);
  const where = standingOf(p, today), got = stateOf(p);
  const job = p.projectId ? rec.jobs.find(j => j.id === p.projectId) : undefined;
  const machine = machineOfProgram(p, machines);
  /* A job's program is the job's to change, where it is set up and proved; a
     line's own is changed here. */
  const edit = may && !p.projectId;
  const facts = [p.runs && `runs ${p.runs}`, p.from && `from ${p.from}`].filter(Boolean).join(' · ');
  const save = (patch: Partial<Program>) => void putProgram({ ...p, ...patch });

  return (
    <div className={'mt-row lp-row is-pg-' + where} data-program={p.id}>
      <div className="mt-row-main">
        {move && (
          <span className="pg-move" role="group" aria-label={`Move ${p.what}`}>
            <button type="button" className="pg-move-b" aria-label={`Move ${p.what} up`} onClick={() => void move(-1)}>▲</button>
            <button type="button" className="pg-move-b" aria-label={`Move ${p.what} down`} onClick={() => void move(1)}>▼</button>
          </span>
        )}
        {edit
          ? <DraftText className="mt-what" value={p.what} ariaLabel={`${p.what} — its name or number`} placeholder="Program name or number" onSave={v => save({ what: v || p.what })} />
          : <div className="mt-what" style={{ borderColor: 'transparent' }}>{p.what}</div>}
        {facts && <div className="mt-facts">{facts}</div>}
        {job && (
          <div className="mt-facts lp-job">on <button type="button" className="cw-link" onClick={() => nav(`/project/${job.id}/programs`)}>{job.name} ›</button>{job.archivedAt ? ' (archived)' : ''}</div>
        )}
        {/* COMMENTARY — what was seen, what is next (12 October: "allow
            commentary"), with or without a change of state. */}
        {edit
          ? <DraftText className="mt-what lp-note" value={p.note ?? ''} ariaLabel={`Commentary on ${p.what}`} placeholder="Commentary — what was seen, what is next" max={400} onSave={v => save({ note: v || undefined })} />
          : p.note ? <div className="mt-facts">{p.note}</div> : null}
        {edit && (
          <label className="pg-machine">
            <span className="field-label">Machine</span>
            <select className="text-input" value={machine?.name ?? ''} aria-label={`Which machine ${p.what} is on`}
              onChange={e => void putProgramOnMachine(p, line.id, e.target.value)}>
              <option value="">The line itself</option>
              {machines.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
            </select>
          </label>
        )}
      </div>

      {!edit ? (
        <span className="pg-state">
          <span className="field-label">Where it&rsquo;s got to</span>
          <span className={'pg-state-sel is-pg-' + got}>{STATE_WORD[got]}</span>
        </span>
      ) : (
        <label className="pg-state">
          <span className="field-label">Where it&rsquo;s got to</span>
          <select className={'text-input pg-state-sel is-pg-' + got} value={got} aria-label={`Where ${p.what} has got to`}
            onChange={e => {
              const next = e.target.value as ProgramState;
              if (next === 'proved') { setOn(today); setProving(true); return; }
              save({ state: next, provedOn: undefined });
            }}>
            <option value="needed">Not written</option>
            <option value="onMachine">On the machine</option>
            <option value="proved">Proved</option>
          </select>
        </label>
      )}

      <div className="mt-when">
        <span className={'mt-when-n is-pg-' + where}>{when(p, today)}</span>
        {edit && !isProved(p) && (
          <DateInput className="mt-due" aria-label={`Day ${p.what} is tested`} value={p.testOn} onCommit={v => save({ testOn: v || undefined })} />
        )}
        {edit && isProved(p) && (
          <DateInput className="mt-due" aria-label={`Day ${p.what} was proved`} value={p.provedOn}
            onCommit={v => save(v ? { state: 'proved', provedOn: v } : { state: 'onMachine', provedOn: undefined })} />
        )}
      </div>

      {edit && proving && (
        <div className="mt-mark">
          <label className="mt-mark-l" htmlFor={`lp-pv-${p.id}`}>Proved on</label>
          <input id={`lp-pv-${p.id}`} className="mt-due" type="date" value={on} onChange={e => setOn(e.target.value)} />
          <button type="button" className="btn btn-primary btn-sm" onClick={() => { save({ state: 'proved', provedOn: on, testOn: undefined }); setProving(false); }}>It&rsquo;s proved</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setProving(false)}>Cancel</button>
        </div>
      )}
      {edit && (
        <button type="button" className="pset-x" aria-label={`Remove ${p.what}`}
          onClick={() => void deleteProgram(p.id).then(undo => offerUndo(`Took “${p.what}” off ${line.name}`, undo))}><Icon name="close" size="0.85em" /></button>
      )}
    </div>
  );
}

/** PLAN A PROGRAM ON THE LINE — only its name is needed; its machine is one
 *  of the line's (or one not listed yet, which joins the line's list), what
 *  it runs one of the line's products or a new one. */
function AddLineProgram({ line, machines, products }: { line: Workspace; machines: LineMachine[]; products: string[] }) {
  const [what, setWhat] = useState('');
  const [machine, setMachine] = useState(machines[0]?.name ?? '');
  const [other, setOther] = useState('');
  const [runs, setRuns] = useState('');
  const [testOn, setTestOn] = useState('');
  const [from, setFrom] = useState('');
  const [note, setNote] = useState('');
  const [added, setAdded] = useState<string | null>(null);
  const busy = useRef(false);
  const NEW = '\u0000new';
  const add = () => {
    if (!what.trim() || busy.current) return;
    busy.current = true;
    const on = machine === NEW ? other : machine;
    void addLineProgram(line.id, { what, machine: on, runs, testOn, from, note })
      .then(p => { if (p) setAdded(`${p.what} is planned on ${line.name}${on.trim() ? `, on the ${on.trim()}` : ''}.`); setWhat(''); setRuns(''); setTestOn(''); setNote(''); if (machine === NEW && other.trim()) { setMachine(other.trim()); setOther(''); } })
      .finally(() => { busy.current = false; });
    /* The machine and who owes it stay: programs are planned in runs. */
  };
  const listId = `lp-products-${line.id}`;
  return (
    <div className="card mt-add-card">
      <div className="field-label">Plan a program on {line.name}</div>
      <div className="mt-add">
        <label className="proj-field mt-add-what">
          <span className="field-label">Name or number</span>
          <input className="text-input" value={what} maxLength={160} placeholder="P-104 perforation" aria-label="The program's name or number"
            onChange={e => setWhat(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add(); }} />
        </label>
        <label className="proj-field">
          <span className="field-label">Machine</span>
          <select className="text-input" value={machine} aria-label="Which machine it is on" onChange={e => setMachine(e.target.value)}>
            <option value="">The line itself</option>
            {machines.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
            <option value={NEW}>A machine not listed…</option>
          </select>
        </label>
        {machine === NEW && (
          <label className="proj-field">
            <span className="field-label">Its name</span>
            <input className="text-input" value={other} maxLength={80} placeholder="Pick and place" aria-label="The machine's name" onChange={e => setOther(e.target.value)} />
          </label>
        )}
        <label className="proj-field mt-add-much">
          <span className="field-label">What it runs</span>
          <input className="text-input" value={runs} maxLength={80} list={listId} placeholder="Finest Red 2kg" aria-label="What it runs"
            onChange={e => setRuns(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add(); }} />
          <datalist id={listId}>{products.map(x => <option key={x} value={x} />)}</datalist>
        </label>
        <label className="proj-field mt-add-due">
          <span className="field-label">Testing on</span>
          <input className="text-input" type="date" value={testOn} aria-label="The day it is tested" onChange={e => setTestOn(e.target.value)} />
        </label>
        <label className="proj-field">
          <span className="field-label">From</span>
          <input className="text-input" value={from} maxLength={80} placeholder="Who owes it" aria-label="Who owes it" onChange={e => setFrom(e.target.value)} />
        </label>
        <label className="proj-field mt-add-what">
          <span className="field-label">Commentary</span>
          <input className="text-input" value={note} maxLength={400} placeholder="What is known so far" aria-label="Commentary" onChange={e => setNote(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add(); }} />
        </label>
        <button type="button" className="btn btn-primary mt-add-btn" disabled={!what.trim() || (machine === NEW && !other.trim())} onClick={() => add()}>Plan it</button>
      </div>
      {added && <p className="fac-added" role="status">{added}</p>}
      <p className="chip-hint">Only the name is needed. A new program starts as <b>not written</b>; one with no test day says so rather than being given one.</p>
    </div>
  );
}
