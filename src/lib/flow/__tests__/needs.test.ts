/* WHAT FAULTLINE CANNOT DO YET (lib/flow/needs): every method's needs
 * gathered — the newest version of each, retired ones left out, the same
 * need said once with every method that asked — and each made a brief. */
import { describe, expect, it } from 'vitest';
import { needBrief, needsAsked } from '../needs';
import { ANALYSIS_BLOCKS } from '../analysis';

const weibull = { what: 'Time to the next jam', why: 'To clean before it stops', inputs: 'The time of each jam', method: 'A Weibull fit', check: 'Against last month' };
const m = (id: string, name: string, needs: object[], o: object = {}) => ({ id, familyId: id, status: 'active', version: 1, definition: { name, needs }, ...o });

describe('the needs, gathered', () => {
  it('the same need said once with every method that asked it, most asked first', () => {
    const got = needsAsked([
      m('a', 'Bagger stops', [weibull]),
      m('b', 'Infeed jams', [{ ...weibull, what: '  time to the NEXT jam ' }, { what: 'A regression on three columns', why: 'What drives rejects' }]),
      m('c', 'Old method', [{ what: 'Something retired', why: 'x' }], { status: 'retired' }),
    ] as never);
    expect(got.map(g => [g.need.what, g.askedBy.map(x => x.name)])).toEqual([
      ['Time to the next jam', ['Bagger stops', 'Infeed jams']],
      ['A regression on three columns', ['Infeed jams']],
    ]);
  });

  it('a method’s newest version only', () => {
    const got = needsAsked([
      m('v1', 'Stops', [weibull], { familyId: 'f', version: 1 }),
      m('v2', 'Stops', [], { familyId: 'f', version: 2 }),
    ] as never);
    expect(got).toEqual([]);
  });
});

describe('the brief', () => {
  it('what, why, from, method, check and who asked — and where it goes and how it is proved', () => {
    const b = needBrief({ need: weibull, askedBy: [{ id: 'a', name: 'Bagger stops' }] });
    expect(b).toContain('What: Time to the next jam');
    expect(b).toContain('Method: A Weibull fit');
    expect(b).toContain('How it is checked: Against last month');
    expect(b).toContain('Asked for by: “Bagger stops”');
    expect(b).toContain(`beside the ${ANALYSIS_BLOCKS.length} there are (${ANALYSIS_BLOCKS.join(', ')})`);
    expect(b).toMatch(/tests in src\/lib\/flow\/__tests__\/ with every figure worked by hand/);
  });
  it('what was not said is said to be agreed, never filled in', () => {
    expect(needBrief({ need: { what: 'A forecast', why: 'To plan' }, askedBy: [] })).toContain('Method: not said yet — to agree before it is built');
  });
});
