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
import { GATE_WORD } from '../lib/install';
import { gateOf, live, WHOLE_JOB, type Test, type TestItem } from '../lib/testing';
import { Crumbs } from '../ui/Crumbs';

const TICK = '✓';

/** What a note is about, in words: "Install · Guarding fitted — Pick and place". */
function aboutWords(t: Test | undefined, machine: (id?: string) => string | undefined): string {
  if (!t) return 'The whole project';
  const face = t.kind === 'fix' ? 'Fix' : t.kind === 'install' ? GATE_WORD[gateOf(t)] : 'Test';
  const m = machine(t.assetId);
  return `${face} · ${t.title}${m ? ` — ${m}` : ''}`;
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

  const tests = live(tt.tests);
  const machine = (id?: string) => tt.assets.find(a => a.id === id)?.name;
  const byId = new Map(tests.map(t => [t.id, t]));
  const notes = live(tt.items).filter(i => i.kind === 'note').sort((a, b) => a.createdAt - b.createdAt);
  const open = notes.filter(n => n.doneAt == null);
  const raised = notes.filter(n => n.doneAt != null);

  /* Grouped by what they are about: the whole project first, then each step
     in the order its first note was written. */
  const groups: { key: string; notes: TestItem[] }[] = [];
  for (const n of open) {
    const key = n.testId && byId.has(n.testId) ? n.testId : WHOLE_JOB;
    let g = groups.find(x => x.key === key);
    if (!g) { g = { key, notes: [] }; groups.push(g); }
    g.notes.push(n);
  }
  groups.sort((a, b) => (a.key === WHOLE_JOB ? -1 : b.key === WHOLE_JOB ? 1 : 0));

  const add = async () => {
    if (!what.trim()) return;
    await tt.addItem(about, 'note', what);
    setWhat('');
  };
  const copy = () => {
    const text = [`${project.name} — to raise`, '',
      ...groups.flatMap(g => [aboutWords(byId.get(g.key), machine), ...g.notes.map(n => `• ${n.what}`), ''])].join('\n');
    void navigator.clipboard?.writeText(text).then(() => setCopied(true), () => setCopied(false));
  };

  const pick = (kind: Test['kind'] | 'step', gate?: string) => tests.filter(t =>
    kind === 'step' ? t.kind === 'install' && gateOf(t) === gate : (t.kind ?? 'test') === kind);
  const optgroups: { label: string; rows: Test[] }[] = [
    { label: 'Install steps', rows: pick('step', 'install') },
    { label: 'Set-up steps', rows: pick('step', 'setup') },
    { label: 'Tests', rows: pick('test') },
    { label: 'Fixes', rows: pick('fix') },
    { label: 'Hand-over items', rows: pick('step', 'handover') },
  ].filter(g => g.rows.length > 0);

  const Row = ({ n }: { n: TestItem }) => {
    const done = n.doneAt != null;
    return (
      <div className={'nt-row' + (done ? ' is-done' : '')}>
        <button className={'tw-tick' + (done ? ' is-on' : '')} aria-label={done ? 'Not raised yet' : 'Raised'}
          onClick={() => void tt.saveItem({ ...n, doneAt: done ? undefined : Date.now() })}>{done ? TICK : null}</button>
        <span className="nt-what">{n.what}</span>
        <button className="nt-x" aria-label="Delete this note" onClick={() => void tt.removeItem(n.id)}>×</button>
      </div>
    );
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
          <p className="pace-lede">What you want to raise at the next meeting — about the whole project, or about one step. Tick each one once it has been talked about.</p>
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
            <select value={about} onChange={e => setAbout(e.target.value)}>
              <option value={WHOLE_JOB}>The whole project</option>
              {optgroups.map(g => (
                <optgroup key={g.label} label={g.label}>
                  {g.rows.map(t => <option key={t.id} value={t.id}>{t.title}{machine(t.assetId) ? ` — ${machine(t.assetId)}` : ''}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
          <button className="btn btn-primary" type="submit" disabled={!what.trim()}>Add note</button>
        </div>
      </form>

      {open.length === 0 && <p className="sub" style={{ marginTop: 14 }}>Nothing to raise yet.</p>}
      {groups.map(g => {
        const t = byId.get(g.key);
        return (
          <section key={g.key || 'job'} className="nt-group">
            <h3 className="nt-group-h">
              {t ? <button className="cw-link" onClick={() => nav(`/project/${projectId}/testing/${encodeURIComponent(t.id)}`)}>{aboutWords(t, machine)} ›</button>
                : aboutWords(undefined, machine)}
            </h3>
            {g.notes.map(n => <Row key={n.id} n={n} />)}
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
              <span className="nt-about-sm">{aboutWords(byId.get(n.testId), machine)}</span>
              <Row n={n} />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
