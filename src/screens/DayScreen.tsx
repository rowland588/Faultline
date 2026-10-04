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
import { nav, useRoute } from '../state/useRoute';
import { Crumbs } from '../ui/Crumbs';
import { Peers, projectPeers } from '../ui/Peers';
import { GATE_PATH } from '../lib/install';
import { EvidenceThumb, EvidenceViewer } from '../ui/Evidence';
import { useStanding } from '../lib/useStanding';
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

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function DayScreen({ projectId }: { projectId: string }) {
  const { project, loading } = useProject(projectId);
  const tt = useTesting(projectId);
  const mats = useMaterials(projectId);
  const progs = usePrograms(projectId);
  const stand = useStanding(projectId);
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
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => nav('/projects')}>All projects</button>
      </div>
    );
  }

  const input = { tests: tt.tests, items: tt.items, assets: tt.assets, materials: mats.materials, programs: progs.programs };
  const day = dayOf(input, date, today);
  /* Back and forward step over the blank days, so the story reads on. */
  const days = activeDays(input);
  const prev = [...days].reverse().find(d => d < date);
  const next = days.find(d => d > date && d <= today) ?? (date < today ? today : undefined);
  const go = (d: string) => nav(`/project/${projectId}/day${d === today ? '' : `?d=${d}`}`);
  const open = (l: DayLine) => {
    if (l.id) nav(`/project/${projectId}/testing/${encodeURIComponent(l.id)}`);
    else if (l.go) nav(`/project/${projectId}/${l.go}`);
  };

  const send = async () => {
    if (busy) return;
    setBusy(true); setErr(null); setSaid(null);
    try {
      const { jsPDF } = await loadPdfLib();
      const { drawDayReport } = await import('../lib/dayReportPdf');
      const { shotsFor, shotKey } = await import('../lib/testReport');
      const shots = await shotsFor(day.media.map(shotKey).filter((k): k is string => !!k), 4);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      drawDayReport(pdf, day, { project: project.name, lead: project.lead, builtAt: Date.now(), shots });
      const how = await deliverPdf(pdf, pdfFileName(project.name, 'day', date), { brand: false }); // its band carries the mark
      setSaid(how === 'shared' ? 'Sent.' : how === 'downloaded' ? 'Downloaded.' : 'Opened in a new tab.');
    } catch (e) {
      console.error('Day report failed', e);
      setErr(isStaleBuildError(e)
        ? 'This tab is still running an older version of the app, so the part that draws the PDF could not load.'
        : (e instanceof Error ? e.message : 'The day report could not be built.'));
    } finally { setBusy(false); }
  };

  return (
    <div className="wrap pace cm-screen">
      <Crumbs trail={[
        { label: 'Control room', to: '/' },
        { label: project.name, to: `/project/${projectId}` },
        { label: 'The day' },
      ]} />
      <header className="pace-head dy-head">
        <div className="pace-head-main">
          <p className="pace-eyebrow">{project.name}</p>
          <h1 className="pace-title">{date === today ? 'Today' : niceDay(date, { weekday: 'short', year: date.slice(0, 4) !== today.slice(0, 4) })}{date === today && <span className="dy-date">{niceDay(date, { weekday: 'short' })}</span>}</h1>
          <p className="dy-headline">{day.headline}</p>
        </div>
      </header>
      {/* The row under the header — see "THE PAGE FRAME" in styles.css. */}
      <Peers peers={projectPeers(projectId, 'day', stand.counts)} />
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

      {/* A bar per gate with steps — Install, Set up, Hand over. */}
      {day.gates.map(g => (
        <button key={g.gate} className="dy-install" onClick={() => nav(`/project/${projectId}/${GATE_PATH[g.gate]}`)}
          aria-label={`${g.label}: ${g.done} of ${g.total} steps done${g.late ? `, ${g.late} late` : ''}`}>
          <span className="dy-install-h"><b>{g.label}</b><span className="sub">{g.done} of {g.total} steps done{date === today ? '' : ' by the end of the day'}</span>
            {g.late > 0 && <span className="sub in-late">{g.late} late</span>}</span>
          {/* Done a quiet green, late red after it — the colour rules. */}
          <span className="dy-bar">
            <span className="is-done" style={{ width: `${(100 * g.done) / g.total}%` }} />
            {g.late > 0 && <span className="is-late" style={{ width: `${(100 * g.late) / g.total}%` }} />}
          </span>
        </button>
      ))}

      {day.sections.map(s => (
        <section key={s.key} className={'dy-sec is-' + s.key}>
          <h2 className="cmp-h">{s.title}</h2>
          <ul className="dy-lines">
            {s.lines.map((l, i) => (
              <li key={i}>
                <button className={'dy-line is-' + l.tone} onClick={() => open(l)} disabled={!l.id && !l.go}>
                  <span className="dy-dot" aria-hidden />
                  <span className="dy-line-m">
                    <span>{l.text}</span>
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

      <div className="tc-send dy-send">
        <button className="btn btn-primary" onClick={() => void send()} disabled={busy}>
          {busy ? 'Building…' : 'PDF'}
        </button>
        {said && <span className="tc-ok">{said}</span>}
      </div>
      {err && (
        <p className="sub tw-err">
          {err}{' '}
          {err.startsWith('This tab is still running') && <button className="cw-link" onClick={() => void reloadOntoNewBuild()}>Reload</button>}
        </p>
      )}
      <p className="sub tw-note">One page: this day’s story, the install bar and the day’s pictures — to send at the end of a shift.</p>

      {viewing && <EvidenceViewer media={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
