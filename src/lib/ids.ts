import type { ID, Millis } from '../types';

/** A stable unique id — the sync key later, so it must never change. */
export const uid = (): ID =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);

/** Epoch ms — one clock for the whole app. */
export const now = (): Millis => Date.now();
