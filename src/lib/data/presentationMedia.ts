import { labelSaid, processSteps, type ChartSpec, type Series } from './outputs';

const mediaEscape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] as string);

/** Pictograms describe the named operation. Unknown operations get a neutral waypoint. */
const stations = [
  { words: /\b(fill\w*|dose\w*|pour\w*)\b/i, art: '<path d="M16 13h48L49 32v8H35v-8zM25 48l3 16h27l4-16"/><path d="M39 40v10m6-10v8" fill="none"/>' },
  { words: /\b(inspect\w*|check\w*|test\w*|scan\w*)\b/i, art: '<rect x="17" y="41" width="35" height="18" rx="3"/><circle cx="54" cy="26" r="14"/><path d="m64 36 12 12M48 26l4 4 8-9"/>' },
  { words: /\b(pack\w*|box\w*|carton\w*|seal\w*)\b/i, art: '<path d="m16 28 24-13 25 13v26L41 67 16 54zM16 28l25 14 24-14M41 42v25M28 21l25 14v9"/>' },
  { words: /\b(heat\w*|bake\w*|baking|oven\w*|cool\w*|drying)\b/i, art: '<rect x="14" y="22" width="54" height="39" rx="6"/><rect x="21" y="33" width="40" height="20" rx="3"/><path d="M25 27h5m6 0h3m9 21c-5-4 3-6-1-11m-11 11c-5-4 3-6-1-11"/>' },
  { words: /\b(ship\w*|deliver\w*|dispat\w*|transport\w*)\b/i, art: '<path d="M12 25h37v29H12zM49 33h13l9 12v9H49M53 37h7l5 8H53z"/><circle cx="25" cy="56" r="6"/><circle cx="60" cy="56" r="6"/>' },
  { words: /\b(buffer\w*|stor\w*|stock\w*|queue\w*|pallet\w*)\b/i, art: '<path d="M16 16v47m48-47v47M16 39h48M16 58h48"/><rect x="23" y="22" width="18" height="17" rx="2"/><rect x="34" y="43" width="21" height="15" rx="2"/>' },
  { words: /\b(feed\w*|load\w*|convey\w*|move\w*|receiv\w*|transfer\w*)\b/i, art: '<path d="m26 25 13-7 13 7v15l-13 7-13-7zM26 25l13 7 13-7m-13 7v14"/><rect x="10" y="47" width="61" height="12" rx="6"/><path d="M21 53h1m15 0h1m15 0h1"/>' },
];
export function stationSvg(label: string): string {
  // Prefer the action at the start of “receive cartons” to the object being handled.
  const matches = stations.map(station => ({ art: station.art, index: label.search(station.words) }))
    .filter(match => match.index >= 0).sort((a, b) => a.index - b.index);
  const art = matches[0]?.art ?? '<path d="m41 15 24 14v27L41 69 17 56V29zM17 29l24 14 24-14M41 43v26"/><circle cx="41" cy="29" r="4"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="84" height="80" viewBox="0 0 84 80" aria-hidden="true"><g fill="#e1f5f1" stroke="#175763" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round">${art}</g></svg>`;
}
export function processMedia(words: string): string {
  const steps = processSteps(words);
  const stations = steps.map((label, i) => `
    <li style="--step:${i}">
      <div class="lm-station">${stationSvg(label)}</div>
      <span class="lm-index" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
      <strong>${mediaEscape(label)}</strong>
    </li>`).join('');
  return `<div class="lm-process-player">
    <ol class="lm-process" aria-label="Process sequence">${stations}</ol>
    <label class="lm-play"><input type="checkbox" aria-label="Play process sequence">
      <span class="lm-start">▶ Play sequence</span><span class="lm-reset">↺ Reset sequence</span>
    </label>
  </div>`;
}

const exact = (n: number, unit: string) => mediaEscape(n.toLocaleString('en-GB', { maximumFractionDigits: 20 }) + (unit === '%' ? '%' : unit ? ' ' + unit : ''));

/** A slide leads with the calculated finding; the complete chart remains available beneath it. */
export function chartMedia(spec: ChartSpec, s: Series, source?: string): string | undefined {
  if (!s.finding) return;
  const points = s.values.flatMap((v, i) => v === null ? [] : [{ v, i }]);
  if (points.length < 2) return;
  const mark = s.mark;
  const selected = points.find(p => p.i === mark);
  const metrics = [0, ...points.map(p => p.v), ...(s.compare ?? []).filter((v): v is number => v !== null)];
  if (spec.target !== undefined) metrics.push(spec.target);
  const min = Math.min(...metrics), max = Math.max(...metrics);
  const pos = (v: number) => 100 * (v - min) / (max - min || 1);
  const zero = pos(0);
  let graphic: string;
  if (spec.type === 'line') {
    const x = (i: number) => 8 + 344 * i / (s.values.length - 1);
    const y = (v: number) => 96 - 0.86 * pos(v);
    let path = '';
    for (const { i, v } of points) path += `${i === 0 || s.values[i - 1] === null ? 'M' : 'L'}${x(i)},${y(v)} `;
    const endpoints = [points[0], points[points.length - 1]];
    graphic = `<div class="lm-trend"><svg aria-hidden="true" viewBox="0 0 360 108"><path d="M8 96H352M8 53H352M8 10H352" fill="none" stroke="#33535b" stroke-dasharray="2 5"/><path class="lm-trace" d="${path}" pathLength="1" fill="none" stroke="#7ce2d1" stroke-width="3"/>${points.map(p => `<circle cx="${x(p.i)}" cy="${y(p.v)}" r="${p.i === mark ? 4.5 : 2}" fill="${p.i === mark ? '#ffd38e' : '#7ce2d1'}"/>`).join('')}</svg><div class="lm-ends">${endpoints.map(p => `<div>${mediaEscape(labelSaid(s.labels[p.i]))}<b>${exact(p.v, s.unit)}</b></div>`).join('')}</div></div>`;
  } else {
    const ranked = [...points].sort((a,b) => Math.abs(b.v) - Math.abs(a.v));
    const shown = (selected ? [selected, ...ranked.filter(p => p.i !== selected.i)] : ranked).slice(0, 3);
    const bar = (v: number, compare = false) => `<span class="lm-track"><i class="${compare ? 'lm-compare' : 'lm-bar'}" style="left:${Math.min(zero, pos(v))}%;width:${Math.abs(pos(v) - zero)}%"></i><i class="lm-zero" style="left:${zero}%"></i>${spec.target === undefined ? '' : `<i class="lm-target" style="left:${pos(spec.target)}%"></i>`}</span>`;
    graphic = `<div class="lm-ranks">${shown.map(({i,v}, index) => {
      const other = s.compare?.[i];
      const comparison = s.compare ? `<small>${mediaEscape(spec.compareLabel || 'Comparison')} · ${other == null ? 'Not recorded' : exact(other, s.unit)}</small>${other == null ? '' : bar(other, true)}` : '';
      return `<div class="lm-rank" style="--step:${index}"><div><span>${mediaEscape(labelSaid(s.labels[i]))}</span><b>${exact(v, s.unit)}</b></div>${bar(v)}${comparison}</div>`;
    }).join('')}${spec.target === undefined ? '' : `<small class="lm-legend">${mediaEscape(spec.targetLabel || 'Target')} · ${exact(spec.target, s.unit)}</small>`}</div>`;
  }
  return `<div class="lm-scene"><div class="lm-copy"><p class="lm-context">${mediaEscape(spec.title)}</p><p class="lm-finding">${mediaEscape(s.finding)}</p>${source ? `<p class="lm-source">Source · ${mediaEscape(source)}</p>` : ''}</div>${graphic}</div>`;
}
