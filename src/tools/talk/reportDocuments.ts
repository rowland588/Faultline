import type { ToolStudy } from '../../lib/study';
import { factsOfConversation } from '../../colleague/conversation';
import { currentTalkDocuments, photoLabels } from './talk';
import type { TalkDoc } from './talkAssist';

/** Only document content and the photos it cites may enter a customer's report. */
export interface SavedTalkReport {
  id: string;
  doc: TalkDoc;
  talk: string;
  line?: string;
  photos: { label: string; blobKey: string; at: number }[];
}

export function savedTalkReports(study: ToolStudy, line?: string): SavedTalkReport[] {
  if (study.tool !== 'talk' || study.deletedAt || factsOfConversation(study).colleague === true) return [];
  const turns = study.facts.turns ?? [];
  const labels = photoLabels(turns);
  return currentTalkDocuments(turns).map(({ id, doc }) => {
    const used = new Set(doc.sections.flatMap(section => section.photos.map(photo => photo.photo)));
    const photos = turns.flatMap(turn => {
      const label = labels.get(turn.id);
      return !turn.struck && turn.media && label && used.has(label)
        ? [{ label, blobKey: turn.media.blobKey, at: turn.at }] : [];
    });
    return { id: study.id + ':' + id, doc, talk: study.name, line, photos };
  });
}
