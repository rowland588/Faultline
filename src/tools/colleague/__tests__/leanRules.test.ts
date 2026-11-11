/* THE RULES, TRIMMED — ASSIST_COLLEAGUE_SYSTEM=lean (11 November, docs/AI-MODE.md "Sending less a turn"). Each line cut from
 * COLLEAGUE_SYSTEM is listed in COLLEAGUE_LEAN_CUTS with the capabilities whose own descriptions still say it; no safety rule
 * is cut. `full` (the default) is COLLEAGUE_SYSTEM word for word. */
import { describe, expect, it } from 'vitest';
import { CAPABILITY_SCHEMAS } from '../../../capabilities/schemas';
import {
  COLLEAGUE_LEAN_CUTS, COLLEAGUE_SYSTEM, COLLEAGUE_SYSTEM_LEAN, colleagueSystemFor, colleagueSystemMode,
} from '../colleagueAssist';

const tokens = (chars: number): number => Math.round(chars / 4);

describe('ASSIST_COLLEAGUE_SYSTEM', () => {
  it('reads the switch, full unless it says lean', () => {
    expect(colleagueSystemMode(undefined)).toBe('full');
    expect(colleagueSystemMode('x')).toBe('full');
    expect(colleagueSystemMode('lean')).toBe('lean');
    expect(colleagueSystemFor('all')).toBe(COLLEAGUE_SYSTEM);
    expect(colleagueSystemFor('all', 'full')).toBe(COLLEAGUE_SYSTEM);
    expect(colleagueSystemFor('all', 'lean')).toBe(COLLEAGUE_SYSTEM_LEAN);
    expect(colleagueSystemFor('search', 'lean').startsWith(COLLEAGUE_SYSTEM_LEAN)).toBe(true);
  });

  it('each cut names exactly one line of the rules, and capabilities that exist', () => {
    const lines = COLLEAGUE_SYSTEM.split('\n');
    const names = new Set(CAPABILITY_SCHEMAS.map(s => s.name));
    for (const c of COLLEAGUE_LEAN_CUTS) {
      expect(lines.filter(l => l.startsWith(c.starts)).length, c.starts).toBe(1);
      expect(c.livesIn.length, c.starts).toBeGreaterThan(0);
      for (const n of c.livesIn) expect(names.has(n), `${c.starts} → ${n}`).toBe(true);
      /* a line put in its place is shorter than the line it replaces */
      if (c.put) expect(c.put.length, c.starts).toBeLessThan(lines.find(l => l.startsWith(c.starts))!.length);
    }
  });

  it('what a cut says is said by the capability it lives in', () => {
    const desc = (n: string) => CAPABILITY_SCHEMAS.find(s => s.name === n)!.description;
    /* spot checks: the words that carried the rule are in the description that still carries it */
    expect(desc('query_workbook')).toMatch(/every figure about the workbook comes from here/);
    expect(desc('query_data')).toMatch(/A value not recorded is never zero/);
    expect(desc('join_results')).toMatch(/never matched by a near spelling/);
    expect(desc('make_chart')).toMatch(/never from words/);
    expect(desc('build_report')).toMatch(/A recommendation is a view/);
    expect(desc('name_source')).toMatch(/Describe only what source_fields showed/);
    expect(desc('work_within')).toMatch(/Consequential steps .* still ask every time/);
    expect(desc('file_photo')).toMatch(/never guess an uncertain relationship/);
    expect(desc('fill_draft')).toMatch(/A value given again for a field is a correction/);
    expect(desc('add_to_factory_draft')).toMatch(/Run resolve first/);
    expect(desc('start_measurement')).toMatch(/ONLY when said — never judge it/);
    expect(desc('handover_state')).toMatch(/never assumed/);
    expect(desc('tool_intel')).toMatch(/1 by conversation, 2 by conversation with evidence/);
    expect(desc('remember_preference')).toMatch(/They see a card and decide/);
  });

  it('no safety rule is cut', () => {
    for (const rule of [
      'You never delete anything and never mark anything verified',
      'You never invent, estimate or calculate a figure',
      'never do arithmetic in your head',
      'nothing is changed until they confirm',
      'Never present reported, counted or imported figures as measured',
      'never add one kind into another',
      'Frequency is not duration',
      'never read, quote or count another customer\'s',
      'Never use one client\'s notebook for another',
      'Another client\'s factory is never looked at',
      'Never treat a yes to one thing as a yes to another',
      'observed, never verified',
      'must never say you did',
      'Never turn a report into a fact, or a hypothesis into a cause',
      'Never explain a change by guessing a cause',
      'EVERY FIGURE YOU WRITE IS CHECKED',
      'never take one from another client',
    ]) expect(COLLEAGUE_SYSTEM_LEAN, rule).toContain(rule);
    /* every capability the full rules name, the lean rules still name or its line lives in it */
    const named = (t: string) => new Set(CAPABILITY_SCHEMAS.map(s => s.name).filter(n => new RegExp(`\\b${n}\\b`).test(t)));
    const full = named(COLLEAGUE_SYSTEM), lean = named(COLLEAGUE_SYSTEM_LEAN);
    const lives = new Set(COLLEAGUE_LEAN_CUTS.flatMap(c => c.livesIn));
    for (const n of full) expect(lean.has(n) || lives.has(n), n).toBe(true);
  });

  it('prints the size before and after', () => {
    const before = COLLEAGUE_SYSTEM.length, after = COLLEAGUE_SYSTEM_LEAN.length;
    console.log(`colleague rules: full ${before} chars ≈ ${tokens(before)} tokens; lean ${after} chars ≈ ${tokens(after)} tokens; ${before - after} chars (≈ ${tokens(before - after)} tokens, ${Math.round((1 - after / before) * 100)}%) less, ${COLLEAGUE_LEAN_CUTS.length} lines cut or shortened`);
    expect(after).toBeLessThan(before);
  });
});
