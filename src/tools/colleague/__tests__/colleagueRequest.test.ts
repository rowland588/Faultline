import { describe, expect, it } from 'vitest';
import { CAPABILITY_SCHEMAS } from '../../../capabilities/schemas';
import { allowance, lunaDailyAllowance } from '../../video/gatewayUsage';
import { readColleagueAsk, type ColleagueAsk } from '../colleagueAssist';
import { lunaClaudeRequest, lunaModelSettings } from '../colleagueRequest';

const defaults = lunaModelSettings(() => undefined);
function input(text: string): ColleagueAsk {
  const r = readColleagueAsk({
    turns: [{ role: 'person', text, at: '09:00' }], focus: 'Private customer production figures', today: 'Monday',
  });
  if (!r.ok) throw new Error(r.why);
  return r.ask;
}

describe('Claude request cost and capability routing', () => {
  it('a literal greeting uses Haiku with only the greeting', () => {
    const r = lunaClaudeRequest(input('Good morning, Luna!'), CAPABILITY_SCHEMAS, defaults);
    expect(r.model).toBe('claude-haiku-5-5');
    expect(r.params).not.toHaveProperty('tools');
    expect(r.params).not.toHaveProperty('fallbacks');
    expect(r.params.messages).toEqual([{ role: 'user', content: 'Good morning, Luna!' }]);
    expect(JSON.stringify(r.params)).not.toContain('Private customer');
    expect(r.cacheTTL).toBeNull();
  });

  it('mixed requests, follow-up evidence and a photo keep their work context; remaining chit-chat uses Haiku', () => {
    const ask = input('Hello, what does the line data tell us?');
    const r = lunaClaudeRequest(ask, CAPABILITY_SCHEMAS, defaults);
    expect(r.model).toBe(defaults.work);
    expect(r.params).toHaveProperty('tools');
    expect(JSON.stringify(r.params.messages)).toContain(ask.focus);
    const about = lunaClaudeRequest(input('What can you do?'), CAPABILITY_SCHEMAS, defaults);
    expect(about.model).toBe('claude-haiku-5-5');
    expect(about.params).not.toHaveProperty('tools');
    expect(JSON.stringify(about.params)).not.toContain('Private customer');
    const how = lunaClaudeRequest(input('How are you?'), CAPABILITY_SCHEMAS, defaults);
    expect(how.model).toBe('claude-haiku-5-5');
    const withImage = { ...input('Thanks'), images: [{ photo: 'P1', data: 'AAAA' }] };
    expect(lunaClaudeRequest(withImage, CAPABILITY_SCHEMAS, defaults).fast).toBe(false);
  });

  it('keeps the same shared tool and system prefix for an exam and uses five minutes for its own history', () => {
    const ask = input('Review the line data.');
    const user = lunaClaudeRequest(ask, CAPABILITY_SCHEMAS, defaults);
    const exam = lunaClaudeRequest(ask, CAPABILITY_SCHEMAS, defaults, true);
    expect(exam.params.system).toEqual(user.params.system);
    expect(exam.params).toHaveProperty('tools', 'tools' in user.params ? user.params.tools : []);
    expect(JSON.stringify(exam.params.messages)).toContain('"cache_control":{"type":"ephemeral"}');
    expect(JSON.stringify(user.params.messages)).toContain('"ttl":"1h"');
    expect(lunaModelSettings(() => undefined, 'high').effort).toBe('high');
  });

  it('adds a cache-safe depth note on pending rounds without changing effort', () => {
    const ask = input('Carry on with the report.');
    const pending = { carry: { v: 1 as const, rounds: [], content: [], refused: [] }, results: [] };
    const r = lunaClaudeRequest({ ...ask, pending }, CAPABILITY_SCHEMAS, defaults);
    expect(r.effort).toBe('low');
    expect(JSON.stringify(r.params.messages)).toMatch(/DEPTH FOR THIS TURN/i);
  });

  it('both job paths express an eight-dollar daily cap in microdollars', () => {
    const limit = lunaDailyAllowance(() => undefined);
    const now = new Date().toISOString();
    expect(limit).toEqual({ calls: 120, micros: 8_000_000 });
    expect(allowance([{ at: now, cost_micros: 8_000_000 }], Date.parse(now), limit).ok).toBe(false);
    expect(lunaDailyAllowance(name => name.endsWith('_USD') ? '0.25' : undefined).micros).toBe(250_000);
  });
});
