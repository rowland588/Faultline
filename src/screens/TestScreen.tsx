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
import { Evidence } from '../ui/EvidenceDoors';
import { WhyMoved, followingSummary, recordMove } from '../ui/WhyMoved';
import { movedLater } from '../lib/story';
import { useEffect, useRef, useState } from 'react';
import { nav, useRoute } from '../state/useRoute';
import { Crumbs } from '../ui/Crumbs';
import { DraftArea, DraftField } from '../ui/Draft';
import { EvidenceThumb, EvidenceViewer } from '../ui/Evidence';
import { useProject } from '../lib/useProjects';
import { usePrograms } from '../lib/usePrograms';
import { useTesting } from '../lib/useTesting';
import { deleteBlobs, getBlob, putBlob } from '../db';
import { uid } from '../lib/ids';
import { deliverBlob } from '../lib/savePdf';
import {
  gateOf, hasRun, plannedEnd, wordsOf, needsVerdict, outcomeWord, foundWords, itemsOf, testOfFix, verdictQuestion, standingOfItem,
  type DocRef, type ItemKind, type Outcome, type Test, type TestItem,
} from '../lib/testing';
import type { MediaRef } from '../types';
import { niceDay, todayISO } from '../lib/weeks';
import { offerUndo } from '../ui/Undo';
import { VoiceNote, VoiceReview } from '../ui/Voice';
import { changesFor, contextFor, type Change, type VoiceResult } from '../lib/voice';
import { GATE_PATH, GATE_WORD } from '../lib/install';
import { Icon } from '../ui/Icon';
import { DateInput } from '../ui/DateInput';
import { AccessNote } from '../ui/AccessNote';
import { useAccess } from '../cloud/access';
import { supabase } from '../cloud/client';
import { useSession } from '../cloud/session';
import { SharedLinks } from '../ui/ShareLink';
import { mayWriteAgreement, type Can } from '../lib/access';

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
  /* Who is looking (lib/access): a client reads every box as text, a team
     member does the work but deletes nothing and leaves a written "passes if"
     where the owner agreed it. */
  const can = useAccess(projectId);
  const ro = !can.edit;
  /* SENDING A PICTURE OUTSIDE is the owner's call, like inviting somebody
     (supabase/SHARE_LINKS.sql), and only means anything with the cloud there
     to serve the link. Nobody else is offered it or shown what was sent. */
  const { session } = useSession();
  const mayShare = can.people && !!supabase && !!session;
  /* Bumped when a link is made, so the list under the pictures reads again. */
  const [shareRev, setShareRev] = useState(0);
  const [viewing, setViewing] = useState<MediaRef | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  /* 2 · THE DAY folds the same way once the verdict is in. */
  const [dayOpen, setDayOpen] = useState(false);
  /* The boxes a voice note just filled — they glow for a moment so you can
     see where what you said went. */
  const [filled, setFilled] = useState<string[]>([]);
  /* Arriving from "Hit a problem — write it up" on Install: straight into the
     box the problems are written in, ready to type the first of however many
     there are. */
  const writingProblem = useRoute().query.get('problem') === '1';
  /* A planned window waiting for its reason — see `redate` below. */
  const [moving, setMoving] = useState<Pick<Test, 'plannedFor' | 'plannedTo'> | null>(null);

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
          { label: 'Control room', to: '/' },
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
  /* A new planned window. Pushing the finish later than it was waits for the
     reason (WhyMoved); anything else is kept straight away, as before. */
  const redate = (patch: Pick<Test, 'plannedFor'> | Pick<Test, 'plannedTo'>) => {
    const next = { plannedFor: moving?.plannedFor ?? test.plannedFor, plannedTo: moving ? moving.plannedTo : test.plannedTo, ...patch };
    if (next.plannedTo && next.plannedFor && next.plannedTo < next.plannedFor) next.plannedTo = undefined;
    const end = next.plannedTo ?? next.plannedFor;
    if (!test.ranOn && movedLater(plannedEnd(test), end)) { setMoving(next); return; }
    setMoving(null);
    save(next);
  };
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
        { label: 'Control room', to: '/' },
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

      <header className="pace-head">
        <div className="pace-head-main">
          <h1 className="pace-title">{test.title}</h1>
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
      <AccessNote can={can} owner={project.lead} />

      {/* SAY IT. One voice note fills this record's boxes AND adds what was
          found — it used to be two mics, one here and one under "what we
          found", for what is one breath on the floor. Shown first, put in only
          when you say so. */}
      {can.edit && <SayIt test={test} tt={tt} can={can} onFilled={keys => {
        setFilled(keys);
        if (keys.some(k => PLAN_KEYS.includes(k))) setPlanOpen(true);
        window.setTimeout(() => setFilled([]), 4000);
        /* To the first box it went into — on a phone it is often below. */
        window.setTimeout(() => document.querySelector('.is-filled')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
      }} />}

      {/* WHAT YOU DO WITH IT, at the top. The card and the re-test were at the
          foot, under every block, on a page that is mostly read from the top
          on a phone. */}
      <div className="tw-acts">
        <TrialCardButton test={test} project={projectId} />
        {/* A RE-TEST FOLLOWS A RUN THAT DID NOT PROVE IT — didn't pass or
            didn't run. Offered on a test still planned (or one that passed)
            it was a door to a re-test of something not yet tried. */}
        {kind === 'test' && (test.outcome === 'failed' || test.outcome === 'notRun') ? can.edit && (
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
          <span className="tw-fold-go">{ro ? 'Show' : 'Edit'}</span>
        </button>
      ) : (
      <section className="tw-block">
        <span className="tw-block-h">1 · {words.plan}</span>
        {ro ? <Ro wide label={kind === 'test' ? 'What we plan to do' : words.plan} text={test.title} /> : (
        <label className={'cw-f cw-f-wide' + hl('title')}><span>{kind === 'test' ? 'What we plan to do' : words.plan}</span>
          <DraftField value={test.title} onSave={v => v.trim() && save({ title: v.trim() })} /></label>
        )}
        {/* WHICH TEST IT IS FOR. The one link a fix carries, and it can be
            changed — a fix put against the wrong test is moved, not re-made. */}
        {kind === 'fix' && ro && (
          <Ro wide label={stepsToPick.length ? 'What is it for?' : 'Which test is it for?'}
            text={forTest ? (forTest.kind === 'install' ? `${machineOf(forTest)} — ${forTest.title}` : forTest.title) : 'Not from a test'} />
        )}
        {kind === 'fix' && !ro && (
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
        {ro ? <Ro label="Machine" text={machineOf(test)} /> : (
        <label className={'cw-f' + hl('machine')}><span>Machine</span>
          <select value={test.assetId ?? ''} onChange={e => save({ assetId: e.target.value || undefined })}>
            <option value="">The line itself</option>
            {tt.assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select></label>
        )}
        {/* WHICH PROGRAM, when it is about one. Rowland: "you can have a setup
            of a program, a test of a program, then a fix of a program, or a fix
            of an asset." Offered only when the job HAS programs — an empty
            dropdown is a question with no answers. */}
        {programs.length > 0 && ro && (() => {
          const p = programs.find(x => x.id === test.programId);
          return <Ro label="Program" text={p ? `${p.what}${p.runs ? ` — ${p.runs}` : ''}` : 'Not about one'} />;
        })()}
        {programs.length > 0 && !ro && (
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
        {ro ? <>
          <Ro label="Planned from" text={nice(test.plannedFor)} />
          {test.plannedTo && <Ro label="Last day" text={nice(test.plannedTo)} />}
        </> : <>
        <label className={'cw-f' + hl('plannedFor')}><span>Planned from</span>
          <DateInput value={moving?.plannedFor ?? test.plannedFor ?? ''} onCommit={v => redate({ plannedFor: v || undefined })} /></label>
        <label className="cw-f" title="Leave blank when it is one day"><span>Last day <span className="cw-f-opt">if more than one</span></span>
          <DateInput value={moving ? moving.plannedTo ?? '' : test.plannedTo ?? ''} min={test.plannedFor ?? undefined}
            onCommit={v => redate({ plannedTo: v || undefined })} /></label>
        </>}
        {/* PUSHED LATER: asked why before it is kept — the plan shows the answer. */}
        {moving && (
          <div className="cw-f-wide">
            <WhyMoved from={plannedEnd(test) as string} to={(moving.plannedTo ?? moving.plannedFor) as string}
              following={followingSummary(test, tt.tests, (moving.plannedTo ?? moving.plannedFor) as string)}
              onCancel={() => setMoving(null)}
              onSkip={() => { save(moving); setMoving(null); }}
              onSave={a => void (async () => {
                const before = { plannedFor: test.plannedFor, plannedTo: test.plannedTo };
                const was = plannedEnd(test) as string, end = (moving.plannedTo ?? moving.plannedFor) as string;
                await tt.patchTest(test.id, moving);
                const back = await recordMove(tt, [{ step: test, from: was, to: end }], a);
                setMoving(null);
                offerUndo(`Moved to ${niceDay(end)} — reason kept${a.fix ? ', fix booked' : ''}`, async () => { await tt.patchTest(test.id, before); await back(); });
              })()} />
          </div>
        )}
        {ro ? <Ro label={words.withWhom} text={test.withWhom} /> : (
        <label className={'cw-f' + hl('withWhom')}><span>{words.withWhom}</span>
          <DraftField value={test.withWhom ?? ''} placeholder="Ilapak UK" onSave={v => save({ withWhom: v.trim() || undefined })} /></label>
        )}
        {/* A fix does not run a product down the machine, so the box is not
            offered — it is not hidden state, there is simply nothing to say. */}
        {kind === 'test' && (ro ? <Ro label="Product we plan to run" text={test.planned} /> : (
          <label className="cw-f"><span>Product we plan to run</span>
            <DraftField value={test.planned ?? ''} placeholder="Jacks Piper 2kg" onSave={v => save({ planned: v.trim() || undefined })} /></label>
        ))}
        <PassesIf key={test.id} test={test} can={can} label={words.expectation} glow={hl('problem')}
          onSave={v => save({ passesIf: v.trim() || undefined })} />
      </section>
      )}

      {/* WHERE IT IS ON THE LINE — a fix pinned on a frame of the filmed walk.
          A client sees the pin, without the controls that place or move it. */}
      {kind === 'fix' && (can.edit || test.pin) && (
        <section className="tw-block">
          <OnTheLine projectId={projectId} pin={test.pin} onSave={can.edit ? pin => save({ pin }) : undefined} />
        </section>
      )}

      {/* 2 · THE DAY — one line once there is a verdict; Edit opens it. */}
      {hasRun(test) && test.outcome !== 'planned' && !dayOpen ? (
        <button className="tw-block tw-fold" onClick={() => setDayOpen(true)}>
          <span className="tw-block-h">2 · {kind === 'test' ? 'What actually happened' : words.day}</span>
          <span className="tw-fold-t">
            {[outcomeWord(test), test.ranOn && nice(test.ranOn), test.result, (test.media?.length ?? 0) > 0 && `${test.media?.length} picture${test.media?.length === 1 ? '' : 's'}`]
              .filter(Boolean).join(' · ')}
          </span>
          <span className="tw-fold-go">{ro ? 'Show' : 'Edit'}</span>
        </button>
      ) : ro ? (
      /* A CLIENT READS THE DAY: the same boxes as text, the pictures without
         the camera, and the verdict already said in the header. */
      <section className="tw-block">
        <span className="tw-block-h">2 · {kind === 'test' ? 'What actually happened' : words.day}</span>
        {kind === 'test' && <Ro label="Product we ran" text={test.product} />}
        <Ro label="On the day" text={nice(test.ranOn)} />
        {test.ranTo && <Ro label="Last day" text={nice(test.ranTo)} />}
        <Ro wide label={words.happened} text={test.result} />
        <Evidence media={test.media ?? []} onView={setViewing} kind={kind} />
      </section>
      ) : (
      <section className="tw-block">
        <span className="tw-block-h">2 · {kind === 'test' ? 'What actually happened' : words.day}</span>
        {kind === 'test' && (
          <label className={'cw-f' + hl('product')}><span>Product we ran</span>
            <DraftField value={test.product ?? ''} placeholder={test.planned ?? 'what went down the machine'}
              onSave={v => save({ product: v.trim() || undefined })} /></label>
        )}
        <label className={'cw-f' + hl('ranOn')}><span>On the day</span>
          <DateInput value={test.ranOn ?? ''} onCommit={v => save({ ranOn: v || undefined })} /></label>
        <label className="cw-f" title="Leave blank when it took one day"><span>Last day <span className="cw-f-opt">if more than one</span></span>
          <DateInput value={test.ranTo ?? ''} min={test.ranOn ?? undefined}
            onCommit={v => save({ ranTo: v || undefined })} /></label>
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
      )}

      {/* WHAT HAS BEEN SENT — the links to this test's pictures, once, under
          them, whether block 2 is open or folded. Made from the picture itself
          (the viewer's "Share a link"); stopped from here. */}
      {mayShare && <SharedLinks key={shareRev} projectId={projectId} testId={test.id} />}

      {/* 3 · WHAT WE FOUND — the biggest block, because it is the important part.
          These are OBSERVATIONS: written down live, while it is running. Whether
          any of them is a fix is a decision somebody makes afterwards. */}
      {/* A fix has no "what we found" of its own — it is the work, not the
          question. One made before that rule keeps what was written under it. */}
      {/* An install step does — installing is where the missing part and the
          wrong drawing turn up, and they are the day's story. */}
      {(kind !== 'fix' || itemsOf(tt.items, test.id, 'found').length > 0) && (
        <Items kind="found" test={test} tt={tt} can={can} onView={setViewing} glow={filled.includes('found')} focus={writingProblem}
          heading={kind === 'install' ? '3 · What we found doing it' : '3 · What we found on the day'}
          placeholder={kind === 'install' ? 'What was the problem?' : 'What did you see?'}
          empty={kind === 'install'
            ? 'Write each problem on its own — add one, then the next. As many as there are.'
            : 'Nothing written down yet. This is the part that matters most.'} />
      )}

      {/* FOR THE MEETING — what to raise about this one, written beforehand.
          The same list as every project note (the Notes screen), filed here. */}
      <Items kind="note" test={test} tt={tt} can={can} onView={setViewing}
        heading="For the meeting"
        placeholder="Something to raise about this?"
        empty="Anything you want to bring up about this at the next meeting — write it here so it isn't forgotten." />

      {/* 4 · THE FIXES FOR THIS TEST. Listed here, made on the Fixes screen —
          the button goes there with this test already picked. */}
      {kind !== 'fix' && <NextFixes test={test} tt={tt} can={can} />}

      <Docs test={test} tt={tt} can={can} />

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
      {/* Only the owner deletes (lib/access) — the database keeps the record
          for anybody else, so the button is not offered to them. */}
      {can.remove && <div className="cm-foot">
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
      </div>}

      {viewing && <EvidenceViewer media={viewing} onClose={() => setViewing(null)}
        share={mayShare && (test.media ?? []).some(m => m.id === viewing.id)
          ? { projectId, testId: test.id, onMade: () => setShareRev(r => r + 1) } : undefined}
        onRemove={!can.remove ? undefined : () => void (async () => {
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

/** A box as a client reads it: the label, and what is in it as plain text.
 *  An empty one says so, because a blank reads as a fault. */
function Ro({ label, text, wide }: { label: string; text?: string; wide?: boolean }) {
  const body = (text ?? '').trim();
  return (
    <div className={'cw-f' + (wide ? ' cw-f-wide' : '')}>
      <span>{label}</span>
      <p className={body ? '' : 'sub'} style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{body || '—'}</p>
    </div>
  );
}

/** WHAT IT PASSES ON — the agreement, and the one box on this page a team
 *  member may write only once (lib/access, mayWriteAgreement). A new test's
 *  "passes if" is proposed by whoever plans it; once written, it moves only
 *  with the owner, and the database keeps it so for anybody else.
 *
 *  Judged on what the box held when it was OPENED, not on every save: the box
 *  writes as it is typed, and a team member's own first wording would lock
 *  under their fingers mid-sentence. Opened again, it reads as agreed. */
function PassesIf({ test, can, label, glow, onSave }: {
  test: Test; can: Can; label: string; glow: string; onSave: (v: string) => void;
}) {
  const [atOpen] = useState(test.passesIf);
  const kind = test.kind ?? 'test';
  const measured = kind !== 'test'
    ? 'Written before the work. It is what the end result gets measured against.'
    : 'Agreed before the day. It is what the result gets measured against.';
  if (!can.edit || !mayWriteAgreement(can, atOpen)) {
    return (
      <>
        <Ro wide label={label} text={test.passesIf} />
        {/* The team's line says who moves it, in place of the general one. */}
        <p className="sub tw-note">{can.edit ? 'Agreed — only the owner changes it. It is what the result gets measured against.' : measured}</p>
      </>
    );
  }
  return (
    <>
      <label className={'cw-f cw-f-wide' + glow}><span>{label}</span>
        <DraftArea value={test.passesIf ?? ''}
          placeholder={kind === 'fix' ? 'Film creases as the web enters the former'
            : kind === 'install' ? 'Bolted down, level to 1 mm, guards on'
              : '65 ppm held for 30 minutes, under 2% waste'}
          onSave={onSave} /></label>
      <p className="sub tw-note">{measured}</p>
    </>
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
function NextFixes({ test, tt, can }: { test: Test; tt: TT; can: Can }) {
  /* The fixes FOR this test — including an old fix hanging off another of its
     fixes — and the re-tests planned from it. */
  const out = tt.tests
    .filter(t => !t.deletedAt && (
      ((t.kind ?? 'test') === 'fix' && testOfFix(t, tt.tests)?.id === test.id)
      || ((t.kind ?? 'test') === 'test' && t.fromTestId === test.id)))
    .sort((a, b) => (a.plannedFor ?? '').localeCompare(b.plannedFor ?? '') || a.sort - b.sort);
  const noun = test.kind === 'install' ? 'step' : 'test';
  /* The list carries the re-tests planned from it as well; a heading that
     said "Fixes" over a row marked RE-TEST was a word that was not true. */
  const retests = out.some(t => (t.kind ?? 'test') === 'test');

  return (
    <section className="tw-block">
      <span className="tw-block-h">4 · {retests ? 'Fixes and re-tests' : 'Fixes'} for this {noun}</span>
      {out.length === 0 && (
        <p className="sub tw-note">No fixes for this {noun} yet.</p>
      )}
      {/* ONE DOOR TO MAKE A FIX, and it is on the Fixes screen. This takes you
          there with this test already picked. */}
      {can.edit && (
        <button className="cw-add" onClick={() => nav(`/project/${test.projectId}/fixes?for=${encodeURIComponent(test.id)}`)}>
          <span className="cw-add-p" aria-hidden><Icon name="plus" size={13} /></span> Add a fix for this {noun}
        </button>
      )}
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
function Items({ kind, test, tt, can, heading, placeholder, empty, onView, glow, focus }: {
  kind: ItemKind; test: Test; tt: TT; can: Can; heading: string; placeholder: string; empty: string;
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
    : kind === 'note'
      ? (() => { const open = rows.filter(r => r.doneAt == null).length; return open ? `${open} to raise` : 'all raised'; })()
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
        /* "against this test" on an install step was a word that was not true. */
        <p className="sub tw-note tw-obs-note">
          What you saw, as you saw it. Anything that needs doing is a fix, added below — on the
          Fixes screen, against this {test.kind === 'install' ? 'step' : 'test'}.
        </p>
      )}

      {rows.length === 0 && <p className="sub tw-note">{can.edit ? empty : 'Nothing written down.'}</p>}

      {rows.map(i => <ItemRow key={i.id} item={i} tt={tt} can={can} onView={onView} />)}

      {can.edit && <form className="tw-addrow" onSubmit={e => {
        e.preventDefault();
        if (!what.trim()) return;
        void tt.addItem(test.id, kind, what);
        setWhat('');
      }}>
        <input ref={box} placeholder={rows.length ? 'Another one?' : placeholder} value={what} onChange={e => setWhat(e.target.value)} />
        <button className="btn btn-sm" type="submit" disabled={!what.trim()}>Add</button>
      </form>}
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
function SayIt({ test, tt, can, onFilled }: { test: Test; tt: TT; can: Can; onFilled: (keys: string[]) => void }) {
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
    /* A written "passes if" is the owner's to change — a voice note does not
       get round that for anybody else (lib/access). */
    if (!mayWriteAgreement(can, test.passesIf)) changes = changes.filter(c => c.key !== 'problem');
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

function ItemRow({ item, tt, can, onView }: { item: TestItem; tt: TT; can: Can; onView: (m: MediaRef) => void }) {
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
  /* A client reads the row: no tick (the words say raised or done), and it
     does not open, because everything it opens to is a box to change. */
  const tick = observation || !can.edit ? undefined
    : () => void tt.saveItem({ ...item, doneAt: done ? undefined : Date.now() });
  const Main = can.edit ? 'button' : 'div';

  return (
    <div className={'tw-item' + (done && !observation ? ' is-done' : '') + (observation ? ' is-note' : '')}>
      {tick && (
        <button className={'tw-tick' + (done ? ' is-on' : '')}
          aria-label={item.kind === 'note' ? (done ? 'Not raised yet' : 'Raised') : done ? 'Re-open' : 'Mark done'} onClick={tick}>
          {done ? TICK : null}
        </button>
      )}
      {observation && <span className="tw-obs-dot" aria-hidden />}
      <Main className="tw-item-m" {...(can.edit ? { onClick: () => setOpen(o => !o), 'aria-expanded': open } : { style: { cursor: 'default' } })}>
        <b>{item.what}</b>
        <span className="sub">
          {item.owner ?? (item.kind === 'next' ? 'nobody yet' : '')}
          {item.due && ` · by ${nice(item.due)}`}
          {!observation && done && (item.kind === 'note' ? ' · raised' : ' · done')}
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
          {/* SAID ON PAPER, SO SAID HERE. An observation decided "not a
              problem" before fixes moved to their own screen printed those
              words on the trial card, and this row said nothing (HUNT 7). */}
          {observation && standingOfItem(item, tt.items) === 'noted' && ' · not a problem'}
          {item.fromItemId && ' · from an observation'}
          {item.pin && <> · <Icon name="pin" size="1.15em" /> on the line</>}
        </span>
      </Main>
      {(item.media ?? []).length > 0 && !open && (
        <span className="tw-item-ev">
          {(item.media ?? []).map(m => <EvidenceThumb key={m.id} media={m} size={44} onClick={() => onView(m)} />)}
        </span>
      )}

      {open && can.edit && (
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
              <DateInput value={item.due ?? ''} onCommit={v => void tt.saveItem({ ...item, due: v || undefined })} /></label>
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
            {can.remove && (
              <button className="btn btn-ghost btn-sm cw-del"
                onClick={() => void tt.removeItem(item.id)}>Delete</button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Close</button>
          </span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ what's attached ---------------------------- */

/** Files somebody was sent — an OEM report, a spec. Saved in the app so they
 *  open on the floor with no signal, by the same route a generated report
 *  leaves by. */
function Docs({ test, tt, can }: { test: Test; tt: TT; can: Can }) {
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

  /* Nothing attached and nothing to attach with: no block to read. */
  if (!can.edit && docs.length === 0) return null;

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
          {can.remove && <button className="cw-del btn btn-ghost btn-sm"
            onClick={() => void (async () => {
              await tt.patchTest(test.id, cur => ({ docs: (cur.docs ?? []).filter(x => x.id !== d.id) }));
              /* The file itself stays on the device until nothing names it,
                 so putting the reference back is the whole undo. */
              offerUndo(`Removed “${d.name}”`, async () => {
                await tt.patchTest(test.id, cur => ({ docs: [...(cur.docs ?? []), d] }));
              });
            })()}>Remove</button>}
        </div>
      ))}
      {can.edit && <>
        <button className="cw-add" onClick={() => pick.current?.click()}>
          <span className="cw-add-p" aria-hidden><Icon name="plus" size={13} /></span> Attach a PDF
        </button>
        <input ref={pick} type="file" accept="application/pdf,image/*" multiple hidden
          onChange={e => { void take(e.target.files); e.target.value = ''; }} />
      </>}
    </section>
  );
}
