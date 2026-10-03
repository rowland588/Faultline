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
 * THIS IS THE ONLY DOOR A FIX COMES IN BY. Rowland: "all fixes can only be
 * entered in the fix, and thus I can pick what test they are associated to —
 * this way it's a clear path." It used to be made three ways: ticking an
 * observation on a test, a button on a next step, and a loader that turned
 * next steps into fixes by itself. He found fixes on his list he had never
 * made. Now a fix is planned here, and the form asks which test it is for.
 * The test page lists its fixes and has a button that comes here with that
 * test already picked.
 */
import { useState } from 'react';
import { nav, useRoute } from '../state/useRoute';
import { Crumbs } from '../ui/Crumbs';
import { Peers, projectPeers } from '../ui/Peers';
import { Verdicts } from '../ui/Verdicts';
import { niceDay, todayISO } from '../lib/weeks';
import { useStanding } from '../lib/useStanding';
import { useProject } from '../lib/useProjects';
import { useTesting } from '../lib/useTesting';
import { gateOf, isOverdue, plannedEnd, standing, testOfFix, type Test } from '../lib/testing';
import { GATE_WORD } from '../lib/install';
import { VoiceNote, VoiceReview } from '../ui/Voice';
import { changesFor, contextFor, type VoiceResult } from '../lib/voice';

const nice = (iso?: string): string => niceDay(iso) || '—';

export function FixesScreen({ projectId }: { projectId: string }) {
  const { project, loading } = useProject(projectId);
  const tt = useTesting(projectId);
  const stand = useStanding(projectId);
  /* Arriving from a test's "Add a fix for this test" opens the form with that
     test picked. */
  const forParam = useRoute().query.get('for') ?? '';
  const [adding, setAdding] = useState(!!forParam);
  const [title, setTitle] = useState('');
  const [on, setOn] = useState<string[]>([]);
  const [forId, setForId] = useState(forParam);
  const [onTouched, setOnTouched] = useState(false);
  const [heard, setHeard] = useState<VoiceResult | null>(null);

  if (loading || tt.loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  if (!project) return <div className="wrap pace"><p className="sub" style={{ marginTop: 24 }}>That project isn’t here any more.</p></div>;

  /* The same reading the testing screen makes, over the fixes instead of the
     tests — one function, so the two pages cannot order or count differently. */
  const fixes = tt.tests.filter(t => t.kind === 'fix');
  const st = standing(fixes, tt.items);

  const open = (id: string) => nav(`/project/${projectId}/testing/${encodeURIComponent(id)}`);
  const toggle = (id: string) => { setOnTouched(true); setOn(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id])); };

  /* The tests a fix can be for, most recent first — the one just run is the
     one a fix is most likely for. */
  const testsToPick = tt.tests
    .filter(t => (t.kind ?? 'test') === 'test' && !t.deletedAt)
    .sort((a, b) => (b.ranOn ?? b.plannedFor ?? '').localeCompare(a.ranOn ?? a.plannedFor ?? ''));
  /* An install step is something a fix can be for, as a test is — the part
     that was missing when the air went on. */
  const stepsToPick = tt.tests.filter(t => t.kind === 'install' && !t.deletedAt).sort((a, b) => a.sort - b.sort);
  const forTest = [...testsToPick, ...stepsToPick].find(t => t.id === forId);
  /* The machine follows the test unless somebody has picked one themselves. */
  const machines = onTouched ? on : forTest?.assetId ? [forTest.assetId] : on;

  const plan = () => {
    const clean = title.trim();
    if (!clean) return;
    const target = forTest?.id;
    void (async () => { open(await tt.planTest(clean, machines.length ? machines : [undefined], 'fix', target)); })();
    setTitle(''); setOn([]); setOnTouched(false); setForId(''); setAdding(false);
  };

  const machine = (t: Test) => tt.assets.find(a => a.id === t.assetId)?.name ?? 'The line';
  const cameFrom = (t: Test) => testOfFix(t, tt.tests);
  /* The soonest one that has a day on it — the list is already in that order,
     so this is its head rather than a second sort. */
  const nextBy = st.upcoming.length ? plannedEnd(st.upcoming[0]) : undefined;
  const late = st.upcoming.filter(t => isOverdue(t)).length;

  return (
    <div className="wrap pace cm-screen">
      <Crumbs trail={[
        { label: 'Control room', to: '/' },
        { label: project.name, to: `/project/${projectId}` },
        { label: 'Fixes' },
      ]} />
      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pace-eyebrow">{project.name}</p>
          <h1 className="pace-title">Fixes</h1>
          <p className="cw-handover">
            {st.upcoming.length > 0
              ? <>
                <b>{st.upcoming.length} still to do</b>
                {late > 0 && <span className="sub in-late">{late} late</span>}
                {st.done.length > 0 && <span className="sub">{st.done.length} done</span>}
              </>
              : st.done.length > 0
                ? <b>Nothing outstanding — {st.done.length} done</b>
                : <b>Nothing on the list yet</b>}
          </p>
        </div>
      </header>
      {/* The row under the header — see "THE PAGE FRAME" in styles.css. */}
      <Peers peers={projectPeers(projectId, 'fixes', stand.counts)} />

      {(st.upcoming.length + st.done.length) > 0 && (
        <p className="fx-key" aria-label="What the colours mean">
          <span className="is-late">Late</span>
          <span className="is-soon">Due within {DUE_SOON_DAYS} days</span>
          <span className="is-ahead">Planned</span>
          <span className="is-done">Done</span>
        </p>
      )}

      {/* A fix that was done and never signed off asks first. */}
      <Verdicts tests={fixes} projectId={projectId}
        onAnswer={(t, outcome) => void tt.patchTest(t.id, cur => ({ outcome, ranOn: cur.ranOn ?? todayISO() }))}
        onUndo={before => void tt.patchTest(before.id, { outcome: 'planned', ranOn: before.ranOn })} />

      {/* STILL TO DO, soonest first — the list somebody works off. */}
      <section className="cmp-sec">
        <div className="cw-sec-h">
          <h2 className="cmp-h">Still to do</h2>
          {st.upcoming.length > 0 && <span className="cmp-h-n">{st.upcoming.length}</span>}
        </div>

        {adding ? (
          <form className="tw-plan" onSubmit={e => { e.preventDefault(); plan(); }}>
            <input autoFocus placeholder="What are we fixing?" value={title} onChange={e => setTitle(e.target.value)} />
            <label className="tw-plan-l" htmlFor="fix-for">{stepsToPick.length ? 'What is it for?' : 'Which test is it for?'}</label>
            <select id="fix-for" className="tw-plan-sel" value={forId} onChange={e => setForId(e.target.value)}>
              <option value="">{stepsToPick.length ? 'Not from a test or an install step' : 'Not from a test'}</option>
              {stepsToPick.length > 0
                ? <>
                  <optgroup label="Tests">{testsToPick.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</optgroup>
                  {(['install', 'setup', 'handover'] as const).map(g => {
                    const inGate = stepsToPick.filter(t => gateOf(t) === g);
                    return inGate.length > 0 && (
                      <optgroup key={g} label={`${GATE_WORD[g]} steps`}>{inGate.map(t => <option key={t.id} value={t.id}>{machine(t)} — {t.title}</option>)}</optgroup>
                    );
                  })}
                </>
                : testsToPick.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
            {tt.assets.length > 0 && (
              <>
                <span className="tw-plan-l">Which machines? Pick as many as it applies to.</span>
                <span className="tw-chips">
                  {tt.assets.map(a => (
                    <button key={a.id} type="button" className={'tw-chip' + (machines.includes(a.id) ? ' on' : '')}
                      aria-pressed={machines.includes(a.id)} onClick={() => { if (!onTouched) setOn(machines); toggle(a.id); }}>
                      {a.name}
                    </button>
                  ))}
                  <button type="button" className={'tw-chip' + (machines.length === 0 ? ' on' : '')}
                    aria-pressed={machines.length === 0} onClick={() => { setOnTouched(true); setOn([]); }}>
                    The line itself
                  </button>
                </span>
              </>
            )}
            <span className="tw-plan-go">
              <button className="btn" type="submit" disabled={!title.trim()}>
                {machines.length > 1 ? `Plan ${machines.length} fixes` : 'Plan it'}
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => { setAdding(false); setOn([]); setOnTouched(false); setForId(''); }}>Cancel</button>
            </span>
          </form>
        ) : heard ? (
          /* A FIX, SAID. What was heard is laid out as the fix it would make;
             "Plan it" makes it, with only the ticked parts. */
          (() => {
            const blank: Test = { id: '', projectId, kind: 'fix', title: '', outcome: 'planned', sort: 0, createdAt: 0, updatedAt: 0 };
            const changes = changesFor(blank, heard.fields, tt.assets, todayISO());
            const hasTitle = changes.some(c => c.key === 'title' || c.key === 'problem');
            return (
              <VoiceReview heard={heard} applyLabel="Plan it"
                rows={hasTitle ? changes.map(c => ({ key: c.key, label: c.label, after: c.after })) : []}
                onApply={keys => void (async () => {
                  const picked = changes.filter(c => keys.includes(c.key));
                  const patch = Object.assign({}, ...picked.map(c => c.patch)) as Partial<Test>;
                  const name = patch.title || patch.passesIf || 'Fix';
                  const id = await tt.planTest(name, [patch.assetId], 'fix', forParam || undefined);
                  const rest = { ...patch };
                  delete rest.title; delete rest.assetId;
                  if (Object.keys(rest).length) await tt.patchTest(id, rest);
                  setHeard(null);
                  open(id);
                })()}
                onDiscard={() => setHeard(null)} />
            );
          })()
        ) : (
          <div className="vo-pair">
            <button className="cw-add" onClick={() => setAdding(true)}>
              <span className="cw-add-p" aria-hidden><Icon name="plus" size={13} /></span> Plan a fix
            </button>
            <VoiceNote form="fix" label="Say a fix" context={() => contextFor(tt.assets, tt.tests, todayISO())} onHeard={setHeard} />
          </div>
        )}

        {/* ONE BOX PER FIX. Rowland: "everything's quite elongated across the
            page — I would prefer their own little boxes." Each box says the
            same things in the same places: where it stands, the machine, the
            fix, the problem, and who / what it is for. */}
        {st.upcoming.length > 0 && (
          <div className="fx-grid">
            {st.upcoming.map((t, i) => <FixBox key={t.id} t={t} first={i === 0} machine={machine(t)} from={cameFrom(t)} onOpen={() => open(t.id)} />)}
          </div>
        )}

        {st.upcoming.length === 0 && !adding && (
          <p className="sub tw-note">
            Every fix is planned here. Pick the test it is for, and it shows on that test's page and
            in its card on the client report.
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
          <div className="fx-grid">
            {st.done.map(t => <FixBox key={t.id} t={t} machine={machine(t)} from={cameFrom(t)} onOpen={() => open(t.id)} />)}
          </div>
        </section>
      )}

      <p className="sub tw-note">
        A fix has its own days and its own card, and says which test it is for.
        {nextBy && <> The next one is wanted by {nice(nextBy)}.</>}
      </p>
    </div>
  );
}

export { DUE_SOON_DAYS, fixTone, type FixTone } from '../lib/fixTone';
import { DUE_SOON_DAYS, fixTone } from '../lib/fixTone';
import { Icon } from '../ui/Icon';

/** One fix, as a box: where it stands, the machine, the fix, the problem, and
 *  who is on it and what it is for — the same things in the same places on
 *  every box, so a grid of them reads at a glance. */
function FixBox({ t, machine, from, onOpen }: {
  t: Test; first?: boolean; machine: string; from?: Test; onOpen: () => void;
}) {
  const settled = t.outcome === 'passed' || t.outcome === 'failed' || t.outcome === 'notRun';
  const { tone, when } = fixTone(t);
  const pics = (t.media ?? []).length;
  return (
    <button className={'fx-box is-' + tone} onClick={onOpen}>
      <span className="fx-top">
        <span className="fx-state">{when}</span>
        <span className="fx-machine">{machine}</span>
      </span>
      <b className="fx-title">{t.title}</b>
      {settled
        ? (t.result && <span className="fx-text">{t.result}</span>)
        : (t.passesIf && <span className="fx-text"><span className="fx-k">Problem</span> {t.passesIf}</span>)}
      <span className="fx-foot">
        <span className={t.withWhom ? '' : 'fx-none'}>{t.withWhom || 'Nobody yet'}</span>
        <span className="fx-for">{from ? `For “${from.title}”` : 'Not from a test'}</span>
        {pics > 0 && <span className="fx-pics">{pics} picture{pics === 1 ? '' : 's'}</span>}
      </span>
    </button>
  );
}
