/* THE LINE BALANCE — what each person does on a product, timed at the line,
 * against takt (docs/TOOLKIT.md, tools 3 and 4; lib/ie/balance; the link
 * to Line capacity in lib/ie/balanceLink).
 *
 * Rowland, 17 October: "line balance is about a more manual people process
 * flow analysis visual of what is happening where and what people are doing
 * ... I input people, what they do, and should be able to time them". Its
 * own tool now (it was a second tab inside Line capacity), in the order a
 * person uses it:
 *   - the people and what each does — started from the line standard's map,
 *     or typed — and WHERE each works: a station of the product's Line
 *     capacity, so their time is in that station's unit (a tray) and their
 *     takt the line's × the packs in a tray;
 *   - timed straight away, never held up by the takt: a full-screen timer,
 *     the steps listed with the one being timed marked, Lap, Undo the last
 *     lap, Skip, Foreign, the cycle running against takt;
 *   - each step work, walking or waiting (the combination table), told
 *     apart by fill and word;
 *   - stacked against takt (the Yamazumi) and, person by person, laid out
 *     as a bar against their own takt;
 *   - the takt from Line capacity's target (a new balance takes it; one
 *     agreed by hand keeps its own, the target offered); a people station
 *     in Line capacity takes its person's timed cycle;
 *   - Set as the standard: the map and its card read it.
 *
 * One record: a study of tool 'balance' on the product's record
 * (standardId). Its laps merge entry by entry between two phones (2b).
 *
 * ON A JOB it is evidence like any study (docs/BUILD.md, 3d): Make it better
 * raises a fix on whoever is over takt, and the fix's Prove it times the
 * same elements again — a second study on the same product, the newest the
 * one the map reads, the earlier one still opening as itself (?study=). */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getWorkspace, listAllStudies, onDataChange, patchStudy, putStandard, putStudy } from '../db';
import { useSession } from '../cloud/session';
import { displayName } from '../cloud/team';
import { now, uid } from '../lib/ids';
import { niceDay, isoDay } from '../lib/weeks';
import { currentBalance } from '../lib/studyLinks';
import { useRoute, nav } from '../state/useRoute';
import { UsedFor } from './StudyPlace';
import { peopleOf, type Standard } from '../lib/standard';
import { type Capacity } from '../lib/capacity';
import { fmtN } from '../lib/capacityWords';
import { aPiece, balance, balanceSays, elementSays, keptLaps, secs, suggest, type BalanceFigures, type PersonFigures } from '../lib/ie/balance';
import { agreedFor, balanceCost, balanceCostSays, capacityTaking, costInputs, crewKept, stationsOf, taktFromTarget, targetOffer, type StationPick } from '../lib/ie/balanceLink';
import type { Workspace } from '../types';
import type { AgreedBalance, BalanceCrew, BalanceStep, Lap, StepKind, ToolStudy } from '../lib/study';
import type { Can } from '../lib/access';
import { balanceClosing, balanceTiles } from '../lib/ie/balanceLean';
import { LeanClosing, LeanTiles } from './Lean';

const RATINGS = [75, 90, 100, 110, 125];
const KINDS: { kind: StepKind; word: string }[] = [{ kind: 'work', word: 'Work' }, { kind: 'walk', word: 'Walk' }, { kind: 'wait', word: 'Wait' }];
const KIND_WORD: Record<StepKind, string> = { work: 'work', walk: 'walking', wait: 'waiting' };
/** What an element carries when it is dragged to another person. */
const DRAG = 'application/x-faultline-element';
/** The address of this product's page, without its query. */
const herePath = (): string => window.location.hash.slice(1).split('?')[0];

/** The latest work balance on a line standard, kept current; null when none.
 *  `which`: an earlier timing of it, opened by name. */
export function useBalanceFor(standardId: string, which?: string | null): ToolStudy | null | undefined {
  return useBalances(standardId, which).study;
}

function useBalances(standardId: string, which?: string | null): { study: ToolStudy | null | undefined; current?: ToolStudy } {
  const [s, setS] = useState<{ study: ToolStudy | null | undefined; current?: ToolStudy }>({ study: undefined });
  const load = useCallback(async () => {
    const all = await listAllStudies();
    const current = currentBalance(all, standardId);
    const named = which ? all.find(x => x.id === which && x.tool === 'balance' && x.standardId === standardId) : undefined;
    setS({ study: named ?? current ?? null, ...(current ? { current } : {}) });
  }, [standardId, which]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  return s;
}

/** A balance's figures as its page reads them: the takt it holds to (Line
 *  capacity's target, or agreed here), and each person where they stand. */
export function figuresFor(study: ToolStudy, cap?: Capacity): { f: BalanceFigures; a?: AgreedBalance; crew: BalanceCrew[] } {
  const crew = crewKept(study.facts.crew ?? [], cap);
  const a = agreedFor(study.agreed?.balance, cap, !!study.closedAt);
  return { f: balance(study.facts.steps, a, crew), ...(a ? { a } : {}), crew };
}

/** The work as the map and the card read it: each person's work against their takt. */
export function workOf(study: ToolStudy | null | undefined, onMap?: number, cap?: Capacity):
  { taktSec: number; people: { who: string; work: number; over: boolean; source: string; untimed?: boolean; takt: number; piece: string }[]; text: string; short: string; set?: number } | undefined {
  if (!study) return undefined;
  const { f, a } = figuresFor(study, cap);
  if (!a || !f.people.length) return undefined;
  /* The card's one line leads with what matters: the constraint and how far over. */
  const c = f.constraint;
  const short = f.untimed ? `${f.elements.length - f.untimed} of ${f.elements.length} elements timed so far, against a ${secs(a.taktSec)} takt.`
    : `${secs(f.total)} of work at a ${secs(a.taktSec)} takt${c ? `: ${c.who} the constraint at ${secs(c.work)}${aPiece(c)}${c.overBy ? `, over by ${secs(c.overBy)}` : ''}` : ''}.`;
  return { taktSec: a.taktSec,
    people: f.people.map(p => ({ who: p.who, work: p.work, over: p.overBy > 0, source: p.source, takt: p.takt ?? a.taktSec, piece: aPiece(p), ...(p.source === 'none' ? { untimed: true } : {}) })),
    text: balanceSays(f, onMap).text, short, ...(study.closedAt ? { set: study.closedAt } : {}) };
}

/** Each product's work, for the card on paper (lib/standardCard): the latest
 *  work balance on each line standard. */
export async function worksFor(list: Standard[]): Promise<Record<string, ReturnType<typeof workOf>>> {
  const all = await listAllStudies();
  return Object.fromEntries(list.map(st => [st.id, workOf(currentBalance(all, st.id), peopleOf(st).length || undefined, st.capacity)]));
}

/** The line a product is on, kept current — for its labour rate and margin. */
export function useLine(wsId?: string): Workspace | undefined {
  const [w, setW] = useState<Workspace | undefined>(undefined);
  useEffect(() => {
    if (!wsId) { setW(undefined); return; }
    const load = () => void getWorkspace(wsId).then(setW);
    load();
    return onDataChange(load);
  }, [wsId]);
  return w;
}

/** WHAT THE BOTTLENECK COSTS (lib/ie/balanceLink balanceCost) — a pack and
 *  a minute, in the client's words, the abnormal first; or what it needs. */
export function CostBlock({ f, cap, wsId, lineUnit, capHref }: { f: BalanceFigures; cap?: Capacity; wsId?: string; lineUnit?: string; capHref?: string }) {
  const line = useLine(wsId);
  const inputs = costInputs(cap, line);
  const k = balanceCost(f, inputs);
  if (!f.taktSec || !f.people.length) return null;
  if (!k) {
    if (f.untimed) return null;
    return (
      <div className="wb-cost is-n">
        <span className="wb-cost-h">What it costs</span>
        <p className="sub">Give the line an hourly rate{capHref ? <> in <button type="button" className="linkish" onClick={() => nav(capHref)}>Line capacity ›</button></> : ' in Line capacity'} to see what the bottleneck costs a {(lineUnit ?? 'packs').replace(/s$/, '')} and a minute.</p>
      </div>
    );
  }
  const said = balanceCostSays(k, lineUnit);
  return (
    <div className={'wb-cost is-' + said.tone} role="note">
      <span className="wb-cost-h">What it costs</span>
      {said.lines.map((l, i) => <p key={i} className={'wb-cost-l' + (i === 0 && said.tone === 'r' ? ' is-r' : '')}>{l}</p>)}
      <p className="sub wb-cost-from">The rate {inputs.rateFrom === 'typed' ? 'typed in Line capacity' : 'the line’s own (its wage × on-costs)'}{inputs.contributionPerPack ? ', the contribution the line’s margin a pack' : ' — contribution lost needs the line’s margin a pack (its settings)'}.</p>
    </div>
  );
}

export function WorkView({ s, can }: { s: Standard; can: Can }) {
  const route = useRoute();
  const { study, current } = useBalances(s.id, route.query.get('study'));
  const { session } = useSession();
  const me = displayName(session?.user.email) || undefined;
  if (study === undefined) return <p className="sub">Opening…</p>;
  if (study === null) return <Start s={s} can={can} />;
  if (current && current.id !== study.id) {
    /* An earlier timing, opened from a fix's "How we know": read as it stood. */
    const back = () => { const q = new URLSearchParams(route.query); q.delete('study'); nav(`${herePath()}?${q.toString()}`); };
    return (
      <>
        <p className="wb-earlier sub">An earlier timing, started {niceDay(isoDay(study.startedAt))} — the line standard reads the newest.{' '}
          <button type="button" className="linkish" onClick={back}>Open the current one ›</button></p>
        <Work study={study} s={s} can={{ ...can, edit: false, agree: false, remove: false }} me={me} />
      </>
    );
  }
  return <Work study={study} s={s} can={can} me={me} />;
}

/* ------------------------------------------------------------ the first time */
function Start({ s, can }: { s: Standard; can: Can }) {
  const people = peopleOf(s);
  const t = taktFromTarget(s.capacity);
  const start = () => {
    const at = now();
    /* The map's people and what they do become the elements — nothing typed twice. */
    const steps: BalanceStep[] = people.map((p, i) => ({ id: uid(), order: i, name: p.task?.trim() || 'Their work', who: p.label?.trim() || `Op ${i + 1}` }));
    const id = uid();
    void putStudy({ id, tool: 'balance', name: s.product, standardId: s.id,
      ...(s.workspaceId ? { workspaceId: s.workspaceId } : {}), ...(s.projectId ? { projectId: s.projectId } : {}),
      /* a new balance takes its takt from Line capacity's target, and follows it */
      ...(t ? { agreed: { balance: { taktSec: t.taktSec, from: 'target' as const } } } : {}),
      facts: { steps }, uses: [], startedAt: at, createdAt: at, updatedAt: at });
  };
  return (
    <div className="wb-start">
      <p><b>Who does what on this product, and how long it takes — timed at the line.</b></p>
      <p className="sub">Put in the people and what each of them does{people.length ? ` (the map’s ${people.length} ${people.length === 1 ? 'person' : 'people'} to start with)` : ''}, then time them with one button.
        {t ? ` The takt comes from Line capacity’s target: ${secs(t.taktSec)}${aPiece({ unit: t.unit })}.` : ' The takt comes from Line capacity’s target — timing does not wait for it.'}</p>
      {can.edit ? <button type="button" className="btn btn-primary" onClick={start}>Start the line balance</button>
        : <p className="sub">Nobody has timed the work on this product yet.</p>}
    </div>
  );
}

/* ------------------------------------------------------------ the balance */
function Work({ study, s, can, me }: { study: ToolStudy; s: Standard; can: Can; me?: string }) {
  const closed = !!study.closedAt;
  const editable = can.edit && !closed;
  const steps = useMemo(() => study.facts.steps ?? [], [study.facts.steps]);
  const { f, a, crew } = figuresFor(study, s.capacity);
  const picks = useMemo(() => stationsOf(s.capacity), [s.capacity]);
  const lineUnit = s.capacity?.stations[0]?.unit.trim() || undefined;
  const onMap = peopleOf(s).length || undefined;
  const said = balanceSays(f, onMap);
  const line = useLine(s.workspaceId);
  const cost = a ? balanceCost(f, costInputs(s.capacity, line)) : undefined;
  const ghost = suggest(f);
  const offer = closed ? undefined : targetOffer(study.agreed?.balance, s.capacity);
  const [showGhost, setShowGhost] = useState(false);
  const [timing, setTiming] = useState<string | null>(null);
  const [agreeing, setAgreeing] = useState(false);
  const [dropOn, setDropOn] = useState<string | null>(null);
  const write = (p: Parameters<typeof patchStudy>[1]) => void patchStudy(study.id, p);
  const setSteps = (fn: (cur: BalanceStep[]) => BalanceStep[]) => write(cur => ({ facts: { ...cur.facts, steps: fn(cur.facts.steps ?? []) } }));
  const setCrew = (fn: (cur: BalanceCrew[]) => BalanceCrew[]) => write(cur => ({ facts: { ...cur.facts, crew: fn(cur.facts.crew ?? []) } }));
  const who = [...new Set([...f.people.map(p => p.who), ...peopleOf(s).map((p, i) => p.label?.trim() || `Op ${i + 1}`)])];

  /* THE LINK KEPT UP (lib/ie/balanceLink): the takt follows Line capacity's
     target, each person's station its name and unit, and a people station
     in Line capacity its person's timed cycle — written once each changes,
     by someone who may change the work, never by a client. */
  const sig = JSON.stringify([study.agreed?.balance ?? null, study.facts.crew ?? null, a ?? null, crew, s.capacity ?? null, f.people.map(p => [p.who, p.work, p.source])]);
  useEffect(() => {
    if (!can.edit) return;
    if (!closed) {
      const stored = study.agreed?.balance;
      if (a?.from === 'target' && (stored?.from !== 'target' || Math.abs(stored.taktSec - a.taktSec) > 0.0005))
        void patchStudy(study.id, cur => ({ agreed: { ...cur.agreed, balance: { ...a, ...(cur.agreed?.balance?.allowance ? { allowance: cur.agreed.balance.allowance } : {}) } } }));
      if (JSON.stringify(crew) !== JSON.stringify(study.facts.crew ?? []))
        void patchStudy(study.id, cur => ({ facts: { ...cur.facts, crew: crewKept(cur.facts.crew ?? [], s.capacity) } }));
    }
    if (s.capacity) { const next = capacityTaking(s.capacity, f, crew); if (next) void putStandard({ ...s, capacity: next }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `sig` is everything it reads, by value
  }, [sig, can.edit]);

  /* THE PEOPLE IN THE ORDER THE LINE FLOWS: by their station in Line
     capacity, then the people on no station, as they were added */
  const at = (p: PersonFigures) => { const c = crew.find(x => x.who === p.who); const i = c?.stationId ? picks.findIndex(x => x.id === c.stationId) : -1; return i < 0 ? 1e6 : i; };
  const people = [...f.people].map((p, i) => ({ p, i })).sort((x, y) => at(x.p) - at(y.p) || x.i - y.i).map(x => x.p);

  if (timing) {
    const p = f.people.find(x => x.who === timing);
    const mine = steps.filter(x => x.who === timing).sort((x, y) => x.order - y.order);
    return <Timer who={timing} steps={mine} {...(p?.takt ? { takt: p.takt } : {})} piece={p ? aPiece(p) : ''} product={s.product} me={me}
      onLap={(id, lap) => setSteps(cur => cur.map(x => (x.id === id ? { ...x, laps: [...(x.laps ?? []), lap] } : x)))}
      onUndo={(id, lapId) => setSteps(cur => cur.map(x => (x.id === id ? { ...x, laps: (x.laps ?? []).filter(l => l.id !== lapId) } : x)))}
      onDone={() => setTiming(null)} />;
  }

  const capHref = `${herePath()}?at=balance`;
  const placeOf = (whom: string, stationId: string) => {
    const pk = picks.find(x => x.id === stationId);
    setCrew(cur => {
      const rest = cur.filter(c => c.who !== whom);
      const old = cur.find(c => c.who === whom);
      return pk ? [...rest, { id: old?.id ?? uid(), who: whom, stationId: pk.id, station: pk.name, ...(pk.per != null ? { per: pk.per } : {}), ...(pk.unit ? { unit: pk.unit } : {}) }] : rest;
    });
  };
  const rename = (from: string, to: string) => {
    write(cur => ({ facts: { ...cur.facts,
      steps: (cur.facts.steps ?? []).map(x => (x.who === from ? { ...x, who: to } : x)),
      crew: (cur.facts.crew ?? []).map(c => (c.who === from ? { ...c, who: to } : c)) } }));
  };
  const takeOff = (whom: string) => {
    if (!window.confirm(`Take ${whom} off the line balance, with every step of theirs?`)) return;
    write(cur => ({ facts: { ...cur.facts, steps: (cur.facts.steps ?? []).filter(x => x.who !== whom), crew: (cur.facts.crew ?? []).filter(c => c.who !== whom) } }));
  };
  const addStep = (name: string, whom: string, kind?: StepKind) =>
    setSteps(cur => [...cur, { id: uid(), order: Math.max(-1, ...cur.map(x => x.order)) + 1, name, who: whom, ...(kind && kind !== 'work' ? { kind } : {}) }]);

  return (
    <div className="wb">
      {/* THE TILES (docs/LEAN-PAGE.md) — the people and what the work needs,
          the takt and where it came from, the bottleneck person against their
          takt, labour a pack, and what the bottleneck loses a minute; they
          took the strip's place, every figure it held among them */}
      <LeanTiles className="wb-strip ie-strip" tiles={balanceTiles(f, a, cost, lineUnit, onMap)} />

      {/* NO TAKT YET — the target is Line capacity's; timing never waits for it */}
      {!a && !agreeing && (
        <div className="wb-ask">
          <p><b>No takt yet.</b> The pace the line must keep comes from Line capacity’s target. Time the people meanwhile — nothing waits for it.</p>
          <div className="chip-row">
            <button type="button" className="btn" onClick={() => nav(capHref)}>Give Line capacity a target ›</button>
            {can.agree && !closed && <button type="button" className="btn btn-ghost" onClick={() => setAgreeing(true)}>Agree a takt here instead</button>}
          </div>
        </div>
      )}
      {offer && a && (
        <p className="wb-offer sub">Agreed here by hand: {secs(a.taktSec)}. Line capacity’s target of {fmtN(offer.perMin)} {offer.unit} a minute makes it {secs(offer.taktSec)}{aPiece({ unit: offer.unit })}.
          {can.agree && <> <button type="button" className="linkish" onClick={() => write(cur => ({ agreed: { ...cur.agreed, balance: { taktSec: offer.taktSec, from: 'target', ...(cur.agreed?.balance?.allowance ? { allowance: cur.agreed.balance.allowance } : {}) } } }))}>Take the takt from Line capacity</button></>}</p>
      )}
      {agreeing && <Agree study={study} can={can} cap={s.capacity} onDone={() => setAgreeing(false)} cancel={() => setAgreeing(false)} />}

      <div className="ie-says">
        {said.lines.filter(l => l.tone === 'r').map(l => <p key={l.text} className="ie-say is-r">{l.text}</p>)}
        <p className="ie-say">{said.text}</p>
        {said.lines.filter(l => l.tone !== 'r').map(l => <p key={l.text} className={'ie-say ie-cap is-' + l.tone}>{l.text}</p>)}
      </div>

      {/* WHAT IT COSTS — the bottleneck a pack and a minute, for the client (17 October) */}
      <CostBlock f={f} cap={s.capacity} wsId={s.workspaceId} lineUnit={lineUnit} capHref={capHref} />
      {a && f.people.length > 0 && (
        <>
          <div className="ie-pic"><Stacks f={f} ghost={showGhost ? ghost : undefined} /></div>
          <Legend f={f} />
        </>
      )}
      <div className="wb-acts">
        {ghost && <button type="button" className="btn" aria-pressed={showGhost} onClick={() => setShowGhost(g => !g)}>{showGhost ? 'Hide the suggestion' : 'Suggest a balance'}</button>}
        {showGhost && ghost && editable && (
          <button type="button" className="btn btn-primary" onClick={() => {
            const to = new Map(ghost.flatMap(g => g.ids.map(id => [id, g.who] as const)));
            setSteps(cur => cur.map(x => ({ ...x, who: to.get(x.id) ?? x.who })));
            setShowGhost(false);
          }}>Use it</button>
        )}
      </div>

      {/* THE CLOSING LINE — the one sentence: what the bottleneck costs, or what the balance says */}
      {f.people.length > 0 && <LeanClosing closing={balanceClosing(f, cost, said, lineUnit)} />}

      {editable && picks.length > 0 && crew.every(c => !c.stationId) && f.people.length > 0 && (
        <p className="wb-hint sub">Put each person at their station of Line capacity — their time is then in that station’s unit, held to its own takt, and Line capacity takes it.</p>
      )}
      {people.map(p => (
        <Person key={p.who} p={p} crew={crew.find(c => c.who === p.who)} picks={picks} lineUnit={lineUnit} editable={editable}
          steps={steps.filter(x => x.who === p.who).sort((x, y) => x.order - y.order)} who={who} drop={dropOn === p.who}
          canRemove={can.remove || !study.projectId}
          onDrop={setDropOn} onTime={() => setTiming(p.who)} onPlace={id => placeOf(p.who, id)}
          onRename={to => rename(p.who, to)} onRemove={() => takeOff(p.who)} onAdd={name => addStep(name, p.who)}
          onMove={id => setSteps(cur => cur.map(x => (x.id === id && x.who !== p.who ? { ...x, who: p.who } : x)))}
          onChange={(id, patch) => setSteps(cur => cur.map(x => (x.id === id ? { ...x, ...patch } : x)))}
          onTakeStep={id => setSteps(cur => cur.filter(x => x.id !== id))}
          allowance={a?.allowance ?? 0} />
      ))}
      {editable && <AddPerson who={who} taken={f.people.map(p => p.who)} picks={picks} lineUnit={lineUnit}
        onAdd={(name, what, stationId) => { addStep(what, name); if (stationId) placeOf(name, stationId); }} />}

      <p className="ie-agreed sub">{a
        ? <>Takt <b>{secs(a.taktSec)}{aPiece({ unit: lineUnit })}</b> — {a.from === 'target' ? 'from Line capacity’s target' : 'agreed here'}{a.allowance ? `, +${Math.round(a.allowance * 100)}% allowance` : ', no allowance'}</>
        : 'No takt yet'}
        {can.agree && !closed && a && <button type="button" className="linkish" onClick={() => setAgreeing(true)}>Change what was agreed</button>}</p>
      <div className="ie-act">
        {closed ? (
          <>
            <p className="ie-receipt"><b>Set as the standard {niceDay(isoDay(study.closedAt ?? 0))}</b> — the map and its card read it. {study.receipt?.text}</p>
            {can.agree && <button type="button" className="btn" onClick={() => write({ closedAt: undefined })}>Reopen to time again</button>}
          </>
        ) : can.agree && a && f.people.length > 0 && !f.untimed && (
          <button type="button" className="btn btn-primary" onClick={() => write(cur => ({ closedAt: now(),
            /* a receipt keeps what it closed on: the takt and the stations, frozen */
            agreed: { ...cur.agreed, balance: a }, facts: { ...cur.facts, crew },
            receipt: { at: now(), ...(me ? { by: me } : {}), text: said.text, tone: said.tone,
              figures: { taktSec: a.taktSec, total: +f.total.toFixed(2), fewest: f.fewest ?? null, people: f.people.length, efficiency: f.efficiency !== undefined ? +f.efficiency.toFixed(3) : null } } }))}>
            Set as the standard
          </button>
        )}
      </div>
      <UsedFor s={study} can={can} me={me} />
    </div>
  );
}

/* ------------------------------------------------------------ one person */
function Person({ p, crew, picks, lineUnit, editable, steps, who, drop, canRemove, allowance,
  onDrop, onTime, onPlace, onRename, onRemove, onAdd, onMove, onChange, onTakeStep }: {
  p: PersonFigures; crew?: BalanceCrew; picks: StationPick[]; lineUnit?: string; editable: boolean;
  steps: BalanceStep[]; who: string[]; drop: boolean; canRemove: boolean; allowance: number;
  onDrop: (who: string | null) => void; onTime: () => void; onPlace: (stationId: string) => void; onRename: (to: string) => void; onRemove: () => void;
  onAdd: (name: string) => void; onMove: (id: string) => void; onChange: (id: string, patch: Partial<BalanceStep>) => void; onTakeStep: (id: string) => void;
}) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState(p.who);
  const clash = name.trim() !== p.who && who.includes(name.trim());
  const piece = aPiece(p);
  const figure = p.source === 'none'
    ? `${secs(p.work)}${piece} so far — not all timed${p.overBy ? `, already over by ${secs(p.overBy)}` : ''}`
    : p.takt ? `${secs(p.work)} of ${secs(p.takt)}${piece} takt${p.overBy ? ` — over by ${secs(p.overBy)}` : p.spare ? ` — ${secs(p.spare)} to spare` : ''}${p.source === 'typed' ? ' · some typed' : ''}`
      : `${secs(p.work)}${piece} a cycle${p.source === 'typed' ? ' · some typed' : ''}`;
  return (
    <section className={'wb-person' + (drop ? ' is-drop' : '')}
      /* DRAG AN ELEMENT TO ANOTHER PERSON (laptop) — "Whose it is" stays
         the way on a phone and from the keyboard. */
      onDragOver={editable ? e => { if (e.dataTransfer.types.includes(DRAG)) { e.preventDefault(); onDrop(p.who); } } : undefined}
      onDragLeave={editable ? e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onDrop(null); } : undefined}
      onDrop={editable ? e => { e.preventDefault(); onDrop(null); const id = e.dataTransfer.getData(DRAG); if (id) onMove(id); } : undefined}>
      <div className="wb-ph">
        {naming ? (
          <form className="wb-rename" onSubmit={e => { e.preventDefault(); const v = name.trim(); if (v && !clash) { if (v !== p.who) onRename(v); setNaming(false); } }}>
            <input className="text-input" autoFocus value={name} aria-label={`${p.who}’s name`} onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { setName(p.who); setNaming(false); } }} />
            <button type="submit" className="btn btn-sm btn-primary" disabled={!name.trim() || clash}>Save</button>
            {clash && <span className="sub">{name.trim()} is already on the balance.</span>}
          </form>
        ) : <h3>{p.who}</h3>}
        {/* WHERE THEY WORK — a station of Line capacity, in flow order */}
        {editable && picks.length > 0 ? (
          <label className="wb-at"><span className="sub">at</span>
            <select value={crew?.stationId ?? ''} aria-label={`Where ${p.who} works`} onChange={e => onPlace(e.target.value)}>
              <option value="">no station{lineUnit ? ` — counts ${lineUnit}` : ''}</option>
              {picks.map(x => <option key={x.id} value={x.id}>{x.lane ? `${x.lane} · ` : ''}{x.name} — {x.unit || 'units'}{x.per != null && x.per !== 1 && lineUnit ? ` (${fmtN(x.per)} ${lineUnit} each)` : ''}</option>)}
            </select>
          </label>
        ) : p.station ? <span className="wb-at sub">at <b>{p.station}</b></span> : null}
        <span className={'wb-pw' + (p.overBy ? ' is-r' : '')}>{figure}</span>
        {editable && <button type="button" className="btn btn-primary wb-time" onClick={onTime} disabled={!steps.length}>Time {p.who}</button>}
      </div>
      {p.work > 0 && <PersonBar p={p} />}
      <ul className="wb-els">
        {steps.map(st => (
          <Element key={st.id} st={st} e={p.elements.find(e => e.id === st.id)} allowance={allowance} who={who} editable={editable} canRemove={canRemove}
            onChange={patch => onChange(st.id, patch)} onRemove={() => onTakeStep(st.id)} />
        ))}
      </ul>
      {editable && (
        <div className="wb-p-foot">
          <AddStep who={p.who} onAdd={onAdd} />
          <span className="wb-p-acts">
            {!naming && <button type="button" className="linkish" onClick={() => { setName(p.who); setNaming(true); }}>Rename</button>}
            {canRemove && <button type="button" className="linkish wb-rm" onClick={onRemove}>Take {p.who} off</button>}
          </span>
        </div>
      )}
    </section>
  );
}

/** ONE PERSON'S CYCLE LAID OUT AGAINST THEIR TAKT — the combination table in
 *  one bar: each element in turn, work filled, walking hatched, waiting
 *  hollow; the takt a dashed mark; the part past it red. */
export function PersonBar({ p }: { p: PersonFigures }) {
  const span = Math.max(p.work, p.takt ?? 0) * 1.06 || 1;
  const pct = (v: number) => `${(v / span) * 100}%`;
  const parts = p.elements.filter(e => (e.standard ?? 0) > 0);
  return (
    <div className="wb-bar" role="img" aria-label={`${p.who}: ${parts.map(e => `${e.name} ${secs(e.standard ?? 0)}${e.kind !== 'work' ? ` ${KIND_WORD[e.kind]}` : ''}`).join(', ')}${p.takt ? ` — against ${secs(p.takt)} takt` : ''}`}>
      <div className="wb-bar-track">
        {parts.map(e => (
          <span key={e.id} className={'wb-bseg is-' + e.kind + (e.source === 'typed' ? ' is-typed' : '')} style={{ width: pct(e.standard ?? 0) }} title={`${e.name} — ${secs(e.standard ?? 0)}`}>
            <span className="wb-bseg-t">{e.name}</span>
          </span>
        ))}
        {p.takt && p.work > p.takt && <span className="wb-bover" style={{ left: pct(p.takt), width: pct(p.work - p.takt) }} aria-hidden />}
        {p.takt && <span className="wb-btakt" style={{ left: pct(p.takt) }} aria-hidden />}
      </div>
    </div>
  );
}

export function Legend({ f }: { f: BalanceFigures }) {
  const walk = f.people.some(p => p.walk > 0), wait = f.people.some(p => p.wait > 0);
  return (
    <p className="wb-legend sub">
      <span className="wb-key is-work" aria-hidden /> work
      {walk && <> · <span className="wb-key is-walk" aria-hidden /> walking</>}
      {wait && <> · <span className="wb-key is-wait" aria-hidden /> waiting</>}
      {' '}· the dashed line is takt{f.people.some(p => p.per !== 1) ? ' — each person against their own, in what they handle' : ''}
    </p>
  );
}

/* ------------------------------------------------------------ agree the takt */
function Agree({ study, can, cap, onDone, cancel }: { study: ToolStudy; can: Can; cap?: Capacity; onDone: () => void; cancel?: () => void }) {
  const a = study.agreed?.balance;
  const fromTarget = a?.from === 'target' ? taktFromTarget(cap) : undefined;
  const [takt, setTakt] = useState(a?.taktSec?.toString() ?? '');
  const [demand, setDemand] = useState('');
  const [mins, setMins] = useState('');
  const [allow, setAllow] = useState(a?.allowance ? String(Math.round(a.allowance * 100)) : '');
  const fromDemand = Number(demand) > 0 && Number(mins) > 0 ? (Number(mins) * 60) / Number(demand) : undefined;
  const t = fromTarget ? fromTarget.taktSec : takt.trim() ? Number(takt) : fromDemand;
  const al = allow.trim() ? Number(allow) / 100 : 0;
  const problem = !(t && t > 0) ? 'The takt — seconds a piece, or what is needed in the time there is.' : !(al >= 0 && al < 1) ? 'The allowance as a percentage, under 100.' : '';
  if (!can.agree) return <div className="ie-agree is-wait"><p><b>The takt isn’t agreed yet.</b> The project’s owner agrees the pace the line must keep, or Line capacity’s target sets it.</p></div>;
  return (
    <form className="ie-agree" onSubmit={e => { e.preventDefault(); if (problem || !t) return;
      const agreed: AgreedBalance = { taktSec: +t.toFixed(3), ...(fromTarget ? { from: 'target' as const } : {}), ...(al ? { allowance: al } : {}) };
      void patchStudy(study.id, cur => ({ agreed: { ...cur.agreed, balance: agreed } })); onDone(); }}>
      <h2>{fromTarget ? 'The allowance' : 'Agree the takt'}</h2>
      {fromTarget
        ? <p className="sub">The takt is Line capacity’s: {secs(fromTarget.taktSec)}{aPiece({ unit: fromTarget.unit })}, from its target of {fmtN(fromTarget.perMin)} a minute — change it there. The allowance is this balance’s own.</p>
        : <p className="sub">The pace the line must keep, a piece of the line’s unit — agreed before the work is read against it, so a lap never moves it. Line capacity’s target is the better home for it.</p>}
      <div className="ie-agree-grid">
        {!fromTarget && <>
          <label className="field"><span className="field-label">Takt, seconds a piece</span>
            <input className="text-input" inputMode="decimal" value={takt} onChange={e => setTakt(e.target.value)} placeholder={fromDemand ? fromDemand.toFixed(1) : '12'} /></label>
          <label className="field"><span className="field-label">Or: needed a shift</span>
            <input className="text-input" inputMode="numeric" value={demand} onChange={e => setDemand(e.target.value)} placeholder="2,000" /></label>
          <label className="field"><span className="field-label">in minutes available</span>
            <input className="text-input" inputMode="numeric" value={mins} onChange={e => setMins(e.target.value)} placeholder="420" /></label>
        </>}
        <label className="field"><span className="field-label">Allowance, % <i className="sub">rest and contingency</i></span>
          <input className="text-input" inputMode="decimal" value={allow} onChange={e => setAllow(e.target.value)} placeholder="0" /></label>
      </div>
      {fromDemand && !takt.trim() && !fromTarget && <p className="ie-note">{demand} a shift in {mins} minutes is a takt of {fromDemand.toFixed(1)} s.</p>}
      {problem && <p className="ie-problem">{problem}</p>}
      <div className="ie-agree-act">
        <button type="submit" className="btn btn-primary" disabled={!!problem}>{fromTarget ? 'Save it' : 'Agree it'}</button>
        {cancel && <button type="button" className="btn" onClick={cancel}>Keep what was agreed</button>}
      </div>
    </form>
  );
}

/* ------------------------------------------------------------ the Yamazumi */
const SW = 640, SH = 270, SP = { l: 10, r: 86, t: 14, b: 44 };

/** Each person's work stacked against takt. People counting different things
 *  (a tray, a case) are each put back into the line's unit — their own takt
 *  meets the one line — and labelled in their own. */
export function Stacks({ f, ghost }: { f: BalanceFigures; ghost?: { who: string; ids: string[]; work: number }[] }) {
  const takt = f.taktSec ?? 0;
  const cols = f.people.length + (ghost ? ghost.length + 1 : 0);
  if (!f.people.length || !takt) return <p className="sub ie-pic-empty">Each person’s work stacks here against the takt.</p>;
  const top = Math.max(takt * 1.2, ...f.people.map(p => (p.work / p.per) * 1.08), ...(ghost ?? []).map(g => g.work * 1.08));
  const y = (v: number) => SP.t + (1 - v / top) * (SH - SP.t - SP.b);
  const colW = (SW - SP.l - SP.r) / Math.max(cols, 1), bw = Math.min(64, colW * 0.6);
  const x = (i: number) => SP.l + i * colW + (colW - bw) / 2;
  const byId = new Map(f.elements.map(e => [e.id, e]));
  return (
    <svg className="wb-svg" viewBox={`0 0 ${SW} ${SH}`} role="img" aria-label={`Each person’s work against a ${secs(takt)} takt`}>
      <defs>
        <pattern id="wb-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" className="wb-hatch-bg" /><line x1="0" y1="0" x2="0" y2="6" className="wb-hatch-ln" />
        </pattern>
      </defs>
      <line className="wb-takt" x1={SP.l} x2={SW - SP.r} y1={y(takt)} y2={y(takt)} />
      <text className="wb-lw" x={SW - SP.r + 6} y={y(takt) + 5}>takt {secs(takt)}</text>
      {f.people.map((p, i) => {
        let acc = 0;
        return (
          <g key={p.who}>
            {p.elements.map(e => {
              const t = (e.standard ?? 0) / p.per; if (t <= 0) return null;
              const y0 = y(acc), y1 = y(acc + t); acc += t;
              const h = y0 - y1;
              return (
                <g key={e.id}>
                  <rect className={'wb-seg is-' + e.kind + (e.source === 'typed' ? ' is-typed' : '')} x={x(i)} y={y1} width={bw} height={h} {...(e.kind === 'walk' ? { fill: 'url(#wb-hatch)' } : {})} />
                  {h > 16 && <text className={'wb-st is-' + e.kind + (e.source === 'typed' ? ' is-typed' : '')} x={x(i) + bw / 2} y={y1 + h / 2 + 4}>{e.name.length > 9 ? `${e.name.slice(0, 8)}…` : e.name}</text>}
                </g>
              );
            })}
            {p.overBy > 0 && <rect className="wb-over" x={x(i)} y={y(p.work / p.per)} width={bw} height={y(takt) - y(p.work / p.per)} />}
            <text className="wb-who" x={x(i) + bw / 2} y={SH - SP.b + 16}>{p.who}</text>
            <text className={'wb-w' + (p.overBy ? ' is-r' : '')} x={x(i) + bw / 2} y={SH - SP.b + 30}>{secs(p.work)}{aPiece(p)}{f.constraint === p ? ' · constraint' : ''}</text>
          </g>
        );
      })}
      {ghost && (
        <g>
          <text className="wb-lw" x={x(f.people.length) + bw / 2} y={SH - SP.b + 16} textAnchor="middle">suggested →</text>
          {ghost.map((g, j) => {
            let acc = 0; const i = f.people.length + 1 + j;
            return (
              <g key={g.who}>
                {g.ids.map(id => { const t = byId.get(id)?.standard ?? 0; const y0 = y(acc), y1 = y(acc + t); acc += t; return <rect key={id} className="wb-ghost" x={x(i)} y={y1} width={bw} height={y0 - y1} />; })}
                <text className="wb-who" x={x(i) + bw / 2} y={SH - SP.b + 16}>{g.who}</text>
                <text className="wb-w" x={x(i) + bw / 2} y={SH - SP.b + 30}>{secs(g.work)}</text>
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
}

/* ------------------------------------------------------------ one element */
/** ONE STEP — its name, what kind of time it is and what it takes, in a
 *  line; its tools (the words, work · walk · wait, whose it is, the pace
 *  seen, take it off) come out on Edit — the tools where the work is, never
 *  on every row at once (Rowland, 17 October: "my concern is you make it
 *  complex"). A step not timed yet keeps its "or type it" box in view. */
function Element({ st, e, allowance, who, editable, canRemove, onChange, onRemove }: {
  st: BalanceStep; e?: ReturnType<typeof balance>['elements'][number]; allowance: number; who: string[]; editable: boolean; canRemove: boolean;
  onChange: (p: Partial<BalanceStep>) => void; onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [tools, setTools] = useState(false);
  const said = e ? elementSays(e, allowance) : { text: '', tone: 'n' as const };
  const far = new Set(e?.far ?? []);
  const kind = st.kind ?? 'work';
  const laps = st.laps ?? [];
  return (
    <li className={'wb-el is-' + kind + (tools ? ' is-open' : '')}>
      <div className="wb-el-h">
        {/* The grip drags it to another person. */}
        {editable && <span className="wb-grip" draggable title="Drag to another person" aria-hidden
          onDragStart={ev => { ev.dataTransfer.setData(DRAG, st.id); ev.dataTransfer.effectAllowed = 'move'; }}>⠿</span>}
        <b className="wb-el-n">{st.name}</b>
        {kind !== 'work' && <span className="wb-kind-w">{KIND_WORD[kind]}</span>}
        {editable && <button type="button" className="linkish wb-el-edit" aria-expanded={tools} aria-label={`${tools ? 'Done with' : 'Edit'} ${st.name}`} onClick={() => setTools(t => !t)}>{tools ? 'Done' : 'Edit'}</button>}
      </div>
      <p className={'wb-said is-' + said.tone}>{said.text}</p>
      <div className="wb-el-acts">
        {editable && !laps.length && (
          <label className="wb-typed">or type it: <input className="text-input" inputMode="decimal" defaultValue={st.typedSec ?? ''} aria-label="Typed seconds" placeholder="s"
            onBlur={ev => { const v = Number(ev.target.value); onChange({ typedSec: v > 0 ? v : undefined }); }} /> s</label>
        )}
        {laps.length > 0 && <button type="button" className="linkish" aria-expanded={open} onClick={() => setOpen(o => !o)}>{open ? 'Hide' : 'Laps'} — {laps.length}</button>}
      </div>
      {open && (
        <ol className="wb-laps">
          {laps.map(l => (
            <li key={l.id} className={(l.struck ? 'is-struck' : '') + (l.foreign ? ' is-foreign' : '') + (far.has(l.id) ? ' is-far' : '')}>
              {editable && !l.foreign ? <button type="button" className="linkish" onClick={() => onChange({ laps: laps.map(x => (x.id === l.id ? { ...x, struck: !x.struck || undefined } : x)) })}>{l.sec.toFixed(1)} s</button>
                : <span>{l.sec.toFixed(1)} s</span>}
              {l.foreign ? ' foreign' : far.has(l.id) ? ' far from the rest' : ''}
            </li>
          ))}
        </ol>
      )}
      {editable && tools && (
        <div className="wb-el-tools">
          <input className="text-input wb-name" value={st.name} aria-label="The element" onChange={ev => onChange({ name: ev.target.value })} />
          {/* WORK, WALK OR WAIT — the combination table's three, by word and fill */}
          <span className="chip-row wb-kind" role="radiogroup" aria-label={`What kind of time — ${st.name}`}>
            {KINDS.map(k => <button key={k.kind} type="button" role="radio" aria-checked={kind === k.kind} className={'chip' + (kind === k.kind ? ' on' : '')}
              onClick={() => onChange({ kind: k.kind === 'work' ? undefined : k.kind })}>{k.word}</button>)}
          </span>
          <label className="wb-whose"><span className="sub">whose</span>
            <select className="text-input wb-who-s" value={st.who} aria-label="Whose it is" onChange={ev => {
              const v = ev.target.value === '__new' ? (window.prompt('Who? (as on the map — e.g. Op 4)') ?? '').trim() : ev.target.value;
              if (v) onChange({ who: v });
            }}>
              {who.map(w => <option key={w} value={w}>{w}</option>)}
              <option value="__new">Someone else…</option>
            </select>
          </label>
          {laps.length > 0 && (
            <span className="chip-row" role="radiogroup" aria-label="The pace seen">
              <span className="sub">the pace seen</span>
              {RATINGS.map(r => <button key={r} type="button" role="radio" aria-checked={(st.rating ?? 100) === r} className={'chip' + ((st.rating ?? 100) === r ? ' on' : '')} onClick={() => onChange({ rating: r })}>{r}</button>)}
            </span>
          )}
          {canRemove && <button type="button" className="linkish wb-rm" onClick={onRemove}>Take it off</button>}
        </div>
      )}
    </li>
  );
}

/** Another step for one person — what they do next, as the floor says it. */
function AddStep({ who, onAdd }: { who: string; onAdd: (name: string) => void }) {
  const [name, setName] = useState('');
  return (
    <form className="wb-add wb-add-s" onSubmit={ev => { ev.preventDefault(); if (name.trim()) { onAdd(name.trim()); setName(''); } }}>
      <input className="text-input" value={name} placeholder="Another step — e.g. Check the seal" aria-label={`Another step for ${who}`} onChange={ev => setName(ev.target.value)} />
      <button type="submit" className="btn" disabled={!name.trim()}>Add</button>
    </form>
  );
}

/** Another person — who, what they do, and where on the line. */
function AddPerson({ who, taken, picks, lineUnit, onAdd }: { who: string[]; taken: string[]; picks: StationPick[]; lineUnit?: string; onAdd: (name: string, what: string, stationId?: string) => void }) {
  const next = () => { let n = taken.length + 1; while (taken.includes(`Op ${n}`)) n++; return `Op ${n}`; };
  const offered = who.filter(w => !taken.includes(w));
  const [name, setName] = useState(offered[0] ?? next());
  const [what, setWhat] = useState('');
  const [station, setStation] = useState('');
  // eslint-disable-next-line react-hooks/exhaustive-deps -- offered again when someone is added
  useEffect(() => { if (taken.includes(name)) setName(offered[0] ?? next()); }, [taken.join('|')]);
  return (
    <form className="wb-add wb-add-p" onSubmit={ev => { ev.preventDefault(); if (name.trim() && what.trim()) { onAdd(name.trim(), what.trim(), station || undefined); setWhat(''); setStation(''); } }}>
      <span className="wb-add-h">Add a person</span>
      <input className="text-input wb-who-i" value={name} list="wb-who" aria-label="Who — a person" onChange={ev => setName(ev.target.value)} />
      <datalist id="wb-who">{offered.map(x => <option key={x} value={x} />)}</datalist>
      <input className="text-input" value={what} placeholder="What they do — e.g. Tape and stack the case" aria-label="What they do" onChange={ev => setWhat(ev.target.value)} />
      {picks.length > 0 && (
        <select className="text-input" value={station} aria-label="Where they work" onChange={ev => setStation(ev.target.value)}>
          <option value="">no station{lineUnit ? ` — counts ${lineUnit}` : ''}</option>
          {picks.map(x => <option key={x.id} value={x.id}>{x.lane ? `${x.lane} · ` : ''}{x.name} — {x.unit || 'units'}</option>)}
        </select>
      )}
      <button type="submit" className="btn" disabled={!name.trim() || !what.trim()}>Add them</button>
    </form>
  );
}

/* ------------------------------------------------------------ the stopwatch */
/** THE TIMER, THE WHOLE SCREEN (Rowland, 17 October: "the line balance timer
 *  doesn't work like I hoped"). The person's steps in order, the one being
 *  timed marked Now; one big Lap at the thumb; Undo the last lap, Skip a
 *  step not done this cycle, Foreign for an interruption; the cycle running
 *  against their takt. The timestamp is the truth: each lap is now − the
 *  last tap. On a desk: Space laps, U undoes, S skips, F is foreign, Escape
 *  stops. The screen is kept awake while it runs. */
function Timer({ who, steps, takt, piece, product, me, onLap, onUndo, onDone }: {
  who: string; steps: BalanceStep[]; takt?: number; piece: string; product: string; me?: string;
  onLap: (stepId: string, lap: Lap) => void; onUndo: (stepId: string, lapId: string) => void; onDone: () => void;
}) {
  type Taken = { stepId: string; lapId: string; sec: number; at: number; i: number; cycle: number; foreign?: boolean };
  const [last, setLast] = useState<number | null>(null);
  const [i, setI] = useState(0);
  const [cycle, setCycle] = useState(1);
  const [starts, setStarts] = useState<number[]>([]);
  const [taken, setTaken] = useState<Taken[]>([]);
  const [, setTick] = useState(0);
  useEffect(() => { const t = window.setInterval(() => setTick(x => x + 1), 100); return () => window.clearInterval(t); }, []);
  /* the screen kept awake, and the page held still, while timing */
  useEffect(() => {
    let lock: { release: () => Promise<void> } | undefined;
    const wl = (navigator as Navigator & { wakeLock?: { request: (k: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock;
    wl?.request('screen').then(l => { lock = l; }).catch(() => undefined);
    const was = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { void lock?.release().catch(() => undefined); document.body.style.overflow = was; };
  }, []);
  const n = steps.length;
  const cur = n ? steps[i % n] : undefined;
  const t = now();
  const split = last ? (t - last) / 1000 : 0;
  const run = last && starts[cycle] ? (t - starts[cycle]) / 1000 : 0;
  const over = !!takt && run > takt;
  const typical = (st: BalanceStep) => { const xs = keptLaps(st.laps).map(l => l.sec).sort((a, b) => a - b); return xs.length ? xs[Math.floor((xs.length - 1) / 2)] : undefined; };
  const thisCycle = new Map(taken.filter(x => x.cycle === cycle && !x.foreign).map(x => [x.stepId, x.sec]));

  const advance = (at: number) => {
    const wrap = (i + 1) % n === 0;
    setI(x => x + 1);
    if (wrap) { setCycle(c => c + 1); setStarts(s => { const c = [...s]; c[cycle + 1] = at; return c; }); }
  };
  const lap = (foreign: boolean) => {
    if (!cur) return;
    const at = now();
    if (!last) { setLast(at); setStarts(s => { const c = [...s]; c[cycle] = at; return c; }); return; }
    const id = uid(), sec = +((at - last) / 1000).toFixed(1);
    onLap(cur.id, { id, sec, at, ...(me ? { who: me } : {}), ...(foreign ? { foreign: true } : {}) });
    setTaken(x => [...x, { stepId: cur.id, lapId: id, sec, at, i, cycle, ...(foreign ? { foreign: true } : {}) }]);
    setLast(at);
    if (!foreign) advance(at);
  };
  const skip = () => { if (last && cur) advance(now()); };
  const undo = () => {
    const e = taken[taken.length - 1];
    if (!e) return;
    onUndo(e.stepId, e.lapId);
    setTaken(x => x.slice(0, -1));
    setLast(e.at - e.sec * 1000);
    if (!e.foreign) { setI(e.i); setCycle(e.cycle); }
  };
  const ref = useRef({ lap, skip, undo, onDone });
  ref.current = { lap, skip, undo, onDone };
  useEffect(() => {
    const key = (ev: KeyboardEvent) => {
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const k = ev.key.toLowerCase();
      if (k === ' ' || k === 'enter') { ev.preventDefault(); ref.current.lap(false); }
      else if (k === 'u' || k === 'backspace') { ev.preventDefault(); ref.current.undo(); }
      else if (k === 's') { ev.preventDefault(); ref.current.skip(); }
      else if (k === 'f') { ev.preventDefault(); ref.current.lap(true); }
      else if (k === 'escape') { ev.preventDefault(); ref.current.onDone(); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  if (!cur) return (
    <div className="wb-tm" role="dialog" aria-modal="true" aria-label={`Timing ${who}`}>
      <div className="wb-tm-in"><p>No steps for {who} yet — add what they do, then time it.</p><button type="button" className="btn" onClick={onDone}>Back</button></div>
    </div>
  );
  return (
    <div className="wb-tm" role="dialog" aria-modal="true" aria-label={`Timing ${who}`}>
      <div className="wb-tm-in">
        <div className="wb-tm-bar">
          <span className="wb-tm-who"><b>Timing {who}</b><span className="sub">{product}</span></span>
          <button type="button" className="btn btn-sm" onClick={onDone}>Stop timing</button>
        </div>
        <div className={'wb-tm-cyc' + (over ? ' is-r' : '')}>
          <span>Cycle {cycle}{last ? '' : ' — not started'}</span>
          <b>{run.toFixed(1)} s{takt ? ` of ${secs(takt)}${piece} takt` : ''}{over ? ' — over' : ''}</b>
          {takt && <span className="wb-tm-track" aria-hidden><span className={'wb-tm-fill' + (over ? ' is-r' : '')} style={{ width: `${Math.min(100, (run / takt) * 100)}%` }} /></span>}
        </div>
        <ol className="wb-tm-steps">
          {steps.map((st, k) => {
            const isNow = k === i % n, lapNow = thisCycle.get(st.id), ty = typical(st);
            return (
              <li key={st.id} className={'wb-tm-step' + (isNow ? ' is-now' : '') + (lapNow != null && !isNow ? ' is-done' : '')}>
                <span className="wb-tm-n">{k + 1}</span>
                <span className="wb-tm-name">{st.name}{st.kind && st.kind !== 'work' ? <i> · {KIND_WORD[st.kind]}</i> : null}</span>
                <span className="wb-tm-t">{isNow ? (last ? 'Now' : 'First') : lapNow != null ? `${lapNow.toFixed(1)} s` : ty != null ? `usually ${ty.toFixed(1)} s` : ''}</span>
              </li>
            );
          })}
        </ol>
        <output className="wb-split" aria-live="off">{split.toFixed(1)}<small> s</small></output>
        <button type="button" className="wb-lap" onClick={() => lap(false)}>{last ? `Lap — ${cur.name} done` : `Start — as ${cur.name} begins`}</button>
        <div className="wb-t-acts">
          <button type="button" className="btn" onClick={undo} disabled={!taken.length}>Undo the last lap</button>
          <button type="button" className="btn" onClick={skip} disabled={!last}>Skip this step</button>
          <button type="button" className="btn" onClick={() => lap(true)} disabled={!last}>Foreign — leave this out</button>
        </div>
        <p className="sub wb-tm-say">Tap Lap as each step ends; the next one is marked Now. An interruption: Foreign, kept out. A step not done this cycle: Skip.<span className="wb-tm-keys"> Keys: Space laps · U undoes · S skips · F foreign · Esc stops.</span></p>
      </div>
    </div>
  );
}
