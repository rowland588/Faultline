/* STAGE GATE — /testing/:id opens the drawer, not a second page (STAGEGATE-AESTHETIC D3).
 * The full TestScreen remains for ?legacy=1 (sync harness and old bookmarks that need boxes on the page). */
import { useEffect } from 'react';
import { openRecord } from '../ui/RecordDrawer';
import { navReplace, useRoute } from '../state/useRoute';

export function TestRecordForward({ projectId, testId }: { projectId: string; testId: string }) {
  const route = useRoute();
  useEffect(() => {
    openRecord(projectId, testId);
    const q = new URLSearchParams(route.query);
    q.delete('legacy');
    const back = route.query.get('from') === 'programs' ? 'programs' : 'testing';
    navReplace(`/project/${projectId}/${back}${q.toString() ? `?${q}` : ''}`);
  }, [projectId, testId, route.query]);
  return <p className="sub wrap">Opening the test…</p>;
}
