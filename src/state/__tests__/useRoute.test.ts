/* THE ROUTE PARSER. Every URL the app can be handed, including the broken ones.
 *
 * A URL is untrusted input: it arrives from a stale bookmark, a truncated link
 * someone pasted into Teams, a saved "come back where you were" route, or a
 * hand-edited address bar. It must never be able to crash the app.
 *
 * It could. #/w/:ws/history with no asset id reached AssetHistoryScreen with
 * assetId={undefined}, IndexedDB threw "No key or key range specified", and the
 * error boundary took the whole app down to a reload. Found by the smoke test,
 * which loads every screen; these cases are here so it stays fixed. */
import { describe, it, expect } from 'vitest';
import { parseRoute } from '../useRoute';

const WS = '4f37a023-bd99-4ec4-932b-77b56dc1c396';

describe('a screen that is about one record never arrives without its id', () => {
  // All four take route.id! in AppShell. Each one used to crash.
  for (const screen of ['segment', 'asset', 'history', 'case']) {
    it(`#/w/:ws/${screen} with no id does not route to ${screen}`, () => {
      const r = parseRoute(`#/w/${WS}/${screen}`);
      expect(r.name).not.toBe(screen);
      expect(r.wsId).toBe(WS);
    });

    it(`#/w/:ws/${screen}/:id still routes to ${screen}`, () => {
      const r = parseRoute(`#/w/${WS}/${screen}/rec-1`);
      expect(r.name).toBe(screen);
      expect(r.id).toBe('rec-1');
    });
  }

  it('degrades to a screen that needs no id, and never to resume', () => {
    // resume replays the workspace's SAVED route. If that saved route is the
    // incomplete one, degrading to resume would come straight back and loop.
    const r = parseRoute(`#/w/${WS}/history`);
    expect(r.name).toBe('capture');
  });
});

describe('the ordinary routes still parse', () => {
  const cases: [string, Record<string, unknown>][] = [
    ['#/',                          { name: 'home' }],
    ['#/guide',                     { name: 'guide' }],
    ['#/portfolio',                 { name: 'portfolio' }],
    ['#/projects',                  { name: 'projects' }],
    ['#/pace-report',               { name: 'paceReport' }],
    ['#/project/p1',                { name: 'projectDashboard', id: 'p1' }],
    ['#/project/p1/setup',          { name: 'projectSetup', id: 'p1' }],
    ['#/project/p1/tree',           { name: 'leverTree', id: 'p1' }],
    ['#/project/p1/board',          { name: 'board', id: 'p1' }],
    ['#/project/p1/pareto',         { name: 'pareto', id: 'p1' }],
    ['#/project/p1/commissioning',  { name: 'commissioning', id: 'p1' }],
    ['#/project/p1/commissioning/run', { name: 'commissionRun', id: 'p1' }],
    ['#/project/p1/line/L7',        { name: 'projectLine', id: 'p1', lineId: 'L7' }],
    [`#/w/${WS}`,                   { name: 'resume', wsId: WS }],
    [`#/w/${WS}/capture`,           { name: 'capture', wsId: WS }],
    [`#/w/${WS}/walk`,              { name: 'walk', wsId: WS }],
    [`#/w/${WS}/snaglist`,          { name: 'snaglist', wsId: WS }],
  ];
  for (const [hash, want] of cases) {
    it(hash, () => expect(parseRoute(hash)).toMatchObject(want));
  }

  it('an unknown screen name falls back rather than throwing', () => {
    expect(parseRoute(`#/w/${WS}/not-a-screen`).name).toBe('resume');
  });

  it('ids are url-decoded, so a line called "Line 7" survives', () => {
    expect(parseRoute('#/project/p1/line/Line%207').lineId).toBe('Line 7');
  });

  it('a query string is kept and does not leak into the path', () => {
    const r = parseRoute('#/project/p1?view=next');
    expect(r.name).toBe('projectDashboard');
    expect(r.id).toBe('p1');
    expect(r.query.get('view')).toBe('next');
  });

  it('nothing at all is home, not a crash', () => {
    expect(parseRoute('').name).toBe('home');
    expect(parseRoute('#').name).toBe('home');
    expect(parseRoute('#/').name).toBe('home');
  });
});
