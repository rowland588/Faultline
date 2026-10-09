/* A PROBLEM, OPENED ON ITS OWN — in the one drawer, from wherever it is listed.
 *
 * Rowland, 8 October: "I'm trying to open a problem — I have to filter, go all
 * the way down the page, then open the problem again to edit the problem.
 * There are so many ways to get to something, and it shouldn't be."
 * (docs/DOORS.md)
 *
 * A problem was a line inside its stage: tapped on the Fixes page it opened
 * the stage, and was edited inline three screens down by a second form. Now
 * it opens as itself — the same drawer as a stage, a test or a fix — and reads
 * in the same order: what it is and where, how it stands, what it cost, its
 * story when flagged, its pictures; then its actions. Edit opens THE problem
 * form (ui/WhyMoved ProblemForm), the one that wrote it, filled. */
import { useState } from 'react';
import type { MediaRef } from '../types';
import { live, type Test, type TestItem } from '../lib/testing';
import { productName, productRuns } from '../lib/run';
import { niceDay, todayISO } from '../lib/weeks';
import { hoursWord } from '../lib/hoursLost';
import type { Can } from '../lib/access';
import type { useTesting } from '../lib/useTesting';
import { ProblemForm } from './WhyMoved';
import { hasKept } from '../lib/kept';
import type { WhyAnswer } from './WhyMoved';
import { CriticalStory, CriticalTag } from './CriticalFields';
import { EvidenceThumb, EvidenceViewer, pinsOnJob } from './Evidence';
import { removeProblem } from './StageStory';
import { offerUndo } from './Undo';
import { OnTheLine } from './OnTheLine';

type TT = ReturnType<typeof useTesting>;

/** A CHANGE TO A SAVED PROBLEM, from the one form. Its words, pictures, hours
 *  and flag are replaced whole by what the form says. THE FIX IT BOOKED keeps
 *  a copy of the words (its name when nobody gave it one, and "The problem"
 *  its card and the client report print): a copy still matching the old words
 *  moves with them; "The problem" on a fix is agreed, so only the owner moves
 *  that one (lib/access). */
/** What the form can change, in one order — no pictures and an empty list
 *  are the same, so Save on an untouched problem changes nothing. */
const said = (i: TestItem): string => JSON.stringify([
  i.what, i.media?.length ? i.media : null, i.hoursLost ?? null, !!i.critical, !!i.risk,
  i.couldLose ?? null, i.impact ?? null, i.ways?.length ? i.ways : null, i.owner ?? null,
]);

export function saveProblemEdit(tt: Pick<TT, 'tests' | 'saveItem' | 'patchTest'>, item: TestItem, a: WhyAnswer, can: Can): void {
  const { critical: _c, impact: _i, ways: _w, risk: _r, couldLose: _l, hoursLost: _h, owner: _o, ...rest } = item;
  const next: TestItem = {
    ...rest, what: a.why.trim() || item.what, media: a.media,
    ...(a.hoursLost ? { hoursLost: a.hoursLost } : {}),
    ...(a.critical ? { critical: true } : {}), ...(a.risk && !a.critical ? { risk: true } : {}),
    ...(a.couldLose ? { couldLose: a.couldLose } : {}), ...(a.impact ? { impact: a.impact } : {}),
    ...(a.ways?.length ? { ways: a.ways } : {}),
    /* Whose it is, as the form says — kept as it was when the form did not ask. */
    ...('owner' in a ? (a.owner ? { owner: a.owner } : {}) : item.owner ? { owner: item.owner } : {}),
  };
  if (said(next) === said(item)) return;
  const fix = item.becameTestId ? tt.tests.find(t => t.id === item.becameTestId) : undefined;
  const was = item.what.trim();
  const fixPatch: Partial<Test> = {};
  if (fix && next.what !== item.what) {
    if (fix.title.trim() === was) fixPatch.title = next.what;
    if (can.agree && (fix.passesIf ?? '').trim() === was) fixPatch.passesIf = next.what;
  }
  const fixed = !!fix && Object.keys(fixPatch).length > 0;
  void tt.saveItem(next);
  if (fix && fixed) void tt.patchTest(fix.id, fixPatch);
  offerUndo('Problem changed', async () => {
    await tt.saveItem(item);
    if (fix && fixed) await tt.patchTest(fix.id, { title: fix.title, passesIf: fix.passesIf });
  });
}

/** Is this id a problem on the job? — what the drawer opens it as. */
export const problemOf = (id: string, items: TestItem[]): TestItem | undefined =>
  live(items).find(i => i.id === id && i.kind === 'found');

export function ProblemRecord({ item, tt, can, day, onDay, onOpen }: {
  item: TestItem; tt: TT; can: Can;
  /** The job's working day, for the hours. */
  day?: number; onDay?: (h: number) => void;
  /** Open another record in this drawer — the stage, its fix. */
  onOpen: (id: string) => void;
}) {
  /* An edit left unsaved (lib/kept) opens again with what was typed. */
  const [editing, setEditing] = useState(() => hasKept(`problem:${item.id}:`));
  const [viewing, setViewing] = useState<MediaRef | null>(null);
  const step = live(tt.tests).find(t => t.id === item.testId);
  const machine = step ? tt.assets.find(a => a.id === step.assetId)?.name : undefined;
  const fix = item.becameTestId ? live(tt.tests).find(t => t.id === item.becameTestId) : undefined;
  /* Written on a part of the plan, or on one product of a run. */
  const on = item.fromItemId
    ? live(tt.items).find(i => i.id === item.fromItemId && i.kind === 'next')?.what
      ?? (step ? (r => (r ? productName(r) : undefined))(productRuns(step).find(r => r.id === item.fromItemId)) : undefined)
    : undefined;
  const sorted = item.doneAt != null;
  const fixDone = fix?.outcome === 'passed';
  const state = fix
    ? { word: fixDone ? `fixed${fix.ranOn ? ` ${niceDay(fix.ranOn)}` : ''}` : `fix booked${fix.plannedFor ? ` · ${niceDay(fix.plannedFor)}` : ''}`, tone: fixDone ? 'g' : 'w' }
    : sorted ? { word: `sorted ${niceDay(todayISO(new Date(item.doneAt as number)))}`, tone: 'g' }
      : { word: 'open', tone: item.critical ? 'r' : 'a' };
  const where = step ? `${machine ? `${machine} — ` : ''}${step.title}` : 'The job';
  const cost = [
    item.hoursLost ? `${hoursWord(item.hoursLost)} lost` : '',
    item.couldLose ? `could cost ${hoursWord(item.couldLose)} (an estimate)` : '',
    item.movedFrom && item.movedTo ? `moved the finish ${niceDay(item.movedFrom)} → ${niceDay(item.movedTo)}` : '',
  ].filter(Boolean).join(' · ');

  const toggleSorted = () => {
    void tt.saveItem({ ...item, doneAt: sorted ? undefined : Date.now() });
    offerUndo(sorted ? `Open again — ${item.what}` : `Sorted — ${item.what}`, () => tt.saveItem(item));
  };
  const makeFix = async () => { if (step) onOpen(await tt.planNextFrom(step, item.id, item.what, 'fix', item.what)); };

  if (editing && step) {
    return (
      <ProblemForm keep={`problem:${item.id}:`} step={step} item={item} tests={tt.tests} items={tt.items} assets={tt.assets} on={on} day={day} onDay={onDay}
        onCancel={() => setEditing(false)}
        onSave={a => { saveProblemEdit(tt, item, a, can); setEditing(false); }} />
    );
  }
  return (
    <>
      <p className="rd-state-row">
        <span className={'rd-state is-' + state.tone}>{state.word}</span>
        {(item.critical || item.risk) && <CriticalTag sorted={sorted || fixDone} risk={!item.critical} />}
      </p>
      <h2 className="rd-title">{item.what}</h2>
      <dl className="rd-facts">
        <div><dt>What</dt><dd>
          Problem on {step ? <button type="button" className="rd-inline" onClick={() => onOpen(step.id)}>{where}</button> : where}
          {on && <> · on <b>{on}</b></>}
        </dd></div>
        <div><dt>Cost</dt><dd>{cost || 'nothing said'}</dd></div>
        <div><dt>Written</dt><dd>{niceDay(todayISO(new Date(item.createdAt)))}</dd></div>
        {item.owner && <div><dt>Whose</dt><dd>{item.owner}</dd></div>}
        {fix && <div><dt>Fix</dt><dd><button type="button" className="rd-inline" onClick={() => onOpen(fix.id)}>{fix.title}</button>{fix.withWhom ? ` · ${fix.withWhom}` : ''}</dd></div>}
      </dl>
      {(item.critical || item.risk) && (
        <div className="rd-blk">
          <CriticalStory impact={item.impact} ways={item.ways} couldLose={item.couldLose} risk={!item.critical} />
        </div>
      )}
      {(item.media ?? []).length > 0 && (
        <span className="sp-ev">{(item.media ?? []).map(m => <EvidenceThumb key={m.id} media={m} size={72} onClick={() => setViewing(m)} />)}</span>
      )}
      {/* WHERE ON THE LINE — the problem pointed at on a frame of the filmed
          walk (it was on the record's page; ui/OnTheLine). Nothing is said
          when nothing has been filmed. */}
      {(can.edit || item.pin) && (
        <div className="rd-blk">
          <OnTheLine projectId={item.projectId} pin={item.pin} quiet onSave={can.edit ? pin => void tt.saveItem({ ...item, pin }) : undefined} />
        </div>
      )}
      {can.edit && (
        <div className="rd-acts">
          <button type="button" className="btn btn-primary" onClick={() => setEditing(true)} disabled={!step}>Edit</button>
          {!fix && <button type="button" className="btn" onClick={toggleSorted}>{sorted ? 'Open again' : 'Sorted'}</button>}
          {!fix && !sorted && step && <button type="button" className="btn" onClick={() => void makeFix()}>Make it a fix</button>}
          {can.remove && <button type="button" className="cw-link sp-rm" onClick={() => void removeProblem(tt, item.id)}>Delete this problem</button>}
        </div>
      )}
      {viewing && <EvidenceViewer media={viewing} onClose={() => setViewing(null)} onPins={can.edit ? pinsOnJob(tt, viewing.id) : undefined} />}
    </>
  );
}
