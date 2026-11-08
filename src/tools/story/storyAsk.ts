/* THE CHAPTER ASKED OF THE ASSISTANT — through the app's gateway (supabase/functions/assist, task `story`; docs/STORY.md §5). The
 * snapshot is rendered here as text, every figure with where it comes from, and sent with the brief and the headlines before; the
 * answer comes back read (tools/story/storyAssist checkStoryAnswer) with the figures the gateway could not find marked `unsure`.
 * Whatever goes wrong — no cloud, no signal, the allowance spent, the model busy — comes back in words, and the chapter assembled
 * from the records' words stands: the assistant's draft is an offer, never a wait. */
import { supabase } from '../../cloud/client';
import type { AgreedStory, StoryChapter, StorySnapshot, StorySince } from '../../lib/study';
import { dayWord, dayWordYear, snapshotFigures } from '../../lib/clientStory';
import { fmtGBP } from '../../lib/cost';
import { STORY_LIMITS, type StoryAnswer, type StoryAsk } from './storyAssist';

export type StoryAsked =
  | { ok: true; answer: StoryAnswer; unsure: string[]; model: string }
  | { ok: false; why: string; off?: boolean; offline?: boolean };

const NO_CLOUD = 'The assistant needs the cloud — this device is not signed in to it. The chapter is written from the records’ words.';
const NO_SIGNAL = 'No signal — the chapter is written from the records’ words; run the update again when it is back for the assistant’s draft.';
const NOT_NOW = 'The assistant could not answer just now — the chapter is written from the records’ words.';

/** The snapshot as the assistant reads it: a line each, every figure with its source. Pure. */
export function snapshotText(s: StorySnapshot, since: StorySince): string {
  const money = (v: number | undefined) => (v != null ? `${fmtGBP(v)} a day` : 'not priced');
  const lines: string[] = [];
  lines.push(`LINES: ${s.lines} production line${s.lines === 1 ? '' : 's'} on this client's site.`);
  lines.push(`PROBLEMS OPEN (the register): ${s.found.open}; ${s.found.critical} critical; ${s.found.late} past their day; ${s.found.priced} priced${s.found.costDay != null ? `; together ${fmtGBP(s.found.costDay)} a day (each line's own cost model: wage, speed, margin, materials a pack)` : ''}.`);
  lines.push(`ACTIONS (who is doing what): ${s.fixing.open} open; ${s.fixing.late} late; ${s.fixing.nobody} with nobody named yet.`);
  lines.push(`FIXES PROVED (the same number counted again and moved the right way): ${s.proved}.`);
  if (since.from) {
    lines.push(`SINCE THE LAST CHAPTER (${dayWordYear(since.from)}): ${since.newFindings.length} new finding${since.newFindings.length === 1 ? '' : 's'}${since.newFindings.length ? ` — ${since.newFindings.map(f => f.what).join('; ')}` : ''}; ${since.closed} problem${since.closed === 1 ? '' : 's'} closed; ${since.newProved.length} fix${since.newProved.length === 1 ? '' : 'es'} proved${since.newProved.length ? ` — ${since.newProved.map(p => p.what).join('; ')}` : ''}; ${since.newTools} new tool record${since.newTools === 1 ? '' : 's'}${since.costDayBefore != null && s.found.costDay != null ? `; the open problems cost ${fmtGBP(since.costDayBefore)} a day then and ${money(s.found.costDay).replace(' a day', '')} a day now` : ''}.`);
  } else lines.push('SINCE THE LAST CHAPTER: this is the first chapter — everything below is new.');
  lines.push('');
  lines.push('THE PROBLEMS OPEN, worst first (what · where · what it costs a day · who):');
  if (!s.findings.length) lines.push('  (none)');
  for (const f of s.findings) lines.push(`  - ${f.what} · ${f.line}${f.machine ? `, ${f.machine}` : ''} · ${money(f.poundsDay)}${f.words ? ` (${f.words})` : ''} · ${f.owner ? `with ${f.owner}` : 'nobody yet'}${f.late ? ' · past its day' : ''}${f.priority === 'critical' ? ' · critical' : ''}`);
  lines.push('');
  lines.push('THE ACTIONS, late first (what · who · due):');
  if (!s.actions.length) lines.push('  (none)');
  for (const a of s.actions) lines.push(`  - ${a.what} · ${a.who || 'nobody yet'} · ${a.due ? `${a.late ? 'was due' : 'due'} ${dayWord(Date.parse(a.due))}` : 'no day agreed'}`);
  lines.push('');
  lines.push('PROVED (what · where · the before → after):');
  if (!s.provedFixes.length) lines.push('  (none yet)');
  for (const p of s.provedFixes) lines.push(`  - ${p.what} · ${p.line}, ${p.machine} · ${p.proof}`);
  lines.push('');
  lines.push(`TOOLS USED ON THE LINES: ${s.toolsUsed.length ? s.toolsUsed.map(t => `${t.label} (${t.n})`).join(', ') : 'none yet'}.`);
  /* THE CLIENT'S ASKS (S9, docs/STORY.md §7.3) — each with what answered it by the rules (lib/storyAsks), so the chapter can be
     written ask by ask; a story with no asks sends nothing here */
  if (s.asks?.length) {
    lines.push('');
    lines.push('THE CLIENT\'S ASKS, in their order (asked · found · being done · proved · still to show), matched to the records by rules:');
    s.asks.forEach((a, k) => {
      lines.push(`  ASK ${k + 1}: ${a.text}${a.from ? ` (the brief: "${a.from}")` : ''} — ${a.says}`);
      for (const f of a.found) lines.push(`    found: ${f.what} · ${f.where}${f.money ? ` · ${f.money}` : ''}`);
      for (const d of a.doing) lines.push(`    being done: ${d.what} · ${d.who || 'nobody yet'} · ${d.due ? `${d.late ? 'was due' : 'due'} ${dayWord(Date.parse(d.due))}` : 'no day agreed'}`);
      for (const p of a.proved) lines.push(`    proved: ${p.what} · ${p.where} · ${p.proof}`);
      for (const m of a.missing) lines.push(`    still to show: ${m}`);
    });
  }
  return lines.join('\n').slice(0, STORY_LIMITS.text);
}

/** The ask for a draft chapter. */
export function storyAskOf(story: AgreedStory, chapters: readonly StoryChapter[], draft: StoryChapter, today = Date.now()): StoryAsk {
  return {
    client: story.client, brief: story.brief, today: dayWordYear(today),
    headlinesBefore: chapters.filter(c => c.approvedAt).map(c => c.headline).slice(-STORY_LIMITS.headlines),
    snapshotText: snapshotText(draft.snapshot, draft.since),
    figures: [...snapshotFigures(draft.snapshot)].slice(0, STORY_LIMITS.figures),
  };
}

export async function askStory(ask: StoryAsk): Promise<StoryAsked> {
  if (!supabase) return { ok: false, off: true, why: NO_CLOUD };
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { ok: false, offline: true, why: NO_SIGNAL };
  try {
    const { data, error } = await supabase.functions.invoke('assist', { body: { task: 'story', ...ask } });
    if (error) {
      const ctx = (error as { context?: unknown }).context;
      if (error.name === 'FunctionsHttpError' && ctx instanceof Response) {
        const d = await ctx.clone().json().catch(() => null) as { why?: unknown; off?: unknown } | null;
        return { ok: false, why: typeof d?.why === 'string' && d.why ? d.why : NOT_NOW, ...(d?.off ? { off: true } : {}) };
      }
      if (error.name === 'FunctionsFetchError') return { ok: false, offline: true, why: NO_SIGNAL };
      return { ok: false, why: NOT_NOW };
    }
    const d = (data ?? {}) as { ok?: unknown; off?: unknown; why?: unknown; headline?: unknown; narrative?: unknown; unsure?: unknown; model?: unknown };
    if (d.off) return { ok: false, off: true, why: typeof d.why === 'string' ? d.why : NOT_NOW };
    if (d.ok !== true) return { ok: false, why: typeof d.why === 'string' && d.why ? d.why : NOT_NOW };
    const headline = typeof d.headline === 'string' ? d.headline.trim() : '';
    const narrative = Array.isArray(d.narrative) ? d.narrative.filter((p): p is string => typeof p === 'string' && !!p.trim()) : [];
    if (!headline || !narrative.length) return { ok: false, why: NOT_NOW };
    return { ok: true, answer: { headline, narrative }, unsure: Array.isArray(d.unsure) ? d.unsure.filter((x): x is string => typeof x === 'string') : [], model: typeof d.model === 'string' ? d.model : '' };
  } catch {
    return { ok: false, why: NOT_NOW };
  }
}
