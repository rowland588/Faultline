import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

/* THE MONTH'S CEILING: one figure over EVERYTHING this service spends (12 November, Rowland: "20 pound per month"). The daily
   allowances below are per task and per person; this is the whole bill: every task, every person, the evaluation's checks too, added
   up for the calendar month (UTC). When it is reached nothing more is asked of the model until the 1st, said in words and never
   silently, and Manual Mode does everything meanwhile. ASSIST_MONTHLY_USD (default 25, about 20 pounds); ASSIST_MONTHLY_FROM (an ISO
   day) starts the count later than the 1st, for the month the ceiling was set in. Read by pages of 1,000 rows, so a busy month is
   still added up whole. */
export const MONTHLY_MICROS = Math.round((Number(Deno.env.get("ASSIST_MONTHLY_USD") ?? 25) || 25) * 1_000_000);
/* the ceiling was set on 12 November 2026 and, by Rowland's word, counts from that day for its first month (it only applies inside that month) */
const MONTHLY_FROM = Deno.env.get("ASSIST_MONTHLY_FROM") ?? "2026-11-12";
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export async function monthLeft(admin: SupabaseClient): Promise<
  { ok: true; spent: number } | { ok: false; spent?: number; why: string }
> {
  const now = new Date();
  let start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const from = MONTHLY_FROM ? new Date(MONTHLY_FROM) : null;
  if (from && !Number.isNaN(from.getTime()) && from > start && from <= now) start = from;
  let spent = 0;
  for (let offset = 0; spent < MONTHLY_MICROS; offset += 1000) {
    const { data, error } = await admin.from("assist_usage").select("cost_micros").gte("at", start.toISOString())
      .order("at", { ascending: true }).order("id", { ascending: true }).range(offset, offset + 999);
    if (error) return { ok: false, why: "Luna could not check the AI budget. Try again later." };
    for (const row of data ?? []) spent += row.cost_micros ?? 0;
    if (!data || data.length < 1000) break;
  }
  if (spent >= MONTHLY_MICROS) {
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return { ok: false, spent, why: `This month's AI budget is spent ($${(MONTHLY_MICROS / 1_000_000).toFixed(0)}). It comes back on ${next.getUTCDate()} ${MONTH_NAMES[next.getUTCMonth()]}. Everything by hand works meanwhile, and the conversation is kept.` };
  }
  return { ok: true, spent };
}
