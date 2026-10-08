/* WHAT HAPPENED TO THIS STAGE, as a list — the moves with their reasons, what
 * was found, the pictures, and each fix under the problem it came from.
 *
 * Rowland, 5 October: "I said there was a problem, took the picture and put it
 * in there, and marked it as a fix. When I go to fixes it's not in my list. I
 * end up going back and forth and it's just lost." The fix was kept; what he
 * could not do was find it again from where he made it. The Gantt's panel
 * told this story and the stage's own sheet — where the problem is written —
 * told none of it. One list now, read off lib/story, on both: the plan's
 * panel (ui/StagePanel) and the stage sheet (ui/InstallGrid).
 *
 * A FIX SITS UNDER ITS PROBLEM. "Found: guard bracket wrong size" and, three
 * lines further down in date order, "Fix: …" read as two unrelated things. A
 * problem that booked a fix carries it, with its date agreed or not and the
 * door to it; a fix planned on its own still has a line of its own. The door
 * opens the fix in the drawer (ui/RecordDrawer) — the same one this list is
 * usually read in — never on another page.
 */
import { productName, productRuns } from '../lib/run';
import { useState } from 'react';
import type { MediaRef } from '../types';
import type { Test } from '../lib/testing';
import { storyOf } from '../lib/story';
import { niceDay } from '../lib/weeks';
import { openRecord } from './RecordDrawer';
import { EvidenceThumb, EvidenceViewer, pinsOnJob } from './Evidence';
import { offerUndo } from './Undo';
import { deleteTestItem } from '../db';
import type { useTesting } from '../lib/useTesting';
import type { Can } from '../lib/access';
import { useProjects } from '../lib/useProjects';
import { dayLength, daysWord, hoursTally, hoursWord, partsWord } from '../lib/hoursLost';
import { CriticalStory, CriticalTag } from './CriticalFields';

type TT = ReturnType<typeof useTesting>;

const isoOfMs = (ms: number) => {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** A fix's state in words — the same on the panel, the sheet and paper. */
export const fixWord = (f: Test): string => f.outcome === 'passed' ? `done${f.ranOn ? ` ${niceDay(f.ranOn)}` : ''}`
  : f.plannedFor ? `date agreed ${niceDay(f.plannedFor)}${f.plannedTo && f.plannedTo > f.plannedFor ? ` – ${niceDay(f.plannedTo)}` : ''}`
    : 'no date agreed yet';

/** How many lines the story has — a sheet draws nothing when it is none. */
export function storyLength(stepId: string, tt: TT): number {
  const st = storyOf(stepId, tt.tests, tt.items);
  return st.moves.length + st.found.length + st.fixes.length;
}

/** DELETE A PROBLEM — and with the last one on a stage, the "Hit a problem"
 *  it put there. Rowland, 6 October: "delete problem is there but doesn't
 *  delete ... I'm trapped in a loop." The problem went; the stage went on
 *  saying "Hit a problem", red on the plan and the dashboard, so it looked as
 *  if nothing had happened. A stage marked by a problem and left with none is
 *  put back to planned; a test's verdict is its own and is left alone. One
 *  Undo puts back both. Used by the stage story and the Fixes page. */
export async function removeProblem(tt: Pick<TT, 'tests' | 'items' | 'patchTest'>, id: string): Promise<void> {
  const item = tt.items.find(i => i.id === id);
  if (!item) return;
  const step = tt.tests.find(t => t.id === item.testId && !t.deletedAt);
  /* WHAT STILL HOLDS THE STAGE AT "HIT A PROBLEM": another problem that is
     open. Rowland, 7 October: "I removed the problem — it shouldn't say
     problem." A reason the dates were changed (a move with no problem of its
     own) and a problem already said sorted kept the stage red after the last
     open problem was deleted. */
  const others = tt.items.filter(i => !i.deletedAt && i.id !== id && i.testId === item.testId && i.kind === 'found'
    && i.doneAt == null && !(i.movedFrom && i.movedTo && !i.hoursLost && !i.critical && !i.risk && !i.becameTestId));
  const putBack = !!step && step.kind === 'install' && step.outcome === 'failed' && others.length === 0;
  const restore = await deleteTestItem(id);
  if (putBack && step) await tt.patchTest(step.id, { outcome: 'planned', ranOn: undefined });
  offerUndo(`Deleted “${item.what}”${putBack && step ? ` — ${step.title} back to planned` : ''}`, async () => {
    await restore();
    if (putBack && step) await tt.patchTest(step.id, { outcome: step.outcome, ranOn: step.ranOn });
  });
}

export function StageStory({ stepId, tt, can, projectId, empty, onOpenFix, onOpenProblem }: {
  stepId: string; tt: Pick<TT, 'tests' | 'items' | 'saveItem' | 'removeItem' | 'patchTest' | 'patchItem'>; can: Can; projectId: string;
  /** What to say when nothing has happened; nothing at all when left out. */
  empty?: string;
  /** Where "Open the fix ›" goes. Inside the drawer it shows the fix in the
   *  same drawer (ui/RecordDrawer); left out, it opens the drawer over the page. */
  onOpenFix?: (id: string) => void;
  /** ONE DOOR (docs/DOORS.md): a problem here opens as itself — its words,
   *  what it cost, its flag, its fix, Edit — in the same drawer. It was edited
   *  inline here by a second form, three screens down the stage. */
  onOpenProblem?: (id: string) => void;
}) {
  const [viewing, setViewing] = useState<MediaRef | null>(null);
  const st = storyOf(stepId, tt.tests, tt.items);
  /* HOURS LOST, added up (lib/hoursLost): each problem says what it cost, a
     push made from hours says which hours made the day, and the stage says
     what is banked towards the next one. */
  const day = dayLength(useProjects().projects.find(p => p.id === projectId));
  const tally = hoursTally(stepId, tt.items, day);

  /* NOTHING HERE IS LOCKED. Rowland: "everything must be editable, nothing
     locked in." Every reason can be reworded or taken off — taking a move off
     leaves the dates where they are and stops drawing it as an overrun — and
     Undo puts it back. */
  const itemOf = (id: string) => tt.items.find(i => i.id === id);
  /* The part of the plan a problem was written on (ui/StageParts), by name. */
  const partOf = (id: string) => {
    const it = itemOf(id), from = it?.fromItemId;
    if (!it || !from) return undefined;
    const p = tt.items.find(i => i.id === from && i.kind === 'next' && !i.deletedAt);
    if (p) return p.what;
    /* …or the product on a performance run it was written on (lib/programRun). */
    const t = tt.tests.find(x => x.id === it.testId);
    const run = t ? productRuns(t).find(r => r.id === from) : undefined;
    return run ? productName(run) : undefined;
  };
  const openProblem = (id: string) => (onOpenProblem ? onOpenProblem(id) : openRecord(projectId, id));
  /* OPEN OR SORTED — a problem with no fix stays open until somebody says it
     is sorted, whether or not the stage is done (lib/noted), and is listed
     on the Fixes page until then. Rowland: "I don't want that problem just
     to disappear." */
  const noFix = (id: string) => { const it = itemOf(id); return !!it && !(it.becameTestId && fixOf(it.becameTestId)); };
  const stateOf = (id: string) => {
    const it = itemOf(id);
    if (!it || !noFix(id)) return null;
    return it.doneAt != null
      ? <span className="sp-state is-sorted"> · sorted {niceDay(isoOfMs(it.doneAt))}</span>
      : <span className="sp-state is-open"> · open</span>;
  };
  /* A CRITICAL PROBLEM reads as one: the solid red tag, and under its words
     what it means for the business and the ways round it (lib/critical). */
  const critOf = (id: string) => {
    const it = itemOf(id);
    if (!it?.critical && !it?.risk) return null;
    const risk = !it.critical;
    const sorted = it.doneAt != null || (!!it.becameTestId && fixOf(it.becameTestId)?.outcome === 'passed');
    return <div className={'crit-on-stage' + (risk ? ' is-risk' : '') + (sorted ? ' is-sorted' : '')}><CriticalTag sorted={sorted} risk={risk} /><CriticalStory impact={it.impact} ways={it.ways} couldLose={it.couldLose} risk={risk} /></div>;
  };
  const pics = (media: MediaRef[]) => media.length > 0 &&
    <span className="sp-ev">{media.map(x => <EvidenceThumb key={x.id} media={x} size={64} onClick={() => setViewing(x)} />)}</span>;
  const fixNode = (f: Test, under: boolean) => (
    <span className={under ? 'sp-fix' : undefined}>
      <span className={'sp-k is-fix' + (f.outcome === 'passed' ? ' is-done' : !f.plannedFor ? ' is-open' : '')}>Fix</span>
      <button type="button" className="sp-door" onClick={() => (onOpenFix ? onOpenFix(f.id) : openRecord(projectId, f.id))}>
        <span className="sp-t"><b>{f.title}</b> · {fixWord(f)}{f.withWhom ? ` · ${f.withWhom}` : ''}</span></button>
      {pics(f.media ?? [])}
    </span>
  );
  const fixOf = (id?: string) => (id ? st.fixes.find(f => f.id === id) : undefined);
  const carried = new Set([...st.moves, ...st.found].map(x => x.fixId).filter((x): x is string => !!x && !!fixOf(x)));

  /* In the order written within a day: the push a problem tipped comes after
     the problems that added up to it. */
  type Line = { on: string; key: string; node: React.ReactNode; at?: number };
  const lines: Line[] = [
    ...st.moves.map(m => ({ on: m.on, key: m.id, at: itemOf(m.id)?.createdAt, node: (
      <>
        <span className="sp-k is-move">Moved</span>
        <p className="sp-t"><b>{niceDay(m.from)} → {niceDay(m.to)}</b> · +{m.days} day{m.days === 1 ? '' : 's'}</p>
        <button type="button" className="sp-door" onClick={() => openProblem(m.id)}><span className="sp-why">{m.why}{stateOf(m.id)}</span></button>{critOf(m.id)}
        {tally.pushes.has(m.id) && <p className="sp-hours">{partsWord(tally.pushes.get(m.id) ?? [])} — {m.days === 1 ? 'a full day' : `${m.days} full days`}</p>}
        {pics(m.media)}
        {fixOf(m.fixId) && fixNode(fixOf(m.fixId) as Test, true)}
      </>
    ) })),
    ...st.found.map(f => ({ on: f.on, key: f.id, at: itemOf(f.id)?.createdAt, node: (
      <>
        <span className="sp-k is-found">Found</span>
        <button type="button" className="sp-door" onClick={() => openProblem(f.id)}><span className="sp-why">{partOf(f.id) && <span className="sp-part">On {partOf(f.id)}: </span>}{f.what}{itemOf(f.id)?.hoursLost ? <span className="sp-lost"> · {hoursWord(itemOf(f.id)?.hoursLost ?? 0)} lost</span> : null}{stateOf(f.id)}</span></button>{critOf(f.id)}
        {pics(f.media)}
        {fixOf(f.fixId) && fixNode(fixOf(f.fixId) as Test, true)}
      </>
    ) })),
    ...st.fixes.filter(f => !carried.has(f.id)).map(f => ({ on: isoOfMs(f.createdAt), key: f.id, at: f.createdAt, node: fixNode(f, false) })),
  ].sort((a, b) => a.on.localeCompare(b.on) || (a.at ?? 0) - (b.at ?? 0));

  if (!lines.length) return empty ? <p className="sub">{empty}</p> : null;
  return (
    <>
      {tally.hours > 0 && (
        <p className="sp-tally">
          <b>{hoursWord(tally.hours)} lost</b> here to problems
          {tally.pushedDays ? ` · pushed the finish ${tally.pushedDays} day${tally.pushedDays === 1 ? '' : 's'}` : ''}
          {tally.banked > 0 ? ` · ${hoursWord(tally.banked)} towards the next day (${daysWord(tally.banked, day)})` : ''}
          <span className="sub"> · a day here is {hoursWord(day)}</span>
        </p>
      )}
      <ol className="sp-list">
        {lines.map(l => <li key={l.key}><span className="sp-on">{niceDay(l.on, { weekday: 'short' })}</span><div className="sp-body">{l.node}</div></li>)}
      </ol>
      {/* A picture here is pointed at here (ui/Evidence): the marks go back on
          the problem, move or fix it belongs to. */}
      {viewing && <EvidenceViewer media={viewing} onClose={() => setViewing(null)}
        onPins={can.edit ? pinsOnJob(tt, viewing.id) : undefined} />}
    </>
  );
}

