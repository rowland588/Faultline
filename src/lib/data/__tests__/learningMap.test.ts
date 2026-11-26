import { describe, expect, it } from 'vitest';
import { fiveSMap, learningMapSvg, lessonReading, mapFromTable, mapViewSize } from '../learningMap';
import { libraryDocument, writingRequest } from '../../../colleague/knowledgeDocuments';
import { reportHtml } from '../reportHtml';
import type { ConvReport } from '../outputs';

describe('learning maps', () => {
  it('draws the same 5S branches in a landscape slide layout', () => {
    const portrait = learningMapSvg(fiveSMap);
    const landscape = learningMapSvg(fiveSMap, 'landscape');
    const p = mapViewSize(portrait), l = mapViewSize(landscape);
    expect(p && p.width / p.height).toBeLessThan(1.6);
    expect(l && l.width / l.height).toBeGreaterThan(2);
    expect(l?.width).toBe(1280);
    for (const phrase of ['People search for the right item', 'Sort, then put it at point of use', 'Clean to inspect', 'Did the original loss fall', 'Agree the standard']) {
      expect(portrait).toContain(phrase);
      expect(landscape).toContain(phrase);
    }
  });

  it('builds an authored two-row table into the same two routes', () => {
    const map = mapFromTable('Which label needs attention?', {
      headings: ['Observation', 'Change to try', 'Check'],
      rows: [['Code differs', 'Hold for quality', 'Verify against the master'], ['Artwork unclear', 'Obtain the approved copy', 'Confirm the revision']],
    });
    expect(map?.routes[1].change).toBe('Obtain the approved copy');
    const landscape = learningMapSvg(map!, 'landscape');
    expect(landscape).toContain('Obtain the approved copy');
    expect(mapViewSize(landscape)!.width / mapViewSize(landscape)!.height).toBeGreaterThan(2);
  });
});

describe('5S training HTML', () => {
  it('opens with the purpose, the branching map and expandable lessons, not stock pictures or a Text label', async () => {
    const request = writingRequest('Build a 5S training guide');
    const draft = request && libraryDocument(request);
    expect(draft?.title).toBe('5S training guide');
    expect(draft!.sections).toHaveLength(9);
    const report: ConvReport = {
      id: 'G1', title: draft!.title, form: 'report', purpose: 'training', at: 1, updated: 1, version: 1,
      sections: draft!.sections.map((s, i) => ({ id: 'S' + i, kind: s.kind ?? 'text', heading: s.heading, text: s.text })),
    };
    const html = await reportHtml({ report, results: new Map(), charts: new Map(), printed: '26 November 2026' }).text();
    expect(html).toContain('data-guide-figure="learning-map"');
    expect(html).toContain('Did the original loss fall');
    expect(html).toContain('Lesson · 1 / 8');
    expect(html).not.toContain('Text · 1 / 8');
    expect(html).toContain('Detail and examples');
    expect(html).not.toContain('data-guide-figure="bench"');
    expect(html).not.toContain('data-guide-figure="inspection"');
    const opening = lessonReading(report, report.sections[0]);
    expect(opening?.lead).toMatch(/organising the workplace/);
    expect(opening?.detail).toMatch(/By the end of this session/);
    const workshop = draft!.sections.find(s => s.heading.startsWith('Workshop'));
    const reading = draft!.sections.find(s => s.heading === 'Further reading');
    expect(workshop?.text).not.toMatch(/Hirano|Osada|Further reading/);
    expect(reading?.text).toMatch(/Hiroyuki Hirano/);
    expect(reading?.text).toMatch(/Takashi Osada/);
    expect(html).toContain('Reading · 1 / 1');
    expect(html).toMatch(/<h2>Further reading<\/h2>/);
    const workshopHtml = html.match(/id="s8"[\s\S]*?(?=<section |$)/)?.[0] ?? '';
    const readingHtml = html.match(/id="s9"[\s\S]*?(?=<section |$)/)?.[0] ?? '';
    expect(workshopHtml).toMatch(/Workshop/);
    expect(workshopHtml).not.toMatch(/Hirano|Osada/);
    expect(readingHtml).toMatch(/Hiroyuki Hirano/);
    expect(readingHtml).toMatch(/Takashi Osada/);
  });
});
