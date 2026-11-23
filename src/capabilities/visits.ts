/* LUNA AND THE VISIT (11 November, docs/CONSULTANT-WORKSPACE.md C6 — Rowland: "Faultline needs to work for a consultant who visits
 * multiple businesses … I'm at a new customer today"; lib/visits, lib/activeClient).
 *
 *   start_visit    write  a card: a visit at a customer — a new one added by its name, an archived one continued — with its site and what
 *                         the person was asked; the customer made the client they are in, the visit in hand (lib/visits startVisit, the same
 *                         function Start a visit uses). One card for both: "I'm at a new customer today, I've been asked to look at …".
 *   end_visit      write  a card: the visit in hand ended — its page lists what was captured, for the report.
 *   visit_state    read   the visit in hand (or the latest one) and what has been captured on it — only that customer's lines, never another's.
 *   switch_client  local  "I'm back at Branston": the client the person is in, switched (the top bar's own choice) — no card, said in the
 *                         reply. Only a customer in use; an archived one is not offered (continue it on Set up, or start a visit there).
 *
 * THE CUSTOMERS THEMSELVES (21 November — Rowland: "Can't find archive client? Was in Set up … simple things missing"): what Set up's
 * Customers does by hand, Luna does on a card.
 *   list_customers     read   the customers in use and the archived, each with its site and lines, and which one the person is in.
 *   archive_customer   write  a card: the customer put away — it leaves the customer menu and every list and nothing of it is read;
 *                             everything of it is kept. lib/customers archiveCustomer, the function the Archive button calls.
 *   continue_customer  write  a card: an archived customer brought back exactly as it was, and made the one the person is in.
 * ARCHIVING A CUSTOMER IS THE ONE THING LUNA MAY PUT AWAY — BY ROWLAND'S WORD. The AI never deletes a record and never puts one away
 * (docs/DIRECTION.md, "The AI may operate Faultline", rule 3; held by capabilities.test, which refuses any capability named delete,
 * remove, archive or verify). archive_customer was built on 21 November, refused by that test, taken out — and the rule put to him:
 * "Let Luna archive a customer on a confirm card." So it is the test's one named exception, on these terms: it never runs without the
 * yes (a write), it is refused before any card for a name that is no customer or a person let in only to a project, it deletes
 * nothing (only the archive stamp on the customer's story moves), and continue_customer undoes it exactly. Nothing else of hers
 * archives, removes or deletes. */
import { listAllSnags, listAllStandards, listAllStudies, listObservations, listWorkspaces } from '../db';
import { listDepartments } from '../db/departments';
import { customersOf, customerKey, customerName } from '../lib/customers';
import { setActiveClient, activeClientNow } from '../lib/activeClient';
import { endVisit, startVisit, storedVisit, visitDay, visitInHand, visitRecords, visitSays, visitsOf, isHolding, type Visit } from '../lib/visits';
import { problemCost } from '../lib/problemCost';
import { neckOf } from '../lib/lineLoss';
import { studyTitle } from '../lib/studyLinks';
import { checkObject } from './check';
import { anyone, mayEdit, mayStartProjects } from './access';
import { archiveCustomer, continueCustomer, type Customer } from '../lib/customers';
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

/* ── the customers themselves: listed, archived, continued ── */
const customersNow = async (): Promise<Customer[]> => { const [lines, studies] = await Promise.all([listWorkspaces(), listAllStudies()]); return customersOf(lines, studies); };
const customerSaid = (c: Customer): string => `${c.name}${c.site ? ` (${c.site})` : ''} — ${c.lines ? `${c.lines} line${c.lines === 1 ? '' : 's'}` : 'no lines yet'}`;
const named = (cs: readonly Customer[], name: string): Customer | undefined => cs.find(c => customerKey(c.name) === customerKey(name));
const yours = (cs: readonly Customer[]): string => (cs.some(c => !c.archived) ? ` Yours are ${cs.filter(c => !c.archived).map(c => c.name).join(', ')}.` : '');
const customerIn = { client: { kind: 'string' as const, label: 'the customer’s name', required: true, max: 80 } };

export const listCustomers: Capability = {
  name: 'list_customers', title: 'Your customers', kind: 'read',
  validate: raw => checkObject(raw, {}),
  allowed: anyone,
  async run(): Promise<CapResult> {
    const cs = await customersNow();
    const live = cs.filter(c => !c.archived), away = cs.filter(c => c.archived);
    const now = (await activeClientNow()).client;
    return {
      ok: true, refs: [{ kind: 'page', id: 'customers', label: 'Customers', href: '/factory?customer=manage' }],
      data: { inUse: live.map(c => ({ name: c.name, site: c.site ?? null, lines: c.lines })), archived: away.map(c => ({ name: c.name, site: c.site ?? null, lines: c.lines, archivedAt: c.archivedAt ?? null })), inHand: now },
      says: `${live.length ? `Customers in use: ${live.map(customerSaid).join('; ')}.` : 'No customer is named yet — one is added on Set up, or by starting a visit there.'}${away.length ? ` Archived — kept exactly as they were, in no list, and nothing of them is read: ${away.map(customerSaid).join('; ')}.` : ''}${now ? ` The person is in ${now}.` : live.length > 1 ? ' The person is in all of them at once.' : ''} Putting one away is archive_customer and bringing one back is continue_customer — a card each, only when they ask for that customer by name.`,
    };
  },
};

export const archiveCustomerCap: Capability = {
  name: 'archive_customer', title: 'Archive a customer', kind: 'write',
  validate: raw => checkObject(raw, customerIn),
  async allowed(ctx: CapCtx, input: { client: string }) {
    const may = await mayStartProjects(ctx);
    if (!may.ok) return may;
    const cs = await customersNow();
    const c = named(cs, input.client);
    if (!c) return { ok: false, why: `No customer called “${input.client.trim()}” in the app.${yours(cs)}` };
    if (c.archived) return { ok: false, why: `${c.name} is archived already — continue_customer brings it back.` };
    return { ok: true };
  },
  async preview(_ctx, input: { client: string }) {
    const c = named(await customersNow(), input.client);
    const n = c?.name ?? input.client.trim();
    return `Archive ${n}: it leaves the customer menu and every list, and nothing of it is read from then on — not by the pages, not by Luna. Its ${c?.lines ? `${c.lines} line${c.lines === 1 ? '' : 's'}, ` : ''}problems, projects, files and reports are kept exactly as they are; nothing is deleted. Continue brings it all back.`;
  },
  async run(_ctx, input: { client: string }): Promise<CapResult> {
    const c = named(await customersNow(), input.client);
    const r = await archiveCustomer(c?.name ?? input.client);
    if (!r.ok) return r;
    return { ok: true, says: `${c?.name ?? input.client.trim()} is put away — out of every list, everything kept, and nothing of it is read until you continue it. Set up › Customers › Archived, or ask.`, data: { client: c?.name ?? input.client.trim(), archived: true }, refs: [{ kind: 'page', id: 'customers', label: 'Customers', href: '/factory?customer=manage' }] };
  },
};

export const continueCustomerCap: Capability = {
  name: 'continue_customer', title: 'Continue a customer', kind: 'write',
  validate: raw => checkObject(raw, customerIn),
  async allowed(ctx: CapCtx, input: { client: string }) {
    const may = await mayStartProjects(ctx);
    if (!may.ok) return may;
    const cs = await customersNow();
    const c = named(cs, input.client);
    if (!c) return { ok: false, why: `No customer called “${input.client.trim()}” in the app, archived or not.${yours(cs)}` };
    if (!c.archived) return { ok: false, why: `${c.name} is not archived — it is in use. switch_client makes it the one the person is in.` };
    return { ok: true };
  },
  async preview(_ctx, input: { client: string }) {
    const c = named(await customersNow(), input.client);
    return `Continue ${c?.name ?? input.client.trim()}: it comes back exactly as it was — its lines, problems, projects, files and reports in every list again — and becomes the customer you are in.`;
  },
  async run(_ctx, input: { client: string }): Promise<CapResult> {
    const c = named(await customersNow(), input.client);
    const r = await continueCustomer(c?.name ?? input.client);
    if (!r.ok) return r;
    return { ok: true, says: `${c?.name ?? input.client.trim()} is continued — back as it was, and the customer you are in now.`, data: { client: c?.name ?? input.client.trim(), archived: false }, refs: [{ kind: 'page', id: 'customers', label: 'Customers', href: '/factory?customer=manage' }] };
  },
};

export const VISITS: readonly Capability[] = [startVisitCap, endVisitCap, visitState, switchClient, listCustomers, archiveCustomerCap, continueCustomerCap];
