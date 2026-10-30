/* STAGE GATE — /testing/:id opens the drawer, not a second page (STAGEGATE-AESTHETIC D3).
 * The full TestScreen remains for ?legacy=1 (sync harness and old bookmarks that need boxes on the page). */
import { useEffect } from 'react';
import { navReplace, useRoute } from '../state/useRoute';

export function TestRecordForward({ projectId, testId }: { projectId: string; testId: string }) {
  const route = useRoute();
  useEffect(() => {
    /* ONE replace, carrying ?open= — the drawer is route-driven. It was openRecord() (a push
       of the forward address with open=) followed at once by a replace WITHOUT open=, so an
       old /testing/:id link landed on Commission with no drawer (found 30 October,
       scripts/acceptance/stagegate-step1.mjs — the climb read empty). A replace also leaves
       no history entry under the drawer, so × and the phone's back strip the query instead. */
    const q = new URLSearchParams(route.query);
    q.delete('legacy');
    q.set('open', testId);
    const back = route.query.get('from') === 'programs' ? 'programs' : 'testing';
    navReplace(`/project/${projectId}/${back}?${q}`);
  }, [projectId, testId, route.query]);
  return <p className="sub wrap">Opening the test…</p>;
}
