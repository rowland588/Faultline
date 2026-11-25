import type { Workspace } from '../types';

export function lineKey(name: string): string {
  const key = name.trim().replace(/^line\s+/i, '').trim();
  return (key || name.trim()).slice(0, 12);
}

export const clientOfFactoryLine = (line: Pick<Workspace, 'clientName'>) => (line.clientName ?? '').trim().toLowerCase();

/** Once the first factory line is picked, the customer is known. */
export function projectLineCandidates(lines: readonly Workspace[], first?: Workspace): Workspace[] {
  return first ? lines.filter(line => clientOfFactoryLine(line) === clientOfFactoryLine(first)) : [...lines];
}
