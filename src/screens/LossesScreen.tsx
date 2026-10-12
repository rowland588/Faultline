/* A SHIFT'S LOSS COUNT — one study of tool 'losses' (docs/TOOLKIT.md, Part 4,
 * tool 7; docs/BUILD.md, E).
 *
 * The frame every tool shares (TOOLKIT 3.1), in the order of the three
 * questions: where are we (the strip), why are we not where we should be
 * (the sentence and the waterfall — the part not yet explained the only thing
 * that may carry colour), what are we doing about it (Make it better on a
 * bar, the countermeasure or the fix it raised).
 *
 * At the end of the shift, on a phone: pick the shift (or type the window),
 * type the packs made and the rejects; the planned minutes are the window's
 * until brought down for the breaks, the rate the product's standard's when
 * it has one. The stops were timed through the shift in Capture — they are
 * read here, never typed again. Saved once, on "Save the count" — not on
 * every keystroke.
 *
 * Nothing worked out is stored. The figures and the sentence come from
 * lib/ie/losses on every render, from the count and the line's stops in the
 * window; only at close are they written down, as a receipt. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getStandard, getStudy, getWorkspace, listObservations, onDataChange, patchStudy } from '../db';
import { useAccess } from '../cloud/access';
import { useSession } from '../cloud/session';
import { displayName } from '../cloud/team';
import { can as canAt, type Can } from '../lib/access';
import { now } from '../lib/ids';
import { niceDay, todayISO } from '../lib/weeks';
import { shiftWindow } from '../lib/shifts';
import { nav } from '../state/useRoute';
import { lossSays, minWords, packs, rateWords, stopsOfBar, windowWords, gbp, type LossBar, type LossFigures, type LossSays } from '../lib/ie/losses';
import { sixmLabel } from '../lib/sixm';
import { Sheet } from '../ui/Sheet';
import { lossFiguresOf, recordHref, ROLE_WORD, type StudyContext } from '../lib/studyLinks';
import type { LossCount, ToolStudy } from '../lib/study';
import type { Standard } from '../lib/standard';
import type { Observation, Workspace } from '../types';
import { TOOL_WORDS } from './StudiesScreen';
import { UsedFor, WhereItSits, useBetter } from '../ui/StudyPlace';

const OWNER = canAt('owner');

export function LossesScreen({ id }: { id: string }) {
  const [s, setS] = useState<ToolStudy | null | undefined>(undefined);
  const [line, setLine] = useState<Workspace | undefined>(undefined);
  const [obs, setObs] = useState<Observation[]>([]);
  const [std, setStd] = useState<Standard | undefined>(undefined);
  const load = useCallback(async () => {
    const st = (await getStudy(id)) ?? null;
    setS(st);
    if (!st) return;
    /* The line: its shifts, its cost model and its stops — what the count is
       read against. Nothing of it is copied onto the study. */
    const [w, o, sd] = await Promise.all([
      st.workspaceId ? getWorkspace(st.workspaceId) : Promise.resolve(undefined),
      st.workspaceId ? listObservations(st.workspaceId) : Promise.resolve([] as Observation[]),
      st.standardId ? getStandard(st.standardId) : Promise.resolve(undefined),
    ]);
    setLine(w); setObs(o); setStd(sd);
  }, [id]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  const jobCan = useAccess(s?.projectId ?? '');
  /* On a job, the job's rule; on a line or on its own, its people may do all
     of it, as on any study (TOOLKIT 3.6). */
  const can = s?.projectId ? jobCan : OWNER;
  const { session } = useSession();
  const me = displayName(session?.user.email) || undefined;

  if (s === undefined) return <div className="wrap ie lf"><p className="sub">Opening…</p></div>;
  if (s === null) return (
    <div className="wrap ie lf">
      <h1>This loss count isn’t on this device</h1>
      <p className="sub">It may have been deleted, or not synced here yet.</p>
      <button type="button" className="btn" onClick={() => nav('/losses')}>Every loss count</button>
    </div>
  );
  return <Losses s={s} line={line} obs={obs} std={std} can={can} me={me} />;
}

function Losses({ s, line, obs, std, can, me }: { s: ToolStudy; line?: Workspace; obs: Observation[]; std?: Standard; can: Can; me?: string }) {
  const c = s.facts.losses;
  const ctx = useMemo<StudyContext>(() => ({ observations: obs, workspaces: line ? [line] : [] }), [obs, line]);
  const f = useMemo(() => lossFiguresOf(s, ctx), [s, ctx]);
  const said = useMemo(() => lossSays(f, c, { ...(s.product ? { product: s.product } : {}) }), [f, c, s.product]);
  const closed = !!s.closedAt;
  const editable = can.edit && !closed;
  const w = TOOL_WORDS[s.tool];
  const write = (p: Parameters<typeof patchStudy>[1]) => void patchStudy(s.id, p);
  /* MAKE IT BETTER ON A BAR: a fix (stage gate) or a countermeasure (6M) in
     the bar's own figures, this count its evidence naming the bar; the bar
     then says what was raised from it (ui/StudyPlace useBetter). */
  const { board, byRef, better } = useBetter(s, me, ctx);
  const branches = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const u of s.uses) if (u.step && u.role === 'evidence' && byRef.has(u.ref)) m.set(u.step, [...(m.get(u.step) ?? []), u.ref]);
    return m;
  }, [s.uses, byRef]);
  const standardRate = std?.capacity?.targetPerMin && std.capacity.targetPerMin > 0 ? std.capacity.targetPerMin : undefined;
  /* A bar tapped — in the waterfall or the table: everything about it, and
     Make it better on it (tools come out where the work is). */
  const [viewing, setViewing] = useState<string | null>(null);
  /* A laptop draws the waterfall down the page, a phone across it — the same
     bars to the same scale, each label inside the frame at a size a person
     on the floor can read. */
  const wide = useWide();
  const bar = viewing ? f.bars.find(b => b.key === viewing) : undefined;

  return (
    <div className="wrap ie lf">
      <header className="ie-head">
        <small className="ie-eyebrow">{w?.one ?? 'Loss count'}</small>
        <Name s={s} canEdit={editable} />
        <p className="sub ie-where">
          {line ? <><b>{line.name}</b> · </> : null}
          {s.product ? <><b>{s.product}</b> · </> : null}
          {c ? <>{windowWords(c)} · {niceDay(todayISO(new Date(c.from)), { weekday: 'short' })} · </> : null}
          started {niceDay(todayISO(new Date(s.startedAt)))}
        </p>
        <WhereItSits s={s} can={can} />
      </header>

      <Strip f={f} said={said} />
      <div className="ie-says">
        <p className={'ie-say is-' + said.tone}>{said.text}</p>
        {said.lines.map(l => <p key={l.text} className={'ie-say ie-cap is-' + l.tone}>{l.text}</p>)}
        {s.overrule && <p className="ie-say ie-over"><b>{s.overrule.verdict}</b> · overruled{s.overrule.by ? ` by ${s.overrule.by}` : ''} — {s.overrule.why}</p>}
      </div>

      <div className={'lf-body' + (f.enough ? '' : ' is-counting')}>
        <div className="lf-main">
          <div className="ie-pic">{wide ? <Waterfall f={f} said={said} onOpen={setViewing} /> : <WaterfallRows f={f} said={said} onOpen={setViewing} />}</div>
          {f.enough && f.bars.length > 0 && <CauseTable f={f} branches={branches} onOpen={setViewing} />}
        </div>
        <CountForm s={s} line={line} standardRate={standardRate} editable={editable} />
      </div>

      <UsedFor s={s} can={can} me={me} />
      <Act s={s} f={f} said={said} can={can} me={me} write={write} />

      {bar && c && (
        <BarSheet bar={bar} f={f} c={c} obs={obs} workspaceId={s.workspaceId} board={board}
          raised={(branches.get(bar.key) ?? []).map(ref => ({ ref, title: byRef.get(ref)?.title ?? 'a record' }))}
          canBetter={editable && !!s.projectId} onJob={!!s.projectId} canEdit={editable}
          openRef={ref => { if (s.projectId) nav(recordHref(s.projectId, { kind: board ? 'action' : 'fix', ref })); }}
          onBetter={() => { const k = bar.key; setViewing(null); void better(k); }}
          onClose={() => setViewing(null)} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ name */
function Name({ s, canEdit }: { s: ToolStudy; canEdit: boolean }) {
  const [v, setV] = useState<string | null>(null);
  if (v === null) return (
    <h1 className="ie-name">{s.name || 'Not named'}
      {canEdit && <button type="button" className="linkish ie-rename" onClick={() => setV(s.name)}>Rename</button>}
    </h1>
  );
  const save = () => { if (v.trim()) void patchStudy(s.id, { name: v.trim() }); setV(null); };
  return (
    <form className="ie-name-f" onSubmit={e => { e.preventDefault(); save(); }}>
      <input className="text-input" value={v} maxLength={120} autoFocus onChange={e => setV(e.target.value)} onBlur={save} aria-label="What it is of" />
    </form>
  );
}

/* ------------------------------------------------------------------ the strip */
function Strip({ f, said }: { f: LossFigures; said: LossSays }) {
  const unex = f.unexplainedMin ?? 0;
  const amber = said.tone === 'a' && said.verdict.includes('not yet explained');
  return (
    <div className="ie-strip" role="group" aria-label="Where it stands">
      <span className={'ie-fig ie-verdict is-' + said.tone}><b>{said.verdict}</b></span>
      {f.enough && <>
        <span className="ie-fig">made <b>{packs(f.made ?? 0)}</b> of {packs(f.expected ?? 0)}</span>
        {amber && <span className="ie-fig">lost <b>{minWords(f.lostMin ?? 0)}</b></span>}
        {f.split && <span className={'ie-fig' + (f.stopsN + f.changeoverN ? '' : ' is-zero')}><b>{f.stopsN + f.changeoverN}</b> stop{f.stopsN + f.changeoverN === 1 ? '' : 's'} timed</span>}
        {f.split && !amber && <span className={'ie-fig' + (unex > 0.5 ? '' : ' is-zero')}><b>{minWords(unex)}</b> not yet explained</span>}
        {f.costPerHour !== undefined && f.lostMin !== undefined && <span className="ie-fig"><b>{gbp((f.lostMin / 60) * f.costPerHour)}</b> lost</span>}
      </>}
    </div>
  );
}

/* ------------------------------------------------------------------ the waterfall */
const FW = 640, FH = 280, FP = { l: 12, r: 12, t: 26, b: 58 };
/** Causes drawn as bars of their own; the rest merged into one, said as such. */
const MAX_CAUSES = 5;

/** A label in at most two lines of about twelve letters — never cut short. */
function twoLines(t: string): string[] {
  if (t.length <= 12) return [t];
  const words = t.split(/\s+/);
  let a = '';
  while (words.length && (a + ' ' + words[0]).trim().length <= Math.max(12, Math.ceil(t.length / 2))) a = (a + ' ' + words.shift()).trim();
  if (!a) a = words.shift() ?? '';
  return [a, words.join(' ')].filter(Boolean);
}

function Waterfall({ f, said, onOpen }: { f: LossFigures; said: LossSays; onOpen: (key: string) => void }) {
  if (!f.enough) return <p className="sub ie-pic-empty">The waterfall draws itself here — planned minutes down to the good packs made — once the count is in.</p>;
  const planned = f.plannedMin ?? 0, rate = f.rate ?? 1;
  const causes = f.bars.filter(b => b.kind === 'cause');
  const shown: LossBar[] = causes.length > MAX_CAUSES
    ? [...causes.slice(0, MAX_CAUSES - 1), (() => { const rest = causes.slice(MAX_CAUSES - 1); return { key: 'cause:other', kind: 'cause' as const, label: `${rest.length} other causes`, min: rest.reduce((n, b) => n + b.min, 0), stops: rest.reduce((n, b) => n + (b.stops ?? 0), 0), bone: 'machine' as const, grade: 'measured' as const }; })()]
    : causes;
  const bars = [...shown, ...f.bars.filter(b => b.kind !== 'cause')];
  const madeMin = Math.min(planned, (f.made ?? 0) / rate);
  const cols = bars.length + 2;
  const colW = (FW - FP.l - FP.r) / cols, bw = Math.min(70, colW * 0.72);
  const x = (i: number) => FP.l + i * colW + (colW - bw) / 2;
  const top = Math.max(planned, madeMin, 1);
  const y = (v: number) => FP.t + (1 - v / top) * (FH - FP.t - FP.b);
  const amber = (f.unexplainedShare ?? 0) > 0.1;
  /* the stops logged exceed the loss: the bars run below what was made —
     drawn as they are, and said in the sentence */
  let level = planned;
  const label = (i: number, lines: string[], sub: string | undefined, cls = '') => (
    <>
      {lines.map((l, k) => <text key={k} className={'lf-lbl' + cls} x={x(i) + bw / 2} y={FH - FP.b + 16 + k * 13}>{l}</text>)}
      {sub && <text className="lf-lbl is-sub" x={x(i) + bw / 2} y={FH - FP.b + 16 + lines.length * 13}>{sub}</text>}
    </>
  );
  return (
    <svg className="lf-fall" viewBox={`0 0 ${FW} ${FH}`} role="img" aria-label={said.text}>
      <defs>
        <pattern id="lf-hatch" patternUnits="userSpaceOnUse" width="6" height="6"><path d="M0 6 L6 0" className="lf-hatch" /></pattern>
      </defs>
      <g>
        <rect className="lf-bar is-frame" x={x(0)} y={y(planned)} width={bw} height={y(0) - y(planned)} />
        <text className="lf-val" x={x(0) + bw / 2} y={y(planned) - 6}>{minWords(planned)}</text>
        {label(0, ['Planned'], undefined)}
      </g>
      {bars.map((b, i) => {
        const from = level, to = Math.max(0, level - b.min);
        level = to;
        const h = Math.max(0, y(to) - y(from));
        const unex = b.kind === 'unexplained';
        const cls = 'lf-bar' + (unex ? ' is-unex' + (amber ? ' is-a' : '') : '');
        const real = f.bars.some(z => z.key === b.key);
        return (
          <g key={b.key} className={real ? 'lf-go' : undefined} onClick={real ? () => onOpen(b.key) : undefined}>
            <title>{b.label}{b.asset ? ` on the ${b.asset}` : ''}: {minWords(b.min)}{b.stops !== undefined ? ` · ${b.stops} stop${b.stops === 1 ? '' : 's'}` : ''}{b.pounds !== undefined ? ` · ${gbp(b.pounds)}` : ''}</title>
            {/* the step down from the bar before */}
            <line className="lf-step" x1={x(i)} x2={x(i + 1)} y1={y(from)} y2={y(from)} />
            <rect className={cls} x={x(i + 1)} y={y(from)} width={bw} height={Math.max(h, b.min > 0 ? 1.5 : 0)} />
            <rect className="lf-hit" x={x(i + 1) - 4} y={FP.t} width={bw + 8} height={FH - FP.t} />
            <text className={'lf-val' + (unex && amber ? ' is-a' : '')} x={x(i + 1) + bw / 2} y={y(from) - 6}>{minWords(b.min)}</text>
            {label(i + 1, twoLines(b.label), b.pounds !== undefined ? gbp(b.pounds) : undefined, unex && amber ? ' is-a' : '')}
          </g>
        );
      })}
      <g>
        <line className="lf-step" x1={x(cols - 2)} x2={x(cols - 1)} y1={y(level)} y2={y(level)} />
        <rect className="lf-bar is-frame" x={x(cols - 1)} y={y(madeMin)} width={bw} height={y(0) - y(madeMin)} />
        <text className="lf-val" x={x(cols - 1) + bw / 2} y={y(madeMin) - 6}>{minWords(madeMin)}</text>
        {label(cols - 1, ['Made'], `${packs(f.made ?? 0)} packs`)}
      </g>
      <line className="lf-base" x1={FP.l} x2={FW - FP.r} y1={y(0)} y2={y(0)} />
    </svg>
  );
}

/** Wide enough to draw the waterfall down the page — followed, not read once. */
function useWide(): boolean {
  const q = '(min-width: 700px)';
  const [wide, setWide] = useState(() => typeof window === 'undefined' || !window.matchMedia || window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(q);
    if (!mq) return;
    const on = () => setWide(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return wide;
}

/** THE WATERFALL ACROSS A PHONE: a row per bar, top to bottom — planned, each
 *  loss stepping down from where the one before left off, made — to scale,
 *  the label and the minutes inside the frame. Tap a row to open it. */
const RW = 360, RH = 34, RL = 112, RR = 64;
function WaterfallRows({ f, said, onOpen }: { f: LossFigures; said: LossSays; onOpen: (key: string) => void }) {
  if (!f.enough) return <p className="sub ie-pic-empty">The waterfall draws itself here — planned minutes down to the good packs made — once the count is in.</p>;
  const planned = f.plannedMin ?? 0, rate = f.rate ?? 1;
  const madeMin = Math.min(planned, (f.made ?? 0) / rate);
  const top = Math.max(planned, 1);
  const x = (v: number) => RL + (Math.max(0, v) / top) * (RW - RL - RR);
  const amber = (f.unexplainedShare ?? 0) > 0.1;
  const rows = f.bars.length + 2;
  let level = planned;
  const lbl = (t: string) => (t.length > 17 ? `${t.slice(0, 16)}…` : t);
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
        const unex = b.kind === 'unexplained';
        return (
          <g key={b.key} className="lf-go" onClick={() => onOpen(b.key)}>
            <title>{b.label}: {minWords(b.min)}</title>
            <rect className="lf-hit" x={0} y={y0} width={RW} height={RH} />
            <text className={'lf-rl' + (unex && amber ? ' is-a' : '')} x={0} y={y0 + RH / 2 + 5}>{lbl(b.label)}</text>
            <line className="lf-step" x1={x(from)} x2={x(from)} y1={y0 - RH + 6} y2={y0 + 6} />
            <rect className={'lf-bar' + (unex ? ' is-unex' + (amber ? ' is-a' : '') : '')}
              x={x(to)} y={y0 + 6} width={Math.max(1.5, x(from) - x(to))} height={RH - 12} />
            <text className={'lf-rv' + (unex && amber ? ' is-a' : '')} x={RW} y={y0 + RH / 2 + 5}>{minWords(b.min)}</text>
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

function CauseTable({ f, branches, onOpen }: { f: LossFigures; branches: Map<string, string[]>; onOpen: (key: string) => void }) {
  const money = f.costPerHour !== undefined;
  const amber = (f.unexplainedShare ?? 0) > 0.1;
  return (
    <div className="lf-table" role="table" aria-label="The losses by cause">
      <div className={'lf-tr lf-th' + (money ? '' : ' no-money')} role="row">
        <span role="columnheader">Cause</span><span role="columnheader" className="is-num">Stops</span><span role="columnheader" className="is-num">Minutes</span>{money && <span role="columnheader" className="is-num">£</span>}
      </div>
      {f.bars.map(b => {
        const raised = (branches.get(b.key) ?? []).length;
        return (
          <button key={b.key} type="button" role="row" className={'lf-tr lf-row' + (b.kind === 'unexplained' && amber ? ' is-a' : '') + (money ? '' : ' no-money')}
            onClick={() => onOpen(b.key)} aria-label={`${b.label}: ${minWords(b.min)} — open it`}>
            <span role="cell" className="lf-cause">
              <b>{b.label}</b>{b.asset ? <span className="sub"> · {b.asset}</span> : null}{b.kind === 'rejects' ? <span className="sub"> · {packs(b.packs ?? 0)} packs</span> : null}
              <span className="sub lf-known"> · {KNOWN[b.grade]}</span>
              {raised > 0 && <span className="lf-branch">Being made better{raised > 1 ? ` · ${raised}` : ''}</span>}
            </span>
            <span role="cell" className="is-num">{b.stops !== undefined ? b.stops : '—'}</span>
            <span role="cell" className="is-num">{minWords(b.min)}</span>
            {money && <span role="cell" className="is-num">{b.pounds !== undefined ? gbp(b.pounds) : '—'}</span>}
            <span className="lf-chev" aria-hidden>›</span>
          </button>
        );
      })}
      <div className={'lf-tr lf-tf' + (money ? '' : ' no-money')} role="row">
        <span role="cell">Lost</span><span role="cell" className="is-num">{f.stopsN + f.changeoverN}</span><span role="cell" className="is-num">{minWords(f.lostMin ?? 0)}</span>
        {money && <span role="cell" className="is-num">{gbp(((f.lostMin ?? 0) / 60) * (f.costPerHour ?? 0))}</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ one bar, opened */
const clock = (ms: number) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

function BarSheet({ bar, f, c, obs, workspaceId, board, raised, canBetter, onJob, canEdit, openRef, onBetter, onClose }: {
  bar: LossBar; f: LossFigures; c: LossCount; obs: Observation[]; workspaceId?: string; board: boolean;
  raised: { ref: string; title: string }[]; canBetter: boolean; onJob: boolean; canEdit: boolean;
  openRef: (ref: string) => void; onBetter: () => void; onClose: () => void;
}) {
  const stops = stopsOfBar(obs, c, bar, workspaceId);
  const share = f.lostMin && f.lostMin > 0 ? Math.round((bar.min / f.lostMin) * 100) : undefined;
  return (
    <Sheet open onClose={onClose} title={bar.label}>
      <div className="lf-sheet">
        <p className="lf-sheet-h"><b>{minWords(bar.min)}</b>{share !== undefined ? ` · ${share}% of the ${minWords(f.lostMin ?? 0)} lost` : ''}{bar.stops !== undefined ? ` · ${bar.stops} stop${bar.stops === 1 ? '' : 's'}` : ''}{bar.pounds !== undefined ? ` · ${gbp(bar.pounds)}` : ''}</p>
        <dl className="lf-facts">
          {bar.asset && <div><dt>Where</dt><dd>{bar.asset}</dd></div>}
          <div><dt>How known</dt><dd>{bar.kind === 'rejects' ? `${packs(bar.packs ?? 0)} packs counted, at ${rateWords(f.rate ?? 0)}`
            : bar.kind === 'unexplained' ? 'Not logged — what the count says was lost, less every stop timed and the rejects. Stops missed, and running slow, which is not measured by hand.'
              : `${KNOWN[bar.grade]} in Capture`}</dd></div>
          {bar.kind !== 'unexplained' && <div><dt>Its bone</dt><dd>{sixmLabel(bar.bone)} — {bar.kind === 'rejects' ? 'the usual bone for a reject' : 'as the floor tapped it, or the usual bone for the reason'}</dd></div>}
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

function CountForm({ s, line, standardRate, editable }: { s: ToolStudy; line?: Workspace; standardRate?: number; editable: boolean }) {
  const c = s.facts.losses;
  const shifts = line?.shifts ?? [];
  const [shift, setShift] = useState<string>(c?.shift ?? '');
  const [day, setDay] = useState(todayISO(new Date(c?.from ?? now())));
  const [from, setFrom] = useState(c ? hm(c.from) : '06:00');
  const [to, setTo] = useState(c ? hm(c.to) : '14:00');
  const [planned, setPlanned] = useState(c?.plannedMin !== undefined ? String(c.plannedMin) : '');
  const [made, setMade] = useState(c?.made !== undefined ? String(c.made) : '');
  const [rejects, setRejects] = useState(c?.rejects !== undefined ? String(c.rejects) : '');
  const [rate, setRate] = useState(c?.ratePerMin !== undefined ? String(c.ratePerMin) : standardRate !== undefined ? String(standardRate) : '');
  const [saved, setSaved] = useState<string | null>(null);

  /* The window, from the shift's clock on the day — or typed. */
  const picked = shifts.find(x => x.name === shift);
  const window = picked ? shiftWindow(picked, day) : (() => {
    const w = shiftWindow({ start: from, end: to }, day);
    return w;
  })();
  const windowMin = window ? Math.round((window.to - window.from) / 60_000) : undefined;
  /* The planned minutes follow the window until somebody brings them down. */
  const pick = (name: string) => {
    const nx = shifts.find(x => x.name === name);
    const w = nx ? shiftWindow(nx, day) : shiftWindow({ start: from, end: to }, day);
    const wasWindow = planned.trim() === '' || (windowMin !== undefined && Number(planned) === windowMin);
    setShift(name);
    if (w && wasWindow) setPlanned(String(Math.round((w.to - w.from) / 60_000)));
  };
  const n = { planned: numOr(planned), made: numOr(made), rejects: numOr(rejects), rate: numOr(rate) };
  const bad = [n.planned, n.made, n.rejects, n.rate].some(v => v !== undefined && (!Number.isFinite(v) || v < 0));
  const problem = !window ? 'The window needs a start and an end.' : bad ? 'Numbers only, none below zero.' : '';
  const rateFrom: LossCount['rateFrom'] | undefined = n.rate === undefined ? undefined : standardRate !== undefined && n.rate === standardRate ? 'standard' : 'typed';

  const save = () => {
    if (!window || problem) return;
    const count: LossCount = {
      ...(picked ? { shift: picked.name } : {}), from: window.from, to: window.to,
      ...(n.planned !== undefined && n.planned > 0 ? { plannedMin: n.planned } : {}),
      ...(n.made !== undefined ? { made: n.made } : {}),
      ...(n.rejects !== undefined ? { rejects: n.rejects } : {}),
      ...(n.rate !== undefined && n.rate > 0 ? { ratePerMin: n.rate, rateFrom: rateFrom ?? 'typed' } : {}),
    };
    /* Named for its shift and day, unless somebody named it by hand. */
    const auto = !s.name.trim() || s.name === 'Loss count' || /^(.+), \d{1,2} \w{3}$/.test(s.name);
    const name = `${picked ? picked.name : `${from}–${to}`}, ${new Date(window.from).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
    void patchStudy(s.id, cur => ({ facts: { ...cur.facts, losses: count }, ...(auto ? { name } : {}) }));
    setSaved(`Saved ${hm(now())}`);
  };

  if (!editable) {
    return (
      <div className="lf-count is-ro" aria-label="The count">
        <small className="ie-h">The count</small>
        {c ? (
          <dl className="lf-facts">
            <div><dt>Shift</dt><dd>{c.shift ?? 'A window typed by hand'} · {windowWords(c)} · {niceDay(todayISO(new Date(c.from)), { weekday: 'short' })}</dd></div>
            <div><dt>Planned</dt><dd>{c.plannedMin !== undefined ? `${c.plannedMin} min` : 'not yet'}</dd></div>
            <div><dt>Made</dt><dd>{c.made !== undefined ? `${packs(c.made)} packs` : 'not yet counted'}</dd></div>
            <div><dt>Rejects</dt><dd>{c.rejects !== undefined ? `${packs(c.rejects)} packs` : 'none counted'}</dd></div>
            <div><dt>Rate</dt><dd>{c.ratePerMin !== undefined ? `${rateWords(c.ratePerMin)} · ${c.rateFrom === 'standard' ? 'the line standard' : 'typed'}` : 'not yet'}</dd></div>
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
            {shifts.map(x => <button key={x.name} type="button" role="radio" aria-checked={shift === x.name} className={'chip' + (shift === x.name ? ' on' : '')} onClick={() => pick(x.name)}>{x.name}</button>)}
            <button type="button" role="radio" aria-checked={shift === ''} className={'chip' + (shift === '' ? ' on' : '')} onClick={() => pick('')}>Type the window</button>
          </span>
        </div>
      ) : <p className="sub">{line ? `${line.name} has no shifts set — type the window.` : 'Put the count on a line to pick its shift; or type the window.'}</p>}
      <div className="lf-count-grid">
        <label className="field lf-day"><span className="field-label">The day</span>
          <input className="text-input" type="date" value={day} aria-label="The day" onChange={e => setDay(e.target.value)} /></label>
        {!picked && <>
          <label className="field"><span className="field-label">From</span>
            <input className="text-input" type="time" value={from} aria-label="From" onChange={e => setFrom(e.target.value)} /></label>
          <label className="field"><span className="field-label">To</span>
            <input className="text-input" type="time" value={to} aria-label="To" onChange={e => setTo(e.target.value)} /></label>
        </>}
        <label className="field"><span className="field-label">Planned minutes</span>
          <input className="text-input" inputMode="numeric" value={planned} aria-label="Planned minutes" placeholder={windowMin !== undefined ? String(windowMin) : '450'} onChange={e => setPlanned(e.target.value)} />
          <span className="sub">{windowMin !== undefined ? `the window is ${windowMin} min — less the breaks` : 'the window less the breaks'}</span></label>
        <label className="field"><span className="field-label">Packs made</span>
          <input className="text-input" inputMode="numeric" value={made} aria-label="Packs made" placeholder="e.g. 36500" onChange={e => setMade(e.target.value)} /></label>
        <label className="field"><span className="field-label">Rejects</span>
          <input className="text-input" inputMode="numeric" value={rejects} aria-label="Rejects" placeholder="packs" onChange={e => setRejects(e.target.value)} /></label>
        <label className="field"><span className="field-label">Rate a minute</span>
          <input className="text-input" inputMode="decimal" value={rate} aria-label="Rate a minute" placeholder="e.g. 100" onChange={e => setRate(e.target.value)} />
          <span className="sub">{rateFrom === 'standard' ? `the line standard${s.product ? ` for ${s.product}` : ''}` : standardRate !== undefined ? <>typed · <button type="button" className="linkish" onClick={() => setRate(String(standardRate))}>use the standard’s {standardRate}</button></> : n.rate !== undefined ? 'typed' : 'the product’s standard, or typed'}</span></label>
      </div>
      {problem && <p className="ie-problem">{problem}</p>}
      <div className="ie-agree-act">
        <button type="submit" className="btn btn-primary" disabled={!!problem}>Save the count</button>
        {saved && <span className="sub">{saved}</span>}
      </div>
    </form>
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
        explainedMin: Math.round(f.explainedMin), unexplainedMin: f.unexplainedMin !== undefined ? Math.round(f.unexplainedMin) : null },
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
