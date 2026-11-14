/* THE BRIEF, WITH THE CUSTOMER — on the Factory's Set up tab (14 November, one front page).
 *
 * Rowland, 14 November: "story. I'm unsure of the relevance of story. It has the brief there. I think the business brief can go to
 * setup when you're doing a business setup." So the brief — what the customer asked you to find out — is written, uploaded and
 * changed here, under Customers, for the customer you are in. It is the SAME panel (screens/StoryBrief BriefPanel) on the SAME record
 * (the customer's story): nothing is kept twice. The client update (#/story) reads it, says its first line, and keeps its asks with
 * the evidence against each; it no longer edits it. Writing the first brief here starts the customer's story record, as Start the
 * story does; a customer with no brief has none, and nothing waits on one. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { listAllStudies, listWorkspaces, onDataChange, putStudy } from '../db';
import type { Workspace } from '../types';
import type { AgreedStory, ToolStudy } from '../lib/study';
import { productionLines } from '../lib/lines';
import { clientShown, storyOfClient } from '../lib/storyPick';
import { useClientScope } from '../lib/activeClient';
import { uid } from '../lib/ids';
import { nav } from '../state/useRoute';
import { BriefPanel } from '../screens/StoryBrief';
import { Fold, openFold } from './Fold';

const BRIEF_FOLD = 'fac-brief';
/** To Set up with the brief open — the way in from the client update. */
export function goToBrief(): void { openFold(BRIEF_FOLD); nav('/factory'); }

export function CustomerBrief({ may }: { may: boolean }) {
  const [all, setAll] = useState<Workspace[] | null>(null);
  const [studies, setStudies] = useState<ToolStudy[] | null>(null);
  const load = useCallback(async () => { const [ws, st] = await Promise.all([listWorkspaces(), listAllStudies()]); setAll(ws); setStudies(st.filter(s => !s.deletedAt)); }, []);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  const cs = useClientScope();
  const prodLines = useMemo(() => productionLines(all ?? []), [all]);
  /* whose: the customer the top bar says, as the client update reads it (lib/storyPick) */
  const client = clientShown(prodLines, cs.ready ? cs.clients : undefined);
  const story = useMemo(() => storyOfClient(studies ?? [], client), [studies, client]);
  if (all === null || studies === null || !cs.ready) return null;
  const ag: AgreedStory = story?.agreed?.story ?? { client, brief: '', startedAt: 0 };
  const save = async (next: AgreedStory) => {
    const t = Date.now();
    if (story) { await putStudy({ ...story, agreed: { ...story.agreed, story: next }, updatedAt: t }); return; }
    /* the first brief starts the customer's story record — an empty one starts nothing */
    if (!next.brief.trim()) return;
    await putStudy({ id: uid(), tool: 'story', name: `${client || 'The factory'} — the story`, agreed: { story: { ...next, client, startedAt: t } }, facts: { chapters: [] }, uses: [], startedAt: t, createdAt: t, updatedAt: t });
  };
  /* ONE LINE UNDER CUSTOMERS, opening to the brief (docs/DESIGN.md — set once, so it folds; ui/Fold): shut, it says the brief's
     first words or that there is none; the client update's Change it in Set up › opens it on arrival (openFold) */
  const first = ag.brief.trim().split('\n')[0] ?? '';
  return (
    <div className="fac-brief" data-customer-brief={client}>
      <Fold id={BRIEF_FOLD} title={client ? `The brief — ${client}` : 'The brief'} start={false}
        says={first ? (first.length > 110 ? `${first.slice(0, 110)}…` : first) : 'No brief yet — write it or upload it here'}>
        <BriefPanel ag={ag} save={save} canEdit={may && !ag.closedAt} title={null}
          says="What you were asked to find out, in the customer’s words — written here or uploaded. The client update is written against it."
          foot={<button type="button" className="cw-link" onClick={() => nav('/story')} data-customer-brief-update>The client update — the story so far ›</button>} />
      </Fold>
    </div>
  );
}
