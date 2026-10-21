/* ONE RELIABILITY STUDY — a machine's MTBF and failure rate, from a person
 * stood at it (docs/TOOLKIT.md, tool 13; lib/ie/reliability).
 *
 * Rowland, 21 October: "a person stood at a machine, tapping a button every
 * time an event happened ... I press the button every time I see an event,
 * also I start a clock watch I can stop and start".
 *
 * Two big controls, as a person at a machine uses them: the WATCH — Start
 * when watching it run, Stop while it is down, at a break or when leaving —
 * and the EVENT button, a tap each time one is seen (one a kind when the team
 * tells them apart). The last tap can be undone at once; every tap and every
 * stretch can be struck later and is kept. Coming back another day carries on
 * the same study: the watched time and the events add up, and the figures
 * firm up as they do.
 *
 * The lean page around it (docs/LEAN-PAGE.md): the band, the tiles (MTBF and
 * its 90% bounds, the failure rate, watched time, events, what it costs),
 * the graphs — events against watched hours, the gaps between them, the MTBF
 * day by day — what it means, the days, the commentary, the action plan and
 * the closing line. Nothing worked out is stored; the module makes every
 * figure, the same one its paper (lib/studiesPdf) reads. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getStudy, onDataChange, patchStudy } from '../db';
import { useAccess } from '../cloud/access';
import { useSession } from '../cloud/session';
import { displayName } from '../cloud/team';
import { can as canAt } from '../lib/access';
import { now, uid } from '../lib/ids';
import { niceDay, isoDay } from '../lib/weeks';
import { nav } from '../state/useRoute';
import type { AgreedReliability, RelEvent, Remark, ToolStudy, WatchRun } from '../lib/study';
import {
  costWords, LEFT_ON_H, perHour, plural, relCost, reliability, reliabilityInsights, reliabilitySays, runningRun, span, watchedSpans, type RelFigures,
} from '../lib/ie/reliability';
import { relClosing, relTiles, relTrend } from '../lib/ie/reliabilityLean';
import { WhereItSits, UsedFor, useBetter } from '../ui/StudyPlace';
import { LeanActions, LeanBand, LeanClosing, LeanInsights, LeanPanel, LeanTiles, LeanTrend } from '../ui/Lean';
import { bandPage } from '../lib/lean';
import { raisedFrom } from '../lib/ie/lossLean';
import { useFactoryLines } from '../lib/useFactoryLines';
import { StudyName } from '../ui/StudyActs';

const OWNER = canAt('owner');
const hms = (ms: number) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const hm = (ms: number) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`;
};
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
/** The words a set-up offers for what counts as an event. */
const OFFERED = ['stop', 'failure', 'jam', 'pick', 'reject', 'alarm'];

export function ReliabilityScreen({ id }: { id: string }) {
  const [s, setS] = useState<ToolStudy | null | undefined>(undefined);
  const load = useCallback(async () => setS((await getStudy(id)) ?? null), [id]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  const jobCan = useAccess(s?.projectId ?? '');
  const can = s?.projectId ? jobCan : OWNER;
  const { session } = useSession();
  const me = displayName(session?.user.email) || undefined;

  if (s === undefined) return <div className="wrap ie"><p className="sub">Opening…</p></div>;
  if (s === null) return (
    <div className="wrap ie">
      <h1>This study isn’t on this device</h1>
      <p className="sub">It may have been deleted, or not synced here yet.</p>
      <button type="button" className="btn" onClick={() => nav('/reliability')}>Every reliability study</button>
    </div>
  );
  return <Reliability s={s} can={can} me={me} />;
}

function Reliability({ s, can, me }: { s: ToolStudy; can: ReturnType<typeof canAt>; me?: string }) {
  const a = s.agreed?.reliability;
  const runs = useMemo(() => s.facts.watch ?? [], [s.facts.watch]);
  const events = useMemo(() => s.facts.events ?? [], [s.facts.events]);
  const closed = !!s.closedAt;
  const [setting, setSetting] = useState(false);
  const run = runningRun(runs);
  /* the clock — every second while the watch runs, else every half minute */
  const [tick, setT] = useState(() => Date.now());
  useEffect(() => { const i = window.setInterval(() => setT(Date.now()), run ? 1000 : 30_000); return () => window.clearInterval(i); }, [run]);
  /* never behind the newest tap or press: a stop tapped this instant counts this instant */
  const t = Math.max(tick, ...events.map(e => e.at), ...runs.map(r => r.to ?? r.from));
  useWakeLock(!!run && !closed);
  const f = useMemo(() => reliability(a, runs, events, t), [a, runs, events, t]);
  const said = reliabilitySays(a, f);
  const line = useFactoryLines(s.workspaceId).find(x => x.id === s.workspaceId);
  const cost = relCost(f, a, line);
  const { steps, tests } = useBetter(s, me);
  const trend = a ? relTrend(a, f) : undefined;

  return (
    <div className="wrap ie rl">
      <LeanBand page={bandPage('Reliability study', s, said.verdict, said.tone)} title={<StudyName s={s} canEdit={can.edit && !closed} canRemove={can.remove} />} />
      <div className="ln-under">
        <p className="sub ie-where">
          {s.machine ? <><b>{s.machine}</b> · </> : null}
          started {niceDay(isoDay(s.startedAt))}
        </p>
        <WhereItSits s={s} can={can} />
      </div>

      {!a || setting ? (
        <SetUp s={s} canAgree={can.agree && !closed} hasEvents={events.length > 0} onDone={() => setSetting(false)} cancel={a ? () => setSetting(false) : undefined} />
      ) : (
        <>
          {!closed && can.edit && <Watch s={s} a={a} runs={runs} events={events} t={t} me={me} />}
          <LeanTiles tiles={relTiles(a, f, cost)} className="ie-strip" />
          <div className="ie-says"><p className={'ie-say is-' + said.tone}>{said.text}</p></div>
          <LeanInsights insights={reliabilityInsights(a, f)} />
          {/* the graphs side by side on a desk, one under the other on a phone */}
          <div className="rl-graphs">
          {f.n > 0 && (
            <LeanPanel title={`${cap(plural(a.event))} against watched hours`} className="ln-solo">
              <Cumulative f={f} event={a.event} />
            </LeanPanel>
          )}
          {(f.gaps?.n ?? 0) >= 3 && (
            <LeanPanel title={`Running time between one ${a.event} and the next`} className="ln-solo">
              <Gaps f={f} />
            </LeanPanel>
          )}
          {trend && <LeanPanel title={trend.title} className="ln-solo"><LeanTrend trend={trend} /></LeanPanel>}
          </div>
          {f.kinds.length > 0 && <Kinds f={f} event={a.event} />}
          {cost.downMinPerH !== undefined && <p className="sub rl-cost">What it costs: {costWords(cost)}.</p>}
          {f.days.length > 0 && <Days f={f} />}
          <EveryEvent a={a} events={events} canStrike={can.edit && !closed} sid={s.id} />
          <EveryStretch runs={runs} canStrike={can.edit && !closed} sid={s.id} t={t} />
          <p className="ie-agreed sub">
            Agreed: <b>{agreedWords(a)}</b>
            {can.agree && !closed && <button type="button" className="linkish" onClick={() => setSetting(true)}>Change what was agreed</button>}
          </p>
          <Commentary s={s} canEdit={can.edit} me={me} />
          <UsedFor s={s} can={can} me={me} />
          <Act s={s} f={f} text={said.text} tone={said.tone} can={can} me={me} />
          <LeanPanel title="Action plan" className="ln-solo ln-plan-p">
            <LeanActions actions={raisedFrom(s, steps, tests)} empty="Nothing raised from it yet — Make it better raises a fix or a countermeasure from its figures." />
          </LeanPanel>
          <LeanClosing closing={relClosing(a, f, cost, said)} />
        </>
      )}
    </div>
  );
}

/** The screen kept awake while the watch runs — a person stood at a machine
 *  is not touching the phone between events. */
function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on) return;
    let lock: { release: () => Promise<void> } | undefined;
    const wl = (navigator as Navigator & { wakeLock?: { request: (k: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock;
    wl?.request('screen').then(l => { lock = l; }).catch(() => undefined);
    return () => { void lock?.release().catch(() => undefined); };
  }, [on]);
}

export function agreedWords(a: AgreedReliability): string {
  return [`an event is a ${a.event}`, a.kinds?.length ? `told apart as ${a.kinds.join(', ')}` : '',
    a.targetMin ? `MTBF wanted ${span(a.targetMin / 60)}` : 'no MTBF agreed', a.downMin ? `${a.downMin} min stood a ${a.event}` : ''].filter(Boolean).join(' · ');
}

/* ------------------------------------------------------------------ set up */
function SetUp({ s, canAgree, hasEvents, onDone, cancel }: { s: ToolStudy; canAgree: boolean; hasEvents: boolean; onDone: () => void; cancel?: () => void }) {
  const a = s.agreed?.reliability;
  const [event, setEvent] = useState(a?.event ?? 'stop');
  const [kinds, setKinds] = useState((a?.kinds ?? []).join(', '));
  const [target, setTarget] = useState(a?.targetMin ? String(a.targetMin) : '');
  const [down, setDown] = useState(a?.downMin ? String(a.downMin) : '');
  const tg = target.trim() ? Number(target) : undefined, dn = down.trim() ? Number(down) : undefined;
  const problem = !event.trim() ? 'What counts as an event — a stop, a failure, a pick.'
    : tg !== undefined && !(tg > 0 && tg <= 100_000) ? 'The MTBF wanted, in minutes — or leave it empty.'
    : dn !== undefined && !(dn > 0 && dn <= 1440) ? 'The minutes the line stands for each — or leave it empty.' : '';
  const save = () => {
    if (problem || !canAgree) return;
    const ks = [...new Set(kinds.split(',').map(x => x.trim()).filter(Boolean))];
    const agreed: AgreedReliability = { event: event.trim().toLowerCase(), ...(ks.length ? { kinds: ks } : {}), ...(tg !== undefined ? { targetMin: tg } : {}), ...(dn !== undefined ? { downMin: dn } : {}) };
    void patchStudy(s.id, cur => ({ agreed: { ...cur.agreed, reliability: agreed } }));
    onDone();
  };
  if (!canAgree) return (
    <div className="ie-agree is-wait"><p><b>It isn’t set up yet.</b> The project’s owner says what counts as an event before the watch starts.</p></div>
  );
  return (
    <form className="ie-agree" onSubmit={e => { e.preventDefault(); save(); }}>
      <h2>What counts, and what it should be</h2>
      <p className="sub">Agreed before the watch starts. You then stand at the machine: Start the watch while it runs, Stop it while it is down or nobody watches, and tap each event as you see it. MTBF is the watched running time over the events.</p>
      {hasEvents && <p className="ie-note">Events are already in: they keep their times, and are read against what is agreed now.</p>}
      <label className="field"><span className="field-label">What counts as an event?</span>
        <input className="text-input" value={event} maxLength={30} onChange={e => setEvent(e.target.value)} aria-label="What counts as an event" list="rl-offered" />
        <datalist id="rl-offered">{OFFERED.map(x => <option key={x} value={x} />)}</datalist>
        <span className="chip-row" role="group" aria-label="Offered">
          {OFFERED.map(x => <button key={x} type="button" className={'chip' + (event.trim().toLowerCase() === x ? ' on' : '')} aria-pressed={event.trim().toLowerCase() === x} onClick={() => setEvent(x)}>{x}</button>)}
        </span>
        <span className="sub">One, in the floor’s words — whatever the machine’s function is: a stop, a failure, a pick.</span>
      </label>
      <label className="field"><span className="field-label">What can one be? <i className="sub">optional</i></span>
        <input className="text-input" value={kinds} onChange={e => setKinds(e.target.value)} placeholder="e.g. jam, misfeed, sensor" aria-label="Kinds, separated by commas" />
        <span className="sub">If you tell them apart: a button each at the machine, and each one’s count and MTBF.</span>
      </label>
      <div className="ie-agree-grid">
        <label className="field"><span className="field-label">MTBF wanted, minutes <i className="sub">optional</i></span><input className="text-input" inputMode="decimal" value={target} onChange={e => setTarget(e.target.value)} aria-label="MTBF wanted, minutes" /></label>
        <label className="field"><span className="field-label">Minutes the line stands for each <i className="sub">optional</i></span><input className="text-input" inputMode="decimal" value={down} onChange={e => setDown(e.target.value)} aria-label="Minutes the line stands for each" /></label>
      </div>
      {problem && <p className="ie-problem">{problem}</p>}
      <div className="ie-agree-act">
        <button type="submit" className="btn btn-primary" disabled={!!problem}>{a ? 'Keep it' : 'Set it up'}</button>
        {cancel && <button type="button" className="btn" onClick={cancel}>Keep what was agreed</button>}
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ the watch and the event button */
function Watch({ s, a, runs, events, t, me }: { s: ToolStudy; a: AgreedReliability; runs: WatchRun[]; events: RelEvent[]; t: number; me?: string }) {
  const run = runningRun(runs);
  const spans = watchedSpans(runs, t);
  const watched = spans.reduce((n, [x, y]) => n + (y - x), 0);
  const by = me ? { by: me } : {};
  const [noting, setNoting] = useState('');
  const start = () => void patchStudy(s.id, cur => ({ facts: { ...cur.facts, watch: [...(cur.facts.watch ?? []), { id: uid(), from: now(), ...by }] } }));
  const stop = (when?: number) => {
    const at = when ?? now();
    void patchStudy(s.id, cur => {
      const open = runningRun(cur.facts.watch ?? []);
      return { facts: { ...cur.facts, watch: (cur.facts.watch ?? []).map(r => (open && r.id === open.id ? { ...r, to: at } : r)) } };
    });
  };
  const tap = (kind?: string) => {
    if (!run) return;
    const e: RelEvent = { id: uid(), at: now(), ...by, ...(kind ? { kind } : {}) };
    try { navigator.vibrate?.(60); } catch { /* not every phone can */ }
    setNoting('');
    void patchStudy(s.id, cur => ({ facts: { ...cur.facts, events: [...(cur.facts.events ?? []), e] } }));
  };
  const edit = (id: string, p: Partial<RelEvent>) => void patchStudy(s.id, cur => ({ facts: { ...cur.facts, events: (cur.facts.events ?? []).map(x => (x.id === id ? { ...x, ...p } : x)) } }));
  const last = [...events].sort((x, y) => y.at - x.at)[0];
  const counted = events.filter(e => !e.struck && spans.some(([x, y]) => e.at >= x && e.at <= y)).length;
  const fresh = last && !last.struck && t - last.at < 10 * 60_000 ? last : undefined;
  /* LEFT ON? A stretch longer than a long shift is asked about, and stopped at
     the last tap in it (or where it started) in one press */
  const leftOn = run && t - run.from > LEFT_ON_H * 3_600_000;
  const lastIn = run ? events.filter(e => !e.struck && e.at >= run.from).sort((x, y) => y.at - x.at)[0] : undefined;

  return (
    <div className={'rl-watch' + (run ? ' is-on' : '')} role="group" aria-label="The watch and the event button">
      <div className="rl-clock">
        <span className="rl-k">{run ? 'Watching' : 'The watch is stopped'}</span>
        <b className="rl-time" aria-live="off">{clock(watched)}</b>
        <span className="sub">{run ? `this stretch ${clock(t - run.from)} · since ${hm(run.from)}` : runs.length ? 'Start it when you are watching the machine run' : 'Start it when you begin watching the machine run'}</span>
        <button type="button" className={'btn rl-go' + (run ? '' : ' btn-primary')} onClick={run ? () => stop() : start}>{run ? 'Stop the watch' : runs.length ? 'Start the watch again' : 'Start the watch'}</button>
        {leftOn && run && (
          <p className="rl-lefton" role="status">
            <b>Running {clock(t - run.from)} without a stop — left on?</b>{' '}
            <button type="button" className="linkish" onClick={() => stop(lastIn?.at ?? run.from)}>{lastIn ? `Stop it at the last ${a.event}, ${niceDay(isoDay(lastIn.at))} ${hm(lastIn.at)}` : `Stop it where it started, ${hm(run.from)}`}</button>
          </p>
        )}
      </div>
      <div className="rl-tap">
        <button type="button" className="rl-event" disabled={!run} onClick={() => tap()} aria-label={`Tap a ${a.event}`}>
          <b>{cap(a.event)}</b>
          <span>{run ? `tap each one you see · ${counted} so far` : 'start the watch first — an event counts in watched time'}</span>
        </button>
        {(a.kinds ?? []).length > 0 && (
          <span className="rl-kinds" role="group" aria-label={`Tap a ${a.event} of a kind`}>
            {(a.kinds ?? []).map(k => <button key={k} type="button" className="btn rl-kind" disabled={!run} onClick={() => tap(k)}>{k}</button>)}
          </span>
        )}
        {fresh && (
          <div className="rl-last" aria-live="polite">
            <span><b>{cap(a.event)} {counted} at {hms(fresh.at)}</b>{fresh.kind ? ` — ${fresh.kind}` : ''}{fresh.note ? ` · ${fresh.note}` : ''}</span>
            <button type="button" className="linkish" onClick={() => edit(fresh.id, { struck: true })} aria-label={`Undo the ${a.event} at ${hms(fresh.at)}`}>Undo</button>
            {!fresh.kind && (a.kinds ?? []).length > 0 && (
              <span className="chip-row" role="group" aria-label="What was it?">
                {(a.kinds ?? []).map(k => <button key={k} type="button" className="chip" onClick={() => edit(fresh.id, { kind: k })}>{k}</button>)}
              </span>
            )}
            <form className="rl-note" onSubmit={e => { e.preventDefault(); if (noting.trim()) { edit(fresh.id, { note: noting.trim() }); setNoting(''); } }}>
              <input className="text-input" value={noting} maxLength={120} placeholder="What was seen — optional" aria-label={`A note on the ${a.event}`} onChange={e => setNoting(e.target.value)} />
              <button type="submit" className="btn" disabled={!noting.trim()}>Add</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ the graphs */
const niceStep = (max: number, parts = 4): number => {
  const raw = max / parts, p = 10 ** Math.floor(Math.log10(Math.max(raw, 1e-9))), m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
};

/** Events against watched hours — a straight line is a steady rate; bending
 *  up, they come faster; flattening, slower. The dashed line is the rate overall. */
function Cumulative({ f, event }: { f: RelFigures; event: string }) {
  const W = 360, H = 190, L = 34, B = 28, T = 10, R = 10;
  const xMax = Math.max(f.hours, 1e-6), yMax = Math.max(f.n, 1);
  const x = (h: number) => L + (h / xMax) * (W - L - R), y = (n: number) => T + (1 - n / yMax) * (H - T - B);
  let d = `M${x(0)},${y(0)}`;
  for (const p of f.points) d += ` H${x(p.h)} V${y(p.n)}`;
  d += ` H${x(f.hours)}`;
  const xs = niceStep(xMax), ys = Math.max(1, Math.round(niceStep(yMax)));
  return (
    <figure className="rl-fig">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${f.n} ${plural(event, f.n)} over ${span(f.hours)} of watched running`}>
        {Array.from({ length: Math.floor(yMax / ys) + 1 }, (_, i) => i * ys).map(v => (
          <g key={`y${v}`}><line className="ln-grid-l" x1={L} x2={W - R} y1={y(v)} y2={y(v)} /><text className="ln-ax" x={L - 5} y={y(v) + 3}>{v}</text></g>
        ))}
        {Array.from({ length: Math.floor(xMax / xs) + 1 }, (_, i) => i * xs).map(v => (
          <text key={`x${v}`} className="ln-ax rl-axx" x={x(v)} y={H - B + 13}>{+v.toFixed(2)}</text>
        ))}
        <line className="rl-steady" x1={x(0)} y1={y(0)} x2={x(f.hours)} y2={y(f.n)} />
        <path className="rl-step" d={d} />
        {f.points.map(p => <circle key={p.n} className="rl-dot" cx={x(p.h)} cy={y(p.n)} r={2.4}><title>{`${p.n} at ${span(p.h)} watched`}</title></circle>)}
        <text className="ln-ax rl-axx" x={(L + W - R) / 2} y={H - 4}>hours watched</text>
      </svg>
      <figcaption className="ln-legend"><span className="ln-key rl-key-step" aria-hidden /> {plural(event)} as they came · <span className="ln-key rl-key-steady" aria-hidden /> the rate overall, {perHour(f.rate ?? 0)}</figcaption>
    </figure>
  );
}

/** The gaps, grouped — how long it runs between one and the next. */
function Gaps({ f }: { f: RelFigures }) {
  const g = f.gaps;
  const gaps = useMemo(() => f.points.slice(1).map((p, i) => (p.h - f.points[i].h) * 60), [f.points]);
  if (!g) return null;
  const maxMin = Math.max(...gaps, 1);
  const step = niceStep(maxMin, 6);
  const bins = Array.from({ length: Math.ceil(maxMin / step) || 1 }, (_, i) => ({ from: i * step, to: (i + 1) * step, n: 0 }));
  for (const v of gaps) bins[Math.min(bins.length - 1, Math.floor(v / step))].n++;
  const top = Math.max(...bins.map(b => b.n), 1);
  const W = 360, H = 170, L = 28, B = 28, T = 10, R = 6;
  const bw = (W - L - R) / bins.length;
  const y = (n: number) => T + (1 - n / top) * (H - T - B);
  const med = g.medianH * 60;
  const xm = L + (med / (bins.length * step)) * (W - L - R);
  return (
    <figure className="rl-fig">
      <svg className="rl-gaps" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Gaps between events: typically ${span(g.medianH)}, from ${span(g.minH)} to ${span(g.maxH)}`}>
        {bins.map((b, i) => (
          <g key={b.from}>
            <rect className="ln-bar" x={L + i * bw + 1.5} y={y(b.n)} width={Math.max(1, bw - 3)} height={Math.max(0, y(0) - y(b.n))}><title>{`${+b.from.toFixed(1)}–${+b.to.toFixed(1)} min: ${b.n}`}</title></rect>
            {b.n > 0 && <text className="ln-bv" x={L + i * bw + bw / 2} y={y(b.n) - 3}>{b.n}</text>}
            <text className="ln-ax rl-axx" x={L + i * bw} y={H - B + 13}>{+b.from.toFixed(1)}</text>
          </g>
        ))}
        <line className="rl-med" x1={xm} x2={xm} y1={T} y2={H - B} />
        <text className="ln-ax rl-axx" x={(L + W - R) / 2} y={H - 4}>minutes of running between one and the next</text>
      </svg>
      <figcaption className="ln-legend"><span className="ln-key rl-key-med" aria-hidden /> typical (the median), {span(g.medianH)} · from {span(g.minH)} to {span(g.maxH)}</figcaption>
    </figure>
  );
}

function Kinds({ f, event }: { f: RelFigures; event: string }) {
  return (
    <LeanPanel title={`What the ${plural(event)} were`} className="ln-solo">
      <ul className="ws-bars rl-kindbars">
        {f.kinds.map(k => (
          <li key={k.kind} className="ws-bar">
            <span className="ws-bar-w">{k.kind}</span>
            <span className="ws-bar-t" aria-hidden="true"><i className="ws-bar-f" style={{ width: `${k.share * 100}%` }} /></span>
            <span className="ws-bar-n"><b>{k.n}</b> · {Math.round(k.share * 100)}% · one every {span(k.mtbfH)}</span>
          </li>
        ))}
      </ul>
    </LeanPanel>
  );
}

function Days({ f }: { f: RelFigures }) {
  return (
    <LeanPanel title="Day by day" className="ln-solo">
      <table className="rl-days">
        <thead><tr><th>Day</th><th>Watched</th><th>Events</th><th>MTBF</th></tr></thead>
        <tbody>
          {f.days.map(d => (
            <tr key={d.day}><td>{niceDay(d.day, { weekday: 'short' })}</td><td>{span(d.hours)}</td><td>{d.n}</td><td>{d.mtbfH !== undefined ? span(d.mtbfH) : `none in ${span(d.hours)}`}</td></tr>
          ))}
          <tr className="is-all"><td>All</td><td>{span(f.hours)}</td><td>{f.n}</td><td>{f.mtbfH !== undefined ? span(f.mtbfH) : '—'}</td></tr>
        </tbody>
      </table>
    </LeanPanel>
  );
}

/* ------------------------------------------------------------------ every event, every stretch */
function EveryEvent({ a, events, canStrike, sid }: { a: AgreedReliability; events: RelEvent[]; canStrike: boolean; sid: string }) {
  const [open, setOpen] = useState(false);
  if (!events.length) return null;
  const struck = events.filter(x => x.struck).length;
  const sorted = [...events].sort((x, y) => x.at - y.at);
  const set = (id: string, struckNow: boolean) => void patchStudy(sid, cur => ({ facts: { ...cur.facts, events: (cur.facts.events ?? []).map(x => (x.id === id ? { ...x, struck: struckNow || undefined } : x)) } }));
  return (
    <div className="ie-all">
      <button type="button" className="linkish" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        {open ? 'Hide' : 'Every'} {a.event} — {events.length}{struck ? `, ${struck} struck` : ''}
      </button>
      {open && (
        <ol className="ie-rows">
          {sorted.map(x => (
            <li key={x.id} className={x.struck ? 'is-struck' : ''}>
              <span className="ie-no">{niceDay(isoDay(x.at))} {hms(x.at)}</span>
              <b>{x.kind ?? cap(a.event)}</b>
              <span className="sub">{[x.note, x.by ? `by ${x.by}` : ''].filter(Boolean).join(' · ')}</span>
              {canStrike && <button type="button" className="linkish" onClick={() => set(x.id, !x.struck)}>{x.struck ? 'Restore' : 'Strike'}</button>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function EveryStretch({ runs, canStrike, sid, t }: { runs: WatchRun[]; canStrike: boolean; sid: string; t: number }) {
  const [open, setOpen] = useState(false);
  if (!runs.length) return null;
  const sorted = [...runs].sort((x, y) => x.from - y.from);
  const set = (id: string, struckNow: boolean) => void patchStudy(sid, cur => ({ facts: { ...cur.facts, watch: (cur.facts.watch ?? []).map(x => (x.id === id ? { ...x, struck: struckNow || undefined } : x)) } }));
  return (
    <div className="ie-all">
      <button type="button" className="linkish" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        {open ? 'Hide' : 'Every'} stretch of the watch — {runs.length}
      </button>
      {open && (
        <ol className="ie-rows">
          {sorted.map(x => (
            <li key={x.id} className={x.struck ? 'is-struck' : ''}>
              <span className="ie-no">{niceDay(isoDay(x.from))} {hm(x.from)}–{x.to ? hm(x.to) : 'now'}</span>
              <b>{clock((x.to ?? t) - x.from)}</b>
              <span className="sub">{x.by ? `by ${x.by}` : ''}</span>
              {canStrike && x.to !== undefined && <button type="button" className="linkish" onClick={() => set(x.id, !x.struck)}>{x.struck ? 'Restore' : 'Strike'}</button>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ commentary */
/** COMMENTARY — what the person at the machine saw and thinks, kept with when
 *  and who; edited where it sits, taken off with Undo, and on the paper. */
export function Commentary({ s, canEdit, me }: { s: ToolStudy; canEdit: boolean; me?: string }) {
  const remarks = useMemo(() => [...(s.facts.remarks ?? [])].sort((x, y) => x.at - y.at), [s.facts.remarks]);
  const [text, setText] = useState('');
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [showOff, setShowOff] = useState(false);
  const put = (fn: (rs: Remark[]) => Remark[]) => void patchStudy(s.id, cur => ({ facts: { ...cur.facts, remarks: fn(cur.facts.remarks ?? []) } }));
  const add = () => { const v = text.trim(); if (!v) return; put(rs => [...rs, { id: uid(), at: now(), text: v, ...(me ? { by: me } : {}) }]); setText(''); };
  const live = remarks.filter(r => !r.struck), off = remarks.filter(r => r.struck);
  return (
    <LeanPanel title="Commentary" className="ln-solo rl-remarks">
      {!live.length && <p className="sub">{canEdit ? 'Nothing written yet — what was seen at the machine, what was tried, what to look at next.' : 'Nothing written yet.'}</p>}
      <ul className="rl-rem">
        {live.map(r => (
          <li key={r.id} data-remark={r.id}>
            {editing?.id === r.id ? (
              <form className="rl-note" onSubmit={e => { e.preventDefault(); const v = editing.text.trim(); if (v) put(rs => rs.map(x => (x.id === r.id ? { ...x, text: v, editedAt: now() } : x))); setEditing(null); }}>
                <textarea className="text-input" autoFocus rows={2} value={editing.text} aria-label="The remark" onChange={e => setEditing({ id: r.id, text: e.target.value })} />
                <button type="submit" className="btn btn-primary">Keep</button>
                <button type="button" className="btn" onClick={() => setEditing(null)}>Cancel</button>
              </form>
            ) : (
              <>
                <p className="rl-rem-t">{r.text}</p>
                <span className="sub">{niceDay(isoDay(r.at))} {hm(r.at)}{r.by ? ` · ${r.by}` : ''}{r.editedAt ? ' · edited' : ''}</span>
                {canEdit && (
                  <span className="lt-acts">
                    <button type="button" className="cw-link" onClick={() => setEditing({ id: r.id, text: r.text })}>Edit</button>
                    <button type="button" className="cw-link sp-rm" onClick={() => put(rs => rs.map(x => (x.id === r.id ? { ...x, struck: true } : x)))}>Delete</button>
                  </span>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
      {off.length > 0 && canEdit && (
        <div className="ie-all">
          <button type="button" className="linkish" aria-expanded={showOff} onClick={() => setShowOff(o => !o)}>{showOff ? 'Hide' : 'Show'} the {off.length} taken off</button>
          {showOff && (
            <ul className="rl-rem is-off">
              {off.map(r => (
                <li key={r.id}><p className="rl-rem-t">{r.text}</p><button type="button" className="linkish" onClick={() => put(rs => rs.map(x => (x.id === r.id ? { ...x, struck: undefined } : x)))}>Undo — bring it back</button></li>
              ))}
            </ul>
          )}
        </div>
      )}
      {canEdit && (
        <form className="rl-note" onSubmit={e => { e.preventDefault(); add(); }}>
          <textarea className="text-input" rows={2} value={text} maxLength={2000} placeholder="Write what was seen, tried, or needs looking at" aria-label="Add to the commentary" onChange={e => setText(e.target.value)} />
          <button type="submit" className="btn" disabled={!text.trim()}>Add</button>
        </form>
      )}
    </LeanPanel>
  );
}

/* ------------------------------------------------------------------ close: a receipt */
function Act({ s, f, text, tone, can, me }: { s: ToolStudy; f: RelFigures; text: string; tone: 'r' | 'a' | 'g' | 'n'; can: ReturnType<typeof canAt>; me?: string }) {
  const [reopen, setReopen] = useState<string | null>(null);
  const by = me ? { by: me } : {};
  if (s.closedAt && s.receipt) {
    return (
      <div className="ie-act is-closed">
        <p className="ie-receipt"><b>Closed {niceDay(isoDay(s.receipt.at))}{s.receipt.by ? ` by ${s.receipt.by}` : ''}</b> — a receipt: these figures stand as they were. {s.receipt.text}</p>
        {can.agree && (reopen === null
          ? <button type="button" className="btn" onClick={() => setReopen('')}>Reopen</button>
          : (
            <form className="ie-why" onSubmit={e => { e.preventDefault(); if (!reopen.trim()) return;
              void patchStudy(s.id, cur => ({ closedAt: undefined, receipt: cur.receipt && { ...cur.receipt, reopened: [...(cur.receipt.reopened ?? []), { at: now(), ...by, why: reopen.trim() }] } }));
              setReopen(null); }}>
              <input className="text-input" autoFocus value={reopen} placeholder="Why it is reopened — kept with it" onChange={e => setReopen(e.target.value)} />
              <button type="submit" className="btn btn-primary" disabled={!reopen.trim()}>Reopen it</button>
            </form>
          ))}
      </div>
    );
  }
  if (!can.edit || f.n === 0 || f.runningSince) return null;
  const close = () => void patchStudy(s.id, cur => ({
    closedAt: now(),
    receipt: { at: now(), ...by, text, tone,
      figures: { hours: +f.hours.toFixed(3), events: f.n, mtbfMin: f.mtbfH !== undefined ? +(f.mtbfH * 60).toFixed(1) : null,
        perHour: f.rate !== undefined ? +f.rate.toFixed(3) : null, loMin: f.lo !== undefined ? +(f.lo * 60).toFixed(1) : null, hiMin: f.hi !== undefined ? +(f.hi * 60).toFixed(1) : null },
      ...(cur.receipt?.reopened ? { reopened: cur.receipt.reopened } : {}) },
  }));
  return <div className="ie-act"><button type="button" className="btn btn-primary" onClick={close}>Close — keep these figures</button></div>;
}
