/* BUSINESS_SUMMARY — Luna's one read across the business (11 November, docs/ORGANISATION.md O4b; supabase/BUSINESS_SUMMARIES.sql).
 *
 * Rowland, 11 November: "an authorised senior manager should be able to ask meaningful questions across departments and production
 * lines … A team leader must not automatically have access to everything a managing director can see."
 *
 * With the cloud connected, the figures are worked out in the database by functions that run AS THE PERSON (security invoker — the same
 * row-level security as every read: a team leader in Packing sums Packing, a leader the business). Offline, or when the database cannot
 * answer, the device's own records are summed the same way (org/businessFigures), narrowed to the person's scope in their business —
 * and the sentence says which was used, the scope, and each figure's period. Read only; nothing written. */
import { getDB } from '../db/core';
import { listWorkspaces } from '../db/workspaces';
import { listObservations } from '../db/observations';
import { listAllSnags } from '../db/walk';
import { liveProductionLines } from '../lib/lines';
import { MINE_KEY, listOrgMembers, listOrganisations } from '../org/orgData';
import { forcedOrgRole } from '../org/orgStore';
import { myOrgRole } from '../org/orgRole';
import { LOCAL_ORG, roleName, type Organisation, type OrgRole } from '../org/organisation';
import { isWhole, linesInScope, myScope, scopeWords, type Scope } from '../org/roleHome';
import {
  PERIODS, lateFromRow, lateOnDevice, lossFromRow, lossesOnDevice, outputFromRow, periodOf, problemFromRow, problemsOnDevice, summarySays,
  type FigureSource, type PeriodKey, type Summary,
} from '../org/businessFigures';
import type { Observation, Workspace } from '../types';
import { anyone } from './access';
import { checkObject } from './check';
import type { CapResult, Capability } from './types';

export const SUMMARY_FAMILIES = ['losses', 'problems', 'late', 'output'] as const;
export type SummaryFamily = typeof SUMMARY_FAMILIES[number];

interface BIn { about?: SummaryFamily; period?: PeriodKey }

/** The person's business on this device, their role and scope (their own row; the whole business for its maker). */
export async function myBusinessOnDevice(email?: string): Promise<{ org?: Organisation; role?: OrgRole; scope: Scope }> {
  const db = await getDB();
  const id = (await db.get('meta', MINE_KEY)) as string | undefined;
  const orgs = await listOrganisations();
  const org = (id ? orgs.find(o => o.id === id) : undefined) ?? orgs.find(o => o.id === LOCAL_ORG);
  const role = forcedOrgRole() ?? myOrgRole();
  return { ...(org ? { org } : {}), ...(role ? { role } : {}), scope: org ? myScope(await listOrgMembers(org.id), email) : { sites: [], areas: [] } };
}

/** What the database says, or why it could not — each family its own function (BUSINESS_SUMMARIES.sql). */
type Rpc = (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
const TIMEOUT = 8000;
async function fromDatabase(rpc: Rpc, fams: readonly SummaryFamily[], from: number, to: number, now: number, org: string | undefined): Promise<{ ok: true; s: Summary } | { ok: false; why: string }> {
  const p_org = org && org !== LOCAL_ORG ? org : null;
  const day = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const call = (fn: string, args: Record<string, unknown>) => Promise.race([
    rpc(fn, { ...args, p_org }),
    new Promise<never>((_, no) => setTimeout(() => no(new Error('no answer in time')), TIMEOUT)),
  ]);
  try {
    const s: Summary = {};
    const rows = (d: unknown) => (Array.isArray(d) ? d as Record<string, unknown>[] : []);
    for (const f of fams) {
      if (f === 'losses') { const r = await call('luna_losses_by_line', { p_from: from, p_to: to }); if (r.error) return { ok: false, why: r.error.message ?? 'refused' }; s.losses = rows(r.data).map(lossFromRow); }
      if (f === 'problems') { const r = await call('luna_problems_by_area', { p_now: now }); if (r.error) return { ok: false, why: r.error.message ?? 'refused' }; s.problems = rows(r.data).map(problemFromRow); }
      if (f === 'late') { const r = await call('luna_actions_late', { p_now: now }); if (r.error) return { ok: false, why: r.error.message ?? 'refused' }; s.late = rows(r.data).map(lateFromRow); }
      if (f === 'output') {
        const r = await call('luna_output_by_line', { p_from: day(from), p_to: day(to - 1) });
        if (r.error) s.outputMissing = 'Output against target cannot be said: no production records are imported for this business (the database has no output to sum).';
        else s.output = rows(r.data).map(outputFromRow);
      }
    }
    return { ok: true, s };
  } catch (e) { return { ok: false, why: e instanceof Error ? e.message : String(e) }; }
}

/** The device's own sum, over the lines it holds in the person's business and scope. */
async function fromDevice(fams: readonly SummaryFamily[], lines: readonly Workspace[], from: number, to: number, now: number): Promise<Summary> {
  const s: Summary = {};
  const snags = fams.some(f => f === 'problems' || f === 'late') ? await listAllSnags() : [];
  if (fams.includes('losses')) {
    const obs: Observation[] = (await Promise.all(lines.map(l => listObservations(l.id)))).flat();
    s.losses = lossesOnDevice(lines, obs, from, to);
  }
  if (fams.includes('problems')) s.problems = problemsOnDevice(lines, snags, now);
  if (fams.includes('late')) s.late = lateOnDevice(lines, snags, now);
  if (fams.includes('output')) s.outputMissing = 'Output against target is worked out only in the database, from imported production records — it cannot be said on this device.';
  return s;
}

/** For tests and the acceptance script: how the database is reached (the cloud client's rpc, signed in), or none. */
let rpcFor: () => Promise<Rpc | undefined> = async () => {
  const { supabase } = await import('../cloud/client');
  if (!supabase) return undefined;
  const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
  if (!data.session) return undefined;
  return ((fn, args) => supabase.rpc(fn, args) as unknown as ReturnType<Rpc>) as Rpc;
};
export function setBusinessRpc(f: () => Promise<Rpc | undefined>): void { rpcFor = f; }

export const businessSummary: Capability = {
  name: 'business_summary', title: 'Across the business', kind: 'read',
  validate: raw => checkObject(raw ?? {}, {
    about: { kind: 'enum', values: SUMMARY_FAMILIES, label: 'what it is about (losses, problems, late or output)' },
    period: { kind: 'enum', values: PERIODS, label: 'the period (today, week, last_week, month or four_weeks)' },
  }),
  allowed: anyone,
  async run(ctx, input: BIn): Promise<CapResult> {
    const now = ctx.now;
    const period = periodOf(input.period ?? 'week', now);
    const fams: SummaryFamily[] = input.about ? [input.about] : ['losses', 'problems', 'late', 'output'];
    const biz = await myBusinessOnDevice(ctx.email);
    const who = biz.role ? `as ${roleName(biz.role)}${isWhole(biz.scope) ? ` across ${biz.org?.name ?? 'the business'}` : ` in ${scopeWords(biz.scope)}`}` : 'every line you may read';
    let source: FigureSource = 'device', s: Summary | undefined, why = '';
    const rpc = await rpcFor().catch(() => undefined);
    if (rpc) {
      const got = await fromDatabase(rpc, fams, period.from, period.to, now, biz.org?.id);
      if (got.ok) { source = 'database'; s = got.s; } else why = got.why;
    } else why = 'the cloud is not connected';
    if (!s) {
      const all = await liveProductionLines(await listWorkspaces());
      const inBiz = biz.org ? all.filter(w => !w.orgId || w.orgId === biz.org?.id) : all;
      s = await fromDevice(fams, linesInScope(inBiz, biz.scope), period.from, period.to, now);
    }
    const says = summarySays(s, source, period, who, now) + (source === 'device' ? ` (Not from the database: ${why}.)` : '');
    return { ok: true, says, refs: [], data: { source, period: { from: period.from, to: period.to, says: period.says }, scope: who, ...s } };
  },
};
