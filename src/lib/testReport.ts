/* THE PICTURES EVERY DOCUMENT PRINTS — a photo, a clip's poster, a fix's
 * walk frame with its dot — read from the device and made small enough to
 * embed. Shared by the trial and fix cards, the day report and both client
 * reports, so one picture is drawn one way everywhere.
 *
 * THIS FILE USED TO DRAW THE A3 TESTING SHEET (buildTestReport,
 * drawTestReport, saveTestReport). Nothing has called it since the trial card
 * and the stage-gate client report took its place — the card prints every test
 * whole, and the client report carries the tests the client reads. The drawer
 * was removed on 3 Oct 2026 (docs/HUNT.md); the pictures it shared stay here,
 * under the same name, so nothing that prints a picture had to change.
 */
import { getBlob, getSnagAsset } from '../db';
import type { Test } from './testing';
import type { MediaPin, MediaRef } from '../types';

const MAX_EDGE = 1200;
const QUALITY = 0.8;

export interface Shot {
  data: string; w: number; h: number;
  /** What is wrong at each mark drawn on it (MediaRef.pins), in number order:
   *  the drawer prints them beside or under the picture by the same numbers. */
  marks?: string[];
}

/* ------------------------------- the pictures ------------------------------ */

/** The pictures behind a list of blob keys, in order, at most `max` — an
 *  unreadable one is skipped rather than costing the rest. Shared with the
 *  test and fix cards, so one picture is drawn one way everywhere. */
export async function shotsFor(keys: string[], max = 6): Promise<Shot[]> {
  const shots: Shot[] = [];
  for (const k of keys.slice(0, max)) {
    try { shots.push(await shotFrom(k)); } catch { /* send the words */ }
  }
  return shots;
}

/** What a photo or a clip prints as: the photo itself, or the clip's poster. */
export const shotKey = (m: { kind: 'photo' | 'video'; blobKey: string; thumbKey?: string }): string | undefined =>
  (m.kind === 'photo' ? m.blobKey : m.thumbKey);

/** The pictures of a record, in order, at most `max` — each photo with the
 *  marks pointed at on it (ui/Evidence) drawn in, numbered, and their words
 *  handed to the drawer. A clip's poster has none: marks are on a still. */
export async function shotsOf(media: MediaRef[], max = 6): Promise<Shot[]> {
  const shots: Shot[] = [];
  for (const m of media) {
    if (shots.length >= max) break;
    const key = shotKey(m);
    if (!key) continue;
    try { shots.push(await shotFrom(key, undefined, m.kind === 'photo' ? m.pins : undefined)); } catch { /* send the words */ }
  }
  return shots;
}

/** THE MARKS, DRAWN INTO THE PICTURE as the screen draws them (snag/PinImage):
 *  a red disc ringed in white with its number, at the same percentages — so
 *  no drawer has a second layer to keep in step. Sized off the picture, so
 *  a number still reads at the size a card prints it. Shared with the snag
 *  card (lib/buildSnagCards). */
export function drawMarks(ctx: CanvasRenderingContext2D, w: number, h: number, pins: MediaPin[]): void {
  const r = Math.max(10, Math.round(Math.min(w, h) * 0.055));
  pins.forEach((p, i) => {
    const cx = (p.x / 100) * w, cy = (p.y / 100) * h;
    ctx.beginPath(); ctx.arc(cx, cy, r + Math.max(2, Math.round(r * 0.2)), 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = '#9b3227'; ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = `bold ${Math.round(r * 1.2)}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), cx, cy + r * 0.06);
  });
}

async function shotFrom(key: string, dot?: { x: number; y: number }, pins?: MediaPin[]): Promise<Shot> {
  const blob = await getBlob(key);
  if (!blob) throw new Error('not on this device');
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('decode failed'));
      i.src = url;
    });
    const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(img.width * scale));
    cv.height = Math.max(1, Math.round(img.height * scale));
    const ctx = cv.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    /* A fix pinned on the line: the dot drawn into the picture itself, so
       every document that prints the shot shows where — no second layer for
       a PDF drawer to get out of step with. Same ring the screen draws. */
    if (dot) {
      const r = Math.max(8, Math.round(Math.min(cv.width, cv.height) * 0.035));
      const cx = (dot.x / 100) * cv.width, cy = (dot.y / 100) * cv.height;
      ctx.beginPath(); ctx.arc(cx, cy, r + 3, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(192,57,43,0.35)'; ctx.fill();
      ctx.lineWidth = Math.max(3, r * 0.3); ctx.strokeStyle = '#c0392b'; ctx.stroke();
    }
    const marked = (pins ?? []).filter(p => p.note.trim());
    if (marked.length) drawMarks(ctx, cv.width, cv.height, marked);
    return { data: cv.toDataURL('image/jpeg', QUALITY), w: cv.width, h: cv.height, ...(marked.length ? { marks: marked.map(p => p.note.trim()) } : {}) };
  } finally { URL.revokeObjectURL(url); }
}

/** One photo, with its marks drawn in and their words — undefined when it is
 *  not on this device or will not decode. */
export async function photoShot(key: string, pins?: MediaPin[]): Promise<Shot | undefined> {
  try { return await shotFrom(key, undefined, pins); } catch { return undefined; }
}

/** Where a fix is on the line, as a picture: its walk frame with the dot.
 *  Undefined when it is not pinned, or the frame is not on this device. */
export async function pinShot(t: Pick<Test, 'pin'>): Promise<Shot | undefined> {
  if (!t.pin) return undefined;
  try {
    const frame = await getSnagAsset(t.pin.frameId);
    return frame?.stillKey ? await shotFrom(frame.stillKey, t.pin) : undefined;
  } catch { return undefined; }
}
