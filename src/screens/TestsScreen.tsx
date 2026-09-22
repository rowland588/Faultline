/* THE LINE, AND ITS TESTS.
 *
 * One screen, three parts: where we are, what is next, and what has happened.
 * Everything on it is read off the tests — there is no status anywhere in this
 * app to disagree with them.
 *
 * Five rebuilds of this put a different structure in front of the work each
 * time: a readiness checklist, six gates, a programme of phases, one list
 * grouped by stage, an asset × pack grid with material supersession. The job
 * never had any of those. It has a cycle, and this is the list of times round it.
 */
import { useState } from 'react';
import { nav } from '../state/useRoute';
import { AccountMenu } from '../ui/AccountMenu';
import { Crumbs } from '../ui/Crumbs';
import { DraftField } from '../ui/Draft';
import { useProject } from '../lib/useProjects';
import { useTesting } from '../lib/useTesting';
import { updateProject } from '../db';
import {
  ASSET_STATE_WORD, OUTCOME_WORD, isOverdue, itemsOf, weeksTo,
  type Test,
} from '../lib/testing';

const nice = (iso?: string): string => {
  if (!iso) return '—';
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : iso;
};
const loud = (iso?: string): string => {
  if (!iso) return 'NO DATE';
  const t = Date.parse(iso);
  return Number.isFinite(t)
    ? new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()
    : iso;
};

/** The mark at the head of a test: how it went, at a glance, down the left edge. */
function Mark({ t }: { t: Test }) {
  if (t.outcome === 'passed') {
    return (
      <span className="tw-mark is-g" aria-hidden>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2 L5 8.5 L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
    );
  }
  if (t.outcome === 'failed') {
    return (
      <span className="tw-mark is-r" aria-hidden>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M3 3 L9 9 M9 3 L3 9" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
      </span>
    );
  }
  return <span className={'tw-mark is-ring' + (t.outcome === 'notRun' ? ' is-a' : '')} aria-hidden />;
}

export function TestsScreen({ projectId }: { projectId: string }) {
  const { project, loading } = useProject(projectId);
  const tt = useTesting(projectId);
  const [dates, setDates] = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  /* Which machines this test is for. Empty means the line itself. Several means
     several tests — the same stages, one per machine, which is how a line is
     actually worked through. */
  const [on, setOn] = useState<string[]>([]);

  if (loading || tt.loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  if (!project) return <div className="wrap pace"><p className="sub" style={{ marginTop: 24 }}>That project isn’t here any more.</p></div>;

  const st = tt.standing;
  const weeks = weeksTo(project.expectedAt);
  const assetName = (id?: string) => tt.assets.find(a => a.id === id)?.name;

  const counts = (t: Test) => ({
    found: itemsOf(tt.items, t.id, 'found').filter(i => i.doneAt == null).length,
    next: itemsOf(tt.items, t.id, 'next').filter(i => i.doneAt == null).length,
  });

  const open = (id: string) => nav(`/project/${projectId}/testing/${encodeURIComponent(id)}`);

  const plan = () => {
    const clean = title.trim();
    if (!clean) return;
    void (async () => { open(await tt.planTest(clean, on.length ? on : [undefined])); })();
    setTitle(''); setOn([]); setAdding(false);
  };

  const toggle = (id: string) => setOn(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));

  return (
    <div className="wrap pace cm-screen">
      <AccountMenu />
      <Crumbs trail={[
        { label: 'Projects', to: '/projects' },
        { label: project.name, to: `/project/${projectId}` },
        { label: 'Testing' },
      ]} />

      <header className="cm-head">
        <div>
          <h1>{project.name}</h1>
          <p className="cw-handover">
            {project.expectedAt
              ? <><b>Ours by {nice(project.expectedAt)}</b>{weeks != null && <span className="sub">{weeks >= 0 ? `${weeks} week${weeks === 1 ? '' : 's'}` : `${-weeks} week${weeks === -1 ? '' : 's'} ago`}</span>}</>
              : <b>No date set yet</b>}
            {project.lead && <span className="sub">{project.lead} leading</span>}
            <button className="cw-link" onClick={() => setDates(d => !d)}>{dates ? 'Done' : 'Dates'}</button>
          </p>
        </div>
      </header>

      {dates && (
        <div className="cx-dates">
          <label className="cw-f"><span>Planned — never moves</span>
            <input type="date" value={project.plannedAt ?? ''}
              onChange={e => void updateProject({ ...project, plannedAt: e.target.value || undefined, updatedAt: Date.now() })} /></label>
          <label className="cw-f"><span>Now expecting</span>
            <input type="date" value={project.expectedAt ?? ''}
              onChange={e => void updateProject({ ...project, expectedAt: e.target.value || undefined, updatedAt: Date.now() })} /></label>
        </div>
      )}

      {/* WHERE WE ARE. One sentence, composed in lib/testing so this screen and
          the A3 cannot say different things about the same job. */}
      <section className="cx-answer">
        <span className="cmp-h-n">WHERE WE ARE</span>
        <p className="cx-said">{st.sentence}</p>
        {st.total > 0 && (
          <>
            <span className="cx-bar"><span className="cx-bar-in" style={{ width: `${Math.round((st.ran / st.total) * 100)}%` }} /></span>
            <span className="cx-tally">
              {st.ran} of {st.total} run
              {st.passed > 0 && <> · {st.passed} passed</>}
              {st.undecided.length > 0 && <> · <b className="is-w">{st.undecided.length} to decide</b></>}
              {st.openNext.length > 0 && <> · <b className="is-r">{st.openNext.length} to do</b></>}
            </span>
          </>
        )}
      </section>

      {/* NEXT UP. On any given week there is one thing you are about to do, and
          pretending otherwise is how a plan stops being read. */}
      <section className="cmp-sec">
        <div className="cw-sec-h">
          <h2 className="cmp-h">Next up</h2>
          {st.upcoming.length > 1 && <span className="cmp-h-n">{st.upcoming.length} planned</span>}
        </div>
        {st.upcoming.map((t, i) => (
          <button key={t.id} className={'tw-next' + (i === 0 ? ' is-now' : '') + (isOverdue(t) ? ' is-late' : '')} onClick={() => open(t.id)}>
            <span className="tw-next-h">
              <b>{t.title}</b>
              <span className={'tw-when' + (isOverdue(t) ? ' is-late' : '')}>{isOverdue(t) ? 'WAS ' + loud(t.plannedFor) : loud(t.plannedFor)}</span>
            </span>
            <span className="sub">
              {assetName(t.assetId) ?? 'The line'}
              {t.withWhom && ` · with ${t.withWhom}`}
              {t.planned && ` · ${t.planned}`}
            </span>
            {t.passesIf && <span className="tw-passes"><b>Passes if:</b> {t.passesIf}</span>}
          </button>
        ))}

        {adding ? (
          <form className="tw-plan" onSubmit={e => { e.preventDefault(); plan(); }}>
            <input autoFocus placeholder="What do we plan to do?" value={title} onChange={e => setTitle(e.target.value)} />
            {tt.assets.length > 0 && (
              <>
                <span className="tw-plan-l">Which machines? Pick as many as it applies to.</span>
                <span className="tw-chips">
                  {tt.assets.map(a => (
                    <button key={a.id} type="button" className={'tw-chip' + (on.includes(a.id) ? ' on' : '')}
                      aria-pressed={on.includes(a.id)} onClick={() => toggle(a.id)}>
                      {a.name}
                    </button>
                  ))}
                  <button type="button" className={'tw-chip' + (on.length === 0 ? ' on' : '')}
                    aria-pressed={on.length === 0} onClick={() => setOn([])}>
                    The line itself
                  </button>
                </span>
              </>
            )}
            <span className="tw-plan-go">
              <button className="btn" type="submit" disabled={!title.trim()}>
                {on.length > 1 ? `Plan ${on.length} tests` : 'Plan it'}
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => { setAdding(false); setOn([]); }}>Cancel</button>
            </span>
          </form>
        ) : (
          <button className="cw-add" onClick={() => setAdding(true)}>
            <span className="cw-add-p" aria-hidden>+</span> Plan a test
          </button>
        )}
      </section>

      {/* WHAT HAPPENED. Newest first, because a list of past tests reads
          backwards from today. */}
      {st.done.length > 0 && (
        <section className="cmp-sec">
          <div className="cw-sec-h">
            <h2 className="cmp-h">Tests so far</h2>
            <span className="cmp-h-n">{st.done.length}</span>
          </div>
          <div className="cw-list">
            {st.done.map(t => {
              const c = counts(t);
              return (
                <button key={t.id} className={'tw-row is-' + t.outcome} onClick={() => open(t.id)}>
                  <Mark t={t} />
                  <span className="tw-row-m">
                    <b>{t.title}</b>
                    <span className="sub">{nice(t.ranOn ?? t.plannedFor)} · {assetName(t.assetId) ?? 'The line'}{t.product ? ` · ${t.product}` : ''}</span>
                    <span className={'tw-res is-' + t.outcome}>
                      <b>{OUTCOME_WORD[t.outcome]}</b>{t.result ? ` — ${t.result}` : ''}
                    </span>
                    {(c.found > 0 || c.next > 0) && (
                      <span className="sub">
                        {c.found > 0 && <b className="is-r">{c.found} still open</b>}
                        {c.found > 0 && c.next > 0 && ' · '}
                        {c.next > 0 && `${c.next} next step${c.next === 1 ? '' : 's'}`}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* THE MACHINES. A test names one; nothing else about them is stored,
          because what a machine has to prove is whatever tests name it. */}
      <section className="cmp-sec">
        <div className="cw-sec-h">
          <h2 className="cmp-h">Machines</h2>
          <span className="cmp-h-n">{tt.assets.length ? `${tt.assets.length} on this line` : ''}</span>
        </div>
        <div className="cx-assets">
          {tt.assets.map(a => {
            const ran = tt.tests.filter(t => t.assetId === a.id && t.outcome !== 'planned').length;
            return (
              <div key={a.id} className="tw-asset">
                <DraftField value={a.name} ariaLabel="Machine name"
                  onSave={v => v.trim() && void tt.saveAsset({ ...a, name: v.trim() })} />
                <span className="sub">{ASSET_STATE_WORD[a.state]}{ran > 0 ? ` · ${ran} test${ran === 1 ? '' : 's'}` : ''}</span>
                <button className="tw-x" aria-label={`Remove ${a.name}`} onClick={() => {
                  if (confirm(`Remove “${a.name}”?\n\nIts tests stay — they just stop naming a machine.`)) void tt.removeAsset(a.id);
                }}>×</button>
              </div>
            );
          })}
          <AddAsset add={tt.addAsset} />
        </div>
      </section>

      <div className="cm-foot">
        <button className="btn btn-ghost" onClick={() => nav(`/project/${projectId}`)}>Back to the project</button>
      </div>
    </div>
  );
}

function AddAsset({ add }: { add: (name: string, oem?: string) => Promise<string> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [oem, setOem] = useState('');
  if (!open) {
    return (
      <button className="cw-add" onClick={() => setOpen(true)}>
        <span className="cw-add-p" aria-hidden>+</span> Add a machine
      </button>
    );
  }
  return (
    <form className="cw-addf" onSubmit={e => {
      e.preventDefault();
      if (!name.trim()) return;
      void add(name, oem);
      setName(''); setOem(''); setOpen(false);
    }}>
      <input autoFocus placeholder="Machine" value={name} onChange={e => setName(e.target.value)} />
      <input placeholder="Who supplied it" value={oem} onChange={e => setOem(e.target.value)} />
      <button className="btn" type="submit" disabled={!name.trim()}>Add</button>
      <button className="btn btn-ghost" type="button" onClick={() => setOpen(false)}>Cancel</button>
    </form>
  );
}
