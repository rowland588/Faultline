/* SMED — QUICK CHANGEOVER: one changeover, from one product to the next,
 * worked through Shingo's stages (docs/TOOLKIT.md, tool 6; lib/ie/changeover).
 * Stored as a study of tool `changeover`; on screen and paper it is SMED.
 *
 * Rowland, 12 October: "you should be making the lean tool SMED, firstly,
 * and doing everything along them principles"; "SMED as well, just like the
 * way we've done the process mapping, I think that sort of grid style".
 *
 * The frame every tool shares (TOOLKIT 3.1), in the order of the three
 * questions:
 *   where are we      the strip — the minutes now, separated, converted,
 *                     streamlined, against single-digit minutes; what the
 *                     changeovers cost a week
 *   why not where     the sentences, and the GRID (ui/SmedGrid): who does
 *   we should be      what, in sequence, internal solid and external hatched
 *   what we are       Shingo's stages, one after another on the phone —
 *   doing about it    0 Record · 1 Separate · 2 Convert · 3 Streamline ·
 *                     Standardise — each element's plan, Make it better from
 *                     an element, Set as the standard, Prove it from the fix
 *
 * ON THE PHONE AT THE LINE: Lap. Say the element, who does it, tap Internal
 * or External, Start as it begins, Next as it ends — its time is the time
 * between taps. From the last good piece of the old product to the first
 * good piece of the new at full rate: the run-up is an element too.
 *
 * Nothing worked out is stored: every figure and sentence comes from
 * lib/ie/changeover on each render. A chip writes on its tap; a box writes
 * when it is left, never on a keystroke. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getStudy, getWorkspace, listStandardsForLine, onDataChange, patchStudy, putStandard } from '../db';
import { useAccess } from '../cloud/access';
import { useSession } from '../cloud/session';
import { displayName } from '../cloud/team';
import { can as canAt, type Can } from '../lib/access';
import { now, uid } from '../lib/ids';
import { niceDay } from '../lib/weeks';
import { nav } from '../state/useRoute';
import { peopleOf, type Standard } from '../lib/standard';
import {
  actionWords, agreedFor, availableOf, changeoversPer, changeoverSays, checklistOf, CONVERT_HOW, extrapolate, extrapolationSays, figuresOf, FN_WORD, FNS, functionSays,
  HOW_WORD, intervalOf, intervalSays, ladderOf, ladderSays, lineRateOf, mins, moneyOf, patternFromShifts, planWords, rateFromWords, runMinOf, runningOf, runningWords, span,
  SMED_TARGET_SEC, standardFrom, standardLine, STREAMLINE_HOW, whenIn, costOf, scaleRows, type CostScale, type Ladder, type CoLaneBy, type Rung, type SmedMoney,
} from '../lib/ie/changeover';
import { dur, parseDur } from '../lib/ie/steps';
import type { ChangeoverProduct, ChangeoverSide, ChangeoverStep, SmedFunction, SmedHow, SmedPlan, SmedPlanKind, SmedRateFrom, StudyFacts, StudyUse, ToolStudy } from '../lib/study';
import type { Workspace } from '../types';
import { UsedFor, useBetter, WhereItSits } from '../ui/StudyPlace';
import { recordHref } from '../lib/studyLinks';
import { Sheet } from '../ui/Sheet';
import { SmedGrid } from '../ui/SmedGrid';

const OWNER = canAt('owner');
const day = (ms: number) => niceDay(new Date(ms).toISOString().slice(0, 10));
/** A time typed: a bare number is minutes — the floor says "4" for four minutes. */
const minutesTyped = (t: string): number | undefined => (t.trim() ? parseDur(t, 'min') : undefined);
const numTyped = (t: string): number | undefined => { const v = Number(t.replace(',', '.')); return t.trim() && Number.isFinite(v) && v > 0 ? v : undefined; };

type Stage = 'record' | 'separate' | 'convert' | 'streamline' | 'standardise';
const STAGES: { key: Stage; n: string; word: string; say: string }[] = [
  { key: 'record', n: '0', word: 'Record', say: 'Every element of the changeover as it happens, from the last good piece of the old product to the first good piece of the new at full rate — the run-up and the adjustments are elements too, and typically half of it. Lap each as it ends, or type it; say who does it.' },
  { key: 'separate', n: '1', word: 'Separate', say: 'Mark each element internal — the line is stopped for it — or external — it could be done while the line still runs.' },
  { key: 'convert', n: '2', word: 'Convert', say: 'For each internal element: could it be done before the line stops? Prepare it in advance (kits, pre-heat, pre-stage), standardise the function (the same heights, the same fixings), or use an intermediate jig.' },
  { key: 'streamline', n: '3', word: 'Streamline', say: 'What is left inside: do it in parallel, fit quick-release clamps instead of bolts, take out the adjustment (fixed stops, settings recorded, go/no-go). Give each its target time.' },
  { key: 'standardise', n: '✓', word: 'Standardise', say: 'The agreed sequence and its checklist — what is prepared before the line stops, what is done with it stopped, what after it runs again — on the product\'s line standard.' },
];

export function ChangeoverScreen({ id }: { id: string }) {
  const [s, setS] = useState<ToolStudy | null | undefined>(undefined);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [line, setLine] = useState<Workspace | undefined>(undefined);
  const load = useCallback(async () => {
    const st = await getStudy(id);
    setS(st ?? null);
    setStandards(st?.workspaceId ? await listStandardsForLine(st.workspaceId) : []);
    setLine(st?.workspaceId ? await getWorkspace(st.workspaceId) : undefined);
  }, [id]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  const jobCan = useAccess(s?.projectId ?? '');
  /* On a job, the job's rule; on its own or on a line, its people may do all
     of it, as on any study (TOOLKIT 3.6). */
  const can = s?.projectId ? jobCan : OWNER;
  const { session } = useSession();
  const me = displayName(session?.user.email) || undefined;
  if (s === undefined) return <div className="wrap ie co"><p className="sub">Opening…</p></div>;
  if (s === null) return (
    <div className="wrap ie co">
      <h1>This SMED isn’t on this device</h1>
      <p className="sub">It may have been deleted, or not synced here yet.</p>
      <button type="button" className="btn" onClick={() => nav('/smed')}>Every SMED</button>
    </div>
  );
  return <Smed s={s} can={can} me={me} standards={standards} line={line} />;
}

/** The product's line standard this changeover is INTO — named on the study,
 *  else the one on the line for the product changed to. */
function standardFor(s: ToolStudy, standards: Standard[]): Standard | undefined {
  const to = (s.facts.toProduct ?? s.product ?? '').trim().toLowerCase();
  return standards.find(x => x.id === s.standardId) ?? (to ? standards.find(x => x.product.trim().toLowerCase() === to) : undefined);
}

function Smed({ s, can, me, standards, line }: { s: ToolStudy; can: Can; me?: string; standards: Standard[]; line?: Workspace }) {
  const seq = useMemo(() => [...(s.facts.sequence ?? [])].sort((a, b) => a.order - b.order), [s.facts.sequence]);
  const f = useMemo(() => figuresOf(s.facts), [s.facts]);
  const l = useMemo(() => ladderOf(seq), [seq]);
  const std = standardFor(s, standards);
  const agreed = agreedFor(std?.capacity?.changeovers, s.facts.fromProduct);
  const said = useMemo(() => changeoverSays(f, agreed), [f, agreed]);
  const money = useMemo(() => moneyOf(line), [line]);
  const cost = useMemo(() => extrapolationSays(l, s.facts, money), [l, s.facts, money]);
  const iv = useMemo(() => intervalOf(f, s.facts.products, availableOf(s.facts)?.min), [f, s.facts]);
  const ivSaid = intervalSays(iv, f);
  const closed = !!s.closedAt;
  const editable = can.edit && !closed;
  const [stage, setStage] = useState<Stage>(seq.length ? 'separate' : 'record');
  const [lapping, setLapping] = useState(false);
  const [editing, setEditing] = useState<ChangeoverStep | 'new' | null>(null);
  const [products, setProducts] = useState(false);
  const [runSheet, setRunSheet] = useState(false);
  const [productsSheet, setProductsSheet] = useState(false);
  const [view, setView] = useState<Rung>('now');
  const [by, setBy] = useState<CoLaneBy>('who');
  const write = (p: Parameters<typeof patchStudy>[1]) => void patchStudy(s.id, p);
  const setSeq = (fn: (cur: ChangeoverStep[]) => ChangeoverStep[]) => write(cur => ({ facts: { ...cur.facts, sequence: fn(cur.facts.sequence ?? []) } }));
  const setStep = (id: string, patch: Partial<ChangeoverStep>) => setSeq(cur => cur.map(x => (x.id === id ? { ...x, ...patch } : x)));
  const setPlan = (id: string, plan: SmedPlan | undefined) => setSeq(cur => cur.map(x => { if (x.id !== id) return x; const { plan: _p, ...rest } = x; void _p; return plan ? { ...rest, plan } : rest; }));
  /* SMED INSIDE A CHANGE: an element raises a fix (stage gate) or a
     countermeasure (6M) in its SMED action's words; it then wears the branch. */
  const { board, byRef, better } = useBetter(s, me);
  const branches = useMemo(() => {
    const m = new Map<string, StudyUse[]>();
    for (const u of s.uses) if (u.step && u.role === 'evidence' && byRef.has(u.ref)) m.set(u.step, [...(m.get(u.step) ?? []), u]);
    return m;
  }, [s.uses, byRef]);
  const branched = useMemo(() => new Set(branches.keys()), [branches]);
  /* Proving a fix: the elements carried from before, timed again one by one. */
  const carried = useMemo(() => seq.filter(x => x.source === 'carried'), [seq]);
  const from = s.facts.fromProduct?.trim(), to = (s.facts.toProduct ?? s.product)?.trim();
  /* Who and where the floor would say: the product's standard's people, the
     usual roles, and everyone already named on this changeover. */
  const people = useMemo(() => [...new Set([...seq.flatMap(x => x.crew ?? []), ...(std ? peopleOf(std).map((p, i) => p.label?.trim() || `Op ${i + 1}`) : []), 'Op 1', 'Op 2', 'Fitter', 'Team leader', 'Engineer', 'Quality'])], [seq, std]);
  const places = useMemo(() => [...new Set([...seq.map(x => x.where?.trim()).filter((x): x is string => !!x), ...(std?.capacity?.stations ?? []).map(x => x.name.trim()).filter(Boolean)])], [seq, std]);

  const onLap = (x: { name: string; side: ChangeoverSide; sec: number; crew: string[]; again?: string }) => setSeq(cur => (x.again
    ? cur.map(st => (st.id === x.again ? { ...st, name: x.name || st.name, side: x.side, sec: x.sec, source: 'timed' as const, at: now(), ...(me ? { who: me } : {}), ...(x.crew.length ? { crew: x.crew } : {}) } : st))
    : [...cur, { id: uid(), order: cur.reduce((m, st) => Math.max(m, st.order), -1) + 1, name: x.name, side: x.side, sec: x.sec, source: 'timed' as const, at: now(),
      ...(me ? { who: me } : {}), ...(x.crew.length ? { crew: x.crew } : {}) }]));

  /* SET AS THE STANDARD (can.agree): the agreed sequence and its checklist
     onto the product's line standard, one entry per product it is changed
     from; the study closed as a receipt. */
  const setStandard = async () => {
    if (!std || !can.agree) return;
    const t = now();
    const a = standardFrom(seq, { id: uid(), from, at: t, by: me, studyId: s.id });
    const key = (x?: string) => (x ?? '').trim().toLowerCase();
    const others = (std.capacity?.changeovers ?? []).filter(x => key(x.from) !== key(from));
    await putStandard({ ...std, capacity: { ...(std.capacity ?? { stations: [] }), changeovers: [...others, a] } });
    write(cur => ({ ...(cur.standardId ? {} : { standardId: std.id }), closedAt: t,
      receipt: { at: t, ...(me ? { by: me } : {}), text: [said.text, ladderSays(l).text].filter(Boolean).join(' '), tone: said.tone,
        figures: { minutes: +(f.nowSec / 60).toFixed(1), separated: +(l.separated.elapsedSec / 60).toFixed(1), converted: +(l.converted.elapsedSec / 60).toFixed(1),
          streamlined: +(l.streamlined.elapsedSec / 60).toFixed(1), elements: f.steps, everyDays: iv.daysNow !== undefined ? +iv.daysNow.toFixed(2) : null } } }));
  };
  const canSet = can.agree && !closed && f.enough && !f.untimed && !f.carried;
  const nameOf = (id: string) => seq.find(x => x.id === id)?.name;
  const when = whenIn(seq);

  return (
    <div className="wrap ie co">
      <header className="ie-head">
        <small className="ie-eyebrow">SMED — quick changeover</small>
        <Name s={s} canEdit={editable} />
        <p className="sub ie-where co-products">
          {from || to ? <>From <b>{from || 'a product'}</b> to <b>{to || 'a product'}</b></> : 'Which two products?'}
          {s.machine ? <> · <b>{s.machine}</b></> : null}
          {' · started '}{day(s.startedAt)}
          {editable && <button type="button" className="linkish" onClick={() => setProducts(true)}>Change the products</button>}
        </p>
        <WhereItSits s={s} can={can} />
      </header>

      {/* THE STRIP — where it stands, the ladder's rungs; only the abnormal carries colour. */}
      <div className="ie-strip" role="group" aria-label="Where it stands">
        <span className={'ie-fig ie-verdict is-' + said.tone}><b>{said.verdict}</b></span>
        <span className={'ie-fig' + (f.enough ? '' : ' is-zero')}><b>{f.enough ? mins(f.nowSec) : '—'}</b> now{f.untimed ? ' · at least' : ''}</span>
        {f.enough && <span className="ie-fig"><b>{mins(l.separated.elapsedSec)}</b> separated</span>}
        {f.enough && l.converts > 0 && <span className="ie-fig"><b>{mins(l.converted.elapsedSec)}</b> converted</span>}
        {f.enough && l.streamlines > 0 && <span className="ie-fig"><b>{mins(l.streamlined.elapsedSec)}</b> streamlined</span>}
        {f.enough && <span className="ie-fig is-n">target <b>{mins(SMED_TARGET_SEC)}</b> — single digits</span>}
        {f.enough && f.externalSec > 0 && !/external/.test(said.verdict) && <span className="ie-fig is-a"><b>{mins(f.externalSec)}</b> external inside</span>}
        {cost.scale && <span className="ie-fig"><b>{span(cost.scale.week.sec)}</b> a week stopped</span>}
        <span className="ie-fig is-n"><b>{f.steps}</b> element{f.steps === 1 ? '' : 's'} · {f.source === 'none' ? 'not timed' : f.source === 'carried' ? 'some carried from before' : f.source}</span>
      </div>
      <div className="ie-says">
        {said.lines.filter(x => x.tone === 'r').map(x => <p key={x.text} className="ie-say is-r">{x.text}</p>)}
        <p className={'ie-say' + (said.tone === 'r' ? ' is-r' : '')}>{said.text}</p>
        {said.lines.filter(x => x.tone !== 'r').map(x => <p key={x.text} className={'ie-say ie-cap is-' + x.tone}>{x.text}</p>)}
        {f.enough && <p className={'ie-say ie-cap co-ladder is-' + ladderSays(l).tone}>{ladderSays(l).text}</p>}
        {f.enough && functionSays(seq) && <p className="ie-say ie-cap co-fns is-n">{functionSays(seq)}</p>}
        {cost.text && <p className="ie-say ie-cap co-cost is-n">{cost.text}</p>}
        {cost.scale && <ScaleTable scale={cost.scale} />}
        <p className={'ie-say ie-cap co-interval is-' + ivSaid.tone}>{ivSaid.text}</p>
      </div>

      {/* THE GRID — who does what, in sequence; as timed, or the plan. */}
      <div className="vs-bar co-views">
        <span className="chip-row" role="tablist" aria-label="Which changeover">
          <button type="button" role="tab" aria-selected={view === 'now'} className={'chip' + (view === 'now' ? ' on' : '')} onClick={() => setView('now')}>As timed</button>
          <button type="button" role="tab" aria-selected={view === 'streamlined'} className={'chip' + (view === 'streamlined' ? ' on' : '')} onClick={() => setView('streamlined')}>The plan</button>
        </span>
        <span className="chip-row vs-by" role="tablist" aria-label="Lanes by">
          <span className="sub">Lanes by</span>
          <button type="button" role="tab" aria-selected={by === 'who'} className={'chip' + (by === 'who' ? ' on' : '')} onClick={() => setBy('who')}>Who does it</button>
          <button type="button" role="tab" aria-selected={by === 'where'} className={'chip' + (by === 'where' ? ' on' : '')} onClick={() => setBy('where')}>Where</button>
        </span>
      </div>
      <SmedGrid seq={seq} rung={view} by={by} branched={branched} onOpen={st => setEditing(st)} />
      {view === 'streamlined' && <PlanOutside seq={seq} />}
      <LadderBars l={l} f={s.facts} money={money} />

      {/* SHINGO'S STAGES — one after another on the phone. */}
      <nav className="chip-row co-stages" aria-label="SMED's stages">
        {STAGES.map(x => (
          <button key={x.key} type="button" className={'chip co-stage' + (stage === x.key ? ' on' : '')} aria-pressed={stage === x.key} onClick={() => setStage(x.key)}>
            <span className="co-stage-n" aria-hidden>{x.n}</span> {x.word}
          </button>
        ))}
      </nav>
      <section className="co-panel" aria-label={STAGES.find(x => x.key === stage)?.word}>
        <p className="sub co-panel-say">{STAGES.find(x => x.key === stage)?.say}</p>

        {stage === 'record' && (
          <>
            {editable && (lapping
              ? <Lap again={carried} people={people} onStep={onLap} onDone={() => setLapping(false)} />
              : (
                <div className="co-cap">
                  <button type="button" className="wb-lap" onClick={() => setLapping(true)}>{carried.length ? 'Lap — time it again' : 'Lap — time it as it happens'}</button>
                  <button type="button" className="btn" onClick={() => setEditing('new')}>+ Type an element</button>
                </div>
              ))}
            <Rows seq={seq} branches={branches} editable={editable} onOpen={setEditing} control={st => (
              <span className="chip-row co-fn" role="radiogroup" aria-label={`${st.name} — what kind of work`}>
                {FNS.map(fn => (
                  <button key={fn} type="button" role="radio" aria-checked={st.fn === fn} disabled={!editable} className={'chip' + (st.fn === fn ? ' on' : '')}
                    onClick={() => editable && setStep(st.id, { fn: st.fn === fn ? undefined : fn })}>{FN_WORD[fn]}</button>
                ))}
              </span>
            )} />
          </>
        )}

        {stage === 'separate' && (
          <>
            <p className="co-figure">{f.enough ? <>Separated: <b>{mins(l.separated.elapsedSec)}</b> — with the {mins(f.externalSec)} of external work done before the line stops or after it runs again.</> : 'Record the elements first.'}</p>
            <Rows seq={seq} branches={branches} editable={editable} onOpen={setEditing} control={st => <SideChips st={st} editable={editable} onSide={side => setStep(st.id, { side })} />} />
          </>
        )}

        {stage === 'convert' && (
          <>
            <p className="co-figure">{l.converts ? <>Converted: <b>{mins(l.converted.elapsedSec)}</b> — {l.converts} element{l.converts === 1 ? '' : 's'} to be done before the line stops (planned).</> : <>Nothing converted yet — {mins(l.separated.elapsedSec)} is still inside the stop.</>}</p>
            <Rows seq={seq.filter(x => x.side === 'internal')} branches={branches} editable={editable} onOpen={setEditing} none="No internal elements — nothing to convert." control={st => (
              <span className="co-plan">
                <button type="button" className={'chip' + (st.plan?.kind === 'convert' ? ' on' : '')} aria-pressed={st.plan?.kind === 'convert'} disabled={!editable}
                  onClick={() => editable && setPlan(st.id, st.plan?.kind === 'convert' ? undefined : { kind: 'convert', how: 'prepare' })}>→E Convert to external</button>
                {st.plan?.kind === 'convert' && <HowChips kinds={CONVERT_HOW} st={st} editable={editable} onHow={how => setPlan(st.id, { ...(st.plan as SmedPlan), how })} />}
              </span>
            )} />
          </>
        )}

        {stage === 'streamline' && (
          <>
            <p className="co-figure">{l.streamlines ? <>Streamlined: <b>{mins(l.streamlined.elapsedSec)}</b> elapsed{l.streamlined.labourSec > l.streamlined.elapsedSec + 1 ? `, ${mins(l.streamlined.labourSec)} of work — some in parallel` : ''} (planned).</> : <>Nothing streamlined yet — {mins(l.converted.elapsedSec)} left inside the stop.</>}</p>
            <Rows seq={seq.filter(x => x.side === 'internal' && x.plan?.kind !== 'convert')} branches={branches} editable={editable} onOpen={setEditing} none="Nothing left inside the stop to streamline." control={st => (
              <Streamline st={st} seq={seq} people={people} editable={editable} onPlan={p => setPlan(st.id, p)} />
            )} />
          </>
        )}

        {stage === 'standardise' && (
          <>
            <Checklist seq={seq} editable={editable} onWhen={(id, w) => setStep(id, { when: w })} />
            <p className="ie-agreed sub">
              {agreed ? <>The standard for <b>{std?.product}</b>: <b>{standardLine(agreed, day)}</b></> : std ? <>No agreed changeover into <b>{std.product}</b> yet.</> : s.workspaceId ? 'No line standard for the product changed to on this line — make one to set this as its standard.' : 'Put it on a line to set it as a product’s standard.'}
            </p>
            <div className={'ie-act' + (closed ? ' is-closed' : '')}>
              {closed && s.receipt ? (
                <>
                  <p className="ie-receipt"><b>Set as the standard {day(s.receipt.at)}{s.receipt.by ? ` by ${s.receipt.by}` : ''}</b> — a receipt: these figures stand as they were. {s.receipt.text}</p>
                  {can.agree && <button type="button" className="btn" onClick={() => write({ closedAt: undefined })}>Reopen to time again</button>}
                </>
              ) : (
                <>
                  {canSet && std && <button type="button" className="btn btn-primary" onClick={() => void setStandard()}>Set as the standard</button>}
                  {can.agree && !closed && f.enough && (f.untimed > 0 || f.carried > 0) && <span className="sub">Every element needs a time of its own before it is set as the standard.</span>}
                </>
              )}
            </div>
          </>
        )}
      </section>

      {/* HOW THE LINE RUNS — asked, never assumed: what the changeovers cost and the interval read it. */}
      <div className="co-fold">
        <div className="co-fold-h">
          <small className="ie-h">How the line runs</small>
          {editable && <button type="button" className="linkish" onClick={() => setRunSheet(true)}>{s.facts.running ? 'Change how the line runs' : 'Say how the line runs'}</button>}
        </div>
        <p className="sub co-run-facts">{runWords(s.facts, line, money)}</p>
      </div>
      <div className="co-fold">
        <div className="co-fold-h">
          <small className="ie-h">How often can each product run?</small>
          {editable && <button type="button" className="linkish" onClick={() => setProductsSheet(true)}>{iv.products ? 'Change the products' : 'List the products'}</button>}
        </div>
        {iv.products > 0 && (
          <p className="sub co-iv-facts">
            {(s.facts.products ?? []).map(p => { const r = runMinOf(p); return `${p.product}: ${r ? `${mins(r.min * 60)} a day${r.how === 'rate' ? ` (${p.demandPerDay} at ${p.ratePerMin} a minute)` : ', typed'}` : 'no run time yet'}`; }).join(' · ')}
            {iv.availableMinPerDay ? ` · the line runs ${mins(iv.availableMinPerDay * 60)} a day` : ''}
            {iv.freeMinPerDay !== undefined ? ` · ${mins(iv.freeMinPerDay * 60)} free for changeovers` : ''}
          </p>
        )}
      </div>

      <UsedFor s={s} can={can} me={me} />

      {editing && (
        <ElementSheet key={editing === 'new' ? 'new' : editing.id} step={editing === 'new' ? undefined : seq.find(x => x.id === editing.id) ?? editing} seq={seq} people={people} places={places}
          editable={editable} canRemove={can.remove || !s.projectId}
          branch={editing !== 'new' && s.projectId ? (branches.get(editing.id) ?? []).map(u => ({ title: byRef.get(u.ref)?.title ?? 'a record', href: recordHref(s.projectId ?? '', u) })) : []}
          better={editing !== 'new' && editable && !!s.projectId && !branches.has(editing.id) && !!editing.sec
            ? { label: board ? 'Make it better — a countermeasure' : 'Make it better — raise a fix', onClick: () => { const id = editing.id; setEditing(null); void better(id); } } : undefined}
          nameOf={nameOf} when={when}
          onClose={() => setEditing(null)}
          onSave={st => { setSeq(cur => (cur.some(x => x.id === st.id) ? cur.map(x => (x.id === st.id ? st : x)) : [...cur, st])); setEditing(null); }}
          onMove={(id, by2) => setSeq(cur => move(cur, id, by2))}
          onRemove={id => { setSeq(cur => cur.filter(x => x.id !== id).map(x => (x.alongside === id ? { ...x, alongside: undefined } : x))); setEditing(null); }} />
      )}
      {products && <ProductsSheet s={s} standards={standards} onClose={() => setProducts(false)} />}
      {runSheet && <RunSheet s={s} std={std} line={line} money={money} onClose={() => setRunSheet(false)} />}
      {productsSheet && <IntervalSheet s={s} standards={standards} onClose={() => setProductsSheet(false)} />}
    </div>
  );
}

/** How the line runs, in one line — or what is still to say. */
function runWords(facts: StudyFacts, line: Workspace | undefined, money: SmedMoney | undefined): string {
  const { run, missing } = runningOf(facts.running);
  const head = run ? `${runningWords(run)} — ${span(run.minutesPerWeek * 60)} running a week` : `Not said yet — ${missing.join(', ')}.`;
  const c = facts.changeovers;
  const per = c ? changeoversPer(c, run) : undefined;
  const cos = c ? ` · ${c.count} changeover${c.count === 1 ? '' : 's'} a ${c.per}${per && c.per !== 'week' ? ` (${+per.week.toFixed(1)} a week)` : ''}` : facts.perWeek ? ` · ${facts.perWeek} changeovers a week` : ' · how many changeovers not said yet';
  const rate = facts.ratePerMin ? ` · ${facts.ratePerMin} a minute, ${rateFromWords(facts.rateFrom ?? 'typed', facts.rateStation)}` : ' · no speed — packs are not said';
  const pounds = money ? ` · ${moneyWords(money, line)}` : ' · no cost set for the line — pounds are not said';
  return `${head}${cos}${rate}${pounds}`;
}

/** WHAT THE CHANGEOVERS COST, ROW BY ROW — a shift, a day, a week, a year:
 *  the time stopped, the packs, the idle labour and the contribution if the
 *  packs cannot be made up. A column only where there is a figure for it. */
function ScaleTable({ scale }: { scale: CostScale }) {
  const rows = scaleRows(scale);
  const has = (k: 'packs' | 'labour' | 'contribution') => rows.some(r => r[k]);
  return (
    <div className="co-scale-w"><table className="co-scale" aria-label="What the changeovers cost, a shift, a day, a week and a year">
      <thead><tr><th scope="col"><span className="sr-only">Over</span></th><th scope="col">Stopped</th>{has('packs') && <th scope="col">Packs</th>}{has('labour') && <th scope="col">Labour</th>}{has('contribution') && <th scope="col">Contribution*</th>}</tr></thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.per}><th scope="row">{r.per}</th><td>{r.stopped}</td>{has('packs') && <td>{r.packs}</td>}{has('labour') && <td>{r.labour}</td>}{has('contribution') && <td>{r.contribution}</td>}</tr>
        ))}
      </tbody>
      {has('contribution') && <caption className="sub">Labour: the crew paid while the line is stopped. * Contribution: lost only if the packs cannot be made up.</caption>}
    </table></div>
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

/* ------------------------------------------------------------- the ladder */
/** THE LADDER, drawn: now → separated → converted → streamlined, each bar the
 *  elapsed stop (the part that leaves when the external work goes outside
 *  hatched), single-digit minutes marked; beside each, what it costs a week
 *  on the same scale when how the line runs is said. Value by fill, no hue. */
function LadderBars({ l, f, money }: { l: Ladder; f: StudyFacts; money?: SmedMoney }) {
  if (l.now.elapsedSec <= 0) return null;
  const run = runningOf(f.running).run, per = changeoversPer(f.changeovers, run);
  const rungs: Rung[] = ['now', 'separated', ...(l.converts ? ['converted' as Rung] : []), ...(l.streamlines ? ['streamlined' as Rung] : [])];
  const top = l.now.elapsedSec;
  const pct = (sec: number) => `${Math.max(0, Math.min(100, (sec / top) * 100))}%`;
  return (
    <div className="ie-pic co-ladder-pic" role="img" aria-label={ladderSays(l).text}>
      {rungs.map(r => {
        const sec = l[r].elapsedSec;
        const week = run && per ? extrapolate(sec, per, run, f.ratePerMin, money).week : undefined;
        return (
          <div key={r} className="co-bar-row">
            <span className="co-bar-l">{r === 'now' ? 'Now' : r === 'separated' ? 'Separated' : r === 'converted' ? 'Converted' : 'Streamlined'}{r === 'converted' || r === 'streamlined' ? <small> planned</small> : null}</span>
            <div className="co-bar-track">
              <div className="co-bar" style={{ width: pct(sec) }}>
                {r === 'now' && l.separated.elapsedSec < sec
                  ? <><span className="co-seg is-internal" style={{ width: `${(l.separated.elapsedSec / sec) * 100}%` }} /><span className="co-seg is-external" style={{ width: `${(1 - l.separated.elapsedSec / sec) * 100}%` }} /></>
                  : <span className="co-seg is-internal" style={{ width: '100%' }} />}
              </div>
              <span className="co-target" style={{ left: pct(SMED_TARGET_SEC) }} aria-hidden />
            </div>
            <b className="co-bar-n">{mins(sec)}</b>
            <span className="co-bar-w sub">{week ? `${span(week.sec)} a week${costOf(week) ? ` · ${costOf(week)}` : ''}` : ''}</span>
          </div>
        );
      })}
      <p className="sub co-target-key"><span className="co-target-i" aria-hidden /> 9 min — single-digit minutes, SMED's target · <span className="co-key-i is-external" aria-hidden /> what leaves the stop when the external work is done outside</p>
    </div>
  );
}

/** The plan view's foot: what leaves the stop — prepared before, done after, eliminated. */
function PlanOutside({ seq }: { seq: ChangeoverStep[] }) {
  const c = checklistOf(seq);
  const gone = seq.filter(x => x.side === 'internal' && x.plan?.kind === 'eliminate').map(x => x.name.trim() || 'an element');
  if (!c.before.length && !c.after.length && !gone.length) return null;
  return (
    <p className="sub co-outside">
      {c.before.length ? <>Before the line stops: <b>{c.before.join(', ')}</b>. </> : null}
      {c.after.length ? <>After it runs again: <b>{c.after.join(', ')}</b>. </> : null}
      {gone.length ? <>Eliminated: <b>{gone.join(', ')}</b>.</> : null}
    </p>
  );
}

/* ------------------------------------------------------- a stage's rows */
function Rows({ seq, branches, editable, onOpen, control, none }: {
  seq: ChangeoverStep[]; branches: Map<string, StudyUse[]>; editable: boolean; onOpen: (st: ChangeoverStep) => void;
  control: (st: ChangeoverStep) => React.ReactNode; none?: string;
}) {
  if (!seq.length) return <div className="qsl-empty"><p>{none ?? <><b>No elements yet.</b> Lap the changeover on the phone as it happens — from the last good piece to the first good piece at full rate — or type the elements with their minutes.</>}</p></div>;
  return (
    <ol className="co-steps" aria-label="The elements">
      {seq.map(st => {
        const branch = branches.get(st.id) ?? [];
        const body = (
          <>
            <span className="ie-no">{st.order + 1}</span>
            <span className="co-step-main">
              <b className="co-step-n">{st.name.trim() || 'An element'}</b>
              <span className="co-step-f sub">{st.sec ? dur(st.sec) : 'no time yet'} · {st.side}{(st.crew ?? []).length ? ` · ${(st.crew ?? []).join(', ')}` : ''}{st.where ? ` · ${st.where}` : ''} · {st.source === 'carried' ? 'carried from before — not timed again yet' : st.source}{st.plan && st.plan.kind !== 'keep' ? ` · ${actionWords(st).split(',')[0]}` : ''}{branch.length ? ' · being made better' : ''}</span>
            </span>
          </>
        );
        return (
          <li key={st.id} className={'co-step' + (st.source === 'carried' ? ' is-carried' : '') + (branch.length ? ' has-fix' : '')}>
            {editable || branch.length
              ? <button type="button" className="co-step-b" aria-label={`Element ${st.order + 1}: ${st.name.trim() || 'an element'} — ${actionWords(st)}`} onClick={() => onOpen(st)}>{body}</button>
              : <span className="co-step-b">{body}</span>}
            <span className="co-step-ctl">{control(st)}</span>
          </li>
        );
      })}
    </ol>
  );
}

function SideChips({ st, editable, onSide }: { st: ChangeoverStep; editable: boolean; onSide: (s: ChangeoverSide) => void }) {
  return (
    <span className="chip-row co-side" role="radiogroup" aria-label={`${st.name} — internal or external`}>
      {(['internal', 'external'] as ChangeoverSide[]).map(side => (
        <button key={side} type="button" role="radio" aria-checked={st.side === side} disabled={!editable}
          className={'chip co-chip is-' + side + (st.side === side ? ' on' : '')} onClick={() => editable && st.side !== side && onSide(side)}>{side === 'internal' ? 'Internal' : 'External'}</button>
      ))}
    </span>
  );
}

function HowChips({ kinds, st, editable, onHow }: { kinds: SmedHow[]; st: ChangeoverStep; editable: boolean; onHow: (h: SmedHow) => void }) {
  return (
    <span className="chip-row co-how" role="radiogroup" aria-label={`${st.name} — how`}>
      {kinds.map(h => <button key={h} type="button" role="radio" aria-checked={st.plan?.how === h} disabled={!editable} className={'chip' + (st.plan?.how === h ? ' on' : '')} onClick={() => editable && onHow(h)}>{HOW_WORD[h]}</button>)}
    </span>
  );
}

/** A target time box: shown as the floor says it, written when it is left. */
function TargetBox({ value, label, editable, onSet }: { value?: number; label: string; editable: boolean; onSet: (sec: number | undefined) => void }) {
  const [t, setT] = useState(value !== undefined ? dur(value) : '');
  useEffect(() => { setT(value !== undefined ? dur(value) : ''); }, [value]);
  const sec = minutesTyped(t);
  return (
    <label className="co-target-box">{label}{' '}
      <input className="text-input" value={t} disabled={!editable} inputMode="text" placeholder="e.g. 4 min" aria-label={label}
        onChange={e => setT(e.target.value)} onBlur={() => { if (!t.trim()) onSet(undefined); else if (sec !== undefined) onSet(sec); }} />
      {t.trim() && sec === undefined && <span className="vs-bad sub"> not a time</span>}
    </label>
  );
}

/** Stage 3 for one element: streamline (how, its target; in parallel, alongside
 *  what and by whom), eliminate, or keep. */
function Streamline({ st, seq, people, editable, onPlan }: { st: ChangeoverStep; seq: ChangeoverStep[]; people: string[]; editable: boolean; onPlan: (p: SmedPlan | undefined) => void }) {
  const p = st.plan;
  const kinds: [SmedPlanKind, string][] = [['streamline', '↓ Streamline'], ['eliminate', '✕ Eliminate'], ['keep', 'Keep']];
  return (
    <span className="co-plan">
      <span className="chip-row" role="radiogroup" aria-label={`${st.name} — the plan`}>
        {kinds.map(([k, w]) => (
          <button key={k} type="button" role="radio" aria-checked={p?.kind === k} disabled={!editable} className={'chip' + (p?.kind === k ? ' on' : '')}
            onClick={() => editable && onPlan(p?.kind === k ? undefined : k === 'streamline' ? { kind: k, how: 'clamps' } : k === 'eliminate' ? { kind: k, how: 'no-adjust' } : { kind: k })}>{w}</button>
        ))}
      </span>
      {p?.kind === 'streamline' && <>
        <HowChips kinds={STREAMLINE_HOW.filter(h => h !== 'organise')} st={st} editable={editable} onHow={how => onPlan({ ...p, how })} />
        <TargetBox value={p.targetSec} label="Target inside the stop" editable={editable} onSet={sec => onPlan({ ...p, ...(sec !== undefined ? { targetSec: sec } : { targetSec: undefined }) })} />
        {p.how === 'parallel' && (
          <span className="co-par-f">
            <label>Alongside{' '}
              <select className="text-input" value={p.alongside ?? ''} disabled={!editable} aria-label={`${st.name} — alongside which element`} onChange={e => onPlan({ ...p, alongside: e.target.value || undefined })}>
                <option value="">Pick the element it runs beside…</option>
                {seq.filter(x => x.id !== st.id && x.side === 'internal' && x.plan?.kind !== 'convert' && x.plan?.kind !== 'eliminate').map(x => <option key={x.id} value={x.id}>{x.order + 1}. {x.name}</option>)}
              </select></label>
            <label>by{' '}
              <input className="text-input" list="co-people" defaultValue={(p.crew ?? [])[0] ?? ''} disabled={!editable} aria-label={`${st.name} — who does it in parallel`} placeholder="e.g. Fitter"
                onBlur={e => onPlan({ ...p, crew: e.target.value.trim() ? [e.target.value.trim()] : undefined })} /></label>
            <datalist id="co-people">{people.map(x => <option key={x} value={x} />)}</datalist>
          </span>
        )}
      </>}
      {p?.kind === 'eliminate' && <HowChips kinds={['no-adjust']} st={st} editable={editable} onHow={how => onPlan({ ...p, how })} />}
    </span>
  );
}

/** Standardise: the checklist, from the elements and their plans — an
 *  external element tapped Before or After. */
function Checklist({ seq, editable, onWhen }: { seq: ChangeoverStep[]; editable: boolean; onWhen: (id: string, w: 'before' | 'after') => void }) {
  const when = whenIn(seq);
  const c = checklistOf(seq);
  const ext = seq.filter(x => x.side === 'external');
  return (
    <div className="co-check">
      <div><small className="ie-h">Before the line stops</small><ul>{c.before.length ? c.before.map(x => <li key={x}>{x}</li>) : <li className="sub">Nothing yet.</li>}</ul></div>
      <div><small className="ie-h">With the line stopped</small><ul>{c.stopped.length ? c.stopped.map(x => <li key={x}>{x}</li>) : <li className="sub">Nothing — no internal work.</li>}</ul></div>
      <div><small className="ie-h">After it runs again</small><ul>{c.after.length ? c.after.map(x => <li key={x}>{x}</li>) : <li className="sub">Nothing.</li>}</ul></div>
      {editable && ext.length > 0 && (
        <div className="co-when">
          <small className="ie-h">The external work — before or after?</small>
          {ext.map(x => (
            <span key={x.id} className="co-when-row"><span>{x.name}</span>
              <span className="chip-row" role="radiogroup" aria-label={`${x.name} — before or after`}>
                {(['before', 'after'] as const).map(w => <button key={w} type="button" role="radio" aria-checked={when(x) === w} className={'chip' + (when(x) === w ? ' on' : '')} onClick={() => onWhen(x.id, w)}>{w === 'before' ? 'Before' : 'After'}</button>)}
              </span></span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- Lap */
/** THE PHONE'S STOPWATCH: name the element, who does it, its side; Start as
 *  it begins, Next as it ends — its time the time between taps, the next
 *  already running. Proving a fix, the carried elements are up in turn. */
function Lap({ again, people, onStep, onDone }: {
  again?: ChangeoverStep[]; people: string[];
  onStep: (x: { name: string; side: ChangeoverSide; sec: number; crew: string[]; again?: string }) => void;
  onDone: () => void;
}) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [who, setWho] = useState('');
  const [side, setSide] = useState<ChangeoverSide>('internal');
  const [n, setN] = useState(0);
  const [done, setDone] = useState<string[]>([]);
  const up = again?.find(x => !done.includes(x.id));
  useEffect(() => { if (up) { setName(up.name); setSide(up.side); setWho((up.crew ?? [])[0] ?? ''); } }, [up?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [, tick] = useState(0);
  useEffect(() => { const t = window.setInterval(() => tick(x => x + 1), 200); return () => window.clearInterval(t); }, []);
  const split = startedAt ? (Date.now() - startedAt) / 1000 : 0;
  const close = () => {
    if (!startedAt) return;
    onStep({ name: name.trim() || `Element ${n + 1}`, side, sec: +((Date.now() - startedAt) / 1000).toFixed(1), crew: who.trim() ? [who.trim()] : [], ...(up ? { again: up.id } : {}) });
    if (up) setDone(d => [...d, up.id]);
    setN(x => x + 1); setName(''); setSide('internal');
  };
  return (
    <div className="wb-timer co-lap" aria-label="Timing the changeover">
      <div className="wb-t-h"><b>{again?.length ? 'Time it again' : 'Lap'}</b><span className="sub">{n} element{n === 1 ? '' : 's'} timed{up ? ` · up next: ${up.name.trim() || 'an element'}` : again?.length ? ' · every carried element timed — any more are added' : ''}</span></div>
      <output className="wb-split" aria-live="off">{startedAt ? dur(split) : '0.0 s'}</output>
      <label className="field"><span className="field-label">This element</span>
        <input className="text-input" value={name} placeholder={`Element ${n + 1} — e.g. Change the former tube`} onChange={e => setName(e.target.value)} /></label>
      <label className="field"><span className="field-label">Who does it</span>
        <input className="text-input" value={who} list="co-lap-who" placeholder="e.g. Op 1, the fitter" onChange={e => setWho(e.target.value)} />
        <datalist id="co-lap-who">{people.map(x => <option key={x} value={x} />)}</datalist></label>
      <span className="chip-row" role="radiogroup" aria-label="Internal or external">
        {(['internal', 'external'] as ChangeoverSide[]).map(x => (
          <button key={x} type="button" role="radio" aria-checked={side === x} className={'chip co-chip is-' + x + (side === x ? ' on' : '')} onClick={() => setSide(x)}>{x === 'internal' ? 'Internal — the line stopped' : 'External — could be done while it runs'}</button>
        ))}
      </span>
      {!startedAt
        ? <button type="button" className="wb-lap" onClick={() => setStartedAt(Date.now())}>Start — at the last good piece</button>
        : <button type="button" className="wb-lap" onClick={() => { close(); setStartedAt(Date.now()); }}>Next — this one is done</button>}
      <div className="wb-t-acts">
        {startedAt && <button type="button" className="btn" onClick={() => { close(); setStartedAt(null); onDone(); }}>Last — first good piece at rate</button>}
        <button type="button" className="btn" onClick={onDone}>{startedAt ? 'Stop — keep what is timed' : 'Back'}</button>
      </div>
      <p className="sub">Each tap ends the element on the screen and starts the next; its time is the time between taps. Keep going through the adjustments and the run-up — the changeover ends at the first good piece at full rate.</p>
    </div>
  );
}

/** Move an element one place earlier (−1) or later (+1). */
function move(list: ChangeoverStep[], id: string, by: -1 | 1): ChangeoverStep[] {
  const sorted = [...list].sort((x, y) => x.order - y.order);
  const i = sorted.findIndex(x => x.id === id), j = i + by;
  if (i < 0 || j < 0 || j >= sorted.length) return list;
  const a = sorted[i].order, b = sorted[j].order;
  return list.map(x => (x.id === sorted[i].id ? { ...x, order: b } : x.id === sorted[j].id ? { ...x, order: a } : x));
}

/* ------------------------------------------------------------ one element */
/** EVERYTHING ABOUT ONE ELEMENT — what opens when its square is tapped, as the
 *  map's step sheet does: what, who, where, side, function, time, how known,
 *  done alongside what, the plan, Make it better. */
function ElementSheet({ step, seq, people, places, editable, canRemove, branch, better, nameOf, when, onClose, onSave, onMove, onRemove }: {
  step?: ChangeoverStep; seq: ChangeoverStep[]; people: string[]; places: string[]; editable: boolean; canRemove: boolean;
  branch: { title: string; href: string }[];
  better?: { label: string; onClick: () => void };
  nameOf: (id: string) => string | undefined; when: (st: ChangeoverStep) => 'before' | 'after';
  onClose: () => void; onSave: (st: ChangeoverStep) => void; onMove: (id: string, by: -1 | 1) => void; onRemove: (id: string) => void;
}) {
  const last = seq.length ? seq[seq.length - 1] : undefined;
  const [name, setName] = useState(step?.name ?? '');
  const [side, setSide] = useState<ChangeoverSide>(step?.side ?? 'internal');
  const [time, setTime] = useState(step?.sec !== undefined ? dur(step.sec) : '');
  const [crew, setCrew] = useState<string[]>(step?.crew ?? (last?.crew ?? []));
  const [other, setOther] = useState('');
  const [where, setWhere] = useState(step?.where ?? '');
  const [fn, setFn] = useState<SmedFunction | undefined>(step?.fn);
  const [alongside, setAlongside] = useState(step?.alongside ?? '');
  const [plan, setPlanState] = useState<SmedPlan | undefined>(step?.plan);
  const [note, setNote] = useState(step?.plan?.note ?? '');
  const [target, setTarget] = useState(step?.plan?.targetSec !== undefined ? dur(step.plan.targetSec) : '');
  const sec = minutesTyped(time), targetSec = minutesTyped(target);
  const bad = (!!time.trim() && sec === undefined) || (!!target.trim() && targetSec === undefined);
  const everyone = other.trim() && !crew.includes(other.trim()) ? [...crew, other.trim()] : crew;
  const ready = !!name.trim() && !bad;
  const save = () => {
    if (!ready) return;
    const p: SmedPlan | undefined = plan ? { ...plan, ...(note.trim() ? { note: note.trim() } : { note: undefined }), ...(targetSec !== undefined ? { targetSec } : { targetSec: undefined }) } : undefined;
    onSave({ id: step?.id ?? uid(), order: step?.order ?? (last ? last.order + 1 : 0), name: name.trim(), side,
      ...(sec !== undefined && sec > 0 ? { sec } : {}),
      /* timed stays timed when only its words change; a carried one opened and saved is as typed */
      source: step?.source === 'timed' && sec === step.sec ? 'timed' : 'typed', ...(step?.source === 'timed' && sec === step.sec ? { at: step.at, who: step.who } : sec !== undefined && sec > 0 ? { at: now() } : {}),
      ...(everyone.length ? { crew: everyone } : {}), ...(where.trim() ? { where: where.trim() } : {}), ...(fn ? { fn } : {}),
      ...(alongside ? { alongside } : {}), ...(p ? { plan: JSON.parse(JSON.stringify(p)) as SmedPlan } : {}), ...(step?.when ? { when: step.when } : {}) });
  };
  const kinds: [SmedPlanKind, string][] = side === 'internal' ? [['convert', '→E Convert to external'], ['streamline', '↓ Streamline'], ['eliminate', '✕ Eliminate'], ['keep', 'Keep']] : [['streamline', '↓ Streamline (organise)'], ['keep', 'Keep']];
  const howFor: SmedHow[] = plan?.kind === 'convert' ? CONVERT_HOW : plan?.kind === 'streamline' ? (side === 'external' ? ['organise'] : STREAMLINE_HOW.filter(h => h !== 'organise')) : plan?.kind === 'eliminate' ? ['no-adjust'] : [];
  const facts = step ? (
    <dl className="vs-facts-l co-facts">
      {([
        ['Side', step.side === 'external' ? 'External — could be done while the line runs' : 'Internal — the line stopped'],
        ['What kind of work', step.fn ? FN_WORD[step.fn] : 'Not said'],
        ['The time', step.sec ? `${dur(step.sec)}` : 'no time yet'],
        ['Who does it', (step.crew ?? []).join(', ') || 'Not said'],
        ['Where', step.where || 'Not said'],
        ['How it is known', step.source === 'carried' ? 'carried from the changeover before — not timed again yet' : step.source === 'timed' ? `timed${step.who ? ` by ${step.who}` : ''}` : 'typed'],
        ...(step.alongside ? [['At the same time as', nameOf(step.alongside) ?? 'another element'] as [string, string]] : []),
        ['The plan', planWords(step, nameOf, when) || 'None yet'],
      ] as [string, string][]).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
    </dl>
  ) : null;
  if (step && !editable) return (
    <Sheet open onClose={onClose} title="The element">
      <div className="vs-facts"><h3>{step.name.trim() || 'An element'}</h3>{facts}</div>
      {branch.length > 0 && <div className="vs-branch"><small className="ie-h">Being made better</small>{branch.map(b => <p key={b.href}><button type="button" className="linkish" onClick={() => nav(b.href)}>{b.title}</button></p>)}</div>}
      <div className="vs-step-acts"><button type="button" className="btn btn-ghost" onClick={onClose}>Close</button></div>
    </Sheet>
  );
  return (
    <Sheet open onClose={onClose} title={step ? 'The element' : 'Type an element'}>
      {step && <div className="vs-facts"><h3>{step.name.trim() || 'An element'}</h3>{facts}</div>}
      {branch.length > 0 && <div className="vs-branch"><small className="ie-h">Being made better</small>{branch.map(b => <p key={b.href}><button type="button" className="linkish" onClick={() => nav(b.href)}>{b.title}</button></p>)}</div>}
      {better && <div className="vs-step-acts co-better"><button type="button" className="btn btn-primary" onClick={better.onClick}>{better.label}</button></div>}
      <form className="vs-step" onSubmit={e => { e.preventDefault(); save(); }}>
        <label className="field"><span className="field-label">What is done</span>
          <input className="text-input" value={name} autoFocus={!step} maxLength={120} placeholder="e.g. Change the former tube" onChange={e => setName(e.target.value)} /></label>
        <div className="field"><span className="field-label">Internal or external</span>
          <span className="chip-row" role="radiogroup" aria-label="Internal or external">
            {(['internal', 'external'] as ChangeoverSide[]).map(x => (
              <button key={x} type="button" role="radio" aria-checked={side === x} className={'chip co-chip is-' + x + (side === x ? ' on' : '')}
                onClick={() => { setSide(x); if (x === 'external' && (plan?.kind === 'convert' || plan?.kind === 'eliminate')) setPlanState(undefined); }}>{x === 'internal' ? 'Internal — the line stopped' : 'External — could be done while it runs'}</button>
            ))}
          </span></div>
        <label className="field"><span className="field-label">How long it takes</span>
          <input className="text-input" value={time} inputMode="text" placeholder="e.g. 4 min, 30 s" onChange={e => setTime(e.target.value)} />
          <span className={'sub' + (time.trim() && sec === undefined ? ' vs-bad' : '')}>{time.trim() ? (sec !== undefined ? `= ${dur(sec)}` : 'Not a time — try "4 min" or "30 s"') : 'a bare number is minutes'}</span></label>
        <div className="field"><span className="field-label">Who does it — one or more</span>
          <span className="chip-row" role="group" aria-label="Who does it">
            {[...new Set([...crew, ...people])].map(p => (
              <button key={p} type="button" aria-pressed={crew.includes(p)} className={'chip' + (crew.includes(p) ? ' on' : '')}
                onClick={() => setCrew(w => (w.includes(p) ? w.filter(x => x !== p) : [...w, p]))}>{p}</button>
            ))}
          </span>
          <span className="vs-other">
            <input className="text-input" value={other} maxLength={60} aria-label="Someone else" placeholder="Someone else — e.g. Op 4, the electrician"
              onChange={e => setOther(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (other.trim()) { setCrew(w => (w.includes(other.trim()) ? w : [...w, other.trim()])); setOther(''); } } }} />
          </span></div>
        <label className="field"><span className="field-label">Where — the part of the machine <i className="sub">optional</i></span>
          <input className="text-input" value={where} list="co-places" maxLength={60} placeholder="e.g. the jaws, the film unit, the former" onChange={e => setWhere(e.target.value)} />
          <datalist id="co-places">{places.map(x => <option key={x} value={x} />)}</datalist></label>
        <div className="field"><span className="field-label">What kind of work</span>
          <span className="chip-row" role="radiogroup" aria-label="What kind of work">
            {FNS.map(x => <button key={x} type="button" role="radio" aria-checked={fn === x} className={'chip' + (fn === x ? ' on' : '')} onClick={() => setFn(fn === x ? undefined : x)}>{FN_WORD[x]}</button>)}
          </span></div>
        <label className="field"><span className="field-label">At the same time as <i className="sub">as timed</i></span>
          <select className="text-input" value={alongside} aria-label="At the same time as" onChange={e => setAlongside(e.target.value)}>
            <option value="">On its own</option>
            {seq.filter(x => x.id !== step?.id).map(x => <option key={x.id} value={x.id}>{x.order + 1}. {x.name}</option>)}
          </select></label>
        <div className="field"><span className="field-label">The plan</span>
          <span className="chip-row" role="radiogroup" aria-label="The plan">
            {kinds.map(([k, w]) => <button key={k} type="button" role="radio" aria-checked={plan?.kind === k} className={'chip' + (plan?.kind === k ? ' on' : '')}
              onClick={() => setPlanState(plan?.kind === k ? undefined : { kind: k, ...(k === 'convert' ? { how: 'prepare' as SmedHow } : k === 'streamline' ? { how: (side === 'external' ? 'organise' : 'clamps') as SmedHow } : k === 'eliminate' ? { how: 'no-adjust' as SmedHow } : {}) })}>{w}</button>)}
          </span>
          {howFor.length > 0 && (
            <span className="chip-row co-how" role="radiogroup" aria-label="How">
              {howFor.map(h => <button key={h} type="button" role="radio" aria-checked={plan?.how === h} className={'chip' + (plan?.how === h ? ' on' : '')} onClick={() => setPlanState(p => (p ? { ...p, how: h } : p))}>{HOW_WORD[h]}</button>)}
            </span>
          )}
          {plan && plan.kind !== 'keep' && (
            <>
              <input className="text-input" value={note} maxLength={120} aria-label="How, in your words" placeholder="How, in your words — e.g. pre-heat the spare jaws in the oven" onChange={e => setNote(e.target.value)} />
              {(plan.kind === 'streamline' || plan.kind === 'convert') && (
                <input className="text-input" value={target} aria-label={plan.kind === 'convert' ? 'Time left inside the stop' : 'Target time'} placeholder={plan.kind === 'convert' ? 'Time left inside the stop, if any — e.g. 1 min' : 'Target — e.g. 4 min'} onChange={e => setTarget(e.target.value)} />
              )}
            </>
          )}
        </div>
        <div className="vs-step-acts">
          <button type="submit" className="btn btn-primary" disabled={!ready}>{step ? 'Save' : 'Add it'}</button>
          {step && <>
            <button type="button" className="btn" onClick={() => onMove(step.id, -1)}>Earlier</button>
            <button type="button" className="btn" onClick={() => onMove(step.id, 1)}>Later</button>
            {canRemove && <button type="button" className="btn btn-ghost" onClick={() => onRemove(step.id)}>Take it off</button>}
          </>}
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Sheet>
  );
}

/* ------------------------------------------------------ the two products */
function ProductsSheet({ s, standards, onClose }: { s: ToolStudy; standards: Standard[]; onClose: () => void }) {
  const [from, setFrom] = useState(s.facts.fromProduct ?? '');
  const [to, setTo] = useState(s.facts.toProduct ?? s.product ?? '');
  const save = () => {
    const f = from.trim(), t = to.trim();
    const std = standards.find(x => x.product.trim().toLowerCase() === t.toLowerCase());
    void patchStudy(s.id, cur => ({
      facts: { ...cur.facts, ...(f ? { fromProduct: f } : {}), ...(t ? { toProduct: t } : {}) },
      ...(t ? { product: t } : {}), ...(std ? { standardId: std.id } : {}),
      /* the name follows the products while it was never written by hand */
      ...(f && t && (!cur.name || /→|^Into /.test(cur.name)) ? { name: `${f} → ${t}` } : {}),
    }));
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title="The two products">
      <form className="vs-step" onSubmit={e => { e.preventDefault(); save(); }}>
        <label className="field"><span className="field-label">From — what the line ran</span>
          <input className="text-input" value={from} list="co-products" autoFocus placeholder="e.g. Finest Red 2kg" onChange={e => setFrom(e.target.value)} /></label>
        <label className="field"><span className="field-label">To — what it changed to</span>
          <input className="text-input" value={to} list="co-products" placeholder="e.g. Express 1.25 kg" onChange={e => setTo(e.target.value)} />
          <span className="sub">A product with a line standard on the line is where Set as the standard writes the agreed sequence.</span></label>
        <datalist id="co-products">{standards.map(x => <option key={x.id} value={x.product} />)}</datalist>
        <div className="vs-step-acts">
          <button type="submit" className="btn btn-primary">Save</button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Sheet>
  );
}

/* --------------------------------------------------- how the line runs */
/** HOW THE LINE RUNS — Rowland, 12 October: "it could be 7 days a week, but
 *  it could be the amount of hours as well of running time, because we could
 *  have different shifts." Asked, never assumed: shifts a day, their hours
 *  and the planned breaks the line stops for (the same, or each its own —
 *  offered from the line's own shifts), days a week, weeks a year; how many
 *  changeovers — a shift, a day or a week; the line's speed: the critical
 *  machine's plate speed off the product's line balance ("we go by plate
 *  speed ... unless human"), else said as not a plate speed, else typed. The
 *  line's cost is read from its own settings, never typed here. Written
 *  once, on Save (docs/CAPACITY.md §1, §5, §6). */
function RunSheet({ s, std, line, money, onClose }: { s: ToolStudy; std?: Standard; line?: Workspace; money?: SmedMoney; onClose: () => void }) {
  const r = s.facts.running;
  const [shifts, setShifts] = useState(r?.shiftsPerDay ? String(r.shiftsPerDay) : r?.shiftHours?.length ? String(r.shiftHours.length) : '');
  const [differ, setDiffer] = useState(!!r?.shiftHours?.length);
  const [hours, setHours] = useState(r?.hoursPerShift ? String(r.hoursPerShift) : '');
  const [breaks, setBreaks] = useState(r?.breakMin !== undefined ? String(r.breakMin) : '');
  const [each, setEach] = useState<string[]>((r?.shiftHours ?? []).map(String));
  const [eachBreak, setEachBreak] = useState<string[]>((r?.shiftBreaks ?? []).map(String));
  const [days, setDays] = useState(r?.daysPerWeek ? String(r.daysPerWeek) : '');
  const [weeks, setWeeks] = useState(r?.weeksPerYear ? String(r.weeksPerYear) : '');
  const c = s.facts.changeovers ?? (s.facts.perWeek ? { count: s.facts.perWeek, per: 'week' as const } : undefined);
  const [count, setCount] = useState(c ? String(c.count) : '');
  const [per, setPer] = useState<'shift' | 'day' | 'week'>(c?.per ?? 'shift');
  const offered = lineRateOf(std?.capacity, line);
  const [rate, setRate] = useState(s.facts.ratePerMin ? String(s.facts.ratePerMin) : offered ? String(offered.ratePerMin) : '');
  const fromShifts = patternFromShifts(line?.shifts);
  const n = Math.max(0, Math.min(6, Math.round(Number(shifts) || 0)));
  /* zero is an answer for breaks — relief keeps the line running */
  const zeroOk = (t: string): number | undefined => { const v = Number(t.replace(',', '.')); return t.trim() && Number.isFinite(v) && v >= 0 ? v : undefined; };
  const useShifts = () => {
    if (!fromShifts?.shiftHours) return;
    const hs = fromShifts.shiftHours;
    setShifts(String(hs.length));
    if (hs.every(h => h === hs[0])) { setDiffer(false); setHours(String(hs[0])); } else { setDiffer(true); setEach(hs.map(String)); }
  };
  const save = () => {
    const sh = numTyped(shifts), h = numTyped(hours), b = zeroOk(breaks), d = numTyped(days), w = numTyped(weeks), co = numTyped(count), rt = numTyped(rate);
    const eachH = differ ? Array.from({ length: n }, (_, i) => numTyped(each[i] ?? '')) : [];
    const eachB = differ ? Array.from({ length: n }, (_, i) => zeroOk(eachBreak[i] ?? '')) : [];
    const running = {
      ...(sh ? { shiftsPerDay: Math.round(sh) } : {}),
      ...(differ
        ? { ...(eachH.length && eachH.every(x => x !== undefined) ? { shiftHours: eachH as number[] } : {}), ...(eachB.length && eachB.every(x => x !== undefined) ? { shiftBreaks: eachB as number[] } : {}) }
        : { ...(h ? { hoursPerShift: h } : {}), ...(b !== undefined ? { breakMin: b } : {}) }),
      ...(d ? { daysPerWeek: Math.min(7, d) } : {}), ...(w ? { weeksPerYear: Math.min(53, w) } : {}),
    };
    /* where the speed came from: the offer when it is the offer's; as it was
       when it is left as it was; otherwise typed */
    const same = !!(rt && offered && Math.abs(rt - offered.ratePerMin) < 1e-9);
    const kept = !same && rt !== undefined && rt === s.facts.ratePerMin;
    const from: SmedRateFrom = same && offered ? offered.from : kept ? (s.facts.rateFrom ?? 'typed') : 'typed';
    const station = same ? offered?.station : kept ? s.facts.rateStation : undefined;
    void patchStudy(s.id, cur => {
      const { perWeek: _pw, availableMinPerDay: _am, ratePerMin: _r, rateFrom: _rf, rateStation: _rs, changeovers: _c, ...rest } = cur.facts;
      void _pw; void _am; void _r; void _rf; void _rs; void _c;
      return { facts: { ...rest, running, ...(co ? { changeovers: { count: co, per } } : {}),
        ...(rt ? { ratePerMin: rt, rateFrom: from, ...(station ? { rateStation: station } : {}) } : {}) } };
    });
    onClose();
  };
  const typedRate = numTyped(rate);
  const offerWords = offered ? `${rateFromWords(offered.from, offered.station)}${offered.from === 'plate' || offered.from === 'person' ? `, off ${std?.product ?? 'the product'}'s line capacity` : ''}` : '';
  return (
    <Sheet open onClose={onClose} title="How the line runs">
      <form className="vs-step co-run" onSubmit={e => { e.preventDefault(); save(); }}>
        <p className="sub">What the changeovers cost, and how often each product can run, are worked out from this — never assumed. A shift runs for its length less the planned breaks the line stops for.</p>
        {fromShifts && <button type="button" className="btn co-use-shifts" onClick={useShifts}>Use {line?.name ? `${line.name}'s` : 'the line\'s'} shifts — {fromShifts.shiftHours?.length} shift{fromShifts.shiftHours?.length === 1 ? '' : 's'}: {fromShifts.shiftHours?.map(x => `${+x.toFixed(2)} h`).join(', ')}</button>}
        <div className="vs-step-times">
          <label className="field"><span className="field-label">Shifts a day</span>
            <input className="text-input" inputMode="numeric" value={shifts} placeholder="e.g. 2" onChange={e => setShifts(e.target.value)} /></label>
          {!differ && <label className="field"><span className="field-label">Hours a shift</span>
            <input className="text-input" inputMode="decimal" value={hours} placeholder="e.g. 8" onChange={e => setHours(e.target.value)} /></label>}
          {!differ && <label className="field"><span className="field-label">Breaks the line stops for, min a shift</span>
            <input className="text-input" inputMode="numeric" value={breaks} placeholder="e.g. 30 — 0 if relief covers them" onChange={e => setBreaks(e.target.value)} /></label>}
        </div>
        <label className="vs-burst-f"><input type="checkbox" checked={differ} onChange={e => setDiffer(e.target.checked)} /> The shifts are different</label>
        {differ && n > 0 && Array.from({ length: n }, (_, i) => (
          <div key={i} className="vs-step-times co-shift">
            <label className="field"><span className="field-label">Shift {i + 1}, hours</span>
              <input className="text-input" inputMode="decimal" value={each[i] ?? ''} placeholder="e.g. 8" onChange={e => setEach(xs => { const out = [...xs]; out[i] = e.target.value; return out; })} /></label>
            <label className="field"><span className="field-label">Shift {i + 1}, breaks the line stops for (min)</span>
              <input className="text-input" inputMode="numeric" value={eachBreak[i] ?? ''} placeholder="e.g. 30" onChange={e => setEachBreak(xs => { const out = [...xs]; out[i] = e.target.value; return out; })} /></label>
          </div>
        ))}
        <div className="field"><span className="field-label">Days a week</span>
          <span className="chip-row" role="radiogroup" aria-label="Days a week">
            {['5', '6', '7'].map(d => <button key={d} type="button" role="radio" aria-checked={days === d} className={'chip' + (days === d ? ' on' : '')} onClick={() => setDays(d)}>{d}</button>)}
            <input className="text-input co-days" inputMode="decimal" value={['5', '6', '7'].includes(days) ? '' : days} placeholder="other" aria-label="Days a week, typed" onChange={e => setDays(e.target.value)} />
          </span></div>
        <label className="field"><span className="field-label">Weeks a year <i className="sub">optional — for the year's figure</i></span>
          <input className="text-input" inputMode="numeric" value={weeks} placeholder="e.g. 48" onChange={e => setWeeks(e.target.value)} /></label>
        <div className="field"><span className="field-label">Changeovers</span>
          <span className="co-count">
            <input className="text-input" inputMode="decimal" value={count} placeholder="e.g. 3" aria-label="How many changeovers" onChange={e => setCount(e.target.value)} />
            <span className="chip-row" role="radiogroup" aria-label="A shift, a day or a week">
              {(['shift', 'day', 'week'] as const).map(p => <button key={p} type="button" role="radio" aria-checked={per === p} className={'chip' + (per === p ? ' on' : '')} onClick={() => setPer(p)}>a {p}</button>)}
            </span>
          </span></div>
        <label className="field"><span className="field-label">The line's speed, packs a minute</span>
          <input className="text-input" inputMode="decimal" value={rate} placeholder="e.g. 60" onChange={e => setRate(e.target.value)} />
          <span className="sub co-rate-from">{offered
            ? (typedRate !== undefined && Math.abs(typedRate - offered.ratePerMin) < 1e-9 ? `From ${offerWords}.`
              : <>{cap1(offerWords)} says {offered.ratePerMin}{typedRate !== undefined ? ` — ${typedRate} is said as ${typedRate === s.facts.ratePerMin ? rateFromWords(s.facts.rateFrom ?? 'typed', s.facts.rateStation) : 'typed'}` : ''}. <button type="button" className="linkish" onClick={() => setRate(String(offered.ratePerMin))}>Use {offered.ratePerMin}</button></>)
            : 'No plate speed on the product\'s line capacity, no target and no rated speed for the line — type it; it will be said as typed.'}</span></label>
        <p className="sub co-money">{money ? moneyWords(money, line) : 'No cost set for this line — pounds are not said. The line\'s settings hold its crew, wage and margin a pack.'}</p>
        <div className="vs-step-acts">
          <button type="submit" className="btn btn-primary">Save</button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Sheet>
  );
}

const cap1 = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** The line's cost, in its two parts, and where it is from. */
function moneyWords(m: SmedMoney, line?: Workspace): string {
  const parts = [m.labourPerHour ? `idle labour £${Math.round(m.labourPerHour).toLocaleString('en-GB')} an hour stopped` : '',
    m.marginPerPack ? `£${m.marginPerPack} contribution a pack, counted only if the packs cannot be made up` : ''].filter(Boolean);
  return `${cap1(parts.join('; '))} — from ${line?.name ?? 'the line'}'s cost settings.`;
}

/* ------------------------------------------------------- the interval's products */
type Row = { id: string; product: string; standardId?: string; demand: string; rate: string; run: string; fromStandard?: number };

/** THE PRODUCTS RUN ON THE LINE, each with what the customer takes a day and
 *  the line's rate on it — offered from its line standard's balance (and said
 *  so) — or its minutes a day typed. The minutes the line has a day come from
 *  how the line runs. Written once, on Save. */
function IntervalSheet({ s, standards, onClose }: { s: ToolStudy; standards: Standard[]; onClose: () => void }) {
  const have = s.facts.products ?? [];
  const rowOf = (p: ChangeoverProduct): Row => {
    const std = standards.find(x => x.id === p.standardId) ?? standards.find(x => x.product.trim().toLowerCase() === p.product.trim().toLowerCase());
    return { id: p.id, product: p.product, ...(std ? { standardId: std.id } : {}), demand: p.demandPerDay ? String(p.demandPerDay) : '', rate: p.ratePerMin ? String(p.ratePerMin) : '',
      run: p.runMinPerDay ? String(p.runMinPerDay) : '', ...(std?.capacity?.targetPerMin ? { fromStandard: std.capacity.targetPerMin } : {}) };
  };
  const seed = (): Row[] => {
    const rows = have.map(rowOf);
    const has = (name: string) => rows.some(r => r.product.trim().toLowerCase() === name.trim().toLowerCase());
    for (const std of standards) if (!has(std.product)) rows.push(rowOf({ id: uid(), product: std.product, standardId: std.id, ...(std.capacity?.targetPerMin ? { ratePerMin: std.capacity.targetPerMin } : {}) }));
    for (const name of [s.facts.fromProduct, s.facts.toProduct ?? s.product]) if (name?.trim() && !has(name)) rows.push(rowOf({ id: uid(), product: name.trim() }));
    return rows.map(r => (r.fromStandard && !r.rate ? { ...r, rate: String(r.fromStandard) } : r));
  };
  const [rows, setRows] = useState<Row[]>(seed);
  const [added, setAdded] = useState('');
  const set = (id: string, p: Partial<Row>) => setRows(rs => rs.map(r => (r.id === id ? { ...r, ...p } : r)));
  const avail = availableOf(s.facts);
  const save = () => {
    const products: ChangeoverProduct[] = rows.filter(r => r.product.trim()).map(r => ({
      id: r.id, product: r.product.trim(), ...(r.standardId ? { standardId: r.standardId } : {}),
      ...(numTyped(r.demand) ? { demandPerDay: numTyped(r.demand) } : {}), ...(numTyped(r.rate) ? { ratePerMin: numTyped(r.rate) } : {}), ...(numTyped(r.run) ? { runMinPerDay: numTyped(r.run) } : {}),
    }));
    void patchStudy(s.id, cur => ({ facts: { ...cur.facts, products } }));
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title="The products run on the line">
      <form className="vs-step co-iv" onSubmit={e => { e.preventDefault(); save(); }}>
        <p className="sub">Every product this line runs, with what the customer takes a day and the line's rate on it — or its minutes a day. {avail ? `The line runs ${mins(avail.min * 60)} a day (${avail.from === 'running' ? 'its shifts less the breaks it stops for' : 'typed before the shifts were asked'}); what is left after the run is what the changeovers have.` : 'Say how the line runs as well — the interval needs its minutes a day.'}</p>
        {rows.map(r => {
          const run = runMinOf({ id: r.id, product: r.product, ...(numTyped(r.demand) ? { demandPerDay: numTyped(r.demand) } : {}), ...(numTyped(r.rate) ? { ratePerMin: numTyped(r.rate) } : {}), ...(numTyped(r.run) ? { runMinPerDay: numTyped(r.run) } : {}) });
          return (
            <fieldset key={r.id} className="co-iv-row">
              <legend className="co-iv-p">
                <input className="text-input" value={r.product} aria-label="Product" placeholder="Product" onChange={e => set(r.id, { product: e.target.value })} />
                <button type="button" className="linkish" onClick={() => setRows(rs => rs.filter(x => x.id !== r.id))}>Take it off</button>
              </legend>
              <div className="vs-step-times">
                <label className="field"><span className="field-label">Takes a day</span>
                  <input className="text-input" inputMode="decimal" value={r.demand} placeholder="e.g. 7200" aria-label={`${r.product || 'Product'} — demand a day`} onChange={e => set(r.id, { demand: e.target.value })} /></label>
                <label className="field"><span className="field-label">Rate, a minute</span>
                  <input className="text-input" inputMode="decimal" value={r.rate} placeholder="e.g. 60" aria-label={`${r.product || 'Product'} — rate a minute`} onChange={e => set(r.id, { rate: e.target.value })} />
                  <span className="sub">{r.fromStandard && numTyped(r.rate) === r.fromStandard ? 'from its line capacity' : r.fromStandard ? `its line capacity says ${r.fromStandard}` : 'no line capacity to read it from'}</span></label>
                <label className="field"><span className="field-label">Or: minutes a day</span>
                  <input className="text-input" inputMode="decimal" value={r.run} placeholder="e.g. 50" aria-label={`${r.product || 'Product'} — minutes a day`} onChange={e => set(r.id, { run: e.target.value })} /></label>
              </div>
              <span className="sub">{run ? `${mins(run.min * 60)} a day${run.how === 'rate' ? ' — from its demand and rate' : ', typed'}` : 'No run time yet.'}</span>
            </fieldset>
          );
        })}
        <div className="vs-other">
          <input className="text-input" value={added} aria-label="Another product" placeholder="Another product run on this line" onChange={e => setAdded(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (added.trim()) { setRows(rs => [...rs, rowOf({ id: uid(), product: added.trim() })]); setAdded(''); } } }} />
          <button type="button" className="btn" disabled={!added.trim()} onClick={() => { setRows(rs => [...rs, rowOf({ id: uid(), product: added.trim() })]); setAdded(''); }}>Add</button>
        </div>
        <div className="vs-step-acts">
          <button type="submit" className="btn btn-primary">Save</button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Sheet>
  );
}
