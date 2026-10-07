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
 *
 * A LIST, ONE ROW PER FIX, and the fix opens HERE. Rowland, 5 October: "I
 * found myself looking at a fix… then I found myself on a page, then another
 * page and then another page." The boxes with the date in the corner were
 * the same facts as these rows — the state, the fix, the machine, what it is
 * for, who — one per line now, late first, so the page reads like a board.
 * Tap a row and the fix opens in the drawer over this list (ui/RecordDrawer):
 * Fixed, Didn't fix it, the problem with its picture, the stage it is for,
 * the dates — and × brings you back here. The legend went with the boxes:
 * every row says its state in words beside its colour.
 */
import { useState } from 'react';
import { useRoute } from '../state/useRoute';
import { openRecord } from '../ui/RecordDrawer';
import { Verdicts } from '../ui/Verdicts';
import { niceDay, todayISO } from '../lib/weeks';
import { useProject } from '../lib/useProjects';
import { useTesting } from '../lib/useTesting';
import { gateOf, isOverdue, plannedEnd, standing, testOfFix, type Test } from '../lib/testing';
import { GATE_WORD } from '../lib/install';
import { VoiceNote, VoiceReview } from '../ui/Voice';
import { changesFor, contextFor, type VoiceResult } from '../lib/voice';
import { AccessNote } from '../ui/AccessNote';
import { useAccess } from '../cloud/access';
import { notedProblems, type Noted } from '../lib/noted';
import { hoursWord } from '../lib/hoursLost';
import { offerUndo } from '../ui/Undo';
import { removeProblem } from '../ui/StageStory';
import { EvidenceThumb, EvidenceViewer, pinsOnJob } from '../ui/Evidence';
import type { MediaRef } from '../types';
import { CriticalTag } from '../ui/CriticalFields';

const nice = (iso?: string): string => niceDay(iso) || '—';

export function FixesScreen({ projectId }: { projectId: string }) {
  const { project, loading } = useProject(projectId);
  const tt = useTesting(projectId);
  /* Who is looking (lib/access) — a client reads the fixes and plans none. */
  const can = useAccess(projectId);
  /* Arriving from a test's "Add a fix for this test" opens the form with that
     test picked. */
  const forParam = useRoute().query.get('for') ?? '';
  const [adding, setAdding] = useState(!!forParam);
  const [title, setTitle] = useState('');
  const [on, setOn] = useState<string[]>([]);
  const [forId, setForId] = useState(forParam);
  const [onTouched, setOnTouched] = useState(false);
  const [heard, setHeard] = useState<VoiceResult | null>(null);
  /* A problem's picture, opened large with its marks (ui/Evidence). */
  const [viewing, setViewing] = useState<MediaRef | null>(null);

  if (loading || tt.loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  if (!project) return <div className="wrap pace"><p className="sub" style={{ marginTop: 24 }}>That project isn’t here any more.</p></div>;

  /* The same reading the testing screen makes, over the fixes instead of the
     tests — one function, so the two pages cannot order or count differently. */
  const fixes = tt.tests.filter(t => t.kind === 'fix');
  const st = standing(fixes, tt.items);

  /* A fix opens in the drawer, over this list. */
  const open = (id: string) => openRecord(projectId, id);
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
  /* WHAT NEEDS SOMEBODY FIRST. Late, then the fixes nobody has agreed a date
     for — newest first, so the one just booked from a problem is at the top
     and not under every dated fix — then the rest, soonest first. A fix with
     no date was sorted last, and on a real job that is the bottom of a long
     page: "I go to fixes, it's not in my list." */
  const toDo = [
    ...st.upcoming.filter(t => isOverdue(t)),
    ...st.upcoming.filter(t => !isOverdue(t) && !plannedEnd(t)).sort((a, b) => b.createdAt - a.createdAt),
    ...st.upcoming.filter(t => !isOverdue(t) && !!plannedEnd(t)),
  ];
  /* The soonest one that has a day on it — the list is already in that order,
     so this is its head rather than a second sort. */
  const nextBy = st.upcoming.length ? plannedEnd(st.upcoming[0]) : undefined;
  const late = st.upcoming.filter(t => isOverdue(t)).length;
  const noted = notedProblems(tt.tests, tt.items, tt.assets);
  /* A CRITICAL PROBLEM LEADS the problems with no fix (lib/critical), the
     oldest first as the rest are; a fix booked from one carries its tag. */
  /* Then the high risks, then the rest. */
  const openNoted = [...noted.open.filter(n => n.item.critical), ...noted.open.filter(n => !n.item.critical && n.item.risk), ...noted.open.filter(n => !n.item.critical && !n.item.risk)];
  const fromCritical = new Set(tt.items.filter(i => !i.deletedAt && i.kind === 'found' && i.critical && i.becameTestId).map(i => i.becameTestId as string));

  return (
    <div className="wrap pace cm-screen">
      <header className="pace-head">
        <div className="pace-head-main">
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
      <AccessNote can={can} owner={project.lead} />

      {/* A fix that was done and never signed off asks first. */}
      {can.edit && <Verdicts tests={fixes} projectId={projectId}
        onAnswer={(t, outcome) => void tt.patchTest(t.id, cur => ({ outcome, ranOn: cur.ranOn ?? todayISO() }))}
        onUndo={before => void tt.patchTest(before.id, { outcome: 'planned', ranOn: before.ranOn })} />}

      {/* STILL TO DO, soonest first — the list somebody works off. */}
      <section className="cmp-sec">
        <div className="cw-sec-h">
          <h2 className="cmp-h">Still to do</h2>
          {st.upcoming.length > 0 && <span className="cmp-h-n">{st.upcoming.length}</span>}
        </div>

        {!can.edit ? null : adding ? (
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

        {/* ONE ROW PER FIX, late first. Each row says the same things in the
            same places: the state (its stripe and its date), the fix, the
            machine, what it is for, who. */}
        {st.upcoming.length > 0 && (
          <div className="fxl" role="list">
            {toDo.map(t => <FixRow key={t.id} t={t} machine={machine(t)} from={cameFrom(t)} critical={fromCritical.has(t.id)} onOpen={() => open(t.id)} />)}
          </div>
        )}

        {st.upcoming.length === 0 && !(adding && can.edit) && (can.edit ? (
          <p className="sub tw-note">
            Every fix is planned here. Pick the test it is for, and it shows on that test's page and
            in its card on the client report.
          </p>
        ) : <p className="sub tw-note">Nothing still to do.</p>)}
      </section>

      {/* DONE, newest first — a list of past work reads backwards from today. */}
      {st.done.length > 0 && (
        <section className="cmp-sec">
          <div className="cw-sec-h">
            <h2 className="cmp-h">Done</h2>
            <span className="cmp-h-n">{st.done.length}</span>
          </div>
          <div className="fxl" role="list">
            {st.done.map(t => <FixRow key={t.id} t={t} machine={machine(t)} from={cameFrom(t)} critical={fromCritical.has(t.id)} onOpen={() => open(t.id)} />)}
          </div>
        </section>
      )}

      {/* PROBLEMS WITH NO FIX — the journey's other half (lib/noted). Rowland,
          6 October: "I don't want that problem just to disappear, because I
          want to show the story and the journey." Open until sorted, whether
          or not its stage is done; tap one for its stage. */}
      {(noted.open.length > 0 || noted.sorted.length > 0) && (
        <section className="cmp-sec">
          <div className="cw-sec-h">
            <h2 className="cmp-h">Problems with no fix</h2>
            <span className="cmp-h-n">{noted.open.length} open{noted.sorted.length ? ` · ${noted.sorted.length} sorted` : ''}</span>
          </div>
          <div className="fxl" role="list">
            {[...openNoted, ...noted.sorted].map(n => (
              <NotedRow key={n.item.id} n={n} canEdit={can.edit} onView={setViewing}
                onDelete={can.remove ? () => void removeProblem(tt, n.item.id) : undefined}
                onOpen={() => n.on && open(n.on.id)}
                onSorted={sorted => {
                  const before = n.item;
                  void tt.saveItem({ ...before, ...(sorted ? { doneAt: Date.now() } : { doneAt: undefined }) });
                  offerUndo(sorted ? `Sorted — ${before.what}` : `Open again — ${before.what}`, () => tt.saveItem(before));
                }}
                onFix={n.on ? () => void (async () => {
                  open(await tt.planNextFrom(n.on as Test, n.item.id, n.item.what, 'fix', n.item.what));
                })() : undefined} />
            ))}
          </div>
        </section>
      )}

      {viewing && <EvidenceViewer media={viewing} onClose={() => setViewing(null)}
        onPins={can.edit ? pinsOnJob(tt, viewing.id) : undefined} />}

      {/* The explanation is said once, while the list is empty; the date of
          the next one is a fact and stays as long as there is one. */}
      {(st.upcoming.length + st.done.length === 0 || nextBy) && (
        <p className="sub tw-note">
          {st.upcoming.length + st.done.length === 0 && 'A fix has its own days and its own card, and says which test it is for.'}
          {nextBy && <> The next one is wanted by {nice(nextBy)}.</>}
        </p>
      )}
    </div>
  );
}

export { DUE_SOON_DAYS, fixTone, type FixTone } from '../lib/fixTone';
import { fixTone } from '../lib/fixTone';
import { Icon } from '../ui/Icon';

/** One fix, as a row: a stripe and a date in the fix's colour (lib/fixTone —
 *  the same rule the drawer, the walk and the client report use), the fix,
 *  and under it the machine, what it is for and who. */
function FixRow({ t, machine, from, critical, onOpen }: {
  t: Test; machine: string; from?: Test; onOpen: () => void;
  /** Booked from a critical problem (lib/critical) — it carries the tag. */
  critical?: boolean;
}) {
  const { tone, when } = fixTone(t);
  /* No date agreed is not started — grey, as a step with no day is (CLAUDE.md,
     visual management); lib/fixTone's words already say "No date yet". */
  const face = tone === 'ahead' && !plannedEnd(t) ? 'none' : tone;
  return (
    <button type="button" role="listitem" className={'fxl-row is-' + face} onClick={onOpen}>
      <span className="fxl-bar" aria-hidden />
      <span className="fxl-m">
        <b>{critical && <CriticalTag sorted={t.outcome === 'passed'} />}{t.title}</b>
        <small>
          {machine} · {from ? `for ${from.title}` : 'not from a test'} · <span className={t.withWhom ? '' : 'fxl-none'}>{t.withWhom || 'nobody yet'}</span>
        </small>
      </span>
      <em className="fxl-when">{when}</em>
    </button>
  );
}

/** A problem with no fix: amber while open (it is waiting on something — the
 *  colour rules), a quiet green once sorted; where it was found, the day, the
 *  hours it cost; and the two things to do with it. */
function NotedRow({ n, canEdit, onOpen, onSorted, onFix, onDelete, onView }: {
  n: Noted; canEdit: boolean; onOpen: () => void; onSorted: (sorted: boolean) => void; onFix?: () => void;
  /** A picture of it, opened large — with what is marked on it. */
  onView: (m: MediaRef) => void;
  /** The owner's (can.remove): a problem written by mistake goes. */
  onDelete?: () => void;
}) {
  const sorted = n.item.doneAt != null;
  const moved = n.item.movedFrom && n.item.movedTo;
  /* An open critical problem is a problem in solid red, not one waiting. */
  const crit = !!n.item.critical;
  return (
    <div role="listitem" className={'fxl-row fxl-noted is-' + (sorted ? 'done' : crit ? 'late' : 'soon') + (crit && !sorted ? ' is-crit' : '')}>
      <span className="fxl-bar" aria-hidden />
      {/* THE PICTURES THEMSELVES, where "· 2 pictures" only counted them: a
          snag sent here as a problem shows what was photographed and the
          marks on it ("2 marks") — tap one for the marks and their words. */}
      <span className="fxl-mcol">
        <button type="button" className="fxl-m fxl-open" onClick={onOpen} disabled={!n.on}>
          <b>{crit && <CriticalTag sorted={sorted} />}{!crit && n.item.risk && <CriticalTag sorted={sorted} risk />}{n.item.what}</b>
          <small>
            {n.where} · {niceDay(n.day)}{n.item.hoursLost ? ` · ${hoursWord(n.item.hoursLost)} lost` : ''}{moved ? ' · moved the finish' : ''}
          </small>
        </button>
        {(n.item.media ?? []).length > 0 && (
          <span className="sp-ev fxl-pics">{(n.item.media ?? []).map(m => <EvidenceThumb key={m.id} media={m} size={56} onClick={() => onView(m)} />)}</span>
        )}
      </span>
      <span className="fxl-side">
        <em className="fxl-when">{sorted ? `Sorted ${niceDay(todayISO(new Date(n.item.doneAt as number)))}` : 'Open'}</em>
        {canEdit && (
          <span className="fxl-acts">
            <button type="button" className="cw-link" onClick={() => onSorted(!sorted)}>{sorted ? 'Open again' : 'Sorted'}</button>
            {!sorted && onFix && <button type="button" className="cw-link" onClick={onFix}>Make it a fix</button>}
            {onDelete && <button type="button" className="cw-link sp-rm" onClick={onDelete}>Delete</button>}
          </span>
        )}
      </span>
    </div>
  );
}
