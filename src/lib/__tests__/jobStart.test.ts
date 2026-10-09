/* THE START OF A JOB (docs/JOBSTART.md).
 *
 * Who each line starts with — the supplier, or the site for the site's own
 * work; what a usual test must show, written once; planning a stage on every
 * machine one after another; a pasted list of machines; and a job whose plan
 * is not whole saying so instead of "On target". */
import { describe, it, expect } from 'vitest';
import { SITE_NAME, hasAgreed, keepUsualDetails, usualAgreed, usualHolder, usualKey, usualWith, whoFor } from '../install';
import { planGaps, stageGateOnTarget } from '../onTarget';
import { staggered } from '../weeks';
import { machinesFrom } from '../../screens/TestsScreen';
import type { Project } from '../../types';
import type { Asset, Test } from '../testing';

const TODAY = '2026-10-09';
const project = (o: Partial<Project> = {}): Project =>
  ({ id: 'p', name: 'Line 8', color: '#1f63e0', workspaceIds: [], createdAt: 1, updatedAt: 1, commissioning: true, ...o }) as Project;

describe('who a line starts with', () => {
  it('the site for the site’s own work, the supplier for the rest', () => {
    const p = project();
    expect(usualWith(p, 'install', 'Air and power connected')).toBe('site');
    expect(usualWith(p, 'install', 'Electrically complete')).toBe('site');
    expect(usualWith(p, 'handover', 'Safety sign-off (PUWER)')).toBe('site');
    expect(usualWith(p, 'handover', 'Client signed off')).toBe('site');
    expect(usualWith(p, 'install', 'Positioned and levelled')).toBe('supplier');
    expect(whoFor(p, 'install', 'Air and power connected', 'Ilapak UK')).toBe(SITE_NAME);
    expect(whoFor(p, 'install', 'Dry run', 'Ilapak UK')).toBe('Ilapak UK');
    expect(whoFor(p, 'install', 'Dry run')).toBeUndefined();
  });

  it('what the owner says on the list wins, gate by gate', () => {
    const p = project({ ...keepUsualDetails(project(), { usualWith: { [usualKey('install', 'Dry run')]: 'site', [usualKey('install', 'Air and power connected')]: 'supplier' } }) });
    expect(whoFor(p, 'install', 'Dry run', 'Ilapak UK')).toBe(SITE_NAME);
    expect(whoFor(p, 'install', 'Air and power connected', 'Ilapak UK')).toBe('Ilapak UK');
    expect(whoFor(p, 'setup', 'Dry run', 'Ilapak UK')).toBe('Ilapak UK');
  });

  it('keeping the details keeps the lists beside them', () => {
    const p = project({ gateStages: { setup: ['Programs loaded'] } });
    const kept = keepUsualDetails(p, { usualWith: {} }).gateStages;
    expect(kept?.setup).toEqual(['Programs loaded']);
  });

  it('a job using another job’s list takes what that list says too', () => {
    const other = project({ id: 'o', updatedAt: 5, installStages: ['Dry run'], gateStages: { usualWith: { [usualKey('install', 'Dry run')]: 'site' } } });
    const mine = project({ id: 'm' });
    expect(usualHolder(mine, [mine, other], 'install')?.id).toBe('o');
    expect(usualWith(usualHolder(mine, [mine, other], 'install'), 'install', 'Dry run')).toBe('site');
  });
});

describe('what a usual test must show, written once', () => {
  const p = project({ gateStages: { usualAgreed: {
    [usualKey('commission', 'Safety functions proven')]: { passesIf: 'Every e-stop stops it inside 2 s' },
    [usualKey('commission', 'Performance run at the agreed rate')]: { runAgreed: { rate: 60, minutes: 30, rejectsMax: 1 } },
    [usualKey('commission', 'Packs to spec')]: { passesIf: '  ' },
  } } });

  it('is read by the test’s name', () => {
    expect(usualAgreed(p, 'Safety functions proven')?.passesIf).toBe('Every e-stop stops it inside 2 s');
    expect(usualAgreed(p, 'Performance run at the agreed rate')?.runAgreed).toEqual({ rate: 60, minutes: 30, rejectsMax: 1 });
    expect(usualAgreed(p, 'Packs to spec')).toBeUndefined();
    expect(usualAgreed(p, 'Changeover')).toBeUndefined();
  });

  it('a test has something agreed when it has words or numbers', () => {
    expect(hasAgreed({ passesIf: 'x' })).toBe(true);
    expect(hasAgreed({ runAgreed: { rate: 60 } })).toBe(true);
    expect(hasAgreed({ passesIf: ' ', runAgreed: {} })).toBe(false);
  });
});

describe('one after another', () => {
  it('moves each machine on by the days apart, the first where it was put', () => {
    expect(staggered('2026-10-12', '2026-10-13', 0, 2)).toEqual({ from: '2026-10-12', to: '2026-10-13' });
    expect(staggered('2026-10-12', '2026-10-13', 1, 2)).toEqual({ from: '2026-10-14', to: '2026-10-15' });
    expect(staggered('2026-10-12', undefined, 3, 2)).toEqual({ from: '2026-10-18' });
    expect(staggered('2026-10-30', '2026-10-31', 1, 3)).toEqual({ from: '2026-11-02', to: '2026-11-03' });
  });
});

describe('a pasted list of machines', () => {
  it('one a line, its supplier after a comma or a tab', () => {
    expect(machinesFrom('Bag former, Ilapak UK\nMultihead weigher\tIshida Europe\n\n  Palletiser  \nCase packer, Ilapak UK, Ltd\r\n'))
      .toEqual([
        { name: 'Bag former', oem: 'Ilapak UK' },
        { name: 'Multihead weigher', oem: 'Ishida Europe' },
        { name: 'Palletiser' },
        { name: 'Case packer', oem: 'Ilapak UK, Ltd' },
      ]);
  });
});

describe('a job whose plan is not whole says so', () => {
  let n = 0;
  const a = (o: Partial<Asset> = {}): Asset => ({ id: `a${++n}`, projectId: 'p', name: `Machine ${n}`, state: 'awaited', sort: n, updatedAt: 1, ...o });
  const t = (o: Partial<Test>): Test => ({ id: `t${++n}`, projectId: 'p', title: `Test ${n}`, outcome: 'planned', sort: n, createdAt: 1, updatedAt: 1, ...o });
  const m1 = a({ dueOn: '2026-10-20' }), m2 = a();
  const tests = [
    t({ kind: 'install', assetId: m1.id, title: 'Positioned', plannedFor: '2026-10-21' }),
    t({ kind: 'install', assetId: m1.id, title: 'Dry run' }),
    t({ assetId: m1.id, title: 'Safety', plannedFor: '2026-11-01' }),
    t({ assetId: m1.id, title: 'Speed', passesIf: '60 ppm' }),
    t({ kind: 'fix', assetId: m1.id, title: 'A fix with no day' }),
    t({ kind: 'install', assetId: m1.id, title: 'Done, no day', outcome: 'passed', ranOn: '2026-10-08' }),
  ];

  it('counts what has no day, nothing agreed to show and no arrival date — not fixes, not what is done', () => {
    expect(planGaps(tests, [m1, m2])).toBe('2 with no date, 1 test with nothing agreed to show, 1 machine with no arrival date');
    expect(planGaps([], [])).toBe('');
  });

  it('answers "Not fully planned", in grey, never "On target"', () => {
    const v = stageGateOnTarget({ project: { plannedAt: '2026-11-23', expectedAt: '2026-11-23' }, tests, items: [], assets: [m1, m2], materials: [], programs: [], today: TODAY });
    expect(v.word).toBe('Not fully planned');
    expect(v.tone).toBe('none');
    expect(v.gaps).toBe('2 with no date, 1 test with nothing agreed to show, 1 machine with no arrival date');
    expect(v.reason.split(' · ')[1]).toBe(v.gaps);
  });

  it('a whole plan is on target', () => {
    const whole = [t({ kind: 'install', assetId: m1.id, title: 'Positioned', plannedFor: '2026-10-21' }), t({ assetId: m1.id, title: 'Safety', plannedFor: '2026-11-01', passesIf: 'Stops in 2 s' })];
    const v = stageGateOnTarget({ project: { plannedAt: '2026-11-23' }, tests: whole, items: [], assets: [m1], materials: [], programs: [], today: TODAY });
    expect(v.word).toBe('On target');
    expect(v.gaps).toBeUndefined();
  });
});
