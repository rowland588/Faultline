/* A DOCUMENT'S FIRST LOOK — worked in code from its pages (27 November 2026).
 *
 * Same contract as a workbook's first look (lib/workbook/firstLook): the file is classified, the facts the app can hold
 * are taken from its own words with their page, and what is not in the file is named. Nothing is invented. No AI.
 * Conversation is the door — this runs when a PDF or Word file is attached, not from a keyword of the person's ask. */

export const DOCUMENT_KINDS = ['tender', 'quotation', 'invoice', 'contract', 'commercial', 'manual', 'procedure', 'specification', 'training', 'other'] as const;
export type DocumentKind = typeof DOCUMENT_KINDS[number];

export const COMMERCIAL_KINDS: readonly DocumentKind[] = ['tender', 'quotation', 'invoice', 'contract', 'commercial'];
export const isCommercial = (k: DocumentKind): boolean => COMMERCIAL_KINDS.includes(k);

export const KIND_WORD: Record<DocumentKind, string> = {
  tender: 'a tender',
  quotation: 'a quotation',
  invoice: 'an invoice',
  contract: 'a contract',
  commercial: 'a commercial document',
  manual: 'a machine manual',
  procedure: 'a procedure',
  specification: 'a specification',
  training: 'a training document',
  other: 'a document',
};

export const DOCUMENT_FIELDS = ['buyer', 'supplier', 'reference', 'deadline', 'date', 'amount', 'vat'] as const;
export type DocumentField = typeof DOCUMENT_FIELDS[number];

const FIELD_WORD: Record<DocumentField, string> = {
  buyer: 'buyer',
  supplier: 'supplier',
  reference: 'reference',
  deadline: 'submission deadline',
  date: 'date',
  amount: 'amount',
  vat: 'VAT',
};

export const DOCUMENT_FORM_CHIPS = ['A report', 'A table', 'Make this an SOP'] as const;

export interface DocumentFact {
  field: DocumentField;
  /** The file's own words for the value — never a re-worked figure. */
  value: string;
  /** Pounds when the value is money the code parsed from those words. */
  pounds?: number;
  page: number;
  quote: string;
}

export interface DocumentLook {
  kind: DocumentKind;
  facts: DocumentFact[];
  missing: DocumentField[];
  /** One sentence of what it is, then the facts, then what is not in the file. */
  said: string;
  /** The headline Luna is told with every question (colleague/knows saysOf). */
  headline: string;
  suggestions: readonly string[];
  pageCount: number;
  blank: number;
  capped: boolean;
}

export interface DocumentLookKept {
  kind: DocumentKind;
  headline: string;
  missing: DocumentField[];
  facts: DocumentFact[];
  at: number;
}

/** Pages of a chat-attached PDF or Word file, read in code when it came in. */
export interface DocumentPagesKept { pages: string[]; pageCount: number; blank: number; capped?: boolean }

export const keptOf = (look: DocumentLook, at: number): DocumentLookKept => ({
  kind: look.kind, headline: look.headline, missing: look.missing, facts: look.facts, at,
});

const NEEDED: Record<DocumentKind, readonly DocumentField[]> = {
  tender: ['buyer', 'supplier', 'reference', 'deadline', 'amount'],
  quotation: ['supplier', 'amount', 'date'],
  invoice: ['supplier', 'amount', 'date'],
  contract: ['buyer', 'supplier', 'date', 'amount'],
  commercial: ['amount'],
  manual: [],
  procedure: [],
  specification: [],
  training: [],
  other: [],
};

const MARKERS: Record<DocumentKind, readonly string[]> = {
  tender: ['invitation to tender', 'invitation to quote', 'request for quotation', 'invitation to bid', 'contracting authority', 'submission deadline', 'tender return', 'tender ref', 'itt no', 'rfq no', 'invitation to tender (itt)'],
  quotation: ['this quotation', 'quote no', 'quotation no', 'quoted price', 'quotation for'],
  invoice: ['tax invoice', 'vat invoice', 'invoice no', 'invoice number', 'amount due', 'invoice date'],
  contract: ['this agreement', 'the parties', 'consideration', 'hereby agrees', 'terms and conditions'],
  commercial: ['purchase order', 'commercial offer', 'commercial proposal'],
  manual: ['operating and maintenance', 'operating manual', 'maintenance manual', 'rated speed', 'lubricate the'],
  procedure: ['standard operating procedure', 'work instruction'],
  specification: ['technical specification', 'this specification'],
  training: ['training guide', 'toolbox talk', 'learning objective'],
  other: [],
};

const FILE_MARK: { re: RegExp; kind: DocumentKind; w: number }[] = [
  { re: /\b(itt|rfq|tender|bid)\b/i, kind: 'tender', w: 4 },
  { re: /\b(quot(?:e|ation))\b/i, kind: 'quotation', w: 3 },
  { re: /\binvoice\b/i, kind: 'invoice', w: 3 },
  { re: /\bcontract\b/i, kind: 'contract', w: 2 },
  { re: /\b(manual|oem)\b/i, kind: 'manual', w: 3 },
  { re: /\b(sop|procedure|instruction)\b/i, kind: 'procedure', w: 2 },
  { re: /\bspec(?:ification)?\b/i, kind: 'specification', w: 2 },
];

const KIND_ORDER: readonly DocumentKind[] = ['tender', 'invoice', 'quotation', 'contract', 'commercial', 'manual', 'procedure', 'specification', 'training', 'other'];

const MONEY = /£\s*([\d,]+(?:\.\d{1,2})?)/;
const GBP = /\bGBP\s*([\d,]+(?:\.\d{1,2})?)/i;
const UK_DAY = /\b(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})\b/i;

const PARTY = /(.{2,80}?)(?:\s*$|\s{2,}|,|\.|;)/;
const after = (re: RegExp, line: string): string | undefined => {
  const m = re.exec(line);
  if (!m) return undefined;
  const rest = line.slice(m.index + m[0].length);
  const p = PARTY.exec(rest.trim());
  const v = (p ? p[1] : rest).replace(/^[:\-–\s]+/, '').replace(/\s+/g, ' ').trim();
  return v.length >= 2 ? v : undefined;
};

function moneyOn(line: string): { said: string; pounds: number } | undefined {
  const m = MONEY.exec(line) ?? GBP.exec(line);
  if (!m) return undefined;
  const pounds = Number(m[1].replace(/,/g, ''));
  if (!Number.isFinite(pounds)) return undefined;
  return { said: `£${m[1]}`, pounds };
}

function classify(name: string, text: string): DocumentKind {
  const hay = `${name}\n${text}`.toLowerCase();
  const score: Partial<Record<DocumentKind, number>> = {};
  const add = (k: DocumentKind, n: number) => { score[k] = (score[k] ?? 0) + n; };
  for (const k of DOCUMENT_KINDS) {
    for (const m of MARKERS[k]) if (hay.includes(m)) add(k, m.split(' ').length >= 2 ? 3 : 2);
  }
  if (/\bitt[-–]/.test(hay) || /\brfq[-–]/.test(hay)) add('tender', 4);
  if (/\btender\b/.test(hay)) add('tender', 2);
  for (const { re, kind, w } of FILE_MARK) if (re.test(name)) add(kind, w);
  let best: DocumentKind = 'other', n = 0;
  for (const k of KIND_ORDER) {
    const s = score[k] ?? 0;
    if (s > n) { best = k; n = s; }
  }
  if (n === 0 && (MONEY.test(text) || GBP.test(text))) return 'commercial';
  return n === 0 ? 'other' : best;
}

interface Hit { field: DocumentField; value: string; pounds?: number; page: number; quote: string }

const HOLLOW = /^(not stated|n\/a|none|nil|tbc|tba|to be confirmed|unknown|-|—)\b/i;

function take(page: number, line: string): Hit[] {
  const out: Hit[] = [];
  const put = (field: DocumentField, value: string, extra?: { pounds?: number }) => {
    const v = value.replace(/\s+/g, ' ').trim();
    if (!v || HOLLOW.test(v) || out.some(h => h.field === field)) return;
    out.push({ field, value: v, page, quote: line.trim(), ...(extra?.pounds !== undefined ? { pounds: extra.pounds } : {}) });
  };
  const buyer = after(/^(?:buyer|contracting authority|purchaser|client|issued\s+to|to)\s*[:\-–]\s*/i, line)
    ?? after(/\b(?:buyer|contracting authority)\s*[:\-–]\s*/i, line);
  if (buyer) put('buyer', buyer);
  const supplier = after(/^(?:supplier|contractor|tenderer|vendor|seller|from|issued\s+by)\s*[:\-–]\s*/i, line)
    ?? after(/\b(?:supplier|contractor|issued\s+by)\s*[:\-–]\s*/i, line);
  if (supplier) put('supplier', supplier);
  const reference = after(/^(?:(?:tender|itt|rfq|quote|quotation|invoice|contract|purchase\s+order)\s+)?(?:ref(?:erence)?|no\.?|number)\s*[:\-–]\s*/i, line)
    ?? after(/\b(?:itt|rfq|tender ref(?:erence)?|invoice no\.?|quote no\.?|quotation no\.?)\s*[:\-–]\s*/i, line);
  if (reference) put('reference', reference);
  if (/\b(submission deadline|closing date|tender deadline|return by|replies by|deadline)\b/i.test(line)) {
    const d = UK_DAY.exec(line);
    if (d) put('deadline', d[1]);
  }
  if (/\b(invoice date|quote date|quotation date|dated|date)\b/i.test(line) && !/\bdeadline\b/i.test(line)) {
    const d = UK_DAY.exec(line);
    if (d) put('date', d[1]);
  }
  if (/\b(total(?:\s+contract)?(?:\s+tender)?(?:\s+quoted?)?(?:\s+invoice)?\s+(?:value|amount|sum|price)|contract value|tender value|amount due|consideration|quoted price|invoice total|grand total)\b/i.test(line)) {
    const m = moneyOn(line);
    if (m) put('amount', m.said, { pounds: m.pounds });
  }
  if (/\bvat\b/i.test(line) && !/\bvat\s+at\s+\d/i.test(line)) {
    const m = moneyOn(line);
    if (m) put('vat', m.said, { pounds: m.pounds });
  }
  return out;
}

function factsOf(pages: readonly string[]): DocumentFact[] {
  const found: DocumentFact[] = [];
  const seen = new Set<DocumentField>();
  pages.forEach((page, i) => {
    const n = i + 1;
    for (const line of page.split(/\n+/)) {
      for (const h of take(n, line)) {
        if (seen.has(h.field)) continue;
        seen.add(h.field);
        found.push({ field: h.field, value: h.value, page: h.page, quote: h.quote, ...(h.pounds !== undefined ? { pounds: h.pounds } : {}) });
      }
    }
  });
  return found;
}

function kindSaid(name: string, kind: DocumentKind, pageCount: number, blank: number, capped: boolean): string {
  const read = pageCount - blank;
  const pages = `${pageCount} page${pageCount === 1 ? '' : 's'}`;
  const head = `“${name}” is ${KIND_WORD[kind]}.`;
  if (pageCount === 0) return `${head} Nothing in it could be read.`;
  if (read === 0) return `${head} ${pages}, none with words the app can read (they look like pictures). Nothing is extracted.`;
  const cut = capped ? ' Only its first part was read.' : '';
  return `${head} ${pages}, read in the app (no AI used).${cut}`;
}

function lookSaid(o: { name: string; kind: DocumentKind; facts: DocumentFact[]; missing: DocumentField[]; pageCount: number; blank: number; capped: boolean }): { said: string; headline: string } {
  const head = kindSaid(o.name, o.kind, o.pageCount, o.blank, o.capped);
  const held = o.facts.map(f => `· ${FIELD_WORD[f.field]} — ${f.value} (p.${f.page})`);
  const miss = o.missing.length ? `Not in the file: ${o.missing.map(f => FIELD_WORD[f]).join(', ')}.` : '';
  const offer = isCommercial(o.kind) && o.pageCount - o.blank > 0
    ? 'Ask me if you want this as a report, a table or a graph, or turned into an SOP.'
    : o.kind === 'manual' && o.pageCount - o.blank > 0
      ? 'Ask what it says, or for a PM list from it.'
      : '';
  const body = [held.length ? `Held:\n${held.join('\n')}` : '', miss, offer].filter(Boolean).join('\n\n');
  const said = body ? `${head}\n\n${body}` : head;
  const bits = o.facts.slice(0, 4).map(f => `${FIELD_WORD[f.field]} ${f.value}`);
  const headline = [head.replace(/\. \d+ pages.*$/, '.'), bits.length ? bits.join('; ') : '', miss].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  return { said, headline };
}

export function documentLook(o: { name: string; pages: readonly string[]; blank?: number; pageCount?: number; capped?: boolean }): DocumentLook {
  const pages = o.pages;
  const pageCount = o.pageCount ?? pages.length;
  const blank = o.blank ?? pages.filter(p => p.replace(/\s/g, '').length < 8).length;
  const capped = !!o.capped;
  const text = pages.join('\n');
  const kind = classify(o.name, text);
  const facts = factsOf(pages);
  /* a machine manual / procedure / training pack is not mined for commercial totals — a rate or an interval is not an amount */
  const held = isCommercial(kind) || kind === 'other' ? facts : [];
  const have = new Set(held.map(f => f.field));
  const missing = NEEDED[kind].filter(f => !have.has(f));
  const { said, headline } = lookSaid({ name: o.name, kind, facts: held, missing, pageCount, blank, capped });
  return {
    kind, facts: held, missing, said, headline,
    suggestions: isCommercial(kind) && pageCount - blank > 0 ? DOCUMENT_FORM_CHIPS : [],
    pageCount, blank, capped,
  };
}

export const isChatDocument = (file: { name: string; type?: string }): boolean =>
  /\.pdf$/i.test(file.name) || file.type === 'application/pdf'
  || /\.docx$/i.test(file.name) || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
