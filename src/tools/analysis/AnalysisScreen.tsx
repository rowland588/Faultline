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
import type { AgreedAnalysis, AgreedGauge, AnalysisPlan, StudyReading, ToolStudy } from '../../lib/study';
import { StudyBand } from '../../ui/StudyActs';
import { WhereItSits, UsedFor, useBetter } from '../../ui/StudyPlace';
import { LeanActions, LeanClosing, LeanPanel, LeanTiles } from '../../ui/Lean';
import { bandPage } from '../../lib/lean';
import { useLine } from '../linework/WorkBalance';
import { raisedFrom } from '../losses/lossLean';
import { CONFIDENCES } from '../../lib/ie/stats';
import { analysisClosing, analysisFigures, analysisGrids, analysisPicture, analysisPlot, analysisProblem, analysisSays, analysisTiles, confidenceOf, KIND_WORDS, MAX_DRIVERS, parsePasted, parseRows, pctWord, planProblem, predictionSays, type Grid, type PicRow, type Plot, type RelateFigures } from './analysis';

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
  const plot = useMemo(() => (a && f ? analysisPlot(f, a) : undefined), [a, f]);
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
            <div className={'ie-pic tool-sig-an'}>
              {plot ? <PlotView plot={plot} said={said.text} /> : <Pic rows={analysisPicture(f, a)} said={said.text} />}
              {f.kind === 'relate' && f.line && <Predict f={f} a={a} />}
              {analysisGrids(f, a).map(g => <GridView key={g.label} g={g} />)}
              {plot?.kind === 'table' && <p className="sub ie-pad-hint">Each cell: the count, then what chance alone would give. A cell more than 2 standard residuals from that is marked <b>more</b> or <b>fewer</b>.</p>}
            </div>
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
const ORDER: AgreedAnalysis['kind'][] = ['sure', 'change', 'paired', 'groups', 'table', 'relate', 'learn', 'plan', 'gauge', 'grr', 'attr', 'shape'];
const GMODES: { k: AgreedGauge['mode']; word: string; eg: string }[] = [
  { k: 'repeat', word: 'One reference, read again and again', eg: 'a 500 g test weight weighed 25 to 50 times — the Type 1 study' },
  { k: 'range', word: 'References across its range', eg: 'a probe at 0, 20, 40, 60 and 80 °C, ten readings each — bias and linearity' },
  { k: 'drift', word: 'One reference, checked day after day', eg: 'the daily check weight — stability' },
];
const txt = (v?: number): string => (v === undefined ? '' : String(v));
const names = (t: string): string[] => t.split(/[,;\n]/).map(x => x.trim()).filter(Boolean);
/** "Jaw temperature (°C), Dwell (s)" → the drivers, each with its unit if one is in brackets. */
const drivers = (t: string): { name: string; unit?: string }[] => names(t).map(x => { const m = /^(.*?)\s*\(([^)]*)\)$/.exec(x); return m && m[1].trim() ? { name: m[1].trim(), ...(m[2].trim() ? { unit: m[2].trim() } : {}) } : { name: x }; });
const driversText = (ds?: { name: string; unit?: string }[]): string => (ds ?? []).map(d => (d.unit ? `${d.name} (${d.unit})` : d.name)).join(', ');
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
  const [rowsT, setRowsT] = useState((a?.rows ?? []).join(', '));
  const [colsT, setColsT] = useState((a?.cols ?? []).join(', '));
  const [driversT, setDriversT] = useState(driversText(a?.drivers));
  const [standardT, setStandardT] = useState(a?.learn?.standard?.toString() ?? '');
  const [perRunT, setPerRunT] = useState(a?.learn?.perRun?.toString() ?? '');
  const gg = a?.gauge;
  const [gMode, setGMode] = useState<AgreedGauge['mode']>(gg?.mode ?? 'repeat');
  const [gRef, setGRef] = useState(txt(gg?.reference)), [lowerT, setLowerT] = useState(txt(gg?.lower ?? a?.shape?.lower)), [upperT, setUpperT] = useState(txt(gg?.upper ?? a?.shape?.upper));
  const [targetT, setTargetT] = useState(txt(gg?.target)), [limitT, setLimitT] = useState(txt(gg?.limit)), [sliceT, setSliceT] = useState(gg?.slice !== undefined ? String(Math.round(gg.slice * 1000) / 10) : '');
  const [needT, setNeedT] = useState(txt(gg?.need)), [resT, setResT] = useState(txt(gg?.resolution)), [baseT, setBaseT] = useState(txt(gg?.baseline));
  const [packsT, setPacksT] = useState(txt(gg?.packsPerShift)), [weeksT, setWeeksT] = useState(txt(gg?.shiftsPerWeek)), [kgT, setKgT] = useState(txt(gg?.costPerKg));
  const grr0 = a?.grr;
  const [partsT, setPartsT] = useState((grr0?.parts ?? []).join(', '));
  const [apprT, setApprT] = useState((grr0?.appraisers ?? []).join(', '));
  const [trialsT, setTrialsT] = useState(String(grr0?.trials ?? 2));
  const attr0 = a?.attr;
  const [itemsT, setItemsT] = useState((attr0?.items ?? []).join(', '));
  const [inspT, setInspT] = useState((attr0?.inspectors ?? []).join(', '));
  const [looksT, setLooksT] = useState(String(attr0?.looks ?? 2));
  const [matT, setMatT] = useState(attr0?.materialsPerPack !== undefined ? String(attr0.materialsPerPack) : '');
  const [packsAttrT, setPacksAttrT] = useState(attr0?.packsPerShift !== undefined ? String(attr0.packsPerShift) : '');
  if (!canAgree) return <div className="ie-agree is-wait"><h2>Waiting for it to be agreed</h2><p className="sub">What is asked and how sure it has to be is agreed by the project’s owner first.</p></div>;
  const nn = num;
  const gaugeDraft: AgreedGauge = { mode: gMode, ...(gMode !== 'range' && nn(gRef) !== undefined ? { reference: nn(gRef) } : {}), ...(nn(lowerT) !== undefined ? { lower: nn(lowerT) } : {}), ...(nn(upperT) !== undefined ? { upper: nn(upperT) } : {}),
    ...(nn(targetT) !== undefined ? { target: nn(targetT) } : {}), ...(gMode === 'range' && nn(limitT) !== undefined ? { limit: nn(limitT) } : {}), ...(nn(sliceT) !== undefined ? { slice: (nn(sliceT) as number) / 100 } : {}),
    ...(nn(needT) !== undefined ? { need: nn(needT) } : {}), ...(nn(resT) !== undefined ? { resolution: nn(resT) } : {}), ...(gMode === 'drift' && nn(baseT) !== undefined ? { baseline: nn(baseT) } : {}),
    ...(nn(packsT) !== undefined ? { packsPerShift: Math.round(nn(packsT) as number) } : {}), ...(nn(weeksT) !== undefined ? { shiftsPerWeek: nn(weeksT) } : {}), ...(nn(kgT) !== undefined ? { costPerKg: nn(kgT) } : {}) };
  const grrDraft = { parts: names(partsT), appraisers: names(apprT), trials: (trialsT === '3' ? 3 : 2) as 2 | 3, ...(num(lowerT) !== undefined ? { lower: num(lowerT) } : {}), ...(num(upperT) !== undefined ? { upper: num(upperT) } : {}) };
  const attrDraft = {
    items: names(itemsT), inspectors: names(inspT), looks: (looksT === '3' ? 3 : 2) as 2 | 3,
    ...(num(matT) !== undefined ? { materialsPerPack: num(matT) } : {}),
    ...(num(packsAttrT) !== undefined ? { packsPerShift: Math.round(num(packsAttrT) as number) } : {}),
  };
  const boxes = kind === 'gauge' ? [gRef, lowerT, upperT, targetT, limitT, sliceT, needT, resT, baseT, packsT, weeksT, kgT] : kind === 'shape' || kind === 'grr' ? [lowerT, upperT] : kind === 'attr' ? [matT, packsAttrT] : [];
  const draft: AgreedAnalysis = { kind, name: name.trim(), ...(unit.trim() && kind !== 'table' ? { unit: unit.trim() } : {}), confidence: conf,
    ...(kind === 'sure' ? { of } : {}), ...(kind === 'change' ? { data, better } : {}),
    ...(kind === 'groups' ? { better, ...(first.trim() ? { firstName: first.trim() } : {}) } : {}),
    ...(kind === 'table' ? { rows: names(rowsT), cols: names(colsT), ...(first.trim() ? { firstName: first.trim() } : {}), ...(second.trim() ? { secondName: second.trim() } : {}) } : {}),
    ...(kind === 'relate' ? { drivers: drivers(driversT) } : {}),
    ...(kind === 'learn' && (standardT.trim() || perRunT.trim()) ? { learn: { ...(num(standardT) !== undefined ? { standard: num(standardT) } : {}), ...(num(perRunT) !== undefined ? { perRun: num(perRunT) } : {}) } } : {}),
    ...(kind === 'gauge' ? { gauge: gaugeDraft } : {}),
    ...(kind === 'shape' ? { shape: { ...(num(lowerT) !== undefined ? { lower: num(lowerT) } : {}), ...(num(upperT) !== undefined ? { upper: num(upperT) } : {}) } } : {}),
    ...(kind === 'grr' ? { grr: grrDraft } : {}),
    ...(kind === 'attr' ? { attr: attrDraft } : {}),
    ...(kind === 'paired' ? { ...(first.trim() ? { firstName: first.trim() } : {}), ...(second.trim() ? { secondName: second.trim() } : {}), ...(num(within) !== undefined ? { within: num(within) } : {}) } : {}),
    ...(kind === 'plan' ? { plan: a?.plan ?? { ask: 'mean' as const } } : {}) };
  const problem = (within.trim() !== '' && num(within) === undefined) || boxes.some(b => b.trim() !== '' && num(b) === undefined) || (standardT.trim() !== '' && num(standardT) === undefined) || (perRunT.trim() !== '' && num(perRunT) === undefined) ? 'Numbers only in the boxes.' : analysisProblem(draft);
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
          <button key={k} type="button" role="radio" aria-checked={kind === k} className={'ie-kind' + (kind === k ? ' on' : '')} onClick={() => { setKind(k); if (k === 'learn' && unit === 'g') setUnit('s'); }}>
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
      {kind === 'gauge' && (
        <div className="ie-kinds" role="radiogroup" aria-label="How is it checked?">
          <span className="field-label">How is it checked?</span>
          {GMODES.map(x => <button key={x.k} type="button" role="radio" aria-checked={gMode === x.k} className={'ie-kind' + (gMode === x.k ? ' on' : '')} onClick={() => setGMode(x.k)}><b>{x.word}</b><small>{x.eg}</small></button>)}
        </div>
      )}
      {(kind === 'change' || kind === 'groups') && (
        <>
          {kind === 'change' && <div className="ie-kinds" role="radiogroup" aria-label="How was it taken?">
            <span className="field-label">How was it taken?</span>
            <button type="button" role="radio" aria-checked={data === 'measured'} className={'ie-kind' + (data === 'measured' ? ' on' : '')} onClick={() => setData('measured')}><b>Measured</b><small>weights, temperatures, times</small></button>
            <button type="button" role="radio" aria-checked={data === 'counted'} className={'ie-kind' + (data === 'counted' ? ' on' : '')} onClick={() => setData('counted')}><b>Counted</b><small>rejected out of made, a run each side</small></button>
          </div>}
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
          <input className="text-input" value={name} maxLength={80} onChange={e => setName(e.target.value)} placeholder={kind === 'sure' && of !== 'mean' ? 'Reject rate' : kind === 'table' ? 'Rejects' : kind === 'relate' ? 'Seal strength' : kind === 'groups' ? 'Give-away' : kind === 'learn' ? 'Time to pack a case' : kind === 'gauge' ? 'Bench scale' : kind === 'grr' ? 'Seal strength' : kind === 'attr' ? 'Seal wrinkle check' : kind === 'shape' ? 'Residual oxygen' : 'Fill weight'} /></label>
        {kind !== 'table' && <label className="field"><span className="field-label">Unit {kind === 'sure' && of === 'rate' ? <i className="sub">what the time is counted in — hours</i> : kind === 'change' && data === 'counted' ? <i className="sub">optional</i> : null}</span>
          <input className="text-input" value={unit} maxLength={16} onChange={e => setUnit(e.target.value)} placeholder={of === 'rate' && kind === 'sure' ? 'hours' : kind === 'learn' ? 's' : 'g'} /></label>}
        {kind === 'learn' && <>
          <label className="field"><span className="field-label">The standard it is heading for <i className="sub">optional, in the unit — a time a unit</i></span>
            <input className="text-input" inputMode="decimal" value={standardT} onChange={e => setStandardT(e.target.value)} placeholder="40" aria-label="The standard" /></label>
          <label className="field"><span className="field-label">Units each reading stands for <i className="sub">optional — only to say what learning costs in money</i></span>
            <input className="text-input" inputMode="numeric" value={perRunT} onChange={e => setPerRunT(e.target.value)} placeholder="1,200" aria-label="Units each reading stands for" /></label>
        </>}
        {kind === 'groups' && <label className="field"><span className="field-label">What the groups are <i className="sub">optional — a word for the words</i></span>
          <input className="text-input" value={first} maxLength={30} onChange={e => setFirst(e.target.value)} placeholder="shift" /></label>}
        {kind === 'table' && <>
          <label className="field"><span className="field-label">What the rows are <i className="sub">one word</i></span>
            <input className="text-input" value={first} maxLength={30} onChange={e => setFirst(e.target.value)} placeholder="Lane" /></label>
          <label className="field"><span className="field-label">The rows <i className="sub">down the side, separated by commas</i></span>
            <input className="text-input" value={rowsT} onChange={e => setRowsT(e.target.value)} placeholder="Lane 1, Lane 2, Lane 3" aria-label="The rows" /></label>
          <label className="field"><span className="field-label">What the columns are <i className="sub">one word</i></span>
            <input className="text-input" value={second} maxLength={30} onChange={e => setSecond(e.target.value)} placeholder="Fault type" /></label>
          <label className="field"><span className="field-label">The columns <i className="sub">across the top, separated by commas</i></span>
            <input className="text-input" value={colsT} onChange={e => setColsT(e.target.value)} placeholder="Underweight, Leaker, Misprint" aria-label="The columns" /></label>
        </>}
        {kind === 'gauge' && <>
          {gMode !== 'range' && <label className="field"><span className="field-label">The reference’s true value <i className="sub">{gMode === 'drift' ? 'optional — to say the bias' : 'from its certificate'}</i></span>
            <input className="text-input" inputMode="decimal" value={gRef} onChange={e => setGRef(e.target.value)} placeholder="500" aria-label="Reference value" /></label>}
          <label className="field"><span className="field-label">What it judges — the lower limit {gMode !== 'repeat' && <i className="sub">optional</i>}</span>
            <input className="text-input" inputMode="decimal" value={lowerT} onChange={e => setLowerT(e.target.value)} placeholder="495" aria-label="Lower limit" /></label>
          <label className="field"><span className="field-label">…and the upper limit {gMode !== 'repeat' && <i className="sub">optional</i>}</span>
            <input className="text-input" inputMode="decimal" value={upperT} onChange={e => setUpperT(e.target.value)} placeholder="505" aria-label="Upper limit" /></label>
          <label className="field"><span className="field-label">Target <i className="sub">only with one limit — the tolerance is twice the distance</i></span>
            <input className="text-input" inputMode="decimal" value={targetT} onChange={e => setTargetT(e.target.value)} placeholder="" aria-label="Target" /></label>
          {gMode === 'range' && <label className="field"><span className="field-label">The limit that matters <i className="sub">optional — where the bias is read off the line</i></span>
            <input className="text-input" inputMode="decimal" value={limitT} onChange={e => setLimitT(e.target.value)} placeholder="75" aria-label="Limit that matters" /></label>}
          <details className="ie-wide ie-agree-more"><summary>The slice, the Cg wanted and the money — defaults that can be changed</summary>
            <div className="ie-agree-grid">
              <label className="field"><span className="field-label">Its 6s may use this % of the tolerance <i className="sub">20 is usual</i></span>
                <input className="text-input" inputMode="decimal" value={sliceT} onChange={e => setSliceT(e.target.value)} placeholder="20" aria-label="Slice of the tolerance" /></label>
              <label className="field"><span className="field-label">Cg and Cgk wanted at least <i className="sub">1.33 is usual</i></span>
                <input className="text-input" inputMode="decimal" value={needT} onChange={e => setNeedT(e.target.value)} placeholder="1.33" aria-label="Cg wanted" /></label>
              <label className="field"><span className="field-label">Least count <i className="sub">optional — else the readings’ own step</i></span>
                <input className="text-input" inputMode="decimal" value={resT} onChange={e => setResT(e.target.value)} placeholder="0.01" aria-label="Least count" /></label>
              {gMode === 'drift' && <label className="field"><span className="field-label">Limits from the first … checks <i className="sub">20 is usual</i></span>
                <input className="text-input" inputMode="numeric" value={baseT} onChange={e => setBaseT(e.target.value)} placeholder="20" aria-label="Baseline checks" /></label>}
              <label className="field"><span className="field-label">Packs a shift <i className="sub">optional — a bias in money</i></span>
                <input className="text-input" inputMode="numeric" value={packsT} onChange={e => setPacksT(e.target.value)} placeholder="3000" aria-label="Packs a shift" /></label>
              <label className="field"><span className="field-label">Shifts a week <i className="sub">optional</i></span>
                <input className="text-input" inputMode="decimal" value={weeksT} onChange={e => setWeeksT(e.target.value)} placeholder="10" aria-label="Shifts a week" /></label>
              <label className="field"><span className="field-label">£ a kilo <i className="sub">optional</i></span>
                <input className="text-input" inputMode="decimal" value={kgT} onChange={e => setKgT(e.target.value)} placeholder="2.40" aria-label="Pounds a kilo" /></label>
            </div>
          </details>
        </>}
        {kind === 'shape' && <>
          <label className="field"><span className="field-label">A lower limit that matters <i className="sub">optional</i></span>
            <input className="text-input" inputMode="decimal" value={lowerT} onChange={e => setLowerT(e.target.value)} placeholder="10" aria-label="Lower limit" /></label>
          <label className="field"><span className="field-label">An upper limit that matters <i className="sub">optional</i></span>
            <input className="text-input" inputMode="decimal" value={upperT} onChange={e => setUpperT(e.target.value)} placeholder="2" aria-label="Upper limit" /></label>
        </>}
        {kind === 'grr' && <>
          <label className="field ie-wide"><span className="field-label">The parts <i className="sub">ten spanning the range, separated by commas</i></span>
            <input className="text-input" value={partsT} onChange={e => setPartsT(e.target.value)} placeholder="1, 2, 3, 4, 5, 6, 7, 8, 9, 10" aria-label="The parts" /></label>
          <label className="field ie-wide"><span className="field-label">The appraisers <i className="sub">three operators, separated by commas</i></span>
            <input className="text-input" value={apprT} onChange={e => setApprT(e.target.value)} placeholder="A, B, C" aria-label="The appraisers" /></label>
          <div className="ie-kinds" role="radiogroup" aria-label="Trials each">
            <span className="field-label">Trials each</span>
            <button type="button" role="radio" aria-checked={trialsT !== '3'} className={'chip' + (trialsT !== '3' ? ' on' : '')} onClick={() => setTrialsT('2')}>2</button>
            <button type="button" role="radio" aria-checked={trialsT === '3'} className={'chip' + (trialsT === '3' ? ' on' : '')} onClick={() => setTrialsT('3')}>3</button>
          </div>
          <label className="field"><span className="field-label">Tolerance — lower <i className="sub">optional — for %GRR of tolerance</i></span>
            <input className="text-input" inputMode="decimal" value={lowerT} onChange={e => setLowerT(e.target.value)} placeholder="10" aria-label="Lower tolerance" /></label>
          <label className="field"><span className="field-label">…and upper</span>
            <input className="text-input" inputMode="decimal" value={upperT} onChange={e => setUpperT(e.target.value)} placeholder="16" aria-label="Upper tolerance" /></label>
        </>}
        {kind === 'attr' && <>
          <label className="field ie-wide"><span className="field-label">The pieces <i className="sub">coded packs — at least ten, separated by commas</i></span>
            <input className="text-input" value={itemsT} onChange={e => setItemsT(e.target.value)} placeholder="P01, P02, P03 …" aria-label="The pieces" /></label>
          <label className="field ie-wide"><span className="field-label">The inspectors <i className="sub">two or three, separated by commas</i></span>
            <input className="text-input" value={inspT} onChange={e => setInspT(e.target.value)} placeholder="A, B, C" aria-label="The inspectors" /></label>
          <div className="ie-kinds" role="radiogroup" aria-label="Looks each">
            <span className="field-label">Looks each</span>
            <button type="button" role="radio" aria-checked={looksT !== '3'} className={'chip' + (looksT !== '3' ? ' on' : '')} onClick={() => setLooksT('2')}>2</button>
            <button type="button" role="radio" aria-checked={looksT === '3'} className={'chip' + (looksT === '3' ? ' on' : '')} onClick={() => setLooksT('3')}>3</button>
          </div>
          <details className="ie-wide ie-agree-more"><summary>False alarms in money — optional</summary>
            <div className="ie-agree-grid">
              <label className="field"><span className="field-label">Materials a pack <i className="sub">£</i></span>
                <input className="text-input" inputMode="decimal" value={matT} onChange={e => setMatT(e.target.value)} placeholder="0.12" aria-label="Materials a pack" /></label>
              <label className="field"><span className="field-label">Packs a shift</span>
                <input className="text-input" inputMode="numeric" value={packsAttrT} onChange={e => setPacksAttrT(e.target.value)} placeholder="3000" aria-label="Packs a shift" /></label>
            </div>
          </details>
        </>}
        {kind === 'relate' && <label className="field ie-wide"><span className="field-label">The drivers <i className="sub">one to {MAX_DRIVERS}, each with its unit in brackets, separated by commas — the result is what is measured above</i></span>
          <input className="text-input" value={driversT} onChange={e => setDriversT(e.target.value)} placeholder="Jaw temperature (°C), Dwell (s)" aria-label="The drivers" /></label>}
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
    case 'groups': return `${a.name} — do the ${a.firstName || 'group'}s differ${a.better && a.better !== 'either' ? ` · ${a.better} is better` : ''}${u ? ` · in${u}` : ''} · ${c}`;
    case 'table': return `${a.name} — ${(a.rows ?? []).length} ${(a.firstName || 'row').toLowerCase()}s by ${(a.cols ?? []).length} ${(a.secondName || 'column').toLowerCase()}s, counted · ${c}`;
    case 'relate': return `${a.name}${u ? ` in${u}` : ''} against ${driversText(a.drivers) || 'its drivers'} · ${c}`;
    case 'learn': return `${a.name}${u ? ` in${u}` : ''} — how fast it is learned${a.learn?.standard ? ` · heading for ${a.learn.standard}${u}` : ''} · ${c}`;
    case 'gauge': { const g = a.gauge, lim = g && g.lower !== undefined && g.upper !== undefined ? ` judging ${g.lower}–${g.upper}${u}` : g && (g.lower ?? g.upper) !== undefined ? ` judging a limit of ${g.lower ?? g.upper}${u}` : '';
      return g?.mode === 'range' ? `${a.name} — bias across its range${u ? ` in${u}` : ''}${g.limit !== undefined ? `, read at ${g.limit}${u}` : ''}${lim} · ${c}` : g?.mode === 'drift' ? `${a.name} — ${g.reference !== undefined ? `the reference ${g.reference}${u}` : 'a reference'} checked day after day${lim} · ${c}` : `${a.name} — one reference${g?.reference !== undefined ? ` (${g.reference}${u})` : ''} read again and again${lim} · ${c}`; }
    case 'shape': { const s = a.shape; return `${a.name}${u ? ` in${u}` : ''} — which shape fits${s?.lower !== undefined ? `, a lower limit of ${s.lower}${u}` : ''}${s?.upper !== undefined ? `, an upper limit of ${s.upper}${u}` : ''} · ${c}`; }
    case 'grr': { const g = a.grr; return `${a.name}${u ? ` in${u}` : ''} — ${g?.parts.length ?? 0} parts × ${g?.appraisers.length ?? 0} appraisers × ${g?.trials ?? 2} trials${g?.lower !== undefined && g?.upper !== undefined ? ` · tolerance ${g.lower}–${g.upper}${u}` : ''}`; }
    case 'attr': { const g = a.attr; return `${a.name} — ${g?.items.length ?? 0} pieces × ${g?.inspectors.length ?? 0} inspectors × ${g?.looks ?? 2} looks · reference on every piece`; }
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
  if (a.kind === 'groups') return <GroupEntry a={a} readings={readings} onAdd={onAdd} />;
  if (a.kind === 'table') return <TableEntry a={a} readings={readings} onAdd={onAdd} />;
  if (a.kind === 'relate') return <RelateEntry a={a} onAdd={onAdd} />;
  if (a.kind === 'gauge' && a.gauge?.mode === 'range') return <GaugeRangeEntry a={a} readings={readings} onAdd={onAdd} />;
  if (a.kind === 'grr') return <GrrEntry a={a} readings={readings} onAdd={onAdd} />;
  if (a.kind === 'attr') return <AttrEntry a={a} readings={readings} onAdd={onAdd} />;
  return <SimpleEntry a={a} readings={readings} onAdd={onAdd} />;
}

const verdictWord = (v: number): string => (v >= 0.5 ? 'Reject' : 'Pass');

/** Attribute agreement: reference per piece, then inspector × look judgments. */
function AttrEntry({ a, readings, onAdd }: { a: AgreedAnalysis; readings: StudyReading[]; onAdd: OnAdd }) {
  const g = a.attr ?? { items: [], inspectors: [], looks: 2 as const };
  const looks = g.looks ?? 2;
  const [item, setItem] = useState(g.items[0] ?? '');
  const [insp, setInsp] = useState(g.inspectors[0] ?? '');
  const [phase, setPhase] = useState<'ref' | 'judgment'>('ref');
  const refOf = (it: string) => readings.find(r => !r.struck && r.arm === it && r.col === 'reference' && typeof r.value === 'number');
  const refsDone = g.items.filter(it => refOf(it)).length;
  const judgmentOf = (it: string, name: string) => readings.filter(r => !r.struck && r.arm === it && r.col === name && typeof r.value === 'number').length;
  const nextLook = item && insp ? judgmentOf(item, insp) + 1 : 1;
  const needJudgments = g.items.length * g.inspectors.length * looks;
  const haveJudgments = readings.filter(r => !r.struck && r.arm && r.col && r.col !== 'reference' && typeof r.value === 'number').length;
  const refsComplete = refsDone >= g.items.length;
  const addVerdict = (reject: boolean, ref: boolean) => {
    if (!item) return;
    if (ref) onAdd([{ arm: item, col: 'reference', value: reject ? 1 : 0 }]);
    else if (insp && nextLook <= looks) onAdd([{ arm: item, col: insp, group: nextLook, value: reject ? 1 : 0 }]);
  };
  return (
    <div className="ie-cap-box tool-sig-an" aria-label="Take the judgments">
      <div className="chip-row" role="tablist" aria-label="Reference or judgments">
        <button type="button" role="tab" aria-selected={phase === 'ref'} className={'chip' + (phase === 'ref' ? ' on' : '')} onClick={() => setPhase('ref')}>Reference · {refsDone}/{g.items.length}</button>
        <button type="button" role="tab" aria-selected={phase === 'judgment'} className={'chip' + (phase === 'judgment' ? ' on' : '')} disabled={!refsComplete} onClick={() => setPhase('judgment')}>Judgments · {haveJudgments}/{needJudgments}</button>
      </div>
      <div className="chip-row" role="radiogroup" aria-label="Which piece?">
        {g.items.map(p => <button key={p} type="button" role="radio" aria-checked={item === p} className={'chip' + (item === p ? ' on' : '')} onClick={() => setItem(p)}>{p}{refOf(p) ? ' ✓' : ''}</button>)}
      </div>
      {phase === 'judgment' && <>
        <div className="chip-row" role="radiogroup" aria-label="Which inspector?">
          {g.inspectors.map(o => <button key={o} type="button" role="radio" aria-checked={insp === o} className={'chip' + (insp === o ? ' on' : '')} onClick={() => setInsp(o)}>{o}</button>)}
        </div>
        {item && insp && nextLook <= looks ? <p className="sub ie-pad-hint">Piece <b>{item}</b>, inspector <b>{insp}</b>, look <b>{nextLook}</b> of {looks}</p> : null}
      </>}
      {phase === 'ref' && item ? <p className="sub ie-pad-hint">Expert reference for <b>{item}</b></p> : null}
      <div className="ie-kind-taps">
        <button type="button" className="btn btn-primary" disabled={!item || (phase === 'judgment' && (!insp || nextLook > looks))} onClick={() => addVerdict(false, phase === 'ref')}>Pass</button>
        <button type="button" className="btn" disabled={!item || (phase === 'judgment' && (!insp || nextLook > looks))} onClick={() => addVerdict(true, phase === 'ref')}>Reject</button>
      </div>
      <AttrPaste onAdd={onAdd} items={g.items} inspectors={g.inspectors} looks={looks} />
    </div>
  );
}

function AttrPaste({ onAdd, items, inspectors, looks }: { onAdd: OnAdd; items: string[]; inspectors: string[]; looks: number }) {
  const [t, setT] = useState('');
  const [skipped, setSkipped] = useState<string[]>([]);
  const go = () => {
    const out: Omit<StudyReading, 'id' | 'at'>[] = [];
    const bad: string[] = [];
    for (const line of t.split(/\n/).map(x => x.trim()).filter(Boolean)) {
      const bits = line.split(/[\t,; ]+/).filter(Boolean);
      if (bits.length < 3) { bad.push(line); continue; }
      const verdict = /^(reject|fail|1|bad)$/i.test(bits[bits.length - 1]) ? 1 : /^(pass|good|0|ok)$/i.test(bits[bits.length - 1]) ? 0 : undefined;
      if (verdict === undefined) { bad.push(line); continue; }
      const itRaw = bits[0];
      const it = items.includes(itRaw) ? itRaw : items.find(x => x.toLowerCase() === itRaw.toLowerCase());
      if (!it) { bad.push(line); continue; }
      if (bits.length === 3 && /^ref(erence)?$/i.test(bits[1])) {
        out.push({ arm: it, col: 'reference', value: verdict });
        continue;
      }
      if (bits.length < 4) { bad.push(line); continue; }
      const name = bits[1];
      const lk = Number(bits[2]);
      if (!inspectors.includes(name) || !Number.isFinite(lk) || lk < 1 || lk > looks) { bad.push(line); continue; }
      out.push({ arm: it, col: name, group: lk, value: verdict });
    }
    if (out.length) onAdd(out);
    setSkipped(bad);
    setT('');
  };
  return (
    <div className="ie-paste">
      <label className="field"><span className="field-label">Or paste piece, inspector, look, pass|reject — one to a line</span>
        <textarea className="text-input" rows={3} value={t} onChange={e => setT(e.target.value)} aria-label="Paste attribute judgments" placeholder={'P01 reference reject\nP01 A 1 pass\nP01 A 2 pass'} /></label>
      <button type="button" className="btn" disabled={!t.trim()} onClick={go}>Add these</button>
      {skipped.length > 0 && <p className="ie-problem" role="status">Left out: {skipped.slice(0, 4).join('; ')}{skipped.length > 4 ? ` … ${skipped.length} lines` : ''}.</p>}
    </div>
  );
}

function GrrPaste({ onAdd, trials, parts, appraisers }: { onAdd: OnAdd; trials: number; parts: string[]; appraisers: string[]; }) {
  const [t, setT] = useState('');
  const [skipped, setSkipped] = useState<string[]>([]);
  const go = () => {
    const trialCount = new Map<string, number>();
    const out: Omit<StudyReading, 'id' | 'at'>[] = [];
    const bad: string[] = [];
    for (const line of t.split(/\n/).map(x => x.trim()).filter(Boolean)) {
      const bits = line.split(/[\t,; ]+/).filter(Boolean);
      if (bits.length < 3) { bad.push(line); continue; }
      const v = num(bits[bits.length - 1]);
      const appr = bits[bits.length - 2];
      const part = bits.slice(0, -2).join(' ');
      if (v === undefined || !parts.includes(part) || !appraisers.includes(appr)) { bad.push(line); continue; }
      const key = `${part}\0${appr}`;
      const tr = (trialCount.get(key) ?? 0) + 1;
      if (tr > trials) { bad.push(line); continue; }
      trialCount.set(key, tr);
      out.push({ value: v, arm: part, col: appr, group: tr });
    }
    if (out.length) onAdd(out);
    setSkipped(bad);
    setT('');
  };
  return (
    <div className="ie-paste">
      <label className="field"><span className="field-label">Or paste part, appraiser, value — one to a line</span>
        <textarea className="text-input" rows={3} value={t} onChange={e => setT(e.target.value)} aria-label="Paste gauge R&R readings" placeholder={'1 A 12.1\n1 A 12.0\n1 B 12.4'} /></label>
      <button type="button" className="btn" disabled={!t.trim()} onClick={go}>Add these</button>
      {skipped.length > 0 && <p className="ie-problem" role="status">Left out: {skipped.slice(0, 4).join('; ')}{skipped.length > 4 ? ` … ${skipped.length} lines` : ''}.</p>}
    </div>
  );
}

/** Gauge R&R: part × appraiser × trial — the next empty cell in the agreed grid. */
function GrrEntry({ a, readings, onAdd }: { a: AgreedAnalysis; readings: StudyReading[]; onAdd: OnAdd }) {
  const g = a.grr ?? { parts: [], appraisers: [], trials: 2 as const };
  const trials = g.trials ?? 2;
  const [part, setPart] = useState(g.parts[0] ?? '');
  const [appr, setAppr] = useState(g.appraisers[0] ?? '');
  const trialOf = (p: string, o: string) => readings.filter(r => !r.struck && r.arm === p && r.col === o && typeof r.value === 'number').length + 1;
  const nextTrial = part && appr ? trialOf(part, appr) : 1;
  const full = nextTrial > trials;
  const done = g.parts.length * g.appraisers.length * trials;
  const have = readings.filter(r => !r.struck && r.arm && r.col && typeof r.value === 'number').length;
  return (
    <div className="ie-cap-box" aria-label="Take the readings">
      <p className="ie-count"><b>{have}</b> of {done} readings · blind, random order on the floor</p>
      <div className="chip-row" role="radiogroup" aria-label="Which part?">
        {g.parts.map(p => <button key={p} type="button" role="radio" aria-checked={part === p} className={'chip' + (part === p ? ' on' : '')} onClick={() => setPart(p)}>{p}</button>)}
      </div>
      <div className="chip-row" role="radiogroup" aria-label="Which appraiser?">
        {g.appraisers.map(o => <button key={o} type="button" role="radio" aria-checked={appr === o} className={'chip' + (appr === o ? ' on' : '')} onClick={() => setAppr(o)}>{o}</button>)}
      </div>
      {part && appr && !full ? <>
        <p className="sub ie-pad-hint">Part <b>{part}</b>, appraiser <b>{appr}</b>, trial <b>{nextTrial}</b> of {trials} — then Enter</p>
        <Pad key={`${part}-${appr}-${nextTrial}`} unit={a.unit} label="The reading" onEnter={v => onAdd([{ value: v, arm: part, col: appr, group: nextTrial }])} />
      </> : full && part && appr ? <p className="sub">Every trial for {part} · {appr} is in — pick another cell.</p> : null}
      <GrrPaste onAdd={onAdd} trials={trials} parts={g.parts} appraisers={g.appraisers} />
    </div>
  );
}

type OnAdd = (rs: Omit<StudyReading, 'id' | 'at'>[]) => void;
/** Groups: a chip a group, a new one by name, the pad and a pasted column into the chosen group. */
function GroupEntry({ a, readings, onAdd }: { a: AgreedAnalysis; readings: StudyReading[]; onAdd: OnAdd }) {
  const noun = (a.firstName || 'group').toLowerCase();
  const seen = useMemo(() => { const out: string[] = []; for (const r of readings) if (r.arm && typeof r.value === 'number' && !out.includes(r.arm)) out.push(r.arm); return out; }, [readings]);
  const [extra, setExtra] = useState<string[]>([]), [cur, setCur] = useState(''), [fresh, setFresh] = useState('');
  const all = [...seen, ...extra.filter(x => !seen.includes(x))], sel = all.includes(cur) ? cur : all[0] ?? '';
  const n = (g: string) => readings.filter(r => !r.struck && r.arm === g && typeof r.value === 'number').length;
  const addGroup = () => { const g = fresh.trim(); if (!g) return; if (!all.some(x => x.toLowerCase() === g.toLowerCase())) setExtra(e => [...e, g]); setCur(all.find(x => x.toLowerCase() === g.toLowerCase()) ?? g); setFresh(''); };
  return (
    <div className="ie-cap-box" aria-label="Take the readings">
      <div className="chip-row" role="radiogroup" aria-label={`Which ${noun}?`}>
        {all.map(g => <button key={g} type="button" role="radio" aria-checked={sel === g} className={'chip' + (sel === g ? ' on' : '')} onClick={() => setCur(g)}>{g} · {n(g)}</button>)}
      </div>
      <div className="ie-kind-taps">
        <label className="field"><span className="field-label">{all.length ? `Another ${noun}` : `Name the first ${noun}`}</span>
          <input className="text-input" value={fresh} maxLength={30} onChange={e => setFresh(e.target.value)} placeholder={noun === 'shift' ? 'Nights' : 'Head 1'} aria-label={`New ${noun}`}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGroup(); } }} /></label>
        <button type="button" className="btn" disabled={!fresh.trim()} onClick={addGroup}>Add the {noun}</button>
      </div>
      {sel ? <>
        <p className="sub ie-pad-hint">Readings for <b>{sel}</b>, then Enter</p>
        <Pad key={sel} unit={a.unit} label="The reading" onEnter={v => onAdd([{ value: v, arm: sel }])} />
        <Paste cols={1} label={`Or paste ${sel}’s readings — a number to a line, or spaced`} onAdd={p => onAdd(p.values.map(value => ({ value, arm: sel })))} />
      </> : null}
    </div>
  );
}

/** A gauge across its range: a chip a reference, a new one by its value, the pad and a pasted column into the chosen reference. */
function GaugeRangeEntry({ a, readings, onAdd }: { a: AgreedAnalysis; readings: StudyReading[]; onAdd: OnAdd }) {
  const seen = useMemo(() => { const out: number[] = []; for (const r of readings) if (typeof r.with === 'number' && typeof r.value === 'number' && !out.includes(r.with)) out.push(r.with); return out.sort((x, y) => x - y); }, [readings]);
  const [extra, setExtra] = useState<number[]>([]), [cur, setCur] = useState<number | undefined>(undefined), [fresh, setFresh] = useState('');
  const all = [...seen, ...extra.filter(x => !seen.includes(x))].sort((x, y) => x - y), sel = cur !== undefined && all.includes(cur) ? cur : all[0];
  const n = (g: number) => readings.filter(r => !r.struck && r.with === g && typeof r.value === 'number').length;
  const u = a.unit ? ` ${a.unit}` : '';
  const addRef = () => { const v = num(fresh); if (v === undefined) return; if (!all.includes(v)) setExtra(e => [...e, v]); setCur(v); setFresh(''); };
  return (
    <div className="ie-cap-box" aria-label="Take the readings">
      <div className="chip-row" role="radiogroup" aria-label="Which reference?">
        {all.map(g => <button key={g} type="button" role="radio" aria-checked={sel === g} className={'chip' + (sel === g ? ' on' : '')} onClick={() => setCur(g)}>{g}{u} · {n(g)}</button>)}
      </div>
      <div className="ie-kind-taps">
        <label className="field"><span className="field-label">{all.length ? 'Another reference' : 'The first reference'}{u ? <i className="sub"> in{u}</i> : null}</span>
          <input className="text-input" inputMode="decimal" value={fresh} onChange={e => setFresh(e.target.value)} placeholder="20" aria-label="New reference"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRef(); } }} /></label>
        <button type="button" className="btn" disabled={num(fresh) === undefined} onClick={addRef}>Add the reference</button>
      </div>
      {sel !== undefined ? <>
        <p className="sub ie-pad-hint">Readings of the <b>{sel}{u}</b> reference, then Enter</p>
        <Pad key={sel} unit={a.unit} label="The reading" onEnter={v => onAdd([{ value: v, with: sel }])} />
        <Paste cols={1} label={`Or paste readings of ${sel}${u} — a number to a line, or spaced`} onAdd={p => onAdd(p.values.map(value => ({ value, with: sel })))} />
      </> : null}
    </div>
  );
}

/** A small table beside the picture — the references of a gauge, the shapes tried. The paper draws the same grid. */
function GridView({ g }: { g: Grid }) {
  return (
    <div className="ie-tbl-wrap ie-grid" role="group" aria-label={g.label}>
      <p className="sub ie-grid-label"><b>{g.label}</b></p>
      <table className="ie-tbl">
        <thead><tr>{g.head.map((h, i) => <th key={h} scope="col" className={i === 0 ? 'ie-tbl-corner' : ''}>{h}</th>)}</tr></thead>
        <tbody>{g.rows.map((r, i) => <tr key={i} className={g.mark?.includes(i) ? 'is-lead' : ''}>{r.map((c, j) => (j === 0 ? <th key={j} scope="row">{c}</th> : <td key={j}>{c}</td>))}</tr>)}</tbody>
      </table>
    </div>
  );
}

/** A table: a row, a column, a count — or the whole table pasted. */
function TableEntry({ a, readings, onAdd }: { a: AgreedAnalysis; readings: StudyReading[]; onAdd: OnAdd }) {
  const rows = a.rows ?? [], cols = a.cols ?? [], rowN = (a.firstName || 'row').toLowerCase(), colN = (a.secondName || 'column').toLowerCase();
  const [row, setRow] = useState(rows[0] ?? ''), [col, setCol] = useState(cols[0] ?? ''), [n, setN] = useState(''), [text, setText] = useState(''), [skipped, setSkipped] = useState<string[]>([]);
  const live = readings.filter(r => !r.struck && typeof r.made === 'number');
  const tot = (f: (r: StudyReading) => boolean) => live.filter(f).reduce((t, r) => t + (r.made as number), 0);
  const count = num(n), ok = count !== undefined && Number.isInteger(count) && count >= 0 && rows.includes(row) && cols.includes(col);
  const add = () => { if (!ok) return; onAdd([{ arm: row, col, made: count as number }]); setN(''); };
  return (
    <div className="ie-cap-box" aria-label="Count into the table">
      <div className="chip-row" role="radiogroup" aria-label={`Which ${rowN}?`}>
        {rows.map(r => <button key={r} type="button" role="radio" aria-checked={row === r} className={'chip' + (row === r ? ' on' : '')} onClick={() => setRow(r)}>{r} · {tot(x => x.arm === r)}</button>)}
      </div>
      <div className="chip-row" role="radiogroup" aria-label={`Which ${colN}?`}>
        {cols.map(c => <button key={c} type="button" role="radio" aria-checked={col === c} className={'chip' + (col === c ? ' on' : '')} onClick={() => setCol(c)}>{c} · {tot(x => x.col === c)}</button>)}
      </div>
      <div className="ie-agree-grid">
        <label className="field"><span className="field-label">How many — {row} / {col}</span>
          <input className="text-input" inputMode="numeric" value={n} onChange={e => setN(e.target.value)} placeholder="3" aria-label="How many" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} /></label>
      </div>
      <button type="button" className="btn btn-primary" disabled={!ok} onClick={add}>Add to the count</button>
      <div className="ie-paste">
        <label className="field"><span className="field-label">Or paste the whole table — {rows.length} lines of {cols.length} counts, in the order above</span>
          <textarea className="text-input" rows={Math.min(rows.length + 1, 6)} value={text} onChange={e => setText(e.target.value)} aria-label="Paste the table" placeholder={rows.map((_, i) => cols.map((_c, j) => (i + j) % 4 + 2).join(' ')).join('\n')} /></label>
        <button type="button" className="btn" disabled={!text.trim()} onClick={() => {
          const p = parseRows(text, cols.length), out: Omit<StudyReading, 'id' | 'at'>[] = [], bad = [...p.skipped];
          p.rows.forEach((vals, i) => { if (i >= rows.length) { bad.push(vals.join(' ')); return; } vals.forEach((v, j) => { if (Number.isInteger(v) && v > 0) out.push({ arm: rows[i], col: cols[j], made: v }); else if (!Number.isInteger(v) || v < 0) bad.push(String(v)); }); });
          if (out.length) onAdd(out); setSkipped(bad); setText('');
        }}>Add these counts</button>
        {skipped.length > 0 && <p className="ie-problem" role="status">Left out — not whole counts in place: {skipped.slice(0, 6).join(', ')}{skipped.length > 6 ? `, and ${skipped.length - 6} more` : ''}.</p>}
      </div>
    </div>
  );
}

/** A relation: a box a driver and one for the result, Enter moving on; or rows pasted. */
function RelateEntry({ a, onAdd }: { a: AgreedAnalysis; onAdd: OnAdd }) {
  const ds = a.drivers ?? [], width = ds.length + 1;
  const [vals, setVals] = useState<string[]>(() => Array(width).fill(''));
  const [text, setText] = useState(''), [skipped, setSkipped] = useState<string[]>([]);
  const nums = vals.map(num), ok = nums.length === width && nums.every(v => v !== undefined);
  const add = () => { if (!ok) return; onAdd([{ xs: nums.slice(0, ds.length) as number[], value: nums[ds.length] as number }]); setVals(Array(width).fill('')); (document.querySelector('.ie-relrow input') as HTMLInputElement | null)?.focus(); };
  const labels = [...ds.map(d => `${d.name}${d.unit ? ` (${d.unit})` : ''}`), `${a.name}${a.unit ? ` (${a.unit})` : ''}`];
  return (
    <div className="ie-cap-box" aria-label={ds.length === 1 ? 'Take the pairs' : 'Take the rows'}>
      <div className="ie-agree-grid ie-relrow">
        {labels.map((l, i) => (
          <label key={l + i} className="field"><span className="field-label">{l}</span>
            <input className="text-input" inputMode="decimal" value={vals[i] ?? ''} aria-label={l} onChange={e => setVals(v => v.map((x, k) => (k === i ? e.target.value : x)))}
              onKeyDown={e => { if (e.key !== 'Enter') return; e.preventDefault(); if (i < width - 1) ((e.currentTarget.closest('.ie-relrow')?.querySelectorAll('input')[i + 1]) as HTMLInputElement | undefined)?.focus(); else add(); }} /></label>
        ))}
      </div>
      <button type="button" className="btn btn-primary" disabled={!ok} onClick={add}>{ds.length === 1 ? 'Add the pair' : 'Add the row'}</button>
      <div className="ie-paste">
        <label className="field"><span className="field-label">Or paste rows — {width} numbers to a line: {labels.map(l => l.replace(/ \(.*\)$/, '')).join(', ')}</span>
          <textarea className="text-input" rows={3} value={text} onChange={e => setText(e.target.value)} aria-label="Paste rows" placeholder={Array.from({ length: 2 }, (_, r) => Array.from({ length: width }, (_c, c) => (r * 5 + c * 3 + 10)).join(' ')).join('\n')} /></label>
        <button type="button" className="btn" disabled={!text.trim()} onClick={() => { const p = parseRows(text, width); if (p.rows.length) onAdd(p.rows.map(r => ({ xs: r.slice(0, ds.length), value: r[ds.length] }))); setSkipped(p.skipped); setText(''); }}>Add these rows</button>
        {skipped.length > 0 && <p className="ie-problem" role="status">Left out — not {width} numbers: {skipped.slice(0, 4).join(' | ')}{skipped.length > 4 ? `, and ${skipped.length - 4} more` : ''}.</p>}
      </div>
    </div>
  );
}

function SimpleEntry({ a, readings, onAdd }: { a: AgreedAnalysis; readings: StudyReading[]; onAdd: OnAdd }) {
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
  const note = a.kind === 'plan' ? (a.plan?.ask === 'cycles' ? 'The timed cycles, in seconds' : 'Readings to take the spread from — optional') : a.kind === 'gauge' && a.gauge?.mode === 'drift' ? 'One check at a time, in the order taken' : a.kind === 'gauge' ? `The reference read again — ${a.gauge?.reference ?? ''}${a.unit ? ` ${a.unit}` : ''}` : a.kind === 'learn' ? `The time each run took${unit ? `, in ${unit}` : ''}, in the order made — run 1 first. A run struck keeps its place.` : undefined;
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
  const word = (r: StudyReading): string => (a.kind === 'attr' && r.arm && r.col && typeof r.value === 'number' ? `${r.arm} · ${r.col}${r.col !== 'reference' ? ` · look ${r.group ?? 1}` : ' (reference)'}: ${verdictWord(r.value)}` : a.kind === 'grr' && r.arm && r.col && typeof r.value === 'number' ? `${r.arm} · ${r.col} · trial ${r.group ?? 1}: ${r.value}${u}` : r.col !== undefined && typeof r.made === 'number' ? `${r.arm} × ${r.col}: ${r.made}` : Array.isArray(r.xs) && typeof r.value === 'number' ? `${r.xs.join(', ')} → ${r.value}${u}` : typeof r.with === 'number' && a.kind === 'gauge' ? `${r.value}${u} against ${r.with}${u}` : typeof r.with === 'number' ? `${r.value}${u} → ${r.with}${u}` : typeof r.made === 'number' ? `${r.rejected} of ${r.made}${a.kind === 'sure' && a.of === 'rate' ? ` over ${r.made}${u}`.replace(/^ of.*/, '') : ''}` : typeof r.value === 'number' ? `${r.value}${u}` : '—');
  return (
    <details className="ie-readings">
      <summary>Every reading, in the order taken ({readings.length})</summary>
      <ul className="ie-rows">
        {readings.map((r, i) => (
          <li key={r.id} className={r.struck ? 'is-struck' : ''}>
            <span className="ie-no">{i + 1}</span>
            <b>{word(r)}{r.arm && r.col === undefined ? ` · ${r.arm}` : ''}</b>
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

/* ----------------------------------------------------------------- a table and a scatter */
const SW = 640, SH = 300, SL = 58, SR = 14, ST = 12, SB = 40;
function PlotView({ plot, said }: { plot: Plot; said: string }) {
  if (plot.kind === 'table') {
    const { rows, cols, counts, expected, residuals } = plot;
    return (
      <div className="ie-tbl-wrap" role="img" aria-label={said}>
        <table className="ie-tbl">
          <thead><tr><th scope="col" className="ie-tbl-corner">{plot.rowName} \ {plot.colName}</th>{cols.map(c => <th key={c} scope="col">{c}</th>)}<th scope="col">All</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r}><th scope="row">{r}</th>
                {cols.map((c, j) => {
                  const z = residuals[i][j], flag = Math.abs(z) > 2 ? (z > 0 ? 'more' : 'fewer') : '';
                  return <td key={c} className={flag ? `is-${flag}` : ''}><b>{counts[i][j]}</b><small>{expected[i][j].toFixed(1)}</small>{flag && <em>{flag}</em>}</td>;
                })}
                <td className="ie-tbl-tot">{plot.rowTotals[i]}</td></tr>
            ))}
            <tr><th scope="row">All</th>{cols.map((c, j) => <td key={c} className="ie-tbl-tot">{plot.colTotals[j]}</td>)}<td className="ie-tbl-tot"><b>{plot.total}</b></td></tr>
          </tbody>
        </table>
      </div>
    );
  }
  const x = (v: number) => SL + ((v - plot.xAxis[0]) / (plot.xAxis[1] - plot.xAxis[0])) * (SW - SL - SR), y = (v: number) => ST + (1 - (v - plot.yAxis[0]) / (plot.yAxis[1] - plot.yAxis[0])) * (SH - ST - SB);
  const band = plot.band ? `${plot.band.map(b => `${x(b.x)},${y(b.hi)}`).join(' ')} ${[...plot.band].reverse().map(b => `${x(b.x)},${y(b.lo)}`).join(' ')}` : '';
  const tick = (lo: number, hi: number) => [0, 1, 2, 3, 4].map(i => lo + ((hi - lo) * i) / 4);
  const f = (v: number) => Number(v.toPrecision(3)).toString();
  return (
    <svg className="ie-svg ie-an-scatter" viewBox={`0 0 ${SW} ${SH}`} role="img" aria-label={said}>
      <line x1={SL} x2={SW - SR} y1={SH - SB} y2={SH - SB} className="ie-an-axis" /><line x1={SL} x2={SL} y1={ST} y2={SH - SB} className="ie-an-axis" />
      {tick(plot.xAxis[0], plot.xAxis[1]).map(v => <text key={'x' + v} x={x(v)} y={SH - SB + 14} textAnchor="middle" className="ie-an-sub">{f(v)}</text>)}
      {tick(plot.yAxis[0], plot.yAxis[1]).map(v => <text key={'y' + v} x={SL - 6} y={y(v) + 3} textAnchor="end" className="ie-an-sub">{f(v)}</text>)}
      {band && <polygon points={band} className="ie-an-band is-n" />}
      {plot.ref && <g><line x1={SL} x2={SW - SR} y1={y(plot.ref.y)} y2={y(plot.ref.y)} className="ie-an-ref" /><text x={SW - SR} y={y(plot.ref.y) - 4} textAnchor="end" className="ie-an-sub">{plot.ref.label}</text></g>}
      {plot.curve && <polyline points={plot.curve.map(p => `${x(p[0])},${y(p[1])}`).join(' ')} className="ie-an-fit" fill="none" />}
      {plot.line && <line x1={x(plot.line[0][0])} y1={y(plot.line[0][1])} x2={x(plot.line[1][0])} y2={y(plot.line[1][1])} className={'ie-an-fit' + (plot.equal ? ' is-equal' : '')} />}
      {plot.pts.map((p, i) => <circle key={i} cx={x(p[0])} cy={y(p[1])} r={3.2} className="ie-an-dot" />)}
      <text x={(SL + SW - SR) / 2} y={SH - 6} textAnchor="middle" className="ie-an-lab">{plot.xName}{plot.xUnit ? ` (${plot.xUnit})` : ''}</text>
      <text transform={`translate(12 ${(ST + SH - SB) / 2}) rotate(-90)`} textAnchor="middle" className="ie-an-lab">{plot.yName}{plot.yUnit ? ` (${plot.yUnit})` : ''}</text>
    </svg>
  );
}

/** What the line gives at a typed driver — inside the readings with its two intervals, beyond them said to be a guess. */
function Predict({ f, a }: { f: RelateFigures; a: AgreedAnalysis }) {
  const [t, setT] = useState('');
  const d = f.drivers[0], x0 = num(t), say = x0 !== undefined ? predictionSays(f, a, x0) : undefined;
  return (
    <div className="ie-predict">
      <label className="field"><span className="field-label">What does the line give at … <i className="sub">{d.name}{d.unit ? ` (${d.unit})` : ''}</i></span>
        <input className="text-input" inputMode="decimal" value={t} onChange={e => setT(e.target.value)} placeholder={f.line ? String(Math.round((f.line.xRange[0] + f.line.xRange[1]) / 2)) : ''} aria-label="Predict at" /></label>
      {say && <p className={'ie-check' + (say.inside ? ' is-n' : ' is-a')} role="status">{say.text}</p>}
    </div>
  );
}
