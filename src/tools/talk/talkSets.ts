/* LINE TALK'S TOOLSETS — a talk can be a walk that makes a report, or a walk that makes a tool's own diagram
 * (docs/LINE-TALK-TOOLSETS.md; knowledge/specs/FC-202-toolsets.md).
 *
 * Rowland, 6 November: "a flow diagram while I'm talking, a spaghetti diagram, the value stream … as I talk it generates the
 * same report." A SET says what the assistant listens for (its instructions), what it answers with besides its reply (its
 * capture, a small closed schema of its own — a large grammar is refused by the API) and how that capture is read and checked.
 * The assistant WRITES DOWN what was said, in the tool's terms; it never works out a figure and it never keeps a record: the
 * draft is drawn by the tool's own code, and made on a tap.
 *
 * Shared word for word with the gateway (scripts/sync-assist.mjs copies it into supabase/functions/assist/talk), so it is
 * self-contained: no imports, Deno-safe. Adding a set is one entry here plus its mapping and preview in the app. */

/** The sets built. 'walk' is the general walk that writes documents — what Line Talk always was. */
export const TALK_SETS = ['walk', 'flow', 'spag'] as const;
export type TalkSet = typeof TALK_SETS[number];

export const SET_WORD: Record<TalkSet, { name: string; says: string }> = {
  walk: { name: 'Walk & report', says: 'Talk the walk; ask for a report, a summary or a punch list.' },
  flow: { name: 'Flow diagram', says: 'Say the path step by step; the process flow chart draws itself.' },
  spag: { name: 'Spaghetti diagram', says: 'Say who walks where, place by place; the spaghetti diagram draws itself.' },
};

/** A set the wire names, else the general walk. */
export const setOf = (v: unknown): TalkSet => TALK_SETS.find(k => k === v) ?? 'walk';

/* ------------------------------------------------------------------ the flow diagram */

/** The five ASME classes (the process flow chart's own list — tools/flow/processFlow FLOW_KINDS; a unit test holds them equal). */
export const CAPTURE_FLOW_KINDS = ['operation', 'transport', 'inspection', 'delay', 'storage'] as const;
export type CaptureFlowKind = typeof CAPTURE_FLOW_KINDS[number];

/** One step as it was said. min and m are null when they were not said — never estimated. */
/** `said` is the time and distance as the person said them ("90 seconds, 40 metres") — shown beside the converted figures and checked against what was said; a person's edit drops it. */
export interface FlowCaptureStep { what: string; kind: CaptureFlowKind; min?: number; m?: number; said?: string }
export interface FlowCapture { set: 'flow'; title: string; steps: FlowCaptureStep[] }

/* ------------------------------------------------------------------ the spaghetti diagram */

/** One place a walker went to. `m` is the metres walked INTO it from the place before, only if said; the walker's first place has none. */
export interface SpagCaptureStep { place: string; m?: number; said?: string }
export interface SpagCaptureWalker { label: string; steps: SpagCaptureStep[] }
export interface SpagCapture { set: 'spag'; title: string; walkers: SpagCaptureWalker[] }
export type TalkCapture = FlowCapture | SpagCapture;

/** The most walkers and places a diagram holds (the calculator's boxes — a unit test holds these equal to tools/spaghetti/walkers). */
export const SPAG_WALKERS_MAX = 4;
export const SPAG_STEPS_MAX = 12;

/** The most steps a chart holds (the calculator's slots). */
export const FLOW_STEPS_MAX = 24;

export const FLOW_INSTRUCTIONS = `THIS TALK IS A FLOW DIAGRAM — the person is walking one thing's path and saying it, step by step; Faultline draws the process flow chart (ASME) from the "capture" you keep.
What you do: listen for the steps in the order they happen, and keep the whole path so far in "capture" every time you answer — all the steps, not only the new ones. Faultline works out every total and draws the chart; you only write down what was said.
- "title": what is being followed, in a few words ("Tray, oven to despatch pallet"). If not said yet, "".
- Each step: "what" in the floor's own words, short; "kind", one of operation (the thing is changed — made, cooked, cut, packed, wrapped), transport (it is moved), inspection (it is checked or weighed), delay (it waits unplanned — waiting for a forklift, a queue), storage (it is held by design — a chiller, a store, a rack); "time" and "timeUnit" for how long it takes, "dist" and "distUnit" for how far it moves — ONLY a transport has a distance.
- Write a time or a distance exactly as it was said, with the unit as said: "90 seconds" is time 90, timeUnit "seconds"; "half an hour" is time 0.5, timeUnit "hours"; "about 40 metres" is dist 40, distUnit "metres"; "ten feet" is dist 10, "feet". Faultline converts the units. NEVER convert, add up or estimate anything yourself.
- NEVER make up a time or a distance. If they did not say how long or how far, "time" and "dist" are null and their units "".
- If you cannot tell what kind a step is, do NOT put it in the capture yet — ask, in your reply, the one short question that classes it ("Is the wait for the pallet planned, or does it just happen?"). A step the person has not finished saying is not a step yet.
- Keep their order. If they go back and correct a step, correct that step. If something they said no longer fits, take it out and say so in the reply. At most ${FLOW_STEPS_MAX} steps; if there are more, say the chart holds ${FLOW_STEPS_MAX} and offer a second chart.
- The person may have changed the chart themselves: "THE DIAGRAM SO FAR" in Faultline's records is their version — build on it, never on your memory of it.
- "document" is not used in this talk: leave the report for a Walk & report talk. Your "reply" is the conversation: short, and ask the one question that moves the chart on (a missing time, a missing distance, a step's class). Never list what is missing.`;

/** What the assistant is told in this set, after the general instructions. */
export const SPAG_INSTRUCTIONS = `THIS TALK IS A SPAGHETTI DIAGRAM — the person is following one or more people (or a truck) around the line and saying where each goes, place by place; Faultline draws the spaghetti diagram from the "capture" you keep.
What you do: listen for who goes where, in the order they go, and keep the whole picture so far in "capture" every time you answer — all the walkers and all their places, not only the new ones. Faultline works out the moves, the metres, who walks most and where the paths cross; you only write down what was said.
- "title": what is being followed, in a few words ("Packing line operators"). If not said yet, "".
- "walkers": one for each person followed (at most ${SPAG_WALKERS_MAX}), each with a "label" — "Operator 1", "the forklift driver", a role. NEVER a person's name: if a name is said, use a role or a number and say you did. A walker's "steps" are the places they go to, in order, the first being where they start. Name a place as the floor names it ("film store", "wrapper", "packing line") and use one spelling for one place, in every walker.
- "dist" and "distUnit": the distance walked INTO that place from the one before, ONLY if it was said, exactly as said — "about 40 metres" is dist 40, distUnit "metres"; "ten feet" is dist 10, "feet". Faultline converts the units. NEVER convert, add up, estimate or fill in a distance. If it was not said, "dist" is null and "distUnit" is "". A walker's first step has no distance.
- "back to the line" or "back to where he started" is another step, to that place again — write it as a step.
- If you cannot tell which person a move belongs to, or which place is meant, do NOT guess: ask the one short question in your reply ("Was that Operator 2 or 3?"). A move the person has not finished saying is not a step yet.
- Keep their order. If they go back and correct something, correct it. If something they said no longer fits, take it out and say so. At most ${SPAG_STEPS_MAX} places a walker; if there are more, say the diagram holds ${SPAG_STEPS_MAX} and offer a second diagram.
- Small motions are the same: a forklift driver moving a box from one area to another is a walker whose places are the areas, however close together.
- The person may have changed the diagram themselves: "THE DIAGRAM SO FAR" in Faultline's records is their version — build on it, never on your memory of it.
- "document" is not used in this talk: leave the report for a Walk & report talk. Your "reply" is the conversation: short, and ask the one question that moves the diagram on (who went there, how far). Never list what is missing.`;

export const SET_INSTRUCTIONS: Record<TalkSet, string> = { walk: '', flow: FLOW_INSTRUCTIONS, spag: SPAG_INSTRUCTIONS };

const NUM_OR_NULL = { anyOf: [{ type: 'number' }, { type: 'null' }] } as const;

/** The flow set's answer: the capture and the reply — small and closed. */
export const FLOW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['capture', 'reply'],
  properties: {
    capture: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'steps'],
      properties: {
        title: { type: 'string' },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['what', 'kind', 'time', 'timeUnit', 'dist', 'distUnit'],
            properties: {
              what: { type: 'string' },
              kind: { type: 'string', enum: [...CAPTURE_FLOW_KINDS] },
              time: NUM_OR_NULL,
              timeUnit: { type: 'string', enum: ['', 'seconds', 'minutes', 'hours'] },
              dist: NUM_OR_NULL,
              distUnit: { type: 'string', enum: ['', 'metres', 'feet', 'yards', 'kilometres'] },
            },
          },
        },
      },
    },
    reply: { type: 'string' },
  },
} as const;

/** The spaghetti set's answer: the capture and the reply — small and closed. */
export const SPAG_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['capture', 'reply'],
  properties: {
    capture: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'walkers'],
      properties: {
        title: { type: 'string' },
        walkers: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['label', 'steps'],
            properties: {
              label: { type: 'string' },
              steps: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['place', 'dist', 'distUnit'],
                  properties: {
                    place: { type: 'string' },
                    dist: NUM_OR_NULL,
                    distUnit: { type: 'string', enum: ['', 'metres', 'feet', 'yards', 'kilometres'] },
                  },
                },
              },
            },
          },
        },
      },
    },
    reply: { type: 'string' },
  },
} as const;

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v: unknown, max: number): number | undefined => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max ? v : undefined);
const round3 = (n: number): number => Math.round(n * 1000) / 1000;
/** The only arithmetic on a said figure, done here and not by the assistant: units to minutes and to metres. */
const TO_MIN: Record<string, number> = { seconds: 1 / 60, minutes: 1, hours: 60 };
const TO_M: Record<string, number> = { metres: 1, feet: 0.3048, yards: 0.9144, kilometres: 1000 };

/** Keep a flow capture only as the schema says it: a step with a class, its words trimmed, a time or distance only if it is a sane number,
 *  metres only on a transport. The same reader the app and the gateway use. */
export function readFlowCapture(raw: unknown): FlowCapture | undefined {
  const o = raw && typeof raw === 'object' ? raw as Record<string, unknown> : null;
  if (!o) return undefined;
  const steps: FlowCaptureStep[] = [];
  for (const r of (Array.isArray(o.steps) ? o.steps : []).slice(0, FLOW_STEPS_MAX)) {
    const x = r && typeof r === 'object' ? r as Record<string, unknown> : {};
    const kind = CAPTURE_FLOW_KINDS.find(k => k === x.kind);
    if (!kind) continue;
    /* the gateway reads an answer and the app reads it again: a step already converted (min, m, said) reads as itself */
    const t = num(x.time, 1e6), d = num(x.dist, 1e6);
    /* a figure with no unit is read in the chart's own units (minutes, metres) */
    const min = t !== undefined ? round3(t * (TO_MIN[String(x.timeUnit)] ?? 1)) : num(x.min, 1e6);
    const m = kind === 'transport' ? (d !== undefined ? round3(d * (TO_M[String(x.distUnit)] ?? 1)) : num(x.m, 1e6)) : undefined;
    const said = t !== undefined || d !== undefined
      ? [t !== undefined ? `${t} ${TO_MIN[String(x.timeUnit)] ? String(x.timeUnit) : 'minutes'}` : '', kind === 'transport' && d !== undefined ? `${d} ${TO_M[String(x.distUnit)] ? String(x.distUnit) : 'metres'}` : ''].filter(Boolean).join(', ')
      : str(x.said, 80);
    steps.push({ what: str(x.what, 120) || `Step ${steps.length + 1}`, kind, ...(min !== undefined ? { min } : {}), ...(m !== undefined ? { m } : {}), ...(said ? { said } : {}) });
  }
  const title = str(o.title, 120);
  return title || steps.length ? { set: 'flow', title, steps } : undefined;
}

/** Keep a spaghetti capture only as the schema says it: walkers with a label (or a Walker n), places trimmed and named, a distance only if it is a sane number and
 *  never on a walker's first place. The same reader the app and the gateway use; a capture already read reads as itself. */
export function readSpagCapture(raw: unknown): SpagCapture | undefined {
  const o = raw && typeof raw === 'object' ? raw as Record<string, unknown> : null;
  if (!o) return undefined;
  const walkers: SpagCaptureWalker[] = [];
  for (const r of (Array.isArray(o.walkers) ? o.walkers : []).slice(0, SPAG_WALKERS_MAX)) {
    const w = r && typeof r === 'object' ? r as Record<string, unknown> : {};
    const steps: SpagCaptureStep[] = [];
    for (const q of (Array.isArray(w.steps) ? w.steps : []).slice(0, SPAG_STEPS_MAX)) {
      const x = q && typeof q === 'object' ? q as Record<string, unknown> : {};
      const place = str(x.place, 60);
      if (!place) continue;
      const first = steps.length === 0;
      const d = first ? undefined : num(x.dist, 1e6);
      const m = first ? undefined : d !== undefined ? round3(d * (TO_M[String(x.distUnit)] ?? 1)) : num(x.m, 1e6);
      const said = d !== undefined ? `${d} ${TO_M[String(x.distUnit)] ? String(x.distUnit) : 'metres'}` : first ? '' : str(x.said, 80);
      steps.push({ place, ...(m !== undefined ? { m } : {}), ...(said ? { said } : {}) });
    }
    const label = str(w.label, 40);
    if (label || steps.length) walkers.push({ label: label || `Walker ${walkers.length + 1}`, steps });
  }
  const title = str(o.title, 120);
  return title || walkers.length ? { set: 'spag', title, walkers } : undefined;
}

/** The schema for a set's answers — the walk's is TALK_SCHEMA in talkAssist (kept there, unchanged). */
export const SET_SCHEMA: Partial<Record<TalkSet, object>> = { flow: FLOW_SCHEMA, spag: SPAG_SCHEMA };

/** Read a capture off an answer for the set the talk is in. */
export function readCapture(set: TalkSet, raw: unknown): TalkCapture | undefined {
  return set === 'flow' ? readFlowCapture(raw) : set === 'spag' ? readSpagCapture(raw) : undefined;
}

/** A capture as words — how the person's version of the draft goes back to the assistant, and what a figure in it is checked against. */
export function captureAsText(c: TalkCapture): string {
  if (c.set === 'spag') {
    return [
      `[The spaghetti diagram so far: ${c.title || 'untitled'} — ${c.walkers.length} walker${c.walkers.length === 1 ? '' : 's'}]`,
      ...c.walkers.map(w => `${w.label}: ${w.steps.map((s, i) => `${s.place}${i === 0 ? ' (start)' : s.m !== undefined ? ` (${s.m} m)` : ' (no distance said)'}`).join(' → ') || 'no places yet'}`),
    ].join('\n');
  }
  return [
    `[The diagram so far: ${c.title || 'untitled'} — ${c.steps.length} step${c.steps.length === 1 ? '' : 's'}]`,
    ...c.steps.map((s, i) => `${i + 1}. ${s.what} — ${s.kind}${s.min !== undefined ? `, ${s.min} min` : ', no time said'}${s.kind === 'transport' ? (s.m !== undefined ? `, ${s.m} m` : ', no distance said') : ''}`),
  ].join('\n');
}

/** What a capture says in words — its title and the places or steps, with what was said beside them: what a figure in the answer is checked against. */
export function captureWords(c: TalkCapture): string[] {
  return c.set === 'spag'
    ? [c.title, ...c.walkers.flatMap(w => [w.label, ...w.steps.flatMap(s => [s.place, s.said ?? ''])])]
    : [c.title, ...c.steps.flatMap(x => [x.what, x.said ?? ''])];
}

/** How many steps (or, for a spaghetti diagram, moves) a capture holds — for the tab's count. */
export const captureCount = (c: TalkCapture): number => (c.set === 'spag' ? c.walkers.reduce((t, w) => t + Math.max(0, w.steps.length - 1), 0) : c.steps.length);
