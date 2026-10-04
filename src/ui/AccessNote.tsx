/* The one line a person who is not the owner reads at the top of a job: what
 * they can do here and who runs it (lib/access). The owner sees nothing. */
import type { Can } from '../lib/access';
import { accessLine } from '../lib/access';

export function AccessNote({ can, owner }: { can: Can; owner?: string }) {
  const line = accessLine(can, owner ?? '');
  if (!line) return null;
  return <p className={`access-note is-${can.level}`} role="note">{line}</p>;
}
