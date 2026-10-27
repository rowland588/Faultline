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
import { PageHeader } from '../ui/parts';
import { ProductsBox } from '../ui/ProductsBox';
import { useMemo, useRef, useState } from 'react';
import type { Workspace } from '../types';
import type { Program, ProgramState } from '../lib/programs';
import { STATE_WORD, daysOverdue, isProved, movedOne, standingOf, stateOf } from '../lib/programs';
import { lineProgramsReading, machineOfProgram, machinesOnLine, productsOnLine, programsOnLine, type LineMachine } from '../lib/lineRecords';
import { useLineRecords, type LineRecords } from '../lib/useLineRecords';
import { projectsOnLines, stageOnlyByLine, useJobFloor, type FloorWord, type StageOnly } from '../lib/useJobFloor';
import type { ProgramLine, Proof } from '../lib/programsReport';
import { studyHref } from '../lib/studyLinks';
import { ProveProgram } from '../ui/ProveProgram';
import { asked } from '../lib/lines';
import { niceDay, todayISO } from '../lib/weeks';
import { pdfFileName } from '../lib/fileName';
import { useCanStartProjects } from '../cloud/access';
import { addLineProgram, deleteProgramWithTests, putProgram, putProgramOnMachine, putPrograms } from '../db';
import { nav } from '../state/useRoute';
import { DateInput } from '../ui/DateInput';
import { AddFold } from '../ui/AddFold';
import { ProgramFields, ProgramRowShell } from '../ui/ProgramRow';
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
  /* OPENED ON A LINE (?line=, the line's own Programs tab) the page is that line's and stays on it — no other
     line's chip to wander off by (Rowland, 27 October: "Programs, all lines. No, that sent me to all lines");
     every line's programs are the Factory's Programs, one tap up */
  const inLine = asked('line');
  const [lineF, setLineF] = useState(() => inLine ?? 'all');
  const adding = asked('add') === '1';
  const may = useCanStartProjects();
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const today = todayISO();

  const shown = useMemo(() => readLines(rec, lineF === 'all' ? undefined : lineF), [rec, lineF]);
  /* WHAT EACH JOB'S FLOOR SAID of its programs on these lines — beside the
     record's own state, on screen and paper (flow audit #3). */
  /* every project on these lines is read — its programs typed only on Commission's Programs loaded among them */
  const floor = useJobFloor(useMemo(() => [...shown.flatMap(s => s.programs.map(p => p.projectId ?? '')),
    ...projectsOnLines(shown.map(s => s.line.id), rec.jobLines, pid => rec.jobs.some(j => j.id === pid && !j.archivedAt))], [shown, rec.jobLines, rec.jobs]));
  const jobName = useMemo(() => new Map(rec.jobs.map(j => [j.id, j.name])), [rec.jobs]);
  /* PROGRAMS ONLY ON A PROJECT'S STAGE (23 October: "it's like you don't have any programs"), by the line they stand on */
  const stageOnly = useMemo(() => stageOnlyByLine(floor.stageOnly ?? [], rec.machines, rec.jobLines), [floor, rec.machines, rec.jobLines]);
  const reading = useMemo(() => lineProgramsReading(shown.map(s => ({ id: s.line.id, name: s.line.name, machines: s.machines, programs: s.programs })), today,
    { floor, jobName, tests: rec.provingTests, studies: rec.studies, stageOnly: new Map([...stageOnly].map(([k, v]) => [k, v.map(x => x.line)] as const)) }),
  [shown, today, floor, jobName, rec.provingTests, rec.studies, stageOnly]);
  /* HOW EACH PROVED ONE WAS PROVED (flow audit #21) — the reading's own words. */
  const proofs = useMemo(() => new Map((reading?.lines ?? []).flatMap(l => (l.programId && l.proof ? [[l.programId, l.proof] as const] : []))), [reading]);
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
      await drawProgramsReport(doc, { name, printed: niceDay(today, { year: true }), reading, eyebrow: one ? 'PROGRAMS · PRODUCTION LINE' : 'PROGRAMS · THE FACTORY' });
      const how = await deliverPdf(doc, pdfFileName(one?.name ?? 'Factory', 'programs', today));
      setSaid(how === 'downloaded' ? 'Saved — open or send it from the bar below.' : 'Ready — open it from the bar below.');
    } catch (e) {
      console.error('line programs report failed', e);
      setSaid('The report could not be made — try again.');
    } finally { setBusy(false); }
  };

  return (
    <div className="wrap pace lp">
      {/* THE PAGE HEADER (docs/STRUCTURE.md §5.4, B3): where the programs are, in words; the report in Report ▾. The way
          up is the bar's (it said Your factory › here) */}
      <PageHeader eyebrow={<span className="pl-eyebrow">{inLine && one ? `${one.name.toUpperCase()} · PROGRAMS` : 'FACTORY · PROGRAMS'}</span>} title="Programs"
        says={inLine && one
          ? `${one.name}’s programs, machine by machine — planned and proved. No project needed: plan one here. A project’s own programs on the line show beside them.`
          : 'Every line’s programs, machine by machine — planned and proved. No project needed: plan one on a line here. A project’s own programs on the line show beside them.'}
        papers={[{ label: 'Programs report', for: reading ? 'every program machine by machine, how each was proved' : 'no programs yet', disabled: !reading || busy, make: download }]}>
        {/* where they are, in words — only the late carry colour */}
        <p className="pl-says lp-says">{!reading ? 'No programs yet.' : <>
          {reading.total} program{reading.total === 1 ? '' : 's'} · {reading.done} proved
          {reading.late > 0 && <> · <b className="is-r">{reading.late} late</b></>}
          {reading.open > 0 && <> · {reading.open} to prove</>}
        </>}</p>
      </PageHeader>
      {said && <p className="tc-ok" role="status">{said}</p>}

      {rec.lines.length === 0 ? (
        <div className="fac-empty">
          <p>Programs are planned on a line of your factory. Set up your factory first — your lines, in floor order.</p>
          <button type="button" className="btn btn-primary" onClick={() => nav('/factory?add=1')}>Set up your factory</button>
        </div>
      ) : (
        <>
          {inLine && rec.lines.length > 1 && (
            <p className="lp-up"><button type="button" className="cw-link" onClick={() => nav('/programs')}>Every line’s programs — in the Factory ›</button></p>
          )}
          {!inLine && rec.lines.length > 1 && (
            <div className="chip-row lp-lines" role="group" aria-label="Which line">
              <button type="button" className={'chip' + (lineF === 'all' ? ' on' : '')} aria-pressed={lineF === 'all'} onClick={() => setLineF('all')}>All lines</button>
              {rec.lines.map(w => (
                <button key={w.id} type="button" className={'chip' + (lineF === w.id ? ' on' : '')} aria-pressed={lineF === w.id} onClick={() => setLineF(w.id)}>
                  {w.name}{counts.get(w.id) ? <span className="lp-n"> {counts.get(w.id)}</span> : null}
                </button>
              ))}
            </div>
          )}
          {shown.map(s => <LineBlock key={s.line.id} s={s} rec={rec} may={may} today={today} floor={floor} proofs={proofs} onStage={stageOnly.get(s.line.id) ?? []}
            startAdding={(adding || (!s.programs.length && !stageOnly.get(s.line.id)?.length)) && lineF === s.line.id} />)}
        </>
      )}
    </div>
  );
}

/** One line: its machines in flow order, each with its programs, the line
 *  itself last; then Plan a program on it. */
function LineBlock({ s, rec, may, today, floor, proofs, onStage, startAdding }: { s: LineRead; rec: LineRecords; may: boolean; today: string; floor: Map<string, FloorWord>; proofs: ReadonlyMap<string, Proof>; onStage: StageOnly[]; startAdding: boolean }) {
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
        <span className="sub">{programs.length ? `${programs.length} program${programs.length === 1 ? '' : 's'} · ${proved} proved` : onStage.length ? '' : 'No programs yet'}{late ? <> · <b className="is-r">{late} late</b></> : null}
          {onStage.length > 0 && <>{programs.length ? ' · ' : ''}{onStage.length} more on {(n => (n.length === 1 ? `${n[0]}’s` : `${n.length} projects’`))([...new Set(onStage.map(x => x.projectName))])} Commission</>}</span>
      </div>
      {groups.map(g => (
        <div key={g.key || 'line'} className="lp-m">
          <h3 className="lp-mh">{g.m ? g.m.name : 'The line itself'}{g.m?.record?.oem ? <span className="sub"> · {g.m.record.oem}</span> : null}</h3>
          <ul className="mt-list pgr-list">
            {g.rows.map((p, k) => (
              <ProgramRow key={p.id} p={p} line={line} machines={machines} today={today} may={may} rec={rec} floor={floor.get(p.id)} proof={proofs.get(p.id)}
                {...(!p.projectId && may ? { move: (by => ({ ...(k > 0 ? { up: () => by(-1) } : {}), ...(k < g.rows.length - 1 ? { down: () => by(1) } : {}) }))(
                  async (step: -1 | 1) => { const changed = movedOne(own, p.id, step, q => machineOfProgram(q, machines) === g.m); if (changed.length) await putPrograms(changed); }) } : {})} />
            ))}
          </ul>
        </div>
      ))}
      {onStage.length > 0 && <OnProjectsStage rows={onStage} />}
      {may && (
        <AddFold label={`Plan a program on ${line.name}`} start={startAdding}>
          <AddLineProgram line={line} machines={machines} products={products} />
        </AddFold>
      )}
    </section>
  );
}

/** PROGRAMS TYPED ON A PROJECT'S COMMISSION — a line on a machine's *Programs loaded*, no program record behind it
 *  (23 October: "programs on the line in my factory, it's like you don't have any programs"). Said here as the
 *  project says it, its machine named; tested, edited and made a program on the project's own Programs, one tap. */
function OnProjectsStage({ rows }: { rows: StageOnly[] }) {
  const byProject = rows.reduce((m, r) => m.set(r.projectId, [...(m.get(r.projectId) ?? []), r]), new Map<string, StageOnly[]>());
  return (
    <div className="lp-m lp-stage">
      {[...byProject].map(([pid, rs]) => (
        <div key={pid}>
          <h3 className="lp-mh">On {rs[0].projectName}’s Commission <span className="sub">· typed on Programs loaded, not on a list yet</span>{' '}
            <button type="button" className="cw-link" onClick={() => nav(`/project/${pid}/programs`)}>Its Programs ›</button></h3>
          <ul className="mt-list pgr-list">
            {rs.map((r, i) => <StageRow key={`${pid}-${i}`} l={r.line} onOpen={() => nav(`/project/${pid}/programs`)} />)}
          </ul>
        </div>
      ))}
    </div>
  );
}

function StageRow({ l, onOpen }: { l: ProgramLine; onOpen: () => void }) {
  return (
    <li className="pgr lp-row" data-stage-program={l.what}>
      <button type="button" className="pgr-main" onClick={onOpen} aria-label={`${l.what} — ${l.word}, on its project's Programs`}>
        <span className="pgr-top"><span className="pgr-name">{l.what}</span><span className={'spp-pill is-' + l.tone}>{l.word}</span></span>
        <span className="pgr-meta">{l.machine}{l.runs ? ` · runs ${l.runs}` : ''}</span>
        {l.note && <span className="pgr-said">{l.note}</span>}
      </button>
    </li>
  );
}

/** ONE ROW A PROGRAM (ui/ProgramRow — the job's Programs draws the same):
 *  its name, where it has got to and when in one pill, what it runs and
 *  whose; a tap opens its name, machine, what it runs, whose, test day,
 *  commentary, where it has got to (proved asks the day and what showed it),
 *  order and Delete. The row used to be every one of those boxes at once,
 *  open on every program (Rowland, 16 October: "cant edit simpley the ui
 *  very long"). */
function ProgramRow({ p, line, machines, today, may, rec, floor, proof, move }: {
  p: Program; line: Workspace; machines: LineMachine[]; today: string; may: boolean; rec: LineRecords;
  /** What its job's Set up said of it, when it is a job's (lib/useJobFloor). */
  floor?: FloorWord;
  /** How it was proved, when it is (lib/programsReport proofOf). */
  proof?: Proof;
  move?: { up?: () => Promise<void>; down?: () => Promise<void> };
}) {
  const [open, setOpen] = useState(false);
  const [proving, setProving] = useState(false);
  const where = standingOf(p, today), got = stateOf(p);
  const job = p.projectId ? rec.jobs.find(j => j.id === p.projectId) : undefined;
  const machine = machineOfProgram(p, machines);
  /* A job's program is the job's to change, where it is set up and proved; a
     line's own is changed here. */
  const edit = may && !p.projectId;
  const word = isProved(p) ? when(p, today) : `${STATE_WORD[got].toLowerCase()} · ${when(p, today)}`;
  const tone = isProved(p) ? 'g' : where === 'overdue' ? 'r' : got === 'needed' ? 'n' : 'w';
  const save = (patch: Partial<Program>) => putProgram({ ...p, ...patch });

  return (
    <ProgramRowShell className={'lp-row is-pg-' + where} dataProgram={p.id} what={p.what} word={word} tone={tone}
      meta={[p.runs && `runs ${p.runs}`, p.from && `whose: ${p.from}`].filter(Boolean).join(' · ') || undefined}
      {...(p.note ? { note: p.note } : {})}
      /* A JOB'S PROGRAM HAS NO FORM HERE (it is the job's to change, where it is set up and proved) — pressing it goes
         to the job's Programs, where it opens. It used to light up and show nothing (25 October, Rowland: "I press to
         open it and it doesn't"). Where there is neither a form nor a job (a client's view of a line's own), a press
         does nothing and the row does not say it does. */
      open={open} onToggle={() => { if (edit) { setOpen(!open); setProving(false); } else if (job) nav(`/project/${job.id}/programs`); }}
      {...(edit ? {} : { tap: job ? `open it on ${job.name}’s Programs` : '' })}
      after={(job || (isProved(p) && proof)) ? <>
        {job && (
          <div className="mt-facts lp-job">on <button type="button" className="cw-link" onClick={() => nav(`/project/${job.id}/programs`)}>{job.name} ›</button>{job.archivedAt ? ' (archived)' : ''}</div>
        )}
        {/* ONE PROGRAM, ONE ANSWER (flow audit #3): what its job's floor said
            of it, beside the record's own state — a failure there has
            already put it back on the machine here (lib/programs). */}
        {job && floor && (
          <div className="mt-facts lp-floor">On its Set up: <b className={'is-' + floor.tone}>{floor.word}</b>{floor.note ? ` — ${floor.note}` : ''}</div>
        )}
        {/* HOW IT WAS PROVED (flow audit #21) — its test, the study that
            showed it (one tap to it), or signed off by hand; amber when
            nothing said shows it. */}
        {isProved(p) && proof && (
          <div className={'lp-how is-' + proof.tone}>{proof.word}
            {proof.studyId && (s => s && <>{' '}<button type="button" className="cw-link" onClick={() => nav(studyHref(s))}>Open it ›</button></>)(rec.studies.find(x => x.id === proof.studyId))}
          </div>
        )}
      </> : undefined}
      {...(edit ? { panel: <>
        <ProgramFields withNote
          machines={[{ value: '', label: 'The line itself' }, ...machines.map(m => ({ value: m.name, label: m.name }))]}
          start={{ what: p.what, machine: machine?.name ?? '', runs: p.runs ?? '', who: p.from ?? '', testDay: p.testOn ?? '', note: p.note ?? '' }}
          onClose={() => setOpen(false)}
          onSave={async d => {
            const next: Program = { ...p, what: d.what.trim() || p.what, runs: d.runs.trim() || undefined, from: d.who.trim() || undefined,
              testOn: d.testDay || undefined, note: d.note.trim() || undefined };
            /* a machine not yet on the line's list joins it (db/lineRecords) */
            if (d.machine !== (machine?.name ?? '')) await putProgramOnMachine(next, line.id, d.machine);
            else await putProgram(next);
            setOpen(false);
            offerUndo(`“${next.what}” — saved`, () => putProgram(p));
          }}
          {...(move ? { onMove: { ...(move.up ? { up: () => void move.up?.() } : {}), ...(move.down ? { down: () => void move.down?.() } : {}) } } : {})}
          onDelete={() => void deleteProgramWithTests(p.id).then(undo => offerUndo(`Took “${p.what}” off ${line.name}`, undo))}
          extra={
            /* Where it's got to. A select, not a toggle: three states are three
               states. Proved asks the day and what showed it (flow audit #21). */
            <label className="spp-f">
              <span>Where it&rsquo;s got to</span>
              <select className={'pg-state-sel is-pg-' + got} value={proving ? 'proved' : got} aria-label={`Where ${p.what} has got to`}
                onChange={e => {
                  const next = e.target.value as ProgramState;
                  if (next === 'proved') { setProving(true); return; }
                  setProving(false);
                  void save({ state: next, provedOn: undefined });
                }}>
                <option value="needed">Not written</option>
                <option value="onMachine">On the machine</option>
                <option value="proved">Proved</option>
              </select>
            </label>
          } />
        {isProved(p) && (
          <label className="spp-f lp-proved-on"><span>The day it was proved</span>
            <DateInput className="mt-due" aria-label={`Day ${p.what} was proved`} value={p.provedOn}
              onCommit={v => void save(v ? { state: 'proved', provedOn: v } : { state: 'onMachine', provedOn: undefined })} /></label>
        )}
        {/* PROVED ASKS THE DAY AND WHAT SHOWED IT, or the study on the line
            that did (flow audit #21) — a job's test in Commission is the third
            way, planned on the job. */}
        {proving && (
          <ProveProgram p={p} studies={rec.studies.filter(x => x.workspaceId === line.id)} onClose={() => setProving(false)}
            testDoor={(j => j && <>Or prove it by a test in Commission on <button type="button" className="cw-link" onClick={() => nav(`/project/${j.id}/programs`)}>{j.name} ›</button></>)(
              rec.jobs.find(j => !!j.commissioning && !j.archivedAt && rec.jobLines.some(l => l.projectId === j.id && l.workspaceId === line.id && !l.deletedAt)))} />
        )}
      </> } : {})} />
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
        <div className="proj-field mt-add-much"><ProductsBox value={runs} onChange={setRuns} suggest={products} listId={listId} /></div>
        <label className="proj-field mt-add-due">
          <span className="field-label">Testing on</span>
          <input className="text-input" type="date" value={testOn} aria-label="The day it is tested" onChange={e => setTestOn(e.target.value)} />
        </label>
        <label className="proj-field">
          <span className="field-label">Whose</span>
          <input className="text-input" value={from} maxLength={80} placeholder="e.g. Ilapak UK" aria-label="Whose it is" onChange={e => setFrom(e.target.value)} />
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
