/* THE LINE, AND ITS TESTS.
 *
 * One board and what needs you (docs/SIMPLE.md): every test machine by
 * machine, then only what is owed. Everything on it is read off the tests —
 * there is no status anywhere in this app to disagree with them.
 *
 * Five rebuilds of this put a different structure in front of the work each
 * time: a readiness checklist, six gates, a programme of phases, one list
 * grouped by stage, an asset × pack grid with material supersession. The job
 * never had any of those. It has a cycle, and this is the list of times round it.
 */
import { DateWhy } from '../ui/DateWhy';
import { HANDOVER_KEY, keyOf } from '../lib/story';
import { useRef, useState } from 'react';
import { openRecord } from '../ui/RecordDrawer';
import { nav } from '../state/useRoute';
import { niceDay, todayISO } from '../lib/weeks';
import { DraftField } from '../ui/Draft';
import { useProject, useProjects } from '../lib/useProjects';
import { usePrograms } from '../lib/usePrograms';
import { CommissionGrid, NeedsYou } from '../ui/CommissionGrid';
import { useTesting } from '../lib/useTesting';
import { updateProject } from '../db';
import {
  ASSET_STATE_WORD, WORDS, assetStateOn, latestAttempts, weeksTo,
  type Asset, type TestKind,
} from '../lib/testing';
import { Icon } from '../ui/Icon';
import { DateInput } from '../ui/DateInput';
import { AccessNote } from '../ui/AccessNote';
import { useAccess } from '../cloud/access';

const nice = (iso?: string): string => niceDay(iso) || '—';

export function TestsScreen({ projectId }: { projectId: string }) {
  const { project, loading } = useProject(projectId);
  const tt = useTesting(projectId);
  /* Every job, for the usual tests handed on from the last job that edited
     them (lib/install usualStages) — and this job's programs, proved here. */
  const { projects } = useProjects();
  const { programs } = usePrograms(projectId);
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

  const weeks = weeksTo(project.expectedAt);
  /* Under two weeks it is said in days — "0 weeks to go" with three days
     left read as if the day had come (docs/HANDOVER.md). */
  const toGo = (iso: string, w: number): string => {
    const d = Math.round((Date.parse(`${iso}T12:00:00`) - Date.parse(`${todayISO()}T12:00:00`)) / 86_400_000);
    const n = (k: number, one: string) => `${k} ${one}${k === 1 ? '' : 's'}`;
    if (Math.abs(d) < 14) return d >= 0 ? `${n(d, 'day')} to go` : `${n(-d, 'day')} ago`;
    return w >= 0 ? `${n(w, 'week')} to go` : `${n(-w, 'week')} ago`;
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
              ? <span className="sub">Handover {nice(project.expectedAt)}{weeks != null && ` · ${toGo(project.expectedAt, weeks)}`}</span>
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

      {/* WHAT NEEDS YOU, AND ONE BOARD (docs/SIMPLE.md). The board is every
          test, machine by machine — each square opens its record. Under it,
          only what is owed. "Next up", "Tests so far" and "Programs to prove"
          each listed the board's squares again: a booked test is its indigo
          square, one that ran is its green or red square (its whole record a
          tap away, and in the full report), and a program is its column and
          the Programs page. What was owed in them is in Needs you. */}
      {/* What needs you FIRST — the abnormal in the first screenful, above
          the board (on a phone the board is three long cards). */}
      <NeedsYou project={project} tt={tt} programs={programs} can={can} />
      {(tt.assets.length > 0 || proofs.length > 0) && <CommissionGrid project={project} projects={projects} tt={tt} programs={programs} can={can} />}

      {/* PLAN A TEST that is not one of the usual ones — the usual ones are
          the board's "+" squares. One door. */}
      {can.edit && (
        <section className="cmp-sec">
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
                  {on.length > 1 ? `Plan ${on.length} ${WORDS.test.many.toLowerCase()}` : 'Plan it'}
                </button>
                <button className="btn btn-ghost" type="button" onClick={() => { setAdding(null); setOn([]); }}>Cancel</button>
              </span>
            </form>
          ) : (
            <button className="cw-add" onClick={() => setAdding('test')}>
              <span className="cw-add-p" aria-hidden><Icon name="plus" size={13} /></span> Plan a test that is not one of the usual ones
            </button>
          )}
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

/** A pasted list of machines — one a line, its supplier after a comma or a
 *  tab ("Bag former, Ilapak UK"), as copied from a spreadsheet or an email. */
export function machinesFrom(text: string): { name: string; oem?: string }[] {
  return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => {
    const [name, ...rest] = l.split(/\t|,/);
    const oem = rest.join(',').trim();
    return { name: name.trim(), ...(oem ? { oem } : {}) };
  }).filter(m => m.name);
}

/* ADDING MACHINES — save, next, save (docs/JOBSTART.md; MANUFACTURING IS
   MANY): the form stays open after Add with the supplier kept for the next
   one, so eight machines are eight names, not eight trips back to the button;
   and a pasted list adds them all. Done closes it. */
export function AddAsset({ add }: { add: (name: string, oem?: string) => Promise<string> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [oem, setOem] = useState('');
  const [added, setAdded] = useState(0);
  const nameBox = useRef<HTMLInputElement>(null);
  if (!open) {
    return (
      <button className="cw-add" onClick={() => setOpen(true)}>
        <span className="cw-add-p" aria-hidden><Icon name="plus" size={13} /></span> Add a machine
      </button>
    );
  }
  const close = () => { setOpen(false); setName(''); setOem(''); setAdded(0); };
  return (
    <form className="cw-addf" onSubmit={e => {
      e.preventDefault();
      if (!name.trim()) return;
      void add(name, oem);
      setName(''); setAdded(n => n + 1);
      nameBox.current?.focus();
    }}>
      <input ref={nameBox} autoFocus placeholder="Machine" value={name} onChange={e => setName(e.target.value)}
        aria-label="Machine — or paste a list, one a line, its supplier after a comma"
        onPaste={e => {
          const list = machinesFrom(e.clipboardData.getData('text'));
          if (list.length < 2) return;
          e.preventDefault();
          void (async () => { for (const m of list) await add(m.name, m.oem ?? (oem.trim() || undefined)); })();
          setAdded(n => n + list.length);
        }} />
      <input placeholder="Who supplied it" value={oem} onChange={e => setOem(e.target.value)} />
      <button className="btn" type="submit" disabled={!name.trim()}>Add</button>
      <button className="btn btn-ghost" type="button" onClick={close}>{added ? 'Done' : 'Cancel'}</button>
      <span className="sub cw-addf-hint">{added ? `${added} added — the next one, or Done.` : 'Or paste a list — one machine a line, its supplier after a comma.'}</span>
    </form>
  );
}
