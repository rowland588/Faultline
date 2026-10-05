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
import { DateWhy } from '../ui/DateWhy';
import { HANDOVER_KEY, keyOf } from '../lib/story';
import { useState } from 'react';
import { openRecord } from '../ui/RecordDrawer';
import { nav } from '../state/useRoute';
import { Verdicts } from '../ui/Verdicts';
import { niceDay, todayISO } from '../lib/weeks';
import { DraftField } from '../ui/Draft';
import { useProject } from '../lib/useProjects';
import { useTesting } from '../lib/useTesting';
import { updateProject } from '../db';
import {
  ASSET_STATE_WORD, WORDS, assetStateOn, outcomeWord, isOverdue, itemsOf, latestAttempts, standing, testOfFix, weeksTo,
  type Asset, type Test, type TestKind,
} from '../lib/testing';
import { Icon } from '../ui/Icon';
import { DateInput } from '../ui/DateInput';
import { AccessNote } from '../ui/AccessNote';
import { useAccess } from '../cloud/access';

const nice = (iso?: string): string => niceDay(iso) || '—';
const loud = (iso?: string): string => (iso ? niceDay(iso, { weekday: 'short' }).toUpperCase() : 'NO DATE');

/** A day, or a block of them. "MON 5 – FRI 9 JAN" reads as the week it is, and
 *  a single date is still a single date — the second one is absent on almost
 *  every record and absent means one day.
 *
 *  NOT CALLED `window`. It was, for about ten minutes, and a module-scope const
 *  of that name shadows the global one — every reference to `window` before
 *  this line then hits the temporal dead zone and the whole app fails to boot
 *  with "Cannot access 'window' before initialization". */
const plannedWindow = (t: Test): string => {
  const from = t.plannedFor, to = t.plannedTo;
  if (!from) return 'NO DATE';
  if (!to || to <= from) return loud(from);
  return `${loud(from)} – ${loud(to)}`;
};

/** The same, for the days it actually took. */
const ranWindow = (t: Test): string => {
  const from = t.ranOn ?? t.plannedFor, to = t.ranOn ? t.ranTo : t.plannedTo;
  if (!from) return '—';
  if (!to || to <= from) return nice(from);
  return `${nice(from)} – ${nice(to)}`;
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
  return <span className={'tw-mark is-ring' + (t.outcome === 'notRun' ? ' is-late' : '')} aria-hidden />;
}

export function TestsScreen({ projectId }: { projectId: string }) {
  const { project, loading } = useProject(projectId);
  const tt = useTesting(projectId);
  /* The numbers on the peers row come from lib/standing.ts, the same call the
     dashboard and the client report make — a row that said something different
     from the page under it would be the whole problem back again. */
  /* Who is looking (lib/access). The handover dates are what was agreed, so
     only the owner opens them; a client plans nothing and answers nothing. */
  const can = useAccess(projectId);
  const [dates, setDates] = useState(false);
  /* `adding` is which FACE is being planned, not merely whether the form is
     open — a fix and a test are the same record and the same form, and the only
     difference is the word on the button and what it saves. */
  const [adding, setAdding] = useState<TestKind | null>(null);
  const [title, setTitle] = useState('');
  /* Which machines this test is for. Empty means the line itself. Several means
     several tests — the same stages, one per machine, which is how a line is
     actually worked through. */
  const [on, setOn] = useState<string[]>([]);

  if (loading || tt.loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  if (!project) return <div className="wrap pace"><p className="sub" style={{ marginTop: 24 }}>That project isn’t here any more.</p></div>;

  /* TESTS ONLY. A fix has its own screen — see FixesScreen — because a fix is
     not part of testing and plenty of them never came out of a test. The same
     `standing` call, over the tests alone — install steps have Install. */
  const st = standing(tt.tests.filter(t => (t.kind ?? 'test') === 'test'), tt.items);
  const weeks = weeksTo(project.expectedAt);
  const assetName = (id?: string) => tt.assets.find(a => a.id === id)?.name;

  /* What was written down, and the fixes FOR this test — the same list its own
     page shows under "Fixes for this test". An observation is a note, not a
     backlog, so it is counted plainly and never in red. */
  const counts = (t: Test) => {
    const fixes = tt.tests.filter(x => (x.kind ?? 'test') === 'fix' && !x.deletedAt && testOfFix(x, tt.tests)?.id === t.id);
    return {
      found: itemsOf(tt.items, t.id, 'found').length,
      fixes: fixes.length,
      fixesOpen: fixes.filter(x => x.outcome !== 'passed').length,
      photos: (t.media ?? []).length + itemsOf(tt.items, t.id, 'found').reduce((n, i) => n + (i.media ?? []).length, 0),
    };
  };

  /* A test opens in the drawer, over this list (ui/RecordDrawer). */
  const open = (id: string) => openRecord(projectId, id);

  // Counted as the client report counts them, so the screen and the paper agree.
  const proofs = latestAttempts(tt.tests);
  const passed = proofs.filter(t => t.outcome === 'passed').length;
  const failed = proofs.filter(t => t.outcome === 'failed').length;
  const notRun = proofs.filter(t => t.outcome === 'notRun').length;


  const plan = () => {
    const clean = title.trim();
    if (!clean || !adding) return;
    const kind = adding;
    void (async () => { open(await tt.planTest(clean, on.length ? on : [undefined], kind)); })();
    setTitle(''); setOn([]); setAdding(null);
  };

  const toggle = (id: string) => setOn(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));

  return (
    <div className="wrap pace cm-screen">
      <header className="pace-head">
        <div className="pace-head-main">
          {/* COMMISSION — the gate where each machine is proved against what
              was agreed. It was called Testing; the tests are what it is made
              of, and the URL keeps the old name so no link breaks. */}
          <h1 className="pace-title">Commission</h1>
          {/* Where the gate has got to FIRST, as the other three gates say it —
              then the handover date this gate is driving at. "Rowland leading"
              is on the project itself; the four gate headers read alike. */}
          <p className="cw-handover">
            {proofs.length === 0
              ? <b>No tests planned yet</b>
              : <>
                <b>{passed} of {proofs.length} passed</b>
                {failed > 0 && <span className="sub in-late">{failed} didn’t pass</span>}
                {notRun > 0 && <span className="sub in-late">{notRun} didn’t run</span>}
              </>}
            {project.expectedAt
              ? <span className="sub">Handover {nice(project.expectedAt)}{weeks != null && ` · ${weeks >= 0 ? `${weeks} week${weeks === 1 ? '' : 's'} to go` : `${-weeks} week${weeks === -1 ? '' : 's'} ago`}`}</span>
              : <span className="sub">No handover date yet</span>}
            {can.agree && <button className="cw-link" onClick={() => setDates(d => !d)}>{dates ? 'Done' : 'Dates'}</button>}
          </p>
        </div>
      </header>
      <AccessNote can={can} owner={project.lead} />

      {dates && can.agree && (
        <div className="cx-dates">
          <label className="cw-f"><span>Handover agreed — never moves</span>
            <DateInput value={project.plannedAt ?? ''}
              onCommit={v => void updateProject({ ...project, plannedAt: v || undefined, updatedAt: Date.now() })} /></label>
          <div className="cw-f"><span>Handover now expected</span>
            <DateWhy ariaLabel="Handover now expected" value={project.expectedAt} projectId={project.id} storyKey={HANDOVER_KEY} what="Handover"
              onChange={v => updateProject({ ...project, expectedAt: v, updatedAt: Date.now() })} /></div>
        </div>
      )}

      {/* NO "WHERE THE JOB IS" CARD HERE. It repeated the job's front page,
          scoped to tests; the front page says where the job is, this page is
          the tests. */}

      {/* MACHINES FIRST ON A NEW JOB. The plan-a-test form only asks which
          machine when there is one to ask about, so a first-time user who did
          what the screen said — "plan the first test" — got a test on the line
          itself and was never asked. When nothing is named yet the machines
          section leads; once there is one, tests lead, as they should. */}
      {/* MACHINES LIVE ON INSTALL, where they arrive and go in. A test asks
          which machine when there is one; with none named yet, say where. */}
      {tt.assets.length === 0 && (can.edit ? (
        <p className="sub tw-note">
          No machines named yet — <button className="cw-link" onClick={() => nav(`/project/${projectId}/install`)}>add them on Install</button>, and each test can then say which one it is on.
        </p>
      ) : <p className="sub tw-note">No machines named yet.</p>)}

      {/* NEXT UP. On any given week there is one thing you are about to do, and
          pretending otherwise is how a plan stops being read. */}
      {can.edit && <Verdicts tests={st.done} projectId={projectId}
        onAnswer={(t, outcome) => void tt.patchTest(t.id, cur => ({ outcome, ranOn: cur.ranOn ?? todayISO() }))}
        onUndo={before => void tt.patchTest(before.id, { outcome: 'planned', ranOn: before.ranOn })} />}

      <section className="cmp-sec">
        <div className="cw-sec-h">
          <h2 className="cmp-h">Next up</h2>
          {st.upcoming.length > 1 && <span className="cmp-h-n">{st.upcoming.length} planned</span>}
        </div>
        {st.upcoming.map((t, i) => (
          <button key={t.id} className={'tw-next' + (i === 0 ? ' is-now' : '') + (isOverdue(t) ? ' is-late' : '')} onClick={() => open(t.id)}>
            <span className="tw-next-h">
              {t.kind === 'fix' && <span className="tw-face">Fix</span>}
              <b>{t.title}</b>
              <span className={'tw-when' + (isOverdue(t) ? ' is-late' : '')}>
                {isOverdue(t) ? 'WAS ' + plannedWindow(t) : plannedWindow(t)}
              </span>
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
            <input autoFocus
              placeholder={adding === 'fix' ? 'What are we fixing?' : 'What do we plan to do?'}
              value={title} onChange={e => setTitle(e.target.value)} />
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
                {on.length > 1 ? `Plan ${on.length} ${WORDS[adding].many.toLowerCase()}` : 'Plan it'}
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => { setAdding(null); setOn([]); }}>Cancel</button>
            </span>
          </form>
        ) : can.edit ? (
          /* ONE DOOR. Planning a fix moved to the Fixes screen with the fixes
             themselves — two "add" buttons on a page that only lists one of
             the two was a door leading off the page it was on. */
          <button className="cw-add" onClick={() => setAdding('test')}>
            <span className="cw-add-p" aria-hidden><Icon name="plus" size={13} /></span> Plan a test
          </button>
        ) : st.upcoming.length === 0 && <p className="sub tw-note">Nothing planned.</p>}
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
                    <span className="sub">
                      {t.kind === 'fix' && <span className="tw-face">Fix</span>}
                      {ranWindow(t)} · {assetName(t.assetId) ?? 'The line'}{t.product ? ` · ${t.product}` : ''}
                    </span>
                    <span className={'tw-res is-' + t.outcome}>
                      <b>{outcomeWord(t)}</b>{t.result ? ` — ${t.result}` : ''}
                    </span>
                    {(c.found > 0 || c.fixes > 0 || c.photos > 0) && (
                      <span className="sub">
                        {[
                          c.found > 0 && `${c.found} written down`,
                          c.fixes > 0 && `${c.fixes} fix${c.fixes === 1 ? '' : 'es'}${c.fixesOpen ? `, ${c.fixesOpen} still to do` : ''}`,
                          c.photos > 0 && `${c.photos} picture${c.photos === 1 ? '' : 's'}`,
                        ].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}


    </div>
  );
}

/** One machine: its name, where it has got to and since when, and behind a
 *  "Dates" link the same four boxes the job's own dates use — each one saved
 *  the moment it is picked, exactly like "Now expecting" at the top of this
 *  screen. Expected → landed → installed → running is the order they happen. */
export function MachineCard({ a, ran, save, remove }: {
  a: Asset; ran: number; save: (a: Asset) => Promise<void>;
  /** Absent for somebody who deletes nothing (lib/access) — no ×. */
  remove?: (id: string) => Promise<void>;
}) {
  const [dates, setDates] = useState(false);
  const on = assetStateOn(a);
  const late = a.state === 'awaited' && !!a.dueOn && a.dueOn < todayISO();
  const set = (k: 'dueOn' | 'onSiteOn' | 'installedOn' | 'runningOn') =>
    (v: string) => void save({ ...a, [k]: v || undefined });
  return (
    <div className="tw-asset">
      <div className="tw-asset-r">
        <DraftField value={a.name} ariaLabel="Machine name"
          onSave={v => v.trim() && void save({ ...a, name: v.trim() })} />
        {remove && <button className="tw-x" aria-label={`Remove ${a.name}`} onClick={() => {
          if (confirm(`Remove “${a.name}”?\n\nIts tests stay — they just stop naming a machine.`)) void remove(a.id);
        }}>×</button>}
      </div>
      <div className="tw-asset-r">
        <span className={'sub' + (late ? ' is-r' : '')}>
          {a.oem && <>{a.oem} · </>}
          {ASSET_STATE_WORD[a.state]}
          {on && (a.state === 'awaited' ? ` — due ${nice(on)}` : ` since ${nice(on)}`)}
          {ran > 0 ? ` · ${ran} test${ran === 1 ? '' : 's'}` : ''}
        </span>
        <button className="cw-link" onClick={() => setDates(d => !d)}>{dates ? 'Done' : 'Edit'}</button>
      </div>
      {dates && (
        <div className="tw-dates">
          {/* WHO SUPPLIED IT, changeable. It could only be typed once, when the
              machine was added — and it is what page 3 of the client report
              files every one of this machine's debts under. */}
          <label className="cw-f tw-oem"><span>Who supplied it</span>
            <DraftField value={a.oem ?? ''} placeholder="Ilapak UK"
              onSave={v => void save({ ...a, oem: v.trim() || undefined })} /></label>
          <div className="cw-f"><span>Expected on site</span>
            <DateWhy ariaLabel="Expected on site" value={a.dueOn} projectId={a.projectId} storyKey={keyOf('machine', a.id)} what={`${a.name} due on site`}
              onChange={v => save({ ...a, dueOn: v })} /></div>
          <label className="cw-f"><span>On site</span>
            <DateInput value={a.onSiteOn ?? ''} onCommit={set('onSiteOn')} /></label>
          <label className="cw-f"><span>Installed</span>
            <DateInput value={a.installedOn ?? ''} onCommit={set('installedOn')} /></label>
          <label className="cw-f"><span>Running</span>
            <DateInput value={a.runningOn ?? ''} onCommit={set('runningOn')} /></label>
        </div>
      )}
    </div>
  );
}

export function AddAsset({ add }: { add: (name: string, oem?: string) => Promise<string> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [oem, setOem] = useState('');
  if (!open) {
    return (
      <button className="cw-add" onClick={() => setOpen(true)}>
        <span className="cw-add-p" aria-hidden><Icon name="plus" size={13} /></span> Add a machine
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
