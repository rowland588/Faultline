/* A READING HELD OVER FROM THE LAST SCREEN (docs/STAGEGATE.md, rule 7).
 *
 * Moving from Install to Set up read the whole job again and flashed
 * "Loading…" in between. A hook keeps its last reading here, and the next
 * screen draws from it at once — but only while nothing has been written
 * since it was read (db/core dataVersion). After any write — a job made, a
 * record planned, a row synced down — the next screen reads afresh first, as
 * it always did, so nothing is ever decided ("not here", "not a stage-gate
 * job") on a reading that could be out of date.
 */
import { dataVersion } from '../db';

export interface Held<T> {
  /** The held reading for `key`, or undefined when there is none or it may
   *  be out of date. */
  get(key: string): T | undefined;
  /** Call as a read starts; hand the result to `keep` when it lands. */
  started(): number;
  keep(key: string, value: T, startedAt: number): void;
}

export function heldReading<T>(): Held<T> {
  const held = new Map<string, { value: T; at: number }>();
  return {
    get(key) {
      const h = held.get(key);
      return h && h.at === dataVersion() ? h.value : undefined;
    },
    started: dataVersion,
    keep(key, value, startedAt) {
      /* A read that began before a write is not kept as current. */
      const was = held.get(key);
      if (!was || startedAt >= was.at) held.set(key, { value, at: startedAt });
    },
  };
}
