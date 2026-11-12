/* ASSIST — the gateway between Faultline and Claude. Its tasks:
 *
 *   video-label  the camera's AI: the video study's "Name the work from the
 *                frames" (docs/VIDEO.md);
 *   talk         Line Talk's assistant (docs/LINE-TALK.md, slice 2): the
 *                conversation — what was said, typed and photographed — with
 *                Faultline's records about the line, answered in words, and a
 *                document written when one is asked for;
 *   story        the Story's chapter drafted from its snapshot (docs/STORY.md §5);
 *   colleague    AI Mode's colleague (docs/AI-MODE.md, 8 November): the
 *                conversation, with Faultline's capabilities as Claude's tools —
 *                every call it proposes checked here against the capabilities'
 *                schemas (colleague/schemas, copied from src/capabilities), only
 *                the ones that pass sent to the device, which runs reads at once
 *                and writes only when the person confirms; every call proposed,
 *                refused and answered written to ai_actions (supabase/AI_ACTIONS.sql);
 *   brief-read   the client's brief typed out from photographs of its pages;
 *   brief-asks   what the brief asks for, each with its exact quote (STORY S6–S7);
 *   factory-read a factory document (an equipment register, an asset list, a layout) — its words or photographs of its
 *                pages — read for the sites, areas, lines and machines it names, each with the EXACT words it came from,
 *                every quote checked here against the words (colleague/factoryRead, docs/FACTORY-KNOWLEDGE.md F4).
 *
 * Rowland, 20 October: "a simple, reliable, ChatGPT-style manufacturing
 * assistant inside Faultline, powered by our existing Claude API
 * integration." Nothing else is served (the method builder's tasks went on
 * 20 October, docs/DIRECTION.md); asked for, they are refused in words.
 *
 * POST with the person's session →
 *   { task: 'video-label', objective, events, frames }
 *     → { ok: true, labels, model } | { ok: false, why } | { off: true, why }
 *   { task: 'talk', context, today, turns, images }   (lib/talkAssist TalkAsk)
 *     → { ok: true, answer, unsure, model } | { ok: false, why } | { off: true, why }
 *   { task: 'colleague', turns, images, focus, today, conversationId?, pending?, stream? }
 *     → { ok: true, reply, calls?, assistant?, suggestions?, unsure?, model } | { ok: false, why } | { off: true, why }
 *     (stream: true, 11 November → text/event-stream: { delta } the words as written, { restart } when a round is asked
 *     again here, then ONE event holding exactly the object above)
 *     (pending = { assistant: the `assistant` handed out last time, results: what running its calls gave })
 *   { task: 'brief-read', pages } → { ok: true, text, model };  { task: 'brief-asks', brief } → { ok: true, asks, model }
 *   { task: 'factory-read', text } | { task: 'factory-read', pages } → { ok: true, text, day?, dayQuote?, items, dropped, model }
 *   … with stream: true (the app, 21 October) → text/event-stream: the reply
 *     so far as it is written, { partial, document }, then the same final
 *     object — a refusal before the model is asked still comes as JSON
 *
 * THE RULES, every one kept here, server-side:
 *   - the key never leaves this function (ANTHROPIC_API_KEY, a Supabase
 *     secret — Rowland's; nothing breaks without it);
 *   - a signed-in person only — the session is checked before anything;
 *   - every request held to its limits before anything is sent on (the
 *     frames: video/visionCore; the talk: talk/talkAssist readAsk — its
 *     turns, words and pictures); the model is told never to identify anyone;
 *   - the instructions are the gateway's own (VISION_SYSTEM, TALK_SYSTEM),
 *     never the device's;
 *   - an allowance a person a day for each task, by number and by cost, kept
 *     in assist_usage, which only this function writes (service role) and a
 *     person may only read their own of (supabase/ASSIST_USAGE.sql);
 *   - the answer is held to its JSON schema by the API, then read again
 *     (checkLabels, checkTalkAnswer) — a picture it names must be one of the
 *     talk's — and every figure in a talk's answer not found in what was said
 *     or in Faultline's records is returned as `unsure`, said beside it;
 *   - nothing is written to Faultline: a person decides what becomes a record.
 *
 * THE CHECK: the database alone may ask a talk with the scheduler's key
 * (`x-check-key`, push_keys.cron_key — the key `remind` is called with, which
 * no API role can read). It runs the same task by the same code, with no
 * person, no allowance and nothing logged, and answers with the model's
 * usage and time too — so a real answer can be proved from the server
 * without anyone signed in (docs/LINE-TALK.md, How it is proved). It says
 * the fingerprint of the instructions and the answer's shape it holds
 * (`rules`, the first 16 hex of their SHA-256) — so the copy deployed is
 * proved the same as the repo's, word for word.
 *
 * Model and effort are configuration (ASSIST_MODEL, ASSIST_ASK_EFFORT for
 * the frames; ASSIST_TALK_MODEL for the talk, ASSIST_TALK_EFFORT for a
 * document asked of it, ASSIST_TALK_CHAT_EFFORT for the conversation). */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.131.0";
import { allowance, costMicros } from "./video/gatewayUsage.ts";
import { VISION_LIMITS, VISION_SCHEMA, VISION_SYSTEM, checkLabels, visionUser, type LabelEvent, type LabelFrame } from "./video/visionCore.ts";
import { STORY_SCHEMA, STORY_SYSTEM, checkStoryAnswer, readStoryAsk, storyUser, unsureStory } from "./story/storyAssist.ts";
import { BRIEF_ALLOWANCE_WORDS, BRIEF_ASKS_SCHEMA, BRIEF_ASKS_SYSTEM, BRIEF_OFF, BRIEF_READ_SCHEMA, BRIEF_READ_SYSTEM, briefAsksUser, briefReadUser, checkAsks, checkBriefText, readBrief, readBriefPages } from "./story/briefAssist.ts";
import { COLLEAGUE_ALLOWANCE_WORDS, COLLEAGUE_LIMITS, COLLEAGUE_OFF, checkCalls, colleagueRulesText, colleagueMessages, colleagueReply, colleagueSystemFor, colleagueSystemMode, colleagueToolsFor, colleagueToolsMode, nextCarry, readColleagueAsk, unsureColleague, type ColleagueAsk, type ColleagueBlock, type ColleagueRefusal } from "./colleague/colleagueAssist.ts";
import { CAPABILITY_SCHEMAS } from "./colleague/schemas.ts";
import { FACTORY_READ_ALLOWANCE_WORDS, FACTORY_READ_OFF, FACTORY_READ_SCHEMA, FACTORY_READ_SYSTEM, checkFactoryRead, factoryReadUser, readFactoryAsk } from "./colleague/factoryRead.ts";
import { TALK_ALLOWANCE_WORDS, asksForDocument, checkTalkAnswer, partialAnswer, readAsk, talkMessages, talkRulesText, talkSchemaFor, talkSystemFor, unsureFigures, type TalkAnswer, type TalkAsk } from "./talk/talkAssist.ts";

const KEY = Deno.env.get("ANTHROPIC_API_KEY");
/* THE MODEL FOR EACH TASK (9 November — Rowland: "we want quality output but lowest cost"): the cheapest model that holds
   the quality each task needs, every one a setting of its own so it can be raised or lowered without a deploy of code.
   Prices ($ per million tokens in / out, video/gatewayUsage PRICES): Opus 5.5 4 / 20 · Sonnet 5.5 2 / 10 · Haiku 5.5 0.10 / 0.50.
   Every figure is still a formula's and every quote and capability call is checked in code, so a cheaper model risks
   weaker words, never a wrong number. */
const OPUS = "claude-opus-5-5", SONNET = "claude-sonnet-5-5", HAIKU = "claude-haiku-5-5";
/* naming the work in a few frames of a video study: short labels — Haiku */
const MODEL = Deno.env.get("ASSIST_MODEL") ?? HAIKU;
/* AI Mode's colleague: picks capabilities, asks before writing — the most judgement, Opus until Sonnet is proved on it */
const COLLEAGUE_MODEL = Deno.env.get("ASSIST_COLLEAGUE_MODEL") ?? OPUS;
/* the Story's chapter: business writing from the records' words — Sonnet */
const STORY_MODEL = Deno.env.get("ASSIST_STORY_MODEL") ?? SONNET;
/* a brief photographed or scanned: its words typed out exactly — Sonnet; split into asks, each quote checked in code — Haiku */
const BRIEF_READ_MODEL = Deno.env.get("ASSIST_BRIEF_READ_MODEL") ?? SONNET;
const BRIEF_ASKS_MODEL = Deno.env.get("ASSIST_BRIEF_ASKS_MODEL") ?? HAIKU;
/* a factory document read for what it holds, every quote checked in code — Sonnet */
const FACTORY_READ_MODEL = Deno.env.get("ASSIST_FACTORY_READ_MODEL") ?? SONNET;
/* the server-side fallback on a refusal (the "default" form) is offered by Opus 5.5 and Sonnet 5.5 — not by Haiku 5.5, which
   takes no fallbacks parameter: a Haiku call goes without it and a refusal is said as one */
const fallbackFor = (model: string): Record<string, unknown> =>
  model.startsWith("claude-haiku") ? {} : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" };
/* naming the work in a few frames is light work */
const ASK_EFFORT = Deno.env.get("ASSIST_ASK_EFFORT") ?? "low";
/* THE MONTH'S CEILING: one figure over EVERYTHING this service spends (12 November, Rowland: "20 pound per month"). The daily
   allowances below are per task and per person; this is the whole bill: every task, every person, the evaluation's checks too, added
   up for the calendar month (UTC). When it is reached nothing more is asked of the model until the 1st, said in words and never
   silently, and Manual Mode does everything meanwhile. ASSIST_MONTHLY_USD (default 25, about 20 pounds); ASSIST_MONTHLY_FROM (an ISO
   day) starts the count later than the 1st, for the month the ceiling was set in. Read by pages of 1,000 rows, so a busy month is
   still added up whole. */
const MONTHLY_MICROS = Math.round((Number(Deno.env.get("ASSIST_MONTHLY_USD") ?? 25) || 25) * 1_000_000);
/* the ceiling was set on 12 November 2026 and, by Rowland's word, counts from that day for its first month (it only applies inside that month) */
const MONTHLY_FROM = Deno.env.get("ASSIST_MONTHLY_FROM") ?? "2026-11-12";
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
// deno-lint-ignore no-explicit-any
async function monthLeft(admin: any): Promise<{ ok: true; spent: number } | { ok: false; why: string }> {
  const now = new Date();
  let start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const from = MONTHLY_FROM ? new Date(MONTHLY_FROM) : null;
  if (from && !Number.isNaN(from.getTime()) && from > start && from <= now) start = from;
  let spent = 0;
  for (let page = 0; page < 50; page += 1) {
    const { data, error } = await admin.from("assist_usage").select("cost_micros").gte("at", start.toISOString()).order("at", { ascending: true }).range(page * 1000, page * 1000 + 999);
    if (error) return { ok: true, spent };   // the table's own absence is handled by each task's allowance
    for (const r of (data ?? []) as { cost_micros?: number }[]) spent += r.cost_micros ?? 0;
    if (!data || data.length < 1000) break;
  }
  if (spent >= MONTHLY_MICROS) {
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return { ok: false, why: `This month's AI budget is spent ($${(MONTHLY_MICROS / 1_000_000).toFixed(0)}). It comes back on ${next.getUTCDate()} ${MONTH_NAMES[next.getUTCMonth()]}. Everything by hand works meanwhile, and the conversation is kept.` };
  }
  return { ok: true, spent };
}
const LIMIT = {
  calls: Number(Deno.env.get("ASSIST_DAILY_CALLS") ?? 25) || 25,
  micros: Math.round((Number(Deno.env.get("ASSIST_DAILY_USD") ?? 3) || 3) * 1_000_000),
};
/* a document asked of a talk is written with care; the conversation itself is
   answered quickly, as a person answers (Rowland, 21 October: "a full
   conversational system ... like I do with you here") */
/* Line Talk: the conversation and the documents it writes — Sonnet */
const TALK_MODEL = Deno.env.get("ASSIST_TALK_MODEL") ?? SONNET;
const TALK_EFFORT = Deno.env.get("ASSIST_TALK_EFFORT") ?? "medium";
const TALK_CHAT_EFFORT = Deno.env.get("ASSIST_TALK_CHAT_EFFORT") ?? "low";
/* THE STORY's chapter (docs/STORY.md §5): written with care, a few a day */
const STORY_EFFORT = Deno.env.get("ASSIST_STORY_EFFORT") ?? "medium";
const STORY_LIMIT = {
  calls: Number(Deno.env.get("ASSIST_STORY_DAILY_CALLS") ?? 20) || 20,
  micros: Math.round((Number(Deno.env.get("ASSIST_STORY_DAILY_USD") ?? 3) || 3) * 1_000_000),
};
const TALK_LIMIT = {
  calls: Number(Deno.env.get("ASSIST_TALK_DAILY_CALLS") ?? 60) || 60,
  micros: Math.round((Number(Deno.env.get("ASSIST_TALK_DAILY_USD") ?? 5) || 5) * 1_000_000),
};
/* AI MODE's colleague (docs/AI-MODE.md): answered quickly, as a person answers; its own allowance; switched off by
   ASSIST_COLLEAGUE_ENABLED=false without touching anything else */
const COLLEAGUE_EFFORT = Deno.env.get("ASSIST_COLLEAGUE_EFFORT") ?? "low";
/* WHAT A TURN SENDS (11 November, docs/AI-MODE.md "Sending less a turn"): ASSIST_COLLEAGUE_TOOLS = all (the default — every
   capability's schema every turn, as before) | search (the API's tool search, regex: a core loaded, the rest deferred) |
   search-bm25 (the same, natural-language search). Every call is still checked against ALL the schemas. */
const COLLEAGUE_TOOLS = colleagueToolsMode(Deno.env.get("ASSIST_COLLEAGUE_TOOLS"));
/* ASSIST_COLLEAGUE_SYSTEM = full (the default — the rules word for word, as live) | lean (the same rules with what a capability's
   own description already says taken out — COLLEAGUE_LEAN_CUTS lists each line and where it still lives) */
const COLLEAGUE_RULES = colleagueSystemMode(Deno.env.get("ASSIST_COLLEAGUE_SYSTEM"));
const COLLEAGUE_LIMIT = {
  calls: Number(Deno.env.get("ASSIST_COLLEAGUE_DAILY_CALLS") ?? 120) || 120,
  micros: Math.round((Number(Deno.env.get("ASSIST_COLLEAGUE_DAILY_USD") ?? 8) || 8) * 1_000_000),
};
/* the colleague checked with the real model by the evaluation harness (docs/LUNA-EVAL.md) — its own allowance */
const CHECK_LIMIT = {
  calls: Number(Deno.env.get("ASSIST_CHECK_DAILY_CALLS") ?? 80) || 80,
  micros: Math.round((Number(Deno.env.get("ASSIST_CHECK_DAILY_USD") ?? 3) || 3) * 1_000_000),
};
/* THE STORY's brief, read from its pages and asked of (S6–S7): both tasks share one allowance */
const BRIEF_EFFORT = Deno.env.get("ASSIST_BRIEF_EFFORT") ?? "medium";
const BRIEF_LIMIT = {
  calls: Number(Deno.env.get("ASSIST_BRIEF_DAILY_CALLS") ?? 20) || 20,
  micros: Math.round((Number(Deno.env.get("ASSIST_BRIEF_DAILY_USD") ?? 3) || 3) * 1_000_000),
};
const BRIEF_TASKS = ["brief-read", "brief-asks"];
/* FACTORY DOCUMENTS (docs/FACTORY-KNOWLEDGE.md F4): read for what they hold, a few a day */
const FACTORY_READ_EFFORT = Deno.env.get("ASSIST_FACTORY_READ_EFFORT") ?? "medium";
const FACTORY_READ_LIMIT = {
  calls: Number(Deno.env.get("ASSIST_FACTORY_READ_DAILY_CALLS") ?? 20) || 20,
  micros: Math.round((Number(Deno.env.get("ASSIST_FACTORY_READ_DAILY_USD") ?? 3) || 3) * 1_000_000),
};
const TASKS = ["video-label", "talk", "story", "colleague", ...BRIEF_TASKS, "factory-read"];
const url = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });

type Usage = Record<string, number>;
/* the instructions and the answer's shape this copy holds, as a fingerprint — never anything secret */
const printOf = async (text: string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)))].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
const rulesPrint = () => printOf(talkRulesText());
/* AI Mode's instructions and capabilities this copy sends Claude (Luna's identity among them), as a fingerprint too */
const colleaguePrint = () => printOf(colleagueRulesText(CAPABILITY_SCHEMAS));
type Talked =
  | { ok: true; answer: TalkAnswer; unsure: string[]; model: string; usage: Usage; cost: number; seconds: number }
  | { ok: false; off?: boolean; why: string; model?: string; usage?: Usage; cost?: number; detail?: string };

/* LINE TALK: the conversation asked of the model — its instructions the
   gateway's own, the conversation cached up to its newest turn (talkMessages),
   the answer held to its schema and read again before it is returned. With
   `onText`, the answer is streamed and its words so far handed on as they
   come; the finished answer is checked the same. */
type TalkMsg = { model?: string; stop_reason?: string; content?: unknown; usage?: Usage };
async function answerTalk(client: Anthropic, ask: TalkAsk, onText?: (soFar: string) => void): Promise<Talked> {
  const t0 = Date.now();
  try {
    const params = {
      model: TALK_MODEL, max_tokens: 16000,
      ...fallbackFor(TALK_MODEL),
      output_config: { effort: asksForDocument(ask.turns) || ask.set ? TALK_EFFORT : TALK_CHAT_EFFORT, format: { type: "json_schema", schema: talkSchemaFor(ask.set) } },
      system: [{ type: "text", text: talkSystemFor(ask.set), cache_control: { type: "ephemeral" } }],
      messages: talkMessages(ask),
    } as unknown as Parameters<typeof client.beta.messages.create>[0];
    let msg: TalkMsg;
    if (onText) {
      let soFar = "";
      const stream = client.beta.messages.stream(params as unknown as Parameters<typeof client.beta.messages.stream>[0]);
      stream.on("text", (delta: string) => { soFar += delta; onText(soFar); });
      msg = await stream.finalMessage() as unknown as TalkMsg;
    } else msg = await client.beta.messages.create(params) as unknown as TalkMsg;
    const model = msg.model ?? TALK_MODEL;
    const usage = msg.usage ?? {};
    const cost = costMicros(model, usage);
    if (msg.stop_reason === "refusal") return { ok: false, why: "Line Talk would not answer that one. What you said is kept.", model, usage, cost };
    if (msg.stop_reason === "max_tokens") return { ok: false, why: "The answer ran longer than Line Talk can give at once — ask for a shorter document, or one part at a time.", model, usage, cost };
    const text = (Array.isArray(msg.content) ? msg.content : []).map((b: { type?: string; text?: string }) => (b?.type === "text" ? b.text ?? "" : "")).join("");
    let raw: unknown = null;
    try { raw = JSON.parse(text); } catch { /* unreadable */ }
    const photos = ask.turns.flatMap(t => (t.kind === "photo" && t.photo ? [t.photo] : []));
    const answer = checkTalkAnswer(raw, photos, ask.set);
    if (!answer) return { ok: false, why: "Line Talk's answer could not be read, so none is kept — ask again.", model, usage, cost };
    return { ok: true, answer, unsure: unsureFigures(answer, ask), model, usage, cost, seconds: Math.round((Date.now() - t0) / 100) / 10 };
  } catch (e) {
    const detail = e instanceof Error ? e.message.slice(0, 500) : String(e).slice(0, 500);
    if (e instanceof Anthropic.RateLimitError) return { ok: false, why: "Line Talk is busy — ask again in a minute. What you said is kept.", detail };
    if (e instanceof Anthropic.AuthenticationError) return { off: true, ok: false, why: "Line Talk's key is not accepted, so it cannot answer just now. Everything you say, type and photograph is still kept.", detail };
    console.error("talk failed", detail);
    return { ok: false, why: "Line Talk could not answer just now — ask again. What you said is kept.", detail };
  }
}

/* THE ANSWER AS IT IS WRITTEN — server-sent events: the reply so far (and
   whether a document is being written ahead of it) as it grows, then the
   finished answer exactly as the plain response gives it. `done` keeps the
   allowance's record once the answer is in. */
function streamTalk(client: Anthropic, ask: TalkAsk, done: (r: Talked) => Promise<void>, extra: Record<string, unknown> = {}): Response {
  const enc = new TextEncoder();
  const body = new ReadableStream({
    async start(ctrl) {
      let open = true;
      const put = (o: unknown) => { if (!open) return; try { ctrl.enqueue(enc.encode(`data: ${JSON.stringify(o)}\n\n`)); } catch { open = false; } };
      let lastReply = "", lastDoc = false, lastAt = 0;
      const r = await answerTalk(client, ask, soFar => {
        const p = partialAnswer(soFar);
        const now = Date.now();
        if ((p.reply !== lastReply || p.document !== lastDoc) && now - lastAt >= 80) {
          lastReply = p.reply; lastDoc = p.document; lastAt = now;
          put({ partial: p.reply, document: p.document });
        }
      });
      await done(r).catch(() => undefined);
      put({ ...(r.ok ? { ok: true, answer: r.answer, unsure: r.unsure, model: r.model } : r.off ? { off: true, why: r.why } : { ok: false, why: r.why }), ...extra });
      if (open) { try { ctrl.close(); } catch { /* gone */ } }
    },
  });
  return new Response(body, { headers: { ...CORS, "Content-Type": "text/event-stream", "Cache-Control": "no-store" } });
}

/* THE AUDIT — one ai_actions row for each call proposed, refused and answered (supabase/AI_ACTIONS.sql), written with
   the service role. A table not there yet, or a write that fails, never fails the turn. */
// deno-lint-ignore no-explicit-any
type Admin = SupabaseClient<any, any, any>;
type AuditRow = { call_id: string; capability: string; kind: string | null; input: unknown; status: "proposed" | "refused" | "done" | "failed" | "declined"; says: string | null };
async function audit(admin: Admin, userId: string, conversationId: string | undefined, rows: AuditRow[]): Promise<void> {
  if (!rows.length) return;
  try {
    const { error } = await admin.from("ai_actions").insert(rows.map(r => ({ user_id: userId, conversation_id: conversationId ?? null, ...r })));
    if (error) console.warn("ai_actions not written", error.message?.slice(0, 200));
  } catch (e) { console.warn("ai_actions not written", e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200)); }
}
const kindOf = (name: string): string | null => CAPABILITY_SCHEMAS.find(s => s.name === name)?.kind ?? null;

/* AI MODE'S COLLEAGUE: one answer — the conversation and any rounds of calls in it, asked of Claude with the
   capabilities as its tools. A call that passes the check goes to the device with the colleague's message as
   `assistant`, to come back with what it gave; a round where every call was refused is asked again here at once, the
   refusals answered to the model as errors, so a refused call never reaches the device. */
type ColleagueOut = Record<string, unknown>;
/* AS IT IS WRITTEN (11 November, docs/AI-MODE.md): with `say`, each round is asked as a stream and its words handed on as they
   come — `{ delta }` the next words, `{ restart: true }` when a round where every call was refused is asked again here (the words
   of the refused round are not the answer). The finished answer is the same object either way, checked the same. */
type ColleagueSay = (e: { delta: string } | { restart: true }) => void;
type ColleagueMsg = { model?: string; stop_reason?: string; content?: unknown; usage?: Usage };
async function colleagueAnswer(client: Anthropic, admin: Admin, userId: string, first: ColleagueAsk, usageTask = "colleague", say?: ColleagueSay): Promise<ColleagueOut> {
  const keep = async (model: string, usage: Usage, ok: boolean) => {
    await admin.from("assist_usage").insert({ user_id: userId, task: usageTask, model, input_tokens: (usage.input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0), output_tokens: usage.output_tokens ?? 0, cost_micros: costMicros(model, usage), ok });
  };
  /* what running the last round's calls gave, as the device says */
  if (first.pending) {
    const asked = first.pending.carry.content.filter(c => c.type === "tool_use");
    await audit(admin, userId, first.conversationId, first.pending.results.flatMap(r => {
      const call = asked.find(c => c.id === r.id);
      if (!call) return [];
      return [{ call_id: r.id, capability: String(call.name), kind: kindOf(String(call.name)), input: call.input ?? null, status: r.declined ? "declined" as const : r.ok ? "done" as const : "failed" as const, says: r.says.slice(0, 2000) || null }];
    }));
  }
  const tools = colleagueToolsFor(CAPABILITY_SCHEMAS, COLLEAGUE_TOOLS);
  const system = colleagueSystemFor(COLLEAGUE_TOOLS, COLLEAGUE_RULES);
  let ask = first;
  try {
    for (let tries = 0; tries < 3; tries++) {
      const params = {
        model: COLLEAGUE_MODEL, max_tokens: 4000,
        ...fallbackFor(COLLEAGUE_MODEL),
        output_config: { effort: COLLEAGUE_EFFORT },
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        tools, tool_choice: { type: "auto" },
        messages: colleagueMessages(ask),
      };
      let msg: ColleagueMsg;
      if (say) {
        if (tries > 0) say({ restart: true });
        const stream = client.beta.messages.stream(params as unknown as Parameters<typeof client.beta.messages.stream>[0]);
        /* text blocks are joined with a blank line, as colleagueReply joins them */
        let blocks = 0;
        stream.on("streamEvent", (raw: unknown) => {
          const ev = raw as { type?: string; content_block?: { type?: string } } | null;
          if (ev?.type === "content_block_start" && ev.content_block?.type === "text" && blocks++ > 0) say({ delta: "\n\n" });
        });
        stream.on("text", (delta: string) => { if (delta) say({ delta }); });
        msg = await stream.finalMessage() as unknown as ColleagueMsg;
      } else msg = await client.beta.messages.create(params as unknown as Parameters<typeof client.beta.messages.create>[0]) as unknown as ColleagueMsg;
      const model = msg.model ?? COLLEAGUE_MODEL;
      const content = (Array.isArray(msg.content) ? msg.content : []) as ColleagueBlock[];
      await keep(model, msg.usage ?? {}, msg.stop_reason !== "refusal");
      if (msg.stop_reason === "refusal") return { ok: false, why: "AI Mode would not answer that one. What you said is kept." };
      if (msg.stop_reason === "max_tokens") return { ok: false, why: "The answer ran longer than AI Mode gives at once — ask for one part at a time." };
      /* a tool search the API paused in (search only): its message sent back as it is, to carry on — never to the device */
      if (msg.stop_reason === "pause_turn") { ask = { ...ask, pending: { carry: nextCarry(ask, content, []), results: [] } }; continue; }
      if (msg.stop_reason === "tool_use") {
        const { calls, refused } = checkCalls(content, CAPABILITY_SCHEMAS);
        await audit(admin, userId, ask.conversationId, [
          ...calls.map(c => ({ call_id: c.id, capability: c.name, kind: c.kind, input: c.input ?? null, status: "proposed" as const, says: null })),
          ...refused.map((r: ColleagueRefusal) => ({ call_id: r.id, capability: r.name.slice(0, 80), kind: kindOf(r.name), input: content.find(c => c.id === r.id)?.input ?? null, status: "refused" as const, says: r.why })),
        ]);
        const carry = nextCarry(ask, content, refused);
        if (carry.rounds.length >= COLLEAGUE_LIMITS.rounds - 1 || new TextEncoder().encode(JSON.stringify(carry)).length > COLLEAGUE_LIMITS.carryBytes)
          return { ok: false, why: "AI Mode went round too many times on this one — ask it a narrower question. What you said is kept." };
        if (calls.length) {
          const { reply } = colleagueReply(content);
          return { ok: true, reply, calls: calls.map(c => ({ id: c.id, name: c.name, input: c.input })), assistant: carry, model };
        }
        /* every call refused: told why, asked again, never sent to the device */
        ask = { ...ask, pending: { carry, results: [] } };
        continue;
      }
      const { reply, suggestions } = colleagueReply(content);
      if (!reply) return { ok: false, why: "AI Mode's answer could not be read, so none is kept — ask again." };
      return { ok: true, reply, ...(suggestions.length ? { suggestions } : {}), unsure: unsureColleague(reply, ask), model };
    }
    return { ok: false, why: "AI Mode kept asking for things Faultline does not offer — ask again, in other words. What you said is kept." };
  } catch (e) {
    const detail = e instanceof Error ? e.message.slice(0, 300) : String(e).slice(0, 300);
    if (e instanceof Anthropic.RateLimitError) return { ok: false, why: "AI Mode is busy — ask again in a minute. What you said is kept." };
    if (e instanceof Anthropic.AuthenticationError) return { off: true, why: "AI Mode's key is not accepted, so it cannot answer just now — Manual Mode does everything meanwhile." };
    console.error("colleague failed", detail);
    return { ok: false, why: "AI Mode could not answer just now — ask again. What you said is kept." };
  }
}

/* the colleague's answer whole, as JSON — the plain path, unchanged */
async function answerColleague(client: Anthropic, admin: Admin, userId: string, first: ColleagueAsk, usageTask = "colleague"): Promise<Response> {
  return json(await colleagueAnswer(client, admin, userId, first, usageTask));
}

/* THE COLLEAGUE'S ANSWER AS IT IS WRITTEN — server-sent events: `{ delta }` the words as they come (a few at a time, never more
   often than every 60 ms), `{ restart: true }` when a round is asked again here, then ONE final event holding exactly the object
   the plain path returns. The allowance, the audit, the schemas' refusal and the figures' check are the same code. */
function streamColleague(client: Anthropic, admin: Admin, userId: string, first: ColleagueAsk, usageTask = "colleague"): Response {
  const enc = new TextEncoder();
  const body = new ReadableStream({
    async start(ctrl) {
      let open = true, held = "", lastAt = 0;
      const put = (o: unknown) => { if (!open) return; try { ctrl.enqueue(enc.encode(`data: ${JSON.stringify(o)}\n\n`)); } catch { open = false; } };
      const flush = () => { if (held) { put({ delta: held }); held = ""; lastAt = Date.now(); } };
      const out = await colleagueAnswer(client, admin, userId, first, usageTask, e => {
        if ("restart" in e) { held = ""; put({ restart: true }); return; }
        held += e.delta;
        if (Date.now() - lastAt >= 60) flush();
      });
      flush();
      put(out);
      if (open) { try { ctrl.close(); } catch { /* gone */ } }
    },
  });
  return new Response(body, { headers: { ...CORS, "Content-Type": "text/event-stream", "Cache-Control": "no-store" } });
}

/* THE STORY'S BRIEF — read from its pages, or asked what it asks for; each answer held to its schema and read again */
async function answerBrief(client: Anthropic, admin: Admin, userId: string, task: string, body: Record<string, unknown>): Promise<Response> {
  const read = task === "brief-read" ? readBriefPages(body) : null;
  const brief = task === "brief-asks" ? readBrief(body) : null;
  const briefModel = read ? BRIEF_READ_MODEL : BRIEF_ASKS_MODEL;
  if (read && !read.ok) return json({ ok: false, why: read.why }, 400);
  if (brief && !brief.ok) return json({ ok: false, why: brief.why }, 400);
  try {
    const msg = await client.beta.messages.create({
      model: briefModel, max_tokens: read ? 16000 : 4000,
      ...fallbackFor(briefModel),
      output_config: { effort: read ? BRIEF_EFFORT : "low", format: { type: "json_schema", schema: read ? BRIEF_READ_SCHEMA : BRIEF_ASKS_SCHEMA } },
      system: [{ type: "text", text: read ? BRIEF_READ_SYSTEM : BRIEF_ASKS_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: read && read.ok ? briefReadUser(read.pages) : briefAsksUser(brief && brief.ok ? brief.brief : "") }],
    } as unknown as Parameters<typeof client.beta.messages.create>[0]) as unknown as { model?: string; stop_reason?: string; content?: unknown; usage?: Usage };
    const model = msg.model ?? briefModel;
    const text = (Array.isArray(msg.content) ? msg.content : []).map((b: { type?: string; text?: string }) => (b?.type === "text" ? b.text ?? "" : "")).join("");
    let raw: unknown = null;
    try { raw = JSON.parse(text); } catch { /* unreadable */ }
    const got = msg.stop_reason === "refusal" ? null : read ? checkBriefText(raw) : checkAsks(raw, brief && brief.ok ? brief.brief : "");
    const ok = Array.isArray(got) ? got.length > 0 : !!got;
    const usage = msg.usage ?? {};
    await admin.from("assist_usage").insert({ user_id: userId, task, model, input_tokens: (usage.input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0), output_tokens: usage.output_tokens ?? 0, cost_micros: costMicros(model, usage), ok });
    if (msg.stop_reason === "max_tokens") return json({ ok: false, why: "The brief is longer than can be read at once — send fewer pages at a time." });
    if (!ok) return json({ ok: false, why: read ? "The pages could not be read — take the photographs again, flat and in good light, or type the brief in." : "No ask could be found with its words in the brief — write the asks by hand." });
    return json(read ? { ok: true, text: got, model } : { ok: true, asks: got, model });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ ok: false, why: "The assistant is busy — try again in a minute." });
    if (e instanceof Anthropic.AuthenticationError) return json({ off: true, why: BRIEF_OFF });
    console.error("brief failed", e instanceof Error ? e.message.slice(0, 300) : String(e).slice(0, 300));
    return json({ ok: false, why: "The assistant could not read the brief just now — try again, or type it in." });
  }
}

/* A FACTORY DOCUMENT — its words or its pages, read for the sites, areas, lines and machines it names; every item's quote checked
   against the words (the document's, or the transcription the answer carries when it came from pages); nothing is written */
async function answerFactoryRead(client: Anthropic, admin: Admin, userId: string, body: Record<string, unknown>): Promise<Response> {
  const read = readFactoryAsk(body);
  if (!read.ok) return json({ ok: false, why: read.why }, 400);
  try {
    const msg = await client.beta.messages.create({
      model: FACTORY_READ_MODEL, max_tokens: read.pages ? 24000 : 12000,
      ...fallbackFor(FACTORY_READ_MODEL),
      output_config: { effort: FACTORY_READ_EFFORT, format: { type: "json_schema", schema: FACTORY_READ_SCHEMA } },
      system: [{ type: "text", text: FACTORY_READ_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: factoryReadUser(read) }],
    } as unknown as Parameters<typeof client.beta.messages.create>[0]) as unknown as { model?: string; stop_reason?: string; content?: unknown; usage?: Usage };
    const model = msg.model ?? FACTORY_READ_MODEL;
    const text = (Array.isArray(msg.content) ? msg.content : []).map((b: { type?: string; text?: string }) => (b?.type === "text" ? b.text ?? "" : "")).join("");
    let raw: unknown = null;
    try { raw = JSON.parse(text); } catch { /* unreadable */ }
    const got = msg.stop_reason === "refusal" ? null : checkFactoryRead(raw, read.text);
    const ok = !!got && got.items.length > 0;
    const usage = msg.usage ?? {};
    await admin.from("assist_usage").insert({ user_id: userId, task: "factory-read", model, input_tokens: (usage.input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0), output_tokens: usage.output_tokens ?? 0, cost_micros: costMicros(model, usage), ok });
    if (msg.stop_reason === "max_tokens") return json({ ok: false, why: "The document is longer than can be read at once — send it in parts." });
    if (!got) return json({ ok: false, why: "The document could not be read — say what is in it in the conversation instead." });
    if (!got.items.length) return json({ ok: false, why: got.dropped ? "Nothing could be traced to the document's own words, so nothing is proposed from it." : "No site, area, line or machine was found in the document." });
    return json({ ok: true, text: got.text, ...(got.day ? { day: got.day, dayQuote: got.dayQuote } : {}), items: got.items, dropped: got.dropped, model });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ ok: false, why: "The assistant is busy — try again in a minute." });
    if (e instanceof Anthropic.AuthenticationError) return json({ off: true, why: FACTORY_READ_OFF });
    console.error("factory-read failed", e instanceof Error ? e.message.slice(0, 300) : String(e).slice(0, 300));
    return json({ ok: false, why: "The assistant could not read the document just now — try again, or say what is in it." });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, why: "POST only" }, 405);
  const admin = createClient(url, service, { auth: { persistSession: false } });

  /* THE CHECK — the database's own key, never a person's */
  const checkKey = req.headers.get("x-check-key");
  if (checkKey !== null) {
    const { data: keys } = await admin.from("push_keys").select("cron_key").eq("id", 1).single();
    const real = (keys as { cron_key?: string } | null)?.cron_key ?? "";
    if (real.length < 20 || real === "SET-ME" || checkKey !== real) return json({ ok: false, why: "no" }, 401);
    if (!KEY) return json({ off: true, why: "No key is saved for the assistant." });
    let body: Record<string, unknown> = {};
    try { body = (await req.json()) ?? {}; } catch { /* no body */ }
    /* THE COLLEAGUE CHECKED WITH THE REAL MODEL (11 November, docs/LUNA-EVAL.md): the same task by the same code — the same
       instructions, schemas, refusals and audit — asked by the evaluation harness, which runs the real app in a test browser and
       sends its colleague asks here with the database's key. Nothing is written to anyone's records: the capabilities run in the
       test browser. Its cost is kept under the administrator as `colleague-check`, apart from their own AI Mode allowance, and has
       an allowance of its own (ASSIST_CHECK_DAILY_CALLS / _USD). */
    if (body.task === "colleague") {
      const read = readColleagueAsk(body);
      if (!read.ok) return json({ ok: false, why: read.why }, 400);
      const { data: sup } = await admin.from("profiles").select("id").eq("is_super", true).limit(1).maybeSingle();
      const who = (sup as { id?: string } | null)?.id;
      if (!who) return json({ ok: false, why: "No administrator to keep the check's cost under." }, 400);
      const month = await monthLeft(admin);
      if (!month.ok) return json({ ok: false, why: month.why });
      const since = new Date(Date.now() - 86_400_000).toISOString();
      const { data: rows } = await admin.from("assist_usage").select("at, cost_micros").eq("user_id", who).eq("task", "colleague-check").gte("at", since);
      const left = allowance(rows ?? [], Date.now(), CHECK_LIMIT, COLLEAGUE_ALLOWANCE_WORDS);
      if (!left.ok) return json({ ok: false, why: left.why });
      /* the check asks as the app does — streamed when the app's ask is */
      if (body.stream === true) return streamColleague(new Anthropic({ apiKey: KEY }), admin, who, read.ask, "colleague-check");
      return answerColleague(new Anthropic({ apiKey: KEY }), admin, who, read.ask, "colleague-check");
    }
    if (body.task !== "talk") return json({ ok: false, why: "The check asks a talk or the colleague only.", rules: await rulesPrint(), colleague: await colleaguePrint() }, 400);
    const read = readAsk(body);
    if (!read.ok) return json({ ok: false, why: read.why, rules: await rulesPrint() }, 400);
    const rules = await rulesPrint();
    /* the check asks as the app does — streamed when the app's ask is */
    if (body.stream === true) return streamTalk(new Anthropic({ apiKey: KEY }), read.ask, async () => undefined, { rules, effort: asksForDocument(read.ask.turns) || read.ask.set ? TALK_EFFORT : TALK_CHAT_EFFORT });
    return json({ ...(await answerTalk(new Anthropic({ apiKey: KEY }), read.ask)), rules, effort: asksForDocument(read.ask.turns) || read.ask.set ? TALK_EFFORT : TALK_CHAT_EFFORT });
  }

  let body: Record<string, unknown> = {};
  try { body = (await req.json()) ?? {}; } catch { /* no body */ }
  const task = String(body.task ?? "");
  /* each task says it is off in its own words — the work named by hand, or the talk kept unanswered */
  if (!KEY) return json({ off: true, why: task === "talk" ? "Line Talk's assistant is not switched on for this app yet — everything you say, type and photograph is kept." : task === "colleague" ? COLLEAGUE_OFF : BRIEF_TASKS.includes(task) ? BRIEF_OFF : task === "factory-read" ? FACTORY_READ_OFF : task === "story" ? "The assistant is not switched on for this app yet — the chapter is written from the records' words." : "Naming the work from the frames is not switched on for this app yet — name it as you review; everything else works the same." });
  /* AI Mode switched off on its own, everything else as it is */
  if (task === "colleague" && Deno.env.get("ASSIST_COLLEAGUE_ENABLED") === "false") return json({ off: true, why: COLLEAGUE_OFF });

  /* whose session — a signed-in person only */
  const auth = req.headers.get("Authorization") ?? "";
  const asThem = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: { user } } = await asThem.auth.getUser();
  if (!user) return json({ ok: false, why: "Sign in to use the assistant." }, 401);
  if (!TASKS.includes(task)) return json({ ok: false, why: "The assistant answers a Line Talk and AI Mode, names the work in a video study's frames, drafts the Story's chapter, reads its brief and reads factory documents; nothing else — the method builder it served was taken out on 20 October." }, 400);

  /* the month's ceiling over everything, before any task's own allowance */
  const month = await monthLeft(admin);
  if (!month.ok) return json({ ok: false, why: month.why });

  /* the allowance, from this person's own last day of this task */
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { data: rows, error: noTable } = await admin.from("assist_usage").select("at, cost_micros").eq("user_id", user.id).in("task", BRIEF_TASKS.includes(task) ? BRIEF_TASKS : [task]).gte("at", since);
  /* no allowance to keep, no assistant: it never runs without its cost control (supabase/ASSIST_USAGE.sql) */
  if (noTable) return json({ off: true, why: task === "colleague" ? COLLEAGUE_OFF : BRIEF_TASKS.includes(task) ? BRIEF_OFF : task === "factory-read" ? FACTORY_READ_OFF : task === "talk" ? "Line Talk's allowance is not set up yet, so it cannot answer — everything you say, type and photograph is kept." : "The allowance for naming the work is not set up yet — name it as you review until it is." });
  const client = new Anthropic({ apiKey: KEY });

  /* AI MODE'S COLLEAGUE */
  if (task === "colleague") {
    const read = readColleagueAsk(body);
    if (!read.ok) return json({ ok: false, why: read.why }, 400);
    const left = allowance(rows ?? [], Date.now(), COLLEAGUE_LIMIT, COLLEAGUE_ALLOWANCE_WORDS);
    if (!left.ok) return json({ ok: false, why: left.why });
    if (body.stream === true) return streamColleague(client, admin, user.id, read.ask);
    return answerColleague(client, admin, user.id, read.ask);
  }

  /* A FACTORY DOCUMENT */
  if (task === "factory-read") {
    const left = allowance(rows ?? [], Date.now(), FACTORY_READ_LIMIT, FACTORY_READ_ALLOWANCE_WORDS);
    if (!left.ok) return json({ ok: false, why: left.why });
    return answerFactoryRead(client, admin, user.id, body);
  }

  /* THE STORY'S BRIEF */
  if (BRIEF_TASKS.includes(task)) {
    const left = allowance(rows ?? [], Date.now(), BRIEF_LIMIT, BRIEF_ALLOWANCE_WORDS);
    if (!left.ok) return json({ ok: false, why: left.why });
    return answerBrief(client, admin, user.id, task, body);
  }

  /* LINE TALK */
  if (task === "talk") {
    const read = readAsk(body);
    if (!read.ok) return json({ ok: false, why: read.why }, 400);
    const left = allowance(rows ?? [], Date.now(), TALK_LIMIT, TALK_ALLOWANCE_WORDS);
    if (!left.ok) return json({ ok: false, why: left.why });
    const keep = async (r: Talked) => {
      if (r.usage) await admin.from("assist_usage").insert({ user_id: user.id, task, model: r.model ?? TALK_MODEL, input_tokens: (r.usage.input_tokens ?? 0) + (r.usage.cache_read_input_tokens ?? 0) + (r.usage.cache_creation_input_tokens ?? 0), output_tokens: r.usage.output_tokens ?? 0, cost_micros: r.cost ?? 0, ok: r.ok });
    };
    /* the app asks for the answer as it is written; anything else has it whole */
    if (body.stream === true) return streamTalk(client, read.ask, keep);
    const r = await answerTalk(client, read.ask);
    await keep(r);
    return r.ok ? json({ ok: true, answer: r.answer, unsure: r.unsure, model: r.model }) : json(r.off ? { off: true, why: r.why } : { ok: false, why: r.why });
  }

  /* THE STORY'S CHAPTER (docs/STORY.md §5): the snapshot as text, the brief and the headlines before; a headline and paragraphs back,
     held to the schema, every figure not among the snapshot's returned as unsure — the page marks it, the consultant approves */
  if (task === "story") {
    const read = readStoryAsk(body);
    if (!read.ok) return json({ ok: false, why: read.why }, 400);
    const left = allowance(rows ?? [], Date.now(), STORY_LIMIT, { calls: n => `${n} chapters drafted in a day is the allowance — this one is written from the records' words.`, spent: usd => `The day's allowance for drafting chapters is spent ($${usd}) — this one is written from the records' words.` });
    if (!left.ok) return json({ ok: false, why: left.why });
    try {
      const msg = await client.beta.messages.create({
        model: STORY_MODEL, max_tokens: 6000,
        ...fallbackFor(STORY_MODEL),
        output_config: { effort: STORY_EFFORT, format: { type: "json_schema", schema: STORY_SCHEMA } },
        system: [{ type: "text", text: STORY_SYSTEM, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: storyUser(read.ask) }],
      } as unknown as Parameters<typeof client.beta.messages.create>[0]) as unknown as { model?: string; stop_reason?: string; content?: unknown; usage?: Record<string, number> };
      const cost = costMicros(msg.model ?? STORY_MODEL, msg.usage ?? {});
      const text = (Array.isArray(msg.content) ? msg.content : []).map((b: { type?: string; text?: string }) => (b?.type === "text" ? b.text ?? "" : "")).join("");
      let raw: unknown = null;
      try { raw = JSON.parse(text); } catch { /* unreadable */ }
      const answer = checkStoryAnswer(raw);
      await admin.from("assist_usage").insert({ user_id: user.id, task, model: msg.model ?? STORY_MODEL, input_tokens: (msg.usage?.input_tokens ?? 0) + (msg.usage?.cache_read_input_tokens ?? 0) + (msg.usage?.cache_creation_input_tokens ?? 0), output_tokens: msg.usage?.output_tokens ?? 0, cost_micros: cost, ok: !!answer });
      if (msg.stop_reason === "refusal") return json({ ok: false, why: "The assistant would not write this one — the chapter is written from the records' words." });
      if (!answer) return json({ ok: false, why: "The assistant's draft could not be read — the chapter is written from the records' words." });
      return json({ ok: true, headline: answer.headline, narrative: answer.narrative, unsure: unsureStory(answer, read.ask), model: msg.model ?? STORY_MODEL });
    } catch (e) {
      return json({ ok: false, why: "The assistant could not answer just now — the chapter is written from the records' words.", detail: e instanceof Error ? e.message.slice(0, 300) : String(e).slice(0, 300) });
    }
  }

  /* A VIDEO STUDY'S FRAMES (docs/VIDEO.md): a few small JPEGs of the events the
     movement reading found, never the footage; held to the limits before any is sent on */
  const vEvents: LabelEvent[] = Array.isArray(body.events) ? (body.events as LabelEvent[]).slice(0, VISION_LIMITS.events + 1).map(e => ({ id: String(e?.id ?? "").slice(0, 60), station: String(e?.station ?? "").slice(0, 80), track: String(e?.track ?? "").slice(0, 40), from: String(e?.from ?? "").slice(0, 12), to: String(e?.to ?? "").slice(0, 12) })) : [];
  const vFrames: LabelFrame[] = Array.isArray(body.frames) ? (body.frames as LabelFrame[]).slice(0, VISION_LIMITS.frames + 1).map(f => ({ event: String(f?.event ?? ""), at: String(f?.at ?? ""), data: String(f?.data ?? "") })) : [];
  if (!vEvents.length || !vFrames.length) return json({ ok: false, why: "Events and their frames, please." }, 400);
  if (vEvents.length > VISION_LIMITS.events || vFrames.length > VISION_LIMITS.frames) return json({ ok: false, why: `At most ${VISION_LIMITS.frames} frames and ${VISION_LIMITS.events} events at once.` }, 400);
  if (vFrames.some(f => !/^[A-Za-z0-9+/=]+$/.test(f.data) || f.data.length * 0.75 > VISION_LIMITS.frameBytes || !vEvents.some(e => e.id === f.event))) return json({ ok: false, why: "A frame is not a small JPEG of an event asked about." }, 400);
  const left = allowance(rows ?? [], Date.now(), LIMIT);
  if (!left.ok) return json({ ok: false, why: left.why });

  try {
    const msg = await client.beta.messages.create({
      model: MODEL, max_tokens: 4000,
      ...fallbackFor(MODEL),
      output_config: { effort: ASK_EFFORT, format: { type: "json_schema", schema: VISION_SCHEMA } },
      system: [{ type: "text", text: VISION_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: visionUser(String(body.objective ?? ""), vEvents, vFrames) }],
    } as unknown as Parameters<typeof client.beta.messages.create>[0]) as unknown as { model?: string; stop_reason?: string; content?: unknown; usage?: Record<string, number> };
    const cost = costMicros(msg.model ?? MODEL, msg.usage ?? {});
    const text = (Array.isArray(msg.content) ? msg.content : []).map((b: { type?: string; text?: string }) => (b?.type === "text" ? b.text ?? "" : "")).join("");
    let raw: unknown = null;
    try { raw = JSON.parse(text); } catch { /* unreadable */ }
    const labels = msg.stop_reason === "refusal" ? [] : checkLabels(raw, vEvents.map(e => e.id));
    await admin.from("assist_usage").insert({ user_id: user.id, task, model: msg.model ?? MODEL, input_tokens: msg.usage?.input_tokens ?? 0, output_tokens: msg.usage?.output_tokens ?? 0, cost_micros: cost, ok: labels.length > 0 });
    return labels.length ? json({ ok: true, labels, model: msg.model ?? MODEL }) : json({ ok: false, why: "The assistant's labels could not be checked, so none are kept — name the work as you review." });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ ok: false, why: "The assistant is busy — try again in a minute." });
    if (e instanceof Anthropic.AuthenticationError) return json({ off: true, why: "The assistant's key is not accepted — name the work as you review." });
    return json({ ok: false, why: "The assistant could not name the work just now — name it as you review." });
  }
});
