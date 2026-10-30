/* TEST IT — a program tested where it sits, on its row on Programs.
 *
 * Rowland, 14 October: "its also in the program page test a commission but
 * the ui is poor and makes no sense, and in commissioning cant access the
 * programs .. so what do we do, reach it only from programs and improve the
 * ui to actually run it?" — and, to the design put back, "do it".
 *
 * A program was tested by a link ("plan its test", "Prove it in
 * Commission") that made a test and opened its whole record in a drawer —
 * a page of boxes to say three things. Here the three things are asked on
 * the row: how it went (passed · didn't pass · didn't run), what was seen,
 * and the day — or, not run yet, the day it is booked for. Saved, it is the
 * same proving test it always was (Test.programId): on Commission's board
 * under its machine's programs, its whole record a tap away, and passing it
 * proves the program on the day it ran (db/programs followTest), so the
 * line, the control room and every paper read "proved" at once.
 *
 * WHICH RECORD: the test (lib/testing), made the first time and answered
 * after; no new record. Its machine is the job's (lib/commissionPrograms —
 * a line's program sits on the job's machine of the same name). */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Program } from '../lib/programs';
import { isProved, judgedByCriteria, provingTitle } from '../lib/programs';
import { criteriaOf, criteriaVerdict } from '../lib/programCriteria';
import type { Outcome, PartResultIs, Test } from '../lib/testing';
import { provingTestOf } from '../lib/commission';
import { programJourney, runOf } from '../lib/programJourney';
import type { useTesting } from '../lib/useTesting';
import type { Can } from '../lib/access';
import { niceDay, todayISO } from '../lib/weeks';
import { openRecord } from './RecordDrawer';
import { offerUndo } from './Undo';
import { Icon } from './Icon';
import { useJobStudies } from './StudyLinks';
import { useAllStandards } from '../lib/useAllStandards';
import { TOOL_NAME, linkedTo, studyHref } from '../lib/studyLinks';
import { nav } from '../state/useRoute';

type Ran = Extract<Outcome, 'passed' | 'failed' | 'notRun'>;
/** How it went — a test's three outcomes, and, where the program is a line on
 *  its machine's programs stage, the floor's own three: baseline achieved,
 *  not tested, no program (lib/noted). ONE FORM FOR BOTH (Rowland, 16
 *  October: "its very complex ... too many views and doors"): Status and Test
 *  it were two forms saying nearly the same thing about one program, and the
 *  two records they wrote disagreed on the same row. */
type How = Ran | Exclude<PartResultIs, 'passed' | 'failed'>;
const HOW: { is: How; word: string; tone: string; floorOnly?: boolean }[] = [
  { is: 'passed', word: 'Passed', tone: 'g' },
  { is: 'baseline', word: 'Baseline achieved', tone: 'g', floorOnly: true },
  { is: 'failed', word: 'Didn’t pass', tone: 'r' },
  { is: 'notRun', word: 'Didn’t run', tone: 'r' },
  { is: 'notTested', word: 'Not tested', tone: 'n', floorOnly: true },
  { is: 'noProgram', word: 'No program', tone: 'a', floorOnly: true },
];
const isRan = (h: How): h is Ran => h === 'passed' || h === 'failed' || h === 'notRun';
/** What the floor is told of a test: passed and didn't pass as they are; a
 *  test that didn't run left the program not tested — never "failed". */
const FLOOR_OF: Record<Ran, PartResultIs> = { passed: 'passed', failed: 'failed', notRun: 'notTested' };

/** THE FLOOR'S STATUS, said with the test — the line on the machine's programs
 *  stage (made the first time when there is none). Returns its undo. */
export type FloorSay = (is: PartResultIs | undefined, note: string, day: string) => Promise<(() => Promise<void>) | undefined>;

export function ProgramTest({ projectId, program: p, assetId, tt, can, open: openAtStart = false, record, floor, quiet = false, detail = true, onShowAll }: {
  projectId: string;
  /** The program — or, for a line on a machine's programs stage that is on
   *  no Programs list yet, its name and machine (id ''), made a program the
   *  moment it is tested (`record`). */
  program: Program;
  /** Make its program record, the same name on the same machine, so the
   *  stage's line and the record are one program (lib/programsReport). */
  record?: () => Promise<string | undefined>;
  /** The job's machine its test sits on; none, the line itself. */
  assetId?: string;
  tt: ReturnType<typeof useTesting>;
  can: Can;
  /** Opened on arrival — Commission's "Test it" lands here. */
  open?: boolean;
  /** The floor's status, said in the same form (screens/ProgramsPage): adds
   *  baseline achieved, not tested and no program, and what was seen with no
   *  status is kept as its commentary. Absent for a line's own program, which
   *  has no line on the job's stage. */
  floor?: FloorSay;
  /** On a row that already says where the program stands in its own pill
   *  (ui/ProgramRow): "Not tested yet" is not said a second time. */
  quiet?: boolean;
  /** Full test history on the row — false shows the latest attempt and one
   *  line, with a way to open every attempt (Programs UI, 28 October). */
  detail?: boolean;
  /** Opens the row's details — every attempt listed. */
  onShowAll?: () => void;
}) {
  const today = todayISO();
  const test = provingTestOf(p, tt.tests);
  /* EVERY ATTEMPT, first to last (lib/programJourney) — the journey. */
  const journey = p.id ? programJourney(p, tt.tests, today) : { attempts: [] };
  const [open, setOpen] = useState(openAtStart && can.edit);
  const [how, setHow] = useState<How | null>(null);
  const [seen, setSeen] = useState('');
  const [day, setDay] = useState(today);
  /* What this attempt aims at and what it did — typed as words, read as
     numbers on Save, so a box never turns 12 into 102 (CLAUDE.md). */
  const [f, setF] = useState<Nums>(EMPTY);
  const busy = useRef(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { if (openAtStart && box.current) box.current.scrollIntoView({ block: 'center' }); }, [openAtStart]);

  const jobStudies = useJobStudies(projectId);
  const standards = useAllStandards();
  const criteriaNote = useMemo(() => {
    if (!judgedByCriteria(p) || !jobStudies) return undefined;
    const answers = criteriaOf(p, jobStudies, tt.tests, today, { standards });
    const v = criteriaVerdict(p, answers);
    if (!answers.length) return undefined;
    if (v.ready) return 'Every criterion passed — sign off the program when you and your colleagues are ready.';
    if (v.passed > 0) return `${v.words} — the run’s net rate alone does not fail the program once criteria are picked.`;
    return `${v.words} — pick studies already on its tests as criteria, or add new ones, so the tools judge the program.`;
  }, [p, jobStudies, tt.tests, today, standards]);
  const ran = test && test.outcome !== 'planned';
  const start = () => {
    setHow(null); setSeen('');
    setDay(test && !ran && test.plannedFor && test.plannedFor <= today ? test.plannedFor : today);
    /* The aim carries from the attempt before — changed here when this one
       aims higher (Rowland: "it can change between attempts"). */
    const a = test ? runOf(test).agreed : undefined, d = test && !ran ? runOf(test).day : undefined;
    setF({ rate: str(a?.rate), mins: str(a?.minutes), net: str(a?.net), speed: str(d?.speed), ran: str(d?.minutes), packs: str(d?.packs), rejects: str(d?.rejects) });
    setOpen(true);
  };

  /* The test to answer: this one still to run; after one that ran — passed
     or not — the next attempt, following it; or a first proving test. */
  const target = async (): Promise<{ id: string; made: boolean }> => {
    if (test && !ran) return { id: test.id, made: false };
    /* each attempt keeps the program's name; its number in the journey says which */
    if (test && ran) return { id: await tt.planNextFrom(test, undefined, provingTitle(p)), made: true };
    const programId = p.id || await record?.();
    if (!programId) return { id: '', made: false };
    const [id] = await tt.planTests([{ title: provingTitle(p), ...(assetId ? { assetId } : {}),
      extra: { programId, ...(p.runs ? { planned: p.runs } : {}), ...(p.from ? { withWhom: p.from } : {}) } }]);
    return { id, made: true };
  };
  const answer = async (patch: (cur: Test) => Partial<Test>, said: string, alsoFloor?: () => ReturnType<FloorSay>) => {
    const { id, made } = await target();
    if (!id) return;
    const before = tt.tests.find(t => t.id === id);
    await tt.patchTest(id, patch);
    const unsay = alsoFloor ? await alsoFloor() : undefined;
    /* Undo puts the test back first — so the program it proved is put
       back with it (followTest) — then takes away one made here, then the
       floor's status said with it. */
    offerUndo(said, async () => {
      await tt.patchTest(id, before
        ? { outcome: before.outcome, ranOn: before.ranOn, result: before.result, plannedFor: before.plannedFor, runAgreed: before.runAgreed, run: before.run }
        : { outcome: 'planned', ranOn: undefined });
      if (made) await tt.removeTest(id);
      if (unsay) await unsay();
    });
  };
  /* ONE TAP, ONE TEST: a double tap would plan two. */
  /* SAVED IS CLOSED AT ONCE (Rowland, 23 October: "it never collapses on itself when I save it") — the
     form folds the moment Save is pressed; the writes behind it took a second or two with nothing said,
     and the row's new test and the Undo come when they are done. Opened again if the write fails. */
  const write = (patch: (cur: Test) => Partial<Test>, said: string, alsoFloor?: () => ReturnType<FloorSay>) => {
    if (busy.current) return;
    busy.current = true;
    setOpen(false);
    void answer(patch, said, alsoFloor).catch(e => { console.error('program test not saved', e); setOpen(true); })
      .finally(() => { busy.current = false; });
  };
  /* The floor's status alone — baseline achieved, not tested, no program,
     or what was seen with none: no test is made for it. */
  const sayOnly = (is: PartResultIs | undefined, words: string, said: string) => {
    if (!floor || busy.current) return;
    busy.current = true;
    setOpen(false);
    void floor(is, words, day).then(unsay => { if (unsay) offerUndo(said, unsay); })
      .catch(e => { console.error('program status not saved', e); setOpen(true); })
      .finally(() => { busy.current = false; });
  };
  const aimOf = (): Test['runAgreed'] => tidy({ rate: n(f.rate), minutes: n(f.mins), net: n(f.net) });
  const dayOf = (): Test['run'] => tidy({ speed: n(f.speed), minutes: n(f.ran), packs: n(f.packs), rejects: n(f.rejects) });
  const save = () => {
    const words = seen.trim();
    if (!day || (!how && !(floor && words))) return;
    if (!how) { sayOnly(undefined, words, `${p.what} — what was seen kept`); return; }
    const word = HOW.find(h => h.is === how)?.word.toLowerCase();
    if (!isRan(how)) { sayOnly(how, words, `${p.what} — ${word} ${niceDay(day)}`); return; }
    const aim = aimOf(), did = dayOf();
    const ran: Ran = how;
    write(cur => ({ outcome: ran, ranOn: day, plannedFor: cur.plannedFor ?? day, result: words || undefined, runAgreed: aim, run: did }),
      `${p.what} — ${word} ${niceDay(day)}${did?.speed != null ? ` at ${did.speed} ppm` : ''}`,
      floor ? () => floor(FLOOR_OF[ran], words, day) : undefined);
  };
  const book = () => {
    if (!day) return;
    const aim = aimOf();
    write(() => ({ outcome: 'planned', plannedFor: day, runAgreed: aim }), `${p.what} — test booked ${niceDay(day)}${aim?.rate != null ? ` at ${aim.rate} ppm` : ''}`);
  };

  const label = test && ran ? 'Go again' : test ? 'Say how it went' : 'Test it';
  const showLadder = detail || open || openAtStart;
  const last = journey.attempts.length ? journey.attempts[journey.attempts.length - 1] : undefined;
  const box2 = (k: keyof Nums, word: string, unit: string) => (
    <label className="ptx-n">
      <span className="field-label">{word}</span>
      <span className="ptx-n-in">
        <input className="text-input" inputMode="decimal" value={f[k]} aria-label={`${word} — ${p.what}`} onChange={e => setF({ ...f, [k]: e.target.value })} />
        <span className="sub">{unit}</span>
      </span>
    </label>
  );
  return (
    <div className="ptx" ref={box}>
      {/* THE JOURNEY — every attempt, first to last, each opening its test. */}
      {journey.attempts.length > 0 ? (
        showLadder ? (
        <div className="ptx-j">
          <span className="ptx-j-h">
            <b>Its tests</b> <span className="sub">{journey.says}</span>
            {journey.best && <span className="ptx-best">{journey.best}</span>}
          </span>
          <ol className="ptx-ladder" aria-label={`The tests of ${p.what}`}>
            {journey.attempts.map(a => (
              <li key={a.test.id} className={'is-' + a.result.tone}>
                <button type="button" className="ptx-step" onClick={() => openRecord(projectId, a.test.id)}>
                  <b>Test {a.n}</b>
                  <span className="ptx-when">{a.test.ranOn ? a.when : ''}</span>
                  {a.aim && <span className="sub">{a.aim}</span>}
                  {a.did && <span>{a.did}</span>}
                  <span className={'cg-pstate is-' + a.result.tone}>{a.result.word}</span>
                  {a.seen && <span className="ptx-seen">{a.seen}</span>}
                  {/* WHAT IT MET AND WHAT IT DID NOT, each number on its own (Rowland, 27 October: "you can fail the overall
                      goal, but it still means that you passed the test. But there's no clarity on it") */}
                  {a.checks && (
                    <span className="ptx-checks" aria-label={`What test ${a.n} met`}>
                      {a.checks.map(c => (
                        <span key={c.what} className={'ptx-chk ' + (c.ok ? 'is-met' : 'is-missed')}>
                          {c.ok ? '✓' : '✗'} {c.label} {c.got}{c.ok ? '' : ` — ${c.gap}`}
                        </span>
                      ))}
                    </span>
                  )}
                  {a.split && <span className="ptx-split">{a.split}</span>}
                </button>
                {/* THE STUDIES LINED UP FOR THIS TEST, all on the program (Rowland, 26 October) — each opens */}
                {linkedTo(jobStudies, 'test', a.test.id, 'proof').length > 0 && (
                  <span className="ptx-studies" aria-label={`Studies for test ${a.n}`}>
                    <span className="sub">Studies:</span>
                    {linkedTo(jobStudies, 'test', a.test.id, 'proof').map(st => (
                      <button key={st.id} type="button" className="chip" title={`${TOOL_NAME[st.tool] ?? 'Study'} “${st.name}”`} onClick={() => nav(studyHref(st))}>{st.tool === 'capability' ? st.name : `${TOOL_NAME[st.tool] ?? 'Study'}: ${st.name}`}</button>
                    ))}
                  </span>
                )}
                {/* EVERY TEST CAN BE TAKEN OFF, WHERE IT SITS, WITH UNDO (Rowland, 23 October: "I can't delete
                    the test ... absolutely stupid") — its program forgets it (db/testing deleteTest) */}
                {can.remove && (
                  <button type="button" className="ptx-del" aria-label={`Delete test ${a.n} of ${p.what}`} title="Delete this test"
                    onClick={() => void tt.removeTest(a.test.id)}><Icon name="close" size={13} /></button>
                )}
              </li>
            ))}
          </ol>
          {criteriaNote && <small className="sub ptx-critnote">{criteriaNote}</small>}
        </div>
        ) : last ? (
        <div className="ptx-j ptx-compact">
          <span className="sub">{journey.says}{journey.best ? ` · ${journey.best}` : ''}</span>
          <ol className="ptx-ladder" aria-label={`Latest test of ${p.what}`}>
            <li key={last.test.id} className={'is-' + last.result.tone}>
              <button type="button" className="ptx-step" onClick={() => openRecord(projectId, last.test.id)}>
                <b>Test {last.n}</b>
                <span className="ptx-when">{last.test.ranOn ? last.when : ''}</span>
                {last.did && <span>{last.did}</span>}
                <span className={'cg-pstate is-' + last.result.tone}>{last.result.word}</span>
              </button>
              {last.split && <span className="ptx-split">{last.split}</span>}
            </li>
          </ol>
          {onShowAll && journey.attempts.length > 1 && (
            <button type="button" className="cw-link ptx-all" onClick={onShowAll}>All {journey.attempts.length} tests ›</button>
          )}
          {criteriaNote && <small className="sub ptx-critnote">{criteriaNote}</small>}
        </div>
        ) : null
      ) : quiet ? null : (
        <span className="sub ptx-none">{p.signedOff ? 'Signed off on its criteria — no run test behind it' : isProved(p) ? 'Proved by hand — no test behind it' : 'Not tested yet'}</span>
      )}
      {can.edit && !open && (
        <button type="button" className="btn btn-sm ptx-go" onClick={start}>{label}</button>
      )}
      {open && (
        <div className="ptx-panel" role="group" aria-label={`Test ${p.what}`}>
          <span className="ptx-h">{test && ran ? `Test ${journey.attempts.length + 1} of ${p.what}` : `How did ${p.what} go?`}</span>
          <span className="spp-pick" role="group" aria-label={`How ${p.what} went`}>
            {HOW.filter(h => floor || !h.floorOnly).map(h => (
              <button key={h.is} type="button" className={'spp-opt is-' + h.tone + (how === h.is ? ' is-on' : '')} aria-pressed={how === h.is}
                onClick={() => setHow(how === h.is ? null : h.is)}>{h.word}</button>
            ))}
          </span>
          {/* The run's numbers belong to a test — asked once it ran, or while
              one is booked (what it aims at), never for a status alone. */}
          {(!how || isRan(how)) && <>
            <span className="ptx-nums">
              {box2('rate', 'Aiming for', 'ppm')}
              {box2('mins', 'Aiming to run', 'min')}
              {box2('net', 'Net rate target', 'ppm, optional')}
            </span>
            <small className="sub ptx-aimnote">Aiming for is the speed the machine is set to run at. Net rate target is a second, optional aim you set — the test is judged on it only when you give one. The net rate it actually made is worked out afterwards from packs, rejects and minutes.</small>
            {how && (
              <span className="ptx-nums">
                {box2('speed', 'Set at', 'ppm')}
                {box2('ran', 'Ran for', 'min')}
                {box2('packs', 'Packs', 'made')}
                {box2('rejects', 'Rejects', 'packs')}
              </span>
            )}
          </>}
          <label className="ptx-f">
            <span className="field-label">What was seen</span>
            <textarea className="text-input" rows={2} maxLength={400} value={seen} aria-label={`What was seen when ${p.what} ran`}
              placeholder={p.runs ? `e.g. ran ${p.runs}, seals checked, film tracked` : 'What was run and what was seen'}
              onChange={e => setSeen(e.target.value)} />
          </label>
          <label className="ptx-f ptx-day">
            <span className="field-label">{how && isRan(how) ? 'The day it ran' : 'The day'}</span>
            <input className="text-input" type="date" value={day} aria-label={`The day ${p.what} ran or is booked`} onChange={e => setDay(e.target.value)} />
          </label>
          <span className="ptx-go-row">
            <button type="button" className="btn btn-primary btn-sm" disabled={!day || (!how && !(floor && seen.trim()))} onClick={save}>Save</button>
            {!how && (
              <button type="button" className="btn btn-sm" disabled={!day} onClick={book}>
                {test && !ran ? 'Move it to this day' : 'Not run yet — book it for this day'}</button>
            )}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
          </span>
          {how === 'passed' && <small className="sub">{judgedByCriteria(p)
            ? `A pass answers its run test, when that is one of ${p.what}’s criteria — it is proved when it is signed off.`
            : `A pass proves ${p.what} on that day. A later test at a higher speed that does not pass leaves this pass standing.`}</small>}
        </div>
      )}
    </div>
  );
}

interface Nums { rate: string; mins: string; net: string; speed: string; ran: string; packs: string; rejects: string }
const EMPTY: Nums = { rate: '', mins: '', net: '', speed: '', ran: '', packs: '', rejects: '' };
const str = (v?: number) => (v == null ? '' : String(v));
/** A typed number, or nothing — "50", "50.5", "1,480". */
const n = (s: string): number | undefined => {
  const v = Number(s.replace(/,/g, '').trim());
  return s.trim() && Number.isFinite(v) && v >= 0 ? v : undefined;
};
/** Only the numbers given; nothing at all when none were. */
function tidy<T extends Record<string, number | undefined>>(o: T): T | undefined {
  const kept = Object.fromEntries(Object.entries(o).filter(([, v]) => v != null));
  return Object.keys(kept).length ? kept as T : undefined;
}
