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
  controlRoom, footGroup, gatesGroup, hereOf, jobLine, linesGroup, methodGroup, phoneBar, squareOf, toolsGroup, workGroup,
  type RailGroup,
} from '../rail';

const P = 'job-1';
const here = (hash: string) => hereOf(parseRoute(hash));
const labels = (g: RailGroup) => g.lines.map(l => l.label);

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
    const g = gatesGroup(P, '', { programs: { n: 3, late: 0, failed: 1, done: 2 } });
    const programs = g.lines.find(l => l.key === 'programs');
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
    expect(footGroup(P, 'job').lines.every(l => l.bare)).toBe(true);
    expect(methodGroup(P, 'board', 'job', {}).lines.find(l => l.key === 'lines')?.bare).toBe(true);
    /* A list keeps its square even when it is empty: grey is true of it. */
    expect(gatesGroup(P, 'job', {}).lines.find(l => l.key === 'fixes')?.bare).toBeFalsy();
  });
});

describe('a stage-gate job’s places — the four gates one Plan (docs/STAGEGATE-UX.md)', () => {
  const counts = {
    install: { n: 2, late: 1, done: 4 }, setup: { n: 1, late: 1, done: 2 }, programs: { n: 2, late: 0, done: 1 },
    testing: { n: 2, late: 1, done: 0 }, handover: { n: 0, late: 0, done: 2 }, fixes: { n: 4, late: 0, done: 1 },
  };
  const g = gatesGroup(P, 'setup', counts);

  it('reads Plan · Programs · Problems · Materials · The day — the gates are the Plan’s tabs, not four lines', () => {
    expect(labels(g)).toEqual(['Plan', 'Programs', 'Problems', 'Actions', 'Materials', 'The day']);
    expect(g.lines.map(l => l.to)).toEqual([`/project/${P}/install`, `/project/${P}/programs`, `/project/${P}/fixes`, `/project/${P}/materials`, `/project/${P}/day`]);
  });

  it('Plan counts every gate’s open work and its late part, and is on whichever gate you are in', () => {
    const [plan, programs, fixes] = g.lines;
    expect([plan.on, plan.n, plan.late, plan.state]).toEqual([true, 5, 3, 'r']);
    expect([programs.on, programs.n, programs.late, programs.state]).toEqual([false, 2, undefined, 'w']);
    expect(fixes).toMatchObject({ n: 4, state: 'w', on: false });
    for (const here of ['install', 'testing', 'handover', 'plan']) expect(gatesGroup(P, here, counts).lines[0].on).toBe(true);
  });

  it('Plan opens on the gate the job is at — the first with work open — else the timeline', () => {
    expect(gatesGroup(P, 'job', { install: { n: 0, late: 0, done: 6 }, testing: { n: 3, late: 0 } }).lines[0].to).toBe(`/project/${P}/testing`);
    expect(gatesGroup(P, 'job', { install: { n: 0, late: 0, done: 6 } }).lines[0].to).toBe(`/project/${P}/plan`);
  });
});

describe('the method of a 6M or tree job', () => {
  it('a 6M job: the fishbone first, then the board, the lines and what says it is working', () => {
    expect(labels(methodGroup(P, 'board', 'job', {}))).toEqual(['Fishbone', 'Board', 'Lines', 'Numbers', 'Wins', 'Evidence']);
  });

  it('a lever tree job: the tree first, and the board it is built from', () => {
    expect(labels(methodGroup(P, 'tree', 'job', {}))).toEqual(['Tree', 'Board', 'Lines', 'Numbers', 'Wins', 'Evidence']);
  });

  it('the header buttons a job opted into — Pareto, a lever tree beside a 6M job — are lines here', () => {
    const g = methodGroup(P, 'board', 'pareto', {}, { pareto: true, tree: true });
    expect(labels(g)).toEqual(['Fishbone', 'Tree', 'Board', 'Lines', 'Numbers', 'Wins', 'Evidence', 'Pareto']);
    expect(g.lines.find(l => l.key === 'pareto')?.on).toBe(true);
  });

  it('the board carries its open and late actions', () => {
    const b = methodGroup(P, 'board', 'board', { board: { n: 7, late: 2, done: 3 } }).lines.find(l => l.key === 'board');
    expect(b).toMatchObject({ n: 7, late: 2, state: 'r', on: true });
  });
});

describe('work, lines and the foot', () => {
  it('a 6M job keeps its materials under work', () => {
    expect(labels(workGroup(P, 'job', {}))).toEqual(['Actions', 'Materials']);
  });

  it('every line of the job, and the study’s four screens under the line it belongs to — once', () => {
    const lines = [{ id: 'L7', name: 'Line 7', workspaceId: 'ws' }, { id: 'L8', name: 'Line 8', workspaceId: 'ws' }];
    const g = linesGroup(P, lines, 'capture', 'ws');
    /* The line's maps and capacities are its tools (Tools › Line standard,
       Line capacity), not a fifth line here ("Maps and balance" went —
       docs/FLOW-AUDIT.md #20). */
    expect(labels(g)).toEqual(['Line 7', 'Capture', 'Analyse', 'Evidence', 'Meeting', 'Line 8']);
    expect(g.lines.filter(l => l.sub).map(l => l.to)).toEqual(['/w/ws/capture', '/w/ws/analyse', '/w/ws/snaglist', '/w/ws/meeting']);
    expect(g.lines.find(l => l.on)?.label).toBe('Capture');
    // Outside the study, only the lines.
    expect(labels(linesGroup(P, lines, 'job'))).toEqual(['Line 7', 'Line 8']);
  });

  it('a line of Your factory: the factory’s name, its own page, once however many of the job’s lines name it', () => {
    /* docs/FLOW-AUDIT.md #7: Line 2 commissioning's rail said Line 7 and
       Line 8 for the factory's Line 7 — smoke test, each opening the job's
       own copy of it. */
    const lines = [
      { id: 'L7', name: 'Line 7', workspaceId: 'ws', factoryName: 'Line 7 — smoke test' },
      { id: 'L8', name: 'Line 8', workspaceId: 'ws', factoryName: 'Line 7 — smoke test' },
      { id: 'L9', name: 'Line 9' },
    ];
    const g = linesGroup(P, lines, 'job');
    expect(g.lines.map(l => [l.label, l.to])).toEqual([['Line 7 — smoke test', '/lines/ws'], ['Line 9', `/project/${P}/line/L9`]]);
    // inside the line's study, its four screens under it, once
    expect(labels(linesGroup(P, lines, 'capture', 'ws'))).toEqual(['Line 7 — smoke test', 'Capture', 'Analyse', 'Evidence', 'Meeting', 'Line 9']);
  });

  it('the three header doors are the foot: Reports · Notes (with its count) · Details', () => {
    const f = footGroup(P, 'notes', 3);
    expect(labels(f)).toEqual(['Reports', 'Notes', 'Details']);
    expect(f.foot).toBe(true);
    expect(f.lines[0].to).toBeUndefined();          // opens the sheet of everything printable
    expect(f.lines[1]).toMatchObject({ to: `/project/${P}/notes`, n: 3, on: true });
    expect(f.lines[2].to).toBe(`/project/${P}/setup`);
  });
});

describe('the phone’s five', () => {
  const gateRail = (at: string): RailGroup[] => [
    { lines: [controlRoom(at), jobLine(P, 'Line 2 commissioning', at)] },
    gatesGroup(P, at, { install: { n: 2, late: 1, done: 0 } }),
    footGroup(P, at),
    toolsGroup(at, linesGroup(P, [{ id: 'L7', name: 'Line 7', workspaceId: 'ws' }], at, 'ws').lines),
  ];

  it('Control room · This job · Plan · Problems · More — Plan on whichever gate you are in', () => {
    expect(phoneBar(gateRail('setup'), 'commissioning').map(l => l.label)).toEqual(['Control room', 'This project', 'Plan', 'Problems', 'More']);
    expect(phoneBar(gateRail('setup'), 'commissioning')[2].on).toBe(true);
    expect(phoneBar(gateRail('job'), 'commissioning').map(l => l.label)).toEqual(['Control room', 'This project', 'Plan', 'Problems', 'More']);
  });

  it('on Programs, Programs holds the third place', () => {
    expect(phoneBar(gateRail('programs'), 'commissioning')[2].label).toBe('Programs');
  });

  it('carries the late count, so the bar can say it', () => {
    expect(phoneBar(gateRail('job'), 'commissioning')[2].late).toBe(1);
  });

  it('inside a line study, the screen you are on holds the third place', () => {
    expect(phoneBar(gateRail('analyse'), 'commissioning')[2].label).toBe('Analyse');
  });

  it('More is on when the screen lives only in the sheet', () => {
    const bar = phoneBar(gateRail('notes'), 'commissioning');
    expect(bar.find(l => l.on)?.key).toBe('more');
    // a place of the job's work you are on holds the third place
    expect(phoneBar(gateRail('day'), 'commissioning')[2].label).toBe('The day');
    expect(phoneBar(gateRail('fixes'), 'commissioning').find(l => l.on)?.key).toBe('fixes');
  });

  it('a 6M job: the board takes Fixes’ place', () => {
    const rail: RailGroup[] = [
      { lines: [controlRoom('fishbone'), jobLine(P, 'Line 7 pace', 'fishbone')] },
      methodGroup(P, 'board', 'fishbone', {}),
      workGroup(P, 'fishbone', {}),
    ];
    expect(phoneBar(rail, 'board').map(l => l.label)).toEqual(['Control room', 'This project', 'Fishbone', 'Board', 'More']);
  });
});

describe('the tools beside the control room', () => {
  it('are the line standard, Line capacity and the studies, each lit where it is', async () => {
    const { toolPlaces, hereOf } = await import('../rail');
    const { parseRoute } = await import('../../state/useRoute');
    expect(toolPlaces('').map(l => [l.label, l.to])).toEqual([['Line standard', '/standards'], ['Line balance', '/linebalance'], ['Line capacity', '/balances'], ['Capability', '/capability'], ['Value stream', '/value-stream'], ['SMED', '/smed'], ['Work sampling', '/sampling'], ['Loss count', '/losses'], ['Video study', '/video'], ['Line Talk', '/talk']]);
    expect(hereOf(parseRoute('#/standards'))).toBe('linestandard');
    expect(hereOf(parseRoute('#/balances'))).toBe('linebalance');
    expect(toolPlaces('linebalance').filter(l => l.on).map(l => l.label)).toEqual(['Line capacity']);
    /* the line balance, its own tool (17 October): its list, a product's ?at=work, and the old People tab's address */
    expect(hereOf(parseRoute('#/linebalance'))).toBe('linework');
    expect(hereOf(parseRoute('#/w/ws/standards/s1?at=work'))).toBe('linework');
    expect(hereOf(parseRoute('#/w/ws/standards/s1?at=balance&view=work'))).toBe('linework');
    expect(toolPlaces('linework').filter(l => l.on).map(l => l.label)).toEqual(['Line balance']);
    expect(hereOf(parseRoute('#/capability'))).toBe('capability');
    expect(hereOf(parseRoute('#/capability/s1'))).toBe('capability');
    expect(hereOf(parseRoute('#/smed'))).toBe('changeover');
    expect(hereOf(parseRoute('#/smed/c1'))).toBe('changeover');
    expect(parseRoute('#/smed/c1')).toMatchObject({ name: 'study', view: 'changeover', id: 'c1' });
    /* a link made before it was named SMED still opens */
    expect(parseRoute('#/changeover/c1')).toMatchObject({ name: 'study', view: 'changeover', id: 'c1' });
    expect(toolPlaces('capability').filter(l => l.on).map(l => l.label)).toEqual(['Capability']);
    expect(toolPlaces('valuestream').filter(l => l.on).map(l => l.label)).toEqual(['Value stream']);
    expect(toolPlaces('changeover').filter(l => l.on).map(l => l.label)).toEqual(['SMED']);
    expect(toolPlaces('sampling').filter(l => l.on).map(l => l.label)).toEqual(['Work sampling']);
    /* a shift's losses by hand (tool 7): the page and one count light it */
    expect(hereOf(parseRoute('#/losses'))).toBe('losses');
    expect(hereOf(parseRoute('#/losses/s1'))).toBe('losses');
    expect(toolPlaces('losses').filter(l => l.on).map(l => l.label)).toEqual(['Loss count']);
    /* a line balance read from footage (docs/VIDEO.md): the list and one study light it */
    /* the new product's front door lights Home in its own navigation (ui/Frame StartNav) */
    expect(hereOf(parseRoute('#/start'))).toBe('start');
    expect(hereOf(parseRoute('#/video'))).toBe('video');
    expect(hereOf(parseRoute('#/video/v1'))).toBe('video');
    expect(toolPlaces('video').filter(l => l.on).map(l => l.label)).toEqual(['Video study']);
    /* Line Talk (20 October, docs/LINE-TALK.md): every talk, a line's, and one talk light it */
    expect(parseRoute('#/talk?line=w1')).toMatchObject({ name: 'talks' });
    expect(parseRoute('#/talk/t1')).toMatchObject({ name: 'talk', id: 't1' });
    expect(hereOf(parseRoute('#/talk'))).toBe('talk');
    expect(hereOf(parseRoute('#/talk/t1'))).toBe('talk');
    expect(toolPlaces('talk').filter(l => l.on).map(l => l.label)).toEqual(['Line Talk']);
  });
});

describe('the job first, the tools at the foot (docs/FLOW.md item 3)', () => {
  it('Tools holds the line standard, Line capacity and the studies — never the problems', () => {
    const g = toolsGroup('');
    expect(g.label).toBe('Tools');
    expect(labels(g)).toEqual(['Line standard', 'Line balance', 'Line capacity', 'Capability', 'Value stream', 'SMED', 'Work sampling', 'Loss count', 'Video study', 'Line Talk']);
  });

  it('inside a project, every tool opens on the project — its address carries it (docs/PROJECTS.md, P2)', async () => {
    const { parseRoute } = await import('../../state/useRoute');
    const g = toolsGroup('capability', [], 'p1');
    expect(g.lines.map(l => l.to)).toEqual(['/standards', '/linebalance', '/balances', '/capability', '/value-stream', '/smed', '/sampling', '/losses', '/video', '/talk'].map(t => `${t}?project=p1`));
    /* lit where it is, as outside a project */
    expect(g.lines.filter(l => l.on).map(l => l.label)).toEqual(['Capability']);
    /* each address still parses to its tool, with the project in its query */
    for (const l of g.lines) expect(parseRoute(`#${l.to}`).query.get('project')).toBe('p1');
    expect(hereOf(parseRoute('#/smed?project=p1'))).toBe('changeover');
    /* outside a project, unchanged */
    expect(toolsGroup('').lines.every(l => !l.to?.includes('?'))).toBe(true);
  });

  it('Control room problems is the control room’s, lit on its page (docs/FLOW-AUDIT.md #20)', async () => {
    const { snagsPlace } = await import('../rail');
    expect(here('#/snags')).toBe('quicksnags');
    expect(snagsPlace('quicksnags')).toMatchObject({ label: 'Control room problems', to: '/snags', on: true });
    expect(labels(toolsGroup('quicksnags'))).not.toContain('Control room problems');
  });
});
