/* A document offers what the project's method sheet already says (FC-142 reading DMAIC's Define) — read, never stored twice. */
import { describe, expect, it } from 'vitest';
import { offerAnswer, EMPTY_CTX } from '../doc';
import { docByKey } from '../registry';
import { insertionsOf } from '../../../project/method/shapes/dmaicModel';
import { newDocStudy } from '../doc';

describe('offerAnswer', () => {
  const ctx = { ...EMPTY_CTX('2026-11-01'), methodAnswers: { 'dmaic:problem': 'Seals fail on Line 7. It started in September.', 'kaizen-event:sponsor': 'Tanya Reid' } };
  it('offers the first answer written, quoted briefly, with where it is from', () => {
    expect(offerAnswer(ctx, ['dmaic:problem'], 'Define')).toEqual({ value: 'Seals fail on Line 7. It started in September.', words: '“Seals fail on Line 7” — as written in Define' });
    expect(offerAnswer(ctx, ['nope:x', 'kaizen-event:sponsor'], 'the event')?.value).toBe('Tanya Reid');
  });
  it('offers nothing when nothing is written, or the project holds no sheet', () => {
    expect(offerAnswer(ctx, ['dmaic:scope'], 'Define')).toBeUndefined();
    expect(offerAnswer(EMPTY_CTX('2026-11-01'), ['dmaic:problem'], 'Define')).toBeUndefined();
  });
  it('the charter’s problem, scope and sponsor boxes use it', () => {
    const c = docByKey('charter')!;
    const boxes = c.sections.flatMap(s => s.items).filter(i => i.kind !== 'list' && i.kind !== 'photos') as { id: string; offer?: (x: typeof ctx) => unknown }[];
    const ctx2 = { ...ctx, methodAnswers: { ...ctx.methodAnswers, 'dmaic:scope': 'Line 7 only' } };
    for (const id of ['problem', 'scopeIn', 'sponsor']) expect(boxes.find(b => b.id === id)?.offer?.(ctx2), id).toBeDefined();
  });
});

describe('DMAIC’s Define reads the charter page', () => {
  it('has a slot for the project’s charter document, opening at its own page', () => {
    const empty = insertionsOf([]).find(i => i.id === 'charter')!;
    expect(empty).toMatchObject({ phase: 'define', fc: 'FC-142', at: '/doc/charter', studyCount: 0 });
    expect(empty.says).toBeUndefined();
    const s = newDocStudy(docByKey('charter')!, { name: 'Seals charter', projectId: 'p', now: 1 });
    const full = insertionsOf([s]).find(i => i.id === 'charter')!;
    expect(full.studyCount).toBe(1);
    expect(full.says).toBeTruthy();
    expect(insertionsOf([newDocStudy(docByKey('sipoc')!, { name: 'x', projectId: 'p', now: 2 })]).find(i => i.id === 'charter')!.studyCount).toBe(0);
  });
});
