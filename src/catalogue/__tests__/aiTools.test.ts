/* THE AI TOOLBOX (catalogue/aiTools, docs/AI-TOOLBOX.md) — every place a model is used, listed once, each tool it marks a real tool. */
import { describe, expect, it } from 'vitest';
import { AI_TOOLS, aiMark, aiOf } from '../aiTools';
import { APP_TOOLS } from '../registry';

describe('the AI toolbox', () => {
  it('lists each place a model is used, each saying what it does, what it sends and what it never does', () => {
    expect(AI_TOOLS.map(a => a.id)).toEqual(['talk', 'talk-in', 'video-name', 'colleague', 'brief-read', 'story-draft', 'voice-note']);
    for (const a of AI_TOOLS) for (const k of ['does', 'sends', 'never'] as const) expect(a[k].length, `${a.id} ${k}`).toBeGreaterThan(20);
  });
  it('marks only tools that exist', () => {
    for (const a of AI_TOOLS) for (const k of a.tools) expect(APP_TOOLS.some(t => t.key === k), k).toBe(true);
  });
  it('says Uses AI on Line Talk and the video study, Can be talked in on the three Line Talk fills, nothing on a formula tool', () => {
    expect(aiMark('talk')).toBe('Uses AI');
    expect(aiMark('video')).toBe('Uses AI');
    expect(['processflow', 'spaghetti', 'valuestream'].map(aiMark)).toEqual(Array(3).fill('Can be talked in · AI'));
    expect(aiMark('capability')).toBeUndefined();
    expect(aiOf('linebalance')).toEqual([]);
  });
});
