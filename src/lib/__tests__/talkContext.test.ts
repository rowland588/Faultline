/* WHAT LINE TALK IS TOLD ABOUT THE LINE (lib/talkContext): the line's own
 * sentences laid out under headings — nothing worked out — cut to a size, and
 * said in a line. */
import { describe, expect, it } from 'vitest';
import { contextSaid, talkContext, type TalkContextIn } from '../talkContext';
import type { SnagRow } from '../snagsReport';

const row = (n: number, extra: Partial<SnagRow> = {}): SnagRow => ({
  id: `s${n}`, workspaceId: 'w', line: 'Line 7', what: `Problem ${n}`, from: '', status: 'open', priority: 'high',
  word: 'Open · 4 days', tone: 'n', late: false, journey: [], raisedAt: n, ...extra,
});

const IN: TalkContextIn = {
  line: { name: 'Line 7', type: 'Tray line', shifts: 'Days 06:00–14:00 (30 min breaks)', crew: '6 people' },
  machines: 'Bagger (Ishida) → Tray sealer → Checkweigher (Ishida)',
  problems: [
    row(1, { priority: 'critical', what: 'Guard on the infeed bent', machine: 'Checkweigher', owner: 'Dave', due: '3 days late', late: true, plan: 'New guard from stores',
      journey: [{ id: 'j1', day: '19 Oct', did: 'Bent back by hand', result: 'Still catching' }] }),
    row(2, { priority: 'low', what: 'Label smudging' }),
  ],
  programs: [{ what: '400 g tray (runs Maris Piper)', machine: 'Tray sealer', word: 'On the machine', test: 'Thu 22 Oct', late: false }],
  tools: [{ label: 'Line capacity', says: '400 g tray: the Tray sealer limits the line at 58 a minute against 62' }],
  stops: '42 min lost in 7 stops — the Bagger most, 20 min',
  jobs: [{ name: 'Line 7 sealer upgrade', method: 'Stage gate', verdict: 'Behind target — 2 tests late' }],
};

describe('what Line Talk is told about the line', () => {
  it('each part under its heading, in the line’s own words', () => {
    const t = talkContext(IN);
    expect(t).toMatch(/^PRODUCTION LINE: Line 7 \(Tray line\)\nShifts: Days 06:00–14:00 \(30 min breaks\)\nCrew: 6 people\nMachines in flow order: Bagger \(Ishida\) → Tray sealer → Checkweigher \(Ishida\)/);
    expect(t).toContain('OPEN PROBLEMS (2, in priority order):\n- Critical · Guard on the infeed bent — Checkweigher · Open · 4 days · owner Dave · 3 days late · plan: New guard from stores · latest step (19 Oct): Bent back by hand — Still catching\n- Low · Label smudging · Open · 4 days · nobody owns it yet');
    expect(t).toContain('PROGRAMS NOT PROVED YET (1):\n- 400 g tray (runs Maris Piper) — Tray sealer · On the machine · test Thu 22 Oct');
    expect(t).toContain("WHAT ITS TOOLS FOUND (each tool's latest record on this line, in its own words):\n- Stops timed (last four weeks): 42 min lost in 7 stops — the Bagger most, 20 min\n- Line capacity: 400 g tray: the Tray sealer limits the line at 58 a minute against 62");
    expect(t).toContain('PROJECTS ON THIS LINE:\n- Line 7 sealer upgrade (Stage gate) — Behind target — 2 tests late');
  });

  it('says plainly what there is none of', () => {
    const t = talkContext({ line: { name: 'Line 2' }, problems: [], programs: [], tools: [], jobs: [] });
    expect(t).toContain('Machines in flow order: none listed yet');
    expect(t).toContain('OPEN PROBLEMS: none open on this line.');
    expect(t).toContain('WHAT ITS TOOLS FOUND: no tool has been used on this line yet.');
  });

  it('the job a talk is on, with or without a line; nothing at all on neither', () => {
    expect(talkContext({ problems: [], programs: [], tools: [], jobs: [], job: { name: 'Sealer upgrade', method: 'Stage gate', verdict: 'On target' } }))
      .toBe('THIS CONVERSATION IS ON THE PROJECT: Sealer upgrade (Stage gate) — On target');
    expect(talkContext({ problems: [], programs: [], tools: [], jobs: [] })).toBe('');
  });

  it('a big line cut to its first rows, saying how many more and where', () => {
    const many = talkContext({ ...IN, problems: Array.from({ length: 40 }, (_, i) => row(i + 1)) });
    expect(many.match(/^- High · Problem/gm)?.length).toBe(25);
    expect(many).toContain("- and 15 more on the line's Problems page");
  });

  it('said in a line — what went in', () => {
    expect(contextSaid(IN)).toBe('Line 7: 3 machines · 2 open problems · 1 program to prove · 2 tool findings · 1 project');
    expect(contextSaid({ problems: [], programs: [], tools: [], jobs: [] })).toBe('Not on a line or a project — Line Talk answers from the conversation alone.');
  });
});
