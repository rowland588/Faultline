import { describe, expect, it } from 'vitest';
import { checkSection, type ChartSpec, type Series } from '../outputs';
import { chartMedia, processMedia, stationSvg } from '../presentationMedia';

const spec: ChartSpec = { title: 'Output', resultId: 'r', type: 'line', measure: 0 };
const series: Series = { labels: ['A', 'B', 'C'], values: [2, null, -1], notes: [], unit: 'kg', total: 1, measure: 'Output', finding: 'Lower at C', mark: 0 };

describe('illustrated presentations', () => {
  it('plots separate trend segments across missing readings and labels the endpoints exactly', () => {
    const media = chartMedia(spec, series);
    expect(media).toMatch(/class="lm-trace" d="M[^"]+M[^"]+"/);
    expect(media).toContain('-1 kg');
    expect(chartMedia(spec, { ...series, values: [null, null, -1] })).toBeUndefined();
  });
  it('escapes source names and process wording and preserves repeated operations', () => {
    expect(chartMedia({ ...spec, title: '<img>' }, series)).toContain('&lt;img&gt;');
    const flow = processMedia('Receive cartons\nCheck <seal>\nReceive cartons');
    expect(flow.match(/<strong>Receive cartons<\/strong>/g)).toHaveLength(2);
    expect(flow).toContain('Check &lt;seal&gt;');
    expect(stationSvg('Dispatch cartons')).toBe(stationSvg('Ship orders'));
    expect(stationSvg('Receive cartons')).not.toBe(stationSvg('Pack cartons'));
  });
  it('rejects incomplete sequences and keeps unsupported numerical claims flagged', () => {
    const section = { id: 's', kind: 'process' as const, heading: 'Packing', text: 'Check cartons' };
    expect(checkSection(section, new Map(), new Map()).ok).toBe(false);
    const out = checkSection({ ...section, text: 'Check cartons\nStore for 480 minutes' }, new Map(), new Map());
    expect(out.ok && out.s.unbacked).toContain('480');
  });
});
