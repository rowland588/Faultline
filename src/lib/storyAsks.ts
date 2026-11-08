/* THE BRIEF'S ASKS AND THEIR EVIDENCE — by rules, in code (8 November, docs/STORY.md §7, S7–S9).
 *
 * Rowland, 8 November: "any information within the tools … assign it directly to the brief … Here's the proof. Here's the evidence …
 * If we can build it with code, of course, build it with code." So an ask (lib/study BriefAsk) carries a scope — the client's lines,
 * their machines and products, the tools — picked on chips or read from its own words (askScopeFromWords: a line's or a machine's
 * name in the ask); and every record on the client's lines is matched to it by that scope (askEvidence): what we FOUND (problems and
 * tool records), what is BEING DONE (actions, who and when, late said), what is PROVED (fixes with their before → after, the yokoten
 * reader's), and what is STILL MISSING (the tool that would show it, named from the catalogue's registry). A record that answers no ask
 * is ALSO FOUND, one tap from an ask's scope. Nothing here is stored: the evidence is worked out from the records every time, and
 * frozen only on a chapter (freezeAsks). Pure: records in, words out; no figure is worked out here — the money is the readers'. */
import type { AgreedStory, BriefAsk, StoryAction, StoryAskEvidence, StoryFinding, StoryProved, StorySnapshot } from './study';
import { fmtGBP } from './cost';
import { dayWord } from './clientStory';
import { toolLabel } from '../catalogue/registry';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const low = (s: string) => s.trim().toLowerCase();
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A line of the client's, as the asks read it: its machines and the products made on it. */
export interface AskLine { id: string; name: string; machines: readonly string[]; products?: readonly string[] }

/** A tool record on a line — a study, or a product's Line capacity — as the asks read it. */
export interface AskRecord {
  id: string;
  /** The frame's key (lib/catalogue registry): 'linebalance', 'changeover', 'capability' … */
  tool: string;
  /** "SMED — Line 7 changeover · Wrapper". */
  title: string;
  lineId?: string;
  machine?: string;
  product?: string;
  /** Where it opens (nav). */
  href: string;
}

/** Everything the asks are matched against: the snapshot's own readers (findings, actions, proved) and the tool records. */
export interface AskRecords {
  lines: readonly AskLine[];
  findings: readonly (StoryFinding & { products?: readonly string[] })[];
  actions: readonly (StoryAction & { snagId?: string })[];
  proved: readonly StoryProved[];
  records: readonly AskRecord[];
}

export interface AskScope { lines: string[]; machines: string[]; products: string[]; tools: string[] }

/** What would still show it — a tool named, where it would be started. */
export interface AskMissing { text: string; tool: string; lineId?: string; href: string }

export interface AskEvidence {
  ask: BriefAsk;
  /** The scope matched by: the chips picked, or — none picked — the names in its words. */
  scope: AskScope;
  /** True when the scope came from the ask's words, not from chips. */
  fromWords: boolean;
  found: { findings: StoryFinding[]; records: AskRecord[] };
  doing: StoryAction[];
  proved: StoryProved[];
  missing: AskMissing[];
  says: string;
}

export interface AlsoFound { kind: 'finding' | 'record' | 'proved'; id: string; what: string; lineId?: string; line?: string; machine?: string; href: string }

/** The asks in their order. */
export const asksInOrder = (story: Pick<AgreedStory, 'asks'>): BriefAsk[] => [...(story.asks ?? [])].sort((a, b) => a.order - b.order);

const has = (words: string, name: string) => !!name.trim() && new RegExp(`(^|[^\\p{L}\\p{N}])${esc(low(name))}($|[^\\p{L}\\p{N}])`, 'u').test(low(words));

/** THE SCOPE IN AN ASK'S WORDS — a line's name, a machine's or a product's appearing in it ("Why does the wrapper on Line 2A stop?"). */
export function askScopeFromWords(text: string, lines: readonly AskLine[]): Omit<AskScope, 'tools'> {
  const out = { lines: [] as string[], machines: [] as string[], products: [] as string[] };
  for (const l of lines) {
    if (has(text, l.name) && !out.lines.includes(l.id)) out.lines.push(l.id);
    for (const m of l.machines) if (has(text, m) && !out.machines.some(x => low(x) === low(m))) out.machines.push(m);
    for (const p of l.products ?? []) if (has(text, p) && !out.products.some(x => low(x) === low(p))) out.products.push(p);
  }
  return out;
}

/** The scope an ask is matched by: its chips when any is picked, else what its words name. */
export function scopeOf(ask: BriefAsk, lines: readonly AskLine[]): { scope: AskScope; fromWords: boolean } {
  const picked = { lines: ask.lines ?? [], machines: ask.machines ?? [], products: ask.products ?? [], tools: ask.tools ?? [] };
  if (picked.lines.length || picked.machines.length || picked.products.length || picked.tools.length) return { scope: picked, fromWords: false };
  return { scope: { ...askScopeFromWords(ask.text, lines), tools: [] }, fromWords: true };
}

/** THE TOOL THAT WOULD SHOW IT — read from the ask's words; Line capacity when they name no kind of loss. In the registry's keys. */
const WANTS: { re: RegExp; tool: string; shows: string }[] = [
  { re: /output|capacity|speed|rate|bottleneck|hold|limit|throughput|short|make more|losing/i, tool: 'linebalance', shows: 'what holds' },
  { re: /change ?over|set ?up|setup|product change/i, tool: 'changeover', shows: 'what the changeovers cost on' },
  { re: /stop|breakdown|downtime|reliab|jam|fail|break/i, tool: 'reliability', shows: 'how often it stops on' },
  { re: /reject|quality|weight|give-?away|overfill|fill|seal|defect|capab|spec/i, tool: 'capability', shows: 'whether it holds its limits on' },
  { re: /loss|oee|shift|time goes/i, tool: 'losses', shows: 'where a shift’s time goes on' },
  { re: /people|labour|labor|operator|staff|crew|head ?count|manning/i, tool: 'linework', shows: 'the people’s work against takt on' },
  { re: /flow|lead time|wip|stock|waiting|queue|value/i, tool: 'valuestream', shows: 'where the waiting is on' },
];
export function toolsWanted(text: string): { tool: string; shows: string }[] {
  const w = WANTS.filter(x => x.re.test(text));
  return (w.length ? w : [WANTS[0]]).map(({ tool, shows }) => ({ tool, shows }));
}

/** Where it is started: the line's own Tools page (every tool, started on the line), or the tool's page when no line is named. */
const startHref = (tool: string, lineId?: string): string => (lineId ? `/lines/${encodeURIComponent(lineId)}?view=tools` : `/tools/${tool}`);

/** THE EVIDENCE FOR ONE ASK, by its scope. */
export function askEvidence(ask: BriefAsk, r: AskRecords): AskEvidence {
  const { scope, fromWords } = scopeOf(ask, r.lines);
  const lineIds = new Set(scope.lines);
  const lineNames = new Set(r.lines.filter(l => lineIds.has(l.id)).map(l => low(l.name)));
  const machines = scope.machines.map(low);
  const products = scope.products.map(low);
  const tools = new Set(scope.tools);
  const empty = !lineIds.size && !machines.length && !products.length && !tools.size;

  const byMachine = (machine: string | undefined, words: string) => machines.length > 0 && ((!!machine && machines.includes(low(machine))) || machines.some(m => has(words, m)));
  const findings = empty ? [] : r.findings.filter(f => lineNames.has(low(f.line)) || byMachine(f.machine, f.what) || (f.products ?? []).some(p => products.includes(low(p))));
  const foundIds = new Set(findings.map(f => f.id));
  const records = empty ? [] : r.records.filter(x => (x.lineId && lineIds.has(x.lineId)) || byMachine(x.machine, x.title) || (!!x.product && products.includes(low(x.product))) || (tools.has(x.tool) && (!lineIds.size || (!!x.lineId && lineIds.has(x.lineId)))));
  const doing = empty ? [] : r.actions.filter(a => (a.snagId && foundIds.has(a.snagId)) || [...lineNames].some(n => has(`${a.where ?? ''} ${a.what}`, n)) || machines.some(m => has(`${a.where ?? ''} ${a.what}`, m)));
  const proved = empty ? [] : r.proved.filter(p => lineNames.has(low(p.line)) || byMachine(p.machine, p.what));

  /* STILL MISSING — the tools the ask's words want, on each line it is about, with no record of them there; a machine named with
     nothing measured on it; an ask about nothing in particular, asked to name where */
  const missing: AskMissing[] = [];
  const wanted = toolsWanted(ask.text);
  const scopeLines = r.lines.filter(l => lineIds.has(l.id) || l.machines.some(m => machines.includes(low(m))));
  if (empty) {
    missing.push({ text: `Nothing on the lines is matched to this ask yet — pick the line or machine it is about.`, tool: wanted[0].tool, href: startHref(wanted[0].tool) });
  } else {
    for (const l of scopeLines) for (const w of wanted) {
      const there = r.records.some(x => x.tool === w.tool && x.lineId === l.id);
      if (!there) missing.push({ text: `${toolLabel(w.tool)} would show ${w.shows} ${l.name}.`, tool: w.tool, lineId: l.id, href: startHref(w.tool, l.id) });
    }
    for (const m of scope.machines) {
      const measured = r.records.some(x => !!x.machine && low(x.machine) === low(m));
      if (!measured) {
        const l = r.lines.find(x => x.machines.some(y => low(y) === low(m)));
        const names = wanted.slice(0, 2).map(w => toolLabel(w.tool));
        if (names.length < 2 && !names.includes('SMED') && wanted[0].tool === 'linebalance') names.push('SMED');
        missing.push({ text: `No measurement on the ${m} yet — ${names.join(' or ')} would show it.`, tool: wanted[0].tool, ...(l ? { lineId: l.id } : {}), href: startHref(wanted[0].tool, l?.id) });
      }
    }
  }
  const late = doing.filter(a => a.late).length;
  const nFound = findings.length + records.length;
  const says = [
    `${nFound} found`,
    `${doing.length} being done${late ? `, ${late} late` : ''}`,
    `${proved.length} proved`,
    missing.length ? `${missing.length} still to show` : '',
  ].filter(Boolean).join(' · ');
  return { ask, scope, fromWords, found: { findings, records }, doing, proved, missing, says };
}

/** Every ask's evidence, in the asks' order, and what answers none of them. */
export function asksEvidence(story: Pick<AgreedStory, 'asks'>, r: AskRecords): { asks: AskEvidence[]; alsoFound: AlsoFound[] } {
  const asks = asksInOrder(story).map(a => askEvidence(a, r));
  const taken = { f: new Set<string>(), r: new Set<string>(), p: new Set<string>() };
  for (const e of asks) { e.found.findings.forEach(f => taken.f.add(f.id)); e.found.records.forEach(x => taken.r.add(x.id)); e.proved.forEach(p => taken.p.add(p.id)); }
  const lineOf = (name: string) => r.lines.find(l => low(l.name) === low(name));
  const alsoFound: AlsoFound[] = [];
  if (asks.length) {
    for (const f of r.findings) if (!taken.f.has(f.id)) { const l = lineOf(f.line); alsoFound.push({ kind: 'finding', id: f.id, what: f.what, line: f.line, ...(l ? { lineId: l.id } : {}), ...(f.machine ? { machine: f.machine } : {}), href: `/snags?open=${encodeURIComponent(f.id)}` }); }
    for (const x of r.records) if (!taken.r.has(x.id)) alsoFound.push({ kind: 'record', id: x.id, what: x.title, ...(x.lineId ? { lineId: x.lineId, line: r.lines.find(l => l.id === x.lineId)?.name } : {}), ...(x.machine ? { machine: x.machine } : {}), href: x.href });
    for (const p of r.proved) if (!taken.p.has(p.id)) { const l = lineOf(p.line); alsoFound.push({ kind: 'proved', id: p.id, what: `${p.what} — proved`, line: p.line, ...(l ? { lineId: l.id } : {}), machine: p.machine, href: l ? `/lines/${l.id}` : '/room' }); }
  }
  return { asks, alsoFound };
}

/** ASSIGN a record found under no ask to one: its machine joins the ask's scope when it names one, else its line. The chips the words
 *  proposed are kept as picked, so assigning never narrows what the ask already matched. */
export function assignTo(ask: BriefAsk, rec: Pick<AlsoFound, 'lineId' | 'machine'>, lines: readonly AskLine[]): BriefAsk {
  const { scope } = scopeOf(ask, lines);
  const next = { ...ask, lines: [...scope.lines], machines: [...scope.machines], products: [...scope.products], tools: [...scope.tools] };
  if (rec.machine && !next.machines.some(m => low(m) === low(rec.machine as string))) next.machines.push(rec.machine);
  else if (!rec.machine && rec.lineId && !next.lines.includes(rec.lineId)) next.lines.push(rec.lineId);
  return next;
}

/** What one ask's evidence says on paper and on a chapter — frozen in words, as it stood that day. */
export function freezeAsk(e: AskEvidence, lines: readonly AskLine[]): StoryAskEvidence {
  const lineName = (id?: string) => lines.find(l => l.id === id)?.name;
  return {
    id: e.ask.id, text: e.ask.text, ...(e.ask.from ? { from: e.ask.from } : {}),
    found: [
      ...e.found.findings.map(f => ({ id: f.id, what: f.what, where: `${f.line}${f.machine ? ` · ${f.machine}` : ''}`, ...(f.poundsDay != null ? { money: `${fmtGBP(f.poundsDay)} a day` } : {}) })),
      ...e.found.records.map(x => ({ id: x.id, what: x.title, where: [lineName(x.lineId), x.machine].filter(Boolean).join(' · ') })),
    ],
    doing: e.doing.map(a => ({ what: a.what, who: a.who, ...(a.due ? { due: a.due } : {}), late: a.late })),
    proved: e.proved.map(p => ({ id: p.id, what: p.what, where: `${p.line} · ${p.machine}`, proof: p.proof })),
    missing: e.missing.map(m => m.text),
    says: e.says,
  };
}

/** The snapshot with the asks' evidence frozen on it — unchanged when the story has no asks, so a story with none reads as before. */
export function withAsks(s: StorySnapshot, story: Pick<AgreedStory, 'asks'>, r: AskRecords): StorySnapshot {
  if (!story.asks?.length) return s;
  return { ...s, asks: asksEvidence(story, r).asks.map(e => freezeAsk(e, r.lines)) };
}

/** THE ASKS IN WORDS — for the AI colleague's capability (the owner wraps it): the brief, each ask with what answers it, and what
 *  answers none. Every line is the rules' own; nothing is worked out that the readers did not say. */
export function storyAsksState(story: Pick<AgreedStory, 'asks' | 'brief' | 'briefFile'>, r: AskRecords): {
  brief: string; asks: { text: string; from?: string; says: string; found: string[]; doing: string[]; proved: string[]; missing: string[] }[]; alsoFound: string[]; says: string;
} {
  const { asks, alsoFound } = asksEvidence(story, r);
  const dueWord = (d?: string) => (d && Number.isFinite(Date.parse(d)) ? ` by ${dayWord(Date.parse(d))}` : '');
  return {
    brief: story.brief?.trim() ? story.brief : 'No brief yet — the story works on the records alone.',
    asks: asks.map(e => {
      const f = freezeAsk(e, r.lines);
      return {
        text: f.text, ...(f.from ? { from: f.from } : {}), says: f.says,
        found: f.found.map(x => `${x.what} (${x.where})${x.money ? ` — ${x.money}` : ''}`),
        doing: f.doing.map(a => `${a.what} — ${a.who || 'nobody yet'}${dueWord(a.due)}${a.late ? ', late' : ''}`),
        proved: f.proved.map(p => `${p.what} (${p.where}) — ${p.proof}`),
        missing: f.missing,
      };
    }),
    alsoFound: alsoFound.map(x => `${x.what}${x.line ? ` (${x.line}${x.machine ? ` · ${x.machine}` : ''})` : ''}`),
    says: !asks.length ? 'The brief has no asks yet.' : `${plural(asks.length, 'ask')}; ${plural(alsoFound.length, 'record')} answering none of them.`,
  };
}
