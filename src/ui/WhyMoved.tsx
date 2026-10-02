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
import type { Test } from '../lib/testing';
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
export async function recordMove(tt: TT, steps: { step: Test; from: string; to: string }[], a: WhyAnswer): Promise<() => Promise<void>> {
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
      movedFrom: from, movedTo: to,
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
