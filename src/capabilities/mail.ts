/* SEND THIS EMAIL (24 November 2026, docs/LUNA-MAIL.md — Rowland: after talking with Luna, “send this email to John”).
 *
 *   find_person  read   who “John” is: People, and owners on the customer in hand. Several or none said so. Never guessed.
 *   draft_email  read   assembles “this” (latest chart, else latest report) and the recipient. Does not send.
 *   send_email   write  a card; needs an address; Graph Mail.Send only on Do it. A client cannot send. Never a silent send.
 *
 * The body is the conversation’s own artifacts — figures already worked by the app. Outlook missing is said; nothing is posted. */
import { listAllSnags, listWorkspaces } from '../db';
import { listOrgMembers } from '../org/orgData';
import { EMAIL, nameFromEmail, matchPerson, uniquePeople, type Person } from '../lib/mail/people';
import { emailBody, emailSubject, thisOf, type MailOutputs } from '../lib/mail/draft';
import { CONNECT_OUTLOOK, CONNECT_SAYS, outlookReady, sendMail } from '../lib/microsoft/mail';
import { anyone, mayEdit } from './access';
import { conversation } from './draftStore';
import { checkObject } from './check';
import { handScope, inHand } from './hand';
import type { CapCtx, CapResult, Capability } from './types';

const outputsOf = (facts: unknown): MailOutputs => {
  const f = (facts ?? {}) as Partial<MailOutputs>;
  return {
    results: Array.isArray(f.results) ? f.results : [],
    charts: Array.isArray(f.charts) ? f.charts : [],
    reports: Array.isArray(f.reports) ? f.reports : [],
  };
};

async function peopleNow(): Promise<Person[]> {
  const [members, snags, lines, hand] = await Promise.all([listOrgMembers(), listAllSnags(), listWorkspaces(), handScope()]);
  const lineName = (id?: string) => lines.find(w => w.id === id)?.name ?? 'a line';
  const people: Person[] = members.map(m => ({ name: nameFromEmail(m.email), email: m.email, how: 'People' }));
  for (const s of snags) {
    const owner = (s.owner ?? '').trim();
    if (!owner) continue;
    if (!inHand(hand, { workspaceId: s.workspaceId, projectId: s.projectId })) continue;
    const email = EMAIL.test(owner) ? owner : undefined;
    people.push({ name: email ? nameFromEmail(email) : owner, ...(email ? { email } : {}), how: `${lineName(s.workspaceId)} · owner` });
  }
  return uniquePeople(people);
}

function matchSays(who: string, m: ReturnType<typeof matchPerson>): string {
  if (m.kind === 'one') return `${m.hits[0].name} <${m.hits[0].email}> (${m.hits[0].how}).`;
  if (m.kind === 'no-email') return `${m.hits[0].name} is on ${m.hits[0].how}, but has no email address — ask once for it.`;
  if (m.kind === 'several') return `Several people match “${who}”: ${m.hits.slice(0, 8).map(p => `${p.name}${p.email ? ` <${p.email}>` : ''} (${p.how})`).join('; ')}. Ask which.`;
  return `Nobody in People or on this customer’s owners is called “${who}”. Ask once who they are and for the address.`;
}

interface DraftIn { to?: string; who?: string; subject?: string; note?: string; chartId?: string; reportId?: string }
interface SendIn { to: string; who?: string; subject?: string; note?: string; chartId?: string; reportId?: string }

async function draftOf(ctx: CapCtx, input: DraftIn): Promise<{ ok: true; to?: string; toName?: string; subject: string; body: string; file?: { name: string }; artifactTitle: string; outlook: boolean } | { ok: false; why: string }> {
  const c = await conversation(ctx);
  if (!c.ok) return c;
  const artifact = thisOf(outputsOf(c.s.facts), { chartId: input.chartId, reportId: input.reportId });
  if ('why' in artifact) return { ok: false, why: artifact.why };
  let to = input.to;
  let toName = input.who;
  if (!to && input.who) {
    const m = matchPerson(input.who, await peopleNow());
    if (m.kind !== 'one') return { ok: false, why: matchSays(input.who, m) };
    to = m.hits[0].email;
    toName = m.hits[0].name;
  }
  return {
    ok: true, to, toName, subject: emailSubject(artifact, input.subject), body: emailBody(artifact, input.note),
    ...(artifact.file ? { file: { name: artifact.file.name } } : {}), artifactTitle: artifact.title, outlook: outlookReady(),
  };
}

const FIELDS = {
  to: { kind: 'string' as const, label: 'the address', max: 200, pattern: EMAIL, patternSays: 'Give an email address — who it is sent to.' },
  who: { kind: 'string' as const, label: 'who they are', max: 120 },
  subject: { kind: 'string' as const, label: 'the subject', max: 200 },
  note: { kind: 'string' as const, label: 'a covering line', max: 500 },
  chartId: { kind: 'string' as const, label: 'the chart', max: 80 },
  reportId: { kind: 'string' as const, label: 'the report', max: 80 },
};

export const findPerson: Capability = {
  name: 'find_person', title: 'Who they are', kind: 'read',
  validate: raw => checkObject(raw, { who: { kind: 'string', label: 'who they are', required: true, max: 120 } }),
  allowed: anyone,
  async run(_ctx, input: { who: string }): Promise<CapResult> {
    const m = matchPerson(input.who, await peopleNow());
    const says = matchSays(input.who, m);
    const one = m.kind === 'one' ? m.hits[0] : undefined;
    return { ok: true, says, data: { kind: m.kind, ...(one?.email ? { to: one.email, name: one.name } : {}), hits: m.hits }, refs: [] };
  },
};

export const draftEmail: Capability = {
  name: 'draft_email', title: 'Draft the email', kind: 'read',
  validate: raw => checkObject(raw, FIELDS),
  allowed: anyone,
  async run(ctx, input: DraftIn): Promise<CapResult> {
    const d = await draftOf(ctx, input);
    if (!d.ok) return d;
    const to = d.to ? `to ${d.toName ? `${d.toName} <${d.to}>` : d.to}` : '— who it is sent to is not yet known';
    const attach = d.file ? ` Attached: ${d.file.name}.` : '';
    const outlook = d.outlook ? '' : ` ${CONNECT_SAYS}`;
    return {
      ok: true,
      says: `Draft ${to}: “${d.subject}”. The body is “${d.artifactTitle}” from this conversation.${attach}${outlook}`,
      data: { to: d.to, subject: d.subject, body: d.body, attached: d.file?.name, outlook: d.outlook },
      refs: d.outlook ? [] : [{ kind: 'page', id: 'outlook', label: 'Connect Outlook', href: CONNECT_OUTLOOK }],
    };
  },
};

export const sendEmail: Capability = {
  name: 'send_email', title: 'Send this email', kind: 'write',
  validate: raw => checkObject(raw, { ...FIELDS, to: { ...FIELDS.to, required: true } }),
  allowed: ctx => mayEdit(ctx),
  async preview(ctx, input: SendIn) {
    const d = await draftOf(ctx, input);
    if (!d.ok) return d.why;
    const attach = d.file ? `, with ${d.file.name} attached` : '';
    const outlook = d.outlook ? '' : ' Outlook is not connected yet — Do it will not send; Connect Outlook on Data connections.';
    return `Send this email to ${input.who ? `${input.who} (${input.to})` : input.to}: “${d.subject}” — ${d.artifactTitle} from this conversation${attach}. Nothing is sent until you press Do it.${outlook}`;
  },
  async run(ctx, input: SendIn): Promise<CapResult> {
    const d = await draftOf(ctx, input);
    if (!d.ok) return d;
    const c = await conversation(ctx);
    if (!c.ok) return c;
    const artifact = thisOf(outputsOf(c.s.facts), { chartId: input.chartId, reportId: input.reportId });
    if ('why' in artifact) return { ok: false, why: artifact.why };
    const sent = await sendMail({
      to: input.to, toName: input.who || d.toName, subject: d.subject, body: d.body,
      ...(artifact.file ? { attachments: [artifact.file] } : {}),
    });
    if (!sent.ok) return { ok: false, why: sent.why };
    return { ok: true, says: `Sent to ${input.to}: “${d.subject}”.`, data: { to: input.to, subject: d.subject }, refs: [] };
  },
};

export const MAIL: readonly Capability[] = [findPerson, draftEmail, sendEmail];
