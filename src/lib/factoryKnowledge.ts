/* FACTORY KNOWLEDGE — the factory as the app already holds it, read as one map, and words turned into the things on it
 * (8 November, docs/FACTORY-KNOWLEDGE.md F1–F2).
 *
 * Rowland, 8 November: "it cannot guess which factory, area, production line, machine or process I am talking about … Do not
 * create a duplicate factory database." So nothing here is a record: the lines are the factory's lines (Workspace, with the
 * client, site and area words of CLIENT_SITE_AREA.sql), the machines the line's machines (lib/lineRecords machinesOnLine — one
 * record a machine, ONE_MACHINE_RECORD.sql), and each thing said with how it is known (Workspace.known, Asset.known —
 * MACHINE_KNOWLEDGE.sql). Pure: records in, the map and the words out. A kind is only ever GUESSED from a name as inferred —
 * never written as a fact. */
import type { Known, KnownFact, Workspace } from '../types';
import type { Asset } from './testing';
import { lineOfMachine, machineKey, machinesOnLine, type JobLine } from './lineRecords';
import { lineKey, productionLines } from './lines';

/* ── how a thing is known, in words ── */

/** How a value is known, in the words the AI and the page use. 'recorded' — typed into Faultline, with nothing said of how. */
export type HowWord = 'confirmed' | 'reported' | 'from a document' | 'inferred' | 'recorded' | 'unknown';

const HOW_WORD: Record<KnownFact['how'], HowWord> = { confirmed: 'confirmed', reported: 'reported', document: 'from a document', inferred: 'inferred' };
const dayOf = (t: number): string => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const clip = (s: string, n = 120): string => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** The word for how a field is known — 'unknown' with no value, 'recorded' with a value and nothing said of how. */
export function howWord(known: Known | undefined, field: string, value?: string): HowWord {
  const f = known?.[field];
  if (f) return HOW_WORD[f.how];
  return value?.trim() ? 'recorded' : 'unknown';
}

/** How a field is known, in a sentence's worth of plain words: "Reported in a conversation, 8 Nov" · "Confirmed by Rowland,
 *  8 Nov" · "From Equipment register.xlsx: “Scale 3 — Avery”" · "Guessed from its name — not confirmed". Pass the value when
 *  there is one, so a value typed before anyone said how reads as recorded, never as unknown. */
export function howSaid(known: Known | undefined, field: string, value?: string): string {
  const f = known?.[field];
  if (!f) return value?.trim() ? 'Recorded in Luna' : 'Not known';
  const day = f.at ? `, ${dayOf(f.at)}` : '';
  const src = f.source;
  switch (f.how) {
    case 'confirmed': return `Confirmed${f.by ? ` by ${f.by}` : ''}${day}`;
    case 'reported':
      return `Reported${src?.kind === 'conversation' ? ` in ${src.label ? `“${src.label}”` : 'a conversation'}` : f.by ? ` by ${f.by}` : ''}${day}`;
    case 'document':
      return `From ${src?.label ?? 'a document'}${src?.quote ? `: “${clip(src.quote)}”` : ''}`;
    case 'inferred':
      return `${src?.label ? `Inferred from ${src.label}` : 'Inferred'} — not confirmed`;
  }
}

/** A person's own word on a field (the machine page's edit): confirmed, by them, now. */
export const confirmedBy = (by: string | undefined, at: number): KnownFact => ({ how: 'confirmed', at, ...(by?.trim() ? { by: by.trim() } : {}), source: { kind: 'person' } });

/* ── what a machine is: the kinds, in the factory's words ── */

/** The kinds of equipment Faultline knows the words for — the first word the one shown, the rest what people also say. A
 *  checkweigher is its own kind, never a scale; a kind typed that is not here is kept as typed. */
export const KINDS: readonly { kind: string; words: readonly string[] }[] = [
  { kind: 'checkweigher', words: ['checkweigher', 'checkweighers', 'check weigher', 'check weighers', 'checkweighing'] },
  { kind: 'metal detector', words: ['metal detector', 'metal detectors', 'metal detection', 'metal detecting'] },
  { kind: 'case packer', words: ['case packer', 'case packers', 'casepacker', 'case packing', 'case packing machine'] },
  { kind: 'scale', words: ['scale', 'scales', 'weigher', 'weighers', 'weigh scale', 'weighing scale', 'weighing scales'] },
  { kind: 'mixer', words: ['mixer', 'mixers'] },
  { kind: 'conveyor', words: ['conveyor', 'conveyors', 'conveyer', 'conveyers'] },
  { kind: 'bagger', words: ['bagger', 'baggers', 'bagging machine', 'bagging machines', 'bagging'] },
  { kind: 'filler', words: ['filler', 'fillers', 'filling machine', 'filling machines'] },
  { kind: 'sealer', words: ['sealer', 'sealers', 'tray sealer', 'heat sealer', 'sealing machine'] },
  { kind: 'labeller', words: ['labeller', 'labellers', 'labeler', 'labelers', 'labelling machine', 'labeling machine'] },
  { kind: 'wrapper', words: ['wrapper', 'wrappers', 'flow wrapper', 'flowwrapper', 'wrapping machine'] },
  { kind: 'palletiser', words: ['palletiser', 'palletisers', 'palletizer', 'palletizers', 'palletising'] },
];

/** Words as compared: lower case, a hyphen or stop a space, letters and digits apart ("Scale1" is "scale 1"), one space. */
export const wordsOf = (s: string): string[] =>
  s.toLowerCase().replace(/[‘’'`]/g, '').replace(/([a-z])(\d)/g, '$1 $2').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);

/** Does `have` hold `want` as words in a row? */
const holds = (have: readonly string[], want: readonly string[]): boolean => {
  if (!want.length || want.length > have.length) return false;
  for (let i = 0; i + want.length <= have.length; i++) if (want.every((w, j) => have[i + j] === w)) return true;
  return false;
};

/** The kind the words name — the longest of the kinds' words they hold, so "check weigher 2" is a checkweigher, never a scale. */
function kindIn(words: readonly string[]): string | undefined {
  let best: { kind: string; n: number } | undefined;
  for (const k of KINDS) {
    for (const w of k.words) {
      const ws = wordsOf(w);
      if (holds(words, ws) && (!best || ws.length > best.n)) best = { kind: k.kind, n: ws.length };
    }
  }
  return best?.kind;
}

/** A KIND GUESSED FROM A NAME — "Scale 3" a scale, "Ishida checkweigher" a checkweigher — and only ever as inferred. Undefined
 *  when the name says nothing of what it is ("Pick and Place", "M7"). */
export function kindOf(name: string): { kind: string; how: 'inferred' } | undefined {
  const kind = kindIn(wordsOf(name));
  return kind ? { kind, how: 'inferred' } : undefined;
}

/** A kind as it is kept: one of the known kinds when the words are one of its words ("Palletizer" → palletiser), else as typed. */
export function kindWord(typed: string): string {
  const t = typed.trim();
  if (!t) return '';
  const ws = wordsOf(t).join(' ');
  return KINDS.find(k => k.words.some(w => wordsOf(w).join(' ') === ws))?.kind ?? t;
}

/* ── the map ── */

/** One fact on the map: its value and how it is known, word and sentence. */
export interface Said { value: string; how: HowWord; said: string }

const said = (value: string | undefined, known: Known | undefined, field: string): Said | undefined =>
  (value?.trim() ? { value: value.trim(), how: howWord(known, field, value), said: howSaid(known, field, value) } : undefined);

export interface MapMachine {
  /** Its record's id — absent for a machine only named on the line's list. */
  id?: string;
  name: string;
  /** What it is — recorded, or guessed from its name (inferred). */
  kind?: Said;
  model?: Said;
  serial?: Said;
  maker?: Said;
  /** The machines it replaced, kept as history: the old record, its name, the day. */
  replaced: { id: string; name: string; on?: string }[];
}
export interface MapLine { id: string; name: string; type?: string; machines: MapMachine[] }
export interface MapArea { /** '' — the lines that say no area */ name: string; lines: MapLine[] }
export interface MapSite { /** '' — the lines that say no site */ name: string; areas: MapArea[] }
export interface MapClient { /** '' — the lines that name no client */ name: string; sites: MapSite[] }
export interface FactoryMap { clients: MapClient[] }

/** The client a line is the client's, as compared: '' for a line that names none. */
export const clientKey = (w: Pick<Workspace, 'clientName'>): string => (w.clientName ?? '').trim().toLowerCase();

/** The lines of one client and none other's — a line that names no client is only with the others that name none (never
 *  with a named client's, so nothing crosses from one business to another). */
export const sameClient = <T extends Pick<Workspace, 'clientName'>>(lines: readonly T[], client: string): T[] =>
  lines.filter(w => clientKey(w) === client.trim().toLowerCase());

const group = <T, K extends string>(xs: readonly T[], key: (x: T) => K): Map<K, T[]> => {
  const m = new Map<K, T[]>();
  for (const x of xs) m.set(key(x), [...(m.get(key(x)) ?? []), x]);
  return m;
};
const byName = (a: string, b: string): number => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b));

/** THE FACTORY MAP — client › site › area › line › machines, each machine with what it is and how each thing is known, and
 *  what it replaced. The lines the factory works on (the demo and the archived aside, lib/lines productionLines), in floor
 *  order; the machines the line's (machinesOnLine — merged and deleted records aside), a record replaced by another kept under
 *  the one that replaced it, never as a machine of the line. With `client`, that client's lines only. */
export function factoryMap(lines: readonly Workspace[], assets: readonly Asset[], opts: { client?: string; jobLines?: readonly JobLine[] } = {}): FactoryMap {
  const jobLines = opts.jobLines ?? [];
  const live = productionLines(lines);
  const ws = opts.client !== undefined ? sameClient(live, opts.client) : live;
  const records = assets.filter(a => !a.deletedAt && !a.mergedInto);
  const lineOf = (w: Workspace): MapLine => {
    const own = records.filter(a => lineOfMachine(a, jobLines) === w.id);
    const machines = machinesOnLine(w, records.filter(a => !a.replacedBy), jobLines).map(m => {
      const r = m.record;
      const kind = r?.kind?.trim() ? said(r.kind, r.known, 'kind') : (() => { const g = kindOf(m.name); return g ? { value: g.kind, how: 'inferred' as const, said: 'Guessed from its name — not confirmed' } : undefined; })();
      const replaced = r ? own.filter(a => a.replacedBy === r.id).map(a => ({ id: a.id, name: a.name, ...(a.known?.replacedBy?.at ? { on: dayOf(a.known.replacedBy.at) } : {}) })) : [];
      const model = said(r?.model, r?.known, 'model'), serial = said(r?.serial, r?.known, 'serial'), maker = said(r?.oem, r?.known, 'oem');
      return { ...(r ? { id: r.id } : {}), name: m.name, ...(kind ? { kind } : {}), ...(model ? { model } : {}), ...(serial ? { serial } : {}), ...(maker ? { maker } : {}), replaced };
    });
    return { id: w.id, name: w.name, ...(w.lineType?.trim() ? { type: w.lineType.trim() } : {}), machines };
  };
  const clients = group(ws, w => w.clientName?.trim() ?? '');
  return {
    clients: [...clients.entries()].sort(([a], [b]) => byName(a, b)).map(([name, cl]) => ({
      name,
      sites: [...group(cl, w => w.siteName?.trim() ?? '').entries()].sort(([a], [b]) => byName(a, b)).map(([site, sl]) => ({
        name: site,
        areas: [...group(sl, w => w.areaName?.trim() ?? '').entries()].sort(([a], [b]) => byName(a, b)).map(([area, al]) => ({ name: area, lines: al.map(lineOf) })),
      })),
    })),
  };
}

/** Every line on the map, with where it is. */
export function mapLines(map: FactoryMap): (MapLine & { client: string; site: string; area: string })[] {
  return map.clients.flatMap(c => c.sites.flatMap(s => s.areas.flatMap(a => a.lines.map(l => ({ ...l, client: c.name, site: s.name, area: a.name })))));
}

/** A machine's identity in a few words for a paper's facts: "A checkweigher · Model CW-5000 · Serial 12345". Empty when none is
 *  said; a kind only guessed is not printed as a fact. */
export function identityFacts(a: Pick<Asset, 'kind' | 'model' | 'serial'> | undefined): string[] {
  if (!a) return [];
  return [a.kind?.trim() ? `Kind: ${a.kind.trim()}` : '', a.model?.trim() ? `Model ${a.model.trim()}` : '', a.serial?.trim() ? `Serial ${a.serial.trim()}` : ''].filter(Boolean);
}

/** A MACHINE NAME THAT WAS REPLACED on a line: what replaced it and the day — the old record kept, its name off the line's list
 *  (so its page, asked for by the old name, says where it went). */
export function replacedOf(wsId: string, name: string, assets: readonly Asset[]): { by: Asset; on?: string } | undefined {
  const old = assets.find(a => (a.workspaceId ?? '') === wsId && !a.deletedAt && !!a.replacedBy && machineKey(a.name) === machineKey(name));
  const by = old ? assets.find(a => a.id === old.replacedBy && !a.deletedAt) : undefined;
  return old && by ? { by, ...(old.known?.replacedBy?.at ? { on: dayOf(old.known.replacedBy.at) } : {}) } : undefined;
}

/* ── words → things ── */

export interface Candidate {
  kind: 'line' | 'machine' | 'area' | 'site';
  id?: string;
  label: string;
  /** Why it is offered: "named so", "a scale (inferred from its name)", "in the area Packaging". */
  why: string;
  /** How the thing (or what matched it) is known. */
  how: HowWord;
  /** The line it is on — a machine's. */
  lineId?: string;
}
export interface Resolved { match: 'one' | 'several' | 'none'; candidates: Candidate[]; says: string }

const NUMBER_WORDS: Record<string, string> = {
  one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
  eleven: '11', twelve: '12', thirteen: '13', fourteen: '14', fifteen: '15', sixteen: '16', seventeen: '17', eighteen: '18', nineteen: '19', twenty: '20',
};
const FILLER = new Set(['the', 'a', 'an', 'our', 'that', 'this', 'those', 'these', 'my']);

/** A line's key as compared: "Line 2A" → "2a", "line two" → "2" (lib/lines lineKey, number words as digits, no spaces). */
export const lineKeyOf = (s: string): string =>
  wordsOf(lineKey(s)).map(w => NUMBER_WORDS[w] ?? w).filter(w => w !== 'line' && w !== 'no' && w !== 'number').join('');

/** Do the words name a line by its number or name ("line 2", "line two", "2a")? Its key, or undefined. */
function lineAsked(ws: readonly string[]): string | undefined {
  const i = ws.indexOf('line');
  if (i >= 0 && ws.length > i + 1) return lineKeyOf(ws.slice(i + 1).join(' '));
  if (ws.length === 1 && /^\d+[a-z]?$/.test(ws[0])) return ws[0];
  return undefined;
}

/** The "Line X" inside a line's own name — "Exam Line A" → "a", "Packing Line 2" → "2" — so "line A" and "line 2" find it, as people
 *  shorten a name on the floor (11 November: the real model, told "the checkweigher on Line A", found no line — the key of "Exam Line
 *  A" is "exama"). Undefined when the name holds no "line". */
const ownLineKey = (name: string): string | undefined => lineAsked(wordsOf(name));

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const where = (l: { site: string; area: string }) => [l.site, l.area].filter(Boolean).join(' › ');

/** WORDS INTO THE THINGS THEY NAME, on one client's map: a line by its name or number ("Line 2", "line two", "2a"), an area or
 *  a site by its words, a machine by its name, its kind or a kind's other words ("the scales", "the mixer"). "the scales on
 *  line 2" looks only on Line 2; otherwise the conversation's line (`near`) narrows the machines first, when it holds any.
 *  ONE — use it; SEVERAL — ask which, naming them; NONE — it is not known in Faultline. Nothing is guessed into being. */
export function resolveWords(map: FactoryMap, words: string, near: { lineIds?: readonly string[] } = {}): Resolved {
  const said0 = words.trim();
  /* the word after "line" is its name even when it is a filler word — "Line A" keeps its A */
  const all = wordsOf(said0).filter((w, i, ws) => !FILLER.has(w) || ws[i - 1] === 'line');
  const lines = mapLines(map);
  /* "the scales on line 2": what, then where */
  const cut = all.findIndex((w, i) => i > 0 && (w === 'on' || w === 'at' || w === 'in') && i < all.length - 1);
  const head = cut > 0 ? all.slice(0, cut) : all;
  const tail = cut > 0 ? all.slice(cut + 1) : [];
  let onLines: typeof lines | undefined;
  if (tail.length) {
    const lk = lineAsked(tail) ?? lineKeyOf(tail.join(' '));
    const hit = lines.filter(l => lineKeyOf(l.name) === lk || ownLineKey(l.name) === lk || wordsOf(l.name).join(' ') === tail.join(' '));
    const placeHit = hit.length ? hit : lines.filter(l => wordsOf(l.area).join(' ') === tail.join(' ') || wordsOf(l.site).join(' ') === tail.join(' '));
    if (placeHit.length) onLines = placeHit;
    else return { match: 'none', candidates: [], says: `No line or area called “${tail.join(' ')}” is known in Luna — so nothing on it is either.` };
  }
  const phrase = head.join(' ');
  const out: Candidate[] = [];
  const push = (c: Candidate) => { if (!out.some(x => x.kind === c.kind && x.id === c.id && x.label === c.label)) out.push(c); };
  const lineLabel = (l: (typeof lines)[number]) => `${l.name}${where(l) ? ` (${where(l)})` : ''}`;
  const machineLabel = (m: MapMachine, l: (typeof lines)[number]) => `${m.name}${m.kind ? ` — ${m.kind.how === 'inferred' ? 'probably a ' : 'a '}${m.kind.value}` : ''}, on ${l.name}`;

  if (!head.length) return { match: 'none', candidates: [], says: 'Nothing was said to look for.' };

  /* 1. A LINE — by name, else by its number or key */
  if (!tail.length) {
    const lk = lineAsked(head);
    const exact = lines.filter(l => wordsOf(l.name).join(' ') === phrase || (lk !== undefined && (lineKeyOf(l.name) === lk || ownLineKey(l.name) === lk)));
    for (const l of exact) push({ kind: 'line', id: l.id, label: lineLabel(l), why: 'named so', how: 'recorded' });
    if (!exact.length && lk) for (const l of lines.filter(x => lineKeyOf(x.name).startsWith(lk))) push({ kind: 'line', id: l.id, label: lineLabel(l), why: `its number starts ${lk.toUpperCase()}`, how: 'recorded' });
  }

  /* 2. A MACHINE — by its name exactly, else by its kind or a name holding the words */
  const pool = (onLines ?? lines);
  const exactMachines = pool.flatMap(l => l.machines.filter(m => machineKey(wordsOf(m.name).join(' ')) === phrase).map(m => ({ m, l })));
  for (const { m, l } of exactMachines) push({ kind: 'machine', ...(m.id ? { id: m.id } : {}), label: machineLabel(m, l), why: 'named so', how: 'recorded', lineId: l.id });
  /* a kind said on its own ("the bagger") is every machine of that kind, the one named Bagger among them; a name with more to
     it ("Scale 1") is that one */
  const justAKind = KINDS.some(k => k.words.some(w => wordsOf(w).join(' ') === phrase));
  if ((!exactMachines.length || justAKind) && !out.some(c => c.kind === 'line')) {
    const kind = kindIn(head);
    const hits = pool.flatMap(l => l.machines.flatMap(m => {
      if (kind && m.kind?.value.toLowerCase() === kind) return [{ m, l, why: `${m.kind.how === 'inferred' ? 'probably ' : ''}a ${kind} (${m.kind.how === 'inferred' ? 'guessed from its name' : `its kind, ${m.kind.how}`})`, how: m.kind.how }];
      if (holds(wordsOf(m.name), head)) return [{ m, l, why: `its name holds “${phrase}”`, how: 'recorded' as HowWord }];
      return [];
    }));
    /* the conversation's line first — when it holds any of them */
    const near1 = !onLines && near.lineIds?.length ? hits.filter(h => near.lineIds?.includes(h.l.id)) : [];
    for (const h of near1.length ? near1 : hits) push({ kind: 'machine', ...(h.m.id ? { id: h.m.id } : {}), label: machineLabel(h.m, h.l), why: h.why, how: h.how, lineId: h.l.id });
  }

  /* 3. AN AREA OR A SITE — by its words */
  if (!out.length && !tail.length) {
    const areas = new Map<string, (typeof lines)[number][]>();
    const sites = new Map<string, (typeof lines)[number][]>();
    for (const l of lines) {
      if (l.area && (wordsOf(l.area).join(' ') === phrase || holds(wordsOf(l.area), head))) areas.set(`${l.site}›${l.area}`, [...(areas.get(`${l.site}›${l.area}`) ?? []), l]);
      if (l.site && (wordsOf(l.site).join(' ') === phrase || holds(wordsOf(l.site), head))) sites.set(l.site, [...(sites.get(l.site) ?? []), l]);
    }
    for (const ls of areas.values()) push({ kind: 'area', label: `${ls[0].area}${ls[0].site ? `, ${ls[0].site}` : ''} — ${plural(ls.length, 'line')}: ${ls.map(l => l.name).join(', ')}`, why: 'the area named so', how: 'recorded' });
    for (const [s, ls] of sites) push({ kind: 'site', label: `${s} — ${plural(ls.length, 'line')}`, why: 'the site named so', how: 'recorded' });
  }

  const n = out.length;
  const client = map.clients.length === 1 && map.clients[0].name ? ` for ${map.clients[0].name}` : '';
  const says = n === 0
    ? `Nothing called “${said0}” is known in Luna${client} — it may need adding.`
    : n === 1 ? `“${said0}” is ${out[0].label}.`
      : `“${said0}” could be ${plural(n, 'thing')}: ${out.map(c => c.label).join('; ')}.`;
  return { match: n === 0 ? 'none' : n === 1 ? 'one' : 'several', candidates: out, says };
}
