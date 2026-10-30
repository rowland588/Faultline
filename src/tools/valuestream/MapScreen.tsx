/* A VALUE STREAM MAP — one study of tool 'map' (docs/TOOLKIT.md, tool 2;
 * docs/BUILD.md, B1).
 *
 * Rowland, 11 October: "see the VSM like a grid — a swimlane grid. We can
 * see a journey of what, who and the value"; and, the same day, "remove
 * business-wide mapping ... but keep the line large, different departments
 * can affect the line". So a map is always a LINE's — end to end, from the
 * material arriving to the pallet leaving — and its lanes are everyone whose
 * work touches it: the operators, the machine, the team leader, and the
 * departments (planning, stores, quality, maintenance). It is laid out as
 * that grid (ui/ValueStream) — nothing drawn: who (or where) down the side,
 * the journey across, each step coloured by its value, its times under it;
 * a square tapped opens everything about that step.
 *
 * The page, top to bottom: what it is and where it sits (on its own, on a
 * line, on a job — ui/StudyPlace); what it is held against (the customer,
 * the supplier, the demand and the time available: takt); the strip and the
 * reading (lib/ie/steps); the grid; the steps, one tap to change; today or
 * the future state, copied from today and changed, before → after said; and
 * what it is used for on its job. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getStandard, getStudy, getWorkspace, onDataChange, patchStudy } from '../../db';
import { peopleOf } from '../linestandard/standard';
import { useAccess } from '../../cloud/access';
import { useSession } from '../../cloud/session';
import { displayName } from '../../cloud/team';
import { can as canAt, type Can } from '../../lib/access';
import { uid } from '../../lib/ids';
import { niceDay, isoDay } from '../../lib/weeks';
import { nav } from '../../state/useRoute';
import { classCounts, classifySummary, compareFlows, dur, flowFigures, flowMoney, flowMoneySays, flowSays, laneByDefault, nextUnclassified, notClassifiedWords, parseDur, share, stepWorth, tapValue, valueOf, valuesFor, waitOf, walkOrder, whereOf, whoOf, withValue, type LaneBy, type LineRate } from './steps';
import type { AgreedMap, FlowKind, FlowStep, FlowValue, StudyUse, ToolStudy } from '../../lib/study';
import { KIND_WORD, StepFacts, VALUE_CODE, VALUE_WORD, ValueStreamGrid, WalkIt } from './ValueStream';
import { offerUndo } from '../../ui/Undo';
import { UsedFor, useBetter, WhereItSits } from '../../ui/StudyPlace';
import { StudyBand } from '../../ui/StudyActs';
import { LeanActions, LeanClosing, LeanPanel } from '../../ui/Lean';
import { bandPage } from '../../lib/lean';
import { flowClosing, flowMoneyTiles } from './flowLean';
import { raisedFrom } from '../losses/lossLean';
import { recordHref, ROLE_WORD } from '../../lib/studyLinks';
import { Sheet } from '../../ui/Sheet';

const OWNER = canAt('owner');
type Which = 'flow' | 'future';

export function MapScreen({ id }: { id: string }) {
  const [s, setS] = useState<ToolStudy | null | undefined>(undefined);
  const load = useCallback(async () => setS((await getStudy(id)) ?? null), [id]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  const jobCan = useAccess(s?.projectId ?? '');
  /* On a job, the job's rule; on its own or on a line, its people may do all
     of it, as on any study (TOOLKIT 3.6). */
  const can = s?.projectId ? jobCan : OWNER;
  const { session } = useSession();
  const me = displayName(session?.user.email) || undefined;
  if (s === undefined) return <div className="wrap ie vs-page"><p className="sub">Opening…</p></div>;
  if (s === null) return (
    <div className="wrap ie vs-page">
      <h1>This map isn’t on this device</h1>
      <p className="sub">It may have been deleted, or not synced here yet.</p>
      <button type="button" className="btn" onClick={() => nav('/value-stream')}>Every value stream map</button>
    </div>
  );
  return <ValueStreamMap s={s} can={can} me={me} />;
}

function ValueStreamMap({ s, can, me }: { s: ToolStudy; can: Can; me?: string }) {
  const hasFuture = (s.facts.future ?? []).length > 0;
  const [which, setWhich] = useState<Which>('flow');
  const shown: Which = which === 'future' && hasFuture ? 'future' : 'flow';
  const a = s.agreed?.map;
  const list = useMemo(() => (shown === 'future' ? s.facts.future : s.facts.flow) ?? [], [shown, s.facts.future, s.facts.flow]);
  const f = useMemo(() => flowFigures(list, a), [list, a]);
  const today = useMemo(() => flowFigures(s.facts.flow, a), [s.facts.flow, a]);
  const said = flowSays(f, a);
  const [wasteOnly, setWasteOnly] = useState(false);
  const [editing, setEditing] = useState<FlowStep | 'new' | null>(null);
  /* A square tapped: everything about that step, one more tap to change it. */
  const [viewId, setViewId] = useState<string | null>(null);
  const [agreeing, setAgreeing] = useState(false);
  const [walking, setWalking] = useState(false);
  /* how to take back each step the walk has ended, last first */
  const walkUndo = useRef<(() => void)[]>([]);
  /* More ▾: the journey played, only the waste shown */
  const [playSignal, setPlaySignal] = useState(0);
  /* THE MAP INSIDE A CHANGE: a step's wait or waste raises a fix (stage gate)
     or a countermeasure (6M) — the same Make it better as Used for — and the
     step then wears the branch: a mark on its square, the record in its facts. */
  const { board, byRef, better, steps, tests } = useBetter(s, me);
  const branches = useMemo(() => {
    const m = new Map<string, StudyUse[]>();
    for (const u of s.uses) if (u.step && u.role === 'evidence' && byRef.has(u.ref)) m.set(u.step, [...(m.get(u.step) ?? []), u]);
    return m;
  }, [s.uses, byRef]);
  /* WALK IT AGAIN: on a map proving a fix, the steps carried from before are
     walked in their order — each Next times the one up next. Waits are typed. */
  const carried = useMemo(() => [...list].sort((x, y) => x.order - y.order).filter(x => x.source === 'carried' && x.kind !== 'wait' && x.kind !== 'store'), [list]);
  const editable = can.edit;
  const write = (p: Parameters<typeof patchStudy>[1]) => void patchStudy(s.id, p);
  const setList = (fn: (cur: FlowStep[]) => FlowStep[]) =>
    write(cur => ({ facts: { ...cur.facts, [shown]: fn((shown === 'future' ? cur.facts.future : cur.facts.flow) ?? []) } }));
  /* A STEP'S VALUE IN ONE TAP (Rowland, 30 October): saved at once, with Undo.
     */
  const classify = (st: FlowStep, v: FlowValue | undefined) => {
    const was = valueOf(st), key = shown;
    const put = (to: FlowValue | undefined) => write(cur => ({ facts: { ...cur.facts, [key]: ((key === 'future' ? cur.facts.future : cur.facts.flow) ?? []).map(x => (x.id === st.id ? withValue(x, to) : x)) } }));
    put(v);
    offerUndo(`${st.name.trim() || 'A step'}: ${v ? VALUE_CODE[v] : 'not classified'}`, async () => put(was));
  };
  /* THE STEP OPEN: one panel for a step and for walking the map — its value in three buttons, Back,
     Next and Next unclassified (Rowland, 30 October: "too complex, many different buttons ...
     simplify"). A letter on a step nobody had classified goes on to the next one nobody has. */
  const ordered = useMemo(() => walkOrder(list), [list]);
  const viewIdx = viewId ? ordered.findIndex(x => x.id === viewId) : -1;
  const viewing = viewIdx >= 0 ? { st: ordered[viewIdx], n: viewIdx + 1, lead: stepLead(list, ordered[viewIdx], a) } : null;
  const summary = useMemo(() => classifySummary(list, a), [list, a]);
  const jumpTo = (from: number) => { const j = nextUnclassified(ordered, from); if (j !== undefined) setViewId(ordered[j].id); };
  const tap = (tapped: FlowValue) => {
    if (!viewing || !editable || !valuesFor(viewing.st.kind).includes(tapped)) return;
    const next = tapValue(viewing.st, tapped), fresh = !valueOf(viewing.st);
    classify(viewing.st, next);
    if (next && fresh) jumpTo(viewIdx);
  };
  useEffect(() => {
    if (!viewing || !editable) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = ({ v: 'adds', e: 'needed', n: 'waste' } as Record<string, FlowValue>)[e.key.toLowerCase()];
      if (k) { e.preventDefault(); tap(k); }
      else if (e.key === 'ArrowLeft' && viewIdx > 0) { e.preventDefault(); setViewId(ordered[viewIdx - 1].id); }
      else if (e.key === 'ArrowRight' && viewIdx < ordered.length - 1) { e.preventDefault(); setViewId(ordered[viewIdx + 1].id); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  const compare = useMemo(() => (shown === 'future' ? new Map((s.facts.flow ?? []).map(x => [x.id, x])) : undefined), [shown, s.facts.flow]);
  const lanesKnown = useLanes(s);
  const [lineName, setLineName] = useState<string | undefined>(undefined);
  /* the line's rate — the one cost model (FC-001's money): read, never typed on the map */
  const [lineRate, setLineRate] = useState<LineRate | undefined>(undefined);
  useEffect(() => {
    if (!s.workspaceId) return;
    const read = () => void getWorkspace(s.workspaceId as string).then(w => { setLineName(w?.name); setLineRate(w ? { labourRatePerHour: w.labourRatePerHour, labourBurden: w.labourBurden } : undefined); });
    read();
    /* the line's wage given on its page while the map is open reaches the money here */
    return onDataChange(read);
  }, [s.workspaceId]);
  const money = useMemo(() => flowMoney(list, a, lineRate), [list, a, lineRate]);
  const moneySaid = useMemo(() => flowMoneySays(money, a), [money, a]);
  /* MULTI-DIMENSIONAL: the lanes are who does each step, or where it is done;
     either, one tap. A map opens by who (one saved as door-to-door before it
     was removed opens by where, the lanes it was made with). */
  const [laneBy, setLaneBy] = useState<LaneBy>(laneByDefault(a));

  return (
    <div className="wrap ie vs-page">
      {/* THE LEAN PAGE (docs/LEAN-PAGE.md, slice 6): the band; the seven cards
          stay its tiles, in the method's colours; the action plan and the
          closing line (lib/ie/flowLean) at its foot */}
      <StudyBand page={bandPage('Value stream map', s, f.steps ? `${f.untimed ? '≥ ' : ''}${dur(f.leadSec)} lead time` : 'No steps yet', f.longestCycle?.overTakt ? 'r' : 'n')} s={s} what="Value stream map" canEdit={can.edit && !s.closedAt} canRemove={can.remove}
        /* ONE primary, and the rest behind More ▾ (Rowland, 30 October: "too complex, many different buttons, not understanding
           any of them ... simplify"): what a person does here is time the steps; the views and the other ways in are in More */
        primary={editable ? { label: carried.length ? 'Time the steps again' : 'Time the steps', run: () => setWalking(true) } : undefined}
        extra={[
          ...(list.length > 1 ? [{ label: 'Play the journey', run: () => setPlaySignal(n => n + 1) }] : []),
          ...(list.length > 0 ? [{ label: wasteOnly ? 'Show every step' : 'Show only the waste', run: () => setWasteOnly(w => !w) }] : []),
          ...(editable && !hasFuture && (s.facts.flow ?? []).length > 0 ? [{ label: 'Plan the future — copy today’s steps', run: () => { write(cur => ({ facts: { ...cur.facts, future: (cur.facts.flow ?? []).map(x => ({ ...x })) } })); setWhich('future'); } }] : []),
          ...(can.agree && a?.demandPerDay ? [{ label: 'Change what it is held against', run: () => setAgreeing(true) }] : []),
        ]} />
      <div className="ln-under">
        <p className="sub ie-where">{/* the line is said once, just below, where it can be changed (ui/StudyPlace) */}
          {lineName ? 'what is done, and who does it' : 'not on a line yet — put it on its line below'} · started {niceDay(isoDay(s.startedAt))}{s.product ? <> · <b>{s.product}</b></> : null}</p>
        <WhereItSits s={s} can={can} />
      </div>

      {walking && (
        <WalkIt people={lanesKnown.people} places={lanesKnown.places} onDone={() => { walkUndo.current = []; setWalking(false); }} again={carried} tally={classCounts(list)}
          onUndo={() => walkUndo.current.pop()?.()}
          onStep={w => {
            /* the value a letter gave — only if the kind may take it (steps.valuesFor, the step's sheet's rule) */
            const val = w.value && valuesFor(w.kind).includes(w.value) ? w.value : undefined;
            if (w.again) {
              let prev: FlowStep | undefined;
              setList(cur => cur.map(x => {
                if (x.id !== w.again) return x;
                prev = x;
                const nx: FlowStep = { ...x, name: w.name, ...(w.who && !whoOf(x, a).includes(w.who) ? { who: [w.who] } : {}), ...(w.where ? { where: w.where } : {}), cycleSec: w.cycleSec, source: 'timed' as const };
                return val ? withValue(nx, val) : nx;
              }));
              walkUndo.current.push(() => setList(cur => cur.map(x => (x.id === w.again && prev ? prev : x))));
            } else {
              const id = uid();
              setList(cur => [...cur, { id, order: cur.reduce((m, x) => Math.max(m, x.order), -1) + 1, name: w.name,
                ...(w.who ? { who: [w.who] } : {}), ...(w.where ? { where: w.where } : {}), lane: (laneByDefault(a) === 'who' ? w.who : w.where) || w.who || w.where || 'Not said',
                kind: w.kind, ...(val ? { value: val } : {}), cycleSec: w.cycleSec, source: 'timed' as const }]);
              walkUndo.current.push(() => setList(cur => cur.filter(x => x.id !== id)));
            }
          }} />
      )}

      {agreeing ? <Agree s={s} onDone={() => setAgreeing(false)} />
        : (
          <p className="ie-agreed sub vs-agreed">
            {a?.supplier || a?.customer ? <>From <b>{a?.supplier || 'the order'}</b> to <b>{a?.customer || 'the customer'}</b>. </> : 'The two ends are not named yet. '}
            {a?.demandPerDay ? <>The customer takes <b>{a.demandPerDay} a day</b>{a.availableSecPerDay ? <>, worked in <b>{dur(a.availableSecPerDay)}</b> — takt <b>{f.taktSec ? dur(f.taktSec) : '—'}</b></> : ''}. </> : 'No demand agreed yet — takt and days of stock come from it. '}
            {can.agree && !a?.demandPerDay && <button type="button" className="linkish" onClick={() => setAgreeing(true)}>{a ? 'Change what it is held against' : 'Name the ends and the demand'}</button>}
          </p>
        )}

      {/* THE TOTALS — the value three ways, the share that adds value, the
          work and the whole lead time; value by its fill and letters. */}
      <div className="vs-cards" role="group" aria-label="Where the stream stands">
        <div className="vs-card2 is-adds"><span>Adds value</span><b>{dur(f.addsSec)}</b></div>
        <div className="vs-card2 is-needed"><span>Necessary</span><b>{dur(f.neededSec)}</b></div>
        <div className="vs-card2 is-waste"><span>Non-value adding</span><b>{dur(f.wasteSec)}</b></div>
        <div className="vs-card2"><span>% value added</span><b>{share(f.pce ?? 0)}</b></div>
        <div className="vs-card2"><span>Cycle time</span><b>{dur(cycleTotal(list))}</b></div>
        <div className="vs-card2 is-lead"><span>Lead time</span><b>{f.untimed ? '≥ ' : ''}{dur(f.leadSec)}</b></div>
        {f.taktSec ? <div className="vs-card2"><span>Takt</span><b>{dur(f.taktSec)}</b></div> : null}
        {f.unmarked > 0 && <div className="vs-card2 is-unmarked" title="In none of VA · NE · NV — the % value added counts only the steps classified VA"><span>Not classified</span><b>{f.unmarked} step{f.unmarked === 1 ? '' : 's'}</b></div>}
        {/* IN MONEY (knowledge/specs/FC-001-value-stream-money.md): the labour on waste work a day, and
            the product waiting — tied up and carried; a missing input named on the card */}
        {flowMoneyTiles(money, a).map(t => (
          <div key={t.k} className={'vs-card2 is-money' + (t.v === '—' ? ' is-none' : '')} title={t.of}><span>{t.k}</span><b>{t.v}</b><small>{t.of}</small></div>
        ))}
      </div>
      <div className="ie-says">
        <p className="ie-say">{said.text}</p>
        {moneySaid && <p className={'ie-say ie-money is-' + moneySaid.tone}>{moneySaid.text}</p>}
        {shown === 'future' && <p className="ie-say vs-compare"><b>Today → the future:</b> {compareFlows(today, f)}</p>}
        {f.unmarked > 0 && (
          <p className="ie-say ie-cap is-a vs-nudge">{notClassifiedWords(f.unmarked)}{' '}
            {editable && <button type="button" className="linkish" onClick={() => jumpTo(-1)}>Classify the steps ›</button>}</p>
        )}
        {said.lines.filter(l => l !== notClassifiedWords(f.unmarked)).map(l => <p key={l} className="ie-say ie-cap is-n">{l}</p>)}
      </div>

      {list.length > 0
        ? <>
          <div className="vs-bar">
            {hasFuture && (
              <span className="chip-row" role="tablist" aria-label="Which state">
                <button type="button" role="tab" aria-selected={shown === 'flow'} className={'chip' + (shown === 'flow' ? ' on' : '')} onClick={() => setWhich('flow')}>Today</button>
                <button type="button" role="tab" aria-selected={shown === 'future'} className={'chip' + (shown === 'future' ? ' on' : '')} onClick={() => setWhich('future')}>The future</button>
              </span>
            )}
            <span className="chip-row vs-by" role="tablist" aria-label="Lanes by">
              <span className="sub">Lanes by</span>
              <button type="button" role="tab" aria-selected={laneBy === 'who'} className={'chip' + (laneBy === 'who' ? ' on' : '')} onClick={() => setLaneBy('who')}>Who does it</button>
              <button type="button" role="tab" aria-selected={laneBy === 'where'} className={'chip' + (laneBy === 'where' ? ' on' : '')} onClick={() => setLaneBy('where')}>Where</button>
            </span>
            {wasteOnly && <button type="button" className="chip on vs-only" onClick={() => setWasteOnly(false)} title="Show every step again">Only the waste ✕</button>}
            {editable && <button type="button" className="btn vs-add" onClick={() => setEditing('new')}>+ Add a step</button>}
          </div>
          <ValueStreamGrid flow={list} f={f} a={a} wasteOnly={wasteOnly} by={laneBy} branched={branches} onOpen={st => setViewId(st.id)} playSignal={playSignal} />
        </>
        : <div className="qsl-empty"><p><b>No steps yet.</b> {editable ? <>Press <b>Time the steps</b> and walk the line with the stopwatch, tapping VA · NE · NV as each step ends — or type them in. </> : null}Start where the line's work starts — the order released, the film arriving from stores — to the pallet leaving, whoever does each thing (an operator, the machine, planning, quality, maintenance).</p>
          {editable && <button type="button" className="btn" onClick={() => setEditing('new')}>+ Add a step</button>}</div>}


      {/* WHAT WE ARE DOING ABOUT IT — what was raised from a step's wait or waste */}
      <LeanPanel title="Action plan" className="ln-solo ln-plan-p">
        <LeanActions actions={raisedFrom(s, steps, tests, step => list.find(x => x.id === step)?.name)} empty="Nothing raised from it yet — tap a red step's wait or waste and Make it better." />
      </LeanPanel>
      <UsedFor s={s} can={can} me={me} />
      <LeanClosing closing={flowClosing(f, a)} />


      {viewing && (
        <Sheet open onClose={() => setViewId(null)} title={`Step ${viewing.n}`}>
          <StepFacts st={viewing.st} n={viewing.n} leadSoFar={viewing.lead} a={a} was={compare?.get(viewing.st.id)}
            onValue={editable ? (_next, tapped) => tap(tapped) : undefined}
            walk={{ at: viewIdx, total: ordered.length, left: summary.counts.unclassified, summary: summary.text,
              ...(viewIdx > 0 ? { onBack: () => setViewId(ordered[viewIdx - 1].id) } : {}), ...(viewIdx < ordered.length - 1 ? { onNext: () => setViewId(ordered[viewIdx + 1].id) } : {}),
              ...(nextUnclassified(ordered, viewIdx) !== undefined ? { onJump: () => jumpTo(viewIdx) } : {}) }} />
          {(branches.get(viewing.st.id) ?? []).length > 0 && s.projectId && (
            <div className="vs-branch">
              <small className="ie-h">Being made better</small>
              {(branches.get(viewing.st.id) ?? []).map(u => (
                <p key={u.id}><span className="sub">{ROLE_WORD[`${u.kind}:${u.role}`] ?? u.role}:</span>{' '}
                  <button type="button" className="linkish" onClick={() => nav(recordHref(s.projectId ?? '', u))}>{byRef.get(u.ref)?.title}</button></p>
              ))}
            </div>
          )}
          {editable && shown === 'flow' && !branches.has(viewing.st.id) && stepWorth(list.find(x => x.id === viewing.st.id) ?? viewing.st, a) && !s.projectId && (
            <p className="sub vs-branch">Attach the map to a project to raise a fix from this step.</p>
          )}
          <div className="vs-step-acts">
            {editable && shown === 'flow' && !!s.projectId && !branches.has(viewing.st.id) && stepWorth(list.find(x => x.id === viewing.st.id) ?? viewing.st, a) && (
              <button type="button" className="btn btn-primary" onClick={() => { const id = viewing.st.id; setViewId(null); void better(id); }}>{board ? 'Make it better — a countermeasure' : 'Make it better — raise a fix'}</button>
            )}
            {editable && <button type="button" className="btn" onClick={() => { setEditing(list.find(x => x.id === viewing.st.id) ?? viewing.st); setViewId(null); }}>Change this step</button>}
            <button type="button" className="btn btn-ghost" onClick={() => setViewId(null)}>Close</button>
          </div>
        </Sheet>
      )}

      {editing && (
        <StepSheet key={editing === 'new' ? 'new' : editing.id} step={editing === 'new' ? undefined : editing} list={list} people={lanesKnown.people} places={lanesKnown.places} a={a}
          canRemove={can.remove || !s.projectId}
          onClose={() => setEditing(null)}
          onSave={st => { setList(cur => (cur.some(x => x.id === st.id) ? cur.map(x => (x.id === st.id ? st : x)) : [...cur, st])); setEditing(null); }}
          onMove={(id, by) => setList(cur => move(cur, id, by))}
          onRemove={id => { setList(cur => cur.filter(x => x.id !== id)); setEditing(null); }} />
      )}
    </div>
  );
}

/** What a map could put in its lanes, both dimensions: its own first; then
 *  the people on its product's line standard (Op 1, Op 2 …), the usual roles
 *  on a line and the departments that touch it; the line balance's stations
 *  and the usual places as where. */
function useLanes(s: ToolStudy): { people: string[]; places: string[] } {
  const [std, setStd] = useState<{ people: string[]; stations: string[] }>({ people: [], stations: [] });
  useEffect(() => {
    if (!s.standardId) { setStd({ people: [], stations: [] }); return; }
    void getStandard(s.standardId).then(st => setStd(st
      ? { people: peopleOf(st).map((p, i) => p.label?.trim() || `Op ${i + 1}`), stations: (st.capacity?.stations ?? []).map(x => x.name.trim()).filter(Boolean) }
      : { people: [], stations: [] }));
  }, [s.standardId]);
  const all = [...(s.facts.flow ?? []), ...(s.facts.future ?? [])];
  const ownWho = all.flatMap(x => whoOf(x, s.agreed?.map));
  const ownWhere = all.map(x => whereOf(x, s.agreed?.map)).filter((x): x is string => !!x);
  return {
    people: [...new Set([...ownWho, ...std.people, 'Machine', 'Team leader', 'Planning', 'Stores', 'Quality', 'Maintenance', 'Hygiene', 'Forklift driver', 'Despatch'])],
    places: [...new Set([...ownWhere, ...std.stations, 'Goods in', 'Stores', 'Infeed', 'Outfeed', 'Despatch', 'Office'])],
  };
}

/** The lead time by the end of a step — what its sheet says ("Lead time by here"). */
function stepLead(list: FlowStep[], st: FlowStep, a?: AgreedMap): number {
  let run = 0;
  for (const x of [...list].sort((p, q) => p.order - q.order)) { run += (x.cycleSec ?? 0) + (waitOf(x, a).sec ?? 0); if (x.id === st.id) break; }
  return run;
}

const cycleTotal = (list: FlowStep[]) => list.reduce((t, x) => t + (x.cycleSec ?? 0), 0);

/** Move a step one place earlier (−1) or later (+1) in the journey. */
function move(list: FlowStep[], id: string, by: -1 | 1): FlowStep[] {
  const sorted = [...list].sort((x, y) => x.order - y.order);
  const i = sorted.findIndex(x => x.id === id), j = i + by;
  if (i < 0 || j < 0 || j >= sorted.length) return list;
  const a = sorted[i].order, b = sorted[j].order;
  return list.map(x => (x.id === sorted[i].id ? { ...x, order: b } : x.id === sorted[j].id ? { ...x, order: a } : x));
}

/* ------------------------------------------------------------ one step */
function StepSheet({ step, list, people, places, a, canRemove, onClose, onSave, onMove, onRemove }: {
  step?: FlowStep; list: FlowStep[]; people: string[]; places: string[]; a?: AgreedMap; canRemove: boolean;
  onClose: () => void; onSave: (st: FlowStep) => void; onMove: (id: string, by: -1 | 1) => void; onRemove: (id: string) => void;
}) {
  const sorted = [...list].sort((x, y) => x.order - y.order);
  const last = sorted.length ? sorted[sorted.length - 1] : undefined;
  const [name, setName] = useState(step?.name ?? '');
  const [who, setWho] = useState<string[]>(step ? whoOf(step, a) : last ? whoOf(last, a) : []);
  const [where, setWhere] = useState(step ? whereOf(step, a) ?? '' : last ? whereOf(last, a) ?? '' : '');
  const [other, setOther] = useState('');
  const addOther = () => { const o = other.trim(); if (o) setWho(w => (w.includes(o) ? w : [...w, o])); setOther(''); };
  const [kind, setKind] = useState<FlowKind>(step?.kind ?? 'operation');
  const [value, setValue] = useState<FlowValue | undefined>(step?.value);
  const [cycle, setCycle] = useState(step?.cycleSec !== undefined ? dur(step.cycleSec) : '');
  const [wait, setWait] = useState(step?.waitSec !== undefined ? dur(step.waitSec) : '');
  const [queue, setQueue] = useState(step?.queue !== undefined ? String(step.queue) : '');
  const [crew, setCrew] = useState(step?.people !== undefined ? String(step.people) : '');
  const [batch, setBatch] = useState(step?.batch !== undefined ? String(step.batch) : '');
  const [info, setInfo] = useState(step?.info ?? '');
  const [burst, setBurst] = useState(!!step?.burst);
  const cycleSec = cycle.trim() ? parseDur(cycle, 's') : undefined;
  const waitSec = wait.trim() ? parseDur(wait, 'min') : undefined;
  const bad = (cycle.trim() && cycleSec === undefined) || (wait.trim() && waitSec === undefined);
  /* a name typed in "someone else" and not yet added still counts */
  const everyone = other.trim() && !who.includes(other.trim()) ? [...who, other.trim()] : who;
  const ready = !!name.trim() && (everyone.length > 0 || !!where.trim()) && !bad;
  /* Only an operation can add value; a wait or a store is waste. */
  const values: FlowValue[] = valuesFor(kind);   /* the one rule (steps.valuesFor), shared with the map's quick buttons */
  const save = () => {
    if (!ready) return;
    const q = Number(queue), p = Number(crew), b = Number(batch);
    const v = values.includes(value as FlowValue) ? value : undefined;
    onSave({
      id: step?.id ?? uid(), order: step?.order ?? (last ? last.order + 1 : 0),
      name: name.trim(), ...(everyone.length ? { who: everyone } : {}), ...(where.trim() ? { where: where.trim() } : {}),
      /* the one lane an older build reads: the map's own dimension first */
      lane: (laneByDefault(a) === 'who' ? everyone[0] : where.trim()) || everyone[0] || where.trim(), kind,
      ...(v ? { value: v } : {}),
      ...(cycleSec !== undefined ? { cycleSec } : {}), ...(waitSec !== undefined ? { waitSec } : {}),
      ...(queue.trim() && q > 0 ? { queue: q } : {}), ...(crew.trim() && p > 0 ? { people: p } : {}), ...(batch.trim() && b > 1 ? { batch: b } : {}),
      ...(info.trim() ? { info: info.trim() } : {}), ...(burst ? { burst: true } : {}),
      /* a step carried from before, opened and saved, is now as typed */
      source: step?.source && step.source !== 'carried' ? step.source : 'typed',
    });
  };
  const v = step ? valueOf(step) : undefined;
  return (
    <Sheet open onClose={onClose} title={step ? 'The step' : 'Add a step'}>
      <form className="vs-step" onSubmit={e => { e.preventDefault(); save(); }}>
        <label className="field"><span className="field-label">What is done</span>
          <input className="text-input" value={name} autoFocus={!step} maxLength={120} placeholder="e.g. Load the film and splice it" onChange={e => setName(e.target.value)} /></label>
        <div className="field"><span className="field-label">Who does it — one or more</span>
          <span className="chip-row" role="group" aria-label="Who does it">
            {[...new Set([...who, ...people])].map(p => (
              <button key={p} type="button" aria-pressed={who.includes(p)} className={'chip' + (who.includes(p) ? ' on' : '')}
                onClick={() => setWho(w => (w.includes(p) ? w.filter(x => x !== p) : [...w, p]))}>{p}</button>
            ))}
          </span>
          <span className="vs-other">
            <input className="text-input" value={other} maxLength={60} aria-label="Someone else" placeholder="Someone else — e.g. Op 4, Engineering"
              onChange={e => setOther(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOther(); } }} />
            <button type="button" className="btn" disabled={!other.trim()} onClick={addOther}>Add</button>
          </span></div>
        <label className="field"><span className="field-label">Where it is done</span>
          <input className="text-input" value={where} list="vs-places" maxLength={60} placeholder="e.g. Bagger, Case packer, Stores" onChange={e => setWhere(e.target.value)} />
          <datalist id="vs-places">{places.map(l => <option key={l} value={l} />)}</datalist></label>
        <div className="field"><span className="field-label">What kind of step</span>
          <span className="chip-row" role="radiogroup" aria-label="What kind of step">
            {(Object.keys(KIND_WORD) as FlowKind[]).map(k => <button key={k} type="button" role="radio" aria-checked={kind === k} className={'chip' + (kind === k ? ' on' : '')} onClick={() => setKind(k)}>{KIND_WORD[k]}</button>)}
          </span></div>
        <div className="field"><span className="field-label">Its value</span>
          {values.length ? (
            <span className="chip-row" role="radiogroup" aria-label="Its value">
              {values.map(x => <button key={x} type="button" role="radio" aria-checked={value === x} className={'chip vs-v is-' + x + (value === x ? ' on' : '')} onClick={() => setValue(value === x ? undefined : x)}>{VALUE_WORD[x]}</button>)}
            </span>
          ) : <span className="sub">A {KIND_WORD[kind].toLowerCase()} is non-value adding — the time is the order sitting still.</span>}
          {kind !== 'operation' && kind !== 'wait' && kind !== 'store' && <span className="sub"> Only an operation adds value.</span>}
        </div>
        <div className="vs-step-times">
          <label className="field"><span className="field-label">How long the work takes</span>
            <input className="text-input" value={cycle} inputMode="text" placeholder="e.g. 6 s, 20 min" onChange={e => setCycle(e.target.value)} />
            <span className={'sub' + (cycle.trim() && cycleSec === undefined ? ' vs-bad' : '')}>{cycle.trim() ? (cycleSec !== undefined ? `= ${dur(cycleSec)}` : 'Not a time — try "6 s" or "20 min"') : 'per piece, or per batch'}</span></label>
          <label className="field"><span className="field-label">How long it waits after</span>
            <input className="text-input" value={wait} placeholder="e.g. 40 min, 2 d" onChange={e => setWait(e.target.value)} />
            <span className={'sub' + (wait.trim() && waitSec === undefined ? ' vs-bad' : '')}>{wait.trim() ? (waitSec !== undefined ? `= ${dur(waitSec)}` : 'Not a time — try "40 min" or "2 d"') : 'or the pieces waiting →'}</span></label>
          <label className="field"><span className="field-label">Pieces waiting after it <i className="sub">optional</i></span>
            <input className="text-input" value={queue} inputMode="numeric" placeholder="e.g. 600" onChange={e => setQueue(e.target.value)} /></label>
          <label className="field"><span className="field-label">Pieces each time <i className="sub">optional</i></span>
            <input className="text-input" value={batch} inputMode="numeric" placeholder="1 — or an order, a pallet" onChange={e => setBatch(e.target.value)} /></label>
          <label className="field"><span className="field-label">People <i className="sub">optional</i></span>
            <input className="text-input" value={crew} inputMode="numeric" onChange={e => setCrew(e.target.value)} /></label>
        </div>
        <label className="field"><span className="field-label">How its next job reaches it <i className="sub">optional</i></span>
          <input className="text-input" value={info} list="vs-info" maxLength={60} placeholder="e.g. email, paper, the system, the board" onChange={e => setInfo(e.target.value)} />
          <datalist id="vs-info">{['paper', 'phone', 'email', 'the system', 'the board', 'word of mouth', 'kanban'].map(x => <option key={x} value={x} />)}</datalist></label>
        <label className="vs-burst-f"><input type="checkbox" checked={burst} onChange={e => setBurst(e.target.checked)} /> Something here must change</label>
        {step && v && <p className="sub">Now: {KIND_WORD[step.kind].toLowerCase()} · {VALUE_WORD[v]}{step.cycleSec ? ` · ${dur(step.cycleSec)}` : ''}.</p>}
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

/* ------------------------------------------------- what it is held against */
function Agree({ s, onDone }: { s: ToolStudy; onDone: () => void }) {
  const a = s.agreed?.map;
  const [supplier, setSupplier] = useState(a?.supplier ?? '');
  const [customer, setCustomer] = useState(a?.customer ?? '');
  const [demand, setDemand] = useState(a?.demandPerDay ? String(a.demandPerDay) : '');
  const [hours, setHours] = useState(a?.availableSecPerDay ? String(+(a.availableSecPerDay / 3600).toFixed(2)) : '');
  /* MONEY, optional (FC-001; Rowland, 24 October: flexible — not every cost is to hand) */
  const [pieceCost, setPieceCost] = useState(a?.pieceCost !== undefined ? String(a.pieceCost) : '');
  const [carryRate, setCarryRate] = useState(a?.carryingRatePerYear !== undefined ? String(a.carryingRatePerYear) : '');
  const d = Number(demand), h = Number(hours), pc = Number(pieceCost), cr = Number(carryRate);
  const moneyProblem = (pieceCost.trim() && !(pc > 0)) ? 'What a piece has cost — a number above zero.' : (carryRate.trim() && !(cr > 0 && cr <= 100)) ? 'The carrying rate — a percentage a year, up to 100.' : '';
  const save = () => {
    if (moneyProblem) return;
    const next: AgreedMap = {
      ...(a?.scope ? { scope: a.scope } : {}),
      ...(supplier.trim() ? { supplier: supplier.trim() } : {}), ...(customer.trim() ? { customer: customer.trim() } : {}),
      ...(demand.trim() && d > 0 ? { demandPerDay: d } : {}), ...(hours.trim() && h > 0 ? { availableSecPerDay: h * 3600 } : {}),
      ...(pieceCost.trim() && pc > 0 ? { pieceCost: pc } : {}), ...(carryRate.trim() && cr > 0 && cr <= 100 ? { carryingRatePerYear: cr } : {}),
    };
    void patchStudy(s.id, cur => ({ agreed: { ...cur.agreed, map: next } }));
    onDone();
  };
  return (
    <form className="ie-agree vs-agree" onSubmit={e => { e.preventDefault(); save(); }}>
      <h2>What it is held against</h2>
      <p className="sub">The two ends of the stream, and the customer's demand — so takt and days of stock are worked out, not guessed.</p>
      <div className="vs-step-times">
        <label className="field"><span className="field-label">It starts at</span>
          <input className="text-input" value={supplier} placeholder="e.g. the order released, film from stores" onChange={e => setSupplier(e.target.value)} /></label>
        <label className="field"><span className="field-label">It ends at</span>
          <input className="text-input" value={customer} placeholder="e.g. pallet away, Tesco" onChange={e => setCustomer(e.target.value)} /></label>
        <label className="field"><span className="field-label">The customer takes, a day</span>
          <input className="text-input" value={demand} inputMode="decimal" placeholder="e.g. 9600" onChange={e => setDemand(e.target.value)} /></label>
        <label className="field"><span className="field-label">Hours worked, a day</span>
          <input className="text-input" value={hours} inputMode="decimal" placeholder="e.g. 16" onChange={e => setHours(e.target.value)} /></label>
      </div>
      {d > 0 && h > 0 && <p className="sub">Takt: <b>{dur((h * 3600) / d)}</b> a piece.</p>}
      <fieldset className="ie-money-agree">
        <legend className="field-label">In money <i className="sub">optional — the map says what is missing; the labour rate is the line’s own</i></legend>
        <div className="vs-step-times">
          <label className="field"><span className="field-label">What a piece has cost by the time it waits (£) <i className="sub">materials at least</i></span>
            <input className="text-input" value={pieceCost} inputMode="decimal" placeholder="e.g. 0.80" onChange={e => setPieceCost(e.target.value)} /></label>
          <label className="field"><span className="field-label">Carrying rate, a year (%) <i className="sub">capital, storage, insurance, risk — many sit between 15 and 35</i></span>
            <input className="text-input" value={carryRate} inputMode="decimal" placeholder="e.g. 25" onChange={e => setCarryRate(e.target.value)} /></label>
        </div>
        {moneyProblem && <p className="ie-problem">{moneyProblem}</p>}
      </fieldset>
      <div className="vs-step-acts">
        <button type="submit" className="btn btn-primary">Agree it</button>
        <button type="button" className="btn btn-ghost" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}

