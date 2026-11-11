/* A METHOD RECORD — one file in knowledge/methods/<discipline>/<slug>.md,
 * read here from its text (knowledge/README.md, "A method record"). Pure: the
 * catalogue's test and scripts/catalogue.mjs hand it the file's words; nothing
 * here reads a disc, so it never reaches the app's bundle by accident.
 *
 * The front matter is a small, strict shape — `key: value` on one line, a
 * list as `[a, b]` — so a record can be checked by a machine and still read
 * by a person; the body's headings are fixed, in order, so every record
 * answers the same questions. */

export const METHOD_HEADINGS = [
  'Purpose and principle',
  'Questions it answers',
  'Inputs and minimum conditions',
  'Procedure and calculation',
  'Assumptions, limits and misuse',
  'Reading the result',
  'When not to use it — and instead',
  'In food and FMCG manufacturing',
  'References',
  'In Faultline',
] as const;

/** established — a recognised method; adaptation — established parts put
 *  together for a purpose; emerging — in use, not settled; faultline — a
 *  decision or design of Faultline's own. */
export const METHOD_KINDS = ['established', 'adaptation', 'emerging', 'faultline'] as const;
/** The strongest source behind it: a standard, the law, a textbook, a peer-reviewed
 *  paper, recognised practice (a handbook, a body's guidance), or a decision. */
export const METHOD_EVIDENCE = ['standard', 'law', 'textbook', 'peer-reviewed', 'practice', 'decision'] as const;
export const METHOD_DEPTH = ['full', 'summary'] as const;

export interface MethodRecord {
  id: string;
  name: string;
  aka: string[];
  discipline: string;
  kind: typeof METHOD_KINDS[number];
  evidence: typeof METHOD_EVIDENCE[number];
  depth: typeof METHOD_DEPTH[number];
  /** What was checked, against what, and when — free words. */
  checked: string;
  needs: string[];
  next: string[];
  alternatives: string[];
  related: string[];
  title: string;
  /** Each fixed heading's text, trimmed. */
  sections: Record<string, string>;
  /** Headings found, in order. */
  headings: string[];
}

const LIST_KEYS = ['aka', 'needs', 'next', 'alternatives', 'related'] as const;

const listOf = (v: string): string[] => {
  const t = v.trim();
  if (!t.startsWith('[') || !t.endsWith(']')) return [];
  return t.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
};

/** The record from a file's text — and what is wrong with it, said in words. */
export function parseMethod(text: string): { record?: MethodRecord; problems: string[] } {
  const problems: string[] = [];
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text.replace(/\r\n/g, '\n'));
  if (!m) return { problems: ['no front matter between --- lines at the top'] };
  const fm: Record<string, string> = {};
  for (const line of m[1].split('\n')) {
    if (!line.trim()) continue;
    const i = line.indexOf(':');
    if (i < 1) { problems.push(`front matter line not "key: value": ${line}`); continue; }
    fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  for (const k of ['id', 'name', 'discipline', 'kind', 'evidence', 'depth', 'checked']) if (!fm[k]) problems.push(`no ${k}`);
  for (const k of LIST_KEYS) if (fm[k] !== undefined && !/^\[.*\]$/.test(fm[k])) problems.push(`${k} is not a [list]`);
  if (fm.kind && !(METHOD_KINDS as readonly string[]).includes(fm.kind)) problems.push(`kind "${fm.kind}" is not one of ${METHOD_KINDS.join(', ')}`);
  if (fm.evidence && !(METHOD_EVIDENCE as readonly string[]).includes(fm.evidence)) problems.push(`evidence "${fm.evidence}" is not one of ${METHOD_EVIDENCE.join(', ')}`);
  if (fm.depth && !(METHOD_DEPTH as readonly string[]).includes(fm.depth)) problems.push(`depth "${fm.depth}" is not one of ${METHOD_DEPTH.join(', ')}`);

  const body = m[2];
  const title = /^# (.+)$/m.exec(body)?.[1]?.trim() ?? '';
  if (!title) problems.push('no # title');
  const parts = body.split(/^## /m).slice(1);
  const headings = parts.map(p => p.split('\n')[0].trim());
  const sections: Record<string, string> = {};
  parts.forEach(p => { const nl = p.indexOf('\n'); sections[p.slice(0, nl).trim()] = p.slice(nl + 1).trim(); });
  const want = [...METHOD_HEADINGS];
  if (headings.join('|') !== want.join('|')) {
    const missing = want.filter(h => !headings.includes(h));
    if (missing.length) problems.push(`missing headings: ${missing.join('; ')}`);
    else problems.push('headings out of order');
  }
  for (const h of want) if (sections[h] !== undefined && !sections[h]) problems.push(`"${h}" is empty`);
  if (sections.References !== undefined && !/^- \[(standard|manual|textbook|paper|practice|guidance|law|decision)\]/m.test(sections.References))
    problems.push('References: each line starts "- [standard|manual|textbook|paper|practice|guidance|law|decision]"');

  if (problems.length) return { problems };
  return {
    problems,
    record: {
      id: fm.id, name: fm.name, discipline: fm.discipline,
      kind: fm.kind as MethodRecord['kind'], evidence: fm.evidence as MethodRecord['evidence'], depth: fm.depth as MethodRecord['depth'],
      checked: fm.checked,
      aka: listOf(fm.aka ?? '[]'), needs: listOf(fm.needs ?? '[]'), next: listOf(fm.next ?? '[]'),
      alternatives: listOf(fm.alternatives ?? '[]'), related: listOf(fm.related ?? '[]'),
      title, sections, headings,
    },
  };
}

/** Every path a record or document names in backticks that should exist:
 *  src/, scripts/, docs/, knowledge/, supabase/ — so a record cannot point
 *  at code that was moved or deleted. */
export function pathsNamed(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/`((?:src|scripts|docs|knowledge|supabase)\/[^`\s]+?)`/g)) {
    const p = m[1].replace(/[),.;:]+$/, '');
    if (/[*<>{}]/.test(p)) continue;
    out.add(p);
  }
  return [...out];
}
