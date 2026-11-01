/* A document offers what the project's method sheet already says (FC-142 reading DMAIC's Define) — read, never stored twice. */
import { describe, expect, it } from 'vitest';
import { offerAnswer, EMPTY_CTX, runDoc } from '../doc';
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

describe('the 8D’s D2 reads the project’s Is / is not (FC-149) and keeps no second copy', () => {
  it('shows its lines as a table when the project holds one, and none when it does not', () => {
    const d = docByKey('eight-d')!;
    const base = d.examples[0];
    const ctx = { ...EMPTY_CTX('2026-11-01'), ...(base.ctx ?? {}) };
    const without = runDoc(d, base.values, [], ctx).result.tables?.map(t => t.title) ?? [];
    expect(without).not.toContain('D2 — the project’s is / is not');
    const withSpec = runDoc(d, base.values, [], { ...ctx, isIsNot: { name: 'Seals on lane 3', since: '2026-10-13', lines: [{ dim: 'where', is: 'Lane 3', isnot: 'Lanes 1, 2 and 4' }] } }).result.tables!;
    const t = withSpec.find(x => x.title === 'D2 — the project’s is / is not')!;
    expect(t.rows).toEqual([['Where', 'Lane 3', 'Lanes 1, 2 and 4']]);
    expect(t.note).toContain('Seals on lane 3');
    expect(t.note).toContain('13 Oct 2026');
  });
});

describe('the 8D report offers the 8D method’s own words', () => {
  it('what happened, the response, the root cause, how verified and the escape point', () => {
    const d = docByKey('eight-d')!;
    const boxes = d.sections.flatMap(s => s.items).filter(i => i.kind !== 'list' && i.kind !== 'photos') as { id: string; offer?: (x: ReturnType<typeof EMPTY_CTX>) => { value: string } | undefined }[];
    const ctx = { ...EMPTY_CTX('2026-11-01'), methodAnswers: { 'eight-d:symptom': 'a', 'eight-d:response': 'b', 'eight-d:why': 'c', 'eight-d:verified': 'd', 'eight-d:escape': 'e' } };
    expect(['symptom', 'response', 'rootCause', 'verifiedHow', 'escape'].map(id => boxes.find(b => b.id === id)?.offer?.(ctx)?.value)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});
