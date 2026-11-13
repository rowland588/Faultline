/* At the machine (tools/doc/floorSheet): a procedure as the sheet read where the work is done — the job, what to take care of, the
 * steps, one line at the foot. Nothing made up, nothing but the procedure. */
import { describe, expect, it } from 'vitest';
import type { ToolStudy } from '../../../lib/study';
import { floorSheet } from '../floorSheet';

const doc = (def: string, docValues: Record<string, unknown>, more: Record<string, unknown> = {}, signed?: { by: string; at: number }): ToolStudy =>
  ({ id: 's', tool: 'doc', name: 'A procedure', agreed: { doc: { def, ...(signed ? { signed } : {}) } }, facts: { docValues, ...more } } as unknown as ToolStudy);
const row = (c: object, i: number) => ({ id: `r${i}`, c: c as Record<string, string | number> });

describe('the sheet at the machine', () => {
  const sop = doc('sop', {
    title: 'Clearing a jam', where: 'Bagger, Line 2', owner: 'Sam Patel', version: 'v2', review: '2026-12-01',
    steps: [
      { do: 'Press STOP and open the front guard', care: 'safety', from: 'VFB-240 manual, p.6' },
      { do: 'Remove the jammed bag', how: 'Do not use steel tools on the jaws.', from: 'VFB-240 manual, p.6' },
      { do: '', how: 'a row with nothing to do is not a step' },
    ].map(row),
  }, {
    remarks: [{ id: 'a', at: 1, text: 'From VFB-240 manual, p.6: WARNING — Never reach into the jaw area with the guards open.' }, { id: 'b', at: 2, text: 'Sam to check the scraper is on the tool board.' }, { id: 'c', at: 3, text: 'CAUTION: old note', struck: true }],
    docPhotos: [{ id: 'p', field: 'stepPhotos', blobKey: 'k2', mime: 'image/jpeg', caption: '2 — scraper', at: 1 }, { id: 'q', field: 'stepPhotos', blobKey: 'k9', mime: 'image/jpeg', caption: 'no number', at: 1 }],
  });
  const m = floorSheet(sop);
  it('says the job, where, and that a draft is a draft', () => {
    expect(m).toMatchObject({ kind: 'Standard operating procedure', title: 'Clearing a jam', where: 'Bagger, Line 2', agreed: false });
    expect(m?.status).toMatch(/^Draft — not agreed yet/);
  });
  it('puts what to take care of first: the notes that are warnings, in their own words — not a struck one, not an ordinary note', () => {
    expect(m?.warnings).toEqual(['Never reach into the jaw area with the guards open.']);
  });
  it('the steps in order, each with its key point, its care and its own picture — a row with nothing to do is not a step', () => {
    expect(m?.steps).toEqual([
      { n: 1, do: 'Press STOP and open the front guard', points: [], why: [], care: 'Safety', from: '' },
      { n: 2, do: 'Remove the jammed bag', points: ['Do not use steel tools on the jaws.'], why: [], care: '', from: '', photoKey: 'k2' },
    ]);
  });
  it('where every step is from one page it is said once, at the foot — and the foot holds only what the document holds', () => {
    expect(m?.source).toBe('Steps from VFB-240 manual, page 6.');
    expect(m?.foot).toBe('Kept by Sam Patel  ·  Version v2  ·  Read again by 1 Dec 2026');
  });
  it('steps from different pages each say theirs', () => {
    const two = floorSheet(doc('sop', { title: 'T', steps: [{ do: 'A', from: 'Manual, p.6' }, { do: 'B', from: 'Manual, p.7' }].map(row) }));
    expect(two?.steps.map(x => x.from)).toEqual(['Manual, p.6', 'Manual, p.7']);
    expect(two?.source).toBe('Steps from Manual, pages 6, 7.');
    expect(two?.foot).toBe('');
  });
  it('agreed says by whom and when', () => {
    const a = floorSheet(doc('sop', { title: 'T', steps: [{ do: 'A' }].map(row) }, {}, { by: 'Jo Reid', at: Date.UTC(2026, 10, 13, 12) }));
    expect(a).toMatchObject({ agreed: true, status: 'Agreed by Jo Reid on 13 Nov 2026', source: '' });
  });
  it('a work instruction: the step, its key points and the reason for each', () => {
    const w = floorSheet(doc('job-instruction', { title: 'Splice the film', instructor: 'Ana', steps: [{ step: 'Cut the leading edge square', keys: 'Cut on the guide line; hands clear of the clamp', reasons: 'A slanted edge catches; a crush injury', safety: 'yes' }].map(row) }));
    expect(w).toMatchObject({ kind: 'Work instruction', foot: 'Taught by Ana' });
    expect(w?.steps[0]).toEqual({ n: 1, do: 'Cut the leading edge square', points: ['Cut on the guide line', 'hands clear of the clamp'], why: ['A slanted edge catches', 'a crush injury'], care: 'Safety', from: '' });
  });
  it('is only for a procedure and a work instruction', () => { expect(floorSheet(doc('charter', {}))).toBeUndefined(); });
});
