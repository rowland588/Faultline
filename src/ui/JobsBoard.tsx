/* THE ALL-JOBS BOARD — every commissioning job, one calendar, one home.
 *
 * Rowland: "When I have multiple projects all going on, how do I see that in
 * one home? … an immersive Gantt that drops down and up, so it's not massive —
 * intuitive, agile. When somebody opens it I want them to say: wow."
 *
 * Read top to bottom it answers, in order, the three things somebody running
 * more than one start-up asks first thing in the morning:
 *
 *   1. How are the jobs going?        the band: one sentence, four numbers,
 *                                      and who owes what across all of them
 *   2. What needs me this week?        every job's late and due-this-week,
 *                                      in one list, each tagged with its job
 *   3. Where do they overlap?          the Gantt: one row a job, one calendar,
 *                                      a row opens in place into that job's
 *                                      own plan, drawn under the same months
 *
 * NOTHING HERE IS NEW DATA. Every number is lib/portfolio over the records the
 * jobs already keep — standing() for each job, the same call its own screen
 * makes — so the board and the job cannot disagree. The job screens are left
 * exactly as they were; this is the door to them, not a replacement.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Project } from '../types';
import { listAssets, listMaterials, listPrograms, listTestItems, listTests, onDataChange } from '../db';
import { portfolio, type JobInput, type JobItem, type JobView } from '../lib/portfolio';
import { niceDay, todayISO } from '../lib/weeks';
import { nav } from '../state/useRoute';
import { Timeline } from './Timeline';

const PCT = (n: number) => `${(n * 100).toFixed(3)}%`;
const OPEN_KEY = 'faultline.jobs.open';

const KIND_WORD: Record<JobItem['kind'], string> = {
  test: 'Test', fix: 'Fix', material: 'Material', program: 'Program', machine: 'Machine',
};
const TONE_WORD: Record<string, string> = {
  done: 'done', failed: 'ran, didn’t pass', ran: 'ran, no verdict yet', late: 'the day has gone', booked: 'still ahead',
};

/** Where a thing on the board opens. */
function whereTo(x: JobItem): string {
  if (x.id) return `/project/${x.jobId}/testing/${encodeURIComponent(x.id)}`;
  if (x.kind === 'material') return `/project/${x.jobId}/materials`;
  if (x.kind === 'program') return `/project/${x.jobId}/programs`;
  return `/project/${x.jobId}/testing`;
}

const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** A number that counts up to itself the first time it is seen. */
function Count({ n }: { n: number }) {
  const [v, setV] = useState(() => (reduced() ? n : 0));
  const from = useRef(0);
  useEffect(() => {
    if (reduced()) { setV(n); return; }
    const start = performance.now(), a = from.current, dur = 900;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      setV(Math.round(a + (n - a) * e));
      if (k < 1) raf = requestAnimationFrame(step); else from.current = n;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [n]);
  return <>{v}</>;
}

function useJobs(projects: Project[]): JobInput[] | null {
  const [inputs, setInputs] = useState<JobInput[] | null>(null);
  const ids = projects.map(p => `${p.id}:${p.updatedAt}`).join('|');
  useEffect(() => {
    let live = true;
    let timer: number | undefined;
    const load = async () => {
      const out = await Promise.all(projects.map(async project => ({
        project,
        tests: await listTests(project.id),
        items: await listTestItems(project.id),
        assets: await listAssets(project.id),
        materials: await listMaterials(project.id),
        programs: await listPrograms(project.id),
      })));
      if (live) setInputs(out);
    };
    void load();
    /* Anything written anywhere — here, or synced from the phone — redraws
       the board a moment later. Bursts collapse into one load. */
    const off = onDataChange(() => { window.clearTimeout(timer); timer = window.setTimeout(() => void load(), 250); });
    return () => { live = false; window.clearTimeout(timer); off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `ids` is the projects, keyed by what can change
  }, [ids]);
  return inputs;
}

function readOpen(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(OPEN_KEY) ?? '[]') as string[]); } catch { return new Set(); }
}

export function JobsBoard({ projects }: { projects: Project[] }) {
  const inputs = useJobs(projects);
  const today = todayISO();
  const pf = useMemo(() => (inputs ? portfolio(inputs, today) : null), [inputs, today]);
  /* Which rows are open, remembered on this device — a convenience, never
     something that has to survive. */
  const [open, setOpen] = useState<Set<string>>(readOpen);
  const toggle = (id: string) => setOpen(cur => {
    const next = new Set(cur);
    if (next.has(id)) next.delete(id); else next.add(id);
    try { localStorage.setItem(OPEN_KEY, JSON.stringify([...next])); } catch { /* fine */ }
    return next;
  });

  if (!pf) return <section className="jb is-loading" aria-busy="true"><div className="jb-hero"><p className="jb-eyebrow">All jobs</p><h2 className="jb-says">Reading every job…</h2></div></section>;
  if (pf.jobs.length === 0) return null;

  const glow = { '--g1': pf.jobs[0]?.color, '--g2': pf.jobs[1]?.color ?? pf.jobs[0]?.color } as CSSProperties;
  const { axis } = pf;

  return (
    <section className="jb" aria-label="All jobs">
      {/* ------------------------------ the band ------------------------------ */}
      <header className="jb-hero" style={glow}>
        <span className="jb-glow" aria-hidden />
        <p className="jb-eyebrow">All jobs · {niceDay(today, { weekday: 'short' })}</p>
        <h2 className="jb-says">{pf.says}</h2>
        <div className="jb-stats">
          <span className="jb-stat"><b><Count n={pf.totals.jobs} /></b>{pf.totals.jobs === 1 ? 'job running' : 'jobs running'}</span>
          <span className="jb-stat"><b><Count n={pf.totals.outstanding} /></b>outstanding</span>
          <span className={'jb-stat' + (pf.totals.late ? ' is-late' : '')}><b><Count n={pf.totals.late} /></b>past the day</span>
          <span className="jb-stat"><b><Count n={pf.totals.week} /></b>this week</span>
        </div>
        {pf.owes.length > 0 && (
          <div className="jb-owes">
            <span className="jb-owes-h">Who owes what</span>
            {pf.owes.slice(0, 6).map(o => (
              <span key={o.who} className={'jb-owe' + (o.late ? ' is-late' : '')}
                title={o.byJob.map(b => `${b.job}: ${b.open}${b.late ? `, ${b.late} late` : ''}`).join('\n')}>
                <b>{o.who}</b>
                <span className="jb-owe-n">{o.open}</span>
                {o.late > 0 && <span className="jb-owe-l">{o.late} late</span>}
                <span className="jb-owe-jobs" aria-hidden>
                  {o.byJob.map(b => <i key={b.jobId} style={{ background: b.color, flexGrow: b.open }} />)}
                </span>
              </span>
            ))}
          </div>
        )}
      </header>

      {/* ---------------------------- this week ---------------------------- */}
      <div className="jb-week">
        <div className="jb-sec-h">
          <h3>This week, across every job</h3>
          <span className="sub">{pf.week.length ? `${pf.week.length} to chase — late first` : 'nothing due, nothing late'}</span>
        </div>
        {pf.week.length > 0 && (
          <ol className="jb-wk-list">
            {pf.week.slice(0, 12).map((x, i) => (
              <li key={`${x.jobId}-${x.kind}-${x.id ?? x.what}-${i}`} style={{ '--job': x.color, '--i': i } as CSSProperties}>
                <button className={'jb-wk' + (x.late ? ' is-late' : '')} onClick={() => nav(whereTo(x))}>
                  <span className="jb-wk-job">{x.job}</span>
                  <b className="jb-wk-what">{x.what}</b>
                  <span className="jb-wk-m">{KIND_WORD[x.kind]} · {x.who || 'nobody yet'}</span>
                  <span className="jb-wk-when">{x.on ? (x.late ? `WAS ${niceDay(x.on)}` : niceDay(x.on, { weekday: 'short' })) : 'no date'}</span>
                </button>
              </li>
            ))}
          </ol>
        )}
        {pf.week.length > 12 && <p className="sub jb-more">And {pf.week.length - 12} more — open a job to see its own list.</p>}
      </div>

      {/* ----------------------------- the Gantt ----------------------------- */}
      <div className="jb-gantt">
        <div className="jb-g-head">
          <span className="jb-g-lab">{pf.jobs.length === 1 ? 'The job' : `${pf.jobs.length} jobs`}<span className="sub"> · tap one to open it here</span></span>
          <div className="jb-g-track">
            {axis.ticks.map(t => <span key={t.label} className="jb-month" style={{ left: PCT(t.at) }}>{t.label}</span>)}
            {axis.today != null && <span className="jb-today-pill" style={{ left: PCT(axis.today) }}>Today</span>}
          </div>
        </div>
        <div className="jb-g-body">
          <div className="jb-g-under" aria-hidden>
            {axis.ticks.map(t => <span key={t.label} className="jb-grid" style={{ left: PCT(t.at) }} />)}
            {axis.today != null && <span className="jb-today" style={{ left: PCT(axis.today) }} />}
          </div>
          {pf.jobs.map((v, i) => (
            <JobRow key={v.id} v={v} i={i} open={open.has(v.id)} onToggle={() => toggle(v.id)} span={pf.span} today={today} />
          ))}
        </div>
        <p className="jb-key sub">
          <span><i className="jb-k is-done" />done</span>
          <span><i className="jb-k is-failed" />ran, didn’t pass</span>
          <span><i className="jb-k is-late" />the day has gone</span>
          <span><i className="jb-k is-booked" />still ahead</span>
          <span><i className="jb-kf" />handover</span>
          <span className="jb-key-say">The bar is the job; how far it is filled is how much of it has happened.</span>
        </p>
      </div>
    </section>
  );
}

function JobRow({ v, i, open, onToggle, span, today }: {
  v: JobView; i: number; open: boolean; onToggle: () => void; span: string[]; today: string;
}) {
  const style = { '--job': v.color, '--i': i } as CSSProperties;
  const slip = v.axis.agreed && v.axis.expected
    ? { from: Math.min(v.axis.agreed.at, v.axis.expected.at), to: Math.max(v.axis.agreed.at, v.axis.expected.at) }
    : undefined;
  const filled = v.total ? v.done / v.total : 0;
  return (
    <div className={'jb-row' + (open ? ' is-open' : '')} style={style}>
      <button className="jb-row-h" onClick={onToggle} onDoubleClick={() => nav(`/project/${v.id}`)} aria-expanded={open}>
        <span className="jb-lab">
          <span className="jb-name"><i className="jb-dot" aria-hidden />{v.name}</span>
          <span className="jb-chips">
            {v.daysToGo != null && (
              <span className={'jb-chip' + (v.daysToGo < 0 ? ' is-late' : '')}>
                {v.daysToGo < 0 ? `${-v.daysToGo} days over` : `${v.daysToGo} days to go`}
              </span>
            )}
            <span className="jb-chip">{v.outstanding} open</span>
            {v.late > 0 && <span className="jb-chip is-late">{v.late} late</span>}
          </span>
          {v.next && (
            <span className={'jb-next' + (v.next.late ? ' is-late' : '')}>
              Next: {v.next.what}{v.next.who ? ` · ${v.next.who}` : ''}{v.next.on ? ` · ${v.next.late ? 'was ' : ''}${niceDay(v.next.on)}` : ''}
            </span>
          )}
        </span>
        <span className="jb-track" aria-hidden>
          {v.from != null && v.to != null && (
            <span className="jb-bar" style={{ left: PCT(v.from), width: PCT(Math.max(0.004, v.to - v.from)) }}>
              <span className="jb-bar-fill" style={{ width: PCT(filled) }} />
            </span>
          )}
          {slip && <span className="jb-slip" style={{ left: PCT(slip.from), width: PCT(slip.to - slip.from) }} />}
          {v.marks.map((m, k) => (
            <span key={`${m.kind}-${k}`} className={`jb-mk is-${m.tone}`} data-tip={`${m.label} · ${m.when} · ${TONE_WORD[m.tone] ?? ''}`}
              style={{ left: PCT(m.at), '--d': Math.min(k, 30) } as CSSProperties} />
          ))}
          {v.axis.expected && (
            <span className="jb-flag" style={{ left: PCT(v.axis.expected.at) }} data-tip={`Handover · ${v.axis.expected.when}`}>
              <span className="jb-flag-t">{v.axis.expected.when}</span>
            </span>
          )}
        </span>
        <span className="jb-chev" aria-hidden />
      </button>

      {/* THE DRAWER. The job's own plan — the same drawing its overview shows —
          under the same months as the board, so opening a row changes the
          detail and not the calendar. */}
      <div className="jb-drawer">
        <div className="jb-drawer-in">
          {open && (
            <div className="jb-drawer-grid">
              {/* The job in words, and its doors, in the column under its name —
                  the calendar keeps the board's width. */}
              <aside className="jb-aside">
                <p className="jb-sent">{v.sentence}{v.slip ? ` ${v.slip}` : ''}</p>
                {v.lead && <p className="sub jb-led">Led by {v.lead}</p>}
                <span className="jb-doors">
                  <button className="btn btn-primary" onClick={() => nav(`/project/${v.id}`)}>Open the job ›</button>
                  <button className="btn btn-ghost" onClick={() => nav(`/project/${v.id}/testing`)}>Testing</button>
                  <button className="btn btn-ghost" onClick={() => nav(`/project/${v.id}/fixes`)}>Fixes</button>
                </span>
              </aside>
              <Timeline marks={v.plan} today={today} expectedAt={v.expectedAt} plannedAt={v.plannedAt} span={span} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
