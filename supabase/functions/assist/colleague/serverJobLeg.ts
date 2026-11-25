/* One gateway go for a parked server job (24 November 2026, docs/LUNA-G6-SERVER.md) — same colleague answer as AI Mode,
 * allowance debited to the owner, job row updated. Invoked with x-keepup-key from colleague-job cron, or the owner's JWT. */
import type Anthropic from "npm:@anthropic-ai/sdk@0.131.0";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { allowance, costMicros, lunaDailyAllowance, usageParts, type Usage } from "../video/gatewayUsage.ts";
import {
  COLLEAGUE_ALLOWANCE_WORDS,
  COLLEAGUE_LIMITS,
  colleagueReply,
  cutOffReply,
  nextCarry,
  readColleagueAsk,
  unsureColleague,
  checkCalls,
  type ColleagueAsk,
  type ColleagueBlock,
} from "./colleagueAssist.ts";
import { monthLeft } from "../budget.ts";
import { lunaClaudeRequest, lunaModelSettings } from "./colleagueRequest.ts";
import { CAPABILITY_SCHEMAS } from "./schemas.ts";

const LUNA = lunaModelSettings(name => Deno.env.get(name), "high");
const COLLEAGUE_LIMIT = lunaDailyAllowance(name => Deno.env.get(name));
const SERVER_JOB_ROUNDS = 6;

type Snap = Record<string, unknown>;
type JobStep = { what: string; status: string; note?: string; at?: number };
type Job = { goal: string; steps: JobStep[]; startedAt: number; endedAt?: number; writesApproved?: boolean };
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

const jobOpen = (j: Job | undefined): boolean =>
  !!j?.steps?.some(s => s.status === "todo" || s.status === "doing");

const same = (a: string, b: string) => a.trim().toLowerCase().replace(/\s+/g, " ") === b.trim().toLowerCase().replace(/\s+/g, " ");

function planJob(goal: string, steps: string[], now: number, was?: Job): Job | string {
  const g = goal.trim().slice(0, 300);
  const list = steps.map(s => s.trim().slice(0, 140)).filter(Boolean).filter((s, i, all) => all.findIndex(x => same(x, s)) === i);
  if (!g) return "A job needs its goal — what the person asked for, in their words.";
  if (list.length < 2) return "A job is at least 2 steps — a single step is just done, with no plan.";
  if (list.length > 8) return "A job is at most 8 steps — put the small ones together.";
  const carry = was && jobOpen(was) && same(was.goal, g) ? was : undefined;
  return {
    goal: g,
    steps: list.map(what => {
      const old = carry?.steps.find(s => same(s.what, what));
      return old ? { ...old, what } : { what, status: "todo" };
    }),
    startedAt: carry?.startedAt ?? now,
    ...(carry?.writesApproved ? { writesApproved: carry.writesApproved } : {}),
  };
}

function stepJob(j: Job, n: number, status: string, note: string | undefined, now: number): Job | string {
  if (!Number.isInteger(n) || n < 1 || n > j.steps.length) return `There is no step ${n} — the job has ${j.steps.length}.`;
  const words = note?.trim().slice(0, 240);
  if (status === "blocked" && !words) return "A blocked step says why — what is missing, or what stopped it.";
  const steps = j.steps.map((s, i): JobStep => {
    if (i !== n - 1) return s;
    const { note: _old, ...rest } = s; void _old;
    return { ...rest, status, ...(words ? { note: words } : status === "doing" && s.note ? { note: s.note } : {}), at: now };
  });
  const { endedAt: _e, ...rest } = j; void _e;
  const open = steps.some(s => s.status === "todo" || s.status === "doing");
  return { ...rest, steps, ...(open ? {} : { endedAt: now }) };
}

function applyLocal(snap: Snap, calls: { id: string; name: string; input: unknown }[], now: number): { snap: Snap; results: { id: string; ok: boolean; says: string; data?: unknown }[]; leftover: { id: string; name: string; input: unknown }[] } {
  const results: { id: string; ok: boolean; says: string; data?: unknown }[] = [];
  const leftover: { id: string; name: string; input: unknown }[] = [];
  let job = snap.job as Job | undefined;
  for (const c of calls) {
    if (c.name === "plan_job") {
      const raw = c.input && typeof c.input === "object" ? c.input as { goal?: unknown; steps?: unknown } : {};
      const out = planJob(typeof raw.goal === "string" ? raw.goal : "", Array.isArray(raw.steps) ? raw.steps.map(s => String(s)) : [], now, job);
      if (typeof out === "string") { results.push({ id: c.id, ok: false, says: out }); continue; }
      job = out;
      results.push({ id: c.id, ok: true, says: `Job taken: “${job.goal}” — ${job.steps.length} steps.`, data: { job } });
      continue;
    }
    if (c.name === "job_step") {
      if (!job) { results.push({ id: c.id, ok: false, says: "No job is planned on this subject — plan_job first." }); continue; }
      const raw = c.input && typeof c.input === "object" ? c.input as { step?: unknown; status?: unknown; note?: unknown } : {};
      const n = typeof raw.step === "number" ? raw.step : Number(raw.step);
      const out = stepJob(job, n, String(raw.status ?? ""), typeof raw.note === "string" ? raw.note : undefined, now);
      if (typeof out === "string") { results.push({ id: c.id, ok: false, says: out }); continue; }
      job = out;
      results.push({ id: c.id, ok: true, says: `Step ${n} ${raw.status as string}.`, data: { job, finished: !jobOpen(job) } });
      continue;
    }
    leftover.push(c);
  }
  return { snap: { ...snap, ...(job ? { job } : {}) }, results, leftover };
}

function afterLeg(snap: Snap, leg: Record<string, unknown>, legsSoFar: number, maxLegs: number, now: number): { snapshot: Snap; status: string; legs: number; error?: string; continueRound?: boolean } {
  if (leg.ok !== true) {
    const why = String(leg.why ?? "AI Mode could not answer just now.");
    return { snapshot: { ...snap, reply: why }, status: "failed", legs: legsSoFar, error: why };
  }
  const reply = String(leg.reply ?? "").trim();
  const withReply = reply ? { reply: [snap.reply, reply].filter(Boolean).join("\n\n") } : {};
  const calls = Array.isArray(leg.calls) ? leg.calls as { id: string; name: string; input: unknown }[] : [];
  if (calls.length) {
    const applied = applyLocal({ ...snap, pending: { assistant: leg.assistant ?? null, results: (snap.pending as { results?: unknown[] })?.results ?? [] }, ...withReply }, calls, now);
    const assistant = (applied.snap.pending as { assistant?: unknown } | undefined)?.assistant ?? leg.assistant ?? null;
    if (applied.leftover.length) {
      return {
        snapshot: { ...applied.snap, proposedCalls: applied.leftover, pending: { assistant, results: applied.results } },
        status: "waiting_device",
        legs: legsSoFar + 1,
      };
    }
    return {
      snapshot: { ...applied.snap, proposedCalls: undefined, pending: { assistant, results: applied.results } },
      status: "running",
      legs: legsSoFar + 1,
      continueRound: true,
    };
  }
  const job = snap.job as Job | undefined;
  const next: Snap = {
    ...snap,
    proposedCalls: undefined,
    pending: undefined,
    ...withReply,
    ...(Array.isArray(leg.suggestions) && leg.suggestions.length ? { suggestions: leg.suggestions } : {}),
    ...(Array.isArray(leg.unsure) && leg.unsure.length ? { unsure: leg.unsure } : {}),
  };
  const done = job ? !jobOpen(job) : !!reply;
  if (done || legsSoFar + 1 >= maxLegs) return { snapshot: next, status: "done", legs: legsSoFar + 1 };
  return { snapshot: next, status: "running", legs: legsSoFar + 1, continueRound: true };
}

async function oneColleagueAnswer(client: Anthropic, admin: SupabaseClient, userId: string, first: ColleagueAsk): Promise<Record<string, unknown>> {
  const month = await monthLeft(admin);
  if (!month.ok) return { ok: false, why: month.why };
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { data: rows, error } = await admin.from("assist_usage").select("at, cost_micros").eq("user_id", userId).in("task", ["colleague", "colleague-server"]).gte("at", since);
  if (error) return { ok: false, why: "Luna could not check the daily allowance. Try again later." };
  const left = allowance(rows ?? [], Date.now(), COLLEAGUE_LIMIT, COLLEAGUE_ALLOWANCE_WORDS);
  if (!left.ok) return { ok: false, why: left.why };

  let ask = first;
  try {
    for (let tries = 0; tries < 3; tries++) {
      const request = lunaClaudeRequest(ask, CAPABILITY_SCHEMAS, LUNA);
      const { params } = request;
      const asked = Date.now();
      const msg = await client.beta.messages.create(params as unknown as Parameters<typeof client.beta.messages.create>[0]) as unknown as { model?: string; stop_reason?: string; content?: unknown; usage?: Usage };
      const model = msg.model ?? request.model;
      const usage = msg.usage ?? {};
      const parts = usageParts(usage);
      const base = { user_id: userId, task: "colleague-server", model, input_tokens: parts.fresh + parts.read + parts.write5m + parts.write1h, output_tokens: parts.out, cost_micros: costMicros(model, usage), ok: msg.stop_reason !== "refusal" };
      const { error: noDetail } = await admin.from("assist_usage").insert({ ...base, cache_read_tokens: parts.read, cache_write_tokens: parts.write5m, cache_write_1h_tokens: parts.write1h, fast_chat: request.fast, tools_mode: request.fast ? "none" : LUNA.tools, cache_ttl: request.cacheTTL, conversation_id: first.conversationId ?? null, client: first.client ?? null, ended: msg.stop_reason ?? null, effort: request.effort });
      if (noDetail) await admin.from("assist_usage").insert(base);
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

function askFromSnap(job: JobRow, snap: Snap): ReturnType<typeof readColleagueAsk> {
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
  return readColleagueAsk(body);
}

export async function runServerJobLeg(
  client: Anthropic,
  admin: SupabaseClient,
  jobId: string,
): Promise<Response> {
  const { data: row, error } = await admin.from("luna_server_jobs").select("*").eq("id", jobId).maybeSingle();
  if (error || !row) return new Response(JSON.stringify({ ok: false, why: "No such job." }), { status: 404, headers: { "Content-Type": "application/json" } });
  let job = row as JobRow;
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

  let snap = job.snapshot;
  let status = job.status;
  let legs = job.legs;
  let lastError: string | undefined;
  await admin.from("luna_server_jobs").update({ status: "running" }).eq("id", jobId);

  for (let round = 0; round < SERVER_JOB_ROUNDS; round++) {
    if (new Date(job.deadline_at).getTime() <= Date.now()) {
      status = "stopped"; lastError = "Time for this job ran out."; break;
    }
    if (legs >= job.max_legs) { status = "done"; break; }
    const read = askFromSnap(job, snap);
    if (!read.ok) {
      status = "failed"; lastError = read.why;
      break;
    }
    const leg = await oneColleagueAnswer(client, admin, job.owner_id, read.ask);
    const next = afterLeg(snap, leg, legs, job.max_legs, Date.now());
    snap = next.snapshot;
    status = next.status;
    legs = next.legs;
    lastError = next.error;
    const finished = status === "done" || status === "failed" || status === "stopped" || status === "waiting_device";
    await admin.from("luna_server_jobs").update({
      snapshot: snap,
      status,
      legs,
      ...(next.error ? { last_error: next.error } : {}),
      ...(finished && status !== "waiting_device" ? { finished_at: new Date().toISOString() } : {}),
      updated_at: new Date().toISOString(),
    }).eq("id", jobId);
    if (!next.continueRound || finished) break;
  }

  const finished = status === "done" || status === "failed" || status === "stopped";
  if (finished || status === "waiting_device") {
    await admin.from("luna_server_jobs").update({
      snapshot: snap, status, legs,
      ...(lastError ? { last_error: lastError } : {}),
      ...(finished ? { finished_at: new Date().toISOString() } : {}),
      updated_at: new Date().toISOString(),
    }).eq("id", jobId);
  }

  return new Response(JSON.stringify({ ok: true, status, legs }), { headers: { "Content-Type": "application/json" } });
}
