/* A problem with five pictures prints all five (Rowland, 4 November: "I have about 5 pictures ... all 5 shown on the report card"):
 * the close-up is photo 1 on the card, the other four on the page after it, two across and numbered, marks listed beneath. */
import { describe, expect, it } from 'vitest';
import { jsPDF } from 'jspdf';
import { drawSnagCards, type SnagCardData, type SnagCardPhoto } from '../snagCardPdf';

/* a 2×1 white JPEG */
const JPG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
const ph = (marks?: string[]): SnagCardPhoto => ({ dataUrl: JPG, w: 1400, h: 1000, ...(marks ? { marks } : {}) });
const card = (more: SnagCardPhoto[]): SnagCardData => ({ problem: 'Film tears at the wrapper', status: 'open', statusLabel: 'Open', owner: 'Sam', assetName: 'Wrapper', where: 'Line 2A', raised: '4 Nov 2026', ageDays: 2, priority: 'high', detail: ph(['Torn edge']), ...(more.length ? { more } : {}) });
const pages = (s: SnagCardData): { n: number; text: string } => {
  const d = new jsPDF({ unit: 'pt', format: 'a4' });
  drawSnagCards(d, { workspace: 'Line 2A', now: Date.parse('2026-11-04'), snags: [s] });
  return { n: d.getNumberOfPages(), text: (d.output('datauristring') as string).length ? '' : '' };
};

describe('a problem card with many pictures', () => {
  it('one picture (or none beyond the close-up) is still one page', () => {
    expect(pages(card([])).n).toBe(1);
  });
  it('five pictures: the card and one page more holding the other four, numbered 2 to 5 of 5', () => {
    const d = new jsPDF({ unit: 'pt', format: 'a4' });
    const texts: string[] = [];
    const orig = d.text.bind(d) as (...a: unknown[]) => jsPDF;
    (d as unknown as { text: (...a: unknown[]) => jsPDF }).text = (...a: unknown[]) => { texts.push(String(a[0])); return orig(...a); };
    drawSnagCards(d, { workspace: 'Line 2A', now: Date.parse('2026-11-04'), snags: [card([ph(), ph(['A mark']), ph(), ph()])] });
    expect(d.getNumberOfPages()).toBe(2);
    const all = texts.join(' | ');
    for (const k of [2, 3, 4, 5]) expect(all).toContain(`PHOTO ${k} OF 5`);
    expect(all).not.toContain('PHOTO 1 OF 5');
    expect(all).toContain('Close-up  ·  photo 1 of 5');
    expect(all).toContain('A mark');
  });
  it('a dozen pictures run on to a third page and none is dropped', () => {
    const d = new jsPDF({ unit: 'pt', format: 'a4' });
    const texts: string[] = [];
    const orig = d.text.bind(d) as (...a: unknown[]) => jsPDF;
    (d as unknown as { text: (...a: unknown[]) => jsPDF }).text = (...a: unknown[]) => { texts.push(String(a[0])); return orig(...a); };
    drawSnagCards(d, { workspace: 'Line 2A', now: Date.parse('2026-11-04'), snags: [card(Array.from({ length: 11 }, () => ph()))] });
    expect(d.getNumberOfPages()).toBeGreaterThanOrEqual(3);
    for (let k = 2; k <= 12; k++) expect(texts.join('|')).toContain(`PHOTO ${k} OF 12`);
  });
});
