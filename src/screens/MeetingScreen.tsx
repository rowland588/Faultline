/* THE MEETING — the weekly ritual, run on live data. Zero preparation: it opens
 * on the truth, decisions land as data before the room empties, and the minutes
 * write themselves (Act 5 is a diff against the moment the meeting started).
 *
 * Two axes. The AGENDA RAIL moves sideways — five acts in a fixed order, the
 * same every week, that's what keeps it short. The ZOOM moves down and up —
 * within an act you descend toward evidence and Escape climbs back; the
 * Overview board (act 0) is never more than one tap away. Arrow keys walk the
 * agenda; every act keeps its own position while you're in another.
 *
 * It invents NO data and NO objects: every number is a read the app already
 * trusts (lib/stats, the drill engine, the snag store), every edit goes
 * through the same mutators as everywhere else, and the period defaults to
 * the last FULL week so a Tuesday never reads as a miracle. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useWorkspace } from '../state/WorkspaceProvider';
import { nav, goBack } from '../state/useRoute';
import { listSnagAssets, snagsForWorkspace, updateSnag } from '../db';
import { useSyncedAt } from '../cloud/session';
import { weeklyLoss, categoryTrends, closedEvents, weekStart, type WeekPoint, type CategoryTrend } from '../lib/stats';
import { buildCompare, divergenceTags } from '../engine/compare';
import { drillNode } from '../engine/drill';
import { ParetoChart, type CompareSlice } from '../charts/ParetoChart';
import { DrillBreadcrumb } from '../charts/DrillBreadcrumb';
import { DisagreementBanner } from '../charts/DisagreementBanner';
import { EvidenceStrip } from '../charts/EvidenceStrip';
import { ActionComposer } from './ActionComposer';
import { fmtDuration, plural } from '../lib/format';
import { hasCost, costPerMs, fmtGBP } from '../lib/cost';
import {
  SNAG_STATUS_META, actionTarget, isOverdue, isDueSoon, compareReview, dueToInput, dueFromInput,
  type Snag, type SnagStatus,
} from '../snag/types';
import { TimeStrip, dueWord } from '../snag/TimeStrip';
import type { Observation, DrillPath, DimensionKey, WorkstreamView } from '../types';

const WEEK_MS = 7 * 24 * 3600_000;
const BOARD_ORDER: DimensionKey[] = ['asset', 'category', 'subcategory'];

const fmtH = (ms: number) => {
  const h = ms / 3600_000;
  return h >= 10 ? `${Math.round(h)} h` : h >= 1 ? `${Math.round(h * 10) / 10} h` : `${Math.round(ms / 60_000)} min`;
};
const dateNice = (ms: number) => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const weekOf = (start: number) => `Week of ${dateNice(start)}`;

type Sel = number | 'all'; // a full week's Monday, or everything

const ACTS = [
  { n: 1, label: 'The number' },
  { n: 2, label: 'Where it hurt' },
  { n: 3, label: 'Actions' },
  { n: 4, label: 'Did it hold?' },
  { n: 5, label: 'Recap' },
] as const;

function toSlices(rows: Observation[], dimension: DimensionKey, costable: boolean, factor: number): CompareSlice[] {
  const byId = new Map(rows.map(o => [o.id, o]));
  const cr = buildCompare(rows, dimension, 'time');
  const tags = divergenceTags(cr);
  return cr.map(r => ({
    key: r.key,
    timeShare: r.timeShare,
    freqShare: r.countShare,
    cumShare: r.cumShare,
    timeLabel: fmtDuration(r.timeMs),
    costLabel: costable ? fmtGBP(r.timeMs * factor) : undefined,
    freqLabel: `${r.count}×`,
    isVitalFew: r.isVitalFew,
    media: r.observationIds.reduce((a, id) => a + (byId.get(id)?.media.length ?? 0), 0),
    tag: tags[r.key],
  }));
}

/** Small clickable week bars — the whole trend at a glance; tap a bar to make
 *  that week the meeting's period. Flags mark weeks a fix was closed. */
function WeekBars({ weeks, sel, flags, onPick }: {
  weeks: WeekPoint[]; sel: Sel; flags?: Map<number, number>; onPick?: (start: number) => void;
}) {
  const max = Math.max(1, ...weeks.map(w => w.ms));
  return (
    <div className="meet-weeks" role="list">
      {weeks.map(w => (
        <button key={w.start} role="listitem" disabled={!onPick || w.current}
          className={'mw-col' + (sel === w.start ? ' on' : '') + (w.current ? ' cur' : '')}
          title={`${weekOf(w.start)} — ${fmtH(w.ms)}`}
          onClick={() => onPick && !w.current && onPick(w.start)}>
          <span className="mw-flags">{flags?.get(w.start) ? '⚑'.repeat(Math.min(3, flags.get(w.start)!)) : ''}</span>
          <span className="mw-bar" style={{ height: `${Math.max(3, (w.ms / max) * 100)}%` }} />
          <span className="mw-lbl">{w.current ? 'now' : w.label}</span>
        </button>
      ))}
    </div>
  );
}

export function MeetingScreen() {
  const { workspace, observations } = useWorkspace();
  const live = useMemo(() => observations.filter(o => o.deletedAt == null), [observations]);
  const costable = hasCost(workspace);
  const factor = costPerMs(workspace);

  // The meeting's birth moment — Act 5 diffs everything against it.
  const [sessionStart] = useState(() => Date.now());
  const [act, setAct] = useState(0);

  const [snags, setSnags] = useState<Snag[]>([]);
  const [assetNames, setAssetNames] = useState<Map<string, string>>(new Map());
  const syncedAt = useSyncedAt();
  const loadSnags = async () => {
    const [sn, as] = await Promise.all([snagsForWorkspace(workspace.id), listSnagAssets(workspace.id)]);
    setSnags(sn); setAssetNames(new Map(as.map(a => [a.id, a.name])));
  };
  useEffect(() => { void loadSnags(); /* eslint-disable-next-line */ }, [workspace.id, syncedAt]);
  const mutate = async (s: Snag) => { await updateSnag(s); await loadSnags(); };

  const weeks = useMemo(() => weeklyLoss(live, workspace, 12), [live, workspace]);
  const fullWeeks = useMemo(() => weeks.filter(w => !w.current), [weeks]);
  const lastFull = fullWeeks[fullWeeks.length - 1];
  // null = "auto": last full week once the data is in (observations load after
  // first render, so a stored default would freeze on the empty state).
  const [selRaw, setSel] = useState<Sel | null>(null);
  const sel: Sel = selRaw ?? (lastFull ? lastFull.start : 'all');

  const inSel = (o: Observation) => sel === 'all' || (o.startedAt >= sel && o.startedAt < sel + WEEK_MS);
  const rows = useMemo(() => live.filter(inSel), [live, sel]); // eslint-disable-line react-hooks/exhaustive-deps
  const priorRows = useMemo(
    () => (sel === 'all' ? [] : live.filter(o => o.startedAt >= sel - WEEK_MS && o.startedAt < sel)),
    [live, sel],
  );
  const ms = rows.reduce((a, o) => a + o.durationMs, 0);
  const priorMs = priorRows.reduce((a, o) => a + o.durationMs, 0);
  const deltaPct = sel !== 'all' && priorMs > 0 ? Math.round(((ms - priorMs) / priorMs) * 100) : null;

  const cats = useMemo(() => categoryTrends(live, workspace), [live, workspace]);
  const flags = useMemo(() => closedEvents(snags, weeks), [snags, weeks]);
  const flagsByWeek = useMemo(() => {
    const m = new Map<number, number>();
    for (const f of flags) { const w = weekStart(f.at); m.set(w, (m.get(w) ?? 0) + 1); }
    return m;
  }, [flags]);

  // Everything touched since the meeting began — the minutes.
  const touched = useMemo(() => snags.filter(s => (s.updatedAt ?? s.raisedAt) >= sessionStart), [snags, sessionStart]);

  // ---- act 2's zoom lives up here so Escape can pop it from the one keyboard handler
  const [path, setPath] = useState<DrillPath>([]);
  const escBoard = useRef<() => boolean>(() => false);
  escBoard.current = () => { if (path.length) { setPath(p => p.slice(0, -1)); return true; } return false; };

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
      if (e.key === 'ArrowRight') setAct(a => Math.min(5, a + 1));
      else if (e.key === 'ArrowLeft') setAct(a => Math.max(0, a - 1));
      else if (e.key === 'Escape') setAct(a => (a === 2 && escBoard.current() ? a : 0));
      else if (e.key.toLowerCase() === 'h') setAct(0);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);

  const periodLabel = sel === 'all' ? 'All time' : weekOf(sel);
  const money = (v: number) => (costable ? fmtGBP(v * factor) : fmtH(v));

  // ---- shared derivations the overview tiles and acts both read
  const openActions = useMemo(
    () => snags.filter(s => s.status !== 'closed' || (s.closedAt ?? 0) >= sessionStart).sort((a, b) => compareReview(a, b)),
    [snags, sessionStart],
  );
  const overdueN = openActions.filter(s => isOverdue(s)).length;
  const dueSoonN = openActions.filter(s => isDueSoon(s)).length;
  const chartedFrom = weeks[0]?.start ?? 0;
  const closedRecent = useMemo(
    () => snags.filter(s => s.status === 'closed' && s.closedAt && s.closedAt >= chartedFrom).sort((a, b) => b.closedAt! - a.closedAt!),
    [snags, chartedFrom],
  );
  const verdictOf = (s: Snag): CategoryTrend | null =>
    s.targetCategory ? cats.find(c => c.category === s.targetCategory) ?? null : null;
  const held = closedRecent.filter(s => verdictOf(s)?.verdict === 'improving').length;
  const slipped = closedRecent.filter(s => verdictOf(s)?.verdict === 'worsening').length;
  const topHurt = useMemo(() => toSlices(rows, 'category', costable, factor).slice(0, 3), [rows, costable, factor]);

  const whereOf = (s: Snag): string => actionTarget(s) || (s.assetId ? assetNames.get(s.assetId) ?? '' : '');

  const copyMinutes = () => {
    const lines = [`Faultline meeting — ${workspace.name} — ${new Date(sessionStart).toLocaleString()}`, `Period: ${periodLabel} · lost ${fmtH(ms)}${costable ? ` (${fmtGBP(ms * factor)})` : ''}`];
    for (const s of touched) {
      const kind = s.raisedAt >= sessionStart ? 'RAISED' : (s.closedAt ?? 0) >= sessionStart ? 'CLOSED' : 'UPDATED';
      lines.push(`- [${kind}] ${s.problem}${s.owner ? ` — ${s.owner}` : ''}${s.dueAt ? ` — due ${dateNice(s.dueAt)}` : ''}${s.latestUpdate ? ` — ${s.latestUpdate}` : ''}`);
    }
    if (touched.length === 0) lines.push('(no changes this meeting)');
    void navigator.clipboard?.writeText(lines.join('\n'));
  };

  // ---- act renderers (all mounted; hidden acts keep their state/position)
  const show = (n: number) => ({ display: act === n ? undefined : 'none' } as const);

  return (
    <div className="present meet">
      {/* ✕ returns WHERE YOU CAME FROM — the meeting is a room you step into,
          not a corridor that dumps you somewhere else on the way out */}
      <button className="present-exit" onClick={() => goBack(`/w/${workspace.id}/analyse`)} aria-label="Exit meeting">✕</button>
      <div className="present-body meet-body">

        <div className="meet-top">
          <span className="present-ws"><span className="ws-dot" style={{ background: workspace.color }} />{workspace.name}</span>
          <select className="mini-select meet-period" value={String(sel)} aria-label="Meeting period"
            onChange={e => { setSel(e.target.value === 'all' ? 'all' : Number(e.target.value)); setPath([]); }}>
            {[...fullWeeks].reverse().map(w => <option key={w.start} value={w.start}>{weekOf(w.start)}</option>)}
            <option value="all">All time</option>
          </select>
          <button className="btn btn-ghost meet-print" title="The printable one-page report" onClick={() => nav(`/w/${workspace.id}/report`)}>📄 Report</button>
          {act !== 0 && <button className="btn btn-ghost meet-home" onClick={() => setAct(0)}>⌂ Overview</button>}
        </div>

        {/* ═══ Act 0 — THE OVERVIEW BOARD. Every tile is a door. ═══ */}
        <div style={show(0)}>
          <h1 className="present-q meet-q">The meeting · {periodLabel}</h1>
          {live.length === 0 && snags.length === 0 ? (
            <p className="meet-empty">Nothing logged yet. Capture losses or walk the line — the meeting builds itself from what the team records.</p>
          ) : (
            <div className="meet-grid">
              <button className="meet-tile mt-number" onClick={() => setAct(1)}>
                <span className="mt-eyebrow">1 · The number</span>
                <span className="mt-big">{money(ms)}</span>
                <span className="mt-sub">{fmtH(ms)} lost · {plural(rows.length, 'observation')}
                  {deltaPct != null && <b className={deltaPct <= 0 ? 'mt-good' : 'mt-bad'}> {deltaPct <= 0 ? '▼' : '▲'} {Math.abs(deltaPct)}%</b>}
                </span>
              </button>
              <button className="meet-tile" onClick={() => { setPath([]); setAct(2); }}>
                <span className="mt-eyebrow">2 · Where it hurt</span>
                {topHurt.length === 0 ? <span className="mt-sub">No losses in this period.</span> : topHurt.map(sl => (
                  <span key={sl.key} className="mt-bar-row">
                    <span className="mt-bar" style={{ width: `${Math.round(sl.timeShare * 100)}%`, background: workspace.color }} />
                    <span className="mt-bar-lbl">{sl.key} · {Math.round(sl.timeShare * 100)}%</span>
                  </span>
                ))}
              </button>
              <button className="meet-tile" onClick={() => setAct(3)}>
                <span className="mt-eyebrow">3 · Actions</span>
                <span className="mt-line">{overdueN > 0 ? <b className="mt-bad">{overdueN} overdue</b> : <b className="mt-good">0 overdue</b>} · {dueSoonN} due this week</span>
                <span className="mt-sub">{plural(openActions.filter(s => s.status !== 'closed').length, 'open action')}</span>
              </button>
              <button className="meet-tile" onClick={() => setAct(4)}>
                <span className="mt-eyebrow">4 · Did it hold?</span>
                <span className="mt-line">
                  {closedRecent.length === 0 ? 'No fixes closed yet' : <>
                    <b className="mt-good">{held} holding</b>{slipped > 0 && <> · <b className="mt-bad">{slipped} slipping</b></>}
                    {' '}· {plural(closedRecent.length, 'fix', 'fixes')} closed
                  </>}
                </span>
                <span className="mt-sub">Green flags on the trend mark the weeks a fix landed.</span>
              </button>
              <button className="meet-tile mt-wide" onClick={() => setAct(5)}>
                <span className="mt-eyebrow">5 · This meeting</span>
                <span className="mt-line">{touched.length === 0 ? 'No decisions yet — they land here as you make them.' : `${plural(touched.length, 'decision')} recorded so far.`}</span>
              </button>
            </div>
          )}
          {/* the doors the Present tab used to open — the meeting adds, never removes */}
          <div className="meet-links">
            <button className="linkish" onClick={() => nav(`/w/${workspace.id}/walk`)}>▶ Walkthrough</button>
            <button className="linkish" onClick={() => nav(`/w/${workspace.id}/snaglist`)}>Snag report (print) ›</button>
            <button className="linkish" onClick={() => nav(`/w/${workspace.id}/report`)}>One-page report ›</button>
            <button className="linkish" onClick={() => nav(`/w/${workspace.id}/present`)}>Present the board ›</button>
          </div>
        </div>

        {/* ═══ Act 1 — THE NUMBER ═══ */}
        <div style={show(1)}>
          <h1 className="present-q meet-q">What {sel === 'all' ? 'it has' : 'last week'} cost us</h1>
          <div className="meet-hero">
            <span className="meet-hero-n">{money(ms)}</span>
            <span className="meet-hero-sub">
              {fmtH(ms)} of lost time · {plural(rows.length, 'observation')}
              {deltaPct != null && <b className={deltaPct <= 0 ? 'mt-good' : 'mt-bad'}> · {deltaPct <= 0 ? '▼' : '▲'} {Math.abs(deltaPct)}% vs the week before</b>}
            </span>
          </div>
          {weeks.length > 1 && <WeekBars weeks={weeks} sel={sel} onPick={s => { setSel(s); setPath([]); }} />}
          {cats.length > 0 && (
            <div className="meet-movers">
              <p className="mt-eyebrow">What's moving (last 3 full weeks vs the 3 before)</p>
              {cats.slice(0, 5).map(c => (
                <div key={c.category} className="meet-mover">
                  <span className={'mm-arrow ' + (c.verdict === 'improving' ? 'mt-good' : c.verdict === 'worsening' ? 'mt-bad' : 'mm-flat')}>
                    {c.verdict === 'improving' ? '▼' : c.verdict === 'worsening' ? '▲' : '→'}
                  </span>
                  <span className="mm-name">{c.category}</span>
                  <span className="mm-num">{costable ? fmtGBP(c.costPerWeek) : fmtH(c.msPerWeek)}/wk{c.changePct != null ? ` · ${c.changePct > 0 ? '+' : ''}${c.changePct}%` : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═══ Act 2 — WHERE IT HURT (the live board, drillable) ═══ */}
        <div style={show(2)}>
          <h1 className="present-q meet-q">Where it hurt · {periodLabel}</h1>
          {rows.length === 0 ? <p className="meet-empty">No observations in this period — pick another week above, or go capture what the line is doing.</p> : (() => {
            const view: WorkstreamView = { workspaceId: workspace.id, measure: 'time', dimensionOrder: BOARD_ORDER, path, mode: 'present' };
            const node = drillNode(rows, view);
            return (
              <>
                <DrillBreadcrumb path={path} onJump={d => setPath(p => p.slice(0, d))} />
                <DisagreementBanner d={node.disagreement} />
                {node.pareto && node.dimension ? (
                  <div className="present-chart">
                    <ParetoChart
                      slices={toSlices(node.rows, node.dimension, costable, factor)}
                      color={workspace.color} rankLabel="cumulative time"
                      onDrill={key => setPath(p => [...p, { dimension: node.dimension!, value: key }])} canDrill
                    />
                  </div>
                ) : (
                  <p className="meet-leaf">{plural(node.rows.length, 'observation')} · {fmtH(node.rows.reduce((a, o) => a + o.durationMs, 0))} — this is the bottom: the evidence below is the answer.</p>
                )}
                <EvidenceStrip media={node.media} />
                {/* decisions land as data — raise it while the room agrees */}
                <ActionComposer wsId={workspace.id} path={path} />
              </>
            );
          })()}
        </div>

        {/* ═══ Act 3 — THE RECKONING (who / what / when, edited in the room) ═══ */}
        <div style={show(3)}>
          <h1 className="present-q meet-q">Actions — who's carrying what
            <button className="linkish meet-act-link" onClick={() => nav(`/w/${workspace.id}/snaglist`)}>Full list &amp; print ›</button>
          </h1>
          {openActions.length === 0 ? <p className="meet-empty">No open actions. Raise them from the board (Act 2) or on a walk.</p> : (() => {
            const groups = new Map<string, Snag[]>();
            for (const s of openActions) { const k = s.owner?.trim() || 'Unassigned'; const g = groups.get(k) ?? []; g.push(s); groups.set(k, g); }
            const ordered = [...groups.entries()]
              .map(([name, list]) => ({ name, list, overdue: list.filter(isOverdueNow).length, open: list.filter(x => x.status !== 'closed').length }))
              .sort((a, b) => (a.name === 'Unassigned' ? 1 : 0) - (b.name === 'Unassigned' ? 1 : 0) || b.overdue - a.overdue || b.open - a.open || a.name.localeCompare(b.name));
            return ordered.map(g => (
              <div key={g.name} className="meet-owner">
                <div className="mo-head">{g.name}<span className="oh-counts">{g.open} open{g.overdue > 0 ? <b className="oh-over"> · {g.overdue} overdue</b> : null}</span></div>
                {g.list.map(s => (
                  <div key={s.id} className={'meet-action' + (isOverdueNow(s) ? ' over' : '') + (s.status === 'closed' ? ' done' : '')}>
                    <div className="ma-main">
                      <span className="ma-problem">{s.problem}</span>
                      {whereOf(s) ? <span className="ma-where">⚑ {whereOf(s)}</span> : null}
                      <input className="mini-update ma-update" defaultValue={s.latestUpdate ?? ''} placeholder="Latest update…" maxLength={200}
                        onBlur={e => { const t = e.target.value.trim(); if (t !== (s.latestUpdate ?? '')) void mutate({ ...s, latestUpdate: t || undefined, latestUpdateAt: t ? Date.now() : undefined }); }} />
                    </div>
                    <div className="ma-controls">
                      <select className="mini-select" value={s.status} aria-label="Status"
                        onChange={e => { const status = e.target.value as SnagStatus; void mutate({ ...s, status, closedAt: status === 'closed' ? (s.closedAt ?? Date.now()) : undefined }); }}>
                        {(['open', 'in_progress', 'closed'] as SnagStatus[]).map(x => <option key={x} value={x}>{SNAG_STATUS_META[x].label}</option>)}
                      </select>
                      <input className="mini-owner" defaultValue={s.owner ?? ''} placeholder="Owner" aria-label="Owner"
                        onBlur={e => { const o = e.target.value.trim(); if (o !== (s.owner ?? '')) void mutate({ ...s, owner: o || undefined }); }} />
                      <input type="date" className="mini-due" defaultValue={dueToInput(s.dueAt)} aria-label="Due date"
                        onChange={e => { const dueAt = dueFromInput(e.target.value); if (dueAt !== s.dueAt) void mutate({ ...s, dueAt }); }} />
                      <span className="ma-strip"><TimeStrip snag={s} />{dueWord(s) ? <span className={'due-word' + (isOverdueNow(s) ? ' dw-over' : isDueSoon(s) ? ' dw-soon' : '')}>{dueWord(s)}</span> : null}</span>
                    </div>
                  </div>
                ))}
              </div>
            ));
          })()}
        </div>

        {/* ═══ Act 4 — DID IT HOLD? (wins named, fake fixes reopened) ═══ */}
        <div style={show(4)}>
          <h1 className="present-q meet-q">Did the fixes hold?</h1>
          {weeks.length > 1 && <WeekBars weeks={weeks} sel={sel} flags={flagsByWeek} onPick={s => { setSel(s); setPath([]); }} />}
          {closedRecent.length === 0 ? <p className="meet-empty">No fixes closed in this range yet. When actions close, each one gets judged here against the trend.</p> : (
            <div className="meet-holds">
              {closedRecent.map(s => {
                const v = verdictOf(s);
                return (
                  <div key={s.id} className="meet-hold">
                    <span className={'mh-verdict ' + (v?.verdict === 'improving' ? 'mt-good' : v?.verdict === 'worsening' ? 'mt-bad' : 'mm-flat')}>
                      {v ? (v.verdict === 'improving' ? '✓ holding' : v.verdict === 'worsening' ? '✗ slipping' : '→ steady') : '· closed'}
                    </span>
                    <div className="mh-body">
                      <span className="mh-problem">{s.problem}</span>
                      <span className="mh-meta">
                        {whereOf(s) ? `${whereOf(s)} · ` : ''}{s.owner ? `${s.owner} · ` : ''}closed {dateNice(s.closedAt!)}
                        {v?.changePct != null ? ` · ${s.targetCategory} ${v.changePct > 0 ? '+' : ''}${v.changePct}% since` : ''}
                      </span>
                    </div>
                    {v?.verdict === 'worsening' && (
                      <button className="btn btn-ghost mh-reopen" onClick={() => void mutate({ ...s, status: 'open', closedAt: undefined })}>Reopen</button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ═══ Act 5 — THE RECAP (the minutes wrote themselves) ═══ */}
        <div style={show(5)}>
          <h1 className="present-q meet-q">What we decided</h1>
          {touched.length === 0 ? <p className="meet-empty">Nothing yet. Every action raised, updated or closed during this meeting appears here — the minutes write themselves.</p> : (
            <>
              <div className="meet-minutes">
                {touched.map(s => {
                  const kind = s.raisedAt >= sessionStart ? 'raised' : (s.closedAt ?? 0) >= sessionStart ? 'closed' : 'updated';
                  return (
                    <div key={s.id} className="meet-minute">
                      <span className={'mm-kind mm-' + kind}>{kind}</span>
                      <div className="mh-body">
                        <span className="mh-problem">{s.problem}</span>
                        <span className="mh-meta">
                          {s.owner ? `${s.owner} · ` : ''}{whereOf(s) ? `${whereOf(s)} · ` : ''}
                          {s.dueAt ? `due ${dateNice(s.dueAt)}` : 'no due date'}
                          {s.latestUpdate ? ` · ${s.latestUpdate}` : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button className="btn meet-copy" onClick={copyMinutes}>Copy the minutes</button>
            </>
          )}
        </div>

      </div>

      {/* the agenda rail — sideways axis, fixed order, always visible */}
      <nav className="meet-rail" aria-label="Meeting agenda">
        <button className={'mr-step' + (act === 0 ? ' on' : '')} onClick={() => setAct(0)}>⌂<span className="mr-lbl">Overview</span></button>
        {ACTS.map(a => (
          <button key={a.n} className={'mr-step' + (act === a.n ? ' on' : '')} onClick={() => { if (a.n === 2) setPath([]); setAct(a.n); }}>
            {a.n}<span className="mr-lbl">{a.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// module-level so the render helpers above can share it without threading `now`
const isOverdueNow = (s: Snag) => isOverdue(s);
