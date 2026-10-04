/* THE JOURNEY OF A 6M JOB — the line's problems, each one a fishbone.
 *
 * Rowland, 4 October: "the fishbone is the journey, just like the Gantt chart
 * is in stage gate … you can click on it, it's interactive, it all comes
 * alive." docs/SIXM.md is the design; this screen is its spine on screen:
 *
 *   the gap → the problem (the head of the fish) → its causes on six bones,
 *   each drilled with the five whys → countermeasures with a prediction →
 *   proof on the same number → holding.
 *
 * WHICH CHANGE: a running line's improvement (the 6M method). WHICH RECORD:
 * the problem is a Case (cases — project_id, line_id, source, causes, hold),
 * its countermeasures are the board's actions (pace_todos — cause_ref,
 * expect), its evidence the stops timed on the line (observations — cause_m).
 * WHERE IT SHOWS: here; first on the project's front page and first on the
 * line's page; and the client report draws each problem's fishbone from the
 * same view (lib/fishbone.ts) so screen and paper cannot disagree.
 *
 * Nothing on this page is a new record. A problem is opened FROM something
 * already on the line — its gap to target, the top bar of its Pareto, its
 * constraint, or something a named person saw — and that is kept on it as its
 * source, so the head of the fish always says where it came from. */
import { useEffect, useMemo, useState } from 'react';
import { nav, navReplace, useRoute } from '../state/useRoute';
import { Crumbs } from '../ui/Crumbs';
import { Peers, methodPeers } from '../ui/Peers';
import { Sheet } from '../ui/Sheet';
import { AccessNote } from '../ui/AccessNote';
import { ActionSheet, type Editing } from '../ui/ActionSheet';
import { Fishbone } from '../ui/Fishbone';
import { CauseSheet } from '../ui/CauseSheet';
import { SawSheet } from '../ui/SawSheet';
import { useAccess } from '../cloud/access';
import { useProject } from '../lib/useProjects';
import { usePaceLines } from '../lib/usePaceLines';
import { useMeasures } from '../lib/useMeasures';
import { useMethodCounts } from '../lib/useMethodCounts';
import { useProblems } from '../lib/useProblems';
import { useLineStops } from '../lib/useLineStops';
import { useLineWorkspace } from '../lib/usePaceWorkspace';
import { lineSeries, say } from '../lib/measures';
import { analyse } from '../lib/capacity';
import { PHASE_WORD, type Phase, type ProblemView, type ProblemsApi } from '../lib/problems';
import { SIXM, sixmLabel, type Cause, type CauseSource, type SixM } from '../lib/sixm';
import type { Suggestion } from '../lib/problems';
import type { Can } from '../lib/access';
import type { Case } from '../types';
import { snagsForWorkspace, type PaceLineRow } from '../db';
import { drillOfRef } from '../lib/fishbone';
import { statusOfAction } from '../lib/treeBind';
import { uid } from '../lib/ids';
import { todayISO } from '../lib/weeks';

/* ------------------------------ small words ------------------------------ */

/** The house colour of a phase (CLAUDE.md, visual management): under way is
 *  indigo, holding or closed is the quiet green, slipped back is red. */
export const phaseTone = (p: Phase): 'w' | 'g' | 'r' =>
  p === 'slipped' ? 'r' : p === 'holding' || p === 'closed' ? 'g' : 'w';

export const isOpenProblem = (v: ProblemView): boolean => v.problem.status === 'open';

/** The problem a page leads with when nobody has picked one: an open one, the
 *  biggest loss first, then the newest. A closed one only when nothing is open. */
export function mainProblem(views: ProblemView[]): ProblemView | undefined {
  const open = views.filter(isOpenProblem);
  /* Nothing open: the one closed last — two closed problems' numbers are in
     different units and cannot be ranked against each other. */
  if (!open.length) return [...views].sort((a, b) => (b.problem.closedAt ?? 0) - (a.problem.closedAt ?? 0))[0];
  /* Open ones by their loss, when they are counted in the same unit; else the newest. */
  const unit = open[0].measure?.unit;
  const same = open.every(v => v.measure?.unit === unit);
  return [...open].sort((a, b) =>
    (same ? (b.measure?.now ?? b.measure?.before ?? 0) - (a.measure?.now ?? a.measure?.before ?? 0) : 0)
    || b.problem.openedAt - a.problem.openedAt)[0];
}

/** Two problem sources are the same head of the fish. */
export function sameSource(a: Case['source'], b: Case['source']): boolean {
  if (!a || !b || a.kind !== b.kind) return false;
  return (a.category ?? '') === (b.category ?? '')
    && (a.asset ?? '') === (b.asset ?? '')
    && (a.subcategory ?? '') === (b.subcategory ?? '')
    && (a.station ?? '') === (b.station ?? '')
    && (a.measureId ?? '') === (b.measureId ?? '');
}

/** The journey's address — the project's fishbone, a line, a problem. */
export const fishboneUrl = (projectId: string, o: { line?: string; problem?: string } = {}): string => {
  const q = new URLSearchParams();
  if (o.line) q.set('line', o.line);
  if (o.problem) q.set('problem', o.problem);
  const qs = q.toString();
  return `/project/${projectId}/fishbone${qs ? `?${qs}` : ''}`;
};

/** Set query keys on the page you are on, keeping the rest (a line page's ?view=). */
function setQuery(patch: Record<string, string | undefined>): void {
  const [path, q] = window.location.hash.slice(1).split('?');
  const params = new URLSearchParams(q ?? '');
  for (const [k, v] of Object.entries(patch)) { if (v) params.set(k, v); else params.delete(k); }
  const qs = params.toString();
  navReplace(qs ? `${path}?${qs}` : path);
}

const DAY = 86_400_000;
const hWeek = (mins: number): string => {
  const h = mins / 60;
  return h >= 10 ? `${Math.round(h)} h a week` : h >= 1 ? `${Math.round(h * 10) / 10} h a week` : `${Math.round(mins)} min a week`;
};

/* -------------------------- where a problem comes from -------------------------- */

/** The four doors a problem is opened by, worked out for one line from what is
 *  already on it. Each says what it would open, or why it cannot. */
interface Door {
  key: 'gap' | 'pareto' | 'constraint' | 'observed';
  label: string;
  /** The problem's title, ready to open — absent when this door has nothing behind it. */
  title?: string;
  says: string;
  source: NonNullable<Case['source']>;
}

function useDoors(projectId: string, line: PaceLineRow | undefined): Door[] {
  const nums = useMeasures(projectId);
  const stops = useLineStops(line?.workspaceId);
  return useMemo(() => {
    if (!line) return [];
    const doors: Door[] = [];
    /* THE GAP — the line's headline measure against its target. */
    const s = lineSeries(nums.measures, nums.periods, nums.targets, nums.readings, line.id);
    if (s && s.margin != null && s.meeting === false) {
      const off = say(Math.abs(s.margin), s.measure.unit);
      doors.push({ key: 'gap', label: 'The line’s gap',
        title: `${line.name} ${off} off its ${s.measure.name.toLowerCase()} target`,
        says: `${s.measure.name}: ${s.latest == null ? '—' : say(s.latest, s.measure.unit)} against ${s.target == null ? 'no target' : say(s.target, s.measure.unit)}`,
        source: { kind: 'gap', measureId: s.measure.id } });
    } else {
      doors.push({ key: 'gap', label: 'The line’s gap',
        says: !s ? 'No measure or target set for this line yet' : s.meeting ? `${s.measure.name} is at target` : 'No reading against a target yet',
        source: { kind: 'gap', measureId: s?.measure.id } });
    }
    /* THE TOP BAR OF THE PARETO — the category losing the most time on this
       line in the last four weeks, and the machine it is mostly on. */
    const inside = stops.obs.filter(o => !o.deletedAt && o.startedAt >= stops.from && o.startedAt < stops.to && o.durationMs > 0);
    const byCat = new Map<string, { mins: number; byAsset: Map<string, number> }>();
    for (const o of inside) {
      const c = (o.category || 'Uncategorised').trim();
      const r = byCat.get(c) ?? { mins: 0, byAsset: new Map<string, number>() };
      r.mins += o.durationMs / 60_000;
      r.byAsset.set(o.asset, (r.byAsset.get(o.asset) ?? 0) + o.durationMs / 60_000);
      byCat.set(c, r);
    }
    const top = [...byCat.entries()].sort((a, b) => b[1].mins - a[1].mins)[0];
    if (top) {
      const asset = [...top[1].byAsset.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      const weeks = (stops.to - stops.from) / (7 * DAY);
      doors.push({ key: 'pareto', label: 'The top Pareto bar',
        title: problemTitleOfBar(top[0], asset, line.name),
        says: `${top[0]}${asset ? ` on the ${asset}` : ''} — ${hWeek(top[1].mins / weeks)}`,
        source: { kind: 'pareto', category: top[0], asset } });
    } else {
      doors.push({ key: 'pareto', label: 'The top Pareto bar', says: 'Nothing timed on this line in the last four weeks', source: { kind: 'pareto' } });
    }
    /* THE CONSTRAINT — the station the line balance says limits the line. */
    const r = line.capacity && line.capacity.stations.length > 0 ? analyse(line.capacity) : undefined;
    const station = r?.limit ? (r.limit.station.name.trim() || `Station ${r.limit.index + 1}`) : undefined;
    if (station) {
      doors.push({ key: 'constraint', label: 'The constraint',
        title: `${station} limits ${line.name}`,
        says: r?.sentence ?? `${station} is the slowest station`,
        source: { kind: 'constraint', station } });
    } else {
      doors.push({ key: 'constraint', label: 'The constraint', says: 'The line balance is not counted yet', source: { kind: 'constraint' } });
    }
    doors.push({ key: 'observed', label: 'Something seen', says: 'A problem seen on the line, in your own words', source: { kind: 'observed' } });
    return doors;
  }, [line, nums.measures, nums.periods, nums.targets, nums.readings, stops.obs, stops.from, stops.to]);
}

/** "Bagger minor stops on Line 2" — a Pareto bar as the head of the fish. */
export function problemTitleOfBar(category: string, asset: string | undefined, lineName?: string): string {
  const what = asset ? `${asset} ${category.toLowerCase()}` : category;
  return lineName ? `${what} on ${lineName}` : what;
}

function OpenProblemSheet({ open, line, doors, problems, onOpen, onClose }: {
  open: boolean; line?: PaceLineRow; doors: Door[]; problems: ProblemView[];
  onOpen: (title: string, source: NonNullable<Case['source']>) => Promise<void>; onClose: () => void;
}) {
  const [seen, setSeen] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async (title: string, source: NonNullable<Case['source']>) => {
    if (busy) return;
    setBusy(true);
    try { await onOpen(title, source); } finally { setBusy(false); setSeen(''); }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Open a problem">
      <div className="fj-open">
        <p className="sub">
          A problem is the head of the fish: one loss, specific and measured. Take it from what the
          line already says{line ? <> about <b>{line.name}</b></> : null}.
        </p>
        {doors.filter(d => d.key !== 'observed').map(d => {
          const already = problems.find(p => isOpenProblem(p) && sameSource(p.problem.source, d.source));
          return (
            <button key={d.key} className={'fj-door' + (d.title ? '' : ' is-off')} disabled={!d.title || busy}
              onClick={() => d.title && void go(d.title, d.source)}>
              <span className="fj-door-k">{d.label}</span>
              <span className="fj-door-t">{d.title ?? d.says}</span>
              {d.title && <span className="fj-door-s">{already ? 'Already open — go to it' : d.says}</span>}
            </button>
          );
        })}
        <div className="fj-door is-seen">
          <span className="fj-door-k">Something seen</span>
          <input className="text-input" value={seen} maxLength={140}
            placeholder="e.g. Film wanders on the bagger after a reel change"
            onChange={e => setSeen(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && seen.trim()) void go(seen.trim(), { kind: 'observed' }); }} />
          <button className="btn btn-primary" disabled={!seen.trim() || busy}
            onClick={() => void go(seen.trim(), { kind: 'observed' })}>Open it</button>
        </div>
      </div>
    </Sheet>
  );
}

/* --------------------------------- holding --------------------------------- */

const EVERY: { d: number; label: string }[] = [
  { d: 1, label: 'Every day' }, { d: 7, label: 'Every week' }, { d: 14, label: 'Every fortnight' }, { d: 30, label: 'Every month' },
];

/** CLOSING ASKS HOW THE GAIN IS KEPT (docs/OPEX.md, "hold"): the new way
 *  written into the standard, and one check — what, who, how often. */
function HoldSheet({ open, view, onClose, onDone }: {
  open: boolean; view: ProblemView; onClose: () => void;
  onDone: (hold: Case['hold']) => Promise<void>;
}) {
  const [what, setWhat] = useState('');
  const [who, setWho] = useState('');
  const [every, setEvery] = useState(7);
  const [std, setStd] = useState(false);
  const [busy, setBusy] = useState(false);
  const done = async (hold: Case['hold']) => {
    setBusy(true);
    try { await onDone(hold); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Close it — and keep the gain">
      <div className="fj-hold">
        <p className="sub">
          <b>{view.problem.title}</b> — it worked. Say how it stays worked: one check, who makes it and how
          often, and whether the standard now says the new way.
        </p>
        <label className="cw-f cw-f-wide"><span>WHAT IS CHECKED</span>
          <input value={what} maxLength={160} placeholder="e.g. Splice done to the new standard — check 5 at start of shift"
            onChange={e => setWhat(e.target.value)} /></label>
        <label className="cw-f cw-f-wide"><span>WHO CHECKS IT</span>
          <input value={who} maxLength={60} placeholder="Name or role" onChange={e => setWho(e.target.value)} /></label>
        <div className="ax-row">
          <span className="ax-k">HOW OFTEN</span>
          <div className="cw-seg" role="group" aria-label="How often">
            {EVERY.map(x => (
              <button key={x.d} type="button" className={'chip' + (every === x.d ? ' on' : '')}
                aria-pressed={every === x.d} onClick={() => setEvery(x.d)}>{x.label}</button>
            ))}
          </div>
        </div>
        <label className="fj-check">
          <input type="checkbox" checked={std} onChange={e => setStd(e.target.checked)} />
          <span>The standard is updated with the new way of working</span>
        </label>
        <div className="ax-foot">
          <button className="btn btn-ghost" disabled={busy} onClick={() => void done(undefined)}>Close with no check</button>
          <span style={{ flex: 1 }} />
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!what.trim() || busy}
            onClick={() => void done({ what: what.trim(), who: who.trim() || undefined, everyDays: every, since: todayISO(), standardUpdated: std })}>
            Close it
          </button>
        </div>
      </div>
    </Sheet>
  );
}

/* ------------------------------ the problem's head ------------------------------ */

function HeadCard({ v, can, onClose, onReopen, onChecked }: {
  v: ProblemView; can: Can;
  onClose: () => void; onReopen: () => void; onChecked: () => void;
}) {
  const m = v.measure;
  const hold = v.problem.hold;
  const open = isOpenProblem(v);
  const n = (x?: number) => (x == null ? '—' : say(x));
  const counts = SIXM.map(b => v.bones.find(x => x.m === b.key)?.causes.length ?? 0);
  const causes = counts.reduce((a, b) => a + b, 0);
  const openActs = v.actions.filter(a => statusOfAction(a) !== 'g').length;
  return (
    <section className={'fj-head is-' + phaseTone(v.phase)}>
      <div className="fj-head-main">
        <p className="fj-head-k">
          <span className={'fj-phase is-' + phaseTone(v.phase)}>{PHASE_WORD[v.phase]}</span>
          {v.problem.source && <span className="fj-src">from {sourceWords(v.problem.source)}</span>}
        </p>
        <h2 className="fj-head-t">{v.problem.title}</h2>
        {v.says && <p className="fj-head-s">{v.says}</p>}
        <p className="fj-head-n">
          {causes} cause{causes === 1 ? '' : 's'} on the bones · {v.roots.length} root{v.roots.length === 1 ? '' : 's'} found
          {' '}· {v.actions.length} countermeasure{v.actions.length === 1 ? '' : 's'}{v.actions.length ? ` (${openActs} open)` : ''}
        </p>
      </div>
      {m && (
        <div className="fj-measure" aria-label="The problem's own number">
          <span className="fj-measure-l">{m.label}</span>
          <span className="fj-measure-v">
            <span className="fj-measure-b">{n(m.before)}</span>
            <span aria-hidden> → </span>
            <b className={m.moved === 'worse' ? 'is-worse' : m.moved === 'better' ? 'is-better' : ''}>{n(m.now)}</b>
            <span className="fj-measure-u"> {m.unit}</span>
          </span>
          <span className="fj-measure-s">
            {m.target != null ? `target ${n(m.target)} · ` : ''}{m.better === 'lower' ? 'lower is better' : 'higher is better'}
            {m.moved && ` · ${m.moved === 'same' ? 'not moved yet' : m.moved === 'better' ? 'moved the right way' : 'moved the wrong way'}`}
          </span>
        </div>
      )}
      {!open && hold && (
        <p className="fj-holdline">
          Kept by: <b>{hold.what}</b>{hold.who ? ` · ${hold.who}` : ''} · every {hold.everyDays === 1 ? 'day' : `${hold.everyDays} days`}
          {' '}· {hold.standardUpdated ? 'standard updated' : 'standard not updated yet'}
          {hold.lastChecked ? ` · last checked ${hold.lastChecked}` : ' · not checked yet'}
        </p>
      )}
      <div className="fj-head-acts">
        {!open && hold && can.edit && <button className="btn" onClick={onChecked}>Checked today</button>}
        {open && can.agree && <button className="btn" onClick={onClose}>It worked — close it</button>}
        {!open && can.agree && <button className="btn btn-ghost" onClick={onReopen}>Reopen</button>}
      </div>
    </section>
  );
}

export function sourceWords(s: NonNullable<Case['source']>): string {
  switch (s.kind) {
    case 'gap': return 'the line’s gap';
    case 'pareto': return `the Pareto${s.category ? ` — ${s.category}${s.asset ? `, ${s.asset}` : ''}` : ''}`;
    case 'constraint': return `the constraint${s.station ? ` — ${s.station}` : ''}`;
    default: return 'something seen';
  }
}

/* --------------------------------- the journey --------------------------------- */

type Editing6 = { cause: Cause; draft: boolean } | null;

/** THE WHOLE JOURNEY FOR ONE PROJECT — or one line of it. The full screen and
 *  the line page's Fishbone lens are this same component, so there is one way
 *  a problem is opened, worked and closed. */
export function FishboneJourney({ projectId, lineId: fixedLine, can }: {
  projectId: string;
  /** Held to one line (the line page). Absent: the line is picked here. */
  lineId?: string;
  can: Can;
}) {
  const route = useRoute();
  const ppm = usePaceLines(projectId);
  const { project } = useProject(projectId);
  const api = useProblems(projectId);
  const askedLine = fixedLine ?? route.query.get('line') ?? undefined;
  const askedProblem = route.query.get('problem') ?? undefined;

  /* THE LINE: the one asked for, else the asked problem's, else the first. */
  const asked = api.problems.find(p => p.problem.id === askedProblem);
  const lineId = askedLine ?? asked?.problem.lineId ?? ppm.lines[0]?.id;
  const line = ppm.lines.find(l => l.id === lineId);
  const mine = useMemo(
    () => api.problems.filter(p => !lineId || !p.problem.lineId || p.problem.lineId === lineId)
      .sort((a, b) => Number(isOpenProblem(b)) - Number(isOpenProblem(a)) || b.problem.openedAt - a.problem.openedAt),
    [api.problems, lineId],
  );
  const view = mine.find(p => p.problem.id === askedProblem) ?? mainProblem(mine);
  const doors = useDoors(projectId, line);

  /* ?open=1 — sent here by "Open a problem" on the project's front page. */
  const [opening, setOpening] = useState(() => route.query.get('open') === '1' && can.edit);
  useEffect(() => { if (route.query.get('open')) setQuery({ open: undefined }); }, [route.query]);
  const [editing, setEditing] = useState<Editing6>(null);
  const [action, setAction] = useState<Editing | null>(null);
  const [closing, setClosing] = useState(false);
  const [saw, setSaw] = useState(false);

  // A line's own workspace, made the first time a stop is timed from here.
  const ws = useLineWorkspace(line?.workspaceId, line?.name ?? '', async (id) => { if (line) await ppm.editLine(line.id, { workspaceId: id }); });

  /* The cause being edited, kept up to date with the problem underneath it —
     so a cause saved from the sheet shows its new state without reopening. */
  useEffect(() => {
    if (!editing || editing.draft || !view) return;
    const fresh = view.bones.flatMap(b => b.causes).find(c => c.id === editing.cause.id);
    if (fresh && fresh !== editing.cause) setEditing({ cause: fresh, draft: false });
  }, [view, editing]);

  const pick = (problemId: string) => setQuery({ problem: problemId });
  const pickLine = (id: string) => setQuery({ line: id, problem: undefined });

  const openProblem = async (title: string, source: NonNullable<Case['source']>) => {
    const already = mine.find(p => isOpenProblem(p) && sameSource(p.problem.source, source));
    const c = already?.problem ?? await api.create({ title, lineId: line?.id, source });
    setOpening(false);
    setQuery({ problem: c.id, line: fixedLine ? undefined : (c.lineId ?? line?.id) });
  };

  const draftFrom = (m: SixM, s?: Suggestion): Cause => ({
    id: uid(), m, text: s?.text ?? '', grade: s?.grade ?? 'observed', status: 'suspected',
    source: s?.source, whys: [], at: Date.now(),
  });

  /* A COUNTERMEASURE IS AN ACTION ON THE BOARD, written in the one action
     editor, on the cause's bone and pointing at it. Anything changed on the
     cause is kept first; the cause opens again when the action is written,
     with the new countermeasure listed under it. */
  const [backTo, setBackTo] = useState<string | null>(null);
  const addCountermeasure = async (cause: Cause) => {
    if (!view) return;
    const stored = view.bones.flatMap(b => b.causes).find(c => c.id === cause.id);
    if (!stored || JSON.stringify(stored) !== JSON.stringify(cause)) await api.saveCause(view.problem.id, cause);
    setEditing(null);
    setBackTo(cause.id);
    const t = Date.now();
    setAction({
      isNew: true,
      step: {
        id: uid(), projectId, lineId: view.problem.lineId ?? line?.id,
        what: '', where: '', why: cause.text, who: '', when: '', state: 'todo',
        pillar: cause.m, causeRef: `${view.problem.id}:${cause.id}`,
        createdAt: t, updatedAt: t,
      },
    });
  };

  const openSource = async (s: CauseSource) => {
    const lid = view?.problem.lineId ?? line?.id;
    switch (s.kind) {
      case 'pareto': {
        /* The bar it came from: the category in its drill path, else the
           problem's own (a concentration — "most stops on nights"). */
        const bar = drillOfRef(s.ref).find(d => d.dimension === 'category')?.value ?? view?.problem.source?.category;
        nav(`/project/${projectId}/pareto${bar ? `?bar=${encodeURIComponent(bar)}` : ''}`);
        return;
      }
      case 'snag': {
        /* The frame of the walk it is pinned on — looked up on every walk of
           the project, since the cause carries only the snag's id. */
        const wsIds = [...new Set([line?.workspaceId, ...ppm.lines.map(l => l.workspaceId), project?.walkWorkspaceId].filter(Boolean) as string[])];
        for (const w of wsIds) {
          const hit = (await snagsForWorkspace(w)).find(x => x.id === s.ref);
          if (hit?.assetId) { nav(`/w/${w}/asset/${hit.assetId}`); return; }
        }
        if (line?.workspaceId) nav(`/w/${line.workspaceId}/snaglist`);
        return;
      }
      case 'capacity': if (lid) nav(`/project/${projectId}/line/${lid}?view=capacity`); return;
      case 'standard': nav(`/project/${projectId}/standard${s.ref ? `/${encodeURIComponent(s.ref)}` : ''}`); return;
      case 'material': nav(`/project/${projectId}/materials`); return;
      case 'program': nav(`/project/${projectId}/programs`); return;
      case 'reading': if (lid) nav(`/project/${projectId}/line/${lid}?view=data`); return;
      default: return;   // an observation is its own evidence — nowhere to go
    }
  };

  const timeAStop = async () => { nav(`/w/${await ws.ensure()}/capture`); };

  if (ppm.loading || api.loading) return <p className="sub">Loading…</p>;

  return (
    <div className="fj">
      {!fixedLine && ppm.lines.length > 1 && (
        <div className="fj-lines" role="group" aria-label="Which line">
          {ppm.lines.map(l => (
            <button key={l.id} className={'chip' + (l.id === lineId ? ' on' : '')} aria-pressed={l.id === lineId}
              onClick={() => pickLine(l.id)}>{l.name}</button>
          ))}
        </div>
      )}

      {/* THE PROBLEMS ON THIS LINE — each its title and where it is, in words. */}
      <div className="fj-probs" role="group" aria-label="Which problem">
        {mine.map(p => (
          <button key={p.problem.id} className={'fj-prob' + (p.problem.id === view?.problem.id ? ' on' : '')}
            aria-pressed={p.problem.id === view?.problem.id} onClick={() => pick(p.problem.id)}>
            <span className="fj-prob-t">{p.problem.title}</span>
            <span className={'fj-phase is-' + phaseTone(p.phase)}>{PHASE_WORD[p.phase]}</span>
          </button>
        ))}
        {can.edit && (
          <button className="fj-prob is-new" onClick={() => setOpening(true)}>+ Open a problem</button>
        )}
      </div>

      {!view ? (
        <div className="fj-empty">
          <p className="fj-empty-t">No problem opened{line ? ` on ${line.name}` : ''} yet</p>
          <p className="sub">
            Open one from the gap or the Pareto — the biggest loss becomes the head of the fish, and the
            six bones fill themselves from what has been timed, filmed and counted on the line.
          </p>
          {can.edit && <button className="btn btn-primary" onClick={() => setOpening(true)}>Open a problem</button>}
        </div>
      ) : (
        <>
          <HeadCard v={view} can={can}
            onClose={() => setClosing(true)}
            onReopen={() => void api.reopen(view.problem.id)}
            onChecked={() => void api.checked(view.problem.id)} />

          {can.edit && (
            <div className="fj-tools">
              <button className="btn" onClick={() => setSaw(true)}>I saw…</button>
              {line && <button className="btn btn-ghost" onClick={() => void timeAStop()}>Time a stop on {line.name}</button>}
            </div>
          )}

          <Fishbone view={view} can={can}
            onCause={(c: Cause) => setEditing({ cause: c, draft: false })}
            onSuggestion={(s: Suggestion) => setEditing({ cause: draftFrom(s.m, s), draft: true })}
            onAdd={(m: SixM) => setEditing({ cause: draftFrom(m), draft: true })} />

          <p className="sub fj-foot">
            Every cause says how it is known — measured, counted, observed or reported — and only a
            confirmed one is drilled to its root. A faint mark is a suggestion from the line’s own data:
            tap it to look, and add it if it holds. {sixmLabel('measurement')} is how we check and count —
            a stop never logged belongs there.
          </p>
        </>
      )}

      <OpenProblemSheet open={opening} line={line} doors={doors} problems={mine}
        onOpen={openProblem} onClose={() => setOpening(false)} />

      {view && editing && (
        <CauseSheet open view={view} cause={editing.cause} draft={editing.draft} can={can}
          onSave={(c: Cause) => api.saveCause(view.problem.id, c)}
          onRemove={(id: string) => api.removeCause(view.problem.id, id)}
          onAddCountermeasure={(c: Cause) => void addCountermeasure(c)}
          onOpenSource={(s: CauseSource) => void openSource(s)}
          onClose={() => setEditing(null)} />
      )}

      {view && closing && (
        <HoldSheet open view={view} onClose={() => setClosing(false)}
          onDone={async hold => { await api.close(view.problem.id, hold); setClosing(false); }} />
      )}

      {saw && (
        <SawSheet open projectId={projectId} line={line} problems={mine} api={api as ProblemsApi}
          problemId={view?.problem.id}
          onClose={() => setSaw(false)}
          onSaved={id => { setSaw(false); setQuery({ problem: id }); }} />
      )}

      {action && <ActionSheet editing={action} lines={ppm.lines} onClose={() => {
        setAction(null);
        const back = backTo && view?.bones.flatMap(b => b.causes).find(c => c.id === backTo);
        setBackTo(null);
        if (back) setEditing({ cause: back, draft: false });
      }} />}
    </div>
  );
}

/* ---------------------------------- the screen ---------------------------------- */

export function FishboneScreen({ projectId }: { projectId: string }) {
  const { loading, project } = useProject(projectId);
  const can = useAccess(projectId);
  const counts = useMethodCounts(projectId);

  if (loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  if (!project) {
    return (
      <div className="wrap pace">
        <p className="sub" style={{ marginTop: 24 }}>That project isn’t here any more.</p>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => nav('/projects')}>All projects</button>
      </div>
    );
  }

  return (
    <div className="wrap pace fj-screen">
      <Crumbs trail={[
        { label: 'Control room', to: '/' },
        { label: project.name, to: `/project/${projectId}` },
        { label: 'Fishbone' },
      ]} />
      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pace-eyebrow">{project.name}</p>
          <h1 className="pace-title">Fishbone</h1>
          <p className="pace-lede">The problem, its causes on six bones, the whys under each, and what is being done about it.</p>
        </div>
      </header>
      <Peers peers={methodPeers(projectId, 'board', 'fishbone', counts)} />
      <AccessNote can={can} owner={project.lead} />
      <FishboneJourney projectId={projectId} can={can} />
      <footer className="pace-foot">
        <p>{project.name} · the 6M root cause journey · from the stops timed, the walk filmed and the line counted</p>
      </footer>
    </div>
  );
}
