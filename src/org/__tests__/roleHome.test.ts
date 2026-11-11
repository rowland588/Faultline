/* WHAT EACH ROLE SEES FIRST (docs/ORGANISATION.md O4) and the business-wide figures' device sums (O4b), against hand-worked cases. */
import { describe, it, expect } from 'vitest';
import { actionInScope, businessRows, homeSays, lensOf, linesInScope, lossShort, myScope, owedToday, peopleOwing, projectsInScope } from '../roleHome';
import { lateOnDevice, lossSays, lossesOnDevice, periodOf, problemsOnDevice, summarySays, weekStart, lossFromRow } from '../businessFigures';
import type { OrgMember } from '../organisation';
import type { Observation, Project, Workspace } from '../../types';
import type { ProjectAction } from '../../lib/projectActions';

const line = (id: string, name: string, site?: string, area?: string, o: Partial<Workspace> = {}): Workspace =>
  ({ id, name, siteName: site, areaName: area, color: '#000', categories: [], subcategories: {}, assets: [], createdAt: 0, updatedAt: 0, ...o } as Workspace);
const L7 = line('l7', 'Line 7', 'Hull', 'Packing hall', { crew: 4, labourRatePerHour: 15, labourBurden: 1.3 });
const L8 = line('l8', 'Line 8', 'Hull', 'Packing hall');
const L2 = line('l2', 'Line 2A', 'Hull', 'Despatch', { crew: 2, labourRatePerHour: 12 });
const LX = line('lx', 'Line X');
const LINES = [L7, L8, L2, LX];
const T = new Date(2026, 10, 11, 10).getTime();   // Wednesday 11 November 2026, 10:00
const obs = (ws: string, min: number, at = T - 3_600_000, timing: Observation['timing'] = 'stopwatch'): Observation =>
  ({ id: `${ws}-${min}-${at}`, workspaceId: ws, category: 'Jam', asset: 'Bagger', startedAt: at, durationMs: min * 60_000, timing, count: 1, media: [], createdAt: at, updatedAt: at });
const act = (o: Partial<ProjectAction>): ProjectAction => ({ key: Math.random().toString(36), kind: 'Action', what: 'Fix it', who: '', late: false, soon: false, ...o });
const member = (o: Partial<OrgMember>): OrgMember => ({ id: 'b:sam@x.co', orgId: 'b', email: 'sam@x.co', role: 'team', sites: [], areas: [], createdAt: 0, updatedAt: 0, ...o });

describe('the lens and the scope', () => {
  it('maps each role to what it sees first; none for no role', () => {
    expect([lensOf('team'), lensOf('manager'), lensOf('viewer'), lensOf('leader'), lensOf('admin'), lensOf(undefined)]).toEqual(['floor', 'lines', 'lines', 'business', 'business', undefined]);
  });
  it('a team leader in Packing hall sees only Packing hall’s lines; a person with no row the whole business', () => {
    const s = myScope([member({ areas: ['Packing hall'] })], 'SAM@x.co ');
    expect(linesInScope(LINES, s).map(w => w.id)).toEqual(['l7', 'l8']);
    expect(linesInScope(LINES, myScope([], 'nobody@x.co')).map(w => w.id)).toEqual(['l7', 'l8', 'l2', 'lx']);
  });
  it('an action is in scope by its line, else by its project; a project by its lines', () => {
    const scoped = new Set(['l7', 'l8']), s = { sites: [], areas: ['Packing hall'] };
    const P1 = { id: 'p1', name: 'P1', workspaceIds: [] } as unknown as Project, P2 = { id: 'p2', name: 'P2', workspaceIds: [] } as unknown as Project, P3 = { id: 'p3', name: 'P3', workspaceIds: [] } as unknown as Project;
    const ps = projectsInScope([P1, P2, P3], [{ projectId: 'p1', workspaceId: 'l7' }, { projectId: 'p2', workspaceId: 'l2' }], scoped, s);
    expect(ps.map(p => p.id)).toEqual(['p1']);
    const pin = new Set(ps.map(p => p.id));
    expect(actionInScope({ workspaceId: 'l8' }, scoped, pin, s)).toBe(true);
    expect(actionInScope({ workspaceId: 'l2' }, scoped, pin, s)).toBe(false);
    expect(actionInScope({ project: { id: 'p2', name: 'P2' } }, scoped, pin, s)).toBe(false);
    expect(actionInScope({ project: { id: 'p1', name: 'P1' } }, scoped, pin, s)).toBe(true);
    expect(actionInScope({}, scoped, pin, s)).toBe(false);
    expect(actionInScope({}, scoped, pin, { sites: [], areas: [] })).toBe(true);
  });
});

describe('the floor, the manager and the business', () => {
  it('what I owe today: my name, late or due by today, the oldest first; nobody named → nothing', () => {
    const rows = [act({ who: 'Sam', due: '2026-11-09', late: true, what: 'Change the knife' }), act({ who: 'Sam & Jo', due: '2026-11-11', what: 'Clean the sealer' }), act({ who: 'Sam', due: '2026-11-20' }), act({ who: 'Jo', due: '2026-11-01', late: true })];
    const o = owedToday(rows, 'sam', '2026-11-11');
    expect(o?.key).toBe('owe');
    expect(o?.state).toBe('r');
    expect(o?.says).toBe('2 actions with your name on them today, 1 past its day — first “Change the knife”, due 2026-11-09.');
    expect(owedToday(rows, '', '2026-11-11')).toBeUndefined();
    expect(owedToday([act({ who: 'Sam', due: '2026-11-20' })], 'Sam', '2026-11-11')).toBeUndefined();
  });
  it('what my people owe: by name, the most late first, nobody yet last', () => {
    expect(peopleOwing([act({ who: 'Jo' }), act({ who: 'Sam', late: true }), act({ who: '' }), act({ who: 'Sam' }), act({ who: 'Jo', late: true }), act({ who: 'Jo' })]))
      .toEqual([{ who: 'Jo', open: 3, late: 1 }, { who: 'Sam', open: 2, late: 1 }, { who: 'Nobody yet', open: 1, late: 0 }]);
  });
  it('the business: an area a row with its worst line and its money this week (the lines’ own sums), no area last', () => {
    const open = (id: string) => ({ l7: { open: 2, critical: 1 }, l8: { open: 1, critical: 0 }, l2: { open: 0, critical: 0 }, lx: { open: 0, critical: 0 } }[id] ?? { open: 0, critical: 0 });
    const losses = lossesOnDevice(LINES, [obs('l7', 30), obs('l8', 10), obs('l2', 5)], weekStart(T), T + 1);
    const rows = businessRows(LINES, open, id => losses.find(l => l.workspaceId === id));
    expect(rows.map(r => r.title)).toEqual(['Hull › Despatch', 'Hull › Packing hall', 'No area yet']);
    const ph = rows[1];
    expect(ph.state).toBe('r');
    expect(ph.word).toBe('1 critical problem');
    // 30 min × 4 × £15 × 1.3 = £39; Line 8 has no crew and wage — 40 min lost, £39 on 1 of 2 lines priced
    expect(ph.says).toBe('2 lines · worst Line 7 (1 critical problem) · 40 min lost this week · £39 on 1 of 2 lines priced');
    expect(ph.href).toBe('/area?site=Hull&area=Packing+hall');
    expect(rows[0].says).toBe('1 line · worst Line 2A · 5 min lost this week · £2');
    expect(rows[2].says).toBe('1 line · nothing open · no stop timed this week');
    expect(rows[2].href).toBeUndefined();
  });
  it('the page’s sentence by lens, naming the scope', () => {
    expect(homeSays('floor', { sites: [], areas: ['Packing hall'] })).toBe('Your area — Packing hall: what you owe today, the problems on your lines and how each line stands.');
    expect(homeSays('business', { sites: [], areas: [] }, 'Acme Foods')).toMatch(/^Acme Foods: each area/);
    expect(homeSays(undefined, { sites: [], areas: [] })).toMatch(/^What wants you today/);
  });
});

describe('the business-wide figures, on the device', () => {
  it('losses in a period: stops, timed, minutes and the idle labour — never priced without a crew and wage', () => {
    const r = lossesOnDevice(LINES, [obs('l7', 30), obs('l7', 0, T - 1000, 'instant'), obs('l7', 50, weekStart(T) - 1), obs('l2', 5)], weekStart(T), T + 1);
    expect(r[0]).toEqual({ workspaceId: 'l7', line: 'Line 7', site: 'Hull', area: 'Packing hall', stops: 2, timed: 1, minutes: 30, labour: 39 });
    expect(r.find(x => x.workspaceId === 'l8')).toEqual({ workspaceId: 'l8', line: 'Line 8', site: 'Hull', area: 'Packing hall', stops: 0, timed: 0, minutes: 0 });
    expect(r.find(x => x.workspaceId === 'l2')?.labour).toBe(2);   // 5/60 × 2 × 12
    expect(lossSays(r[0])).toBe('2 stops · 30 min · 1 counted only · £39 of idle labour');
    expect(lossShort(r[0])).toBe('30 min lost · £39');
  });
  it('problems by area and priority, and what is late by person — open only, the day gone', () => {
    const sn = [
      { workspaceId: 'l7', status: 'open', priority: 'critical', owner: 'Sam', dueAt: T - 86_400_000, minutesPerDay: 30 },
      { workspaceId: 'l7', status: 'closed', priority: 'critical', owner: 'Sam', dueAt: T - 86_400_000 },
      { workspaceId: 'l8', status: 'in_progress', priority: 'high', owner: ' ', dueAt: T - 1000 },
      { workspaceId: 'l2', status: 'open', priority: 'high', owner: 'Jo', dueAt: T + 86_400_000 },
    ];
    expect(problemsOnDevice(LINES, sn, T)).toEqual([
      { site: 'Hull', area: 'Despatch', priority: 'high', open: 1, late: 0, minutesPerDay: 0, withMinutes: 0, lines: 1 },
      { site: 'Hull', area: 'Packing hall', priority: 'critical', open: 1, late: 1, minutesPerDay: 30, withMinutes: 1, lines: 1 },
      { site: 'Hull', area: 'Packing hall', priority: 'high', open: 1, late: 1, minutesPerDay: 0, withMinutes: 0, lines: 1 },
    ]);
    expect(lateOnDevice(LINES, sn, T)).toEqual([{ who: 'Sam', late: 1, oldestDue: T - 86_400_000, lines: 1 }, { who: '(nobody yet)', late: 1, oldestDue: T - 1000, lines: 1 }]);
  });
  it('a period in words; the week from Monday', () => {
    expect(new Date(weekStart(T)).getDay()).toBe(1);
    expect(periodOf('week', T).says).toMatch(/^this week \(Mon 9 Nov – Wed 11 Nov\)$/);
    expect(periodOf('last_week', T).to).toBe(weekStart(T));
  });
  it('the database’s row read as the device’s; the sentence names the source, the scope and the period', () => {
    expect(lossFromRow({ workspace_id: 'l7', line: 'Line 7', site: 'Hull', area: 'Packing hall', stops: '2', timed: 1, minutes: '30.00', labour: '39.00' }))
      .toEqual({ workspaceId: 'l7', line: 'Line 7', site: 'Hull', area: 'Packing hall', stops: 2, timed: 1, minutes: 30, labour: 39 });
    const p = periodOf('week', T);
    const s = summarySays({ losses: lossesOnDevice([L7, L8], [obs('l7', 30)], p.from, p.to), late: [], outputMissing: 'Output cannot be said here.' }, 'database', p, 'as Leader across Acme', T);
    expect(s).toBe('Worked out in the database over every line you may read (your access decides which) — as Leader across Acme. Stops this week (Mon 9 Nov – Wed 11 Nov): 30 min over 1 line, £39 of idle labour on the 1 line with a crew and wage — Line 7 (Hull › Packing hall) 1 stop · 30 min · £39 of idle labour. Owed past its day now: nothing. Output cannot be said here.');
  });
});
