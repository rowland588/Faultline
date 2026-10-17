/* WHERE THIS LINE IS LIMITED — the line's stations, in order, and the one that
 * holds everything else back.
 *
 * THREE THINGS ADDED 3 OCTOBER, in Rowland's words:
 *  · "the step previous should help you understand" — every station says what
 *    ARRIVES from the one before, in its own unit, beside what it does
 *    (lib/capacity, StationResult.feed): the speed to beat, drawn, not implied.
 *  · "swipe left, add a different machine name — oh look, it changes" — WHAT-IFS:
 *    copies of the line with one thing changed, kept beside it on the same
 *    record, each compared with the line as run in one sentence. Tabs on the
 *    laptop, a swipe on the phone; a swipe past the last one makes a new one.
 *  · MAKE IT SO — a what-if you decide to do becomes an action on the board,
 *    with the prediction as its why, so the board's own proof judges it later.
 *
 * Belongs to a running line's 6M work, beside the Pareto: the Pareto says
 * where TIME is lost, this says where the LINE is limited even when nothing
 * breaks — and its limiting station is a cause the fishbone can carry (a
 * machine station on the Machine bone, a crew on People). It
 * reads the line's own timed stops (the log the Pareto is drawn from) and writes
 * one document on the line (`capacity`). What it says is the same sentence the
 * client report prints — see lib/capacity.
 *
 * Editing follows the rest of the app: every field keeps its own draft and
 * writes when you leave it, and removing a station can be undone. Access
 * (lib/access): a client reads the line and what the sums say; the team
 * edits the stations and raises actions; only the owner deletes a what-if. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { DraftNumber, DraftText } from '../ui/Draft';
import { Fold } from '../ui/Fold';
import { offerUndo } from '../ui/Undo';
import { addMachineToLine, getWorkspace, listAllStudies, listPaceTodos, onDataChange, putPaceTodo, type PaceLineRow, type PaceTodoRow } from '../db';
import type { Workspace } from '../types';
import { currentBalance } from '../lib/studyLinks';
import { balance as balanceOf } from '../lib/ie/balance';
import { niceDay } from '../lib/weeks';
import { uid } from '../lib/ids';
import { chainOf as lineChain, lanesAlike, MAX_LINES, mergeAfterOf, reshape } from '../lib/capacityLines';
import { planToTarget } from '../lib/capacityPlan';
import { flowModel } from '../lib/capacityFlow';
import { CapacityFlow } from '../ui/CapacityFlow';
import { CapacityBars } from '../ui/CapacityBars';
import { nav } from '../state/useRoute';
import { type PillarKey } from '../lib/pillars';
import { BoneChips } from '../ui/ActionSheet';
import { useAccess } from '../cloud/access';
import type { Can } from '../lib/access';
import {
  EMPTY_CAPACITY, analyse, syncWhatIfs, withWhatIfStations, blankStation, changedWords, compareSays, crossCheck, fmtN, lineIfRaised, makeItSoWords,
  stopStats, suggestRunning, vCurve, accumulation, whatIfCapacity, paceSays, perMinute, oneOf, fmtSec,
  typedPerMinute, chainFactor, chainWords, fmtDur, typedSpeedWords, REST_ALLOWANCE_PCT, cycleWords, rateAsTime, shareColours,
  labourCost, labourInputs, oneMorePerson, whatIfLabour, fmtMoney, fmtBig,
  type Capacity, type CapacityResult, type Lane, type LabourInputs, type PaceSays, type RateAsTime, type RatePer, type Station, type StationResult, type WhatIf,
  screenCapacity, bottleneckCost, bottleneckCostSays } from '../lib/capacity';
import { useLineStops } from '../lib/useLineStops';
import { Icon } from '../ui/Icon';
import { VCurveView } from '../ui/VCurve';
import { BottleneckWalk } from '../ui/BottleneckWalk';
import { ShiftCapacityView, useShiftInputs } from '../ui/ShiftCapacity';
import { useLineRecords } from '../lib/useLineRecords';
import { machineKey, machinesOf } from '../lib/lineRecords';

const PER_WORD: Record<RatePer, string> = { sec: 'a second', min: 'a minute', hour: 'an hour' };
const SOURCES: { id: NonNullable<Station['source']>; label: string }[] = [
  { id: 'plate', label: 'On the plate' }, { id: 'timed', label: 'I timed it' }, { id: 'standard', label: 'The line balance' }, { id: 'estimate', label: 'A guess' },
];

/* ============================ the capacity sheet ============================
 * docs/CAPACITY.md §2 — Toyota's production capacity sheet, for a packaging
 * line: a row per station in flow order, its own unit and the conversion
 * from the one before, its speed and how it is known (a machine on the plate;
 * a person timed), its own stops and good share, what it does a minute and an
 * hour in the line's unit once its stops count, its share of the bottleneck's
 * and what the target needs of it — over 100% red: it cannot. Read here;
 * changed on the station's card below. */
const HOW: Record<NonNullable<Station['source']>, string> = { plate: 'on the plate', timed: 'timed', standard: 'standard time — the line balance', estimate: 'a guess' };
function CapacitySheet({ r, v, target, study, onUse }: { r: ReturnType<typeof analyse>; v: ReturnType<typeof vCurve>; target?: number;
  /** A person's standard time from the line balance on this standard — seconds a piece of the line's unit, by name. */
  study?: Map<string, number>; onUse?: (stationId: string, cycleSec: number) => void }) {
  if (!r.ok.length) return null;
  const pctOf = new Map(v.points.map(p => [p.index, p]));
  return (
    <div className="cap-sheet-box">
      <table className="cap-sheet cap-sheet-cards">
        <thead><tr><th>#</th><th>Station</th><th>Its unit</th><th className="n">Speed</th><th className="n">Own stops</th><th className="n">Good</th>
          <th className="n">{r.unit} a min</th><th className="n">{r.unit} an hour</th><th className="n">Of the bottleneck</th>{target != null && <th className="n">Target needs</th>}<th className="n">Can collect after</th></tr></thead>
        <tbody>
          {r.ok.map(x => {
            const s = x.station, p = pctOf.get(x.index), isLimit = r.limit?.index === x.index;
            const need = target != null && x.effective > 0 ? (target / x.effective) * 100 : undefined;
            const prevUnit = [...r.ok, ...r.skipped].find(y => y.index === x.index - 1)?.station.unit;
            const speed = s.speedIn === 'before' ? typedSpeedWords(s, prevUnit)
              : s.rate != null ? `${fmtN(s.rate)} a ${s.ratePer === 'hour' ? 'hour' : s.ratePer === 'sec' ? 'second' : 'minute'}`
              : s.cycleSec ? cycleWords(s.perCycle ?? 1, s.cycleSec, s.unit) : '—';
            return (
              <tr key={s.id} className={isLimit ? 'is-limit' : ''}>
                <td data-k="#">{x.index + 1}</td>
                <td data-k="Station"><span className="cap-ic" aria-hidden><Icon name={s.kind === 'people' ? 'person' : 'machine'} size={14} /></span> <b>{s.name.trim() || `Station ${x.index + 1}`}</b>
                  {(s.crew ?? 1) > 1 && <span className="sub"> ×{s.crew}</span>}</td>
                <td data-k="Its unit">{s.unit}{x.index > 0 && (s.contains ?? 1) !== 1 ? <span className="cap-sheet-k">1 = {fmtN(s.contains)} of the one before</span> : null}</td>
                <td data-k="Speed" className="n cap-sheet-sp">{speed}<span className={'cap-sheet-k' + (s.kind === 'machine' && s.source !== 'plate' ? ' cap-sheet-a' : '')}>
                  {/* a machine goes by its plate speed (docs/CAPACITY.md §1); running below it is a loss, not a lower plate */}
                  {s.kind === 'machine' ? (s.source === 'plate' ? HOW.plate : `${s.source ? HOW[s.source] : 'typed'} — not its plate speed`) : s.source ? HOW[s.source] : 'not timed yet'}</span>
                  {/* a person timed in the line balance: their standard time, in this station's unit — one tap to use it (docs/CAPACITY.md §1) */}
                  {s.kind === 'people' && s.source !== 'standard' && study?.get(s.name.trim().toLowerCase()) != null && onUse && (() => {
                    const work = study.get(s.name.trim().toLowerCase()) ?? 0, cyc = Math.round(work * x.factor * 100) / 100;
                    return <button type="button" className="linkish cap-sheet-use" onClick={() => onUse(s.id, cyc)}>The line balance: {fmtN(cyc)} s a {s.unit.replace(/s$/, '')} — use it</button>;
                  })()}</td>
                <td data-k="Own stops" className="n">{s.runningPct != null && s.runningPct < 100 ? `${fmtN(100 - s.runningPct)}%` : '—'}</td>
                <td data-k="Good" className="n">{s.goodPct != null && s.goodPct < 100 ? `${fmtN(s.goodPct)}%` : '—'}</td>
                <td data-k={`${r.unit} a min`} className="n"><b>{fmtN(x.effective)}</b></td>
                <td data-k={`${r.unit} an hour`} className="n">{fmtN(x.effective * 60)}</td>
                <td data-k="Of the bottleneck" className="n">{isLimit ? <b>the bottleneck</b> : p ? <span className={p.under ? 'cap-sheet-a' : ''}>{fmtN(Math.round(p.pct))}%{p.under ? ' · under the V' : ''}</span> : '—'}
                  {/* the V's colour and length, a row at a time (ui/VCurve) */}
                  {p && (() => { const [c, c2] = shareColours(p.pct, isLimit, p.under); return (
                    <span className="cap-share" aria-hidden><i style={{ width: `${Math.min(100, (p.pct / Math.max(200, ...v.points.map(q => Math.min(q.pct, 300)))) * 100)}%`, background: `linear-gradient(90deg, ${c}, ${c2})` }} /></span>
                  ); })()}</td>
                {target != null && <td data-k="Target needs" className="n"><span className={need != null && need > 100 + 1e-9 ? 'cap-sheet-r' : ''}>{need != null ? `${fmtN(Math.round(need))}%` : '—'}</span></td>}
                <td data-k="Can collect after" className="n">{s.bufferAfter ? `${fmtN(s.bufferAfter)} ${s.unit}` : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* =============================== one station ================================ */

function StationCard({ s, i, num, canUp, canDown, last, prevUnit, chain, planned, why, wait, own, coLeft = 0, suggested, say, asTime, factor, lineUnit, patch, move, remove, assets, machines = [], open: wantOpen, onToggle, ro }: {
  s: Station; i: number; last: boolean; prevUnit?: string;
  /** Its number on the card, and whether it can move earlier or later in ITS
   *  line — several lines feeding one place number and order each its own. */
  num: number; canUp: boolean; canDown: boolean;
  /** "1 pallet = 36 baskets = 360 units" — its unit read back to the line's (lib/capacity chainWords). */
  chain?: string;
  planned?: number;
  why?: string; wait: number; own: number; suggested?: number;
  /** Of its own stops, the minutes logged as changeovers and left out of its
   *  running share — they come off the shift on Line capacity's "A shift". */
  coLeft?: number;
  /** WHAT REACHES IT AND WHETHER IT KEEPS UP (lib/capacity paceSays) — worked
   *  out from the line before it as soon as it says what it counts in and how
   *  many of the one before make one; a person in seconds a piece. */
  say: PaceSays;
  /** A RATE THAT READS LIKE A TIME — "5 pallets a minute" typed for one pallet
   *  every 5 minutes — asked, with the time one tap away (lib/capacity rateAsTime). */
  asTime?: RateAsTime;
  /** How many of the line's unit are in one of its own, when counted. */
  factor?: number; lineUnit: string;
  patch: (p: Partial<Station>) => void; move: (by: -1 | 1) => void; remove: () => void; assets: string[];
  /** The line's machines in flow order (lib/lineRecords), offered as names. */
  machines?: string[];
  /** ONE STATION OPEN AT A TIME. Every station's eight boxes were open at once
   *  — 57 buttons on the page — when the work is on one of them. Shut, a
   *  station is its name and one line of its numbers; tap Edit to open it. */
  open: boolean; onToggle: () => void;
  /** Read only — a client sees the station and its numbers, no controls. */
  ro?: boolean;
}) {
  const open = wantOpen && !ro;
  const cyc = s.rate == null && (s.cycleSec != null || s.perCycle != null);
  /* a person is timed — "one tray every 8 seconds" — so their speed is asked that way first */
  const [mode, setMode] = useState<'rate' | 'cycle'>(cyc || (s.kind === 'people' && s.rate == null) ? 'cycle' : 'rate');
  const one = oneOf(s.unit);
  const speed = perMinute(s);
  /* TIMED PER THE UNIT BEFORE (Rowland, 14 October: "I need to be able to
     determine the speed of the human doing something") — a palletiser is
     timed per basket, not per pallet; offered wherever one of this station's
     unit is several of the one before */
  const norm = (x?: string) => (x ?? '').trim().toLowerCase();
  const canBefore = i > 0 && !!prevUnit?.trim() && s.contains > 1 && norm(prevUnit) !== norm(s.unit) && !!s.unit.trim();
  const before = canBefore && s.speedIn === 'before';
  const spUnit = (before ? prevUnit as string : s.unit).trim() || 'units';
  const spOne = oneOf(spUnit);
  const inMin = s.cycleIn === 'min';
  const typed = typedPerMinute(s);
  /* switching keeps the speed: the numbers are put into the other unit */
  const timePer = (to: 'own' | 'before') => {
    if ((to === 'before') === before) return;
    const k = s.contains;
    const by = to === 'before' ? k : 1 / k;
    patch({ speedIn: to === 'before' ? 'before' : undefined,
      ...(s.rate != null ? { rate: Math.round(s.rate * by * 1000) / 1000 } : {}),
      ...(s.rate == null && s.cycleSec != null ? { cycleSec: Math.round((s.cycleSec / by) * 100) / 100 } : {}) });
  };
  const key = (x: string) => x.trim().toLowerCase();
  const logged = key(s.asset?.trim() || s.name);
  const matched = !!logged && assets.some(a => key(a) === logged);
  return (
    <li id={`cap-st-${s.id}`} className={'cap-st' + (why ? ' has-problem' : '')}>
      <div className="cap-st-h">
        <span className="cap-st-n">{num}</span>
        {ro ? <>
          <b className="cap-name cap-name-ro">{s.name.trim() || `Station ${num}`}</b>
          <span className="sub">{s.kind === 'people' ? 'People' : 'Machine'}</span>
        </> : <>
        <DraftText value={s.name} placeholder="Name it — Bagger, Basketer, Carrier…" className="text-input cap-name" max={60}
          ariaLabel={`Station ${num} name`} onSave={v => patch({ name: v })} list={machines.length ? `cap-machines-${s.id}` : undefined} />
        {machines.length > 0 && <datalist id={`cap-machines-${s.id}`}>{machines.map(m => <option key={m} value={m} />)}</datalist>}
        <span className="cw-seg" role="group" aria-label="Machine or people">
          {(['machine', 'people'] as const).map(k => (
            <button key={k} type="button" className={'chip' + (s.kind === k ? ' on' : '')} aria-pressed={s.kind === k}
              onClick={() => patch({ kind: k })}>{k === 'machine' ? 'Machine' : 'People'}</button>
          ))}
        </span>
        <span className="cap-st-acts">
          <button className="btn btn-ghost in-usual-b" onClick={() => move(-1)} disabled={!canUp} aria-label="Move earlier in the line"><Icon name="arrowUp" size="1.1em" /></button>
          <button className="btn btn-ghost in-usual-b" onClick={() => move(1)} disabled={!canDown} aria-label="Move later in the line"><Icon name="arrowDown" size="1.1em" /></button>
          <button className="btn btn-ghost in-usual-b" onClick={remove} aria-label={`Remove ${s.name || 'this station'}`}><Icon name="close" size="1.1em" /></button>
          <button type="button" className={'btn btn-sm' + (open ? ' btn-primary' : ' btn-ghost')} onClick={onToggle} aria-expanded={open}>{open ? 'Done' : 'Edit'}</button>
        </span>
        </>}
      </div>

      {why && <p className="cap-why" role="note">Not counted yet: {why}.</p>}

      {!open && (
        <p className="cap-sum">
          {s.rate != null ? `${fmtN(s.rate)} ${spUnit} ${PER_WORD[s.ratePer ?? 'min']}`
            : s.perCycle != null || s.cycleSec != null ? cycleWords(s.perCycle ?? 0, s.cycleSec ?? 0, spUnit)
              : 'no speed yet'}
          {' · '}{s.crew ?? 1} {s.kind === 'people' ? (s.crew === 1 ? 'person' : 'people') : 'of it'}
          {' · '}{s.runningPct ?? 100}% running · {s.goodPct ?? 100}% good
        </p>
      )}
      {/* THE STEP BEFORE, SAID HERE (Rowland, 13 October: "70 a minute. How
          many go into a basket? 10. So one basket goes to a human every X").
          Worked out the moment it says what it counts in and how many make
          one — a person needs no speed for it — then whether it keeps up, in
          seconds a piece for a person, and how many people would. Shut or
          open, it is the line this card is read by. */}
      {(say.arrive || say.verdict || say.paced) && (
        <p className={'cap-feed' + (say.short ? ' is-short' : say.paced ? ' is-paced' : '')}>
          {say.arrive && <span className="cap-st-in">{say.arrive}</span>}
          {say.verdict && <span className="cap-st-says">{say.verdict}</span>}
          {say.needed != null && !ro && (
            <button type="button" className="cw-link cap-crew" onClick={() => patch({ crew: say.needed })}>Make it {say.needed} people</button>
          )}
          {/* fed straight by a machine or a person, nothing collecting between (docs/CAPACITY.md §1) */}
          {say.paced && <span className="cap-st-paced" role="note">{say.paced}</span>}
        </p>
      )}
      {/* A RATE THAT READS LIKE A TIME (Rowland, 14 October: "it says 5
          pallets a minute ... it isn't ... it takes 5 minutes to do one
          pallet") — asked, never changed by itself */}
      {asTime && (
        <p className="cap-astime" role="note">
          <span>{asTime.says} <b>{asTime.ask}</b></span>
          {!ro && (
            <button type="button" className="cw-link" onClick={() => { setMode('cycle'); patch({ rate: undefined, ratePer: undefined, perCycle: 1, cycleSec: asTime.cycleSec, cycleIn: asTime.cycleIn }); }}>
              Make it {asTime.every}
            </button>
          )}
        </p>
      )}

      {open && <>
      <div className="cap-grid">
        <label className="proj-field">
          <span className="field-label">It counts in</span>
          <DraftText value={s.unit} placeholder="bags, baskets, pallets…" className="text-input" max={30}
            ariaLabel="What it counts in" onSave={v => patch({ unit: v,
              /* the same unit as the one before is one for one — said for them */
              ...(i > 0 && !(s.contains > 0) && prevUnit?.trim() && v.trim().toLowerCase() === prevUnit.trim().toLowerCase() ? { contains: 1 } : {}) })} />
        </label>

        {i > 0 && (
          <label className="proj-field">
            <span className="field-label">{s.unit.trim() ? `Each ${s.unit.trim().replace(/s$/i, '')} holds` : 'Each one holds'}</span>
            <span className="cap-inline">
              <DraftNumber className="text-input cap-num" value={s.contains} placeholder="how many" label="How many of the one before make one of these"
                onSave={v => patch({ contains: v ?? 0 })} />
              <span className="cap-unit">{prevUnit?.trim() || 'of the one before'}</span>
            </span>
            {/* THE STEP BEFORE READ INTO IT — "1 pallet = 36 baskets = 360
                units": a wrong number in the chain shows here */}
            {chain && <span className="cap-hint cap-chain">{chain}</span>}
          </label>
        )}

        <div className="proj-field cap-speed">
          <span className="field-label">How fast it runs</span>
          {canBefore && (
            <span className="cw-seg cap-per" role="group" aria-label="Timed per">
              <span className="cap-hint">Timed per</span>
              <button type="button" className={'chip' + (!before ? ' on' : '')} aria-pressed={!before} onClick={() => timePer('own')}>{one}</button>
              <button type="button" className={'chip' + (before ? ' on' : '')} aria-pressed={before} onClick={() => timePer('before')}>{oneOf(prevUnit as string)}</button>
            </span>
          )}
          <span className="cw-seg" role="group" aria-label="A rate or how long one takes">
            <button type="button" className={'chip' + (mode === 'rate' ? ' on' : '')} aria-pressed={mode === 'rate'} onClick={() => setMode('rate')}>How many in a time</button>
            <button type="button" className={'chip' + (mode === 'cycle' ? ' on' : '')} aria-pressed={mode === 'cycle'} onClick={() => setMode('cycle')}>How long one takes</button>
          </span>
          {mode === 'rate' ? (
            <span className="cap-inline">
              <DraftNumber className="text-input cap-num" value={s.rate} placeholder="70" label="Speed" onSave={v => patch({ rate: v, cycleSec: undefined, perCycle: undefined })} />
              <span className="cap-unit">{spUnit}</span>
              <select className="text-input cap-sel" value={s.ratePer ?? 'min'} aria-label="Per second, minute or hour"
                onChange={e => patch({ ratePer: e.target.value as RatePer })}>
                {/* a person is never so many a second — that box turned "a tray every 8 s" into 480 a minute */}
                {(Object.keys(PER_WORD) as RatePer[]).filter(k => k !== 'sec' || s.kind !== 'people' || s.ratePer === 'sec').map(k => <option key={k} value={k}>{PER_WORD[k]}</option>)}
              </select>
            </span>
          ) : (
            <span className="cap-inline">
              {/* one at a time unless said otherwise: "a tray every 8 seconds" */}
              <DraftNumber className="text-input cap-num" value={s.perCycle ?? 1} placeholder="1" label={`How many ${spUnit} at a time`} onSave={v => patch({ perCycle: v ?? 1, rate: undefined })} />
              <span className="cap-unit">{(s.perCycle ?? 1) === 1 ? spOne : spUnit} every</span>
              {/* SECONDS OR MINUTES — "it takes 5 minutes to do one pallet":
                  kept in seconds, shown and typed in what was picked */}
              <DraftNumber className="text-input cap-num" value={s.cycleSec == null ? undefined : inMin ? Math.round((s.cycleSec / 60) * 1000) / 1000 : s.cycleSec}
                placeholder={inMin ? '5' : '8'} label={inMin ? 'Minutes each time' : 'Seconds each time'}
                onSave={v => patch({ cycleSec: v == null ? undefined : inMin ? v * 60 : v, perCycle: s.perCycle ?? 1, rate: undefined })} />
              <select className="text-input cap-sel" value={inMin ? 'min' : 'sec'} aria-label="Seconds or minutes"
                onChange={e => {
                  /* the number typed stays: "5" then minutes is five minutes */
                  const toMin = e.target.value === 'min';
                  const shown = s.cycleSec == null ? undefined : inMin ? s.cycleSec / 60 : s.cycleSec;
                  patch({ cycleIn: toMin ? 'min' : undefined, ...(shown != null ? { cycleSec: toMin ? shown * 60 : shown } : {}) });
                }}>
                <option value="sec">seconds</option>
                <option value="min">minutes</option>
              </select>
            </span>
          )}
          {/* WHAT THAT COMES TO, said back at once — a slip ("8 trays" for "8
              bags a tray") shows here, not three tables later */}
          {speed != null && !before && (
            <span className="cap-hint cap-is">
              {/* under one a minute, said an hour: "12 pallets an hour", not "0.2 pallets a minute" */}
              = {speed < 1 ? `${fmtN(speed * 60)} ${s.unit.trim() || 'units'} an hour` : `${fmtN(speed)} ${s.unit.trim() || 'units'} a minute`}{s.kind === 'people' ? ' each' : ''}
              {factor != null && Math.abs(factor - 1) > 1e-9 ? ` · ${fmtN(speed * factor)} ${lineUnit} a minute` : ''}
              {s.kind === 'people' && s.rate != null ? ` · a ${one} every ${fmtSec(60 / speed)}` : ''}
            </span>
          )}
          {/* timed per the one before: said in it, then in its own unit and the line's */}
          {speed != null && before && typed != null && (
            <span className="cap-hint cap-is">
              = {fmtN(typed)} {spUnit} a minute{s.kind === 'people' ? ' each' : ''}{s.rate != null ? ` · a ${spOne} every ${fmtSec(60 / typed)}` : ''}
              {` · a ${one} every ${fmtDur(60 / speed)} (${fmtN(s.contains)} ${spUnit})`}
              {factor != null && Math.abs(factor - 1) > 1e-9 ? ` · ${fmtN(speed * factor)} ${lineUnit} a minute` : ''}
            </span>
          )}
          {s.kind === 'people' && <span className="cap-hint">Use the pace they can keep up all shift — not their best lap.</span>}
        </div>

        {/* A PERSON'S REST ALLOWANCE (docs/CAPACITY.md §1) — added to the
            time timed or typed to give the time to plan on; a standard time
            from the line balance carries its own */}
        {s.kind === 'people' && s.source !== 'standard' && (
          <label className="proj-field">
            <span className="field-label">Rest allowance — %</span>
            <DraftNumber className="text-input cap-num" value={s.allowancePct ?? REST_ALLOWANCE_PCT} placeholder={String(REST_ALLOWANCE_PCT)} label="Rest allowance, percent"
              onSave={v => patch({ allowancePct: v == null || v === REST_ALLOWANCE_PCT ? undefined : v })} />
            <span className="cap-hint">{speed != null
              ? `Plan on ${(() => { const p = 60 / (speed / (1 + (s.allowancePct ?? REST_ALLOWANCE_PCT) / 100)); return before ? `a ${spOne} every ${fmtDur(p / s.contains)}` : `a ${one} every ${fmtDur(p)}`; })()} — the time with the allowance. `
              : ''}{REST_ALLOWANCE_PCT}% is the ILO’s on every job: 5% personal needs, 4% basic fatigue. Add for standing, awkward posture, weight lifted, heat, noise or monotony.</span>
          </label>
        )}

        <label className="proj-field">
          <span className="field-label">{s.kind === 'people' ? 'How many people' : 'How many of it'}</span>
          <DraftNumber className="text-input cap-num" value={s.crew ?? 1} placeholder="1" label="Crew" onSave={v => patch({ crew: v })} />
        </label>

        <label className="proj-field">
          <span className="field-label">Running — % of the time</span>
          <DraftNumber className="text-input cap-num" value={s.runningPct} placeholder="100" label="Percent of the time it is running" onSave={v => patch({ runningPct: v })} />
          {suggested != null && suggested < 100 && suggested !== (s.runningPct ?? 100) && (
            <button className="cw-link cap-sug" onClick={() => patch({ runningPct: suggested })}>
              Your last 4 weeks of stops say {suggested}%{coLeft > 0 ? ` — ${Math.round(coLeft)} min of changeovers left out, they come off the shift` : ''} — use it
            </button>
          )}
          {suggested == null && own > 0 && !planned && (
            <span className="cap-hint">{Math.round(own)} min of its own stops in 4 weeks — set planned hours above to turn that into a percentage.</span>
          )}
        </label>

        <label className="proj-field">
          <span className="field-label">Good — % passed on</span>
          <DraftNumber className="text-input cap-num" value={s.goodPct} placeholder="100" label="Percent it passes on as good" onSave={v => patch({ goodPct: v })} />
        </label>

        {/* ACCUMULATION after it (docs/CAPACITY.md §4): what can collect before
            the next station — a conveyor, a table — in its own unit */}
        {!last && (
          <label className="proj-field">
            <span className="field-label">Can collect after it — {s.unit || 'its unit'}</span>
            <DraftNumber className="text-input cap-num" value={s.bufferAfter} placeholder="0" label="How many can collect between it and the next station" onSave={v => patch({ bufferAfter: v })} />
          </label>
        )}
      </div>

      <div className="cap-st-f">
        <span className="cw-seg" role="group" aria-label="How the speed is known">
          {/* a person is timed, never read off a plate */}
          {SOURCES.filter(o => s.kind !== 'people' || o.id !== 'plate').map(o => (
            <button key={o.id} type="button" className={'chip' + ((s.source ?? 'estimate') === o.id ? ' on' : '')}
              aria-pressed={(s.source ?? 'estimate') === o.id} onClick={() => patch({ source: o.id })}>{o.label}</button>
          ))}
        </span>
        <DraftText value={s.note ?? ''} placeholder="Where that came from — the date, who timed it, how many laps…" className="text-input cap-note" max={160}
          ariaLabel="Where the speed came from" onSave={v => patch({ note: v || undefined })} />
        <span className="cap-asset">
          <DraftText value={s.asset ?? ''} placeholder={`Stops logged as: ${s.name || 'this name'}`} className="text-input" max={60}
            ariaLabel="The machine name its stops are logged under" onSave={v => patch({ asset: v || undefined })} />
          {!matched && assets.length > 0 && (
            <span className="cap-picks">
              <span className="cap-hint">Your stops log has:</span>
              {assets.slice(0, 6).map(a => (
                <button key={a} type="button" className="chip" onClick={() => patch({ asset: a })}>{a}</button>
              ))}
            </span>
          )}
        </span>
        {(wait > 0 || own > 0) && (
          <span className="cap-hint">Last 4 weeks: {Math.round(own)} min its own stops{coLeft > 0 ? ` (${Math.round(coLeft)} of it changeovers)` : ''} · {Math.round(wait)} min waiting on neighbours</span>
        )}
      </div>
      </>}
    </li>
  );
}

/* ============================ what a pack costs =============================
 * Rowland, 13 October: "if I put two people there ... is my cost per pack
 * higher or lower? That ultimately decides whether or not they will pursue
 * putting an extra person on the line." The people on the line — every one,
 * not only the stations that are people — and what one costs an hour, over
 * the good packs the line makes an hour (lib/capacity labourCost). When
 * people set the pace, one more of them at the bottleneck, worked out: what
 * the line then makes, what it then costs a pack, higher or lower. A what-if
 * says its own. The people and the rate are typed here, or stand in from the
 * line standard's head count and the line's own crew and rate, said which. */
function LabourBox({ r, cap, current, w, rAsRun, li, onSave, onMore, canEdit }: {
  r: CapacityResult; cap: Capacity; current: Capacity; w?: WhatIf; rAsRun: CapacityResult;
  li: LabourInputs; onSave: (labour: Capacity['labour']) => void; onMore?: (stationId: string, crew: number) => void; canEdit: boolean;
}) {
  const one = oneOf(r.unit);
  const cost = labourCost(r, li.people, li.rate);
  const more = !w ? oneMorePerson(current, r, li.people, li.rate) : undefined;
  const wl = w ? whatIfLabour(cap, rAsRun, current, r, li.people, li.rate) : undefined;
  const fromP = li.peopleFrom === 'map' ? 'placed on the line standard' : li.peopleFrom === 'line' ? 'the line’s crew' : li.peopleFrom === 'typed' ? 'typed here' : 'not said yet';
  const fromR = li.rateFrom === 'line' ? 'the line’s rate, with its on-costs' : li.rateFrom === 'typed' ? 'typed here' : 'not said yet';
  return (
    <section className="cap-cost" aria-label={`What a ${one} costs in labour`}>
      <h3 className="cap-h">What a {one} costs in labour</h3>
      <div className="cap-cost-in">
        <label className="proj-field">
          <span className="field-label">People on the line — all of them</span>
          {canEdit
            ? <DraftNumber className="text-input cap-num" value={cap.labour?.people ?? li.people} placeholder="e.g. 8" label="People on the line"
                onSave={v => onSave({ ...cap.labour, people: v })} />
            : <b className="cap-ro-v">{li.people ?? 'not said'}</b>}
          <span className="cap-hint">{fromP}</span>
        </label>
        <label className="proj-field">
          <span className="field-label">£ an hour, each</span>
          {canEdit
            ? <DraftNumber className="text-input cap-num" value={cap.labour?.ratePerHour ?? (li.rate != null ? Math.round(li.rate * 100) / 100 : undefined)} placeholder="e.g. 12.50" label="Pounds an hour each"
                onSave={v => onSave({ ...cap.labour, ratePerHour: v })} />
            : <b className="cap-ro-v">{li.rate != null ? fmtMoney(li.rate) : 'not said'}</b>}
          <span className="cap-hint">{fromR}</span>
        </label>
      </div>
      {cost ? (
        <p className="cap-cost-says">
          <b>{fmtMoney(cost.perPack)} a {one}</b> — {cost.people} {cost.people === 1 ? 'person' : 'people'} × {fmtMoney(cost.ratePerHour)} = {fmtMoney(cost.perHour)} an hour; the line makes {fmtBig(cost.packsPerHour)} {r.unit} an hour ({fmtN(cost.packsPerHour / 60)} a minute{r.goodOut != null && r.line != null && r.goodOut < r.line - 1e-9 ? ', good ones' : ''}).
        </p>
      ) : (
        <p className="sub">{r.line == null ? 'Once the stations can be counted, ' : ''}Say how many people are on the line and what one costs an hour, and this says what a {one} costs in labour — and whether one more person pays for themselves.</p>
      )}
      {more && (
        <p className="cap-cost-more">
          {more.sentence}
          {canEdit && onMore && <> <button type="button" className="cw-link" onClick={() => onMore(more.station.id, (more.station.crew ?? 1) + 1)}>Make it {(more.station.crew ?? 1) + 1} at {more.station.name.trim() || 'it'}</button></>}
        </p>
      )}
      {cost && !more && !w && r.limit && r.limit.station.kind === 'machine' && (
        <p className="sub">The bottleneck is a machine — {r.limit.station.name.trim() || 'it'}: another person there adds an hour’s cost and no {r.unit}.</p>
      )}
      {wl && <p className="cap-cost-more">{wl.sentence}</p>}
    </section>
  );
}

/* ================================ the panel ================================= */

/** What the panel reads of the line it balances: a 6M job's line, or a line
 *  standard's product on a line (ui/LineStandards) — its name, the line study
 *  its stops come from, its balance, and who drives it. */
export type CapLine = Pick<PaceLineRow, 'id' | 'name' | 'capacity'> & { workspaceId?: string; owner?: string };

export function CapacityPanel({ projectId, line, onSave, board = true, can: given, walk, mapPeople }: {
  projectId: string;
  line: CapLine;
  /** The people placed on the product's line standard — what the cost of a
   *  pack stands in with when the people on the line are not typed. */
  mapPeople?: number;
  onSave: (cap: Capacity) => Promise<void>;
  /** A 6M line raises its actions on the job's board. A line standard's
   *  balance is a tool on a line, often on no job (LINE_TOOLS.sql): it draws
   *  the balance and its what-ifs, and raises nothing. */
  board?: boolean;
  /** Who may edit, when it is not a job's access that decides — a line's
   *  members edit its tools. */
  can?: Can;
  /** On a product's line standard: the bottleneck walk beside the sums
   *  (docs/CAPACITY.md §3) — a walk is a sampling study on the standard. */
  walk?: { standardId: string; product: string };
}) {
  const jobCan = useAccess(projectId);
  /* THE TIME STUDY on this product's standard (the work balance): each
     person's standard time a piece — what a people station's speed is when
     it has been timed (docs/CAPACITY.md §1). */
  const [study, setStudy] = useState<Map<string, number> | undefined>(undefined);
  useEffect(() => {
    const sid = walk?.standardId;
    if (!sid) return;
    const load = () => void listAllStudies().then(all => {
      const b = currentBalance(all, sid);
      const f = b ? balanceOf(b.facts.steps, b.agreed?.balance) : undefined;
      setStudy(f && !f.untimed ? new Map(f.people.filter(p => p.work > 0).map(p => [p.who.trim().toLowerCase(), p.work])) : undefined);
    });
    load();
    return onDataChange(load);
  }, [walk?.standardId]);
  const can = given ?? jobCan;
  const stored = line.capacity ?? EMPTY_CAPACITY;
  const [cap, setCap] = useState<Capacity>(stored);
  const [editing, setEditing] = useState<string | null>(null);
  /* lines alike are edited once, in step, until someone makes them different */
  const [apart, setApart] = useState(false);
  /* What this panel last wrote. A reload that has not caught up with it must
     not put the old document back over a field somebody has just left. */
  const sent = useRef<string | null>(null);
  useEffect(() => {
    const j = JSON.stringify(stored);
    if (sent.current != null) { if (j === sent.current) sent.current = null; return; }
    setCap(stored);
  }, [stored]);

  /* Every save brings the what-ifs up to the line (syncWhatIfs): each keeps
     only what it changes, and its snapshot is redrawn over the line as it now
     is — so editing the line as run carries into every what-if. */
  const commit = (raw: Capacity) => { if (!can.edit) return; const next = syncWhatIfs(cap, raw); setCap(next); sent.current = JSON.stringify(next); void onSave(next); };

  /* WHICH LINE IS ON THE SCREEN — the line as it runs, or one of its what-ifs.
     Everything below edits `current`; the stations are written back to
     wherever they came from. */
  const [view, setView] = useState<string>('asRun');
  const whatIfs = cap.whatIfs ?? [];
  const w = whatIfs.find(x => x.id === view);
  useEffect(() => { if (view !== 'asRun' && !w) setView('asRun'); }, [view, w]);
  const current: Capacity = w ? whatIfCapacity(cap, w) : cap;
  const putWhatIf = (id: string, p: Partial<WhatIf>) => commit({ ...cap, whatIfs: whatIfs.map(x => (x.id === id ? { ...x, ...p } : x)) });
  const setStations = (stations: Station[]) => (w
    ? commit({ ...cap, whatIfs: whatIfs.map(x => (x.id === w.id ? withWhatIfStations(cap.stations, x, stations) : x)) })
    : commit({ ...cap, stations }));
  const patchStation = (id: string, p: Partial<Station>) => {
    const ids = stepIdsOf(id) ?? [id];
    setStations(current.stations.map(s => (ids.includes(s.id) ? { ...s, ...p } : s)));
  };

  const stops = useLineStops(line.workspaceId);
  const stats = useMemo(() => stopStats(stops.obs, current.stations, stops.from, stops.to), [stops.obs, stops.from, stops.to, current.stations]);
  /* CAPACITY A SHIFT, on a product's standard (ui/ShiftCapacity): the line's
     shifts and the changeover SMED timed into this product. When the
     changeovers come off the shift, a station's own stops logged as
     changeovers are left out of its running share — never taken twice. */
  const shiftIn = useShiftInputs(line.workspaceId, walk?.standardId, cap.changeovers);
  /* the line itself — its crew and its rate stand in for the cost of a pack */
  const [lineWs, setLineWs] = useState<Workspace | undefined>(undefined);
  useEffect(() => {
    let live = true;
    if (!line.workspaceId) { setLineWs(undefined); return; }
    const load = () => void getWorkspace(line.workspaceId as string).then(x => { if (live) setLineWs(x ?? undefined); });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [line.workspaceId]);
  const coOff = !!(walk && shiftIn.co && shiftIn.co.perShift != null);
  const assets = useMemo(() => [...new Set(stops.obs.filter(o => !o.deletedAt && o.asset?.trim()).map(o => o.asset.trim()))].sort(), [stops.obs]);
  /* THE LINE'S MACHINES, in flow order (docs/BLUEPRINT.md, Stage 2) — every
     station's name offers them, and an empty line starts from them: the one
     list every "which machine" reads, the job's own on it with them (lib/
     lineRecords machinesOf; flow audit #14). */
  const rec = useLineRecords();
  const lineRec = line.workspaceId ? rec.all.find(x => x.id === line.workspaceId) : undefined;
  const machines = useMemo(() => (lineRec ? machinesOf(lineRec, rec.machines, rec.jobLines, projectId || undefined) : []), [rec, lineRec, projectId]);
  /* A MACHINE STATION THE LINE DOES NOT LIST — "Capacity stations never
     reach the line's list" (flow audit #14). Offered, never written behind
     the person's back: the line's list is what every picker reads. */
  const unlisted = useMemo(() => {
    if (!lineRec || rec.loading) return [];
    const known = new Set(machines.map(machineKey));
    return [...new Set(cap.stations.filter(x => x.kind === 'machine' && x.name.trim() && !known.has(machineKey(x.name))).map(x => x.name.trim()))];
  }, [lineRec, rec.loading, machines, cap.stations]);

  const r = useMemo(() => analyse(current), [current]);
  /* A COLUMN OF THE V TAPPED: its station brought into view, and opened for
     whoever may change it */
  const pick = (index: number) => {
    const s = current.stations[index];
    if (!s) return;
    if (can.edit) setEditing(s.id);
    requestAnimationFrame(() => document.getElementById(`cap-st-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };
  const asRun = useMemo(() => analyse(cap), [cap]);
  const compare = w ? compareSays(asRun, r, w.name) : undefined;
  const changed = useMemo(() => (w ? changedWords(cap.stations, current.stations) : []), [cap.stations, w, current.stations]);
  const check = useMemo(() => crossCheck(r, stats), [r, stats]);
  const why = (id: string) => r.skipped.find(x => x.station.id === id)?.why;
  const result = (id: string) => r.ok.find(x => x.station.id === id);

  const add = (kind: Station['kind'], name = '') => {
    const s = { ...blankStation(uid(), kind, current.stations.length === 0), name };
    setStations([...current.stations, s]);
    /* a new station stays open until Done — naming it used to shut it before its speed was asked */
    setEditing(s.id);
  };
  const remove = (s: Station) => {
    const before = cap;
    const ids = stepIdsOf(s.id) ?? [s.id];
    setStations(current.stations.filter(x => !ids.includes(x.id)));
    offerUndo(`Removed ${s.name || 'the station'}${ids.length > 1 ? ` from each line` : ''}`, async () => commit(before));
  };

  /* SEVERAL LINES FEEDING ONE PLACE (lib/capacity Lane; Rowland, 15 October:
     "two lines ... then merge into one person who has to wrap for both ...
     3, 4, 5, 6 lines into one pack hole"). The stations are drawn a group a
     line, then the ones after they merge; a station is moved, numbered and
     added within its own group. Lines are added and taken away on the line
     as run — a what-if changes the stations of the lines there are. */
  const lanes = current.lanes ?? [];
  const laneIds = new Set(lanes.map(l => l.id));
  /* IN STEP: while every line holds the same stations, a change to the first
     line's is made on each — one edit, not one per line (15 October: "an
     absolute mess" — the same five stations typed twice). "Make the lines
     different" lets each be changed on its own. */
  const inStep = !w && !apart && lanesAlike(current);
  const laneLists = () => lanes.map(l => current.stations.filter(x => x.lane === l.id));
  const stepIdsOf = (id: string): string[] | undefined => {
    if (!inStep) return undefined;
    const ls = laneLists(), i = ls[0]?.findIndex(x => x.id === id) ?? -1;
    return i < 0 ? undefined : ls.map(l => l[i]?.id).filter((x): x is string => !!x);
  };
  const groups = lanes.length
    ? [...lanes.map((l, k) => ({ key: l.id, lane: l, name: l.name.trim() || `Line ${String.fromCharCode(65 + (k % 26))}`, stations: current.stations.filter(x => x.lane === l.id) })),
       { key: '', lane: undefined as Lane | undefined, name: 'After the lines merge', stations: current.stations.filter(x => !x.lane || !laneIds.has(x.lane)) }]
    : [{ key: '', lane: undefined as Lane | undefined, name: '', stations: current.stations }];
  const addTo = (kind: Station['kind'], lane?: string) => {
    const mine = current.stations.filter(x => (lane ? x.lane === lane : !x.lane || !laneIds.has(x.lane)));
    const st = { ...blankStation(uid(), kind, lanes.length > 0 ? (!!lane && mine.length === 0) : current.stations.length === 0), ...(lane ? { lane } : {}) };
    /* in its group's place: after the group's last station, else before the shared ones */
    const at = mine.length ? current.stations.indexOf(mine[mine.length - 1]) + 1 : lane ? current.stations.findIndex(x => !x.lane || !laneIds.has(x.lane)) : current.stations.length;
    const list = [...current.stations]; list.splice(at < 0 ? list.length : at, 0, st);
    /* in step: the same new station on every other line too */
    if (inStep && lane && lane === lanes[0]?.id) for (const l of lanes.slice(1)) {
      const theirs = list.filter(x => x.lane === l.id);
      const i = theirs.length ? list.indexOf(theirs[theirs.length - 1]) + 1 : list.findIndex(x => !x.lane || !laneIds.has(x.lane));
      list.splice(i < 0 ? list.length : i, 0, { ...st, id: uid(), lane: l.id });
    }
    setStations(list);
    setEditing(st.id);
  };
  const moveIn = (id: string, by: -1 | 1) => {
    const g = groups.find(x => x.stations.some(y => y.id === id));
    if (!g) return;
    const k = g.stations.findIndex(y => y.id === id), o = g.stations[k + by];
    if (!o) return;
    const list = [...current.stations];
    const pairs: [string, string][] = [[id, o.id]];
    const ids = stepIdsOf(id), others = stepIdsOf(o.id);
    if (ids && others) ids.slice(1).forEach((x, i) => { if (others[i + 1]) pairs.push([x, others[i + 1]]); });
    for (const [p1, p2] of pairs) { const a = list.findIndex(y => y.id === p1), b = list.findIndex(y => y.id === p2); [list[a], list[b]] = [list[b], list[a]]; }
    setStations(list);
  };
  const nextLaneName = () => `Line ${String.fromCharCode(65 + (lanes.length % 26))}`;
  /* (The lines are split from step 1, "How many lines feed in?" and "Where do
     they meet?" — one place for the shape of the line. Each station card
     carried a "Lines merge after this" too: the same split from a second door,
     a row taller on every card. 16 October.) */
  /* ANOTHER LINE, LIKE THE LAST: its stations copied, to change what differs */
  const addLane = () => {
    if (w || !can.edit || !lanes.length) return;
    const last = lanes[lanes.length - 1];
    const l = { id: uid(), name: nextLaneName() };
    const copy = current.stations.filter(x => x.lane === last.id).map(x => ({ ...x, id: uid(), lane: l.id }));
    const firstShared = cap.stations.findIndex(x => !x.lane || !laneIds.has(x.lane));
    const list = [...cap.stations]; list.splice(firstShared < 0 ? list.length : firstShared, 0, ...copy);
    const before = cap;
    commit({ ...cap, lanes: [...lanes, l], stations: list });
    offerUndo(`Added ${l.name}, like ${last.name.trim() || 'the one before'}`, async () => commit(before));
  };
  const renameLane = (id: string, name: string) => commit({ ...cap, lanes: lanes.map(l => (l.id === id ? { ...l, name: name.trim() || l.name } : l)) });
  const removeLane = (id: string) => {
    if (w || !can.edit) return;
    const before = cap;
    const left = lanes.filter(l => l.id !== id);
    const gone = lanes.find(l => l.id === id);
    commit({ ...cap, lanes: left.length ? left : undefined, stations: cap.stations.filter(x => x.lane !== id).map(x => (left.length ? x : { ...x, lane: undefined })) });
    offerUndo(`Removed ${gone?.name.trim() || 'the line'} and its stations`, async () => commit(before));
  };
  /* ONE LINE AGAIN: with one line left, it and what follows are a single chain */
  const oneLine = () => {
    if (w || !can.edit || lanes.length !== 1) return;
    const before = cap;
    commit({ ...cap, lanes: undefined, stations: cap.stations.map(x => ({ ...x, lane: undefined })) });
    offerUndo('Back to one line', async () => commit(before));
  };

  /* HOW MANY LINES, AND WHERE THEY MEET (lib/capacityLines; Rowland, 15
     October: "it should almost be asking how many lines do you want to do, and
     do they merge at the end"). One tap makes the line N lines, the same first
     stations each, the rest shared; the merge point is one choice. */
  const flow = lineChain(cap);
  const mergeAt = mergeAfterOf(cap);
  const alike = lanesAlike(current);
  const ownCount = lanes.length ? current.stations.filter(x => x.lane === lanes[0].id).length : 0;
  const shapeK = lanes.length ? (mergeAt ?? ownCount) : Math.max(1, flow.length - 1);
  const shapeIt = (n: number, k: number) => {
    if (w || !can.edit) return;
    const before = cap;
    commit(reshape(cap, n, k, uid));
    offerUndo(n === 1 ? 'Back to one line' : !flow.length ? `${n} lines — type their stations` : `${n} lines, ${k >= flow.length ? 'each ending on its own' : `meeting after ${flow[k - 1]?.name.trim() || `station ${k}`}`}`, async () => commit(before));
  };
  /* what happens at the merge, said as the station's own card says it */
  const mergeSay = (() => {
    if (!r.lanes) return undefined;
    const g = groups[groups.length - 1];
    const first = g.stations[0];
    const prev = groups[0].stations.slice(-1)[0];
    if (!first) return undefined;
    const say = paceSays(r, first, prev?.unit, prev);
    return [say.arrive, say.verdict].filter(Boolean).join(' ') || undefined;
  })();
  /* THE WAY TO THE TARGET, worked out (lib/capacityPlan) — made so in one tap */
  const plan = useMemo(() => planToTarget(current), [current]);
  const applyPlan = () => {
    if (w || !can.edit || !plan || !plan.steps.length) return;
    const before = cap;
    const li = labourInputs(cap, mapPeople, lineWs);
    commit({ ...cap, stations: cap.stations.map(x => (plan.crews[x.id] != null ? { ...x, crew: plan.crews[x.id] } : x)),
      labour: { ...cap.labour, ...(li.people && plan.people > 0 ? { people: li.people + plan.people } : {}) } });
    offerUndo(`Put in the crews for ${fmtN(plan.target)} a minute`, async () => commit(before));
  };

  /* WHAT-IFS. A new one is a copy of whatever is on the screen — the line as
     run, or another what-if — so "the same line with one thing changed" is
     one tap, then the change. */
  const addWhatIf = () => {
    const id = uid();
    const n = whatIfs.length + 1;
    const nw: WhatIf = withWhatIfStations(cap.stations, { id, name: `What if ${n}`, stations: [], targetPerMin: current.targetPerMin, createdAt: Date.now() }, current.stations.map(s => ({ ...s })));
    commit({ ...cap, whatIfs: [...whatIfs, nw] });
    setView(id);
    setEditing(null);
  };
  const removeWhatIf = () => {
    if (!w) return;
    const before = cap;
    commit({ ...cap, whatIfs: whatIfs.filter(x => x.id !== w.id) });
    setView('asRun');
    offerUndo(`Removed ${w.name}`, async () => commit(before));
  };
  /* SWIPE, on a phone: left to the next what-if, right to the one before. A
     swipe left past the last one makes a new one — "swipe left, add a
     different machine name". Short or mostly vertical moves are scrolling. */
  const order = ['asRun', ...whatIfs.map(x => x.id)];
  const touch = useRef<{ x: number; y: number } | null>(null);
  /* Not from inside a box being typed in: dragging the caret along a station's
     name is a sideways move too, and it made a new what-if. */
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    const typing = (e.target as Element).closest?.('input, textarea, select');
    touch.current = t && !typing ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const t = touch.current; touch.current = null;
    const c = e.changedTouches[0];
    if (!t || !c) return;
    const dx = c.clientX - t.x, dy = c.clientY - t.y;
    if (Math.abs(dx) < 80 || Math.abs(dy) > 60) return;
    const i = order.indexOf(view);
    if (dx < 0) { if (i + 1 < order.length) setView(order[i + 1]); else if (can.edit) addWhatIf(); }
    else if (i > 0) setView(order[i - 1]);
  };

  /* RAISING AN ACTION FROM THE FINDING (the line as run), or MAKING A WHAT-IF
     SO. One form: what, bone, owner, due. The bone starts where the station
     says — a machine station on Machine, a crew on People — and Method is a
     tap away, because the fix for a limit is as often the way the work is
     done. The sentence IS the why; on a what-if the why is the prediction,
     and its number is what the action should change, so the board's proof
     can judge it. */
  const limit = r.limit;
  const [asking, setAsking] = useState(false);
  const [what, setWhat] = useState('');
  const [pillar, setPillar] = useState<PillarKey>('machine');
  const [owner, setOwner] = useState('');
  const [due, setDue] = useState('');
  const [raised, setRaised] = useState(false);
  useEffect(() => { setAsking(false); setRaised(false); }, [view]);
  const openRaise = () => {
    if (!limit) return;
    setWhat(`Lift ${limit.station.name.trim() || 'the limiting station'} — it limits ${line.name}`);
    setPillar(limit.station.kind === 'people' ? 'people' : 'machine');
    setOwner(line.owner ?? '');
    setAsking(true); setRaised(false);
  };
  const openMake = () => {
    if (!w || !compare || asRun.line == null) return;
    const m = makeItSoWords(line.name, w, changed, compare);
    setWhat(m.what);
    const touched = current.stations.filter(s => changed.some(c => c.includes(s.name.trim() || '§')));
    setPillar(touched.length && touched.every(s => s.kind === 'people') ? 'people' : 'machine');
    setOwner(line.owner ?? '');
    setAsking(true); setRaised(false);
  };
  const raise = async () => {
    if (!what.trim()) return;
    const t = Date.now();
    const id = uid();
    if (w && compare) {
      const m = makeItSoWords(line.name, w, changed, compare);
      await putPaceTodo({
        id, projectId, lineId: line.id, what: what.trim(), where: m.where, why: m.why,
        // The prediction as a number the proof can be read against.
        expect: asRun.line != null && r.line != null ? `${fmtN(asRun.line)} → ${fmtN(r.line)} ${r.unit}/min` : undefined,
        who: owner.trim(), when: '', due: due || undefined, pillar, state: 'todo', createdAt: t, updatedAt: t,
      });
      putWhatIf(w.id, { action: { id, raisedAt: t } });
    } else if (limit) {
      await putPaceTodo({
        id, projectId, lineId: line.id, what: what.trim(), where: limit.station.name.trim(),
        why: r.sentence, who: owner.trim(), when: '', due: due || undefined, pillar,
        state: 'todo', createdAt: t, updatedAt: t,
      });
    } else return;
    setAsking(false); setRaised(true);
  };
  /* The action a what-if was made into, read from the board — live — so the
     what-if can say where it has got to: raised, waiting, or done. An action
     since deleted from the board is not "on the board": the what-if says so
     and can be made so again. (It used to read once, and a deleted action
     left "⚑ On the board." standing over nothing.) */
  const [boardRows, setBoardRows] = useState<PaceTodoRow[] | null>(null);
  useEffect(() => {
    let live = true;
    const load = () => { if (!board) { setBoardRows([]); return; } void listPaceTodos(projectId, line.id).then(rows => { if (live) setBoardRows(rows); }); };
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [projectId, line.id, board]);
  const onBoard = (x?: WhatIf) => !!x?.action && (boardRows == null || boardRows.some(t => t.id === x.action?.id));
  const made = w?.action ? boardRows?.find(x => x.id === w.action?.id) ?? null : null;
  // `raised`: the action just written may land a beat before the re-read does.
  const gone = !!w?.action && boardRows != null && !made && !raised;

  /* THE LINE, DRAWN — one model for the right-hand pictures (lib/capacityFlow) */
  const fm = useMemo(() => flowModel(current, r, alike), [current, r, alike]);
  const worth = !w && !r.lanes && limit && r.next && r.line != null
    ? lineIfRaised(r, limit.index, limit.running) : undefined;

  return (
    <section className="pace-sec cap capx" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="pace-sec-head">
        <h2 className="pace-sec-title">Where {line.name} is limited</h2>
        <p className="pace-sec-sub">
          Set the line up on the left — how many lines, what it should do, its stations — and watch it drawn on the right as you type:
          where it is held, what each station can do, and the way to the target. A screen to show where to look, not a simulation.
        </p>
      </div>

      {/* AS RUN, AND EVERY WHAT-IF BESIDE IT. One row; the one on the screen is
          marked; a what-if that is on the board carries the flag. */}
      <div className="cap-tabs" role="tablist" aria-label="The line as run, and what-ifs">
        <button type="button" role="tab" aria-selected={!w} className={'cap-tab' + (!w ? ' on' : '')} onClick={() => setView('asRun')}>As run</button>
        {whatIfs.map(x => (
          <button key={x.id} type="button" role="tab" aria-selected={w?.id === x.id} className={'cap-tab' + (w?.id === x.id ? ' on' : '')} onClick={() => setView(x.id)}>
            {onBoard(x) && <><Icon name="flag" size="1.15em" /> </>}{x.name}
          </button>
        ))}
        {can.edit && <button type="button" className="cap-tab is-add" onClick={addWhatIf} title="A copy of this line to change one thing on"><Icon name="plus" size="1.15em" /> What if</button>}
      </div>

      {w && (
        <div className="cap-whatif">
          <div className="cap-whatif-h">
            <span className="field-label">What if…</span>
            {can.edit
              ? <DraftText value={w.name} placeholder="Name the change — New basketer, 12 to a basket, second packer" className="text-input cap-whatif-name" max={60}
                  ariaLabel="What this what-if changes" onSave={v => putWhatIf(w.id, { name: v.trim() || w.name })} />
              : <b className="cap-whatif-name">{w.name}</b>}
            {can.remove && <button type="button" className="btn btn-ghost btn-sm" onClick={removeWhatIf}>Delete this what-if</button>}
          </div>
          {changed.length > 0 ? (
            <ul className="cap-changed" aria-label="What is different from the line as run">
              {changed.map(c => <li key={c}>{c}</li>)}
            </ul>
          ) : (
            <p className="sub">The same as the line as run — change a station below, or add one, and watch the limit move.</p>
          )}
        </div>
      )}

      <div className="cap-verdict">
        <span className="cap-eyebrow">{w ? 'What the sums say — against the line as run' : 'What the sums say'}</span>
        <p className="cap-says">{w ? compare : r.sentence}</p>
        {w && r.limit && <p className="cap-sub">{r.sentence}</p>}
        {/* WHAT THE BOTTLENECK COSTS A PACK (17 October: "this is the cost per
            pack because of X, including with the people") — the money, said
            under the sums; or what it needs, and where to give it */}
        {r.limit && r.line != null && (() => {
          const li = labourInputs(cap, mapPeople, lineWs);
          const k = bottleneckCost(r, li.people, li.rate, lineWs?.marginPerPack);
          if (!k) return <p className="cap-money is-n">What {r.limit.station.name.trim() || 'the bottleneck'} costs a {oneOf(r.unit)}: say how many people are on the line and what one costs an hour, under <i>What a {oneOf(r.unit)} costs in labour</i>.</p>;
          const said = bottleneckCostSays(k, r);
          return <p className={'cap-money' + (said.short ? ' is-r' : '')}>{said.text}</p>;
        })()}
        {worth != null && r.line != null && worth > r.line + 1e-9 && limit && (
          <p className="cap-sub">
            With none of {limit.station.name.trim() || 'its'}’s stops it would run {fmtN(limit.running)} {r.unit}/min — the line would then do {fmtN(worth)}
            {worth < limit.running - 1e-9 && r.next ? `, held by ${r.next.station.name.trim() || 'the next station'}` : ''}.
          </p>
        )}
      </div>

      {/* SET IT UP ON THE LEFT, SEE IT ON THE RIGHT (Rowland, 16 October: "you
          type something in, a bar chart appears at the top ... the bar chart
          and the illustrations should appear to the right-hand side ... I've
          got to look up to go down"; "adding multiple lines together and
          merging ... doesn't appear first"). Three steps in the order a line
          is thought of — how many lines and where they meet, what it should
          do, its stations — and beside them, held in view while they are
          typed, the line drawn, what each station can do, what to check and
          the way to the target. The rest of the detail follows below. */}
      <div className="capx-grid">
        <div className="capx-in">
          {can.edit && !w && (
            <section className="cap-shape capx-step" aria-label="The shape of the line">
              <h3 className="capx-step-h"><span className="capx-n" aria-hidden>1</span> How many lines feed in?</h3>
              <div className="cap-shape-q">
                <span className="cap-seg" role="group" aria-label="Lines feeding in">
                  {Array.from({ length: Math.min(MAX_LINES, Math.max(6, lanes.length)) }, (_, i) => i + 1).map(n => (
                    <button key={n} type="button" className={'cap-seg-b' + ((lanes.length || 1) === n ? ' on' : '')} aria-pressed={(lanes.length || 1) === n}
                      onClick={() => shapeIt(n, shapeK)}>{n}</button>
                  ))}
                </span>
                {lanes.length >= 2 && flow.length > 0 && (
                  <label className="cap-shape-l"><b>Where do they meet?</b>
                    <select className="text-input" aria-label="Where the lines merge" value={mergeAt ?? ''}
                      onChange={e => shapeIt(lanes.length, Number(e.target.value))}>
                      {flow.map((x, i) => <option key={x.id} value={i + 1}>{i + 1 < flow.length ? `After ${x.name.trim() || `station ${i + 1}`}` : 'They do not meet — each line ends on its own'}</option>)}
                    </select>
                  </label>
                )}
              </div>
              <p className="sub capx-step-say">{lanes.length === 0
                ? 'One line, one chain of stations. Pick 2 or more when several lines run side by side and meet at one place — a wrapper, a palletiser, one person — and type each line’s own stations, then the ones after they meet.'
                : flow.length === 0
                  ? `${lanes.length} lines. Type ${lanes[0].name.trim() || 'the first line'}’s stations below${alike ? ' — while the lines are the same, every line takes them' : ''}, then the ones after they meet.`
                  : `${lanes.length} lines, ${mergeAt != null && mergeAt < flow.length ? `meeting after ${flow[mergeAt - 1]?.name.trim() || `station ${mergeAt}`}` : 'each ending on its own'} — see The line, drawn.`}</p>
            </section>
          )}
          <section className="capx-step" aria-label="What the line should do">
            <h3 className="capx-step-h">{can.edit && !w && <span className="capx-n" aria-hidden>2</span>} What the line should do</h3>
      <div className="cap-settings">
        <label className="proj-field">
          <span className="field-label">Target — {r.unit} a minute</span>
          {can.edit
            ? <DraftNumber className="text-input cap-num" value={current.targetPerMin} placeholder="e.g. 66" label="Target, line units a minute"
                onSave={v => (w ? putWhatIf(w.id, { targetPerMin: v }) : commit({ ...cap, targetPerMin: v }))} />
            : <b className="cap-ro-v">{current.targetPerMin != null ? fmtN(current.targetPerMin) : 'not set'}</b>}
        </label>
        {!w && (
          <label className="proj-field">
            <span className="field-label">Planned running hours a week</span>
            {can.edit ? <>
              <DraftNumber className="text-input cap-num" value={cap.plannedHoursPerWeek} placeholder="e.g. 80" label="Planned hours a week"
                onSave={v => commit({ ...cap, plannedHoursPerWeek: v })} />
              <span className="cap-hint">Only used to suggest a running % from your stops. Nothing is changed for you.</span>
            </> : <b className="cap-ro-v">{cap.plannedHoursPerWeek != null ? fmtN(cap.plannedHoursPerWeek) : 'not set'}</b>}
          </label>
        )}
      </div>

          </section>
          <section className="capx-step" aria-label="The stations">
            <h3 className="capx-step-h">{can.edit && !w && <span className="capx-n" aria-hidden>3</span>} {w ? `The stations with ${w.name}, in order` : lanes.length ? 'Each line’s stations, then the ones after they meet' : 'The stations, in the order product goes through them'}</h3>
      {current.stations.length === 0 && (
        <div className="pace-empty">
          {!can.edit ? <p className="sub">No stations written down yet — the team keeps the line here.</p> : <p className="sub">
            Start at the front of the line. A bagger that does 70 a minute, then baskets that hold 12 bags and run 5½ a minute,
            then someone carrying them, then the palletiser. Each says what it counts in and how many of the one before make one of
            its own — and the app puts them all in the first one’s unit, and tells each station what arrives from the one before.
          </p>}
          {machines.length > 0 && can.edit && (
            <button className="btn btn-ghost" onClick={() => setStations(machines.map((a, i) => ({ ...blankStation(uid(), 'machine', i === 0), name: a })))}>
              Start from the line&rsquo;s machines, in flow order ({machines.length})
            </button>
          )}
          {machines.length === 0 && assets.length > 0 && can.edit && (
            <button className="btn btn-ghost" onClick={() => setStations(assets.map((a, i) => ({ ...blankStation(uid(), 'machine', i === 0), name: a })))}>
              Start from the machines in your stops log ({assets.length})
            </button>
          )}
        </div>
      )}
      {groups.map((g, gi) => {
        if (inStep && g.lane && g.lane.id !== lanes[0]?.id) return null;
        /* the unit before a group's first station: a line's none; after they merge, the lines' last */
        const prefix = !g.lane && lanes.length ? (groups[0].stations.slice(-1)) : [];
        const chainOf = [...prefix, ...g.stations];
        return (
          <div key={g.key || 'shared'} className={'cap-grp' + (lanes.length ? ' has-lanes' : '')} aria-label={g.name || undefined}>
            {lanes.length > 0 && (
              <div className="cap-grp-h">
                {g.lane && can.edit && !w
                  ? <DraftText value={g.lane.name} placeholder={g.name} className="text-input cap-lane-name" max={40} ariaLabel={`Name of ${g.name}`} onSave={v => renameLane((g.lane as Lane).id, v)} />
                  : <h3 className="cap-grp-t">{g.name}</h3>}
                <span className="sub">{g.lane
                  ? inStep
                    ? `and ${lanes.slice(1).map(l => l.name.trim() || 'the next line').join(', ')} — the same stations${(v => (v != null ? `, ${fmtN(v)} ${r.unit}/min each` : ''))(r.lanes?.sections.find(x => x.id === g.key)?.result.line)}; a change here is made on every line`
                    : `its own stations${(v => (v != null ? ` — ${fmtN(v)} ${r.unit}/min on its own` : ''))(r.lanes?.sections.find(x => x.id === g.key)?.result.line)}`
                  : 'where they all come to — one chain for every line'}</span>
                {inStep && g.lane && can.edit && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setApart(true)}>Make the lines different</button>}
                {g.lane && can.edit && !w && <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeLane((g.lane as Lane).id)}>Remove this line</button>}
              </div>
            )}
            <ol className="cap-sts">
              {g.stations.map((s, i) => {
                const gi2 = i + prefix.length;
                return (
                  <StationCard key={s.id} s={s} i={gi2} num={i + 1} canUp={i > 0} canDown={i < g.stations.length - 1} last={i === g.stations.length - 1}
                    prevUnit={chainOf[gi2 - 1]?.unit} planned={cap.plannedHoursPerWeek} why={why(s.id)}
                    wait={stats[s.id]?.waitMins ?? 0} own={stats[s.id]?.ownMins ?? 0}
                    coLeft={coOff ? stats[s.id]?.changeoverMins ?? 0 : 0}
                    suggested={suggestRunning((stats[s.id]?.ownMins ?? 0) - (coOff ? stats[s.id]?.changeoverMins ?? 0 : 0), cap.plannedHoursPerWeek, stops.weeks)}
                    say={paceSays(r, s, chainOf[gi2 - 1]?.unit, chainOf[gi2 - 1])} asTime={rateAsTime(r, s, chainOf[gi2 - 1]?.unit)} factor={result(s.id)?.factor ?? chainFactor(chainOf, gi2)} lineUnit={r.unit}
                    chain={chainWords(chainOf, gi2)}
                    patch={p => patchStation(s.id, p)} move={by => moveIn(s.id, by)} remove={() => remove(s)} assets={assets} machines={machines}
                    open={editing === s.id || !s.name.trim()} onToggle={() => setEditing(editing === s.id ? null : s.id)} ro={!can.edit} />
                );
              })}
            </ol>
            {lanes.length > 0 && can.edit && (
              <div className="row-inline">
                <button className="cw-add" onClick={() => addTo('machine', g.lane?.id)}><span className="cw-add-p" aria-hidden><Icon name="plus" size={13} /></span> Add a machine{g.lane ? ` to ${g.name}` : ''}</button>
                <button className="cw-add" onClick={() => addTo('people', g.lane?.id)}><span className="cw-add-p" aria-hidden><Icon name="plus" size={13} /></span> Add a person or crew{g.lane ? ` to ${g.name}` : ''}</button>
              </div>
            )}
            {(gi === groups.length - 2 || (inStep && g.lane?.id === lanes[0]?.id)) && lanes.length > 0 && can.edit && !w && (
              <div className="row-inline cap-lanes-do">
                <button className="cw-add" onClick={addLane}><span className="cw-add-p" aria-hidden><Icon name="plus" size={13} /></span> Add another line, like {lanes[lanes.length - 1].name.trim() || 'the one before'}</button>
                {lanes.length === 1 && <button className="btn btn-ghost btn-sm" onClick={oneLine}>One line again</button>}
              </div>
            )}
          </div>
        );
      })}
      {can.edit && !w && unlisted.length > 0 && lineRec && (
        <p className="sub cap-unlisted">
          {unlisted.join(', ')} {unlisted.length === 1 ? 'is' : 'are'} not on {lineRec.name}&rsquo;s machines yet, which the problem sheet, the stopwatch and every tool offer.{' '}
          <button type="button" className="cw-link" onClick={() => void (async () => { for (const n of unlisted) await addMachineToLine(lineRec.id, n); })()}>
            Add {unlisted.length === 1 ? 'it' : unlisted.length === 2 ? 'both' : `all ${unlisted.length}`} to the line ›
          </button>
        </p>
      )}
      {can.edit && !lanes.length && <div className="row-inline">
        <button className="cw-add" onClick={() => add('machine')}><span className="cw-add-p" aria-hidden><Icon name="plus" size={13} /></span> Add a machine</button>
        <button className="cw-add" onClick={() => add('people')}><span className="cw-add-p" aria-hidden><Icon name="plus" size={13} /></span> Add a person or crew</button>
      </div>}


          </section>
        </div>
        <aside className="capx-live" aria-label="The line, drawn">
          <h3 className="capx-live-h">The line, drawn <span className="sub">as you type — tap a station to open it</span></h3>
          <CapacityFlow m={fm} onPick={pick} />
          {mergeSay && <p className="cap-map-say">{mergeSay}</p>}
          {fm.columns.some(c => c.nodes.some(x => x.perMin != null)) && <>
            <h3 className="capx-live-h">What each station can do <span className="sub">{r.unit} a minute</span></h3>
            <CapacityBars m={fm} onPick={pick} />
          </>}
      {/* CHECK THE NUMBERS (lib/capacity screenCapacity; Rowland, 15 October:
          "319%, 279%, 273% ... these percentages make no sense ... screen it
          for problems") — what is wrong, said before the V, each a question
          with the station it is about one tap away. The paper prints the same. */}
      {(checks => checks.length > 0 && (
        <section className="cap-screen" aria-label="Check the numbers">
          <h3 className="cap-screen-h">Check the numbers <span className="sub">{checks.length === 1 ? '1 thing' : `${checks.length} things`} to look at before you trust them</span></h3>
          <ul className="cap-screen-list">
            {checks.map(c => (
              <li key={c.text} className={'is-' + c.tone}>
                <span className="cap-screen-t">{c.text}</span>
                {c.station != null && <button type="button" className="cw-link" onClick={() => pick(c.station as number)}>Open {r.ok.find(x => x.index === c.station)?.station.name.trim() || 'it'} ›</button>}
              </li>
            ))}
          </ul>
        </section>
      ))(screenCapacity(current, r))}
      {/* THE WAY TO THE TARGET, worked out (lib/capacityPlan): who is added
          where, in what order, and what each one buys. */}
      {plan && plan.steps.length > 0 && (
        <section className="cap-plan" aria-label="The way to the target">
          <h3 className="cap-plan-h">The way to {fmtN(plan.target)} {r.unit} a minute <span className="sub">worked out from the sums above</span></h3>
          <p className="cap-plan-says">{plan.sentence}</p>
          <ol className="cap-plan-steps">
            {plan.steps.map(x => (
              <li key={x.stationId}><b>{x.name}</b> {fmtN(x.from)} → {fmtN(x.to)} {x.kind === 'people' ? (x.to === 1 ? 'person' : 'people') : 'running'}
                <span className="sub"> — the line then makes {fmtN(x.lineAfter)} {r.unit}/min</span></li>
            ))}
          </ol>
          {can.edit && !w && plan.reached && (
            <button type="button" className="btn btn-sm" onClick={applyPlan}>Make it so — put these crews in{plan.people > 0 ? ` (${fmtN(plan.people)} more ${plan.people === 1 ? 'person' : 'people'})` : ''}</button>
          )}
        </section>
      )}

        </aside>
      </div>

      <div className="capx-more">
      {r.ok.length > 0 && !r.lanes && <VCurveView r={r} v={vCurve(r, cap.vMarginPct)} target={current.targetPerMin} margin={cap.vMarginPct} canAgree={can.agree && !w}
        onMargin={m => commit({ ...cap, vMarginPct: m })} onPick={pick} />}
      {r.ok.length > 0 && !r.lanes && <CapacitySheet r={r} v={vCurve(r, cap.vMarginPct)} target={current.targetPerMin} study={study}
        {...(can.edit ? { onUse: (id: string, cycleSec: number) => patchStation(id, { cycleSec, perCycle: 1, rate: undefined, source: 'standard', note: 'standard time, from the line balance' }) } : {})} />}
      {/* SEVERAL LINES: each its own V and sheet, beside its own bottleneck —
          a V is steep or not along ONE line — then the place they merge, its
          first column what they send it, against the target for all of them. */}
      {/* LINES ALIKE ARE DRAWN ONCE (Rowland, 15 October: "an absolute mess") —
          the same V and sheet twice said nothing the first did not */}
      {r.lanes && [...(alike ? r.lanes.sections.filter(x => x.result.ok.length > 0).slice(0, 1).map(x => ({ key: x.id, title: `Each line — ${r.lanes?.sections.map(y => y.name).join(', ')} are the same`, sub: `each on its own, ${fmtN(x.result.line as number)} ${r.unit}/min`, res: x.result, target: undefined as number | undefined }))
        : r.lanes.sections.filter(x => x.result.ok.length > 0).map(x => ({ key: x.id, title: x.name, sub: `on its own, ${fmtN(x.result.line as number)} ${r.unit}/min`, res: x.result, target: undefined as number | undefined }))),
        ...(r.lanes.merged ? [{ key: 'merged', title: 'After the lines merge', sub: `what they send, ${fmtN(r.lanes.sends)} ${r.unit}/min, against what the shared stations take`, res: r.lanes.merged, target: current.targetPerMin }] : [])].map(sec => (
        <section key={sec.key} className="cap-sec" aria-label={sec.title}>
          <h3 className="cap-sec-h">{sec.title} <span className="sub">{sec.sub}</span></h3>
          <VCurveView r={sec.res} v={vCurve(sec.res, cap.vMarginPct)} target={sec.target} margin={cap.vMarginPct} canAgree={can.agree && !w}
            onMargin={m => commit({ ...cap, vMarginPct: m })} onPick={pick} />
          <CapacitySheet r={sec.res} v={vCurve(sec.res, cap.vMarginPct)} target={sec.target} study={study}
            {...(can.edit ? { onUse: (id: string, cycleSec: number) => patchStation(id, { cycleSec, perCycle: 1, rate: undefined, source: 'standard', note: 'standard time, from the line balance' }) } : {})} />
        </section>
      ))}
      {r.ok.length > 0 && <LabourBox r={r} cap={cap} current={current} {...(w ? { w } : {})} rAsRun={asRun} li={labourInputs(cap, mapPeople, lineWs)} canEdit={can.edit && !w}
        onSave={labour => commit({ ...cap, labour })} onMore={(id, crew) => {
          /* The person added is one more on the line too, so the cost a pack after it counts them. */
          const li = labourInputs(cap, mapPeople, lineWs);
          commit({ ...cap, stations: cap.stations.map(s => (s.id === id ? { ...s, crew } : s)), labour: { ...cap.labour, ...(li.people ? { people: li.people + 1 } : {}) } });
        }} />}
      {r.ok.length > 0 && !r.lanes && (() => { const acc = accumulation(r, stats); return acc.sentence ? <p className={'vc-says cap-acc' + (acc.rows.some(p => !p.covered) ? ' is-a' : '')}>{acc.sentence}</p> : null; })()}
      {walk && r.ok.length > 0 && <ShiftCapacityView r={r} inputs={shiftIn} />}
      {walk && !w && <BottleneckWalk standardId={walk.standardId} product={walk.product} {...(line.workspaceId ? { workspaceId: line.workspaceId } : {})} {...(projectId ? { projectId } : {})}
        stations={r.ok.map(x => x.station.name.trim() || `Station ${x.index + 1}`)} {...(r.limit ? { calculated: r.limit.station.name.trim() || `Station ${r.limit.index + 1}` } : {})} canEdit={can.edit} />}

      {(check || r.notes.length > 0) && (
        <ul className="cap-notes" role="note">
          {check && <li className="is-check"><b>Check this.</b> {check}</li>}
          {r.notes.map(n => <li key={n}>{n}</li>)}
        </ul>
      )}

      {/* THE DOOR TO THE WORK. As run: raise an action on the limit. A what-if:
          make it so — the action carries the prediction as its why. Only
          where there is a board to raise it on (a 6M line). */}
      {!board ? null : w ? (
        w.action && !gone ? (
          <p className="action-raised" role="status">
            <Icon name="flag" size="1.15em" /> On the board{made ? <> — <b>{made.state === 'done' ? `done${made.doneOn ? ` on ${niceDay(made.doneOn)}` : ''}` : made.state === 'waiting' ? 'waiting' : 'to do'}</b>{made.who ? ` · ${made.who}` : ''}{made.due ? ` · due ${niceDay(made.due)}` : ''}</> : null}.
            {made?.state === 'done' && <> The line’s numbers either side of that day judge it — see <b>Did it work?</b> on the project.</>}
            <button className="linkish" onClick={() => nav(`/project/${projectId}/board`)}>See it on the board ›</button>
          </p>
        ) : raised ? (
          <p className="action-raised" role="status"><Icon name="flag" size="1.15em" /> Action raised — <button className="linkish" onClick={() => nav(`/project/${projectId}/board`)}>See it on the board ›</button></p>
        ) : !can.edit ? null : !asking ? (
          <>
          {gone && <p className="sub" role="status">The action made from this what-if has been deleted from the board.</p>}
          {/* Not until the line as run can be counted: there is no prediction
              to carry yet, and it put "Finish the line as it runs first" on
              the board as the action's why. */}
          <button className="board-cta" onClick={openMake} disabled={!compare || r.line == null || asRun.line == null}>
            <span className="board-cta-ic" aria-hidden><Icon name="flag" size="1em" /></span>
            <span className="board-cta-main">Make it so — put {w.name} on the board, with this prediction as its why</span>
            <span className="board-cta-go" aria-hidden>›</span>
          </button>
          </>
        ) : (
          <div className="card action-form">
            <div className="field-label"><Icon name="flag" size="1.15em" /> Make it so — <b>{w.name}</b></div>
            <textarea className="text-area" autoFocus rows={2} maxLength={300} value={what} onChange={e => setWhat(e.target.value)} />
            <p className="sub cap-why">Why, as the board will show it: {compare}</p>
            <div style={{ marginTop: 8 }}><BoneChips value={pillar} onChange={k => { if (k) setPillar(k); }} /></div>
            <div className="row-inline" style={{ marginTop: 8 }}>
              <input className="text-input" value={owner} placeholder="Owner (who drives it)" maxLength={80} onChange={e => setOwner(e.target.value)} />
              <input className="text-input due-input" type="date" value={due} aria-label="Due date" onChange={e => setDue(e.target.value)} />
              <button className="btn btn-primary" onClick={() => void raise()} disabled={!what.trim()}>Raise</button>
              <button className="btn btn-ghost" onClick={() => setAsking(false)}>Cancel</button>
            </div>
          </div>
        )
      ) : limit && can.edit && (
        raised ? (
          <p className="action-raised" role="status">
            <Icon name="flag" size="1.15em" /> Action raised on <b>{limit.station.name.trim()}</b> — it is on the project’s board with this sentence as its why.
            <button className="linkish" onClick={() => nav(`/project/${projectId}/board`)}>See it on the board ›</button>
          </p>
        ) : !asking ? (
          <button className="board-cta" onClick={openRaise}>
            <span className="board-cta-ic" aria-hidden><Icon name="flag" size="1em" /></span>
            <span className="board-cta-main">Raise an action on {limit.station.name.trim() || 'the limit'}</span>
            <span className="board-cta-go" aria-hidden>›</span>
          </button>
        ) : (
          <div className="card action-form">
            <div className="field-label"><Icon name="flag" size="1.15em" /> Action on <b>{limit.station.name.trim()}</b></div>
            <textarea className="text-area" autoFocus rows={2} maxLength={300} value={what} onChange={e => setWhat(e.target.value)} />
            <div style={{ marginTop: 8 }}><BoneChips value={pillar} onChange={k => { if (k) setPillar(k); }} /></div>
            <div className="row-inline" style={{ marginTop: 8 }}>
              <input className="text-input" value={owner} placeholder="Owner (who drives it)" maxLength={80} onChange={e => setOwner(e.target.value)} />
              <input className="text-input due-input" type="date" value={due} aria-label="Due date" onChange={e => setDue(e.target.value)} />
              <button className="btn btn-primary" onClick={() => void raise()} disabled={!what.trim()}>Raise</button>
              <button className="btn btn-ghost" onClick={() => setAsking(false)}>Cancel</button>
            </div>
          </div>
        )
      )}

      {r.ok.length > 0 && (
        <Fold id="cap-working" title="The working" says={`${r.ok.length} station${r.ok.length === 1 ? '' : 's'} counted, in ${r.unit} a minute`} start={false}>
          <Working r={r} />
        </Fold>
      )}
      </div>
    </section>
  );
}

/* The arithmetic, shown. Anybody who doubts a bar can follow it with a calculator. */
function Working({ r }: { r: ReturnType<typeof analyse> }) {
  const row = (x: StationResult) => {
    const s = x.station;
    const speed = s.rate != null ? `${fmtN(s.rate)} ${s.unit} ${PER_WORD[s.ratePer ?? 'min']}` : cycleWords(s.perCycle ?? 0, s.cycleSec ?? 0, s.unit);
    return (
      <tr key={s.id}>
        <th scope="row">{s.name.trim() || `Station ${x.index + 1}`}</th>
        <td>{speed}</td>
        <td>× {fmtN(s.crew ?? 1)}</td>
        <td>× {fmtN(x.factor)} {r.unit} each</td>
        <td className="is-num">{fmtN(x.running)}</td>
        <td>{s.runningPct != null && s.runningPct < 100 ? `× ${fmtN(s.runningPct)}%` : '—'}</td>
        <td className="is-num"><b>{fmtN(x.effective)}</b></td>
        <td className="is-num">{x.arrives != null ? `${fmtN(x.arrives)} ${s.unit.trim()}` : '—'}</td>
        <td className="is-num">{fmtN(x.does)} {s.unit.trim()}</td>
      </tr>
    );
  };
  return (
    <div className="cap-working">
      <table>
        <thead><tr><th /><th>speed</th><th>crew</th><th>to the line’s unit</th><th>running</th><th>stops</th><th>with stops</th><th>arrives, its unit</th><th>does, its unit</th></tr></thead>
        <tbody>{r.ok.map(row)}</tbody>
      </table>
      <p className="sub">
        Each figure is in {r.unit} a minute at the start of the line. Where a station before it rejects some, everything after sees less,
        and its figure is put back to match. Buffers between stations hide short stops, so the line can do slightly better than the smallest
        number here — which is why it is a screen and not a promise.
      </p>
      {r.skipped.length > 0 && (
        <ul className="cap-notes">
          {r.skipped.map(x => <li key={x.station.id}>{x.station.name.trim() || `Station ${x.index + 1}`} is not counted: {x.why}.</li>)}
        </ul>
      )}
    </div>
  );
}
