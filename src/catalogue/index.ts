/* THE CATALOGUE, AS ONE LIST — every entry, found by id, by the floor's words,
 * by discipline or by status, and its counts worked out from the entries
 * themselves, never typed (knowledge/README.md). Pure: the directory page
 * (screens/ToolsScreen), the test and scripts/catalogue.mjs all read it. */
import { DISCIPLINES, STATUSES, STATUS_WORDS, FORM_WORDS, type Entry, type ProblemRoute, type Status } from './types';
import { LEAN } from './entries/lean';
import { IE } from './entries/ie';
import { CAPACITY } from './entries/capacity';
import { EQUIPMENT } from './entries/equipment';
import { SPC } from './entries/spc';
import { QUALITY } from './entries/quality';
import { OPERATIONS } from './entries/operations';
import { PROBLEMS } from './problems';
import { BACKLOG } from './backlog';

export const ENTRIES: Entry[] = [...LEAN, ...IE, ...CAPACITY, ...EQUIPMENT, ...SPC, ...QUALITY, ...OPERATIONS]
  .sort((a, b) => a.id.localeCompare(b.id));

export { PROBLEMS, BACKLOG };

/** THE TOOLS AVAILABLE BEFORE THE QUALITY STANDARD (knowledge/STANDARD.md,
 *  22 October). Each was assessed from its acceptance script in the gate, and
 *  has no specification with acceptance criteria and a report. They keep
 *  their status; the catalogue's test refuses any other entry called
 *  available without that specification. This list only shrinks: the next
 *  material change to one of these goes through the standard (the
 *  faultline-tool skill) and takes it off, in the same change. */
export const AVAILABLE_BEFORE_STANDARD: readonly string[] = [
  'FC-008', 'FC-022', 'FC-031', 'FC-034', 'FC-035', 'FC-036', 'FC-037', 'FC-038',
  'FC-040', 'FC-049', 'FC-051', 'FC-052', 'FC-053', 'FC-054', 'FC-068', 'FC-073', 'FC-074', 'FC-075',
  'FC-078', 'FC-079', 'FC-080', 'FC-081', 'FC-147', 'FC-148', 'FC-187',
  'FC-188', 'FC-189', 'FC-190', 'FC-193', 'FC-194', 'FC-195', 'FC-202', 'FC-204', 'FC-205', 'FC-206', 'FC-214',
];

const BY_ID = new Map(ENTRIES.map(e => [e.id, e]));
export const entryById = (id: string): Entry | undefined => BY_ID.get(id.trim().toUpperCase());

export const disciplineName = (id: string): string => DISCIPLINES.find(d => d.id === id)?.name ?? id;
export const subName = (d: string, s: string): string => DISCIPLINES.find(x => x.id === d)?.subs[s] ?? s;

/* ------------------------------------------------------------------ search */

/** Words as the search compares them: lower case, plain letters, a plural's
 *  s taken off — so "rejects", "Reject" and "rejected" meet. */
export function stems(text: string): string[] {
  return text.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9℮]+/g, ' ').split(' ').filter(w => w.length > 1)
    .map(w => w.replace(/(ing|ed|es|s)$/, '') || w)
    .filter(w => !STOP.has(w));
}
const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'it', 'is', 'are', 'we', 'our', 'for', 'too', 'with', 'by', 'at', 'do', 'doe', 'how', 'what', 'why', 'can', 'not', 'no', 'be', 'th', 'thi', 'that', 'my', 'me', 'i', 'up', 'out', 'one']);

const FIELDS: { get: (e: Entry) => string; weight: number }[] = [
  { get: e => e.name, weight: 4 },
  { get: e => (e.words ?? []).join(' '), weight: 4 },
  { get: e => e.problem, weight: 3 },
  { get: e => e.questions.join(' '), weight: 2 },
  { get: e => e.method, weight: 1 },
  { get: e => e.food, weight: 1 },
  { get: e => `${disciplineName(e.discipline)} ${subName(e.discipline, e.sub)}`, weight: 1 },
];

/** Entries ranked by how well they match the words — the problem first. */
export function searchEntries(query: string, among: Entry[] = ENTRIES): Entry[] {
  const q = stems(query);
  const id = /^fc-?\d{1,3}$/i.test(query.trim()) ? `FC-${query.trim().replace(/\D/g, '').padStart(3, '0')}` : '';
  if (id) return among.filter(e => e.id === id);
  if (!q.length) return among;
  const scored = among.map(e => {
    let score = 0;
    for (const f of FIELDS) {
      const have = new Set(stems(f.get(e)));
      for (const w of q) if (have.has(w)) score += f.weight;
    }
    return { e, score };
  }).filter(x => x.score > 0);
  return scored.sort((a, b) => b.score - a.score || a.e.id.localeCompare(b.e.id)).map(x => x.e);
}

/** Problem routes whose title or words meet the query. */
export function searchProblems(query: string): ProblemRoute[] {
  const q = stems(query);
  if (!q.length) return PROBLEMS;
  return PROBLEMS.map(p => {
    const have = new Set(stems(`${p.title} ${p.words.join(' ')}`));
    return { p, score: q.filter(w => have.has(w)).length };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).map(x => x.p);
}

/* ------------------------------------------------------------------ counts */

export const countBy = <K extends string>(entries: Entry[], key: (e: Entry) => K): Record<K, number> =>
  entries.reduce((m, e) => { const k = key(e); m[k] = (m[k] ?? 0) + 1; return m; }, {} as Record<K, number>);

export const statusCounts = (entries: Entry[] = ENTRIES): Record<Status, number> => {
  const c = countBy(entries, e => e.status);
  return Object.fromEntries(STATUSES.map(s => [s, c[s] ?? 0])) as Record<Status, number>;
};

/** THE SUMMARY — knowledge/SUMMARY.md, worked out from the catalogue so it can
 *  never disagree with it (the test fails when the file is stale; write it
 *  with `node scripts/catalogue.mjs summary --write`). */
export function summaryMarkdown(methodCount: number): string {
  const s = statusCounts();
  const total = ENTRIES.length;
  const lines: string[] = [];
  lines.push('# The catalogue, summed up');
  lines.push('');
  lines.push('Worked out from `src/catalogue/` by `node scripts/catalogue.mjs summary --write` — never typed. The catalogue test fails when this file is stale.');
  lines.push('');
  lines.push(`**${total} entries** across ${DISCIPLINES.length} disciplines, behind them **${methodCount} method records** (\`knowledge/methods/\`) and **${PROBLEMS.length} problem routes**.`);
  lines.push('');
  lines.push('| Status | Entries |');
  lines.push('|---|---|');
  for (const st of STATUSES) lines.push(`| ${STATUS_WORDS[st]} (\`${st}\`) | ${s[st]} |`);
  lines.push('');
  lines.push('## By discipline');
  lines.push('');
  lines.push(`| Discipline | Entries | ${STATUSES.map(st => STATUS_WORDS[st]).join(' | ')} |`);
  lines.push(`|---|---|${STATUSES.map(() => '---').join('|')}|`);
  for (const d of DISCIPLINES) {
    const es = ENTRIES.filter(e => e.discipline === d.id);
    if (!es.length) continue;
    const c = statusCounts(es);
    lines.push(`| ${d.name} | ${es.length} | ${STATUSES.map(st => c[st] || '').join(' | ')} |`);
  }
  lines.push('');
  lines.push('## By subdiscipline');
  lines.push('');
  for (const d of DISCIPLINES) {
    const es = ENTRIES.filter(e => e.discipline === d.id);
    if (!es.length) continue;
    const subs = Object.entries(d.subs).map(([k, name]) => [name, es.filter(e => e.sub === k).length] as const).filter(([, n]) => n);
    lines.push(`- **${d.name}** — ${subs.map(([name, n]) => `${name} ${n}`).join(' · ')}`);
  }
  lines.push('');
  lines.push('## By the shape it takes');
  lines.push('');
  const f = countBy(ENTRIES, e => e.form);
  for (const [form, words] of Object.entries(FORM_WORDS)) if (f[form as keyof typeof f]) lines.push(`- ${words}: ${f[form as keyof typeof f]}`);
  lines.push('');
  lines.push('## Research first');
  lines.push('');
  for (const e of ENTRIES.filter(x => x.status === 'research')) lines.push(`- ${e.id} ${e.name} — ${e.valueWhy}`);
  lines.push('');
  lines.push('## Left out on purpose');
  lines.push('');
  for (const e of ENTRIES.filter(x => x.status === 'left-out')) lines.push(`- ${e.id} ${e.name} — ${e.decided ?? ''}`);
  lines.push('');
  lines.push('## The backlog — what to build first (`src/catalogue/backlog.ts`)');
  lines.push('');
  BACKLOG.forEach((b, i) => { const e = entryById(b.id); lines.push(`${i + 1}. ${b.id} ${e?.name ?? '?'} (${e ? STATUS_WORDS[e.status] : '?'}) — ${b.why}`); });
  lines.push('');
  lines.push('## Where related capabilities could be combined');
  lines.push('');
  const parents = countBy(ENTRIES.filter(e => e.partOf), e => e.partOf as string);
  for (const [pid, n] of Object.entries(parents).sort((a, b) => b[1] - a[1])) {
    const p = entryById(pid);
    lines.push(`- ${pid} ${p?.name ?? '?'} — ${n} modes inside it`);
  }
  lines.push('');
  return lines.join('\n');
}
