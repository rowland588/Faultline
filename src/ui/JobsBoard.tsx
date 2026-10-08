/* THE CONTROL ROOM — every job on every method, one calendar, one home.
 *
 * It was every STAGE-GATE job only. Rowland: "turn it into a control room for
 * change on your lines" — a 6M job or a lever tree job is a change to a line
 * too, and the one place that says "am I in control?" has to hold all of them.
 * A stage-gate row leads with its four gates; a 6M row with its open
 * countermeasures by bone and how many lines are at target; a lever tree row
 * with its tree. Same calendar, same "who owes what", same "this week".
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
import {
  listAssets, listMaterials, listPrograms, listTestItems, listTests, listPaceTodos, listTargets, listReadings,
  loadPaceLines, onDataChange, renameSupplier, listTreeNodes,
} from '../db';
import { bindSources, treeStanding, withTrackerRows } from '../lib/treeBind';
import { stepAction } from '../lib/actions';
import { planModel } from '../lib/planModel';
import { gapOf, lineSeries } from '../lib/measures';
import { loadProblems, viewsOf } from '../lib/useProblems';
import { fishboneUrl } from '../screens/FishboneScreen';
import { offerUndo } from './Undo';
import {
  clusterMarks, kindWord, lateWhen, NOBODY, owedBy, portfolio, SITE, type JobInput, type JobItem, type JobView, type PacedInput, type Portfolio,
  type Said, type SixMProblem,
} from '../lib/portfolio';
import { linesOnTarget } from '../lib/onTarget';
import { criticalCount } from '../lib/critical';
import { niceDay, todayISO } from '../lib/weeks';
import { nav } from '../state/useRoute';
import { openRecord } from './RecordDrawer';
import { Timeline } from './Timeline';
import { GATE_TONE_WORD, recordHref } from '../lib/install';
import { gateSpans, planHref } from '../lib/plan';
import { Icon } from './Icon';
import { publishJobStands } from './railJobs';
import { supabase } from '../cloud/client';
import { useSession } from '../cloud/session';
import { useProfile } from '../cloud/admin';
import { accessOf, can as canOf, type Can } from '../lib/access';

const PCT = (n: number) => `${(n * 100).toFixed(3)}%`;
const OPEN_KEY = 'faultline.jobs.open';
const SEEN_KEY = 'faultline.jobs.seen';

/* (The word each row is filed under is lib/portfolio's kindWord — the same
   words the job's front page uses, and "Part of the plan" for a stage's part.
   A copy of them lived here.) */
/* Late and a problem said apart — never "late or a problem" (lib/install). */
const GATE_WORD = GATE_TONE_WORD;
const TONE_WORD: Record<string, string> = {
  done: 'done', failed: 'ran, didn’t pass', ran: 'ran, no verdict yet', late: 'the day has gone', booked: 'still ahead',
};

/** Where a thing on the board opens. */
function whereTo(x: JobItem): string {
  /* An action opens on its own sheet (the board reads ?a=), not on the whole
     board with the one you tapped somewhere in it. */
  if (x.kind === 'action') return `/project/${x.jobId}/board${x.id ? `?a=${encodeURIComponent(x.id)}` : ''}`;
  if (x.kind === 'note') return `/project/${x.jobId}/notes`;
  if (x.id) return recordHref(x.jobId, x.id, x.kind);
  if (x.kind === 'material') return `/project/${x.jobId}/materials`;
  if (x.kind === 'program') return `/project/${x.jobId}/programs`;
  return `/project/${x.jobId}/testing`;
}

/** A step, a test or a fix opens in the record's drawer, over the control
 *  room (ui/RecordDrawer) — × comes back here; anything else goes where it
 *  is kept. */
function openItem(x: JobItem): void {
  if (x.id && x.kind !== 'action' && x.kind !== 'note') openRecord(x.jobId, x.id);
  else nav(whereTo(x));
}
const RECORD_MARK = new Set(['test', 'fix', 'install', 'setup', 'handover']);

const whenOf = (x: JobItem) => (x.critical ? x.critical.state : x.late ? lateWhen(x, todayISO()) : x.on ? niceDay(x.on) : 'no date');

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

interface Jobs { gate: JobInput[]; paced: PacedInput[] }

/** A tree box's state as one of the row's tiles: red overdue, amber at risk,
 *  indigo under way, green done, grey not started — the house colours. */
const TREE_TONE: Record<string, string> = { r: 'late', a: 'risk', w: 'going', g: 'done', n: 'none' };

/** Every project, read the way its own method reads it. */
function useJobs(projects: Project[]): Jobs | null {
  const [inputs, setInputs] = useState<Jobs | null>(null);
  const ids = projects.map(p => `${p.id}:${p.updatedAt}`).join('|');
  useEffect(() => {
    let live = true;
    let timer: number | undefined;
    const load = async () => {
      const gateProjects = projects.filter(p => planModel(p) === 'commissioning');
      const pacedProjects = projects.filter(p => planModel(p) !== 'commissioning');
      const gate = await Promise.all(gateProjects.map(async project => ({
        project,
        tests: await listTests(project.id),
        items: await listTestItems(project.id),
        assets: await listAssets(project.id),
        materials: await listMaterials(project.id),
        programs: await listPrograms(project.id),
      })));
      const paced = await Promise.all(pacedProjects.map(async (project): Promise<PacedInput> => {
        const [steps, lines, targets, readings, items] = await Promise.all([
          listPaceTodos(project.id), loadPaceLines(project.id), listTargets(project.id), listReadings(project.id), listTestItems(project.id),
        ]);
        // The same call the project's own page makes, so the row and the page agree.
        const series = lines.map(l => lineSeries(project.measures ?? [], project.periods ?? [], targets, readings, l.id));
        /* A lever tree job's tree, drawn the way the tree and the report draw
           it — board rows hung in, and a box bound to a number in that
           number's colour — so the row cannot say something the tree does not. */
        const tree = planModel(project) === 'tree'
          ? treeStanding(withTrackerRows(await listTreeNodes(project.id), bindSources(
            steps.map(s => stepAction(s, lines)), steps, lines,
            { measures: project.measures ?? [], periods: project.periods ?? [], targets, readings })))
          : undefined;
        /* A 6M job's problems, read by the engine its fishbone and its client
           report read them with — the phase is phaseOf's, not worked out here —
           and each line against its target in the report's own sentence. */
        let problems: SixMProblem[] | undefined;
        let gaps: PacedInput['gaps'];
        if (planModel(project) === 'board') {
          const day = todayISO();
          const loaded = await loadProblems(project.id).catch(() => null);
          problems = loaded
            ? viewsOf(loaded, project.id, undefined, Date.parse(`${day}T23:59:59`)).map(v => ({
              id: v.problem.id, title: v.problem.title, phase: v.phase, says: v.says,
              ...(v.problem.lineId ? { lineId: v.problem.lineId } : {}),
            }))
            : undefined;
          gaps = (project.measures ?? []).length
            ? lines.map((l, i) => ({ lineId: l.id, line: l.name, ...gapOf(l.name, series[i]) }))
            : [];
        }
        return {
          project, steps, lines, notes: items.filter(i => i.kind === 'note'), tree, problems, gaps,
          atTarget: series.filter(x => x?.meeting === true).length,
          judged: series.filter(x => x?.meeting != null).length,
          /* Are its lines on target? — the answer its front page leads with. */
          onTarget: linesOnTarget(lines.map((l, i) => ({ name: l.name, series: series[i] }))),
        };
      }));
      if (live) setInputs({ gate, paced });
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

type Focus = { t: 'who'; who: string } | { t: 'late' } | { t: 'critical' };

function focusOf(pf: Portfolio, f: Focus): { title: string; items: JobItem[] } {
  /* Every open critical problem, every job (lib/portfolio criticalItems). */
  if (f.t === 'critical') return { title: `${criticalCount(pf.critical.length)}, across every job`, items: pf.critical };
  if (f.t === 'late') {
    const items = pf.items.filter(x => x.late);
    return { title: `${items.length} late, across every job`, items };
  }
  const items = pf.items.filter(x => owedBy(x, f.who));
  const jobs = new Set(items.map(x => x.jobId)).size;
  const across = jobs > 1 ? ` across ${jobs} jobs` : '';
  return { title: f.who === SITE ? `What the site owes — ${items.length}${across}` : f.who === NOBODY ? `${items.length} with nobody named${across}` : `What ${f.who} owes — ${items.length}${across}`, items };
}

/** The list as text, for pasting into an email or reading down the phone. */
const asText = (title: string, items: JobItem[]): string =>
  [title, '', ...items.map(x => `• ${x.job} — ${x.what} (${kindWord(x).toLowerCase()}${x.who ? `, ${x.who}` : ''}) — ${whenOf(x)}`)].join('\n');

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
          <button className="jb-x" onClick={onClose} aria-label="Close"><Icon name="close" size="0.85em" /></button>
        </span>
      </div>
      {items.length === 0
        ? <p className="sub">Nothing.</p>
        : (
          <ol className="jb-focus-list">
            {items.map((x, i) => (
              <li key={`${x.jobId}-${x.kind}-${x.id ?? x.what}-${i}`} style={{ '--job': x.color } as CSSProperties}>
                <button className={'jb-fi' + (x.late || x.critical ? ' is-late' : '')} onClick={() => openItem(x)}>
                  <span className="jb-fi-job">{x.job}</span>
                  <b className="jb-fi-what">{x.what}</b>
                  <span className="jb-fi-m">{x.critical ? x.critical.where : kindWord(x)}{
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

/* ------------------------- who may do what, per job ------------------------
 * The rule useAccess applies on a job's own pages (lib/access), read once for
 * a whole list of jobs: the owner from the project's own owner id, a client
 * from one read of the people lists — useAccess per row would read the
 * project list once a row. Offline, a client's projects are the ones useAccess
 * last remembered as such on this device. */
export function useAccessByJob(projects: Project[]): (id: string) => Can {
  const { session } = useSession();
  const { profile } = useProfile();
  const email = (session?.user.email ?? '').toLowerCase();
  const [clientOf, setClientOf] = useState<Set<string> | null>(null);
  useEffect(() => {
    if (!supabase || !email) return;
    let alive = true;
    void supabase.from('project_members').select('project_id').eq('email', email).eq('access', 'client')
      .then(({ data, error }) => {
        if (!alive || error) return;   // no signal, or a cloud without the column: keep what was remembered
        setClientOf(new Set(((data as { project_id: string }[] | null) ?? []).map(r => r.project_id)));
      });
    return () => { alive = false; };
  }, [email]);
  const remembered = (id: string): boolean => {
    try { return localStorage.getItem(`faultline.access.${id}.${email}`) === 'client'; } catch { return false; }
  };
  /* The same development switch useAccess reads. */
  let forced: string | null = null;
  if (import.meta.env.DEV) { try { forced = localStorage.getItem('faultline.access.force'); } catch { /* fine */ } }
  return (id: string) => {
    if (forced === 'owner' || forced === 'team' || forced === 'client') return canOf(forced);
    const client = clientOf ? clientOf.has(id) : remembered(id);
    return canOf(accessOf({
      signedIn: !!supabase && !!session, myId: session?.user.id, myEmail: email,
      isSuper: !!profile?.is_super, ownerId: projects.find(p => p.id === id)?.ownerId,
      mine: client ? { access: 'client' } : null,
    }));
  };
}

/* ------------------------------- the board ------------------------------ */

export function JobsBoard({ projects }: { projects: Project[] }) {
  const inputs = useJobs(projects);
  const accessOn = useAccessByJob(projects);
  /* The supplier tidy rewrites records, so only on the jobs this person may
     change — a client's are read, never written. */
  const editable = projects.filter(p => accessOn(p.id).edit).map(p => p.id);
  const today = todayISO();
  const pf = useMemo(() => (inputs ? portfolio(inputs.gate, today, inputs.paced) : null), [inputs, today]);
  const [still] = useState(seenThisSession);
  useEffect(() => { if (pf) markSeen(); }, [pf]);
  /* The rail's squares beside each job say what this board says (ui/railJobs). */
  useEffect(() => { if (pf) publishJobStands(pf.jobs); }, [pf]);
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
    const { changed, undo } = await renameSupplier(editable, spellings, to);
    if (changed > 0) offerUndo(`${changed} ${changed === 1 ? 'record now says' : 'records now say'} “${to}”`, undo);
  };
  const pick = (f: Focus) => setFocus(cur => (cur && JSON.stringify(cur) === JSON.stringify(f) ? null : f));

  if (!pf) return <section className="jb is-loading" aria-busy="true"><div className="jb-hero"><p className="jb-eyebrow">Every job</p><h1 className="jb-says">Reading every job…</h1></div></section>;
  if (pf.jobs.length === 0) return null;

  const glow = { '--g1': pf.jobs[0]?.color, '--g2': pf.jobs[1]?.color ?? pf.jobs[0]?.color } as CSSProperties;
  const { axis } = pf;
  const on = (f: Focus) => !!focus && JSON.stringify(focus) === JSON.stringify(f);

  return (
    <section className={'jb' + (still ? ' is-still' : '')} aria-label="All jobs">
      {/* ------------------------------ the band ------------------------------ */}
      <header className="jb-hero" style={glow}>
        <span className="jb-glow" aria-hidden />
        <p className="jb-eyebrow">Control room · every job · {niceDay(today, { weekday: 'short' })}</p>
        {/* The page's one heading: Home had none, so a screen reader landed on
            the logo and "Who owes what" with no name for the page itself. */}
        <h1 className="jb-says">{pf.says}</h1>
        <div className="jb-stats">
          <button className="jb-stat" onClick={() => ganttRef.current?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' })}>
            <b><Count n={pf.totals.jobs} still={still} /></b>{pf.totals.jobs === 1 ? 'job running' : 'jobs running'}
          </button>
          {/* NO "OUTSTANDING" HERE ANY MORE. It added up every planned gate
              step on every job — the work ahead, not what is owed — and read
              as a backlog: Rowland, "states loads open but they are gates".
              Each row now says the gate its job is at; what needs chasing is
              the two numbers either side. */}
          <button className={'jb-stat' + (pf.totals.late ? ' is-late' : '') + (on({ t: 'late' }) ? ' is-on' : '')}
            onClick={() => pick({ t: 'late' })} aria-pressed={on({ t: 'late' })}>
            <b><Count n={pf.totals.late} still={still} /></b>late
          </button>
          {/* OPEN CRITICAL PROBLEMS, every job — only when there is one (a
              zero is not said); solid red, a problem's colour. */}
          {pf.totals.critical > 0 && (
            <button className={'jb-stat is-crit' + (on({ t: 'critical' }) ? ' is-on' : '')}
              onClick={() => pick({ t: 'critical' })} aria-pressed={on({ t: 'critical' })}>
              <b><Count n={pf.totals.critical} still={still} /></b>critical
            </button>
          )}
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
        {editable.length > 0 && pf.variants.map(c => (
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

      {/* --------------------------- reminders --------------------------- */}
      {/* Dates set on notes, every job — Rowland: "the app will remind
          me." Their own strip, in their own colour, above what is owed. */}
      {pf.reminders.length > 0 && (
        <div className="jb-week jb-rem">
          <div className="jb-sec-h">
            <h3>Reminders</h3>
            <span className="sub">
              {(() => { const now = pf.reminders.filter(r => r.on && r.on <= today).length;
                return `${pf.reminders.length} from your notes${now ? ` — ${now} today or gone` : ' — coming up this week'}`; })()}
            </span>
          </div>
          <WeekStrip items={pf.reminders} />
        </div>
      )}

      {/* --------------------------- no date agreed --------------------------- */}
      {/* Fixes booked with no date agreed — Rowland's "we've agreed a date, or
          we haven't". The ones we haven't are chased from here. */}
      {pf.undated.length > 0 && (
        <div className="jb-week jb-undated">
          <div className="jb-sec-h">
            <h3>No date agreed</h3>
            <span className="sub">{pf.undated.length} fix{pf.undated.length === 1 ? '' : 'es'} — agree a date with whoever has {pf.undated.length === 1 ? 'it' : 'them'}</span>
          </div>
          <WeekStrip items={pf.undated} />
        </div>
      )}

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
            <JobRow key={v.id} v={v} i={i} open={open.has(v.id)} onToggle={() => toggle(v.id)} edit={accessOn(v.id).edit}
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
            <button className={'jb-wk' + (x.late ? ' is-late' : '') + (x.kind === 'note' ? ' is-note' : '')} onClick={() => openItem(x)}>
              <span className="jb-wk-job">{x.job}</span>
              <b className="jb-wk-what">{x.what}</b>
              <span className="jb-wk-m">{x.kind === 'note' ? 'Reminder · from the notes' : `${kindWord(x)} · ${x.who || 'nobody yet'}`}</span>
              <span className="jb-wk-when">{x.on ? (x.kind === 'note' && x.on === todayISO() ? 'TODAY' : x.late ? lateWhen(x, todayISO()).toUpperCase() : niceDay(x.on, { weekday: 'short' })) : x.late ? lateWhen(x, todayISO()).toUpperCase() : x.kind === 'fix' ? 'NO DATE AGREED' : 'no date'}</span>
            </button>
          </li>
        ))}
      </ol>
      {edges.right && <button className="jb-wk-arrow is-right" onClick={() => by(1)} aria-label="More">›</button>}
    </div>
  );
}

/** A sentence in pieces, the abnormal piece in its colour — late or slipped
 *  red, waiting amber, nothing-there grey — and the rest plain ink. */
function SaidLine({ parts, className }: { parts: Said[]; className: string }) {
  return (
    <span className={className}>
      {parts.map((x, k) => (x.tone ? <span key={k} className={'jb-said is-' + x.tone}>{x.text}</span> : x.text))}
    </span>
  );
}

function JobRow({ v, i, open, onToggle, span, today, tip, setTip, edit }: {
  v: JobView; i: number; open: boolean; onToggle: () => void; span: string[]; today: string;
  tip: string | null; setTip: (k: string | null) => void;
  /** May add to this job — false for its client, who reads it. */
  edit: boolean;
}) {
  const style = { '--job': v.color, '--i': i } as CSSProperties;
  const slip = v.axis.agreed && v.axis.expected
    ? { from: Math.min(v.axis.agreed.at, v.axis.expected.at), to: Math.max(v.axis.agreed.at, v.axis.expected.at) }
    : undefined;
  const filled = v.total ? v.done / v.total : 0;
  const clusters = useMemo(() => clusterMarks(v.marks), [v.marks]);
  const empty = v.marks.length === 0;
  /* A stage-gate job reads as its GATES, each from the day anything at it starts
     to the day it finishes — not as a bar and a handful of dots. */
  const spans = useMemo(() => (v.method === 'commissioning' ? gateSpans(v.marks, v.plan) : []), [v.marks, v.plan, v.method]);
  return (
    <div className={'jb-row' + (open ? ' is-open' : '')} style={style}>
      <div className="jb-row-h">
        {/* The name opens the row. Double-click used to go straight into the
            job; nobody finds a double-click, and "Open the job" in the drawer
            is the door that says so. */}
        <button className="jb-lab" onClick={onToggle} aria-expanded={open}>
          <span className="jb-name"><i className="jb-dot" aria-hidden />{v.name}</span>
          {/* ARE WE ON TARGET? — the job's answer in a word, the reason in
              words (lib/onTarget): the line its front page and its reports
              lead with, so the row and the job cannot disagree. */}
          {v.onTarget && (
            <span className={'jb-ot is-' + v.onTarget.tone}>
              <b className="jb-ot-w">{v.onTarget.word}</b>
              <span className="jb-ot-r">{v.onTarget.reason}</span>
            </span>
          )}
          <span className="jb-chips">
            {/* "Handover" is a stage-gate job's day. A running line is not
                handed over — its date is the one it should be at target by. */}
            {v.daysToGo != null && (
              <span className={'jb-chip' + (v.daysToGo < 0 ? ' is-late' : '')}>
                {v.method === 'commissioning'
                  ? (v.daysToGo < 0 ? `${-v.daysToGo} days over handover` : `${v.daysToGo} days to handover`)
                  : (v.daysToGo < 0 ? `${-v.daysToGo} days past its date` : `${v.daysToGo} days to its date`)}
              </span>
            )}
            {/* Where the job is, not how much is on its lists. A stage-gate job
                is AT a gate; a 6M or tree job is a kind of change, and how its
                lines are doing against target. */}
            {v.method === 'commissioning'
              ? (v.at === 'Handed over'
                ? <span className="jb-chip is-at is-done">Handed over</span>
                /* Nothing started at any gate is not "at Install": the gates say
                   "not started" in grey, and so does the row. */
                : v.gates.length > 0 && v.gates.every(g => g.tone === 'none')
                ? <span className="jb-chip is-at is-none">Not started</span>
                : <span className={'jb-chip is-at is-' + (v.gates.find(g => g.label === v.at)?.tone ?? 'none')}>at {v.at}</span>)
              : <>
                <span className="jb-chip is-at is-none">{v.methodLabel}</span>
                {/* Indigo said "under way" of "2 of 2 at target". At target is
                    normal and stays plain; a line short of it is the red. The
                    on-target line above says the same count and names the
                    short line, so the chip only stands in when it is absent. */}
                {v.reach && !v.onTarget && <span className={'jb-chip is-at' + (v.reachShort ? ' is-late' : '')}>{v.reach}</span>}
              </>}
            {/* A 6M row says what is late in the line under it, with which
                bones — the same number twice on one row is one too many. So
                does a stage-gate row: its on-target reason says how many are
                late, with the hours they lost. */}
            {v.late > 0 && !v.sixm && v.method !== 'commissioning' && <span className="jb-chip is-late">{v.late} late</span>}
            {/* "1 critical", solid red — its open critical problems (lib/critical). */}
            {v.critical.length > 0 && <span className="jb-chip is-crit">{criticalCount(v.critical.length)}</span>}
          </span>
          {v.method === 'commissioning' ? (
            <span className="jb-gates" aria-label={v.gates.map(g => `${g.label}: ${GATE_WORD[g.tone]}`).join(', ')}>
              {v.gates.map(g => (
                <span key={g.gate} className={'jb-gate is-' + g.tone + (g.label === v.at ? ' is-now' : '')}
                  title={`${g.label}: ${GATE_WORD[g.tone]}`}>{g.label}</span>
              ))}
            </span>
          ) : v.tree ? (
            /* A LEVER TREE JOB LEADS WITH ITS TREE: the outcome, then the
               conditions that are off track — only the abnormal ones carry a
               colour, and each says its state in words. */
            <span className="jb-gates" aria-label={v.tree.says}>
              <span className={'jb-gate is-wide is-' + TREE_TONE[v.tree.outcome.rag]} title={v.tree.says}>Outcome {v.tree.outcome.word}</span>
              {v.tree.late > 0 && <span className="jb-gate is-late">{v.tree.late} overdue</span>}
              {v.tree.risk > 0 && <span className="jb-gate is-risk">{v.tree.risk} at risk</span>}
              {v.tree.total > 0 && v.tree.late + v.tree.risk === 0 && (
                <span className={'jb-gate is-' + (v.tree.done === v.tree.total ? 'done' : 'none')}>{v.tree.done} of {v.tree.total} done</span>
              )}
            </span>
          ) : v.sixm ? (
            /* A 6M JOB (docs/SIXM.md, "Home / control room"): its problems by
               phase, then its open countermeasures by bone — in words, the
               abnormal piece alone in colour. They were six-bone tiles with a
               number each, which said how much was open but not whether the
               root causes were being found, acted on or held. */
            <span className="jb-6m">
              <SaidLine className="jb-6m-l" parts={v.sixm.phases} />
              <SaidLine className="jb-6m-l" parts={v.sixm.bones} />
            </span>
          ) : (
            <span className="jb-gates jb-bones" aria-label={v.pillars.length
              ? 'Open by bone: ' + v.pillars.map(x => `${x.label} ${x.open}${x.tone === 'late' ? ', some late' : ''}`).join(', ')
              : 'Nothing open on the board'}>
              {v.pillars.length === 0
                ? <span className="jb-gate is-none">Nothing open</span>
                : v.pillars.map(x => (
                  <span key={x.key} className={'jb-gate jb-bone' + (x.tone === 'late' ? ' is-late' : '')}
                    title={`${x.label}: ${x.open} open${x.tone === 'late' ? ', some past their day' : ''}`}>
                    {x.label} {x.open}
                  </span>
                ))}
            </span>
          )}
          {/* The critical problem leads what the row says is next: the oldest,
              its words and where it is. */}
          {v.critical[0] && (
            <span className="jb-next jb-crit">
              Critical: {v.critical[0].what} — {v.critical[0].critical?.where}{v.critical.length > 1 ? ` · and ${v.critical.length - 1} more` : ''}
            </span>
          )}
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
              {v.method === 'commissioning'
                ? (edit ? 'Nothing dated yet — add the machines and when they are due.' : 'Nothing dated yet.')
                : (edit ? 'No action has a due date yet — write them on the board.' : 'No action has a due date yet.')}
              {(edit || v.method !== 'commissioning') && (
                <button className="btn btn-ghost btn-sm" onClick={() => nav(v.method === 'commissioning' ? `/project/${v.id}/testing` : `/project/${v.id}/board`)}>
                  {v.method === 'commissioning' ? 'Add them ›' : 'Open the board ›'}
                </button>
              )}
            </span>
          ) : (
            <>
              {spans.length > 0 && (
                <span className="jb-lanes" onClick={onToggle}>
                  {spans.map((g, k) => {
                    const laneH = 14, gap = 6, total = spans.length * laneH + (spans.length - 1) * gap;
                    return (
                      <span key={g.gate} className={'jb-span is-' + g.tone}
                        style={{ left: PCT(g.from), width: PCT(Math.max(0.006, g.to - g.from)), top: `calc(50% - ${total / 2}px + ${k * (laneH + gap)}px)`, height: laneH }}
                        title={`${g.label}${g.words ? ` · ${g.words}` : ''} · ${g.n} dated`}>
                        <span className={'jb-span-l' + (g.to > 0.62 ? ' is-left' : '')}>{g.label}{g.words ? ` · ${g.words}` : ''}</span>
                      </span>
                    );
                  })}
                </span>
              )}
              {spans.length === 0 && v.from != null && v.to != null && (
                <span className="jb-bar" style={{ left: PCT(v.from), width: PCT(Math.max(0.004, v.to - v.from)) }} onClick={onToggle}>
                  <span className="jb-bar-fill" style={{ width: PCT(filled) }} />
                </span>
              )}
              {slip && <span className="jb-slip" style={{ left: PCT(slip.from), width: PCT(slip.to - slip.from) }} onClick={onToggle} />}
              {spans.length === 0 && clusters.map((c, k) => {
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
              {v.sixm && (
                /* A 6M JOB'S DRAWER LEADS WITH THE GAP — each line against its
                   target, in the sentence its client report opens with — then
                   its problems, each one tap from its fishbone. Across the top
                   of the drawer, over the column and the plan, so the gap is the
                   first thing read on a phone and a laptop alike. It said "2 of
                   2 lines at target, with 7 actions open", which named neither
                   the number nor the problem anybody is working on. */
                <div className="jb-6m-top">
                    <div className="jb-gap">
                      {v.sixm.gaps.length === 0
                        ? <p className="sub">No measure is set on this job yet, so there is no gap to show.</p>
                        : v.sixm.gaps.map(g => {
                          const k = g.short ? g.says.indexOf(g.short) : -1;
                          return (
                            <p key={g.lineId} className="jb-gap-l">
                              {k < 0 ? g.says : <>{g.says.slice(0, k)}<span className="jb-said is-late">{g.short}</span>{g.says.slice(k + (g.short ?? '').length)}</>}
                            </p>
                          );
                        })}
                    </div>
                    {v.sixm.problems.length > 0 ? (
                      <ul className="jb-probs" aria-label="Problems">
                        {v.sixm.problems.map(x => (
                          <li key={x.id}>
                            <button className={'jb-prob' + (x.slipped ? ' is-slipped' : '')}
                              onClick={() => nav(fishboneUrl(v.id, { line: x.lineId, problem: x.id }))}>
                              <span className="jb-prob-t">
                                <b>{x.title}</b>
                                <span className={'jb-prob-ph' + (x.slipped ? ' jb-said is-late' : '')}>{x.word}</span>
                              </span>
                              {x.says && x.says !== x.title && <span className="jb-prob-s">{x.says}</span>}
                              <span className="jb-prob-c" aria-hidden>›</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : <SaidLine className="jb-6m-l jb-6m-d" parts={v.sixm.phases} />}
                </div>
              )}
              {/* The job in words, and its doors, in the column under its name —
                  the calendar keeps the board's width. */}
              <aside className="jb-aside">
                {/* A 6M job's countermeasures by bone take the sentence's place:
                    its lines against target are the gap above, its actions here. */}
                {v.sixm
                  ? <SaidLine className="jb-6m-l jb-6m-d" parts={v.sixm.bones} />
                  : <p className="jb-sent">{v.sentence}{v.slip ? ` ${v.slip}` : ''}</p>}
                {v.lead && <p className="sub jb-led">Led by {v.lead}</p>}
                {/* THE LINES, ONE TAP EACH — from the project card this row
                    replaced on Home. Each says its owner, so "that is my line"
                    is one tap from the control room. A stage-gate job is judged
                    on its machines and date, so it never drew lines here. */}
                {v.lines && (
                  <span className="proj-lines jb-lines">
                    {v.lines.length === 0
                      ? (edit
                        ? <button className="proj-chip is-add" onClick={() => nav(`/project/${v.id}/setup`)}><Icon name="plus" size="1.15em" /> Add a line</button>
                        : <span className="sub">No lines yet</span>)
                      : v.lines.map(l => (
                          <button key={l.id} className="proj-chip" onClick={() => nav(`/project/${v.id}/line/${l.id}`)}
                            title={l.owner ? `${l.name} · ${l.owner}` : l.name}>
                            <span className="proj-chip-k">{l.key}</span>
                            {l.owner && <span className="proj-chip-o">{l.owner.split(' ')[0]}</span>}
                          </button>
                        ))}
                  </span>
                )}
                <span className="jb-doors">
                  <button className="btn btn-primary" onClick={() => nav(`/project/${v.id}`)}>Open the job ›</button>
                  {/* The fishbone is a 6M job's journey, as the plan is a
                      stage-gate job's — its door comes first. */}
                  {v.sixm && <button className="btn btn-ghost" onClick={() => nav(fishboneUrl(v.id))}>Fishbone</button>}
                  {v.method === 'commissioning' ? <>
                    <button className="btn btn-ghost" onClick={() => nav(`/project/${v.id}/testing`)}>Commission</button>
                    <button className="btn btn-ghost" onClick={() => nav(`/project/${v.id}/fixes`)}>Fixes</button>
                  </> : <>
                    <button className="btn btn-ghost" onClick={() => nav(`/project/${v.id}/board`)}>Board</button>
                    <button className="btn btn-ghost" onClick={() => nav(`/project/${v.id}?view=lines`)}>Lines</button>
                  </>}
                  {/* The job's details — name, lead, dates, lines and people —
                      the card's "Details" / "Lines & people" door. */}
                  <button className="btn btn-ghost" onClick={() => nav(`/project/${v.id}/setup`)}>Details</button>
                </span>
              </aside>
              {empty
                ? <p className="sub jb-drawer-empty">{v.method === 'commissioning'
                    ? 'When the machines have dates, the plan draws itself here.'
                    : 'When the board’s actions have due dates, the plan draws itself here.'}</p>
                : <Timeline marks={v.plan} today={today} expectedAt={v.expectedAt} plannedAt={v.plannedAt} span={span}
                    onOpen={m => (m.id && !m.count && RECORD_MARK.has(m.kind) ? openRecord(v.id, m.id) : nav(planHref(v.id, m)))} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
