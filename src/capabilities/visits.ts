/* LUNA AND THE VISIT (11 November, docs/CONSULTANT-WORKSPACE.md C6 — Rowland: "Faultline needs to work for a consultant who visits
 * multiple businesses … I'm at a new customer today"; lib/visits, lib/activeClient).
 *
 *   start_visit    write  a card: a visit at a customer — a new one added by its name, an archived one continued — with its site and what
 *                         the person was asked; the customer made the client they are in, the visit in hand (lib/visits startVisit, the same
 *                         function Start a visit uses). One card for both: "I'm at a new customer today, I've been asked to look at …".
 *   end_visit      write  a card: the visit in hand ended — its page lists what was captured, for the report.
 *   visit_state    read   the visit in hand (or the latest one) and what has been captured on it — only that customer's lines, never another's.
 *   switch_client  local  "I'm back at Branston": the client the person is in, switched (the top bar's own choice) — no card, said in the
 *                         reply. Only a customer in use; an archived one is not offered (continue it on Set up, or start a visit there). */
import { listAllSnags, listAllStandards, listAllStudies, listObservations, listWorkspaces } from '../db';
import { listDepartments } from '../db/departments';
import { customersOf, customerKey, customerName } from '../lib/customers';
import { setActiveClient, activeClientNow } from '../lib/activeClient';
import { endVisit, startVisit, storedVisit, visitDay, visitInHand, visitRecords, visitSays, visitsOf, isHolding, type Visit } from '../lib/visits';
import { problemCost } from '../lib/problemCost';
import { neckOf } from '../lib/lineLoss';
import { studyTitle } from '../lib/studyLinks';
import { checkObject } from './check';
import { anyone, mayEdit } from './access';
import type { CapCtx, CapRef, CapResult, Capability } from './types';

const visitRef = (v: Visit): CapRef => ({ kind: 'page', id: v.id, label: `${v.client} · Visit ${visitDay(v)}`, href: `/visit/${encodeURIComponent(v.id)}` });
const hhmm = (t: number) => new Date(t).toTimeString().slice(0, 5);

async function inHandNow(): Promise<Visit | undefined> {
  return visitInHand(visitsOf(await listAllStudies()), storedVisit());
}

/* ── start_visit ── */
interface StartIn { client: string; site?: string; brief?: string }
export const startVisitCap: Capability = {
  name: 'start_visit', title: 'Start a visit', kind: 'write',
  validate: raw => {
    const c = checkObject(raw, {
      client: { kind: 'string', label: 'the customer’s name', required: true, max: 80 },
      site: { kind: 'string', label: 'its site', max: 80 },
      brief: { kind: 'string', label: 'what the person was asked to look at, in their words', max: 600 },
    });
    if (c.ok && !customerName(String(c.input.client)).ok) return { ok: false, why: 'Say which customer — its name.' };
    return c;
  },
  allowed: (ctx: CapCtx) => mayEdit(ctx),
  async preview(_ctx, input: StartIn) {
    const [lines, studies] = await Promise.all([listWorkspaces(), listAllStudies()]);
    const had = customersOf(lines, studies).find(c => customerKey(c.name) === customerKey(input.client));
    const name = had?.name ?? input.client.trim();
    const site = input.site?.trim() || had?.site;
    const before = visitInHand(visitsOf(studies), storedVisit());
    return [
      !had ? `Add ${name} as a new customer${site ? ` (${site})` : ''} — nothing else needed: its lines come later` : had.archived ? `Continue ${name} — it is archived; everything of it comes back as it was` : `${name}${site ? ` (${site})` : ''} — one of your customers`,
      `and start a visit there today${input.brief?.trim() ? `, what you were asked kept as its brief: “${input.brief.trim()}”` : ''}.`,
      `${name} becomes the client you are in; what you capture from now — problems, photos, measurements, talks — is read onto the visit, and nothing of any other customer is.`,
      before ? `The visit at ${before.client} (since ${hhmm(before.startedAt)}) is ended first.` : '',
    ].filter(Boolean).join(' ');
  },
  async run(ctx, input: StartIn): Promise<CapResult> {
    const r = await startVisit({ client: input.client, ...(input.site ? { site: input.site } : {}), ...(input.brief ? { brief: input.brief } : {}), ...(ctx.me ? { by: ctx.me } : {}) });
    if (!r.ok) return r;
    const v = r.visit;
    return {
      ok: true,
      says: `${r.created ? `${v.client} is a customer now, and the` : r.continued ? `${v.client} is continued, and the` : 'The'} visit at ${v.client}${v.site ? ` (${v.site})` : ''} is started — ${visitDay(v)}, in hand.${v.brief ? ` Its brief: “${v.brief}”.` : ''} ${v.client} is the client you are in.${r.ended ? ` The visit at ${r.ended.client} was ended first.` : ''}`,
      data: { visitId: v.id, client: v.client, created: r.created },
      refs: [visitRef(v)],
    };
  },
};

/* ── end_visit ── */
export const endVisitCap: Capability = {
  name: 'end_visit', title: 'End the visit', kind: 'write',
  validate: raw => checkObject(raw, {}),
  allowed: async (ctx: CapCtx) => {
    const v = await inHandNow();
    if (!v) return { ok: false, why: 'No visit is in hand on this device — nothing to end.' };
    return mayEdit(ctx);
  },
  async preview() {
    const v = await inHandNow();
    if (!v) return 'No visit is in hand.';
    const f = await recordsOf(v);
    return `End the visit at ${v.client} (since ${hhmm(v.startedAt)}) — ${visitSays(f).toLowerCase()}. Its page then lists what was captured, and the visit report is made from it when you ask.`;
  },
  async run(): Promise<CapResult> {
    const v = await inHandNow();
    if (!v) return { ok: false, why: 'No visit is in hand on this device.' };
    await endVisit(v);
    const f = await recordsOf({ ...v, endedAt: Date.now() });
    return { ok: true, says: `The visit at ${v.client} is ended — ${visitSays(f).toLowerCase()}. Make the visit report from its page when you want it.`, refs: [visitRef(v)] };
  },
};

/** What was captured on a visit — the customer's lines only (lib/visits visitRecords). */
async function recordsOf(v: Visit) {
  const [lines, snags, studies, departments] = await Promise.all([listWorkspaces(), listAllSnags(), listAllStudies(), listDepartments()]);
  const mine = lines.filter(w => customerKey(w.clientName) === customerKey(v.client));
  const stops = (await Promise.all(mine.map(w => listObservations(w.id)))).flat();
  return visitRecords(v, { lines, snags, studies, stops, departments });
}

/* ── visit_state ── */
export const visitState: Capability = {
  name: 'visit_state', title: 'The visit', kind: 'read',
  validate: raw => checkObject(raw, {}),
  allowed: anyone,
  async run(): Promise<CapResult> {
    const all = visitsOf(await listAllStudies());
    const hand = visitInHand(all, storedVisit());
    const ac = await activeClientNow();
    /* the visit in hand, else the latest at the client the person is in — never another customer's */
    const v = hand ?? (ac.client ? all.find(x => customerKey(x.client) === customerKey(ac.client)) : undefined);
    if (!v) return { ok: true, says: `No visit is in hand${ac.client ? `, and none has been made at ${ac.client}` : ''}. Start one when the person arrives at a customer.`, data: { inHand: false, client: ac.client }, refs: [] };
    const f = await recordsOf(v);
    const [lines, standards] = await Promise.all([listWorkspaces(), listAllStandards()]);
    const byLine = new Map(lines.map(w => [w.id, w]));
    const problems = f.problems.map(s => {
      const w = byLine.get(s.workspaceId);
      const c = w ? problemCost(s, s.targetAsset, w, neckOf(standards, w.id)) : undefined;
      return { id: s.id, what: s.problem, where: !w ? '' : isHolding(w) ? 'held at the customer, not on a line yet' : w.name, priority: s.priority ?? 'low', ...(c ? { money: c.short } : {}) };
    });
    const data = {
      inHand: !!hand, client: v.client, site: v.site, day: v.day, startedAt: v.startedAt, ...(v.endedAt ? { endedAt: v.endedAt } : {}), brief: v.brief,
      problems,
      photos: f.photos.map(p => ({ key: p.key, at: p.at, caption: p.caption, from: p.from })),
      studies: f.studies.map(s => ({ id: s.id, title: studyTitle(s), line: byLine.get(s.workspaceId ?? '')?.name })),
      stopsTimed: f.stops.length,
      talks: f.talks.map(s => ({ id: s.id, name: s.name })),
    };
    return {
      ok: true,
      says: `${hand ? 'The visit in hand' : 'The latest visit'}: ${v.client}${v.site ? ` (${v.site})` : ''}, ${visitDay(v)}, ${hand ? `since ${hhmm(v.startedAt)}` : `${hhmm(v.startedAt)}–${hhmm(v.endedAt ?? v.startedAt)}`}${v.brief ? ` — asked: “${v.brief}”` : ''}. Captured: ${visitSays(f).toLowerCase()}.`,
      data, refs: [visitRef(v), ...f.problems.slice(0, 8).map(s => ({ kind: 'problem' as const, id: s.id, label: s.problem, href: `/snags?open=${encodeURIComponent(s.id)}` }))],
    };
  },
};

/* ── switch_client ── */
export const switchClient: Capability = {
  name: 'switch_client', title: 'The client you are in', kind: 'local',
  validate: raw => checkObject(raw, { client: { kind: 'string', label: 'the customer’s name', required: true, max: 80 } }),
  allowed: anyone,
  async run(_ctx, input: { client: string }): Promise<CapResult> {
    const [lines, studies] = await Promise.all([listWorkspaces(), listAllStudies()]);
    const cs = customersOf(lines, studies);
    /* OUT OF EVERY BUSINESS — the person's own, independent work (12 November, docs/ARCHITECTURE.md §9): "let's leave that business
       for now", "this one is for me". No customer is in hand; nothing of any business is brought in unless they name it. */
    if (/^(none|no ?one|nobody|my ?own|myself|me|independent|personal|own work|no client|no customer|no business)$/i.test(input.client.trim())) {
      setActiveClient('');
      const v0 = visitInHand(visitsOf(studies), storedVisit());
      return { ok: true, says: `No business is in hand now — this is your own work. Nothing of any customer is brought in unless you name it.${v0 ? ` The visit at ${v0.client} is still in hand — end it when you have left.` : ''}`, data: { client: '' }, refs: [] };
    }
    const c = cs.find(x => customerKey(x.name) === customerKey(input.client));
    if (!c) return { ok: false, why: `No customer called “${input.client.trim()}” in the app${cs.filter(x => !x.archived).length ? ` — yours are ${cs.filter(x => !x.archived).map(x => x.name).join(', ')}` : ''}. Start a visit there to add it.` };
    if (c.archived) return { ok: false, why: `${c.name} is archived — continue it (Set up › Customers) or start a visit there, and it comes back as it was.` };
    setActiveClient(c.name);
    const v = visitInHand(visitsOf(studies), storedVisit());
    const away = v && customerKey(v.client) !== customerKey(c.name);
    return { ok: true, says: `You are in ${c.name} now — its lines, problems, projects and story only; nothing of any other customer.${away ? ` The visit at ${v.client} is still in hand — end it when you have left.` : ''}`, data: { client: c.name }, refs: [] };
  },
};

export const VISITS: readonly Capability[] = [startVisitCap, endVisitCap, visitState, switchClient];
