/* WHICH CLIENT'S STORY — lifted out of screens/StoryScreen (8 November) so AI Mode's story_state (src/capabilities) reads the same
 * story the Story page shows: the client picked on the Factory page when the lines name more than one (kept on this device), else
 * the one they name; and that client's story — the open one before a closed one, the newest first. */
import type { Workspace } from '../types';
import type { ToolStudy } from './study';
import { clientsOf } from './lines';
import { CLIENT_KEY, storedClient } from './activeClient';

/* the one key the active client is kept under (lib/activeClient, C1) — kept exported here for its readers */
export { CLIENT_KEY };

/** The client the Story is of: the active client (lib/activeClient) when the lines name more than one — the first when All clients is
 *  chosen, a story being one client's — else the one they name. */
export function clientShown(lines: readonly Workspace[], named?: readonly string[]): string {
  /* named: the clients in use (lib/activeClient — a customer added with no line among them, an archived one not) */
  const clients = named ?? clientsOf(lines);
  if (clients.length <= 1) return clients[0] ?? '';
  const c = storedClient();
  return clients.includes(c) ? c : clients[0];
}

/** The client's story among the studies — the open one first, then the newest. */
export function storyOfClient(studies: readonly ToolStudy[], client: string): ToolStudy | undefined {
  return studies.filter(s => s.tool === 'story' && s.agreed?.story && (s.agreed.story.client ?? '').trim().toLowerCase() === client.trim().toLowerCase())
    .sort((a, b) => (a.agreed?.story?.closedAt ? 1 : 0) - (b.agreed?.story?.closedAt ? 1 : 0) || b.startedAt - a.startedAt)[0];
}
