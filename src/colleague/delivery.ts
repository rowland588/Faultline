/* HOW LUNA SAYS IT — natural delivery with the device's own voice (11 November, docs/VOICE.md §Delivery). Rowland: "I want LUNA to sound
 * more like a natural conversational colleague and less like a device reading text aloud … using our existing code and existing device
 * speech engines only. No external APIs … Do not pretend code can change the underlying voice's actual vocal quality."
 *
 * What code CAN do with the Web Speech API's speechSynthesis (the phone's or computer's own text-to-speech engine):
 *   spokenForm   write the words the way a person says them — units, ranges, dates, abbreviations, the product's names — so the engine
 *                is never left guessing at "ppm", "OEE", "LUNAR" in capitals or "178–182"; punctuation the engine reads badly
 *                (dashes, brackets, semicolons) turned into the pauses a speaker would make
 *   phrases      a reply in sentence-sized pieces: one sentence a piece (a fresh utterance gets the engine's own sentence intonation),
 *                very short ones joined to the next, long ones broken at a clause so no piece runs on (and none reaches the length at
 *                which Chrome's network voices go silent)
 *   deliveryOf   for each piece, its rate, pitch and the pause after it — slower for a sentence full of figures, a little quicker for a
 *                short acknowledgement, a longer breath after a question or a paragraph — all small, around the person's own setting
 *   voiceRank    which installed voice to prefer: the systems' natural/neural/enhanced voices first, on the device before the network
 *
 * What code CANNOT do: change the voice itself. SSML is not honoured by Chrome on Android or Windows (it is read out or dropped), so there
 * is no per-word emphasis, breath or prosody mark-up; rate, pitch and volume apply to a whole utterance; the timbre is the engine's.
 * Pure: no browser, no timers — colleague/voice says the pieces and waits the pauses. */

/* ================================================================ the words, as a person says them */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Letters said one by one — the abbreviations of the trade an engine would otherwise try to pronounce as a word. */
const SPELL = ['OEE', 'MTBF', 'MTTR', 'CCP', 'FMEA', 'SPC', 'PDCA', 'KPI', 'KPIs', 'SOP', 'SOPs', 'RCA', 'WIP', 'FIFO', 'VSM', 'CIP', 'ATP', 'PPE', 'QA', 'QC', 'NPD', 'FAT', 'SAT', 'OEM', 'ERP', 'MES', 'BOM', 'CTQ', 'VA', 'NVA', 'TPM', 'TOC', 'UCL', 'LCL', 'MSA', 'GRR', 'ID', 'PDF', 'CSV', 'ppk', 'cpk', 'Ppk', 'Cpk', 'Cp', 'Pp'];
/** Said as words, the way the trade says them. */
const SAY: [RegExp, string][] = [
  [/\bLUNAR\b/g, 'Lunar'], [/\bLUNA\b/g, 'Luna'],
  [/\bHACCP\b/g, 'hassup'], [/\bSMED\b/g, 'smed'], [/\bDMAIC\b/g, 'D-MAIC'], [/\bCUSUM\b/gi, 'cue-sum'], [/\bSIPOC\b/g, 'sy-pock'],
  [/\b5S\b/g, 'five S'], [/\b8D\b/g, 'eight D'], [/\bA3\b/g, 'A three'], [/\b6M\b/g, 'six M'], [/\b5 whys\b/gi, 'five whys'],
  [/\be\.g\./gi, 'for example'], [/\bi\.e\./gi, 'that is'], [/\betc\./gi, 'and so on'], [/\bvs\.?(?=\s)/gi, 'versus'], [/\bapprox\.?(?=\s)/gi, 'about'],
  [/\bw\/(?=\s)/gi, 'with'], [/\bw\/o(?=\s)/gi, 'without'], [/\bNo\.\s?(?=\d)/g, 'number '], [/\bnos\.\s?(?=\d)/gi, 'numbers '],
  [/\band\/or\b/gi, 'and or'],
];
/** A unit after a figure, as said ("42 min" → "42 minutes"). Singular when the figure is 1. */
const UNITS: [RegExp, string, string][] = [
  [/ppm\b/, 'packs a minute', 'packs a minute'], [/bpm\b/, 'bags a minute', 'bags a minute'], [/upm\b/, 'units a minute', 'units a minute'],
  [/(?:mins?|minutes?)\b/, 'minute', 'minutes'], [/(?:hrs?|h)\b/, 'hour', 'hours'], [/(?:secs?|s)\b/, 'second', 'seconds'], [/ms\b/, 'millisecond', 'milliseconds'],
  [/kg\b/, 'kilo', 'kilos'], [/g\b/, 'gram', 'grams'], [/mm\b/, 'millimetre', 'millimetres'], [/cm\b/, 'centimetre', 'centimetres'], [/m\b/, 'metre', 'metres'],
  [/°C\b|ºC\b|°/, 'degree', 'degrees'], [/%/, 'percent', 'percent'], [/ml\b/, 'millilitre', 'millilitres'], [/l\b/, 'litre', 'litres'],
];

const ordinal = (d: number) => `${d}${d % 10 === 1 && d !== 11 ? 'st' : d % 10 === 2 && d !== 12 ? 'nd' : d % 10 === 3 && d !== 13 ? 'rd' : 'th'}`;

/** The words of a reply as a person says them. Never changes what is meant — only how it is read out. */
export function spokenForm(text: string): string {
  let s = text;
  /* dates: 2026-11-05 → 5th November 2026 (the year dropped when it is this year's is the reader's job, not ours) */
  s = s.replace(/\b(20\d\d)-(\d\d)-(\d\d)\b/g, (_, y: string, mo: string, d: string) => `${ordinal(Number(d))} ${MONTHS[Number(mo) - 1] ?? mo} ${y}`);
  /* money: £1.2k → 1.2 thousand pounds; £1,273 → 1,273 pounds; 35p → 35 pence */
  s = s.replace(/£\s?(\d[\d,]*(?:\.\d+)?)\s?k\b/gi, '$1 thousand pounds').replace(/£\s?(\d[\d,]*(?:\.\d+)?)\s?m\b/gi, '$1 million pounds');
  s = s.replace(/£\s?(\d[\d,]*)(?:\.(\d\d))?\b/g, (_, p: string, d?: string) => (d && d !== '00' ? `${p} pounds ${Number(d)}` : `${p} pounds`));
  s = s.replace(/\b(\d+(?:\.\d+)?)p\b/g, '$1 pence');
  /* ranges and ratios: 178–182 → 178 to 182; 3 x 60 → 3 times 60; 1:2 kept; 24/7 kept */
  s = s.replace(/(\d)\s?[–—-]\s?(\d)/g, '$1 to $2').replace(/(\d)\s?[x×]\s?(\d)/g, '$1 times $2');
  /* a unit straight after a figure, said in full */
  /* "s" and "m" only after a space ("5 s", "12 m") — "1990s" is a decade and "5m" may be millions */
  s = s.replace(/(\d+(?:[.,]\d+)?)(?:\s?(ppm|bpm|upm|mins?|minutes?|hrs?|h|secs?|ms|kg|g|mm|cm|°C|ºC|°|%|ml|l)|\s(s|m))(?![\w°])/g, (whole, n: string, u1?: string, u2?: string) => {
    const u = u1 ?? u2 ?? '';
    for (const [re, one, many] of UNITS) if (re.test(u) && u.replace(re, '') === '') return `${n} ${Number(n.replace(',', '')) === 1 ? one : many}`;
    return whole;
  });
  /* "per": 12 packs/min → 12 packs a minute */
  s = s.replace(/\/(?:min|minute)\b/g, ' a minute').replace(/\/(?:hr|hour|h)\b/g, ' an hour').replace(/\/shift\b/g, ' a shift').replace(/\/day\b/g, ' a day').replace(/\/week\b/g, ' a week');
  for (const [re, w] of SAY) s = s.replace(re, w);
  /* letters said as letters: "OEE" → "O E E" (only whole words, only these) */
  s = s.replace(new RegExp(`\\b(${SPELL.join('|')})\\b`, 'g'), (w: string) => (w.endsWith('s') && w.length > 2 && w.slice(0, -1) === w.slice(0, -1).toUpperCase() ? `${w.slice(0, -1).split('').join(' ')}s` : w.split('').join(' ')));
  /* a line or machine named by a figure and a letter: "Line 2A" → "Line 2 A" */
  s = s.replace(/\b(\d+)([A-Z])\b/g, '$1 $2');
  /* the pauses a speaker makes, in punctuation the engine reads well */
  s = s.replace(/\s*[—–]\s*/g, ', ').replace(/\s*\(\s*/g, ', ').replace(/\s*\)\s*(?=[.,!?;:]|$)/g, '').replace(/\s*\)\s*/g, ', ');
  s = s.replace(/;\s*/g, '. ').replace(/\s*…\s*/g, '... ').replace(/\s*&\s*/g, ' and ').replace(/\s*\+\s*(?=\D)/g, ' and ');
  s = s.replace(/(?<=[A-Za-z])\s*\/\s*(?=[A-Za-z])/g, ' or ');
  s = s.replace(/,\s*,+/g, ',').replace(/,\s*([.!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();
  /* a sentence starting with a lower-case word after the changes above, put right */
  return s.replace(/([.!?]\s+)([a-z])/g, (_, a: string, c: string) => a + c.toUpperCase());
}

/* ================================================================ the reply, in phrases */

const SENTENCE = /(?<=[.!?])\s+(?=[A-Z0-9"“‘(])/;
/** The longest piece said as one utterance — beyond it a long sentence is broken at a clause. Chrome's network voices stop after about
 *  fifteen seconds of one utterance; 180 characters is about ten seconds at a normal pace. */
export const MAX_PIECE = 180;
/** A sentence this short is joined to the next, so a reply is not said in a string of clipped bursts. */
const JOIN_UNDER = 28;

/** A long sentence broken where a speaker would breathe: at a clause (", but", ", so", "; ", ", which") nearest the middle, else a comma. */
export function splitLong(sentence: string, max = MAX_PIECE): string[] {
  if (sentence.length <= max) return [sentence];
  const mid = sentence.length / 2;
  const at = (re: RegExp) => [...sentence.matchAll(re)].map(m => (m.index ?? 0) + 1).filter(i => i > 30 && i < sentence.length - 20);
  const best = (xs: number[]) => xs.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid))[0];
  const cut = best(at(/,(?=\s+(?:but|so|and then|which|because|while|although|then|or)\b)/g)) ?? best(at(/,(?=\s)/g)) ?? best(at(/\s(?=(?:and|but|so|because|which|while)\s)/g));
  if (cut === undefined) return [sentence];
  const a = sentence.slice(0, cut).replace(/,$/, '').trim();
  const b = sentence.slice(cut).trim();
  return [...splitLong(`${a}${/[.!?]$/.test(a) ? '' : ','}`, max), ...splitLong(b, max)];
}

/** A reply's spoken words in phrases: a sentence each, short ones joined, long ones broken. The first phrase kept short, so it is
 *  heard at once. */
export function phrases(spoken: string): string[] {
  const sentences = spoken.split(SENTENCE).map(x => x.trim()).filter(Boolean);
  const out: string[] = [];
  for (const s of sentences) {
    const last = out[out.length - 1];
    if (last !== undefined && last.length < JOIN_UNDER && !/\?$/.test(last) && last.length + s.length + 1 <= MAX_PIECE) out[out.length - 1] = `${last} ${s}`;
    else out.push(...splitLong(s));
  }
  return out;
}

/* ================================================================ how each phrase is said */

export type DeliveryKind = 'conversation' | 'explaining';
export interface Delivery { rate: number; pitch: number; pauseAfterMs: number }

const FIGURES = /\d/g;
/** How one phrase is said, around the person's own rate and pitch: `kind` — a short conversational reply, or explaining at length;
 *  `last` — the end of the reply. Changes are small (a few percent): a phrase full of figures slower so each is heard, a short
 *  acknowledgement a touch quicker, a question a touch higher at its start; a breath after each phrase, longer after a question, a
 *  colon or the end of a paragraph, none after the last. */
export function deliveryOf(phrase: string, o: { rate: number; pitch?: number; kind: DeliveryKind; last: boolean; endsParagraph?: boolean }): Delivery {
  const figures = (phrase.match(FIGURES) ?? []).length;
  const words = phrase.split(/\s+/).length;
  let rate = o.rate * (o.kind === 'explaining' ? 0.97 : 1);
  if (figures >= 4) rate *= 0.92; else if (figures >= 2) rate *= 0.96;
  if (words <= 4 && figures === 0) rate *= 1.04;
  const question = /\?$/.test(phrase.trim());
  const pitch = (o.pitch ?? 1) * (question ? 1.03 : 1);
  const pauseAfterMs = o.last ? 0 : question ? 420 : /:$/.test(phrase.trim()) ? 380 : o.endsParagraph ? 450 : /,$/.test(phrase.trim()) ? 120 : o.kind === 'explaining' ? 260 : 200;
  return { rate: Math.round(Math.min(1.6, Math.max(0.6, rate)) * 100) / 100, pitch: Math.round(Math.min(1.3, Math.max(0.7, pitch)) * 100) / 100, pauseAfterMs };
}

/** Whether a reply is explaining (long) or conversational (a few sentences). */
export const kindOf = (spoken: string): DeliveryKind => (spoken.length > 420 || spoken.split(SENTENCE).length >= 6 ? 'explaining' : 'conversation');

/* ================================================================ which installed voice */

interface V { name: string; lang: string; localService?: boolean; default?: boolean }
/** How natural a voice is likely to sound, from what the systems call their better voices: Microsoft's "Natural"/"Online (Natural)"
 *  (Edge on Windows), "Neural", Apple's "Enhanced"/"Premium", Google's network voices on a computer. Higher is better; 0 a plain one.
 *  A name is all a web page is told — the ranking is a guess from it, and a voice the person picks always wins. */
export function voiceRank(v: V): number {
  const n = v.name;
  if (/natural|neural/i.test(n)) return 3;
  if (/enhanced|premium|siri/i.test(n)) return 2;
  if (/^google\b/i.test(n)) return 1;
  return 0;
}
