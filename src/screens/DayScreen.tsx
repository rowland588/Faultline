/* THE DAY — one date on the job, told as a story. Since 27 October it is a part of the Journey (Rowland: "fold it"):
 * the Journey picked on one day — Today, or a day stepped to — draws it under its own range, and #/project/:id/day
 * opens the Journey there (router). Nothing it did is gone: the plan for today, what is due, the story, the gates'
 * bars, the pictures and Today's update.
 *
 * Rowland: "the ability to understand the issues and stages that are taking
 * place on a day to day basis, telling a story."
 *
 * Pick a day and the app says what happened on it: what got done, what did
 * not go to plan, what was found, what is booked next. Nothing is typed here —
 * every line is read by lib/day.ts off a date the records already carry — and
 * each line opens the record it came from. The Day report PDF is drawn off the
 * same reading, so what you send is what you read.
 */
import { PageHeader } from '../ui/parts';
import { useEffect, useState } from 'react';
import { openRecord } from '../ui/RecordDrawer';
import { useJobStudies } from '../ui/StudyLinks';
import { nav, useRoute } from '../state/useRoute';
import { GATE_PATH } from '../lib/install';
import { EvidenceThumb, EvidenceViewer } from '../ui/Evidence';
import { useProject } from '../lib/useProjects';
import { useTesting } from '../lib/useTesting';
import { useMaterials } from '../lib/useMaterials';
import { usePrograms } from '../lib/usePrograms';
import { activeDays, dayOf, type DayLine } from '../lib/day';
import { niceDay, todayISO } from '../lib/weeks';
import { pdfFileName } from '../lib/fileName';
import { deliverPdf, isStaleBuildError, loadPdfLib, reloadOntoNewBuild } from '../lib/savePdf';
import type { MediaRef } from '../types';
import { DateInput } from '../ui/DateInput';
import { AccessNote } from '../ui/AccessNote';
import { useAccess } from '../cloud/access';
import { OnTargetLine } from '../ui/OnTarget';
import { stageGateOnTarget } from '../lib/onTarget';
import { planModel } from '../lib/planModel';
import { DayPlan } from '../ui/DayPlan';
import { Icon } from '../ui/Icon';
import { isSettled, live, plannedEnd } from '../lib/testing';
import { useJobMoney } from '../lib/useJobMoney';
import { MONEY_WAIT } from '../lib/stageGatePages';
import { dayClosing, dayTiles } from '../lib/dayLean';
import { LeanClosing, LeanTiles } from '../ui/Lean';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function DayScreen({ projectId, day: on, inJourney = false }: { projectId: string; day?: string; inJourney?: boolean }) {
  const { project, loading } = useProject(projectId);
  const tt = useTesting(projectId);
  /* What was measured at the line (lib/study) — part of the day's story. */
  const studies = useJobStudies(projectId);
  const mats = useMaterials(projectId);
  const progs = usePrograms(projectId);
  /* Nothing on the day is typed here, so a client reads all of it; the line
     at the top only says who runs the job (lib/access). */
  const can = useAccess(projectId);
  /* the job's money — what the slip costs, or what a day late would (lib/useJobMoney) */
  const jobMoney = useJobMoney(projectId);
  const route = useRoute();
  const asked = on ?? route.query.get('d') ?? '';
  const today = todayISO();
  /* A day still to come has no story, and a link to one said "Nothing was
     logged" over bars marked "by the end of the day" — read as today. */
  const date = ISO.test(asked) && asked <= today ? asked : today;
  const [viewing, setViewing] = useState<MediaRef | null>(null);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  /* THE STORY, FOLDED today: the plan and what is due are what the day is
     used for. A day that has gone is read for its story, so it opens. */
  const [storyPicked, setStory] = useState<boolean | null>(null);

  useEffect(() => { void loadPdfLib().catch(() => { /* the button reports it */ }); }, []);
  useEffect(() => { setSaid(null); setErr(null); setStory(null); }, [date]);

  if (loading || tt.loading || mats.loading || progs.loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  /* A link to a project that has gone is a dead end, not a crash — and it
     says where to go, the way the project page and Materials do. It was the
     sentence alone, with nothing on the screen to press. */
  if (!project) {
    return (
      <div className="wrap pace">
        <p className="sub" style={{ marginTop: 24 }}>That project isn’t here any more.</p>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => nav('/room')}>Back to the control room</button>
      </div>
    );
  }

  const input = { tests: tt.tests, items: tt.items, assets: tt.assets, materials: mats.materials, programs: progs.programs, studies };
  const day = dayOf(input, date, today);
  /* ARE WE ON TARGET? — today's answer (lib/onTarget), at the top of the
     update and of its page. On another day it is still today's, and says so. */
  const onTarget = planModel(project) === 'commissioning' ? stageGateOnTarget({ project, ...input, today }) : undefined;
  /* the money tile is a stage-gate job's: a 6M job's day has no handover to slip */
  const money = planModel(project) === 'commissioning' ? jobMoney ?? MONEY_WAIT : undefined;
  const asOf = date === today ? undefined : `today, ${niceDay(today, { weekday: 'short' })}`;
  /* Back and forward step over the blank days, so the story reads on. */
  const days = activeDays(input);
  const prev = [...days].reverse().find(d => d < date);
  const next = days.find(d => d > date && d <= today) ?? (date < today ? today : undefined);
  const go = (d: string) => nav(`/project/${projectId}/journey?from=${d}&to=${d}`);
  /* A line about a record opens it in the drawer, over the day (ui/RecordDrawer). */
  const open = (l: DayLine) => {
    if (l.id) openRecord(projectId, l.id);
    else if (l.href) nav(l.href);
    else if (l.go) nav(`/project/${projectId}/${l.go}`);
  };

  /* THE DAY IN THE ORDER IT IS USED (docs/FLOW.md item 5): the plan, then
     what is due, then the story. Today the plan is worked in DayPlan above;
     on a day that has gone, how its plan went leads. */
  const huddle = date === today && planModel(project) === 'commissioning';
  const firstKeys = huddle ? ['today'] : ['plan', 'today'];
  const shown = day.sections.filter(s => !(s.key === 'plan' && huddle));
  const first = shown.filter(s => firstKeys.includes(s.key));
  const rest = shown.filter(s => !firstKeys.includes(s.key));
  const count = (k: string) => rest.find(s => s.key === k)?.lines.length ?? 0;
  const storyN = rest.reduce((n, s) => n + s.lines.length, 0) + day.media.length;
  const story = storyPicked ?? date !== today;
  /* The gates' bars live in the story too, so a day with only those still folds them. */
  const hasStory = storyN > 0 || day.gates.length > 0;
  const section = (s: (typeof shown)[number]) => (
    <section key={s.key} className={'dy-sec is-' + s.key}>
      <h2 className="cmp-h">{s.title}</h2>
      <ul className="dy-lines">
        {s.lines.map((l, i) => (
          <li key={i}>
            <button className={'dy-line is-' + l.tone} onClick={() => open(l)} disabled={!l.id && !l.go && !l.href}>
              <span className="dy-dot" aria-hidden />
              <span className="dy-line-m">
                {/* The words that say which — "late, 2 h lost" red, "a
                    problem, no time lost" amber — in their colour. */}
                <span>{(() => {
                  const at = l.mark ? l.text.indexOf(l.mark) : -1;
                  return at < 0 || !l.mark ? l.text
                    : <>{l.text.slice(0, at)}<b className={'dy-which is-' + l.which}>{l.mark}</b>{l.text.slice(at + l.mark.length)}</>;
                })()}</span>
                {l.detail && <span className="sub">{l.detail}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );

  const send = async () => {
    if (busy) return;
    setBusy(true); setErr(null); setSaid(null);
    try {
      const { jsPDF } = await loadPdfLib();
      const { drawDayReport } = await import('../lib/dayReportPdf');
      const { shotsOf } = await import('../lib/testReport');
      const shots = await shotsOf(day.media, 4);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      drawDayReport(pdf, day, { project: project.name, lead: project.lead, builtAt: Date.now(), shots, onTarget, asOf, tiles: dayTiles(day, money), closing: dayClosing(day, money) });
      const how = await deliverPdf(pdf, pdfFileName(project.name, 'day', date), { brand: false }); // its band carries the mark
      setSaid(how === 'downloaded' ? 'Saved — open or send it from the bar below.' : 'Ready — open it from the bar below.');
    } catch (e) {
      console.error('Day report failed', e);
      setErr(isStaleBuildError(e)
        ? 'This tab is still running an older version of the app, so the part that draws the PDF could not load.'
        : (e instanceof Error ? e.message : 'The day report could not be built.'));
    } finally { setBusy(false); }
  };

  /* IN THE JOURNEY: the Journey's header is the page's — the day's verdict and its update are one line under it,
     and the Journey's ‹ › step the day, so the page's own day picker is not drawn */
  const update = date === today ? 'Today’s update' : 'This day’s update';
  return (
    <div className={inJourney ? 'dy-in-jn' : 'wrap pace cm-screen'}>
      {inJourney ? (
        <div className="dy-jn-head">
          {onTarget ? <OnTargetLine v={{ ...onTarget, reason: onTarget.brief ?? onTarget.reason }} asOf={asOf} /> : <p className="dy-headline">{day.headline}</p>}
          <button type="button" className="btn btn-primary dy-update" disabled={busy} onClick={() => void send()}>{busy ? 'Building…' : update}</button>
        </div>
      ) : (
      /* THE PAGE HEADER (docs/STRUCTURE.md §5.4, B3). FROM THE TOP — Rowland, 5 October: "I wanted to be able to very
          quickly see today and send out an up-to-date movement on today. Even that's not easy to do." The update is
          the day's one thing to do, and its paper in Report ▾ too; it saves the page to the device, and the bar it
          leaves (ui/PdfReady) opens it to read and sends it — "view it before I send it". THE VERDICT AS ITS ONE
          LINE (docs/FLOW.md item 5) — the date and the counts; with no verdict (a 6M job's day) the paragraph. */
      <PageHeader
        title={<>{date === today ? 'Today' : niceDay(date, { weekday: 'short', year: date.slice(0, 4) !== today.slice(0, 4) })}{date === today && <span className="dy-date">{niceDay(date, { weekday: 'short' })}</span>}</>}
        primary={{ label: busy ? 'Building…' : update, disabled: busy, run: () => void send() }}
        papers={[{ label: update, for: 'one page of the day to send — done, late, what went wrong, what was found', disabled: busy, make: send }]}>
        {onTarget ? <OnTargetLine v={{ ...onTarget, reason: onTarget.brief ?? onTarget.reason }} asOf={asOf} /> : <p className="dy-headline">{day.headline}</p>}
      </PageHeader>
      )}
      {(said || err) && (
        <p className={'sub ' + (err ? 'tw-err' : 'tc-ok')} role="status">
          {err ?? said}{' '}
          {err?.startsWith('This tab is still running') && <button className="cw-link" onClick={() => void reloadOntoNewBuild()}>Reload</button>}
        </p>
      )}
      <AccessNote can={can} owner={project.lead} />
      {/* THE LEAN PAGE (lib/dayLean): the day's story counted — done, late,
          went wrong, found — and the job's money last */}
      {!day.empty && <LeanTiles tiles={dayTiles(day, money)} className="sg-tiles" />}

      {!inJourney && <nav className="dy-nav" aria-label="Pick a day">
        <button className="btn btn-ghost" disabled={!prev} onClick={() => prev && go(prev)}>
          ‹ {prev ? niceDay(prev, { weekday: 'short' }) : 'Earlier'}
        </button>
        <DateInput value={date} max={today} aria-label="Go to a day"
          onCommit={v => { if (ISO.test(v)) go(v); }} />
        <button className="btn btn-ghost" disabled={!next} onClick={() => next && go(next)}>
          {next ? (next === today ? 'Today' : niceDay(next, { weekday: 'short' })) : 'Later'} ›
        </button>
      </nav>}

      {/* THE PLAN FOR TODAY — agreed at the huddle, ticked through the day
          (ui/DayPlan). Today it is worked here; on a day that has gone the
          story below says how it went. Offered first: whatever the plan has
          started and not finished by today, late included. */}
      {date === today && planModel(project) === 'commissioning' && (
        <DayPlan projectId={projectId} today={today} tt={tt} can={can}
          due={live(tt.tests).filter(t => !isSettled(t) && !!t.plannedFor && t.plannedFor <= today)
            .sort((a, b) => (plannedEnd(a) ?? '').localeCompare(plannedEnd(b) ?? '') || a.sort - b.sort)} />
      )}

      {/* WHAT IS DUE — after the plan, before the story. */}
      {first.map(section)}

      {/* THE STORY, FOLDED UNDER ONE LINE — what got done, what did not go
          to plan, what was found, the critical and the late, the gates'
          bars, the pictures. The line says how much is there and the
          abnormal in its colour, so the fold hides nothing that is wrong.
          The PDF prints all of it, as before. */}
      {hasStory && (
        <button type="button" className={'dy-fold' + (story ? ' is-open' : '')} aria-expanded={story} onClick={() => setStory(!story)}>
          <span className="dy-fold-l">
            <b>{date === today ? 'What happened today' : `What happened on ${niceDay(date, { weekday: 'short' })}`}</b>
            {storyN > 0 && <span className="dy-fold-n"> — {storyN} thing{storyN === 1 ? '' : 's'}</span>}
            {count('critical') > 0 && <span className="crit-tag">{count('critical')} critical</span>}
            {count('late') > 0 && <span className="in-late"> · {count('late')} late</span>}
            {count('problem') > 0 && <span className="in-problem"> · {count('problem')} a problem</span>}
          </span>
          <Icon name={story ? 'chevronDown' : 'chevron'} size={16} />
        </button>
      )}
      {story && hasStory && (
        <div className="dy-story">
          {onTarget && <p className="dy-headline">{day.headline}</p>}
          {/* A bar per gate with steps — Install, Set up, Hand over. */}
          {day.gates.map(g => (
            <button key={g.gate} className="dy-install" onClick={() => nav(`/project/${projectId}/${GATE_PATH[g.gate]}`)}
              aria-label={`${g.label}: ${g.done} of ${g.total} steps done${g.late ? `, ${g.late} late` : ''}${g.problem ? `, ${g.problem} a problem with no time lost` : ''}`}>
              <span className="dy-install-h"><b>{g.label}</b><span className="sub">{g.done} of {g.total} steps done{date === today ? '' : ' by the end of the day'}</span>
                {/* WHICH, by the one rule (lib/install lateOrProblem): late in
                    red — its day gone, or hours lost — and a problem that lost no
                    time in amber. Never "late or a problem". */}
                {g.late > 0 && <span className="sub in-late">{g.late} late</span>}
                {g.problem > 0 && <span className="sub in-problem">{g.problem} a problem</span>}</span>
              {/* Done a quiet green, then late red, then a problem amber — the colour rules. */}
              <span className="dy-bar">
                <span className="is-done" style={{ width: `${(100 * g.done) / g.total}%` }} />
                {g.late > 0 && <span className="is-late" style={{ width: `${(100 * g.late) / g.total}%` }} />}
                {g.problem > 0 && <span className="is-problem" style={{ width: `${(100 * g.problem) / g.total}%` }} />}
              </span>
            </button>
          ))}
          {rest.map(section)}
          {day.media.length > 0 && (
            <section className="dy-sec">
              <h2 className="cmp-h">Pictures from the day <span className="cmp-h-n">{day.media.length}</span></h2>
              <div className="dy-pics">
                {day.media.map(m => <EvidenceThumb key={m.id} media={m} size={88} onClick={() => setViewing(m)} />)}
              </div>
            </section>
          )}
        </div>
      )}

      {day.empty && (
        <p className="sub tw-note">
          Nothing was logged {date === today ? 'yet today' : 'for this day'}. The story writes itself from what is logged —
          a step done, a test run, something found, a machine or a delivery arriving.
          {prev && <> <button className="cw-link" onClick={() => go(prev)}>Go to {niceDay(prev, { weekday: 'short' })}</button></>}
        </p>
      )}

      {/* Said once, on an empty day; a day with a story does not need its button explained. */}
      {day.empty && <p className="sub tw-note">“{update}” at the top saves one page of this to your device — the day’s story, the gates’ bars and the day’s pictures — to read, then send from the bar it leaves.</p>}

      {/* THE CLOSING LINE — the day in one sentence, the slip in money */}
      <LeanClosing closing={dayClosing(day, money)} />
      {viewing && <EvidenceViewer media={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
