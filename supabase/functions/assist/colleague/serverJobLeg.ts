/* One gateway leg for a parked server job (23 November 2026, docs/LUNA-G6-SERVER.md) — same colleague answer as AI Mode,
 * allowance debited to the owner, job row updated. Invoked with x-keepup-key from colleague-job cron. */
import type Anthropic from "npm:@anthropic-ai/sdk@0.131.0";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { allowance, costMicros } from "../video/gatewayUsage.ts";
import {
  COLLEAGUE_ALLOWANCE_WORDS,
  COLLEAGUE_LIMITS,
  colleagueFastChat,
  colleagueSystemFor,
  colleagueMessages,
  colleagueReply,
  colleagueToolsFor,
  cutOffReply,
  nextCarry,
  readColleagueAsk,
  unsureColleague,
  checkCalls,
  type ColleagueAsk,
  type ColleagueBlock,
} from "./colleagueAssist.ts";
import { CAPABILITY_SCHEMAS } from "./schemas.ts";

const COLLEAGUE_MODEL = Deno.env.get("ASSIST_COLLEAGUE_MODEL") ?? "claude-opus-5-5";
const COLLEAGUE_EFFORT = Deno.env.get("ASSIST_COLLEAGUE_EFFORT") ?? "high";
const COLLEAGUE_TOOLS = Deno.env.get("ASSIST_COLLEAGUE_TOOLS") ?? "full";
const COLLEAGUE_RULES = Deno.env.get("ASSIST_COLLEAGUE_RULES") ?? "full";
const COLLEAGUE_CACHE_TTL = Deno.env.get("ASSIST_COLLEAGUE_CACHE_TTL") ?? "1h";
const COLLEAGUE_MAX_TOKENS = 4096;
const MAX_LEGS = 4;

const fallbackFor = (model: string): Record<string, unknown> =>
  model.startsWith("claude-haiku") ? {} : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" };

type Snap = Record<string, unknown>;
type JobRow = {
  id: string;
  owner_id: string;
  conversation_id: string;
  thread_id: string;
  client: string;
  status: string;
  snapshot: Snap;
  legs: number;
  max_legs: number;
  deadline_at: string;
};

const jobOpen = (j: { steps?: { status: string }[] } | undefined): boolean =>
  !!j?.steps?.some(s => s.status === "todo" || s.status === "doing" || s.status === "blocked");

function afterLeg(snap: Snap, leg: Record<string, unknown>, legsSoFar: number): { snapshot: Snap; status: string; legs: number; error?: string } {
  if (leg.ok !== true) {
    const why = String(leg.why ?? "AI Mode could not answer just now.");
    return { snapshot: { ...snap, reply: why }, status: "failed", legs: legsSoFar, error: why };
  }
  const reply = String(leg.reply ?? "").trim();
  const calls = Array.isArray(leg.calls) ? leg.calls as { id: string; name: string; input: unknown }[] : [];
  if (calls.length) {
    return {
      snapshot: {
        ...snap,
        proposedCalls: calls,
        pending: { assistant: leg.assistant ?? null, results: (snap.pending as { results?: unknown[] })?.results ?? [] },
        ...(reply ? { reply: [snap.reply, reply].filter(Boolean).join("\n\n") } : {}),
      },
      status: "waiting_device",
      legs: legsSoFar + 1,
    };
  }
  const job = snap.job as { steps?: { status: string }[] } | undefined;
  const next: Snap = {
    ...snap,
    proposedCalls: undefined,
    pending: undefined,
    ...(reply ? { reply: [snap.reply, reply].filter(Boolean).join("\n\n") } : {}),
    ...(Array.isArray(leg.suggestions) && leg.suggestions.length ? { suggestions: leg.suggestions } : {}),
    ...(Array.isArray(leg.unsure) && leg.unsure.length ? { unsure: leg.unsure } : {}),
  };
  const done = job ? !jobOpen(job) : !!reply;
  if (done || legsSoFar + 1 >= MAX_LEGS) return { snapshot: next, status: "done", legs: legsSoFar + 1 };
  return { snapshot: next, status: "running", legs: legsSoFar + 1 };
}

async function oneColleagueAnswer(client: Anthropic, admin: SupabaseClient, userId: string, first: ColleagueAsk): Promise<Record<string, unknown>> {
  const COLLEAGUE_LIMIT = { calls: Number(Deno.env.get("ASSIST_COLLEAGUE_DAILY_CALLS") ?? 120), usd: Number(Deno.env.get("ASSIST_COLLEAGUE_DAILY_USD") ?? 3) };
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { data: rows } = await admin.from("assist_usage").select("at, cost_micros").eq("user_id", userId).eq("task", "colleague").gte("at", since);
  const left = allowance(rows ?? [], Date.now(), COLLEAGUE_LIMIT, COLLEAGUE_ALLOWANCE_WORDS);
  if (!left.ok) return { ok: false, why: left.why };

  const system = colleagueSystemFor(COLLEAGUE_TOOLS, COLLEAGUE_RULES);
  const toolCache = COLLEAGUE_CACHE_TTL ? { ttl: COLLEAGUE_CACHE_TTL } : {};
  let ask = first;
  try {
    for (let tries = 0; tries < 3; tries++) {
      const fastRound = colleagueFastChat(ask);
      const tools = fastRound ? [] : colleagueToolsFor(CAPABILITY_SCHEMAS, COLLEAGUE_TOOLS, toolCache);
      const cache = COLLEAGUE_CACHE_TTL ? { ttl: COLLEAGUE_CACHE_TTL } : {};
      const params: Record<string, unknown> = {
        model: COLLEAGUE_MODEL, max_tokens: COLLEAGUE_MAX_TOKENS,
        ...fallbackFor(COLLEAGUE_MODEL),
        output_config: { effort: COLLEAGUE_EFFORT },
        system: [{ type: "text", text: system, cache_control: COLLEAGUE_CACHE_TTL ? { type: "ephemeral", ttl: COLLEAGUE_CACHE_TTL } : { type: "ephemeral" } }],
        messages: colleagueMessages(ask, cache, { fastChat: fastRound }),
      };
      if (tools.length) Object.assign(params, { tools, tool_choice: { type: "auto" } });
      const asked = Date.now();
      const msg = await client.beta.messages.create(params as unknown as Parameters<typeof client.beta.messages.create>[0]) as unknown as { model?: string; stop_reason?: string; content?: unknown; usage?: Record<string, number> };
      const model = msg.model ?? COLLEAGUE_MODEL;
      const usage = msg.usage ?? {};
      const base = { user_id: userId, task: "colleague-server", model, input_tokens: (usage.input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0), output_tokens: usage.output_tokens ?? 0, cost_micros: costMicros(model, usage), ok: msg.stop_reason !== "refusal" };
      await admin.from("assist_usage").insert({ ...base, conversation_id: first.conversationId ?? null, client: first.client ?? null, ended: msg.stop_reason ?? null, effort: COLLEAGUE_EFFORT });
      if (msg.stop_reason === "refusal") return { ok: false, why: "AI Mode would not answer that one." };
      const content = (Array.isArray(msg.content) ? msg.content : []) as ColleagueBlock[];
      if (msg.stop_reason === "tool_use") {
        const { calls, refused } = checkCalls(content, CAPABILITY_SCHEMAS);
        const carry = nextCarry(ask, content, refused);
        if (carry.rounds.length >= COLLEAGUE_LIMITS.rounds - 1) return { ok: false, why: "AI Mode went round too many times on this one." };
        if (calls.length) {
          const { reply } = colleagueReply(content);
          return { ok: true, reply, calls: calls.map(c => ({ id: c.id, name: c.name, input: c.input })), assistant: carry, model, ms: Date.now() - asked };
        }
        ask = { ...ask, pending: { carry, results: [] } };
        continue;
      }
      const { reply, suggestions } = colleagueReply(content);
      if (!reply) return { ok: false, why: "AI Mode's answer could not be read." };
      if (msg.stop_reason === "max_tokens") {
        const cut = cutOffReply(content);
        if (!cut) return { ok: false, why: "The answer ran longer than AI Mode gives at once." };
        return { ok: true, reply: cut, unsure: unsureColleague(cut, ask), model, ms: Date.now() - asked };
      }
      return { ok: true, reply, ...(suggestions.length ? { suggestions } : {}), unsure: unsureColleague(reply, ask), model, ms: Date.now() - asked };
    }
    return { ok: false, why: "AI Mode kept asking for things Faultline does not offer." };
  } catch (e) {
    const detail = e instanceof Error ? e.message.slice(0, 300) : String(e).slice(0, 300);
    console.error("server job leg failed", detail);
    return { ok: false, why: "AI Mode could not answer just now — ask again." };
  }
}

export async function runServerJobLeg(
  client: Anthropic,
  admin: SupabaseClient,
  jobId: string,
): Promise<Response> {
  const { data: row, error } = await admin.from("luna_server_jobs").select("*").eq("id", jobId).maybeSingle();
  if (error || !row) return new Response(JSON.stringify({ ok: false, why: "No such job." }), { status: 404, headers: { "Content-Type": "application/json" } });
  const job = row as JobRow;
  if (job.status === "waiting_device") return new Response(JSON.stringify({ ok: true, skipped: "waiting_device" }), { headers: { "Content-Type": "application/json" } });
  if (job.status !== "queued" && job.status !== "running") return new Response(JSON.stringify({ ok: true, skipped: job.status }), { headers: { "Content-Type": "application/json" } });
  if (new Date(job.deadline_at).getTime() <= Date.now()) {
    await admin.from("luna_server_jobs").update({ status: "stopped", last_error: "Time for this job ran out.", finished_at: new Date().toISOString() }).eq("id", jobId);
    return new Response(JSON.stringify({ ok: true, stopped: "deadline" }), { headers: { "Content-Type": "application/json" } });
  }
  if (job.legs >= job.max_legs) {
    await admin.from("luna_server_jobs").update({ status: "done", finished_at: new Date().toISOString() }).eq("id", jobId);
    return new Response(JSON.stringify({ ok: true, stopped: "max_legs" }), { headers: { "Content-Type": "application/json" } });
  }

  const snap = job.snapshot;
  const body = {
    task: "colleague",
    turns: snap.turns,
    focus: snap.focus,
    today: snap.today,
    conversationId: job.conversation_id,
    client: job.client,
    ...(snap.preferences ? { preferences: snap.preferences } : {}),
    ...(snap.pending ? { pending: snap.pending } : {}),
    ...(Array.isArray(snap.images) ? { images: snap.images } : {}),
  };
  const read = readColleagueAsk(body);
  if (!read.ok) {
    await admin.from("luna_server_jobs").update({ status: "failed", last_error: read.why, finished_at: new Date().toISOString() }).eq("id", jobId);
    return new Response(JSON.stringify({ ok: false, why: read.why }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  await admin.from("luna_server_jobs").update({ status: "running" }).eq("id", jobId);
  const leg = await oneColleagueAnswer(client, admin, job.owner_id, read.ask);
  const next = afterLeg(snap, leg, job.legs);
  const finished = next.status === "done" || next.status === "failed" || next.status === "stopped";
  await admin.from("luna_server_jobs").update({
    snapshot: next.snapshot,
    status: next.status,
    legs: next.legs,
    ...(next.error ? { last_error: next.error } : {}),
    ...(finished ? { finished_at: new Date().toISOString() } : {}),
    updated_at: new Date().toISOString(),
  }).eq("id", jobId);

  return new Response(JSON.stringify({ ok: true, status: next.status, legs: next.legs }), { headers: { "Content-Type": "application/json" } });
}