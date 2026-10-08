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
  controlRoom, footGroup, gatesGroup, hereOf, jobLine, linesGroup, methodGroup, phoneBar, squareOf, workGroup,
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
    expect(here(`#/project/${P}/programs`)).toBe('setup');      // programs are set up under Set up
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
  });

  it('the control room is home', () => {
    expect(here('#/')).toBe('home');
    expect(controlRoom('home').on).toBe(true);
    expect(controlRoom('home').to).toBe('/');
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

  it('a late job is red; otherwise the job is under way', () => {
    expect(jobLine(P, 'Line 2', 'job', 2).state).toBe('r');
    expect(jobLine(P, 'Line 2', 'job', 0).state).toBe('w');
  });

  it('a place that is not a list carries no square — grey would say "not started"', () => {
    expect(controlRoom('job').bare).toBe(true);
    expect(footGroup(P, 'job').lines.every(l => l.bare)).toBe(true);
    expect(methodGroup(P, 'board', 'job', {}).lines.find(l => l.key === 'lines')?.bare).toBe(true);
    /* A list keeps its square even when it is empty: grey is true of it. */
    expect(workGroup(P, 'commissioning', 'job', {}).lines.find(l => l.key === 'fixes')?.bare).toBeFalsy();
  });
});

describe('the gates, in the order the job goes through them', () => {
  const counts = {
    install: { n: 2, late: 1, done: 4 }, setup: { n: 1, late: 1, done: 2 }, programs: { n: 2, late: 0, done: 1 },
    testing: { n: 2, late: 1, done: 0 }, handover: { n: 0, late: 0, done: 2 },
  };
  const g = gatesGroup(P, 'setup', counts);

  it('reads Install · Set up · Commission · Hand over, to the URLs that already exist', () => {
    expect(labels(g)).toEqual(['Install', 'Set up', 'Commission', 'Hand over']);
    expect(g.lines.map(l => l.to)).toEqual([`/project/${P}/install`, `/project/${P}/set-up`, `/project/${P}/testing`, `/project/${P}/handover`]);
  });

  it('Set up counts its steps and the programs not yet proved together, as its tab did', () => {
    const setup = g.lines[1];
    expect(setup.on).toBe(true);
    expect(setup.n).toBe(3);
    expect(setup.late).toBe(1);
    expect(setup.state).toBe('r');
  });

  it('a gate with nothing left and something done is green, with no count', () => {
    const hand = g.lines[3];
    expect(hand.state).toBe('g');
    expect(hand.n).toBeUndefined();
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
  it('a stage-gate job’s work is Fixes · Materials · The plan · The day', () => {
    const w = workGroup(P, 'commissioning', 'fixes', { fixes: { n: 4, late: 0, done: 1 } });
    expect(labels(w)).toEqual(['Fixes', 'Materials', 'The plan', 'The day']);
    expect(w.lines[0]).toMatchObject({ n: 4, state: 'w', on: true });
    // The plan is becoming its own page; the address is the one that page takes.
    expect(w.lines[2].to).toBe(`/project/${P}/plan`);
  });

  it('a 6M job keeps its materials under work', () => {
    expect(labels(workGroup(P, 'board', 'job', {}))).toEqual(['Materials']);
  });

  it('every line of the job, and the study’s four screens under the line it belongs to — once', () => {
    const lines = [{ id: 'L7', name: 'Line 7', workspaceId: 'ws' }, { id: 'L8', name: 'Line 8', workspaceId: 'ws' }];
    const g = linesGroup(P, lines, 'capture', 'ws');
    /* And the line's own tools — its maps and balances (LINE_TOOLS.sql,
       Rowland 7 October: "a tool, but can be attached"). */
    expect(labels(g)).toEqual(['Line 7', 'Capture', 'Analyse', 'Evidence', 'Meeting', 'Maps and balance', 'Line 8']);
    expect(g.lines.filter(l => l.sub).map(l => l.to)).toEqual(['/w/ws/capture', '/w/ws/analyse', '/w/ws/snaglist', '/w/ws/meeting', '/w/ws/standards']);
    expect(g.lines.find(l => l.on)?.label).toBe('Capture');
    // Outside the study, only the lines.
    expect(labels(linesGroup(P, lines, 'job'))).toEqual(['Line 7', 'Line 8']);
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
    workGroup(P, 'commissioning', at, {}),
    linesGroup(P, [{ id: 'L7', name: 'Line 7', workspaceId: 'ws' }], at, 'ws'),
    footGroup(P, at),
  ];

  it('Control room · This job · the gate you are in · Fixes · More', () => {
    expect(phoneBar(gateRail('setup'), 'commissioning').map(l => l.label)).toEqual(['Control room', 'This job', 'Set up', 'Fixes', 'More']);
    // On the job itself, the first gate holds the third place.
    expect(phoneBar(gateRail('job'), 'commissioning').map(l => l.label)).toEqual(['Control room', 'This job', 'Install', 'Fixes', 'More']);
  });

  it('carries the late count, so the bar can say it', () => {
    expect(phoneBar(gateRail('job'), 'commissioning')[2].late).toBe(1);
  });

  it('inside a line study, the screen you are on holds the third place', () => {
    expect(phoneBar(gateRail('analyse'), 'commissioning')[2].label).toBe('Analyse');
  });

  it('More is on when the screen lives only in the sheet', () => {
    const bar = phoneBar(gateRail('day'), 'commissioning');
    expect(bar.find(l => l.on)?.key).toBe('more');
    expect(phoneBar(gateRail('fixes'), 'commissioning').find(l => l.on)?.key).toBe('fixes');
  });

  it('a 6M job: the board takes Fixes’ place', () => {
    const rail: RailGroup[] = [
      { lines: [controlRoom('fishbone'), jobLine(P, 'Line 7 pace', 'fishbone')] },
      methodGroup(P, 'board', 'fishbone', {}),
      workGroup(P, 'board', 'fishbone', {}),
    ];
    expect(phoneBar(rail, 'board').map(l => l.label)).toEqual(['Control room', 'This job', 'Fishbone', 'Board', 'More']);
  });
});

describe('the tools beside the control room', () => {
  it('are the snags, the line standard and the line balance, each lit where it is', async () => {
    const { toolPlaces, hereOf } = await import('../rail');
    const { parseRoute } = await import('../../state/useRoute');
    expect(toolPlaces('').map(l => [l.label, l.to])).toEqual([['Snags', '/snags'], ['Line standard', '/standards'], ['Line balance', '/balances']]);
    expect(hereOf(parseRoute('#/standards'))).toBe('linestandard');
    expect(hereOf(parseRoute('#/balances'))).toBe('linebalance');
    expect(toolPlaces('linebalance').filter(l => l.on).map(l => l.label)).toEqual(['Line balance']);
  });
});
