/* MEETING NOTES — what to raise at the next meeting, written beforehand.
 *
 * Rowland: "a notes taker … so I can write in preparation for a meeting so I
 * don't forget what I want to talk about. Allow my notes to be associated to
 * either a step or the entire project."
 *
 * A note is a test item of kind 'note' (lib/testing): on a step, test or fix,
 * or on the whole job (testId ''). The same notes show on each step's own page
 * under "For the meeting". Ticked once raised. Private preparation — the
 * client report and every other document leave them out. */
import { useState } from 'react';
import { nav } from '../state/useRoute';
import { useProjects } from '../lib/useProjects';
import { useTesting } from '../lib/useTesting';
import { live, WHOLE_JOB, type Asset, type Test, type TestItem } from '../lib/testing';
import {
  NOTE_GATES, decodeScope, encodeScope, gateOfRecord, parentScope, recordsUnder, scopeLabel, scopeRank, type NoteScope,
} from '../lib/noteScope';
import { Crumbs } from '../ui/Crumbs';

const TICK = '✓';

/** Where each gate lives, the same paths the tabs go to. */
const GATE_PATH: Record<string, string> = {
  install: 'install', setup: 'set-up', commission: 'testing', handover: 'handover', fixes: 'fixes', materials: 'materials',
};

type TT = ReturnType<typeof useTesting>;
/** What a picker needs to say what a note can be about. */
type Job = { tests: Test[]; assets: Asset[] };

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
        <optgroup label="A gate">
          {NOTE_GATES.map(g => <option key={g.id} value={encodeScope({ kind: 'gate', gate: g.id })}>{g.label}</option>)}
        </optgroup>
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

/** One note: tick it once raised; tap the words to change them, or what the
 *  note is about. */
function Row({ n, tt, job }: { n: TestItem; tt: TT; job: Job }) {
  const done = n.doneAt != null;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(n.what);
  const [about, setAbout] = useState(n.testId);
  const open = () => { setText(n.what); setAbout(n.testId); setEditing(true); };
  const save = () => {
    const v = text.trim();
    if (v && (v !== n.what || about !== n.testId)) void tt.saveItem({ ...n, what: v, testId: about });
    setEditing(false);
  };
  return (
    <div className={'nt-row' + (done ? ' is-done' : '')}>
      <button className={'tw-tick' + (done ? ' is-on' : '')} aria-label={done ? 'Not raised yet' : 'Raised'}
        onClick={() => void tt.saveItem({ ...n, doneAt: done ? undefined : Date.now() })}>{done ? TICK : null}</button>
      {editing ? (
        <div className="nt-edit">
          <textarea className="text-area" rows={2} autoFocus value={text} aria-label="Note"
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save(); }
              if (e.key === 'Escape') setEditing(false);
            }} />
          <label className="nt-about"><span>About</span>
            <AboutPicker value={about} onChange={setAbout} job={job} /></label>
          <span className="nt-edit-acts">
            <button className="btn btn-primary btn-sm" onClick={save} disabled={!text.trim()}>Save</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
          </span>
        </div>
      ) : (
        <button className="nt-what" onClick={open} title="Tap to edit">{n.what}</button>
      )}
      <button className="nt-x" aria-label="Delete this note" onClick={() => void tt.removeItem(n.id)}>×</button>
    </div>
  );
}

export function NotesScreen({ projectId }: { projectId: string }) {
  const { projects, loading } = useProjects();
  const project = projects.find(p => p.id === projectId);
  const tt = useTesting(projectId);
  const [what, setWhat] = useState('');
  const [about, setAbout] = useState<string>(WHOLE_JOB);
  const [showRaised, setShowRaised] = useState(false);
  const [copied, setCopied] = useState(false);

  if (loading || tt.loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  if (!project) return <div className="wrap pace"><p className="sub" style={{ marginTop: 24 }}>That project isn’t here any more.</p></div>;

  const job: Job = { tests: tt.tests, assets: tt.assets };
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
    await tt.addItem(about, 'note', what);
    setWhat('');
  };
  const copy = () => {
    const text = [`${project.name} — to raise`, '',
      ...groups.flatMap(g => [words(g.scope), ...g.notes.map(n => `• ${n.what}`), ''])].join('\n');
    void navigator.clipboard?.writeText(text).then(() => setCopied(true), () => setCopied(false));
  };

  return (
    <div className="wrap pace nt">
      <Crumbs trail={[
        { label: 'Projects', to: '/projects' },
        { label: project.name, to: `/project/${projectId}` },
        { label: 'Meeting notes' },
      ]} />
      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pace-eyebrow">{project.name}</p>
          <h1 className="pace-title">Meeting notes</h1>
          <p className="pace-lede">What you want to raise at the next meeting — about the whole project, a gate, a machine, or one step. Tick each one once it has been talked about.</p>
        </div>
        <div className="pace-head-actions">
          {open.length > 0 && <button className="btn btn-ghost" onClick={copy}>{copied ? 'Copied' : 'Copy as a list'}</button>}
        </div>
      </header>

      <form className="nt-add" onSubmit={e => { e.preventDefault(); void add(); }}>
        <textarea className="text-area" rows={2} value={what} autoFocus placeholder="What do you want to raise?"
          onChange={e => setWhat(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void add(); } }} />
        <div className="nt-add-row">
          <label className="nt-about"><span>About</span>
            <AboutPicker value={about} onChange={setAbout} job={job} />
          </label>
          <button className="btn btn-primary" type="submit" disabled={!what.trim()}>Add note</button>
        </div>
      </form>

      {open.length === 0 && <p className="sub" style={{ marginTop: 14 }}>Nothing to raise yet.</p>}
      {groups.map(g => {
        const link = g.scope.kind === 'record' ? `/project/${projectId}/testing/${encodeURIComponent(g.scope.testId)}`
          : g.scope.kind === 'gate' ? GATE_PATH[g.scope.gate] ? `/project/${projectId}/${GATE_PATH[g.scope.gate]}` : undefined
            : undefined;
        return (
          <section key={g.key || 'job'} className="nt-group">
            <h3 className="nt-group-h">
              {link ? <button className="cw-link" onClick={() => nav(link)}>{words(g.scope)} ›</button> : words(g.scope)}
            </h3>
            {g.notes.map(n => <Row key={n.id} n={n} tt={tt} job={job} />)}
          </section>
        );
      })}

      {raised.length > 0 && (
        <section className="nt-group is-raised">
          <button className="nt-group-h nt-toggle" onClick={() => setShowRaised(v => !v)} aria-expanded={showRaised}>
            Raised · {raised.length} {showRaised ? '▴' : '▾'}
          </button>
          {showRaised && raised.map(n => (
            <div key={n.id}>
              <span className="nt-about-sm">{words(scopeOf(n))}</span>
              <Row n={n} tt={tt} job={job} />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
