/* Luna model tier — rules only, no extra AI call (27 November, docs/AI-COST.md §4.3).
 *
 * Tiers:
 *   social — greetings/chit-chat (colleagueFastChat / colleague/hello); no gateway tools.
 *   read   — simple read-only status/list lookups; Sonnet (`ASSIST_COLLEAGUE_READ_MODEL`).
 *   opus   — investigation, diagnosis, reports, writes, jobs, analysis, multi-round; Opus (`ASSIST_COLLEAGUE_MODEL`).
 *
 * When unsure → opus. Figures are still worked only by the app; this only picks the model. */

import type { ColleagueAsk } from './colleagueAssist';

export type LunaModelTier = 'social' | 'read' | 'opus';

/** An open job in the conversation threads (colleague/job focusText) — always the capable model. */
const JOB_IN_FOCUS = /\bJOB IN HAND\b/i;

/** Investigation, writes, reports, analysis, jobs — never the read tier. */
const OPUS_SIGNAL = new RegExp(
  [
    String.raw`\b(why|root cause|diagnos|investigat|analys|analyz|compare|trend|recover|missed target|shortfall)`,
    String.raw`\b(report|pack|slides?|pptx|pdf|briefing|handover|dashboard)`,
    String.raw`\b(make|build|create|raise|start|attach|fill|update|change|set|confirm|archive|remind me|send( this)?|email)`,
    String.raw`\b(find out|sort this|get me ready|go through|put it in|prepare me|look at .+ and tell)`,
    String.raw`\b(plan_job|job_step|workbook|excel|spreadsheet|query_data|work_out|run_analysis|run_calculator)`,
    String.raw`\b(share of|percentage|per line|per shift|by month|by week|top\s+\d|rank|derive|having)`,
    String.raw`\b(chart|graph|draw|visuali[sz])`,
    String.raw`\b(cost|£|\bpound|money|labour|labor|margin|contribution)`,
    String.raw`\b(project|dmaic|pdca|6m|fishbone|countermeasure|smed|changeover)`,
    String.raw`\b(photo|picture|image|manual|document|specification|sop)`,
    String.raw`\b(which line lost|across the|every line|all lines|worst|best line)`,
  ].join('|'),
  'i',
);

/** Simple read-only asks — status, lists, who owes — one pass over existing records. */
const READ_SIGNAL = new RegExp(
  [
    String.raw`^(what(\s+is|\s*'s)\s+open|what problems|list (the )?(open )?problems|how many (open )?problems)`,
    String.raw`^(who (has|owes)|overdue|what('s| is) (late|overdue))`,
    String.raw`^(what('s| is) the (state|status)|status of|how is line\b|how('s| is) line\b)`,
    String.raw`^(show me |tell me )?(the )?(open )?problems\b`,
    String.raw`^(list|show) (the )?(open )?(actions|programs)\b`,
    String.raw`^(what programs|what('s| is) running on)\b`,
    String.raw`^what (do we have|is there) open\b`,
    String.raw`^(any|are there) (open )?problems\b`,
  ].join('|'),
  'i',
);

const norm = (s: string) => s.trim().replace(/\s+/g, ' ');

/** Work-path tier only — call after colleagueFastChat; social is handled in colleagueRequest. */
export function lunaWorkModelTier(ask: ColleagueAsk): 'read' | 'opus' {
  if (ask.pending) return 'opus';
  if (ask.images.length) return 'opus';
  if (ask.spoken) return 'opus';
  const focus = ask.focus?.trim() ?? '';
  if (JOB_IN_FOCUS.test(focus)) return 'opus';
  const last = ask.turns[ask.turns.length - 1];
  if (!last || last.role !== 'person' || last.photo) return 'opus';
  const text = norm(last.text);
  if (!text || text.length > 200) return 'opus';
  if (OPUS_SIGNAL.test(text)) return 'opus';
  if (!READ_SIGNAL.test(text)) return 'opus';
  /* A follow-up in a long thread without pending is still read if the latest words are simple. */
  return 'read';
}