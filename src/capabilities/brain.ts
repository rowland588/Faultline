/* WHAT LUNAR HAS FOUND, WHAT WAS TRIED AND WHAT CAME OF IT (12 November, docs/LUNAR-BRAIN.md B1, docs/LUNAR-KNOWLEDGE.md — Rowland:
 * "Lunar does its homework before the question is asked"; "Luna must learn from evidence and experience, not simply accumulate
 * opinions"). Luna's doors onto LUNAR's knowledge:
 *   findings        read   the homework on each line, brought up to date first: each finding with its claim id, its standing (evidence
 *                          over opinion) and the versions before it
 *   outcomes        read   every fix on a line — did it work, did it last — by code over the stops, or its own study
 *   history         read   what was found, tried and said about a line, a machine or a machine and a reason, in time order
 *   note_knowledge  write  what a person said — an account (why, or what they saw) or a review of an entry — kept attributed to them
 *                          with how it is known; never evidence, never verified (a card)
 * Nothing is worked out here; the brain's code and the outcome check do it. */
import { getWorkspace, listAllAssets, listAllSnags, listAllStudies, listWorkspaces } from '../db';
import { acrossLines } from '../lib/knowledge/factory';
import { homeworkForLine, lineBrain, lineBrainNow, BRAIN_STATE_WORD } from '../lib/brain/homework';
import type { Finding } from '../lib/brain/engine';
import { claimOf } from '../lib/knowledge/findings';
import { outcomesOn } from '../lib/knowledge/fixes';
import { historyOf } from '../lib/knowledge/history';
import { addEntries, listKnowledge } from '../lib/knowledge/ledger';
import { mayAddKnowledge } from '../lib/knowledge/may';
import { currentOf, knownWord, responseSaid, standingOf, subjectOf, versionsOf, type Entry } from '../lib/knowledge/model';
import { personEntryId, VERDICT_WORD } from '../lib/knowledge/outcomes';
import type { ToolStudy } from '../lib/study';
import { checkObject } from './check';
import { anyone, mayEdit } from './access';
import { lineRef } from './util';
import type { CapResult, Capability } from './types';

const SURE: Record<Finding['sure'], string> = { measured: 'measured', significant: 'unlikely chance', suggestive: 'could be chance', thin: 'too few records' };
export const findingSaid = (f: Finding) => `[${f.kind}${f.machine ? ` · ${f.machine}` : ''}] ${f.says} (${SURE[f.sure]}; ${f.n} stop${f.n === 1 ? '' : 's'}; ${f.method}.${f.money ? ` Money: ${f.money.words}` : ''} Cannot say: ${f.limits.join(' ')})`;

/** A finding with what the ledger knows of it: its claim's id now, its standing, its versions before and what people said. */
function findingWithStanding(f: Finding, ledger: readonly Entry[]): { line: string; claimId?: string; standing?: string } {
  const c = claimOf(f);
  const cur = currentOf(ledger, c.claim);
  if (!cur) return { line: findingSaid(f) };
  const st = standingOf(cur, ledger);
  const before = versionsOf(ledger, c.claim).slice(0, -1);
  const said = st.responses.slice(0, 3).map(responseSaid).join('; ');
  return {
    claimId: cur.id, standing: st.word,
    line: `${findingSaid(f)} — finding id ${cur.id}; standing: ${st.word}${said ? ` (${said})` : ''}${before.length ? `; earlier it said: ${before.map(v => `“${v.says}”`).join(' then ')}` : ''}`,
  };
}

export const readFindings: Capability = {
  name: 'findings', title: 'What LUNAR has found', kind: 'read',
  validate: raw => checkObject(raw ?? {}, { lineId: { kind: 'string', label: 'the line', max: 80 } }),
  allowed: anyone,
  async run(ctx, input: { lineId?: string }): Promise<CapResult> {
    const lines = (await listWorkspaces()).filter(w => !w.archived && (!input.lineId || w.id === input.lineId));
    if (!lines.length) return { ok: false, why: input.lineId ? 'There is no such line.' : 'There are no lines yet.' };
    const write = mayAddKnowledge();
    const parts: string[] = [];
    const data: { lineId: string; state: string; findings: (Finding & { claimId?: string; standing?: string })[] }[] = [];
    for (const w of lines) {
      if (write) await homeworkForLine(w, ctx.now);   // brought up to date first — only if its records changed or a day has passed
      const b = write ? await lineBrain(w, ctx.now) : await lineBrainNow(w, ctx.now);
      const ledger = await listKnowledge(w.id);
      const rows = b.findings.map(f => ({ f, ...findingWithStanding(f, ledger) }));
      data.push({ lineId: w.id, state: b.state, findings: rows.map(r => ({ ...r.f, ...(r.claimId ? { claimId: r.claimId, standing: r.standing } : {}) })) });
      parts.push(`${w.name} — ${BRAIN_STATE_WORD[b.state]}${b.at ? ` (worked ${new Date(b.at).toISOString().slice(0, 16).replace('T', ' ')})` : ''}: ${rows.length ? rows.map(r => r.line).join(' ') : 'nothing timed on it to work from — say so; never fill the gap with a guess.'}`);
    }
    /* across the customer's lines (lib/knowledge/factory) — never another customer's */
    const all = await listWorkspaces();
    const asked = lines.map(l => (l.clientName ?? '').trim().toLowerCase());
    if (write) for (const w of all) if (!w.archived && !lines.some(l => l.id === w.id) && asked.includes((w.clientName ?? '').trim().toLowerCase())) await homeworkForLine(w, ctx.now);
    const [assets, ledgerAll] = await Promise.all([listAllAssets(), listKnowledge()]);
    const kindOf = (lineId: string, m: string) => assets.find(a => a.workspaceId === lineId && a.name.trim().toLowerCase() === m.trim().toLowerCase())?.kind || undefined;
    const across = acrossLines(all.filter(w => !w.archived), ledgerAll, kindOf, input.lineId)
      .filter(a => !input.lineId || a.lines.some(x => x.lineId === input.lineId) || a.held?.lineId === input.lineId);
    if (across.length) parts.push(`Across the customer's lines: ${across.map(a => a.says).join(' ')}`);
    return { ok: true, says: `${parts.join('\n')}\nThese are the app's own findings: quote their sentences and figures, say how sure each is, and keep a recorded reason apart from a cause. A person's agreement or dispute is what they say, not proof. To act on one, raise_problem with its finding id.`, refs: [], data };
  },
};

export const readOutcomes: Capability = {
  name: 'outcomes', title: 'Did the fixes work?', kind: 'read',
  validate: raw => checkObject(raw ?? {}, { lineId: { kind: 'string', label: 'the line', required: true, max: 80 } }),
  allowed: anyone,
  async run(ctx, input: { lineId: string }): Promise<CapResult> {
    const line = await getWorkspace(input.lineId);
    if (!line || line.archived) return { ok: false, why: 'There is no such line.' };
    const outs = await outcomesOn(line, ctx.now);
    if (!outs.length) return { ok: true, says: `Nothing on ${line.name} has been closed, done or proved yet — no fix to check.`, refs: [lineRef(line)], data: [] };
    return {
      ok: true, refs: [lineRef(line)],
      says: `${line.name} — ${outs.length} fix${outs.length === 1 ? '' : 'es'}, newest first:\n${outs.map(o => `• ${VERDICT_WORD[o.verdict]} (${knownWord(o.known)}): ${o.says}`).join('\n')}\nSay the verdict as the check says it; what was said when it was closed is what was said, not proof; "no clear change" may mean it did not work, or not yet.`,
      data: outs.map(o => ({ fixId: o.fix.id, kind: o.fix.kind, verdict: o.verdict, known: o.known, says: o.says })),
    };
  },
};

export const readHistory: Capability = {
  name: 'history', title: 'What has been tried', kind: 'read',
  validate: raw => checkObject(raw ?? {}, {
    lineId: { kind: 'string', label: 'the line', required: true, max: 80 }, machine: { kind: 'string', label: 'the machine', max: 120 }, reason: { kind: 'string', label: 'the reason', max: 120 },
  }),
  allowed: anyone,
  async run(ctx, input: { lineId: string; machine?: string; reason?: string }): Promise<CapResult> {
    const line = await getWorkspace(input.lineId);
    if (!line || line.archived) return { ok: false, why: 'There is no such line.' };
    const [ledger, snags, outcomes, studies] = await Promise.all([listKnowledge(line.id), listAllSnags(), outcomesOn(line, ctx.now), listAllStudies()]);
    const h = historyOf(line.name, { ...(input.machine ? { machine: input.machine } : {}), ...(input.reason ? { reason: input.reason } : {}) },
      { ledger, snags: snags.filter(s => s.workspaceId === line.id), outcomes, studies: (studies as ToolStudy[]).filter(s => s.workspaceId === line.id) });
    const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
    return {
      ok: true, refs: [lineRef(line)],
      says: `${h.summary}\n${h.events.length ? h.events.map(e => `${day(e.at)} — ${e.says} [${e.known}]`).join('\n') : 'Nothing recorded on it yet.'}\nSay each thing with how it is known: what people said is theirs, not proof; a verdict that came later stands beside what was said at the time.`,
      data: { summary: h.summary, events: h.events },
    };
  },
};

interface NoteIn { lineId: string; says: string; known: 'observed' | 'reported'; about?: string; stance?: 'supports' | 'contradicts' | 'neutral'; machine?: string; reason?: string; role?: string }
export const noteKnowledge: Capability = {
  name: 'note_knowledge', title: 'Keep what was said', kind: 'write',
  validate: raw => checkObject(raw, {
    lineId: { kind: 'string', label: 'the line', required: true, max: 80 }, says: { kind: 'string', label: 'what they said', required: true, max: 1000 },
    known: { kind: 'enum', label: 'how it is known', values: ['observed', 'reported'], required: true }, about: { kind: 'string', label: 'the entry it answers', max: 80 },
    stance: { kind: 'enum', label: 'agrees or disagrees', values: ['supports', 'contradicts', 'neutral'] }, machine: { kind: 'string', label: 'the machine', max: 120 },
    reason: { kind: 'string', label: 'the reason', max: 120 }, role: { kind: 'string', label: 'their role', max: 60 },
  }),
  allowed: async (ctx) => (mayAddKnowledge() ? mayEdit(ctx) : { ok: false, why: 'You can read here but not add to it.' }),
  async preview(ctx, input: NoteIn) {
    const line = await getWorkspace(input.lineId);
    const about = input.about ? (await listKnowledge(input.lineId)).find(e => e.id === input.about) : undefined;
    return `Keep on ${line?.name ?? 'the line'}, as ${ctx.me ?? 'you'}${input.role ? ` (${input.role})` : ''} said it — ${input.known === 'observed' ? 'seen by a person' : 'a person says'}: “${input.says}”${about ? ` — ${input.stance === 'contradicts' ? 'disagreeing with' : input.stance === 'supports' ? 'agreeing with' : 'about'} “${about.says}”` : ''}. It is kept as what you said, never as proof, and never changed afterwards.`;
  },
  async run(ctx, input: NoteIn): Promise<CapResult> {
    const line = await getWorkspace(input.lineId);
    if (!line) return { ok: false, why: 'There is no such line.' };
    const ledger = await listKnowledge(line.id);
    const about = input.about ? ledger.find(e => e.id === input.about) : undefined;
    if (input.about && !about) return { ok: false, why: 'There is no such finding on that line — read findings for its id.' };
    const e: Entry = {
      id: personEntryId(ctx.me ?? 'person', ctx.now, input.about), workspaceId: line.id, ...(line.clientName ? { client: line.clientName } : {}),
      kind: about ? 'review' : 'account', known: input.known,
      subject: about?.subject ?? subjectOf({ ...(input.machine ? { machine: input.machine } : {}), ...(input.reason ? { reason: input.reason } : {}) }),
      ...(about ? { about: about.id, stance: input.stance ?? 'neutral' } : {}),
      says: input.says.trim(), body: {}, ...(ctx.me ? { by: ctx.me } : {}), ...(input.role ? { role: input.role } : {}), source: 'luna', at: ctx.now, updatedAt: ctx.now,
    };
    await addEntries([e]);
    return { ok: true, says: `Kept on ${line.name} as what ${ctx.me ?? 'they'} said (${knownWord(e.known)}).`, refs: [lineRef(line)], data: { id: e.id } };
  },
};

export const BRAIN: readonly Capability[] = [readFindings, readOutcomes, readHistory, noteKnowledge];
