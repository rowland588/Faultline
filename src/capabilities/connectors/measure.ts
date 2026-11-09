/* LIVE MEASUREMENT — the Capture part of the tool connectors (10 November, docs/AI-OPERATING.md §4).
 *
 * Rowland, 10 November: "Sometimes I want to conduct a live observation, such as timing an operation, where the AI needs to launch
 * the appropriate measurement capability and capture actual observations"; and the decision: "confirm once when starting the
 * measurement. Once authorised, spoken events should be captured directly without individual confirmation cards. The user must be
 * able to correct, undo and review recorded events."
 *
 * A MEASUREMENT is one authorised session of one capture tool, kept on the AI Mode conversation (facts.measures). Each adapter below
 * writes EXACTLY what its tool's own capture screen writes when its buttons are pressed — the same record, the same fields, the same
 * db functions — so the tool's page (shown in the work pane), its figures, its Pareto and its paper read it as if it had been tapped:
 *   stops        Stops timed on the line (/w/:line/capture): a stop's stopwatch on the line (activeTimer), an observation when it runs
 *                again (CaptureScreen commit), or a count with no time
 *   reliability  a machine's watch (facts.watch) and its events (facts.events, RelEvent) — a timed count's stop closed by running again
 *   sampling     a moment taken now (tools/sampling takeNow) and each person's activity at it (facts.taps)
 *   changeover   SMED's lap: from the last good piece, each element ended as it is named (facts.sequence, ChangeoverStep, source timed)
 *   workstops    Stops across workstations: Stopped / Running again on a workstation adds its minutes and one stop (the calculator's
 *                StopTimer: wNN_min, wNN_stops, stoplog) — its running timer the same device key the page's button reads
 * Every event is kept on the session with the record it wrote (`ref`), so it can be reviewed, undone (struck, its write taken back
 * the way the tool's own Undo does) or corrected (the old one undone, the new one written at the same moment). Nothing is deleted
 * that the tool itself would not take back; no figure is worked out here — the tools work out what the events mean. */
import { addObservation, getStudy, getWorkspace, listObservations, patchStudy, patchWorkspaceRecord, putStudy, softDeleteObservation } from '../../db';
import type { Observation, Workspace } from '../../types';
import type { ChangeoverSide, ChangeoverStep, RelEvent, ToolStudy } from '../../lib/study';
import { started, stopped } from '../../tools/reliability/lineWatch';
import { countersOf } from '../../tools/reliability/reliability';
import { takeNow } from '../../tools/sampling/sampling';
import { newChangeoverStudy } from '../../tools/changeover/changeover';
import { calcByKey } from '../../tools/calc/registry';
import { newCalcStudy } from '../../tools/calc/calc';
import { wid, MAX_STATIONS } from '../../tools/calc/defs/workstation-stops';
import { studyHref, studyTitle } from '../../lib/studyLinks';
import { shiftAtTime } from '../../lib/shifts';
import { uid } from '../../lib/ids';

export const MEASURE_TOOLS = ['stops', 'reliability', 'sampling', 'changeover', 'workstops'] as const;
export type MeasureTool = typeof MEASURE_TOOLS[number];

/** One thing captured in a session — what was said, when, and the record it wrote (to review, undo or correct it). */
export interface MeasureEvent {
  id: string;
  /** When it happened — the moment the words were heard, not when the reply came. */
  at: number;
  event: string;
  /** In words, as the review lists it: "Wrapper — film break, stopped". */
  says: string;
  /** What it wrote: an observation's id, an event's id, a step's id, a tap's id, a workstation's add. */
  ref?: { kind: 'obs' | 'timer' | 'relEvent' | 'relFix' | 'tap' | 'moment' | 'step' | 'ws'; id: string; field?: string; add?: number; stops?: number; log?: string };
  input?: CaptureInput;
  struck?: boolean;
}
export interface Measurement {
  id: string;
  tool: MeasureTool;
  label: string;
  lineId?: string;
  studyId?: string;
  machine?: string;
  startedAt: number;
  endedAt?: number;
  events: MeasureEvent[];
  /** What is running now: a SMED element since a moment; workstations stopped since moments. */
  open?: { since?: number; ws?: Record<string, number> };
  threadId?: string;
}

/** What a captured event says — the fields each tool reads (the colleague gives only what was said). */
export interface CaptureInput {
  event: string;
  machine?: string;
  reason?: string;
  /** reliability: which thing counted, by its name ("stop", "failure"). */
  count?: string;
  who?: string;
  activity?: string;
  /** sampling: several people at one moment — "Op 1 working, Op 2 waiting". */
  people?: { who: string; activity: string }[];
  /** changeover: the element that has just ended, in the floor's words. */
  name?: string;
  side?: ChangeoverSide;
  workstation?: string;
  note?: string;
}

/** What a session may be started with — only what was said. */
export interface StartInput {
  tool: MeasureTool;
  lineId?: string;
  studyId?: string;
  machine?: string;
  name?: string;
  /** reliability: the things counted, by name — "stop", "failure". */
  counts?: string[];
  /** sampling: the people watched and what a tap can say. */
  who?: string[];
  activities?: string[];
  /** changeover: from and to products. */
  from?: string;
  to?: string;
  /** workstops: the workstations' names. */
  workstations?: string[];
}

export interface CaptureAdapter {
  tool: MeasureTool;
  /** The tool's name on screen. */
  label: string;
  /** What it captures, for the colleague (the catalogue says the rest). */
  says: string;
  /** The events it takes, each with what it needs. */
  events: { event: string; says: string; needs?: (keyof CaptureInput)[] }[];
  needsLine: boolean;
  /** Start, or carry on, a session: the record (made through the tool's own maker when there is none), its clock started. */
  start(input: StartInput, at: number, me?: string): Promise<{ ok: true; m: Measurement; says: string; href: string } | { ok: false; why: string }>;
  record(m: Measurement, ev: CaptureInput, at: number, me?: string): Promise<{ ok: true; m: Measurement; says: string; event: MeasureEvent } | { ok: false; why: string }>;
  /** Take back what an event wrote. */
  undo(m: Measurement, e: MeasureEvent): Promise<{ ok: true; m: Measurement; says: string } | { ok: false; why: string }>;
  end(m: Measurement, at: number): Promise<{ ok: true; m: Measurement; says: string }>;
  /** Where the work is seen: the tool's own page for the session. */
  href(m: Measurement): string;
}

const same = (a: string | undefined, b: string | undefined): boolean => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
const clockOf = (ms: number): string => { const s = Math.max(0, Math.round(ms / 1000)); return s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`; };
const hm = (t: number): string => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const withEvent = (m: Measurement, e: MeasureEvent, open?: Measurement['open']): Measurement => ({ ...m, events: [...m.events, e], ...(open !== undefined ? { open } : {}) });

/* ================================================================== Stops timed */
const stops: CaptureAdapter = {
  tool: 'stops', label: 'Stops timed', needsLine: true,
  says: 'Every stop on the line with a stopwatch — which machine, why, and how long — for the Pareto and the loss count.',
  events: [
    { event: 'stopped', says: 'a machine has stopped — its stopwatch starts', needs: ['machine', 'reason'] },
    { event: 'running', says: 'it runs again — the stop is kept with its time' },
    { event: 'count', says: 'a stop counted with no time (it was over before it could be timed)', needs: ['machine', 'reason'] },
  ],
  async start(input, at) {
    if (!input.lineId) return { ok: false, why: 'Say which line the stops are timed on.' };
    const ws = await getWorkspace(input.lineId);
    if (!ws) return { ok: false, why: 'That line is not on this device.' };
    const m: Measurement = { id: uid(), tool: 'stops', label: `Stops timed on ${ws.name}`, lineId: ws.id, ...(input.machine ? { machine: input.machine } : {}), startedAt: at, events: [] };
    const running = ws.activeTimer ? ` A stop is already being timed — ${ws.activeTimer.asset}, ${ws.activeTimer.category}, since ${hm(ws.activeTimer.startedAt)}.` : '';
    return { ok: true, m, says: `Timing stops on ${ws.name} from ${hm(at)}.${running}`, href: `/w/${ws.id}/capture` };
  },
  async record(m, ev, at) {
    const ws = m.lineId ? await getWorkspace(m.lineId) : undefined;
    if (!ws) return { ok: false, why: 'The line is not on this device any more.' };
    const obs = (kind: Observation['timing'], start: number, end: number | undefined, category: string, asset: string, sub?: string): Observation => ({
      id: uid(), workspaceId: ws.id, category, ...(sub ? { subcategory: sub } : {}), asset, ...(shiftAtTime(ws.shifts, start) ? { shift: shiftAtTime(ws.shifts, start) as string } : {}),
      startedAt: start, ...(end !== undefined ? { endedAt: end } : {}), durationMs: end !== undefined ? Math.max(1000, end - start) : 0, timing: kind, count: 1,
      ...(ev.note ? { note: ev.note } : {}), media: [], createdAt: at, updatedAt: at,
    });
    if (ev.event === 'stopped') {
      const machine = ev.machine?.trim() || m.machine, reason = ev.reason?.trim();
      if (!machine || !reason) return { ok: false, why: 'A stop needs its machine and why it stopped — ask for the one not said.' };
      let closed = '';
      /* one stopwatch on the line at a time, as the capture screen: a stop still running is kept first, at this moment */
      if (ws.activeTimer) {
        const o = obs('stopwatch', ws.activeTimer.startedAt, at, ws.activeTimer.category, ws.activeTimer.asset, ws.activeTimer.subcategory);
        await addObservation(o);
        closed = ` (${ws.activeTimer.asset} — ${ws.activeTimer.category} was still running; kept at ${clockOf(at - ws.activeTimer.startedAt)})`;
      }
      await patchWorkspaceRecord(ws.id, { activeTimer: { category: reason, asset: machine, startedAt: at }, lastCategory: reason, lastAsset: machine } as Partial<Workspace>);
      const e: MeasureEvent = { id: uid(), at, event: 'stopped', says: `${machine} — ${reason}, stopped at ${hm(at)}`, ref: { kind: 'timer', id: String(at) }, input: ev };
      return { ok: true, m: withEvent(m, e), says: `Timing the stop: ${machine}, ${reason}, from ${hm(at)}${closed}.`, event: e };
    }
    if (ev.event === 'running') {
      const t = ws.activeTimer;
      if (!t) return { ok: false, why: 'No stop is being timed on this line just now.' };
      const o = obs('stopwatch', t.startedAt, at, t.category, t.asset, t.subcategory);
      await addObservation(o);
      await patchWorkspaceRecord(ws.id, { activeTimer: undefined } as Partial<Workspace>);
      const e: MeasureEvent = { id: uid(), at, event: 'running', says: `${t.asset} — ${t.category}: ${clockOf(o.durationMs)}`, ref: { kind: 'obs', id: o.id }, input: ev };
      return { ok: true, m: withEvent(m, e), says: `Kept: ${t.asset} stopped for ${clockOf(o.durationMs)} (${t.category}).`, event: e };
    }
    if (ev.event === 'count') {
      const machine = ev.machine?.trim() || m.machine, reason = ev.reason?.trim();
      if (!machine || !reason) return { ok: false, why: 'A stop needs its machine and why it stopped.' };
      const o = obs('instant', at, undefined, reason, machine);
      await addObservation(o);
      const e: MeasureEvent = { id: uid(), at, event: 'count', says: `${machine} — ${reason}, counted (no time)`, ref: { kind: 'obs', id: o.id }, input: ev };
      return { ok: true, m: withEvent(m, e), says: `Counted a stop on ${machine}: ${reason}.`, event: e };
    }
    return { ok: false, why: `Stops timed takes stopped, running or count — not “${ev.event}”.` };
  },
  async undo(m, e) {
    if (e.ref?.kind === 'obs') { await softDeleteObservation(e.ref.id); return { ok: true, m, says: `Taken back: ${e.says}.` }; }
    if (e.ref?.kind === 'timer' && m.lineId) {
      const ws = await getWorkspace(m.lineId);
      if (ws?.activeTimer && String(ws.activeTimer.startedAt) === e.ref.id) await patchWorkspaceRecord(ws.id, { activeTimer: undefined } as Partial<Workspace>);
      else {
        /* the stop was already kept — the observation that started at that moment goes */
        const o = (await listObservations(m.lineId)).find(x => String(x.startedAt) === e.ref?.id);
        if (o) await softDeleteObservation(o.id);
      }
      return { ok: true, m, says: `Taken back: ${e.says}.` };
    }
    return { ok: false, why: 'That event wrote nothing that can be taken back.' };
  },
  async end(m, at) {
    const ws = m.lineId ? await getWorkspace(m.lineId) : undefined;
    const kept = m.events.filter(e => !e.struck && (e.event === 'running' || e.event === 'count')).length;
    const still = ws?.activeTimer ? ` A stop is still being timed (${ws.activeTimer.asset} — ${ws.activeTimer.category}); say “running” to keep it, or it stays timing on the line.` : '';
    return { ok: true, m: { ...m, endedAt: at }, says: `Stopped timing. ${kept} stop${kept === 1 ? '' : 's'} kept in this session — Stops timed and its Pareto show them.${still}` };
  },
  href: m => `/w/${m.lineId}/capture`,
};

/* ================================================================== Reliability */
const reliability: CaptureAdapter = {
  tool: 'reliability', label: 'Reliability', needsLine: false,
  says: 'A machine watched with its clock running: each stop or failure tapped as it happens — MTBF, failure rate and, for a timed count, how long each takes to fix.',
  events: [
    { event: 'event', says: 'one of the things counted has happened (a stop, a failure)', needs: ['count'] },
    { event: 'running', says: 'a timed stop is over — the machine runs again' },
    { event: 'pause', says: 'stop the watch (not watching for now)' },
    { event: 'resume', says: 'start the watch again' },
  ],
  async start(input, at, me) {
    let s = input.studyId ? await getStudy(input.studyId) : undefined;
    if (input.studyId && (!s || s.tool !== 'reliability' || s.deletedAt)) return { ok: false, why: 'That is not a reliability study on this device.' };
    if (!s) {
      const machine = input.machine?.trim();
      if (!machine) return { ok: false, why: 'Say which machine is watched.' };
      const names = (input.counts?.length ? input.counts : ['stop']).map(x => x.trim()).filter(Boolean).slice(0, 6);
      s = { id: uid(), tool: 'reliability', name: input.name?.trim() || `${machine} — ${names.join(' and ')}s`, machine, ...(input.lineId ? { workspaceId: input.lineId } : {}),
        agreed: { reliability: { counts: names.map(n => ({ id: uid(), name: n })) } }, facts: { watch: [], events: [] }, uses: [], startedAt: at, createdAt: at, updatedAt: at } as ToolStudy;
      await putStudy(s);
    }
    await patchStudy(s.id, cur => ({ facts: { ...cur.facts, watch: started(cur.facts.watch, at, uid(), me) } }));
    const counts = countersOf(s.agreed?.reliability).map(c => c.event);
    const m: Measurement = { id: uid(), tool: 'reliability', label: `Watching ${s.machine ?? s.name}`, studyId: s.id, ...(s.workspaceId ? { lineId: s.workspaceId } : {}), ...(s.machine ? { machine: s.machine } : {}), startedAt: at, events: [] };
    return { ok: true, m, says: `The watch on ${s.machine ?? s.name} is running from ${hm(at)}. Counting: ${counts.join(', ') || 'stops'}.`, href: studyHref(s) };
  },
  async record(m, ev, at, me) {
    const s = m.studyId ? await getStudy(m.studyId) : undefined;
    if (!s) return { ok: false, why: 'The study is not on this device any more.' };
    const counters = countersOf(s.agreed?.reliability);
    if (ev.event === 'pause' || ev.event === 'resume') {
      await patchStudy(s.id, cur => ({ facts: { ...cur.facts, watch: ev.event === 'pause' ? stopped(cur.facts.watch, at) : started(cur.facts.watch, at, uid(), me) } }));
      const e: MeasureEvent = { id: uid(), at, event: ev.event, says: ev.event === 'pause' ? `Watch stopped at ${hm(at)}` : `Watch started again at ${hm(at)}`, input: ev };
      return { ok: true, m: withEvent(m, e), says: e.says + '.', event: e };
    }
    if (ev.event === 'event') {
      const c = (ev.count ? counters.find(x => same(x.event, ev.count) || same(`${x.event}s`, ev.count) || same(x.event, ev.count?.replace(/s$/, ''))) : counters[0]);
      if (!c) return { ok: false, why: `This study counts ${counters.map(x => x.event).join(', ')} — say which one happened.` };
      const running = (s.facts.watch ?? []).some(w => !w.to && !w.struck);
      if (!running) await patchStudy(s.id, cur => ({ facts: { ...cur.facts, watch: started(cur.facts.watch, at, uid(), me) } }));
      const ev2: RelEvent = { id: uid(), at, ...(me ? { by: me } : {}), count: c.id, ...(ev.reason?.trim() ? { reason: ev.reason.trim() } : {}), ...(ev.note?.trim() ? { note: ev.note.trim() } : {}) };
      await patchStudy(s.id, cur => ({ facts: { ...cur.facts, events: [...(cur.facts.events ?? []), ev2] } }));
      const e: MeasureEvent = { id: uid(), at, event: 'event', says: `A ${c.event}${ev.reason ? ` — ${ev.reason}` : ''} at ${hm(at)}`, ref: { kind: 'relEvent', id: ev2.id }, input: ev };
      return { ok: true, m: withEvent(m, e), says: `Counted: a ${c.event}${ev.reason ? ` (${ev.reason})` : ''} at ${hm(at)}${c.timed ? ' — timing it until it runs again' : ''}.`, event: e };
    }
    if (ev.event === 'running') {
      const timedIds = new Set(counters.filter(c => c.timed).map(c => c.id));
      const open = [...(s.facts.events ?? [])].filter(x => !x.struck && x.count && timedIds.has(x.count) && x.fixedAt === undefined).sort((a, b) => b.at - a.at)[0];
      if (!open) return { ok: false, why: 'No timed stop is open on this machine — nothing to close.' };
      await patchStudy(s.id, cur => ({ facts: { ...cur.facts, events: (cur.facts.events ?? []).map(x => (x.id === open.id ? { ...x, fixedAt: Math.max(at, x.at + 1000) } : x)) } }));
      const e: MeasureEvent = { id: uid(), at, event: 'running', says: `Running again after ${clockOf(at - open.at)}`, ref: { kind: 'relFix', id: open.id }, input: ev };
      return { ok: true, m: withEvent(m, e), says: `Running again — that stop took ${clockOf(at - open.at)}.`, event: e };
    }
    return { ok: false, why: `Reliability takes event, running, pause or resume — not “${ev.event}”.` };
  },
  async undo(m, e) {
    if (!m.studyId) return { ok: false, why: 'No study.' };
    if (e.ref?.kind === 'relEvent') {
      const id = e.ref.id;
      /* struck, never erased — as the study's own list does */
      await patchStudy(m.studyId, cur => ({ facts: { ...cur.facts, events: (cur.facts.events ?? []).map(x => (x.id === id ? { ...x, struck: true } : x)) } }));
      return { ok: true, m, says: `Struck: ${e.says}.` };
    }
    if (e.ref?.kind === 'relFix') {
      const id = e.ref.id;
      await patchStudy(m.studyId, cur => ({ facts: { ...cur.facts, events: (cur.facts.events ?? []).map(x => { if (x.id !== id) return x; const { fixedAt: _f, ...rest } = x; void _f; return rest; }) } }));
      return { ok: true, m, says: 'Taken back: the stop is open again.' };
    }
    return { ok: false, why: 'A pause or restart of the watch is changed on the study’s own page (Every stretch).' };
  },
  async end(m, at) {
    if (m.studyId) await patchStudy(m.studyId, cur => ({ facts: { ...cur.facts, watch: stopped(cur.facts.watch, at) } }));
    const n = m.events.filter(e => !e.struck && e.event === 'event').length;
    return { ok: true, m: { ...m, endedAt: at }, says: `The watch is stopped at ${hm(at)}. ${n} event${n === 1 ? '' : 's'} counted in this session — the study works out the MTBF.` };
  },
  href: m => `/reliability/${m.studyId}`,
};

/* ================================================================== Work sampling */
const sampling: CaptureAdapter = {
  tool: 'sampling', label: 'Work sampling', needsLine: false,
  says: 'What each person is doing at a moment — a tap a person — for the shares of working, walking, waiting and the rest, with their margins.',
  events: [{ event: 'moment', says: 'what each person is doing right now', needs: ['people'] }],
  async start(input, at) {
    let s = input.studyId ? await getStudy(input.studyId) : undefined;
    if (input.studyId && (!s || s.tool !== 'sampling' || s.deletedAt)) return { ok: false, why: 'That is not a work sampling study on this device.' };
    if (!s) {
      const who = (input.who ?? []).map(x => x.trim()).filter(Boolean);
      if (!who.length) return { ok: false, why: 'Say who is watched — "Op 1, Op 2", the roles, never names.' };
      const activities = (input.activities?.length ? input.activities : ['working', 'walking', 'waiting', 'searching', 'away']).map(x => x.trim()).filter(Boolean);
      s = { id: uid(), tool: 'sampling', name: input.name?.trim() || 'Work sampling', ...(input.lineId ? { workspaceId: input.lineId } : {}),
        agreed: { sampling: { who, activities, marginPts: 5, from: at, to: at + 8 * 3_600_000, prompts: [], extra: [] } }, facts: { taps: [] }, uses: [], startedAt: at, createdAt: at, updatedAt: at } as ToolStudy;
      await putStudy(s);
    }
    const a = s.agreed?.sampling;
    const m: Measurement = { id: uid(), tool: 'sampling', label: `Sampling ${s.name}`, studyId: s.id, ...(s.workspaceId ? { lineId: s.workspaceId } : {}), startedAt: at, events: [] };
    return { ok: true, m, says: `Sampling ${s.name}: ${a?.who.join(', ')} — each moment said becomes a moment taken by hand, a tap a person (${a?.activities.join(', ')}).`, href: studyHref(s) };
  },
  async record(m, ev, at, me) {
    const s = m.studyId ? await getStudy(m.studyId) : undefined;
    const a = s?.agreed?.sampling;
    if (!s || !a) return { ok: false, why: 'The study is not on this device any more.' };
    const people = ev.people?.length ? ev.people : ev.who && ev.activity ? [{ who: ev.who, activity: ev.activity }] : [];
    if (ev.event !== 'moment' || !people.length) return { ok: false, why: 'A moment needs who and what each was doing.' };
    const bad = people.filter(p => !a.who.some(w => same(w, p.who)) || !a.activities.some(x => same(x, p.activity)));
    if (bad.length) return { ok: false, why: `This study watches ${a.who.join(', ')} and takes ${a.activities.join(', ')} — ${bad.map(b => `“${b.who}: ${b.activity}”`).join(', ')} is not one of them.` };
    const moment = Math.floor(at / 1000) * 1000;
    const taps = people.map(p => ({ id: uid(), at: moment, who: a.who.find(w => same(w, p.who)) as string, activity: a.activities.find(x => same(x, p.activity)) as string, ...(me ? { by: me } : {}) }));
    await patchStudy(s.id, cur => ({ agreed: { ...cur.agreed, sampling: takeNow(cur.agreed?.sampling ?? a, moment) }, facts: { ...cur.facts, taps: [...(cur.facts.taps ?? []), ...taps] } }));
    const e: MeasureEvent = { id: uid(), at: moment, event: 'moment', says: `${hm(moment)} — ${taps.map(t => `${t.who} ${t.activity}`).join(', ')}`, ref: { kind: 'moment', id: taps.map(t => t.id).join(',') }, input: ev };
    return { ok: true, m: withEvent(m, e), says: `Taken at ${hm(moment)}: ${taps.map(t => `${t.who} ${t.activity}`).join(', ')}.`, event: e };
  },
  async undo(m, e) {
    if (!m.studyId || e.ref?.kind !== 'moment') return { ok: false, why: 'Nothing to take back.' };
    const ids = new Set(e.ref.id.split(','));
    await patchStudy(m.studyId, cur => ({ facts: { ...cur.facts, taps: (cur.facts.taps ?? []).map(x => (ids.has(x.id) ? { ...x, struck: true } : x)) } }));
    return { ok: true, m, says: `Struck: ${e.says}.` };
  },
  async end(m, at) {
    const n = m.events.filter(e => !e.struck).length;
    return { ok: true, m: { ...m, endedAt: at }, says: `Sampling ended. ${n} moment${n === 1 ? '' : 's'} taken in this session — the study works out the shares and their margins.` };
  },
  href: m => `/sampling/${m.studyId}`,
};

/* ================================================================== SMED — the lap */
const changeover: CaptureAdapter = {
  tool: 'changeover', label: 'SMED', needsLine: false,
  says: 'A changeover timed element by element, from the last good piece to the first good piece at rate — each element ended as it is named.',
  events: [
    { event: 'begin', says: 'the last good piece — the changeover starts' },
    { event: 'element', says: 'the element just finished, by name (the next starts at once)', needs: ['name'] },
    { event: 'finish', says: 'the first good piece at rate — the last element ends', needs: ['name'] },
  ],
  async start(input, at) {
    let s = input.studyId ? await getStudy(input.studyId) : undefined;
    if (input.studyId && (!s || s.tool !== 'changeover' || s.deletedAt)) return { ok: false, why: 'That is not a SMED study on this device.' };
    if (!s) {
      s = newChangeoverStudy({ id: uid(), now: at, ...(input.from ? { from: input.from } : {}), ...(input.to ? { to: input.to } : {}), ...(input.lineId ? { workspaceId: input.lineId } : {}), ...(input.name ? { name: input.name } : {}) });
      await putStudy(s);
    }
    const m: Measurement = { id: uid(), tool: 'changeover', label: `Timing ${studyTitle(s)}`, studyId: s.id, ...(s.workspaceId ? { lineId: s.workspaceId } : {}), startedAt: at, events: [] };
    return { ok: true, m, says: `Ready to time ${studyTitle(s)} — say when the last good piece comes off, then name each element as it finishes.`, href: studyHref(s) };
  },
  async record(m, ev, at, me) {
    if (!m.studyId) return { ok: false, why: 'No study.' };
    if (ev.event === 'begin') {
      const e: MeasureEvent = { id: uid(), at, event: 'begin', says: `Last good piece at ${hm(at)}`, input: ev };
      return { ok: true, m: withEvent(m, e, { since: at }), says: `The changeover started at ${hm(at)} — name each element as it finishes.`, event: e };
    }
    if (ev.event === 'element' || ev.event === 'finish') {
      const since = m.open?.since;
      if (since === undefined) return { ok: false, why: 'The clock is not running — say when the last good piece came off first.' };
      const name = ev.name?.trim() || (ev.event === 'finish' ? 'Run-up to the first good piece' : '');
      if (!name) return { ok: false, why: 'Name the element that has just finished.' };
      const step: ChangeoverStep = { id: uid(), order: 0, name, side: ev.side ?? 'internal', sec: +((at - since) / 1000).toFixed(1), source: 'timed', at, ...(me ? { who: me } : {}), ...(ev.who?.trim() ? { crew: [ev.who.trim()] } : {}) };
      await patchStudy(m.studyId, cur => {
        const seq = cur.facts.sequence ?? [];
        return { facts: { ...cur.facts, sequence: [...seq, { ...step, order: seq.reduce((n, x) => Math.max(n, x.order), -1) + 1 }] } };
      });
      const e: MeasureEvent = { id: uid(), at, event: ev.event, says: `${name} — ${clockOf(at - since)}${ev.who ? ` (${ev.who})` : ''}`, ref: { kind: 'step', id: step.id }, input: ev };
      const open = ev.event === 'finish' ? {} : { since: at };
      return { ok: true, m: withEvent(m, e, open), says: ev.event === 'finish' ? `The last element, ${name}, took ${clockOf(at - since)} — the changeover is timed; SMED adds it up.` : `${name}: ${clockOf(at - since)}. The next element is running.`, event: e };
    }
    return { ok: false, why: `SMED takes begin, element or finish — not “${ev.event}”.` };
  },
  async undo(m, e) {
    if (!m.studyId) return { ok: false, why: 'No study.' };
    if (e.ref?.kind === 'step') {
      const id = e.ref.id;
      await patchStudy(m.studyId, cur => ({ facts: { ...cur.facts, sequence: (cur.facts.sequence ?? []).filter(x => x.id !== id) } }));
      /* the latest element taken back: its time goes back to the one now running, as a lap undone does — the clock runs from where
         that element began (the event before it); an earlier one is only taken off the list */
      const live = m.events.filter(x => !x.struck && x.id !== e.id && (x.event === 'begin' || x.event === 'element' || x.event === 'finish'));
      const latest = !m.events.some(x => !x.struck && x.at > e.at && (x.event === 'element' || x.event === 'finish'));
      const before = live.filter(x => x.at < e.at).sort((a, b) => b.at - a.at)[0];
      return { ok: true, m: latest && before ? { ...m, open: { since: before.at } } : m, says: `Taken back: ${e.says}.` };
    }
    if (e.event === 'begin') return { ok: true, m: { ...m, open: {} }, says: 'Taken back: the changeover’s start.' };
    return { ok: false, why: 'Nothing to take back.' };
  },
  async end(m, at) {
    const n = m.events.filter(e => !e.struck && e.ref?.kind === 'step').length;
    return { ok: true, m: { ...m, endedAt: at, open: {} }, says: `Timing ended. ${n} element${n === 1 ? '' : 's'} timed in this session — SMED shows the grid, the stages and what the changeovers cost.` };
  },
  href: m => `/smed/${m.studyId}`,
};

/* ================================================================== Stops across workstations */
const WS_KEY = 'workstation-stops';
const wsIndex = (s: ToolStudy, name: string | undefined): number => {
  const v = s.agreed?.calc?.inputs ?? {};
  const n = Math.min(MAX_STATIONS, Math.max(0, Math.floor(Number(v.n) || 0)));
  const want = (name ?? '').trim().toLowerCase();
  if (!want) return -1;
  for (let i = 0; i < n; i++) {
    const nm = String(v[wid(i, 'name')] ?? '').trim().toLowerCase() || `workstation ${i + 1}`;
    if (nm === want || `workstation ${i + 1}` === want || String(i + 1) === want.replace(/^(workstation|station|ws)\s*/, '')) return i;
  }
  return -1;
};
/** The device key the calculator's own Stopped button reads (tools/calc/CalcForm StopTimer), so its page shows the stop running. */
const timerKey = (s: ToolStudy, field: string): string => `fl-stop:#${studyHref(s)}:${field}`;
const workstops: CaptureAdapter = {
  tool: 'workstops', label: 'Stops across workstations', needsLine: false,
  says: 'Several workstations watched at once: each stop timed on its workstation (Stopped, Running again) — the minutes, the stops and what they cost.',
  events: [
    { event: 'stopped', says: 'a workstation has stopped', needs: ['workstation'] },
    { event: 'running', says: 'it runs again — the minutes added to it', needs: ['workstation'] },
  ],
  async start(input, at) {
    let s = input.studyId ? await getStudy(input.studyId) : undefined;
    if (input.studyId && (!s || s.tool !== 'calc' || s.agreed?.calc?.key !== WS_KEY || s.deletedAt)) return { ok: false, why: 'That is not a Stops across workstations record on this device.' };
    if (!s) {
      const def = calcByKey(WS_KEY);
      const names = (input.workstations ?? []).map(x => x.trim()).filter(Boolean).slice(0, MAX_STATIONS);
      if (!def || !names.length) return { ok: false, why: 'Say the workstations watched — their names or how many.' };
      const inputs: Record<string, string | number> = { n: names.length };
      names.forEach((nm, i) => { inputs[wid(i, 'name')] = nm; });
      s = newCalcStudy(def, { id: uid(), name: input.name?.trim() || 'Stops across workstations', ...(input.lineId ? { workspaceId: input.lineId } : {}), now: at, inputs });
      await putStudy(s);
    }
    const m: Measurement = { id: uid(), tool: 'workstops', label: `Timing ${s.name}`, studyId: s.id, ...(s.workspaceId ? { lineId: s.workspaceId } : {}), startedAt: at, events: [], open: { ws: {} } };
    return { ok: true, m, says: `Timing stops on ${s.name} — say which workstation stops and when it runs again.`, href: studyHref(s) };
  },
  async record(m, ev, at) {
    const s = m.studyId ? await getStudy(m.studyId) : undefined;
    if (!s) return { ok: false, why: 'The record is not on this device any more.' };
    const i = wsIndex(s, ev.workstation);
    if (i < 0) return { ok: false, why: `There is no workstation “${ev.workstation ?? ''}” on ${s.name} — say its name or number.` };
    const name = String(s.agreed?.calc?.inputs?.[wid(i, 'name')] ?? '').trim() || `Workstation ${i + 1}`;
    const field = wid(i, 'min');
    const open = { ...(m.open?.ws ?? {}) };
    if (ev.event === 'stopped') {
      if (open[field] !== undefined) return { ok: false, why: `${name} is already stopped (since ${hm(open[field])}).` };
      open[field] = at;
      try { localStorage.setItem(timerKey(s, field), String(at)); } catch { /* the page shows it once it runs again */ }
      const e: MeasureEvent = { id: uid(), at, event: 'stopped', says: `${name} stopped at ${hm(at)}`, ref: { kind: 'timer', id: field }, input: ev };
      return { ok: true, m: withEvent(m, e, { ...m.open, ws: open }), says: `${name} stopped at ${hm(at)} — timing it.`, event: e };
    }
    if (ev.event === 'running') {
      const since = open[field] ?? (() => { try { const n = Number(localStorage.getItem(timerKey(s, field))); return n > 0 ? n : undefined; } catch { return undefined; } })();
      if (since === undefined) return { ok: false, why: `${name} is not stopped just now.` };
      delete open[field];
      try { localStorage.removeItem(timerKey(s, field)); } catch { /* fine */ }
      /* exactly the calculator's own Running again: the minutes to two places, one more stop, the moment in the log */
      const add = Math.round((at - since) / 600) / 100;
      const stopsF = wid(i, 'stops');
      await patchStudy(s.id, cur => {
        const c = cur.agreed?.calc;
        if (!c) return {};
        const inputs = { ...c.inputs };
        inputs[field] = Math.round(((Number(inputs[field]) || 0) + add) * 100) / 100;
        inputs[stopsF] = (Number(inputs[stopsF]) || 0) + 1;
        const prev = String(inputs.stoplog ?? '');
        inputs.stoplog = `${prev}${prev ? ';' : ''}${since}`;
        return { agreed: { ...cur.agreed, calc: { ...c, inputs } } };
      });
      const e: MeasureEvent = { id: uid(), at, event: 'running', says: `${name}: ${clockOf(at - since)} stopped`, ref: { kind: 'ws', id: field, field, add, stops: 1, log: String(since) }, input: ev };
      return { ok: true, m: withEvent(m, e, { ...m.open, ws: open }), says: `${name} ran again — ${add} min added to its stopped time.`, event: e };
    }
    return { ok: false, why: `Stops across workstations takes stopped or running — not “${ev.event}”.` };
  },
  async undo(m, e) {
    if (!m.studyId || !e.ref) return { ok: false, why: 'Nothing to take back.' };
    const s = await getStudy(m.studyId);
    if (!s) return { ok: false, why: 'The record is not on this device any more.' };
    if (e.ref.kind === 'timer') {
      const open = { ...(m.open?.ws ?? {}) };
      delete open[e.ref.id];
      try { localStorage.removeItem(timerKey(s, e.ref.id)); } catch { /* fine */ }
      return { ok: true, m: { ...m, open: { ...m.open, ws: open } }, says: `Taken back: ${e.says}.` };
    }
    if (e.ref.kind === 'ws' && e.ref.field) {
      const { field, add = 0, log } = e.ref;
      const stopsF = field.replace(/_min$/, '_stops');
      await patchStudy(s.id, cur => {
        const c = cur.agreed?.calc;
        if (!c) return {};
        const inputs = { ...c.inputs };
        inputs[field] = Math.max(0, Math.round(((Number(inputs[field]) || 0) - add) * 100) / 100);
        inputs[stopsF] = Math.max(0, (Number(inputs[stopsF]) || 0) - 1);
        if (log) inputs.stoplog = String(inputs.stoplog ?? '').split(';').filter(x => x && x !== log).join(';');
        return { agreed: { ...cur.agreed, calc: { ...c, inputs } } };
      });
      return { ok: true, m, says: `Taken back: ${e.says}.` };
    }
    return { ok: false, why: 'Nothing to take back.' };
  },
  async end(m, at) {
    const still = Object.keys(m.open?.ws ?? {}).length;
    const n = m.events.filter(e => !e.struck && e.event === 'running').length;
    return { ok: true, m: { ...m, endedAt: at }, says: `Timing ended. ${n} stop${n === 1 ? '' : 's'} added in this session${still ? `; ${still} workstation${still === 1 ? ' is' : 's are'} still stopped — its button on the page is still timing` : ''}.` };
  },
  href: m => `/calc/${WS_KEY}/${m.studyId}`,
};

export const CAPTURE_ADAPTERS: Record<MeasureTool, CaptureAdapter> = { stops, reliability, sampling, changeover, workstops };
export const adapterOf = (tool: string): CaptureAdapter | undefined => (MEASURE_TOOLS as readonly string[]).includes(tool) ? CAPTURE_ADAPTERS[tool as MeasureTool] : undefined;

/** The session's events as a review lists them: in order, struck ones said so. */
export const reviewOf = (m: Measurement): string[] => m.events.map((e, i) => `${i + 1}. ${e.says}${e.struck ? ' (taken back)' : ''}`);
