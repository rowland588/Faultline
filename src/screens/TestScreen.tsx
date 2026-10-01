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
import { OnTheLine } from '../ui/OnTheLine';
import { useEffect, useRef, useState } from 'react';
import { nav, useRoute } from '../state/useRoute';
import { Crumbs } from '../ui/Crumbs';
import { DraftArea, DraftField } from '../ui/Draft';
import { EvidenceThumb, EvidenceViewer } from '../ui/Evidence';
import { VideoRecorder, videoCaptureSupported } from '../ui/VideoRecorder';
import { useProject } from '../lib/useProjects';
import { usePrograms } from '../lib/usePrograms';
import { useTesting } from '../lib/useTesting';
import { deleteBlobs, getBlob, putBlob } from '../db';
import { uid } from '../lib/ids';
import { deliverBlob } from '../lib/savePdf';
import { captureMedia, pickExistingMedia, saveVideoBlob } from '../lib/media';
import {
  gateOf, hasRun, wordsOf, needsVerdict, outcomeWord, foundWords, itemsOf, testOfFix, verdictQuestion,
  type DocRef, type ItemKind, type Outcome, type Test, type TestItem,
} from '../lib/testing';
import type { MediaRef } from '../types';
import { niceDay, todayISO } from '../lib/weeks';
import { offerUndo } from '../ui/Undo';
import { VoiceNote, VoiceReview } from '../ui/Voice';
import { changesFor, contextFor, type Change, type VoiceResult } from '../lib/voice';
import { GATE_PATH, GATE_WORD } from '../lib/install';

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
  const [planOpen, setPlanOpen] = useState(false);
  /* The boxes a voice note just filled — they glow for a moment so you can
     see where what you said went. */
  const [filled, setFilled] = useState<string[]>([]);
  /* Arriving from "Hit a problem — write it up" on Install: straight into the
     box the problems are written in, ready to type the first of however many
     there are. */
  const writingProblem = useRoute().query.get('problem') === '1';

  if (loading || tt.loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  const test = tt.tests.find(t => t.id === testId);
  if (!project || !test) {
    /* A dead end is still a screen somebody is standing on. It says which one
       is gone, what is still there, and gives two ways out — a bare line of grey
       text reads as the app having broken rather than the test having been
       deleted. */
    return (
      <div className="wrap pace cm-screen">
        <Crumbs trail={[
          { label: 'Projects', to: '/projects' },
          ...(project ? [{ label: project.name, to: `/project/${projectId}` }] : []),
          { label: 'Commission' },
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
  const hl = (key: string) => (filled.includes(key) ? ' is-filled' : '');
  /* Which face this record is wearing — every label on the screen comes from
     lib/testing's WORDS rather than being decided here. */
  const kind = test.kind ?? 'test';
  const words = wordsOf(test);
  const from = test.fromTestId ? tt.tests.find(t => t.id === test.fromTestId) : undefined;
  /* A fix's test — the nearest one up its chain, so an old fix hanging off
     another fix still names the test it is really about. */
  const forTest = kind === 'fix' ? testOfFix(test, tt.tests) : undefined;
  const testsToPick = tt.tests
    .filter(t => (t.kind ?? 'test') === 'test' && !t.deletedAt)
    .sort((a, b) => (b.ranOn ?? b.plannedFor ?? '').localeCompare(a.ranOn ?? a.plannedFor ?? ''));
  /* A fix can be for an install step as well as a test — the regulator that
     was missing when the air went on is a fix FOR that step. */
  const stepsToPick = tt.tests.filter(t => t.kind === 'install' && !t.deletedAt).sort((a, b) => a.sort - b.sort);
  const machineOf = (t: Test) => tt.assets.find(a => a.id === t.assetId)?.name ?? 'The line';

  /* Setting the outcome stamps the day it happened, if nobody has said
     otherwise — the common case is telling the app on the day itself, and
     making somebody type today's date is a question the app can answer. */
  const setOutcome = (o: Outcome) =>
    void tt.patchTest(test.id, cur => ({ outcome: o, ranOn: cur.ranOn ?? (o === 'planned' ? undefined : todayISO()) }));

  return (
    <div className="wrap pace cm-screen">
      <Crumbs trail={[
        { label: 'Projects', to: '/projects' },
        { label: project.name, to: `/project/${projectId}` },
        /* A fix walks back to Fixes, a test to Testing — the spine has to lead
           where you came from, which for a fix has not been Testing since it
           got its own tab. */
        kind === 'fix'
          ? { label: 'Fixes', to: `/project/${projectId}/fixes` }
          : kind === 'install'
            ? { label: GATE_WORD[gateOf(test)], to: `/project/${projectId}/${GATE_PATH[gateOf(test)]}` }
            : { label: 'Commission', to: `/project/${projectId}/testing` },
        { label: test.title },
      ]} />

      <header className="cm-head">
        <div>
          <h1>{test.title}</h1>
          <p className="cw-handover">
            <b>{outcomeWord(test)}</b>
            {test.ranOn && <span className="sub">{nice(test.ranOn)}</span>}
            {kind === 'test' && from && (
              <button className="cw-link" onClick={() => nav(`/project/${projectId}/testing/${encodeURIComponent(from.id)}`)}>
                follows “{from.title}”
              </button>
            )}
            {kind === 'fix' && forTest && (
              <button className="cw-link" onClick={() => nav(`/project/${projectId}/testing/${encodeURIComponent(forTest.id)}`)}>
                for “{forTest.title}”
              </button>
            )}
          </p>
        </div>
      </header>

      {/* SAY IT. One voice note fills this record's boxes AND adds what was
          found — it used to be two mics, one here and one under "what we
          found", for what is one breath on the floor. Shown first, put in only
          when you say so. */}
      <SayIt test={test} tt={tt} onFilled={keys => {
        setFilled(keys);
        if (keys.some(k => PLAN_KEYS.includes(k))) setPlanOpen(true);
        window.setTimeout(() => setFilled([]), 4000);
        /* To the first box it went into — on a phone it is often below. */
        window.setTimeout(() => document.querySelector('.is-filled')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
      }} />

      {/* WHAT YOU DO WITH IT, at the top. The card and the re-test were at the
          foot, under every block, on a page that is mostly read from the top
          on a phone. */}
      <div className="tw-acts">
        <TrialCardButton test={test} project={projectId} />
        {kind === 'test' ? (
          <button className="btn" title="Carries the machine, the product and the expectation forward, so the plan writes itself."
            onClick={() => void (async () => {
              const id = await tt.planNextFrom(test);
              nav(`/project/${projectId}/testing/${encodeURIComponent(id)}`);
            })()}>
            Plan the re-test
          </button>
        ) : kind === 'install' ? (
          <button className="btn" onClick={() => nav(`/project/${projectId}/${GATE_PATH[gateOf(test)]}`)}>
            Back to {GATE_WORD[gateOf(test)]} — {machineOf(test)}
          </button>
        ) : forTest && (
          <button className="btn" onClick={() => nav(`/project/${projectId}/testing/${encodeURIComponent(forTest.id)}`)}>
            Back to the test — {forTest.title}
          </button>
        )}
      </div>

      {/* 1 · THE PLAN — folded to one line once it has run. After the day the
          plan is read, not written; the full block pushed "what happened"
          below the fold on a phone. One tap opens it, nothing in it is lost. */}
      {hasRun(test) && !planOpen ? (
        <button className="tw-block tw-fold" onClick={() => setPlanOpen(true)}>
          <span className="tw-block-h">1 · {words.plan}</span>
          <span className="tw-fold-t">
            {[machineOf(test), test.plannedFor && nice(test.plannedFor), test.withWhom && `with ${test.withWhom}`, test.passesIf]
              .filter(Boolean).join(' · ')}
          </span>
          <span className="tw-fold-go">Edit</span>
        </button>
      ) : (
      <section className="tw-block">
        <span className="tw-block-h">1 · {words.plan}</span>
        <label className={'cw-f cw-f-wide' + hl('title')}><span>{kind === 'test' ? 'What we plan to do' : words.plan}</span>
          <DraftField value={test.title} onSave={v => v.trim() && save({ title: v.trim() })} /></label>
        {/* WHICH TEST IT IS FOR. The one link a fix carries, and it can be
            changed — a fix put against the wrong test is moved, not re-made. */}
        {kind === 'fix' && (
          <label className="cw-f cw-f-wide"><span>{stepsToPick.length ? 'What is it for?' : 'Which test is it for?'}</span>
            <select value={forTest?.id ?? ''} onChange={e => save({ fromTestId: e.target.value || undefined })}>
              <option value="">{stepsToPick.length ? 'Not from a test or an install step' : 'Not from a test'}</option>
              {stepsToPick.length > 0
                ? <>
                  <optgroup label="Tests">{testsToPick.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</optgroup>
                  {(['install', 'setup', 'handover'] as const).map(g => {
                    const inGate = stepsToPick.filter(t => gateOf(t) === g);
                    return inGate.length > 0 && (
                      <optgroup key={g} label={`${GATE_WORD[g]} steps`}>{inGate.map(t => <option key={t.id} value={t.id}>{machineOf(t)} — {t.title}</option>)}</optgroup>
                    );
                  })}
                </>
                : testsToPick.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select></label>
        )}
        <label className={'cw-f' + hl('machine')}><span>Machine</span>
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
        <label className={'cw-f' + hl('plannedFor')}><span>Planned from</span>
          <input type="date" value={test.plannedFor ?? ''} onChange={e => save({ plannedFor: e.target.value || undefined })} /></label>
        <label className="cw-f" title="Leave blank when it is one day"><span>Last day <span className="cw-f-opt">if more than one</span></span>
          <input type="date" value={test.plannedTo ?? ''} min={test.plannedFor ?? undefined}
            onChange={e => save({ plannedTo: e.target.value || undefined })} /></label>
        <label className={'cw-f' + hl('withWhom')}><span>{words.withWhom}</span>
          <DraftField value={test.withWhom ?? ''} placeholder="Ilapak UK" onSave={v => save({ withWhom: v.trim() || undefined })} /></label>
        {/* A fix does not run a product down the machine, so the box is not
            offered — it is not hidden state, there is simply nothing to say. */}
        {kind === 'test' && (
          <label className="cw-f"><span>Product we plan to run</span>
            <DraftField value={test.planned ?? ''} placeholder="Jacks Piper 2kg" onSave={v => save({ planned: v.trim() || undefined })} /></label>
        )}
        <label className={'cw-f cw-f-wide' + hl('problem')}><span>{words.expectation}</span>
          <DraftArea value={test.passesIf ?? ''}
            placeholder={kind === 'fix' ? 'Film creases as the web enters the former'
              : kind === 'install' ? 'Bolted down, level to 1 mm, guards on'
                : '65 ppm held for 30 minutes, under 2% waste'}
            onSave={v => save({ passesIf: v.trim() || undefined })} /></label>
        <p className="sub tw-note">
          {kind !== 'test'
            ? 'Written before the work. It is what the end result gets measured against.'
            : 'Agreed before the day. It is what the result gets measured against.'}
        </p>
      </section>
      )}

      {/* WHERE IT IS ON THE LINE — a fix pinned on a frame of the filmed walk. */}
      {kind === 'fix' && (
        <section className="tw-block">
          <OnTheLine projectId={projectId} pin={test.pin} onSave={pin => save({ pin })} />
        </section>
      )}

      {/* 2 · THE DAY */}
      <section className="tw-block">
        <span className="tw-block-h">2 · {kind === 'test' ? 'What actually happened' : words.day}</span>
        {kind === 'test' && (
          <label className={'cw-f' + hl('product')}><span>Product we ran</span>
            <DraftField value={test.product ?? ''} placeholder={test.planned ?? 'what went down the machine'}
              onSave={v => save({ product: v.trim() || undefined })} /></label>
        )}
        <label className={'cw-f' + hl('ranOn')}><span>On the day</span>
          <input type="date" value={test.ranOn ?? ''} onChange={e => save({ ranOn: e.target.value || undefined })} /></label>
        <label className="cw-f" title="Leave blank when it took one day"><span>Last day <span className="cw-f-opt">if more than one</span></span>
          <input type="date" value={test.ranTo ?? ''} min={test.ranOn ?? undefined}
            onChange={e => save({ ranTo: e.target.value || undefined })} /></label>
        <label className={'cw-f cw-f-wide' + hl('result')}><span>{words.happened}</span>
          <DraftArea rows={5} value={test.result ?? ''}
            placeholder={kind === 'fix' ? 'Roller re-aligned, ran clean for the rest of the shift'
              : kind === 'install' ? 'Air on and tested; the regulator is missing, so it is on a fix'
                : '61 ppm, 3 leaked in 20'}
            onSave={v => save({ result: v.trim() || undefined })} /></label>
        {/* THE VERDICT IS ASKED FOR, not left as four buttons at the foot of a
            block. Once there is a day or a result on the record and nobody has
            said how it went, the question leads, in the face's own words —
            because "I never get asked" was true, and the answer is what every
            list and both documents turn on. */}
        {needsVerdict(test) && <span className="tw-ask">{verdictQuestion(kind)}</span>}
        <span className={'tw-seg' + (needsVerdict(test) ? ' is-asking' : '') + hl('outcome')}>
          {(['passed', 'failed', 'notRun', 'planned'] as const).map(o => (
            <button key={o} className={'tw-seg-b is-' + o + (test.outcome === o ? ' on' : '')}
              aria-pressed={test.outcome === o} onClick={() => setOutcome(o)}>
              {o === 'planned' ? (needsVerdict(test) ? 'No verdict yet' : 'Still planned') : outcomeWord({ kind, outcome: o })}
            </button>
          ))}
        </span>
        <Evidence media={test.media ?? []} onView={setViewing} kind={kind}
          onAdd={refs => tt.patchTest(test.id, cur => ({ media: [...(cur.media ?? []), ...refs] }))} />
      </section>

      {/* 3 · WHAT WE FOUND — the biggest block, because it is the important part.
          These are OBSERVATIONS: written down live, while it is running. Whether
          any of them is a fix is a decision somebody makes afterwards. */}
      {/* A fix has no "what we found" of its own — it is the work, not the
          question. One made before that rule keeps what was written under it. */}
      {/* An install step does — installing is where the missing part and the
          wrong drawing turn up, and they are the day's story. */}
      {(kind !== 'fix' || itemsOf(tt.items, test.id, 'found').length > 0) && (
        <Items kind="found" test={test} tt={tt} onView={setViewing} glow={filled.includes('found')} focus={writingProblem}
          heading={kind === 'install' ? '3 · What we found doing it' : '3 · What we found on the day'}
          placeholder={kind === 'install' ? 'What was the problem?' : 'What did you see?'}
          empty={kind === 'install'
            ? 'Write each problem on its own — add one, then the next. As many as there are.'
            : 'Nothing written down yet. This is the part that matters most.'} />
      )}

      {/* 4 · THE FIXES FOR THIS TEST. Listed here, made on the Fixes screen —
          the button goes there with this test already picked. */}
      {kind !== 'fix' && <NextFixes test={test} tt={tt} />}

      <Docs test={test} tt={tt} />

      {/* THE LOOP IS A TEST'S — the re-test button, now at the top. On a fix
          it once made a TEST planned "from" the fix and turned fixes into tests
          nobody asked for; a fix goes back to its test, and the re-test is
          planned from there. */}

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
            nav(`/project/${projectId}/${kind === 'fix' ? 'fixes' : kind === 'install' ? GATE_PATH[gateOf(test)] : 'testing'}`);
          }
        })()}>Delete this {words.one.toLowerCase()}</button>
      </div>

      {viewing && <EvidenceViewer media={viewing} onClose={() => setViewing(null)}
        onRemove={() => void (async () => {
          const gone = viewing;
          setViewing(null);
          /* Kept in hand for the Undo: the file itself, and which record held it. */
          const keys = [gone.blobKey, ...(gone.thumbKey && gone.thumbKey !== gone.blobKey ? [gone.thumbKey] : [])];
          const kept = await Promise.all(keys.map(async k => [k, await getBlob(k)] as const));
          const onTest = (test.media ?? []).some(m => m.id === gone.id);
          const onItems = tt.items.filter(x => x.testId === test.id && (x.media ?? []).some(m => m.id === gone.id)).map(x => x.id);
          /* Off whichever it is on — the test itself, or a thing found under it. */
          if (onTest) await tt.patchTest(test.id, cur => ({ media: (cur.media ?? []).filter(m => m.id !== gone.id) }));
          for (const id of onItems) await tt.patchItem(id, cur => ({ media: (cur.media ?? []).filter(m => m.id !== gone.id) }));
          await deleteBlobs(keys);
          offerUndo(`Removed the ${gone.kind === 'video' ? 'clip' : 'photo'}`, async () => {
            for (const [k, b] of kept) if (b) await putBlob(k, b);
            if (onTest) await tt.patchTest(test.id, cur => ({ media: [...(cur.media ?? []), gone] }));
            for (const id of onItems) await tt.patchItem(id, cur => ({ media: [...(cur.media ?? []), gone] }));
          });
        })()} />}
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
  const words = wordsOf(test);
  return (
    <button className="btn btn-primary"
      title="Everything on this screen on one page — you see it before anybody else does."
      onClick={() => nav(`/project/${project}/testing/${encodeURIComponent(test.id)}/card`)}>
      {words.one} card
    </button>
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
  /* The fixes FOR this test — including an old fix hanging off another of its
     fixes — and the re-tests planned from it. */
  const out = tt.tests
    .filter(t => !t.deletedAt && (
      ((t.kind ?? 'test') === 'fix' && testOfFix(t, tt.tests)?.id === test.id)
      || ((t.kind ?? 'test') === 'test' && t.fromTestId === test.id)))
    .sort((a, b) => (a.plannedFor ?? '').localeCompare(b.plannedFor ?? '') || a.sort - b.sort);
  const noun = test.kind === 'install' ? 'step' : 'test';

  return (
    <section className="tw-block">
      <span className="tw-block-h">4 · Fixes for this {noun}</span>
      {out.length === 0 && (
        <p className="sub tw-note">No fixes for this {noun} yet.</p>
      )}
      {/* ONE DOOR TO MAKE A FIX, and it is on the Fixes screen. This takes you
          there with this test already picked. */}
      <button className="cw-add" onClick={() => nav(`/project/${test.projectId}/fixes?for=${encodeURIComponent(test.id)}`)}>
        <span className="cw-add-p" aria-hidden>+</span> Add a fix for this {noun}
      </button>
      {out.length === 0 ? null : (
        <div className="cw-list">
          {out.map(t => (
            <button key={t.id} className={'tw-row is-' + t.outcome}
              onClick={() => nav(`/project/${test.projectId}/testing/${encodeURIComponent(t.id)}`)}>
              <span className="tw-row-m">
                <b>{(t.kind ?? 'test') === 'fix' ? <><span className="tw-face">Fix</span>{t.title}</> : <><span className="tw-face">Re-test</span>{t.title}</>}</b>
                <span className="sub">
                  {t.withWhom ? t.withWhom : 'nobody yet'}
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
function Items({ kind, test, tt, heading, placeholder, empty, onView, glow, focus }: {
  kind: ItemKind; test: Test; tt: TT; heading: string; placeholder: string; empty: string;
  onView: (m: MediaRef) => void;
  /** A voice note just added to this list. */
  glow?: boolean;
  /** Open with the cursor in the box — the page was opened to write here. */
  focus?: boolean;
}) {
  const [what, setWhat] = useState('');
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!focus) return;
    box.current?.scrollIntoView({ block: 'center' });
    box.current?.focus();
  }, [focus]);
  const rows = itemsOf(tt.items, test.id, kind);

  /* THE COUNT IS THE WHOLE POINT OF THIS BLOCK'S HONESTY.
   *
   * "5 open of 5" on a list of observations told the room five things were
   * going wrong, when what had happened was that five things were noticed. An
   * observation is written down; it is not open. */
  const count = kind === 'found'
    ? foundWords({ written: rows.length })
    : (() => {
        const open = rows.filter(r => r.doneAt == null).length;
        return open > 0 ? `${open} to do of ${rows.length}` : `${rows.length} done`;
      })();

  return (
    <section className={'tw-block is-' + kind + (glow ? ' is-filled' : '')}>
      <span className="tw-block-h">
        {heading}
        {rows.length > 0 && <span className="tw-block-n">{count}</span>}
      </span>

      {kind === 'found' && rows.length > 0 && (
        <p className="sub tw-note tw-obs-note">
          What you saw, as you saw it. Anything that needs doing is a fix, added below — on the
          Fixes screen, against this test.
        </p>
      )}

      {rows.length === 0 && <p className="sub tw-note">{empty}</p>}

      {rows.map(i => <ItemRow key={i.id} item={i} tt={tt} onView={onView} />)}

      <form className="tw-addrow" onSubmit={e => {
        e.preventDefault();
        if (!what.trim()) return;
        void tt.addItem(test.id, kind, what);
        setWhat('');
      }}>
        <input ref={box} placeholder={rows.length ? 'Another one?' : placeholder} value={what} onChange={e => setWhat(e.target.value)} />
        <button className="btn btn-sm" type="submit" disabled={!what.trim()}>Add</button>
      </form>
    </section>
  );
}

/* ================================ VOICE ==================================
 * Rowland: "on every part of the app I can talk the information into it."
 * One door on this page: it fills the record's own boxes and adds what was
 * found, from the same note. What was heard is shown first; nothing is written
 * until "Put it in", and the boxes it changed can be undone. */

/** The boxes that sit in "1 · What we planned" — filling one opens it. */
const PLAN_KEYS = ['title', 'machine', 'problem', 'withWhom', 'plannedFor'];

/* STRAIGHT INTO THE BOXES. Rowland: "that's where I would expect what I say
   to be entered ... make sure when I voice it goes into the appropriate
   boxes — what was done, for example." What adds to the record goes in at
   once and glows where it landed, with one Undo: the account of the work is
   ADDED to the box, never over it; an empty box is filled; a verdict nobody
   has given yet is given. What would REPLACE something already there — a
   different day, a different name, a changed verdict — is still asked, so
   nothing anybody wrote is lost to a mishearing. And an account that fitted
   no box goes into the commentary box rather than being put to one side. */
function SayIt({ test, tt, onFilled }: { test: Test; tt: TT; onFilled: (keys: string[]) => void }) {
  const [asking, setAsking] = useState<{ heard: VoiceResult; changes: Change[] } | null>(null);
  const today = todayISO();
  const kind = test.kind ?? 'test';

  const heard = (r: VoiceResult) => void (async () => {
    const notes = kind === 'fix' ? [] : (r.fields.notes as { what: string; owner?: string }[] | undefined) ?? [];
    /* What did not fit a box joins the account in the commentary box. */
    const said = typeof r.fields.result === 'string' ? r.fields.result.trim() : '';
    const account = [said, (r.leftover ?? '').trim()].filter(Boolean).join(' ');
    let changes = changesFor(test, { ...r.fields, result: account }, tt.assets, today);
    /* Said something, and none of it landed anywhere: it is the account. */
    if (changes.length === 0 && notes.length === 0 && r.transcript?.trim()) {
      changes = changesFor(test, { result: r.transcript.trim() }, tt.assets, today);
    }
    const adds = (c: Change) => c.key === 'result' || !c.before || (c.key === 'outcome' && test.outcome === 'planned')
      || (c.key === 'ranOn' && !test.ranOn);
    const now = changes.filter(adds);
    const ask = changes.filter(c => !adds(c));

    if (now.length) {
      const patch = Object.assign({}, ...now.map(c => c.patch)) as Partial<Test>;
      const before = Object.fromEntries(Object.keys(patch).map(k => [k, test[k as keyof Test]])) as Partial<Test>;
      await tt.patchTest(test.id, patch);
      offerUndo(`Put in what you said — ${now.map(c => c.label.toLowerCase()).join(', ')}`, () => tt.patchTest(test.id, before));
    }
    /* Things found along the way are new rows — nothing to overwrite. */
    for (const [i, n] of notes.entries()) {
      await tt.addItem(test.id, 'found', n.what, { owner: n.owner || undefined, note: i === 0 ? `Said: “${r.transcript}”` : undefined });
    }
    onFilled([...now.map(c => c.key), ...(notes.length ? ['found'] : [])]);
    if (ask.length) setAsking({ heard: r, changes: ask });
  })();

  return (
    <div className="vo-say">
      {!asking && (
        <VoiceNote form={kind === 'fix' ? 'fix' : kind === 'install' ? 'install' : 'test'}
          label={kind === 'fix' ? 'Say the fix' : kind === 'install' ? 'Say how it went' : 'Say how the test went'}
          context={() => contextFor(tt.assets, tt.tests, today, test)} onHeard={heard} />
      )}
      {asking && (
        <>
          <p className="vo-ask">This would change what is already there — tick what should change.</p>
          <VoiceReview heard={asking.heard} applyLabel="Change it"
            rows={asking.changes.map(c => ({ key: c.key, label: c.label, before: c.before, after: c.after }))}
            onApply={keys => void (async () => {
              const picked = asking.changes.filter(c => keys.includes(c.key));
              const patch = Object.assign({}, ...picked.map(c => c.patch)) as Partial<Test>;
              const before = Object.fromEntries(Object.keys(patch).map(k => [k, test[k as keyof Test]])) as Partial<Test>;
              await tt.patchTest(test.id, patch);
              offerUndo(`Changed ${picked.length} thing${picked.length === 1 ? '' : 's'}`, () => tt.patchTest(test.id, before));
              onFilled(picked.map(c => c.key));
              setAsking(null);
            })()}
            onDiscard={() => setAsking(null)} />
        </>
      )}
    </div>
  );
}

const TICK = (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M2.5 6.2 L5 8.5 L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function ItemRow({ item, tt, onView }: { item: TestItem; tt: TT; onView: (m: MediaRef) => void }) {
  const [open, setOpen] = useState(false);
  const done = item.doneAt != null;

  /* AN OBSERVATION IS NOT DONE OR NOT DONE. It is written down, and then
     somebody decides: it needs doing (it becomes a fix below), or it needs
     nothing. A next step is the ordinary open/done row it always was. */
  const observation = item.kind === 'found';

  /* AN OBSERVATION IS A NOTE — no tick. Ticking one used to make a fix in
     one tap, with no confirm; Rowland: "me putting in what did we find and
     then sending it tick to fix is the messy part." A next step (the old
     line-under-a-test shape) keeps its done tick. */
  const tick = observation ? undefined
    : () => void tt.saveItem({ ...item, doneAt: done ? undefined : Date.now() });

  return (
    <div className={'tw-item' + (done && !observation ? ' is-done' : '') + (observation ? ' is-note' : '')}>
      {tick && (
        <button className={'tw-tick' + (done ? ' is-on' : '')}
          aria-label={done ? 'Re-open' : 'Mark done'} onClick={tick}>
          {done ? TICK : null}
        </button>
      )}
      {observation && <span className="tw-obs-dot" aria-hidden />}
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
          {/* A link made before fixes moved to their own screen is history,
              and true — it stays, read-only. */}
          {item.becameTestId && (() => {
            const became = tt.tests.find(t => t.id === item.becameTestId && !t.deletedAt);
            return became ? ` · fix: ${became.title}` : '';
          })()}
          {item.fromItemId && ' · from an observation'}
          {item.pin && ' · 📍 on the line'}
        </span>
      </button>
      {(item.media ?? []).length > 0 && !open && (
        <span className="tw-item-ev">
          {(item.media ?? []).map(m => <EvidenceThumb key={m.id} media={m} size={44} onClick={() => onView(m)} />)}
        </span>
      )}

      {open && (
        <div className="tw-item-edit">
          {/* WHERE ON THE LINE — the problem pointed at on a frame of the walk. */}
          {observation && (
            <div className="cw-f cw-f-wide">
              <OnTheLine projectId={item.projectId} pin={item.pin} quiet
                onSave={pin => void tt.saveItem({ ...item, pin })} />
            </div>
          )}
          <label className="cw-f cw-f-wide"><span>What</span>
            <DraftArea rows={2} value={item.what} onSave={v => v.trim() && void tt.saveItem({ ...item, what: v.trim() })} /></label>
          <label className="cw-f"><span>Whose</span>
            <DraftField value={item.owner ?? ''} placeholder="Ilapak UK" onSave={v => void tt.saveItem({ ...item, owner: v.trim() || undefined })} /></label>
          {item.kind === 'next' && (
            <label className="cw-f"><span>By when</span>
              <input type="date" value={item.due ?? ''} onChange={e => void tt.saveItem({ ...item, due: e.target.value || undefined })} /></label>
          )}
          <Evidence media={item.media ?? []} onView={onView} kind="found"
            onAdd={refs => tt.patchItem(item.id, cur => ({ media: [...(cur.media ?? []), ...refs] }))} />
          {/* WHAT YOU DECIDE AN OBSERVATION IS. Rowland: "what we found on the
              day is observations — I then decide if they go to an action or go
              to a fix." Three doors, because there are three answers: it needs
              chasing (an action), it needs doing (a fix), or it needed neither
              and saying so is the honest end of it. Going straight to a fix
              does not make an action first: a line you never wanted is a line
              somebody has to close. */}
          <span className="cw-edit-end">
            <button className="btn btn-ghost btn-sm cw-del"
              onClick={() => void tt.removeItem(item.id)}>Delete</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Close</button>
          </span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ what's attached ---------------------------- */

/** THE EVIDENCE — photos and clips, on a test, on a fix, or on one thing found.
 *
 *  Rowland: "the power of the evidence is not available in fixes and in the
 *  tests; photo still isn't live camera from the phone, it only does gallery;
 *  what we have in the media looks a little messy."
 *
 *  Three things were wrong with the strip this replaces, and they were one
 *  fault: it had no name, no count and no shape. Thumbnails and three dashed
 *  buttons wrapped together in whatever order the width allowed, so a fix
 *  with one photo showed a purple square beside "Photo" and "Upload" on a
 *  line of its own, and nothing on the screen said what any of it was for.
 *
 *  So it is a block with a heading — EVIDENCE, and how much there is — a grid
 *  of what has been taken, and three doors that say where they go:
 *
 *      Camera       the phone's lens, straight away, for what is in front
 *                   of you now. `capture` set, so it never stops at a chooser.
 *      Video        filmed in the app, several clips back to back.
 *      On the phone photos AND clips already taken — somebody else's phone,
 *                   the OEM's engineer, the laptop. Several at once.
 *
 *  Camera used to drop `capture` on these screens so that the phone would
 *  "offer the gallery too", which on Android meant it offered ONLY the
 *  gallery: the lens was never reachable from a test. The gallery has its
 *  own door now, so the camera can be the camera.
 *
 *  IT GOES THROUGH lib/media, the door the line walk already uses: a clip is
 *  sniffed for its real type, converted so it plays on other devices, and a
 *  photo gets a thumbnail. One door, so a clip on a fix behaves like every
 *  other clip in the app. And what is taken here is what the test's card and
 *  the fix's card print — see trialCardPdf. */
function Evidence({ media, kind, onAdd, onView }: {
  media: MediaRef[];
  kind: 'test' | 'fix' | 'install' | 'found';
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
     off. A second tap while one is open is a far cheaper fault than a row
     that cannot be tapped at all, so the word is the only thing that changes. */
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

  const photos = media.filter(m => m.kind === 'photo').length;
  const clips = media.length - photos;
  const count = [photos && `${photos} photo${photos === 1 ? '' : 's'}`, clips && `${clips} clip${clips === 1 ? '' : 's'}`]
    .filter(Boolean).join(' · ');
  const why = kind === 'fix' ? 'The problem, and it fixed — a picture of each is the proof.'
    : kind === 'install' ? 'How it was left — a picture is the proof it is done, or of what stopped it.'
    : kind === 'test' ? 'What the machine did, as it did it. The card prints them.'
      : 'A picture of what you saw.';

  return (
    <div className="tw-ev">
      <span className="tw-ev-h">
        <b>Evidence</b>
        <span className="sub">{count || 'none yet'}</span>
      </span>
      {media.length > 0
        ? <div className="tw-ev-grid">
          {media.map(m => <EvidenceThumb key={m.id} media={m} size={72} onClick={() => onView(m)} />)}
        </div>
        : <p className="sub tw-ev-why">{why}</p>}
      <div className="tw-ev-doors">
        <button className="tw-door"
          onClick={() => void take(null, async () => {
            const r = await captureMedia('photo');
            return r ? [r] : [];
          })}>
          <span aria-hidden>📷</span>Camera
        </button>
        {videoCaptureSupported() && (
          <button className="tw-door" onClick={() => setFilming(true)}><span aria-hidden>🎥</span>Video</button>
        )}
        <button className="tw-door"
          onClick={() => void take('Adding…', () => pickExistingMedia())}>
          <span aria-hidden>🖼</span>On the phone
        </button>
      </div>
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
            onClick={() => void (async () => {
              await tt.patchTest(test.id, cur => ({ docs: (cur.docs ?? []).filter(x => x.id !== d.id) }));
              /* The file itself stays on the device until nothing names it,
                 so putting the reference back is the whole undo. */
              offerUndo(`Removed “${d.name}”`, async () => {
                await tt.patchTest(test.id, cur => ({ docs: [...(cur.docs ?? []), d] }));
              });
            })()}>Remove</button>
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
