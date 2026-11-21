/* THE FILES LUNA CAN READ, FOR THE CUSTOMER IN HAND — one reader for the list in the context panel (colleague/LunaFiles) and for the
 * look she takes by herself (colleague/keepUp). WHOSE EACH FILE IS decides what is here (capabilities/data standingOf, 21 November —
 * "links and data for Luna also need to be included in the current customer"): the customer in hand's files and those truly no one's;
 * every customer's in use when all are shown, each named; never an archived customer's — put away with it, back when it is continued. */
import { activeClientNow } from '../lib/activeClient';
import { allSources, customerOfSource, standingOf } from '../capabilities/data';
import { listWorkspaces } from '../db/workspaces';
import type { InHand } from './keepUp';

export async function filesInHand(): Promise<InHand[]> {
  const [all, ac, ws] = await Promise.all([allSources(), activeClientNow(), listWorkspaces()]);
  const by = new Map(ws.map(w => [w.id, w.clientName?.trim() ?? '']));
  const lineClient = (id?: string) => (id ? by.get(id) ?? '' : '');
  return all.filter(s => standingOf(s, ac, lineClient).in).map(s => ({ ...s, whose: customerOfSource(s, ac, lineClient) })).sort((a, b) => b.facts.at - a.facts.at);
}
