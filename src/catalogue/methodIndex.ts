/* THE METHOD LIBRARY, INDEXED — knowledge/methods/*.md, read at build time through Vite (method_knowledge, catalogue tests use fs). */
import { parseMethod, type MethodRecord } from './methodRecord';
import { stems } from './index';

const raw = import.meta.glob('../../knowledge/methods/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const all: MethodRecord[] = [];
for (const text of Object.values(raw)) {
  const { record, problems } = parseMethod(text);
  if (record && !problems.length) all.push(record);
}
all.sort((a, b) => a.id.localeCompare(b.id));

const byId = new Map(all.map(r => [r.id, r]));

export const methodRecords = (): readonly MethodRecord[] => all;

export const methodById = (id: string): MethodRecord | undefined => {
  const q = id.trim().toLowerCase();
  if (byId.has(q)) return byId.get(q);
  const hit = all.filter(r => r.id === q || r.id.endsWith(`.${q}`) || r.id.split('.').slice(1).join('.') === q);
  return hit.length === 1 ? hit[0] : hit.find(r => r.id === q);
};

/** Rank records by id, discipline, and keywords in name, aka and section text. */
export function searchMethodRecords(input: { id?: string; discipline?: string; query?: string }): MethodRecord[] {
  if (input.id?.trim()) {
    const one = methodById(input.id.trim());
    return one ? [one] : [];
  }
  let pool = all;
  const disc = input.discipline?.trim().toLowerCase();
  if (disc) pool = pool.filter(r => r.discipline === disc || r.id.startsWith(`${disc}.`));
  const q = input.query?.trim();
  if (!q) return pool.slice(0, 8);
  const words = stems(q);
  if (!words.length) return pool.slice(0, 8);
  const scored = pool.map(r => {
    const hay = [
      r.name,
      r.id,
      r.discipline,
      ...r.aka,
      ...Object.values(r.sections),
    ].join(' ');
    const have = new Set(stems(hay));
    let score = 0;
    for (const w of words) if (have.has(w)) score += 1;
    return { r, score };
  }).filter(x => x.score > 0);
  return scored.sort((a, b) => b.score - a.score || a.r.id.localeCompare(b.r.id)).map(x => x.r).slice(0, 8);
}

/** Headings returned for Luna — theory and limits, not procedure or references in full. */
export const METHOD_LOOKUP_HEADINGS = [
  'Purpose and principle',
  'Assumptions, limits and misuse',
  'When not to use it — and instead',
  'In food and FMCG manufacturing',
  'In Faultline',
] as const;

const MAX_CHARS = 4000;

/** One record as bounded text for the model — no figures worked here; the record’s own words only. */
export function methodLookupText(r: MethodRecord): { id: string; name: string; discipline: string; text: string; truncated: boolean } {
  const parts: string[] = [
    `id: ${r.id}`,
    `name: ${r.name}`,
    `discipline: ${r.discipline}`,
    `kind: ${r.kind} · evidence: ${r.evidence} · depth: ${r.depth}`,
    r.aka.length ? `also known as: ${r.aka.join(', ')}` : '',
    r.checked ? `checked: ${r.checked}` : '',
  ].filter(Boolean);
  for (const h of METHOD_LOOKUP_HEADINGS) {
    const body = r.sections[h]?.trim();
    if (body) parts.push(`## ${h}\n${body}`);
  }
  let text = parts.join('\n\n');
  let truncated = false;
  if (text.length > MAX_CHARS) {
    text = `${text.slice(0, MAX_CHARS - 40).trim()}\n\n… (trimmed — ask again with id for one record)`;
    truncated = true;
  }
  return { id: r.id, name: r.name, discipline: r.discipline, text, truncated };
}