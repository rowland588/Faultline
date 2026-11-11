/* THE VISITS, FOLLOWED LIVE (lib/visits, docs/CONSULTANT-WORKSPACE.md C3) — every visit on the stories and the one in hand on this device,
 * read again on any write and whenever the visit in hand changes. */
import { useEffect, useMemo, useState } from 'react';
import type { ToolStudy } from './study';
import { onVisitInHand, storedVisit, visitInHand, visitsOf, type Visit } from './visits';

export function useVisits(): { ready: boolean; visits: Visit[]; inHand?: Visit } {
  const [studies, setStudies] = useState<ToolStudy[] | null>(null);
  const [hand, setHand] = useState(storedVisit);
  useEffect(() => {
    let live = true;
    let off = () => {};
    const load = () => void import('../db').then(db => db.listAllStudies()).then(s => { if (live) setStudies(s.filter(x => x.tool === 'story' && !x.deletedAt)); });
    load();
    void import('../db').then(db => { if (live) off = db.onDataChange(load); });
    const offHand = onVisitInHand(() => setHand(storedVisit()));
    return () => { live = false; off(); offHand(); };
  }, []);
  return useMemo(() => {
    const visits = visitsOf(studies ?? []);
    const inHand = visitInHand(visits, hand);
    return { ready: studies !== null, visits, ...(inHand ? { inHand } : {}) };
  }, [studies, hand]);
}
