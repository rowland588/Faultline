/* A MACHINE'S MANUAL, READ BY RULES (13 November, docs/ASSET-DOCUMENTS.md — Rowland: "I get the manuals … I upload it to Luna. She
 * digests it. I'm able to tell her to create a preventive maintenance list based on what the OEM has stipulated … If there's a possibility
 * to do it through code as well … so it doesn't involve heavy AI costs"; "the oem manual is pdf").
 *
 * The manual's words are taken out page by page in code (./pages) and kept; everything here works on those pages and is pure:
 *   findPassages   the lines that speak of a topic (maintenance · speed · products · limits, or any words), with their page
 *   pmTasksOf      the maintenance tasks the manual stipulates WITH AN INTERVAL, read by rule — "Lubricate the chain every 500 hours",
 *                  or a heading that is an interval ("Weekly", "Every 2000 hours") with its tasks under it. A rule reads a task exactly
 *                  or does not claim it: no interval is ever supplied where the manual gives none.
 *   quoteOnPage    whether words are on a page — the check every task Luna adds must pass, so nothing she writes outruns the manual.
 * An interval is kept in the manual's own words (oem) beside the schedule the Planned maintenance log can hold (every n hours, shifts,
 * days, weeks): "monthly" is 30 days, "quarterly" 91, "annually" 365 — said, never hidden. */

export type PmUnit = 'hour' | 'shift' | 'day' | 'week';
export interface PmInterval { every: number; unit: PmUnit; /** The manual's own words for it. */ oem: string }
export interface PmTask extends PmInterval {
  task: string;
  /** 1-based page of the manual. */
  page: number;
  /** The line of the manual it was read from, as printed. */
  quote: string;
  by: 'rules' | 'luna';
}
export interface Passage { page: number; text: string }

const norm = (s: string) => s.toLowerCase().replace(/[‐-―]/g, '-').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
const NUM_WORD: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12 };
const num = (s: string) => NUM_WORD[s.toLowerCase()] ?? Number(s.replace(/[,\s]/g, ''));
const N = '(\\d[\\d,]*|one|two|three|four|five|six|seven|eight|nine|ten|twelve)';

/** The interval a piece of text states, with where it sits — or none. The first that matches, most specific first. */
export function intervalIn(text: string): (PmInterval & { at: number; len: number }) | undefined {
  const t = text;
  const rules: [RegExp, (m: RegExpExecArray) => { every: number; unit: PmUnit } | undefined][] = [
    [new RegExp(`\\b(?:every|each|after|at)\\s+${N}\\s*(?:operating\\s+|running\\s+|working\\s+|machine\\s+|service\\s+)?(?:hours?|hrs?|h)\\b(?:\\s+of\\s+operation)?`, 'i'), m => ({ every: num(m[1]), unit: 'hour' })],
    [new RegExp(`\\b${N}\\s*(?:operating\\s+|running\\s+|working\\s+)(?:hours?|hrs?)\\b`, 'i'), m => ({ every: num(m[1]), unit: 'hour' })],
    [new RegExp(`\\b(?:every|each)\\s+${N}\\s+shifts?\\b`, 'i'), m => ({ every: num(m[1]), unit: 'shift' })],
    [/\b(?:every|each|per|once a|once per)\s+shift\b|\bbefore (?:each|every) shift\b|\bat the (?:start|end) of (?:each|every|the) shift\b/i, () => ({ every: 1, unit: 'shift' })],
    [new RegExp(`\\b(?:every|each)\\s+${N}\\s+days?\\b`, 'i'), m => ({ every: num(m[1]), unit: 'day' })],
    [/\bdaily\b|\b(?:every|each|once a|once per)\s+day\b/i, () => ({ every: 1, unit: 'day' })],
    [new RegExp(`\\b(?:every|each)\\s+${N}\\s+weeks?\\b`, 'i'), m => ({ every: num(m[1]), unit: 'week' })],
    [/\b(?:fortnightly|bi-?weekly)\b/i, () => ({ every: 2, unit: 'week' })],
    [/\bweekly\b|\b(?:every|each|once a|once per)\s+week\b/i, () => ({ every: 1, unit: 'week' })],
    [new RegExp(`\\b(?:every|each)\\s+${N}\\s+months?\\b`, 'i'), m => ({ every: Math.round(num(m[1]) * 30.4), unit: 'day' })],
    [/\b(?:six|6)[- ]monthly\b|\b(?:semi-?annual(?:ly)?|bi-?annual(?:ly)?|half[- ]yearly|twice a year)\b/i, () => ({ every: 182, unit: 'day' })],
    [/\b(?:quarterly|three[- ]monthly|3[- ]monthly)\b/i, () => ({ every: 91, unit: 'day' })],
    [/\bmonthly\b|\b(?:every|each|once a|once per)\s+month\b/i, () => ({ every: 30, unit: 'day' })],
    [new RegExp(`\\b(?:every|each)\\s+${N}\\s+years?\\b`, 'i'), m => ({ every: Math.round(num(m[1]) * 365), unit: 'day' })],
    [/\b(?:annual(?:ly)?|yearly)\b|\b(?:every|each|once a|once per)\s+year\b/i, () => ({ every: 365, unit: 'day' })],
  ];
  for (const [re, make] of rules) {
    const m = re.exec(t);
    if (!m) continue;
    const got = make(m);
    if (!got || !Number.isFinite(got.every) || got.every <= 0) continue;
    return { ...got, oem: m[0].trim(), at: m.index, len: m[0].length };
  }
  return undefined;
}

/** A line that says to DO something to the machine. */
const VERB = /\b(lubricat\w*|greas\w*|oil(?:ing|ed)?|inspect\w*|check\w*|clean\w*|replac\w*|chang\w*|tighten\w*|re-?tighten\w*|adjust\w*|calibrat\w*|test\w*|drain\w*|examin\w*|renew\w*|top[- ]?up|verif\w*|service|servic(?:e|ing)|overhaul\w*|re-?tension\w*|tension\w*|measur\w*|wipe\w*|blow\w*|empty\w*|flush\w*|sharpen\w*)\b/i;
/** A line that is nothing but an interval (and decoration): a heading its tasks sit under. */
const headingInterval = (line: string) => {
  const iv = intervalIn(line);
  if (!iv) return undefined;
  const rest = (line.slice(0, iv.at) + line.slice(iv.at + iv.len)).replace(/\b(maintenance|checks?|tasks?|service|servicing|inspection|schedule|intervals?|routine|lubrication|cleaning|operations?|or|and|whichever comes first)\b/gi, '').replace(/[^a-z0-9]/gi, '');
  return rest.length <= 3 ? iv : undefined;
};
const tidy = (s: string) => s.replace(/^[\s•\-–—*·▪■□◦●○\d.)(]+(?=\S)/, m => (/^\s*\d+(\.\d+)*[.)]?\s+$/.test(m) || !/\d/.test(m) ? '' : m)).replace(/\s+/g, ' ').replace(/^[\s,;:.\-–—]+|[\s,;:.\-–—]+$/g, '').trim();

/** The maintenance tasks a manual stipulates with an interval, read by rule, in the manual's order. */
export function pmTasksOf(pages: readonly string[]): PmTask[] {
  const out: PmTask[] = [], seen = new Set<string>();
  pages.forEach((text, p) => {
    let under: PmInterval | undefined, gap = 0;
    for (const raw of text.split('\n')) {
      const line = raw.replace(/\s+/g, ' ').trim();
      if (!line) { if (++gap >= 2) under = undefined; continue; }
      gap = 0;
      const head = headingInterval(line);
      if (head) { under = { every: head.every, unit: head.unit, oem: head.oem }; continue; }
      if (line.length > 320) continue;
      const own = intervalIn(line);
      const iv = own ?? under;
      if (!iv || !VERB.test(line)) continue;
      const task = tidy(own ? `${line.slice(0, own.at)} ${line.slice(own.at + own.len)}` : line);
      if (task.replace(/[^a-z]/gi, '').length < 6) continue;
      const key = `${norm(task)}|${iv.every}${iv.unit}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ task: task.charAt(0).toUpperCase() + task.slice(1), every: iv.every, unit: iv.unit, oem: iv.oem, page: p + 1, quote: line, by: 'rules' });
    }
  });
  return out;
}

/** Whether these words are on that page (spacing, case and dash style apart). */
export function quoteOnPage(pages: readonly string[], page: number, quote: string): boolean {
  const q = norm(quote);
  return q.length >= 4 && Number.isInteger(page) && page >= 1 && page <= pages.length && norm(pages[page - 1]).includes(q);
}

export const TOPICS = {
  maintenance: /\b(maintenance|lubricat\w*|greas\w*|inspect\w*|servic\w*|replace\w*|overhaul\w*|interval|preventive|preventative)\b/i,
  speed: /\b(speed|rate|capacity|output|throughput|cycles?|per\s+min(?:ute)?|\/\s?min|ppm|bpm|cpm|packs?\s+per|bags?\s+per|strokes?)\b/i,
  products: /\b(products?|formats?|pack\s+sizes?|bag\s+(?:sizes?|widths?|lengths?)|film|reel|materials?|suitable for|designed for|range of)\b/i,
  limits: /\b(max(?:imum)?|min(?:imum)?|limits?|rated|must not|do not exceed|not exceed|permissible|tolerance|temperature|pressure|voltage|kPa|bar|°C|kW)\b/i,
} as const;
export type Topic = keyof typeof TOPICS;

/** The lines of the manual that speak of a topic or of the words asked for, each with its page and the line either side of it. */
export function findPassages(pages: readonly string[], ask: { topic?: Topic; words?: string }, most = 40): { passages: Passage[]; more: number } {
  const wanted = (ask.words ?? '').toLowerCase().split(/[^a-z0-9°%/]+/).filter(w => w.length > 2);
  const hit = (l: string) => (ask.topic ? TOPICS[ask.topic].test(l) : false) || (wanted.length > 0 && wanted.every(w => l.toLowerCase().includes(w)));
  const all: Passage[] = [];
  pages.forEach((text, p) => {
    const lines = text.split('\n').map(l => l.replace(/\s+/g, ' ').trim());
    let last = -9;
    lines.forEach((l, i) => {
      if (!l || !hit(l) || i <= last) return;
      const block = [lines[i - 1], l, lines[i + 1]].filter(x => x && x.length < 400).join(' / ');
      all.push({ page: p + 1, text: block.slice(0, 600) });
      last = i + 1;
    });
  });
  return { passages: all.slice(0, most), more: Math.max(0, all.length - most) };
}

const UNIT_WORD: Record<PmUnit, [string, string]> = { hour: ['hour', 'hours'], shift: ['shift', 'shifts'], day: ['day', 'days'], week: ['week', 'weeks'] };
/** "every 500 hours (the manual: “every 500 operating hours”)" */
export const intervalSaid = (t: Pick<PmTask, 'every' | 'unit' | 'oem'>): string =>
  `every ${t.every === 1 ? UNIT_WORD[t.unit][0] : `${t.every.toLocaleString('en-GB')} ${UNIT_WORD[t.unit][1]}`} (the manual: “${t.oem}”)`;
