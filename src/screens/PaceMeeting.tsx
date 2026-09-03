/* THE MEETING LENS — the tracker arranged the way the meeting is actually run:
 * owner by owner, each person reporting their own workload.
 *
 * So an owner is a section you open and close. One person's work is on screen
 * at a time; everything else is folded away. Closed actions are hidden by
 * default — the meeting is about what is still live — and are one click back.
 *
 * The order is deliberate: whoever carries the most overdue work comes first,
 * because that is the conversation the meeting exists to have. */
import { useMemo, useState } from 'react';
import type { PaceAction } from '../lib/projectPaceData';

const isDone = (a: PaceAction) => /^done$/i.test(a.status.trim());
const isOverdue = (a: PaceAction) => /overdue/i.test(a.flag ?? '');
const isDueSoon = (a: PaceAction) => /due soon/i.test(a.flag ?? '');

export interface OwnerGroup {
  owner: string;
  all: PaceAction[];
  live: PaceAction[];
  overdue: number;
  dueSoon: number;
  done: number;
}

export function groupByOwner(actions: PaceAction[]): OwnerGroup[] {
  const by = new Map<string, PaceAction[]>();
  for (const a of actions) {
    const o = (a.owner ?? '').trim() || 'Unassigned';
    by.set(o, [...(by.get(o) ?? []), a]);
  }
  const groups: OwnerGroup[] = [...by].map(([owner, all]) => ({
    owner,
    all,
    live: all.filter(a => !isDone(a)),
    overdue: all.filter(a => isOverdue(a) && !isDone(a)).length,
    dueSoon: all.filter(a => isDueSoon(a) && !isDone(a)).length,
    done: all.filter(isDone).length,
  }));
  // most overdue first, then most live work, then alphabetical; Unassigned last
  return groups.sort((x, y) =>
    (x.owner === 'Unassigned' ? 1 : 0) - (y.owner === 'Unassigned' ? 1 : 0)
    || y.overdue - x.overdue
    || y.live.length - x.live.length
    || x.owner.localeCompare(y.owner));
}

function Count({ n, kind, label }: { n: number; kind: string; label: string }) {
  if (n === 0) return null;
  return <span className={'rt-count is-' + kind}>{n} <span>{label}</span></span>;
}

function ActionRow({ a }: { a: PaceAction }) {
  const [open, setOpen] = useState(false);
  const tone = isDone(a) ? 'done' : isOverdue(a) ? 'over' : isDueSoon(a) ? 'soon' : 'track';
  return (
    <li className={'rt-action is-' + tone}>
      <button className="rt-action-head" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="rt-caret" aria-hidden>{open ? '▾' : '▸'}</span>
        <span className="rt-what">{a.problem || a.action || a.category}</span>
        <span className="rt-tags">
          <span className="rt-line">{a.line}</span>
          {a.due && <span className="rt-due">{a.due}</span>}
          <span className={'rt-flag is-' + tone}>{a.flag || a.status}</span>
        </span>
      </button>
      {open && (
        <div className="rt-detail">
          {a.action && <p><b>Action</b> {a.action}</p>}
          <p className="rt-meta">
            <span>{a.ref}</span>
            <span>P{a.priority}</span>
            <span>{a.category}</span>
            {a.who && <span>{a.who}</span>}
            <span>{a.status}</span>
          </p>
        </div>
      )}
    </li>
  );
}

function OwnerSection({ g, showDone, openDefault }: {
  g: OwnerGroup; showDone: boolean; openDefault: boolean;
}) {
  const [open, setOpen] = useState(openDefault);
  const shown = showDone ? g.all : g.live;
  const ranked = [...shown].sort((a, b) =>
    (isOverdue(b) ? 1 : 0) - (isOverdue(a) ? 1 : 0)
    || (isDone(a) ? 1 : 0) - (isDone(b) ? 1 : 0)
    || (a.priority || 3) - (b.priority || 3));

  return (
    <section className={'rt-owner' + (open ? ' is-open' : '')}>
      <button className="rt-owner-head" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="rt-caret" aria-hidden>{open ? '▾' : '▸'}</span>
        <span className="rt-owner-name">{g.owner}</span>
        <span className="rt-counts">
          <Count n={g.overdue} kind="over" label="overdue" />
          <Count n={g.dueSoon} kind="soon" label="due soon" />
          <Count n={g.live.length - g.overdue - g.dueSoon} kind="track" label="on track" />
          <Count n={g.done} kind="done" label="done" />
        </span>
      </button>
      {open && (
        shown.length === 0
          ? <p className="rt-empty">Nothing live — {g.done} closed.</p>
          : <ul className="rt-actions">{ranked.map((a, i) => <ActionRow key={a.ref + '#' + i} a={a} />)}</ul>
      )}
    </section>
  );
}

export function PaceMeeting({ actions }: { actions: PaceAction[] }) {
  const [showDone, setShowDone] = useState(false);
  const [line, setLine] = useState('All');
  const [overdueOnly, setOverdueOnly] = useState(false);
  // `epoch` remounts the sections, which is how Collapse/Expand all reaches
  // state that lives inside each one.
  const [epoch, setEpoch] = useState(0);
  const [allOpen, setAllOpen] = useState(false);

  const lines = useMemo(() => ['All', ...Array.from(new Set(actions.map(a => a.line)))], [actions]);

  const filtered = actions.filter(a =>
    (line === 'All' || a.line === line) && (!overdueOnly || (isOverdue(a) && !isDone(a))));
  const groups = groupByOwner(filtered).filter(g => (showDone ? g.all.length : g.live.length) > 0);

  const totalLive = filtered.filter(a => !isDone(a)).length;
  const totalOver = filtered.filter(a => isOverdue(a) && !isDone(a)).length;

  const setAll = (v: boolean) => { setAllOpen(v); setEpoch(e => e + 1); };

  return (
    <div className="rt">
      <div className="rt-bar">
        <div className="rt-bar-stats">
          <b>{groups.length}</b> owners · <b>{totalLive}</b> live
          {totalOver > 0 && <> · <b className="is-over">{totalOver}</b> overdue</>}
        </div>
        <div className="rt-bar-controls">
          <div className="pace-filter-grp">
            {lines.map(l => (
              <button key={l} className={'pace-fbtn' + (line === l ? ' on' : '')} onClick={() => setLine(l)}>{l}</button>
            ))}
          </div>
          <button className={'pace-fbtn' + (overdueOnly ? ' on' : '')} onClick={() => setOverdueOnly(v => !v)}>
            Overdue only
          </button>
          <button className={'pace-fbtn' + (showDone ? ' on' : '')} onClick={() => setShowDone(v => !v)}>
            {showDone ? 'Showing done' : 'Done hidden'}
          </button>
          <button className="pace-fbtn" onClick={() => setAll(true)}>Expand all</button>
          <button className="pace-fbtn" onClick={() => setAll(false)}>Collapse all</button>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="pace-none">Nothing matches that filter.</p>
      ) : (
        <div className="rt-owners">
          {groups.map(g => (
            <OwnerSection key={g.owner + epoch} g={g} showDone={showDone} openDefault={allOpen} />
          ))}
        </div>
      )}
    </div>
  );
}
