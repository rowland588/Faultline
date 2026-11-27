/* CLIENT-OFFICE PRESENTATION (27 November — Rowland: walk in, say hello, then ask about their data).
 *
 * When they ask about figures and have not named graphs, a table or a report, the app starts the look-up and asks once how they
 * would like it — chips, same idea as conversational documents (SOP vs work instruction). If they already named the form, it just
 * does that. Every figure is the app's. Pure. */

import type { DataResult } from '../lib/data/outputs';
import type { Used } from './conversation';

export type PresentForm = 'graphs' | 'table' | 'report';

export const PRESENT_ASK = "No problem — I'll get on it now. How would you like it? Graphs, or another way?";
export const PRESENT_CHIPS = ['Graphs', 'A table', 'A report'] as const;

const command = (s: string) => s.trim()
  .replace(/^(?:(?:hey\s+)?luna[, ]+)?(?:please[, ]+)?(?:(?:can|could|would) you\s+)?(?:please\s+)?/i, '')
  .replace(/[.!?]+$/, '')
  .trim();

/** The presentation they named — graphs, a table, a report — or undefined when the form is still open. */
export function presentForm(said: string): PresentForm | undefined {
  const s = command(said).replace(/\s+/g, ' ');
  if (!s) return undefined;
  if (/^graphs?$/i.test(s) || /^(?:as|in|on)\s+(?:a\s+|the\s+)?graphs?$/i.test(s) || /^show that as a graph$/i.test(s)) return 'graphs';
  if (/^a table$/i.test(s) || /^(?:as|in|on)\s+(?:a\s+|the\s+)?tables?$/i.test(s)) return 'table';
  if (/^a report$/i.test(s) || /^(?:as|in|into)\s+(?:a\s+|the\s+)?reports?$/i.test(s) || /^put that in(?:to)? a report$/i.test(s)) return 'report';
  if (/\b(?:as|in|into|on)\s+(?:an?\s+|the\s+)?(?:graphs?|charts?|plots?|pictures?|visuals?)\b/i.test(s)) return 'graphs';
  if (/\b(?:graphs?|charts?|plots?)\b/i.test(s) && !/\bno (?:graphs?|charts?|plots?)\b/i.test(s)) return 'graphs';
  if (/\b(?:as|in|into)\s+(?:an?\s+|the\s+)?tables?\b|\ba table\b/i.test(s)) return 'table';
  if (/\b(?:as|in|into)\s+(?:an?\s+|the\s+)?reports?\b/i.test(s)) return 'report';
  return undefined;
}

/** A look at their figures — top losses, last week vs the week before — not a greeting and not a document. */
export function dataAsk(said: string): boolean {
  const s = command(said);
  if (!s) return false;
  return /\b(?:top\s+\w+|losses?|last\s+week|this\s+week|week\s+before|compared(?:\s+to|\s+with)?|versus|vs\.?|what\s+happened)\b/i.test(s);
}

/** Form still open: start the work and ask how they would like it. Named form: do that, do not ask again. */
export function presentOffer(said: string): boolean {
  return dataAsk(said) && !presentForm(said);
}

const DREW = new Set(['make_chart', 'refine_chart', 'build_report']);

/** A result of this turn with two or more plotted groups — enough for graphs or a table, including week vs week. */
export function presentWorth(steps: readonly Used[], results: ReadonlyMap<string, DataResult>): boolean {
  const done = steps.filter(s => s.status === 'done');
  if (done.some(s => DREW.has(s.name))) return false;
  return done.flatMap(s => s.refs.filter(r => r.kind === 'result').map(r => results.get(r.id)))
    .some(r => !!r && r.result.groups.filter(g => typeof g.values[0] === 'number').length >= 2);
}

/** The organic lead, then her words — never a figure of its own. */
export function presentLead(reply: string, offering: boolean): string {
  if (!offering) return reply;
  if (/how would you like it|graphs, or another way/i.test(reply)) return reply;
  const body = reply.trim();
  if (!body || body === 'Done.') return PRESENT_ASK;
  return `${PRESENT_ASK}\n\n${body}`;
}

export function presentOffered(suggestions: readonly string[] | undefined): boolean {
  return !!suggestions?.some(s => s === PRESENT_CHIPS[0] || s === 'Show that as a graph');
}
