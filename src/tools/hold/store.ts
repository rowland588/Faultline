/* WRITING A REGISTER OF HOLDS — every change reads the record as it is now and writes the list back with the one entry changed, so two phones
 * raising holds both keep theirs (the sync merges facts.holds entry by entry, by id). A hold is struck, never erased: it stays on the
 * register, left out of the figures, and can be put back. */
import { patchStudy } from '../../db';
import { now } from '../../lib/ids';
import type { Hold, HoldOutcome } from './hold';

export const addHold = (studyId: string, h: Hold) => patchStudy(studyId, cur => ({ facts: { ...cur.facts, holds: [...(cur.facts.holds ?? []), h] }, updatedAt: now() }));
export const changeHold = (studyId: string, id: string, fn: (h: Hold) => Hold) =>
  patchStudy(studyId, cur => ({ facts: { ...cur.facts, holds: (cur.facts.holds ?? []).map(h => (h.id === id ? fn(h) : h)) }, updatedAt: now() }));
export const strikeHold = (studyId: string, id: string, struck: boolean) => changeHold(studyId, id, h => ({ ...h, struck: struck || undefined }));
export const addOutcome = (studyId: string, id: string, o: HoldOutcome) => changeHold(studyId, id, h => ({ ...h, outcomes: [...(h.outcomes ?? []), o] }));
export const strikeOutcome = (studyId: string, id: string, oid: string, struck: boolean) =>
  changeHold(studyId, id, h => ({ ...h, outcomes: (h.outcomes ?? []).map(o => (o.id === oid ? { ...o, struck: struck || undefined } : o)) }));
