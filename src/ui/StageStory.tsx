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
import { useState } from 'react';
import type { MediaRef } from '../types';
import type { Test, TestItem } from '../lib/testing';
import { storyOf } from '../lib/story';
import { niceDay } from '../lib/weeks';
import { openRecord } from './RecordDrawer';
import { EvidenceThumb, EvidenceViewer, pinsOnJob, withPins } from './Evidence';
import { Evidence } from './EvidenceDoors';
import { offerUndo } from './Undo';
import { BetterWords } from './BetterWords';
import { deleteTestItem } from '../db';
import type { useTesting } from '../lib/useTesting';
import type { Can } from '../lib/access';
import { useProjects } from '../lib/useProjects';
import { dayLength, daysWord, hoursTally, hoursWord, partsWord } from '../lib/hoursLost';
import { CriticalFields, CriticalStory, CriticalTag, criticalDraftOf, criticalPatch } from './CriticalFields';

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

export function StageStory({ stepId, tt, can, projectId, empty, onOpenFix }: {
  stepId: string; tt: Pick<TT, 'tests' | 'items' | 'saveItem' | 'removeItem' | 'patchTest' | 'patchItem'>; can: Can; projectId: string;
  /** What to say when nothing has happened; nothing at all when left out. */
  empty?: string;
  /** Where "Open the fix ›" goes. Inside the drawer it shows the fix in the
   *  same drawer (ui/RecordDrawer); left out, it opens the drawer over the page. */
  onOpenFix?: (id: string) => void;
}) {
  const [viewing, setViewing] = useState<MediaRef | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
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
  const editor = (id: string) => {
    const it = itemOf(id);
    return it ? <ProblemEdit item={it} tt={tt} can={can} onDone={() => setEditing(null)} /> : null;
  };
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
  const entryActs = (id: string, text: string) => can.edit && (
    <span className="sp-row-acts">
      {noFix(id) && (() => {
        const it = itemOf(id) as TestItem;
        const sorted = it.doneAt != null;
        return <button type="button" className="cw-link" onClick={() => {
          void tt.saveItem({ ...it, doneAt: sorted ? undefined : Date.now() });
          offerUndo(sorted ? 'Open again' : 'Sorted', () => tt.saveItem(it));
        }}>{sorted ? 'Open again' : 'Sorted'}</button>;
      })()}
      <button type="button" className="cw-link" onClick={() => setEditing(id)}>Edit</button>
      {/* CRITICAL (lib/critical): one tap to say so, the story written in the
          same editor. */}
      {/* FLAG IT — high risk or critical, chosen in the same editor. */}
      {!itemOf(id)?.critical && !itemOf(id)?.risk && <button type="button" className="cw-link" onClick={() => setEditing(id)}>Flag it</button>}
      {can.remove && <button type="button" className="cw-link sp-rm" onClick={() => void removeProblem(tt, id)} title={`Delete “${text}”`}>Delete</button>}
    </span>
  );
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
      <p className="sp-t"><b>{f.title}</b> · {fixWord(f)}{f.withWhom ? ` · ${f.withWhom}` : ''}</p>
      {pics(f.media ?? [])}
      <button type="button" className="cw-link" onClick={() => (onOpenFix ? onOpenFix(f.id) : openRecord(projectId, f.id))}>Open the fix ›</button>
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
        {editing === m.id ? editor(m.id) : <><p className="sp-why">{m.why}{stateOf(m.id)}</p>{critOf(m.id)}</>}
        {tally.pushes.has(m.id) && <p className="sp-hours">{partsWord(tally.pushes.get(m.id) ?? [])} — {m.days === 1 ? 'a full day' : `${m.days} full days`}</p>}
        {pics(m.media)}
        {editing !== m.id && entryActs(m.id, m.why)}
        {fixOf(m.fixId) && fixNode(fixOf(m.fixId) as Test, true)}
      </>
    ) })),
    ...st.found.map(f => ({ on: f.on, key: f.id, at: itemOf(f.id)?.createdAt, node: (
      <>
        <span className="sp-k is-found">Found</span>
        {editing === f.id ? editor(f.id) : <><p className="sp-why">{f.what}{itemOf(f.id)?.hoursLost ? <span className="sp-lost"> · {hoursWord(itemOf(f.id)?.hoursLost ?? 0)} lost</span> : null}{stateOf(f.id)}</p>{critOf(f.id)}</>}
        {pics(f.media)}
        {editing !== f.id && entryActs(f.id, f.what)}
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

/** A SAVED PROBLEM, OPENED AGAIN — its words, its hours and its pictures.
 *  Rowland, 6 October: "I could edit the problem once saved." The stage's
 *  story and the fix it booked (ui/RecordDrawer) both open this one editor,
 *  so a picture added from the fix is the one the stage shows and the
 *  client report prints (lib/clientReport fixRow reads the item). The days
 *  it moved are not here: they are the stage's, changed with "Change dates
 *  or who". Save is one write, and Undo puts the whole item back. */
export function ProblemEdit({ item, tt, can, onDone }: {
  item: TestItem; tt: Pick<TT, 'tests' | 'saveItem' | 'patchTest'>; can: Can; onDone: () => void;
}) {
  const [what, setWhat] = useState(item.what);
  /* Critical, high risk or neither — picked in the editor ("Flag it"). */
  const [crit, setCrit] = useState(() => criticalDraftOf(item));
  const [hours, setHours] = useState(item.hoursLost ? String(item.hoursLost) : '');
  const [media, setMedia] = useState<MediaRef[]>(item.media ?? []);
  const [viewing, setViewing] = useState<MediaRef | null>(null);
  /* Hours on a push are the hours that made the day; a push written as days
     has none to add. A problem can always say what it cost. */
  const showHours = !!item.hoursLost || !item.movedFrom;
  const save = () => {
    const h = Number(hours.replace(',', '.'));
    /* Critical, its story and its ways: replaced whole by what the boxes say. */
    const { critical: _c, impact: _i, ways: _w, risk: _r, couldLose: _l, ...rest } = item;
    void _c; void _i; void _w; void _r; void _l;
    const next: TestItem = { ...rest, what: what.trim() || item.what, media, ...criticalPatch(crit) };
    if (showHours) {
      if (h > 0) next.hoursLost = h;
      else if (!hours.trim()) delete next.hoursLost;
    }
    /* The pictures compared whole: a mark added, moved or reworded on one
       (ui/Evidence) is a change, as a picture added is. */
    const same = next.what === item.what && next.hoursLost === item.hoursLost
      && JSON.stringify(media) === JSON.stringify(item.media ?? [])
      && !!next.critical === !!item.critical && !!next.risk === !!item.risk && next.couldLose === item.couldLose
      && (next.impact ?? '') === (item.impact ?? '')
      && JSON.stringify(next.ways ?? []) === JSON.stringify(item.ways ?? []);
    if (!same) {
      /* THE FIX IT BOOKED keeps a copy of these words: its name when nobody
         gave it one, and "The problem" its card and the client report print
         (lib/testing nextFrom). A copy still matching the old words moves with
         them, so the paper says what the screen says. "The problem" on a fix
         is what was agreed, so only the owner moves that one (lib/access). */
      const fix = item.becameTestId ? tt.tests.find(t => t.id === item.becameTestId) : undefined;
      const was = item.what.trim();
      const fixPatch: Partial<Test> = {};
      if (fix && next.what !== item.what) {
        if (fix.title.trim() === was) fixPatch.title = next.what;
        if (can.agree && (fix.passesIf ?? '').trim() === was) fixPatch.passesIf = next.what;
      }
      const fixed = fix && Object.keys(fixPatch).length > 0;
      void tt.saveItem(next);
      if (fix && fixed) void tt.patchTest(fix.id, fixPatch);
      offerUndo('Problem changed', async () => {
        await tt.saveItem(item);
        if (fix && fixed) await tt.patchTest(fix.id, { title: fix.title, passesIf: fix.passesIf });
      });
    }
    onDone();
  };
  return (
    <span className="sp-edit">
      <textarea className="text-area" rows={2} value={what} onChange={e => setWhat(e.target.value)} autoFocus aria-label="What happened" />
      <BetterWords text={what} field="problem" onUse={setWhat} />
      {showHours && (
        <label className="cw-f sp-edit-h"><span>Hours lost</span>
          <input inputMode="decimal" value={hours} onChange={e => setHours(e.target.value)} placeholder="none" /></label>
      )}
      {/* NOT REALITY YET. Rowland, 7 October: "I have 100 hours lost, but
          it's a possible assumption." One tap moves them to "could cost" —
          an estimate, never counted as lost — and flags it a high risk. */}
      {showHours && Number(hours.replace(',', '.')) > 0 && (
        <button type="button" className="cw-link sp-edit-est" onClick={() => {
          setCrit(c => ({ ...c, could: hours, risk: c.critical ? false : true }));
          setHours('');
        }}>These hours are an estimate — move them to “could cost”</button>
      )}
      <Evidence media={media} kind="found" onView={setViewing} onAdd={async refs => { setMedia(m => [...m, ...refs]); }} />
      <CriticalFields value={crit} onChange={setCrit} />
      <span className="sp-edit-acts">
        <button type="button" className="btn btn-primary btn-sm" onClick={save}>Save</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>Cancel</button>
      </span>
      {viewing && <EvidenceViewer media={viewing} onClose={() => setViewing(null)}
        onPins={pins => setMedia(m => withPins(m, viewing.id, pins))}
        onRemove={() => { setMedia(m => m.filter(x => x.id !== viewing.id)); setViewing(null); }} />}
    </span>
  );
}
