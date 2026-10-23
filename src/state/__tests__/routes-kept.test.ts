/* EVERY ADDRESS THE APP ANSWERS TODAY, KEPT (docs/STRUCTURE.md §17, B0).
 *
 * The structure's slices change the frame around the pages, never where a
 * page lives: a bookmark, a link in a sent report, a phone's history and a
 * record's ?open= must all still land where they did. This is the list of
 * every address form the router knew on 22 October — its old aliases with
 * it — and the page each one opens. A slice that adds an address adds it
 * here; one that moves an address breaks this test, and the fix is to keep
 * the old one answering, never to edit the row. */
import { describe, expect, it } from 'vitest';
import { parseRoute } from '../useRoute';

const P = 'p1', W = 'w1';
/** [address, the page it opens, the parts the page reads from it] */
const KEPT: [string, string, Record<string, string | undefined>?][] = [
  ['', 'start'], ['#/', 'start'], ['#/start', 'start'], ['#/methods', 'start'], ['#/design', 'start'],
  ['#/room', 'home'], ['#/guide', 'guide'], ['#/s/tok', 'share', { id: 'tok' }],
  ['#/portfolio', 'portfolio'], ['#/projects', 'projects'], ['#/snags', 'quickSnags'],
  [`#/lines/${W}`, 'lineHome', { wsId: W }], ['#/factory', 'factory'], ['#/programs', 'linePrograms'],
  ['#/video', 'videos'], ['#/video/v1', 'videoStudy', { id: 'v1' }], ['#/video-check', 'videoCheck'],
  ['#/actions', 'allActions'], ['#/tools', 'tools'], ['#/parts', 'parts'], ['#/talk', 'talks'], ['#/talk/t1', 'talk', { id: 't1' }],
  ['#/standards', 'lineTools', { view: 'map' }], ['#/balances', 'lineTools', { view: 'balance' }], ['#/linebalance', 'lineTools', { view: 'work' }],
  ['#/value-stream', 'studies', { view: 'map' }], ['#/value-stream/s1', 'study', { view: 'map', id: 's1' }],
  ['#/sampling', 'studies', { view: 'sampling' }], ['#/sampling/s1', 'study', { view: 'sampling', id: 's1' }],
  ['#/reliability', 'studies', { view: 'reliability' }], ['#/reliability/s1', 'study', { view: 'reliability', id: 's1' }],
  ['#/capability', 'studies', { view: 'capability' }], ['#/capability/s1', 'study', { view: 'capability', id: 's1' }],
  ['#/smed', 'studies', { view: 'changeover' }], ['#/smed/s1', 'study', { view: 'changeover', id: 's1' }],
  ['#/changeover', 'studies', { view: 'changeover' }], ['#/changeover/s1', 'study', { view: 'changeover', id: 's1' }],
  ['#/losses', 'studies', { view: 'losses' }], ['#/losses/s1', 'study', { view: 'losses', id: 's1' }],
  ['#/pace-report', 'paceReport'],
  [`#/project/${P}`, 'projectDashboard', { id: P }], [`#/project/${P}/setup`, 'projectSetup', { id: P }],
  [`#/project/${P}/line/l1`, 'projectLine', { id: P, lineId: 'l1' }],
  [`#/project/${P}/tree`, 'leverTree', { id: P }], [`#/project/${P}/board`, 'board', { id: P }],
  [`#/project/${P}/pareto`, 'pareto', { id: P }], [`#/project/${P}/fishbone`, 'fishbone', { id: P }],
  [`#/project/${P}/materials`, 'materials', { id: P }], [`#/project/${P}/actions`, 'actions', { id: P }],
  [`#/project/${P}/programs`, 'programs', { id: P }], [`#/project/${P}/tools`, 'projectTools', { id: P }], [`#/project/${P}/machine/m1`, 'machine', { id: P, lineId: 'm1' }],
  [`#/project/${P}/report`, 'clientReport', { id: P }], [`#/project/${P}/notes`, 'notes', { id: P }],
  [`#/project/${P}/standard`, 'standard', { id: P }], [`#/project/${P}/standard/x1`, 'standard', { id: P, lineId: 'x1' }],
  [`#/project/${P}/fixes`, 'fixes', { id: P }], [`#/project/${P}/install`, 'install', { id: P }],
  [`#/project/${P}/day`, 'day', { id: P }], [`#/project/${P}/plan`, 'plan', { id: P }],
  [`#/project/${P}/set-up`, 'gateSetup', { id: P }], [`#/project/${P}/handover`, 'handover', { id: P }],
  [`#/project/${P}/testing`, 'testing', { id: P }], [`#/project/${P}/testing/t1`, 'test', { id: P, lineId: 't1' }],
  [`#/project/${P}/testing/t1/card`, 'trialCard', { id: P, lineId: 't1' }],
  [`#/project/${P}/commissioning`, 'testing', { id: P }], [`#/project/${P}/commissioning/run`, 'testing', { id: P }],
  [`#/project/${P}/anything-else`, 'projectDashboard', { id: P }],
  [`#/w/${W}`, 'resume', { wsId: W }], [`#/w/${W}/capture`, 'capture', { wsId: W }], [`#/w/${W}/analyse`, 'analyse', { wsId: W }],
  [`#/w/${W}/present`, 'present', { wsId: W }], [`#/w/${W}/meeting`, 'meeting', { wsId: W }], [`#/w/${W}/log`, 'log', { wsId: W }],
  [`#/w/${W}/settings`, 'settings', { wsId: W }], [`#/w/${W}/people`, 'people', { wsId: W }],
  [`#/w/${W}/snags`, 'snags', { wsId: W }], [`#/w/${W}/segment/s1`, 'segment', { wsId: W, id: 's1' }],
  [`#/w/${W}/segment`, 'capture', { wsId: W }], [`#/w/${W}/asset/a1`, 'asset', { wsId: W, id: 'a1' }],
  [`#/w/${W}/snaglist`, 'snaglist', { wsId: W }], [`#/w/${W}/walk`, 'walk', { wsId: W }], [`#/w/${W}/line`, 'line', { wsId: W }],
  [`#/w/${W}/standards`, 'lineStandards', { wsId: W }], [`#/w/${W}/standards/x1`, 'lineStandards', { wsId: W, id: 'x1' }],
  [`#/w/${W}/trend`, 'trend', { wsId: W }], [`#/w/${W}/history/a1`, 'history', { wsId: W, id: 'a1' }],
  [`#/w/${W}/report`, 'report', { wsId: W }], [`#/w/${W}/case/c1`, 'case', { wsId: W, id: 'c1' }],
  ['#/somewhere-unknown', 'home'],
];

describe('every address the app answers today still opens its page (docs/STRUCTURE.md §17)', () => {
  it.each(KEPT)('%s → %s', (hash, name, parts) => {
    const r = parseRoute(hash);
    expect(r.name).toBe(name);
    for (const [k, v] of Object.entries(parts ?? {})) expect((r as unknown as Record<string, unknown>)[k]).toBe(v);
  });

  it('keeps the query on every page — ?open=, ?project=, ?line=, ?view= ride along', () => {
    for (const [hash] of KEPT.filter(([h]) => h.startsWith('#/') && !['#/methods', '#/design'].includes(h))) {
      const r = parseRoute(`${hash}?open=x&project=${P}&line=l1&view=lines`);
      expect(r.query.get('open'), hash).toBe('x');
      expect(r.query.get('project'), hash).toBe(P);
      expect(r.query.get('view'), hash).toBe('lines');
    }
  });
});
