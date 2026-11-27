/* Confirmed one-off email and recurring delivery from Luna. */
import { listAllSnags, listWorkspaces } from '../db';
import { listOrgMembers } from '../org/orgData';
import { covers } from '../org/organisation';
import { myBusinessOnDevice } from './business';
import { customerKey } from '../lib/customers';
import { EMAIL, nameFromEmail, matchPerson, uniquePeople, type Person } from '../lib/mail/people';
import { emailBody, emailSubject, thisOf, type MailOutputs } from '../lib/mail/draft';
import { CONNECT_OUTLOOK, CONNECT_SAYS, outlookReady, sendMail } from '../lib/microsoft/mail';
import { lunaMailStatus, sendWithLuna, saveMailSchedule } from '../lib/mail/luna';
import type { MailThis } from '../lib/mail/draft';
import { anyone, mayEdit } from './access';
import { conversation } from './draftStore';
import { checkObject } from './check';
import { canReviewCustomers } from './ownerReview';
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

async function peopleNow(ctx: CapCtx, customer?: string): Promise<Person[]> {
  const [business, snags, lines, hand] = await Promise.all([myBusinessOnDevice(), listAllSnags(), listWorkspaces(), handScope()]);
  const requested = customer ? customerKey(customer) : '';
  const review = !!requested && await canReviewCustomers(ctx);
  const includeLine = (id: string) => requested
    ? customerKey(hand.lineClient(id)) === requested && (review || hand.line(id))
    : hand.line(id);
  const lineName = (id?: string) => lines.find(w => w.id === id)?.name ?? 'a line';
  const members = business.org ? await listOrgMembers(business.org.id) : [];
  const directoryLines = lines.filter(line => line.orgId === business.org?.id);
  const people: Person[] = [];
  for (const member of members) {
    // An invitation grants access. It does not establish which customer an unassigned address belongs to.
    if (requested || hand.filtering || hand.archived.length) {
      const places = directoryLines.filter(line => covers(member, line));
      const customers = new Set(places.map(line => customerKey(line.clientName)));
      if (customers.size !== 1 || customers.has('') || !places.some(line => includeLine(line.id))) continue;
      // An unrestricted invitation remains ambiguous when the same business serves several customers.
      if (!member.sites.length && !member.areas.length && hand.clients.length + hand.archived.length > 1) continue;
    }
    people.push({ name: nameFromEmail(member.email), email: member.email, how: 'People' });
  }
  for (const s of snags) {
    const owner = (s.owner ?? '').trim();
    if (!owner) continue;
    const placed = { workspaceId: s.workspaceId, projectId: s.projectId };
    if (requested && !(s.workspaceId ? customerKey(hand.lineClient(s.workspaceId)) === requested : hand.projectClients(s.projectId).some(c => customerKey(c) === requested))) continue;
    if (!review && !inHand(hand, placed)) continue;
    const email = EMAIL.test(owner) ? owner : undefined;
    people.push({ name: email ? nameFromEmail(email) : owner, ...(email ? { email } : {}), how: `${lineName(s.workspaceId)} · owner` });
  }
  return uniquePeople(people);
}

async function recipient(ctx: CapCtx, who: string, customer?: string) {
  if (/^(me|myself|my email)$/i.test(who.trim()) && ctx.userId && ctx.email && EMAIL.test(ctx.email)) {
    return matchPerson(ctx.email, [{ name: ctx.me || 'You', email: ctx.email, how: 'signed-in account' }]);
  }
  return matchPerson(who, await peopleNow(ctx, customer));
}

function matchSays(who: string, m: ReturnType<typeof matchPerson>): string {
  if (m.kind === 'one') return `${m.hits[0].name} <${m.hits[0].email}> (${m.hits[0].how}).`;
  if (m.kind === 'no-email') return `${m.hits[0].name} is on ${m.hits[0].how}, but has no email address — ask once for it.`;
  if (m.kind === 'several') return `Several people match “${who}”: ${m.hits.slice(0, 8).map(p => `${p.name}${p.email ? ` <${p.email}>` : ''} (${p.how})`).join('; ')}. Ask which.`;
  return `Nobody in People or on this customer’s owners is called “${who}”. Ask once who they are and for the address.`;
}

interface DraftIn { to?: string; who?: string; subject?: string; note?: string; message?: string; chartId?: string; reportId?: string; repeat?: 'weekly' | 'daily'; time?: string; weekday?: number }
interface SendIn extends DraftIn { to: string }

async function draftOf(ctx: CapCtx, input: DraftIn) {
  if ((input.time || input.weekday) && !input.repeat) return { ok: false as const, why: 'Choose daily or weekly delivery for a timed email. A timed one-off email is not scheduled.' };
  if (input.repeat === 'daily' && input.weekday) return { ok: false as const, why: 'Confirm daily delivery or a specific weekday.' };
  let artifact: MailThis | undefined;
  if ((!input.message && !input.repeat) || input.chartId || input.reportId) {
    const c = await conversation(ctx);
    if (!c.ok) return c;
    const out = thisOf(outputsOf(c.s.facts), { chartId: input.chartId, reportId: input.reportId });
    if ('why' in out) return { ok: false as const, why: out.why };
    artifact = out;
  }
  const frozen = !!(input.repeat && artifact);
  const hand = input.repeat ? await handScope() : null;
  const client = hand?.filtering ? hand.client : hand?.clients.length === 1 ? hand.clients[0] : '';
  if (input.repeat && !client) return { ok: false as const, why: 'Choose the customer for this schedule first.' };
  if (input.message && artifact) return { ok: false as const, why: 'Choose the report or the written message for this email.' };
  let sender;
  try { sender = await lunaMailStatus(ctx.userId); } catch (e) { return { ok: false as const, why: (e as Error).message }; }
  let to = input.to;
  let toName = input.who;
  if (!to && input.who) {
    const m = await recipient(ctx, input.who);
    if (m.kind !== 'one') return { ok: false as const, why: matchSays(input.who, m) };
    to = m.hits[0].email;
    toName = m.hits[0].name;
  }
  const title = artifact?.title ?? (input.repeat && !input.message ? 'Line and problem briefing' : 'Message from Luna');
  const subject = artifact ? emailSubject(artifact, input.subject) : input.subject || (input.repeat ? title + ' — ' + client : title);
  const body = artifact ? emailBody(artifact, input.note) : input.message || 'Active synced lines and their open problems for ' + client;
  return { ok: true as const, to, toName, subject, body, file: frozen ? undefined : artifact?.file, artifactTitle: title, sender, client, outlook: outlookReady(), frozen };
}

// Keep only a fingerprint of the card on the device. An edit or change of sender needs a fresh confirmation.
async function emailCard(ctx: CapCtx, details: string, preview: boolean): Promise<boolean> {
  if (!ctx.callId || typeof sessionStorage === 'undefined') return true;
  const key = 'faultline.mail.card.' + ctx.callId;
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(details));
  const hash = Array.from(new Uint8Array(bytes), x => x.toString(16).padStart(2, '0')).join('');
  try {
    if (preview) { sessionStorage.setItem(key, hash); return true; }
    const saved = sessionStorage.getItem(key);
    return saved === null || saved === hash;
  } catch { return false; }
}

const FIELDS = {
  message: { kind: 'string' as const, label: 'the message to send', max: 6000 },
  repeat: { kind: 'enum' as const, label: 'how often', values: ['daily', 'weekly'] },
  time: { kind: 'string' as const, label: 'London time', pattern: /^(?:[01]\d|2[0-3]):[0-5]\d$/, patternSays: 'Use a London time such as 07:30.' },
  weekday: { kind: 'int' as const, label: 'day of the week', min: 1, max: 7 },
  to: { kind: 'string' as const, label: 'the address', max: 200, pattern: EMAIL, patternSays: 'Give an email address — who it is sent to.' },
  who: { kind: 'string' as const, label: 'who they are', max: 120 },
  subject: { kind: 'string' as const, label: 'the subject', max: 200 },
  note: { kind: 'string' as const, label: 'a covering line', max: 500 },
  chartId: { kind: 'string' as const, label: 'the chart', max: 80 },
  reportId: { kind: 'string' as const, label: 'the report', max: 80 },
};

export const findPerson: Capability = {
  name: 'find_person', title: 'Who they are', kind: 'read',
  validate: raw => checkObject(raw, { who: { kind: 'string', label: 'who they are', required: true, max: 120 }, customer: { kind: 'string', label: 'the named customer', max: 120 } }),
  allowed: anyone,
  async run(ctx, input: { who: string; customer?: string }): Promise<CapResult> {
    const m = await recipient(ctx, input.who, input.customer);
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
    const outlook = d.sender.ready || d.outlook ? '' : ` ${CONNECT_SAYS}`;
    return {
      ok: true,
      says: `Draft ${to}: “${d.subject}”. ${d.body}${attach}${outlook}`,
      data: { to: d.to, subject: d.subject, body: d.body, attached: d.file?.name, outlook: d.outlook },
      refs: d.sender.ready || d.outlook ? [] : [{ kind: 'page', id: 'outlook', label: 'Connect Outlook', href: CONNECT_OUTLOOK }],
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
    await emailCard(ctx, JSON.stringify([input, d.client, d.subject, d.body, d.file, d.sender.ready]), true);
    const attach = d.file ? `, with ${d.file.name} attached` : '';
    const destination = input.who ? input.who + ' (' + input.to + ')' : input.to;
    if (input.repeat) {
      const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const when = input.repeat === 'weekly' ? 'every ' + weekdays[(input.weekday ?? 1) - 1] : 'every day';
      const shut = d.sender.ready
        ? (d.frozen
          ? ' Resend sends this report as it stands while the app is shut. It is not rebuilt from a later workbook, and it is not sent through Outlook.'
          : input.message
            ? ' Resend sends this message while the app is shut. It is not sent through Outlook.'
            : ' Resend sends a fresh line and problem briefing while the app is shut. It is not sent through Outlook.')
        : '. Finish Resend setup (domain verify and sending key) before scheduling. Outlook is not used for a schedule.';
      return 'Email ' + destination + ' ' + when + ' at ' + (input.time || '07:00') + ' London time for ' + d.client + '. Subject: ' + d.subject + '. Message: ' + d.body + shut;
    }
    const source = d.sender.ready ? 'Luna' : 'Outlook';
    return 'Send this email to ' + destination + ' from ' + source + ': “' + d.subject + '”' + attach + '. ' + d.body + (d.sender.ready || d.outlook ? '' : ' ' + CONNECT_SAYS);
  },
  async run(ctx, input: SendIn): Promise<CapResult> {
    const d = await draftOf(ctx, input);
    if (!d.ok) return d;
    if (!await emailCard(ctx, JSON.stringify([input, d.client, d.subject, d.body, d.file, d.sender.ready]), false)) {
      return { ok: false, why: 'The message, customer or sender changed. Ask Luna for a fresh confirmation.' };
    }
    if (input.repeat) {
      if (!d.sender.ready || !ctx.userId || !ctx.callId) return { ok: false, why: 'Finish Resend setup in Supabase (domain verify and sending key) before adding a scheduled email. Outlook is not used while the app is shut.' };
      const [hour, minute] = (input.time ?? '07:00').split(':').map(Number);
      const liveBriefing = !d.frozen && !input.message;
      try {
        await saveMailSchedule({ id: 'mail-' + ctx.callId, ownerId: ctx.userId, kind: 'weekly_digest', client: d.client,
          schedule: input.repeat, weekday: input.weekday ?? 1, hour, minute, enabled: true, name: d.artifactTitle,
          scope: {
            email: { to: input.to, subject: d.subject, ...(d.frozen || input.message ? { message: input.message || d.body } : {}) },
            ...(ctx.conversationId ? { conversationId: ctx.conversationId } : {}),
            ...(liveBriefing ? { picture: true, files: true, problems: true, variance: true } : {}),
          },
          createdAt: ctx.now, updatedAt: ctx.now }, ctx.userId);
      } catch (e) { return { ok: false, why: (e as Error).message }; }
      return { ok: true, says: 'Scheduled email to ' + input.to + '. It lives in Luna → Schedules, not only in this chat.', refs: [] };
    }
    const mail = { to: input.to, toName: input.who || d.toName, subject: d.subject, body: d.body, ...(d.file ? { attachments: [d.file] } : {}) };
    if (d.sender.ready && !ctx.callId) return { ok: false, why: 'Confirm this email first.' };
    const sent = d.sender.ready && ctx.callId ? await sendWithLuna(ctx.callId, mail) : await sendMail(mail);
    if (!sent.ok) return { ok: false, why: sent.why };
    const says = d.sender.ready ? 'Resend accepted the email to ' : 'Sent to ';
    return { ok: true, says: says + input.to + ': “' + d.subject + '”.', data: { to: input.to, subject: d.subject }, refs: [] };
  },
};

export const MAIL: readonly Capability[] = [findPerson, draftEmail, sendEmail];
