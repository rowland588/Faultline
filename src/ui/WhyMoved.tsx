/* WHY DID IT MOVE? — asked every time a stage's finish is pushed later.
 *
 * Rowland: "So it always gets asked, you see. Why? What happened? If we can't
 * answer that, we end up foraging through things."
 *
 * The answer is kept as something found on that step — its words, the film and
 * the pictures, and the finish it moved from and to (lib/story). It can book a
 * fix in the same breath, with a date agreed or not yet. One Undo takes the
 * whole move back: the dates, the reason and the fix.
 */
import { useState } from 'react';
import type { MediaRef } from '../types';
import { plannedEnd, type Asset, type Test } from '../lib/testing';
import { VoiceNote } from './Voice';
import { contextFor, problemFill, type VoiceResult } from '../lib/voice';
import { followingOf, movedLater, runsInto } from '../lib/story';
import { putTestItem } from '../db';
import { todayISO } from '../lib/weeks';
import { offerUndo } from './Undo';
import type { useTesting } from '../lib/useTesting';
import { deleteTest, deleteTestItem } from '../db';
import { uid } from '../lib/ids';
import { addDays, daysBetween, niceDay } from '../lib/weeks';
import { Evidence } from './EvidenceDoors';
import { hoursTally, fullDays, hoursWord, daysWord, DAY_HOURS } from '../lib/hoursLost';
import type { TestItem } from '../lib/testing';
import { EvidenceViewer } from './Evidence';

type TT = ReturnType<typeof useTesting>;

export interface WhyAnswer { why: string; media: MediaRef[]; fix?: { on?: string; what?: string }; shiftFollowing?: boolean;
  /** What the problem cost in hours, when hours are what is known (lib/hoursLost). */
  hoursLost?: number }

/** The problem sheet's boxes as a voice note filled them (lib/voice problemFill). */
export interface ProblemFill { why: string; to: string; fix: boolean; fixOn: string; said?: string }

/** What follows a stage on its machine, for the knock-on question. */
export interface Following { n: number; into: string[] }
export const followingSummary = (step: Test, tests: Test[], end: string): Following => {
  const f = followingOf(step, tests);
  return { n: f.length, into: runsInto(f, end).map(t => `${t.title}${t.plannedFor ? ` (${niceDay(t.plannedFor)})` : ''}`) };
};

/** THE KNOCK-ON, asked in the same breath. Ticked by itself when the new
 *  finish runs into what comes next; never moved without saying. */
function KnockOn({ following, days, on, set }: { following: Following; days: number; on: boolean; set: (v: boolean) => void }) {
  if (!following.n || days <= 0) return null;
  return (
    <div className={'why-knock' + (following.into.length ? ' is-into' : '')}>
      {following.into.length > 0 && (
        <p className="why-knock-h">This now runs into {following.into.slice(0, 3).join(', ')}{following.into.length > 3 ? ` and ${following.into.length - 3} more` : ''}.</p>
      )}
      <label className="why-check"><input type="checkbox" checked={on} onChange={e => set(e.target.checked)} />
        Move what follows on this machine by {days} day{days === 1 ? '' : 's'} too ({following.n} step{following.n === 1 ? '' : 's'})</label>
    </div>
  );
}

const QUICK = ['Problem found on the machine', 'Waiting on parts', 'Supplier not on site', 'Our side not ready', 'Rework needed'];

export function WhyMoved({ from, to, many, allowFix = true, onSave, onCancel, onSkip, following }: {
  /** The finish before, and the finish now asked for. */
  from: string; to: string;
  /** How many steps this moves, when planned in bulk. */
  many?: number;
  allowFix?: boolean;
  onSave: (a: WhyAnswer) => void;
  onCancel: () => void;
  /** Move the date with no reason — re-planning, or a date typed wrong.
   *  Asked, never forced: nothing in the app is locked. */
  onSkip?: () => void;
  /** What follows on the machine — offers to move it by the same days. */
  following?: Following;
}) {
  const [shift, setShift] = useState(!!following?.into.length);
  const [why, setWhy] = useState('');
  const [media, setMedia] = useState<MediaRef[]>([]);
  const [fix, setFix] = useState(false);
  const [fixOn, setFixOn] = useState('');
  const [fixWhat, setFixWhat] = useState('');
  const [viewing, setViewing] = useState<MediaRef | null>(null);
  const days = daysBetween(from, to);
  return (
    <div className="why">
      <p className="why-h">Why has it moved?</p>
      <p className="why-s">
        Finish {niceDay(from)} → <b>{niceDay(to)}</b> · <b>+{days} day{days === 1 ? '' : 's'}</b>
        {many && many > 1 ? ` · on ${many} machines` : ''}
      </p>
      <span className="why-quick">
        {QUICK.map(q => <button key={q} type="button" className={why === q ? 'on' : ''} onClick={() => setWhy(q)}>{q}</button>)}
      </span>
      <label className="cw-f cw-f-wide"><span>What happened</span>
        <textarea className="text-area" rows={2} value={why} placeholder="Guard brackets arrived the wrong size — remade on site"
          onChange={e => setWhy(e.target.value)} /></label>
      <Evidence media={media} kind="found" onView={setViewing} onAdd={async refs => { setMedia(m => [...m, ...refs]); }} />
      {allowFix && (
        <BookFix fix={fix} setFix={setFix} on={fixOn} setOn={setFixOn} what={fixWhat} setWhat={setFixWhat} />
      )}
      {following && <KnockOn following={following} days={days} on={shift} set={setShift} />}
      <span className="why-acts">
        <button type="button" className="btn btn-primary" disabled={!why.trim()}
          onClick={() => onSave({ why: why.trim(), media, ...(fix ? { fix: bookedFix(fixOn, fixWhat) } : {}), ...(shift && following?.n ? { shiftFollowing: true } : {}) })}>Save the move</button>
        {onSkip && <button type="button" className="btn btn-ghost" onClick={onSkip}>Just change the date — no reason</button>}
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel — keep the dates</button>
      </span>
      <p className="sub why-need">
        {why.trim() ? 'The plan will show the overrun, and this is what it says when somebody taps it.'
          : 'Say what happened and the plan shows the overrun with the reason. Re-planning, or a date typed wrong? Just change the date — no overrun is drawn.'}
      </p>
      {viewing && <EvidenceViewer media={viewing} onClose={() => setViewing(null)}
        onRemove={() => { setMedia(m => m.filter(x => x.id !== viewing.id)); setViewing(null); }} />}
    </div>
  );
}

/** The fix, as the form answers it: its words and its date, each only when given. */
const bookedFix = (on: string, what: string): { on?: string; what?: string } =>
  ({ ...(on ? { on } : {}), ...(what.trim() ? { what: what.trim() } : {}) });

/* BOOK IT IN AS A FIX — the same three boxes on the move and the problem.
   WHAT THE FIX IS: a fix booked here used to be named by the problem, so the
   Fixes page showed "Guard bracket wrong size" with "Problem: Guard bracket
   wrong size" under it — a copy, not a job. Blank still names it by the
   problem, and it can be named on the fix's own page later. */
function BookFix({ fix, setFix, on, setOn, what, setWhat }: {
  fix: boolean; setFix: (v: boolean) => void; on: string; setOn: (v: string) => void; what: string; setWhat: (v: string) => void;
}) {
  return (
    <div className="why-fix">
      <label className="why-check"><input type="checkbox" checked={fix} onChange={e => setFix(e.target.checked)} /> Book it in as a fix</label>
      {fix && <>
        <label className="cw-f why-fix-what"><span>What's the fix? <span className="cw-f-opt">blank = named by the problem</span></span>
          <input value={what} placeholder="Fit the right-size bracket" onChange={e => setWhat(e.target.value)} /></label>
        <label className="cw-f why-fix-on"><span>Date agreed <span className="cw-f-opt">blank = not agreed yet</span></span>
          <input type="date" value={on} onChange={e => setOn(e.target.value)} /></label>
      </>}
    </div>
  );
}

/* ONE CHANGE, ONE UNDO — the floor's writes, shared by the install grid's
   sheets (done on every machine at once) and the record's drawer (done on this
   one). What the Undo puts back is what a floor action or a re-plan can
   touch: the verdict, the day, the dates and who. */
const snapshot = (ts: Test[]) => ts.map(t => ({ id: t.id, outcome: t.outcome, ranOn: t.ranOn, plannedFor: t.plannedFor, plannedTo: t.plannedTo, withWhom: t.withWhom, overlapOk: t.overlapOk }));

/** Patch these records, and offer to put every one of them back. */
export async function changeTests(tt: TT, ts: Test[], patch: (t: Test) => Partial<Test>, said: string): Promise<void> {
  if (!ts.length) return;
  const before = snapshot(ts);
  for (const t of ts) await tt.patchTest(t.id, patch(t));
  offerUndo(said, async () => { for (const b of before) await tt.patchTest(b.id, b); });
}

/** A PUSH LATER, KEPT WITH ITS REASON. The dates change, and the reason — its
 *  words, film and pictures, and a fix if one was booked — is kept on each
 *  record that moved (lib/story). One Undo takes back all of it. */
export async function moveTestsWithWhy(tt: TT, ts: Test[], from: string, to: string | undefined, a: WhyAnswer, said: string): Promise<void> {
  const end = to ?? from;
  const before = snapshot(ts);
  const pushed = ts.filter(t => movedLater(plannedEnd(t), end)).map(t => ({ step: t, from: plannedEnd(t) as string, to: end }));
  for (const t of ts) await tt.patchTest(t.id, { plannedFor: from, plannedTo: to });
  const back = await recordMove(tt, pushed, a);
  offerUndo(said, async () => { for (const b of before) await tt.patchTest(b.id, b); await back(); });
}

/** Keep the reason (and the fix, if asked) on each moved step. Returns how to
 *  take it all back — the caller restores the dates in the same Undo. */
export async function recordMove(tt: TT, steps: { step: Test; from?: string; to?: string }[], a: WhyAnswer): Promise<() => Promise<void>> {
  const made: { item: string; fix?: string }[] = [];
  const at = Date.now();
  for (const [k, { step, from, to }] of steps.entries()) {
    let fixId: string | undefined;
    if (a.fix && steps.length === 1) {
      fixId = await tt.planNextFrom(step, undefined, a.fix.what?.trim() || a.why, 'fix', a.why);
      if (a.fix.on) await tt.patchTest(fixId, { plannedFor: a.fix.on });
    }
    const id = uid();
    await tt.saveItem({
      id, projectId: step.projectId, testId: step.id, kind: 'found', what: a.why,
      ...(a.media.length ? { media: a.media } : {}),
      ...(from && to ? { movedFrom: from, movedTo: to } : {}),
      ...(fixId ? { becameTestId: fixId } : {}),
      ...(a.hoursLost && steps.length === 1 ? { hoursLost: a.hoursLost } : {}),
      sort: at + k, createdAt: at + k, updatedAt: at + k,
    });
    made.push({ item: id, ...(fixId ? { fix: fixId } : {}) });
  }
  /* THE KNOCK-ON: what follows on the machine moves by the same days. */
  const shifted: { id: string; plannedFor?: string; plannedTo?: string }[] = [];
  const one = steps.length === 1 ? steps[0] : undefined;
  if (a.shiftFollowing && one?.from && one.to) {
    const days = daysBetween(one.from, one.to);
    for (const f of followingOf(one.step, tt.tests)) {
      shifted.push({ id: f.id, plannedFor: f.plannedFor, plannedTo: f.plannedTo });
      await tt.patchTest(f.id, { plannedFor: f.plannedFor && addDays(f.plannedFor, days), plannedTo: f.plannedTo && addDays(f.plannedTo, days) });
    }
  }
  return async () => {
    for (const m of made) {
      await deleteTestItem(m.item);
      if (m.fix) await deleteTest(m.fix, steps[0].step.projectId);
    }
    for (const f of shifted) await tt.patchTest(f.id, { plannedFor: f.plannedFor, plannedTo: f.plannedTo });
  };
}

/** WHY ONE OF THE OTHER DATES MOVED — the handover, a machine, a material, a
 *  program. Kept as something found under the key that names it (lib/story),
 *  so the plan can draw it and print the reason. Returns how to take it back. */
export async function recordThingMove(projectId: string, key: string, from: string, to: string, a: WhyAnswer): Promise<() => Promise<void>> {
  const at = Date.now(), id = uid();
  await putTestItem({
    id, projectId, testId: key, kind: 'found', what: a.why,
    ...(a.media.length ? { media: a.media } : {}),
    movedFrom: from, movedTo: to, sort: at, createdAt: at, updatedAt: at,
  });
  return async () => { await deleteTestItem(id); };
}

/* HIT A PROBLEM — one short form, the date asked in the same breath.
 *
 * Rowland: "do I press hit a problem? It doesn't prompt me for any date
 * changes." It did not: it marked the step and sent you to write the problem
 * up somewhere else, and the plan never heard. Now the problem, its pictures,
 * whether it pushes the finish — and to when — and a fix, are one answer. A
 * later finish is kept as a move with this problem as its reason, so the Gantt
 * shows the overrun and why. */
export function ProblemForm({ step, onSave, onCancel, tests = [], items = [], assets = [], initial, day = DAY_HOURS, onDay }: {
  step: Test;
  /** The job's steps — for what follows on the machine. */
  tests?: Test[];
  /** What was found on them — for the hours this stage has already lost. */
  items?: TestItem[];
  /** The job's working day in hours, and how to change it. */
  day?: number;
  onDay?: (hours: number) => void;
  /** The job's machines — the names the voice reader spells against. */
  assets?: Asset[];
  /** The boxes as a voice note on the stage already filled them. */
  initial?: ProblemFill;
  onSave: (a: WhyAnswer & { to?: string }) => void;
  onCancel: () => void;
}) {
  const end = plannedEnd(step);
  const [why, setWhy] = useState(initial?.why ?? '');
  const [media, setMedia] = useState<MediaRef[]>([]);
  const [to, setTo] = useState(initial?.to ?? '');
  const [fix, setFix] = useState(!!initial?.fix);
  const [fixOn, setFixOn] = useState(initial?.fixOn ?? '');
  const [fixWhat, setFixWhat] = useState('');
  const [said, setSaid] = useState<string | undefined>(initial?.said);
  /* SPOKEN INTO THESE BOXES. Rowland, 4 October: "allow me to speak inside
     that sheet, in the correct boxes." A note fills what happened, the finish
     and the fix right here — the sheet is the review; nothing is kept until
     Save. What is already in "What happened" goes with the recording, so a
     second note is worked into it, not stacked under it. */
  const heard = (r: VoiceResult) => {
    const f = problemFill(r, { why, to, fix, fixOn });
    setWhy(f.why); setTo(f.to); setFix(f.fix); setFixOn(f.fixOn); setSaid(f.said);
    if (f.to) setCost('date');
  };
  const [viewing, setViewing] = useState<MediaRef | null>(null);
  /* DAYS OR HOURS. Rowland, 6 October: "it only gives me ability to put days,
     but in some occasions I find out that actually it's hours." A problem
     that cost hours says so; the stage's hours add up (lib/hoursLost), and
     the one that makes a full working day offers to push the finish by it. */
  const [cost, setCost] = useState<'none' | 'hours' | 'date'>(initial?.to ? 'date' : 'none');
  const [hoursText, setHoursText] = useState('');
  const [dayText, setDayText] = useState<string | null>(null);
  const hours = Math.max(0, Number(hoursText.replace(',', '.')) || 0);
  const tally = hoursTally(step.id, items, day);
  const daysMade = cost === 'hours' && hours > 0 ? fullDays(tally.banked, hours, day) : 0;
  const [pushPicked, setPush] = useState<boolean | null>(null);
  const push = daysMade > 0 && !!end && (pushPicked ?? true);
  const target = cost === 'date' ? to : push && end ? addDays(end, daysMade) : '';
  const later = movedLater(end, target || undefined);
  const following = later && target ? followingSummary(step, tests, target) : undefined;
  /* Ticked by itself only when the new finish runs into what follows — the
     same rule as WhyMoved. It started ticked whatever the date, and Save then
     ignored the tick unless the finish ran into the next step: the box said
     "move what follows too" and nothing moved. Now the tick is what happens. */
  const [picked, setShift] = useState<boolean | null>(null);
  const shift = picked ?? !!following?.into.length;
  return (
    <div className="why">
      <span className="why-say">
        <p className="why-h">What's the problem?</p>
        <VoiceNote form="problem" label="Say it"
          context={() => ({ ...contextFor(assets, tests, todayISO(), step), on: { title: step.title, machine: assets.find(a => a.id === step.assetId)?.name, ...(why.trim() ? { result: why.trim() } : {}) } })}
          onHeard={heard} />
      </span>
      {said && <p className="vo-said why-said"><span className="vo-said-l">You said</span> “{said}”</p>}
      <span className="why-quick">
        {QUICK.map(q => <button key={q} type="button" className={why === q ? 'on' : ''} onClick={() => setWhy(q)}>{q}</button>)}
      </span>
      <label className="cw-f cw-f-wide"><span>What happened</span>
        <textarea className="text-area" rows={2} value={why} autoFocus placeholder="Guard brackets arrived the wrong size"
          onChange={e => setWhy(e.target.value)} /></label>
      <Evidence media={media} kind="found" onView={setViewing} onAdd={async refs => { setMedia(m => [...m, ...refs]); }} />
      <div className="why-cost">
        <span className="why-cost-h">What did it cost? <span className="cw-f-opt">finish {end ? `now ${niceDay(end)}` : 'not dated yet'}</span></span>
        <span className="cw-seg" role="group" aria-label="What did it cost?">
          {([['none', 'Nothing yet'], ['hours', 'Hours lost'], ['date', 'A new finish']] as const).map(([k, w]) => (
            <button key={k} type="button" className={'chip' + (cost === k ? ' on' : '')} aria-pressed={cost === k} onClick={() => setCost(k)}>{w}</button>
          ))}
        </span>
        {cost === 'hours' && (
          <>
            <label className="cw-f why-hours"><span>Hours lost</span>
              <input inputMode="decimal" value={hoursText} placeholder="2" autoFocus onChange={e => setHoursText(e.target.value)} /></label>
            <p className="why-s why-tally">
              {tally.banked > 0
                ? <>This stage has lost <b>{hoursWord(tally.banked)}</b> towards the next day{tally.pushedDays ? ` (and pushed ${tally.pushedDays} day${tally.pushedDays === 1 ? '' : 's'} already)` : ''}. </>
                : tally.pushedDays ? <>Hours lost here have pushed the finish {tally.pushedDays} day{tally.pushedDays === 1 ? '' : 's'} so far. </> : null}
              {hours > 0 && <>With this, <b>{hoursWord(tally.banked + hours)}</b> — {daysWord(tally.banked + hours, day)}. </>}
              {dayText === null
                ? <>A day here is {hoursWord(day)}{onDay && <> · <button type="button" className="cw-link" onClick={() => setDayText(String(day))}>change</button></>}</>
                : <span className="why-day">A day here is <input inputMode="decimal" value={dayText} aria-label="Hours in a working day" onChange={e => setDayText(e.target.value)} /> h
                  <button type="button" className="btn btn-sm" onClick={() => {
                    const v = Number(dayText.replace(',', '.'));
                    if (v > 0 && v <= 24) onDay?.(v);
                    setDayText(null);
                  }}>Set</button></span>}
            </p>
            {daysMade > 0 && (end
              ? <label className="why-check"><input type="checkbox" checked={push} onChange={e => setPush(e.target.checked)} />
                <span>That makes {daysMade} full day{daysMade === 1 ? '' : 's'} lost — push the finish {niceDay(end)} → <b>{niceDay(addDays(end, daysMade))}</b></span></label>
              : <p className="why-s">That makes {daysMade} full day{daysMade === 1 ? '' : 's'} lost — give the stage a finish date to push it.</p>)}
          </>
        )}
        {cost === 'date' && (
          <label className="cw-f why-fix-on" style={{ flex: '0 1 260px' }}><span>New finish</span>
            <input type="date" value={to} min={step.plannedFor ?? undefined} onChange={e => setTo(e.target.value)} /></label>
        )}
      </div>
      {later && end && <p className="why-s">Finish {niceDay(end)} → <b>{niceDay(target)}</b> · <b>+{daysBetween(end, target)} day{daysBetween(end, target) === 1 ? '' : 's'}</b> — the plan will show it, with this as the reason.</p>}
      {following && end && <KnockOn following={following} days={daysBetween(end, target)} on={shift} set={setShift} />}
      <BookFix fix={fix} setFix={setFix} on={fixOn} setOn={setFixOn} what={fixWhat} setWhat={setFixWhat} />
      <span className="why-acts">
        <button type="button" className="btn btn-primary" disabled={!why.trim()}
          onClick={() => onSave({ why: why.trim(), media, ...(target ? { to: target } : {}), ...(cost === 'hours' && hours > 0 ? { hoursLost: hours } : {}), ...(fix ? { fix: bookedFix(fixOn, fixWhat) } : {}), ...(following?.n && shift ? { shiftFollowing: true } : {}) })}>Save the problem</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </span>
      {viewing && <EvidenceViewer media={viewing} onClose={() => setViewing(null)}
        onRemove={() => { setMedia(m => m.filter(x => x.id !== viewing.id)); setViewing(null); }} />}
    </div>
  );
}

/** Keep a problem on a step: marks it as having hit one, moves its finish when
 *  a later one was given (kept as a move, this problem its reason), books the
 *  fix if asked. One Undo takes all of it back. */
export async function recordProblem(tt: TT, step: Test, a: WhyAnswer & { to?: string }, said: string): Promise<void> {
  const before = { outcome: step.outcome, ranOn: step.ranOn, plannedFor: step.plannedFor, plannedTo: step.plannedTo };
  const end = plannedEnd(step);
  const moved = !!a.to && movedLater(end, a.to);
  const dates = a.to
    ? (step.plannedFor && a.to > step.plannedFor ? { plannedTo: a.to } : { plannedFor: a.to, plannedTo: undefined })
    : {};
  await tt.patchTest(step.id, { outcome: 'failed', ranOn: step.ranOn ?? todayISO(), ...dates });
  const back = await recordMove(tt, [{ step, ...(moved ? { from: end, to: a.to } : {}) }], a);
  offerUndo(said, async () => { await tt.patchTest(step.id, before); await back(); });
}
