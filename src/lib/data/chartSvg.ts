/* A CHART DRAWN FROM A RESULT (docs/CONVERSATIONAL-DATA.md) — the one drawing of a conversation's chart, the same SVG on the screen, in
 * the download, on the report's paper and on a slide: columns, bars, a line, a pie or a Pareto (columns largest first with the
 * cumulative share), a second series beside the first to compare, a target line. A value not recorded is drawn as a gap and labelled
 * "not recorded" — never as a zero-height column. Colours are the house's own (lib/reportKit), each series named in a key, never
 * carried by colour alone. Pure. */
import { labelSaid, type ChartSpec, type Series } from './outputs';
import { ACTUAL, BRAND, INK, INK2, LINE, MUTED, TARGET } from '../reportKit';

const W = 720, H = 400;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (v: number) => (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-GB') : String(Math.round(v * 10) / 10)).replace(/^-/, '−');
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const wrap = (value: string, size: number): string[] => {
  const words = value.trim().split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (line && `${line} ${word}`.length > size) { lines.push(line); line = ''; }
    if (word.length > size) {
      if (line) { lines.push(line); line = ''; }
      for (let i = 0; i < word.length; i += size) lines.push(word.slice(i, i + size));
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
};
const textLines = (lines: string[], x: number, y: number, step: number, attrs: string) =>
  `<text x="${x}" y="${y}" ${attrs}>${lines.length === 1 ? esc(lines[0]) : lines.map((line, i) => `<tspan x="${x}"${i ? ` dy="${step}"` : ''}>${esc(line)}</tspan>`).join('')}</text>`;
/* the morning's colours, each dark enough to read on white: blue, the sea, the horizon's ember, amber, leaf, coral, slate, sky */
const PALETTE = [BRAND, '#0e7490', '#c2410c', '#b45309', '#15803d', '#be185d', '#475569', '#0369a1'];

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

export function chartSvg(spec: ChartSpec, s: Series, o: { compareLabel?: string; mainLabel?: string; animated?: boolean; focusIndex?: number } = {}): string {
  const n = s.labels.length;
  const horizontal = spec.type === 'bar';
  const titleLines = wrap(spec.title, 78);
  const findingLines = s.finding ? wrap(s.finding, 104) : [];
  const measureLines = wrap(`${spec.yLabel ?? s.measure}${s.unit ? ` (${s.unit})` : ''}`, 105);
  const headBottom = 28 + (titleLines.length - 1) * 20;
  const measureY = headBottom + 20;
  const findingY = measureY + measureLines.length * 17 + 5;
  const T = findingY + findingLines.length * 18 + 18;
  const keyCount = 1 + (s.compare ? 1 : 0) + (spec.target !== undefined ? 1 : 0) + (spec.type === 'pareto' ? 1 : 0);
  const B = (horizontal ? 32 : 95) + keyCount * 20 + (spec.xLabel ? 18 : 0);
  const W = spec.type === 'pie' ? 720 : Math.max(720, horizontal ? 820 : Math.min(2600, 125 + n * 88));
  const H = spec.type === 'pie' ? Math.max(420, T + 310, T + n * 25 + 30) : Math.max(400, T + B + (horizontal ? n * 40 : 220));
  const title = esc(spec.title);
  const animation = o.animated ? `<style>@media (prefers-reduced-motion: no-preference) { .chart-bar { animation: chart-grow-y .85s cubic-bezier(.22,1,.36,1) both; transform-box: fill-box; transform-origin: center bottom; } .chart-bar.neg-v { transform-origin: center top; } .chart-bar.horizontal, .chart-bar.neg-h { animation-name: chart-grow-x; transform-origin: left center; } .chart-bar.neg-h { transform-origin: right center; } .chart-line { animation: chart-appear .9s ease-out both; } @keyframes chart-grow-y { from { opacity: .15; transform: scaleY(0); } to { opacity: 1; transform: scaleY(1); } } @keyframes chart-grow-x { from { opacity: .15; transform: scaleX(0); } to { opacity: 1; transform: scaleX(1); } } @keyframes chart-appear { from { opacity: 0; } to { opacity: 1; } } }</style>` : '';
  const head = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Inter, Arial, sans-serif" role="img" aria-label="${title}"><rect width="${W}" height="${H}" fill="#ffffff"/>${animation}${textLines(titleLines, 20, 28, 20, `font-size="16" font-weight="700" fill="${INK}"`)}`;
  /* what it shows, worked by code (lib/data/outputs findingOf), under the title — the chart says its own finding */
  const sub = textLines(measureLines, 20, measureY, 17, `font-size="11.5" fill="${MUTED}"`) + (findingLines.length ? textLines(findingLines, 20, findingY, 18, `font-size="12.5" font-weight="600" fill="${INK2}" data-finding="1"`) : '');
  if (spec.type === 'pie') return head + sub + pie(s, T, o.focusIndex) + '</svg>';
  const L = horizontal ? Math.min(300, Math.max(170, Math.max(0, ...s.labels.map(l => l.length)) * 6.4 + 18)) : 64;
  const R = spec.type === 'pareto' ? 72 : horizontal ? 86 : 30;
  const pw = W - L - R, ph = H - T - B;
  const vals = [...s.values, ...(s.compare ?? []), ...(spec.target !== undefined && !spec.percent ? [spec.target] : spec.target !== undefined ? [spec.target] : [])].filter((v): v is number => v !== null);
  /* BELOW ZERO (13 November): a scale of round steps that always holds zero, so a loss is read against a line that says 0 — never
     ticks at the raw lowest value. Above zero only, the scale is as it always was. */
  const rawMin = Math.min(0, ...vals), rawMax = Math.max(0, ...vals);
  const below = rawMin < 0;
  const step = below ? niceMax((rawMax - rawMin) / 4) : 0;
  const max = below ? Math.ceil(rawMax / step) * step : niceMax(rawMax);
  const min = below ? Math.floor(rawMin / step) * step : 0;
  const span = max - min || 1;
  const ticks = below ? Math.round(span / step) : 4;
  let out = head + sub;
  const keyItems: [string, string, boolean][] = [[o.mainLabel ?? 'This result', spec.type === 'line' ? ACTUAL : BRAND, false]];
  if (s.compare) keyItems.push([o.compareLabel ?? 'Compared with', MUTED, false]);
  /* the scale */
  for (let k = 0; k <= ticks; k++) {
    const v = min + (span * k) / ticks;
    if (horizontal) { const x = L + (pw * k) / ticks; out += `<line x1="${x}" y1="${T}" x2="${x}" y2="${T + ph}" stroke="${LINE}"/><text x="${x}" y="${T + ph + 16}" font-size="10.5" fill="${MUTED}" text-anchor="middle">${fmt(v)}</text>`; }
    else { const y = T + ph - (ph * k) / ticks; out += `<line x1="${L}" y1="${y}" x2="${L + pw}" y2="${y}" stroke="${LINE}"/><text x="${L - 6}" y="${y + 4}" font-size="10.5" fill="${MUTED}" text-anchor="end">${fmt(v)}</text>`; }
  }
  const pos = (v: number) => (horizontal ? L + ((v - min) / span) * pw : T + ph - ((v - min) / span) * ph);
  const zero = pos(0);
  if (below) out += horizontal ? `<line x1="${zero}" y1="${T}" x2="${zero}" y2="${T + ph}" stroke="${INK2}" stroke-width="1.2"/>` : `<line x1="${L}" y1="${zero}" x2="${L + pw}" y2="${zero}" stroke="${INK2}" stroke-width="1.2"/>`;
  const slot = (horizontal ? ph : pw) / Math.max(1, n);
  const two = !!s.compare;
  const bw = Math.min(56, slot * (two ? 0.38 : 0.62));
  if (spec.type === 'line') {
    const pts = (vs: (number | null)[], colour: string, dash = '') => {
      let d = '', pen = false;
      vs.forEach((v, i) => { const x = L + slot * (i + 0.5); if (v === null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${x},${pos(v)} `; pen = true; });
      return `<path class="chart-line" d="${d}" fill="none" stroke="${colour}" stroke-width="2.4"${dash ? ` stroke-dasharray="${dash}"` : ''}/>` + vs.map((v, i) => (v === null ? '' : `<circle data-chart-point="${i}" cx="${L + slot * (i + 0.5)}" cy="${pos(v)}" r="${o.focusIndex === i ? 7 : 3.4}" fill="${colour}"${o.focusIndex === i ? ` stroke="${INK}" stroke-width="2"` : ''}/>`)).join('');
    };
    out += pts(s.values, ACTUAL);
    if (s.compare) out += pts(s.compare, MUTED, '5 4');
  } else {
    s.values.forEach((v, i) => {
      const c0 = (horizontal ? T : L) + slot * i + (slot - (two ? bw * 2 + 4 : bw)) / 2;
      const draw = (val: number | null, at: number, colour: string) => {
        if (val === null) return horizontal
          ? `<text x="${L + 4}" y="${at + bw / 2 + 4}" font-size="10" fill="${MUTED}" font-style="italic">not recorded</text>`
          : `<text x="${at + bw / 2}" y="${zero - 6}" font-size="9.5" fill="${MUTED}" font-style="italic" text-anchor="middle">n/r</text>`;
        const p = pos(val);
        const label = `${fmt(val)}${s.unit === '%' ? '%' : ''}`;
        /* a bar below zero is labelled at ITS end — inside it when it is long enough to hold the figure, else just beyond — never past
           the zero line at the plot's edge, where it was cut off */
        const len = Math.abs(p - zero), inside = val < 0 && len > label.length * 6.4 + 14;
        const hx = val >= 0 ? Math.max(zero, p) + 5 : inside ? p + 6 : p - 5;
        return horizontal
          ? `<rect data-chart-point="${i}" class="chart-bar ${val < 0 ? 'neg-h' : 'horizontal'}" x="${Math.min(zero, p)}" y="${at}" width="${len}" height="${bw}" fill="${colour}" rx="2"${o.focusIndex === i ? ` stroke="${INK}" stroke-width="3"` : ''}/><text x="${hx}" y="${at + bw / 2 + 4}" font-size="10.5" fill="${inside ? '#ffffff' : INK2}"${val < 0 && !inside ? ' text-anchor="end"' : ''}>${label}</text>`
          : `<rect data-chart-point="${i}" class="chart-bar${val < 0 ? ' neg-v' : ''}" x="${at}" y="${Math.min(zero, p)}" width="${bw}" height="${len}" fill="${colour}" rx="2"${o.focusIndex === i ? ` stroke="${INK}" stroke-width="3"` : ''}/><text x="${at + bw / 2}" y="${val < 0 ? Math.max(zero, p) + 13 : Math.min(zero, p) - 5}" font-size="10.5" fill="${INK2}" text-anchor="middle">${label}</text>`;
      };
      /* the value the finding is about, marked in the house's ink — the rest in the press colour */
      out += draw(v, c0, (spec.type === 'pareto' && i === 0) || (!two && s.mark === i) ? INK : BRAND);
      if (two) out += draw(s.compare?.[i] ?? null, c0 + bw + 4, MUTED);
    });
  }
  /* the category labels */
  s.labels.forEach((raw, i) => {
    const lab = labelSaid(raw);
    const c = (horizontal ? T : L) + slot * (i + 0.5);
    out += horizontal
      ? `<text x="${L - 8}" y="${c + 4}" font-size="11" fill="${INK2}" text-anchor="end">${esc(cut(lab, 42))}</text>`
      : `<text x="${c}" y="${T + ph + 16}" font-size="11" fill="${INK2}" text-anchor="${n > 6 ? 'end' : 'middle'}"${n > 6 ? ` transform="rotate(-35 ${c} ${T + ph + 16})"` : ''}>${esc(cut(lab, n > 6 ? 34 : 38))}</text>`;
  });
  /* the Pareto's cumulative share, on its own scale at the right */
  if (spec.type === 'pareto') {
    const tot = s.values.reduce<number>((a, v) => a + (v ?? 0), 0);
    if (tot > 0) {
      let run = 0, d = '';
      s.values.forEach((v, i) => { run += v ?? 0; const x = L + slot * (i + 0.5), y = T + ph - (run / tot) * ph; d += `${i ? 'L' : 'M'}${x},${y} `; });
      out += `<path d="${d}" fill="none" stroke="${TARGET}" stroke-width="2"/>`;
      for (let k = 0; k <= 4; k++) out += `<text x="${L + pw + 6}" y="${T + ph - (ph * k) / 4 + 4}" font-size="10.5" fill="${TARGET}">${k * 25}%</text>`;
      keyItems.push(['Cumulative share', TARGET, true]);
    }
  }
  if (spec.target !== undefined) {
    const p = pos(spec.target);
    out += horizontal
      ? `<line x1="${p}" y1="${T}" x2="${p}" y2="${T + ph}" stroke="${TARGET}" stroke-width="2" stroke-dasharray="6 4"/>`
      : `<line x1="${L}" y1="${p}" x2="${L + pw}" y2="${p}" stroke="${TARGET}" stroke-width="2" stroke-dasharray="6 4"/>`;
    keyItems.push([`${spec.targetLabel ?? 'Target'} ${fmt(spec.target)}${s.unit === '%' ? '%' : ''}`, TARGET, true]);
  }
  /* the key — every series in words */
  for (const [i, [word, colour, dashed]] of keyItems.entries()) {
    const ky = H - (keyCount - i) * 19 - (spec.xLabel ? 18 : 0);
    out += dashed ? `<line x1="20" y1="${ky}" x2="36" y2="${ky}" stroke="${colour}" stroke-width="2.4" stroke-dasharray="5 3"/>` : `<rect x="20" y="${ky - 6}" width="14" height="12" rx="2" fill="${colour}"/>`;
    out += `<text x="40" y="${ky + 4}" font-size="11" fill="${INK2}">${esc(word)}</text>`;
  }
  if (spec.xLabel) out += `<text x="20" y="${H - 12}" font-size="11" fill="${MUTED}">${esc(spec.xLabel)}</text>`;
  return out + '</svg>';
}

function pie(s: Series, top: number, focusIndex?: number): string {
  const cx = 230, cy = Math.max(240, top + 155), r = 130;
  const vals = s.values.map(v => (v !== null && v > 0 ? v : 0));
  const tot = vals.reduce((a, v) => a + v, 0);
  if (!tot) return `<text x="20" y="90" font-size="13" fill="${MUTED}">Nothing above zero to draw.</text>`;
  let a0 = -Math.PI / 2, out = '';
  vals.forEach((v, i) => {
    if (!v) return;
    const a1 = a0 + (v / tot) * Math.PI * 2;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p = (a: number) => `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    out += vals.filter(Boolean).length === 1
      ? `<circle data-chart-point="${i}" cx="${cx}" cy="${cy}" r="${r}" fill="${PALETTE[i % PALETTE.length]}"${focusIndex === i ? ` stroke="${INK}" stroke-width="4"` : ''}/>`
      : `<path data-chart-point="${i}" class="chart-line" d="M${cx},${cy} L${p(a0)} A${r},${r} 0 ${large} 1 ${p(a1)} Z" fill="${PALETTE[i % PALETTE.length]}" stroke="${focusIndex === i ? INK : '#ffffff'}" stroke-width="${focusIndex === i ? 4 : 1.5}"/>`;
    a0 = a1;
  });
  s.labels.forEach((lab, i) => {
    const y = Math.max(90, top) + i * 25;
    const v = s.values[i];
    const share = v !== null && v > 0 ? `${Math.round((v / tot) * 1000) / 10}%` : v === null ? 'not recorded' : '0';
    out += `<rect x="410" y="${y - 11}" width="14" height="14" rx="2" fill="${PALETTE[i % PALETTE.length]}"/><text x="430" y="${y}" font-size="11.5" fill="${INK2}">${esc(cut(lab, 28))} — ${v === null ? 'not recorded' : `${fmt(v)}${s.unit && s.unit !== '%' ? ` ${esc(s.unit)}` : s.unit === '%' ? '%' : ''}`} (${share})</text>`;
  });
  return out;
}

/** The SVG made a PNG, for a slide, a paper or a download — drawn at twice its size so it prints sharp. Browser only. */
export async function svgToPng(svg: string, scale = 2): Promise<{ dataUrl: string; blob: Blob; width: number; height: number }> {
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    await new Promise<void>((ok, bad) => { img.onload = () => ok(); img.onerror = () => bad(new Error('The chart could not be drawn as a picture.')); img.src = url; });
    const c = document.createElement('canvas');
    const dims = /viewBox="0 0 (\d+) (\d+)"/.exec(svg);
    const width = dims ? Number(dims[1]) : W;
    const height = dims ? Number(dims[2]) : H;
    c.width = width * scale;
    c.height = height * scale;
    const g = c.getContext('2d');
    if (!g) throw new Error('This browser cannot draw the chart as a picture.');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);
    const dataUrl = c.toDataURL('image/png');
    const blob = await new Promise<Blob>((ok, bad) => c.toBlob(b => (b ? ok(b) : bad(new Error('The chart could not be saved.'))), 'image/png'));
    return { dataUrl, blob, width, height };
  } finally { URL.revokeObjectURL(url); }
}

export const CHART_SIZE = { w: W, h: H };
