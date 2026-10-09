/* THE DRAWER — one door onto a record, opened where you are.
 *
 * Rowland, 5 October: "I found myself looking at a fix… then I found myself on
 * a page, then another page and then another page. Too many doors opening
 * just to get to very simple things."
 *
 * A step, a test and a fix are one record (lib/testing, kind install · test ·
 * fix). Each had four doors — the square on Install, the row on the plan, its
 * own page and its card page — and a fix's page had two doors to the same
 * parent. Now every list opens the record HERE, over the page you are on: on
 * a laptop a panel from the right, on a phone the sheet from the bottom that
 * the stage's sheet already was. × takes you back to where you were. "For
 * <parent> ›" opens the parent in the same drawer, with a way back to the
 * fix. It is the record's one home (docs/DOORS.md): one Edit for every box
 * (ui/RecordEdit), and at its foot what the record's own page used to add —
 * files, what to raise at the meeting, the card PDF (ui/RecordMore).
 *
 * THE URL CARRIES IT: ?open=<id> on the route you are on (state/useRoute
 * withQuery), so it survives a reload, the phone's back button closes it, and
 * nothing ever changes the path to open a record. On the control room, which
 * has no job in its path, &job=<projectId> says whose it is.
 *
 * Nothing new is stored and no document changes: the drawer reads lib/story,
 * lib/install and lib/fixTone and writes through the same calls the sheets
 * did (ui/WhyMoved changeTests · moveTestsWithWhy · recordProblem).
 */
import { useEffect, useRef, useState } from 'react';
import { nav, navReplace, withQuery, type Route, type RouteName } from '../state/useRoute';
import { useTesting } from '../lib/useTesting';
import { useAccess } from '../cloud/access';
import { fixTone, type FixTone } from '../lib/fixTone';
import { doneLateBy, doneTodayPatch, heldUpBy, isSignOff, lateByWords, lateOrProblem, toneOf, usualStages, type StepTone } from '../lib/install';
import { usePrograms } from '../lib/usePrograms';
import {
  isOverdue, itemsOf, live, needsVerdict, outcomeWord, plannedEnd, testOfFix, verdictQuestion, wordsOf,
  gateOf, type Outcome, type Test, type TestItem,
} from '../lib/testing';
import { daysBetween, niceDay, todayISO } from '../lib/weeks';
import type { MediaRef } from '../types';
import { Icon } from './Icon';
import { DrawerShell } from './DrawerShell';
import { StageStory, storyLength } from './StageStory';
import { PartsMark, StageParts } from './StageParts';
import { ProgramLink } from './ProgramLink';
import { planOn, TODAY_KIND } from '../lib/huddle';
import { uid } from '../lib/ids';
import { criticalCount, criticalOn, fixFlag, riskOn } from '../lib/critical';
import { CriticalTag } from './CriticalFields';
import { partsOf, partsSaid } from '../lib/noted';
import { Evidence } from './EvidenceDoors';
import { EvidenceThumb, EvidenceViewer, pinsOnJob } from './Evidence';
import { spanShort } from './InstallGrid';
import { ProblemForm, changeTests, recordMove, recordProblem, type ProblemFill } from './WhyMoved';
import { RecordEdit } from './RecordEdit';
import { hasKept } from '../lib/kept';
import { CardPdf, RecordFiles, RecordItems, removeMedia } from './RecordMore';
import { OnTheLine } from './OnTheLine';
import { SharedLinks } from './ShareLink';
import { supabase } from '../cloud/client';
import { useSession } from '../cloud/session';
import { movedLater, storyOf } from '../lib/story';
import { useProjects } from '../lib/useProjects';
import { dayLength } from '../lib/hoursLost';
import { isRunTest, productName, productRuns, runsUnderWay } from '../lib/run';
import { problemsOnRun } from '../lib/programRun';
import { RunBlock } from './RunPanel';
import { offerUndo } from './Undo';
import { ProblemRecord, problemOf } from './ProblemRecord';

/* ---------------- opening and closing: the URL carries it ---------------- */

const OPEN = 'open';
const JOB = 'job';
/** A part of the stage to open "Hit a problem" on (openRecordAt). */
const PROBLEM = 'problem';

/** The routes a record can be opened over. The fishbone's own ?open=1 (a new
 *  problem) is not one of ours, so the 6M surfaces are left alone. A frame of
 *  the filmed walk ('asset') opens the fixes pinned on it, with &job=. */
const RECORD_ROUTES = new Set<RouteName>([
  'home', 'projectDashboard', 'projectSetup', 'fixes', 'install', 'gateSetup', 'handover', 'day',
  /* The plan, since it became a page of its own: "Tap a row to open it" set
     ?open= and nothing opened. */
  'plan', 'testing', 'test', 'trialCard', 'notes', 'materials', 'programs', 'clientReport', 'asset',
  /* The Snags page: a snag moved to a job opens what it became over it. */
  'quickSnags',
]);

const split = (): [string, URLSearchParams] => {
  const [path, q] = window.location.hash.slice(1).split('?');
  return [path || '/', new URLSearchParams(q ?? '')];
};

/** The hash that opens a record over the page you are on. */
function recordHref(projectId: string, id: string): string {
  const [path, params] = split();
  params.set(OPEN, id);
  if (path.startsWith(`/project/${projectId}/`) || path === `/project/${projectId}`) params.delete(JOB);
  else params.set(JOB, projectId);
  return `${path}?${params.toString()}`;
}

/* How many of our own history entries sit under the drawer: × goes back
   through them, so the phone's back button and × are the same move and
   closing never leaves a dead entry to step over. Reset whenever the drawer
   is found shut by any other route (the back button itself, a link out). */
let pushed = 0;

/** Open a record in the drawer, over the page you are on. */
export function openRecord(projectId: string, id: string): void {
  pushed++;
  nav(recordHref(projectId, id));
}

/** Open a stage with "Hit a problem" already open on one of its parts — the
 *  Programs page's own button (screens/ProgramsPage): the same write-up the
 *  stage gives, without hunting for the part in the drawer. */
export function openRecordAt(projectId: string, id: string, problemOn: string): void {
  pushed++;
  const href = recordHref(projectId, id);
  nav(`${href}&${PROBLEM}=${encodeURIComponent(problemOn)}`);
}

/** Show another record in the drawer already open — the parent of a fix, a
 *  fix under a stage — without adding to the trail the back button walks. */
export function openRecordInPlace(id: string): void {
  withQuery(OPEN, id, true);
}

export function closeRecord(): void {
  if (pushed > 0) { pushed = 0; history.back(); return; }
  /* Reached by a link or a reload: nothing of ours to go back to. */
  const [path, params] = split();
  params.delete(OPEN); params.delete(JOB); params.delete(PROBLEM);
  const qs = params.toString();
  navReplace(qs ? `${path}?${qs}` : path);
}

/** Mounted once, beside the router: draws the drawer whenever the route says
 *  a record is open, and keeps the trail "For <parent> ›" walks back along. */
export function RecordDrawerHost({ route }: { route: Route }) {
  const id = RECORD_ROUTES.has(route.name) ? route.query.get(OPEN) : null;
  const projectId = route.query.get(JOB) ?? (route.name === 'home' ? undefined : route.id);
  const [trail, setTrail] = useState<string[]>([]);
  useEffect(() => { if (!id) { pushed = 0; setTrail([]); } }, [id]);
  if (!id || !projectId) return null;
  return (
    <RecordDrawer projectId={projectId} id={id} trail={trail}
      onOpen={next => { setTrail(t => [...t, id]); openRecordInPlace(next); }}
      onBack={() => { const back = trail[trail.length - 1]; setTrail(t => t.slice(0, -1)); if (back) openRecordInPlace(back); }}
      onClose={closeRecord} />
  );
}

/* ------------------------------- the shell ------------------------------- */

export { DrawerShell };

/* ------------------------------- the record ------------------------------ */

type Tone = 'r' | 'a' | 'w' | 'g' | 'n';
const FIX_TONE: Record<FixTone, Tone> = { done: 'g', late: 'r', soon: 'a', ahead: 'w', notRun: 'n' };
const STEP_TONE: Record<StepTone, Tone> = { done: 'g', problem: 'r', asking: 'a', late: 'r', ahead: 'w' };
const short = (iso?: string) => (iso ? niceDay(iso) : '');

/** WHERE A STAGE STANDS, in words — the line the stage's sheet led with, so
 *  a step pressed by mistake says what it is before offering to put it back. */
export function stepStateWord(t: Test, late: boolean, lateBy = 0): string {
  /* Done after its first planned finish says so (lib/install doneLateBy). */
  return t.outcome === 'passed' ? `Done${t.ranOn ? ` ${short(t.ranOn)}` : ''}${lateBy ? ` · ${lateByWords(lateBy)}` : ''}`
    : t.outcome === 'failed' ? `Hit a problem${t.ranOn ? ` ${short(t.ranOn)}` : ''}${late ? ' · late' : ''}`
      : t.outcome === 'notRun' ? 'Did not happen'
        : t.outcome === 'planned' && t.ranOn ? 'Worked on — not called yet'
          /* Late because a problem pushed its finish later — the day is still
             ahead, so it says where it moved to, not "was". */
          : late ? ((plannedEnd(t) ?? '') >= todayISO() ? `Late · moved to ${short(plannedEnd(t))}` : `Late · was ${short(plannedEnd(t))}`) : 'Not done yet';
}
const backWord = (t: Test): string => t.outcome === 'passed' ? 'Not done after all — put it back'
  : t.outcome === 'failed' ? 'Not a problem after all — put it back'
    : 'Put it back to planned';

/** The state line, one rule per face: lib/fixTone for a fix, the stage
 *  sheet's words for a step, the verdict for a test. The colour is the
 *  app's five (CLAUDE.md, visual management) and the words carry it too. */
function stateOf(t: Test, today: string, items: TestItem[] = []): { word: string; tone: Tone } {
  const kind = t.kind ?? 'test';
  if (kind === 'fix') {
    const f = fixTone(t, today);
    /* No date agreed is not started — grey, as on the Fixes list. */
    return { word: f.when, tone: f.tone === 'ahead' && !plannedEnd(t) ? 'n' : FIX_TONE[f.tone] };
  }
  if (kind === 'install') {
    const st = toneOf(t, today);
    /* Late by the one rule (lib/install lateOrProblem) — its day gone, hours
       lost, or its finish moved later by a problem. */
    const late = st !== 'done' && (isOverdue(t, today) || lateOrProblem(t, items, today) === 'late');
    /* Late is red whatever the square's own tone — a stage a problem pushed
       later is late (lib/install lateOrProblem), never the indigo of "ahead". */
    const tone = late && st === 'ahead' ? 'r' : st === 'ahead' && !t.plannedFor ? 'n' : STEP_TONE[st];
    return { word: stepStateWord(t, late, doneLateBy(t, items)), tone };
  }
  if (t.outcome === 'passed') return { word: `${outcomeWord(t)}${t.ranOn ? ` · ${short(t.ranOn)}` : ''}`, tone: 'g' };
  if (t.outcome === 'failed' || t.outcome === 'notRun') return { word: `${outcomeWord(t)}${t.ranOn ? ` · ${short(t.ranOn)}` : ''}`, tone: 'r' };
  if (needsVerdict(t)) return { word: `${outcomeWord(t)}${t.ranOn ? ` · ran ${short(t.ranOn)}` : ''}`, tone: 'a' };
  if (isOverdue(t, today)) return { word: `Late · was ${spanShort(t.plannedFor, plannedEnd(t))}`, tone: 'r' };
  /* A performance run part-way through its products (lib/run). */
  if (runsUnderWay(t)) return { word: `Under way${t.plannedFor ? ` · due ${short(plannedEnd(t) as string)}` : ''}`, tone: 'w' };
  return t.plannedFor ? { word: `Planned ${spanShort(t.plannedFor, plannedEnd(t))}`, tone: 'w' } : { word: 'No day yet', tone: 'n' };
}

export function RecordDrawer({ projectId, id, trail, onOpen, onBack, onClose }: {
  projectId: string; id: string;
  /** The records opened before this one in the same drawer — "‹ back to …". */
  trail: string[];
  onOpen: (id: string) => void; onBack: () => void; onClose: () => void;
}) {
  const tt = useTesting(projectId);
  const can = useAccess(projectId);
  /* The job, for how many hours make its working day (lib/hoursLost). */
  const jobs = useProjects();
  const job = jobs.projects.find(p => p.id === projectId);
  /* What a sign-off says was still open includes the machine's programs
     (lib/install doneTodayPatch). */
  const progs = usePrograms(projectId);
  const today = todayISO();
  /* A problem being written, or an Edit, left unsaved (lib/kept) opens
     again with what was typed. */
  const [problem, setProblem] = useState<boolean | ProblemFill>(() => hasKept(`problem:${id}::`));
  /* The part of the plan — or the product on a performance run — a problem is
     being written on, when it is one. A product's problem does not fail the
     whole run: one product out of five is not the test. */
  const [problemPart, setProblemPart] = useState<{ id: string; what: string; product?: boolean } | null>(null);
  const top = useRef<HTMLDivElement>(null);
  /* EDIT — the one door to change it (ui/RecordEdit, docs/DOORS.md). */
  const [editing, setEditing] = useState(() => hasKept(`edit:${id}:`));
  /* "For the meeting", opened to write the first thing to raise. */
  const [meeting, setMeeting] = useState(false);
  /* WHO SIGNED — asked when a sign-off with no name on it is ticked
     (docs/HANDOVER.md); null while not asking. */
  const [signer, setSigner] = useState<string | null>(null);
  /* Bumped when a link to a picture is made, so the list of them reads again. */
  const [shareRev, setShareRev] = useState(0);
  /* SENDING A PICTURE OUTSIDE is the owner's call (supabase/SHARE_LINKS.sql),
     and only means anything with the cloud there to serve the link. */
  const { session } = useSession();
  const [viewing, setViewing] = useState<MediaRef | null>(null);
  /* A fresh record, fresh forms: the problem form of one step must not stay
     open over the parent it opened. */
  useEffect(() => { setProblem(hasKept(`problem:${id}::`)); setProblemPart(null); setEditing(hasKept(`edit:${id}:`)); setMeeting(false); setSigner(null); }, [id]);
  /* Opened with a part named (openRecordAt): its problem form, open. */
  useEffect(() => {
    const want = split()[1].get(PROBLEM);
    if (!want) return;
    const part = live(tt.items).find(i => i.id === want && i.testId === id && i.kind === 'next');
    const rec = live(tt.tests).find(x => x.id === id);
    const run = !part && rec ? productRuns(rec).find(r => r.id === want) : undefined;
    if (!part && !run) return;
    setProblemPart(part ?? (run ? { id: run.id, what: productName(run), product: true } : null)); setProblem(true);
    withQuery(PROBLEM, null, true);
  }, [id, tt.items, tt.tests]);

  const t = live(tt.tests).find(x => x.id === id);
  /* Back to the record this one was opened from — a stage, a test, a fix, or
     a problem (ui/ProblemRecord). */
  const fromId = trail.length ? trail[trail.length - 1] : undefined;
  const from = fromId ? live(tt.tests).find(x => x.id === fromId) ?? (p => (p ? { title: p.what } : undefined))(problemOf(fromId, tt.items)) : undefined;
  const label = t?.title ?? 'The record';

  if (tt.loading) return <DrawerShell label={label} onClose={onClose}><p className="sub">Loading…</p></DrawerShell>;
  /* A PROBLEM, opened as itself (docs/DOORS.md) — from the Fixes page, a
     stage's story, a program, a run, the front page. */
  const asProblem = !t ? problemOf(id, tt.items) : undefined;
  if (asProblem) {
    return (
      <DrawerShell label={asProblem.what} onClose={onClose}>
        {from && (
          <button type="button" className="rd-back" onClick={onBack}>
            <Icon name="chevronLeft" size="1.1em" /> back to {from.title}
          </button>
        )}
        <ProblemRecord item={asProblem} tt={tt} can={can} onOpen={onOpen}
          day={dayLength(job)} onDay={h => { if (job) void jobs.rename(job, { dayHours: h }); }} />
      </DrawerShell>
    );
  }
  if (!t) {
    return (
      <DrawerShell label="Not here any more" onClose={onClose}>
        <h2 className="rd-title">That record isn’t here any more</h2>
        <p className="sub">It has been deleted, or the link is to one on a different job.</p>
      </DrawerShell>
    );
  }

  const kind = t.kind ?? 'test';
  const machine = tt.assets.find(a => a.id === t.assetId)?.name ?? 'The line itself';
  const { word, tone } = stateOf(t, today, live(tt.items));
  const parts = kind !== 'fix' ? partsSaid(partsOf(t.id, tt.items), today) : undefined;
  /* The stage before it, in the job's own stage order, when that is what made
     this one late (lib/install heldUpBy). */
  const order = usualStages(job, jobs.projects, gateOf(t)).stages;
  const held = kind === 'install' ? heldUpBy(t, tt.tests, live(tt.items), today, order) : undefined;
  /* …and from the other end: the stages ITS lost time held up. */
  const heldUp = kind === 'install'
    ? live(tt.tests).filter(x => x.kind === 'install' && x.id !== t.id && (x.assetId ?? '') === (t.assetId ?? '') && gateOf(x) === gateOf(t)
      && heldUpBy(x, tt.tests, live(tt.items), today, order)?.by.id === t.id)
    : [];
  const crits = kind !== 'fix' ? criticalOn(t.id, tt.items, tt.tests).length : 0;
  const risks = kind !== 'fix' ? riskOn(t.id, tt.items, tt.tests).length : 0;
  /* A fix flagged critical or high risk — on its problem (lib/critical fixFlag). */
  const fflag = kind === 'fix' ? fixFlag(t.id, tt.items).flag : undefined;
  /* The parent: a fix is FOR a test or a step; a test may follow another. */
  const parent = kind === 'fix' ? testOfFix(t, tt.tests) : t.fromTestId ? live(tt.tests).find(x => x.id === t.fromTestId) : undefined;
  const parentMachine = parent ? tt.assets.find(a => a.id === parent.assetId)?.name : undefined;
  /* THE PROBLEM A FIX CAME FROM, with the picture taken with it — kept on the
     thing found on the stage, not on the fix (lib/story). */
  const problems = kind === 'fix' ? live(tt.items).filter(i => i.kind === 'found' && i.becameTestId === t.id) : [];
  const problemText = kind === 'fix' && !problems.length && t.passesIf && t.passesIf.trim() !== t.title.trim() ? t.passesIf : undefined;
  /* The re-tests it led to, its files and what to raise at the meeting. */
  const ledTo = kind === 'test' ? live(tt.tests).filter(x => x.fromTestId === t.id && (x.kind ?? 'test') !== 'fix') : [];
  const docs = t.docs ?? [];
  const notes = itemsOf(tt.items, t.id, 'note');
  const mayShare = can.people && !!supabase && !!session;
  /* Everyone named anywhere on the job, for the "who" box. */
  const names = [...new Set([
    ...live(tt.tests).map(x => x.withWhom?.trim()),
    ...live(tt.assets).map(a => a.oem?.trim()),
  ].filter((x): x is string => !!x))].sort();

  /* Saying how it went stamps today, unless a day is already on it. A STEP
     put back to planned loses its day too, as the square's sheet always did —
     "worked on" is a day on a step that is still planned, so keeping it would
     leave the step half-done and the put-back button with it. A test or a
     fix keeps the day it ran (the record's page always did). */
  const setOutcome = (o: Outcome, said: string) =>
    changeTests(tt, [t], cur => ({ outcome: o, ranOn: o === 'planned' ? (kind === 'install' ? undefined : cur.ranOn) : cur.ranOn ?? today }), said);
  const andClose = (p: Promise<void>) => { void p; onClose(); };
  /* DONE TODAY — the one write (lib/install doneTodayPatch): a sign-off
     keeps what was still open on its machine, and who signed it. */
  const doneToday = (who?: string) => changeTests(tt, [t],
    doneTodayPatch(t, { tests: tt.tests, items: tt.items, assets: tt.assets, programs: progs.programs }, today, who), `${t.title} done — ${machine}`);

  const dates = plannedEnd(t) ? spanShort(t.plannedFor, plannedEnd(t)) : undefined;
  /* HOW FAR IT HAS SLIPPED past the finish first planned — the line the plan's
     panel led with (lib/story keeps the first finish). */
  const story = storyOf(t.id, tt.tests, tt.items);
  const first = story.original;
  const moves = story.moves;
  const lastMove = moves[moves.length - 1];
  /* What it is: which kind, which gate, which machine — in words. */
  /* Its name as Needs you and its card say it — "Hand-over item", "Set-up
     step" — not a third word ("Hand over stage") for the same line. */
  const whatItIs = [kind === 'install' ? wordsOf(t).one : kind === 'fix' ? 'Fix' : 'Test · Commission', machine].join(' · ');
  /* What really happened, against the plan beside it. */
  const actualWords = !t.ranOn ? 'not done yet'
    : `${t.outcome === 'passed' ? (kind === 'fix' ? 'fixed' : kind === 'install' ? 'done' : 'passed')
      : t.outcome === 'failed' ? (kind === 'install' ? 'hit a problem' : kind === 'fix' ? 'didn’t fix it' : 'didn’t pass')
        : t.outcome === 'notRun' ? 'didn’t happen' : 'worked on'} ${short(t.ranOn)}`;
  const slip = first && plannedEnd(t) ? daysBetween(first, plannedEnd(t) as string) : 0;

  return (
    <DrawerShell label={label} onClose={onClose}>
      {from && (
        <button type="button" className="rd-back" onClick={onBack}>
          <Icon name="chevronLeft" size="1.1em" /> back to {from.title}
        </button>
      )}
      {/* ITS PARTS, beside its state — "2 parts · 1 done", and "· 1 late" in
          red when one is (lib/noted partsSaid): the branch, seen before the
          list. Said here once; the list's heading no longer counts them. */}
      {parts || crits || risks || fflag ? (
        <span className="rd-state-row">
          <span className={'rd-state is-' + tone}>{word}</span>
          <PartsMark said={parts} />
          {/* A CRITICAL PROBLEM ON IT, said beside its state (lib/critical). */}
          {crits > 0 && <span className="crit-tag">{criticalCount(crits)}</span>}
          {risks > 0 && <span className="crit-tag is-risk">{risks} high risk</span>}
          {fflag && <CriticalTag sorted={t.outcome === 'passed'} risk={fflag === 'risk'} />}
        </span>
      ) : <span className={'rd-state is-' + tone}>{word}</span>}
      <h2 className="rd-title">{t.title}</h2>
      {/* WHY IT RAN LATE, when it was not its own doing (lib/install heldUpBy):
          the stage before it on this machine lost the time. One tap opens it. */}
      {held && (
        <button type="button" className="rd-link rd-held" onClick={() => onOpen(held.by.id)}>
          Held up by <b>{held.by.title}</b> — {held.why} ›
        </button>
      )}
      {heldUp.map(x => {
        const by = doneLateBy(x, live(tt.items));
        return (
          <button key={x.id} type="button" className="rd-link rd-held" onClick={() => onOpen(x.id)}>
            Its lost time held up <b>{x.title}</b>{by ? ` — ${lateByWords(by)}` : ' — late'} ›
          </button>
        );
      })}
      {/* THE FIVE LINES (docs/SIMPLE.md) — whatever is tapped answers the
          same questions in the same order, before any button. Rowland, 7
          October: "if I click on something, what is it? Was it part of the
          plan? Planned? Was it done? Changed the dates? Who?" The state is the
          badge above, in words; these are the rest. Changing any of them is
          one Edit, under them with the floor's actions (ui/RecordEdit). */}
      <dl className="rd-facts">
        <div><dt>What</dt><dd>{whatItIs}</dd></div>
        <div><dt>{kind === 'fix' ? 'Agreed' : 'Planned'}</dt><dd>
          {dates ?? <i className="sub">{kind === 'fix' ? 'no date agreed yet' : 'no day yet'}</i>}
          {slip > 0 && <em className="rd-slip"> · first planned {short(first)}</em>}
          <span className="rd-arrow"> → </span>
          <span className={t.ranOn ? '' : 'sub'}>{actualWords}</span>
        </dd></div>
        <div><dt>Who</dt><dd>{t.withWhom || <i className="sub">nobody named</i>}</dd></div>
        {/* WHAT WAS AGREED — what the result is measured against ("passes if",
            "done means"); a fix's is its problem, said under "The problem". */}
        {kind !== 'fix' && t.passesIf?.trim() && <div><dt>{kind === 'install' ? 'Done means' : 'Passes if'}</dt><dd className="rd-said">{t.passesIf}</dd></div>}
        <div><dt>Changed</dt><dd>{lastMove
          ? <>moved {short(lastMove.from)} → {short(lastMove.to)}{lastMove.why ? `: ${lastMove.why}` : ''}{moves.length > 1 && <span className="sub"> · {moves.length - 1} earlier move{moves.length > 2 ? 's' : ''} below</span>}</>
          : <span className="sub">not moved</span>}</dd></div>
        {/* What was done, in its own words — written in Edit or said. */}
        {t.result?.trim() && <div><dt>{wordsOf(t).happened}</dt><dd className="rd-said">{t.result}</dd></div>}
      </dl>
      {/* THE RUN (ui/RunPanel) — a performance run's numbers, first: how fast
          it ran, what it netted, the rejects, against what was agreed. */}
      {kind === 'test' && isRunTest(t) && <RunBlock key={'run-' + t.id} t={t} can={can} patch={fn => void tt.patchTest(t.id, fn)}
        problemsOf={rid => problemsOnRun(tt.items, t.id, rid)} onOpenProblem={onOpen}
        onProblem={can.edit ? r => { setProblemPart({ id: r.id, what: productName(r), product: true }); setProblem(true); top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } : undefined} />}

      <div ref={top} aria-hidden />
      {/* THE FLOOR'S ACTIONS, first — the same buttons the square's sheet and
          the record's page had, in the face's own words — and the one Edit
          beside them: dates, who, the day it was done, what was done, and
          "Say it" for all of them (docs/DOORS.md). A client reads. */}
      {can.edit && (problem ? (
        /* HIT A PROBLEM, answered here: what, the pictures, whether it pushes
           the finish and to when, a fix. The plan hears all of it. */
        <ProblemForm key={`problem:${t.id}:${problemPart?.id ?? ''}`} keep={`problem:${t.id}:${problemPart?.id ?? ''}:`}
          step={t} tests={tt.tests} items={tt.items} assets={tt.assets} initial={typeof problem === 'object' ? problem : undefined}
          on={problemPart?.what} onCancel={() => { setProblem(false); setProblemPart(null); }}
          day={dayLength(job)} onDay={h => { if (job) void jobs.rename(job, { dayHours: h }); }}
          onSave={a => {
            if (problemPart?.product) {
              /* ON ONE PRODUCT'S RUN — written, its fix booked if one was, the
                 run's verdict left to its numbers. */
              const said = `${problemPart.what} (${t.title}) hit a problem${a.fix ? ', fix booked' : ''}`;
              andClose(recordMove(tt, [{ step: t }], { ...a, partId: problemPart.id }).then(back => offerUndo(said, back)));
            } else {
              andClose(recordProblem(tt, t, { ...a, ...(problemPart ? { partId: problemPart.id } : {}) },
                `${problemPart ? `${problemPart.what} (${t.title})` : t.title} hit a problem${a.to && movedLater(plannedEnd(t), a.to) ? ` — finish now ${short(a.to)}` : ''}${a.fix ? ', fix booked' : ''}`,
                /* A test's verdict is its own — "didn't pass" is said above. */
                { keepOutcome: kind === 'test' }));
            }
            setProblem(false); setProblemPart(null);
          }} />
      ) : editing ? (
        <RecordEdit key={'edit-' + t.id} t={t} tt={tt} can={can} names={names} onClose={() => setEditing(false)}
          onProblem={f => { setEditing(false); setProblem(f); }} />
      ) : kind === 'install' ? (
        <>
          <div className="rd-acts">
            {t.outcome !== 'passed' && (signer == null ? (
              <button type="button" className="btn btn-primary"
                onClick={() => (isSignOff(t) && !t.withWhom?.trim() ? setSigner('') : andClose(doneToday()))}>Done today</button>
            ) : (
              /* A SIGN-OFF WITH NO NAME ON IT asks who signed, so the line
                 says who accepted it as well as what. */
              <span className="rd-signer">
                <input className="text-input" autoFocus aria-label="Who signed it off?" placeholder="Who signed it off?"
                  value={signer} onChange={e => setSigner(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && signer.trim()) andClose(doneToday(signer)); }} />
                <button type="button" className="btn btn-primary" disabled={!signer.trim()} onClick={() => andClose(doneToday(signer))}>Signed off today</button>
                <button type="button" className="btn btn-ghost" onClick={() => setSigner(null)}>Cancel</button>
              </span>
            ))}
            {/* A stage can hit more than one problem — the button stays. */}
            <button type="button" className="btn ig-bad" onClick={() => setProblem(true)}>
              {t.outcome === 'failed' ? 'Another problem' : 'Hit a problem'}
            </button>
            <button type="button" className="btn" onClick={() => setEditing(true)}>Edit</button>
            {(t.outcome !== 'planned' || !!t.ranOn) && (
              <button type="button" className="btn btn-ghost" onClick={() => andClose(setOutcome('planned', `${t.title} back to planned`))}>{backWord(t)}</button>
            )}
          </div>
        </>
      ) : kind === 'fix' ? (
        <>
          <div className="rd-acts">
            {t.outcome !== 'passed' && (
              <button type="button" className="btn btn-primary" onClick={() => andClose(setOutcome('passed', `${t.title} — fixed`))}>Fixed</button>
            )}
            {t.outcome !== 'failed' && (
              <button type="button" className="btn ig-bad" onClick={() => andClose(setOutcome('failed', `${t.title} — didn’t fix it`))}>Didn’t fix it</button>
            )}
            <button type="button" className="btn" onClick={() => setEditing(true)}>Edit</button>
            {t.outcome !== 'planned' && (
              <button type="button" className="btn btn-ghost" onClick={() => andClose(setOutcome('planned', `${t.title} back to planned`))}>
                {t.outcome === 'passed' ? 'Not fixed after all — put it back' : 'Put it back to planned'}
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          {/* THE VERDICT IS ASKED FOR once the day or a result is on the
              record and nobody has said how it went (lib/testing needsVerdict). */}
          {needsVerdict(t) && <span className="tw-ask">{verdictQuestion(kind)}</span>}
          <span className={'tw-seg' + (needsVerdict(t) ? ' is-asking' : '')}>
            {(['passed', 'failed', 'notRun', 'planned'] as const).map(o => (
              <button key={o} type="button" className={'tw-seg-b is-' + o + (t.outcome === o ? ' on' : '')}
                aria-pressed={t.outcome === o} onClick={() => void setOutcome(o, `${t.title} — ${outcomeWord({ kind, outcome: o })}`)}>
                {o === 'planned' ? (needsVerdict(t) ? 'No verdict yet' : 'Still planned') : outcomeWord({ kind, outcome: o })}
              </button>
            ))}
          </span>
          <div className="rd-acts">
            {/* WHAT WAS SEEN ON IT — the problem form, as on a stage; the
                verdict stays the one pressed above (it was the record's page's
                "What we found"). */}
            <button type="button" className="btn ig-bad" onClick={() => setProblem(true)}>Hit a problem</button>
            <button type="button" className="btn" onClick={() => setEditing(true)}>Edit</button>
            {/* A run that did not prove it is run again: the machine, the
                product and what it passes on carried forward. */}
            {(t.outcome === 'failed' || t.outcome === 'notRun') && (
              <button type="button" className="btn btn-ghost" onClick={() => void (async () => onOpen(await tt.planNextFrom(t)))()}>Plan the re-test</button>
            )}
          </div>
        </>
      ))}

      {/* THE PROBLEM IT CAME FROM, for a fix — with its pictures, and the door
          to the stage or test it was found on, which opens HERE. */}
      {kind === 'fix' && (problems.length > 0 || problemText || parent) && (
        <div className="rd-blk">
          {(problems.length > 0 || problemText) && <small>The problem</small>}
          {/* The problem opens as itself (docs/DOORS.md) — its words, pictures,
              cost and flag, and Edit; one door, the same everywhere. */}
          {problems.map(p => (
            <div key={p.id} className="rd-problem">
              <button type="button" className="sp-door" onClick={() => onOpen(p.id)}><span className="sp-why">{p.what}</span></button>
              {/* Its concerns and consequences to the business, as written. */}
              {p.impact?.trim() && <p className="rd-problem-t"><b>Concerns:</b> {p.impact}</p>}
              {(p.media ?? []).length > 0 && (
                <span className="sp-ev">{(p.media ?? []).map(m => <EvidenceThumb key={m.id} media={m} size={64} onClick={() => setViewing(m)} />)}</span>
              )}
            </div>
          ))}
          {!problems.length && problemText && <p className="rd-problem-t">{problemText}</p>}
          {parent && (
            <button type="button" className="rd-link" onClick={() => onOpen(parent.id)}>
              For {parentMachine && parent.kind === 'install' ? `${parentMachine} — ` : ''}{parent.title} ›
            </button>
          )}
        </div>
      )}
      {/* WHERE IT SITS — the test it follows, and the re-tests it led to. */}
      {kind === 'test' && (parent || ledTo.length > 0) && (
        <div className="rd-blk">
          {parent && <button type="button" className="rd-link" onClick={() => onOpen(parent.id)}>Follows {parent.title} ›</button>}
          {ledTo.map(x => <button key={x.id} type="button" className="rd-link" onClick={() => onOpen(x.id)}>Led to {x.title} ›</button>)}
        </div>
      )}

      {/* WHAT HAPPENED TO IT — each problem with its pictures and the fix it
          booked, in the order it happened (ui/StageStory). A fix under it
          opens here too. */}
      {/* PART OF THE PLAN — the stage's own lines, before what went wrong
          (ui/StageParts). */}
      {/* PROGRAMS — the one a test proves, or Set up's programs stage with the
          machine's programs and their Commission tests (ui/ProgramLink). */}
      {/* ON TODAY'S PLAN (lib/huddle) — a branch off the record: the lines the
          morning huddle agreed about it, ticked here as on The day; or one
          tap to put it on today's plan. */}
      <OnTodaysPlan t={t} title={kind === 'install' ? `${machine} — ${t.title}` : t.title} tt={tt} can={can} today={today} />
      <ProgramLink projectId={projectId} t={t} tests={tt.tests} onOpen={onOpen} can={can}
        onPatch={patch => void tt.patchTest(t.id, patch)} />
      {kind !== 'fix' && <StageParts key={t.id} step={t} tt={tt} can={can} onOpen={onOpen}
        onRunProblem={can.edit ? (tid, rid) => openRecordAt(projectId, tid, rid) : undefined}
        onProblem={can.edit && kind === 'install' ? p => { setProblemPart(p); setProblem(true); top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } : undefined} />}

      {/* WHAT HAPPENED — only when something has: "nothing has happened, it
          is running to plan" said what the state above already says. */}
      {storyLength(t.id, tt) > 0 && (
        <div className="rd-blk">
          <small>What happened</small>
          <StageStory stepId={t.id} tt={tt} can={can} projectId={projectId} onOpenFix={onOpen} onOpenProblem={onOpen} />
        </div>
      )}

      {/* THE EVIDENCE — the record's own pictures and clips, taken here. */}
      {(can.edit || (t.media ?? []).length > 0) && (
        <div className="rd-blk">
          <Evidence media={t.media ?? []} kind={kind} onView={setViewing}
            onAdd={can.edit ? refs => tt.patchTest(t.id, cur => ({ media: [...(cur.media ?? []), ...refs] })) : undefined} />
        </div>
      )}

      {/* WHAT IT CARRIES BESIDE ITS BOXES (ui/RecordMore) — its files, what
          to raise at the meeting, where a fix is on the line, the links sent
          to its pictures, and the card on paper. They were on the record's
          own page, one link away; the drawer is its one home (docs/DOORS.md).
          Each is a block once it holds something, a line to start it before. */}
      <div className="rd-blk rd-more">
        {docs.length > 0 && <><small>Files</small><RecordFiles test={t} tt={tt} can={can} /></>}
        {(notes.length > 0 || meeting) && (
          <>
            <small>For the meeting</small>
            <RecordItems kind="note" test={t} tt={tt} can={can} onView={setViewing} focus={meeting && !notes.length}
              placeholder="Something to raise about this?" empty="Write it here so it isn’t forgotten at the next meeting." />
          </>
        )}
        {can.edit && (kind !== 'fix' || docs.length === 0 || (!notes.length && !meeting)) && (
          <div className="tc-adds">
            {/* A fix for it planned on its own, on the Fixes page with this one
                picked — a problem's own fix is "Make it a fix" on the problem. */}
            {kind !== 'fix' && (
              <button type="button" className="cw-add" onClick={() => nav(`/project/${projectId}/fixes?for=${encodeURIComponent(t.id)}`)}>
                <span className="cw-add-p" aria-hidden><Icon name="plus" size={13} /></span> Plan a fix for this {kind === 'install' ? 'stage' : 'test'}
              </button>
            )}
            {docs.length === 0 && <RecordFiles test={t} tt={tt} can={can} />}
            {!notes.length && !meeting && (
              <button type="button" className="cw-add" onClick={() => setMeeting(true)}>
                <span className="cw-add-p" aria-hidden><Icon name="plus" size={13} /></span> Something to raise at the meeting
              </button>
            )}
          </div>
        )}
        {/* WHERE IT IS ON THE LINE — a fix pinned on a frame of the filmed walk. */}
        {kind === 'fix' && (can.edit || t.pin) && (
          <OnTheLine projectId={projectId} pin={t.pin} onSave={can.edit ? pin => void tt.patchTest(t.id, { pin }) : undefined} />
        )}
        {mayShare && <SharedLinks key={shareRev} projectId={projectId} testId={t.id} />}
        {job && <CardPdf test={t} tt={tt} project={job} />}
      </div>

      {/* A FALSE FIX GOES FROM HERE. Rowland, 5 October: "need ability to
          delete fixes — false fixes for example." It was only at the foot of
          the fix's own page, two doors away from the list it sits on. One tap,
          and the toast's Undo brings it back (useTesting removeTest). The
          problem it came from stays on its stage. Only the owner deletes
          (lib/access); the database keeps it for anyone else. */}
      {/* …and a test or a stage, from the same place. Rowland, 7 October: "I
          can't delete its other tests" — a test planned by hand sits on its
          machine's row on Commission, and delete was two doors away on its
          full page. What is written under it goes with it, said first; the
          toast's Undo brings it all back. Only the owner deletes. */}
      {can.remove && (
        <div className="rd-blk">
          <button type="button" className="btn btn-ghost btn-sm cw-del rd-del" onClick={() => void (async () => {
            if (kind !== 'fix') {
              const cost = await tt.testCost(t.id);
              if (cost.found > 0 && !confirm(`Delete “${t.title}”?\n\n${cost.found} thing${cost.found === 1 ? '' : 's'} written under it go${cost.found === 1 ? 'es' : ''} with it. Undo brings it back for a few seconds.`)) return;
            }
            void tt.removeTest(t.id);
            onClose();
          })()}>Delete this {kind === 'fix' ? 'fix' : kind === 'install' ? 'stage' : 'test'}</button>
        </div>
      )}

      {/* Its own pictures and its problem's, pointed at where they are wrong
          (ui/Evidence) — written back on whichever record holds the picture. */}
      {viewing && <EvidenceViewer media={viewing} onClose={() => setViewing(null)}
        onPins={can.edit ? pinsOnJob(tt, viewing.id) : undefined}
        share={mayShare && (t.media ?? []).some(m => m.id === viewing.id)
          ? { projectId, testId: t.id, onMade: () => setShareRev(r => r + 1) } : undefined}
        onRemove={!can.remove ? undefined : () => { const gone = viewing; setViewing(null); void removeMedia(tt, t, gone); }} />}
    </DrawerShell>
  );
}

/** The record's lines on today's plan (lib/huddle), or "Put it on today's
 *  plan" — the huddle's list reached from the record it is about. */
function OnTodaysPlan({ t, title, tt, can, today }: { t: Test; title: string; tt: ReturnType<typeof useTesting>; can: ReturnType<typeof useAccess>; today: string }) {
  const lines = planOn(t.id, tt.items, today);
  if (!lines.length && (!can.edit || t.outcome === 'passed')) return null;
  return (
    <div className="rd-blk dp-branch">
      {/* The heading heads lines; before there are any, the one button says it. */}
      {lines.length > 0 && <small>On today’s plan</small>}
      {lines.map(i => (
        <label key={i.id} className="dp-tick">
          <input type="checkbox" checked={i.doneAt != null} disabled={!can.edit}
            onChange={() => void tt.saveItem({ ...i, doneAt: i.doneAt != null ? undefined : Date.now() })} />
          <span className="dp-what">{i.what}{i.owner && <span className="sub"> — {i.owner}</span>} · <span className={'dp-state' + (i.doneAt != null ? ' is-g' : ' is-w')}>{i.doneAt != null ? 'done' : 'to do'}</span></span>
        </label>
      ))}
      {!lines.length && can.edit && (
        <button type="button" className="cw-link" onClick={() => {
          const at = Date.now();
          void tt.saveItem({ id: uid(), projectId: t.projectId, testId: t.id, kind: TODAY_KIND, what: title, due: today,
            ...(t.withWhom ? { owner: t.withWhom } : {}), sort: at, createdAt: at, updatedAt: at });
        }}>Put it on today’s plan</button>
      )}
    </div>
  );
}
