/* THE RAIL — what the one frame (ui/Frame) draws on the left of a laptop and
 * at the foot of a phone, worked out in ui/rail.ts.
 *
 * Rowland, 5 October: "too many doors opening… what's home is home, really
 * home, or the project home? it's just messy." The spine, five rows of tabs
 * and the header buttons became this one structure. These cases hold what it
 * promised: every URL still lands on a line that is on, the counts are the
 * same ones the tabs carried, the colour of a square follows the state rule,
 * and nothing that was a door has gone missing. */
import { describe, expect, it } from 'vitest';
import { parseRoute } from '../../state/useRoute';
import {
  controlRoom, hereOf, hereIn, jobLine, linesGroup, squareOf, factoryGroups, lineGroups, projectGroups, scopeBar, toolPlaces,
  type RailGroup,
} from '../rail';

const P = 'job-1';
const here = (hash: string) => hereOf(parseRoute(hash));

describe('which line is on, from the address alone', () => {
  it('every gate and list of a stage-gate job lights its own line', () => {
    expect(here(`#/project/${P}`)).toBe('job');
    expect(here(`#/project/${P}/install`)).toBe('install');
    expect(here(`#/project/${P}/set-up`)).toBe('setup');
    expect(here(`#/project/${P}/programs`)).toBe('programs');   // programs are a page of their own (8 October)
    expect(here(`#/project/${P}/testing`)).toBe('testing');
    expect(here(`#/project/${P}/handover`)).toBe('handover');
    expect(here(`#/project/${P}/fixes`)).toBe('fixes');
    expect(here(`#/project/${P}/materials`)).toBe('materials');
    expect(here(`#/project/${P}/day`)).toBe('day');
    expect(here(`#/project/${P}/notes`)).toBe('notes');
    expect(here(`#/project/${P}/setup`)).toBe('details');
    expect(here(`#/project/${P}/report`)).toBe('reports');
  });

  it('a 6M or tree job’s lenses are lines of their own; the old ?view=next is the board', () => {
    expect(here(`#/project/${P}/fishbone`)).toBe('fishbone');
    expect(here(`#/project/${P}/board`)).toBe('board');
    expect(here(`#/project/${P}/tree`)).toBe('tree');
    expect(here(`#/project/${P}/pareto`)).toBe('pareto');
    expect(here(`#/project/${P}?view=lines`)).toBe('lines');
    expect(here(`#/project/${P}?view=data`)).toBe('data');
    expect(here(`#/project/${P}?view=wins`)).toBe('wins');
    expect(here(`#/project/${P}?view=snags`)).toBe('snags');
    expect(here(`#/project/${P}?view=next`)).toBe('board');
    expect(here(`#/project/${P}?view=overview`)).toBe('job');
  });

  it('a line is its own line; a study’s screens fold onto its four', () => {
    expect(here(`#/project/${P}/line/L7`)).toBe('line:L7');
    for (const s of ['capture', 'log']) expect(here(`#/w/ws/${s}`)).toBe('capture');
    for (const s of ['analyse', 'trend']) expect(here(`#/w/ws/${s}`)).toBe('analyse');
    expect(here('#/w/ws/case/c1')).toBe('analyse');
    for (const s of ['snaglist', 'snags', 'line', 'walk']) expect(here(`#/w/ws/${s}`)).toBe('snaglist');
    expect(here('#/w/ws/segment/s1')).toBe('snaglist');
    for (const s of ['meeting', 'present', 'report']) expect(here(`#/w/ws/${s}`)).toBe('meeting');
    /* a line's own product lights the tool it is — its map Line standard, its
       capacity Line capacity — not a "Maps and balance" line of the study */
    expect(here('#/w/ws/standards')).toBe('linestandard');
    expect(here('#/w/ws/standards/s1')).toBe('linestandard');
    expect(here('#/w/ws/standards/s1?at=balance')).toBe('linebalance');
  });

  it('home is the front door; the control room keeps its own place', () => {
    expect(here('#/')).toBe('start');
    expect(here('#/start')).toBe('start');
    expect(here('#/room')).toBe('home');
    expect(here('#/projects')).toBe('projects');
    expect(controlRoom('home').on).toBe(true);
    expect(controlRoom('home').to).toBe('/room');
  });
});

describe('the square beside a line says its state, and the count stays the work', () => {
  it('red for any late, indigo under way, green all done, grey not started', () => {
    expect(squareOf({ n: 3, late: 1 })).toBe('r');
    expect(squareOf({ n: 3, late: 0 })).toBe('w');
    expect(squareOf({ n: 0, late: 0, done: 4 })).toBe('g');
    expect(squareOf({ n: 0, late: 0, done: 0 })).toBe('n');
    expect(squareOf(undefined)).toBe('n');
    // A stage that hit a problem and lost no time is amber — late still wins (lib/install lateOrProblem).
    expect(squareOf({ n: 3, late: 0, problem: 1 })).toBe('a');
    expect(squareOf({ n: 3, late: 1, problem: 1 })).toBe('r');
  });

  it('a program that failed is red and said "failed", not counted as late (docs/STAGEGATE.md)', () => {
    expect(squareOf({ n: 3, late: 0, failed: 1 })).toBe('r');
    const g = projectGroups({ projectId: P, name: 'Line 2', model: 'commissioning', here: '', counts: { programs: { n: 3, late: 0, failed: 1, done: 2 } }, late: 0 });
    const programs = g.flatMap(x => x.lines).find(l => l.key === 'programs');
    expect(programs?.late).toBeUndefined();
    expect(programs?.failed).toBe(1);
    expect(programs?.state).toBe('r');
  });

  it('a late job is red; otherwise the job is under way', () => {
    expect(jobLine(P, 'Line 2', 'job', 2).state).toBe('r');
    expect(jobLine(P, 'Line 2', 'job', 0).state).toBe('w');
  });

  it('a place that is not a list carries no square — grey would say "not started"', () => {
    expect(controlRoom('job').bare).toBe(true);
    const foot = projectGroups({ projectId: P, name: 'Line 2', model: 'commissioning', here: 'job', counts: {}, late: 0 }).find(g => g.foot)!;
    expect(foot.lines.every(l => l.bare)).toBe(true);
    /* A list keeps its square even when it is empty: grey is true of it. */
    const sg = projectGroups({ projectId: P, name: 'Line 2', model: 'commissioning', here: 'job', counts: {}, late: 0 }).flatMap(g => g.lines);
    expect(sg.find(l => l.key === 'fixes')?.bare).toBeFalsy();
  });
});

/* ===== THE SCOPES' RAILS (docs/STRUCTURE.md §5.2, B2, 23 October) ===== */

const all = (gs: RailGroup[]) => gs.flatMap(g => g.lines);
const said = (gs: RailGroup[]) => all(gs).map(l => l.label);

describe('the factory\'s rail: its pages, nothing else', () => {
  it('Control room · Actions · Problems · Projects · Lines · Programs · Tools, Reports at the foot — eight, however many lines and projects', () => {
    expect(said(factoryGroups('home', 3))).toEqual(['Control room', 'Actions', 'Problems', 'Projects', 'Lines', 'Programs', 'Tools', 'Reports']);
    expect(said(factoryGroups('home', 50))).toHaveLength(8);
    expect(all(factoryGroups('home', 3)).map(l => l.to)).toEqual(['/room', '/actions', '/snags', '/projects', '/factory', '/programs', '/tools', undefined]);
    expect(all(factoryGroups('home', 3)).find(l => l.key === 'projects')?.n).toBe(3);
  });
  it('lights the page you are on', () => {
    for (const [hash, label] of [['#/room', 'Control room'], ['#/actions', 'Actions'], ['#/snags', 'Problems'], ['#/factory', 'Lines'], ['#/programs', 'Programs'], ['#/tools', 'Tools'], ['#/capability', 'Tools'], ['#/smed', 'Tools']] as const)
      expect(all(factoryGroups(hereIn(parseRoute(hash), 'factory'), 3)).filter(l => l.on).map(l => l.label), hash).toEqual([label]);
  });
});

describe('still small as it grows (docs/STRUCTURE.md §19, 4)', () => {
  it('the factory\'s rail is 8 lines with 50 projects; a line\'s 9 and the way up, whatever is on it', () => {
    expect(all(factoryGroups('home', 50))).toHaveLength(8);
    expect(all(lineGroups('w1', 'overview', { problems: { n: 300, late: 40 }, projects: 50 })).filter(l => l.key !== 'up')).toHaveLength(9);
  });
});

describe('a line\'s rail: the way up, then the line\'s own pages', () => {
  const g = lineGroups('w1', 'overview', { problems: { n: 3, late: 1 }, projects: 2 });
  it('↑ Factory · Overview · Problems · Machines & programs · Products · Tools · Logs · Projects, then Reports and Set up — nine and the way up', () => {
    expect(said(g)).toEqual(['Factory', 'Overview', 'Problems', 'Machines & programs', 'Products', 'Tools', 'Logs', 'Projects', 'Reports', 'Set up']);
    expect(all(g).map(l => l.to)).toEqual(['/room', '/lines/w1', '/snags?line=w1', '/programs?line=w1', '/lines/w1?view=products', '/lines/w1?view=tools', '/w/w1/capture', '/lines/w1?view=projects', undefined, '/lines/w1?view=setup']);
    expect(all(g).find(l => l.key === 'problems')).toMatchObject({ n: 3, late: 1, state: 'r' });
  });
  it('lights the page you are on — the line\'s lists and its tools\' pages narrowed to it', () => {
    for (const [hash, label] of [['#/lines/w1', 'Overview'], ['#/lines/w1?view=tools', 'Tools'], ['#/snags?line=w1', 'Problems'], ['#/programs?line=w1', 'Machines & programs'], ['#/standards?line=w1', 'Products'], ['#/w/w1/standards/s1', 'Products'], ['#/capability?line=w1', 'Tools'], ['#/w/w1/capture', 'Logs']] as const)
      expect(all(lineGroups('w1', hereIn(parseRoute(hash), 'line'))).filter(l => l.on).map(l => l.label), hash).toEqual([label]);
  });
});

describe('a project\'s rail: the way up, its overview and its type\'s own pages, then what every project has', () => {
  const counts = {
    install: { n: 2, late: 1, done: 4 }, setup: { n: 1, late: 1, done: 2 }, programs: { n: 2, late: 0, done: 1 },
    testing: { n: 2, late: 1, done: 0 }, handover: { n: 0, late: 0, done: 2 }, fixes: { n: 4, late: 0, done: 1 },
  };
  const machines = [{ id: 'm1', name: 'Wrapper', state: 'r' as const, open: 3, late: 1 }, { id: 'm2', name: 'Coder', state: 'w' as const }];
  it('a stage gate: Overview · Plan · its machines · Programs · Materials · The day · Actions · Problems · Tools · Notes · Reports · Details', () => {
    const g = projectGroups({ projectId: P, name: 'Line 2', model: 'commissioning', here: 'setup', counts, late: 3, machines });
    expect(said(g)).toEqual(['Factory', 'Overview', 'Plan', 'Wrapper', 'Coder', 'Programs', 'Materials', 'The day', 'Actions', 'Problems', 'Tools', 'Notes', 'Reports', 'Details']);
    const plan = all(g).find(l => l.key === 'plan')!;
    expect([plan.on, plan.n, plan.late, plan.state, plan.to]).toEqual([true, 5, 3, 'r', `/project/${P}/install`]);
    expect(all(g).find(l => l.key === 'machine:m1')).toMatchObject({ n: 3, late: 1, state: 'r', sub: true });
  });
  it('a stage gate past six machines folds them into one line', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ id: `m${i}`, name: `Machine ${i}`, state: 'w' as const }));
    const g = projectGroups({ projectId: P, name: 'Big', model: 'commissioning', here: 'job', counts, late: 0, machines: many });
    expect(said(g).filter(l => l.startsWith('Machine'))).toEqual(['Machines (12)']);
    /* a project's no more than 18 with its machines folded (docs/STRUCTURE.md §19, 4) */
    expect(said(g).filter(l => l !== 'Factory').length).toBeLessThanOrEqual(18);
  });
  it('a 6M project: Fishbone first, then Board, Lines and each line, Numbers, Wins, Evidence, Materials', () => {
    const g = projectGroups({ projectId: P, name: 'Pace', model: 'board', here: 'fishbone', counts: { board: { n: 4, late: 1 } }, late: 1, lines: [{ id: 'l1', name: 'Line 7', workspaceId: 'w7', factoryName: 'Line 7' }] });
    expect(said(g)).toEqual(['Factory', 'Overview', 'Fishbone', 'Board', 'Lines', 'Line 7', 'Results', 'Materials', 'Actions', 'Problems', 'Tools', 'Notes', 'Reports', 'Details']);
    expect(all(g).find(l => l.label === 'Line 7')?.to).toBe('/lines/w7');
    expect(all(g).find(l => l.key === 'problems')?.to).toBe(`/snags?project=${P}`);
  });
  it('inside a line study on a 6M project, its four screens sit under its line', () => {
    const g = projectGroups({ projectId: P, name: 'Pace', model: 'board', here: 'analyse', counts: {}, late: 0, wsId: 'w7', lines: [{ id: 'l1', name: 'Line 7', workspaceId: 'w7', factoryName: 'Line 7' }] });
    expect(said(g).slice(said(g).indexOf('Line 7'), said(g).indexOf('Line 7') + 5)).toEqual(['Line 7', 'Capture', 'Analyse', 'Evidence', 'Meeting']);
    expect(all(g).find(l => l.key === 'analyse')).toMatchObject({ on: true, sub: true, to: '/w/w7/analyse' });
  });
  it('a lever tree: Tree first, and a Pareto when the project chose one', () => {
    const g = projectGroups({ projectId: P, name: 'Tree', model: 'tree', here: 'tree', counts: {}, late: 0, tools: { pareto: true } });
    expect(said(g).slice(1, 4)).toEqual(['Overview', 'Tree', 'Board']);
    expect(said(g)).toContain('Pareto');
  });
  it('every tool page in the project lights Tools', () => {
    for (const hash of [`#/project/${P}/tools`, `#/capability?project=${P}`, `#/capability/s1`, `#/standards?project=${P}`])
      expect(hereIn(parseRoute(hash), 'project'), hash).toBe('tools');
  });
});

describe('the phone\'s bar, fixed within a scope (D6)', () => {
  it('the factory: Control room · Actions · ＋ · Problems · More', () => {
    expect(scopeBar('factory', factoryGroups('home', 2)).map(l => l.label)).toEqual(['Control room', 'Actions', 'Problem', 'Problems', 'More']);
  });
  it('a line: Overview · Tools · ＋ · Problems · More', () => {
    expect(scopeBar('line', lineGroups('w1', 'overview')).map(l => l.label)).toEqual(['Overview', 'Tools', 'Problem', 'Problems', 'More']);
  });
  it('a project: Overview · its main page (Plan, Fishbone or Tree) · ＋ · Actions · More', () => {
    expect(scopeBar('project', projectGroups({ projectId: P, name: 'Line 2', model: 'commissioning', here: 'job', counts: {}, late: 0 }), 'commissioning').map(l => l.label)).toEqual(['Overview', 'Plan', 'Problem', 'Actions', 'More']);
    expect(scopeBar('project', projectGroups({ projectId: P, name: 'Pace', model: 'board', here: 'job', counts: {}, late: 0 }), 'board').map(l => l.label)).toEqual(['Overview', 'Fishbone', 'Problem', 'Actions', 'More']);
    expect(scopeBar('project', projectGroups({ projectId: P, name: 'Tree', model: 'tree', here: 'job', counts: {}, late: 0 }), 'tree').map(l => l.label)).toEqual(['Overview', 'Tree', 'Problem', 'Actions', 'More']);
  });
  it('no ＋ for somebody who may not take a problem there; More is on when the page lives in the sheet', () => {
    expect(scopeBar('factory', factoryGroups('home', 2), undefined, false).map(l => l.label)).toEqual(['Control room', 'Actions', 'Problems', 'More']);
    expect(scopeBar('factory', factoryGroups('factory', 2)).find(l => l.key === 'more')?.on).toBe(true);
    expect(scopeBar('factory', factoryGroups('home', 2)).find(l => l.key === 'more')?.on).toBe(false);
  });
});

describe('the lines a project points at, by the factory\'s name (docs/FLOW-AUDIT.md #7)', () => {
  it('a line of Your factory: the factory\'s name, its own page, once however many of the job\'s lines name it', () => {
    const g = linesGroup(P, [{ id: 'a', name: 'Line 8', workspaceId: 'w7', factoryName: 'Line 7' }, { id: 'b', name: 'Line 7 copy', workspaceId: 'w7', factoryName: 'Line 7' }, { id: 'c', name: 'New line', workspaceId: 'x' }], 'job');
    expect(g.lines.map(l => [l.label, l.to])).toEqual([['Line 7', '/lines/w7'], ['New line', `/project/${P}/line/c`]]);
  });
});

describe('the tools, from the catalogue (src/catalogue/registry)', () => {
  it('are the eleven a person can open, each opening its list — in a project, on the project', () => {
    expect(toolPlaces('').map(l => [l.label, l.to])).toEqual([['Line standard', '/standards'], ['Line balance', '/linebalance'], ['Line capacity', '/balances'], ['Capability', '/capability'], ['Value stream', '/value-stream'], ['SMED', '/smed'], ['Work sampling', '/sampling'], ['Loss count', '/losses'], ['Reliability', '/reliability'], ['Video study', '/video'], ['Line Talk', '/talk']]);
    expect(toolPlaces('', P).every(l => l.to?.includes(`project=${P}`))).toBe(true);
  });
});
