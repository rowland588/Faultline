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
    expect(COLLEAGUE_SYSTEM).toMatch(/personal assistant and companion/);
    expect(COLLEAGUE_SYSTEM).toMatch(/linked to this customer's data/);
    expect(COLLEAGUE_SYSTEM).toMatch(/document_look/);
    expect(COLLEAGUE_SYSTEM).toMatch(/tender or commercial pack/);
    expect(COLLEAGUE_SYSTEM).toMatch(/Never invent a number, a date, a party or a reference/);
    expect(COLLEAGUE_SYSTEM).toMatch(/mostly food manufacturing/);
    expect(COLLEAGUE_SYSTEM).toMatch(/FOOD FMCG MANUFACTURING[\s\S]*never certify compliance/);
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
    expect(SPOKEN_NOTE).toMatch(/Lead with the thing they asked/);
    expect(SPOKEN_NOTE).toMatch(/never a stiff report voice/);
  });
  it('conversation acts — make a report, send it, remind me tomorrow (24 November)', () => {
    expect(COLLEAGUE_SYSTEM).toMatch(/CONVERSATION ACTS/);
    expect(COLLEAGUE_SYSTEM).toMatch(/Remind me tomorrow[\s\S]*remind_me/);
    expect(COLLEAGUE_SYSTEM).toMatch(/move_into_workspace/);
    expect(COLLEAGUE_SYSTEM).toMatch(/Take the intent, not a magic phrase/);
    expect(COLLEAGUE_SYSTEM).toMatch(/answer in your own words/);
    expect(COLLEAGUE_SYSTEM).toMatch(/When they want to see a dashboard[\s\S]*list_artifacts[\s\S]*open_artifact[\s\S]*Understand what they asked/);
    expect(COLLEAGUE_SYSTEM).not.toMatch(/"Open artifacts"/);
    expect(COLLEAGUE_SYSTEM).toMatch(/Never sound like a report/);
    expect(COLLEAGUE_SYSTEM).toMatch(/In a client meeting[\s\S]*never a dead "Hello/);
    expect(COLLEAGUE_SYSTEM).toMatch(/How would you like it\? Graphs, or another way\?/);
    expect(COLLEAGUE_SYSTEM).toMatch(/yes, send it/);
  });
  it('a length asked for is the whole answer, and a count is a figure the app works out (21 November — the investigation measured)', () => {
    /* asked for two sentences she gave the two and then six more of advice; asked what had no reason she subtracted two counts herself */
    expect(COLLEAGUE_SYSTEM).toMatch(/A LENGTH THEY ASK FOR IS THE WHOLE ANSWER[\s\S]*answer in exactly that and stop/);
    expect(COLLEAGUE_SYSTEM).toMatch(/A COUNT is a figure too[\s\S]*never get one by adding or subtracting two counts yourself/);
    expect(COLLEAGUE_SYSTEM).toMatch(/a value "before rounding" as well, both are the app's/);
    expect(readFileSync('supabase/functions/assist/colleague/colleagueAssist.ts', 'utf8')).toContain('A LENGTH THEY ASK FOR IS THE WHOLE ANSWER');
  });
  it('a job is taken and finished; a customer is archived and brought back by her on a card, and nothing else is put away (21 November)', () => {
    expect(COLLEAGUE_SYSTEM).toMatch(/A JOB — when they hand you a piece of work, take it and finish it/);
    expect(COLLEAGUE_SYSTEM).toMatch(/plan_job first, in the same go as your first real step/);
    expect(COLLEAGUE_SYSTEM).toMatch(/Finish with the RESULT, not the story of the work/);
    /* by Rowland's word, the one thing she may put away — on a card, for the customer named, and nothing else */
    expect(COLLEAGUE_SYSTEM).toMatch(/archive_customer \(a card[\s\S]*Only for the customer they name, only when they ask; it is the one thing you may put away — you never archive, remove or delete anything else/);
    expect(COLLEAGUE_SYSTEM).toMatch(/Never leave a person hunting for a page/);
    expect(COLLEAGUE_SYSTEM).toMatch(/ADMIN \/ CUSTOMER GOVERNANCE/);
    expect(COLLEAGUE_SYSTEM).toMatch(/hold fire, not now, when I get back/);
    expect(COLLEAGUE_SYSTEM).toMatch(/Where are we going next/);
    const gw = readFileSync('supabase/functions/assist/colleague/colleagueAssist.ts', 'utf8');
    expect(gw).toContain('A JOB — when they hand you a piece of work, take it and finish it');
    expect(gw).toContain('it is the one thing you may put away');
  });
  it('calls method_knowledge before lecturing on theory', () => {
    expect(COLLEAGUE_SYSTEM).toMatch(/Call method_knowledge \(read\) first/);
    expect(readFileSync('supabase/functions/assist/colleague/colleagueAssist.ts', 'utf8')).toMatch(/Call method_knowledge \(read\) first/);
  });
  it('the gateway holds the same words as the app (synced)', () => {
    const gw = readFileSync('supabase/functions/assist/colleague/colleagueAssist.ts', 'utf8');
    const talk = readFileSync('supabase/functions/assist/talk/talkAssist.ts', 'utf8');
    expect(gw).toContain('You are Luna — LUNA, the AI colleague who lives within Faultline');
    expect(talk).toContain('answering in Line Talk, the talk on the line');
  });
});
