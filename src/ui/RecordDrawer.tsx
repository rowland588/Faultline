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
 * fix. The record's page — files, the meeting note, the PDF card, delete —
 * is one link away, for the one time in ten it is wanted.
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
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { nav, navReplace, withQuery, type Route, type RouteName } from '../state/useRoute';
import { useTesting } from '../lib/useTesting';
import { useAccess } from '../cloud/access';
import { fixTone, type FixTone } from '../lib/fixTone';
import { toneOf, type StepTone } from '../lib/install';
import {
  isOverdue, live, needsVerdict, outcomeWord, plannedEnd, testOfFix, verdictQuestion,
  type Outcome, type Test,
} from '../lib/testing';
import { daysBetween, niceDay, todayISO } from '../lib/weeks';
import type { MediaRef } from '../types';
import { Icon } from './Icon';
import { useDismiss } from './Sheet';
import { ProblemEdit, StageStory, storyLength } from './StageStory';
import { PartsMark, StageParts } from './StageParts';
import { ProgramLink } from './ProgramLink';
import { criticalCount, criticalOn } from '../lib/critical';
import { partsOf, partsSaid } from '../lib/noted';
import { Evidence } from './EvidenceDoors';
import { EvidenceThumb, EvidenceViewer, pinsOnJob } from './Evidence';
import { DatesForm, spanShort } from './InstallGrid';
import { ProblemForm, changeTests, followingSummary, moveTestsWithWhy, recordProblem, type ProblemFill } from './WhyMoved';
import { SayIt, SayStep } from './RecordSay';
import { movedLater, overlapOf, storyOf } from '../lib/story';
import { useProjects } from '../lib/useProjects';
import { dayLength } from '../lib/hoursLost';

/* ---------------- opening and closing: the URL carries it ---------------- */

const OPEN = 'open';
const JOB = 'job';

/** The routes a record can be opened over. The fishbone's own ?open=1 (a new
 *  problem) is not one of ours, so the 6M surfaces are left alone. A frame of
 *  the filmed walk ('asset') opens the fixes pinned on it, with &job=. */
const RECORD_ROUTES = new Set<RouteName>([
  'home', 'projectDashboard', 'projectSetup', 'fixes', 'install', 'gateSetup', 'handover', 'day',
  /* The plan, since it became a page of its own: "Tap a row to open it" set
     ?open= and nothing opened. */
  'plan', 'testing', 'test', 'trialCard', 'notes', 'materials', 'programs', 'clientReport', 'asset',
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

/** Show another record in the drawer already open — the parent of a fix, a
 *  fix under a stage — without adding to the trail the back button walks. */
export function openRecordInPlace(id: string): void {
  withQuery(OPEN, id, true);
}

export function closeRecord(): void {
  if (pushed > 0) { pushed = 0; history.back(); return; }
  /* Reached by a link or a reload: nothing of ours to go back to. */
  const [path, params] = split();
  params.delete(OPEN); params.delete(JOB);
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

/** The frame every record wears: a panel from the right on a laptop, a sheet
 *  from the bottom on a phone (styles.css, "THE DRAWER"). Escape and × close
 *  it, and so does the dimmed page around it — not the tap that opened it. */
export function DrawerShell({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const dismiss = useDismiss(onClose);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    /* The keyboard follows the eye into the drawer, and goes back to what
       opened it when it shuts. */
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.focus({ preventScroll: true });
    return () => { document.body.style.overflow = prev; opener?.focus?.({ preventScroll: true }); };
  }, []);
  return createPortal(
    <div className="rd-scrim" {...dismiss}>
      <aside ref={panel} tabIndex={-1} className="rd" role="dialog" aria-modal="true" aria-label={label}>
        <button type="button" className="rd-x" onClick={onClose} aria-label="Close"><Icon name="close" size="1.1em" /></button>
        {children}
      </aside>
    </div>,
    document.body,
  );
}

/* ------------------------------- the record ------------------------------ */

type Tone = 'r' | 'a' | 'w' | 'g' | 'n';
const FIX_TONE: Record<FixTone, Tone> = { done: 'g', late: 'r', soon: 'a', ahead: 'w', notRun: 'n' };
const STEP_TONE: Record<StepTone, Tone> = { done: 'g', problem: 'r', asking: 'a', late: 'r', ahead: 'w' };
const short = (iso?: string) => (iso ? niceDay(iso) : '');

/** WHERE A STAGE STANDS, in words — the line the stage's sheet led with, so
 *  a step pressed by mistake says what it is before offering to put it back. */
export function stepStateWord(t: Test, late: boolean): string {
  return t.outcome === 'passed' ? `Done${t.ranOn ? ` ${short(t.ranOn)}` : ''}`
    : t.outcome === 'failed' ? `Hit a problem${t.ranOn ? ` ${short(t.ranOn)}` : ''}${late ? ' · late' : ''}`
      : t.outcome === 'notRun' ? 'Did not happen'
        : t.outcome === 'planned' && t.ranOn ? 'Worked on — not called yet'
          : late ? `Late · was ${short(plannedEnd(t))}` : 'Not done yet';
}
const backWord = (t: Test): string => t.outcome === 'passed' ? 'Not done after all — put it back'
  : t.outcome === 'failed' ? 'Not a problem after all — put it back'
    : 'Put it back to planned';

/** The state line, one rule per face: lib/fixTone for a fix, the stage
 *  sheet's words for a step, the verdict for a test. The colour is the
 *  app's five (CLAUDE.md, visual management) and the words carry it too. */
function stateOf(t: Test, today: string): { word: string; tone: Tone } {
  const kind = t.kind ?? 'test';
  if (kind === 'fix') {
    const f = fixTone(t, today);
    /* No date agreed is not started — grey, as on the Fixes list. */
    return { word: f.when, tone: f.tone === 'ahead' && !plannedEnd(t) ? 'n' : FIX_TONE[f.tone] };
  }
  if (kind === 'install') {
    const st = toneOf(t, today);
    const late = st !== 'done' && isOverdue(t, today);
    const tone = st === 'ahead' && !t.plannedFor ? 'n' : STEP_TONE[st];
    return { word: stepStateWord(t, late), tone };
  }
  if (t.outcome === 'passed') return { word: `${outcomeWord(t)}${t.ranOn ? ` · ${short(t.ranOn)}` : ''}`, tone: 'g' };
  if (t.outcome === 'failed' || t.outcome === 'notRun') return { word: `${outcomeWord(t)}${t.ranOn ? ` · ${short(t.ranOn)}` : ''}`, tone: 'r' };
  if (needsVerdict(t)) return { word: `${outcomeWord(t)}${t.ranOn ? ` · ran ${short(t.ranOn)}` : ''}`, tone: 'a' };
  if (isOverdue(t, today)) return { word: `Late · was ${spanShort(t.plannedFor, plannedEnd(t))}`, tone: 'r' };
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
  const today = todayISO();
  const [problem, setProblem] = useState<boolean | ProblemFill>(false);
  const [planning, setPlanning] = useState(false);
  const [dayEdit, setDayEdit] = useState<string | null>(null);
  /* "Is the overlap OK?" answered on the dates form, saved with the dates. */
  const overlapAnswer = useRef<boolean | undefined>(undefined);
  const [viewing, setViewing] = useState<MediaRef | null>(null);
  const [editingProblem, setEditingProblem] = useState<string | null>(null);
  /* A fresh record, fresh forms: the problem form of one step must not stay
     open over the parent it opened. */
  useEffect(() => { setProblem(false); setPlanning(false); setEditingProblem(null); setDayEdit(null); }, [id]);

  const t = live(tt.tests).find(x => x.id === id);
  const from = trail.length ? live(tt.tests).find(x => x.id === trail[trail.length - 1]) : undefined;
  const label = t?.title ?? 'The record';

  if (tt.loading) return <DrawerShell label={label} onClose={onClose}><p className="sub">Loading…</p></DrawerShell>;
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
  const { word, tone } = stateOf(t, today);
  const parts = kind !== 'fix' ? partsSaid(partsOf(t.id, tt.items), today) : undefined;
  const crits = kind !== 'fix' ? criticalOn(t.id, tt.items, tt.tests).length : 0;
  /* The parent: a fix is FOR a test or a step; a test may follow another. */
  const parent = kind === 'fix' ? testOfFix(t, tt.tests) : t.fromTestId ? live(tt.tests).find(x => x.id === t.fromTestId) : undefined;
  const parentMachine = parent ? tt.assets.find(a => a.id === parent.assetId)?.name : undefined;
  /* THE PROBLEM A FIX CAME FROM, with the picture taken with it — kept on the
     thing found on the stage, not on the fix (lib/story). */
  const problems = kind === 'fix' ? live(tt.items).filter(i => i.kind === 'found' && i.becameTestId === t.id) : [];
  const problemText = kind === 'fix' && !problems.length && t.passesIf && t.passesIf.trim() !== t.title.trim() ? t.passesIf : undefined;
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

  const dates = plannedEnd(t) ? spanShort(t.plannedFor, plannedEnd(t)) : undefined;
  /* HOW FAR IT HAS SLIPPED past the finish first planned — the line the plan's
     panel led with (lib/story keeps the first finish). */
  const first = storyOf(t.id, tt.tests, tt.items).original;
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
      {parts || crits ? (
        <span className="rd-state-row">
          <span className={'rd-state is-' + tone}>{word}</span>
          <PartsMark said={parts} />
          {/* A CRITICAL PROBLEM ON IT, said beside its state (lib/critical). */}
          {crits > 0 && <span className="crit-tag">{criticalCount(crits)}</span>}
        </span>
      ) : <span className={'rd-state is-' + tone}>{word}</span>}
      <h2 className="rd-title">{t.title}</h2>
      <p className="rd-sub">{machine} · {t.withWhom || 'nobody named'}</p>

      {/* THE FLOOR'S ACTIONS, first — the same buttons the square's sheet and
          the record's page had, in the face's own words. A client reads. */}
      {can.edit && (problem ? (
        /* HIT A PROBLEM, answered here: what, the pictures, whether it pushes
           the finish and to when, a fix. The plan hears all of it. */
        <ProblemForm step={t} tests={tt.tests} items={tt.items} assets={tt.assets} initial={typeof problem === 'object' ? problem : undefined} onCancel={() => setProblem(false)}
          day={dayLength(job)} onDay={h => { if (job) void jobs.rename(job, { dayHours: h }); }}
          onSave={a => {
            andClose(recordProblem(tt, t, a, `${t.title} hit a problem${a.to && movedLater(plannedEnd(t), a.to) ? ` — finish now ${short(a.to)}` : ''}${a.fix ? ', fix booked' : ''}`));
            setProblem(false);
          }} />
      ) : kind === 'install' ? (
        <>
          <div className="rd-acts">
            {t.outcome !== 'passed' && (
              <button type="button" className="btn btn-primary" onClick={() => andClose(setOutcome('passed', `${t.title} done — ${machine}`))}>Done today</button>
            )}
            {/* A stage can hit more than one problem — the button stays. */}
            <button type="button" className="btn ig-bad" onClick={() => setProblem(true)}>
              {t.outcome === 'failed' ? 'Another problem — write it up' : 'Hit a problem — write it up'}
            </button>
            {(t.outcome !== 'planned' || !!t.ranOn) && (
              <button type="button" className="btn btn-ghost" onClick={() => andClose(setOutcome('planned', `${t.title} back to planned`))}>{backWord(t)}</button>
            )}
            <SayStep step={t} tt={tt} onDone={onClose} onProblem={f => setProblem(f)} />
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
            {t.outcome !== 'planned' && (
              <button type="button" className="btn btn-ghost" onClick={() => andClose(setOutcome('planned', `${t.title} back to planned`))}>
                {t.outcome === 'passed' ? 'Not fixed after all — put it back' : 'Put it back to planned'}
              </button>
            )}
            <SayIt test={t} tt={tt} can={can} onFilled={() => undefined} />
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
          <SayIt test={t} tt={tt} can={can} onFilled={() => undefined} />
        </>
      ))}

      {/* THE PROBLEM IT CAME FROM, for a fix — with its pictures, and the door
          to the stage or test it was found on, which opens HERE. */}
      {kind === 'fix' && (problems.length > 0 || problemText || parent) && (
        <div className="rd-blk">
          {(problems.length > 0 || problemText) && <small>The problem</small>}
          {problems.map(p => (
            <div key={p.id} className="rd-problem">
              {editingProblem === p.id
                ? <ProblemEdit item={p} tt={tt} can={can} onDone={() => setEditingProblem(null)} />
                : <>
                  <p>{p.what}</p>
                  {(p.media ?? []).length > 0 && (
                    <span className="sp-ev">{(p.media ?? []).map(m => <EvidenceThumb key={m.id} media={m} size={64} onClick={() => setViewing(m)} />)}</span>
                  )}
                  {can.edit && <span className="sp-row-acts"><button type="button" className="cw-link" onClick={() => setEditingProblem(p.id)}>Edit the problem</button></span>}
                </>}
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
      {kind === 'test' && parent && (
        <div className="rd-blk">
          <button type="button" className="rd-link" onClick={() => onOpen(parent.id)}>Follows {parent.title} ›</button>
        </div>
      )}

      {/* WHAT HAPPENED TO IT — each problem with its pictures and the fix it
          booked, in the order it happened (ui/StageStory). A fix under it
          opens here too. */}
      {/* PART OF THE PLAN — the stage's own lines, before what went wrong
          (ui/StageParts). */}
      {/* PROGRAMS — the one a test proves, or Set up's programs stage with the
          machine's programs and their Commission tests (ui/ProgramLink). */}
      <ProgramLink projectId={projectId} t={t} tests={tt.tests} onOpen={onOpen} can={can}
        onPatch={patch => void tt.patchTest(t.id, patch)} />
      {kind !== 'fix' && <StageParts key={t.id} step={t} tt={tt} can={can} />}

      {(kind !== 'fix' || storyLength(t.id, tt) > 0) && (
        <div className="rd-blk">
          <small>What happened</small>
          <StageStory stepId={t.id} tt={tt} can={can} projectId={projectId} onOpenFix={onOpen}
            empty="Nothing has happened to this one yet — it is running to plan." />
        </div>
      )}

      {/* THE PLANNING, BEHIND ONE BUTTON. Rowland, 5 October: "too much on a
          screen." The dates and who are read here; changing them is one tap
          away, and one Save keeps both (and asks why when the finish moves
          later, as before). */}
      <div className="rd-blk">
        <div className="rd-kv">
          <div><span>{kind === 'fix' ? 'Date agreed' : 'Planned'}</span>{dates ?? <i className="sub">{kind === 'fix' ? 'not agreed yet' : 'no day yet'}</i>}
            {slip > 0 && <em className="rd-slip">+{slip} day{slip === 1 ? '' : 's'} past the first finish, {short(first)}</em>}</div>
          <div><span>Who</span>{t.withWhom || <i className="sub">nobody named</i>}</div>
          {/* THE DAY IT WAS DONE, CHANGEABLE. Rowland, 6 October: "can't change
              a date if I say it completed, but I make mistakes." "Done today"
              stamps today; this is how a wrong day is put right. */}
          {t.ranOn && (
            <div><span>{t.outcome === 'passed' ? (kind === 'fix' ? 'Fixed on' : 'Done on') : t.outcome === 'failed' ? 'Problem on' : 'Worked on'}</span>
              {dayEdit !== null ? (
                <span className="rd-day">
                  <input type="date" value={dayEdit} aria-label="The day it was done" onChange={e => setDayEdit(e.target.value)} />
                  <button type="button" className="btn btn-sm btn-primary" disabled={!dayEdit} onClick={() => {
                    if (dayEdit && dayEdit !== t.ranOn) void changeTests(tt, [t], () => ({ ranOn: dayEdit }), `${t.title} — day changed to ${short(dayEdit)}`);
                    setDayEdit(null);
                  }}>Save</button>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setDayEdit(null)}>Cancel</button>
                </span>
              ) : (
                <>{short(t.ranOn)}{can.edit && <> <button type="button" className="cw-link" onClick={() => setDayEdit(t.ranOn ?? today)}>change</button></>}</>
              )}
            </div>
          )}
        </div>
        {can.edit && (planning ? (
          <DatesForm key={t.id} start={t.plannedFor} finish={t.plannedTo}
            /* A finished one's dates are corrected, not overrun: no "why did it move?". */
            was={t.outcome === 'passed' ? undefined : plannedEnd(t)}
            who={{ names, value: t.withWhom ?? '' }}
            following={end => followingSummary(t, tt.tests, end)}
            overlap={kind === 'fix' ? undefined : {
              with: (fromD, toD) => overlapOf({ ...t, plannedFor: fromD, plannedTo: toD > fromD ? toD : undefined }, tt.tests, true)?.title,
              ok: t.overlapOk,
              /* Kept by the same write as the dates: two writes at once raced,
                 and the second put the first one's answer back. */
              set: ok => { overlapAnswer.current = ok; },
            }}
            onMove={(fromD, to, a, who) => {
              void (async () => {
                await moveTestsWithWhy(tt, [t], fromD, to, a, `${t.title} moved to ${short(to ?? fromD)} — reason kept${a.fix ? ', fix booked' : ''}${who !== undefined ? ` · ${who || 'nobody named'}` : ''}`);
                if (who !== undefined) await tt.patchTest(t.id, { withWhom: who || undefined });
                if (overlapAnswer.current !== undefined) await tt.patchTest(t.id, { overlapOk: overlapAnswer.current });
              })();
              setPlanning(false);
            }}
            onSave={(fromD, to, who) => {
              const changed = fromD !== t.plannedFor || to !== t.plannedTo;
              const okAns = overlapAnswer.current;
              void changeTests(tt, [t], () => ({ plannedFor: fromD, plannedTo: to, ...(who !== undefined ? { withWhom: who || undefined } : {}), ...(okAns !== undefined ? { overlapOk: okAns } : {}) }),
                [changed ? `${t.title} ${fromD ? (to && to > fromD ? `planned ${short(fromD)} to ${short(to)}` : `planned ${short(fromD)}`) : 'has no dates'}` : t.title,
                  who !== undefined ? (who || 'nobody named') : ''].filter(Boolean).join(' — '));
              setPlanning(false);
            }}
            onCancel={() => setPlanning(false)} />
        ) : (
          <button type="button" className="rd-link" onClick={() => setPlanning(true)}>Change dates or who ›</button>
        ))}
      </div>

      {/* THE EVIDENCE — the record's own pictures and clips, taken here. */}
      {(can.edit || (t.media ?? []).length > 0) && (
        <div className="rd-blk">
          <Evidence media={t.media ?? []} kind={kind} onView={setViewing}
            onAdd={can.edit ? refs => tt.patchTest(t.id, cur => ({ media: [...(cur.media ?? []), ...refs] })) : undefined} />
        </div>
      )}

      {/* ONE LINK to the whole page: files, the meeting note, the PDF card,
          delete — for the one time in ten they are wanted. */}
      <div className="rd-blk">
        <button type="button" className="rd-link rd-go" onClick={() => {
          nav(`/project/${projectId}/testing/${encodeURIComponent(t.id)}`);
          /* A new page starts at its top, not where the list under the drawer
             was scrolled to. */
          requestAnimationFrame(() => window.scrollTo(0, 0));
        }}>
          Everything about it › <span className="sub">files · notes · PDF card{can.remove && kind !== 'fix' ? ' · delete' : ''}</span>
        </button>
      </div>

      {/* A FALSE FIX GOES FROM HERE. Rowland, 5 October: "need ability to
          delete fixes — false fixes for example." It was only at the foot of
          the fix's own page, two doors away from the list it sits on. One tap,
          and the toast's Undo brings it back (useTesting removeTest). The
          problem it came from stays on its stage. Only the owner deletes
          (lib/access); the database keeps it for anyone else. */}
      {kind === 'fix' && can.remove && (
        <div className="rd-blk">
          <button type="button" className="btn btn-ghost btn-sm cw-del rd-del" onClick={() => {
            void tt.removeTest(t.id);
            onClose();
          }}>Delete this fix</button>
        </div>
      )}

      {/* Its own pictures and its problem's, pointed at where they are wrong
          (ui/Evidence) — written back on whichever record holds the picture. */}
      {viewing && <EvidenceViewer media={viewing} onClose={() => setViewing(null)}
        onPins={can.edit ? pinsOnJob(tt, viewing.id) : undefined} />}
    </DrawerShell>
  );
}
