import type { Workspace } from '../types';

export type FactoryLinePicker = (options: readonly Workspace[]) => Promise<Workspace | undefined>;
let picker: FactoryLinePicker | undefined;
export function registerFactoryLinePicker(choose: FactoryLinePicker) {
  picker = choose;
  return () => { if (picker === choose) picker = undefined; };
}
export class LineChoiceCancelled extends Error {}
export function ignoreLineCancellation(error: unknown): undefined {
  if (error instanceof LineChoiceCancelled) return undefined;
  throw error;
}
export async function chooseFactoryLine(options: readonly Workspace[]): Promise<Workspace> {
  const selected = await picker?.(options);
  const match = options.find(w => w.id === selected?.id);
  if (!match) throw new LineChoiceCancelled('Factory line selection cancelled.');
  return match;
}
