/* ONE ROW A PROGRAM — the same on a job's Programs and on a line's.
 *
 * Rowland, 16 October: "fix the program testing system, its very complex,
 * cant edit simpley the ui very long ,, i feel we have to many views and doors
 * to what should eb simple". The job's Programs page drew three kinds of row
 * (a line on the stage, one "on the Programs list only" with Track it here,
 * the line's own), two or three status pills on each from two records, the
 * test's whole ladder under every row, and a second full editor — the
 * Programs list — folded at the foot for a program's name, machine, order and
 * test day. Here a program is one row however it is kept:
 *
 *   the row      its name, ONE status in its colour (the reading's — lib/
 *                programsReport), what it runs and whose, what was seen, and
 *                its test on the right: Test it · Say how it went · Go again
 *   the form     one form says how it went (ui/ProgramTest): passed and
 *                didn't pass write the test AND the floor's status, so the
 *                two records stop disagreeing; baseline achieved, not tested
 *                and no program are the floor's alone
 *   the panel    a tap on the row opens everything else in one place — its
 *                name, machine, what it runs, whose, its test day, order,
 *                its problems and its history — and Delete
 *
 * ONE DATE A ROW (docs/STAGEGATE-UX.md): the pill carries the date that
 * matters now; the row's facts carry none; each attempt keeps its own day in
 * the journey. A program's test day is one date: typed here it sets the
 * stage line's day, the record's and its booked test's together.
 *
 * No new record: the part on the machine's programs stage (lib/noted), the
 * program (lib/programs) and its proving tests (lib/testing) — the part made
 * the first time the floor says something of a program kept only on the list,
 * the program made the first time it is tested or given what it runs. */
import { useState, type ReactNode } from 'react';
import type { PartResultIs, Test, TestItem } from '../lib/testing';
import { live } from '../lib/testing';
import type { Program } from '../lib/programs';
import type { ProgramLine } from '../lib/programsReport';
import { editedResult, partMoved, partsOf, resultWords, withoutResult } from '../lib/noted';
import { provingTestOf } from '../lib/commission';
import { todayISO } from '../lib/weeks';
import { uid } from '../lib/ids';
import { deleteProgram, deleteProgramWithTests, deleteTestItem, putTestItem } from '../db';
import type { useTesting } from '../lib/useTesting';
import type { ProgramsState } from '../lib/usePrograms';
import type { Can } from '../lib/access';
import { isWholeDate } from './DateInput';
import { offerUndo } from './Undo';
import { ProgramTest, type FloorSay } from './ProgramTest';
import { PartRun } from './StageParts';
import { ProductsBox } from './ProductsBox';

type TT = ReturnType<typeof useTesting>;

/* ============================== the row itself ============================= */

export function ProgramRowShell({ what, tag, word, tone, meta, note, aside, problems = 0, action, after, open, onToggle, panel, tap, dataProgram, className }: {
  what: string;
  /** "Line 7's own" — whose record it is, when not the job's. */
  tag?: string;
  word: string; tone: string;
  /** What it runs, whose — never a date (the pill has the one that matters). */
  meta?: string;
  /** What was seen. */
  note?: string;
  /** The other record's word, only when it says something worse. */
  aside?: { word: string; tone: string };
  problems?: number;
  /** Its test: the journey, the button, the form (ui/ProgramTest). */
  action?: ReactNode;
  /** Under the row's words, outside its button — links that open another
   *  record (the job that holds it, the study that proved it). */
  after?: ReactNode;
  className?: string;
  open: boolean; onToggle: () => void;
  panel?: ReactNode;
  /** What a press does when it is not "open the form here" — the row's word for it ("open it on its project's
   *  Programs"), or '' when it does nothing. Absent: it opens its form, and says so. (25 October, Rowland: "I press to
   *  open it and it doesn't" — a project's program has no form on a line's page; the press went nowhere.) */
  tap?: string;
  dataProgram?: string;
}) {
  return (
    <li className={'pgr' + (open ? ' is-open' : '') + (className ? ` ${className}` : '')} data-program={dataProgram}>
      <button type="button" className="pgr-main" {...(tap === undefined ? { 'aria-expanded': open } : {})} onClick={onToggle}
        aria-label={`${what} — ${word}${tap === undefined ? (open ? '' : ', tap to change it') : tap ? `, ${tap}` : ''}`}>
        <span className="pgr-top">
          {tag && <span className="pp-line-tag">{tag}</span>}
          <span className="pgr-name">{what}</span>
          <span className={'spp-pill is-' + tone}>{word}</span>
          {problems > 0 && <span className="spp-pill is-r pgr-pn">{problems === 1 ? 'a problem' : `${problems} problems`}</span>}
        </span>
        {meta && <span className="pgr-meta">{meta}</span>}
        {note && <span className="pgr-said">{note}</span>}
        {aside && <span className={'pgr-aside is-' + aside.tone}>{aside.word}</span>}
      </button>
      {after && <div className="pgr-after">{after}</div>}
      {action && <div className="pgr-test">{action}</div>}
      {open && panel && <div className="pgr-panel">{panel}</div>}
    </li>
  );
}

/* ============================ its fields, edited ============================ */

export interface ProgramDraft { what: string; machine: string; runs: string; who: string; testDay: string; note: string }

/** NAME, MACHINE, WHAT IT RUNS, WHOSE, TEST DAY — and commentary where the
 *  program has no floor to say it on (a line's own). One Save. */
export function ProgramFields({ start, machines, withNote, onSave, onClose, onMove, onDelete, extra }: {
  start: ProgramDraft;
  /** The machines it can be on — value '' is the line itself. Absent: no choice. */
  machines?: { value: string; label: string }[];
  withNote?: boolean;
  onSave: (d: ProgramDraft) => void | Promise<void>;
  onClose: () => void;
  /** ▲ ▼ — absent when the list is filtered, so a move is never to a place unseen. */
  onMove?: { up?: () => void; down?: () => void };
  onDelete?: () => void;
  extra?: ReactNode;
}) {
  const [d, setD] = useState(start);
  const set = (k: keyof ProgramDraft) => (e: { target: { value: string } }) => setD(x => ({ ...x, [k]: e.target.value }));
  return (
    <form className="pgr-form" onSubmit={e => { e.preventDefault(); void onSave(d); }}>
      <label className="spp-f spp-f-wide"><span>The program</span>
        <input value={d.what} aria-label="The program’s name or number" onChange={set('what')} /></label>
      {machines && (
        <label className="spp-f"><span>Machine</span>
          <select value={d.machine} aria-label={`Which machine ${start.what} is on`} onChange={set('machine')}>
            {machines.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select></label>
      )}
      <ProductsBox value={d.runs} onChange={runs => setD(x => ({ ...x, runs }))} wide />
      <label className="spp-f"><span>Whose</span>
        <input value={d.who} placeholder="Ilapak UK" aria-label="Whose it is" onChange={set('who')} /></label>
      <label className="spp-f"><span>Test day</span>
        <input type="date" value={d.testDay} aria-label={`The day ${start.what} is tested`} onChange={set('testDay')} /></label>
      {withNote && (
        <label className="spp-f spp-f-wide"><span>Commentary</span>
          <input value={d.note} maxLength={400} placeholder="What was seen, what is next" aria-label={`Commentary on ${start.what}`} onChange={set('note')} /></label>
      )}
      {extra}
      <span className="pgr-acts">
        <button type="submit" className="btn btn-sm btn-primary">Save</button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>Close</button>
        {onMove && <>
          <button type="button" className="btn btn-sm btn-ghost" disabled={!onMove.up} onClick={onMove.up} aria-label={`Move ${start.what} up`}>▲ Up</button>
          <button type="button" className="btn btn-sm btn-ghost" disabled={!onMove.down} onClick={onMove.down} aria-label={`Move ${start.what} down`}>▼ Down</button>
        </>}
        {onDelete && <button type="button" className="cw-link sp-rm pgr-del" onClick={onDelete}>Delete this program</button>}
      </span>
    </form>
  );
}

/* ======================= a job's program, on its row ======================== */

const dayOrNone = (v: string) => (v && isWholeDate(v) ? v : undefined);

export function JobProgramRow({ projectId, line: l, tt, progs, can, stages, machines, aside, open, onToggle, testOpen, first, last, filtered, onProblem, onOpen }: {
  projectId: string;
  line: ProgramLine;
  tt: TT;
  progs: ProgramsState;
  can: Can;
  /** The job's programs stages, so a part can be made on its machine's. */
  stages: Test[];
  machines: { value: string; label: string }[];
  aside?: { word: string; tone: string };
  open: boolean; onToggle: () => void;
  /** Opened on arrival — Commission's and Needs you's "Test it" (?test=). */
  testOpen: boolean;
  first: boolean; last: boolean;
  /** The list is filtered: no ▲ ▼. */
  filtered: boolean;
  onProblem?: (stageId: string, partId: string) => void;
  onOpen: (id: string) => void;
}) {
  const part = l.partId ? live(tt.items).find(i => i.id === l.partId) : undefined;
  const program = l.programId ? progs.programs.find(p => p.id === l.programId) : undefined;
  const assetId = l.assetId ?? '';
  const today = todayISO();
  const stageOn = (machine: string) => stages.find(s => (s.assetId ?? '') === machine)?.id;
  const problems = part ? live(tt.items).filter(i => i.kind === 'found' && i.fromItemId === part.id) : [];
  const openProblems = problems.filter(i => i.doneAt == null).length;

  /* THE LINE ON THE MACHINE'S PROGRAMS STAGE — made the first time the floor
     says something of a program kept only on the list (it was "Track it
     here"), on the machine's programs stage, made too when it has none. */
  const ensurePart = async (): Promise<{ part: TestItem; made: boolean }> => {
    if (part) return { part, made: false };
    const stageId = stageOn(assetId) ?? (await tt.planSteps(['Programs loaded'], assetId || undefined, 'setup'))[0];
    const t = Date.now();
    const made: TestItem = {
      id: uid(), projectId, testId: stageId, kind: 'next', what: l.what,
      ...(l.who ? { owner: l.who } : {}), ...(program?.testOn ? { due: program.testOn } : {}),
      sort: partsOf(stageId, tt.items).reduce((n, i) => Math.max(n, i.sort), 0) + 1, createdAt: t, updatedAt: t,
    };
    await putTestItem(made);
    return { part: made, made: true };
  };
  const say: FloorSay = async (is: PartResultIs | undefined, note: string, day: string) => {
    const { part: cur, made } = await ensurePart();
    /* said on the day picked — a past day at its noon, today at this moment */
    const at = day === today ? Date.now() : Date.parse(`${day}T12:00:00`);
    const next = is ? editedResult(cur, is, note, at)
      : note.trim() !== (cur.note ?? '') ? { ...cur, note: note.trim() || undefined } : cur;
    if (next !== cur) await tt.saveItem(next);
    return async () => { if (made) await deleteTestItem(cur.id); else await tt.saveItem(cur); };
  };

  const save = async (d: ProgramDraft) => {
    const what = d.what.trim() || l.what, who = d.who.trim(), runs = d.runs.trim(), day = dayOrNone(d.testDay);
    const moved = d.machine !== assetId;
    const undo: (() => Promise<unknown>)[] = [];
    if (part) {
      const target = moved ? stageOn(d.machine) ?? (await tt.planSteps(['Programs loaded'], d.machine || undefined, 'setup'))[0] : part.testId;
      const next: TestItem = { ...part, what, owner: who || undefined, due: day, testId: target,
        ...(moved ? { sort: partsOf(target, tt.items).reduce((n, i) => Math.max(n, i.sort), 0) + 1 } : {}) };
      if (next.what !== part.what || next.owner !== part.owner || next.due !== part.due || moved) {
        await tt.saveItem(next); undo.push(() => tt.saveItem(part));
      }
      /* its problems go with it to the other machine's stage */
      if (moved) for (const x of problems) { await tt.saveItem({ ...x, testId: target }); undo.push(() => tt.saveItem(x)); }
    }
    if (program) {
      const next: Program = { ...program, what, runs: runs || undefined, from: who || undefined, testOn: day, assetId: d.machine || undefined };
      if (JSON.stringify(next) !== JSON.stringify(program)) { await progs.save(next); undo.push(() => progs.save(program)); }
      /* ITS BOOKED TEST keeps the program's day and machine */
      const t = provingTestOf(program, tt.tests);
      if (t && t.outcome === 'planned' && ((day && day !== t.plannedFor) || moved)) {
        const was = { plannedFor: t.plannedFor, assetId: t.assetId };
        await tt.patchTest(t.id, { ...(day ? { plannedFor: day } : {}), ...(moved ? { assetId: d.machine || undefined } : {}) });
        undo.push(() => tt.patchTest(t.id, was));
      }
    } else if (runs) {
      /* what it runs is the program record's — made now, the same name on the same machine */
      const id = await progs.add({ what, assetId: d.machine || undefined, runs, from: who, testOn: day, state: 'onMachine' });
      if (id) undo.push(() => deleteProgram(id));
    }
    onToggle();
    if (undo.length) offerUndo(`“${what}” — saved`, async () => { for (const u of undo.reverse()) await u(); });
  };
  const move = async (by: -1 | 1) => {
    if (part) { for (const x of partMoved(part.testId, tt.items, part.id, by)) await tt.saveItem(x); }
    else if (program) await progs.move(program.id, by, q => (q.assetId ?? '') === (program.assetId ?? ''));
  };
  const remove = async () => {
    const undos: (() => Promise<unknown>)[] = [];
    if (part) undos.push(await deleteTestItem(part.id));
    /* its tests still to run go with it (db/testing deleteProgramWithTests) */
    if (program) undos.push(await deleteProgramWithTests(program.id));
    offerUndo(`Took off “${l.what}”`, async () => { for (const u of undos) await u(); });
  };
  const unsay = (at: number) => {
    if (!part) return;
    void tt.saveItem(withoutResult(part, at));
    offerUndo('Status taken off', () => tt.saveItem(part));
  };

  /* The program the test reads — the record, or this line by its name and
     machine, made a record the moment it is tested. */
  const testee: Program = program ?? { id: '', projectId, what: l.what, ...(assetId ? { assetId } : {}), state: 'onMachine', sort: 0, createdAt: 0, updatedAt: 0 };
  const history = (part?.results ?? []).slice().reverse();

  return (
    <ProgramRowShell
      what={l.what} word={l.word} tone={l.tone}
      meta={[l.runs && `runs ${l.runs}`, l.who].filter(Boolean).join(' · ') || undefined}
      {...(l.note ? { note: l.note } : {})} {...(aside ? { aside } : {})} problems={openProblems}
      {...(l.programId ? { dataProgram: l.programId } : {})}
      open={open} onToggle={onToggle}
      action={<ProgramTest projectId={projectId} program={testee} assetId={assetId || undefined} tt={tt} can={can} open={testOpen} quiet
        {...(can.edit ? { floor: say } : {})}
        {...(program ? {} : { record: () => progs.add({ what: l.what, assetId: assetId || undefined, state: 'onMachine', ...(l.who ? { from: l.who } : {}) }) })} />}
      panel={
        <>
          {l.proof && <p className={'pgr-proof is-' + l.proof.tone}>{l.proof.word}</p>}
          {/* ITS RUN AT SPEED IN COMMISSION — said, and planned, here (it was
              only in the stage's drawer, which no longer lists the programs). */}
          {part && (stage => stage && <PartRun part={part} step={stage} tt={tt} can={can} onOpen={onOpen} {...(onProblem ? { onRunProblem: onProblem } : {})} />)(stages.find(s => s.id === part.testId))}
          {can.edit
            ? <ProgramFields machines={machines}
                start={{ what: l.what, machine: assetId, runs: l.runs ?? '', who: l.who ?? '', testDay: part?.due ?? program?.testOn ?? '', note: '' }}
                onSave={save} onClose={onToggle}
                {...(filtered ? {} : { onMove: { ...(first ? {} : { up: () => void move(-1) }), ...(last ? {} : { down: () => void move(1) }) } })}
                {...(can.remove ? { onDelete: () => void remove() } : {})} />
            : null}
          {(problems.length > 0 || (can.edit && onProblem)) && (
            <div className="pgr-probs">
              {problems.map(x => (
                <button key={x.id} type="button" className={'sp-door pgr-prob' + (x.doneAt == null ? ' is-open' : '')} onClick={() => onOpen(x.id)}>
                  <b>Problem:</b> {x.what}{x.hoursLost ? ` · ${x.hoursLost} h lost` : ''} · {x.doneAt == null ? 'open' : 'sorted'}
                </button>
              ))}
              {can.edit && onProblem && (
                <button type="button" className="btn btn-sm spp-prob" onClick={() => void ensurePart().then(r => onProblem(r.part.testId, r.part.id))}>Hit a problem</button>
              )}
            </div>
          )}
          {history.length > 0 && (
            <div className="spp-hist">
              <span className="spp-f-h">What was said of it</span>
              <ul>
                {history.map(r => (
                  <li key={r.at}>
                    <b className={'is-' + (r.is === 'failed' ? 'r' : r.is === 'passed' || r.is === 'baseline' ? 'g' : r.is === 'noProgram' ? 'a' : 'n')}>{resultWords(r)}</b>{r.note ? ` — ${r.note}` : ''}
                    {can.remove && <button type="button" className="cw-link sp-rm spp-x" aria-label={`Take off: ${resultWords(r)}`} onClick={() => unsay(r.at)}>Take off</button>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      } />
  );
}
