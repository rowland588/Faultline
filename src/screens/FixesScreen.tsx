/* FIXES — their own page, because they are their own work.
 *
 * Rowland: "the fix is in the testing page — don't want it there. It all falls
 * under the project, it needs its own tab."
 *
 * He is right and it is the same argument that gave Materials and Programs
 * their own screens. A fix is not part of testing: a test asks a question of
 * the machine, a fix puts something right, and plenty of fixes never came out
 * of a test at all. Burying them under Testing made the one list he works off
 * on the floor the one list he had to go looking for.
 *
 * SAME RECORD, DIFFERENT DOOR. Nothing new is stored — a fix is a Test wearing
 * `kind: 'fix'`, which is why it already had a page, a card, a lane on the
 * plan and a row in what we are waiting on. This is the list of them, in the
 * order somebody actually wants it: what is still to do, soonest first, then
 * what has been done, newest first.
 *
 * A FIX STILL COMES OUT OF SOMETHING. The way to make one is still to decide
 * an observation is a fix, on the test where you wrote it down; the door here
 * is for the ones that did not come from a test, which is most of the ad hoc
 * ones. Both write the same record and both land on this list.
 */
import { useState } from 'react';
import { nav } from '../state/useRoute';
import { AccountMenu } from '../ui/AccountMenu';
import { Crumbs } from '../ui/Crumbs';
import { Peers, projectPeers } from '../ui/Peers';
import { useStanding } from '../lib/useStanding';
import { useProject } from '../lib/useProjects';
import { useTesting } from '../lib/useTesting';
import { isOverdue, outcomeWord, plannedEnd, standing, type Test } from '../lib/testing';

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

/** A day, or the block of them it is booked across. The second date is absent
 *  on most records and absent means one day. */
const windowOf = (from?: string, to?: string, fmt = loud): string => {
  if (!from) return fmt(undefined);
  if (!to || to <= from) return fmt(from);
  return `${fmt(from)} – ${fmt(to)}`;
};

export function FixesScreen({ projectId }: { projectId: string }) {
  const { project, loading } = useProject(projectId);
  const tt = useTesting(projectId);
  const stand = useStanding(projectId);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [on, setOn] = useState<string[]>([]);

  if (loading || tt.loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  if (!project) return <div className="wrap pace"><p className="sub" style={{ marginTop: 24 }}>That project isn’t here any more.</p></div>;

  /* The same reading the testing screen makes, over the fixes instead of the
     tests — one function, so the two pages cannot order or count differently. */
  const fixes = tt.tests.filter(t => t.kind === 'fix');
  const st = standing(fixes, tt.items);

  const open = (id: string) => nav(`/project/${projectId}/testing/${encodeURIComponent(id)}`);
  const toggle = (id: string) => setOn(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));

  const plan = () => {
    const clean = title.trim();
    if (!clean) return;
    void (async () => { open(await tt.planTest(clean, on.length ? on : [undefined], 'fix')); })();
    setTitle(''); setOn([]); setAdding(false);
  };

  const machine = (t: Test) => tt.assets.find(a => a.id === t.assetId)?.name ?? 'The line';
  const cameFrom = (t: Test) => (t.fromTestId ? tt.tests.find(x => x.id === t.fromTestId) : undefined);
  /* The soonest one that has a day on it — the list is already in that order,
     so this is its head rather than a second sort. */
  const nextBy = st.upcoming.length ? plannedEnd(st.upcoming[0]) : undefined;

  return (
    <div className="wrap pace cm-screen">
      <AccountMenu />
      <Crumbs trail={[
        { label: 'Projects', to: '/projects' },
        { label: project.name, to: `/project/${projectId}` },
        { label: 'Fixes' },
      ]} />
      <Peers peers={projectPeers(projectId, 'fixes', stand.counts)} />

      <header className="cm-head">
        <div>
          <p className="cm-eyebrow">{project.name}</p>
          <h1>Fixes</h1>
          <p className="cw-handover">
            {st.upcoming.length > 0
              ? <><b>{st.upcoming.length} still to do</b>{st.done.length > 0 && <span className="sub">{st.done.length} done</span>}</>
              : st.done.length > 0
                ? <b>Nothing outstanding — {st.done.length} done</b>
                : <b>Nothing on the list yet</b>}
          </p>
        </div>
      </header>

      {/* STILL TO DO, soonest first — the list somebody works off. */}
      <section className="cmp-sec">
        <div className="cw-sec-h">
          <h2 className="cmp-h">Still to do</h2>
          {st.upcoming.length > 0 && <span className="cmp-h-n">{st.upcoming.length}</span>}
        </div>

        {st.upcoming.map((t, i) => {
          const from = cameFrom(t);
          return (
            <button key={t.id} className={'tw-next' + (i === 0 ? ' is-now' : '') + (isOverdue(t) ? ' is-late' : '')}
              onClick={() => open(t.id)}>
              <span className="tw-next-h">
                <b>{t.title}</b>
                <span className={'tw-when' + (isOverdue(t) ? ' is-late' : '')}>
                  {isOverdue(t) ? 'WAS ' + windowOf(t.plannedFor, t.plannedTo) : windowOf(t.plannedFor, t.plannedTo)}
                </span>
              </span>
              <span className="sub">
                {machine(t)}
                {t.withWhom ? ` · ${t.withWhom}` : ' · nobody named'}
                {from && ` · out of “${from.title}”`}
              </span>
              {t.passesIf && <span className="tw-passes"><b>The problem:</b> {t.passesIf}</span>}
            </button>
          );
        })}

        {adding ? (
          <form className="tw-plan" onSubmit={e => { e.preventDefault(); plan(); }}>
            <input autoFocus placeholder="What are we fixing?" value={title} onChange={e => setTitle(e.target.value)} />
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
                {on.length > 1 ? `Plan ${on.length} fixes` : 'Plan it'}
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => { setAdding(false); setOn([]); }}>Cancel</button>
            </span>
          </form>
        ) : (
          <button className="cw-add" onClick={() => setAdding(true)}>
            <span className="cw-add-p" aria-hidden>+</span> Plan a fix
          </button>
        )}

        {st.upcoming.length === 0 && !adding && (
          <p className="sub tw-note">
            Most fixes come out of something you saw: write it under what we found on a test,
            then decide it is a fix. Plan one here when it did not come from a test.
          </p>
        )}
      </section>

      {/* DONE, newest first — a list of past work reads backwards from today. */}
      {st.done.length > 0 && (
        <section className="cmp-sec">
          <div className="cw-sec-h">
            <h2 className="cmp-h">Done</h2>
            <span className="cmp-h-n">{st.done.length}</span>
          </div>
          <div className="cw-list">
            {st.done.map(t => (
              <button key={t.id} className={'tw-row is-' + t.outcome} onClick={() => open(t.id)}>
                <span className="tw-row-m">
                  <b>{t.title}</b>
                  <span className="sub">
                    {windowOf(t.ranOn ?? t.plannedFor, t.ranOn ? t.ranTo : t.plannedTo, nice)} · {machine(t)}
                    {t.withWhom ? ` · ${t.withWhom}` : ''}
                  </span>
                  <span className={'tw-res is-' + t.outcome}>
                    <b>{outcomeWord(t)}</b>{t.result ? ` — ${t.result}` : ''}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <p className="sub tw-note">
        A fix is the same record a test is — its own days, its own findings, its own card.
        {nextBy && <> The next one is wanted by {nice(nextBy)}.</>}
      </p>
    </div>
  );
}
