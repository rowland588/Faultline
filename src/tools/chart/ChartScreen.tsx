/* THE CONTROL CHART — its page (knowledge/specs/FC-086-charts.md, W2; 24 October 2026).
 *
 * Readings in the order taken against limits set from a steady period and kept, the signals said in
 * words, the CUSUM saying since when; one at a time (individuals and moving range), in subgroups (X̄-R,
 * X̄-S), or pre-control for approving a set-up. The lean page as every tool's (docs/LEAN-PAGE.md): the
 * band with the verdict, the tiles, the sentence and the signals, the picture beside the pad, the action
 * plan and the closing line. The arithmetic is lib/ie/charts, the figures and words ./chart — the paper
 * (lib/studiesPdf chartBlocks) says the same from the same module. */
import { NextStep } from '../../ui/NextStep';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getStudy, onDataChange, patchStudy } from '../../db';
import { useAccess } from '../../cloud/access';
import { useSession } from '../../cloud/session';
import { displayName } from '../../cloud/team';
import { can as canAt } from '../../lib/access';
import { now, uid } from '../../lib/ids';
import { niceDay, isoDay } from '../../lib/weeks';
import { nav } from '../../state/useRoute';
import type { AgreedChart, StudyReading, ToolStudy } from '../../lib/study';
import { StudyBand } from '../../ui/StudyActs';
import { ReadingsPaste } from '../../ui/ReadingsPaste';
import { UnitField } from '../../ui/UnitField';
import { subgroupOf } from '../../lib/pasteReadings';
import { WhereItSits, UsedFor, useBetter, planEmpty } from '../../ui/StudyPlace';
import { LeanActions, LeanClosing, LeanPanel, LeanTiles } from '../../ui/Lean';
import { bandPage } from '../../lib/lean';
import { raisedFrom } from '../losses/lossLean';
import { ALL_RULES, RULE_WORDS, WESTERN_ELECTRIC, type Rule } from '../../lib/ie/charts';
import { chartClosing, chartFigures, chartProblem, chartSays, chartTiles, freezeFrom, LIMITS_FROM, GREENS_TO_QUALIFY, type ChartFigures } from './chart';

const OWNER = canAt('owner');

/** A phone — the width at which the page stacks (styles.css, 719/720). */
const onPhone = (): boolean => { try { return window.matchMedia('(max-width: 719px)').matches; } catch { return false; } };

export function ChartScreen({ id }: { id: string }) {
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
      <h1>This chart isn’t on this device</h1>
      <p className="sub">It may have been deleted, or not synced here yet.</p>
      <button type="button" className="btn" onClick={() => nav('/chart')}>Every control chart</button>
    </div>
  );
  return <Chart s={s} can={can} me={me} />;
}

function Chart({ s, can, me }: { s: ToolStudy; can: ReturnType<typeof canAt>; me?: string }) {
  const a = s.agreed?.chart;
  const readings = useMemo(() => s.facts.readings ?? [], [s.facts.readings]);
  const f = useMemo(() => (a ? chartFigures(a, readings) : undefined), [a, readings]);
  const said = useMemo(() => (a && f ? chartSays(f, a) : undefined), [a, f]);
  const closed = !!s.closedAt;
  const [agreeing, setAgreeing] = useState(false);
  /* ON A PHONE, A CHART NOT YET WORKED OUT MEETS ITS PAD FIRST (tools audit, 30 October): the limits are set from the first twenty
     (five greens qualify a pre-control set-up) — until then the entry is above the tiles; decided once, when the page opens. */
  const [entryFirst] = useState(() => onPhone() && (f?.n ?? 0) < (a?.kind === 'precontrol' ? GREENS_TO_QUALIFY : LIMITS_FROM));
  const write = (p: Parameters<typeof patchStudy>[1]) => void patchStudy(s.id, p);
  const { steps, tests } = useBetter(s, me);

  const add = (r: Omit<StudyReading, 'id' | 'at'>) =>
    write(cur => ({ facts: { ...cur.facts, readings: [...(cur.facts.readings ?? []), { id: uid(), at: now(), ...(me ? { who: me } : {}), ...r }] } }));
  /* a paste — every reading in at once, and how to take that very paste out again (one Undo; ui/ReadingsPaste) */
  const addMany = (rs: Omit<StudyReading, 'id' | 'at'>[]): (() => void) => {
    const made = rs.map(r => ({ id: uid(), at: now(), ...(me ? { who: me } : {}), ...r }));
    write(cur => ({ facts: { ...cur.facts, readings: [...(cur.facts.readings ?? []), ...made] } }));
    return () => { const gone = new Set(made.map(r => r.id)); write(cur => ({ facts: { ...cur.facts, readings: (cur.facts.readings ?? []).filter(r => !gone.has(r.id)) } })); };
  };
  const strike = (rid: string, struck: boolean) =>
    write(cur => ({ facts: { ...cur.facts, readings: (cur.facts.readings ?? []).map(r => (r.id === rid ? { ...r, struck: struck || undefined } : r)) } }));
  const note = (rid: string, text: string) =>
    write(cur => ({ facts: { ...cur.facts, readings: (cur.facts.readings ?? []).map(r => (r.id === rid ? { ...r, ...(text ? { note: text } : { note: undefined }) } : r)) } }));
  /* THE LIMITS SET FROM A STEADY PERIOD — kept; set again only by a tap that says so, the old kept for the paper */
  const setLimits = (again: boolean) => {
    if (!a) return;
    const live = readings.filter(r => !r.struck && typeof r.value === 'number').length;
    const span = a.kind === 'xbar' ? LIMITS_FROM * (a.subgroup ?? 4) : LIMITS_FROM;
    const to = Math.min(live, span), from = again ? Math.max(1, live - span + 1) : 1;
    const fr = freezeFrom(a, readings, from, again ? live : to, now(), me);
    if (!fr) return;
    write(cur => ({ agreed: { ...cur.agreed, chart: { ...(cur.agreed?.chart as AgreedChart), frozen: fr, ...(again && cur.agreed?.chart?.frozen ? { frozenBefore: [...(cur.agreed.chart.frozenBefore ?? []), cur.agreed.chart.frozen] } : {}) } } }));
  };

  const entry = a && f && !closed && can.edit ? <ChartPad a={a} f={f} readings={readings} onAdd={add} onAddMany={addMany} onNote={note} onStrike={rid => strike(rid, true)} /> : null;
  const page = bandPage('Control chart', s, said?.verdict, said?.tone);
  return (
    <div className="wrap ie ie-chart">
      <StudyBand page={page} s={s} what="Control chart" canEdit={can.edit && !closed} canRemove={can.remove} />
      <div className="ln-under">
        <p className="sub ie-where">{s.machine ? <><b>{s.machine}</b> · </> : null}started {niceDay(isoDay(s.startedAt))}</p>
        <WhereItSits s={s} can={can} />
      </div>
      {!a || agreeing ? (
        <Agree s={s} canAgree={can.agree && !closed} hasReadings={readings.length > 0} onDone={() => setAgreeing(false)} cancel={a ? () => setAgreeing(false) : undefined} />
      ) : f && said && (
        <>
          {entryFirst && entry && <div className="ie-body ie-entry-first">{entry}</div>}
          <LeanTiles tiles={chartTiles(f, a)} className="ie-strip" />
          <div className="ie-says">
            <p className={'ie-say is-' + said.tone}>{said.text}</p>
            {said.signals.length > 0 && (
              <ul className="ie-signals" aria-label="The signals">
                {said.signals.map((g, i) => <li key={i} className={'ie-signal is-' + g.tone} data-signal><b>{g.text}</b><span className="sub"> — {g.means}</span></li>)}
              </ul>
            )}
          </div>
          <NextStep s={s} canEdit={can.edit && !closed} />
          {a.kind !== 'precontrol' && f.centre !== undefined && can.edit && !closed && (
            <p className="ie-limits-act sub">
              {f.provisional
                ? <>Limits provisional — <button type="button" className="btn btn-primary" onClick={() => setLimits(false)}>Set the limits</button> keeps them from the first {f.from?.n ?? LIMITS_FROM}, so they stop moving with every reading.</>
                : <>Limits set {a.frozen?.at ? niceDay(isoDay(a.frozen.at)) : ''}{a.frozen?.who ? ` by ${a.frozen.who}` : ''} from {a.kind === 'xbar' ? 'subgroups' : 'readings'} {a.frozen?.from}–{a.frozen?.to}. <button type="button" className="linkish" onClick={() => setLimits(true)}>Set them again from the latest {LIMITS_FROM}</button></>}
              {(a.frozenBefore ?? []).length > 0 && <> · set before: {(a.frozenBefore ?? []).map(b => `${b.centre.toFixed(f.dp + 1)} (${b.n})`).join(', ')}</>}
            </p>
          )}
          <div className="ie-body">
            <div className="ie-pic tool-sig-chart"><ChartPic f={f} a={a} said={said.text} /></div>
            {!entryFirst && entry}
          </div>
          <ChartReadings readings={readings} f={f} a={a} canStrike={can.edit && !closed} onStrike={strike} />
          <p className="ie-agreed sub">
            Agreed: <b>{agreedWords(a)}</b>
            {can.agree && !closed && <button type="button" className="linkish" onClick={() => setAgreeing(true)}>Change what was agreed</button>}
          </p>
          <UsedFor s={s} can={can} me={me} />
          <LeanPanel title="Action plan" className="ln-solo ln-plan-p">
            <LeanActions actions={raisedFrom(s, steps, tests)} empty={planEmpty(s, 'a signal')} />
          </LeanPanel>
          <LeanClosing closing={chartClosing(f, a, said)} />
        </>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- agreeing */
const KINDS: { k: AgreedChart['kind']; word: string; eg: string }[] = [
  { k: 'xmr', word: 'One reading at a time', eg: 'a weight every twenty minutes — individuals and moving range' },
  { k: 'xbar', word: 'Subgroups', eg: 'four packs an hour — X̄-R, and X̄-S from 11' },
  { k: 'precontrol', word: 'Pre-control', eg: 'approving a set-up: five greens, then pairs' },
];
/** What each signal CATCHES, in the floor's words — the technical name stays beneath it. (Screen only: the signals' own words,
 *  lib/ie/charts RULE_WORDS, are what the chart's sentences and the paper say.) */
const CATCHES: Record<Rule, string> = {
  beyond: 'One reading far out — past a control limit',
  run: 'A step change — eight in a row on the same side of the middle',
  trend: 'A drift — six in a row climbing or falling',
  alternate: 'Over-adjusting — fourteen in a row zig-zagging up and down',
  '2of3': 'A shift starting — two of three readings well off to one side',
  '4of5': 'A small shift that stays — four of five a little off to one side',
  inside: 'Too steady — fifteen in a row hugging the middle (a stuck gauge?)',
  outside: 'Two streams mixed — eight in a row off the middle, on both sides',
};
const num = (t: string): number | undefined => (t.trim() === '' || !Number.isFinite(Number(t)) ? undefined : Number(t));

function Agree({ s, canAgree, hasReadings, onDone, cancel }: { s: ToolStudy; canAgree: boolean; hasReadings: boolean; onDone: () => void; cancel?: () => void }) {
  const a = s.agreed?.chart;
  const [kind, setKind] = useState<AgreedChart['kind']>(a?.kind ?? 'xmr');
  const [name, setName] = useState(a?.name ?? s.name ?? '');
  const [unit, setUnit] = useState(a?.unit ?? '');   // never assumed: a temperature is not in grams (tools audit, 30 October)
  const [target, setTarget] = useState(a?.target?.toString() ?? '');
  const [lower, setLower] = useState(a?.lower?.toString() ?? '');
  const [upper, setUpper] = useState(a?.upper?.toString() ?? '');
  const [subgroup, setSubgroup] = useState((a?.subgroup ?? 4).toString());
  const [shift, setShift] = useState(a?.cusum?.shift?.toString() ?? '');
  const [ewma, setEwma] = useState(!!a?.ewma);
  const [products, setProducts] = useState(!!a?.products);
  const [rules, setRules] = useState<Rule[]>([...(a?.rules ?? WESTERN_ELECTRIC)]);
  if (!canAgree) return <div className="ie-agree is-wait"><h2>Waiting for it to be agreed</h2><p className="sub">What is measured and how the chart is judged is agreed by the project’s owner first.</p></div>;
  const draft: AgreedChart = { kind, name: name.trim(), ...(unit.trim() ? { unit: unit.trim() } : {}), ...(num(target) !== undefined ? { target: num(target) } : {}),
    ...(num(lower) !== undefined ? { lower: num(lower) } : {}), ...(num(upper) !== undefined ? { upper: num(upper) } : {}),
    ...(kind === 'xbar' ? { subgroup: Math.round(Number(subgroup)) } : {}),
    ...(shift.trim() !== '' && kind !== 'precontrol' ? { cusum: { shift: Number(shift) } } : {}) };
  const problem = [lower, upper, target, shift].some(t => t.trim() !== '' && !Number.isFinite(Number(t))) ? 'Numbers only in the boxes.' : chartProblem(draft);
  const save = () => {
    if (problem) return;
    const agreed: AgreedChart = { ...draft,
      ...(kind !== 'precontrol' && JSON.stringify([...rules].sort()) !== JSON.stringify([...WESTERN_ELECTRIC].sort()) ? { rules } : {}),
      ...(kind !== 'precontrol' && ewma ? { ewma: true } : {}),
      ...(kind === 'xmr' && products ? { products: true } : {}),
      ...(a?.frozen ? { frozen: a.frozen } : {}), ...(a?.frozenBefore ? { frozenBefore: a.frozenBefore } : {}) };
    void patchStudy(s.id, cur => ({ name: cur.name || agreed.name, agreed: { ...cur.agreed, chart: agreed } }));
    onDone();
  };
  const toggle = (r: Rule) => setRules(cur => (cur.includes(r) ? cur.filter(x => x !== r) : [...cur, r]));
  return (
    <form className="ie-agree" onSubmit={e => { e.preventDefault(); save(); }}>
      <h2>{a ? 'What the chart is judged against' : 'What is measured, and how it is judged'}</h2>
      <p className="sub">{hasReadings ? 'Changing what was agreed re-reads every reading against it.' : 'Agreed once, before the readings — the limits are then set from the first twenty and kept.'}</p>
      <div className="ie-kinds" role="radiogroup" aria-label="Which chart?">
        <span className="field-label">Which chart?</span>
        {KINDS.map(x => (
          <button key={x.k} type="button" role="radio" aria-checked={kind === x.k} className={'ie-kind' + (kind === x.k ? ' on' : '')} onClick={() => setKind(x.k)}>
            <b>{x.word}</b><small>{x.eg}</small>
          </button>
        ))}
      </div>
      <div className="ie-agree-grid">
        <label className="field"><span className="field-label">What is measured</span>
          <input className="text-input" value={name} maxLength={80} onChange={e => setName(e.target.value)} placeholder="Fill weight" /></label>
        <UnitField value={unit} onChange={setUnit} />
        {kind !== 'precontrol' && <label className="field"><span className="field-label">Target <i className="sub">the nominal — optional</i></span>
          <input className="text-input" inputMode="decimal" value={target} onChange={e => setTarget(e.target.value)} placeholder="400" /></label>}
        <label className="field"><span className="field-label">Lower specification limit {kind !== 'precontrol' && <i className="sub">optional</i>}</span>
          <input className="text-input" inputMode="decimal" value={lower} onChange={e => setLower(e.target.value)} placeholder="396" /></label>
        <label className="field"><span className="field-label">Upper specification limit {kind !== 'precontrol' && <i className="sub">optional</i>}</span>
          <input className="text-input" inputMode="decimal" value={upper} onChange={e => setUpper(e.target.value)} placeholder="404" /></label>
        {kind === 'xbar' && <label className="field"><span className="field-label">Readings in a subgroup</span>
          <input className="text-input" inputMode="numeric" value={subgroup} onChange={e => setSubgroup(e.target.value)} placeholder="4" /></label>}
        {kind !== 'precontrol' && <label className="field"><span className="field-label">The shift worth catching <i className="sub">for the CUSUM — optional, in the unit</i></span>
          <input className="text-input" inputMode="decimal" value={shift} onChange={e => setShift(e.target.value)} placeholder="0.8" /></label>}
      </div>
      {kind !== 'precontrol' && (
        <fieldset className="ie-rules">
          <legend className="field-label">What should it watch for? <i className="sub">four are on to start with — tick any more you want</i></legend>
          {ALL_RULES.map(r => (
            <label key={r} className="ie-rule"><input type="checkbox" checked={rules.includes(r)} onChange={() => toggle(r)} aria-labelledby={`ie-rule-${r}`} aria-describedby={`ie-rule-${r}-n`} />
              <span className="ie-rule-w"><span id={`ie-rule-${r}`}>{CATCHES[r]}</span><small id={`ie-rule-${r}-n`} className="sub">{RULE_WORDS[r].name[0].toUpperCase() + RULE_WORDS[r].name.slice(1)} · {WESTERN_ELECTRIC.includes(r) ? 'Western Electric rule' : 'Nelson rule'}</small></span></label>
          ))}
          <label className="ie-rule"><input type="checkbox" checked={ewma} onChange={e => setEwma(e.target.checked)} /> <span className="ie-rule-w"><span>Draw the running level — a smoothed line that shows a slow drift early</span><small className="sub">EWMA</small></span></label>
          {kind === 'xmr' && <label className="ie-rule"><input type="checkbox" checked={products} onChange={e => setProducts(e.target.checked)} /> <span className="ie-rule-w"><span>Many products on one chart — each reading says its product and nominal</span><small className="sub">Short-run chart</small></span></label>}
        </fieldset>
      )}
      {problem && <p className="ie-problem">{problem}</p>}
      <div className="ie-agree-act">
        <button type="submit" className="btn btn-primary" disabled={!!problem}>Agree these</button>
        {cancel && <button type="button" className="btn" onClick={cancel}>Keep what was agreed</button>}
      </div>
    </form>
  );
}

export function agreedWords(a: AgreedChart): string {
  const u = a.unit ? ` ${a.unit}` : '';
  const what = a.kind === 'xmr' ? 'individuals and moving range' : a.kind === 'xbar' ? `subgroups of ${a.subgroup}` : 'pre-control';
  const lim = a.lower !== undefined && a.upper !== undefined ? ` · specification ${a.lower}–${a.upper}${u}` : a.lower !== undefined ? ` · at least ${a.lower}${u}` : a.upper !== undefined ? ` · at most ${a.upper}${u}` : '';
  return `${a.name} — ${what}${lim}${a.target !== undefined ? ` · target ${a.target}${u}` : ''}${a.cusum ? ` · CUSUM for a ${a.cusum.shift}${u} shift` : ''}${a.products ? ' · many products' : ''}`;
}

/* ---------------------------------------------------------------- the pad */
const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫'];
const NOTES = ['Adjusted', 'New reel', 'Restart'];

function ChartPad({ a, f, readings, onAdd, onAddMany, onNote, onStrike }: {
  a: AgreedChart; f: ChartFigures; readings: StudyReading[];
  onAdd: (r: Omit<StudyReading, 'id' | 'at'>) => void; onAddMany: (rs: Omit<StudyReading, 'id' | 'at'>[]) => () => void; onNote: (id: string, text: string) => void; onStrike: (id: string) => void;
}) {
  const [typed, setTyped] = useState('');
  const [product, setProduct] = useState(() => [...readings].reverse().find(r => r.product)?.product ?? '');
  const [nominal, setNominal] = useState(() => [...readings].reverse().find(r => r.nominal !== undefined)?.nominal?.toString() ?? '');
  const [free, setFree] = useState('');
  const m = a.kind === 'xbar' ? Math.max(2, a.subgroup ?? 4) : 0;
  const press = useCallback((k: string) => {
    setTyped(t => (k === '⌫' ? t.slice(0, -1) : k === '.' ? (t.includes('.') ? t : (t || '0') + '.') : k === '-' ? (t.startsWith('-') ? t.slice(1) : '-' + t) : (t + k).slice(0, 12)));
  }, []);
  const enter = useCallback(() => {
    const v = Number(typed);
    if (typed.trim() === '' || typed === '-' || !Number.isFinite(v)) return;
    if (a.products && (!product.trim() || num(nominal) === undefined)) return;
    onAdd({ value: v, ...(m ? { group: subgroupOf(readings.length, m) } : {}), ...(a.products ? { product: product.trim(), nominal: num(nominal) as number } : {}) });
    setTyped('');
  }, [typed, a.products, product, nominal, m, readings.length, onAdd]);
  /* a keyboard types into the pad too, unless a box has the focus */
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      if (/^[0-9]$/.test(e.key) || e.key === '.') { press(e.key); e.preventDefault(); }
      else if (e.key === 'Backspace') { press('⌫'); e.preventDefault(); }
      else if (e.key === 'Enter') { enter(); e.preventDefault(); }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [press, enter]);
  const live = readings.map((r, i) => ({ ...r, no: i + 1 })).filter(r => !r.struck);
  const last = live.slice(-3).reverse();
  const inGroup = m ? readings.length % m : 0;
  const unit = a.unit ? ` ${a.unit}` : '';
  return (
    <div className="ie-cap-box" aria-label="Take the readings">
      <div className="ie-count"><b>{a.kind === 'xbar' ? f.points.length : f.n}</b> {a.kind === 'xbar' ? `subgroups of ${m}${inGroup ? ` · ${inGroup} of ${m} in the next` : ''}` : a.kind === 'precontrol' ? `readings · ${f.pre?.qualified ? 'qualified' : `${f.pre?.greens ?? 0} of ${GREENS_TO_QUALIFY} greens`}` : f.provisional ? `readings · limits from ${LIMITS_FROM}` : 'readings'}</div>
      {a.products && (
        <div className="ie-agree-grid ie-products">
          <label className="field"><span className="field-label">Product</span>
            <input className="text-input" value={product} maxLength={60} onChange={e => setProduct(e.target.value)} placeholder="Finest Red 2kg" list="chart-products" /></label>
          <label className="field"><span className="field-label">Its nominal</span>
            <input className="text-input" inputMode="decimal" value={nominal} onChange={e => setNominal(e.target.value)} placeholder="250" /></label>
          <datalist id="chart-products">{[...new Set(readings.map(r => r.product).filter((x): x is string => !!x))].map(p => <option key={p} value={p} />)}</datalist>
        </div>
      )}
      <output className={'ie-typed' + (typed ? '' : ' is-empty')} aria-live="polite">{typed || '0'}{a.unit ? <small> {a.unit}</small> : null}</output>
      <div className="ie-pad" role="group" aria-label="Number pad">
        {KEYS.map(k => <button key={k} type="button" className="ie-key" onClick={() => press(k)} aria-label={k === '⌫' ? 'Delete' : k}>{k}</button>)}
        <button type="button" className="ie-key ie-enter" onClick={enter} aria-label="Enter the reading" disabled={!typed || !Number.isFinite(Number(typed)) || (!!a.products && (!product.trim() || num(nominal) === undefined))}>↵</button>
      </div>
      {/* THE SAME READINGS BY ANOTHER WAY IN — pasted from a sheet or a printout (ui/ReadingsPaste, one mechanism with the Analysis). In
          subgroups a paste fills them in order, carrying on from a half-full one; with many products every reading takes the product and
          nominal typed above. */}
      <ReadingsPaste label="Or paste readings — a number to a line, or spaced"
        hint={m ? `They fill subgroups of ${m} in the order given${inGroup ? `, carrying on from the ${inGroup} already in the next` : ''}.` : 'In the order taken, the first first.'}
        disabled={a.products && (!product.trim() || num(nominal) === undefined) ? 'Say the product and its nominal above first — every pasted reading carries them.' : undefined}
        onAdd={p => onAddMany(p.values.map((value, i) => ({ value, ...(m ? { group: subgroupOf(readings.length + i, m) } : {}), ...(a.products ? { product: product.trim(), nominal: num(nominal) as number } : {}) })))} />
      {last.length > 0 && (
        <>
          <ul className="ie-last" aria-label="The last readings">
            {last.map(r => (
              <li key={r.id}>
                <span className="ie-no">{r.no}</span>
                <b>{typeof r.value === 'number' ? `${r.value}${unit}` : '—'}{r.product ? ` · ${r.product}` : ''}{r.note ? ` · ${r.note}` : ''}</b>
                <button type="button" className="linkish" onClick={() => onStrike(r.id)} aria-label={`Strike reading ${r.no}`}>Strike</button>
              </li>
            ))}
          </ul>
          <div className="chip-row ie-notes" role="group" aria-label="What was done at the last reading">
            <span className="sub">At reading {live[live.length - 1].no}:</span>
            {NOTES.map(n => <button key={n} type="button" className={'chip' + (live[live.length - 1].note === n ? ' on' : '')} onClick={() => onNote(live[live.length - 1].id, live[live.length - 1].note === n ? '' : n)}>{n}</button>)}
            <input className="text-input ie-note-in" value={free} maxLength={40} placeholder="Something else done" aria-label="Something else done" onChange={e => setFree(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (free.trim()) { onNote(live[live.length - 1].id, free.trim()); setFree(''); } } }} />
          </div>
        </>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- the picture */
const sr0 = (f: ChartFigures): boolean => !!f.shortRun;
const W = 640, H = 230, P = { l: 12, r: 112, t: 14, b: 22 };
const MH = 90;

function ChartPic({ f, a, said }: { f: ChartFigures; a: AgreedChart; said: string }) {
  const pts = f.points;
  if (!pts.length) return <p className="sub ie-pic-empty">Each reading lands here as a point, in the order taken, between its limits.</p>;
  const dp = f.dp;
  const slots = Math.max(pts.length, 20, 2);
  const x = (i: number) => P.l + (i / (slots - 1)) * (W - P.l - P.r);
  const ys = [...pts.map(p => p.y), ...(f.lcl !== undefined ? [f.lcl] : []), ...(f.ucl !== undefined ? [f.ucl] : []), ...(f.centre !== undefined ? [f.centre] : []),
    ...(f.pre ? [f.pre.nominal - f.pre.t * 1.15, f.pre.nominal + f.pre.t * 1.15] : [])];
  let lo = Math.min(...ys), hi = Math.max(...ys);
  const span = Math.max(hi - lo, Math.abs(hi) * 0.002, 1e-6);
  lo -= span * 0.1; hi += span * 0.1;
  const y = (v: number) => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);
  /* the lines the chart draws, each with its words on the right — a specification limit only when it falls inside what the
     chart shows (a wide tolerance would flatten the limits), and the words nudged apart where two lines are close */
  const inside = (v: number) => v >= lo && v <= hi;
  const drawn: { v: number; cls: string; label: string }[] = [];
  if (!f.pre && a.lower !== undefined && inside(a.lower)) drawn.push({ v: a.lower, cls: 'ie-lim2', label: `spec ${a.lower}` });
  if (!f.pre && a.upper !== undefined && inside(a.upper)) drawn.push({ v: a.upper, cls: 'ie-lim2', label: `spec ${a.upper}` });
  if (a.target !== undefined && !sr0(f) && inside(a.target)) drawn.push({ v: a.target, cls: 'ie-nom', label: `target ${a.target}` });
  if (f.ucl !== undefined) drawn.push({ v: f.ucl, cls: 'ie-ucl' + (f.provisional ? ' is-prov' : ''), label: `UCL ${f.ucl.toFixed(dp + 1)}` });
  if (f.lcl !== undefined) drawn.push({ v: f.lcl, cls: 'ie-ucl' + (f.provisional ? ' is-prov' : ''), label: `LCL ${f.lcl.toFixed(dp + 1)}` });
  if (f.centre !== undefined && !f.pre) drawn.push({ v: f.centre, cls: 'ie-mean', label: `centre ${f.centre.toFixed(dp + 1)}` });
  const placed = [...drawn].sort((p, q) => y(p.v) - y(q.v)).reduce<{ d: typeof drawn[number]; ty: number }[]>((acc, d) => { const ty = acc.length ? Math.max(y(d.v) + 5, acc[acc.length - 1].ty + 19) : y(d.v) + 5; acc.push({ d, ty }); return acc; }, []);
  const lines = placed.map(({ d, ty }) => <g key={d.cls + d.label}><line className={d.cls} x1={P.l} x2={W - P.r} y1={y(d.v)} y2={y(d.v)} /><text className="ie-lw" x={W - P.r + 8} y={ty}>{d.label}</text></g>);
  const sr = f.shortRun;
  return (
    <div className="ie-ch-pic">
      <svg className="ie-dots ie-ch" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={said}>
        {f.pre && (
          <g className="ie-ch-zones">
            <rect className="z-red" x={P.l} width={W - P.l - P.r} y={y(f.pre.nominal + f.pre.t * 1.15)} height={y(f.pre.nominal + f.pre.t) - y(f.pre.nominal + f.pre.t * 1.15)} />
            <rect className="z-amber" x={P.l} width={W - P.l - P.r} y={y(f.pre.nominal + f.pre.t)} height={y(f.pre.nominal + f.pre.t / 2) - y(f.pre.nominal + f.pre.t)} />
            <rect className="z-green" x={P.l} width={W - P.l - P.r} y={y(f.pre.nominal + f.pre.t / 2)} height={y(f.pre.nominal - f.pre.t / 2) - y(f.pre.nominal + f.pre.t / 2)} />
            <rect className="z-amber" x={P.l} width={W - P.l - P.r} y={y(f.pre.nominal - f.pre.t / 2)} height={y(f.pre.nominal - f.pre.t) - y(f.pre.nominal - f.pre.t / 2)} />
            <rect className="z-red" x={P.l} width={W - P.l - P.r} y={y(f.pre.nominal - f.pre.t)} height={y(f.pre.nominal - f.pre.t * 1.15) - y(f.pre.nominal - f.pre.t)} />
          </g>
        )}
        {lines}
        {f.ewma && <polyline className="ie-ewma" fill="none" points={f.ewma.z.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />}
        {sr?.boundaries.map(b => <g key={b}><line className="ie-bound" x1={(x(b - 2) + x(b - 1)) / 2} x2={(x(b - 2) + x(b - 1)) / 2} y1={P.t} y2={H - P.b} /><text className="ie-hx" x={(x(b - 2) + x(b - 1)) / 2 + 4} y={P.t + 8}>{pts[b - 1]?.product}</text></g>)}
        {pts.map((p, i) => (
          <g key={p.id + i} data-point={p.no} data-state={p.state}>
            {p.state === 'signal' && <circle className="ie-flag" cx={x(i)} cy={y(p.y)} r={10} />}
            <circle className={'ie-dot' + (p.state === 'beyond' ? ' is-out' : '') + (p.short ? ' is-short' : '') + (p.zone ? ' z-' + p.zone : '')} cx={x(i)} cy={y(p.y)} r={6} />
            {p.note && <text className="ie-hx" x={x(i)} y={H - 6} textAnchor="middle">{p.note}</text>}
          </g>
        ))}
      </svg>
      {f.spreadUcl !== undefined && pts.some(p => p.spread !== undefined) && <SpreadPic f={f} slots={slots} />}
      {f.cusum && <CusumPic f={f} slots={slots} unit={a.unit} />}
    </div>
  );
}

/** The moving range, or the subgroup's range (s), under the points against its own limit. */
function SpreadPic({ f, slots }: { f: ChartFigures; slots: number }) {
  const vs = f.points.map(p => p.spread).filter((v): v is number => v !== undefined);
  const top = Math.max(f.spreadUcl ?? 0, ...vs) * 1.15 || 1;
  const x = (i: number) => P.l + (i / (slots - 1)) * (W - P.l - P.r);
  const bw = Math.max(3, (W - P.l - P.r) / slots - 4), yy = (v: number) => 14 + (1 - v / top) * (MH - 14 - 14);
  return (
    <svg className="ie-dots ie-ch-spread" viewBox={`0 0 ${W} ${MH}`} role="img" aria-label={f.kind === 'xmr' ? 'The moving range' : 'The range within each subgroup'}>
      <text className="ie-hx" x={P.l} y={10}>{f.kind === 'xmr' ? 'moving range' : f.m && f.m > 10 ? 'standard deviation' : 'range'}</text>
      {f.spreadUcl !== undefined && <g><line className="ie-ucl" x1={P.l} x2={W - P.r} y1={yy(f.spreadUcl)} y2={yy(f.spreadUcl)} /><text className="ie-lw" x={W - P.r + 8} y={yy(f.spreadUcl) + 5}>UCL {f.spreadUcl.toFixed(f.dp + 1)}</text></g>}
      {f.points.map((p, i) => p.spread === undefined ? null : <rect key={p.id + i} className={'ie-bar' + (f.spreadUcl !== undefined && p.spread > f.spreadUcl ? ' is-out' : '')} x={x(i) - bw / 2} width={bw} y={yy(p.spread)} height={MH - 14 - yy(p.spread)} />)}
    </svg>
  );
}

/** The CUSUM's two sums against H, the signal marked. */
function CusumPic({ f, slots, unit }: { f: ChartFigures; slots: number; unit?: string }) {
  const c = f.cusum;
  if (!c) return null;
  const top = Math.max(c.h, ...c.plus, ...c.minus) * 1.15 || 1;
  const x = (i: number) => P.l + (i / (slots - 1)) * (W - P.l - P.r), yy = (v: number) => 14 + (1 - v / top) * (MH - 14 - 14);
  return (
    <svg className="ie-dots ie-ch-cusum" viewBox={`0 0 ${W} ${MH}`} role="img" aria-label={c.signal !== undefined ? `CUSUM: signalled at ${c.signal}, since about ${c.since}` : 'CUSUM: no drift found'}>
      <text className="ie-hx" x={P.l} y={10}>CUSUM{unit ? ` (${unit})` : ''} — high side and low side against H</text>
      <g><line className="ie-lim" x1={P.l} x2={W - P.r} y1={yy(c.h)} y2={yy(c.h)} /><text className="ie-lw" x={W - P.r + 8} y={yy(c.h) + 5}>H {c.h.toFixed(f.dp + 1)}</text></g>
      <polyline className="ie-cum" fill="none" points={c.plus.map((v, i) => `${x(i)},${yy(v)}`).join(' ')} />
      <polyline className="ie-cum is-low" fill="none" points={c.minus.map((v, i) => `${x(i)},${yy(v)}`).join(' ')} />
      {c.signal !== undefined && <circle className="ie-flag" cx={x(c.signal - 1)} cy={yy((c.side === 'above' ? c.plus : c.minus)[c.signal - 1])} r={9} />}
      {c.since !== undefined && <text className="ie-hx" x={x(c.since - 1)} y={MH - 3} textAnchor="middle">since</text>}
    </svg>
  );
}

/* ----------------------------------------------------------- the readings */
function ChartReadings({ readings, f, a, canStrike, onStrike }: { readings: StudyReading[]; f: ChartFigures; a: AgreedChart; canStrike: boolean; onStrike: (id: string, struck: boolean) => void }) {
  if (!readings.length) return null;
  const state = new Map(f.points.map(p => [p.id, p]));
  const unit = a.unit ? ` ${a.unit}` : '';
  return (
    <details className="ie-readings" open={readings.length <= 24}>
      <summary>Every reading <span className="sub">({f.n}{readings.length !== f.n ? ` of ${readings.length}, ${readings.length - f.n} struck` : ''})</span></summary>
      <ol className="ie-rows">
        {readings.map((r, i) => {
          const p = state.get(r.id);
          return (
            <li key={r.id} className={r.struck ? 'is-struck' : p?.state === 'beyond' ? 'is-out' : p?.state === 'signal' ? 'is-flag' : ''} data-reading={i + 1}>
              <span className="ie-no">{i + 1}</span>
              <b>{typeof r.value === 'number' ? `${r.value}${unit}` : '—'}{r.product ? ` · ${r.product}` : ''}{r.note ? ` · ${r.note}` : ''}{p?.zone ? ` · ${p.zone}` : ''}</b>
              {r.struck ? <span className="sub">struck</span> : p?.state === 'beyond' ? <span className="sub">beyond</span> : p?.state === 'signal' ? <span className="sub">in a signal</span> : null}
              {canStrike && <button type="button" className="linkish" onClick={() => onStrike(r.id, !r.struck)} aria-label={`${r.struck ? 'Bring back' : 'Strike'} reading ${i + 1}`}>{r.struck ? 'Bring back' : 'Strike'}</button>}
            </li>
          );
        })}
      </ol>
    </details>
  );
}
