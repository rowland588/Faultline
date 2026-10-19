/* GATECHECK — the server reads every gate pass again (supabase/GATE_CHECKS.sql;
 * lib/flow/gateCheck is the rule, lib/flow/serverCheck the reading, bundled
 * into ./check.js by scripts/build-gatecheck.mjs).
 *
 * Asked by the database: after a statement writes a project's steps or gates,
 * with { projects: [...] }; and every hour with { sweep: true }, for every pass
 * with no reading yet or one the records did not bear out. Each ask carries
 * the key from gate_check_key, read here with the service role; anything else
 * is refused. It reads the projects' rows with the service role, writes the
 * readings that moved to gate_checks — the one table only it writes — and
 * answers with counts, never with anyone's data. */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkProjects, toSweep } from "./check.js";

const url = Deno.env.get("SUPABASE_URL")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(url, service, { auth: { persistSession: false } });

const PAGE = 1000, IN = 100;
type Row = Record<string, unknown>;

/** Every row whose column is one of the values, a page at a time. */
async function fetchRows(table: string, column: string, values: readonly string[]): Promise<Row[]> {
  const out: Row[] = [];
  for (let i = 0; i < values.length; i += IN) {
    const part = values.slice(i, i + IN);
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db.from(table).select("*").in(column, part).order("id").range(from, from + PAGE - 1);
      if (error) throw new Error(`${table}: ${error.message}`);
      out.push(...((data ?? []) as Row[]));
      if (!data || data.length < PAGE) break;
    }
  }
  return out;
}

async function allRows(table: string, columns: string, filter: (q: any) => any): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await filter(db.from(table).select(columns)).order("id").range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...((data ?? []) as Row[]));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

Deno.serve(async (req: Request) => {
  const { data: key, error: keyError } = await db.from("gate_check_key").select("key").eq("id", 1).single();
  if (keyError || !key) return new Response("gate_check_key missing — run supabase/GATE_CHECKS.sql", { status: 500 });
  if (req.headers.get("x-check-key") !== key.key) return new Response("no", { status: 401 });

  let body: { projects?: unknown; sweep?: unknown } = {};
  try { body = await req.json(); } catch { /* an empty ask reads nothing */ }
  try {
    let projects = Array.isArray(body.projects) ? body.projects.filter((x): x is string => typeof x === "string") : [];
    if (body.sweep === true) {
      const passes = await allRows("flow_records", "id, project_id", q => q.eq("kind", "gate").eq("outcome", "done").is("deleted_at", null));
      const checks = await allRows("gate_checks", "id, verdict, deleted_at", q => q);
      projects = [...new Set([...projects, ...toSweep(passes as { id: string; project_id: string }[], checks as { id: string; verdict: string; deleted_at?: number | null }[])])];
    }
    const result = await checkProjects(projects, fetchRows, Date.now());
    for (let i = 0; i < result.write.length; i += IN) {
      const { error } = await db.from("gate_checks").upsert(result.write.slice(i, i + IN), { onConflict: "id" });
      if (error) throw new Error(`gate_checks: ${error.message}`);
    }
    return Response.json({ projects: projects.length, read: result.read, disagrees: result.disagrees, written: result.write.length });
  } catch (e) {
    return new Response(e instanceof Error ? e.message : String(e), { status: 500 });
  }
});
