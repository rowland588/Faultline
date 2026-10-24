/* THE ANALYSIS — its page (knowledge/specs/FC-105-analysis.md, W3a; 24 October 2026).
 *
 * One question asked first — how sure am I of this figure, did it change, do two ways of measuring agree,
 * how many readings do I need — then the readings or counts that answer it, typed on the pad or pasted,
 * and the answer in words with its figure and its margin, "we can be 95% confident". The lean page as every
 * tool's (docs/LEAN-PAGE.md): the band with the verdict, the tiles, the sentence, the picture beside the
 * entry, the checks, the action plan and the closing line. The arithmetic is lib/ie/stats, the figures and
 * words ./analysis — the paper (lib/studiesPdf analysisBlocks) says the same from the same module. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getStudy, onDataChange, patchStudy } from '../../db';
import { useAccess } from '../../cloud/access';
import { useSession } from '../../cloud/session';
import { displayName } from '../../cloud/team';
import { can as canAt } from '../../lib/access';
import { labourPerHour } from '../../lib/cost';
import { now, uid } from '../../lib/ids';
import { niceDay, isoDay } from '../../lib/weeks';
import { nav } from '../../state/useRoute';
import type { AgreedAnalysis, AnalysisPlan, StudyReading, ToolStudy } from '../../lib/study';
import { StudyBand } from '../../ui/StudyActs';
import { WhereItSits, UsedFor, useBetter } from '../../ui/StudyPlace';
import { LeanActions, LeanClosing, LeanPanel, LeanTiles } from '../../ui/Lean';
import { bandPage } from '../../lib/lean';
import { useLine } from '../linework/WorkBalance';
import { raisedFrom } from '../losses/lossLean';
import { CONFIDENCES } from '../../lib/ie/stats';
import { analysisClosing, analysisFigures, analysisPicture, analysisProblem, analysisSays, analysisTiles, confidenceOf, KIND_WORDS, parsePasted, pctWord, planProblem, type PicRow } from './analysis';

const OWNER = canAt('owner');

export function AnalysisScreen({ id }: { id: string }) {
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
      <h1>This analysis isn’t on this device</h1>
      <p className="sub">It may have been deleted, or not synced here yet.</p>
      <button type="button" className="btn" onClick={() => nav('/analysis')}>Every analysis</button>
    </div>
  );
  return <Analysis s={s} can={can} me={me} />;
}

const num = (t: string): number | undefined => (t.trim() === '' || !Number.isFinite(Number(t)) ? undefined : Number(t));

function Analysis({ s, can, me }: { s: ToolStudy; can: ReturnType<typeof canAt>; me?: string }) {
  const a = s.agreed?.analysis;
  const readings = useMemo(() => s.facts.readings ?? [], [s.facts.readings]);
  const line = useLine(s.workspaceId);
  const rate = line?.labourRatePerHour && line.labourRatePerHour > 0 ? labourPerHour({ crew: 1, labourRatePerHour: line.labourRatePerHour, labourBurden: line.labourBurden }) : undefined;
  const f = useMemo(() => (a ? analysisFigures(a, readings, { rate }) : undefined), [a, readings, rate]);
  const said = useMemo(() => (a && f ? analysisSays(f, a) : undefined), [a, f]);
  const closed = !!s.closedAt;
  const [agreeing, setAgreeing] = useState(false);
  const write = (p: Parameters<typeof patchStudy>[1]) => void patchStudy(s.id, p);
  const { steps, tests } = useBetter(s, me);
  const add = (rs: Omit<StudyReading, 'id' | 'at'>[]) =>
    write(cur => ({ facts: { ...cur.facts, readings: [...(cur.facts.readings ?? []), ...rs.map(r => ({ id: uid(), at: now(), ...(me ? { who: me } : {}), ...r }))] } }));
  const strike = (rid: string, struck: boolean) =>
    write(cur => ({ facts: { ...cur.facts, readings: (cur.facts.readings ?? []).map(r => (r.id === rid ? { ...r, struck: struck || undefined } : r)) } }));
  const setPlan = (p: Partial<AnalysisPlan>) => write(cur => ({ agreed: { ...cur.agreed, analysis: { ...(cur.agreed?.analysis as AgreedAnalysis), plan: { ...(cur.agreed?.analysis?.plan as AnalysisPlan), ...p } } } }));

  const page = bandPage(a ? KIND_WORDS[a.kind].name : 'Analysis', s, said?.verdict, said?.tone);
  return (
    <div className="wrap ie ie-analysis">
      <StudyBand page={page} s={s} what="Analysis" canEdit={can.edit && !closed} canRemove={can.remove} />
      <div className="ln-under">
        <p className="sub ie-where">{s.machine ? <><b>{s.machine}</b> · </> : null}started {niceDay(isoDay(s.startedAt))}</p>
        <WhereItSits s={s} can={can} />
      </div>
      {!a || agreeing ? (
        <Agree s={s} canAgree={can.agree && !closed} hasReadings={readings.length > 0} onDone={() => setAgreeing(false)} cancel={a ? () => setAgreeing(false) : undefined} />
      ) : f && said && (
        <>
          <LeanTiles tiles={analysisTiles(f, a)} className="ie-strip" />
          <div className="ie-says">
            <p className={'ie-say is-' + said.tone}>{said.text}</p>
            {said.more.map((m, i) => <p key={i} className="sub ie-more">{m}</p>)}
            {said.notClaimed && <p className="sub ie-notclaimed"><i>What this does not say.</i> {said.notClaimed}</p>}
          </div>
          {a.kind === 'plan' && <PlanBox a={a} canAgree={can.agree && !closed} onPlan={setPlan} />}
          <div className="ie-body">
            <div className="ie-pic"><Pic rows={analysisPicture(f, a)} said={said.text} /></div>
            {!closed && can.edit && <Entry a={a} readings={readings} onAdd={add} />}
          </div>
          {f.checks.length > 0 && (
            <div className="ie-checks" aria-label="Checks on the readings">
              <span className="ie-checks-h">Checks on the readings</span>
              {f.checks.map(c => <p key={c.what + c.say} className={'ie-check is-' + c.tone}>{c.say}</p>)}
            </div>
          )}
          <Rows a={a} readings={readings} canStrike={can.edit && !closed} onStrike={strike} />
          <p className="ie-agreed sub">
            Agreed: <b>{agreedWords(a)}</b>
            {can.agree && !closed && <button type="button" className="linkish" onClick={() => setAgreeing(true)}>Change what was agreed</button>}
          </p>
          <UsedFor s={s} can={can} me={me} />
          <LeanPanel title="Action plan" className="ln-solo ln-plan-p">
            <LeanActions actions={raisedFrom(s, steps, tests)} empty="Nothing raised from it yet — Make it better raises a fix or a countermeasure from what it found." />
          </LeanPanel>
          <LeanClosing closing={analysisClosing(f, a, said)} />
        </>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- agreeing */
const ORDER: AgreedAnalysis['kind'][] = ['sure', 'change', 'paired', 'plan'];
const OFS: { k: NonNullable<AgreedAnalysis['of']>; word: string }[] = [{ k: 'mean', word: 'A mean — measured readings' }, { k: 'share', word: 'A share — counted, out of what was made' }, { k: 'rate', word: 'A rate — counted over time' }];
const BETTER: { k: NonNullable<AgreedAnalysis['better']>; word: string }[] = [{ k: 'lower', word: 'Lower is better' }, { k: 'higher', word: 'Higher is better' }, { k: 'either', word: 'No view' }];

function Agree({ s, canAgree, hasReadings, onDone, cancel }: { s: ToolStudy; canAgree: boolean; hasReadings: boolean; onDone: () => void; cancel?: () => void }) {
  const a = s.agreed?.analysis;
  const [kind, setKind] = useState<AgreedAnalysis['kind']>(a?.kind ?? 'sure');
  const [name, setName] = useState(a?.name ?? s.name ?? '');
  const [unit, setUnit] = useState(a?.unit ?? 'g');
  const [conf, setConf] = useState<0.9 | 0.95 | 0.99>(a ? confidenceOf(a) : 0.95);
  const [of, setOf] = useState<NonNullable<AgreedAnalysis['of']>>(a?.of ?? 'mean');
  const [data, setData] = useState<NonNullable<AgreedAnalysis['data']>>(a?.data ?? 'measured');
  const [better, setBetter] = useState<NonNullable<AgreedAnalysis['better']>>(a?.better ?? 'either');
  const [first, setFirst] = useState(a?.firstName ?? '');
  const [second, setSecond] = useState(a?.secondName ?? '');
  const [within, setWithin] = useState(a?.within?.toString() ?? '');
  if (!canAgree) return <div className="ie-agree is-wait"><h2>Waiting for it to be agreed</h2><p className="sub">What is asked and how sure it has to be is agreed by the project’s owner first.</p></div>;
  const draft: AgreedAnalysis = { kind, name: name.trim(), ...(unit.trim() ? { unit: unit.trim() } : {}), confidence: conf,
    ...(kind === 'sure' ? { of } : {}), ...(kind === 'change' ? { data, better } : {}),
    ...(kind === 'paired' ? { ...(first.trim() ? { firstName: first.trim() } : {}), ...(second.trim() ? { secondName: second.trim() } : {}), ...(num(within) !== undefined ? { within: num(within) } : {}) } : {}),
    ...(kind === 'plan' ? { plan: a?.plan ?? { ask: 'mean' as const } } : {}) };
  const problem = within.trim() !== '' && num(within) === undefined ? 'Numbers only in the boxes.' : analysisProblem(draft);
  const save = () => {
    if (problem) return;
    void patchStudy(s.id, cur => ({ name: cur.name || draft.name, agreed: { ...cur.agreed, analysis: draft } }));
    onDone();
  };
  return (
    <form className="ie-agree" onSubmit={e => { e.preventDefault(); save(); }}>
      <h2>{a ? 'What is asked' : 'What do you want to know?'}</h2>
      <p className="sub">{hasReadings ? 'Changing what was agreed re-reads everything against it.' : 'Asked once, before the readings — the answer is worked out as they are typed.'}</p>
      <div className="ie-kinds" role="radiogroup" aria-label="What do you want to know?">
        <span className="field-label">The question</span>
        {ORDER.map(k => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} className={'ie-kind' + (kind === k ? ' on' : '')} onClick={() => setKind(k)}>
            <b>{KIND_WORDS[k].ask}</b><small>{KIND_WORDS[k].example}</small>
          </button>
        ))}
      </div>
      {kind === 'sure' && (
        <div className="ie-kinds" role="radiogroup" aria-label="What is it?">
          <span className="field-label">What is it?</span>
          {OFS.map(x => <button key={x.k} type="button" role="radio" aria-checked={of === x.k} className={'ie-kind' + (of === x.k ? ' on' : '')} onClick={() => setOf(x.k)}><b>{x.word}</b></button>)}
        </div>
      )}
      {kind === 'change' && (
        <>
          <div className="ie-kinds" role="radiogroup" aria-label="How was it taken?">
            <span className="field-label">How was it taken?</span>
            <button type="button" role="radio" aria-checked={data === 'measured'} className={'ie-kind' + (data === 'measured' ? ' on' : '')} onClick={() => setData('measured')}><b>Measured</b><small>weights, temperatures, times</small></button>
            <button type="button" role="radio" aria-checked={data === 'counted'} className={'ie-kind' + (data === 'counted' ? ' on' : '')} onClick={() => setData('counted')}><b>Counted</b><small>rejected out of made, a run each side</small></button>
          </div>
          <div className="ie-kinds" role="radiogroup" aria-label="Which way is better?">
            <span className="field-label">Which way is better? <i className="sub">for the words — it never changes the test</i></span>
            {BETTER.map(x => <button key={x.k} type="button" role="radio" aria-checked={better === x.k} className={'ie-kind' + (better === x.k ? ' on' : '')} onClick={() => setBetter(x.k)}><b>{x.word}</b></button>)}
          </div>
        </>
      )}
      <div className="ie-kinds ie-confs" role="radiogroup" aria-label="How sure">
        <span className="field-label">How sure — the confidence level</span>
        {CONFIDENCES.map(c => <button key={c} type="button" role="radio" aria-checked={conf === c} className={'chip' + (conf === c ? ' on' : '')} onClick={() => setConf(c)}>{pctWord(c)}</button>)}
      </div>
      <div className="ie-agree-grid">
        <label className="field"><span className="field-label">What is measured</span>
          <input className="text-input" value={name} maxLength={80} onChange={e => setName(e.target.value)} placeholder={kind === 'sure' && of !== 'mean' ? 'Reject rate' : 'Fill weight'} /></label>
        <label className="field"><span className="field-label">Unit {kind === 'sure' && of === 'rate' ? <i className="sub">what the time is counted in — hours</i> : kind === 'change' && data === 'counted' ? <i className="sub">optional</i> : null}</span>
          <input className="text-input" value={unit} maxLength={16} onChange={e => setUnit(e.target.value)} placeholder={of === 'rate' && kind === 'sure' ? 'hours' : 'g'} /></label>
        {kind === 'paired' && <>
          <label className="field"><span className="field-label">The first way</span>
            <input className="text-input" value={first} maxLength={40} onChange={e => setFirst(e.target.value)} placeholder="Checkweigher 1" /></label>
          <label className="field"><span className="field-label">The second way</span>
            <input className="text-input" value={second} maxLength={40} onChange={e => setSecond(e.target.value)} placeholder="Checkweigher 2" /></label>
          <label className="field"><span className="field-label">Largest difference that does not matter <i className="sub">optional, in the unit</i></span>
            <input className="text-input" inputMode="decimal" value={within} onChange={e => setWithin(e.target.value)} placeholder="0.3" /></label>
        </>}
      </div>
      {problem && <p className="ie-problem">{problem}</p>}
      <div className="ie-agree-act">
        <button type="submit" className="btn btn-primary" disabled={!!problem}>Agree these</button>
        {cancel && <button type="button" className="btn" onClick={cancel}>Keep what was agreed</button>}
      </div>
    </form>
  );
}

export function agreedWords(a: AgreedAnalysis): string {
  const u = a.unit ? ` ${a.unit}` : '', c = pctWord(confidenceOf(a)) + ' confidence';
  switch (a.kind) {
    case 'sure': return `${a.name} — how sure, ${a.of === 'share' ? 'a share counted' : a.of === 'rate' ? 'a rate counted' : 'a mean measured'} · ${c}`;
    case 'change': return `${a.name} — did it change, ${a.data === 'counted' ? 'counted' : 'measured'}${a.better && a.better !== 'either' ? ` · ${a.better} is better` : ''} · ${c}`;
    case 'paired': return `${a.name} — ${a.firstName || 'the first way'} against ${a.secondName || 'the second way'}${a.within !== undefined ? ` · ${a.within}${u} does not matter` : ''} · ${c}`;
    case 'plan': return `${a.name} — how many readings · ${c}`;
  }
}

/* ----------------------------------------------------------------- the entry */
const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫'];

/** The number pad, a keyboard typing into it unless a box has the focus — Enter hands the number over. */
function Pad({ unit, label, onEnter }: { unit?: string; label: string; onEnter: (v: number) => void }) {
  const [typed, setTyped] = useState('');
  const press = useCallback((k: string) => setTyped(t => (k === '⌫' ? t.slice(0, -1) : k === '.' ? (t.includes('.') ? t : (t || '0') + '.') : (t + k).slice(0, 12))), []);
  const enter = useCallback(() => { const v = Number(typed); if (typed.trim() === '' || !Number.isFinite(v)) return; onEnter(v); setTyped(''); }, [typed, onEnter]);
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
  return (
    <>
      <output className={'ie-typed' + (typed ? '' : ' is-empty')} aria-live="polite" aria-label={label}>{typed || '0'}{unit ? <small> {unit}</small> : null}</output>
      <div className="ie-pad" role="group" aria-label="Number pad">
        {KEYS.map(k => <button key={k} type="button" className="ie-key" onClick={() => press(k)} aria-label={k === '⌫' ? 'Delete' : k}>{k}</button>)}
        <button type="button" className="ie-key ie-enter" onClick={enter} aria-label="Enter the reading" disabled={!typed || !Number.isFinite(Number(typed))}>↵</button>
      </div>
    </>
  );
}

/** A box to paste or type many at once — what could not be read is listed. */
function Paste({ cols, label, onAdd }: { cols: 1 | 2; label: string; onAdd: (p: ReturnType<typeof parsePasted>) => void }) {
  const [t, setT] = useState('');
  const [skipped, setSkipped] = useState<string[]>([]);
  return (
    <div className="ie-paste">
      <label className="field"><span className="field-label">{label}</span>
        <textarea className="text-input" rows={3} value={t} onChange={e => setT(e.target.value)} aria-label={label}
          placeholder={cols === 2 ? '401.2 401.6\n400.8 401.1' : '401.2\n401.6\n400.8'} /></label>
      <button type="button" className="btn" disabled={!t.trim()} onClick={() => { const p = parsePasted(t, cols); onAdd(p); setSkipped(p.skipped); setT(''); }}>Add these</button>
      {skipped.length > 0 && <p className="ie-problem" role="status">Left out — not numbers: {skipped.slice(0, 6).join(', ')}{skipped.length > 6 ? `, and ${skipped.length - 6} more` : ''}.</p>}
    </div>
  );
}

function Entry({ a, readings, onAdd }: { a: AgreedAnalysis; readings: StudyReading[]; onAdd: (rs: Omit<StudyReading, 'id' | 'at'>[]) => void }) {
  const unit = a.unit;
  const live = readings.filter(r => !r.struck);
  const [arm, setArm] = useState<'before' | 'after'>('before');
  const [firstV, setFirstV] = useState<number | undefined>(undefined);
  const [made, setMade] = useState(''), [count, setCount] = useState('');
  const armN = (x: string) => live.filter(r => r.arm === x && (typeof r.value === 'number' || typeof r.made === 'number')).length;
  const counted = (a.kind === 'sure' && a.of !== 'mean') || (a.kind === 'change' && a.data === 'counted');
  const runDone = () => { const m = num(made), k = num(count); if (m === undefined || k === undefined || m <= 0 || k < 0 || (a.kind === 'sure' && a.of === 'share' && k > m)) return; onAdd([{ made: m, rejected: k, ...(a.kind === 'change' ? { arm } : {}) }]); setMade(''); setCount(''); };
  const armChips = a.kind === 'change' && (
    <div className="chip-row" role="radiogroup" aria-label="Which side?">
      {(['before', 'after'] as const).map(x => <button key={x} type="button" role="radio" aria-checked={arm === x} className={'chip' + (arm === x ? ' on' : '')} onClick={() => setArm(x)}>{x === 'before' ? 'Before' : 'After'} · {armN(x)}</button>)}
    </div>
  );
  if (a.kind === 'plan' && a.plan?.ask !== 'cycles' && a.plan?.ask !== 'mean' && a.plan?.ask !== 'difference') return null;
  if (counted) {
    const rateKind = a.kind === 'sure' && a.of === 'rate';
    return (
      <div className="ie-cap-box" aria-label="Count a run">
        {armChips}
        <div className="ie-agree-grid">
          <label className="field"><span className="field-label">{rateKind ? `Time counted over${a.unit ? ` (${a.unit})` : ''}` : 'Made'}</span>
            <input className="text-input" inputMode="decimal" value={made} onChange={e => setMade(e.target.value)} placeholder={rateKind ? '40' : '600'} aria-label={rateKind ? 'Time counted over' : 'Made'} /></label>
          <label className="field"><span className="field-label">{rateKind ? 'Counted' : 'Rejected'}</span>
            <input className="text-input" inputMode="numeric" value={count} onChange={e => setCount(e.target.value)} placeholder={rateKind ? '12' : '7'} aria-label={rateKind ? 'Counted' : 'Rejected'} /></label>
        </div>
        <button type="button" className="btn btn-primary" onClick={runDone} disabled={num(made) === undefined || num(count) === undefined || (num(made) as number) <= 0 || (num(count) as number) < 0 || (a.kind === 'sure' && a.of === 'share' && (num(count) as number) > (num(made) as number))}>Add the run</button>
      </div>
    );
  }
  if (a.kind === 'paired') {
    return (
      <div className="ie-cap-box" aria-label="Take the pairs">
        <p className="sub ie-pad-hint">{firstV === undefined ? `${a.firstName || 'The first way'}, then Enter` : `${a.secondName || 'The second way'} on the same item, then Enter`}</p>
        <Pad key={firstV === undefined ? 'a' : 'b'} unit={unit} label={firstV === undefined ? 'The first reading' : 'The second reading'} onEnter={v => { if (firstV === undefined) setFirstV(v); else { onAdd([{ value: firstV, with: v }]); setFirstV(undefined); } }} />
        <Paste cols={2} label="Or paste pairs — two numbers to a line" onAdd={p => onAdd(p.pairs.map(([value, w]) => ({ value, with: w })))} />
      </div>
    );
  }
  const note = a.kind === 'plan' ? (a.plan?.ask === 'cycles' ? 'The timed cycles, in seconds' : 'Readings to take the spread from — optional') : undefined;
  return (
    <div className="ie-cap-box" aria-label="Take the readings">
      {armChips}
      {note && <p className="sub ie-pad-hint">{note}</p>}
      <Pad unit={unit} label="The reading" onEnter={v => onAdd([{ value: v, ...(a.kind === 'change' ? { arm } : {}) }])} />
      <Paste cols={1} label="Or paste readings — a number to a line, or spaced" onAdd={p => onAdd(p.values.map(value => ({ value, ...(a.kind === 'change' ? { arm } : {}) })))} />
    </div>
  );
}

/* ----------------------------------------------------------------- the plan's boxes */
const ASKS: { k: AnalysisPlan['ask']; word: string }[] = [
  { k: 'mean', word: 'A mean to ±' }, { k: 'difference', word: 'A difference between two groups' }, { k: 'share', word: 'A share to ±' },
  { k: 'twoShares', word: 'Two shares apart' }, { k: 'zero', word: 'Zero failures to show' }, { k: 'cycles', word: 'Cycles to time' },
];
function PlanBox({ a, canAgree, onPlan }: { a: AgreedAnalysis; canAgree: boolean; onPlan: (p: Partial<AnalysisPlan>) => void }) {
  const p = a.plan ?? { ask: 'mean' as const };
  const box = (label: string, key: keyof AnalysisPlan, hint: string, kind: 'decimal' | 'numeric' = 'decimal') => (
    <label className="field" key={key}><span className="field-label">{label}</span>
      <input className="text-input" inputMode={kind} defaultValue={(p[key] as number | undefined)?.toString() ?? ''} key={`${p.ask}-${key}-${p[key] ?? ''}`} placeholder={hint} disabled={!canAgree} aria-label={label}
        onBlur={e => { const v = num(e.target.value); if (e.target.value.trim() === '') onPlan({ [key]: undefined }); else if (v !== undefined) onPlan({ [key]: v }); }}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} /></label>
  );
  return (
    <div className="ie-agree ie-plan" aria-label="What to size">
      <div className="ie-kinds" role="radiogroup" aria-label="What to size">
        <span className="field-label">What to size</span>
        {ASKS.map(x => <button key={x.k} type="button" role="radio" aria-checked={p.ask === x.k} disabled={!canAgree} className={'ie-kind' + (p.ask === x.k ? ' on' : '')} onClick={() => onPlan({ ask: x.k })}><b>{x.word}</b></button>)}
      </div>
      <div className="ie-agree-grid">
        {(p.ask === 'mean' || p.ask === 'difference') && box('Spread (s) — a guess', 'sd', '0.9')}
        {p.ask === 'mean' && box('Within ± (the unit)', 'e', '0.3')}
        {p.ask === 'difference' && box('Difference that matters', 'delta', '0.5')}
        {p.ask === 'share' && box('Share expected', 'p', '0.10 — blank is 0.5')}
        {p.ask === 'share' && box('Within ± (as a share)', 'e', '0.02')}
        {p.ask === 'twoShares' && box('Before (share)', 'p1', '0.10')}
        {p.ask === 'twoShares' && box('After (share)', 'p2', '0.05')}
        {p.ask === 'zero' && box('Share allowed to be bad', 'p0', '0.01')}
        {p.ask === 'cycles' && box('Within ± (share of the mean)', 'k', '0.05')}
        {(p.ask === 'difference' || p.ask === 'twoShares') && (
          <div className="ie-kinds ie-confs" role="radiogroup" aria-label="Power"><span className="field-label">Power</span>
            {[0.8, 0.9].map(x => <button key={x} type="button" role="radio" aria-checked={(p.power ?? 0.8) === x} disabled={!canAgree} className={'chip' + ((p.power ?? 0.8) === x ? ' on' : '')} onClick={() => onPlan({ power: x as 0.8 | 0.9 })}>{pctWord(x)}</button>)}
          </div>)}
        {(p.ask === 'mean' || p.ask === 'share') && box('One batch of (optional)', 'population', '500', 'numeric')}
        {p.ask !== 'cycles' && box('Seconds a reading (optional)', 'seconds', '20')}
      </div>
      {planProblem(p, 0) && p.ask !== 'cycles' && p.ask !== 'mean' && p.ask !== 'difference' && <p className="sub ie-pad-hint">{planProblem(p, 0)}</p>}
    </div>
  );
}

/* ----------------------------------------------------------------- the readings */
function Rows({ a, readings, canStrike, onStrike }: { a: AgreedAnalysis; readings: StudyReading[]; canStrike: boolean; onStrike: (id: string, struck: boolean) => void }) {
  if (!readings.length) return null;
  const u = a.unit ? ` ${a.unit}` : '';
  const word = (r: StudyReading): string => (typeof r.with === 'number' ? `${r.value}${u} → ${r.with}${u}` : typeof r.made === 'number' ? `${r.rejected} of ${r.made}${a.kind === 'sure' && a.of === 'rate' ? ` over ${r.made}${u}`.replace(/^ of.*/, '') : ''}` : typeof r.value === 'number' ? `${r.value}${u}` : '—');
  return (
    <details className="ie-readings">
      <summary>Every reading, in the order taken ({readings.length})</summary>
      <ul className="ie-rows">
        {readings.map((r, i) => (
          <li key={r.id} className={r.struck ? 'is-struck' : ''}>
            <span className="ie-no">{i + 1}</span>
            <b>{word(r)}{r.arm ? ` · ${r.arm}` : ''}</b>
            {canStrike && <button type="button" className="linkish" onClick={() => onStrike(r.id, !r.struck)} aria-label={`${r.struck ? 'Restore' : 'Strike'} reading ${i + 1}`}>{r.struck ? 'Restore' : 'Strike'}</button>}
          </li>
        ))}
      </ul>
    </details>
  );
}

/* ----------------------------------------------------------------- the picture */
const W = 640, LAB = 110, RT = 120, LANE = 52;
function Pic({ rows, said }: { rows: PicRow[]; said: string }) {
  if (!rows.length) return <div className="ie-pic-none sub">The picture comes with the first readings.</div>;
  const hs = rows.map(r => (r.hist ? 92 : LANE)), H = hs.reduce((x, y) => x + y, 0) + 22;
  let y0 = 8;
  return (
    <svg className="ie-svg ie-an-pic" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={said}>
      {rows.map((r, i) => {
        const top = y0, h = hs[i]; y0 += h;
        const x = (v: number) => LAB + ((v - r.axis[0]) / (r.axis[1] - r.axis[0])) * (W - LAB - RT);
        const mid = top + (r.hist ? h - 24 : h / 2);
        const topC = r.hist ? Math.max(...r.hist.counts, 1) : 1;
        return (
          <g key={r.label + i}>
            <text x={4} y={mid + 4} className="ie-an-lab">{r.label.length > 18 ? r.label.slice(0, 17) + '…' : r.label}</text>
            <line x1={LAB} x2={W - RT} y1={r.hist ? top + h - 14 : mid} y2={r.hist ? top + h - 14 : mid} className="ie-an-axis" />
            {r.zero && <line x1={x(0)} x2={x(0)} y1={top + 6} y2={top + h - 6} className="ie-an-zero" />}
            {r.hist && r.hist.counts.map((c, k) => { const e = r.hist?.edges ?? []; return c > 0 && <rect key={k} x={x(e[k]) + 0.8} width={Math.max(1, x(e[k + 1]) - x(e[k]) - 1.6)} y={top + h - 14 - (c / topC) * (h - 30)} height={(c / topC) * (h - 30)} className="ie-an-bar" />; })}
            {r.dots && r.dots.map((d, k) => <circle key={k} cx={x(d)} cy={mid + ((k * 37) % 13) - 6} r={2.2} className="ie-an-dot" />)}
            {r.band && <rect x={x(r.band.lo)} width={Math.max(2, x(r.band.hi) - x(r.band.lo))} y={mid - 7} height={14} rx={3} className={'ie-an-band is-' + (r.tone ?? 'n')} />}
            {r.point && <line x1={x(r.point.v)} x2={x(r.point.v)} y1={mid - 11} y2={mid + 11} className={'ie-an-pt is-' + (r.tone ?? 'n')} />}
            {r.point && <text x={W - RT + 6} y={mid - 2} className="ie-an-val">{r.point.text}{r.unit && !r.unit.startsWith('per') && r.unit !== '%' ? ` ${r.unit}` : ''}</text>}
            {r.band && <text x={W - RT + 6} y={mid + 11} className="ie-an-sub">{r.band.text}</text>}
          </g>
        );
      })}
      <text x={LAB} y={H - 6} className="ie-an-sub">{rows[0].unit && !rows[0].unit.startsWith('per') ? rows[0].unit : ''}</text>
    </svg>
  );
}
