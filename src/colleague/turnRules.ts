/* THE RULES OF A TURN, SHARED (10 November, docs/LUNA-EXAM.md — Rowland: "The important thing is that the exam tests the actual live
 * capabilities, not a mock version of Luna"). What AI Mode does around each step Luna asks for — kept here once, so the Bagger
 * investigation exam runs the very same rules the person meets in AI Mode, never a copy that could drift:
 *
 *   prepareCall   a write checked before its card: validated, allowed for this person, its preview — and whether it goes in without a
 *                 card: CONFIRM ONCE (a record already said yes to in this conversation, docs/AI-OPERATING.md) or a capture step
 *                 inside an investigation the person agreed (Work within, W3, capabilities/scope)
 *   noteConfirmed after a confirmed write: the record it made or wrote into is said yes to from now on; an agreed investigation is
 *                 kept on its own list
 *   usedOf        a step as the conversation keeps it under the turn
 *
 * Pure but for the conversation record it reads and writes (db). */
import { myOrgRole } from '../org/orgRole';
import { forcedOrgRole } from '../org/orgStore';
import { ORG_ROLES, roleName } from '../org/organisation';
import { greetName } from '../lib/greetName';
import { getStudy, listAllStudies, patchStudy } from '../db';
import type { ToolStudy } from '../lib/study';
import { capabilityByName } from '../capabilities/registry';
import { inAgreedScope } from '../capabilities/scope';
import type { CapCall, CapCtx, CapResult } from '../capabilities/types';
import type { Prepared, Step } from './colleagueAsk';
import { addRefs, appendAction, changeThreads, changeTurn, currentThread, factsOfConversation, focusText, type Thread, type Used } from './conversation';
import { allSources, outputsOfConversation, outputsText } from '../capabilities/data';
import { sourceSaid } from '../lib/data/sources';
import { notebookText, readNotebooks } from './notebook';
import { getWorkspace } from '../db/workspaces';
import { activeClientNow } from '../lib/activeClient';
import type { ColleagueWorkbook } from '../capabilities/types';
import type { WalkFacts } from '../lib/walk';

type Lists = { authorised?: string[]; agreed?: string[] };

export async function prepareCall(ctx: CapCtx, cid: string, call: CapCall): Promise<Prepared> {
  const c = capabilityByName(call.name);
  if (!c) return { ok: false, title: call.name, why: 'The app has no such step.' };
  const v = c.validate(call.input);
  if (!v.ok) return { ok: false, title: c.title, why: v.why };
  const a = await c.allowed(ctx, v.input);
  if (!a.ok) return { ok: false, title: c.title, why: a.why };
  const preview = c.preview ? await c.preview(ctx, v.input) : c.title;
  const target = c.target?.(v.input);
  const cf = factsOfConversation((await getStudy(cid)) as ToolStudy) as Lists;
  const authorised = cf.authorised ?? [];
  const said = (target ? authorised.includes(target) : false) || await inAgreedScope(call.name, v.input as Record<string, unknown>, cf.agreed ?? []);
  return { ok: true, title: c.title, preview, input: (v.input ?? {}) as Record<string, unknown>, ...(said ? { authorised: true } : {}) };
}

export async function noteConfirmed(cid: string, call: CapCall, r: CapResult): Promise<void> {
  if (!r.ok) return;
  const d = (r.data ?? {}) as { studyId?: string; standardId?: string; id?: string };
  const c = capabilityByName(call.name);
  const ids = [c?.target?.(call.input), d.studyId, d.standardId, call.name === 'make_record' ? d.id : undefined, r.show?.kind === 'study' ? r.show.id : undefined,
    ...(call.name === 'start_project' ? r.refs.filter(x => x.kind === 'project').map(x => x.id) : []),
    ...(call.name === 'raise_problem' ? r.refs.filter(x => x.kind === 'problem').map(x => x.id) : [])].filter((x): x is string => !!x);
  if (ids.length) await patchStudy(cid, cur => { const had = ((cur.facts as Lists).authorised ?? []); return { facts: { ...cur.facts, authorised: [...new Set([...had, ...ids])].slice(-200) } as ToolStudy['facts'] }; });
  /* an investigation agreed (work_within, W3) is kept on its own list — only that yes lets capture steps go in without a card */
  const pid = (call.input as { projectId?: unknown } | undefined)?.projectId;
  if (call.name === 'work_within' && typeof pid === 'string') await patchStudy(cid, cur => ({ facts: { ...cur.facts, agreed: [...new Set([...(((cur.facts as Lists).agreed) ?? []), pid])] } as ToolStudy['facts'] }));
}

export const usedOf = (step: Step, said?: string): Used => ({
  callId: step.call.id, name: step.call.name, title: step.title, kind: step.kind, status: step.status, says: step.says, refs: step.refs,
  ...(step.auto ? { auto: true } : {}), ...(step.preview ? { preview: step.preview } : {}), ...(step.input ? { input: step.input } : {}), ...(said ? { said } : {}), at: Date.now(),
});

/** The notebook Luna is told with each turn: the client of the subject's line — with no line in hand, the client the person is in
 *  (lib/activeClient, chosen in the top bar; docs/CONSULTANT-WORKSPACE.md C1) — and the person's own (docs/LUNA-NEXT.md L3). */
export async function notebookFor(threads: readonly Thread[]): Promise<string> {
  const line = currentThread(threads)?.scope.lineId;
  const client = line ? (await getWorkspace(line))?.clientName?.trim() ?? '' : (await activeClientNow()).client;
  const nb = await readNotebooks(client);
  return notebookText(nb.own, nb.client);
}

/** What Luna is told of the conversation each round — its threads, notebook, outputs, files, where the person is, drafts, imports and
 *  workbooks; AI Mode adds what is on the screen beside her and the photos' labels. */
type FocusOpts = NonNullable<Parameters<typeof focusText>[1]>;
export async function conversationFocus(cid: string, extra: Pick<FocusOpts, 'screen' | 'names' | 'photos'> = {}): Promise<string> {
  const f = factsOfConversation((await getStudy(cid)) as ToolStudy);
  const wf = f as WalkFacts;
  const files = (await allSources()).slice(0, 12).map(x => sourceSaid(x));
  const nb = await notebookFor(f.threads ?? []);
  /* THE CLIENT THE PERSON IS IN (C1) — said when the lines name more than one, so a talk at a business's page is that business's */
  const ac = await activeClientNow();
  /* THE VISIT IN HAND (C6, lib/visits) — the customer and the visit always said, so a new business with no line is still in hand */
  const vv = await import('../lib/visits');
  const v = vv.visitInHand(vv.visitsOf(await listAllStudies()), vv.storedVisit());
  const visit = v ? { client: v.client, ...(v.site ? { site: v.site } : {}), day: vv.visitDayLong(v), since: new Date(v.startedAt).toTimeString().slice(0, 5), ...(v.brief ? { brief: v.brief } : {}) } : null;
  const role = forcedOrgRole() ?? myOrgRole();
  const who = greetName();
  const person = role ? { role: roleName(role), roleIs: ORG_ROLES.find(r => r.role === role)?.who, ...(who ? { name: who } : {}) } : undefined;
  return focusText(f.threads ?? [], { ...(person ? { person } : {}), ...(nb ? { notebook: nb } : {}), ...(ac.several || ac.client ? { client: ac.client } : {}), visit, ...extra, outputs: outputsText(outputsOfConversation({ facts: f } as ToolStudy)), files, ...(wf.position ? { position: wf.position } : {}), trail: wf.walk ?? [], drafts: f.drafts ?? [], imports: (f as { imports?: { id: string; name: string; rows: unknown[] }[] }).imports ?? [], workbooks: (f as { workbooks?: ColleagueWorkbook[] }).workbooks ?? [] });
}

/** A step kept under its turn, its records on the thread, and a write's outcome on the conversation's actions. */
export async function recordStep(cid: string, rid: string, steps: Map<string, Used>, step: Step, said?: string): Promise<Used> {
  const u = usedOf(step, said);
  steps.set(u.callId, u);
  await changeTurn(patchStudy, cid, rid, t => ({ ...t, used: [...steps.values()] }));
  if (step.status === 'done' && step.refs.length) await changeThreads(patchStudy, cid, ts => addRefs(ts, step.refs));
  if (step.kind === 'write' && (step.status === 'done' || step.status === 'declined' || step.status === 'failed'))
    await appendAction(patchStudy, cid, { callId: u.callId, name: u.name, title: u.title, status: step.status, says: u.says, refs: u.refs, at: u.at });
  return u;
}
