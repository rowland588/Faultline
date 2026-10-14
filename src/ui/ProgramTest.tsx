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
import { useEffect, useRef, useState } from 'react';
import type { Program } from '../lib/programs';
import { isProved, provingTitle } from '../lib/programs';
import type { Outcome, Test } from '../lib/testing';
import { provingTestOf } from '../lib/commission';
import { programJourney } from '../lib/programJourney';
import type { useTesting } from '../lib/useTesting';
import type { Can } from '../lib/access';
import { niceDay, todayISO } from '../lib/weeks';
import { openRecord } from './RecordDrawer';
import { offerUndo } from './Undo';

type How = Extract<Outcome, 'passed' | 'failed' | 'notRun'>;
const HOW: { is: How; word: string; tone: string }[] = [
  { is: 'passed', word: 'Passed', tone: 'g' },
  { is: 'failed', word: 'Didn’t pass', tone: 'r' },
  { is: 'notRun', word: 'Didn’t run', tone: 'r' },
];

export function ProgramTest({ projectId, program: p, assetId, tt, can, open: openAtStart = false, record }: {
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

  const ran = test && test.outcome !== 'planned';
  const start = () => {
    setHow(null); setSeen('');
    setDay(test && !ran && test.plannedFor && test.plannedFor <= today ? test.plannedFor : today);
    /* The aim carries from the attempt before — changed here when this one
       aims higher (Rowland: "it can change between attempts"). */
    const a = test?.runAgreed, d = test && !ran ? test.run : undefined;
    setF({ rate: str(a?.rate), mins: str(a?.minutes), speed: str(d?.speed), ran: str(d?.minutes), packs: str(d?.packs), rejects: str(d?.rejects) });
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
  const answer = async (patch: (cur: Test) => Partial<Test>, said: string) => {
    const { id, made } = await target();
    if (!id) return;
    const before = tt.tests.find(t => t.id === id);
    await tt.patchTest(id, patch);
    setOpen(false);
    /* Undo puts the test back first — so the program it proved is put
       back with it (followTest) — then takes away one made here. */
    offerUndo(said, async () => {
      await tt.patchTest(id, before
        ? { outcome: before.outcome, ranOn: before.ranOn, result: before.result, plannedFor: before.plannedFor, runAgreed: before.runAgreed, run: before.run }
        : { outcome: 'planned', ranOn: undefined });
      if (made) await tt.removeTest(id);
    });
  };
  /* ONE TAP, ONE TEST: a double tap would plan two. */
  const write = (patch: (cur: Test) => Partial<Test>, said: string) => {
    if (busy.current) return;
    busy.current = true;
    void answer(patch, said).finally(() => { busy.current = false; });
  };
  const aimOf = (): Test['runAgreed'] => tidy({ rate: n(f.rate), minutes: n(f.mins) });
  const dayOf = (): Test['run'] => tidy({ speed: n(f.speed), minutes: n(f.ran), packs: n(f.packs), rejects: n(f.rejects) });
  const save = () => {
    if (!how || !day) return;
    const words = seen.trim();
    const aim = aimOf(), did = dayOf();
    write(cur => ({ outcome: how, ranOn: day, plannedFor: cur.plannedFor ?? day, result: words || undefined, runAgreed: aim, run: did }),
      `${p.what} — ${HOW.find(h => h.is === how)?.word.toLowerCase()} ${niceDay(day)}${did?.speed != null ? ` at ${did.speed} ppm` : ''}`);
  };
  const book = () => {
    if (!day) return;
    const aim = aimOf();
    write(() => ({ outcome: 'planned', plannedFor: day, runAgreed: aim }), `${p.what} — test booked ${niceDay(day)}${aim?.rate != null ? ` at ${aim.rate} ppm` : ''}`);
  };

  const label = test && ran ? 'Go again' : test ? 'Say how it went' : 'Test it';
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
                </button>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <span className="sub ptx-none">{isProved(p) ? 'Proved by hand — no test behind it' : 'Not tested yet'}</span>
      )}
      {can.edit && !open && (
        <button type="button" className="btn btn-sm ptx-go" onClick={start}>{label}</button>
      )}
      {open && (
        <div className="ptx-panel" role="group" aria-label={`Test ${p.what}`}>
          <span className="ptx-h">{test && ran ? `Test ${journey.attempts.length + 1} of ${p.what}` : `How did ${p.what} go?`}</span>
          <span className="ptx-nums">
            {box2('rate', 'Aiming for', 'ppm')}
            {box2('mins', 'Aiming to run', 'min')}
          </span>
          <span className="ptx-nums">
            {box2('speed', 'Set at', 'ppm')}
            {box2('ran', 'Ran for', 'min')}
            {box2('packs', 'Packs', 'made')}
            {box2('rejects', 'Rejects', 'packs')}
          </span>
          <span className="spp-pick" role="group" aria-label={`How ${p.what} went`}>
            {HOW.map(h => (
              <button key={h.is} type="button" className={'spp-opt is-' + h.tone + (how === h.is ? ' is-on' : '')} aria-pressed={how === h.is}
                onClick={() => setHow(h.is)}>{h.word}</button>
            ))}
          </span>
          <label className="ptx-f">
            <span className="field-label">What was seen</span>
            <textarea className="text-input" rows={2} maxLength={400} value={seen} aria-label={`What was seen when ${p.what} ran`}
              placeholder={p.runs ? `e.g. ran ${p.runs}, seals checked, film tracked` : 'What was run and what was seen'}
              onChange={e => setSeen(e.target.value)} />
          </label>
          <label className="ptx-f ptx-day">
            <span className="field-label">{how ? 'The day it ran' : 'The day'}</span>
            <input className="text-input" type="date" value={day} aria-label={`The day ${p.what} ran or is booked`} onChange={e => setDay(e.target.value)} />
          </label>
          <span className="ptx-go-row">
            <button type="button" className="btn btn-primary btn-sm" disabled={!how || !day} onClick={save}>Save</button>
            {!how && (
              <button type="button" className="btn btn-sm" disabled={!day} onClick={book}>
                {test && !ran ? 'Move it to this day' : 'Not run yet — book it for this day'}</button>
            )}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
          </span>
          {how === 'passed' && <small className="sub">A pass proves {p.what} on that day. A later test at a higher speed that does not pass leaves this pass standing.</small>}
        </div>
      )}
    </div>
  );
}

interface Nums { rate: string; mins: string; speed: string; ran: string; packs: string; rejects: string }
const EMPTY: Nums = { rate: '', mins: '', speed: '', ran: '', packs: '', rejects: '' };
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
