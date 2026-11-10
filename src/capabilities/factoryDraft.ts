/* A FACTORY BEING ONBOARDED — the factory draft, pure (9 November; docs/FACTORY-KNOWLEDGE.md F3–F5).
 *
 * Rowland, 8 November: "We're onboarding a new customer. The business is called Customer X. They've got two factories. The main
 * factory has three production areas. Let's start with packaging." … "propose structured records for review and approval, retain
 * the source documents and trace extracted information back to its source" … "That machine has now been replaced … know which
 * information is current; never rely on outdated documentation without checking. Never let one client's knowledge be visible to
 * another."
 *
 * A factory draft is the client and its sites › areas › lines › machines as SAID (in the conversation) or READ (from a document,
 * each with its exact words), kept on the conversation (facts.drafts, kind 'factory') until the person makes it. Here, pure:
 *   applyFactoryOps   add, set, rename, move, remove, keep, leave out, pick — every value with how it is known, a correction
 *                     keeping what it replaced; nothing ever invented (a machine needs its line said; a name is never made up)
 *   factoryView       the draft against what Faultline already holds FOR THIS CLIENT ONLY (lib/factoryKnowledge factoryMap):
 *                     a line or machine already there is matched, never doubled; a value that differs from the recorded one is a
 *                     conflict the person picks (nothing confirmed is overwritten unpicked); a document older than a recorded
 *                     change is flagged in words; a machine the document names that has since been replaced is out of date
 *   factoryBlockers   what holds Make it: proposals waiting for the person's word, conflicts not picked
 *   factoryDraftSaid  the draft in words for the colleague
 * The making is ./factoryBuild, through lib/lines and db/lineRecords only. */
import type { Workspace } from '../types';
import type { Asset } from '../lib/testing';
import type { JobLine } from '../lib/lineRecords';
import { machineKey } from '../lib/lineRecords';
import { factoryMap, kindWord, lineKeyOf, mapLines, replacedOf, wordsOf, howSaid } from '../lib/factoryKnowledge';
import type { ColleagueDraft, FactoryDraftBody, FactoryFact, FactoryField, FactoryLevel, FactoryNode, FactorySource } from './types';

export const FACTORY_KEY = 'factory';
export const FACTORY_TOOL = 'Factory knowledge';
export const FACTORY_FIELDS: readonly FactoryField[] = ['kind', 'model', 'serial', 'maker'];
export const LEVEL_WORD: Record<FactoryLevel, string> = { site: 'site', area: 'area', line: 'line', machine: 'machine' };
const FIELD_WORD: Record<FactoryField | 'site' | 'area', string> = { kind: 'kind', model: 'model', serial: 'serial', maker: 'maker', site: 'site', area: 'area' };

/* ------------------------------------------------------------------ names compared */

/** Two names the same thing at a level: a line by its key ("Line 2" = "line two"), anything else word for word. */
export function sameName(level: FactoryLevel, a: string, b: string): boolean {
  const wa = wordsOf(a).join(' '), wb = wordsOf(b).join(' ');
  if (wa === wb) return true;
  /* "Line 2" and "line two" are one line; "Packaging Line 1" and "Packaging Line 2" are two (lineKey keeps only twelve letters) */
  const numbered = (x: string) => /^(line\s+)?(\d+[a-z]?|[a-z]+)$/i.test(x.trim());
  return level === 'line' && numbered(a) && numbered(b) && !!lineKeyOf(a) && lineKeyOf(a) === lineKeyOf(b);
}

const bodyOf = (d: Pick<ColleagueDraft, 'factory'>): FactoryDraftBody => d.factory ?? { client: { value: '', how: 'reported', at: 0 }, nodes: [] };
export const childrenOf = (b: FactoryDraftBody, id: string | undefined): FactoryNode[] => b.nodes.filter(n => n.parent === id);
export const nodeById = (b: FactoryDraftBody, id: string | undefined): FactoryNode | undefined => (id ? b.nodes.find(n => n.id === id) : undefined);

/** Where a node sits: its site, area and line names (each '' when it has none). */
export function pathOf(b: FactoryDraftBody, n: FactoryNode): { site: string; area: string; line: string } {
  const out = { site: '', area: '', line: '' };
  let cur: FactoryNode | undefined = n;
  while (cur) {
    if (cur.level !== 'machine') out[cur.level] = cur.name.value;
    cur = nodeById(b, cur.parent);
  }
  return out;
}

/* ------------------------------------------------------------------ the operations */

export type FactoryOpKind = 'add' | 'set' | 'rename' | 'move' | 'remove' | 'keep' | 'leave_out' | 'pick';
export interface FactoryOp {
  op: FactoryOpKind;
  level: FactoryLevel;
  name: string;
  /** The node's own id (from draft_state, or the panel) — finds it whatever its name. */
  id?: string;
  /** Which one, when the name alone is not enough: a machine's line, a line's area, an area's site. */
  of?: string;
  /** add / move: where it sits — the names of its site, area and line (a parent named here and not in the draft is added, as said). */
  site?: string;
  area?: string;
  line?: string;
  /** rename: the new name. */
  to?: string;
  /** add / set: a machine's facts. */
  kind?: string;
  model?: string;
  serial?: string;
  maker?: string;
  /** pick: which value is taken where it differs from what Faultline holds. */
  field?: FactoryField | 'site' | 'area';
  take?: 'recorded' | 'new';
  /** The person's words, as said. */
  said?: string;
}
/** How every value of one call is known: said in a conversation, or read from a document (with the words of each op). */
export interface FactoryHow { how: 'reported' | 'document'; source: Omit<FactorySource, 'quote'>; quoteOf?: (op: FactoryOp) => string | undefined }

const fact = (value: string, how: FactoryHow, op: FactoryOp, now: number): FactoryFact => {
  const quote = how.quoteOf?.(op);
  const said = op.said?.trim().slice(0, 300);
  return { value: value.trim().slice(0, 160), how: how.how, ...(said && how.how === 'reported' ? { said } : {}), source: { ...how.source, ...(quote ? { quote: quote.slice(0, 600) } : said && how.how === 'reported' ? { quote: said } : {}) }, at: now };
};
const corrected = (was: FactoryFact | undefined, next: FactoryFact): FactoryFact => {
  if (!was) return next;
  if (was.value === next.value) return was;
  const { earlier, ...plainWas } = was;
  return { ...next, earlier: [...(earlier ?? []), plainWas].slice(-10) };
};

/** A node found by its level and name — `of` its line (a machine), area or site — among the live ones (left-out kept findable). */
export function findNode(b: FactoryDraftBody, level: FactoryLevel, name: string, of?: string): FactoryNode[] {
  return b.nodes.filter(n => n.level === level && sameName(level, n.name.value, name)
    && (!of || (() => { const p = nodeById(b, n.parent); return !!p && sameName(p.level, p.name.value, of); })()));
}

export interface OpsResult { body: FactoryDraftBody; done: string[]; refused: string[] }

/** A parent named on an op — found, or added (it was said in the same breath). Returns its id, or undefined with no parent. */
function parentFor(b: FactoryDraftBody, op: FactoryOp, level: FactoryLevel, how: FactoryHow, now: number, review: FactoryNode['review'], newId: () => string): { id?: string; why?: string; nodes: FactoryNode[] } {
  let nodes = b.nodes;
  const ensure = (lv: 'site' | 'area' | 'line', name: string | undefined, under: string | undefined): string | undefined => {
    if (!name?.trim()) return under;
    const hit = nodes.find(n => n.level === lv && sameName(lv, n.name.value, name) && (under === undefined || n.parent === under || (lv === 'line' && !n.parent)));
    if (hit) return hit.id;
    const node: FactoryNode = { id: newId(), level: lv, ...(under ? { parent: under } : {}), name: fact(name, how, op, now), ...(review ? { review } : {}) };
    nodes = [...nodes, node];
    return node.id;
  };
  const wants: ('site' | 'area' | 'line')[] = level === 'machine' ? ['site', 'area', 'line'] : level === 'line' ? ['site', 'area'] : level === 'area' ? ['site'] : [];
  if (level === 'machine' && !op.line?.trim()) return { why: `“${op.name}” — a machine is on a line, always: say which line it is on.`, nodes };
  let at: string | undefined;
  for (const lv of wants) at = ensure(lv, op[lv], at);
  return { id: at, nodes };
}

const machineFacts = (op: FactoryOp, how: FactoryHow, now: number, was?: FactoryNode['facts']): FactoryNode['facts'] => {
  const out = { ...(was ?? {}) };
  for (const f of FACTORY_FIELDS) {
    const v = op[f]?.trim();
    if (!v) continue;
    const value = f === 'kind' ? kindWord(v) : v;
    out[f] = corrected(out[f], fact(value, how, op, now));
  }
  return out;
};

/** A node given new facts: unchanged when they are the same; otherwise a node made already is opened again (its record is matched
 *  by its name, so it is updated, never doubled), and a document's new facts on it wait for the person's word. */
function reopened(n: FactoryNode, facts: FactoryNode['facts'], how: FactoryHow): FactoryNode {
  if (JSON.stringify(facts ?? {}) === JSON.stringify(n.facts ?? {})) return n;
  if (!n.made) return { ...n, ...(facts ? { facts } : {}) };
  const { made: _made, ...rest } = n;
  void _made;
  return { ...rest, ...(facts ? { facts } : {}), ...(how.how === 'document' ? { review: 'pending' as const } : {}) };
}

/** APPLY — each operation on the draft, in order, with how it is known; what was done and what was refused, in words. Pure. */
export function applyFactoryOps(body0: FactoryDraftBody, ops: readonly FactoryOp[], how: FactoryHow, now: number, newId: () => string): OpsResult {
  let b: FactoryDraftBody = { ...body0, nodes: [...body0.nodes] };
  const done: string[] = [], refused: string[] = [];
  const review: FactoryNode['review'] = how.how === 'document' ? 'pending' : undefined;
  const one = (op: FactoryOp): FactoryNode | string => {
    if (op.id) { const n = b.nodes.find(x => x.id === op.id); return n ?? `There is no ${LEVEL_WORD[op.level]} with that id in the draft.`; }
    const hits = findNode(b, op.level, op.name, op.of ?? (op.level === 'machine' && op.op !== 'move' ? op.line : undefined));
    if (!hits.length) return `There is no ${LEVEL_WORD[op.level]} “${op.name}”${op.of ? ` of ${op.of}` : ''} in the draft.`;
    if (hits.length > 1) return `More than one ${LEVEL_WORD[op.level]} is called “${op.name}” — say which by its ${op.level === 'machine' ? 'line' : op.level === 'line' ? 'area' : 'site'} (“of”).`;
    return hits[0];
  };
  const put = (n: FactoryNode) => { b = { ...b, nodes: b.nodes.map(x => (x.id === n.id ? n : x)) }; };
  for (const op of ops) {
    const name = op.name?.trim();
    if (!name) { refused.push('Each thing needs its name, as said — nothing is named for you.'); continue; }
    switch (op.op) {
      case 'add': {
        const p = parentFor(b, op, op.level, how, now, review, newId);
        if (p.why) { refused.push(p.why); continue; }
        b = { ...b, nodes: p.nodes };
        const same = b.nodes.find(n => n.level === op.level && sameName(op.level, n.name.value, name) && (n.parent ?? '') === (p.id ?? ''));
        if (same) {
          const facts = op.level === 'machine' ? machineFacts(op, how, now, same.facts) : same.facts;
          /* something already made, said again with new facts, is compared with its record afresh — and when the new facts come
             from a document, they wait for the person's word */
          put(reopened(same, facts, how));
          done.push(`${name} was already in the draft${op.level === 'machine' && FACTORY_FIELDS.some(f => op[f]) ? ' — its facts kept' : ''}`);
          continue;
        }
        const node: FactoryNode = {
          id: newId(), level: op.level, ...(p.id ? { parent: p.id } : {}), name: fact(name, how, op, now),
          ...(op.level === 'machine' ? { facts: machineFacts(op, how, now) } : {}), ...(review ? { review } : {}),
        };
        b = { ...b, nodes: [...b.nodes, node] };
        done.push(`added the ${LEVEL_WORD[op.level]} ${name}`);
        continue;
      }
      case 'set': {
        const n = one(op);
        if (typeof n === 'string') { refused.push(n); continue; }
        if (n.level !== 'machine') { refused.push(`Only a machine has a kind, model, serial and maker — “${name}” is a ${LEVEL_WORD[n.level]}.`); continue; }
        if (!FACTORY_FIELDS.some(f => op[f]?.trim())) { refused.push(`Say what is set on “${name}”: its kind, model, serial or maker.`); continue; }
        put(reopened(n, machineFacts(op, how, now, n.facts), how));
        done.push(`${name}: ${FACTORY_FIELDS.filter(f => op[f]?.trim()).map(f => `${FIELD_WORD[f]} ${f === 'kind' ? kindWord(op[f] as string) : op[f]?.trim()}`).join(', ')}`);
        continue;
      }
      case 'rename': {
        const n = one(op);
        if (typeof n === 'string') { refused.push(n); continue; }
        if (!op.to?.trim()) { refused.push(`Say what “${name}” is to be called.`); continue; }
        if (n.made) { refused.push(`“${name}” is a record now — rename it on its own page in Faultline.`); continue; }
        put({ ...n, name: corrected(n.name, fact(op.to, how, op, now)) });
        done.push(`${name} is now called ${op.to.trim()}`);
        continue;
      }
      case 'move': {
        const n = one(op);
        if (typeof n === 'string') { refused.push(n); continue; }
        if (n.made) { refused.push(`“${name}” is a record now — move it on its own page in Faultline.`); continue; }
        if (n.level === 'site') { refused.push('A site sits under the client — there is nowhere to move it.'); continue; }
        const p = parentFor(b, { ...op, ...(n.level === 'machine' && !op.line ? { line: '' } : {}) }, n.level, how, now, review, newId);
        if (p.why) { refused.push(p.why); continue; }
        if (!p.id && n.level === 'area' && !op.site) { refused.push(`Say where “${name}” moves to.`); continue; }
        b = { ...b, nodes: p.nodes };
        put({ ...n, ...(p.id ? { parent: p.id } : {}) });
        done.push(`${name} moved to ${[op.site, op.area, op.line].filter(Boolean).join(' › ')}`);
        continue;
      }
      case 'remove': {
        const n = one(op);
        if (typeof n === 'string') { refused.push(n); continue; }
        if (n.made) { refused.push(`“${name}” is a record now — nothing in Faultline is deleted from a conversation.`); continue; }
        const gone = new Set([n.id]);
        let grew = true;
        while (grew) { grew = false; for (const x of b.nodes) if (x.parent && gone.has(x.parent) && !gone.has(x.id)) { gone.add(x.id); grew = true; } }
        b = { ...b, nodes: b.nodes.filter(x => !gone.has(x.id)) };
        done.push(`took ${name} off the draft${gone.size > 1 ? ` with the ${gone.size - 1} under it` : ''}`);
        continue;
      }
      case 'keep': case 'leave_out': {
        const n = one(op);
        if (typeof n === 'string') { refused.push(n); continue; }
        if (!n.review) { refused.push(`“${name}” was said in the conversation — it needs no keeping.`); continue; }
        if (op.op === 'keep') {
          /* kept, and what it sits in kept with it — a machine kept is kept on its line */
          let cur: FactoryNode | undefined = n;
          while (cur) { if (cur.review === 'pending' || cur.id === n.id) put({ ...cur, review: 'kept' }); cur = nodeById(b, cur.parent); }
        } else {
          /* left out, and everything under it with it */
          const gone = new Set([n.id]);
          let grew = true;
          while (grew) { grew = false; for (const x of b.nodes) if (x.parent && gone.has(x.parent) && !gone.has(x.id)) { gone.add(x.id); grew = true; } }
          for (const x of b.nodes) if (gone.has(x.id) && x.review && !x.made) put({ ...x, review: 'out' });
        }
        done.push(`${op.op === 'keep' ? 'kept' : 'left out'} ${name}`);
        continue;
      }
      case 'pick': {
        const n = one(op);
        if (typeof n === 'string') { refused.push(n); continue; }
        if (!op.field || !op.take) { refused.push(`Say which value of “${name}” to take — the field and recorded or new.`); continue; }
        put({ ...n, picks: { ...(n.picks ?? {}), [op.field]: op.take } });
        done.push(`${name}: the ${op.take === 'recorded' ? 'recorded' : 'new'} ${FIELD_WORD[op.field]} taken`);
        continue;
      }
    }
  }
  return { body: b, done, refused };
}

/* ------------------------------------------------------------------ the draft against what Faultline holds */

export interface FactoryExisting { lines: readonly Workspace[]; assets: readonly Asset[]; jobLines?: readonly JobLine[] }
export interface Side { value: string; said: string }
export interface Conflict { field: FactoryField | 'site' | 'area'; recorded: Side; offered: Side; pick?: 'recorded' | 'new' }
export interface ViewNode {
  node: FactoryNode;
  path: { site: string; area: string; line: string };
  /** What it is in Faultline already — a line or a machine record (matched, never doubled). */
  match?: { id?: string; name: string; lineId?: string };
  state: 'new' | 'in-faultline' | 'made' | 'pending' | 'out' | 'replaced';
  conflicts: Conflict[];
  /** In words: a document older than a recorded change; a machine replaced since. */
  flags: string[];
  children: ViewNode[];
}
export interface FactoryView {
  client: string;
  roots: ViewNode[];
  all: ViewNode[];
  counts: { newLines: number; matchedLines: number; newMachines: number; matchedMachines: number; pending: number; conflicts: number; made: number };
  /** Sites with no line and no department yet — held on the draft until one is made in them. */
  held: string[];
  /** Areas with no line (10 November, docs/FACTORY-WALK.md): made as departments of their own — Dispatch with nothing under it. */
  departments: { name: string; site?: string; said: string; node: string }[];
  blockers: string[];
}

const dayMs = (day?: string): number | undefined => (day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? Date.parse(`${day}T00:00:00Z`) : undefined);
const dayWord = (t: number): string => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const sideOf = (f: FactoryFact): Side => ({
  value: f.value,
  said: f.how === 'document' ? `From ${f.source?.label ?? 'a document'}${f.source?.day ? ` (dated ${dayWord(dayMs(f.source.day) as number)})` : ''}${f.source?.quote ? `: “${f.source.quote.slice(0, 120)}”` : ''}`
    : `Said in this conversation${f.said ? `: “${f.said.slice(0, 120)}”` : ''}, ${dayWord(f.at)}`,
});
const norm = (field: FactoryField | 'site' | 'area', v: string) => (field === 'kind' ? kindWord(v).toLowerCase() : v.trim().toLowerCase().replace(/\s+/g, ' '));
const RECORD_FIELD: Record<FactoryField, 'kind' | 'model' | 'serial' | 'oem'> = { kind: 'kind', model: 'model', serial: 'serial', maker: 'oem' };

/** THE DRAFT SEEN AGAINST FAULTLINE — only this client's lines (a line that names no client is never another client's either). */
export function factoryView(d: Pick<ColleagueDraft, 'factory'>, ex: FactoryExisting): FactoryView {
  const b = bodyOf(d);
  const client = b.client.value.trim();
  const map = factoryMap(ex.lines, ex.assets, { client, jobLines: ex.jobLines ?? [] });
  const lines = mapLines(map);
  const records = ex.assets.filter(a => !a.deletedAt && !a.mergedInto);
  const all: ViewNode[] = [];
  const view = (n: FactoryNode): ViewNode => {
    const path = pathOf(b, n);
    const conflicts: Conflict[] = [], flags: string[] = [];
    let match: ViewNode['match'];
    let replaced = false;
    const docDay = (f?: FactoryFact) => (f?.how === 'document' ? dayMs(f.source?.day) : undefined);
    if (n.level === 'line') {
      const l = n.made ? lines.find(x => x.id === n.made?.id) : lines.find(x => sameName('line', x.name, n.name.value));
      if (l) {
        match = { id: l.id, name: l.name };
        for (const field of ['site', 'area'] as const) {
          const offered = path[field], recorded = l[field];
          if (!n.made && offered && recorded && norm(field, offered) !== norm(field, recorded)) {
            const w = ex.lines.find(x => x.id === l.id);
            conflicts.push({ field, recorded: { value: recorded, said: howSaid(w?.known, field === 'site' ? 'siteName' : 'areaName', recorded) }, offered: { value: offered, said: sideOf(n.name).said }, ...(n.picks?.[field] ? { pick: n.picks[field] } : {}) });
          }
        }
      }
    }
    if (n.level === 'machine') {
      const parentLine = nodeById(b, n.parent);
      const lineMatch = parentLine ? (parentLine.made ? lines.find(x => x.id === parentLine.made?.id) : lines.find(x => sameName('line', x.name, parentLine.name.value))) : undefined;
      if (lineMatch) {
        const m = lineMatch.machines.find(x => (n.made ? x.id === n.made.id : machineKey(x.name) === machineKey(n.name.value)));
        const rec = m?.id ? records.find(a => a.id === m.id) : undefined;
        if (m) {
          match = { ...(m.id ? { id: m.id } : {}), name: m.name, lineId: lineMatch.id };
          if (!n.made) for (const f of FACTORY_FIELDS) {
            const offered = n.facts?.[f];
            const rv = (rec?.[RECORD_FIELD[f]] ?? '').trim();
            if (!offered || !rv || norm(f, offered.value) === norm(f, rv)) continue;
            conflicts.push({ field: f, recorded: { value: rv, said: howSaid(rec?.known, RECORD_FIELD[f], rv) }, offered: sideOf(offered), ...(n.picks?.[f] ? { pick: n.picks[f] } : {}) });
            const dd = docDay(offered), changed = rec?.known?.[RECORD_FIELD[f]]?.at;
            if (dd !== undefined && changed !== undefined && changed > dd) flags.push(`${offered.source?.label ?? 'The document'} is dated ${dayWord(dd)}, but the ${m.name}’s ${FIELD_WORD[f]} was recorded on ${dayWord(changed)} — check it before taking the document’s.`);
          }
        } else if (!n.made) {
          const gone = replacedOf(lineMatch.id, n.name.value, ex.assets);
          if (gone) {
            replaced = true;
            const dd = docDay(n.name);
            const on = gone.on ? ` on ${gone.on}` : '';
            flags.push(dd !== undefined
              ? `${n.name.source?.label ?? 'The document'} (dated ${dayWord(dd)}) names ${n.name.value}, which was replaced by ${gone.by.name}${on} — it is out of date here.`
              : `${n.name.value} was replaced by ${gone.by.name}${on} — ${n.name.how === 'document' ? 'the document is out of date here' : 'it is not on the line any more'}.`);
          }
        }
      }
    }
    const kids = childrenOf(b, n.id).map(view);
    const state: ViewNode['state'] = n.made ? 'made' : n.review === 'out' ? 'out' : replaced ? 'replaced' : n.review === 'pending' ? 'pending' : match ? 'in-faultline' : 'new';
    const v: ViewNode = { node: n, path, ...(match ? { match } : {}), state, conflicts, flags, children: kids };
    all.push(v);
    return v;
  };
  const roots = b.nodes.filter(n => !n.parent || !nodeById(b, n.parent)).map(view);
  const live = all.filter(v => v.state !== 'out');
  const emptyAreas = live.filter(v => v.node.level === 'area' && v.state !== 'pending' && v.state !== 'made' && !hasLine(v));
  const departments = emptyAreas.map(v => ({ name: v.node.name.value, ...(v.path.site ? { site: v.path.site } : {}), said: v.path.site ? `${v.node.name.value} (${v.path.site})` : v.node.name.value, node: v.node.id }));
  const held = live.filter(v => v.node.level === 'site' && !hasLine(v) && !emptyAreas.some(a => a.path.site === v.node.name.value)).map(v => v.node.name.value);
  const pending = all.filter(v => v.state === 'pending').length;
  const open = all.filter(v => v.state !== 'out' && v.state !== 'replaced' && v.state !== 'made').flatMap(v => v.conflicts.filter(c => !c.pick).map(c => ({ v, c })));
  const blockers = [
    ...(!client ? ['The client is not said yet.'] : []),
    ...(pending ? [`${pending} thing${pending === 1 ? '' : 's'} read from a document wait${pending === 1 ? 's' : ''} for your word — keep or leave out each.`] : []),
    ...open.map(({ v, c }) => `${v.node.name.value}: Faultline holds ${FIELD_WORD[c.field]} “${c.recorded.value}”, ${c.offered.said.startsWith('From') ? 'the document says' : 'you said'} “${c.offered.value}” — pick which.`),
  ];
  const isLine = (v: ViewNode) => v.node.level === 'line' && v.state !== 'out' && v.state !== 'pending';
  return {
    client, roots, all,
    counts: {
      newLines: all.filter(v => isLine(v) && v.state === 'new').length,
      matchedLines: all.filter(v => isLine(v) && v.state === 'in-faultline').length,
      newMachines: all.filter(v => v.node.level === 'machine' && v.state === 'new').length,
      matchedMachines: all.filter(v => v.node.level === 'machine' && v.state === 'in-faultline').length,
      pending, conflicts: open.length, made: all.filter(v => v.state === 'made').length,
    },
    held, departments, blockers,
  };
}
function hasLine(v: ViewNode): boolean { return v.children.some(c => c.state !== 'out' && (c.node.level === 'line' || hasLine(c))); }

/** What still holds Make it — in words. Empty: it can be made. */
export const factoryBlockers = (v: FactoryView): string[] => v.blockers;

/** What Make it would do now, as a list of the things it makes (lines and machines not made yet, not left out, not replaced). */
export function toMake(v: FactoryView): { lines: ViewNode[]; machines: ViewNode[]; updates: ViewNode[] } {
  /* a machine is made only on a line that is made, or already in Faultline */
  const onLine = (x: ViewNode) => { const p = v.all.find(y => y.node.id === x.node.parent); return !!p && (p.state === 'new' || p.state === 'in-faultline' || p.state === 'made'); };
  return {
    lines: v.all.filter(x => x.node.level === 'line' && x.state === 'new'),
    machines: v.all.filter(x => x.node.level === 'machine' && x.state === 'new' && onLine(x)),
    /* a line or machine already in Faultline: only what it lacks, or what the person picked, is written to it */
    updates: v.all.filter(x => (x.node.level === 'line' || x.node.level === 'machine') && x.state === 'in-faultline'),
  };
}

/* ------------------------------------------------------------------ in words */

const factWord = (f: FactoryFact): string => `${f.value} (${f.how === 'document' ? `from ${f.source?.label ?? 'a document'}` : 'reported'})`;

/** The draft as the colleague is told it — the tree, each thing with how it is known; no comparison (that is draft_state's). */
export function factoryDraftSaid(d: ColleagueDraft): string {
  const b = bodyOf(d);
  const say = (n: FactoryNode, depth: number): string[] => {
    const facts = n.level === 'machine' ? FACTORY_FIELDS.filter(f => n.facts?.[f]).map(f => `${FIELD_WORD[f]} ${factWord(n.facts?.[f] as FactoryFact)}`) : [];
    const mark = n.made ? ' [made]' : n.review === 'pending' ? ' [from a document, waiting for the person’s word]' : n.review === 'out' ? ' [left out]' : '';
    return [`${'  '.repeat(depth)}${LEVEL_WORD[n.level]} ${n.name.value}${facts.length ? ` — ${facts.join('; ')}` : ''}${mark}`, ...childrenOf(b, n.id).flatMap(c => say(c, depth + 1))];
  };
  const tree = b.nodes.filter(n => !n.parent || !nodeById(b, n.parent)).flatMap(n => say(n, 1));
  return [`${d.title} (${FACTORY_TOOL} for ${b.client.value || 'a client not said yet'}, ${d.status === 'made' ? 'made in part or whole' : 'draft'}).`,
    tree.length ? `As said:\n${tree.join('\n')}` : 'Nothing said of it yet.'].join(' ');
}
