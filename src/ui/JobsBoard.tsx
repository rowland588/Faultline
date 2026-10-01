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
 * EVERYTHING ON IT OPENS SOMETHING. A number opens the list behind it; a
 * party opens what that party owes across every job, ready to read down the
 * phone to them; a dot says what it is when tapped, not only when hovered —
 * a finger has no hover. (Rowland's review: "what did you miss?")
 *
 * NOTHING HERE IS NEW DATA. Every number is lib/portfolio over the records the
 * jobs already keep — standing() for each job, the same call its own screen
 * makes — so the board and the job cannot disagree.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Project } from '../types';
import { listAssets, listMaterials, listPrograms, listTestItems, listTests, onDataChange, renameSupplier } from '../db';
import { offerUndo } from './Undo';
import {
  clusterMarks, NOBODY, owedBy, portfolio, SITE, type JobInput, type JobItem, type JobView, type Portfolio,
} from '../lib/portfolio';
import { niceDay, todayISO } from '../lib/weeks';
import { nav } from '../state/useRoute';
import { Timeline } from './Timeline';

const PCT = (n: number) => `${(n * 100).toFixed(3)}%`;
const OPEN_KEY = 'faultline.jobs.open';
const SEEN_KEY = 'faultline.jobs.seen';

const KIND_WORD: Record<JobItem['kind'], string> = {
  install: 'Install step', setup: 'Set-up step', handover: 'Hand-over item', test: 'Test', fix: 'Fix', material: 'Material', program: 'Program', machine: 'Machine',
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

const whenOf = (x: JobItem) => (x.on ? (x.late ? `was ${niceDay(x.on)}` : niceDay(x.on)) : 'no date');

const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/* THE ARRIVAL PLAYS ONCE A SESSION. It greeted you every time you came back
   from a job, which is charming once and in the way by the third time. */
function seenThisSession(): boolean {
  try { return sessionStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
}
function markSeen() {
  try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* fine */ }
}

/** A number that counts up to itself, the first time in a session. */
function Count({ n, still }: { n: number; still: boolean }) {
  const [v, setV] = useState(() => (still || reduced() ? n : 0));
  const from = useRef(still ? n : 0);
  useEffect(() => {
    if (still || reduced()) { setV(n); from.current = n; return; }
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
  }, [n, still]);
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

/* ---------------------------- the focus list ---------------------------- */

type Focus = { t: 'who'; who: string } | { t: 'late' } | { t: 'open' };

function focusOf(pf: Portfolio, f: Focus): { title: string; items: JobItem[] } {
  if (f.t === 'late') {
    const items = pf.items.filter(x => x.late);
    return { title: `${items.length} past the day, across every job`, items };
  }
  if (f.t === 'open') return { title: `Everything outstanding — ${pf.items.length}, late first`, items: pf.items };
  const items = pf.items.filter(x => owedBy(x, f.who));
  const jobs = new Set(items.map(x => x.jobId)).size;
  const across = jobs > 1 ? ` across ${jobs} jobs` : '';
  return { title: f.who === SITE ? `What the site owes — ${items.length}${across}` : f.who === NOBODY ? `${items.length} with nobody named${across}` : `What ${f.who} owes — ${items.length}${across}`, items };
}

/** The list as text, for pasting into an email or reading down the phone. */
const asText = (title: string, items: JobItem[]): string =>
  [title, '', ...items.map(x => `• ${x.job} — ${x.what} (${KIND_WORD[x.kind].toLowerCase()}${x.who ? `, ${x.who}` : ''}) — ${whenOf(x)}`)].join('\n');

function FocusList({ pf, f, onClose }: { pf: Portfolio; f: Focus; onClose: () => void }) {
  const { title, items } = focusOf(pf, f);
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(asText(title, items)).then(() => setCopied(true), () => setCopied(false));
  };
  return (
    <div className="jb-focus" role="region" aria-label={title}>
      <div className="jb-focus-h">
        <h3>{title}</h3>
        <span className="jb-focus-acts">
          {items.length > 0 && <button className="btn btn-ghost btn-sm" onClick={copy}>{copied ? 'Copied' : 'Copy as a list'}</button>}
          <button className="jb-x" onClick={onClose} aria-label="Close">×</button>
        </span>
      </div>
      {items.length === 0
        ? <p className="sub">Nothing.</p>
        : (
          <ol className="jb-focus-list">
            {items.map((x, i) => (
              <li key={`${x.jobId}-${x.kind}-${x.id ?? x.what}-${i}`} style={{ '--job': x.color } as CSSProperties}>
                <button className={'jb-fi' + (x.late ? ' is-late' : '')} onClick={() => nav(whereTo(x))}>
                  <span className="jb-fi-job">{x.job}</span>
                  <b className="jb-fi-what">{x.what}</b>
                  <span className="jb-fi-m">{KIND_WORD[x.kind]}{
                    x.partyKind === 'site' && x.who.trim() ? ` · ${x.who.trim()}`
                      : f.t !== 'who' ? ` · ${x.party ?? 'nobody yet'}` : ''}</span>
                  <span className="jb-fi-when">{whenOf(x)}</span>
                </button>
              </li>
            ))}
          </ol>
        )}
    </div>
  );
}

/* ------------------------------- the board ------------------------------ */

export function JobsBoard({ projects }: { projects: Project[] }) {
  const inputs = useJobs(projects);
  const today = todayISO();
  const pf = useMemo(() => (inputs ? portfolio(inputs, today) : null), [inputs, today]);
  const [still] = useState(seenThisSession);
  useEffect(() => { if (pf) markSeen(); }, [pf]);
  /* Which rows are open, remembered on this device — a convenience, never
     something that has to survive. */
  const [open, setOpen] = useState<Set<string>>(readOpen);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [tip, setTip] = useState<string | null>(null);
  const ganttRef = useRef<HTMLDivElement>(null);
  const weekRef = useRef<HTMLDivElement>(null);

  /* A tapped dot's words close when you tap anywhere else. */
  useEffect(() => {
    if (!tip) return;
    const close = (e: PointerEvent) => { if (!(e.target as HTMLElement).closest?.('.jb-mk')) setTip(null); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [tip]);

  const toggle = (id: string) => setOpen(cur => {
    const next = new Set(cur);
    if (next.has(id)) next.delete(id); else next.add(id);
    try { localStorage.setItem(OPEN_KEY, JSON.stringify([...next])); } catch { /* fine */ }
    return next;
  });
  const tidy = async (to: string, spellings: string[]) => {
    const { changed, undo } = await renameSupplier(projects.map(p => p.id), spellings, to);
    if (changed > 0) offerUndo(`${changed} ${changed === 1 ? 'record now says' : 'records now say'} “${to}”`, undo);
  };
  const pick = (f: Focus) => setFocus(cur => (cur && JSON.stringify(cur) === JSON.stringify(f) ? null : f));

  if (!pf) return <section className="jb is-loading" aria-busy="true"><div className="jb-hero"><p className="jb-eyebrow">Stage gate · all jobs</p><h2 className="jb-says">Reading every job…</h2></div></section>;
  if (pf.jobs.length === 0) return null;

  const glow = { '--g1': pf.jobs[0]?.color, '--g2': pf.jobs[1]?.color ?? pf.jobs[0]?.color } as CSSProperties;
  const { axis } = pf;
  const on = (f: Focus) => !!focus && JSON.stringify(focus) === JSON.stringify(f);

  return (
    <section className={'jb' + (still ? ' is-still' : '')} aria-label="All jobs">
      {/* ------------------------------ the band ------------------------------ */}
      <header className="jb-hero" style={glow}>
        <span className="jb-glow" aria-hidden />
        <p className="jb-eyebrow">Stage gate · all jobs · {niceDay(today, { weekday: 'short' })}</p>
        <h2 className="jb-says">{pf.says}</h2>
        <div className="jb-stats">
          <button className="jb-stat" onClick={() => ganttRef.current?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' })}>
            <b><Count n={pf.totals.jobs} still={still} /></b>{pf.totals.jobs === 1 ? 'job running' : 'jobs running'}
          </button>
          <button className={'jb-stat' + (on({ t: 'open' }) ? ' is-on' : '')} onClick={() => pick({ t: 'open' })} aria-pressed={on({ t: 'open' })}>
            <b><Count n={pf.totals.outstanding} still={still} /></b>outstanding
          </button>
          <button className={'jb-stat' + (pf.totals.late ? ' is-late' : '') + (on({ t: 'late' }) ? ' is-on' : '')}
            onClick={() => pick({ t: 'late' })} aria-pressed={on({ t: 'late' })}>
            <b><Count n={pf.totals.late} still={still} /></b>past the day
          </button>
          <button className="jb-stat" onClick={() => weekRef.current?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' })}>
            <b><Count n={pf.totals.week} still={still} /></b>this week
          </button>
        </div>
        {pf.owes.length > 0 && (
          <div className="jb-owes">
            <span className="jb-owes-h">Who owes what</span>
            {pf.owes.slice(0, 8).map(o => {
              const label = o.kind === 'site' ? 'The site' : o.kind === 'nobody' ? 'No one named' : o.who;
              const split = pf.jobs.length > 1 && o.byJob.length > 0;
              return (
                <button key={o.who} className={'jb-owe is-' + o.kind + (o.late ? ' is-late' : '') + (on({ t: 'who', who: o.who }) ? ' is-on' : '')}
                  onClick={() => pick({ t: 'who', who: o.who })} aria-pressed={on({ t: 'who', who: o.who })}>
                  <b>{label}</b>
                  <span className="jb-owe-n">{o.kind === 'nobody' ? 'has' : 'owes'} {o.open}</span>
                  {o.late > 0 && <span className="jb-owe-l">{o.late} late</span>}
                  {split && (
                    <span className="jb-owe-jobs">
                      {o.byJob.map(b => <span key={b.jobId} className="jb-owe-job"><i style={{ background: b.color }} aria-hidden />{b.job} {b.open}</span>)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        {/* THE RECORDS DISAGREE. The same company typed two ways is counted as
            one here and on the client report already; this makes the records
            say it one way too, in a tap, and it can be undone. */}
        {pf.variants.map(c => (
          <p key={c.name} className="jb-tidy">
            <span><b>{c.spellings.map(sp => sp.name).join(' and ')}</b> look like one company.</span>
            <span className="jb-tidy-acts">
              {c.spellings.map(sp => (
                <button key={sp.name} className="jb-tidy-b" onClick={() => void tidy(sp.name, c.spellings.map(x => x.name))}>
                  Call it {sp.name}
                </button>
              ))}
            </span>
          </p>
        ))}
      </header>

      {focus && <FocusList pf={pf} f={focus} onClose={() => setFocus(null)} />}

      {/* ---------------------------- this week ---------------------------- */}
      <div className="jb-week" ref={weekRef}>
        <div className="jb-sec-h">
          <h3>This week, across every job</h3>
          <span className="sub">{pf.week.length ? `${pf.week.length} to chase — late first` : 'nothing due, nothing late'}</span>
        </div>
        {pf.week.length > 0 && <WeekStrip items={pf.week} />}
      </div>

      {/* ----------------------------- the Gantt ----------------------------- */}
      <div className="jb-gantt" ref={ganttRef}>
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
            <JobRow key={v.id} v={v} i={i} open={open.has(v.id)} onToggle={() => toggle(v.id)}
              span={pf.span} today={today} tip={tip} setTip={setTip} />
          ))}
        </div>
        <p className="jb-key sub">
          <span><i className="jb-k is-done" />done</span>
          <span><i className="jb-k is-failed" />ran, didn’t pass</span>
          <span><i className="jb-k is-late" />the day has gone</span>
          <span><i className="jb-k is-booked" />still ahead</span>
          <span><i className="jb-k is-many">3</i>several on the same days</span>
          <span><i className="jb-kf" />handover</span>
          <span className="jb-key-say">Tap a dot to see what it is.</span>
        </p>
      </div>
    </section>
  );
}

/* THE WEEK STRIP says there is more to the side. On a desk it scrolled with
   nothing to show that it could; now it has arrows, and the edge fades where
   more cards are waiting. */
function WeekStrip({ items }: { items: JobItem[] }) {
  const ref = useRef<HTMLOListElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
    read();
    el.addEventListener('scroll', read, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(read) : undefined;
    ro?.observe(el);
    return () => { el.removeEventListener('scroll', read); ro?.disconnect(); };
  }, [items.length]);
  const by = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: reduced() ? 'auto' : 'smooth' });
  return (
    <div className={'jb-wk-wrap' + (edges.left ? ' more-left' : '') + (edges.right ? ' more-right' : '')}>
      {edges.left && <button className="jb-wk-arrow is-left" onClick={() => by(-1)} aria-label="Earlier">‹</button>}
      <ol className="jb-wk-list" ref={ref}>
        {items.map((x, i) => (
          <li key={`${x.jobId}-${x.kind}-${x.id ?? x.what}-${i}`} style={{ '--job': x.color, '--i': Math.min(i, 8) } as CSSProperties}>
            <button className={'jb-wk' + (x.late ? ' is-late' : '')} onClick={() => nav(whereTo(x))}>
              <span className="jb-wk-job">{x.job}</span>
              <b className="jb-wk-what">{x.what}</b>
              <span className="jb-wk-m">{KIND_WORD[x.kind]} · {x.who || 'nobody yet'}</span>
              <span className="jb-wk-when">{x.on ? (x.late ? `WAS ${niceDay(x.on)}` : niceDay(x.on, { weekday: 'short' })) : 'no date'}</span>
            </button>
          </li>
        ))}
      </ol>
      {edges.right && <button className="jb-wk-arrow is-right" onClick={() => by(1)} aria-label="More">›</button>}
    </div>
  );
}

function JobRow({ v, i, open, onToggle, span, today, tip, setTip }: {
  v: JobView; i: number; open: boolean; onToggle: () => void; span: string[]; today: string;
  tip: string | null; setTip: (k: string | null) => void;
}) {
  const style = { '--job': v.color, '--i': i } as CSSProperties;
  const slip = v.axis.agreed && v.axis.expected
    ? { from: Math.min(v.axis.agreed.at, v.axis.expected.at), to: Math.max(v.axis.agreed.at, v.axis.expected.at) }
    : undefined;
  const filled = v.total ? v.done / v.total : 0;
  const clusters = useMemo(() => clusterMarks(v.marks), [v.marks]);
  const empty = v.marks.length === 0;
  return (
    <div className={'jb-row' + (open ? ' is-open' : '')} style={style}>
      <div className="jb-row-h">
        {/* The name opens the row. Double-click used to go straight into the
            job; nobody finds a double-click, and "Open the job" in the drawer
            is the door that says so. */}
        <button className="jb-lab" onClick={onToggle} aria-expanded={open}>
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
        </button>

        <div className="jb-track" onClick={e => { if (e.target === e.currentTarget) onToggle(); }}>
          {/* A JOB WITH NOTHING DATED said nothing at all — an empty stripe
              that read as broken. It says what it needs. */}
          {empty ? (
            <span className="jb-empty">
              Nothing dated yet — add the machines and when they are due.
              <button className="btn btn-ghost btn-sm" onClick={() => nav(`/project/${v.id}/testing`)}>Add them ›</button>
            </span>
          ) : (
            <>
              {v.from != null && v.to != null && (
                <span className="jb-bar" style={{ left: PCT(v.from), width: PCT(Math.max(0.004, v.to - v.from)) }} onClick={onToggle}>
                  <span className="jb-bar-fill" style={{ width: PCT(filled) }} />
                </span>
              )}
              {slip && <span className="jb-slip" style={{ left: PCT(slip.from), width: PCT(slip.to - slip.from) }} onClick={onToggle} />}
              {clusters.map((c, k) => {
                const id = `${v.id}:${k}`;
                const words = c.marks.length === 1
                  ? `${c.marks[0].label}\n${c.marks[0].when} · ${TONE_WORD[c.marks[0].tone] ?? ''}`
                  : [`${c.marks.length} things, ${c.marks[0].when}${c.marks[c.marks.length - 1].when !== c.marks[0].when ? ` – ${c.marks[c.marks.length - 1].when}` : ''}`,
                    ...c.marks.slice(0, 4).map(m => `· ${m.label} — ${TONE_WORD[m.tone] ?? ''}`),
                    ...(c.marks.length > 4 ? [`· and ${c.marks.length - 4} more`] : [])].join('\n');
                return (
                  <button key={id} type="button"
                    className={`jb-mk is-${c.tone}` + (c.marks.length > 1 ? ' is-many' : '') + (tip === id ? ' is-on' : '')
                      + (c.at > 0.75 ? ' tip-end' : c.at < 0.2 ? ' tip-start' : '')}
                    style={{ left: PCT(c.at), '--d': Math.min(k, 30) } as CSSProperties}
                    data-tip={words} aria-label={words.replace(/\n/g, ' ')}
                    onClick={e => { e.stopPropagation(); setTip(tip === id ? null : id); }}>
                    {c.marks.length > 1 ? c.marks.length : ''}
                  </button>
                );
              })}
              {v.axis.expected && (
                <span className="jb-flag" style={{ left: PCT(v.axis.expected.at) }}>
                  <span className="jb-flag-t">{v.axis.expected.when}</span>
                </span>
              )}
            </>
          )}
        </div>

        <button className="jb-chev-b" onClick={onToggle} aria-label={open ? `Close ${v.name}` : `Open ${v.name} here`}>
          <span className="jb-chev" aria-hidden />
        </button>
      </div>

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
                  <button className="btn btn-ghost" onClick={() => nav(`/project/${v.id}/testing`)}>Commission</button>
                  <button className="btn btn-ghost" onClick={() => nav(`/project/${v.id}/fixes`)}>Fixes</button>
                </span>
              </aside>
              {empty
                ? <p className="sub jb-drawer-empty">When the machines have dates, the plan draws itself here.</p>
                : <Timeline marks={v.plan} today={today} expectedAt={v.expectedAt} plannedAt={v.plannedAt} span={span} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
