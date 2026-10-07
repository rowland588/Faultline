/* THE DAY — one date on the job, told as a story.
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
import { useEffect, useState } from 'react';
import { openRecord } from '../ui/RecordDrawer';
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
import { isSettled, live, plannedEnd } from '../lib/testing';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function DayScreen({ projectId }: { projectId: string }) {
  const { project, loading } = useProject(projectId);
  const tt = useTesting(projectId);
  const mats = useMaterials(projectId);
  const progs = usePrograms(projectId);
  /* Nothing on the day is typed here, so a client reads all of it; the line
     at the top only says who runs the job (lib/access). */
  const can = useAccess(projectId);
  const asked = useRoute().query.get('d') ?? '';
  const today = todayISO();
  /* A day still to come has no story, and a link to one said "Nothing was
     logged" over bars marked "by the end of the day" — read as today. */
  const date = ISO.test(asked) && asked <= today ? asked : today;
  const [viewing, setViewing] = useState<MediaRef | null>(null);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { void loadPdfLib().catch(() => { /* the button reports it */ }); }, []);
  useEffect(() => { setSaid(null); setErr(null); }, [date]);

  if (loading || tt.loading || mats.loading || progs.loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  /* A link to a project that has gone is a dead end, not a crash — and it
     says where to go, the way the project page and Materials do. It was the
     sentence alone, with nothing on the screen to press. */
  if (!project) {
    return (
      <div className="wrap pace">
        <p className="sub" style={{ marginTop: 24 }}>That project isn’t here any more.</p>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => nav('/')}>Back to the control room</button>
      </div>
    );
  }

  const input = { tests: tt.tests, items: tt.items, assets: tt.assets, materials: mats.materials, programs: progs.programs };
  const day = dayOf(input, date, today);
  /* ARE WE ON TARGET? — today's answer (lib/onTarget), at the top of the
     update and of its page. On another day it is still today's, and says so. */
  const onTarget = planModel(project) === 'commissioning' ? stageGateOnTarget({ project, ...input, today }) : undefined;
  const asOf = date === today ? undefined : `today, ${niceDay(today, { weekday: 'short' })}`;
  /* Back and forward step over the blank days, so the story reads on. */
  const days = activeDays(input);
  const prev = [...days].reverse().find(d => d < date);
  const next = days.find(d => d > date && d <= today) ?? (date < today ? today : undefined);
  const go = (d: string) => nav(`/project/${projectId}/day${d === today ? '' : `?d=${d}`}`);
  /* A line about a record opens it in the drawer, over the day (ui/RecordDrawer). */
  const open = (l: DayLine) => {
    if (l.id) openRecord(projectId, l.id);
    else if (l.go) nav(`/project/${projectId}/${l.go}`);
  };

  const send = async () => {
    if (busy) return;
    setBusy(true); setErr(null); setSaid(null);
    try {
      const { jsPDF } = await loadPdfLib();
      const { drawDayReport } = await import('../lib/dayReportPdf');
      const { shotsOf } = await import('../lib/testReport');
      const shots = await shotsOf(day.media, 4);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      drawDayReport(pdf, day, { project: project.name, lead: project.lead, builtAt: Date.now(), shots, onTarget, asOf });
      const how = await deliverPdf(pdf, pdfFileName(project.name, 'day', date), { brand: false }); // its band carries the mark
      setSaid(how === 'downloaded' ? 'Saved — open or send it from the bar below.' : 'Ready — open it from the bar below.');
    } catch (e) {
      console.error('Day report failed', e);
      setErr(isStaleBuildError(e)
        ? 'This tab is still running an older version of the app, so the part that draws the PDF could not load.'
        : (e instanceof Error ? e.message : 'The day report could not be built.'));
    } finally { setBusy(false); }
  };

  return (
    <div className="wrap pace cm-screen">
      <header className="pace-head dy-head">
        <div className="pace-head-main">
          <h1 className="pace-title">{date === today ? 'Today' : niceDay(date, { weekday: 'short', year: date.slice(0, 4) !== today.slice(0, 4) })}{date === today && <span className="dy-date">{niceDay(date, { weekday: 'short' })}</span>}</h1>
          {onTarget && <OnTargetLine v={onTarget} asOf={asOf} />}
          <p className="dy-headline">{day.headline}</p>
        </div>
        {/* FROM THE TOP. Rowland, 5 October: "I wanted to be able to very
            quickly see today and send out an up-to-date movement on today.
            Even that's not easy to do." The button was a "PDF" at the foot of
            the page, under every list and the pictures. It saves the page to
            the device; the bar it leaves (ui/PdfReady) opens it to read and
            sends it — "view it before I send it". */}
        <div className="pace-head-actions">
          <button className="btn btn-primary" onClick={() => void send()} disabled={busy}>
            {busy ? 'Building…' : date === today ? 'Today’s update — PDF' : 'This day — PDF'}
          </button>
        </div>
      </header>
      {(said || err) && (
        <p className={'sub ' + (err ? 'tw-err' : 'tc-ok')} role="status">
          {err ?? said}{' '}
          {err?.startsWith('This tab is still running') && <button className="cw-link" onClick={() => void reloadOntoNewBuild()}>Reload</button>}
        </p>
      )}
      <AccessNote can={can} owner={project.lead} />

      <nav className="dy-nav" aria-label="Pick a day">
        <button className="btn btn-ghost" disabled={!prev} onClick={() => prev && go(prev)}>
          ‹ {prev ? niceDay(prev, { weekday: 'short' }) : 'Earlier'}
        </button>
        <DateInput value={date} max={today} aria-label="Go to a day"
          onCommit={v => { if (ISO.test(v)) go(v); }} />
        <button className="btn btn-ghost" disabled={!next} onClick={() => next && go(next)}>
          {next ? (next === today ? 'Today' : niceDay(next, { weekday: 'short' })) : 'Later'} ›
        </button>
      </nav>

      {/* THE PLAN FOR TODAY — agreed at the huddle, ticked through the day
          (ui/DayPlan). Today it is worked here; on a day that has gone the
          story below says how it went. Offered first: whatever the plan has
          started and not finished by today, late included. */}
      {date === today && planModel(project) === 'commissioning' && (
        <DayPlan projectId={projectId} today={today} tt={tt} can={can}
          due={live(tt.tests).filter(t => !isSettled(t) && !!t.plannedFor && t.plannedFor <= today)
            .sort((a, b) => (plannedEnd(a) ?? '').localeCompare(plannedEnd(b) ?? '') || a.sort - b.sort)} />
      )}

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

      {day.sections.filter(s => !(s.key === 'plan' && date === today && planModel(project) === 'commissioning')).map(s => (
        <section key={s.key} className={'dy-sec is-' + s.key}>
          <h2 className="cmp-h">{s.title}</h2>
          <ul className="dy-lines">
            {s.lines.map((l, i) => (
              <li key={i}>
                <button className={'dy-line is-' + l.tone} onClick={() => open(l)} disabled={!l.id && !l.go}>
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
      ))}

      {day.empty && (
        <p className="sub tw-note">
          Nothing was logged {date === today ? 'yet today' : 'for this day'}. The story writes itself from what is logged —
          a step done, a test run, something found, a machine or a delivery arriving.
          {prev && <> <button className="cw-link" onClick={() => go(prev)}>Go to {niceDay(prev, { weekday: 'short' })}</button></>}
        </p>
      )}

      {day.media.length > 0 && (
        <section className="dy-sec">
          <h2 className="cmp-h">Pictures from the day <span className="cmp-h-n">{day.media.length}</span></h2>
          <div className="dy-pics">
            {day.media.map(m => <EvidenceThumb key={m.id} media={m} size={88} onClick={() => setViewing(m)} />)}
          </div>
        </section>
      )}

      {/* Said once, on an empty day; a day with a story does not need its button explained. */}
      {day.empty && <p className="sub tw-note">“{date === today ? 'Today’s update — PDF' : 'This day — PDF'}” at the top saves one page of this to your device — the day’s story, the gates’ bars and the day’s pictures — to read, then send from the bar it leaves.</p>}

      {viewing && <EvidenceViewer media={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
