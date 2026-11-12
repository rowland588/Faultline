/* WHAT LUNAR HAS ALREADY FOUND (12 November, docs/LUNAR-BRAIN.md B1 — Rowland: "Lunar does its homework before the question is
 * asked … if a director asks about yesterday's performance, Luna should not need to analyse an entire workbook from scratch. She should
 * retrieve the relevant findings"). The one read Luna makes before saying how a line is doing or why: the homework the engine has done
 * on each line's records (lib/brain), brought up to date first if the records changed, each finding with how sure it is, what it rests
 * on, what it cannot say and its money as the cost model says it. Nothing is worked out here; nothing is written but the homework. */
import { listWorkspaces } from '../db';
import { homeworkForLine, lineBrain, BRAIN_STATE_WORD } from '../lib/brain/homework';
import type { Finding } from '../lib/brain/engine';
import { checkObject } from './check';
import { anyone } from './access';
import type { CapResult, Capability } from './types';

const SURE: Record<Finding['sure'], string> = { measured: 'measured', significant: 'unlikely chance', suggestive: 'could be chance', thin: 'too few records' };
export const findingSaid = (f: Finding) => `[${f.kind}${f.machine ? ` · ${f.machine}` : ''}] ${f.says} (${SURE[f.sure]}; ${f.n} stop${f.n === 1 ? '' : 's'}; ${f.method}.${f.money ? ` Money: ${f.money.words}` : ''} Cannot say: ${f.limits.join(' ')})`;

export const readFindings: Capability = {
  name: 'findings', title: 'What LUNAR has found', kind: 'read',
  validate: raw => checkObject(raw ?? {}, { lineId: { kind: 'string', label: 'the line', max: 80 } }),
  allowed: anyone,
  async run(ctx, input: { lineId?: string }): Promise<CapResult> {
    const lines = (await listWorkspaces()).filter(w => !w.archived && (!input.lineId || w.id === input.lineId));
    if (!lines.length) return { ok: false, why: input.lineId ? 'There is no such line.' : 'There are no lines yet.' };
    const parts: string[] = [];
    const data: { lineId: string; state: string; findings: Finding[] }[] = [];
    for (const w of lines) {
      await homeworkForLine(w, ctx.now);   // brought up to date first — only if its records changed or a day has passed
      const b = await lineBrain(w, ctx.now);
      data.push({ lineId: w.id, state: b.state, findings: b.findings });
      parts.push(`${w.name} — ${BRAIN_STATE_WORD[b.state]}${b.at ? ` (worked ${new Date(b.at).toISOString().slice(0, 16).replace('T', ' ')})` : ''}: ${b.findings.length ? b.findings.map(findingSaid).join(' ') : 'nothing timed on it to work from — say so; never fill the gap with a guess.'}`);
    }
    return { ok: true, says: `${parts.join('\n')}\nThese are the app's own findings: quote their sentences and figures, say how sure each is, and keep a recorded reason apart from a cause.`, refs: [], data };
  },
};

export const BRAIN: readonly Capability[] = [readFindings];
