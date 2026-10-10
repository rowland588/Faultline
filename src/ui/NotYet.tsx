/* NOT YET — the "no" a stage was missing (docs/PANELS.md item 1).
 *
 * Rowland, 10 October: "It really should be just a yes or a no. At the
 * moment it's done or you hit a problem, and then you have to go through the
 * problem statement rather than just saying, well, no — commentary, it's
 * late, whatever it may be." Air and power waiting on the air main was filed
 * as a problem: "Problem" on its square, "1 problem" in the verdict, a
 * problem line on the client report.
 *
 * Not yet asks three things — what we are waiting for, whose it is, by when —
 * and keeps the answer as one of the stage's parts: a dated line owed by
 * someone, the record "what's next, agreed" already is (no new noun). So it
 * shows wherever a stage's parts show — its square and phone card, the plan,
 * Needs you, who owes what, the day, the client report — and the stage is
 * not marked anything. The reason is kept too, on the day it was said, as
 * something written on the stage that is followed as the line (becameItemId,
 * as a problem is followed as its fix): the stage's story and the day say
 * "not yet", and it is never listed as a problem with no fix. When the day
 * given is after the stage's finish, the finish can move to it with this as
 * the reason, the move the plan already keeps. */
import { useState } from 'react';
import { plannedEnd, type Test, type TestItem } from '../lib/testing';
import { movedLater } from '../lib/story';
import { niceDay } from '../lib/weeks';
import { uid } from '../lib/ids';
import { deleteTestItem } from '../db';
import { offerUndo } from './Undo';
import { DateInput } from './DateInput';
import type { useTesting } from '../lib/useTesting';

type TT = ReturnType<typeof useTesting>;

export interface NotYetAnswer { what: string; who?: string; by?: string; move: boolean }

/** Keep a "not yet" on a stage: the line owed, and — when asked — the finish
 *  moved to its day with the line as the reason. One Undo takes it back. */
export async function recordNotYet(tt: TT, step: Test, a: NotYetAnswer): Promise<void> {
  const at = Date.now();
  const partId = uid();
  const end = plannedEnd(step);
  const move = a.move && !!a.by && movedLater(end, a.by);
  const sort = tt.items.filter(i => i.testId === step.id && i.kind === 'next').reduce((n, i) => Math.max(n, i.sort), 0) + 1;
  const reasonId = uid();
  const part: TestItem = {
    id: partId, projectId: step.projectId, testId: step.id, kind: 'next', what: a.what.trim(),
    ...(a.who?.trim() ? { owner: a.who.trim() } : {}), ...(a.by ? { due: a.by } : {}),
    fromItemId: reasonId, sort, createdAt: at, updatedAt: at,
  };
  await tt.saveItem(part);
  await tt.saveItem({
    id: reasonId, projectId: step.projectId, testId: step.id, kind: 'found', what: a.what.trim(),
    ...(move && a.by ? { movedFrom: end, movedTo: a.by } : {}), becameItemId: partId, sort: at, createdAt: at, updatedAt: at,
  });
  const before = { plannedFor: step.plannedFor, plannedTo: step.plannedTo };
  if (move && a.by) await tt.patchTest(step.id, step.plannedFor && a.by > step.plannedFor ? { plannedTo: a.by } : { plannedFor: a.by, plannedTo: undefined });
  offerUndo(`${step.title}: not yet — ${a.what.trim()}${move && a.by ? `, finish now ${niceDay(a.by)}` : ''}`, async () => {
    await deleteTestItem(partId);
    await deleteTestItem(reasonId);
    if (move) await tt.patchTest(step.id, before);
  });
}

/** The form, in the drawer beside Done today. Four quick answers fill the
 *  line; who starts as who the stage is with; the day is optional. */
export function NotYetForm({ step, names, onSave, onCancel }: {
  step: Test;
  /** Everyone named on the job, for the "whose" box. */
  names: string[];
  onSave: (a: NotYetAnswer) => void;
  onCancel: () => void;
}) {
  const [what, setWhat] = useState('');
  const [who, setWho] = useState(step.withWhom?.trim() ?? '');
  const [by, setBy] = useState('');
  const end = plannedEnd(step);
  const later = !!by && movedLater(end, by);
  const [moveIt, setMove] = useState(true);
  const quick = [
    `Waiting on ${step.withWhom?.trim() || 'the supplier'}`,
    'Waiting on the site',
    'Waiting on parts',
    'Not started yet',
  ];
  return (
    <form className="ny" onSubmit={e => { e.preventDefault(); if (what.trim()) onSave({ what, who, by: by || undefined, move: later && moveIt }); }}>
      <p className="ny-h">Not yet — what are we waiting for?</p>
      <span className="ny-quick">
        {quick.map(q => <button key={q} type="button" className={'chip' + (what === q ? ' on' : '')} aria-pressed={what === q} onClick={() => setWhat(q)}>{q}</button>)}
      </span>
      <label className="cw-f cw-f-wide"><span>Waiting for</span>
        <input className="text-input" value={what} autoFocus placeholder="The air main goes in Friday" onChange={e => setWhat(e.target.value)} /></label>
      <span className="ny-row">
        <label className="cw-f"><span>Whose</span>
          <input className="text-input" list="ny-names" value={who} placeholder="Who it is with" onChange={e => setWho(e.target.value)} /></label>
        <label className="cw-f"><span>By when <span className="cw-f-opt">if anyone knows</span></span>
          <DateInput value={by} onCommit={setBy} aria-label="By when" /></label>
      </span>
      <datalist id="ny-names">{names.map(n => <option key={n} value={n} />)}</datalist>
      {later && end && (
        <label className="why-check"><input type="checkbox" checked={moveIt} onChange={e => setMove(e.target.checked)} />
          <span>That is after its finish — move the finish {niceDay(end)} → <b>{niceDay(by)}</b>, with this as the reason</span></label>
      )}
      <span className="why-acts">
        <button type="submit" className="btn btn-primary" disabled={!what.trim()}>Save</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </span>
    </form>
  );
}
