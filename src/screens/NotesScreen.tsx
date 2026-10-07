/* NOTES — what to raise at the next meeting, written beforehand. Called
 * "Meeting notes" until Rowland, 6 October: "'Meeting notes' is now named
 * 'Notes'."
 *
 * Rowland: "a notes taker … so I can write in preparation for a meeting so I
 * don't forget what I want to talk about. Allow my notes to be associated to
 * either a step or the entire project."
 *
 * A note is a test item of kind 'note' (lib/testing): on a step, test or fix,
 * or on the whole job (testId ''). The same notes show on each step's own page
 * under "For the meeting". Ticked once raised. Private preparation — the
 * client report and every other document leave them out. */
import { AddFold } from '../ui/AddFold';
import { useState } from 'react';
import { BetterWords } from '../ui/BetterWords';
import { nav } from '../state/useRoute';
import { openRecord } from '../ui/RecordDrawer';
import { useProjects } from '../lib/useProjects';
import { planModel } from '../lib/planModel';
import { planCount, planFor } from '../lib/huddle';
import { useTesting } from '../lib/useTesting';
import { live, WHOLE_JOB, type Asset, type Test, type TestItem } from '../lib/testing';
import {
  NOTE_GATES, decodeScope, encodeScope, gateOfRecord, parentScope, recordsUnder, scopeLabel, scopeRank, type NoteScope,
} from '../lib/noteScope';
import { offerUndo } from '../ui/Undo';
import { remindersOf, remindWords } from '../lib/reminders';
import { niceDay, todayISO } from '../lib/weeks';
import { ReminderPermission } from '../ui/Reminders';
import { Icon } from '../ui/Icon';
import { AccessNote } from '../ui/AccessNote';
import { useAccess } from '../cloud/access';
import type { Can } from '../lib/access';

/** Where each gate lives, the same paths the tabs go to. */
const GATE_PATH: Record<string, string> = {
  install: 'install', setup: 'set-up', commission: 'testing', handover: 'handover', fixes: 'fixes', materials: 'materials',
};

type TT = ReturnType<typeof useTesting>;
/** What a picker needs to say what a note can be about. */
type Job = { tests: Test[]; assets: Asset[]; gates: boolean };
/* THE GATES ARE A STAGE-GATE JOB'S. A 3P job's notes offered Install, Set up,
   Commission, Hand over and Fixes to be "about" — gates it does not have, the
   same leak Materials had — and a note filed under one linked to a screen the
   job does not run. On a 3P or tree job a note is about the whole project
   (or a machine, where it has any), and with nothing else to choose the box
   is not drawn at all. */
const pickable = (job: Job) => job.gates || job.assets.some(a => !a.deletedAt);

/* "Yesterday · Fri, 2 Oct" → "yesterday · Fri, 2 Oct" — the whole line
   lowercased read "fri, 2 oct". */
const lowerFirst = (w: string) => w.charAt(0).toLowerCase() + w.slice(1);
const daysFrom = (iso: string) => Math.round((Date.parse(`${iso}T12:00:00Z`) - Date.parse(`${todayISO()}T12:00:00Z`)) / 86_400_000);

/** WHAT A NOTE IS ABOUT, in two steps that mirror the job's own tabs. The first
 *  box is the whole project, then Install · Set up · Commission · Hand over ·
 *  Fixes · Materials — every one of them, whether or not anything has been
 *  planned there yet — then each machine. The second box appears when there is
 *  something finer to point at: one step, test or fix, grouped under the machine
 *  (or the gate) it belongs to and in the order the job runs. Left on "anything
 *  in it", the note is about the whole gate or the whole machine. */
function AboutPicker({ value, onChange, job }: { value: string; onChange: (v: string) => void; job: Job }) {
  const scope = decodeScope(value, job.tests, job.assets);
  /* The first box remembers what was chosen, rather than recomputing it from the
     value: a record picked under a machine belongs to a gate too, and the box
     must not jump from the machine to the gate under the person's hand. */
  const [first, setFirst] = useState<string>(() => encodeScope(parentScope(scope, job.tests)));
  const firstScope = decodeScope(first, job.tests, job.assets);
  const records = recordsUnder(firstScope, job.tests, job.assets);
  const machine = (id?: string) => job.assets.find(a => a.id === id)?.name;
  /* Grouped under the machine for a gate, under the gate for a machine. */
  const groups: { label: string; rows: Test[] }[] = [];
  for (const t of records) {
    const label = firstScope.kind === 'machine'
      ? NOTE_GATES.find(g => g.id === gateOfRecord(t))?.label ?? ''
      : machine(t.assetId) ?? 'The line itself';
    let g = groups.find(x => x.label === label);
    if (!g) { g = { label, rows: [] }; groups.push(g); }
    g.rows.push(t);
  }
  return (
    <span className="nt-pick">
      <select value={first} aria-label="About" onChange={e => { setFirst(e.target.value); onChange(e.target.value); }}>
        <option value={encodeScope({ kind: 'job' })}>The whole project</option>
        {job.gates && (
          <optgroup label="A gate">
            {NOTE_GATES.map(g => <option key={g.id} value={encodeScope({ kind: 'gate', gate: g.id })}>{g.label}</option>)}
          </optgroup>
        )}
        {job.assets.filter(a => !a.deletedAt).length > 0 && (
          <optgroup label="A machine">
            {job.assets.filter(a => !a.deletedAt).map(a => <option key={a.id} value={encodeScope({ kind: 'machine', assetId: a.id })}>{a.name}</option>)}
          </optgroup>
        )}
      </select>
      {records.length > 0 && (
        <select value={scope.kind === 'record' ? value : ''} aria-label="Which one"
          onChange={e => onChange(e.target.value || first)}>
          <option value="">Anything in {scopeLabel(firstScope, job.tests, job.assets)}</option>
          {groups.map(g => (
            <optgroup key={g.label} label={g.label}>
              {g.rows.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </optgroup>
          ))}
        </select>
      )}
    </span>
  );
}

/** WHEN TO BE REMINDED, AND WHETHER IT GOES ON THE PLAN. Rowland: "put a date
 *  as a reminder on the note itself ... either add it to the Gantt chart, or
 *  just add it as a reminder." Held until Save; Remove takes the reminder off
 *  and leaves the note. */
function ReminderForm({ due, onPlan, onSave, onCancel, onRemove }: {
  due?: string; onPlan?: boolean;
  onSave: (due: string, onPlan: boolean) => void; onCancel?: () => void; onRemove?: () => void;
}) {
  const [day, setDay] = useState(due ?? '');
  const [plan, setPlan] = useState(!!onPlan);
  return (
    <div className="nt-rem-form">
      <label className="cw-f nt-rem-day"><span>Remind me on</span>
        <input type="date" value={day} onChange={e => setDay(e.target.value)} /></label>
      <span className="nt-rem-how" role="radiogroup" aria-label="How">
        <label className={!plan ? 'on' : ''}><input type="radio" checked={!plan} onChange={() => setPlan(false)} /> Just remind me</label>
        <label className={plan ? 'on' : ''}><input type="radio" checked={plan} onChange={() => setPlan(true)} /> Remind me and put it on the plan</label>
      </span>
      <span className="nt-edit-acts">
        <button type="button" className="btn btn-primary btn-sm" disabled={!day} onClick={() => onSave(day, plan)}>Save</button>
        {onRemove && <button type="button" className="btn btn-ghost btn-sm" onClick={onRemove}>Remove reminder</button>}
        {onCancel && <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>}
      </span>
    </div>
  );
}

/** One note: tick it once raised; tap the words to change them, or what the
 *  note is about. A client reads it as it stands; only the owner deletes. */
function Row({ n, tt, job, can }: { n: TestItem; tt: TT; job: Job; can: Can }) {
  const done = n.doneAt != null;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(n.what);
  const [about, setAbout] = useState(n.testId);
  const open = () => { setText(n.what); setAbout(n.testId); setEditing(true); };
  const [reminding, setReminding] = useState(false);
  const setRem = (due: string | undefined, onPlan: boolean, said: string) => {
    const before = { ...n };
    const next: TestItem = { ...n, due, onPlan: due ? onPlan : undefined };
    if (!due) delete next.due;
    if (!next.onPlan) delete next.onPlan;
    void tt.saveItem(next);
    offerUndo(said, () => tt.saveItem(before));
  };
  const save = () => {
    const v = text.trim();
    if (v && (v !== n.what || about !== n.testId)) void tt.saveItem({ ...n, what: v, testId: about });
    setEditing(false);
  };
  return (
    <div className={'nt-row' + (done ? ' is-done' : '')}>
      {can.edit && <button className={'tw-tick' + (done ? ' is-on' : '')} aria-label={done ? 'Not raised yet' : 'Raised'}
        onClick={() => void tt.saveItem({ ...n, doneAt: done ? undefined : Date.now() })}>{done ? <Icon name="check" size="1em" /> : null}</button>}
      {!can.edit ? (
        <div className="nt-main">
          <p className="nt-what" style={{ cursor: 'default' }}>{n.what}</p>
          {n.due && (
            <span className={'nt-rem' + (!done && n.due < todayISO() ? ' is-late' : '') + (!done && n.due === todayISO() ? ' is-today' : '')}>
              <i className="nt-rem-dot" aria-hidden />
              {done ? `Reminder was ${lowerFirst(remindWords({ due: n.due, days: daysFrom(n.due) }))}` : `Reminder · ${remindWords({ due: n.due, days: daysFrom(n.due) })}`}
              {n.onPlan && <span className="nt-rem-plan">on the plan</span>}
            </span>
          )}
        </div>
      ) : editing ? (
        <div className="nt-edit">
          <textarea className="text-area" rows={2} autoFocus value={text} aria-label="Note"
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save(); }
              if (e.key === 'Escape') setEditing(false);
            }} />
          <BetterWords text={text} field="note" onUse={setText} />
          {pickable(job) && <label className="nt-about"><span>About</span>
            <AboutPicker value={about} onChange={setAbout} job={job} /></label>}
          <span className="nt-edit-acts">
            <button className="btn btn-primary btn-sm" onClick={save} disabled={!text.trim()}>Save</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
          </span>
        </div>
      ) : (
        <div className="nt-main">
          <button className="nt-what" onClick={open} title="Tap to edit">{n.what}</button>
          {reminding ? (
            <ReminderForm due={n.due} onPlan={n.onPlan}
              onCancel={() => setReminding(false)}
              onRemove={n.due ? () => { setRem(undefined, false, 'Reminder taken off'); setReminding(false); } : undefined}
              onSave={(d, p) => { setRem(d, p, p ? 'Reminder set — and on the plan' : 'Reminder set'); setReminding(false); }} />
          ) : n.due ? (
            <button className={'nt-rem' + (!done && n.due < todayISO() ? ' is-late' : '') + (!done && n.due === todayISO() ? ' is-today' : '')}
              onClick={() => setReminding(true)} title="Change the reminder">
              <i className="nt-rem-dot" aria-hidden />
              {done ? `Reminder was ${lowerFirst(remindWords({ due: n.due, days: daysFrom(n.due) }))}` : `Reminder · ${remindWords({ due: n.due, days: daysFrom(n.due) })}`}
              {n.onPlan && <span className="nt-rem-plan">on the plan</span>}
            </button>
          ) : !done && (
            <button className="nt-rem-add" onClick={() => setReminding(true)}><Icon name="plus" size="1.15em" /> Remind me</button>
          )}
        </div>
      )}
      {can.remove && <button className="nt-x" aria-label="Delete this note" onClick={() => void tt.removeItem(n.id)}><Icon name="close" size="0.85em" /></button>}
    </div>
  );
}

export function NotesScreen({ projectId }: { projectId: string }) {
  const { projects, loading } = useProjects();
  const project = projects.find(p => p.id === projectId);
  const tt = useTesting(projectId);
  const can = useAccess(projectId);
  const [what, setWhat] = useState('');
  const [about, setAbout] = useState<string>(WHOLE_JOB);
  const [showRaised, setShowRaised] = useState(false);
  const [addRem, setAddRem] = useState(false);
  const [newDue, setNewDue] = useState('');
  const [newPlan, setNewPlan] = useState(false);
  const [copied, setCopied] = useState(false);

  if (loading || tt.loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  /* A link to a project that has gone is a dead end, not a crash — and it
     says where to go, the way the project page and Materials do. It was the
     sentence alone, with nothing on the screen to press. */
  if (!project) {
    return (
      <div className="wrap pace">
        <p className="sub" style={{ marginTop: 24 }}>That project isn’t here any more.</p>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => nav('/')}>Back to the control room</button>
      </div>
    );
  }

  const job: Job = { tests: tt.tests, assets: tt.assets, gates: planModel(project) === 'commissioning' };
  const notes = live(tt.items).filter(i => i.kind === 'note').sort((a, b) => a.createdAt - b.createdAt);
  const open = notes.filter(n => n.doneAt == null);
  const raised = notes.filter(n => n.doneAt != null);

  /* Grouped by what they are about, in the order the job runs: the whole
     project, then Install · Set up · Commission · Hand over · Fixes, then each
     machine, then single steps. */
  const scopeOf = (n: TestItem) => decodeScope(n.testId, tt.tests, tt.assets);
  const groups: { key: string; scope: NoteScope; notes: TestItem[] }[] = [];
  for (const n of open) {
    const sc = scopeOf(n);
    const key = encodeScope(sc);
    let g = groups.find(x => x.key === key);
    if (!g) { g = { key, scope: sc, notes: [] }; groups.push(g); }
    g.notes.push(n);
  }
  groups.sort((a, b) => scopeRank(a.scope, tt.tests, tt.assets) - scopeRank(b.scope, tt.tests, tt.assets));
  const words = (sc: NoteScope) => scopeLabel(sc, tt.tests, tt.assets);

  const add = async () => {
    if (!what.trim()) return;
    await tt.addItem(about, 'note', what, newDue ? { due: newDue, onPlan: newPlan } : undefined);
    setWhat(''); setNewDue(''); setNewPlan(false); setAddRem(false);
  };
  const copy = () => {
    const text = [`${project.name} — to raise`, '',
      ...groups.flatMap(g => [words(g.scope), ...g.notes.map(n => `• ${n.what}${n.due ? `  (remind ${niceDay(n.due, { weekday: 'short' })})` : ''}`), ''])].join('\n');
    void navigator.clipboard?.writeText(text).then(() => setCopied(true), () => setCopied(false));
  };

  return (
    <div className="wrap pace nt">
      <header className="pace-head">
        <div className="pace-head-main">
          <h1 className="pace-title">Notes</h1>
          <p className="pace-lede">{can.edit ? 'What to raise at the next meeting — tick each one once it has been talked about.' : 'What is to be raised at the next meeting.'}</p>
        </div>
        <div className="pace-head-actions">
          {open.length > 0 && <button className="btn btn-ghost" onClick={copy}>{copied ? 'Copied' : 'Copy as a list'}</button>}
        </div>
      </header>
      <AccessNote can={can} owner={project.lead} />
      {/* THE PLAN FOR TODAY sits beside these on The day (lib/huddle): notes
          are what to raise; the plan is what the huddle agreed to do today. */}
      {planModel(project) === 'commissioning' && (() => {
        const plan = planFor(tt.items, todayISO());
        return (
          <p className="sub nt-today">
            <b>The plan for today</b> — {plan.length ? planCount(plan) : can.edit ? 'not agreed yet' : 'none agreed'} ·{' '}
            <button className="cw-link" onClick={() => nav(`/project/${projectId}/day`)}>{plan.length || !can.edit ? 'Open it on The day ›' : 'Agree it on The day ›'}</button>
          </p>
        );
      })()}

      {can.edit && <AddFold label="Add a note" start={open.length === 0}>
      <form className="nt-add" onSubmit={e => { e.preventDefault(); void add(); }}>
        <textarea className="text-area" rows={2} value={what} autoFocus placeholder="What do you want to raise?"
          onChange={e => setWhat(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void add(); } }} />
        <BetterWords text={what} field="note" onUse={setWhat} />
        <div className="nt-add-row">
          {pickable(job) && <label className="nt-about"><span>About</span>
            <AboutPicker value={about} onChange={setAbout} job={job} />
          </label>}
          <button className="btn btn-primary" type="submit" disabled={!what.trim()}>Add note</button>
        </div>
        {/* A reminder, if wanted, set as the note is written. */}
        {addRem ? (
          <div className="nt-rem-new">
            <label className="cw-f nt-rem-day"><span>Remind me on</span>
              <input type="date" value={newDue} onChange={e => setNewDue(e.target.value)} /></label>
            <span className="nt-rem-how" role="radiogroup" aria-label="How">
              <label className={!newPlan ? 'on' : ''}><input type="radio" checked={!newPlan} onChange={() => setNewPlan(false)} /> Just remind me</label>
              <label className={newPlan ? 'on' : ''}><input type="radio" checked={newPlan} onChange={() => setNewPlan(true)} /> Remind me and put it on the plan</label>
            </span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setAddRem(false); setNewDue(''); setNewPlan(false); }}>No reminder</button>
          </div>
        ) : (
          <button type="button" className="nt-rem-add" onClick={() => setAddRem(true)}><Icon name="plus" size="1.15em" /> Remind me about it on a date</button>
        )}
      </form>
      </AddFold>}

      {/* WHAT IS DUE, FIRST. And whether this device will say so on the day. */}
      {(() => {
        const due = remindersOf(notes, todayISO());
        return (
          <section className="nt-rems">
            {due.length > 0 && (
              <p className="nt-rems-h"><i className="nt-rem-dot" aria-hidden /> {due.filter(r => r.days <= 0).length
                ? `${due.filter(r => r.days <= 0).length} reminder${due.filter(r => r.days <= 0).length === 1 ? '' : 's'} today or gone`
                : `${due.length} reminder${due.length === 1 ? '' : 's'} this week`}</p>
            )}
            {can.edit && <ReminderPermission />}
          </section>
        );
      })()}

      {open.length === 0 && <p className="sub" style={{ marginTop: 14 }}>Nothing to raise yet.</p>}
      {groups.map(g => {
        const scope = g.scope;
        const link = scope.kind === 'record' ? undefined
          : g.scope.kind === 'gate' ? GATE_PATH[g.scope.gate] ? `/project/${projectId}/${GATE_PATH[g.scope.gate]}` : undefined
            /* A machine lives on Install — the same door the waiting-on
               table gives it. Its heading was the one that went nowhere. */
            : g.scope.kind === 'machine' ? `/project/${projectId}/install`
              : undefined;
        return (
          <section key={g.key || 'job'} className="nt-group">
            <h3 className="nt-group-h">
              {/* A record's heading opens it in the drawer, over the notes (ui/RecordDrawer). */}
              {scope.kind === 'record'
                ? <button className="cw-link" onClick={() => openRecord(projectId, scope.testId)}>{words(g.scope)} ›</button>
                : link ? <button className="cw-link" onClick={() => nav(link)}>{words(g.scope)} ›</button> : words(g.scope)}
            </h3>
            {g.notes.map(n => <Row key={n.id} n={n} tt={tt} job={job} can={can} />)}
          </section>
        );
      })}

      {raised.length > 0 && (
        <section className="nt-group is-raised">
          <button className="nt-group-h nt-toggle" onClick={() => setShowRaised(v => !v)} aria-expanded={showRaised}>
            Raised · {raised.length} <Icon name={showRaised ? 'chevronUp' : 'chevronDown'} size="1em" />
          </button>
          {showRaised && raised.map(n => (
            <div key={n.id}>
              <span className="nt-about-sm">{words(scopeOf(n))}</span>
              <Row n={n} tt={tt} job={job} can={can} />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
