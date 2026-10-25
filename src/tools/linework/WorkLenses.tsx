/* THE LINE BALANCE'S OTHER LENSES — the same record, seen as a time study, as a combination table and
 * person–machine chart, as the order the work must follow, and as the five questions asked of each step
 * (knowledge/specs/FC-032-line-balance.md; FC-019 · 025 · 024 · 007 · 026 · 033 · 028).
 *
 * "One thing seen several ways is ViewTabs" (docs/STRUCTURE.md): the steps are the balance's, written once; a
 * lens only reads them (and writes the one field it is about). Every sentence and figure comes from the
 * modules in this folder, so the page, the paper and the acceptance script say one thing. */
import { useMemo, useState } from 'react';
import { patchStudy } from '../../db';
import { uid } from '../../lib/ids';
import type { Can } from '../../lib/access';
import type { AgreedBalance, BalanceStep, EcrsHow, ToolStudy } from '../../lib/study';
import { aPiece, reuseSays, secs, suggest, type BalanceFigures, type ElementFigures, type PersonFigures } from './balance';
import { allowanceMoney, allowanceSays, allowanceOf, plannedPerHour } from './allowance';
import { combination, tend, tendInput, tendSays, waitMoney, type CombinationRow, type Seg } from './timeline';
import { brokenOrder, positionalWeights, proposalSays, rankedPositional, wouldLoop, findLoop } from './order';
import { HOW_WORD, QUESTIONS, improve, improveMoney, improveMoneySays, improveSays } from './improve';
import { matchRows, reuseOf, reusedSays, type LibraryRow } from './standardData';

export interface LensCtx {
  study: ToolStudy;
  f: BalanceFigures;
  a?: AgreedBalance;
  steps: BalanceStep[];
  /** The people in the order the line flows. */
  people: PersonFigures[];
  can: Can;
  editable: boolean;
  /** £ an hour, from the one cost model; undefined = not given. */
  rate?: number;
  contribution?: number;
  lineUnit?: string;
  library: LibraryRow[];
  crewCount: number;
  setSteps: (fn: (cur: BalanceStep[]) => BalanceStep[]) => void;
  setStep: (id: string, patch: Partial<BalanceStep>) => void;
  onAgree: () => void;
  goLens: (lens: string) => void;
}

const money = (v: number) => `£${v < 1 ? v.toFixed(3) : v.toFixed(2)}`;
const KIND_WORD: Record<string, string> = { work: 'work', walk: 'walking', wait: 'waiting', machine: 'machine' };
const ratingOk = (v: number) => v >= 50 && v <= 150;

/* ================================================================== TIMES */

/** FC-019 · FC-025 · FC-024 — what each step takes, how sure that is, the allowance, what was timed elsewhere. */
export function TimesLens(c: LensCtx) {
  const { f, a, steps, people, editable } = c;
  const al = allowanceOf(a);
  const money_ = a ? allowanceMoney(f, a, c.rate) : { text: '' };
  const reused = reusedSays(f);
  const byStep = new Map(steps.map(s => [s.id, s]));
  return (
    <section className="wb-lens wb-times" aria-label="Times">
      <p className="sub wb-lede">What each step takes at a standard pace. <b>Observed</b> is the mean of its laps; <b>basic</b> = observed × pace ÷ 100; <b>standard</b> = basic + the allowance. The pace is a trained observer’s judgement — 100 is the standard pace (BS 3138): what a qualified worker keeps up steadily, with the effort and care the job asks, with no rest. A step timed and never rated is taken at 100, and says so. A machine’s run is never rated and carries no allowance.</p>
      {!f.elements.length && <p className="sub">List the work and time it on the first tab — the times are read here.</p>}
      {people.map(p => (
        <div key={p.who} className="wb-tp">
          <h3>{p.who}{p.station ? <span className="sub"> at {p.station}</span> : null}</h3>
          <table className="wb-tbl">
            <thead><tr><th scope="col">Step</th><th scope="col">Cycles</th><th scope="col">Observed</th><th scope="col">Pace</th><th scope="col">Basic</th><th scope="col">Standard</th><th scope="col">± at 95%</th></tr></thead>
            <tbody>
              {p.elements.map(e => <TimesRow key={e.id} e={e} st={byStep.get(e.id)} editable={editable} onRate={v => c.setStep(e.id, { rating: v })} />)}
            </tbody>
          </table>
          <p className="wb-task"><b>{p.who}’s task</b>: standard {secs(p.work)}{aPiece(p)}{p.work > 0 && p.source !== 'none' ? <> — {Math.round(plannedPerHour(p.work) ?? 0).toLocaleString('en-GB')}{p.unit ? ` ${p.unit}` : ''} an hour planned</> : null}{p.source === 'none' ? ' so far — not all timed' : ''}.</p>
        </div>
      ))}
      <div className="wb-allow">
        <h3>The allowance</h3>
        <p className="wb-allow-s">{allowanceSays(a)}</p>
        {money_.text && <p className="wb-allow-m">{money_.text}</p>}
        {money_.missing && <p className="sub">{money_.missing}</p>}
        <p className="sub">Built from the figures your site agreed for each cause, named — the ILO’s own table of percentages is not built in, because its figures could not be checked against the book here.{al ? '' : ' Standard time here is the basic time until an allowance is agreed.'}</p>
        {c.can.agree && !c.study.closedAt && <button type="button" className="btn" onClick={c.onAgree}>{al ? 'Change the allowance' : 'Agree an allowance'}</button>}
      </div>
      <StandardData c={c} reused={reused?.text} />
    </section>
  );
}

function TimesRow({ e, st, editable, onRate }: { e: ElementFigures; st?: BalanceStep; editable: boolean; onRate: (v: number | undefined) => void }) {
  const cell = (label: string, v: React.ReactNode, cls = '') => <td data-label={label} className={cls}>{v}</td>;
  const timed = e.source === 'timed';
  const machine = e.kind === 'machine';
  const word = e.kind !== 'work' ? <i className="wb-kind-w"> {KIND_WORD[e.kind]}</i> : null;
  return (
    <tr className={'wb-tr is-' + e.source}>
      <th scope="row" data-label="Step">{e.name}{word}</th>
      {cell('Cycles', timed ? <span className={e.enough ? '' : 'is-a'}>{e.n} of {e.needed}{e.enough ? ' — enough' : ''}</span> : '—')}
      {cell('Observed', e.observed != null ? secs(e.observed) : '—')}
      {cell('Pace', machine ? <span className="sub">machine — not rated</span>
        : timed && editable ? (
          <span className="wb-pace">
            <input className="text-input" type="number" inputMode="numeric" min={50} max={150} step={1} key={`${e.id}-${st?.rating ?? ''}`} defaultValue={st?.rating ?? ''} placeholder="100" aria-label={`Pace seen — ${e.name}`}
              onBlur={ev => { const v = Number(ev.target.value); if (!ev.target.value.trim()) onRate(undefined); else if (ratingOk(v)) onRate(Math.round(v)); else ev.target.value = String(st?.rating ?? ''); }} />
            {!e.rated && <small className="is-a">not rated — taken at 100</small>}
          </span>
        ) : timed ? (e.rated ? String(e.rating) : <small className="is-a">not rated — 100</small>) : '—')}
      {cell('Basic', e.basic != null ? secs(e.basic) : '—')}
      {cell('Standard', e.standard != null ? <b>{secs(e.standard)}{e.source === 'typed' ? <small> typed</small> : e.source === 'library' ? <small> reused</small> : null}</b> : 'not timed yet')}
      {cell('± at 95%', timed && e.margin != null ? <span className={e.enough ? '' : 'is-a'}>±{(e.margin * 100).toFixed(1)}%</span> : timed ? 'one lap' : e.source === 'library' && e.reuse ? <small>{reuseSays(e.reuse)}</small> : '—')}
    </tr>
  );
}

function StandardData({ c, reused }: { c: LensCtx; reused?: string }) {
  const [q, setQ] = useState('');
  const [whom, setWhom] = useState<string>('');
  const rows = useMemo(() => matchRows(c.library, q).slice(0, 30), [c.library, q]);
  const who = c.people.map(p => p.who);
  const to = whom && who.includes(whom) ? whom : who[who.length - 1] ?? 'Op 1';
  const use = (r: LibraryRow) => c.setSteps(cur => [...cur, { id: uid(), order: Math.max(-1, ...cur.map(x => x.order)) + 1, name: r.name, who: to, ...(r.kind !== 'work' ? { kind: r.kind as BalanceStep['kind'] } : {}), reuse: reuseOf(r) }]);
  return (
    <div className="wb-lib">
      <h3>Standard data</h3>
      <p className="sub">Steps already timed on other products of this line — borrow one rather than time it again. It brings its basic time and says where it came from; this balance’s allowance goes on it, and a timing made here replaces it. A time that scales with the pack (“place n packs”) is not worked out for you: pick the step whose pack matches.</p>
      {reused && <p className="wb-lib-s">{reused}</p>}
      {c.library.length === 0 ? <p className="sub">No other product on this line has a timed step yet.</p> : (
        <>
          <div className="wb-lib-q">
            <input className="text-input" type="search" value={q} placeholder="Find a step — e.g. fold tape" aria-label="Find a timed step" onChange={e => setQ(e.target.value)} />
            {c.editable && who.length > 0 && (
              <label className="wb-whose"><span className="sub">for</span>
                <select className="text-input" value={to} aria-label="Whose step it becomes" onChange={e => setWhom(e.target.value)}>{who.map(w => <option key={w}>{w}</option>)}</select></label>
            )}
          </div>
          <ul className="wb-lib-l">
            {rows.map(r => (
              <li key={r.key} className="wb-lib-r">
                <span><b>{r.name}</b> <span className="sub">— {r.product}</span></span>
                <span className="wb-lib-t">{secs(r.basic)} basic · {r.n} cycle{r.n === 1 ? '' : 's'}{r.enough ? '' : ' (short of enough)'}</span>
                {c.editable && <button type="button" className="btn btn-sm" aria-label={`Use ${r.name} from ${r.product}`} onClick={() => use(r)}>Use it</button>}
              </li>
            ))}
            {!rows.length && <li className="sub">Nothing timed matches “{q}”.</li>}
          </ul>
        </>
      )}
    </div>
  );
}

/* ================================================================== PERSON AND MACHINE */

const CW = 640;

/** One person's combination table: their steps on a time scale, the machine's run beside them, the takt. */
export function CombinationChart({ row }: { row: CombinationRow }) {
  const { tl } = row;
  const span = Math.max(tl.cycle, row.takt ?? 0) * 1.05 || 1;
  const L = 78, R = 10, T = 30, H = 26, G = 8;
  const x = (v: number) => L + (v / span) * (CW - L - R);
  const lane = (i: number) => T + i * (H + G);
  const total = T + 2 * H + G + 30;
  const label = (g: Seg) => (x(g.end) - x(g.start) > 54 ? g.name.length > 12 ? `${g.name.slice(0, 11)}…` : g.name : '');
  const person = tl.segs.filter(g => g.kind !== 'machine'), mach = tl.segs.filter(g => g.kind === 'machine');
  const aria = `${row.who}: ${tl.segs.map(g => `${g.name} ${g.start.toFixed(1)} to ${g.end.toFixed(1)} s, ${KIND_WORD[g.kind]}`).join('; ')}${row.takt ? ` — against a ${secs(row.takt)} takt` : ''}`;
  return (
    <svg className="wb-svg wb-cs-svg" viewBox={`0 0 ${CW} ${total}`} role="img" aria-label={aria}>
      <defs>
        <pattern id="wb-cs-h" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" className="wb-hatch-bg" /><line x1="0" y1="0" x2="0" y2="6" className="wb-hatch-ln" />
        </pattern>
      </defs>
      <text className="wb-lw" x={4} y={lane(0) + H / 2 + 4}>{row.who}</text>
      <text className="wb-lw" x={4} y={lane(1) + H / 2 + 4}>Machine</text>
      {person.map(g => (
        <g key={g.id}>
          <rect className={'wb-cs is-' + g.kind} x={x(g.start)} y={lane(0)} width={Math.max(1, x(g.end) - x(g.start))} height={H} />
          <text className="wb-cs-t" x={x(g.start) + 4} y={lane(0) + H / 2 + 4}>{label(g)}</text>
        </g>
      ))}
      {tl.personWaits > 0.05 && (
        <g><rect className="wb-cs is-wait" x={x(tl.personEnd)} y={lane(0)} width={Math.max(1, x(tl.cycle) - x(tl.personEnd))} height={H} />
          <text className="wb-cs-t" x={x(tl.personEnd) + 4} y={lane(0) + H / 2 + 4}>{x(tl.cycle) - x(tl.personEnd) > 40 ? 'waits' : ''}</text></g>
      )}
      {mach.map(g => (
        <g key={g.id}>
          <rect className="wb-cs is-machine" x={x(g.start)} y={lane(1)} width={Math.max(1, x(g.end) - x(g.start))} height={H} />
          <text className="wb-cs-t" x={x(g.start) + 4} y={lane(1) + H / 2 + 4}>{label(g)}</text>
        </g>
      ))}
      {tl.machineWaits > 0.05 && (
        <g><rect className="wb-cs is-wait" x={x(tl.machineEnd)} y={lane(1)} width={Math.max(1, x(tl.personEnd) - x(tl.machineEnd))} height={H} />
          <text className="wb-cs-t" x={x(tl.machineEnd) + 4} y={lane(1) + H / 2 + 4}>{x(tl.personEnd) - x(tl.machineEnd) > 40 ? 'waits' : ''}</text></g>
      )}
      {row.takt != null && (
        <g><line className="wb-takt" x1={x(row.takt)} x2={x(row.takt)} y1={T - 14} y2={lane(1) + H + 4} />
          <text className="wb-lw" x={Math.min(x(row.takt) + 4, CW - 70)} y={T - 17}>takt {secs(row.takt)}</text></g>
      )}
      <line className="wb-ax" x1={L} x2={CW - R} y1={lane(1) + H + 8} y2={lane(1) + H + 8} />
      <text className="wb-lw" x={L} y={lane(1) + H + 24}>0</text>
      <text className="wb-lw" x={x(tl.cycle)} y={lane(1) + H + 24} textAnchor="middle">{secs(tl.cycle)}</text>
    </svg>
  );
}

export function MachineLens(c: LensCtx) {
  const rows = useMemo(() => combination(c.people), [c.people]);
  const tended = c.people.map(p => ({ p, i: tendInput(p) })).filter((x): x is { p: PersonFigures; i: NonNullable<ReturnType<typeof tendInput>> } => !!x.i);
  return (
    <section className="wb-lens wb-machine" aria-label="Person and machine">
      <p className="sub wb-lede">The combination table: each person’s steps on one time scale with the machine’s own run beside them — their own work, their walking, their waiting, the machine running. A machine step starts when the step before it ends and goes on while the person carries on; the cycle is the longer of the two, and the gap is somebody waiting. Mark a step as <b>Machine</b> in its tools on the first tab.</p>
      {!rows.length && (
        <div className="wb-empty">
          <p><b>No machine step yet.</b> Where a person loads a machine and then does other work or waits, add the machine’s run as a step of that person and give it the <b>Machine</b> kind — then the chart, who waits for whom, and how many machines one person can tend are drawn here.</p>
          <button type="button" className="btn" onClick={() => c.goLens('takt')}>Go to the steps</button>
        </div>
      )}
      {rows.map(r => {
        const m = waitMoney(r, c.rate);
        return (
          <div key={r.who} className="wb-cs-p">
            <h3>{r.who}{r.station ? <span className="sub"> at {r.station}</span> : null}</h3>
            <CombinationChart row={r} />
            <p className="wb-key-l sub"><span className="wb-key is-work" aria-hidden /> their own work · <span className="wb-key is-walk" aria-hidden /> walking · <span className="wb-key is-wait" aria-hidden /> waiting · <span className="wb-key is-machine" aria-hidden /> the machine running · the dashed line is takt</p>
            <ul className="wb-cs-list">{r.tl.segs.map(g => <li key={g.id}>{g.name} <span className="sub">{g.start.toFixed(1)}–{g.end.toFixed(1)} s · {KIND_WORD[g.kind]}</span></li>)}</ul>
            <p className={'wb-cs-says is-' + r.tone}>{r.says}</p>
            {m.text && <p className="wb-cs-money">{m.text}</p>}
            {m.missing && <p className="sub">{m.missing}</p>}
          </div>
        );
      })}
      {tended.map(({ p, i }) => <Tend key={p.who} c={c} p={p} i={i} />)}
      {rows.length > 0 && tended.length === 0 && <p className="sub">To say how many machines a person can tend, they need a <b>work</b> step (loading and unloading) and a <b>machine</b> step (its run); add a <b>walk</b> step for the walk between machines.</p>}
    </section>
  );
}

function Tend({ c, p, i }: { c: LensCtx; p: PersonFigures; i: { l: number; m: number; w: number } }) {
  const mine = c.study.facts.tend?.[p.who] ?? {};
  const t = tend(p.who, i, { ...(c.rate ? { operatorRate: c.rate } : {}), ...(mine.machineRate ? { machineRate: mine.machineRate } : {}) });
  const said = tendSays(t, { ...(mine.packsPerCycle ? { packsPerCycle: mine.packsPerCycle } : {}), ...(c.contribution ? { contributionPerPack: c.contribution } : {}) });
  const set = (patch: { machineRate?: number | undefined; packsPerCycle?: number | undefined }) => void patchStudy(c.study.id, cur => {
    const next = { ...(cur.facts.tend?.[p.who] ?? {}), ...patch };
    for (const k of Object.keys(next) as (keyof typeof next)[]) if (next[k] === undefined) delete next[k];
    return { facts: { ...cur.facts, tend: { ...(cur.facts.tend ?? {}), [p.who]: next } } };
  });
  const num = (label: string, v: number | undefined, place: string, on: (n: number | undefined) => void) => (
    <label className="field"><span className="field-label">{label}</span>
      <input className="text-input" inputMode="decimal" defaultValue={v ?? ''} placeholder={place} aria-label={`${label} — ${p.who}`} disabled={!c.editable}
        onBlur={e => { const n = Number(e.target.value); on(e.target.value.trim() && n > 0 ? n : undefined); }} /></label>
  );
  return (
    <div className="wb-tend">
      <h3>How many machines can {p.who} tend?</h3>
      <p className="wb-tend-s"><b>{said.text}</b></p>
      {said.lines.map((l, k) => <p key={k} className="wb-tend-l">{l}</p>)}
      <table className="wb-tbl wb-tend-t">
        <thead><tr><th scope="col">Machines</th><th scope="col">Cycle</th><th scope="col">An hour</th><th scope="col">{p.who} idle</th><th scope="col">Each machine waits</th>{t.rows.some(r => r.operatorCost != null) && <th scope="col">Labour a machine-cycle</th>}{t.rows.some(r => r.allCost != null) && <th scope="col">With the machines</th>}</tr></thead>
        <tbody>
          {t.rows.map(r => (
            <tr key={r.n} className={r.n === t.lo || r.n === t.hi ? 'is-pick' : ''}>
              <th scope="row" data-label="Machines">{r.n}</th>
              <td data-label="Cycle">{secs(r.cycle)}</td>
              <td data-label="An hour">{r.perHour.toFixed(1)}</td>
              <td data-label={`${p.who} idle`} className={r.idle > 0.05 ? 'is-a' : ''}>{r.idle > 0.05 ? secs(r.idle) : '—'}</td>
              <td data-label="Each machine waits" className={r.machineWaits > 0.05 ? 'is-a' : ''}>{r.machineWaits > 0.05 ? secs(r.machineWaits) : '—'}</td>
              {t.rows.some(x => x.operatorCost != null) && <td data-label="Labour a machine-cycle">{r.operatorCost != null ? money(r.operatorCost) : '—'}</td>}
              {t.rows.some(x => x.allCost != null) && <td data-label="With the machines">{r.allCost != null ? money(r.allCost) : '—'}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="wb-tend-in">
        {num('The machine’s cost an hour, £ (optional)', mine.machineRate, 'e.g. 35', n => set({ machineRate: n }))}
        {num('Packs one machine-cycle makes (optional)', mine.packsPerCycle, 'e.g. 10', n => set({ packsPerCycle: n }))}
      </div>
      {!c.rate && <p className="sub">Give the line an hourly rate in Line capacity to say {p.who}’s labour in money.</p>}
      <p className="sub">Synchronous servicing: it assumes identical machines and a fixed cycle. Machines that stop at random keep a person waiting in a way this does not work out — use the chart alone, or time the stops. Waiting steps are left out of it.</p>
    </div>
  );
}

/* ================================================================== ORDER OF THE WORK */

export function OrderLens(c: LensCtx) {
  const { f, a, steps } = c;
  const takt = f.taktSec;
  const items = useMemo(() => f.elements.filter(e => e.kind !== 'wait').map(e => ({ id: e.id, name: e.name, t: e.standard ?? 0, after: e.after })), [f.elements]);
  const given = items.some(i => i.after.length);
  const loop = given ? findLoop(items) : undefined;
  const weights = useMemo(() => (given && !loop ? positionalWeights(items) : {}), [items, given, loop]);
  const ghost = suggest(f);
  const prop = given && !loop && f.taktSec && !f.untimed ? rankedPositional(items, f.taktSec) : undefined;
  const said = prop && 'stations' in prop && f.taktSec ? proposalSays(prop, f.taktSec, f.people.length) : undefined;
  const broken = brokenOrder(f, c.people.map(p => p.who));
  const byId = new Map(f.elements.map(e => [e.id, e]));
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (id: string, needs: string) => c.setStep(id, { after: (() => { const cur = steps.find(s => s.id === id)?.after ?? []; const next = cur.includes(needs) ? cur.filter(x => x !== needs) : [...cur, needs]; return next.length ? next : undefined; })() });
  const use = () => { if (!ghost) return; const to = new Map(ghost.flatMap(g => g.ids.map(id => [id, g.who] as const))); c.setSteps(cur => cur.map(x => ({ ...x, who: to.get(x.id) ?? x.who }))); };
  return (
    <section className="wb-lens wb-order" aria-label="Order of the work">
      <p className="sub wb-lede">Some work can only be done after other work — the base before the filling. Say what each step <b>must follow</b>, and the balance proposed keeps that order: ranked positional weight (a step’s time plus every step that must come after it), heaviest first, a person’s stack closed before it passes takt. It finds a good balance the order allows — it does not prove no better one exists.</p>
      {loop && <p className="ie-say is-r" role="alert">The order goes round in a circle — {loop.map(id => byId.get(id)?.name ?? id).join(' → ')}. A step cannot come before itself; take one of these off.</p>}
      {broken.map(b => <p key={b} className="ie-say is-r">{b}</p>)}
      <ol className="wb-ord">
        {f.elements.map(e => {
          const follows = e.after.map(id => byId.get(id)?.name).filter(Boolean) as string[];
          return (
            <li key={e.id} className="wb-ord-r">
              <div className="wb-ord-h">
                <b>{e.name}</b> <span className="sub">{e.who} · {e.standard != null ? secs(e.standard) : 'not timed yet'}{weights[e.id] != null && e.kind !== 'wait' ? ` · weight ${secs(weights[e.id])}` : ''}</span>
              </div>
              <div className="wb-ord-f">
                <span>{follows.length ? <>Must follow <b>{follows.join(', ')}</b></> : <span className="sub">free to go anywhere</span>}</span>
                {c.editable && e.kind !== 'wait' && <button type="button" className="linkish" aria-expanded={open === e.id} aria-label={`${open === e.id ? 'Done with' : 'Change'} what ${e.name} must follow`} onClick={() => setOpen(o => (o === e.id ? null : e.id))}>{open === e.id ? 'Done' : 'Change'}</button>}
              </div>
              {open === e.id && (
                <div className="chip-row wb-ord-c" role="group" aria-label={`What ${e.name} must follow`}>
                  {f.elements.filter(x => x.id !== e.id && x.kind !== 'wait').map(x => {
                    const on = e.after.includes(x.id);
                    const bad = !on && wouldLoop(items, e.id, x.id);
                    return <button key={x.id} type="button" className={'chip' + (on ? ' on' : '')} aria-pressed={on} disabled={bad} title={bad ? `${x.name} already has to come after ${e.name}` : undefined} onClick={() => toggle(e.id, x.id)}>{x.name}</button>;
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {!f.taktSec && <p className="sub">The balance needs a takt (Line capacity’s target, or agreed on the first tab) before it can be proposed.</p>}
      {f.untimed > 0 && f.taktSec && <p className="sub">{f.untimed} step{f.untimed === 1 ? ' has' : 's have'} no time yet — time them (or type a time) before a balance is proposed.</p>}
      {ghost && takt != null && (
        <div className="wb-prop">
          <h3>A balance that keeps the order</h3>
          {!given && <p className="sub">No order given — the proposal fills the steps in the order they are listed, as the first tab’s suggestion does.</p>}
          {said && <p className={'wb-prop-s is-' + said.tone}>{said.text}</p>}
          <table className="wb-tbl">
            <thead><tr><th scope="col">Person</th><th scope="col">Steps</th><th scope="col">Work</th></tr></thead>
            <tbody>
              {ghost.map(g => (
                <tr key={g.who} className={g.work > takt + 1e-9 ? 'is-r' : ''}>
                  <th scope="row" data-label="Person">{g.who}</th>
                  <td data-label="Steps">{g.ids.map(id => byId.get(id)?.name).join(' · ')}</td>
                  <td data-label="Work">{secs(g.work)} of {secs(takt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="sub">At least {f.fewest} {f.fewest === 1 ? 'person' : 'people'} by the sums (⌈work ÷ takt⌉); {ghost.length} with this order; {f.people.length} working now.</p>
          {c.editable && <button type="button" className="btn btn-primary" onClick={use}>Use it</button>}
        </div>
      )}
      {!ghost && f.taktSec && !f.untimed && f.elements.length > 0 && <p className="sub">A balance is not proposed {f.elements.some(e => e.kind === 'machine') ? 'where a machine’s run is a step — the machine is not a person’s to move' : f.people.some(p => p.per !== 1) ? 'where people count different things (a tray and a pack) — time them on one unit' : 'for this order'}.</p>}
      {a && <p className="sub">Takt {secs(a.taktSec)}.</p>}
    </section>
  );
}

/* ================================================================== IMPROVE */

const HOWS: EcrsHow[] = ['E', 'C', 'R', 'S'];

export function ImproveLens(c: LensCtx) {
  const { f, steps } = c;
  const r = useMemo(() => improve(steps, c.a, c.study.facts.crew), [steps, c.a, c.study.facts.crew]);
  const says = improveSays(r);
  const m = improveMoney(r, c.rate);
  const moneySays = improveMoneySays(m.money, m.missing);
  const byId = new Map(f.elements.map(e => [e.id, e]));
  const who = c.people.map(p => p.who);
  const set = (id: string, how: EcrsHow | null, patch: Partial<NonNullable<BalanceStep['ecrs']>> = {}) => c.setStep(id, { ecrs: how === null ? undefined : (() => { const cur = steps.find(s => s.id === id)?.ecrs; const next = { ...(cur ?? {}), how, ...patch } as NonNullable<BalanceStep['ecrs']>; for (const k of Object.keys(next) as (keyof typeof next)[]) if (next[k] === undefined || next[k] === '' && k !== 'to') delete next[k]; return next; })() });
  const numBox = (label: string, v: number | undefined, on: (n: number | undefined) => void, place = 's') => (
    <label className="wb-im-f"><span className="sub">{label}</span>
      <input className="text-input" inputMode="decimal" defaultValue={v ?? ''} placeholder={place} aria-label={label} disabled={!c.editable}
        onBlur={e => { const n = Number(e.target.value); on(e.target.value.trim() && n >= 0 ? n : undefined); }} /></label>
  );
  return (
    <section className="wb-lens wb-improve" aria-label="Improve each step">
      <p className="sub wb-lede">Once the work is timed, question each step in turn — in this order, because there is no point making easier what should not be done. <b>Eliminate</b> it, <b>Combine</b> it with another, <b>Rearrange</b> it (another place, time or person), or <b>Simplify</b> it. Say what the step is <b>expected</b> to take after; the balance is read again from those expected times. Nothing here changes the timed work — it is expected until the work is timed again.</p>
      <details className="wb-q">
        <summary>The five questions to ask of each step</summary>
        <ol>{QUESTIONS.map(q => <li key={q.q}><b>{q.q}</b> — {q.asks} <span className="sub">(leads to: {q.leads})</span></li>)}</ol>
        <p className="sub">Ask the people who do the work — their ideas are the best source and the reason a change holds. Ask quality and food safety before any check goes.</p>
      </details>
      <div className={'wb-im-says is-' + says.tone}>
        <p className="ie-say">{says.text}</p>
        {says.lines.map(l => <p key={l} className="ie-say ie-cap is-a">{l}</p>)}
        {moneySays && <p className="wb-im-money">{moneySays}</p>}
      </div>
      {c.people.map(p => (
        <div key={p.who} className="wb-im-p">
          <h3>{p.who} <span className="sub">{secs(p.work)} now</span></h3>
          <ul className="wb-im-l">
            {p.elements.map(e => {
              const st = steps.find(s => s.id === e.id);
              const d = st?.ecrs;
              return (
                <li key={e.id} className={'wb-im-r' + (d ? ' is-decided' : '')}>
                  <div className="wb-im-h"><b>{e.name}</b> <span className="sub">{e.standard != null ? secs(e.standard) : 'not timed yet'}{e.kind !== 'work' ? ` · ${KIND_WORD[e.kind]}` : ''}</span></div>
                  <div className="chip-row" role="radiogroup" aria-label={`What to do with ${e.name}`}>
                    <button type="button" role="radio" aria-checked={!d} className={'chip' + (!d ? ' on' : '')} disabled={!c.editable} onClick={() => set(e.id, null)}>Keep</button>
                    {HOWS.map(h => <button key={h} type="button" role="radio" aria-checked={d?.how === h} className={'chip' + (d?.how === h ? ' on' : '')} disabled={!c.editable} onClick={() => set(e.id, h)}>{HOW_WORD[h]}</button>)}
                  </div>
                  {d?.how === 'E' && (
                    <label className="wb-im-f wb-im-wide"><span className="sub">Why it can go (its purpose answered)</span>
                      <input className="text-input" defaultValue={d.why ?? ''} aria-label={`Why ${e.name} can go`} disabled={!c.editable} onBlur={ev => set(e.id, 'E', { why: ev.target.value.trim() || undefined })} /></label>
                  )}
                  {d?.how === 'C' && (
                    <div className="wb-im-fs">
                      <label className="wb-im-f"><span className="sub">Joins</span>
                        <select className="text-input" value={d.into ?? ''} aria-label={`What ${e.name} joins`} disabled={!c.editable} onChange={ev => set(e.id, 'C', { into: ev.target.value || undefined })}>
                          <option value="">choose a step…</option>
                          {f.elements.filter(x => x.id !== e.id).map(x => <option key={x.id} value={x.id}>{x.name} ({x.who})</option>)}
                        </select></label>
                      {numBox('Adds to it (s)', d.afterSec, n => set(e.id, 'C', { afterSec: n }), '0')}
                    </div>
                  )}
                  {d?.how === 'R' && (
                    <div className="wb-im-fs">
                      <label className="wb-im-f"><span className="sub">Goes to</span>
                        <select className="text-input" value={d.to === undefined ? '__same' : d.to} aria-label={`Who takes ${e.name}`} disabled={!c.editable} onChange={ev => set(e.id, 'R', { to: ev.target.value === '__same' ? undefined : ev.target.value })}>
                          <option value="__same">stays with {e.who}</option>
                          {who.filter(w => w !== e.who).map(w => <option key={w} value={w}>{w}</option>)}
                          <option value="">off the line</option>
                        </select></label>
                      {d.to !== '' && numBox('Takes (s)', d.afterSec, n => set(e.id, 'R', { afterSec: n }), e.standard != null ? e.standard.toFixed(1) : 's')}
                    </div>
                  )}
                  {d?.how === 'S' && <div className="wb-im-fs">{numBox('Expected to take (s)', d.afterSec, n => set(e.id, 'S', { afterSec: n }))}</div>}
                  {d && (
                    <div className="wb-im-fs">
                      {numBox('One-off cost, £ (optional)', d.oneOff, n => set(e.id, d.how, { oneOff: n }), '0')}
                      {byId.get(e.id)?.standard != null && d.how !== 'E' && d.afterSec != null && <span className="sub wb-im-d">{secs(e.standard ?? 0)} → {secs(d.afterSec)}</span>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
