/* EVERY LINE STANDARD, kept current — what a program's Line capacity criterion is read from (lib/programCriteria: the capacity is
 * kept on a product's line standard, not on a study). `undefined` until read, or when `on` is false: a reader that has not read
 * them says such a criterion is not yet known, never gone and never a pass.
 *
 * ONE READ FOR EVERY ROW, as ui/ProgramCriteria reads the studies: a page of programs draws a hook a row, and each reading every
 * standard on every write slowed the page's redraw enough to lose what was typed in a drawer over it. */
import { useEffect, useState } from 'react';
import { listAllStandards, onDataChange } from '../db';
import type { Standard } from '../tools/linestandard/standard';

let shared: Standard[] | undefined;
const listeners = new Set<(s: Standard[]) => void>();
let off: (() => void) | undefined;
let reading: Promise<void> | undefined;
/* a write that lands while a read is under way is read again once it ends */
let dirty = false;
const read = (): Promise<void> => {
  if (reading) { dirty = true; return reading; }
  reading = listAllStandards()
    .then(s => { shared = s; for (const f of listeners) f(s); })
    .catch(() => {})
    .finally(() => { reading = undefined; if (dirty) { dirty = false; void read(); } });
  return reading;
};

export function useAllStandards(on = true): Standard[] | undefined {
  const [list, setList] = useState<Standard[] | undefined>(shared);
  useEffect(() => {
    if (!on) return undefined;
    listeners.add(setList);
    if (!off) off = onDataChange(() => void read());
    if (shared) setList(shared); else void read();
    return () => {
      listeners.delete(setList);
      if (!listeners.size) { off?.(); off = undefined; shared = undefined; }
    };
  }, [on]);
  return on ? list : undefined;
}
