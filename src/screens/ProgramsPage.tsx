/* PROGRAMS — a page of its own, in the rail between Set up and Commission.
 *
 * Rowland, 8 October: "We need to elevate the entire program system ... I
 * tick on Programs loaded, I get a little sad bar ... I can't widen the
 * screen. There's no individual report ... Programs will always be part of
 * this app. Programs 100% can never go away, so invest in it."
 *
 * Every program on the job, machine by machine, the whole width of the
 * screen: where each stands in words and its colour, what was seen, the
 * problems written on it and what was said before — and the work done right
 * here (say its status, hit a problem, add, edit, move, delete). One reading
 * with the reports (lib/programsReport): the tiles, the machines and the PDF
 * say what the programs report and the client report say.
 *
 * No new record. A machine's programs are the parts of its programs stage on
 * Set up (ui/StageParts — the same list the stage's drawer shows, here wide),
 * and the programs on the Programs list (lib/programs — written, on the
 * machine, proved by a test in Commission) beside them; one of the same name
 * on the same machine is one program. A program only on the list can be
 * tracked here in one tap — it becomes a line on its machine's stage and can
 * then be given a status and a problem.
 *
 * TESTED WHERE IT SITS (Rowland, 14 October: "the ui is poor and makes no
 * sense ... reach it only from programs and improve the ui to actually run
 * it?" — "do it"). Every program on the Programs list — the job's, and its
 * lines' own on the job's machine of their name, marked by their line — has
 * its test on its row (ui/ProgramTest): Test it, how it went, what was seen,
 * the day. It replaced "Prove it in Commission" and "plan its test", which
 * made a test and opened a drawer of boxes, and the lines' own section below
 * the machines — a second list of the same kind of thing. The list itself —
 * adding one, its name, machine, order and test day — is at the foot. */
import { useEffect, useMemo, useState } from 'react';
import { useTesting } from '../lib/useTesting';
import { usePrograms } from '../lib/usePrograms';
import { useProject } from '../lib/useProjects';
import { useAccess } from '../cloud/access';
import { live, type TestItem } from '../lib/testing';
import { STATE_WORD, isProgramsStage, stateOf } from '../lib/programs';
import { programsReading, type ProgBucket, type ProgramLine } from '../lib/programsReport';
import { niceDay, todayISO } from '../lib/weeks';
import { pdfFileName } from '../lib/fileName';
import { StageParts } from '../ui/StageParts';
import { openRecord, openRecordAt } from '../ui/RecordDrawer';
import { MachineName } from '../ui/MachinePanel';
import { AccessNote } from '../ui/AccessNote';
import { Fold } from '../ui/Fold';
import { ProgramsScreen } from './ProgramsScreen';
import { ProgramTest } from '../ui/ProgramTest';
import { programsToPick, type PickRow } from '../lib/commissionPrograms';
import { nav, navReplace } from '../state/useRoute';
import { answerOf } from '../lib/install';
import { jobLinePrograms, jobLineReadings, lineOfProgram } from '../lib/lineRecords';
import { useLineRecords } from '../lib/useLineRecords';

/* The two said "why" of the ones to do (12 October): not tested, no program. */
type Said = 'notTested' | 'noProgram';
type Filter = 'all' | ProgBucket | Said;
const FILTERS: { key: Filter; word: string }[] = [
  { key: 'all', word: 'All' }, { key: 'failed', word: 'Failed' }, { key: 'late', word: 'Late' },
  { key: 'noProgram', word: 'No program' }, { key: 'notTested', word: 'Not tested' },
  { key: 'baseline', word: 'At baseline' }, { key: 'open', word: 'To do' }, { key: 'done', word: 'Passed or done' },
];
/* Only the abnormal count wears colour; a zero is grey (CLAUDE.md) — no
   program waits on whoever writes it (amber); not tested is still to do. */
const TILE_TONE: Record<Exclude<Filter, 'all'>, string> = { done: 'g', baseline: 'g', failed: 'r', late: 'r', open: 'n', noProgram: 'a', notTested: 'n' };
const isSaid = (f: Filter): f is Said => f === 'notTested' || f === 'noProgram';

export function ProgramsPage({ projectId }: { projectId: string }) {
  const tt = useTesting(projectId);
  const progs = usePrograms(projectId);
  const { project } = useProject(projectId);
  const can = useAccess(projectId);
  const [filter, setFilter] = useState<Filter>('all');
  const [machineF, setMachineF] = useState('all');
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const today = todayISO();
  const rec = useLineRecords();
  /* ?test=<program> — Commission's "Test it" lands on that program's row, open. */
  const [testing] = useState(() => /[?&]test=([^&]+)/.exec(window.location.hash)?.[1]);

  const reading = useMemo(() => (tt.loading || progs.loading ? undefined
    : programsReading({ tests: tt.tests, items: tt.items, assets: tt.assets, programs: progs.programs, today, holder: project, studies: rec.studies })),
  [tt.loading, progs.loading, tt.tests, tt.items, tt.assets, progs.programs, today, project, rec.studies]);
  /* THE LINE'S OWN PROGRAMS on paper too — the page shows them under the
     job's (ui/LineProgramsOnJob), so its report carries them (lib/lineRecords). */
  const lineReadings = useMemo(() => jobLineReadings(jobLinePrograms(projectId, rec.all, rec.machines, rec.programs, rec.jobLines), today,
    { tests: [...tt.tests, ...rec.provingTests.filter(t => !tt.tests.some(u => u.id === t.id))], studies: rec.studies }), [rec, projectId, today, tt.tests]);

  if (tt.loading || progs.loading || !project) return <div className="wrap pace"><p className="sub">Loading…</p></div>;

  const assets = live(tt.assets).sort((a, b) => a.sort - b.sort);
  const stages = live(tt.tests).filter(t => isProgramsStage(t, answerOf(t, project, tt.items)));
  const lines = reading?.lines ?? [];
  /* THE LINES' OWN, each on the job's machine of its name (lib/commissionPrograms). */
  const jobLines = jobLinePrograms(projectId, rec.all, rec.machines, rec.programs, rec.jobLines);
  const lineRows = programsToPick([], jobLines, tt.assets, tt.tests).flatMap(g => g.rows.map(r => ({ ...r, line: jobLines.find(l => l.id === g.key)?.name ?? '' })));
  const testOf = (p: { id: string } | undefined, assetId: string) => {
    const prog = p && progs.programs.find(x => x.id === p.id);
    return prog ? <ProgramTest projectId={projectId} program={prog} assetId={assetId || undefined} tt={tt} can={can} open={testing === prog.id} /> : null;
  };
  /* ONE PROGRAM, ONE ANSWER (flow audit #3): where a part is a program on the
     Programs list, the record's own state — what the line's Programs and the
     control room say — beside the floor's, named with its line. */
  const recordOf = new Map(lines.flatMap(l => {
    if (rec.loading || !l.partId || !l.record || !l.programId) return [];
    const p = progs.programs.find(x => x.id === l.programId);
    const ws = p ? lineOfProgram(p, rec.jobLines) : undefined;
    const name = ws ? rec.all.find(w => w.id === ws)?.name : undefined;
    return [[l.partId, { word: `${name ? `On ${name}` : 'On the Programs list'}: ${l.record.word}`, tone: l.record.tone }] as const];
  }));
  const count = (b: Filter) => (b === 'all' ? lines.length : lines.filter(l => (isSaid(b) ? l.said === b : l.bucket === b)).length);
  const keep = (l: ProgramLine) => filter === 'all' || (isSaid(filter) ? l.said === filter : l.bucket === filter);
  /* The parts the filter keeps, for the stage's own list. */
  const keptParts = new Set(lines.filter(keep).map(l => l.partId).filter((x): x is string => !!x));
  const onlyKept = filter === 'all' ? undefined : (p: TestItem) => keptParts.has(p.id);
  /* The machines in the job's order, then the line itself when anything is
     on it — every machine shows, so a programs stage can be added to one. */
  const machines = [...assets.map(a => ({ id: a.id, name: a.name })),
    ...(stages.some(s => !s.assetId) || lines.some(l => !l.assetId) || lineRows.some(r => !r.assetId) ? [{ id: '', name: 'The line' }] : [])];
  const shownMachines = machines.filter(m => machineF === 'all' || m.id === machineF);

  const download = async () => {
    if ((!reading && !lineReadings.length) || busy) return;
    setBusy(true); setSaid(null);
    try {
      const { loadPdfLib, deliverPdf } = await import('../lib/savePdf');
      const { drawProgramsReport } = await import('../lib/programsReportPdf');
      const { jsPDF } = await loadPdfLib();
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      await drawProgramsReport(doc, { name: project.name, ...(project.lead ? { lead: project.lead } : {}), printed: niceDay(today, { year: true }), linePrograms: lineReadings,
        reading: reading ?? { lines: [], machines: [], total: 0, done: 0, baseline: 0, failed: 0, late: 0, open: 0, notTested: 0, noProgram: 0, doneAll: 0, says: 'None of the job’s own yet — its line’s are below' } });
      const how = await deliverPdf(doc, pdfFileName(project.name, 'programs', today));
      setSaid(how === 'downloaded' ? 'Saved — open or send it from the bar below.' : 'Ready — open it from the bar below.');
    } catch (e) {
      console.error('programs report failed', e);
      setSaid('The report could not be made — try again.');
    } finally { setBusy(false); }
  };

  return (
    <div className="wrap pace pp">
      <header className="pace-head">
        <div className="pace-head-main">
          <h1 className="pace-title">Programs</h1>
          <p className="pace-lede">Every program, machine by machine — where each stands, what was seen, the problems on it. Test it, say its status, hit a problem, add one — all here.
            {jobLines.length > 0 && <>{' '}Its lines&rsquo; own are under their machines{jobLines.map(l => <span key={l.id}> · <button type="button" className="cw-link" onClick={() => nav(`/programs?line=${encodeURIComponent(l.id)}`)}>{l.name}&rsquo;s programs ›</button></span>)}</>}</p>
        </div>
        <div className="pace-head-actions">
          <button type="button" className="btn btn-primary" disabled={(!reading && !lineReadings.length) || busy} onClick={() => void download()}>{busy ? 'Making it…' : 'Programs report — PDF'}</button>
        </div>
      </header>
      {said && <p className="tc-ok" role="status">{said}</p>}
      <AccessNote can={can} owner={project.lead} />

      {/* WHERE THE PROGRAMS ARE — a tile per state, each a filter. */}
      <div className="pp-tiles" role="group" aria-label="Show">
        {FILTERS.map(f => {
          const n = count(f.key);
          const tone = f.key === 'all' ? 'n' : n ? TILE_TONE[f.key as Exclude<Filter, 'all'>] : 'z';
          return (
            <button key={f.key} type="button" className={`pp-tile is-${tone}${filter === f.key ? ' on' : ''}`} aria-pressed={filter === f.key}
              onClick={() => setFilter(filter === f.key && f.key !== 'all' ? 'all' : f.key)}>
              <b>{n}</b><span>{f.word}</span>
            </button>
          );
        })}
      </div>
      {machines.length > 1 && (
        <div className="chip-row pp-mf" role="group" aria-label="Which machine">
          <button type="button" className={'chip' + (machineF === 'all' ? ' on' : '')} aria-pressed={machineF === 'all'} onClick={() => setMachineF('all')}>Every machine</button>
          {machines.map(m => (
            <button key={m.id || 'line'} type="button" className={'chip' + (machineF === m.id ? ' on' : '')} aria-pressed={machineF === m.id} onClick={() => setMachineF(m.id)}>{m.name}</button>
          ))}
        </div>
      )}

      {shownMachines.map(m => {
        const stage = stages.find(s => (s.assetId ?? '') === m.id);
        const mine = lines.filter(l => (l.assetId ?? '') === m.id);
        /* the lines' own on this machine — shown with every filter but the
           machine's, as they are not counted in the tiles */
        const theirs: (PickRow & { line: string })[] = filter === 'all' ? lineRows.filter(r => (r.assetId ?? '') === m.id) : [];
        const programOfPart = new Map(mine.filter(l => l.partId && l.programId).map(l => [l.partId as string, l.programId as string]));
        /* On the Programs list only — no line on the stage yet. */
        const listOnly = mine.filter(l => !l.partId && keep(l));
        /* a failed program is not done — it is the red count beside (flow audit #3) */
        const n = mine.length, done = mine.filter(l => l.bucket === 'done' || l.bucket === 'baseline').length, bad = mine.filter(l => l.bucket === 'failed' || l.bucket === 'late').length;
        return (
          <section key={m.id || 'line'} className="pp-m" aria-label={m.name}>
            <div className="pp-mh">
              {/* The machine's name opens the machine (docs/FLOW.md item 2). */}
              <h2>{m.id ? <MachineName name={m.name} onOpen={() => openRecord(projectId, m.id)} /> : m.name}</h2>
              <span className="sub">{n ? `${n} program${n === 1 ? '' : 's'} · ${done} done` : 'No programs yet'}{bad ? <> · <b className="in-late">{bad} failed or late</b></> : null}</span>
            </div>
            {stage
              ? <StageParts step={stage} tt={tt} can={can} holder={project} only={onlyKept} onOpen={id => openRecord(projectId, id)} aside={p => recordOf.get(p.id)}
                  onRunProblem={can.edit ? (tid, rid) => openRecordAt(projectId, tid, rid) : undefined}
                  onProblem={can.edit ? p => openRecordAt(projectId, stage.id, p.id) : undefined}
                  after={p => (id => id ? testOf({ id }, m.id) : null)(programOfPart.get(p.id))} />
              : can.edit && m.id
                ? <p className="sub pp-nostage">No programs stage on this machine yet.{' '}
                    <button type="button" className="cw-link" onClick={() => void tt.planSteps(['Programs loaded'], m.id, 'setup')}>Add Programs loaded to it</button></p>
                : null}
            {listOnly.length > 0 && (
              <ul className="pp-listonly" aria-label={`On the Programs list only — ${m.name}`}>
                {listOnly.map(l => (
                  <li key={l.programId}>
                    <b>{l.what}</b>{l.runs ? <span className="sub"> — runs {l.runs}</span> : null}
                    <span className={'pp-word is-' + l.tone}>{l.word}</span>
                    {/* Tracked here, it can be given a status and a problem. */}
                    {can.edit && stage && (
                      <button type="button" className="cw-link" onClick={() => void tt.addItem(stage.id, 'next', l.what, { owner: l.who })}>Track it here</button>
                    )}
                    {testOf(l.programId ? { id: l.programId } : undefined, m.id)}
                  </li>
                ))}
              </ul>
            )}
            {/* ITS LINE'S OWN PROGRAMS on this machine — the line's records,
                planned on the line, tested here (docs/BLUEPRINT.md, Stage 2). */}
            {theirs.length > 0 && (
              <ul className="pp-listonly pp-theirs" aria-label={`The line's own programs — ${m.name}`}>
                {theirs.map(r => (
                  <li key={r.program.id} data-program={r.program.id}>
                    <span className="pp-line-tag">{r.line}&rsquo;s own</span>
                    <b>{r.program.what}</b>{r.program.runs ? <span className="sub"> — runs {r.program.runs}</span> : null}
                    <span className={'pg-state-sel is-pg-' + stateOf(r.program)}>{r.proved ? `proved ${niceDay(r.program.provedOn)}` : STATE_WORD[stateOf(r.program)]}</span>
                    {m.id === '' && r.machine && <span className="sub">{r.machine} is not on this job — tested on the line itself</span>}
                    <ProgramTest projectId={projectId} program={r.program} assetId={r.assetId} tt={tt} can={can} open={testing === r.program.id} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {/* THE PROGRAMS LIST — adding one, its name, machine, order and test
          day. It sat under Set up's grid; Programs is its home now. Testing
          one is on its row above. */}
      <Fold id="pp-list" title="Add a program, or change one’s name, machine, order or test day" start={false}
        says="The Programs list: each program, its machine, what it runs and its test day. Test one on its row above.">
        <ProgramsScreen projectId={projectId} embedded />
      </Fold>
    </div>
  );
}

/* PROGRAMS ARE SHOWN ONCE ON A JOB. They are set up under Set up on a stage-gate
 * job and live under Materials on a 3P or tree job; this page drew them a
 * second time on their own, with the Materials tab lit. A link to /programs —
 * from the plan, from a date's story — lands on the page that holds them. */
export function ProgramsDoor({ projectId }: { projectId: string }) {
  const { loading, project } = useProject(projectId);
  const commissioning = !!project?.commissioning;
  useEffect(() => {
    if (loading || commissioning) return;
    navReplace(`/project/${projectId}/materials`);
  }, [loading, commissioning, projectId]);
  /* A stage-gate job has a Programs page of its own (8 October: "programs
     100% can never go away, so invest in it") — screens/ProgramsPage. */
  if (!loading && commissioning) return <ProgramsPage projectId={projectId} />;
  return <div className="wrap pace"><p className="sub">Loading…</p></div>;
}
