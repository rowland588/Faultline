/* ONE TEST, START TO FINISH.
 *
 * Four blocks, in the order the day runs:
 *
 *   1 · WHAT WE PLANNED TO DO   what · which machine · when · what it passes on
 *   2 · WHAT ACTUALLY HAPPENED  what we ran · when it really was · the result
 *   3 · WHAT WE FOUND           the issues, with the photos and the video
 *   4 · WHAT WE DO NEXT         agreed with the OEM, each one can become the next test
 *
 * THE PLAN IS NOT REWRITTEN AFTER THE DAY. The planned date and the actual date
 * are two fields, as are the planned product and the one that went down the
 * machine, because the day is fluid and the gap between them is usually the
 * story. One field quietly following the result around would always report that
 * everything went to plan.
 */
import { useRef, useState } from 'react';
import { nav } from '../state/useRoute';
import { AccountMenu } from '../ui/AccountMenu';
import { Crumbs } from '../ui/Crumbs';
import { DraftArea, DraftField } from '../ui/Draft';
import { EvidenceThumb, EvidenceViewer } from '../ui/Evidence';
import { VideoRecorder, videoCaptureSupported } from '../ui/VideoRecorder';
import { useProject } from '../lib/useProjects';
import { usePrograms } from '../lib/usePrograms';
import { useTesting } from '../lib/useTesting';
import { getBlob, putBlob } from '../db';
import { uid } from '../lib/ids';
import { deliverBlob } from '../lib/savePdf';
import { captureMedia, pickExistingMedia, saveVideoBlob } from '../lib/media';
import {
  WORDS, needsVerdict, outcomeWord, foundTally, foundWords, itemsOf, standingOfItem, verdictQuestion,
  type DocRef, type ItemKind, type Outcome, type Test, type TestItem,
} from '../lib/testing';
import type { MediaRef } from '../types';
import { niceDay, todayISO } from '../lib/weeks';

const kb = (b?: number): string =>
  b == null ? '' : b > 900_000 ? `${(b / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
const nice = (iso?: string): string => niceDay(iso) || '';

type TT = ReturnType<typeof useTesting>;

export function TestScreen({ projectId, testId }: { projectId: string; testId: string }) {
  const { project, loading } = useProject(projectId);
  const tt = useTesting(projectId);
  /* Programs, so a test or a fix can say which one it is about. Read here and
     passed down rather than fetched inside the block: one subscription, and
     the dropdown cannot be a beat behind the Programs screen. */
  const { programs } = usePrograms(projectId);
  const [viewing, setViewing] = useState<MediaRef | null>(null);

  if (loading || tt.loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  const test = tt.tests.find(t => t.id === testId);
  if (!project || !test) {
    /* A dead end is still a screen somebody is standing on. It says which one
       is gone, what is still there, and gives two ways out — a bare line of grey
       text reads as the app having broken rather than the test having been
       deleted. */
    return (
      <div className="wrap pace cm-screen">
        <AccountMenu />
        <Crumbs trail={[
          { label: 'Projects', to: '/projects' },
          ...(project ? [{ label: project.name, to: `/project/${projectId}` }] : []),
          { label: 'Testing' },
        ]} />
        <section className="cmp-empty">
          <h2>That test isn’t here any more</h2>
          <p>
            It has been deleted, or the link is to a test on a different project. Everything else on
            {project ? ` ${project.name}` : ' this project'} is still where it was.
          </p>
          <button className="btn btn-primary" onClick={() => nav(`/project/${projectId}/testing`)}>Back to the tests</button>
          <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => nav('/projects')}>All projects</button>
        </section>
      </div>
    );
  }

  const save = (patch: Partial<Test>) => void tt.patchTest(test.id, patch);
  /* Which face this record is wearing — every label on the screen comes from
     lib/testing's WORDS rather than being decided here. */
  const kind = test.kind ?? 'test';
  const words = WORDS[kind];
  const from = test.fromTestId ? tt.tests.find(t => t.id === test.fromTestId) : undefined;

  /* Setting the outcome stamps the day it happened, if nobody has said
     otherwise — the common case is telling the app on the day itself, and
     making somebody type today's date is a question the app can answer. */
  const setOutcome = (o: Outcome) =>
    void tt.patchTest(test.id, cur => ({ outcome: o, ranOn: cur.ranOn ?? (o === 'planned' ? undefined : todayISO()) }));

  return (
    <div className="wrap pace cm-screen">
      <AccountMenu />
      <Crumbs trail={[
        { label: 'Projects', to: '/projects' },
        { label: project.name, to: `/project/${projectId}` },
        /* A fix walks back to Fixes, a test to Testing — the spine has to lead
           where you came from, which for a fix has not been Testing since it
           got its own tab. */
        kind === 'fix'
          ? { label: 'Fixes', to: `/project/${projectId}/fixes` }
          : { label: 'Testing', to: `/project/${projectId}/testing` },
        { label: test.title },
      ]} />

      <header className="cm-head">
        <div>
          <h1>{test.title}</h1>
          <p className="cw-handover">
            <b>{outcomeWord(test)}</b>
            {test.ranOn && <span className="sub">{nice(test.ranOn)}</span>}
            {from && (
              <button className="cw-link" onClick={() => nav(`/project/${projectId}/testing/${encodeURIComponent(from.id)}`)}>
                follows “{from.title}”
              </button>
            )}
          </p>
        </div>
      </header>

      {/* 1 · THE PLAN */}
      <section className="tw-block">
        <span className="tw-block-h">1 · {words.plan}</span>
        <label className="cw-f cw-f-wide"><span>{kind === 'fix' ? 'What we are fixing' : 'What we plan to do'}</span>
          <DraftField value={test.title} onSave={v => v.trim() && save({ title: v.trim() })} /></label>
        <label className="cw-f"><span>Machine</span>
          <select value={test.assetId ?? ''} onChange={e => save({ assetId: e.target.value || undefined })}>
            <option value="">The line itself</option>
            {tt.assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select></label>
        {/* WHICH PROGRAM, when it is about one. Rowland: "you can have a setup
            of a program, a test of a program, then a fix of a program, or a fix
            of an asset." Offered only when the job HAS programs — an empty
            dropdown is a question with no answers. */}
        {programs.length > 0 && (
          <label className="cw-f"><span>Program</span>
            <select value={test.programId ?? ''} onChange={e => save({ programId: e.target.value || undefined })}>
              <option value="">Not about one</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.what}{p.runs ? ` — ${p.runs}` : ''}</option>)}
            </select></label>
        )}
        {/* PLANNED FOR A DAY, OR FOR A BLOCK OF THEM. Rowland: "sometimes it's
            a block, it's like a week commencing." The second date is empty by
            default and empty means one day — so nothing that already exists
            reads any differently, and the extra box only matters to somebody
            who needs it. */}
        <label className="cw-f"><span>Planned from</span>
          <input type="date" value={test.plannedFor ?? ''} onChange={e => save({ plannedFor: e.target.value || undefined })} /></label>
        <label className="cw-f"><span>to <span className="sub">leave blank for one day</span></span>
          <input type="date" value={test.plannedTo ?? ''} min={test.plannedFor ?? undefined}
            onChange={e => save({ plannedTo: e.target.value || undefined })} /></label>
        <label className="cw-f"><span>{words.withWhom}</span>
          <DraftField value={test.withWhom ?? ''} placeholder="Ilapak UK" onSave={v => save({ withWhom: v.trim() || undefined })} /></label>
        {/* A fix does not run a product down the machine, so the box is not
            offered — it is not hidden state, there is simply nothing to say. */}
        {kind === 'test' && (
          <label className="cw-f"><span>Product we plan to run</span>
            <DraftField value={test.planned ?? ''} placeholder="Jacks Piper 2kg" onSave={v => save({ planned: v.trim() || undefined })} /></label>
        )}
        <label className="cw-f cw-f-wide"><span>{words.expectation}</span>
          <DraftArea value={test.passesIf ?? ''}
            placeholder={kind === 'fix' ? 'Film creases as the web enters the former' : '65 ppm held for 30 minutes, under 2% waste'}
            onSave={v => save({ passesIf: v.trim() || undefined })} /></label>
        <p className="sub tw-note">
          {kind === 'fix'
            ? 'Written before the work. It is what the end result gets measured against.'
            : 'Agreed before the day. It is what the result gets measured against.'}
        </p>
      </section>

      {/* 2 · THE DAY */}
      <section className="tw-block">
        <span className="tw-block-h">2 · {kind === 'fix' ? 'What was done' : 'What actually happened'}</span>
        {kind === 'test' && (
          <label className="cw-f"><span>Product we ran</span>
            <DraftField value={test.product ?? ''} placeholder={test.planned ?? 'what went down the machine'}
              onSave={v => save({ product: v.trim() || undefined })} /></label>
        )}
        <label className="cw-f"><span>On the day</span>
          <input type="date" value={test.ranOn ?? ''} onChange={e => save({ ranOn: e.target.value || undefined })} /></label>
        <label className="cw-f"><span>to <span className="sub">if it took more than one</span></span>
          <input type="date" value={test.ranTo ?? ''} min={test.ranOn ?? undefined}
            onChange={e => save({ ranTo: e.target.value || undefined })} /></label>
        <label className="cw-f cw-f-wide"><span>{words.happened}</span>
          <DraftArea rows={5} value={test.result ?? ''}
            placeholder={kind === 'fix' ? 'Roller re-aligned, ran clean for the rest of the shift' : '61 ppm, 3 leaked in 20'}
            onSave={v => save({ result: v.trim() || undefined })} /></label>
        {/* THE VERDICT IS ASKED FOR, not left as four buttons at the foot of a
            block. Once there is a day or a result on the record and nobody has
            said how it went, the question leads, in the face's own words —
            because "I never get asked" was true, and the answer is what every
            list and both documents turn on. */}
        {needsVerdict(test) && <span className="tw-ask">{verdictQuestion(kind)}</span>}
        <span className={'tw-seg' + (needsVerdict(test) ? ' is-asking' : '')}>
          {(['passed', 'failed', 'notRun', 'planned'] as const).map(o => (
            <button key={o} className={'tw-seg-b is-' + o + (test.outcome === o ? ' on' : '')}
              aria-pressed={test.outcome === o} onClick={() => setOutcome(o)}>
              {o === 'planned' ? (needsVerdict(test) ? 'Not decided' : 'Still planned') : outcomeWord({ kind, outcome: o })}
            </button>
          ))}
        </span>
        <MediaStrip media={test.media ?? []} size={54} onView={setViewing}
          onAdd={refs => tt.patchTest(test.id, cur => ({ media: [...(cur.media ?? []), ...refs] }))} />
      </section>

      {/* 3 · WHAT WE FOUND — the biggest block, because it is the important part.
          These are OBSERVATIONS: written down live, while it is running. Whether
          any of them is a fix is a decision somebody makes afterwards. */}
      <Items kind="found" test={test} tt={tt} onView={setViewing}
        heading="3 · What we found on the day"
        placeholder="What did you see?"
        empty="Nothing written down yet. This is the part that matters most." />

      {/* 4 · WHAT'S NEXT — THE FIXES THAT CAME OUT OF THIS ONE.
          There is no such thing as an action any more: Rowland, on the two
          words, "I don't think there is a difference — as a matter of fact
          they're just fixes." So what comes next is a list of records, each
          with its own days and its own page, not a list of lines. */}
      <NextFixes test={test} tt={tt} />

      <Docs test={test} tt={tt} />

      <TrialCardButton test={test} project={projectId} />

      <button className="btn btn-primary tw-loop" onClick={() => void (async () => {
        const id = await tt.planNextFrom(test);
        nav(`/project/${projectId}/testing/${encodeURIComponent(id)}`);
      })()}>
        Plan the next test from this one
      </button>
      <p className="sub tw-note" style={{ textAlign: 'center' }}>
        Carries the machine, the product and the expectation forward, so the plan writes itself.
      </p>

      {/* DELETING SAYS WHICH THING IT IS DELETING. It said "Delete this test"
          on a fix, which is the kind of wrong word that makes somebody stop and
          wonder what they are about to lose.

          And the warning counts what actually goes: the observations written
          under it. The fixes that came OUT of it are their own records now and
          survive — so saying they would go with it would be a lie, and a lie
          on a confirm box is the worst place for one. */}
      <div className="cm-foot">
        <button className="btn btn-ghost cw-del" onClick={() => void (async () => {
          const c = await tt.testCost(test.id);
          const out = tt.tests.filter(x => x.fromTestId === test.id && !x.deletedAt).length;
          const bits = [
            c.found > 0 && `${c.found} observation${c.found === 1 ? '' : 's'} go${c.found === 1 ? 'es' : ''} with it`,
            out > 0 && `${out} ${out === 1 ? 'record that came out of it stays' : 'records that came out of it stay'}`,
          ].filter(Boolean);
          const warn = bits.length
            ? `Delete “${test.title}”?\n\n${bits.join('. ')}. Deleting cannot be undone.`
            : `Delete “${test.title}”?`;
          if (confirm(warn)) {
            await tt.removeTest(test.id);
            nav(`/project/${projectId}/${kind === 'fix' ? 'fixes' : 'testing'}`);
          }
        })()}>Delete this {words.one.toLowerCase()}</button>
      </div>

      {viewing && <EvidenceViewer media={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

/** THE WAY TO THE TRIAL CARD — a door, not a send button.
 *
 *  This used to build the PDF and hand it straight to deliverPdf, which offers
 *  the share sheet first on any device that has one. On a phone that put a send
 *  dialog in front of a document nobody had seen. Rowland: "it gives you the
 *  direct opportunity just to send it, but I can't view it."
 *
 *  Nothing about the drawing changed and nothing was taken away — the same PDF
 *  is built by the same call. It is built from the card SCREEN now, which you
 *  read first, the way the client report has always worked.
 */
function TrialCardButton({ test, project }: { test: Test; project: string }) {
  const words = WORDS[test.kind ?? 'test'];
  return (
    <div className="tw-card-out">
      <button className="btn btn-primary"
        onClick={() => nav(`/project/${project}/testing/${encodeURIComponent(test.id)}/card`)}>
        {words.one} card — read it, then send it
      </button>
      <p className="sub tw-note">
        Everything on this screen on one page: what we planned, what happened, every observation
        and what was decided about it, and what we do next with names and dates. You see it before
        anybody else does.
      </p>
    </div>
  );
}

/** WHAT COMES OUT OF THIS ONE — the fixes, and the next test if there is one.
 *
 *  This was a list of typed-in lines. It is a list of RECORDS now: a fix has
 *  its own days, its own findings and its own card, which is the whole reason
 *  there is no longer a separate word for a line. Each row opens its own page.
 *
 *  There is no "add" here on purpose. A fix comes out of something you saw —
 *  you write the observation, then you decide it is a fix. Typing one straight
 *  in would be a fix with nothing behind it, which is how a list stops being
 *  evidence and starts being a wish list.
 */
function NextFixes({ test, tt }: { test: Test; tt: TT }) {
  const out = tt.tests
    .filter(t => t.fromTestId === test.id && !t.deletedAt)
    .sort((a, b) => (a.plannedFor ?? '').localeCompare(b.plannedFor ?? '') || a.sort - b.sort);

  return (
    <section className="tw-block">
      <span className="tw-block-h">4 · What we do next</span>
      {out.length === 0 ? (
        <p className="sub tw-note">
          Nothing agreed yet. Decide an observation above is a fix and it will appear here,
          with its own days and its own page.
        </p>
      ) : (
        <div className="cw-list">
          {out.map(t => (
            <button key={t.id} className={'tw-row is-' + t.outcome}
              onClick={() => nav(`/project/${test.projectId}/testing/${encodeURIComponent(t.id)}`)}>
              <span className="tw-row-m">
                <b>{(t.kind ?? 'test') === 'fix' ? <><span className="tw-face">Fix</span>{t.title}</> : t.title}</b>
                <span className="sub">
                  {t.withWhom ? t.withWhom : 'nobody named'}
                  {t.plannedFor && ` · ${nice(t.plannedFor)}${t.plannedTo && t.plannedTo > t.plannedFor ? ` – ${nice(t.plannedTo)}` : ''}`}
                </span>
                <span className={'tw-res is-' + t.outcome}>
                  <b>{outcomeWord(t)}</b>{t.result ? ` — ${t.result}` : ''}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

/** What we found, or what we do next. One component, because they are the same
 *  shape and the only difference is the word at the top and whether a row can
 *  become the next test. */
function Items({ kind, test, tt, heading, placeholder, empty, onView }: {
  kind: ItemKind; test: Test; tt: TT; heading: string; placeholder: string; empty: string;
  onView: (m: MediaRef) => void;
}) {
  const [what, setWhat] = useState('');
  const rows = itemsOf(tt.items, test.id, kind);

  /* THE COUNT IS THE WHOLE POINT OF THIS BLOCK'S HONESTY.
   *
   * "5 open of 5" on a list of observations told the room five things were
   * going wrong, when what had happened was that five things were noticed. An
   * observation is written down; it is not open. */
  const count = kind === 'found'
    ? foundWords(foundTally(rows, tt.items))
    : (() => {
        const open = rows.filter(r => r.doneAt == null).length;
        return open > 0 ? `${open} to do of ${rows.length}` : `${rows.length} done`;
      })();

  return (
    <section className={'tw-block is-' + kind}>
      <span className="tw-block-h">
        {heading}
        {rows.length > 0 && <span className="tw-block-n">{count}</span>}
      </span>

      {kind === 'found' && rows.length > 0 && (
        <p className="sub tw-note tw-obs-note">
          What you saw, as you saw it. Tick one to decide it needs doing — it becomes an action below,
          with somebody's name on it.
        </p>
      )}

      {rows.length === 0 && <p className="sub tw-note">{empty}</p>}

      {rows.map(i => <ItemRow key={i.id} item={i} test={test} tt={tt} onView={onView} />)}

      <form className="tw-addrow" onSubmit={e => {
        e.preventDefault();
        if (!what.trim()) return;
        void tt.addItem(test.id, kind, what);
        setWhat('');
      }}>
        <input placeholder={placeholder} value={what} onChange={e => setWhat(e.target.value)} />
        <button className="btn btn-sm" type="submit" disabled={!what.trim()}>Add</button>
      </form>
    </section>
  );
}

const TICK = (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M2.5 6.2 L5 8.5 L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function ItemRow({ item, test, tt, onView }: { item: TestItem; test: Test; tt: TT; onView: (m: MediaRef) => void }) {
  const [open, setOpen] = useState(false);
  const done = item.doneAt != null;

  /* AN OBSERVATION IS NOT DONE OR NOT DONE. It is written down, and then
     somebody decides: it needs doing (it becomes an action below), or it needs
     nothing. A next step is the ordinary open/done row it always was. */
  const observation = item.kind === 'found';
  const st = observation ? standingOfItem(item, tt.items) : undefined;

  /* THE TICK ON AN OBSERVATION MEANS "THIS IS A FIX", AND IT GOES BOTH WAYS.
     Rowland: "when I take [an observation] to send to fix, I can't untick."
     It refused, on the grounds that you undid it by deleting the action — and
     there are no actions any more, so that was a dead end with nothing behind
     it. Ticking makes the fix; ticking again takes it back, and the fix it
     made goes with it unless somebody has already worked on that fix. */
  const decided = st === 'actioned';
  const tick = observation
    ? () => void (decided
        ? tt.unmakeFix(item)
        : tt.planNextFrom(test, item.id, item.what, 'fix', item.what))
    : () => void tt.saveItem({ ...item, doneAt: done ? undefined : Date.now() });

  return (
    <div className={'tw-item' + (done && !observation ? ' is-done' : '') + (st ? ' is-' + st : '')}>
      <button
        className={'tw-tick' + (decided ? ' is-on' : '')}
        aria-label={observation
          ? (decided ? 'Not a fix after all' : 'Make this a fix')
          : (done ? 'Re-open' : 'Mark done')}
        onClick={tick}
      >
        {(observation ? decided : done) ? TICK : null}
      </button>
      <button className="tw-item-m" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <b>{item.what}</b>
        <span className="sub">
          {item.owner ?? (item.kind === 'next' ? 'nobody yet' : '')}
          {item.due && ` · by ${nice(item.due)}`}
          {!observation && done && ' · done'}
          {/* ONE PHRASE, NOT TWO. Saying both "a fix" and "became a fix" on the
              same row is the sort of thing that only shows up when you look at
              it: the record it became is the more useful of the two, because it
              names which. The bare word is for the old line-under-a-test shape,
              which has no record to name. */}
          {item.becameTestId
            ? ` · became a ${tt.tests.find(t => t.id === item.becameTestId)?.kind === 'fix' ? 'fix' : 'test'}`
            : decided && ' · a fix'}
          {st === 'noted' && ' · not a problem'}
          {item.fromItemId && ' · from an observation'}
        </span>
      </button>
      {(item.media ?? []).map(m => <EvidenceThumb key={m.id} media={m} size={38} onClick={() => onView(m)} />)}

      {open && (
        <div className="tw-item-edit">
          <label className="cw-f cw-f-wide"><span>What</span>
            <DraftArea rows={2} value={item.what} onSave={v => v.trim() && void tt.saveItem({ ...item, what: v.trim() })} /></label>
          <label className="cw-f"><span>Whose</span>
            <DraftField value={item.owner ?? ''} placeholder="Ilapak UK" onSave={v => void tt.saveItem({ ...item, owner: v.trim() || undefined })} /></label>
          {item.kind === 'next' && (
            <label className="cw-f"><span>By when</span>
              <input type="date" value={item.due ?? ''} onChange={e => void tt.saveItem({ ...item, due: e.target.value || undefined })} /></label>
          )}
          <MediaStrip media={item.media ?? []} size={44} onView={onView}
            onAdd={refs => tt.patchItem(item.id, cur => ({ media: [...(cur.media ?? []), ...refs] }))} />
          {/* WHAT YOU DECIDE AN OBSERVATION IS. Rowland: "what we found on the
              day is observations — I then decide if they go to an action or go
              to a fix." Three doors, because there are three answers: it needs
              chasing (an action), it needs doing (a fix), or it needed neither
              and saying so is the honest end of it. Going straight to a fix
              does not make an action first: a line you never wanted is a line
              somebody has to close. */}
          {observation && (
            <span className="tw-decide">
              {item.becameTestId
                  ? (
                    <>
                      <button className="btn btn-sm"
                        onClick={() => nav(`/project/${test.projectId}/testing/${encodeURIComponent(item.becameTestId ?? '')}`)}>
                        Open the fix
                      </button>
                      {/* THE WAY BACK. The consequence is written beside the
                          button, not reported after it: an untouched fix goes
                          with the undo, a fix somebody has worked on stays. */}
                      <button className="btn btn-ghost btn-sm" onClick={() => void tt.unmakeFix(item)}>
                        Not a fix after all
                      </button>
                      {!tt.fixUntouched(item) && (
                        <span className="sub">The fix keeps what is written on it and stays on the Fixes tab.</span>
                      )}
                    </>
                  )
                  : (
                    <>
                      <button className="btn btn-sm" onClick={() => void (async () => {
                        const id = await tt.planNextFrom(test, item.id, item.what, 'fix', item.what);
                        nav(`/project/${test.projectId}/testing/${encodeURIComponent(id)}`);
                      })()}>Make this a fix</button>
                      <button className="btn btn-ghost btn-sm"
                        onClick={() => void tt.saveItem({ ...item, doneAt: done ? undefined : Date.now() })}>
                        {done ? 'Still deciding' : 'Not a problem'}
                      </button>
                    </>
                  )}
            </span>
          )}
          <span className="cw-edit-end">
            {/* An agreed action can outgrow being a line — "sometimes I'll
                discuss the action and agree the fix". Same journey as becoming
                the next test, and the same link back, so the chain reads both
                ways and nobody plans the same work twice. */}
            {item.kind === 'next' && !item.becameTestId && (
              <button className="btn btn-sm" onClick={() => void (async () => {
                const id = await tt.planNextFrom(test, item.id, item.what, 'fix', item.note);
                nav(`/project/${test.projectId}/testing/${encodeURIComponent(id)}`);
              })()}>Make this a fix</button>
            )}
            {item.kind === 'next' && !item.becameTestId && (
              <button className="btn btn-sm" onClick={() => void (async () => {
                const id = await tt.planNextFrom(test, item.id, item.what);
                nav(`/project/${test.projectId}/testing/${encodeURIComponent(id)}`);
              })()}>Make this the next test</button>
            )}
            <button className="btn btn-ghost btn-sm cw-del"
              onClick={() => { if (confirm(`Delete “${item.what}”?`)) void tt.removeItem(item.id); }}>Delete</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Close</button>
          </span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ what's attached ---------------------------- */

/** Photos and video, on a test, on a fix, or on a single thing we found.
 *
 *  THREE DOORS, THE SAME THREE THE LINE WALK HAS. Shoot a photo, film a clip,
 *  or upload what is already on the device — and upload takes VIDEO as well as
 *  photos, which is the whole point of it. Most footage of a fix was filmed on
 *  somebody else's phone and arrives afterwards; before this, the only way to
 *  get a clip onto a test was to stand there and film it live, and the picker
 *  said `image/*`, so the phone would not even offer a video it already had.
 *
 *  IT GOES THROUGH lib/media, which is the door the line walk and next steps
 *  already use. That matters more than the button: a clip taken that way is
 *  sniffed for its real type, converted so it plays on the other devices too,
 *  and a photo gets a thumbnail — none of which the hand-rolled copy that used
 *  to live here did. One door, so a clip on a fix behaves like every other clip
 *  in the app.
 *
 *  ONE COMPONENT, NOT TWO. There were two of these, identical apart from the
 *  record they saved onto, which is exactly how the video gap came to exist in
 *  two places at once. The caller says what it is saving onto. */
function MediaStrip({ media, size, onAdd, onView }: {
  media: MediaRef[];
  size: number;
  onAdd: (refs: MediaRef[]) => Promise<void>;
  onView: (m: MediaRef) => void;
}) {
  const [filming, setFilming] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  /* NOTHING HERE IS EVER DISABLED WHILE A PICKER IS OPEN, and that is the
     point. It was, for one build: tap a door, change your mind, back out of
     the picker, and every button in the row was dead until you left the
     screen — because a picker that is dismissed rather than used reports
     nothing at all on some browsers, so the "still working" flag never came
     off. Reported as, exactly, "photos and video and upload video don't work".
     A second tap while one is open is a far cheaper fault than a row that
     cannot be tapped at all, so the word is the only thing that changes. */
  const take = async (busyNote: string | null, get: () => Promise<MediaRef[]>) => {
    setNote(busyNote);
    try {
      const refs = await get();
      if (refs.length) await onAdd(refs);
      setNote(null);
    } catch {
      setNote('That wouldn’t attach — the device may be out of room.');
    }
  };

  return (
    <div className="tw-media">
      {media.map(m => <EvidenceThumb key={m.id} media={m} size={size} onClick={() => onView(m)} />)}

      {/* CAMERA *OR* THE GALLERY, the phone's own chooser deciding. Rowland:
          "make photo offer the gallery too." A close-up of the fault has
          usually been taken already by the time the test is written up, and a
          button that goes straight to the lens cannot reach it. Upload below is
          still the door for several at once, and for video. */}
      <button className="tw-att"
        onClick={() => void take(null, async () => {
          const r = await captureMedia('photo', { gallery: true });
          return r ? [r] : [];
        })}>
        📷 Photo
      </button>

      {/* Filming stays in the app rather than handing off to the camera app, so
          several clips can be shot back to back — see VideoRecorder for why. */}
      {videoCaptureSupported() && (
        <button className="tw-att" onClick={() => setFilming(true)}>🎥 Video</button>
      )}

      {/* Photos AND video, several at once, from the gallery or a laptop. A
          phone clip is converted on the way in, which takes a moment, hence
          the word. */}
      <button className="tw-att"
        onClick={() => void take('Adding…', () => pickExistingMedia())}>
        ⬆ Upload
      </button>

      {note && <span className="sub" role="status">{note}</span>}

      {filming && (
        <VideoRecorder
          onCapture={b => { void take('Saving the clip…', async () => [await saveVideoBlob(b)]); setFilming(false); }}
          onClose={() => setFilming(false)} />
      )}
    </div>
  );
}

/** Files somebody was sent — an OEM report, a spec. Saved in the app so they
 *  open on the floor with no signal, by the same route a generated report
 *  leaves by. */
function Docs({ test, tt }: { test: Test; tt: TT }) {
  const pick = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const docs = test.docs ?? [];

  const take = async (files: FileList | null) => {
    if (!files?.length) return;
    setErr(null);
    try {
      const next: DocRef[] = [];
      for (const f of Array.from(files)) {
        const blobKey = `doc-${uid()}`;
        await putBlob(blobKey, f);
        next.push({ id: uid(), name: f.name, blobKey, mime: f.type || 'application/pdf', bytes: f.size, savedAt: Date.now() });
      }
      await tt.patchTest(test.id, cur => ({ docs: [...(cur.docs ?? []), ...next] }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'That file could not be saved.');
    }
  };

  const open = async (d: DocRef) => {
    const blob = await getBlob(d.blobKey);
    if (!blob) { setErr('That file hasn’t reached this device yet — it will once this device has synced.'); return; }
    await deliverBlob(blob, d.name);
  };

  return (
    <section className="tw-block">
      <span className="tw-block-h">
        Files
        {docs.length > 0 && <span className="tw-block-n">{docs.length}</span>}
      </span>
      {err && <p className="sub is-r" role="alert">{err}</p>}
      {docs.map(d => (
        <div key={d.id} className="cx-doc">
          <button className="cx-doc-open" onClick={() => void open(d)}>
            <span className="cx-pdf" aria-hidden>PDF</span>
            <span className="cx-doc-n">{d.name}</span>
            <span className="cx-doc-s">{kb(d.bytes)}</span>
          </button>
          <button className="cw-del btn btn-ghost btn-sm"
            onClick={() => { if (confirm(`Remove “${d.name}”?`)) void tt.saveTest({ ...test, docs: docs.filter(x => x.id !== d.id) }); }}>Remove</button>
        </div>
      ))}
      <button className="cw-add" onClick={() => pick.current?.click()}>
        <span className="cw-add-p" aria-hidden>+</span> Attach a PDF
      </button>
      <input ref={pick} type="file" accept="application/pdf,image/*" multiple hidden
        onChange={e => { void take(e.target.files); e.target.value = ''; }} />
    </section>
  );
}
