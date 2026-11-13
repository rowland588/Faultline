/* The sums a person asks Line Talk for are worked out by the app (13 November — Rowland: "if I'm literally requesting you to do the
 * numbers, then it needs to do the numbers"). The case is his own: a 1,500 kg hopper drawn at 500 kg a minute against a 57 second cycle.
 * By hand: 1500 ÷ 500 = 3 minutes = 180 seconds; 180 ÷ 57 = 3.157… cycles. */
import { describe, expect, it } from 'vitest';
import { TALK_SCHEMA, TALK_SYSTEM, WORKED, checkTalkAnswer, unsureFigures, workedSums, type TalkAsk } from '../talkAssist';
import { SET_SCHEMA } from '../talkSets';

const ask = (said: string, context = 'Line capacity: Cellox B draws 500 kg a minute.'): TalkAsk => ({
  turns: [{ kind: 'said', text: said, at: '10:02' }], context, today: '13 November 2026', set: 'walk',
} as unknown as TalkAsk);

describe('Line Talk does the sum when asked — through the app', () => {
  const said = 'The hopper holds 1500 kg, the cycle is 57 seconds. Work out how long the hopper lasts.';
  const raw = { document: null, reply: 'I have put it through the app — the run-down time and how many cycles that is are below.',
    sums: [{ what: 'how long 1,500 kg lasts at 500 kg a minute', expression: '1500 / 500 * 60', unit: 'seconds' }, { what: 'that run-down in 57-second cycles', expression: '(1500 / 500 * 60) / 57', unit: 'cycles' }] };
  const checked = checkTalkAnswer(raw, [], 'walk');
  it('keeps the sums she wrote', () => { expect(checked?.sums).toHaveLength(2); });
  it('works each out in code and says it under her reply', () => {
    const { answer, backed } = workedSums(checked!, ask(said));
    const lines = answer.reply.split('\n');
    expect(lines[1]).toBe(`${WORKED} — how long 1,500 kg lasts at 500 kg a minute: 1500 ÷ 500 × 60 = 180 seconds.`);
    expect(lines[2]).toBe(`${WORKED} — that run-down in 57-second cycles: (1500 ÷ 500 × 60) ÷ 57 = 3.16 cycles.`);
    expect(backed).toHaveLength(2);
    expect(answer.sums).toBeUndefined();
    /* the worked figures are known, so nothing is marked to check */
    expect(unsureFigures(answer, ask(said), backed)).toEqual([]);
  });
  it('a number nobody said is named, and the figure stays marked', () => {
    const c = checkTalkAnswer({ document: null, reply: 'Below.', sums: [{ what: 'the run-down', expression: '1500 / 450 * 60', unit: 'seconds' }] }, [], 'walk')!;
    const { answer, backed } = workedSums(c, ask(said));
    expect(answer.reply).toMatch(/= 200 seconds\. It rests on 450, which nobody has said and no record holds — check it\.$/);
    expect(backed).toEqual([]);
    expect(unsureFigures(answer, ask(said), backed)).toContain('450');
  });
  it('a sum that cannot be read says why and invents nothing', () => {
    const c = checkTalkAnswer({ document: null, reply: '', sums: [{ what: 'the run-down', expression: 'hopper / draw', unit: 's' }] }, [], 'walk')!;
    expect(workedSums(c, ask(said)).answer.reply).toMatch(/^The app could not work out the run-down \(hopper \/ draw\): “h” is not a number/);
  });
  it('a later sum may build on a figure the app worked out earlier', () => {
    const a = { ...ask('And against 57?'), turns: [{ kind: 'reply', text: `Here.\n${WORKED} — run-down: 1500 ÷ 500 × 60 = 180 seconds.`, at: '10:03' }, { kind: 'said', text: 'And against 57?', at: '10:04' }] } as unknown as TalkAsk;
    const c = checkTalkAnswer({ document: null, reply: 'Below.', sums: [{ what: 'margin', expression: '180 - 57', unit: 'seconds' }] }, [], 'walk')!;
    expect(workedSums(c, a).backed).toHaveLength(1);
  });
  it('an answer with no sum is as it was', () => {
    const c = checkTalkAnswer({ document: null, reply: 'Morning.' }, [], 'walk')!;
    expect(workedSums(c, ask('hello'))).toEqual({ answer: { reply: 'Morning.' }, backed: [] });
  });
  it('she is told to do it, never to send the person to a calculator — in every kind of walk', () => {
    expect(TALK_SYSTEM).toMatch(/NEVER refuse a sum the person asks for[\s\S]*never send them to a calculator/);
    expect(TALK_SYSTEM).toMatch(/never write the result of a sum in your reply/);
    expect(JSON.stringify(TALK_SCHEMA)).toContain('"sums"');
    for (const sch of Object.values(SET_SCHEMA)) expect(JSON.stringify(sch)).toContain('"sums"');
  });
});
