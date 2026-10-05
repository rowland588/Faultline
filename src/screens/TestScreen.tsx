/* ONE RECORD, READ WHOLE — the page a step, a test or a fix opens to, from
 * the one link in its drawer (ui/RecordDrawer): "Everything about it ›".
 *
 * It reads like the card, because it IS the card: the four parts of the loop
 * (lib/trialCard), numbered the same way in the same order the A4 prints
 * them, so the page and the PDF cannot disagree about what is on the record.
 *
 *   1 · WHAT WE PLANNED TO DO   what · which machine · when · what it passes on
 *   2 · WHAT ACTUALLY HAPPENED  what we ran · when it really was · the result
 *   3 · WHAT WE FOUND           the issues, with the photos and the video
 *   4 · WHAT WE DO NEXT         the fixes, each its own record, and the re-test
 *
 * Each part with boxes has one Edit, which opens them in place; part 4 is a
 * list of records, each opening in the drawer. Files, the meeting note, the
 * pin on the line, the PDF and Delete live at the foot — the one time in ten
 * they are wanted. There is no second page: the record's page
 * and its card page were two doors onto the same reading (Rowland, 5 October:
 * "too many doors opening just to get to very simple things"), and the old
 * /card link lands here.
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
import { DraftArea, DraftField } from '../ui/Draft';
import { EvidenceThumb, EvidenceViewer } from '../ui/Evidence';
import { useProject } from '../lib/useProjects';
import { usePrograms } from '../lib/usePrograms';
import { useTesting } from '../lib/useTesting';
import { deleteBlobs, getBlob, putBlob } from '../db';
import { uid } from '../lib/ids';
import { deliverBlob, deliverPdf, isStaleBuildError, loadPdfLib, reloadOntoNewBuild } from '../lib/savePdf';
import { trialCard, verdictLine, type CardFinding, type CardNext, type TrialCard } from '../lib/trialCard';
import { pdfFileName } from '../lib/fileName';
import {
  gateOf, live, plannedEnd, wordsOf, needsVerdict, outcomeWord, foundWords, itemsOf, testOfFix, verdictQuestion, standingOfItem,
  type DocRef, type ItemKind, type Outcome, type Test, type TestItem,
} from '../lib/testing';
import type { MediaRef } from '../types';
import { niceDay, todayISO } from '../lib/weeks';
import { offerUndo } from '../ui/Undo';
import { SayIt } from '../ui/RecordSay';
import { openRecord } from '../ui/RecordDrawer';
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
/** "9 Oct", or "5 Oct – 9 Oct" for a block of days. */
const window_ = (from?: string, to?: string): string => (!from ? '' : to && to > from ? `${nice(from)} – ${nice(to)}` : nice(from));

type TT = ReturnType<typeof useTesting>;
/** The parts of the card, each with its own Edit. */
type Part = 'plan' | 'day' | 'found';

/** The boxes that sit in "1 · What we planned" — a voice note filling one opens it. */
const PLAN_KEYS = ['title', 'machine', 'problem', 'withWhom', 'plannedFor'];

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
  /* Arriving to write a problem up (?problem=1): straight into part 3's boxes. */
  const writingProblem = useRoute().query.get('problem') === '1';
  /* WHICH PART IS OPEN FOR EDITING — one at a time, where it is read. */
  const [editing, setEditing] = useState<Part | null>(writingProblem ? 'found' : null);
  /* The boxes a voice note just filled — they glow for a moment so you can
     see where what you said went. */
  const [filled, setFilled] = useState<string[]>([]);
  /* "For the meeting", opened to write the first thing to raise. */
  const [meeting, setMeeting] = useState(false);
  /* A planned window waiting for its reason — see `redate` below. */
  const [moving, setMoving] = useState<Pick<Test, 'plannedFor' | 'plannedTo'> | null>(null);
  /* The PDF: built from this page's reading, delivered to the device first
     (lib/savePdf) — you read it before anybody else does. */
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  /* The 350KB of jsPDF is fetched when this page OPENS, not when the button
     is pressed — the rule savePdf.ts sets out. */
  useEffect(() => { void loadPdfLib().catch(() => { /* the button reports it */ }); }, []);

  if (loading || tt.loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  const test = tt.tests.find(t => t.id === testId);
  if (!project || !test) {
    /* A dead end is still a screen somebody is standing on. It says which one
       is gone, what is still there, and gives two ways out — a bare line of grey
       text reads as the app having broken rather than the test having been
       deleted. */
    return (
      <div className="wrap pace cm-screen">
        <section className="cmp-empty">
          <h2>That record isn’t here any more</h2>
          <p>
            The test, fix or step has been deleted, or the link is to one on a different project. Everything else on
            {project ? ` ${project.name}` : ' this project'} is still where it was.
          </p>
          <button className="btn btn-primary" onClick={() => nav(`/project/${projectId}/testing`)}>Back to the tests</button>
          <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => nav(`/project/${projectId}/fixes`)}>The fixes</button>
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

  /* THE CARD'S READING — the same call the PDF draws from (lib/trialCard). */
  const c: TrialCard = trialCard(test, tt.tests, tt.items, tt.assets);
  const found = itemsOf(tt.items, test.id, 'found');
  const notes = itemsOf(tt.items, test.id, 'note');
  /* The pictures the card carries: the record's own, then what was found. The
     page shows them and the PDF prints them, off this one list. */
  const media: MediaRef[] = [...(test.media ?? []), ...found.flatMap(i => i.media ?? [])];
  const program = programs.find(x => x.id === test.programId);
  /* The record above this one, and the ones that came out of it — the loop
     the card prints as "Where this sits", here with a door on each name. */
  const up = kind === 'fix' ? forTest : from && !from.deletedAt ? from : undefined;
  const ledTo = live(tt.tests).filter(t => t.fromTestId === test.id && (t.kind ?? 'test') !== 'fix');
  /* What came out of it, in the order the card lists them (lib/trialCard) —
     the same filter and sort, so row i on the page is row i on the paper and
     each one opens its record. */
  const nextRecs = live(tt.tests)
    .filter(t => ((t.kind ?? 'test') === 'fix' ? testOfFix(t, tt.tests)?.id === test.id : t.fromTestId === test.id))
    .sort((a, b) => (a.plannedFor ?? '').localeCompare(b.plannedFor ?? '') || a.sort - b.sort);
  const retest = kind === 'test' && (test.outcome === 'failed' || test.outcome === 'notRun');

  const send = async () => {
    if (busy) return;
    setBusy(true); setErr(null); setSaid(null);
    try {
      const { jsPDF } = await loadPdfLib();
      const { drawTrialCard } = await import('../lib/trialCardPdf');
      const { shotsFor, shotKey } = await import('../lib/testReport');
      const shots = await shotsFor(media.map(shotKey).filter((k): k is string => !!k));
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      drawTrialCard(pdf, c, { project: project.name, lead: project.lead, builtAt: Date.now(), shots });
      const when = c.ranOn ?? c.plannedFor;
      const how = await deliverPdf(pdf, pdfFileName(project.name, `${c.title} ${c.kind === 'fix' ? 'fix' : c.kind === 'install' ? 'step' : 'test'} card`, when ?? todayISO()), { brand: false }); // its band carries the mark
      setSaid(how === 'downloaded' ? 'Saved — open or send it from the bar below.' : 'Ready — open it from the bar below.');
    } catch (e) {
      console.error('Card failed', e);
      setErr(isStaleBuildError(e)
        ? 'This tab is still running an older version of the app, so the part that draws the PDF could not load.'
        : (e instanceof Error ? e.message : `The ${words.one.toLowerCase()} card could not be built.`));
    } finally { setBusy(false); }
  };

  /* ONE EDIT PER PART, where the part is read; pressed again, it folds. */
  const edit = (part: Part) => !ro && (
    <button type="button" className="cw-link tc-edit" aria-expanded={editing === part}
      onClick={() => setEditing(e => (e === part ? null : part))}>{editing === part ? 'Done' : 'Edit'}</button>
  );
  const one = words.one.toLowerCase();
  const noun = kind === 'install' ? 'step' : 'test';

  return (
    <div className="wrap pace cm-screen tc-screen">
      <header className="pace-head">
        <div className="pace-head-main">
          <h1 className="pace-title">{test.title}</h1>
          <p className="cw-handover">
            <b>{outcomeWord(test)}</b>
            {test.ranOn && <span className="sub">{nice(test.ranOn)}</span>}
          </p>
        </div>
      </header>
      <AccessNote can={can} owner={project.lead} />

      {/* SAY IT. One voice note fills this record's boxes AND adds what was
          found (ui/RecordSay). Shown first, put in only when you say so; the
          part it went into opens so you can see where. */}
      {can.edit && <SayIt test={test} tt={tt} can={can} onFilled={keys => {
        setFilled(keys);
        if (keys.some(k => PLAN_KEYS.includes(k))) setEditing('plan');
        else if (keys.includes('found')) setEditing('found');
        else if (keys.length) setEditing('day');
        window.setTimeout(() => setFilled([]), 4000);
        /* To the first box it went into — on a phone it is often below. */
        window.setTimeout(() => document.querySelector('.is-filled')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
      }} />}

      <div className={'tc-two' + (editing === 'plan' || editing === 'day' ? ' is-editing' : '')}>
        {/* 1 · THE PLAN — read as the card prints it; Edit opens its boxes. */}
        <Block n="1" title={words.plan} action={edit('plan')}>
          {editing !== 'plan' ? <>
            <Field label={words.expectation} text={c.passesIf} empty={words.noPlan} />
            {c.kind === 'test' && <Field label="Product we planned to run" text={c.plannedProduct} />}
            <div className="tc-fields">
              <Field label="Booked for" text={window_(c.plannedFor, c.plannedTo)} empty="No day set" />
              <Field label="Machine" text={c.machine} />
              <Field label={words.withWhom} text={c.withWhom} empty="nobody yet" />
              {programs.length > 0 && <Field label="Program" text={program ? `${program.what}${program.runs ? ` — ${program.runs}` : ''}` : ''} empty="Not about one" />}
            </div>
          </> : (
          <div className="tc-form">
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
            {/* WHICH PROGRAM, when it is about one. Offered only when the job
                HAS programs — an empty dropdown is a question with no answers. */}
            {programs.length > 0 && (
              <label className="cw-f"><span>Program</span>
                <select value={test.programId ?? ''} onChange={e => save({ programId: e.target.value || undefined })}>
                  <option value="">Not about one</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.what}{p.runs ? ` — ${p.runs}` : ''}</option>)}
                </select></label>
            )}
            {/* PLANNED FOR A DAY, OR FOR A BLOCK OF THEM. The second date is
                empty by default and empty means one day. */}
            <label className={'cw-f' + hl('plannedFor')}><span>Planned from</span>
              <DateInput value={moving?.plannedFor ?? test.plannedFor ?? ''} onCommit={v => redate({ plannedFor: v || undefined })} /></label>
            <label className="cw-f" title="Leave blank when it is one day"><span>Last day <span className="cw-f-opt">if more than one</span></span>
              <DateInput value={moving ? moving.plannedTo ?? '' : test.plannedTo ?? ''} min={test.plannedFor ?? undefined}
                onCommit={v => redate({ plannedTo: v || undefined })} /></label>
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
            <label className={'cw-f' + hl('withWhom')}><span>{words.withWhom}</span>
              <DraftField value={test.withWhom ?? ''} placeholder="Ilapak UK" onSave={v => save({ withWhom: v.trim() || undefined })} /></label>
            {/* A fix does not run a product down the machine, so the box is not
                offered — it is not hidden state, there is simply nothing to say. */}
            {kind === 'test' && (
              <label className="cw-f"><span>Product we plan to run</span>
                <DraftField value={test.planned ?? ''} placeholder="Jacks Piper 2kg" onSave={v => save({ planned: v.trim() || undefined })} /></label>
            )}
            <PassesIf key={test.id} test={test} can={can} label={words.expectation} glow={hl('problem')}
              onSave={v => save({ passesIf: v.trim() || undefined })} />
          </div>
          )}
        </Block>

        {/* 2 · THE DAY — the verdict line the card prints; Edit opens the boxes,
            the verdict and the camera. */}
        <Block n="2" title={words.day} action={edit('day')}>
          {editing !== 'day' ? <>
            {/* THE VERDICT IS ASKED FOR where it is read, not behind Edit: once
                the day or a result is on the record and nobody has said how it
                went, the question leads (lib/testing needsVerdict). */}
            {can.edit && needsVerdict(test) && <>
              <span className="tw-ask">{verdictQuestion(kind)}</span>
              <Verdict test={test} glow={hl('outcome')} onPick={setOutcome} />
            </>}
            <Field label={words.happened} text={verdictLine(c)} empty="Nothing written down yet" />
            {c.kind === 'test' && <Field label="Product we ran" text={c.product} />}
            <Field label="Ran on" text={window_(c.ranOn, c.ranTo)} empty="Not run yet" />
          </> : (
          <div className="tc-form">
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
            {/* THE VERDICT IS ASKED FOR once there is a day or a result on the
                record and nobody has said how it went — the answer is what
                every list and both documents turn on. */}
            {needsVerdict(test) && <span className="tw-ask">{verdictQuestion(kind)}</span>}
            <Verdict test={test} glow={hl('outcome')} onPick={setOutcome} />
            <Evidence media={test.media ?? []} onView={setViewing} kind={kind}
              onAdd={refs => tt.patchTest(test.id, cur => ({ media: [...(cur.media ?? []), ...refs] }))} />
          </div>
          )}
        </Block>
      </div>

      {/* 3 · WHAT WE FOUND — OBSERVATIONS, written down live. Whether any of
          them is a fix is a decision somebody makes afterwards. A fix has none
          of its own (it is the work, not the question); one made before that
          rule keeps what was written under it, read-only. */}
      <Block n="3" title={words.found} sub={found.length ? foundWords({ written: found.length }) : undefined}
        action={(kind !== 'fix' || found.length > 0) && edit('found')}>
        {editing !== 'found'
          ? <Found rows={c.findings} one={one} edit={can.edit && kind !== 'fix'} />
          : <Items kind="found" test={test} tt={tt} can={can} onView={setViewing} glow={filled.includes('found')} focus={writingProblem}
            placeholder={kind === 'install' ? 'What was the problem?' : 'What did you see?'}
            empty={kind === 'install'
              ? 'Write each problem on its own — add one, then the next. As many as there are.'
              : 'Nothing written down yet. This is the part that matters most.'} />}
      </Block>

      {/* 4 · WHAT WE DO NEXT — a list of RECORDS: each fix has its own days,
          its own findings and its own card, and each row opens it in the
          drawer, over this page. There is nothing to edit in place — a fix is
          made on the Fixes screen (with this one picked), and a re-test
          follows a run that did not prove it — so the two doors sit under the
          list rather than behind an Edit. */}
      <Block n="4" title="What we do next" sub={c.next.length ? `${c.openNext} of ${c.next.length} still open` : undefined}>
        <Next rows={c.next} one={one} edit={can.edit && kind !== 'fix'}
          onOpen={i => nextRecs[i] && openRecord(projectId, nextRecs[i].id)} />
        {can.edit && kind !== 'fix' && (
          <span className="tc-next-acts">
            <button type="button" className="cw-add" onClick={() => nav(`/project/${projectId}/fixes?for=${encodeURIComponent(test.id)}`)}>
              <span className="cw-add-p" aria-hidden><Icon name="plus" size={13} /></span> Add a fix for this {noun}
            </button>
            {/* It carries the machine, the product and the expectation forward,
                so the plan writes itself; the new test's page opens to plan it. */}
            {retest && (
              <button type="button" className="btn" onClick={() => void (async () => {
                const id = await tt.planNextFrom(test);
                nav(`/project/${projectId}/testing/${encodeURIComponent(id)}`);
              })()}>Plan the re-test</button>
            )}
          </span>
        )}
      </Block>

      {/* THE PICTURES — the same ones the A4 prints, in the same order. Only
          when there are any: an empty box for them is a box that says the
          test was not looked at. They are taken in part 2. */}
      {media.length > 0 && (
        <Block n="5" title={words.pictures} sub={`${media.length} on the ${one}`}>
          <div className="tw-ev-grid">
            {media.map(m => <EvidenceThumb key={m.id} media={m} size={84} onClick={() => setViewing(m)} />)}
          </div>
        </Block>
      )}

      {/* WHAT HAS BEEN SENT — the links to this record's pictures. Made from
          the picture itself (the viewer's "Share a link"); stopped from here. */}
      {mayShare && <SharedLinks key={shareRev} projectId={projectId} testId={test.id} />}

      {/* WHERE THIS SITS — the loop, read both ways. The same block the A4
          carries, and the reason a trial card is not an isolated page. It is
          the ONE door to the record above this one (a fix's test or step, a
          re-test's test) and to what came out of it: each name opens in the
          drawer, over this page. The header's "for “…”" link and the "Back to
          the test" button were two more doors to the same place. */}
      {(up || ledTo.length > 0) && (
        <section className="tc-loop">
          <span className="tc-f-l">Where this sits</span>
          <p className="tc-loop-t">
            {up && <>{kind === 'fix' ? 'For' : 'Follows'} <button type="button" className="cw-link tc-loop-a" onClick={() => openRecord(projectId, up.id)}>
              {up.kind === 'install' ? `${machineOf(up)} — ` : ''}{up.title}</button>. </>}
            {ledTo.length > 0
              ? <>Led to {ledTo.map((t, i) => <span key={t.id}><button type="button" className="cw-link tc-loop-a" onClick={() => openRecord(projectId, t.id)}>{t.title}</button>{i < ledTo.length - 1 ? ', ' : ''}</span>)}.</>
              : <span className="sub">Nothing has been planned out of it yet.</span>}
          </p>
        </section>
      )}

      {/* ===================== THE FOOT — the one time in ten ===================== */}
      <div className="tc-foot">
        {/* FILES and FOR THE MEETING are blocks once they hold something. Empty,
            each is one line to start it — not a box on every record with a
            paragraph explaining itself. */}
        {(test.docs ?? []).length > 0 && <Docs test={test} tt={tt} can={can} />}

        {/* FOR THE MEETING — what to raise about this one, written beforehand.
            The same list as every project note (the Notes screen), filed here. */}
        {(notes.length > 0 || meeting) && (
          <Block title="For the meeting" sub={notes.length ? (() => { const open = notes.filter(r => r.doneAt == null).length; return open ? `${open} to raise` : 'all raised'; })() : undefined}>
            <Items kind="note" test={test} tt={tt} can={can} onView={setViewing} focus={meeting && !notes.length}
              placeholder="Something to raise about this?"
              empty="Write it here so it isn’t forgotten at the next meeting." />
          </Block>
        )}

        {can.edit && ((test.docs ?? []).length === 0 || (!notes.length && !meeting)) && (
          <div className="tc-adds">
            {(test.docs ?? []).length === 0 && <Docs test={test} tt={tt} can={can} />}
            {!notes.length && !meeting && (
              <button type="button" className="cw-add" onClick={() => setMeeting(true)}>
                <span className="cw-add-p" aria-hidden><Icon name="plus" size={13} /></span> Something to raise at the meeting
              </button>
            )}
          </div>
        )}

        {/* WHERE IT IS ON THE LINE — a fix pinned on a frame of the filmed walk.
            A client sees the pin, without the controls that place or move it. */}
        {kind === 'fix' && (can.edit || test.pin) && (
          <section className="tc-block">
            <OnTheLine projectId={projectId} pin={test.pin} onSave={can.edit ? pin => save({ pin }) : undefined} />
          </section>
        )}

        {/* THE PDF — this page on one A4, saved to the device first so it is
            read before it is sent (lib/savePdf). The same drawing as before,
            built from the same reading (lib/trialCardPdf). */}
        <div className="tc-send is-foot">
          <button className="btn btn-primary" onClick={() => void send()} disabled={busy}>
            {busy ? 'Building…' : `${words.one} card — PDF`}
          </button>
          <span className="sub">A4, landscape — this page, on one sheet.</span>
          {said && <span className="tc-ok">{said}</span>}
        </div>
        {err && (
          <p className="sub tw-err">
            {err}{' '}
            {isStaleBuildError(err) && (
              <button className="cw-link" onClick={() => void reloadOntoNewBuild()}>Reload</button>
            )}
          </p>
        )}

        {/* DELETING SAYS WHICH THING IT IS DELETING, and counts what actually
            goes: the observations written under it. The fixes that came OUT of
            it are their own records now and survive. Only the owner deletes
            (lib/access) — the database keeps the record for anybody else, so
            the button is not offered to them. */}
        {can.remove && <div className="cm-foot">
          <button type="button" className="btn btn-ghost btn-sm cw-del" onClick={() => void (async () => {
            const cost = await tt.testCost(test.id);
            const out = tt.tests.filter(x => x.fromTestId === test.id && !x.deletedAt).length;
            const bits = [
              cost.found > 0 && `${cost.found} observation${cost.found === 1 ? '' : 's'} go${cost.found === 1 ? 'es' : ''} with it`,
              out > 0 && `${out} ${out === 1 ? 'record that came out of it stays' : 'records that came out of it stay'}`,
            ].filter(Boolean);
            const warn = bits.length
              ? `Delete “${test.title}”?\n\n${bits.join('. ')}. Deleting cannot be undone.`
              : `Delete “${test.title}”?`;
            if (confirm(warn)) {
              await tt.removeTest(test.id);
              nav(`/project/${projectId}/${kind === 'fix' ? 'fixes' : kind === 'install' ? GATE_PATH[gateOf(test)] : 'testing'}`);
            }
          })()}>Delete this {one}</button>
        </div>}
      </div>

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

/* ============================ the card's parts ============================ */

/** How it went, in the face's own words — the four answers, one pressed. */
function Verdict({ test, glow, onPick }: { test: Test; glow: string; onPick: (o: Outcome) => void }) {
  const kind = test.kind ?? 'test';
  return (
    <span className={'tw-seg' + (needsVerdict(test) ? ' is-asking' : '') + glow}>
      {(['passed', 'failed', 'notRun', 'planned'] as const).map(o => (
        <button key={o} type="button" className={'tw-seg-b is-' + o + (test.outcome === o ? ' on' : '')}
          aria-pressed={test.outcome === o} onClick={() => onPick(o)}>
          {o === 'planned' ? (needsVerdict(test) ? 'No verdict yet' : 'Still planned') : outcomeWord({ kind, outcome: o })}
        </button>
      ))}
    </span>
  );
}

/** A numbered part, the same four the A4 carries and in the same order — with
 *  room on the right for its one Edit. Without a number, a block at the foot. */
function Block({ n, title, sub, action, children }: {
  n?: string; title: string; sub?: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="tc-block">
      <div className="tc-block-h">
        {n && <span className="tc-n">{n}</span>}
        <h2 className="tc-title">{title}</h2>
        {sub && <span className="sub">{sub}</span>}
        {action}
      </div>
      {children}
    </section>
  );
}

/** A labelled piece of prose. An empty one says so rather than printing a
 *  blank, because a blank reads as a bug and "nothing agreed in advance" is a
 *  fact about the trial. */
function Field({ label, text, empty = '—' }: { label: string; text?: string; empty?: string }) {
  const body = (text ?? '').trim();
  return (
    <div className="tc-f">
      <span className="tc-f-l">{label}</span>
      <p className={'tc-f-t' + (body ? '' : ' is-none')}>{body || empty}</p>
    </div>
  );
}

function Found({ rows, one, edit }: { rows: CardFinding[]; one: string; edit: boolean }) {
  if (rows.length === 0) return <p className="sub tc-empty">Nothing was written down on this {one}.{edit && ' Edit to add what you saw.'}</p>;
  return (
    <ol className="tc-list">
      {rows.map((f, i) => (
        <li key={i} className="tc-row">
          <span className="tc-row-n">{i + 1}</span>
          <div className="tc-row-b">
            <p className="tc-row-t">{f.what}</p>
            <p className="tc-row-m sub">
              {f.decision && <span className={'tc-tag is-' + f.decision.replace(/\s+/g, '-')}>{f.decision}</span>}
              {f.owner && <span>{f.owner}</span>}
              {f.photos > 0 && <span>{f.photos} photo{f.photos === 1 ? '' : 's'}</span>}
            </p>
            {f.action && <p className="tc-row-a">→ {f.action}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Next({ rows, one, edit, onOpen }: { rows: CardNext[]; one: string; edit: boolean; onOpen: (i: number) => void }) {
  if (rows.length === 0) return <p className="sub tc-empty">Nothing has been agreed out of this {one} yet{edit ? ' — add a fix for it below' : ''}.</p>;
  return (
    <ol className="tc-list">
      {rows.map((n, i) => (
        <li key={i} className={'tc-row is-door' + (n.done ? ' is-done' : '')}>
          <span className="tc-row-n">{n.done ? <Icon name="check" size="1em" /> : i + 1}</span>
          <div className="tc-row-b">
            <button type="button" className="tc-row-t tc-row-go" onClick={() => onOpen(i)}>{n.what} ›</button>
            <p className="tc-row-m sub">
              {n.owner ? <span>{n.owner}</span> : <span className="is-none">nobody yet</span>}
              {n.due ? <span>by {nice(n.due)}</span> : <span className="is-none">no date</span>}
              {n.fromFinding && <span>out of an observation</span>}
              {n.becameTest && <span>became the next test</span>}
            </p>
          </div>
        </li>
      ))}
    </ol>
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
        <Field label={label} text={test.passesIf} />
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

/** What we found, or what to raise at the meeting, open for editing: the rows
 *  with their boxes, and the one line that adds another. One component,
 *  because they are the same shape. */
function Items({ kind, test, tt, can, placeholder, empty, onView, glow, focus }: {
  kind: ItemKind; test: Test; tt: TT; can: Can; placeholder: string; empty: string;
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

  return (
    <div className={'tc-items is-' + kind + (glow ? ' is-filled' : '')}>
      {rows.length === 0 && <p className="sub tc-empty">{can.edit ? empty : 'Nothing written down.'}</p>}
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
     somebody decides: it needs doing (it becomes a fix), or it needs nothing.
     A next step is the ordinary open/done row it always was. */
  const observation = item.kind === 'found';

  /* AN OBSERVATION IS A NOTE — no tick. Ticking one used to make a fix in
     one tap, with no confirm; Rowland: "me putting in what did we find and
     then sending it tick to fix is the messy part." */
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
          {/* The record it became names which — more useful than the bare word. */}
          {item.becameTestId && (() => {
            const became = tt.tests.find(t => t.id === item.becameTestId && !t.deletedAt);
            return became ? ` · fix: ${became.title}` : '';
          })()}
          {/* SAID ON PAPER, SO SAID HERE. */}
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
  const attach = can.edit && <>
    <button type="button" className="cw-add" onClick={() => pick.current?.click()}>
      <span className="cw-add-p" aria-hidden><Icon name="plus" size={13} /></span> Attach a PDF
    </button>
    <input ref={pick} type="file" accept="application/pdf,image/*" multiple hidden
      onChange={e => { void take(e.target.files); e.target.value = ''; }} />
  </>;
  /* Nothing attached yet: the one line that attaches the first. */
  if (docs.length === 0) return <>{err && <p className="sub is-r" role="alert">{err}</p>}{attach}</>;

  return (
    <Block title="Files" sub={docs.length ? `${docs.length}` : undefined}>
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
      {attach}
    </Block>
  );
}
