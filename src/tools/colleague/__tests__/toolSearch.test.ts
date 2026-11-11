/* WHAT ONE TURN SENDS — the gateway's switch ASSIST_COLLEAGUE_TOOLS (11 November, docs/AI-MODE.md "Sending less a turn";
 * docs/LUNA-EVAL.md §3). `all` (the default) sends every capability's schema as before; `search` sends the API's tool search
 * with a core loaded and the rest deferred. Either way every call is held to ALL the schemas. */
import { describe, expect, it } from 'vitest';
import { CAPABILITY_SCHEMAS } from '../../../capabilities/schemas';
import {
  COLLEAGUE_CORE, COLLEAGUE_SYSTEM, checkCalls, colleagueMessages, colleagueSystemFor, colleagueTools, colleagueToolsFor,
  colleagueToolsMode, readCarry, readColleagueAsk, type ColleagueBlock,
} from '../colleagueAssist';

const size = (v: unknown): number => JSON.stringify(v).length;
const tokens = (chars: number): number => Math.round(chars / 4);

describe('ASSIST_COLLEAGUE_TOOLS', () => {
  it('reads the switch, all unless it says search', () => {
    expect(colleagueToolsMode(undefined)).toBe('all');
    expect(colleagueToolsMode('')).toBe('all');
    expect(colleagueToolsMode('ALL')).toBe('all');
    expect(colleagueToolsMode('nonsense')).toBe('all');
    expect(colleagueToolsMode('search')).toBe('search');
    expect(colleagueToolsMode('search-bm25')).toBe('search-bm25');
  });

  it('off (all) sends exactly what it sends today — the same tools, the same rules', () => {
    expect(colleagueToolsFor(CAPABILITY_SCHEMAS, 'all')).toEqual(colleagueTools(CAPABILITY_SCHEMAS));
    expect(colleagueSystemFor('all')).toBe(COLLEAGUE_SYSTEM);
    const tools = colleagueToolsFor(CAPABILITY_SCHEMAS, 'all');
    expect(tools.some(t => 'type' in t || 'defer_loading' in t)).toBe(false);
  });

  it('every core capability is one of the schemas', () => {
    const names = new Set(CAPABILITY_SCHEMAS.map(s => s.name));
    for (const n of COLLEAGUE_CORE) expect(names.has(n), n).toBe(true);
    expect(new Set(COLLEAGUE_CORE).size).toBe(COLLEAGUE_CORE.length);
  });

  it('on (search): the tool search first, the core loaded with the cache mark on its last, every other capability deferred', () => {
    const tools = colleagueToolsFor(CAPABILITY_SCHEMAS, 'search');
    /* the request shape: the regex tool search, stable on claude-opus-5-5 — no beta header asked for it */
    expect(tools[0]).toEqual({ type: 'tool_search_tool_regex_20251119', name: 'tool_search_tool_regex' });
    const rest = tools.slice(1) as { name: string; defer_loading?: true; cache_control?: unknown; description: string; input_schema: object }[];
    const loaded = rest.filter(t => !t.defer_loading), deferred = rest.filter(t => t.defer_loading);
    expect(loaded.map(t => t.name).sort()).toEqual([...COLLEAGUE_CORE].sort());
    /* loaded before deferred, so the cached prefix ends on the last loaded tool */
    expect(rest.slice(0, loaded.length).every(t => !t.defer_loading)).toBe(true);
    expect(loaded.filter(t => t.cache_control).map(t => t.name)).toEqual([loaded[loaded.length - 1].name]);
    /* a deferred tool never carries the cache mark (the API refuses it) */
    expect(deferred.some(t => 'cache_control' in t)).toBe(false);
    /* nothing lost: every schema is sent, word for word */
    expect(rest.length).toBe(CAPABILITY_SCHEMAS.length);
    for (const s of CAPABILITY_SCHEMAS) {
      const t = rest.find(x => x.name === s.name)!;
      expect(t.description).toBe(s.description);
      expect(t.input_schema).toEqual(s.input_schema);
    }
    expect(colleagueToolsFor(CAPABILITY_SCHEMAS, 'search-bm25')[0]).toEqual({ type: 'tool_search_tool_bm25_20251119', name: 'tool_search_tool_bm25' });
  });

  it('on (search): the rules are today’s with how a capability is loaded after them', () => {
    const s = colleagueSystemFor('search');
    expect(s.startsWith(COLLEAGUE_SYSTEM)).toBe(true);
    expect(s).toContain('tool_search_tool_regex');
    expect(colleagueSystemFor('search-bm25')).toContain('tool_search_tool_bm25');
  });

  it('a capability found by search is checked as any other; a name not among the schemas is still refused', () => {
    const content: ColleagueBlock[] = [
      { type: 'server_tool_use', id: 'srvtoolu_1', name: 'tool_search_tool_regex', input: { pattern: 'query_workbook' } },
      { type: 'tool_search_tool_result', tool_use_id: 'srvtoolu_1', content: { type: 'tool_search_tool_search_result', tool_references: [{ type: 'tool_reference', tool_name: 'workbook_rows' }] } },
      { type: 'tool_use', id: 't1', name: 'workbook_rows', input: { sheet: 'Downtime' } },
      { type: 'tool_use', id: 't2', name: 'delete_line', input: {} },
    ];
    const r = checkCalls(content, CAPABILITY_SCHEMAS);
    /* the server's own search is never a call of ours */
    expect(r.calls.map(c => c.name)).not.toContain('tool_search_tool_regex');
    expect(r.refused.map(x => x.name)).toContain('delete_line');
    expect(r.refused.find(x => x.name === 'delete_line')!.why).toMatch(/not one of your capabilities/);
    /* workbook_rows is deferred under search but still one of the schemas: judged by its own schema */
    expect(COLLEAGUE_CORE as readonly string[]).not.toContain('workbook_rows');
    expect(r.refused.some(x => x.name === 'workbook_rows' && /not one of/.test(x.why))).toBe(false);
  });

  it('a round with a search in it is carried to the device and back as the API gave it, and sent back as it was', () => {
    const content: ColleagueBlock[] = [
      { type: 'text', text: 'Looking at the workbook.' },
      { type: 'server_tool_use', id: 'srvtoolu_1', name: 'tool_search_tool_regex', input: { pattern: 'workbook_profile' } },
      { type: 'tool_search_tool_result', tool_use_id: 'srvtoolu_1', content: { type: 'tool_search_tool_search_result', tool_references: [{ type: 'tool_reference', tool_name: 'workbook_profile' }] } },
      { type: 'tool_use', id: 't1', name: 'workbook_profile', input: {} },
    ];
    const carry = readCarry({ v: 1, rounds: [], content, refused: [] });
    expect(carry).not.toBeNull();
    const r = readColleagueAsk({ task: 'colleague', turns: [{ role: 'person', text: 'what is in it', at: '10:00' }], images: [], focus: '', today: 'x', pending: { assistant: carry, results: [{ id: 't1', ok: true, says: 'Three sheets.' }] } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const msgs = colleagueMessages(r.ask);
    const assistant = msgs[msgs.length - 2];
    expect(assistant.role).toBe('assistant');
    expect(assistant.content).toEqual(content);
    /* only our own call is answered — never the server's search */
    const results = msgs[msgs.length - 1].content as { tool_use_id: string }[];
    expect(results.map(b => b.tool_use_id)).toEqual(['t1']);
  });

  it('a round the API paused in (pause_turn) is sent back last, as it is, and the next joins it in one message', () => {
    const paused: ColleagueBlock[] = [{ type: 'server_tool_use', id: 'srvtoolu_1', name: 'tool_search_tool_regex', input: { pattern: 'pareto' } }];
    /* the gateway carries a paused round itself (it never goes to the device) */
    const r = readColleagueAsk({ task: 'colleague', turns: [{ role: 'person', text: 'rank the stops', at: '10:00' }], images: [], focus: '', today: 'x' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const msgs = colleagueMessages({ ...r.ask, pending: { carry: { v: 1, rounds: [], content: paused, refused: [] }, results: [] } });
    expect(msgs[msgs.length - 1]).toEqual({ role: 'assistant', content: paused });
    const next: ColleagueBlock[] = [{ type: 'tool_use', id: 't9', name: 'pareto', input: {} }];
    const r2 = readColleagueAsk({ task: 'colleague', turns: [{ role: 'person', text: 'rank the stops', at: '10:00' }], images: [], focus: '', today: 'x',
      pending: { assistant: { v: 1, rounds: [{ content: paused, results: [], refused: [] }], content: next, refused: [] }, results: [{ id: 't9', ok: true, says: 'Jams lead.' }] } });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    const m2 = colleagueMessages(r2.ask);
    expect(m2[m2.length - 2]).toEqual({ role: 'assistant', content: [...paused, ...next] });
    expect(m2[m2.length - 1].role).toBe('user');
  });

  it('prints what a turn sends either way', () => {
    const all = size(colleagueToolsFor(CAPABILITY_SCHEMAS, 'all'));
    const search = colleagueToolsFor(CAPABILITY_SCHEMAS, 'search');
    const loaded = size(search.filter(t => !('defer_loading' in t)));
    const sys = COLLEAGUE_SYSTEM.length, sysSearch = colleagueSystemFor('search').length;
    console.log(`colleague tools, all: ${CAPABILITY_SCHEMAS.length} schemas, ${all} chars ≈ ${tokens(all)} tokens`);
    console.log(`colleague tools, search: ${COLLEAGUE_CORE.length} loaded + the search tool, ${loaded} chars ≈ ${tokens(loaded)} tokens in context (${CAPABILITY_SCHEMAS.length - COLLEAGUE_CORE.length} deferred)`);
    console.log(`colleague system: ${sys} chars ≈ ${tokens(sys)} tokens; with the search note ${sysSearch} chars ≈ ${tokens(sysSearch)} tokens`);
    console.log(`a turn's tools + rules in context: all ≈ ${tokens(all + sys)} tokens, search ≈ ${tokens(loaded + sysSearch)} tokens`);
    expect(loaded).toBeLessThan(all / 2);
  });
});
