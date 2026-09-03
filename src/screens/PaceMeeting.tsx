/* THE MEETING — run by name, one person at a time.
 *
 * The meeting goes round the table: a name, their open actions, talk it
 * through, next name. So picking a name REPLACES what is on screen rather than
 * folding one section among many — with forty actions, a list that merely
 * re-styles itself is still forty actions to look past.
 *
 * The roster comes from the workbook's own Lists sheet, so it includes people
 * with nothing open this week. "Nothing from you" is a real answer at a
 * stand-up, and it can only be given if the person is there to be asked.
 * Anyone owning an action but missing from Lists is added, so nobody's work is
 * hidden by a list that was never updated. */
import { useEffect, useMemo, useState } from 'react';
import type { PaceAction } from '../lib/projectPaceData';
import type { PaceRoster } from '../lib/paceWorkbook';

const isDone = (a: PaceAction) => /^done$/i.test(a.status.trim());
const isOverdue = (a: PaceAction) => /overdue/i.test(a.flag ?? '') && !isDone(a);
const isDueSoon = (a: PaceAction) => /due soon/i.test(a.flag ?? '') && !isDone(a);
const ownerOf = (a: PaceAction) => (a.owner ?? '').trim() || 'Unassigned';

const ALL = '__all__';

export interface Person {
  name: string;
  actions: PaceAction[];
  open: number;
  overdue: number;
  dueSoon: number;
  done: number;
}

/** The roster, in the order the meeting should run: most overdue first, then
 *  most open work. People with nothing open fall to the end but stay visible. */
export function buildRoster(actions: PaceAction[], roster?: PaceRoster): Person[] {
  const names = new Set<string>(roster?.owners ?? []);
  for (const a of actions) names.add(ownerOf(a));

  const people: Person[] = [...names].map(name => {
    const mine = actions.filter(a => ownerOf(a) === name);
    return {
      name,
      actions: mine,
      open: mine.filter(a => !isDone(a)).length,
      overdue: mine.filter(isOverdue).length,
      dueSoon: mine.filter(isDueSoon).length,
      done: mine.filter(isDone).length,
    };
  });

  return people.sort((x, y) =>
    (x.name === 'Unassigned' ? 1 : 0) - (y.name === 'Unassigned' ? 1 : 0)
    || (y.open > 0 ? 1 : 0) - (x.open > 0 ? 1 : 0)
    || y.overdue - x.overdue
    || y.open - x.open
    || x.name.localeCompare(y.name));
}

function ActionCard({ a }: { a: PaceAction }) {
  const tone = isDone(a) ? 'done' : isOverdue(a) ? 'over' : isDueSoon(a) ? 'soon' : 'track';
  return (
    <article className={'pm-card is-' + tone}>
      <header className="pm-card-top">
        <span className="pm-flag">{a.flag || a.status}</span>
        <span className="pm-line">{a.line}</span>
        <span className="pm-cat">{a.category}</span>
        {a.due && <span className="pm-due">due {a.due}</span>}
        <span className="pm-ref">{a.ref}</span>
      </header>
      {a.problem && <p className="pm-problem">{a.problem}</p>}
      {a.action && <p className="pm-do"><b>Action</b> {a.action}</p>}
      <footer className="pm-card-foot">
        <span className="pm-status">{a.status}</span>
        {a.who && <span>{a.who}</span>}
        <span>Priority {a.priority}</span>
      </footer>
    </article>
  );
}

export function PaceMeeting({ actions, roster }: { actions: PaceAction[]; roster?: PaceRoster }) {
  // "Open" here means not-yet-closed — what the meeting is for.
  const [status, setStatus] = useState<'open' | 'overdue' | 'done' | 'all'>('open');
  const [line, setLine] = useState('All');
  const [who, setWho] = useState<string>(ALL);

  const lines = useMemo(
    () => ['All', ...Array.from(new Set(actions.map(a => a.line).filter(Boolean)))],
    [actions]);

  // Line first: the roster's counts must describe what picking a name will show.
  const inScope = useMemo(
    () => actions.filter(a => line === 'All' || a.line === line),
    [actions, line]);

  const people = useMemo(() => buildRoster(inScope, roster), [inScope, roster]);

  // A name that has nothing left after a filter change would otherwise strand
  // the view on an empty screen.
  useEffect(() => {
    if (who !== ALL && !people.some(p => p.name === who)) setWho(ALL);
  }, [people, who]);

  const matchesStatus = (a: PaceAction) =>
    status === 'all' ? true
      : status === 'open' ? !isDone(a)
      : status === 'overdue' ? isOverdue(a)
      : isDone(a);

  const selected = who === ALL ? null : people.find(p => p.name === who) ?? null;
  const shown = (selected ? selected.actions : inScope)
    .filter(matchesStatus)
    .sort((a, b) =>
      (isOverdue(b) ? 1 : 0) - (isOverdue(a) ? 1 : 0)
      || (isDone(a) ? 1 : 0) - (isDone(b) ? 1 : 0)
      || (a.priority || 3) - (b.priority || 3));

  const idx = selected ? people.findIndex(p => p.name === selected.name) : -1;
  const go = (d: number) => {
    if (!people.length) return;
    const n = idx < 0 ? (d > 0 ? 0 : people.length - 1) : (idx + d + people.length) % people.length;
    setWho(people[n].name);
  };

  const STATUSES: { id: typeof status; label: string }[] = [
    { id: 'open', label: 'Open' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'done', label: 'Done' },
    { id: 'all', label: 'All' },
  ];

  return (
    <div className="pm">
      {/* who is on, and what counts as "on" */}
      <div className="pm-controls">
        <div className="pm-ctl">
          <span className="pm-ctl-lbl">Show</span>
          <div className="pace-filter-grp">
            {STATUSES.map(s => (
              <button key={s.id} className={'pace-fbtn' + (status === s.id ? ' on' : '')}
                onClick={() => setStatus(s.id)}>{s.label}</button>
            ))}
          </div>
        </div>
        {lines.length > 2 && (
          <div className="pm-ctl">
            <span className="pm-ctl-lbl">Line</span>
            <div className="pace-filter-grp">
              {lines.map(l => (
                <button key={l} className={'pace-fbtn' + (line === l ? ' on' : '')}
                  onClick={() => setLine(l)}>{l}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* the roster — the meeting's running order */}
      <div className="pm-roster" role="tablist" aria-label="Owners">
        <button role="tab" aria-selected={who === ALL}
          className={'pm-person is-all' + (who === ALL ? ' on' : '')}
          onClick={() => setWho(ALL)}>
          <span className="pm-person-name">Everyone</span>
          <span className="pm-person-counts">{inScope.filter(a => !isDone(a)).length} open</span>
        </button>
        {people.map(p => (
          <button key={p.name} role="tab" aria-selected={who === p.name}
            className={'pm-person' + (who === p.name ? ' on' : '') + (p.open === 0 ? ' is-clear' : '')}
            onClick={() => setWho(p.name)}>
            <span className="pm-person-name">{p.name}</span>
            <span className="pm-person-counts">
              {p.open === 0
                ? <span className="pm-clear">nothing open</span>
                : <>
                    {p.overdue > 0 && <span className="pm-pip is-over">{p.overdue} overdue</span>}
                    <span className="pm-pip">{p.open} open</span>
                  </>}
            </span>
          </button>
        ))}
      </div>

      {/* whoever is on the floor */}
      <div className="pm-stage">
        <div className="pm-stage-head">
          <h3 className="pm-stage-name">{selected ? selected.name : 'Everyone'}</h3>
          <p className="pm-stage-sub">
            {shown.length} {status === 'all' ? 'action' : status} action{shown.length === 1 ? '' : 's'}
            {selected && selected.done > 0 && status !== 'done' && status !== 'all' && ` · ${selected.done} closed`}
          </p>
          <div className="pm-nav">
            <button className="pace-fbtn" onClick={() => go(-1)} disabled={!people.length}>‹ Previous</button>
            <button className="pace-fbtn" onClick={() => go(1)} disabled={!people.length}>Next person ›</button>
          </div>
        </div>

        {shown.length === 0 ? (
          <p className="pm-nothing">
            {selected
              ? `Nothing ${status === 'all' ? '' : status} for ${selected.name}${line === 'All' ? '' : ' on ' + line}.`
              : 'Nothing matches those filters.'}
          </p>
        ) : (
          <div className="pm-cards">
            {shown.map((a, i) => <ActionCard key={a.ref + '#' + i} a={a} />)}
          </div>
        )}
      </div>
    </div>
  );
}
