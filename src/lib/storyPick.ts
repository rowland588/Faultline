/* WHICH CLIENT'S STORY — lifted out of screens/StoryScreen (8 November) so AI Mode's story_state (src/capabilities) reads the same
 * story the Story page shows: the client picked on the Factory page when the lines name more than one (kept on this device), else
 * the one they name; and that client's story — the open one before a closed one, the newest first. */
import type { Workspace } from '../types';
import type { ToolStudy } from './study';
import { clientsOf } from './lines';

export const CLIENT_KEY = 'faultline.client';

/** The client the Story is of: the one picked on the Factory page when the lines name more than one, else the one they name. */
export function clientShown(lines: readonly Workspace[]): string {
  const clients = clientsOf(lines);
  if (clients.length <= 1) return clients[0] ?? '';
  try { const c = localStorage.getItem(CLIENT_KEY) ?? ''; return clients.includes(c) ? c : clients[0]; } catch { return clients[0]; }
}

/** The client's story among the studies — the open one first, then the newest. */
export function storyOfClient(studies: readonly ToolStudy[], client: string): ToolStudy | undefined {
  return studies.filter(s => s.tool === 'story' && s.agreed?.story && (s.agreed.story.client ?? '').trim().toLowerCase() === client.trim().toLowerCase())
    .sort((a, b) => (a.agreed?.story?.closedAt ? 1 : 0) - (b.agreed?.story?.closedAt ? 1 : 0) || b.startedAt - a.startedAt)[0];
}
