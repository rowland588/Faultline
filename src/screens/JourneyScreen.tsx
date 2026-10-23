/* THE JOURNEY — the project between two dates, day by day (docs/JOURNEY.md, J2).
 *
 * Rowland, 23 October: "we all report to someone and they need to see what
 * we have done and what we are doing next"; "pick a range of reporting
 * period ... from this date to that date ... the entire history ... it's the
 * journey. It's all of it."
 *
 * The range is picked at the top — this week, this week and next, last week,
 * since the start, or two dates — and slid by its own length; it rides on the
 * address (?from=&to=), so a range can be sent as a link. Under it: the tiles
 * (done · still to do · late · planned), the tools we will use (a tick a tool,
 * what for, when — a plan is an action with a `tool`, lib/journey toolPlansOf),
 * then the days in order, each with what happened or what is due on it (every
 * line a record's own, opening it where it is kept) and Rowland's commentary
 * for the day (a note on the day, lib/noteScope `day:`), written and edited
 * in place. Nothing is stored for the range; everything here is read by
 * lib/journey, which the paper prints too (J3). */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useProject } from '../lib/useProjects';
import { useJourney, type JourneyRead } from '../lib/useJourney';
import {
  RANGE_PICKS, daysOf, journeyClosing, journeyOf, journeyTiles, pickOf, rangeLabel, rangeOf, slideRange, toolPlansOf,
  type Journey, type JourneyLine, type Range, type RangePick, type ToolPlan,
} from '../lib/journey';
import { APP_TOOLS, toolByKey } from '../catalogue/registry';
import { isStudyTool } from '../lib/study';
import { encodeScope } from '../lib/noteScope';
import { niceDay, todayISO } from '../lib/weeks';
import { uid, now } from '../lib/ids';
import { deleteTestItem, patchTestItem, putPaceTodo, putTestItem, type PaceTodoRow } from '../db';
import type { TestItem } from '../lib/testing';
import { useAccess } from '../cloud/access';
import { nav, navReplace, useRoute } from '../state/useRoute';
import { LeanClosing, LeanTiles } from '../ui/Lean';
import { PageHeader } from '../ui/parts';
import { openRecord } from '../ui/RecordDrawer';
import { ActionSheet, removeActionWithUndo, type Editing } from '../ui/ActionSheet';
import { offerUndo } from '../ui/Undo';
import { Icon } from '../ui/Icon';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** The range the address asks for, when it does. */
function askedRange(q: URLSearchParams): Range | undefined {
  const from = q.get('from') ?? '', to = q.get('to') ?? '';
  return ISO.test(from) && ISO.test(to) ? (from <= to ? { from, to } : { from: to, to: from }) : undefined;
}

export function JourneyScreen({ projectId }: { projectId: string }) {
  const { project, loading } = useProject(projectId);
  const read = useJourney(project);
  if (loading || (project && !read)) return <p className="sub wrap">Reading the project’s journey…</p>;
  if (!project || !read) return <p className="sub wrap">That project is not on this device.</p>;
  return <JourneyPage projectId={projectId} name={project.name} read={read} />;
}

function JourneyPage({ projectId, name, read }: { projectId: string; name: string; read: JourneyRead }) {
  const route = useRoute();
  const can = useAccess(projectId);
  const { today, started } = read;
  const [range, setRange] = useState<Range>(() => askedRange(route.query) ?? rangeOf('thisAndNext', today, started));
  const [dates, setDates] = useState<Partial<Range>>({});
  const pick = pickOf(range, today, started);
  const [picking, setPicking] = useState(pick === 'dates');
  /* THE RANGE RIDES ON THE ADDRESS (?from=&to=): a range picked here is written to it, so it can be
     sent as a link; a link to another range opened while this page is up is followed. `written` is
     the last range this page put on the address, so the two cannot chase each other. */
  const askedFrom = route.query.get('from') ?? '', askedTo = route.query.get('to') ?? '';
  const written = useRef(range);
  useEffect(() => {
    const asked = askedRange(new URLSearchParams({ from: askedFrom, to: askedTo }));
    const differs = (r: Range) => r.from !== range.from || r.to !== range.to;
    if (asked && differs(asked) && (asked.from !== written.current.from || asked.to !== written.current.to)) {
      written.current = asked; setPicking(false); setRange(asked); return;
    }
    if (askedFrom === range.from && askedTo === range.to) return;
    written.current = range;
    const q = new URLSearchParams(route.query);
    q.set('from', range.from); q.set('to', range.to);
    navReplace(`/project/${projectId}/journey?${q.toString()}`);
  }, [range, projectId, route.query, askedFrom, askedTo]);
  const choose = (p: RangePick) => {
    if (p === 'dates') { setPicking(true); setDates({ from: range.from, to: range.to }); return; }
    setPicking(false);
    setRange(rangeOf(p, today, started));
  };
  const chooseDates = (d: Partial<Range>) => {
    const next = { ...dates, ...d };
    setDates(next);
    if (ISO.test(next.from ?? '') && ISO.test(next.to ?? '')) setRange(rangeOf('dates', today, started, next));
  };

  const j: Journey = useMemo(() => journeyOf(read.input, range, today), [read, range, today]);
  const closing = journeyClosing(j, name, today);
  const plans = useMemo(() => toolPlansOf(read.steps), [read.steps]);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [every, setEvery] = useState(false);

  /* a day of the range with nothing on it is skipped — except today, where the commentary is written */
  const days = useMemo(() => {
    if (today < range.from || today > range.to || j.days.some(d => d.date === today)) return j.days;
    const out = [...j.days, { date: today, label: niceDay(today, { weekday: 'short' }), lines: [], commentary: [], past: false, today: true }];
    return out.sort((a, b) => a.date.localeCompare(b.date));
  }, [j, range, today]);

  const plan = (date: string) => {
    if (!can.edit) return;
    const t = now();
    setEditing({ isNew: true, step: { id: uid(), projectId, what: '', where: '', why: '', who: '', when: '', state: 'todo', due: date, createdAt: t, updatedAt: t } });
  };
  const open = (l: JourneyLine) => {
    if (l.snagId) { nav(`/snags?open=${encodeURIComponent(l.snagId)}`); return; }
    if (l.stepId) { const s = read.steps.find(x => x.id === l.stepId); if (s) setEditing({ isNew: false, step: s }); return; }
    if (l.href) { nav(l.href); return; }
    if (l.id) { openRecord(projectId, l.id); return; }
    if (l.go) nav(`/project/${projectId}/${l.go}`);
  };

  return (
    <div className="wrap jn">
      <PageHeader
        eyebrow={<span className="pl-eyebrow">THE JOURNEY · WHAT WE DID, WHAT WE ARE DOING NEXT</span>}
        title="Journey"
        says={<span className="sub">Between two dates, day by day: what got done, what did not go to plan, what is due, and your own commentary — every line read from the records. Pick the range; the page follows it.</span>}
        {...(can.edit ? { primary: { label: 'Plan something', run: () => plan(today > range.to ? range.to : today < range.from ? range.from : today) } } : {})}
      >
        <div className="jn-range">
          <div className="chip-row" role="group" aria-label="Range">
            {RANGE_PICKS.map(p => (
              <button key={p.id} type="button" className={'chip' + ((picking ? p.id === 'dates' : pick === p.id) ? ' on' : '')}
                aria-pressed={picking ? p.id === 'dates' : pick === p.id} onClick={() => choose(p.id)}>{p.label}</button>
            ))}
          </div>
          {picking && (
            <div className="jn-dates">
              <label className="cw-f"><span>FROM</span><input type="date" aria-label="From" value={dates.from ?? ''} onChange={e => chooseDates({ from: e.target.value })} /></label>
              <label className="cw-f"><span>TO</span><input type="date" aria-label="To" value={dates.to ?? ''} onChange={e => chooseDates({ to: e.target.value })} /></label>
            </div>
          )}
          <p className="jn-range-l">
            <button type="button" className="btn btn-sm" aria-label="Earlier" onClick={() => { setPicking(false); setRange(slideRange(range, -1)); }}>‹</button>
            <b className="jn-range-t">{rangeLabel(range, today)}</b>
            <button type="button" className="btn btn-sm" aria-label="Later" onClick={() => { setPicking(false); setRange(slideRange(range, 1)); }}>›</button>
            <span className="sub">{daysOf(range).length} days · {j.days.length} with something on them</span>
          </p>
        </div>
      </PageHeader>

      <LeanTiles tiles={journeyTiles(j, today)} className="jn-tiles" />

      {/* THE TOOLS WE WILL USE — a tick a tool, what for, when; a plan is an action with a tool */}
      <section className={'jn-tools' + (every ? ' is-all' : '')} aria-label="The tools we will use">
        <div className="qsl-gh">
          <h2>The tools we will use</h2>
          <span className="sub">{plans.length ? `${plans.length} of ${APP_TOOLS.length} ticked` : 'none ticked yet — tick the tools this project will use, and say what for'}</span>
          <button type="button" className="cw-link jn-every" onClick={() => setEvery(x => !x)}>{every ? 'Only the ticked' : `Every tool (${APP_TOOLS.length})`}</button>
        </div>
        <ul className="jn-tool-list">
          {APP_TOOLS.map(t => {
            const p = plans.find(x => x.tool === t.key);
            const reads = toolByKey(t.key)?.reads;
            const used = isStudyTool(reads) ? read.studies.filter(s => !s.deletedAt && s.tool === reads).length : 0;
            return <ToolRow key={t.key} label={t.label} says={t.says} plan={p} used={used} edit={can.edit}
              onTick={async on => {
                if (!can.edit) return;
                if (on) { const ts = now(); await putPaceTodo({ id: uid(), projectId, what: '', where: '', why: '', who: '', when: '', state: 'todo', tool: t.key, createdAt: ts, updatedAt: ts }); }
                else if (p) await removeActionWithUndo(p.step);
              }}
              onChange={async patch => { if (p) await putPaceTodo({ ...p.step, ...patch }); }}
              onOpen={() => { if (p) setEditing({ isNew: false, step: p.step }); }} />;
          })}
        </ul>
      </section>

      {/* THE DAYS, IN ORDER */}
      {!days.length && <p className="qsl-empty">Nothing recorded between these dates{j.skipped ? ` — ${j.skipped} days, nothing on any of them` : ''}.</p>}
      {days.map(d => (
        <section key={d.date} className={'jn-day' + (d.today ? ' is-today' : d.past ? ' is-past' : ' is-ahead')} data-date={d.date} aria-label={d.label}>
          <div className="qsl-gh">
            <h2>{d.label}{d.today && <span className="jn-today"> · today</span>}</h2>
            <span className="sub">{d.lines.length ? `${d.lines.length} ${d.past ? 'recorded' : d.today ? 'today' : 'due'}` : d.today ? 'nothing logged yet today' : ''}</span>
            {!d.past && can.edit && <button type="button" className="cw-link jn-plan" onClick={() => plan(d.date)}>+ Plan something for this day</button>}
          </div>
          {d.lines.length > 0 && (
            <ul className="lt-rows">
              {d.lines.map((l, i) => (
                <li key={i} className={'lt-li jn-li is-' + l.tone}>
                  <button type="button" className="lt-row" onClick={() => open(l)}>
                    <b className="lt-what">{l.text}</b>
                    {(l.kind || l.detail) && <span className="lt-says">{[l.kind, l.detail].filter(Boolean).join(' · ')}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Commentary projectId={projectId} date={d.date} notes={d.commentary} edit={can.edit} remove={can.remove} />
        </section>
      ))}
      {days.length > 0 && j.skipped > 0 && <p className="sub jn-skipped">{j.skipped} {j.skipped === 1 ? 'day' : 'days'} with nothing recorded, not shown.</p>}

      <LeanClosing closing={closing} />
      {editing && <ActionSheet editing={editing} lines={read.lines} onClose={() => setEditing(null)} />}
    </div>
  );
}

/** ONE TOOL ON THE TICK LIST — ticked, its words and its day are edited in place; it opens as the action it is. */
function ToolRow({ label, says, plan, used, edit, onTick, onChange, onOpen }: {
  label: string; says: string; plan?: ToolPlan; used: number; edit: boolean;
  onTick: (on: boolean) => Promise<void>; onChange: (patch: Partial<PaceTodoRow>) => Promise<void>; onOpen: () => void;
}) {
  const [what, setWhat] = useState(plan?.what ?? '');
  useEffect(() => { setWhat(plan?.what ?? ''); }, [plan?.what]);
  /* the tick answers at once; the record follows (the plan is written, and read back, a moment later) */
  const [on, setOn] = useState(!!plan);
  useEffect(() => { setOn(!!plan); }, [plan]);
  return (
    <li className={'jn-tool' + (plan ? ' is-on' : ' is-off') + (plan?.done ? ' is-done' : '')}>
      <label className="jn-tool-tick">
        <input type="checkbox" aria-label={`Use ${label}`} checked={on} disabled={!edit} onChange={e => { setOn(e.target.checked); void onTick(e.target.checked); }} />
        <b>{label}</b>
      </label>
      {plan ? (
        <span className="jn-tool-plan">
          <input className="jn-tool-what" aria-label={`What ${label} is for`} placeholder="What for — e.g. the Bagger's seal weights" value={what} disabled={!edit}
            onChange={e => setWhat(e.target.value)} onBlur={() => { if (what.trim() !== (plan.what ?? '')) void onChange({ what: what.trim() }); }}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
          <input type="date" className="jn-tool-when" aria-label={`When ${label} is planned`} value={plan.due ?? ''} disabled={!edit} onChange={e => void onChange({ due: e.target.value || undefined })} />
          <button type="button" className="cw-link" onClick={onOpen}>{plan.done ? `Done${plan.doneOn ? ` ${niceDay(plan.doneOn)}` : ''}` : plan.who ? plan.who : 'Who ›'}</button>
        </span>
      ) : <span className="sub jn-tool-says">{says}</span>}
      {used > 0 && <span className="jn-tool-used">{used} {used === 1 ? 'record' : 'records'} so far</span>}
    </li>
  );
}

/** THE COMMENTARY FOR A DAY — Rowland's own words, a note on the day; written, edited and deleted in place, with Undo. */
function Commentary({ projectId, date, notes, edit, remove }: { projectId: string; date: string; notes: TestItem[]; edit: boolean; remove: boolean }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const add = async () => {
    const what = text.trim();
    if (!what) return;
    const t = now();
    await putTestItem({ id: uid(), projectId, testId: encodeScope({ kind: 'day', date }), kind: 'note', what, sort: t, createdAt: t, updatedAt: t });
    setText(''); setAdding(false);
  };
  const save = async (n: TestItem) => {
    const what = draft.trim();
    if (what && what !== n.what) await patchTestItem(n.id, { what });
    setEditingId(null);
  };
  const del = async (n: TestItem) => {
    const restore = await deleteTestItem(n.id);
    offerUndo(`Deleted the commentary for ${niceDay(date)}`, restore);
  };
  if (!notes.length && !edit) return null;
  return (
    <div className="jn-notes">
      {notes.map(n => (
        <div key={n.id} className="jn-note">
          <span className="jn-note-k">COMMENTARY</span>
          {editingId === n.id ? (
            <form className="jn-note-edit" onSubmit={e => { e.preventDefault(); void save(n); }}>
              <textarea className="text-area" rows={3} value={draft} autoFocus aria-label="The commentary" onChange={e => setDraft(e.target.value)} />
              <div className="jn-note-acts">
                <button type="button" className="btn btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={!draft.trim()}>Save</button>
              </div>
            </form>
          ) : (
            <p className="jn-note-t">
              {n.what}
              {edit && <button type="button" className="cw-link jn-note-ed" aria-label="Edit this commentary" onClick={() => { setEditingId(n.id); setDraft(n.what); }}>Edit</button>}
              {remove && <button type="button" className="nt-x" aria-label="Delete this commentary" onClick={() => void del(n)}><Icon name="close" size="0.85em" /></button>}
            </p>
          )}
        </div>
      ))}
      {edit && !adding && <button type="button" className="cw-link jn-note-add" onClick={() => setAdding(true)}>{notes.length ? '+ More commentary' : '+ Commentary for this day'}</button>}
      {edit && adding && (
        <form className="jn-note-edit" onSubmit={e => { e.preventDefault(); void add(); }}>
          <textarea className="text-area" rows={3} value={text} autoFocus aria-label={`Commentary for ${niceDay(date, { weekday: 'short' })}`}
            placeholder="In your own words — what this day meant for the project" onChange={e => setText(e.target.value)} />
          <div className="jn-note-acts">
            <button type="button" className="btn btn-sm" onClick={() => { setAdding(false); setText(''); }}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={!text.trim()}>Save</button>
          </div>
        </form>
      )}
    </div>
  );
}

/** THIS WEEK AND NEXT, ON THE PROJECT'S FRONT PAGE — one line read by lib/journey, opening the journey on that range. */
export function ThisWeekLine({ projectId, project }: { projectId: string; project: Parameters<typeof useJourney>[0] }) {
  const read = useJourney(project);
  const today = todayISO();
  if (!read) return null;
  const range = rangeOf('thisAndNext', today, read.started);
  const j = journeyOf(read.input, range, today);
  const c = j.counts;
  return (
    <p className="sub jn-week">
      <b>This week and next</b> · {c.done} done · {c.toDo ? <>{c.toDo} still to do{c.late ? <> (<span className="in-late">{c.late} late</span>)</> : null}</> : 'nothing still to do'} · {c.planned} planned
      {' · '}<button type="button" className="cw-link" onClick={() => nav(`/project/${projectId}/journey?from=${range.from}&to=${range.to}`)}>Open the journey ›</button>
    </p>
  );
}
