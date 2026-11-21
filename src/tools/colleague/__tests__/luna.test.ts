/* LUNA — Faultline's AI colleague, permanently (Rowland, 10 November: "The AI assistant will be called LUNA … Check that the Claude API
 * receives Luna's identity in the actual system instructions, not just that the interface displays the name"). These are the very
 * instructions the gateway sends Claude (supabase/functions/assist copies them with scripts/sync-assist.mjs): AI Mode's, Line Talk's in
 * every walk set, and the spoken note. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COLLEAGUE_SYSTEM, SPOKEN_NOTE, colleagueRulesText } from '../colleagueAssist';
import { TALK_SYSTEM, talkSystemFor } from '../../talk/talkAssist';
import { TALK_SETS } from '../../talk/talkSets';
import { CAPABILITY_SCHEMAS } from '../../../capabilities/schemas';

describe('Luna, in the instructions Claude is sent', () => {
  it('AI Mode opens by making Claude Luna — the colleague within Faultline, for every role in a business — not Claude, not a generic assistant', () => {
    expect(COLLEAGUE_SYSTEM.startsWith('You are Luna — LUNA, the AI colleague who lives within Faultline')).toBe(true);
    expect(COLLEAGUE_SYSTEM).toMatch(/Answer as Luna — not as Claude, and not as a generic AI assistant/);
    expect(COLLEAGUE_SYSTEM).toMatch(/Faultline is the product the person is using[\s\S]*Never call the product Luna or yourself Faultline/);
    expect(COLLEAGUE_SYSTEM).toMatch(/an operator or team leader beside a machine[\s\S]*a site manager or a director/);
    expect(COLLEAGUE_SYSTEM).toMatch(/intelligent, approachable, confident, observant and naturally conversational/);
    expect(COLLEAGUE_SYSTEM).toMatch(/Use your name naturally and only when it fits/);
    expect(COLLEAGUE_SYSTEM).toMatch(/every figure is worked out by the app's code[\s\S]*never by you/);
    expect(colleagueRulesText(CAPABILITY_SCHEMAS).startsWith('You are Luna')).toBe(true);
  });
  it('Line Talk is Luna answering, in every kind of walk', () => {
    expect(TALK_SYSTEM.startsWith('You are Luna — LUNA, the AI colleague who lives within Faultline')).toBe(true);
    expect(TALK_SYSTEM).toMatch(/answering in Line Talk/);
    for (const set of TALK_SETS) expect(talkSystemFor(set).startsWith('You are Luna')).toBe(true);
    expect(TALK_SYSTEM).not.toMatch(/You are Line Talk/);
  });
  it('spoken, she is the same Luna', () => {
    expect(SPOKEN_NOTE).toMatch(/talking with you, Luna, in a voice conversation/);
  });
  it('a length asked for is the whole answer, and a count is a figure the app works out (21 November — the investigation measured)', () => {
    /* asked for two sentences she gave the two and then six more of advice; asked what had no reason she subtracted two counts herself */
    expect(COLLEAGUE_SYSTEM).toMatch(/A LENGTH THEY ASK FOR IS THE WHOLE ANSWER[\s\S]*answer in exactly that and stop/);
    expect(COLLEAGUE_SYSTEM).toMatch(/A COUNT is a figure too[\s\S]*never get one by adding or subtracting two counts yourself/);
    expect(COLLEAGUE_SYSTEM).toMatch(/a value "before rounding" as well, both are the app's/);
    expect(readFileSync('supabase/functions/assist/colleague/colleagueAssist.ts', 'utf8')).toContain('A LENGTH THEY ASK FOR IS THE WHOLE ANSWER');
  });
  it('a job is taken and finished; a customer is listed and brought back by her, archived by the person (21 November)', () => {
    expect(COLLEAGUE_SYSTEM).toMatch(/A JOB — when they hand you a piece of work, take it and finish it/);
    expect(COLLEAGUE_SYSTEM).toMatch(/plan_job first, in the same go as your first real step/);
    expect(COLLEAGUE_SYSTEM).toMatch(/Finish with the RESULT, not the story of the work/);
    /* the AI never deletes a record or puts one away — she opens the place, and never leaves the person hunting for it */
    expect(COLLEAGUE_SYSTEM).toMatch(/you never put a record away or delete one[\s\S]*never leave them hunting for it: open_page with \/factory\?customer=manage/);
    expect(COLLEAGUE_SYSTEM).not.toMatch(/archive_customer/);
    const gw = readFileSync('supabase/functions/assist/colleague/colleagueAssist.ts', 'utf8');
    expect(gw).toContain('A JOB — when they hand you a piece of work, take it and finish it');
    expect(gw).toContain('never leave them hunting for it');
  });
  it('the gateway holds the same words as the app (synced)', () => {
    const gw = readFileSync('supabase/functions/assist/colleague/colleagueAssist.ts', 'utf8');
    const talk = readFileSync('supabase/functions/assist/talk/talkAssist.ts', 'utf8');
    expect(gw).toContain('You are Luna — LUNA, the AI colleague who lives within Faultline');
    expect(talk).toContain('answering in Line Talk, the talk on the line');
  });
});
