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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getStandard, getStudy, getWorkspace, onDataChange, patchStudy } from '../db';
import { peopleOf } from '../lib/standard';
import { useAccess } from '../cloud/access';
import { useSession } from '../cloud/session';
import { displayName } from '../cloud/team';
import { can as canAt, type Can } from '../lib/access';
import { uid } from '../lib/ids';
import { niceDay } from '../lib/weeks';
import { nav } from '../state/useRoute';
import { compareFlows, dur, flowFigures, flowSays, laneByDefault, parseDur, share, valueOf, whereOf, whoOf, type LaneBy } from '../lib/ie/steps';
import type { AgreedMap, FlowKind, FlowStep, FlowValue, ToolStudy } from '../lib/study';
import { KIND_WORD, StepFacts, VALUE_WORD, ValueStreamGrid, WalkIt } from '../ui/ValueStream';
import { UsedFor, WhereItSits } from '../ui/StudyPlace';
import { Sheet } from '../ui/Sheet';

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
  const [viewing, setViewing] = useState<{ st: FlowStep; n: number; lead: number } | null>(null);
  const [agreeing, setAgreeing] = useState(false);
  const [walking, setWalking] = useState(false);
  const editable = can.edit;
  const write = (p: Parameters<typeof patchStudy>[1]) => void patchStudy(s.id, p);
  const setList = (fn: (cur: FlowStep[]) => FlowStep[]) =>
    write(cur => ({ facts: { ...cur.facts, [shown]: fn((shown === 'future' ? cur.facts.future : cur.facts.flow) ?? []) } }));
  const compare = useMemo(() => (shown === 'future' ? new Map((s.facts.flow ?? []).map(x => [x.id, x])) : undefined), [shown, s.facts.flow]);
  const lanesKnown = useLanes(s);
  const [lineName, setLineName] = useState<string | undefined>(undefined);
  useEffect(() => { if (s.workspaceId) void getWorkspace(s.workspaceId).then(w => setLineName(w?.name)); }, [s.workspaceId]);
  /* MULTI-DIMENSIONAL: the lanes are who does each step, or where it is done;
     either, one tap. A map opens by who (one saved as door-to-door before it
     was removed opens by where, the lanes it was made with). */
  const [laneBy, setLaneBy] = useState<LaneBy>(laneByDefault(a));

  return (
    <div className="wrap ie vs-page">
      <header className="ie-head">
        <small className="ie-eyebrow">Value stream map</small>
        <h1 className="ie-name">{s.name || 'Not named'}</h1>
        <p className="sub ie-where">{lineName ? <>on <b>{lineName}</b>: what is done, and who does it</> : 'not on a line yet — put it on its line below'} · started {niceDay(new Date(s.startedAt).toISOString().slice(0, 10))}{s.product ? <> · <b>{s.product}</b></> : null}</p>
        <WhereItSits s={s} can={can} />
      </header>

      {agreeing ? <Agree s={s} onDone={() => setAgreeing(false)} />
        : (
          <p className="ie-agreed sub vs-agreed">
            {a?.supplier || a?.customer ? <>From <b>{a?.supplier || 'the order'}</b> to <b>{a?.customer || 'the customer'}</b>. </> : 'The two ends are not named yet. '}
            {a?.demandPerDay ? <>The customer takes <b>{a.demandPerDay} a day</b>{a.availableSecPerDay ? <>, worked in <b>{dur(a.availableSecPerDay)}</b> — takt <b>{f.taktSec ? dur(f.taktSec) : '—'}</b></> : ''}. </> : 'No demand agreed yet — takt and days of stock come from it. '}
            {can.agree && <button type="button" className="linkish" onClick={() => setAgreeing(true)}>{a ? 'Change what it is held against' : 'Name the ends and the demand'}</button>}
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
      </div>
      <div className="ie-says">
        <p className="ie-say">{said.text}</p>
        {shown === 'future' && <p className="ie-say vs-compare"><b>Today → the future:</b> {compareFlows(today, f)}</p>}
        {said.lines.map(l => <p key={l} className="ie-say ie-cap is-n">{l}</p>)}
      </div>

      <div className="vs-bar">
        <span className="chip-row" role="tablist" aria-label="Which state">
          <button type="button" role="tab" aria-selected={shown === 'flow'} className={'chip' + (shown === 'flow' ? ' on' : '')} onClick={() => setWhich('flow')}>Today</button>
          {hasFuture && <button type="button" role="tab" aria-selected={shown === 'future'} className={'chip' + (shown === 'future' ? ' on' : '')} onClick={() => setWhich('future')}>The future</button>}
        </span>
        <button type="button" className="btn" aria-pressed={wasteOnly} onClick={() => setWasteOnly(w => !w)}>{wasteOnly ? 'Show every step' : 'Show only the waste'}</button>
        {editable && !hasFuture && (s.facts.flow ?? []).length > 0 && (
          <button type="button" className="btn" onClick={() => { write(cur => ({ facts: { ...cur.facts, future: (cur.facts.flow ?? []).map(x => ({ ...x })) } })); setWhich('future'); }}>Copy to the future</button>
        )}
        {editable && <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>+ Add a step</button>}
        {editable && !walking && <button type="button" className="btn" onClick={() => setWalking(true)}>Walk it</button>}
      </div>

      {walking && (
        <WalkIt people={lanesKnown.people} places={lanesKnown.places} onDone={() => setWalking(false)}
          onStep={w => setList(cur => [...cur, { id: uid(), order: cur.reduce((m, x) => Math.max(m, x.order), -1) + 1, name: w.name,
            ...(w.who ? { who: [w.who] } : {}), ...(w.where ? { where: w.where } : {}), lane: (laneByDefault(a) === 'who' ? w.who : w.where) || w.who || w.where || 'Not said',
            kind: w.kind, cycleSec: w.cycleSec, source: 'timed' }])} />
      )}

      {list.length > 0
        ? <>
          <span className="chip-row vs-by" role="tablist" aria-label="Lanes by">
            <span className="sub">Lanes by</span>
            <button type="button" role="tab" aria-selected={laneBy === 'who'} className={'chip' + (laneBy === 'who' ? ' on' : '')} onClick={() => setLaneBy('who')}>Who does it</button>
            <button type="button" role="tab" aria-selected={laneBy === 'where'} className={'chip' + (laneBy === 'where' ? ' on' : '')} onClick={() => setLaneBy('where')}>Where</button>
          </span>
          <ValueStreamGrid flow={list} f={f} a={a} wasteOnly={wasteOnly} by={laneBy} onOpen={(st, n, lead) => setViewing({ st, n, lead })} />
        </>
        : <div className="qsl-empty"><p><b>No steps yet.</b> Start where the line's work starts — the order released, the film arriving from stores — and add each thing that is done, in the lane of whoever does it (an operator, the machine, planning, quality, maintenance), to the pallet leaving.</p></div>}


      <UsedFor s={s} can={can} me={me} />

      {viewing && (
        <Sheet open onClose={() => setViewing(null)} title={`Step ${viewing.n}`}>
          <StepFacts st={list.find(x => x.id === viewing.st.id) ?? viewing.st} n={viewing.n} leadSoFar={viewing.lead} a={a} was={compare?.get(viewing.st.id)} />
          <div className="vs-step-acts">
            {editable && <button type="button" className="btn btn-primary" onClick={() => { setEditing(list.find(x => x.id === viewing.st.id) ?? viewing.st); setViewing(null); }}>Change this step</button>}
            <button type="button" className="btn btn-ghost" onClick={() => setViewing(null)}>Close</button>
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
  const values: FlowValue[] = kind === 'operation' ? ['adds', 'needed', 'waste'] : kind === 'wait' || kind === 'store' ? [] : ['needed', 'waste'];
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
      source: step?.source ?? 'typed',
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
  const d = Number(demand), h = Number(hours);
  const save = () => {
    const next: AgreedMap = {
      ...(a?.scope ? { scope: a.scope } : {}),
      ...(supplier.trim() ? { supplier: supplier.trim() } : {}), ...(customer.trim() ? { customer: customer.trim() } : {}),
      ...(demand.trim() && d > 0 ? { demandPerDay: d } : {}), ...(hours.trim() && h > 0 ? { availableSecPerDay: h * 3600 } : {}),
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
      <div className="vs-step-acts">
        <button type="submit" className="btn btn-primary">Agree it</button>
        <button type="button" className="btn btn-ghost" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}

