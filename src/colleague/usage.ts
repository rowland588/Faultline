/* WHAT THE AI COSTS, READ FROM ITS OWN RECORD (8 November, AI Mode phase 5b; docs/AI-MODE.md §8–9).
 *
 * Rowland, 8 November: "when we ask to do something in the app, we learn what was done and we actually want to replicate it
 * with code as much as possible — this keeps AI costs lower". So the first thing is to SEE the cost: the gateway writes one
 * assist_usage row for every answer it gives (supabase/ASSIST_USAGE.sql — who, which task, which model, the tokens, what it
 * cost in millionths of a dollar, and whether the answer could be read); a person may read their own rows. This module reads
 * them — by task, by day, today against each task's allowance — and says them. Pure: the page (screens/AiUsageScreen) fetches
 * the rows and hands them here, and the tests build rows by hand.
 *
 * MONEY: the gateway prices in US dollars (tools/video/gatewayUsage PRICES). A pound figure is said only when a rate is
 * configured (VITE_USD_TO_GBP on the build) — never an invented rate; without one the page says dollars, and says why. */

export interface UsageRow {
  at: string | number;
  task: string;
  model?: string | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  cost_micros?: number | null;
  ok?: boolean | null;
}

/** The tasks the gateway answers (supabase/functions/assist TASKS), in the order the page lists them. */
export const TASKS = ['colleague', 'talk', 'story', 'brief-read', 'brief-asks', 'video-label'] as const;

export const TASK_WORDS: Record<string, string> = {
  colleague: 'AI Mode — the colleague',
  talk: 'Line Talk',
  story: 'The Story — writing the chapter',
  'brief-read': 'The brief — read from its pages',
  'brief-asks': 'The brief — split into asks',
  'video-label': 'Video study — naming the work',
};
export const taskWords = (task: string): string => TASK_WORDS[task] ?? task;

/** Each task's allowance a day as the gateway sets it by default (supabase/functions/assist/index.ts — LIMIT, TALK_LIMIT,
 *  STORY_LIMIT, COLLEAGUE_LIMIT, BRIEF_LIMIT). The two brief tasks share one. The server may be set otherwise, so the page
 *  says these are the defaults. */
export interface AllowanceDefault { tasks: string[]; calls: number; usd: number }
export const ALLOWANCES: readonly AllowanceDefault[] = [
  { tasks: ['colleague'], calls: 120, usd: 8 },
  { tasks: ['talk'], calls: 60, usd: 5 },
  { tasks: ['story'], calls: 20, usd: 3 },
  { tasks: ['brief-read', 'brief-asks'], calls: 20, usd: 3 },
  { tasks: ['video-label'], calls: 25, usd: 3 },
];

const DAY = 86_400_000;
const msOf = (at: string | number): number => (typeof at === 'number' ? at : Date.parse(at));
const n = (v: number | null | undefined): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
/** A day as YYYY-MM-DD in local time. */
export const dayKey = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export interface TaskUsage { task: string; words: string; calls: number; failed: number; micros: number; tokensIn: number; tokensOut: number; perCallMicros: number }
export interface DayUsage { day: string; calls: number; micros: number; tokens: number }
export interface UsageRead {
  days: number;
  calls: number;
  failed: number;
  micros: number;
  tokensIn: number;
  tokensOut: number;
  perCallMicros: number;
  byTask: TaskUsage[];
  /** Every day of the window, oldest first, a day with nothing at 0. */
  byDay: DayUsage[];
  models: string[];
}

/** READ THE ROWS — the last `days` days to `now`, by task (the gateway's order, then any other) and by day. */
export function readUsage(rows: readonly UsageRow[], now: number, days = 30): UsageRead {
  const since = now - days * DAY;
  const mine = rows.filter(r => { const t = msOf(r.at); return Number.isFinite(t) && t > since && t <= now; });
  const tasks = new Map<string, TaskUsage>();
  const dayMap = new Map<string, DayUsage>();
  for (let i = days - 1; i >= 0; i--) { const k = dayKey(now - i * DAY); dayMap.set(k, { day: k, calls: 0, micros: 0, tokens: 0 }); }
  const models = new Set<string>();
  for (const r of mine) {
    const t = tasks.get(r.task) ?? { task: r.task, words: taskWords(r.task), calls: 0, failed: 0, micros: 0, tokensIn: 0, tokensOut: 0, perCallMicros: 0 };
    t.calls++; if (r.ok === false) t.failed++;
    t.micros += n(r.cost_micros); t.tokensIn += n(r.input_tokens); t.tokensOut += n(r.output_tokens);
    tasks.set(r.task, t);
    const d = dayMap.get(dayKey(msOf(r.at)));
    if (d) { d.calls++; d.micros += n(r.cost_micros); d.tokens += n(r.input_tokens) + n(r.output_tokens); }
    if (r.model) models.add(r.model);
  }
  const order = (k: string) => { const i = (TASKS as readonly string[]).indexOf(k); return i < 0 ? 99 : i; };
  const byTask = [...tasks.values()].map(t => ({ ...t, perCallMicros: t.calls ? Math.round(t.micros / t.calls) : 0 }))
    .sort((a, b) => order(a.task) - order(b.task) || a.task.localeCompare(b.task));
  const sum = (f: (t: TaskUsage) => number) => byTask.reduce((s, t) => s + f(t), 0);
  const calls = sum(t => t.calls), micros = sum(t => t.micros);
  return {
    days, calls, failed: sum(t => t.failed), micros, tokensIn: sum(t => t.tokensIn), tokensOut: sum(t => t.tokensOut),
    perCallMicros: calls ? Math.round(micros / calls) : 0, byTask, byDay: [...dayMap.values()], models: [...models].sort(),
  };
}

export interface TodayAllowance { tasks: string[]; words: string; calls: number; micros: number; limitCalls: number; limitUsd: number; said: string; near: boolean; spent: boolean }

/** TODAY AGAINST THE ALLOWANCE — the last 24 hours, as the gateway counts it, for each allowance (only those used, unless
 *  `all`). Said in words: "12 of 120 answers · $0.31 of $8.00 — the defaults". */
export function todayAgainst(rows: readonly UsageRow[], now: number, money: (micros: number) => string, all = false): TodayAllowance[] {
  const since = now - DAY;
  const recent = rows.filter(r => { const t = msOf(r.at); return t > since && t <= now; });
  return ALLOWANCES.map(a => {
    const mine = recent.filter(r => a.tasks.includes(r.task));
    const calls = mine.length, micros = mine.reduce((s, r) => s + n(r.cost_micros), 0);
    const limMicros = a.usd * 1_000_000;
    const spent = calls >= a.calls || micros >= limMicros;
    const near = !spent && (calls >= a.calls * 0.8 || micros >= limMicros * 0.8);
    const words = a.tasks.map(taskWords).join(' and ');
    const said = `${calls} of ${a.calls} answers · ${money(micros)} of $${a.usd.toFixed(2)}${spent ? ' — spent until the 24 hours move on' : near ? ' — close to the allowance' : ''}`;
    return { tasks: a.tasks, words, calls, micros, limitCalls: a.calls, limitUsd: a.usd, said, near, spent };
  }).filter(a => all || a.calls > 0);
}

/** MONEY IN WORDS — dollars as the gateway prices them, or pounds when a rate is configured. A cost under a cent is said to
 *  a tenth of a cent so a cheap call is never "$0.00". */
export function moneyOf(rate?: number | null): { currency: '$' | '£'; say: (micros: number) => string; note: string } {
  const r = typeof rate === 'number' && Number.isFinite(rate) && rate > 0 ? rate : null;
  const cur = r ? '£' as const : '$' as const;
  const say = (micros: number): string => {
    const v = (micros / 1_000_000) * (r ?? 1);
    if (v === 0) return `${cur}0`;
    if (Math.abs(v) < 0.01) return `${cur}${v.toFixed(4)}`;
    return `${cur}${v.toFixed(2)}`;
  };
  const note = r
    ? `In pounds at $1 = £${r} (the rate set on this build); the gateway prices in dollars.`
    : 'In US dollars, as the gateway prices each answer — no pound rate is set on this build, so none is guessed.';
  return { currency: cur, say, note };
}

/** A REQUEST TO THE COLLEAGUE — one thing the person sent — may take several gateway answers (a round for each set of
 *  calls). assist_usage does not say which answers belong to which request, so cost per request is worked out only from the
 *  requests this device holds (the person's turns in its AI Mode conversations, over the same days), and said as an upper
 *  bound: answers to requests sent from another device are in the cost and not in the count. None held: per answer only. */
export function perRequest(colleagueMicros: number, colleagueCalls: number, requestsOnDevice: number): { perRequestMicros?: number; answersPerRequest?: number; said: string } {
  if (!requestsOnDevice || !colleagueCalls) return { said: 'Per answer only — no AI Mode requests on this device in these days, so answers cannot be told apart into requests.' };
  return {
    perRequestMicros: Math.round(colleagueMicros / requestsOnDevice),
    answersPerRequest: Math.round((colleagueCalls / requestsOnDevice) * 10) / 10,
    said: `Worked out from the ${requestsOnDevice} request${requestsOnDevice === 1 ? '' : 's'} this device sent — at most; requests sent from another device are in the cost but not the count.`,
  };
}
