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
import type { Test } from '../lib/testing';
import { storyOf } from '../lib/story';
import { niceDay } from '../lib/weeks';
import { openRecord } from './RecordDrawer';
import { EvidenceThumb, EvidenceViewer } from './Evidence';
import { offerUndo } from './Undo';
import type { useTesting } from '../lib/useTesting';
import type { Can } from '../lib/access';
import { useProjects } from '../lib/useProjects';
import { dayLength, daysWord, hoursTally, hoursWord, partsWord } from '../lib/hoursLost';

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

export function StageStory({ stepId, tt, can, projectId, empty, onOpenFix }: {
  stepId: string; tt: Pick<TT, 'tests' | 'items' | 'saveItem' | 'removeItem'>; can: Can; projectId: string;
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
  const editor = (id: string, text: string) => (
    <span className="sp-edit">
      <textarea className="text-area" rows={2} defaultValue={text} autoFocus id={`sp-e-${id}`} aria-label="What happened" />
      {itemOf(id)?.hoursLost && (
        <label className="cw-f sp-edit-h"><span>Hours lost</span>
          <input inputMode="decimal" defaultValue={String(itemOf(id)?.hoursLost)} id={`sp-eh-${id}`} /></label>
      )}
      <span className="sp-edit-acts">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => {
          const v = (document.getElementById(`sp-e-${id}`) as HTMLTextAreaElement | null)?.value.trim();
          const hText = (document.getElementById(`sp-eh-${id}`) as HTMLInputElement | null)?.value;
          const h = hText === undefined ? undefined : Number(hText.replace(',', '.'));
          const it = itemOf(id);
          const what = v || it?.what;
          const hoursLost = h !== undefined && h > 0 ? h : it?.hoursLost;
          if (it && what && (what !== it.what || hoursLost !== it.hoursLost)) {
            void tt.saveItem({ ...it, what, ...(hoursLost ? { hoursLost } : {}) });
            offerUndo('Changed', () => tt.saveItem(it));
          }
          setEditing(null);
        }}>Save</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
      </span>
    </span>
  );
  const entryActs = (id: string, text: string) => can.edit && (
    <span className="sp-row-acts">
      <button type="button" className="cw-link" onClick={() => setEditing(id)}>Edit</button>
      {can.remove && <button type="button" className="cw-link sp-rm" onClick={() => void tt.removeItem(id)} title={`Remove “${text}”`}>Remove</button>}
    </span>
  );
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
        {editing === m.id ? editor(m.id, m.why) : <p className="sp-why">{m.why}</p>}
        {tally.pushes.has(m.id) && <p className="sp-hours">{partsWord(tally.pushes.get(m.id) ?? [])} — {m.days === 1 ? 'a full day' : `${m.days} full days`}</p>}
        {pics(m.media)}
        {editing !== m.id && entryActs(m.id, m.why)}
        {fixOf(m.fixId) && fixNode(fixOf(m.fixId) as Test, true)}
      </>
    ) })),
    ...st.found.map(f => ({ on: f.on, key: f.id, at: itemOf(f.id)?.createdAt, node: (
      <>
        <span className="sp-k is-found">Found</span>
        {editing === f.id ? editor(f.id, f.what) : <p className="sp-why">{f.what}{itemOf(f.id)?.hoursLost ? <span className="sp-lost"> · {hoursWord(itemOf(f.id)?.hoursLost ?? 0)} lost</span> : null}</p>}
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
      {viewing && <EvidenceViewer media={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}
