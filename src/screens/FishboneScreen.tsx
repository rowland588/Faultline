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
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { nav, navReplace, useRoute } from '../state/useRoute';
import { Crumbs } from '../ui/Crumbs';
import { Peers, methodPeers } from '../ui/Peers';
import { Sheet } from '../ui/Sheet';
import { AccessNote } from '../ui/AccessNote';
import { ActionSheet, type Editing } from '../ui/ActionSheet';
import { Fishbone } from '../ui/Fishbone';
import { CauseSheet } from '../ui/CauseSheet';
import { ProblemCard, phaseTone, sourceWords } from '../ui/ProblemCard';
import { ParetoPane } from '../ui/ParetoPane';
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
import { PHASE_WORD, type ProblemView, type ProblemsApi } from '../lib/problems';
import { SIXM, type Cause, type CauseSource, type SixM } from '../lib/sixm';
import type { Suggestion } from '../lib/problems';
import type { Can } from '../lib/access';
import type { Case } from '../types';
import { removeCase, restoreCase, snagsForWorkspace, type PaceLineRow } from '../db';
import { offerUndo } from '../ui/Undo';
import { drillOfRef, factsOf, lineOf, oldWhysOf, startingWhys } from '../lib/fishbone';
import { putOldWhysOnBone } from '../lib/useProblems';
import { useSession } from '../cloud/session';
import { displayName } from '../cloud/team';
import { useActions } from '../lib/actions';
import type { PaceAction } from '../lib/tracker';
import { uid } from '../lib/ids';
import { todayISO } from '../lib/weeks';

/* ------------------------------ small words ------------------------------ */

/* The phase's house colour and the source's words live with the problem card
   (ui/ProblemCard), which says them first; kept exported from here so every
   screen that imported them from the journey still finds them. */
export { phaseTone, sourceWords };

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

/* A LAPTOP: the page is wide enough for the working board (the Pareto on
   the left, the problem and its fish on the right — docs/SIXM.md). */
const WIDE = '(min-width: 1100px)';
const wideNow = (): boolean => { try { return window.matchMedia(WIDE).matches; } catch { return false; } };
const onWideChange = (cb: () => void): (() => void) => {
  try {
    const mq = window.matchMedia(WIDE);
    mq.addEventListener('change', cb);
    return () => mq.removeEventListener('change', cb);
  } catch { return () => {}; }
};
export const useWide = (): boolean => useSyncExternalStore(onWideChange, wideNow, () => false);

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
          <button className="btn btn-ghost fj-hold-skip" disabled={busy} onClick={() => void done(undefined)}>Close with no check</button>
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

/* THE HEAD CARD BECAME THE PROBLEM CARD (ui/ProblemCard, 5 October — the
   working method, docs/SIXM.md). Everything it carried is still on screen, in
   the part that owns it: the phase, the source, the title and the sentence in
   PROBLEM; "it moved the right way", the hold line, "Checked today", close and
   reopen in DID IT WORK; "Remove this problem" at the card's foot. Its count
   line ("4 causes · 1 root · 2 countermeasures") is said once, by the WHY and
   FIX parts' own headers — the same numbers, beside the things they count. */

/* ------------------------------ the old five whys ------------------------------ */

/** A PROBLEM OPENED BEFORE THE FISHBONE carries its five whys as a plain list
 *  (Case.whys, the last the root) and no causes — so on the fish they were
 *  invisible. They are read here plainly, and whoever works the fishbone puts
 *  them on a bone in one move: the chain becomes one cause there (suspected,
 *  until somebody confirms it) and leaves this card, so it is never said twice. */
function OldWhys({ whys, can, onPut }: { whys: string[]; can: Can; onPut: (m: SixM) => Promise<void> }) {
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const put = async (m: SixM) => {
    if (busy) return;
    setBusy(true);
    try { await onPut(m); setPicking(false); } finally { setBusy(false); }
  };
  return (
    <section className="fj-old" aria-label="Written before the fishbone">
      <p className="fj-old-k">Written before the fishbone</p>
      <p className="fj-old-chain">
        {whys.map((w, i) => (
          <span key={i}>
            {i > 0 && <span className="fj-old-arrow" aria-label="why"> → </span>}
            {i === whys.length - 1 && whys.length >= 2 ? <><b>{w}</b> <span className="fj-old-root">the root</span></> : w}
          </span>
        ))}
      </p>
      {can.edit && (picking ? (
        <div className="fj-old-pick">
          <span className="sub">Which bone does it sit on? It goes on as one cause, suspected until you confirm it.</span>
          <div className="cw-seg fj-old-bones" role="group" aria-label="Which bone">
            {SIXM.map(b => (
              <button key={b.key} type="button" className="chip" title={b.blurb} disabled={busy}
                onClick={() => void put(b.key)}>{b.label}</button>
            ))}
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => setPicking(false)}>Cancel</button>
        </div>
      ) : (
        <button type="button" className="btn" onClick={() => setPicking(true)}>Put it on a bone</button>
      ))}
    </section>
  );
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
  const { session } = useSession();
  const by = displayName(session?.user.email) || undefined;
  const askedLine = fixedLine ?? route.query.get('line') ?? undefined;
  const askedProblem = route.query.get('problem') ?? undefined;

  /* THE LINE: the one asked for, else the asked problem's, else the first. */
  const asked = api.problems.find(p => p.problem.id === askedProblem);
  const lineId = askedLine ?? asked?.problem.lineId ?? ppm.lines[0]?.id;
  const line = ppm.lines.find(l => l.id === lineId);
  const mine = useMemo(
    /* A problem with no line on its row belongs to the line whose study it
       lives in (lineOf), not to every line. */
    () => api.problems.filter(p => !lineId || lineOf(p.problem, ppm.lines)?.id === lineId)
      .sort((a, b) => Number(isOpenProblem(b)) - Number(isOpenProblem(a)) || b.problem.openedAt - a.problem.openedAt),
    [api.problems, lineId, ppm.lines],
  );
  const view = mine.find(p => p.problem.id === askedProblem) ?? mainProblem(mine);
  const doors = useDoors(projectId, line);
  const board = useActions(projectId);
  const wide = useWide();

  /* Where the problem is and is not, and the bar's breakdown as first
     answers — read off the same stops the views were built from, today. */
  const facts = useMemo(() => (view && api.data ? factsOf(view.problem, api.data) : { is: [], isNot: [] }), [view, api.data]);
  const starts = useMemo(() => (view && api.data ? startingWhys(view.problem, api.data) : []), [view, api.data]);

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
  const addCountermeasure = async (cause: Cause, fromSheet = true) => {
    if (!view) return;
    const stored = view.bones.flatMap(b => b.causes).find(c => c.id === cause.id);
    if (!stored || JSON.stringify(stored) !== JSON.stringify(cause)) await api.saveCause(view.problem.id, cause);
    setEditing(null);
    /* Back to the cause sheet only when it was opened from there; "Add a fix"
       on the card comes back to the card, where the new fix is listed. */
    setBackTo(fromSheet ? cause.id : null);
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

  /* Removed, with Undo: the problem leaves every list and count; its
     countermeasures stay on the board, saying their problem was removed. */
  const removeProblem = async (v: ProblemView) => {
    if (!can.remove) return;
    const before = await removeCase(v.problem.id);
    if (!before) return;
    setEditing(null);
    setQuery({ problem: undefined });
    const here = window.location.hash.slice(1).split('?')[0];
    const t = v.problem.title.trim();
    const n = v.actions.length;
    offerUndo(`Removed “${t.length > 40 ? t.slice(0, 39) + '…' : t}”${n ? ` — ${n === 1 ? 'its countermeasure stays' : `its ${n} countermeasures stay`} on the board` : ''}`, async () => {
      await restoreCase(before);
      // Back on screen — if the page it was removed from is still the one open.
      if (window.location.hash.slice(1).split('?')[0] === here) setQuery({ problem: before.id });
    });
  };

  const timeAStop = async () => { nav(`/w/${await ws.ensure()}/capture`); };

  /* A fix tapped on the card: the board's own row, in the one action editor
     (which reads for a client and edits for the team — ui/ActionSheet). */
  const openFix = (a: PaceAction) => {
    const step = board.steps.find(st => st.id === (a.uid ?? a.ref));
    if (step) setAction({ step, isNew: false });
  };

  if (ppm.loading || api.loading) return <p className="sub">Loading…</p>;

  /* THE PROBLEMS ON THIS LINE — each its title and where it is, in words.
     On a phone it is the page's picker; on a laptop it heads the left
     column, over the Pareto — the gap's and the constraint's problems are not
     bars, so the Pareto alone could not pick them. */
  const picker = (
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
  );

  const work = (
    <>
      {/* A link to a problem that has gone — removed, or not on this device —
          says so, rather than quietly showing another problem in its place. */}
      {askedProblem && !asked && (
        <p className="sub fj-gone" role="status">That problem isn’t on this job any more{view ? ' — this is the line’s main one.' : '.'}</p>
      )}

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
          <ProblemCard view={view} can={can} facts={facts} starts={starts} steps={board.steps} by={by} newId={uid}
            voiceContext={() => ({ today: todayISO(), on: { title: view.problem.title } })}
            oldWhys={oldWhysOf(view.problem).length > 0 ? (
              <OldWhys whys={oldWhysOf(view.problem)} can={can}
                onPut={async m => { if (can.edit) await putOldWhysOnBone(view.problem.id, m, by); }} />
            ) : undefined}
            onOpenCause={c => setEditing({ cause: c, draft: false })}
            onWriteCause={m => setEditing({ cause: { ...draftFrom(m), ...(by ? { by } : {}) }, draft: true })}
            onSaveCause={async c => { if (can.edit) await api.saveCause(view.problem.id, c); }}
            onAddFix={c => void addCountermeasure(c, false)}
            onOpenFix={openFix}
            onClose={() => setClosing(true)}
            onReopen={() => void api.reopen(view.problem.id)}
            onChecked={() => void api.checked(view.problem.id)}
            onRemove={() => void removeProblem(view)} />

          {can.edit && (
            <div className="fj-tools">
              <button className="btn" onClick={() => setSaw(true)}>I saw…</button>
              {line && <button className="btn btn-ghost" onClick={() => void timeAStop()}>Time a stop on {line.name}</button>}
            </div>
          )}

          {/* THE FISH DRAWS ITSELF FROM THE CHAINS — under the four parts, on
              a laptop and a phone alike (docs/SIXM.md, the working method). */}
          <Fishbone view={view} can={can}
            onCause={(c: Cause) => setEditing({ cause: c, draft: false })}
            onSuggestion={(s: Suggestion) => setEditing({ cause: draftFrom(s.m, s), draft: true })}
            onAdd={(m: SixM) => setEditing({ cause: draftFrom(m), draft: true })} />
        </>
      )}
    </>
  );

  return (
    <div className={'fj' + (wide ? ' is-board' : '')}>
      {!fixedLine && ppm.lines.length > 1 && (
        <div className="fj-lines" role="group" aria-label="Which line">
          {ppm.lines.map(l => (
            <button key={l.id} className={'chip' + (l.id === lineId ? ' on' : '')} aria-pressed={l.id === lineId}
              onClick={() => pickLine(l.id)}>{l.name}</button>
          ))}
        </div>
      )}

      {/* ON A LAPTOP THE PAGE IS THE WORKING BOARD: the problems and the
          Pareto on the left, the selected problem's four parts on the right,
          its fish beneath them. On a phone the same page stacks. */}
      {wide ? (
        <div className="fj-board">
          <aside className="fj-left" aria-label="The problems and where the time goes">
            {picker}
            <ParetoPane projectId={projectId} lineId={lineId} selected={view?.problem} onOpen={id => setQuery({ problem: id })} />
          </aside>
          <div className="fj-right">{work}</div>
        </div>
      ) : (
        <>
          {picker}
          {work}
        </>
      )}

      <OpenProblemSheet open={opening} line={line} doors={doors} problems={mine}
        onOpen={openProblem} onClose={() => setOpening(false)} />

      {view && editing && (
        <CauseSheet open view={view} cause={editing.cause} draft={editing.draft} can={can}
          onSave={(c: Cause) => api.saveCause(view.problem.id, c)}
          onRemove={(id: string) => api.removeCause(view.problem.id, id)}
          onAddCountermeasure={(c: Cause) => void addCountermeasure(c, true)}
          onOpenSource={(s: CauseSource) => void openSource(s)}
          onClose={() => setEditing(null)} />
      )}

      {view && closing && (
        <HoldSheet open view={view} onClose={() => setClosing(false)}
          onDone={async hold => { await api.close(view.problem.id, hold); setClosing(false); }} />
      )}

      {saw && (
        <SawSheet open projectId={projectId} line={line} problems={mine} api={api as ProblemsApi}
          problemId={view?.problem.id} short={doors.some(d => d.key === 'gap')}
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
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => nav('/')}>Back to the control room</button>
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
