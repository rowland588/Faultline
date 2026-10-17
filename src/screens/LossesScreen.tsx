/* A SHIFT'S LOSS COUNT — one study of tool 'losses' (docs/TOOLKIT.md, Part 4,
 * tool 7; docs/BUILD.md, E).
 *
 * The frame every tool shares (TOOLKIT 3.1), in the order of the three
 * questions: where are we (the strip), why are we not where we should be
 * (the sentence and the waterfall — the rest, slow running and short stops,
 * the only thing that may carry colour), what are we doing about it (Make it better on a
 * bar, the countermeasure or the fix it raised).
 *
 * At the end of the shift, on a phone: pick the shift (or type the window),
 * type the packs made and the rejects; the planned minutes are worked out —
 * the shift less its breaks (docs/CAPACITY.md §5), changed for the day only
 * with a reason; the rate is the ideal speed of the line's slowest station —
 * a machine's plate speed, a person's standard time — said so, or said not
 * to be. The stops were timed through the shift in
 * Capture — they are read here, never typed again. Saved once, on "Save the
 * count" — not on every keystroke. While it runs, the running speed is timed
 * (the packs in a timed minute): what tells slow running from short stops.
 *
 * Nothing worked out is stored. The figures and the sentence come from
 * lib/ie/losses on every render, from the count and the line's stops in the
 * window; only at close are they written down, as a receipt. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getStandard, getStudy, getWorkspace, listObservations, listStandardsForLine, listStudiesForLine, onDataChange, patchStudy } from '../db';
import { useAccess } from '../cloud/access';
import { useSession } from '../cloud/session';
import { displayName } from '../cloud/team';
import { can as canAt, type Can } from '../lib/access';
import { now, uid } from '../lib/ids';
import { niceDay, todayISO } from '../lib/weeks';
import { shiftWindow } from '../lib/shifts';
import { nav } from '../state/useRoute';
import { gbp, isRest, lossSays, paceWords, rateOf, minWords, packs, plannedOf, rateKnown, rateWords, runningOf, splitWords, stopsOfBar, windowWords, type LossBar, type LossFigures, type LossSays, type RateOf } from '../lib/ie/losses';
import { sixmLabel } from '../lib/sixm';
import { Sheet } from '../ui/Sheet';
import { lossFiguresOf, recordHref, ROLE_WORD, type StudyContext } from '../lib/studyLinks';
import type { LossCount, RunTiming, ToolStudy } from '../lib/study';
import type { Observation, Workspace } from '../types';
import { UsedFor, WhereItSits, useBetter } from '../ui/StudyPlace';
import { StudyName } from '../ui/StudyActs';
import { capacityForCount } from '../ui/ShiftLosses';
import { constraintShare, lineConstraint, type ConstraintShare, type LineConstraint } from '../lib/intelligence';
import { lossLean, lossPart, raisedFrom } from '../lib/ie/lossLean';
import { LeanActions, LeanBand, LeanClosing, LeanInsights, LeanPanel, LeanTiles, LeanTrend } from '../ui/Lean';

const OWNER = canAt('owner');

export function LossesScreen({ id }: { id: string }) {
  const [s, setS] = useState<ToolStudy | null | undefined>(undefined);
  const [line, setLine] = useState<Workspace | undefined>(undefined);
  const [obs, setObs] = useState<Observation[]>([]);
  const [rate, setRate] = useState<RateOf>({ why: 'typed' });
  const [constraint, setConstraint] = useState<LineConstraint | undefined>(undefined);
  const [counts, setCounts] = useState<ToolStudy[]>([]);
  const load = useCallback(async () => {
    const st = (await getStudy(id)) ?? null;
    if (!st) { setS(null); return; }
    /* The line: its shifts, its cost model, its stops and its capacity —
       what the count is read against. Nothing of it is copied onto the
       study but the rate the count was judged at. */
    const [w, o, sd, stds, line] = await Promise.all([
      st.workspaceId ? getWorkspace(st.workspaceId) : Promise.resolve(undefined),
      st.workspaceId ? listObservations(st.workspaceId) : Promise.resolve([] as Observation[]),
      st.standardId ? getStandard(st.standardId) : Promise.resolve(undefined),
      st.workspaceId ? listStandardsForLine(st.workspaceId) : Promise.resolve([]),
      /* the line's other counts — since last time, and the trend (lib/ie/lossLean) */
      st.workspaceId ? listStudiesForLine(st.workspaceId) : Promise.resolve([] as ToolStudy[]),
    ]);
    setCounts(line.filter(x => x.tool === 'losses' && !x.deletedAt));
    /* where the line is held — its products' Line capacity, read as the
       capacity panel reads it, so a bar here and a band there agree */
    setConstraint(lineConstraint(stds.filter(x => !x.deletedAt).map(x => ({ product: x.product, capacity: x.capacity }))));
    const { cap, target } = await capacityForCount(st.workspaceId, sd);
    setLine(w); setObs(o); setRate(rateOf(cap, target)); setS(st);
  }, [id]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  const jobCan = useAccess(s?.projectId ?? '');
  /* On a job, the job's rule; on a line or on its own, its people may do all
     of it, as on any study (TOOLKIT 3.6). */
  const can = s?.projectId ? jobCan : OWNER;
  const { session } = useSession();
  const me = displayName(session?.user.email) || undefined;

  if (s === undefined) return <div className="wrap ie lf" aria-busy="true"><div className="sk sk-line" /><div className="sk sk-row" /></div>;
  if (s === null) return (
    <div className="wrap ie lf">
      <h1>This loss count isn’t on this device</h1>
      <p className="sub">It may have been deleted, or not synced here yet.</p>
      <button type="button" className="btn" onClick={() => nav('/losses')}>Every loss count</button>
    </div>
  );
  return <Losses s={s} line={line} obs={obs} rate={rate} can={can} me={me} constraint={constraint} counts={counts} />;
}

function Losses({ s, line, obs, rate, can, me, constraint, counts }: { s: ToolStudy; line?: Workspace; obs: Observation[]; rate: RateOf; can: Can; me?: string; constraint?: LineConstraint; counts: ToolStudy[] }) {
  const c = s.facts.losses;
  const ctx = useMemo<StudyContext>(() => ({ observations: obs, workspaces: line ? [line] : [] }), [obs, line]);
  const f = useMemo(() => lossFiguresOf(s, ctx), [s, ctx]);
  const said = useMemo(() => lossSays(f, c, { ...(s.product ? { product: s.product } : {}) }), [f, c, s.product]);
  const closed = !!s.closedAt;
  const editable = can.edit && !closed;
  const write = (p: Parameters<typeof patchStudy>[1]) => void patchStudy(s.id, p);
  /* MAKE IT BETTER ON A BAR: a fix (stage gate) or a countermeasure (6M) in
     the bar's own figures, this count its evidence naming the bar; the bar
     then says what was raised from it (ui/StudyPlace useBetter). */
  const { board, byRef, better, steps, tests } = useBetter(s, me, ctx);
  /* THE LEAN PAGE (docs/LEAN-PAGE.md): the count read into the band, the
     tiles with since last time, the trend, what it means, the action plan
     and the closing line — the same reading its paper prints */
  const lean = useMemo(() => lossLean({
    s, f, said, ...(line ? { line: line.name } : {}),
    history: counts.map(h => ({ s: h, f: h.id === s.id ? f : lossFiguresOf(h, ctx) })),
    actions: raisedFrom(s, steps, tests, lossPart(f)),
  }), [s, f, said, line, counts, ctx, steps, tests]);
  const branches = useMemo(() => {
    const m = new Map<string, string[]>();
    /* a record raised from the part once called "not yet explained" hangs off the rest */
    for (const u of s.uses) if (u.step && u.role === 'evidence' && byRef.has(u.ref)) { const k = u.step === 'unexplained' ? 'performance' : u.step; m.set(k, [...(m.get(k) ?? []), u.ref]); }
    return m;
  }, [s.uses, byRef]);
  /* A bar tapped — in the waterfall or the table: everything about it, and
     Make it better on it (tools come out where the work is). */
  const [viewing, setViewing] = useState<string | null>(null);
  const bar = viewing ? f.bars.find(b => b.key === viewing) : undefined;
  /* THE CONSTRAINT ON EVERY BAR (docs/upgrade-plan.md, L): how much of each
     cause's stops sit on the machine that holds the line — off it, fixing
     it makes no more on its own. Slow running and short stops are line time
     at the pace-setter, so on it by definition; rejects are packs, not time. */
  const onC = useMemo(() => {
    const m = new Map<string, ConstraintShare>();
    if (!constraint || !c) return m;
    for (const b of f.bars) if (b.kind === 'cause' || b.kind === 'changeover') m.set(b.key, constraintShare(stopsOfBar(obs, c, b, s.workspaceId), constraint));
    return m;
  }, [constraint, c, f.bars, obs, s.workspaceId]);

  const detail = (
    <div className={'lf-body lf-detail' + (f.enough ? '' : ' is-counting')}>
      <CountForm s={s} line={line} rate={rate} editable={editable} />
      <RunningSpeed s={s} f={f} editable={editable} me={me} />
    </div>
  );
  return (
    <div className="wrap ie lf ln">
      <LeanBand page={lean} title={<StudyName s={s} canEdit={editable} canRemove={can.remove} />} />
      <div className="ln-under"><WhereItSits s={s} can={can} /></div>
      <LeanTiles tiles={lean.tiles} className="ie-strip" />

      {/* Until the count is in, the count comes first — it is the one thing to do */}
      {!f.enough && detail}

      {/* THE EIGHT PARTS (docs/LEAN-PAGE.md), as the paper sets them: on a
          laptop the trend beside the waterfall, the top causes across, what
          it means beside the action plan; on a phone one under another. A
          bar or a row tapped opens it, Make it better on it. */}
      <div className="ln-grid">
        {lean.trend && <LeanPanel title="Shift by shift"><LeanTrend trend={lean.trend} /></LeanPanel>}
        <LeanPanel title="Where the minutes went" className={lean.trend ? '' : 'ln-span'}><div className="ie-pic lf-pic"><Waterfall f={f} said={said} onOpen={setViewing} /></div></LeanPanel>
      </div>
      {f.enough && f.bars.length > 0 && <LeanPanel title="Top causes" className="ln-solo"><div className="lf-tab"><CauseTable f={f} branches={branches} onOpen={setViewing} onC={onC} /></div></LeanPanel>}
      <div className="ln-grid">
        <LeanPanel title="What it means">
          <div className="ie-says">
            <p className={'ie-say is-' + said.tone}>{said.text}</p>
            {s.overrule && <p className="ie-say ie-over"><b>{s.overrule.verdict}</b> · overruled{s.overrule.by ? ` by ${s.overrule.by}` : ''} — {s.overrule.why}</p>}
            <LeanInsights insights={lean.insights} />
          </div>
        </LeanPanel>
        <LeanPanel title="Action plan" className="ln-plan-p">
          <LeanActions actions={lean.actions} empty={lean.actionsEmpty}
            onOpen={a => { if (s.projectId && a.open) nav(recordHref(s.projectId, { kind: a.open.kind, ref: a.open.ref })); }} />
        </LeanPanel>
      </div>
      <LeanClosing closing={lean.closing} />

      {/* WHAT IS TYPED — the count and the running speed, under the eight */}
      {f.enough && detail}

      <UsedFor s={s} can={can} me={me} />
      <Act s={s} f={f} said={said} can={can} me={me} write={write} />

      {bar && c && (
        <BarSheet bar={bar} f={f} c={c} obs={obs} workspaceId={s.workspaceId} board={board} onC={onC.get(bar.key)} constraint={constraint}
          raised={(branches.get(bar.key) ?? []).map(ref => ({ ref, title: byRef.get(ref)?.title ?? 'a record' }))}
          canBetter={editable && !!s.projectId} onJob={!!s.projectId} canEdit={editable}
          openRef={ref => { if (s.projectId) nav(recordHref(s.projectId, { kind: board ? 'action' : 'fix', ref })); }}
          onBetter={() => { const k = bar.key; setViewing(null); void better(k); }}
          onClose={() => setViewing(null)} />
      )}
    </div>
  );
}


/* ------------------------------------------------------------------ the waterfall */
/** THE WATERFALL, drawn across: a row per bar, top to bottom — planned, each
 *  loss stepping down from where the one before left off, made — to scale,
 *  the label and the minutes inside the frame at a size a person on the floor
 *  can read, on a phone or beside the table on a laptop. What nobody logged —
 *  the slow running and short stops, or the short stops once the running
 *  speed is timed — hatched grey; the rest amber only over a tenth of the
 *  loss; nothing green. Tap a row to open it. */
const RW = 360, RH = 34, RL = 112, RR = 64;
function Waterfall({ f, said, onOpen }: { f: LossFigures; said: LossSays; onOpen: (key: string) => void }) {
  if (!f.enough) return <p className="sub ie-pic-empty">The waterfall draws itself here — planned minutes down to the good packs made — once the count is in.</p>;
  const planned = f.plannedMin ?? 0, rate = f.rate ?? 1;
  const madeMin = Math.min(planned, (f.made ?? 0) / rate);
  const top = Math.max(planned, 1);
  const x = (v: number) => RL + (Math.max(0, v) / top) * (RW - RL - RR);
  const rows = f.bars.length + 2;
  let level = planned;
  const lbl = (t: string) => (t === 'Slow running and short stops' ? 'Slow + short stops' : t.length > 17 ? `${t.slice(0, 16)}…` : t);
  return (
    <svg className="lf-fall is-rows" viewBox={`0 0 ${RW} ${rows * RH + 8}`} role="img" aria-label={said.text}>
      <defs>
        <pattern id="lf-hatch" patternUnits="userSpaceOnUse" width="6" height="6"><path d="M0 6 L6 0" className="lf-hatch" /></pattern>
      </defs>
      <g>
        <text className="lf-rl" x={0} y={RH / 2 + 5}>Planned</text>
        <rect className="lf-bar is-frame" x={x(0)} y={6} width={x(planned) - x(0)} height={RH - 12} />
        <text className="lf-rv" x={RW} y={RH / 2 + 5}>{minWords(planned)}</text>
      </g>
      {f.bars.map((b, i) => {
        const from = level, to = Math.max(0, level - b.min);
        level = to;
        const y0 = (i + 1) * RH;
        const hatch = b.kind === 'performance' || b.kind === 'short';
        const amber = !!b.abnormal;
        return (
          <g key={b.key} className="lf-go" onClick={() => onOpen(b.key)}>
            <title>{b.label}: {minWords(b.min)}</title>
            <rect className="lf-hit" x={0} y={y0} width={RW} height={RH} />
            <text className={'lf-rl' + (amber ? ' is-a' : '')} x={0} y={y0 + RH / 2 + 5}>{lbl(b.label)}</text>
            <line className="lf-step" x1={x(from)} x2={x(from)} y1={y0 - RH + 6} y2={y0 + 6} />
            <rect className={'lf-bar' + (hatch ? ' is-unex' : '') + (isRest(b) && amber ? ' is-a' : '')}
              x={x(to)} y={y0 + 6} width={Math.max(1.5, x(from) - x(to))} height={RH - 12} />
            <text className={'lf-rv' + (amber ? ' is-a' : '')} x={RW} y={y0 + RH / 2 + 5}>{minWords(b.min)}</text>
          </g>
        );
      })}
      <g>
        <text className="lf-rl" x={0} y={(rows - 1) * RH + RH / 2 + 5}>Made · {packs(f.made ?? 0)}</text>
        <rect className="lf-bar is-frame" x={x(0)} y={(rows - 1) * RH + 6} width={x(madeMin) - x(0)} height={RH - 12} />
        <text className="lf-rv" x={RW} y={(rows - 1) * RH + RH / 2 + 5}>{minWords(madeMin)}</text>
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ the causes as a table */
const KNOWN: Record<LossBar['grade'], string> = { measured: 'timed', typed: 'typed', counted: 'counted', none: 'not logged' };

function CauseTable({ f, branches, onOpen, onC }: { f: LossFigures; branches: Map<string, string[]>; onOpen: (key: string) => void; onC: Map<string, ConstraintShare> }) {
  /* the pounds in two parts, each a column only when the line has that cost */
  const lab = f.labour !== undefined, con = f.contribution !== undefined;
  const m = ' m' + ((lab ? 1 : 0) + (con ? 1 : 0));
  return (
    <div className="lf-table" role="table" aria-label="The losses by cause">
      <div className={'lf-tr lf-th' + m} role="row">
        <span role="columnheader">Cause</span><span role="columnheader" className="is-num">Stops</span><span role="columnheader" className="is-num">Minutes</span>
        {lab && <span role="columnheader" className="is-num">Idle labour</span>}{con && <span role="columnheader" className="is-num">Lost contri&shy;bution</span>}
      </div>
      {f.bars.map(b => {
        const raised = (branches.get(b.key) ?? []).length;
        return (
          <button key={b.key} type="button" role="row" className={'lf-tr lf-row' + (b.abnormal ? ' is-a' : '') + m}
            onClick={() => onOpen(b.key)} aria-label={`${b.label}: ${minWords(b.min)} — open it`}>
            <span role="cell" className="lf-cause">
              <b>{b.label}</b>{b.asset ? <span className="sub"> · {b.asset}</span> : null}{b.kind === 'rejects' ? <span className="sub"> · {packs(b.packs ?? 0)} packs</span> : null}
              <span className="sub lf-known"> · {b.kind === 'performance' ? 'the rest, not yet told apart' : b.kind === 'short' ? 'the rest' : KNOWN[b.grade]}</span>
              {(() => { const sh = onC.get(b.key); return !sh?.says ? null : sh.share >= 0.5 ? <em className="lch-tag">constraint</em> : <span className="sub lf-mirage"> · off the constraint</span>; })()}
              {raised > 0 && <span className="lf-branch">Being made better{raised > 1 ? ` · ${raised}` : ''}</span>}
            </span>
            <span role="cell" className="is-num">{b.stops !== undefined ? b.stops : '—'}</span>
            <span role="cell" className="is-num">{minWords(b.min)}{(f.lostMin ?? 0) > 0 && <small className="lf-share">{Math.round((b.min / (f.lostMin ?? 1)) * 100)}%</small>}</span>
            {lab && <span role="cell" className="is-num">{b.labour !== undefined ? gbp(b.labour) : '—'}</span>}
            {con && <span role="cell" className="is-num">{b.contribution !== undefined ? gbp(b.contribution) : '—'}</span>}
            <span className="lf-chev" aria-hidden>›</span>
          </button>
        );
      })}
      <div className={'lf-tr lf-tf' + m} role="row">
        <span role="cell">Lost</span><span role="cell" className="is-num">{f.stopsN + f.changeoverN}</span><span role="cell" className="is-num">{minWords(f.lostMin ?? 0)}</span>
        {lab && <span role="cell" className="is-num">{gbp(f.labour ?? 0)}</span>}
        {con && <span role="cell" className="is-num">{gbp(f.contribution ?? 0)}</span>}
      </div>
      {con && <p className="sub lf-con">Lost contribution: the packs not made × {f.contributionFrom === 'price' ? 'price less materials' : 'the line’s margin'} a pack — lost only if it cannot be made up.</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ one bar, opened */
const clock = (ms: number) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

function BarSheet({ bar, f, c, obs, workspaceId, board, onC, constraint, raised, canBetter, onJob, canEdit, openRef, onBetter, onClose }: {
  bar: LossBar; f: LossFigures; c: LossCount; obs: Observation[]; workspaceId?: string; board: boolean; onC?: ConstraintShare; constraint?: LineConstraint;
  raised: { ref: string; title: string }[]; canBetter: boolean; onJob: boolean; canEdit: boolean;
  openRef: (ref: string) => void; onBetter: () => void; onClose: () => void;
}) {
  const stops = stopsOfBar(obs, c, bar, workspaceId);
  const share = f.lostMin && f.lostMin > 0 ? Math.round((bar.min / f.lostMin) * 100) : undefined;
  return (
    <Sheet open onClose={onClose} title={bar.label}>
      <div className="lf-sheet">
        <p className="lf-sheet-h"><b>{minWords(bar.min)}</b>{share !== undefined ? ` · ${share}% of the ${minWords(f.lostMin ?? 0)} lost` : ''}{bar.stops !== undefined ? ` · ${bar.stops} stop${bar.stops === 1 ? '' : 's'}` : ''}{bar.labour !== undefined ? ` · ${gbp(bar.labour)} idle labour` : ''}{bar.contribution !== undefined ? ` · ${gbp(bar.contribution)} lost contribution` : ''}</p>
        <dl className="lf-facts">
          {bar.asset && <div><dt>Where</dt><dd>{bar.asset}</dd></div>}
          {constraint && (onC?.says || bar.kind === 'slow' || bar.kind === 'short' || bar.kind === 'performance') && (
            <div><dt>The constraint</dt><dd className={onC && onC.share < 0.5 ? 'lf-mirage' : ''}>{!onC ? `On the constraint — slow running and short stops are time at the ${constraint.name}, the machine that holds the line.`
            : onC.share >= 0.95 ? `On the ${constraint.name}, the constraint — every minute here is output lost.`
              : onC.share <= 0.05 ? `Off the constraint — this shift it cost output only where it starved or blocked the ${constraint.name}. Making it better makes no more on its own: the line is held at the ${constraint.name}.`
                : onC.says}</dd></div>
          )}
          <div><dt>How known</dt><dd>{bar.kind === 'rejects' ? `${packs(bar.packs ?? 0)} packs counted, at ${rateWords(f.rate ?? 0)}`
            : bar.kind === 'performance' ? `Not logged — what the count says was lost, less every stop timed, the changeovers and the rejects: running below the ${f.ideal}, and stops too short to log, not yet told apart. Time the running speed on the count to split them.`
              : bar.kind === 'slow' ? (splitWords(f) ?? `The running speed timed against the ${f.ideal}.`)
                : bar.kind === 'short' ? 'Worked out — the rest once the slow running is timed: stops too short to log one by one.'
                  : `${KNOWN[bar.grade]} in Capture`}</dd></div>
          {bar.kind !== 'performance' && <div><dt>Its bone</dt><dd>{sixmLabel(bar.bone)} — {bar.kind === 'rejects' ? 'the usual bone for a reject' : bar.kind === 'slow' && c.rateFrom === 'standard-time' ? `the person who sets the pace${c.ratePerson ? `, ${c.ratePerson}` : ''}` : bar.kind === 'slow' || bar.kind === 'short' ? `the machine that sets the pace${c.rateMachine ? `, the ${c.rateMachine}` : ''}` : 'as the floor tapped it, or the usual bone for the reason'}</dd></div>}
        </dl>
        {stops.length > 0 && (
          <ol className="lf-stops" aria-label="The stops">
            {stops.map(o => (
              <li key={o.id}><span className="lf-stop-t">{clock(o.startedAt)}</span>
                <b>{minWords(o.durationMs / 60_000)}</b>{o.count > 1 ? <span className="sub"> ×{o.count}</span> : null}
                <span className="sub"> · {[o.subcategory, o.asset].filter(Boolean).join(' · ')}{o.note ? ` — “${o.note}”` : ''}</span></li>
            ))}
          </ol>
        )}
        {raised.length > 0 && (
          <div className="vs-branch">
            <small className="ie-h">Being made better</small>
            {raised.map(r => (
              <p key={r.ref}><span className="sub">{ROLE_WORD[`${board ? 'action' : 'fix'}:evidence`]}:</span>{' '}
                <button type="button" className="linkish" onClick={() => openRef(r.ref)}>{r.title}</button></p>
            ))}
          </div>
        )}
        {canEdit && !onJob && <p className="sub">Attach the count to a job to raise a fix or a countermeasure from it.</p>}
        <div className="vs-step-acts">
          {canBetter && raised.length === 0 && bar.min > 0.5 && (
            <button type="button" className="btn btn-primary" onClick={onBetter}>{board ? 'Make it better — a countermeasure' : 'Make it better — raise a fix'}</button>
          )}
          <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ the count: the facts */
const hm = (ms: number) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const numOr = (t: string) => (t.trim() === '' ? undefined : Number(t));
const same = (a?: number, b?: number) => a !== undefined && b !== undefined && Math.abs(a - b) < 0.005;

/** THE COUNT. The planned minutes are WORKED OUT — the shift less its
 *  breaks, from the line's settings (docs/CAPACITY.md §5) — and changed for
 *  the day only with a reason kept beside them. The rate is the ideal speed
 *  of the line's slowest station on its capacity — a machine's plate speed,
 *  a person's standard time (lib/ie/losses rateOf) — said so; a number
 *  typed over it is said to be typed. */
function CountForm({ s, line, rate: plate, editable }: { s: ToolStudy; line?: Workspace; rate: RateOf; editable: boolean }) {
  const c = s.facts.losses;
  const shifts = line?.shifts ?? [];
  const [shift, setShift] = useState<string>(c?.shift ?? '');
  const [day, setDay] = useState(todayISO(new Date(c?.from ?? now())));
  const [from, setFrom] = useState(c ? hm(c.from) : '06:00');
  const [to, setTo] = useState(c ? hm(c.to) : '14:00');
  /* breaks typed with a window typed by hand; a shift's come from the line */
  const [breaks, setBreaks] = useState(c && !c.shift && c.breakMin !== undefined ? String(c.breakMin) : '');
  /* null: the planned minutes follow the shift less its breaks */
  const [override, setOverride] = useState<string | null>(c && plannedOf(c).changed && c.plannedMin !== undefined ? String(c.plannedMin) : null);
  const [why, setWhy] = useState(c?.plannedWhy ?? '');
  const [made, setMade] = useState(c?.made !== undefined ? String(c.made) : '');
  const [rejects, setRejects] = useState(c?.rejects !== undefined ? String(c.rejects) : '');
  const [rate, setRate] = useState(c?.ratePerMin !== undefined ? String(c.ratePerMin) : plate.ratePerMin !== undefined ? String(plate.ratePerMin) : '');
  const [saved, setSaved] = useState<string | null>(null);

  /* The window, from the shift's clock on the day — or typed. */
  const picked = shifts.find(x => x.name === shift);
  const window = picked ? shiftWindow(picked, day) : shiftWindow({ start: from, end: to }, day);
  const brk = picked ? { ...(picked.breakMin !== undefined ? { breakMin: picked.breakMin } : {}), ...(picked.relief ? { relief: true } : {}) }
    : numOr(breaks) !== undefined && Number.isFinite(numOr(breaks)) ? { breakMin: numOr(breaks) as number } : {};
  const worked = window ? plannedOf({ ...window, ...(picked ? { shift: picked.name } : {}), ...brk }) : undefined;
  const n = { planned: override !== null ? numOr(override) : worked?.workedOut, made: numOr(made), rejects: numOr(rejects), rate: numOr(rate), breaks: numOr(breaks) };
  const changed = override !== null && n.planned !== undefined && worked !== undefined && Math.round(n.planned) !== worked.workedOut;
  const bad = [n.planned, n.made, n.rejects, n.rate, n.breaks].some(v => v !== undefined && (!Number.isFinite(v) || v < 0));
  const problem = !window ? 'The window needs a start and an end.' : bad ? 'Numbers only, none below zero.'
    : changed && !why.trim() ? 'Say why the planned minutes are not the shift less its breaks — it is kept with the count.' : '';
  /* where the rate is from: the ideal speed when it is that number; else as
     the count had it when it is the count's own; else typed */
  const whence = (x: Pick<LossCount, 'rateFrom' | 'rateMachine' | 'ratePerson' | 'rateTimed'>): Pick<LossCount, 'rateFrom' | 'rateMachine' | 'ratePerson' | 'rateTimed'> => ({
    rateFrom: x.rateFrom ?? 'typed', ...(x.rateMachine ? { rateMachine: x.rateMachine } : {}), ...(x.ratePerson ? { ratePerson: x.ratePerson } : {}), ...(x.rateTimed ? { rateTimed: true } : {}) });
  const from_ = n.rate === undefined ? undefined
    : same(n.rate, plate.ratePerMin) ? whence(plate)
      : same(n.rate, c?.ratePerMin) && c?.rateFrom ? whence(c)
        : { rateFrom: 'typed' as const };

  const save = () => {
    if (!window || problem) return;
    const count: LossCount = {
      ...(picked ? { shift: picked.name } : {}), from: window.from, to: window.to, ...brk,
      ...(n.planned !== undefined && n.planned > 0 ? { plannedMin: n.planned } : {}),
      ...(changed ? { plannedWhy: why.trim() } : {}),
      ...(n.made !== undefined ? { made: n.made } : {}),
      ...(n.rejects !== undefined ? { rejects: n.rejects } : {}),
      ...(n.rate !== undefined && n.rate > 0 && from_ ? { ratePerMin: n.rate, ...from_ } : {}),
    };
    /* Named for its shift and day, unless somebody named it by hand. */
    const auto = !s.name.trim() || s.name === 'Loss count' || /^(.+), \d{1,2} \w{3}$/.test(s.name);
    const name = `${picked ? picked.name : `${from}–${to}`}, ${new Date(window.from).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
    void patchStudy(s.id, cur => ({ facts: { ...cur.facts, losses: count }, ...(auto ? { name } : {}) }));
    if (!changed) setOverride(null);
    setSaved(`Saved ${hm(now())}`);
  };

  if (!editable) {
    return (
      <div className="lf-count is-ro" aria-label="The count">
        <small className="ie-h">The count</small>
        {c ? (
          <dl className="lf-facts">
            <div><dt>Shift</dt><dd>{c.shift ?? 'A window typed by hand'} · {windowWords(c)} · {niceDay(todayISO(new Date(c.from)), { weekday: 'short' })}</dd></div>
            <div><dt>Planned</dt><dd>{c.plannedMin !== undefined ? plannedOf(c).words : 'not yet'}</dd></div>
            <div><dt>Made</dt><dd>{c.made !== undefined ? `${packs(c.made)} packs` : 'not yet counted'}</dd></div>
            <div><dt>Rejects</dt><dd>{c.rejects !== undefined ? `${packs(c.rejects)} packs` : 'none counted'}</dd></div>
            <div><dt>Rate</dt><dd>{c.ratePerMin !== undefined ? `${rateWords(c.ratePerMin)} — ${rateKnown(c, s.product).replace(/^the rate is /, '')}` : 'not yet'}</dd></div>
          </dl>
        ) : <p className="sub">Not counted yet.</p>}
      </div>
    );
  }
  return (
    <form className="lf-count" aria-label="The count" onSubmit={e => { e.preventDefault(); save(); }}>
      <small className="ie-h">End of shift — the count</small>
      {shifts.length > 0 ? (
        <div className="field"><span className="field-label">Which shift</span>
          <span className="chip-row" role="radiogroup" aria-label="Which shift">
            {shifts.map(x => <button key={x.name} type="button" role="radio" aria-checked={shift === x.name} className={'chip' + (shift === x.name ? ' on' : '')} onClick={() => setShift(x.name)}>{x.name}</button>)}
            <button type="button" role="radio" aria-checked={shift === ''} className={'chip' + (shift === '' ? ' on' : '')} onClick={() => setShift('')}>Type the window</button>
          </span>
        </div>
      ) : <p className="sub">{line ? `${line.name} has no shifts set — type the window, or set its shifts and their breaks in the line’s settings.` : 'Put the count on a line to pick its shift; or type the window.'}</p>}
      <div className="lf-count-grid">
        <label className="field lf-day"><span className="field-label">The day</span>
          <input className="text-input" type="date" value={day} aria-label="The day" onChange={e => setDay(e.target.value)} /></label>
        {!picked && <>
          <label className="field"><span className="field-label">From</span>
            <input className="text-input" type="time" value={from} aria-label="From" onChange={e => setFrom(e.target.value)} /></label>
          <label className="field"><span className="field-label">To</span>
            <input className="text-input" type="time" value={to} aria-label="To" onChange={e => setTo(e.target.value)} /></label>
          <label className="field"><span className="field-label">Breaks, min</span>
            <input className="text-input" inputMode="numeric" value={breaks} aria-label="Breaks" placeholder="e.g. 30" onChange={e => setBreaks(e.target.value)} />
            <span className="sub">the breaks the line stops for</span></label>
        </>}
        <div className="field lf-planned"><span className="field-label">Planned minutes</span>
          {override === null ? (
            <p className="lf-worked" aria-label="Planned minutes, worked out">
              <b>{worked ? worked.workedOut : '—'}</b> planned <span className="sub">· {worked ? worked.words.replace(/ = \d+ planned$/, '') : 'the shift less its breaks'}{picked && picked.breakMin === undefined && !picked.relief ? ' — set the breaks in the line’s settings' : ''}</span>
              {' '}<button type="button" className="linkish" onClick={() => setOverride(worked ? String(worked.workedOut) : '')}>Change for the day</button>
            </p>
          ) : <>
            <input className="text-input" inputMode="numeric" value={override} aria-label="Planned minutes" onChange={e => setOverride(e.target.value)} />
            <span className="sub">{worked ? worked.words.replace(/ planned$/, '') : ''} · <button type="button" className="linkish" onClick={() => { setOverride(null); setWhy(''); }}>Back to the shift less its breaks</button></span>
            {changed && <input className="text-input lf-why" value={why} aria-label="Why the planned minutes differ" maxLength={160} placeholder="Why — e.g. stood an hour, no orders" onChange={e => setWhy(e.target.value)} />}
          </>}
        </div>
        <label className="field"><span className="field-label">Good packs made</span>
          <input className="text-input" inputMode="numeric" value={made} aria-label="Packs made" placeholder="e.g. 36500" onChange={e => setMade(e.target.value)} /></label>
        <label className="field"><span className="field-label">Rejects</span>
          <input className="text-input" inputMode="numeric" value={rejects} aria-label="Rejects" placeholder="packs" onChange={e => setRejects(e.target.value)} /></label>
        <label className="field lf-rate"><span className="field-label">Rate a minute</span>
          <input className="text-input" inputMode="decimal" value={rate} aria-label="Rate a minute" placeholder="e.g. 100" onChange={e => setRate(e.target.value)} />
          <span className="sub lf-rate-why">{n.rate === undefined ? plate.why
            : from_ && from_.rateFrom !== 'typed' ? paceWords(from_)
              : plate.ratePerMin !== undefined
                ? <>typed · <button type="button" className="linkish" onClick={() => setRate(String(plate.ratePerMin))}>use {plate.rateFrom === 'standard' ? 'the line standard’s target' : plate.rateFrom === 'standard-time' && plate.rateTimed ? paceWords(plate) : `the ${paceWords(plate)}`}, {plate.ratePerMin}</button></>
                : plate.why}</span></label>
      </div>
      {problem && <p className="ie-problem">{problem}</p>}
      <div className="ie-agree-act">
        <button type="submit" className="btn btn-primary" disabled={!!problem}>Save the count</button>
        {saved && <span className="sub">{saved}</span>}
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ the running speed */
/** THE RUNNING SPEED, TIMED WHILE IT RUNS (docs/CAPACITY.md §5): the packs
 *  off the line in a timed spell — a list, each with when and who, pooled.
 *  It is what tells slow running from short stops (Nakajima's net operating
 *  time, lib/ie/losses): the packs run at it take packs ÷ running speed —
 *  the run time less that is short stops, that less packs ÷ ideal is slow
 *  running. Each timing is
 *  kept the moment it is added (its own list, so two phones both keep
 *  theirs); a wrong one is struck, never erased. */
function RunningSpeed({ s, f, editable, me }: { s: ToolStudy; f: LossFigures; editable: boolean; me?: string }) {
  const list = (s.facts.timings ?? []).slice().sort((a, b) => a.at - b.at);
  const r = runningOf(list);
  const [packsT, setPacks] = useState('');
  const [sec, setSec] = useState('60');
  const p = numOr(packsT), sc = numOr(sec);
  const ok = p !== undefined && Number.isFinite(p) && p >= 0 && sc !== undefined && Number.isFinite(sc) && sc > 0;
  const machine = s.facts.losses?.rateMachine ?? s.facts.losses?.ratePerson;
  if (!editable && !list.length) return null;
  const add = () => {
    if (!ok) return;
    const t: RunTiming = { id: uid(), at: now(), ...(me ? { by: me } : {}), packs: p as number, sec: sc as number };
    void patchStudy(s.id, cur => ({ facts: { ...cur.facts, timings: [...(cur.facts.timings ?? []), t] } }));
    setPacks('');
  };
  const strike = (id: string, struck: boolean) => void patchStudy(s.id, cur => ({ facts: { ...cur.facts, timings: (cur.facts.timings ?? []).map(x => (x.id === id ? { ...x, struck } : x)) } }));
  return (
    <section className="lf-run" aria-label="The running speed">
      <small className="ie-h">The running speed — timed while it runs</small>
      <p className="sub lf-run-say">{r
        ? <><b>{rateWords(r.perMin)}</b> over {r.n} timing{r.n === 1 ? '' : 's'} ({Number(r.min.toFixed(1))} min){f.rate !== undefined ? ` · the ${f.ideal} is ${rateWords(f.rate)}` : ''}{f.slowMin !== undefined ? ` — ${minWords(f.slowMin)} slow running, ${minWords(f.shortMin ?? 0)} short stops` : ''}</>
        : `Count the packs off the ${machine ?? 'line'} for a timed minute while it runs — what tells slow running from short stops.`}</p>
      {list.length > 0 && (
        <ol className="lf-runs">
          {list.map(x => (
            <li key={x.id} className={x.struck ? 'is-struck' : ''}>
              <span className="lf-stop-t">{clock(x.at)}</span>
              <b>{packs(x.packs)}</b> in {x.sec} s <span className="sub">= {rateWords((x.packs * 60) / x.sec)}{x.by ? ` · ${x.by}` : ''}{x.struck ? ' · struck' : ''}</span>
              {editable && <button type="button" className="linkish lf-strike" onClick={() => strike(x.id, !x.struck)}>{x.struck ? 'Unstrike' : 'Strike'}</button>}
            </li>
          ))}
        </ol>
      )}
      {editable && (
        <form className="lf-run-add" onSubmit={e => { e.preventDefault(); add(); }}>
          <label className="field"><span className="field-label">Packs</span>
            <input className="text-input" inputMode="numeric" value={packsT} aria-label="Packs counted" placeholder="e.g. 98" onChange={e => setPacks(e.target.value)} /></label>
          <label className="field"><span className="field-label">In seconds</span>
            <input className="text-input" inputMode="numeric" value={sec} aria-label="Seconds timed" onChange={e => setSec(e.target.value)} /></label>
          <button type="submit" className="btn" disabled={!ok}>Add the timing</button>
        </form>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ the act row: close, reopen */
function Act({ s, f, said, can, me, write }: {
  s: ToolStudy; f: LossFigures; said: LossSays; can: Can; me?: string;
  write: (p: Parameters<typeof patchStudy>[1]) => void;
}) {
  const [reopen, setReopen] = useState<string | null>(null);
  const by = me ? { by: me } : {};
  if (s.closedAt && s.receipt) {
    return (
      <div className="ie-act is-closed">
        <p className="ie-receipt"><b>Closed {niceDay(todayISO(new Date(s.receipt.at)))}{s.receipt.by ? ` by ${s.receipt.by}` : ''}</b> — a receipt: these figures stand as they were. {s.receipt.text}</p>
        {can.agree && (reopen === null
          ? <button type="button" className="btn" onClick={() => setReopen('')}>Reopen</button>
          : (
            <form className="ie-why" onSubmit={e => { e.preventDefault(); if (!reopen.trim()) return;
              write(cur => ({ closedAt: undefined, receipt: cur.receipt && { ...cur.receipt, reopened: [...(cur.receipt.reopened ?? []), { at: now(), ...by, why: reopen.trim() }] } }));
              setReopen(null); }}>
              <input className="text-input" autoFocus value={reopen} placeholder="Why it is reopened — kept with it" onChange={e => setReopen(e.target.value)} />
              <button type="submit" className="btn btn-primary" disabled={!reopen.trim()}>Reopen it</button>
            </form>
          ))}
      </div>
    );
  }
  const close = () => write(cur => ({
    closedAt: now(),
    receipt: { at: now(), ...by, text: said.text, tone: said.tone,
      figures: { plannedMin: f.plannedMin ?? null, rate: f.rate ?? null, made: f.made ?? null, rejects: f.rejects, lostMin: f.lostMin !== undefined ? Math.round(f.lostMin) : null,
        explainedMin: Math.round(f.explainedMin), performanceMin: f.performanceMin !== undefined ? Math.round(f.performanceMin) : null,
        slowMin: f.slowMin !== undefined ? Math.round(f.slowMin) : null, shortMin: f.shortMin !== undefined ? Math.round(f.shortMin) : null,
        labour: f.labour !== undefined ? Math.round(f.labour) : null, contribution: f.contribution !== undefined ? Math.round(f.contribution) : null },
      ...(cur.receipt?.reopened ? { reopened: cur.receipt.reopened } : {}) },
  }));
  const reopened = s.receipt?.reopened ?? [];
  const last = reopened[reopened.length - 1];
  return (
    <div className="ie-act">
      {last && <p className="sub">Reopened {niceDay(todayISO(new Date(last.at)))}{last.by ? ` by ${last.by}` : ''} — {last.why}</p>}
      {can.edit && f.enough && f.split && <button type="button" className="btn btn-primary" onClick={close}>Close — keep these figures</button>}
    </div>
  );
}
