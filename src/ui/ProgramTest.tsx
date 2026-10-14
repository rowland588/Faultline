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
import { provingTestOf, testCell } from '../lib/commission';
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

export function ProgramTest({ projectId, program: p, assetId, tt, can, open: openAtStart = false }: {
  projectId: string;
  program: Program;
  /** The job's machine its test sits on; none, the line itself. */
  assetId?: string;
  tt: ReturnType<typeof useTesting>;
  can: Can;
  /** Opened on arrival — Commission's "Test it" lands here. */
  open?: boolean;
}) {
  const today = todayISO();
  const test = provingTestOf(p, tt.tests);
  const [open, setOpen] = useState(openAtStart && can.edit);
  const [how, setHow] = useState<How | null>(null);
  const [seen, setSeen] = useState('');
  const [day, setDay] = useState(today);
  const busy = useRef(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { if (openAtStart && box.current) box.current.scrollIntoView({ block: 'center' }); }, [openAtStart]);

  const ran = test && test.outcome !== 'planned';
  /* Its test gone wrong is tested again: a re-test, as Commission plans one. */
  const again = !!test && (test.outcome === 'failed' || test.outcome === 'notRun');
  const start = () => {
    setHow(null); setSeen('');
    setDay(test && !ran && test.plannedFor && test.plannedFor <= today ? test.plannedFor : today);
    setOpen(true);
  };

  /* The test to answer: this one still to run, a re-test of one gone wrong,
     or a new proving test carrying what the program says. */
  const target = async (): Promise<{ id: string; made: boolean }> => {
    if (test && !ran) return { id: test.id, made: false };
    if (test && again) return { id: await tt.planNextFrom(test), made: true };
    const [id] = await tt.planTests([{ title: provingTitle(p), ...(assetId ? { assetId } : {}),
      extra: { programId: p.id, ...(p.runs ? { planned: p.runs } : {}), ...(p.from ? { withWhom: p.from } : {}) } }]);
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
      await tt.patchTest(id, before ? { outcome: before.outcome, ranOn: before.ranOn, result: before.result, plannedFor: before.plannedFor } : { outcome: 'planned', ranOn: undefined });
      if (made) await tt.removeTest(id);
    });
  };
  /* ONE TAP, ONE TEST: a double tap would plan two. */
  const write = (patch: (cur: Test) => Partial<Test>, said: string) => {
    if (busy.current) return;
    busy.current = true;
    void answer(patch, said).finally(() => { busy.current = false; });
  };
  const save = () => {
    if (!how || !day) return;
    const words = seen.trim();
    write(cur => ({ outcome: how, ranOn: day, plannedFor: cur.plannedFor ?? day, ...(words ? { result: words } : {}) }),
      `${p.what} — ${HOW.find(h => h.is === how)?.word.toLowerCase()} ${niceDay(day)}`);
  };
  const book = () => {
    if (!day) return;
    write(() => ({ outcome: 'planned', plannedFor: day }), `${p.what} — test booked ${niceDay(day)}`);
  };

  const cell = test && testCell(test, today);
  const label = again ? 'Test it again' : test && !ran ? 'Say how it went' : 'Test it';
  return (
    <div className="ptx" ref={box}>
      <span className="ptx-now">
        {cell
          ? <>Its test: <span className={'cg-pstate is-' + cell.tone}>{cell.word}</span>
              {test.result?.trim() && ran && <span className="sub"> — {test.result.trim()}</span>}
              {' '}<button type="button" className="cw-link" onClick={() => openRecord(projectId, test.id)}>Open the test</button></>
          : <span className="sub">{isProved(p) ? 'Proved by hand — no test behind it' : 'Not tested yet'}</span>}
        {can.edit && !open && !(isProved(p) && test?.outcome === 'passed') && (
          <button type="button" className={'btn btn-sm ptx-go' + (isProved(p) ? ' btn-ghost' : '')} onClick={start}>{label}</button>
        )}
      </span>
      {open && (
        <div className="ptx-panel" role="group" aria-label={`Test ${p.what}`}>
          <span className="ptx-h">How did {p.what} go?</span>
          <span className="spp-pick" role="group" aria-label={`How ${p.what} went`}>
            {HOW.map(h => (
              <button key={h.is} type="button" className={'spp-opt is-' + h.tone + (how === h.is ? ' is-on' : '')} aria-pressed={how === h.is}
                onClick={() => setHow(h.is)}>{h.word}</button>
            ))}
          </span>
          <label className="ptx-f">
            <span className="field-label">What was seen</span>
            <textarea className="text-input" rows={2} maxLength={400} value={seen} aria-label={`What was seen when ${p.what} ran`}
              placeholder={p.runs ? `e.g. ran ${p.runs}, 500 packs, seals checked` : 'What was run and what was seen'}
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
          {how === 'passed' && <small className="sub">Passing it proves {p.what} on that day — on the line, the control room and every paper.</small>}
        </div>
      )}
    </div>
  );
}
