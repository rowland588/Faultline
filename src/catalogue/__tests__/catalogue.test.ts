/* THE CATALOGUE TELLS THE TRUTH ABOUT THE CODE (knowledge/README.md;
 * knowledge/STANDARD.md, "Done"). An entry called available names the files
 * that do it, the unit tests that prove its arithmetic and an acceptance
 * script that is in the gate — and each exists; a partial one says its
 * limits; a planned one has its specification; one left out says who
 * decided and why. Every tool on the rail has an entry, every method an entry
 * names is in the library, and knowledge/SUMMARY.md is what the entries say
 * today. So the directory can never list as working what does not work. */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ENTRIES, PROBLEMS, BACKLOG, entryById, searchEntries, searchProblems, summaryMarkdown } from '../index';
import { DISCIPLINES, SCENARIOS, STATUSES, type Entry } from '../types';
import { parseMethod } from '../methodRecord';
import { parseRoute } from '../../state/useRoute';
import { toolPlaces } from '../../ui/rail';
import { STUDY_TOOLS } from '../../lib/study';

const ROOT = join(__dirname, '..', '..', '..');
const at = (p: string) => join(ROOT, p);
const files = (dir: string): string[] => readdirSync(dir).flatMap(f => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : f.endsWith('.md') ? [p] : [];
});
const methods = files(at('knowledge/methods')).map(p => ({ p, ...parseMethod(readFileSync(p, 'utf8')) })).flatMap(x => (x.record ? [{ ...x.record, text: readFileSync(x.p, 'utf8') }] : []));
const METHOD_IDS = new Set(methods.map(m => m.id));
const GATE = readFileSync(at('CLAUDE.md'), 'utf8');
const bad = (pred: (e: Entry) => string | false) => ENTRIES.flatMap(e => { const why = pred(e); return why ? [`${e.id} ${e.name}: ${why}`] : []; });

describe('the catalogue', () => {
  it('has a stable, unique FC- number on every entry', () => {
    expect(bad(e => !/^FC-\d{3}$/.test(e.id) && 'id not FC-nnn')).toEqual([]);
    expect(new Set(ENTRIES.map(e => e.id)).size).toBe(ENTRIES.length);
  });

  it('places every entry in a discipline and subdiscipline, with a status, a form and known scenarios', () => {
    expect(bad(e => {
      const d = DISCIPLINES.find(x => x.id === e.discipline);
      if (!d) return `no discipline ${e.discipline}`;
      if (!d.subs[e.sub]) return `no subdiscipline ${e.sub} in ${d.id}`;
      if (!STATUSES.includes(e.status)) return `status ${e.status}`;
      const unknown = (e.scenarios ?? []).filter(s => !SCENARIOS[s]);
      return unknown.length ? `scenarios ${unknown.join(', ')}` : false;
    })).toEqual([]);
  });

  it('fills the twelve fields of every entry', () => {
    expect(bad(e => {
      const empty = (['name', 'problem', 'method', 'inputs', 'outputs', 'food', 'valueWhy'] as const).filter(k => !String(e[k] ?? '').trim());
      if (!e.questions.length) empty.push('questions' as never);
      return empty.length ? `empty: ${empty.join(', ')}` : false;
    })).toEqual([]);
  });

  it('links only to entries that exist, never to itself; a mode names what it is a mode of', () => {
    expect(bad(e => {
      const dangling = [...e.depends, ...(e.partOf ? [e.partOf] : [])].filter(id => !entryById(id) || id === e.id);
      if (dangling.length) return `links to ${dangling.join(', ')}`;
      return e.form === 'mode' && !e.partOf ? 'a mode with no partOf' : false;
    })).toEqual([]);
  });

  it('names knowledge records that exist — every entry but those left out has at least one', () => {
    expect(bad(e => {
      if (!e.methods.length && e.status !== 'left-out') return 'no knowledge record';
      const missing = e.methods.filter(m => !METHOD_IDS.has(m));
      return missing.length ? `no record ${missing.join(', ')}` : false;
    })).toEqual([]);
  });

  it('calls an entry available only when its code, unit tests and an acceptance script in the gate exist', () => {
    expect(bad(e => {
      if (e.status !== 'available') return false;
      const b = e.built;
      if (!b) return 'available with nothing built';
      if (!b.code.length) return 'available with no code named';
      if (!b.tests.length) return 'available with no unit test';
      if (!b.acceptance.length) return 'available with no acceptance script';
      return false;
    })).toEqual([]);
  });

  it('calls an entry partial only with its code named and its limits said', () => {
    expect(bad(e => e.status === 'partial' && (!e.built?.code.length ? 'partial with no code' : !(e.limits ?? []).length ? 'partial with no limits' : false))).toEqual([]);
  });

  it('gives nothing not built a built block, a planned entry its specification, a left-out one its decision', () => {
    expect(bad(e => {
      if ((e.status === 'to-build' || e.status === 'research') && e.built) return `${e.status} with a built block — is it partial?`;
      if (e.status === 'specified' && !(e.spec && existsSync(at(e.spec)))) return `specified with no spec on disc (${e.spec ?? 'none'})`;
      if (e.status === 'left-out' && !e.decided?.trim()) return 'left out with no decision';
      return false;
    })).toEqual([]);
  });

  it('names only files, tests and acceptance scripts that exist — and scripts that are in the gate', () => {
    expect(bad(e => {
      const b = e.built;
      if (!b) return false;
      const missing = [...b.code, ...b.tests].filter(p => !existsSync(at(p)));
      const scripts = b.acceptance.filter(a => !existsSync(at(`scripts/acceptance/${a}`)));
      const notGated = b.acceptance.filter(a => !GATE.includes(`scripts/acceptance/${a}`));
      return missing.length ? `missing ${missing.join(', ')}` : scripts.length ? `no script ${scripts.join(', ')}` : notGated.length ? `not in the gate: ${notGated.join(', ')}` : false;
    })).toEqual([]);
  });

  it('opens at routes the app knows', () => {
    expect(bad(e => {
      const unknown = (e.built?.where ?? []).filter(w => w !== '/room' && parseRoute(`#${w}`).name === 'home');
      return unknown.length ? `unknown route ${unknown.join(', ')}` : false;
    })).toEqual([]);
  });

  it('has an entry, available or partial, for every tool on the rail and every study tool with a screen', () => {
    const shown = ENTRIES.filter(e => e.status === 'available' || e.status === 'partial');
    const routes = new Set(shown.flatMap(e => e.built?.where ?? []));
    const rail = toolPlaces('').map(t => t.to).filter((t): t is string => !!t);
    expect(rail.filter(r => !routes.has(r))).toEqual([]);
    /* a study tool reserved with no screen (time, cycle, ergonomics, layout) is said honestly by the entries for its method */
    const screens: Record<string, string> = { capability: '/capability', map: '/value-stream', balance: '/linebalance', changeover: '/smed', losses: '/losses', sampling: '/sampling', reliability: '/reliability', talk: '/talk' };
    expect(STUDY_TOOLS.filter(t => screens[t] && !routes.has(screens[t]))).toEqual([]);
  });

  it('says the FC numbers a knowledge record mentions in "In Faultline" for entries that name that record', () => {
    const wrong = methods.flatMap(m => [...(m.sections['In Faultline'] ?? '').replace(/`[^`]*`/g, '').matchAll(/FC-\d{3}/g)].map(x => x[0])
      .filter(id => { const e = entryById(id); return !e || !e.methods.includes(m.id); })
      .map(id => `${m.id} mentions ${id}${entryById(id) ? `, which names ${entryById(id)?.methods.join(', ') || 'no record'}` : ', which does not exist'}`));
    expect(wrong).toEqual([]);
  });

  it('keeps the backlog to entries not yet available, each once, each with its reason', () => {
    expect(BACKLOG.filter(b => !entryById(b.id) || entryById(b.id)?.status === 'available' || !b.why.trim()).map(b => b.id)).toEqual([]);
    expect(new Set(BACKLOG.map(b => b.id)).size).toBe(BACKLOG.length);
  });

  it('routes every problem through entries that exist', () => {
    expect(PROBLEMS.flatMap(p => p.steps.flatMap(s => s.ids.filter(id => !entryById(id)).map(id => `${p.id}: ${id}`)))).toEqual([]);
    expect(new Set(PROBLEMS.map(p => p.id)).size).toBe(PROBLEMS.length);
  });

  it('finds a tool by the floor’s words, not its technical name', () => {
    expect(searchEntries('we are rejecting too many').slice(0, 5).map(e => e.id)).toContain('FC-098');
    expect(searchEntries('changeovers take too long')[0]?.id).toBe('FC-068');
    expect(searchEntries('giveaway').map(e => e.id)).toContain('FC-156');
    expect(searchEntries('FC-12').map(e => e.id)).toEqual(['FC-012']);
    expect(searchProblems('rejects')[0]?.id).toBe('rejects');
    expect(searchProblems('machine keeps stopping').map(p => p.id)).toContain('stops');
  });

  it('keeps knowledge/SUMMARY.md as the entries say today (node scripts/catalogue.mjs summary --write)', () => {
    expect(readFileSync(at('knowledge/SUMMARY.md'), 'utf8')).toBe(summaryMarkdown(methods.length));
  });
});

describe('the specifications', () => {
  const SPEC_HEADINGS = ['Purpose', 'Users and scenarios', 'Method selection', 'Inputs', 'Data suitability', 'Calculations', 'Outputs', 'Manufacturing usability', 'Failure handling', 'Integration', 'Verification', 'Maintainability'];
  const specs = readdirSync(at('knowledge/specs')).filter(f => f.endsWith('.md'));

  it('has the template, and every specification answers its twelve headings in order', () => {
    expect(specs).toContain('TEMPLATE.md');
    const wrong = specs.flatMap(f => {
      const text = readFileSync(at(`knowledge/specs/${f}`), 'utf8');
      const hs = [...text.matchAll(/^## (\d+)\. (.+)$/gm)].map(m => m[2].trim());
      return hs.join('|') === SPEC_HEADINGS.join('|') ? [] : [`${f}: headings ${hs.join(', ') || 'none'}`];
    });
    expect(wrong).toEqual([]);
  });

  it('names a specification for each catalogue entry it covers, and each exists', () => {
    const named = new Set(ENTRIES.flatMap(e => (e.spec ? [e.spec] : [])));
    expect([...named].filter(p => !existsSync(at(p)))).toEqual([]);
  });
});
