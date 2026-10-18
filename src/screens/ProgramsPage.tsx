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
 * Set up (lib/noted) and the programs on the Programs list (lib/programs —
 * written, on the machine, proved by its test); one of the same name on the
 * same machine is one program.
 *
 * TESTED WHERE IT SITS (Rowland, 14 October: "reach it only from programs
 * and improve the ui to actually run it?" — "do it"). Every program has its
 * test on its row (ui/ProgramTest): Test it, how it went, what was seen, the
 * day.
 *
 * ONE ROW, ONE FORM, ONE DATE (Rowland, 16 October: "its very complex, cant
 * edit simpley the ui very long ,, i feel we have to many views and doors").
 * A program is one row however it is kept (ui/ProgramRow): the stage's line,
 * one only on the list, a line's own — no "Track it here", no second pill
 * from the other record unless it says something worse. Status and Test it
 * are one form. A tap on the row opens its name, machine, what it runs,
 * whose, test day, order, problems and history — so the Programs list that
 * sat folded at the foot (screens/ProgramsScreen, a whole second editor of
 * the same programs, with a week grid the plan already draws) is gone from
 * here: every field it edited is on the row, and adding one is the box under
 * each machine, which makes the machine's programs stage when it has none.
 * The eight tiles are the chips worth showing: a zero is not a filter
 * anyone needs, and the sentence above them still says every count. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTesting } from '../lib/useTesting';
import { usePrograms } from '../lib/usePrograms';
import { useProject } from '../lib/useProjects';
import { live, type Test } from '../lib/testing';
import { STATE_WORD, isProgramsStage, standingOf, stateOf } from '../lib/programs';
import { programsReading, type ProgBucket, type ProgramLine } from '../lib/programsReport';
import { niceDay, todayISO } from '../lib/weeks';
import { pdfFileName } from '../lib/fileName';
import { openRecord, openRecordAt } from '../ui/RecordDrawer';
import { MachineName, openMachine } from '../ui/MachinePanel';
import { AccessNote } from '../ui/AccessNote';
import { ProgramTest } from '../ui/ProgramTest';
import { JobProgramRow, ProgramFields, ProgramRowShell } from '../ui/ProgramRow';
import { useAccess, useCanStartProjects } from '../cloud/access';
import { deleteProgramWithTests, putProgram, putProgramOnMachine } from '../db';
import { offerUndo } from '../ui/Undo';
import type { Program } from '../lib/programs';
import { PutAllOn } from './ProgramsScreen';
import { programsToPick, type PickRow } from '../lib/commissionPrograms';
import { nav, navReplace } from '../state/useRoute';
import { answerOf } from '../lib/install';
import { jobLinePrograms, jobLineReadings, lineOfProgram } from '../lib/lineRecords';
import { LeanClosing } from '../ui/Lean';
import { useJobMoney } from '../lib/useJobMoney';
import { MONEY_WAIT, programClosing } from '../lib/stageGatePages';
import { useLineRecords } from '../lib/useLineRecords';

/* The two said "why" of the ones to do (12 October): not tested, no program. */
type Said = 'notTested' | 'noProgram';
type Filter = 'all' | ProgBucket | Said;
const FILTERS: { key: Filter; word: string }[] = [
  { key: 'all', word: 'All' }, { key: 'failed', word: 'Failed' }, { key: 'late', word: 'Late' },
  { key: 'noProgram', word: 'No program' }, { key: 'notTested', word: 'Not tested' },
  { key: 'baseline', word: 'At baseline' }, { key: 'open', word: 'To do' }, { key: 'done', word: 'Passed or done' },
];
/* Only the abnormal count wears colour (CLAUDE.md) — no program waits on
   whoever writes it (amber); not tested is still to do. */
const TILE_TONE: Record<Exclude<Filter, 'all'>, string> = { done: 'g', baseline: 'g', failed: 'r', late: 'r', open: 'n', noProgram: 'a', notTested: 'n' };
const isSaid = (f: Filter): f is Said => f === 'notTested' || f === 'noProgram';
type LineRow = PickRow & { line: string; lineId: string };

export function ProgramsPage({ projectId, only }: {
  projectId: string;
  /** One machine's programs, on its own page (screens/MachineScreen): the
   *  same rows and the same form, under "Its programs" — no page head. */
  only?: string;
}) {
  const tt = useTesting(projectId);
  const progs = usePrograms(projectId);
  const { project } = useProject(projectId);
  const can = useAccess(projectId);
  /* THE JOB'S MONEY (lib/useJobMoney) — said in the closing line when the slip has run one up */
  const money = useJobMoney(projectId);
  const [filter, setFilter] = useState<Filter>('all');
  const [machineF, setMachineF] = useState('all');
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const today = todayISO();
  const rec = useLineRecords();
  /* ?test=<program> — Commission's "Test it" lands on that program's row, open. */
  const [testing] = useState(() => (m => (m ? decodeURIComponent(m) : undefined))(/[?&]test=([^&]+)/.exec(window.location.hash)?.[1]));

  const reading = useMemo(() => (tt.loading || progs.loading ? undefined
    : programsReading({ tests: tt.tests, items: tt.items, assets: tt.assets, programs: progs.programs, today, holder: project, studies: rec.studies })),
  [tt.loading, progs.loading, tt.tests, tt.items, tt.assets, progs.programs, today, project, rec.studies]);
  /* THE LINE'S OWN PROGRAMS on paper too — the page shows them under the
     job's machines, so its report carries them (lib/lineRecords). */
  const lineReadings = useMemo(() => jobLineReadings(jobLinePrograms(projectId, rec.all, rec.machines, rec.programs, rec.jobLines), today,
    { tests: [...tt.tests, ...rec.provingTests.filter(t => !tt.tests.some(u => u.id === t.id))], studies: rec.studies }), [rec, projectId, today, tt.tests]);

  if (tt.loading || progs.loading || !project) return <div className="wrap pace"><p className="sub">Loading…</p></div>;

  const assets = live(tt.assets).sort((a, b) => a.sort - b.sort);
  const stages = live(tt.tests).filter(t => isProgramsStage(t, answerOf(t, project, tt.items)));
  const lines = reading?.lines ?? [];
  /* THE LINES' OWN, each on the job's machine of its name (lib/commissionPrograms). */
  const jobLines = jobLinePrograms(projectId, rec.all, rec.machines, rec.programs, rec.jobLines);
  const lineRows: LineRow[] = programsToPick([], jobLines, tt.assets, tt.tests).flatMap(g => g.rows.map(r => ({ ...r, line: jobLines.find(l => l.id === g.key)?.name ?? '', lineId: g.key })));
  /* ONE PROGRAM, ONE ANSWER (flow audit #3): the program record's own state
     — what the line's Programs and the control room say — said on the row
     only when it is worse than the floor's (a failure the floor has not said,
     a test day gone), named with its line. */
  const asideOf = (l: ProgramLine): { word: string; tone: string } | undefined => {
    if (rec.loading || !l.partId || !l.record || l.record.tone !== 'r' || l.tone === 'r') return undefined;
    const p = progs.programs.find(x => x.id === l.programId);
    const ws = p ? lineOfProgram(p, rec.jobLines) : undefined;
    const name = ws ? rec.all.find(w => w.id === ws)?.name : undefined;
    return { word: `${name ? `On ${name}` : 'On the Programs list'}: ${l.record.word}`, tone: l.record.tone };
  };
  const count = (b: Filter) => (b === 'all' ? lines.length : lines.filter(l => (isSaid(b) ? l.said === b : l.bucket === b)).length);
  const keep = (l: ProgramLine) => filter === 'all' || (isSaid(filter) ? l.said === filter : l.bucket === filter);
  /* The machines in the job's order, then the line itself when anything is
     on it — every machine shows, so a program can be added to one. */
  const machines = [...assets.map(a => ({ id: a.id, name: a.name })),
    ...(stages.some(s => !s.assetId) || lines.some(l => !l.assetId) || lineRows.some(r => !r.assetId) ? [{ id: '', name: 'The line' }] : [])];
  const shownMachines = only != null ? machines.filter(m => m.id === only) : machines.filter(m => machineF === 'all' || m.id === machineF);
  const machineOptions = [...assets.map(a => ({ value: a.id, label: a.name })), { value: '', label: 'The line itself' }];
  const keyOf = (l: ProgramLine) => l.partId ?? `p:${l.programId ?? l.what}`;
  const toggle = (k: string) => setOpenRow(openRow === k ? null : k);
  const chips = FILTERS.filter(f => f.key === 'all' || f.key === filter || count(f.key) > 0);

  const download = async () => {
    if ((!reading && !lineReadings.length) || busy) return;
    setBusy(true); setSaid(null);
    try {
      const { loadPdfLib, deliverPdf } = await import('../lib/savePdf');
      const { drawProgramsReport } = await import('../lib/programsReportPdf');
      const { jsPDF } = await loadPdfLib();
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      await drawProgramsReport(doc, { name: project.name, ...(project.lead ? { lead: project.lead } : {}), printed: niceDay(today, { year: true }), linePrograms: lineReadings, ...(money ? { money } : {}),
        reading: reading ?? { lines: [], machines: [], total: 0, done: 0, baseline: 0, failed: 0, late: 0, open: 0, notTested: 0, noProgram: 0, doneAll: 0, says: 'None of the job’s own yet — its line’s are below' } });
      const how = await deliverPdf(doc, pdfFileName(project.name, 'programs', today));
      setSaid(how === 'downloaded' ? 'Saved — open or send it from the bar below.' : 'Ready — open it from the bar below.');
    } catch (e) {
      console.error('programs report failed', e);
      setSaid('The report could not be made — try again.');
    } finally { setBusy(false); }
  };

  if (only != null) {
    return <div className="pp pp-one">{shownMachines.map(m => section(m))}</div>;
  }
  return (
    <div className="wrap pace pp">
      <header className="pace-head">
        <div className="pace-head-main">
          <h1 className="pace-title">Programs</h1>
          <p className="pace-lede pp-says">{reading ? reading.says : 'No programs yet.'}</p>
          <p className="sub pp-how">Tap a program to change it. Say how its test went with the button on its row.
            {jobLines.map(l => <span key={l.id}> · <button type="button" className="cw-link" onClick={() => nav(`/programs?line=${encodeURIComponent(l.id)}`)}>{l.name}&rsquo;s programs ›</button></span>)}</p>
        </div>
        <div className="pace-head-actions">
          <button type="button" className="btn btn-primary" disabled={(!reading && !lineReadings.length) || busy} onClick={() => void download()}>{busy ? 'Making it…' : 'Programs report — PDF'}</button>
        </div>
      </header>
      {said && <p className="tc-ok" role="status">{said}</p>}
      <AccessNote can={can} owner={project.lead} />

      {/* WHERE THE PROGRAMS ARE — a chip a state worth showing, each a filter;
          and which machine. */}
      <div className="pp-bar">
        <div className="pp-chips" role="group" aria-label="Show">
          {chips.map(f => {
            const n = count(f.key);
            const tone = f.key === 'all' ? 'n' : n ? TILE_TONE[f.key as Exclude<Filter, 'all'>] : 'z';
            return (
              <button key={f.key} type="button" className={`pp-chip is-${tone}${filter === f.key ? ' on' : ''}`} aria-pressed={filter === f.key}
                onClick={() => setFilter(filter === f.key && f.key !== 'all' ? 'all' : f.key)}>
                {f.word} <b>{n}</b>
              </button>
            );
          })}
        </div>
        {machines.length > 1 && (
          <select className="text-input pp-mf" value={machineF} aria-label="Which machine" onChange={e => setMachineF(e.target.value)}>
            <option value="all">Every machine</option>
            {machines.map(m => <option key={m.id || 'line'} value={m.id}>{m.name}</option>)}
          </select>
        )}
      </div>
      {can.edit && <PutAllOn state={progs} assets={assets} addAsset={name => tt.addAsset(name)} />}

      {shownMachines.map(m => section(m))}
      {/* THE CLOSING LINE (docs/LEAN-PAGE.md; lib/stageGatePages) — the
          programs in one sentence, and the slip in money. The counted
          figures are the chips above: each is its filter (one thing, one
          place), so this page grows no second row of tiles. */}
      {reading && <LeanClosing closing={programClosing(reading, money ?? MONEY_WAIT)} />}
    </div>
  );

  function section(m: { id: string; name: string }) {
        const mine = lines.filter(l => (l.assetId ?? '') === m.id);
        const kept = mine.filter(keep);
        /* the lines' own on this machine — with every filter but the
           machine's, as they are not counted in the chips */
        const theirs = filter === 'all' ? lineRows.filter(r => (r.assetId ?? '') === m.id) : [];
        /* a failed program is not done — it is the red count beside (flow audit #3) */
        const n = mine.length, done = mine.filter(l => l.bucket === 'done' || l.bucket === 'baseline').length, bad = mine.filter(l => l.bucket === 'failed' || l.bucket === 'late').length;
        if (filter !== 'all' && !kept.length) return null;
        return (
          <section key={m.id || 'line'} className="pp-m" aria-label={m.name}>
            <div className="pp-mh">
              {/* The machine's name opens the machine (docs/FLOW.md item 2). */}
              <h2>{only != null ? 'Its programs' : m.id ? <MachineName name={m.name} onOpen={() => openMachine(projectId, m.id)} /> : m.name}</h2>
              <span className="sub">{n ? `${n} program${n === 1 ? '' : 's'} · ${done} done` : theirs.length ? `${theirs.length} of its line’s own` : 'No programs yet'}{bad ? <> · <b className="in-late">{bad} failed or late</b></> : null}</span>
            </div>
            {(kept.length > 0 || theirs.length > 0) && (
              <ul className="pgr-list" aria-label={`Programs on ${m.name}`}>
                {kept.map((l, k) => {
                  const aside = asideOf(l);
                  return (
                    <JobProgramRow key={keyOf(l)} projectId={projectId} line={l} tt={tt} progs={progs} can={can} stages={stages} machines={machineOptions}
                      {...(aside ? { aside } : {})}
                      open={openRow === keyOf(l)} onToggle={() => toggle(keyOf(l))}
                      testOpen={!!testing && (testing === l.programId || testing === `part:${l.partId}`)}
                      first={k === 0} last={k === kept.length - 1} filtered={filter !== 'all'}
                      onProblem={(tid, pid) => openRecordAt(projectId, tid, pid)} onOpen={id => openRecord(projectId, id)} />
                  );
                })}
                {theirs.map(r => <LineOwnRow key={r.program.id} r={r} onLine={m.id === ''} projectId={projectId} tt={tt} can={can} today={today}
                  machines={jobLines.find(x => x.id === r.lineId)?.machines.map(x => x.name) ?? []}
                  open={openRow === `l:${r.program.id}`} onToggle={() => toggle(`l:${r.program.id}`)} testOpen={testing === r.program.id} />)}
              </ul>
            )}
            {can.edit && filter === 'all' && <AddProgram machine={m} stages={stages} tt={tt} />}
          </section>
        );
  }
}

/** A LINE'S OWN PROGRAM on the job's machine of its name — the line's record,
 *  planned on the line, tested here (docs/BLUEPRINT.md, Stage 2); and now
 *  changed and deleted where it sits too (Rowland, 18 October: "no delete,
 *  but still holds memory" — the row only pointed at the line's Programs).
 *  The same fields and the same rule as there: the factory's records are
 *  changed by someone invited to the app; deleted, its tests still to run go
 *  with it, with Undo. */
function LineOwnRow({ r, onLine, projectId, tt, can, today, open, onToggle, testOpen, machines }: {
  r: LineRow; onLine: boolean; projectId: string;
  tt: ReturnType<typeof useTesting>; can: ReturnType<typeof useAccess>; today: string;
  open: boolean; onToggle: () => void; testOpen: boolean;
  /** The line's machines, by name, in flow order. */
  machines: string[];
}) {
  const may = useCanStartProjects();
  const p = r.program, st = stateOf(p), late = !r.proved && standingOf(p, today) === 'overdue';
  const word = r.proved ? `proved ${niceDay(p.provedOn)}` : late ? `test was due ${niceDay(p.testOn)}`
    : `${STATE_WORD[st].toLowerCase()}${p.testOn ? ` · test ${niceDay(p.testOn)}` : ''}`;
  const tone = r.proved ? 'g' : late ? 'r' : st === 'needed' ? 'n' : 'w';
  return (
    <ProgramRowShell what={p.what} tag={`${r.line}’s own`} word={word} tone={tone} dataProgram={p.id}
      meta={[p.runs && `runs ${p.runs}`, p.from, onLine && r.machine ? `${r.machine} is not on this job — tested on the line itself` : ''].filter(Boolean).join(' · ') || undefined}
      {...(p.note ? { note: p.note } : {})}
      open={open} onToggle={onToggle}
      action={<ProgramTest projectId={projectId} program={p} {...(r.assetId ? { assetId: r.assetId } : {})} tt={tt} can={can} open={testOpen} quiet />}
      panel={<>
        <p className="sub pgr-own">Planned on {r.line} — kept there, and changed here or there alike.{' '}
          <button type="button" className="cw-link" onClick={() => nav(`/programs?line=${encodeURIComponent(r.lineId)}`)}>{r.line}&rsquo;s programs ›</button></p>
        {may && (
          <ProgramFields withNote
            machines={[{ value: '', label: 'The line itself' }, ...machines.map(m => ({ value: m, label: m }))]}
            start={{ what: p.what, machine: r.machine ?? '', runs: p.runs ?? '', who: p.from ?? '', testDay: p.testOn ?? '', note: p.note ?? '' }}
            onClose={onToggle}
            onSave={async d => {
              const next: Program = { ...p, what: d.what.trim() || p.what, runs: d.runs.trim() || undefined, from: d.who.trim() || undefined,
                testOn: d.testDay || undefined, note: d.note.trim() || undefined };
              /* a machine not yet on the line's list joins it (db/lineRecords), as on the line's own page */
              if (d.machine !== (r.machine ?? '')) await putProgramOnMachine(next, r.lineId, d.machine);
              else await putProgram(next);
              onToggle();
              offerUndo(`“${next.what}” — saved`, () => putProgram(p));
            }}
            onDelete={() => void deleteProgramWithTests(p.id).then(undo => offerUndo(`Took “${p.what}” off ${r.line}`, undo))} />
        )}
      </>} />
  );
}

/** ADD A PROGRAM TO A MACHINE — only its name; the rest on its row. The
 *  machine's programs stage is made when it has none (it was "Add Programs
 *  loaded to it", a door before the box). */
function AddProgram({ machine, stages, tt }: { machine: { id: string; name: string }; stages: Test[]; tt: ReturnType<typeof useTesting> }) {
  const [open, setOpen] = useState(false);
  const [what, setWhat] = useState('');
  const busy = useRef(false);
  /* ONE TAP, ONE PROGRAM — a double tap would add it twice. */
  const add = () => {
    const name = what.trim();
    if (!name || busy.current) return;
    busy.current = true;
    const stage = async () => stages.find(s => (s.assetId ?? '') === machine.id)?.id
      ?? (await tt.planSteps(['Programs loaded'], machine.id || undefined, 'setup'))[0];
    void stage().then(id => (id ? tt.addItem(id, 'next', name) : undefined)).then(() => setWhat(''))
      .finally(() => { busy.current = false; });
  };
  /* The box comes out when asked for (CLAUDE.md, simplicity 2) and stays
     open after each — programs are added in runs. */
  if (!open) return <button type="button" className="cw-link pgr-add-open" onClick={() => setOpen(true)}>+ Add a program to {machine.id ? `the ${machine.name}` : 'the line'}</button>;
  return (
    <form className="spp-add pgr-add" onSubmit={e => { e.preventDefault(); add(); }}>
      <input value={what} autoFocus placeholder="Its name or number — e.g. PR-12 Express 1.25 kg"
        aria-label={`Add a program to ${machine.name}`} onChange={e => setWhat(e.target.value)} />
      <button type="submit" className="btn btn-sm" disabled={!what.trim()}>Add</button>
      <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setOpen(false); setWhat(''); }}>Done</button>
    </form>
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
