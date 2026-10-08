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
 * then be given a status and a problem. The list itself — test days, proving
 * in Commission — is at the foot of the page, where it moved from Set up. */
import { useEffect, useMemo, useState } from 'react';
import { useTesting } from '../lib/useTesting';
import { usePrograms } from '../lib/usePrograms';
import { useProject } from '../lib/useProjects';
import { useAccess } from '../cloud/access';
import { live, type TestItem } from '../lib/testing';
import { isProgramsStage } from '../lib/programs';
import { programsReading, type ProgBucket, type ProgramLine } from '../lib/programsReport';
import { niceDay, todayISO } from '../lib/weeks';
import { pdfFileName } from '../lib/fileName';
import { StageParts } from '../ui/StageParts';
import { openRecord, openRecordAt } from '../ui/RecordDrawer';
import { AccessNote } from '../ui/AccessNote';
import { Fold } from '../ui/Fold';
import { ProgramsScreen } from './ProgramsScreen';
import { navReplace } from '../state/useRoute';

type Filter = 'all' | ProgBucket;
const FILTERS: { key: Filter; word: string }[] = [
  { key: 'all', word: 'All' }, { key: 'failed', word: 'Failed' }, { key: 'late', word: 'Late' },
  { key: 'baseline', word: 'At baseline' }, { key: 'open', word: 'To do' }, { key: 'done', word: 'Passed or done' },
];
/* Only the abnormal count wears colour; a zero is grey (CLAUDE.md). */
const TILE_TONE: Record<ProgBucket, string> = { done: 'g', baseline: 'g', failed: 'r', late: 'r', open: 'n' };

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

  const reading = useMemo(() => (tt.loading || progs.loading ? undefined
    : programsReading({ tests: tt.tests, items: tt.items, assets: tt.assets, programs: progs.programs, today })),
  [tt.loading, progs.loading, tt.tests, tt.items, tt.assets, progs.programs, today]);

  if (tt.loading || progs.loading || !project) return <div className="wrap pace"><p className="sub">Loading…</p></div>;

  const assets = live(tt.assets).sort((a, b) => a.sort - b.sort);
  const stages = live(tt.tests).filter(isProgramsStage);
  const lines = reading?.lines ?? [];
  const count = (b: Filter) => (b === 'all' ? lines.length : lines.filter(l => l.bucket === b).length);
  const keep = (l: ProgramLine) => filter === 'all' || l.bucket === filter;
  /* The parts the filter keeps, for the stage's own list. */
  const keptParts = new Set(lines.filter(keep).map(l => l.partId).filter((x): x is string => !!x));
  const onlyKept = filter === 'all' ? undefined : (p: TestItem) => keptParts.has(p.id);
  /* The machines in the job's order, then the line itself when anything is
     on it — every machine shows, so a programs stage can be added to one. */
  const machines = [...assets.map(a => ({ id: a.id, name: a.name })),
    ...(stages.some(s => !s.assetId) || lines.some(l => !l.assetId) ? [{ id: '', name: 'The line' }] : [])];
  const shownMachines = machines.filter(m => machineF === 'all' || m.id === machineF);

  const download = async () => {
    if (!reading || busy) return;
    setBusy(true); setSaid(null);
    try {
      const { loadPdfLib, deliverPdf } = await import('../lib/savePdf');
      const { drawProgramsReport } = await import('../lib/programsReportPdf');
      const { jsPDF } = await loadPdfLib();
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      await drawProgramsReport(doc, { name: project.name, ...(project.lead ? { lead: project.lead } : {}), printed: niceDay(today, { year: true }), reading });
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
          <p className="pace-lede">Every program, machine by machine — where each stands, what was seen, the problems on it. Say its status, hit a problem, add one — all here.</p>
        </div>
        <div className="pace-head-actions">
          <button type="button" className="btn btn-primary" disabled={!reading || busy} onClick={() => void download()}>{busy ? 'Making it…' : 'Programs report — PDF'}</button>
        </div>
      </header>
      {said && <p className="tc-ok" role="status">{said}</p>}
      <AccessNote can={can} owner={project.lead} />

      {/* WHERE THE PROGRAMS ARE — a tile per state, each a filter. */}
      <div className="pp-tiles" role="group" aria-label="Show">
        {FILTERS.map(f => {
          const n = count(f.key);
          const tone = f.key === 'all' ? 'n' : n ? TILE_TONE[f.key] : 'z';
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
        /* On the Programs list only — no line on the stage yet. */
        const listOnly = mine.filter(l => !l.partId && keep(l));
        const n = mine.length, done = mine.filter(l => l.bucket === 'done' || l.bucket === 'baseline' || l.bucket === 'failed').length, bad = mine.filter(l => l.bucket === 'failed' || l.bucket === 'late').length;
        return (
          <section key={m.id || 'line'} className="pp-m" aria-label={m.name}>
            <div className="pp-mh">
              <h2>{m.name}</h2>
              <span className="sub">{n ? `${n} program${n === 1 ? '' : 's'} · ${done} done` : 'No programs yet'}{bad ? <> · <b className="in-late">{bad} failed or late</b></> : null}</span>
            </div>
            {stage
              ? <StageParts step={stage} tt={tt} can={can} only={onlyKept} onOpen={id => openRecord(projectId, id)}
                  onRunProblem={can.edit ? (tid, rid) => openRecordAt(projectId, tid, rid) : undefined}
                  onProblem={can.edit ? p => openRecordAt(projectId, stage.id, p.id) : undefined} />
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
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {/* THE PROGRAMS LIST — test days, and proving each one in Commission. It
          sat under Set up's grid; Programs is its home now. */}
      <Fold id="pp-list" title="Test days and proving in Commission" start={false}
        says="The Programs list: written, on the machine, its test day and the test that proved it.">
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
