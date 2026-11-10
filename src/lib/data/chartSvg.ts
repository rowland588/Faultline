/* A CHART DRAWN FROM A RESULT (docs/CONVERSATIONAL-DATA.md) — the one drawing of a conversation's chart, the same SVG on the screen, in
 * the download, on the report's paper and on a slide: columns, bars, a line, a pie or a Pareto (columns largest first with the
 * cumulative share), a second series beside the first to compare, a target line. A value not recorded is drawn as a gap and labelled
 * "not recorded" — never as a zero-height column. Colours are the house's own (lib/reportKit), each series named in a key, never
 * carried by colour alone. Pure. */
import type { ChartSpec, Series } from './outputs';
import { ACTUAL, BRAND, INK, INK2, LINE, MUTED, TARGET } from '../reportKit';

const W = 720, H = 400;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (v: number) => (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-GB') : String(Math.round(v * 10) / 10));
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const PALETTE = [BRAND, '#0e7490', '#7c3aed', '#b45309', '#15803d', '#be185d', '#475569', '#0369a1'];

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

export function chartSvg(spec: ChartSpec, s: Series, o: { compareLabel?: string; mainLabel?: string } = {}): string {
  const title = esc(cut(spec.title, 80));
  const head = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Inter, Arial, sans-serif" role="img" aria-label="${title}"><rect width="${W}" height="${H}" fill="#ffffff"/><text x="20" y="28" font-size="16" font-weight="700" fill="${INK}">${title}</text>`;
  const unit = s.unit ? ` (${esc(s.unit)})` : '';
  const sub = `<text x="20" y="48" font-size="11.5" fill="${MUTED}">${esc(cut(`${spec.yLabel ?? s.measure}${unit}`, 100))}</text>`;
  if (spec.type === 'pie') return head + sub + pie(s) + '</svg>';
  const horizontal = spec.type === 'bar';
  const L = horizontal ? 170 : 64, R = spec.type === 'pareto' ? 56 : 24, T = 66, B = horizontal ? 40 : 86;
  const pw = W - L - R, ph = H - T - B;
  const vals = [...s.values, ...(s.compare ?? []), ...(spec.target !== undefined && !spec.percent ? [spec.target] : spec.target !== undefined ? [spec.target] : [])].filter((v): v is number => v !== null);
  const max = niceMax(Math.max(0, ...vals));
  const min = Math.min(0, ...vals);
  const span = max - min || 1;
  const n = s.labels.length;
  let out = head + sub;
  const keyItems: [string, string, boolean][] = [[o.mainLabel ?? 'This result', spec.type === 'line' ? ACTUAL : BRAND, false]];
  if (s.compare) keyItems.push([o.compareLabel ?? 'Compared with', MUTED, false]);
  /* the scale */
  for (let k = 0; k <= 4; k++) {
    const v = min + (span * k) / 4;
    if (horizontal) { const x = L + (pw * k) / 4; out += `<line x1="${x}" y1="${T}" x2="${x}" y2="${T + ph}" stroke="${LINE}"/><text x="${x}" y="${T + ph + 16}" font-size="10.5" fill="${MUTED}" text-anchor="middle">${fmt(v)}</text>`; }
    else { const y = T + ph - (ph * k) / 4; out += `<line x1="${L}" y1="${y}" x2="${L + pw}" y2="${y}" stroke="${LINE}"/><text x="${L - 6}" y="${y + 4}" font-size="10.5" fill="${MUTED}" text-anchor="end">${fmt(v)}</text>`; }
  }
  const pos = (v: number) => (horizontal ? L + ((v - min) / span) * pw : T + ph - ((v - min) / span) * ph);
  const zero = pos(0);
  const slot = (horizontal ? ph : pw) / Math.max(1, n);
  const two = !!s.compare;
  const bw = Math.min(56, slot * (two ? 0.38 : 0.62));
  if (spec.type === 'line') {
    const pts = (vs: (number | null)[], colour: string, dash = '') => {
      let d = '', pen = false;
      vs.forEach((v, i) => { const x = L + slot * (i + 0.5); if (v === null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${x},${pos(v)} `; pen = true; });
      return `<path d="${d}" fill="none" stroke="${colour}" stroke-width="2.4"${dash ? ` stroke-dasharray="${dash}"` : ''}/>` + vs.map((v, i) => (v === null ? '' : `<circle cx="${L + slot * (i + 0.5)}" cy="${pos(v)}" r="3.4" fill="${colour}"/>`)).join('');
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
        return horizontal
          ? `<rect x="${Math.min(zero, p)}" y="${at}" width="${Math.abs(p - zero)}" height="${bw}" fill="${colour}" rx="2"/><text x="${Math.max(zero, p) + 5}" y="${at + bw / 2 + 4}" font-size="10.5" fill="${INK2}">${label}</text>`
          : `<rect x="${at}" y="${Math.min(zero, p)}" width="${bw}" height="${Math.abs(p - zero)}" fill="${colour}" rx="2"/><text x="${at + bw / 2}" y="${Math.min(zero, p) - 5}" font-size="10.5" fill="${INK2}" text-anchor="middle">${label}</text>`;
      };
      out += draw(v, c0, spec.type === 'pareto' && i === 0 ? INK : BRAND);
      if (two) out += draw(s.compare?.[i] ?? null, c0 + bw + 4, MUTED);
    });
  }
  /* the category labels */
  s.labels.forEach((lab, i) => {
    const c = (horizontal ? T : L) + slot * (i + 0.5);
    out += horizontal
      ? `<text x="${L - 8}" y="${c + 4}" font-size="11" fill="${INK2}" text-anchor="end">${esc(cut(lab, 24))}</text>`
      : `<text x="${c}" y="${T + ph + 16}" font-size="11" fill="${INK2}" text-anchor="${n > 6 ? 'end' : 'middle'}"${n > 6 ? ` transform="rotate(-35 ${c} ${T + ph + 16})"` : ''}>${esc(cut(lab, n > 6 ? 18 : 22))}</text>`;
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
  let kx = 20;
  for (const [word, colour, dashed] of keyItems) {
    out += dashed ? `<line x1="${kx}" y1="${H - 14}" x2="${kx + 16}" y2="${H - 14}" stroke="${colour}" stroke-width="2.4" stroke-dasharray="5 3"/>` : `<rect x="${kx}" y="${H - 20}" width="14" height="12" rx="2" fill="${colour}"/>`;
    out += `<text x="${kx + 20}" y="${H - 10}" font-size="11" fill="${INK2}">${esc(cut(word, 40))}</text>`;
    kx += 32 + Math.min(40, word.length) * 6.2;
  }
  if (spec.xLabel) out += `<text x="${W - 20}" y="${H - 10}" font-size="11" fill="${MUTED}" text-anchor="end">${esc(cut(spec.xLabel, 40))}</text>`;
  return out + '</svg>';
}

function pie(s: Series): string {
  const cx = 230, cy = 225, r = 140;
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
      ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${PALETTE[i % PALETTE.length]}"/>`
      : `<path d="M${cx},${cy} L${p(a0)} A${r},${r} 0 ${large} 1 ${p(a1)} Z" fill="${PALETTE[i % PALETTE.length]}" stroke="#ffffff" stroke-width="1.5"/>`;
    a0 = a1;
  });
  s.labels.forEach((lab, i) => {
    const y = 90 + i * 22;
    if (y > H - 20) return;
    const v = s.values[i];
    const share = v !== null && v > 0 ? `${Math.round((v / tot) * 1000) / 10}%` : v === null ? 'not recorded' : '0';
    out += `<rect x="410" y="${y - 11}" width="14" height="14" rx="2" fill="${PALETTE[i % PALETTE.length]}"/><text x="430" y="${y}" font-size="11.5" fill="${INK2}">${esc(cut(lab, 26))} — ${v === null ? 'not recorded' : `${fmt(v)}${s.unit && s.unit !== '%' ? ` ${esc(s.unit)}` : s.unit === '%' ? '%' : ''}`} (${share})</text>`;
  });
  return out;
}

/** The SVG made a PNG, for a slide, a paper or a download — drawn at twice its size so it prints sharp. Browser only. */
export async function svgToPng(svg: string, scale = 2): Promise<{ dataUrl: string; blob: Blob }> {
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    await new Promise<void>((ok, bad) => { img.onload = () => ok(); img.onerror = () => bad(new Error('The chart could not be drawn as a picture.')); img.src = url; });
    const c = document.createElement('canvas');
    c.width = W * scale; c.height = H * scale;
    const g = c.getContext('2d');
    if (!g) throw new Error('This browser cannot draw the chart as a picture.');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);
    const dataUrl = c.toDataURL('image/png');
    const blob = await new Promise<Blob>((ok, bad) => c.toBlob(b => (b ? ok(b) : bad(new Error('The chart could not be saved.'))), 'image/png'));
    return { dataUrl, blob };
  } finally { URL.revokeObjectURL(url); }
}

export const CHART_SIZE = { w: W, h: H };
