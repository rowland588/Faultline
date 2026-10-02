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
import { plannedEnd, type Test } from '../lib/testing';
import { movedLater } from '../lib/story';
import { todayISO } from '../lib/weeks';
import { offerUndo } from './Undo';
import type { useTesting } from '../lib/useTesting';
import { deleteTest, deleteTestItem } from '../db';
import { uid } from '../lib/ids';
import { daysBetween, niceDay } from '../lib/weeks';
import { Evidence } from './EvidenceDoors';
import { EvidenceViewer } from './Evidence';

type TT = ReturnType<typeof useTesting>;

export interface WhyAnswer { why: string; media: MediaRef[]; fix?: { on?: string } }

const QUICK = ['Problem found on the machine', 'Waiting on parts', 'Supplier not on site', 'Our side not ready', 'Rework needed'];

export function WhyMoved({ from, to, many, allowFix = true, onSave, onCancel }: {
  /** The finish before, and the finish now asked for. */
  from: string; to: string;
  /** How many steps this moves, when planned in bulk. */
  many?: number;
  allowFix?: boolean;
  onSave: (a: WhyAnswer) => void;
  onCancel: () => void;
}) {
  const [why, setWhy] = useState('');
  const [media, setMedia] = useState<MediaRef[]>([]);
  const [fix, setFix] = useState(false);
  const [fixOn, setFixOn] = useState('');
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
        <div className="why-fix">
          <label className="why-check"><input type="checkbox" checked={fix} onChange={e => setFix(e.target.checked)} /> Book it in as a fix</label>
          {fix && (
            <label className="cw-f why-fix-on"><span>Date agreed <span className="cw-f-opt">blank = not agreed yet</span></span>
              <input type="date" value={fixOn} onChange={e => setFixOn(e.target.value)} /></label>
          )}
        </div>
      )}
      <span className="why-acts">
        <button type="button" className="btn btn-primary" disabled={!why.trim()}
          onClick={() => onSave({ why: why.trim(), media, ...(fix ? { fix: fixOn ? { on: fixOn } : {} } : {}) })}>Save the move</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel — keep the dates</button>
      </span>
      {!why.trim() && <p className="sub why-need">Say what happened to save it — that is what the plan shows when somebody taps the overrun.</p>}
      {viewing && <EvidenceViewer media={viewing} onClose={() => setViewing(null)}
        onRemove={() => { setMedia(m => m.filter(x => x.id !== viewing.id)); setViewing(null); }} />}
    </div>
  );
}

/** Keep the reason (and the fix, if asked) on each moved step. Returns how to
 *  take it all back — the caller restores the dates in the same Undo. */
export async function recordMove(tt: TT, steps: { step: Test; from?: string; to?: string }[], a: WhyAnswer): Promise<() => Promise<void>> {
  const made: { item: string; fix?: string }[] = [];
  const at = Date.now();
  for (const [k, { step, from, to }] of steps.entries()) {
    let fixId: string | undefined;
    if (a.fix && steps.length === 1) {
      fixId = await tt.planNextFrom(step, undefined, a.why, 'fix', a.why);
      if (a.fix.on) await tt.patchTest(fixId, { plannedFor: a.fix.on });
    }
    const id = uid();
    await tt.saveItem({
      id, projectId: step.projectId, testId: step.id, kind: 'found', what: a.why,
      ...(a.media.length ? { media: a.media } : {}),
      ...(from && to ? { movedFrom: from, movedTo: to } : {}),
      ...(fixId ? { becameTestId: fixId } : {}),
      sort: at + k, createdAt: at + k, updatedAt: at + k,
    });
    made.push({ item: id, ...(fixId ? { fix: fixId } : {}) });
  }
  return async () => {
    for (const m of made) {
      await deleteTestItem(m.item);
      if (m.fix) await deleteTest(m.fix, steps[0].step.projectId);
    }
  };
}

/* HIT A PROBLEM — one short form, the date asked in the same breath.
 *
 * Rowland: "do I press hit a problem? It doesn't prompt me for any date
 * changes." It did not: it marked the step and sent you to write the problem
 * up somewhere else, and the plan never heard. Now the problem, its pictures,
 * whether it pushes the finish — and to when — and a fix, are one answer. A
 * later finish is kept as a move with this problem as its reason, so the Gantt
 * shows the overrun and why. */
export function ProblemForm({ step, onSave, onCancel }: {
  step: Test;
  onSave: (a: WhyAnswer & { to?: string }) => void;
  onCancel: () => void;
}) {
  const end = plannedEnd(step);
  const [why, setWhy] = useState('');
  const [media, setMedia] = useState<MediaRef[]>([]);
  const [to, setTo] = useState('');
  const [fix, setFix] = useState(false);
  const [fixOn, setFixOn] = useState('');
  const [viewing, setViewing] = useState<MediaRef | null>(null);
  const later = movedLater(end, to || undefined);
  return (
    <div className="why">
      <p className="why-h">What's the problem?</p>
      <span className="why-quick">
        {QUICK.map(q => <button key={q} type="button" className={why === q ? 'on' : ''} onClick={() => setWhy(q)}>{q}</button>)}
      </span>
      <label className="cw-f cw-f-wide"><span>What happened</span>
        <textarea className="text-area" rows={2} value={why} autoFocus placeholder="Guard brackets arrived the wrong size"
          onChange={e => setWhy(e.target.value)} /></label>
      <Evidence media={media} kind="found" onView={setViewing} onAdd={async refs => { setMedia(m => [...m, ...refs]); }} />
      <label className="cw-f why-fix-on" style={{ flex: '0 1 260px' }}>
        <span>Does it push the finish? <span className="cw-f-opt">{end ? `now ${niceDay(end)}` : 'no date yet'} · blank = no</span></span>
        <input type="date" value={to} min={step.plannedFor ?? undefined} onChange={e => setTo(e.target.value)} /></label>
      {later && end && <p className="why-s">Finish {niceDay(end)} → <b>{niceDay(to)}</b> · <b>+{daysBetween(end, to)} day{daysBetween(end, to) === 1 ? '' : 's'}</b> — the plan will show it, with this as the reason.</p>}
      <div className="why-fix">
        <label className="why-check"><input type="checkbox" checked={fix} onChange={e => setFix(e.target.checked)} /> Book it in as a fix</label>
        {fix && (
          <label className="cw-f why-fix-on"><span>Date agreed <span className="cw-f-opt">blank = not agreed yet</span></span>
            <input type="date" value={fixOn} onChange={e => setFixOn(e.target.value)} /></label>
        )}
      </div>
      <span className="why-acts">
        <button type="button" className="btn btn-primary" disabled={!why.trim()}
          onClick={() => onSave({ why: why.trim(), media, ...(to ? { to } : {}), ...(fix ? { fix: fixOn ? { on: fixOn } : {} } : {}) })}>Save the problem</button>
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
