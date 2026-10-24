/* ONE CAPABILITY STUDY — readings in, Cpk out (docs/TOOLKIT.md, Part 4, tool
 * 1; docs/BUILD.md, 2d).
 *
 * The frame every tool shares (TOOLKIT 3.1), in the order of the three
 * questions: where are we (the strip), why are we not where we should be (the
 * sentence and the abnormal in the picture), what are we doing about it (the
 * act row). Agreed before measured: until the limits and the count are
 * agreed, that is the only thing on the page.
 *
 * On a phone at the machine: the number pad is the screen — big keys, ↵ — and
 * each reading lands as a dot as it is typed. "12 of 30 in" climbs. A mistype
 * is struck, never erased: it keeps its number and counts for nothing.
 *
 * Nothing worked out is stored. The figures and both sentences come from
 * lib/ie/sample on every render; only at close are they written down, as a
 * receipt, so next month's edits cannot rewrite this month's claim. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getStudy, onDataChange, patchStudy } from '../../db';
import { machineOntoLine } from '../../lib/lines';
import { useAccess } from '../../cloud/access';
import { useSession } from '../../cloud/session';
import { displayName } from '../../cloud/team';
import { can as canAt } from '../../lib/access';
import { now, uid } from '../../lib/ids';
import { niceDay, isoDay } from '../../lib/weeks';
import { nav } from '../../state/useRoute';
import { allowFailProblem, checksSay, confOf, judgeOf, passFailPlanOf, pctWord, sample, sampleLines, sampleSays, ticksAgreedWords, CONFIDENCES, CPK_FROM, SURE, type Judge, type SampleFigures, type SampleSays, FATES, fateOf, fateWord, moneySays, sampleMoney, weightUnit, type Fate } from './sample';
import type { AgreedReadings, StudyReading, ToolStudy } from '../../lib/study';
import { TOOL_WORDS } from '../../screens/StudiesScreen';
import { StudyBand } from '../../ui/StudyActs';
import { WhereItSits, UsedFor, useBetter } from '../../ui/StudyPlace';
import { LeanActions, LeanClosing, LeanPanel, LeanTiles } from '../../ui/Lean';
import { bandPage } from '../../lib/lean';
import { sampleClosing, sampleTiles } from './sampleLean';
import { modeNotes, packersTne, spreadSays } from './sample';
import { modeAgreedWords, modeProblem } from './modes';
import { RunsChart, UChart, Pareto, RateBars, RunsCapture, FaultsCapture, modeReadingWord } from './ModeParts';
import { raisedFrom } from '../losses/lossLean';
import { DraftText } from '../../ui/Draft';
import { useMachinesOf } from '../../lib/useLineRecords';

const OWNER = canAt('owner');

export function StudyScreen({ id }: { id: string }) {
  const [s, setS] = useState<ToolStudy | null | undefined>(undefined);
  const load = useCallback(async () => setS((await getStudy(id)) ?? null), [id]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  const jobCan = useAccess(s?.projectId ?? '');
  /* On a job, the job's rule; a quick session or a line's, its people may do
     all of it, as on a snag (TOOLKIT 3.6). */
  const can = s?.projectId ? jobCan : OWNER;
  const { session } = useSession();
  const me = displayName(session?.user.email) || undefined;

  if (s === undefined) return <div className="wrap ie"><p className="sub">Opening…</p></div>;
  if (s === null) return (
    <div className="wrap ie">
      <h1>This study isn’t on this device</h1>
      <p className="sub">It may have been deleted, or not synced here yet.</p>
      <button type="button" className="btn" onClick={() => nav('/capability')}>Every capability study</button>
    </div>
  );
  return <Study s={s} can={can} me={me} />;
}

function Study({ s, can, me }: { s: ToolStudy; can: ReturnType<typeof canAt>; me?: string }) {
  const a = s.agreed?.readings;
  const readings = useMemo(() => s.facts.readings ?? [], [s.facts.readings]);
  const f = useMemo(() => sample(a, readings), [a, readings]);
  const said = useMemo(() => sampleSays(f, a), [f, a]);
  const closed = !!s.closedAt;
  const [agreeing, setAgreeing] = useState(false);
  const write = (p: Parameters<typeof patchStudy>[1]) => void patchStudy(s.id, p);
  const w = TOOL_WORDS[s.tool];
  /* what was raised from it — the action plan (ui/StudyPlace useBetter) */
  const { steps, tests } = useBetter(s, me);

  const add = (r: Omit<StudyReading, 'id' | 'at'>) =>
    write(cur => ({ facts: { ...cur.facts, readings: [...(cur.facts.readings ?? []), { id: uid(), at: now(), ...(me ? { who: me } : {}), ...r }] } }));
  const strike = (rid: string, struck: boolean) =>
    write(cur => ({ facts: { ...cur.facts, readings: (cur.facts.readings ?? []).map(r => (r.id === rid ? { ...r, struck: struck || undefined } : r)) } }));
  /* a failed item's fate — waste, reworked, recovered by hand (FC-156; Rowland, 24 October) */
  const setFate = (rid: string, fate: Fate) =>
    write(cur => ({ facts: { ...cur.facts, readings: (cur.facts.readings ?? []).map(r => (r.id === rid ? { ...r, ...(fate === 'waste' ? { fate: undefined } : { fate }) } : r)) } }));

  return (
    <div className="wrap ie">
      {/* THE LEAN PAGE (docs/LEAN-PAGE.md, slice 6; lib/ie/sampleLean): the
          band with the verdict, the tiles in the strip's place, the action
          plan and the closing line */}
      <StudyBand page={bandPage(w?.one ?? 'Study', s, said.verdict, said.tone)} s={s} what={w?.one ?? 'Study'} canEdit={can.edit && !closed} canRemove={can.remove} />
      <div className="ln-under">
        <p className="sub ie-where">
          {s.workspaceId && can.edit && !closed ? <StudyMachine s={s} /> : s.machine ? <><b>{s.machine}</b> · </> : null}
          started {niceDay(isoDay(s.startedAt))}
        </p>
        <WhereItSits s={s} can={can} />
      </div>

      {!a || agreeing ? (
        <Agree s={s} canAgree={can.agree && !closed} hasReadings={f.n > 0} onDone={() => setAgreeing(false)} cancel={a ? () => setAgreeing(false) : undefined} />
      ) : (
        <>
          <LeanTiles tiles={sampleTiles(f, a, said)} className="ie-strip" />
          <Says said={said} s={s} f={f} a={a} />
          <div className="ie-body">
            {/* W1 — the modes' pictures (./ModeParts): a run or an inspection a bar against its limits, the faults' Pareto, a rate's intervals */}
            <div className="ie-pic">{a.kind === 'ticks' ? <Ticks readings={readings} />
              : a.kind === 'rejects' && f.runs ? <RunsChart r={f.runs} />
              : a.kind === 'faults' && f.faults ? <><UChart q={f.faults} /><Pareto q={f.faults} /></>
              : a.kind === 'rate' && f.rate ? <RateBars r={f.rate} unit={a.unit} />
              : <><Dots f={f} a={a} readings={readings} said={said} /><Hist f={f} a={a} /></>}</div>
            {!closed && can.edit && (a.kind === 'rejects' ? <RunsCapture f={f} onAdd={add} /> : a.kind === 'faults' ? <FaultsCapture a={a} f={f} onAdd={add} />
              : <Capture a={a} f={f} readings={readings} onAdd={add} onStrike={id => strike(id, true)} onFate={setFate} />)}
          </div>
          <Readings readings={readings} f={f} a={a} canStrike={can.edit && !closed} onStrike={strike} onFate={setFate} />
          <p className="ie-agreed sub">
            Agreed: <b>{agreedWords(a)}</b>
            {can.agree && !closed && <button type="button" className="linkish" onClick={() => setAgreeing(true)}>Change what was agreed</button>}
          </p>
          <UsedFor s={s} can={can} me={me} />
          <Act s={s} f={f} said={said} can={can} me={me} write={write} />
          <LeanPanel title="Action plan" className="ln-solo ln-plan-p">
            <LeanActions actions={raisedFrom(s, steps, tests)} empty="Nothing raised from it yet — Make it better raises a fix or a countermeasure in its own figures." />
          </LeanPanel>
          <LeanClosing closing={sampleClosing(f, a, said)} />
        </>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- machine */
/** WHICH MACHINE, ON ITS LINE — picked from the line's machines (lib/
 *  lineRecords machinesOf), the job's own on it with them; typed, it is kept
 *  as typed. Flow audit #14: "A study's machine is typed" — "Ishida
 *  CCW-RV-214W multihead weigher", not the line's "Ishida checkweigher". */
function StudyMachine({ s }: { s: ToolStudy }) {
  const machines = useMachinesOf(s.workspaceId, s.projectId);
  const id = `ie-machines-${s.id}`;
  /* a machine typed here joins its line's list (lib/lines machineOntoLine) — every machine is on a line */
  return (
    <>
      <DraftText className="text-input ie-machine" value={s.machine ?? ''} ariaLabel="Which machine it is of" placeholder="Which machine?" max={80} list={id}
        onSave={v => void patchStudy(s.id, { machine: v.trim() || undefined }).then(() => machineOntoLine(s.workspaceId, v))} />
      <datalist id={id}>{machines.map(m => <option key={m} value={m} />)}</datalist>
      {' · '}
    </>
  );
}


/* ------------------------------------------------------------------ agree */
/* THE QUESTION FIRST (knowledge/specs/FC-094-capability.md §8 — Rowland, 22
   October: "I've got no idea what the tick is"): what is being measured, each
   with an example; then, for a measurement, which side it is judged on; and
   only the boxes that choice needs. */
const KINDS: { k: AgreedReadings['kind']; word: string; eg: string }[] = [
  { k: 'limits', word: 'A measurement', eg: 'a weight, a length, a temperature, a speed' },
  { k: 'packers', word: 'Sold by weight (℮)', eg: 'the nominal on the pack — the packers’ three rules follow from it' },
  { k: 'ticks', word: 'Pass or fail', eg: 'one at a time — a seal re-test, the metal detector’s test packs' },
  /* W1 (knowledge/specs/FC-094-capability.md parts 2–4) */
  { k: 'rejects', word: 'Rejects out of what was made', eg: 'a run’s rejects against the packs made — the reject rate' },
  { k: 'faults', word: 'Faults found on each item', eg: 'a pack inspected for seal, label, print — faults an item, by kind' },
  { k: 'rate', word: 'Held at a rate for a time', eg: 'at least 75 a minute for 30 minutes — counted an interval at a time' },
];
/* A MEASUREMENT'S QUESTION (W1) — only the words and the one box each needs change */
const QUESTIONS: { k: NonNullable<AgreedReadings['question']> | 'plain'; word: string; eg: string }[] = [
  { k: 'plain', word: 'A measurement', eg: 'a weight, a length, a temperature, a speed' },
  { k: 'oxygen', word: 'Oxygen in a pack', eg: 'residual oxygen, at most — the readings lean' },
  { k: 'seal', word: 'A seal', eg: 'seal strength, at least' },
  { k: 'ccp', word: 'A CCP’s limit', eg: 'a cook or a chill against its critical limit' },
  { k: 'weigher', word: 'A weigher’s heads', eg: 'each reading from a head' },
  { k: 'machine', word: 'One machine’s parts', eg: 'consecutive parts — Cm and Cmk for acceptance' },
];
/* PASS OR FAIL, HOW IT IS JUDGED (knowledge/specs/FC-094-capability.md, part 1b — Rowland, 23 October:
   "Am I doing a confidence level, or am I doing the other level?") */
const JUDGES: { k: Judge; word: string; eg: string }[] = [
  { k: 'count', word: 'How many may fail', eg: 'a number — none may fail, or 2 of 50' },
  { k: 'loss', word: 'A loss allowed', eg: 'the business’s rule — at least 98% good' },
  { k: 'confidence', word: 'A confidence level', eg: 'how sure — 95% confident at least 98% are good' },
];
type Side = 'both' | 'least' | 'most';
const SIDES: { k: Side; word: string; eg: string }[] = [
  { k: 'both', word: 'Between two limits', eg: 'fill 400–404 g' },
  { k: 'least', word: 'At least', eg: 'speed at least 75 a minute' },
  { k: 'most', word: 'At most', eg: 'oxygen at most 2%' },
];
const numOr = (t: string) => (t.trim() === '' ? undefined : Number(t));
const sideOf = (a?: AgreedReadings): Side => (a?.lower !== undefined && a.upper === undefined ? 'least' : a?.upper !== undefined && a.lower === undefined ? 'most' : 'both');

function Agree({ s, canAgree, hasReadings, onDone, cancel }: { s: ToolStudy; canAgree: boolean; hasReadings: boolean; onDone: () => void; cancel?: () => void }) {
  const a = s.agreed?.readings;
  const [kind, setKind] = useState<AgreedReadings['kind']>(a?.kind ?? 'limits');
  const [side, setSide] = useState<Side>(sideOf(a));
  const [unit, setUnit] = useState(a?.unit ?? 'g');
  const [nominal, setNominal] = useState(a?.nominal?.toString() ?? '');
  const [lower, setLower] = useState(a?.lower?.toString() ?? '');
  const [upper, setUpper] = useState(a?.upper?.toString() ?? '');
  const [count, setCount] = useState((a?.count ?? 30).toString());
  const [allow, setAllow] = useState((a?.allowFail ?? 0).toString());
  const [judge, setJudge] = useState<Judge>(judgeOf(a));
  const [goodPct, setGoodPct] = useState((a?.good ?? 98).toString());
  const [conf, setConf] = useState<number>(confOf(a));
  /* W1 — the modes' own boxes */
  const [maxShare, setMaxShare] = useState(a?.maxShare?.toString() ?? '');
  const [opps, setOpps] = useState(a?.opportunities?.toString() ?? '');
  const [kindsText, setKindsText] = useState((a?.faultKinds ?? []).join(', '));
  const [intervalMin, setIntervalMin] = useState((a?.intervalMin ?? 1).toString());
  const [heldShare, setHeldShare] = useState((a?.heldShare ?? 90).toString());
  const [question, setQuestion] = useState<NonNullable<AgreedReadings['question']> | 'plain'>(a?.question ?? 'plain');
  const [cmkAgreed, setCmkAgreed] = useState((a?.cmkAgreed ?? 1.67).toString());
  /* part 4 — where the limit comes from, a CCP's probe bias, a volume pack's millilitres and density */
  const [limitSource, setLimitSource] = useState(a?.limitSource ?? '');
  const [probeBias, setProbeBias] = useState(a?.probeBias?.toString() ?? '');
  const [nominalMl, setNominalMl] = useState(a?.nominalMl?.toString() ?? '');
  const [density, setDensity] = useState(a?.density?.toString() ?? '');
  const ml = numOr(nominalMl), dens = numOr(density), byVolume = kind === 'packers' && (nominalMl.trim() !== '' || density.trim() !== '');
  const counted = kind === 'rejects' || kind === 'faults' || kind === 'rate';
  const faultKinds = kindsText.split(/[,\n]/).map(x => x.trim()).filter(Boolean).slice(0, 12);
  /* MONEY (knowledge/specs/FC-156-capability-money.md — Rowland, 24 October: typed on each study), every box optional */
  const [packs, setPacks] = useState(a?.packsPerShift?.toString() ?? '');
  const [shiftsWk, setShiftsWk] = useState(a?.shiftsPerWeek?.toString() ?? '');
  const [costKg, setCostKg] = useState(a?.costPerKg?.toString() ?? '');
  const [materials, setMaterials] = useState(a?.materialsPerPack?.toString() ?? '');
  const [rework, setRework] = useState(a?.reworkPerPack?.toString() ?? '');
  const nomTyped = numOr(nominal), lo = side === 'most' ? undefined : numOr(lower), hi = side === 'least' ? undefined : numOr(upper);
  /* a volume pack checked by weight: the nominal in grams is the millilitres × the density (FC-163) */
  const nom = byVolume ? (ml !== undefined && dens !== undefined && dens > 0 ? Math.round(ml * dens * 100) / 100 : undefined) : nomTyped;
  const n = Math.round(Number(count)), k = Number(allow.trim() === '' ? '0' : allow);
  const tne = kind === 'packers' && nom !== undefined ? packersTne({ nominal: nom, unit, ...(byVolume ? { nominalMl: ml, density: dens } : {}) }) : undefined;
  const ticks = kind === 'ticks';
  const g = Number(goodPct.trim());
  const modeAgreed = { kind, count: n, ...(maxShare.trim() !== '' ? { maxShare: Number(maxShare) } : {}), ...(opps.trim() !== '' ? { opportunities: Number(opps) } : {}),
    ...(kind === 'rate' ? { intervalMin: Number(intervalMin), heldShare: Number(heldShare), ...(side === 'most' ? { upper: hi } : { lower: lo }) } : {}) };
  /* what the way chosen would mean, or why it cannot be agreed (lib/ie/sample passFailPlanOf) */
  const plan = ticks && n >= 1 ? passFailPlanOf({ count: n, judge, allowFail: k, good: g, conf }) : undefined;
  /* a new study's count follows the question: 30 readings, 20 to check */
  const DEFAULT_COUNT: Record<AgreedReadings['kind'], string> = { limits: '30', packers: '30', ticks: '20', rejects: '10', faults: '10', rate: '30' };
  const pick = (to: AgreedReadings['kind']) => {
    if (!a && count === DEFAULT_COUNT[kind]) setCount(DEFAULT_COUNT[to]);
    if (to === 'rate' && side === 'both') setSide('least');
    setKind(to);
  };
  const problem =
    counted && modeProblem(modeAgreed) ? modeProblem(modeAgreed)
    : counted && [maxShare, opps, intervalMin, heldShare].some(t => t.trim() !== '' && !Number.isFinite(Number(t))) ? 'Numbers only in the boxes.'
    : kind === 'rate' && (side === 'most' ? hi === undefined : lo === undefined) ? 'The rate — at least or at most what, a minute?'
    : kind === 'limits' && question === 'machine' && !(Number(cmkAgreed) > 0) ? 'The Cmk agreed for acceptance — a number above 0 (the usual is 1.67).'
    : kind === 'limits' && question === 'ccp' && probeBias.trim() !== '' && !Number.isFinite(Number(probeBias)) ? 'The probe’s bias — a number, in the unit (0.14 reads high; −0.1 reads low).'
    : byVolume && (ml === undefined || !(ml > 0)) ? 'The nominal in millilitres — what the pack says.'
    : byVolume && (dens === undefined || !(dens > 0)) ? 'The density in g/ml — the product’s, at the temperature it is packed.'
    : !(n >= 1) ? (ticks ? 'How many to check — at least 1.' : 'How many readings — at least 1.')
    : ticks ? (judge === 'count' ? allowFailProblem(n, k) : plan?.problem ?? '')
    : [nom, lo, hi].some(x => x !== undefined && !Number.isFinite(x)) ? 'Numbers only in the limits.'
    : kind === 'limits' && side === 'least' && lo === undefined ? 'Type the limit — at least what?'
    : kind === 'limits' && side === 'most' && hi === undefined ? 'Type the limit — at most what?'
    : kind === 'limits' && side === 'both' && (lo === undefined || hi === undefined) ? 'Both limits — or choose At least or At most.'
    : kind === 'limits' && lo !== undefined && hi !== undefined && lo >= hi ? 'The lower limit has to be below the upper.'
    : kind === 'packers' && nom === undefined ? 'The nominal — what the pack says.'
    : kind === 'packers' && tne === undefined ? 'The packers’ rules cover 5 g to 10 kg (or ml to l).'
    : [packs, shiftsWk, costKg, materials, rework].some(t => t.trim() !== '' && !(Number.isFinite(Number(t)) && Number(t) >= 0)) ? 'The money boxes take numbers, zero or more.'
    : packs.trim() !== '' && !(Number(packs) >= 1) ? 'Packs a shift — at least 1.'
    : '';
  const moneyOf = (t: string) => (t.trim() === '' ? undefined : Number(t));

  const save = () => {
    if (problem || !canAgree) return;
    const agreed: AgreedReadings = { kind, count: n,
      ...(!ticks && unit.trim() ? { unit: unit.trim() } : {}),
      ...(!ticks && nom !== undefined ? { nominal: nom } : {}),
      ...((kind === 'limits' || kind === 'rate') && lo !== undefined ? { lower: lo } : {}),
      ...((kind === 'limits' || kind === 'rate') && hi !== undefined ? { upper: hi } : {}),
      /* W1 — the modes' fields, only the ones the kind uses */
      ...((kind === 'rejects' || kind === 'faults') && maxShare.trim() !== '' ? { maxShare: Number(maxShare) } : {}),
      ...(kind === 'faults' && opps.trim() !== '' ? { opportunities: Math.round(Number(opps)) } : {}),
      ...(kind === 'faults' && faultKinds.length ? { faultKinds } : {}),
      ...(kind === 'rate' ? { intervalMin: Number(intervalMin), ...(Number(heldShare) !== 90 ? { heldShare: Number(heldShare) } : {}) } : {}),
      ...(kind === 'limits' && question !== 'plain' ? { question } : {}),
      ...(kind === 'limits' && question === 'machine' && Number(cmkAgreed) !== 1.67 ? { cmkAgreed: Number(cmkAgreed) } : {}),
      ...(kind === 'limits' && (question === 'oxygen' || question === 'seal' || question === 'ccp') && limitSource.trim() ? { limitSource: limitSource.trim().slice(0, 80) } : {}),
      ...(kind === 'limits' && question === 'ccp' && probeBias.trim() !== '' && Number(probeBias) !== 0 ? { probeBias: Number(probeBias) } : {}),
      ...(byVolume && ml !== undefined && dens !== undefined ? { nominalMl: ml, density: dens } : {}),
      ...(kind === 'rejects' && moneyOf(materials) !== undefined ? { materialsPerPack: moneyOf(materials) } : {}),
      ...(ticks && judge === 'count' && k > 0 ? { allowFail: k } : {}),
      ...(ticks && judge !== 'count' ? { judge, good: g } : {}),
      ...(ticks && conf !== SURE ? { conf } : {}),
      ...(moneyOf(packs) !== undefined ? { packsPerShift: Math.round(moneyOf(packs) as number) } : {}),
      ...(moneyOf(shiftsWk) ? { shiftsPerWeek: moneyOf(shiftsWk) } : {}),
      ...(!ticks && moneyOf(costKg) ? { costPerKg: moneyOf(costKg) } : {}),
      ...(ticks && moneyOf(materials) !== undefined ? { materialsPerPack: moneyOf(materials) } : {}),
      ...(ticks && moneyOf(rework) !== undefined ? { reworkPerPack: moneyOf(rework) } : {}) };
    void patchStudy(s.id, cur => ({ agreed: { ...cur.agreed, readings: agreed } }));
    onDone();
  };

  if (!canAgree) return (
    <div className="ie-agree is-wait">
      <p><b>What it is judged against isn’t agreed yet.</b> The project’s owner agrees it, before the readings go in.</p>
    </div>
  );
  return (
    <form className="ie-agree" onSubmit={e => { e.preventDefault(); save(); }}>
      <h2>Agree what it is judged against</h2>
      <p className="sub">Agreed before the readings go in, so a reading never moves it.</p>
      {hasReadings && <p className="ie-note">Readings are already in: they will be judged against what you agree now.</p>}
      <div className="ie-kinds" role="radiogroup" aria-label="What are you measuring?">
        <span className="field-label">What are you measuring?</span>
        {KINDS.map(x => (
          <button key={x.k} type="button" role="radio" aria-checked={kind === x.k} className={'ie-kind' + (kind === x.k ? ' on' : '')} onClick={() => pick(x.k)}>
            <b>{x.word}</b><small>{x.eg}</small>
          </button>
        ))}
      </div>
      {kind === 'limits' && (
        <div className="ie-kinds ie-sides ie-questions" role="radiogroup" aria-label="Which question?">
          <span className="field-label">Which question?</span>
          {QUESTIONS.map(x => (
            <button key={x.k} type="button" role="radio" aria-checked={question === x.k} className={'ie-kind' + (question === x.k ? ' on' : '')} onClick={() => setQuestion(x.k)}>
              <b>{x.word}</b><small>{x.eg}</small>
            </button>
          ))}
        </div>
      )}
      {ticks && (
        <div className="ie-kinds ie-sides" role="radiogroup" aria-label="How is it judged?">
          <span className="field-label">How is it judged?</span>
          {JUDGES.map(x => (
            <button key={x.k} type="button" role="radio" aria-checked={judge === x.k} className={'ie-kind' + (judge === x.k ? ' on' : '')} onClick={() => setJudge(x.k)}>
              <b>{x.word}</b><small>{x.eg}</small>
            </button>
          ))}
        </div>
      )}
      {(kind === 'limits' || kind === 'rate') && (
        <div className="ie-kinds ie-sides" role="radiogroup" aria-label="Judged against">
          <span className="field-label">Judged against</span>
          {SIDES.filter(x => kind === 'limits' || x.k !== 'both').map(x => (
            <button key={x.k} type="button" role="radio" aria-checked={side === x.k} className={'ie-kind' + (side === x.k ? ' on' : '')} onClick={() => setSide(x.k)}>
              <b>{x.word}</b><small>{x.eg}</small>
            </button>
          ))}
        </div>
      )}
      <div className="ie-agree-grid">
        {(kind === 'limits' || kind === 'packers' || kind === 'rate') && <label className="field"><span className="field-label">Unit</span>
          <input className="text-input" value={unit} maxLength={16} onChange={e => setUnit(e.target.value)} placeholder={kind === 'rate' ? 'packs' : 'g'} /></label>}
        {(kind === 'limits' || kind === 'rate') && side !== 'most' && <label className="field"><span className="field-label">{side === 'least' ? (kind === 'rate' ? 'At least, a minute' : 'At least') : 'Lower limit'}</span>
          <input className="text-input" inputMode="decimal" value={lower} onChange={e => setLower(e.target.value)} placeholder={side === 'least' ? '75' : '400'} /></label>}
        {(kind === 'limits' || kind === 'rate') && side !== 'least' && <label className="field"><span className="field-label">{side === 'most' ? (kind === 'rate' ? 'At most, a minute' : 'At most') : 'Upper limit'}</span>
          <input className="text-input" inputMode="decimal" value={upper} onChange={e => setUpper(e.target.value)} placeholder={side === 'most' ? '2' : '404'} /></label>}
        {(kind === 'limits' || (kind === 'packers' && !byVolume)) && <label className="field"><span className="field-label">{kind === 'packers' ? 'Nominal (on the pack)' : 'Target'} {kind === 'limits' && <i className="sub">if there is one</i>}</span>
          <input className="text-input" inputMode="decimal" value={nominal} onChange={e => setNominal(e.target.value)} placeholder="400" /></label>}
        {kind === 'limits' && question === 'machine' && <label className="field"><span className="field-label">Cmk agreed for acceptance</span>
          <input className="text-input" inputMode="decimal" value={cmkAgreed} onChange={e => setCmkAgreed(e.target.value)} placeholder="1.67" /></label>}
        {kind === 'limits' && (question === 'oxygen' || question === 'seal' || question === 'ccp') && <label className="field"><span className="field-label">Where the limit comes from <i className="sub">optional</i></span>
          <input className="text-input" value={limitSource} maxLength={80} onChange={e => setLimitSource(e.target.value)} placeholder={question === 'ccp' ? 'the HACCP plan' : question === 'seal' ? 'the distribution trial' : 'the product spec'} /></label>}
        {kind === 'limits' && question === 'ccp' && <label className="field"><span className="field-label">The probe reads high at the limit by <i className="sub">its calibration record</i></span>
          <input className="text-input" inputMode="decimal" value={probeBias} onChange={e => setProbeBias(e.target.value)} placeholder="0.14" /></label>}
        {kind === 'packers' && <label className="field"><span className="field-label">Sold by volume — the nominal in ml <i className="sub">checked by weight</i></span>
          <input className="text-input" inputMode="decimal" value={nominalMl} onChange={e => setNominalMl(e.target.value)} placeholder="400" /></label>}
        {kind === 'packers' && <label className="field"><span className="field-label">Density, g/ml <i className="sub">at packing temperature</i></span>
          <input className="text-input" inputMode="decimal" value={density} onChange={e => setDensity(e.target.value)} placeholder="1.03" /></label>}
        {(kind === 'rejects' || kind === 'faults') && <label className="field"><span className="field-label">{kind === 'rejects' ? 'At most what % rejected' : 'At most how many faults per 100 items'} <i className="sub">agreed</i></span>
          <input className="text-input" inputMode="decimal" value={maxShare} onChange={e => setMaxShare(e.target.value)} placeholder={kind === 'rejects' ? '1' : '2'} /></label>}
        {kind === 'faults' && <label className="field"><span className="field-label">Opportunities an item <i className="sub">for per million — optional</i></span>
          <input className="text-input" inputMode="numeric" value={opps} onChange={e => setOpps(e.target.value)} placeholder="6" /></label>}
        {kind === 'rate' && <label className="field"><span className="field-label">Minutes in an interval</span>
          <input className="text-input" inputMode="decimal" value={intervalMin} onChange={e => setIntervalMin(e.target.value)} placeholder="1" /></label>}
        {kind === 'rate' && <label className="field"><span className="field-label">Held with gaps from what % of intervals</span>
          <input className="text-input" inputMode="decimal" value={heldShare} onChange={e => setHeldShare(e.target.value)} placeholder="90" /></label>}
        <label className="field"><span className="field-label">{ticks ? 'How many to check' : kind === 'rejects' ? 'How many runs' : kind === 'faults' ? 'How many inspections' : kind === 'rate' ? 'How many intervals' : 'How many readings'}</span>
          <input className="text-input" inputMode="numeric" value={count} onChange={e => setCount(e.target.value)} /></label>
        {ticks && judge === 'count' && <label className="field"><span className="field-label">How many may fail</span>
          <input className="text-input" inputMode="numeric" value={allow} onChange={e => setAllow(e.target.value)} placeholder="0" /></label>}
        {ticks && judge !== 'count' && <label className="field"><span className="field-label">At least what % good</span>
          <input className="text-input" inputMode="decimal" value={goodPct} onChange={e => setGoodPct(e.target.value)} placeholder="98" /></label>}
      </div>
      {kind === 'faults' && (
        <label className="field ie-kinds-text"><span className="field-label">The kinds of fault <i className="sub">up to twelve, a comma between — Other is always offered</i></span>
          <input className="text-input" value={kindsText} onChange={e => setKindsText(e.target.value)} placeholder="Open seal, Light pack, Mis-label, Crushed, Wrong date" /></label>
      )}
      {kind === 'rate' && n >= 1 && Number(intervalMin) > 0 && <p className="ie-note">{n} intervals of {intervalMin} — the rate must hold for {+(n * Number(intervalMin)).toFixed(1)} minutes.</p>}
      {tne !== undefined && nom !== undefined && (
        <p className="ie-note">℮ {nom} {unit}: the tolerable negative error is {+tne.toFixed(3)} {unit}. The average at least {nom}; fewer than 1 in 40 more than {+tne.toFixed(3)} {unit} short; none more than {+(2 * tne).toFixed(3)} {unit} short.</p>
      )}
      {ticks && (
        <div className="ie-kinds ie-confs" role="radiogroup" aria-label="Confidence">
          <span className="field-label">Confidence — how sure what it proves is said</span>
          {CONFIDENCES.map(c => (
            <button key={c} type="button" role="radio" aria-checked={conf === c} className={'chip' + (conf === c ? ' on' : '')} onClick={() => setConf(c)}>{pctWord(c)}</button>
          ))}
        </div>
      )}
      {/* IN MONEY — what the finding costs, from figures typed here (FC-156); the tile names what is
          missing, so nothing is required */}
      <fieldset className="ie-money-agree">
        <legend className="field-label">In money <i className="sub">optional — the study says what is missing</i></legend>
        <div className="ie-agree-grid">
          <label className="field"><span className="field-label">Packs a shift</span>
            <input className="text-input" inputMode="numeric" value={packs} onChange={e => setPacks(e.target.value)} placeholder="10000" /></label>
          <label className="field"><span className="field-label">Shifts a week</span>
            <input className="text-input" inputMode="decimal" value={shiftsWk} onChange={e => setShiftsWk(e.target.value)} placeholder="5" /></label>
          {(kind === 'limits' || kind === 'packers') && <label className="field"><span className="field-label">What the product costs you a kilo (£) <i className="sub">to make — not its price</i></span>
            <input className="text-input" inputMode="decimal" value={costKg} onChange={e => setCostKg(e.target.value)} placeholder="18" /></label>}
          {(ticks || kind === 'rejects') && <label className="field"><span className="field-label">A pack’s materials (£) <i className="sub">what a pack to waste costs</i></span>
            <input className="text-input" inputMode="decimal" value={materials} onChange={e => setMaterials(e.target.value)} placeholder="0.25" /></label>}
          {ticks && <label className="field"><span className="field-label">To rework one pack (£) <i className="sub">through the process again</i></span>
            <input className="text-input" inputMode="decimal" value={rework} onChange={e => setRework(e.target.value)} placeholder="0.12" /></label>}
        </div>
        {(kind === 'limits' || kind === 'packers') && nom !== undefined && !weightUnit(unit) && <p className="ie-note">Give-away in money needs a weight in g or kg.</p>}
      </fieldset>
      {ticks && !problem && plan?.text && <p className="ie-note ie-plan">{plan.text}</p>}
      {problem && <p className="ie-problem">{problem}</p>}
      <div className="ie-agree-act">
        <button type="submit" className="btn btn-primary" disabled={!!problem}>Agree these</button>
        {cancel && <button type="button" className="btn" onClick={cancel}>Keep what was agreed</button>}
      </div>
    </form>
  );
}

export function agreedWords(a: AgreedReadings): string {
  const u = a.unit ? ` ${a.unit}` : '';
  if (a.kind === 'ticks') return ticksAgreedWords(a);
  const mode = modeAgreedWords(a);
  if (mode) return mode;
  const what = a.kind === 'packers' ? `sold by weight, ℮ ${a.nominal}${u}`
    : a.lower !== undefined && a.upper !== undefined ? `${a.lower}–${a.upper}${u}`
    : a.lower !== undefined ? `at least ${a.lower}${u}` : `at most ${a.upper}${u}`;
  return `${what}, ${a.count} reading${a.count === 1 ? '' : 's'}`;
}

/* ------------------------------------------------------------------ says */
function Says({ said, s, f, a }: { said: SampleSays; s: ToolStudy; f: SampleFigures; a: AgreedReadings }) {
  /* BEFORE CAPABILITY — the three checks an index stands on (spc.normality-
     checks), quiet when they pass, amber when they do not */
  const checks = checksSay(f, a);
  /* IN MONEY — give-away, or the rejects by fate, with its because (FC-156) */
  const money = moneySays(sampleMoney(f, a), f, a);
  return (
    <div className="ie-says">
      <p className={'ie-say is-' + said.tone}>{said.text}</p>
      {said.capability && <p className={'ie-say ie-cap is-' + said.capability.tone}>{said.capability.text}</p>}
      {money && <p className={'ie-say ie-money is-' + money.tone}>{money.text}</p>}
      {/* W1 — machine capability and the lowest legal fill beside a measurement's sentences */}
      {modeNotes(f, a).map(nt => <p key={nt.k} className={'ie-say ie-note-' + nt.k + ' is-' + nt.tone} data-note={nt.k}>{nt.text}</p>)}
      {checks.length > 0 && (
        <div className="ie-checks" role="group" aria-label="Before capability">
          <span className="ie-checks-h">Before capability</span>
          {checks.map(c => <p key={c.k} className={'ie-check is-' + c.tone} data-check={c.k}>{c.text}</p>)}
        </div>
      )}
      {s.overrule && (
        <p className="ie-say ie-over"><b>{s.overrule.verdict}</b> · overruled{s.overrule.by ? ` by ${s.overrule.by}` : ''} — {s.overrule.why}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ the dots between the limits */
const DW = 600, DH = 230, PAD = { l: 10, r: 118, t: 16, b: 16 };

/** The limits and the target as lines, for the dots and the histogram (lib/ie/sample sampleLines). */
const limitLines = (f: SampleFigures, a: AgreedReadings) => sampleLines(f, a).map(l => ({ v: l.v, label: l.label, cls: `ie-${l.kind}` }));

function Dots({ f, a, readings, said }: { f: SampleFigures; a: AgreedReadings; readings: StudyReading[]; said: SampleSays }) {
  const kept = readings.filter(r => !r.struck && typeof r.value === 'number');
  const lines = limitLines(f, a);
  const vs = [...kept.map(r => r.value as number), ...lines.map(l => l.v), ...(f.mean !== undefined ? [f.mean] : [])];
  if (!vs.length) return <p className="sub ie-pic-empty">Each reading lands here as a dot, between the limits.</p>;
  let lo = Math.min(...vs), hi = Math.max(...vs);
  const span = Math.max(hi - lo, Math.abs(hi) * 0.002, 1e-6);
  lo -= span * 0.12; hi += span * 0.12;
  const slots = Math.max(f.count, kept.length, 2);
  const x = (i: number) => PAD.l + (i / (slots - 1)) * (DW - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (DH - PAD.t - PAD.b);
  const outside = new Set(f.outside.map(o => o.id)), flagged = new Set(f.flagged);
  return (
    <svg className="ie-dots" viewBox={`0 0 ${DW} ${DH}`} role="img" aria-label={said.text}>
      {lines.map(l => (
        <g key={l.cls + l.v}>
          <line className={l.cls} x1={PAD.l} x2={DW - PAD.r} y1={y(l.v)} y2={y(l.v)} />
          <text className="ie-lw" x={DW - PAD.r + 8} y={y(l.v) + 5}>{l.label}</text>
        </g>
      ))}
      {f.mean !== undefined && kept.length > 1 && (
        <g>
          <line className="ie-mean" x1={PAD.l} x2={DW - PAD.r} y1={y(f.mean)} y2={y(f.mean)} />
          <text className="ie-lw ie-mw" x={DW - PAD.r + 8} y={y(f.mean) + 5}>mean {f.mean.toFixed(f.dp)}</text>
        </g>
      )}
      {kept.map((r, i) => (
        <g key={r.id}>
          {flagged.has(r.id) && <circle className="ie-flag" cx={x(i)} cy={y(r.value as number)} r={10} />}
          <circle className={'ie-dot' + (outside.has(r.id) ? ' is-out' : '')} cx={x(i)} cy={y(r.value as number)} r={6} />
        </g>
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ the histogram */
const HW = 600, HH = 190, HP = { l: 10, r: 10, t: 26, b: 34 };

/** THE HISTOGRAM (FC-103) — how the readings spread against the limits, so
 *  a person can judge the shape the check reads: about √n bars on a round
 *  width, the limits and the target drawn, a bar holding a reading outside
 *  in red (lib/ie/sample hist). */
function Hist({ f, a }: { f: SampleFigures; a: AgreedReadings }) {
  const h = f.hist;
  if (!h || f.n < 2) return null;
  const lines = limitLines(f, a);
  const lo = h.edges[0], hi = h.edges[h.edges.length - 1], top = Math.max(...h.counts, 1);
  const x = (v: number) => HP.l + ((v - lo) / (hi - lo)) * (HW - HP.l - HP.r);
  const y = (c: number) => HH - HP.b - (c / top) * (HH - HP.t - HP.b);
  const dp = Math.max(f.dp, h.width < 1 ? Math.min(3, Math.ceil(-Math.log10(h.width))) : 0);
  const outs = h.out.filter(Boolean).length;
  const label = `How the ${f.n} readings spread: ${h.counts.length} bars ${lo.toFixed(dp)} to ${hi.toFixed(dp)}${outs ? `, ${outs} holding a reading outside` : ''}.`;
  return (
    <>
    <svg className="ie-hist" viewBox={`0 0 ${HW} ${HH}`} role="img" aria-label={label}>
      {h.counts.map((c, i) => (
        <g key={i}>
          <rect className={'ie-bar' + (h.out[i] ? ' is-out' : '')} x={x(h.edges[i]) + 1} width={Math.max(1, x(h.edges[i + 1]) - x(h.edges[i]) - 2)} y={y(c)} height={HH - HP.b - y(c)} />
          {c > 0 && <text className="ie-bar-n" x={(x(h.edges[i]) + x(h.edges[i + 1])) / 2} y={y(c) - 4} textAnchor="middle">{c}</text>}
        </g>
      ))}
      <line className="ie-axis" x1={HP.l} x2={HW - HP.r} y1={HH - HP.b} y2={HH - HP.b} />
      {lines.map(l => (
        <g key={l.cls + l.v}>
          <line className={l.cls} x1={x(l.v)} x2={x(l.v)} y1={HP.t - 6} y2={HH - HP.b} />
          <text className="ie-lw ie-hw" x={x(l.v)} y={HP.t - 10} textAnchor={x(l.v) > HW - 90 ? 'end' : x(l.v) < 90 ? 'start' : 'middle'}>{l.label}</text>
        </g>
      ))}
      <text className="ie-hx" x={HP.l} y={HH - 12}>{lo.toFixed(dp)}{a.unit ? ` ${a.unit}` : ''}</text>
      <text className="ie-hx" x={HW - HP.r} y={HH - 12} textAnchor="end">{hi.toFixed(dp)}</text>
    </svg>
    {f.desc && <p className="sub ie-hist-says" data-describe>{spreadSays(f, a.unit)}</p>}
    </>
  );
}

function Ticks({ readings }: { readings: StudyReading[] }) {
  const kept = readings.filter(r => !r.struck && typeof r.ok === 'boolean');
  if (!kept.length) return <p className="sub ie-pic-empty">Each one lands here as ✓ or ✗.</p>;
  return (
    <ol className="ie-ticks">
      {readings.map((r, i) => (r.struck || typeof r.ok !== 'boolean' ? null : (
        <li key={r.id} className={r.ok ? 'is-ok' : 'is-bad'} title={`No. ${i + 1}`}>{r.ok ? '✓' : '✗'}<small>{i + 1}</small></li>
      )))}
    </ol>
  );
}

/* ------------------------------------------------------------------ capture: the number pad */
const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫'];

function Capture({ a, f, readings, onAdd, onStrike, onFate }: {
  a: AgreedReadings; f: SampleFigures; readings: StudyReading[];
  onAdd: (r: Omit<StudyReading, 'id' | 'at'>) => void; onStrike: (id: string) => void; onFate: (id: string, fate: Fate) => void;
}) {
  const [typed, setTyped] = useState('');
  /* a weigher's reading carries its head (FC-158) — typed once, kept for the next */
  const [head, setHead] = useState('');
  const weigher = a.kind === 'limits' && a.question === 'weigher';
  const press = useCallback((k: string) => {
    setTyped(t => (k === '⌫' ? t.slice(0, -1) : k === '.' ? (t.includes('.') ? t : (t || '0') + '.') : k === '-' ? (t.startsWith('-') ? t.slice(1) : '-' + t) : (t + k).slice(0, 12)));
  }, []);
  /* The reading is put in HERE, once — never inside a state updater, which
     React may run twice (it did: every reading landed twice). */
  const enter = useCallback(() => {
    const v = Number(typed);
    if (typed.trim() === '' || typed === '-' || !Number.isFinite(v)) return;
    const h = Math.round(Number(head));
    onAdd({ value: v, ...(weigher && head.trim() !== '' && h >= 1 ? { head: h } : {}) });
    setTyped('');
  }, [typed, head, weigher, onAdd]);
  /* A keyboard types into the pad too, unless a box has the focus. */
  useEffect(() => {
    if (a.kind === 'ticks') return;
    const on = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      if (/^[0-9]$/.test(e.key) || e.key === '.') { press(e.key); e.preventDefault(); }
      else if (e.key === 'Backspace') { press('⌫'); e.preventDefault(); }
      else if (e.key === 'Enter') { enter(); e.preventDefault(); }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [a.kind, press, enter]);

  const last = readings.map((r, i) => ({ ...r, no: i + 1 })).filter(r => !r.struck).slice(-3).reverse();
  /* the last failed item's fate — three chips under the pad, waste unless tapped, until another
     fails (FC-156); every failed item's fate is on its row in the readings list too */
  const lastBad = a.kind === 'ticks' ? readings.map((r, i) => ({ ...r, no: i + 1 })).reverse().find(r => !r.struck && r.ok === false) : undefined;
  return (
    <div className="ie-cap-box" aria-label="Take the readings">
      <div className="ie-count"><b>{f.n}</b> of {f.count} {a.kind === 'ticks' ? `checked${f.ticks?.bad.length ? ` · ${f.ticks.bad.length} failed` : ''}` : a.kind === 'rate' ? 'intervals counted' : 'in'}{f.enough ? ' — all in' : ''}</div>
      {a.kind === 'rate' && <p className="sub ie-pad-hint">The packs counted in the interval, then ↵.</p>}
      {weigher && <label className="field ie-head-box"><span className="field-label">Head</span>
        <input className="text-input" inputMode="numeric" value={head} onChange={e => setHead(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))} placeholder="1" aria-describedby="ie-head-hint" />
        <small id="ie-head-hint" className="sub">the head this reading came from — kept for the next</small></label>}
      {a.kind === 'ticks' ? (
        <div className="ie-tick-keys">
          <button type="button" className="btn ie-key ie-ok" onClick={() => onAdd({ ok: true })} aria-label="Good">✓ <span>Good</span></button>
          <button type="button" className="btn ie-key ie-bad" onClick={() => onAdd({ ok: false })} aria-label="Failed">✗ <span>Failed</span></button>
        </div>
      ) : (
        <>
          <output className={'ie-typed' + (typed ? '' : ' is-empty')} aria-live="polite">{typed || '0'}{a.unit ? <small> {a.unit}</small> : null}</output>
          <div className="ie-pad" role="group" aria-label="Number pad">
            {KEYS.map(k => <button key={k} type="button" className="ie-key" onClick={() => press(k)} aria-label={k === '⌫' ? 'Delete' : k}>{k}</button>)}
            <button type="button" className="ie-key ie-enter" onClick={enter} aria-label="Enter the reading" disabled={!typed || !Number.isFinite(Number(typed))}>↵</button>
          </div>
        </>
      )}
      {lastBad && <Fates r={lastBad} onFate={onFate} />}
      {last.length > 0 && (
        <ul className="ie-last" aria-label="The last readings">
          {last.map(r => (
            <li key={r.id}>
              <span className="ie-no">{r.no}</span>
              <b>{modeReadingWord(a, r) ?? (typeof r.value === 'number' ? r.value : r.ok ? '✓' : '✗')}</b>
              <button type="button" className="linkish" onClick={() => onStrike(r.id)} aria-label={`Strike reading ${r.no}`}>Strike</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ every reading */
/** WHAT BECAME OF A FAILED ITEM — waste · reworked · recovered by hand (FC-156; Rowland, 24 October). */
function Fates({ r, onFate, small }: { r: StudyReading & { no: number }; onFate: (id: string, fate: Fate) => void; small?: boolean }) {
  const cur = fateOf(r);
  return (
    <div className={'ie-fates chip-row' + (small ? ' is-small' : '')} role="radiogroup" aria-label={`What became of no. ${r.no}?`}>
      {!small && <span className="field-label">No. {r.no} failed — what became of it?</span>}
      {FATES.map(x => (
        <button key={x.k} type="button" role="radio" aria-checked={cur === x.k} className={'chip' + (cur === x.k ? ' on' : '')} title={x.eg} onClick={() => onFate(r.id, x.k)}>{x.word}</button>
      ))}
    </div>
  );
}

function Readings({ readings, f, a, canStrike, onStrike, onFate }: { readings: StudyReading[]; f: SampleFigures; a: AgreedReadings; canStrike: boolean; onFate: (id: string, fate: Fate) => void; onStrike: (id: string, struck: boolean) => void }) {
  const [open, setOpen] = useState(false);
  if (!readings.length) return null;
  const out = new Set(f.outside.map(o => o.id)), flagged = new Set(f.flagged);
  const struck = readings.filter(r => r.struck).length;
  return (
    <div className="ie-all">
      <button type="button" className="linkish" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        {open ? 'Hide' : 'Every'} reading — {readings.length}{struck ? `, ${struck} struck` : ''}
      </button>
      {open && (
        <ol className="ie-rows">
          {readings.map((r, i) => (
            <li key={r.id} className={r.struck ? 'is-struck' : out.has(r.id) ? 'is-out' : ''}>
              <span className="ie-no">{i + 1}</span>
              <b>{modeReadingWord(a, r) ?? (typeof r.value === 'number' ? r.value.toFixed(Math.max(f.dp, 0)) + (a.unit ? ` ${a.unit}` : '') : r.ok ? '✓' : '✗')}</b>
              <span className="sub">{out.has(r.id) && !r.struck ? 'outside · ' : ''}{flagged.has(r.id) && !r.struck ? 'far from the rest · ' : ''}{r.who ? `${r.who} · ` : ''}{new Date(r.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
              {canStrike && <button type="button" className="linkish" onClick={() => onStrike(r.id, !r.struck)}>{r.struck ? 'Restore' : 'Strike'}</button>}
              {r.ok === false && !r.struck && (canStrike ? <Fates r={{ ...r, no: i + 1 }} onFate={onFate} small /> : <span className="sub ie-fate">{fateWord(fateOf(r))}</span>)}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ the act row: close, overrule */
function Act({ s, f, said, can, me, write }: {
  s: ToolStudy; f: SampleFigures; said: SampleSays; can: ReturnType<typeof canAt>; me?: string;
  write: (p: Parameters<typeof patchStudy>[1]) => void;
}) {
  const [over, setOver] = useState<null | { verdict: string; why: string }>(null);
  const [reopen, setReopen] = useState<string | null>(null);
  const closed = !!s.closedAt;
  const by = me ? { by: me } : {};

  if (closed && s.receipt) {
    return (
      <div className="ie-act is-closed">
        <p className="ie-receipt"><b>Closed {niceDay(isoDay(s.receipt.at))}{s.receipt.by ? ` by ${s.receipt.by}` : ''}</b> — a receipt: these figures stand as they were. {s.receipt.text}</p>
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
    receipt: { at: now(), ...by, text: [said.text, said.capability?.text].filter(Boolean).join(' '), tone: said.tone,
      figures: { n: f.n, count: f.count, mean: f.mean ?? null, sd: f.sd ?? null, min: f.min ?? null, max: f.max ?? null,
        outside: f.outside.length,
        ppk: f.n >= CPK_FROM && f.ppk !== undefined && Number.isFinite(f.ppk) ? +f.ppk.toFixed(2) : null,
        cpk: f.n >= CPK_FROM && f.cpk !== undefined && Number.isFinite(f.cpk) ? +f.cpk.toFixed(2) : null },
      ...(cur.receipt?.reopened ? { reopened: cur.receipt.reopened } : {}) },
  }));
  const reopened = s.receipt?.reopened ?? [];
  const lastReopen = reopened[reopened.length - 1];
  return (
    <div className="ie-act">
      {lastReopen && <p className="sub">Reopened {niceDay(isoDay(lastReopen.at))}{lastReopen.by ? ` by ${lastReopen.by}` : ''} — {lastReopen.why}</p>}
      {can.edit && f.enough && <button type="button" className="btn btn-primary" onClick={close}>Close — keep these figures</button>}
      {can.agree && f.n > 0 && !s.overrule && over === null && (
        <button type="button" className="btn" onClick={() => setOver({ verdict: said.verdict === 'Passed' ? 'Didn’t pass' : 'Passed', why: '' })}>Overrule the verdict</button>
      )}
      {can.agree && s.overrule && <button type="button" className="btn" onClick={() => write({ overrule: undefined })}>Take back the overrule</button>}
      {over && (
        <form className="ie-why" onSubmit={e => { e.preventDefault(); if (!over.why.trim()) return;
          write({ overrule: { verdict: over.verdict, why: over.why.trim(), at: now(), ...by } }); setOver(null); }}>
          <div className="chip-row" role="radiogroup" aria-label="The verdict instead">
            {['Passed', 'Didn’t pass'].map(v => (
              <button key={v} type="button" role="radio" aria-checked={over.verdict === v} className={'chip' + (over.verdict === v ? ' on' : '')} onClick={() => setOver({ ...over, verdict: v })}>{v}</button>
            ))}
          </div>
          <input className="text-input" autoFocus value={over.why} placeholder="Why — kept beside the app’s verdict" onChange={e => setOver({ ...over, why: e.target.value })} />
          <button type="submit" className="btn btn-primary" disabled={!over.why.trim()}>Overrule</button>
          <button type="button" className="btn" onClick={() => setOver(null)}>Leave it</button>
        </form>
      )}
    </div>
  );
}
