// COPIED FROM src/lib/flow by scripts/sync-assist.mjs — edit the source, then run it.
/* A DESIGN IN PASSES, INSIDE THE TIME THE SERVER HAS — how the gateway
 * (supabase/functions/assist) asks for a method, without the network: the
 * `pass` it is handed sends one request and gives back the API's message.
 *
 * The whole proposal's schema is too large for the API to hold a model to
 * (lib/flow/proposal), so it is asked for in parts (19 October, the first
 * live design):
 *   1. the OUTLINE — every stage, step, gate, measure and need, each step
 *      without its boxes;
 *   2. the DETAIL of each stage's steps, every stage asked at once, each
 *      request naming the steps it must cover;
 *   3. a step its stage's detail left out asked for on its own, all at once
 *      — one stage of six gave one step of six on the first live run;
 * then joined into the one shape the app reads and checked by the validator.
 *
 * Everything happens before a deadline: an edge function on the free plan is
 * stopped at 150 seconds, and a design stopped there is lost with its cost
 * unrecorded. So each request is given the time that is left; the third
 * round is asked only while there is time for it; and a step still without
 * its detail is named, never hidden — the proposal comes back with it as an
 * empty step for the person to fill. */
import { DETAIL_SCHEMA, OUTLINE_SCHEMA, STEP_SCHEMA, joinDesign, withoutDetail } from './proposal.ts';
import { readJoined, readPass, type Read } from './assistCore.ts';

export type Turn = { role: 'user' | 'assistant'; content: string };
/** One request: the conversation, the schema the answer is held to, which
 *  pass it is and how long it may take. Gives back the API's message. */
export type Pass = (messages: Turn[], schema: unknown, o: { part: 'outline' | 'detail'; timeoutMs: number }) => Promise<unknown>;

export interface Clock {
  now: () => number;
  /** When the answer must be back by, as now() counts. */
  deadline: number;
}

/** The least time a round of detail is started with. */
export const DETAIL_ROUND_MS = 20_000;
/** The most steps asked for one by one, so a round that failed whole costs
 *  no more than a second round would. */
export const MOST_ALONE = 12;

const titles = (steps: readonly string[]) => steps.map((t, i) => `${i + 1}. ${t}`).join('; ');

/** What each stage's detail is asked with. */
export const stageAsk = (stage: string, steps: readonly string[]): string =>
  `Now the second part, for the stage “${stage}” only: the detail of each of its ${steps.length} steps, in order — ${titles(steps)} — each named by the stage and its title exactly as you wrote them: its fields, and for a log its columns, analyses and min_entries, and its only_if when it is needed only when an earlier step finds something. Give one entry for every one of those steps, none left out. A step with none of these gives empty lists, min_entries null and only_if all "". Every name a gate condition or a measure uses must be a field label or an analysis label given here. The same rules as before.`;

/** What a step left out is asked with. */
export const stepAsk = (stage: string, title: string): string =>
  `Now the detail of one step only: “${title}”, in the stage “${stage}” — its fields, and for a log its columns, analyses and min_entries, and its only_if when it is needed only when an earlier step finds something. A step with none of these gives empty lists, min_entries null and only_if all "". Every name a gate condition or a measure uses for this step must be a field label or an analysis label given here. The same rules as before.`;

export type Designed =
  | (Extract<Read, { ok: true }> & { messages: unknown[]; failed: unknown[]; requests: number; left: { stage: string; title: string }[] })
  | { ok: false; why: string; messages: unknown[]; failed: unknown[] };

const steps = (raw: unknown): unknown[] => {
  const s = raw && typeof raw === 'object' ? (raw as { steps?: unknown }).steps : undefined;
  return Array.isArray(s) ? s : [];
};

/** Design a method from what the person asked, in passes, before the deadline. */
export async function designInPasses(asked: string, pass: Pass, clock: Clock): Promise<Designed> {
  const messages: unknown[] = [], failed: unknown[] = [];
  const left = () => clock.deadline - clock.now();
  const first = await pass([{ role: 'user', content: asked }], OUTLINE_SCHEMA, { part: 'outline', timeoutMs: Math.max(1000, left() - DETAIL_ROUND_MS) });
  messages.push(first);
  const outline = readPass(first);
  if (!outline.ok) return { ok: false, why: outline.why, messages, failed };
  const said = JSON.stringify(outline.raw);
  const before: Turn[] = [{ role: 'user', content: asked }, { role: 'assistant', content: said }];

  /* one request; its failure (kept, for the gateway to charge) leaves the
     steps it was for without detail */
  let requests = 1;
  const ask = async (content: string, schema: unknown): Promise<unknown> => {
    requests++;
    try {
      const m = await pass([...before, { role: 'user', content }], schema, { part: 'detail', timeoutMs: Math.max(1000, left() - 1000) });
      messages.push(m);
      const r = readPass(m);
      return r.ok ? r.raw : undefined;
    } catch (e) { failed.push(e); return undefined; }
  };

  const stages = (Array.isArray((outline.raw as { stages?: unknown }).stages) ? (outline.raw as { stages: unknown[] }).stages : [])
    .flatMap(st => {
      const s = st && typeof st === 'object' ? st as { name?: unknown; steps?: unknown } : {};
      const names = (Array.isArray(s.steps) ? s.steps : []).map(sp => String((sp as { title?: unknown })?.title ?? '')).filter(Boolean);
      return names.length ? [{ name: String(s.name ?? ''), steps: names }] : [];
    });
  const detail: unknown[] = [];
  if (stages.length && left() > DETAIL_ROUND_MS) {
    for (const got of await Promise.all(stages.map(s => ask(stageAsk(s.name, s.steps), DETAIL_SCHEMA)))) detail.push(...steps(got));
  }
  let missing = withoutDetail(outline.raw, { steps: detail });
  if (missing.length && left() > DETAIL_ROUND_MS) {
    const alone = missing.slice(0, MOST_ALONE);
    const one = await Promise.all(alone.map(m => ask(stepAsk(m.stage, m.title), STEP_SCHEMA)));
    one.forEach((got, i) => { if (got && typeof got === 'object') detail.push({ ...(got as object), stage: alone[i].stage, title: alone[i].title }); });
    missing = withoutDetail(outline.raw, { steps: detail });
  }
  const read = readJoined(joinDesign(outline.raw, { steps: detail }));
  return read.ok ? { ...read, messages, failed, requests, left: missing } : { ...read, messages, failed };
}
