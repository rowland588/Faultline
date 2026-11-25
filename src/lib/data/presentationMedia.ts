import { labelSaid, processSteps, type ChartSpec, type DataResult, type Series } from './outputs';

const mediaEscape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] as string);

/** Illustrative operation symbols, selected by the earliest matching action in the supplied label. */
const carton = `<path d="m0 9 17-9 18 9-17 10z" fill="#ffe6b9"/><path d="m0 9 18 10v21L0 29z" fill="#ddac76"/><path d="m18 19 17-10v21L18 40z" fill="#bf885c"/><path d="m8 5 18 10v7l-5 3v-7L4 8" fill="#fff4d9" stroke-width="1"/>`;
const belt = `<path d="M20 63 90 45l15 8-70 19z" fill="#9ecac8"/><path d="m35 72 70-19v8L35 81z" fill="#4b8f94"/><path d="m20 63 15 9v9l-15-9z" fill="#c8e2da"/><path d="m34 81 1 6m53-21v7"/>`;
const stations = [
  {
    words: /\b(fill\w*|dose\w*|pour\w*)\b/i,
    art: `<path d="M32 70V19l8-3v52m-1-47 43-3" fill="#83b7b5"/><path d="m49 16 23-6 18 7-24 7z" fill="#d6efea"/><path d="m49 16 17 8 24-7-13 19-9 3-8-4z" fill="#80b4b3"/><path d="m68 38 9-2v9l-9 2z" fill="#38727b"/>${belt}<g transform="translate(56 40) scale(.67)">${carton}</g><path class="lm-liquid" d="M71 44v10m4-11v9" fill="none" stroke="#176f79" stroke-width="2.5"/>`,
  },
  {
    words: /\b(inspect\w*|check\w*|test\w*|scan\w*)\b/i,
    art: `${belt}<g transform="translate(46 36) scale(.75)">${carton}</g><path d="m43 62-6-3V27l36-10 8 4-37 11z" fill="#acd6ce"/><path d="M44 32v30l-7-3V27m7 5 37-11v8L44 40" fill="#508e96"/><path d="m73 30 6-2v24l-6 2z" fill="#427b81"/><path class="lm-scanlight" d="m46 41 25-6 11 14-33 9z" fill="#68d8cb" opacity=".65" stroke="none"/><circle cx="39.5" cy="33" r="1.6" stroke="none" fill="#173d46"/>`,
  },
  {
    words: /\b(pack\w*|box\w*|carton\w*|seal\w*)\b/i,
    art: `<path d="m24 63 50-14 27 14-49 16z" fill="#abcac4"/><path d="m24 63 28 16 49-16v5L52 85 24 69z" fill="#759fa0"/><g transform="translate(44 23)"><g class="lm-parcel">${carton}</g></g><path d="m39 49 19 10 25-13 7 5-31 16-26-14z" fill="#eed8ad"/><path d="m33 53 26 14v12L33 65z" fill="#cc9b70"/><path d="m59 67 31-16v12L59 79z" fill="#a87855"/>`,
  },
  {
    words: /\b(heat\w*|bake\w*|baking|oven\w*|cool\w*|drying)\b/i,
    art: `<path d="m26 30 48-13 22 12-49 14z" fill="#c6e0d6"/><path d="m26 30 21 13v38L26 66z" fill="#75a7a4"/><path d="m47 43 49-14v39L47 81z" fill="#a8ccc4"/><path d="m55 48 32-9v21l-32 10z" fill="#24505a"/><path d="m57 65 27-8" stroke="#ffd397"/><path class="lm-heat" d="M62 60c-4-4 4-5 0-10m8 8c-4-4 4-6 0-11m8 9c-4-4 4-6 0-11" stroke="#ffd397" fill="none"/><path d="m53 74 34-10"/>`,
  },
  {
    words: /\b(ship\w*|deliver\w*|dispat\w*|transport\w*)\b/i,
    art: `<g class="lm-truck"><path d="m16 33 44-13 24 14-44 13z" fill="#d3e8df"/><path d="m16 33 24 14v29L16 61z" fill="#89b7ae"/><path d="m40 47 44-13v30L40 76z" fill="#b2d3c9"/><path d="m79 47 11-3 13 12v13l-24 7z" fill="#5ca1a5"/><path d="m84 49 6-2 8 8-14 4z" fill="#234f60"/><g fill="#284953"><ellipse cx="48" cy="74" rx="5" ry="7"/><ellipse cx="89" cy="72" rx="5" ry="7"/></g><g fill="#accbc5" stroke="none"><circle cx="48" cy="74" r="2"/><circle cx="89" cy="72" r="2"/></g></g>`,
  },
  {
    words: /\b(buffer\w*|stor\w*|stock\w*|queue\w*|pallet\w*)\b/i,
    art: `<path d="M25 25v54m65-72v56m-51-29v54m-13-62 64-17 12 7-63 18m-13 21 63-18 13 7-63 18" fill="none" stroke="#66989b" stroke-width="4"/><g transform="translate(47 18) scale(.60)">${carton}</g><g transform="translate(61 39) scale(.56)"><g class="lm-parcel">${carton}</g></g>`,
  },
  {
    words: /\b(feed\w*|load\w*|convey\w*|move\w*|receiv\w*|transfer\w*)\b/i,
    art: `${belt}<g transform="translate(41 31) scale(.8)"><g class="lm-payload">${carton}</g></g><path d="m43 74 3-1m13-3 3-1m13-3 3-1" stroke="#d5e9df"/>`,
  },
];
export function stationSvg(label: string): string {
  const matches = stations.map(station => ({ art: station.art, index: label.search(station.words) }))
    .filter(match => match.index >= 0).sort((a, b) => a.index - b.index);
  const art = matches[0]?.art ?? '<ellipse cx="61" cy="65" rx="28" ry="10" fill="#aed1ca"/><path d="m39 44 22-12 22 12-22 12z" fill="#d1e7df"/><path d="m39 44 22 12v12L39 55z" fill="#80aba8"/><path d="m61 56 22-12v11L61 68z" fill="#5b8c91"/><circle cx="61" cy="42" r="5" fill="#f3ce94"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="96" viewBox="0 0 120 96" aria-hidden="true"><ellipse cx="61" cy="75" rx="45" ry="11" fill="#c8dfd8"/><g stroke="#224f59" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round">${art}</g></svg>`;
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
export function chartMedia(spec: ChartSpec, s: Series, result?: DataResult): string | undefined {
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
    const bar = (v: number, compare = false) => `<span class="lm-track"><i class="${compare ? 'lm-compare' : 'lm-bar'}" style="transform-origin:${v < 0 ? 'right' : 'left'};left:${Math.min(zero, pos(v))}%;width:${Math.abs(pos(v) - zero)}%"></i><i class="lm-zero" style="left:${zero}%"></i>${spec.target === undefined ? '' : `<i class="lm-target" style="left:${pos(spec.target)}%"></i>`}</span>`;
    graphic = `<div class="lm-ranks">${shown.map(({i,v}, index) => {
      const other = s.compare?.[i];
      const comparison = s.compare ? `<small>${mediaEscape(spec.compareLabel || 'Comparison')} · ${other == null ? 'Not recorded' : exact(other, s.unit)}</small>${other == null ? '' : bar(other, true)}` : '';
      return `<div class="lm-rank" style="--step:${index}"><div><span>${mediaEscape(labelSaid(s.labels[i]))}</span><b>${exact(v, s.unit)}</b></div>${bar(v)}${comparison}</div>`;
    }).join('')}${spec.target === undefined ? '' : `<small class="lm-legend">${mediaEscape(spec.targetLabel || 'Target')} · ${exact(spec.target, s.unit)}</small>`}</div>`;
  }
  const measures = result?.query.measures;
  const aggregate = Array.isArray(measures) ? measures[spec.measure]?.op : undefined;
  const canShowShare = (aggregate === 'sum' || aggregate === 'count') && !spec.percent && !s.compare &&
    spec.type !== 'line' && spec.target === undefined && selected && points.every(p => p.v >= 0) && s.total && s.total > 0 &&
    (result?.result.groupsTotal === result?.result.groups.length);
  let headline = mediaEscape(s.finding);
  let detail = '';
  if (canShowShare && selected && s.total) {
    const share = (100 * selected.v / s.total).toLocaleString('en-GB', { maximumFractionDigits: 1 });
    headline = `${mediaEscape(s.labels[selected.i])} accounts for ${share}% of the total shown.`;
    detail = `<p class="lm-detail">${exact(selected.v, s.unit)} of ${exact(s.total, s.unit)}</p>`;
  }
  const source = result?.source.name;
  return `<div class="lm-scene"><div class="lm-copy"><p class="lm-context">${mediaEscape(spec.title)}</p>
    <p class="lm-finding">${headline}</p>${detail}
    ${source ? `<p class="lm-source">Source · ${mediaEscape(source)}</p>` : ''}</div>${graphic}</div>`;
}
