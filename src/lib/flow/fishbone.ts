/* WHERE A FISHBONE'S PARTS GO — one layout for the screen (ui/flow/LogParts
 * FishboneChart) and the paper (lib/flow/reportPdf), so the two never part.
 * The fishbone block (lib/flow/analysis) says what is on it; this says where.
 *
 * The spine runs to the head on the right, where the problem is written. The
 * bones alternate above and below it, left to right, in the order the bone
 * column lists them; each bone's name sits at its outer end and its causes
 * are written beside it, the root causes marked. A cause too long for its
 * bone is cut with "…" here — it is whole in the log's table, in the
 * sentence and on the report's entries. */

export interface FishBone { name: string; causes: { text: string; root: boolean; known?: string }[] }

export interface FishLayout {
  w: number; h: number;
  spineY: number; spineX0: number; spineX1: number;
  head: { x: number; y: number; w: number; h: number; lines: string[] };
  bones: {
    name: string; top: boolean; count: number;
    nameX: number; nameY: number;
    line: [number, number, number, number];
    causes: { text: string; full: string; root: boolean; x: number; y: number }[];
  }[];
}

export interface FishScale {
  /** The width to draw in. */
  width: number;
  /** A cause's line height, and the width of one character, in the same units. */
  line: number;
  char: number;
  /** The head's width. */
  headW: number;
}

export const SCREEN_FISH: FishScale = { width: 640, line: 13, char: 5.4, headW: 132 };

/** A string cut to n characters, with "…" when it was cut. */
export const clip = (s: string, n: number): string => (s.length <= n ? s : `${s.slice(0, Math.max(1, n - 1)).trimEnd()}…`);

/** Words broken into lines of at most n characters (a word longer is cut). */
export function lines(s: string, n: number, most: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const word of s.split(/\s+/).filter(Boolean)) {
    const next = cur ? `${cur} ${word}` : word;
    if (next.length <= n) { cur = next; continue; }
    if (cur) out.push(cur);
    cur = clip(word, n);
  }
  if (cur) out.push(cur);
  return out.length > most ? [...out.slice(0, most - 1), clip(out.slice(most - 1).join(' '), n)] : out;
}

export function fishLayout(bones: readonly FishBone[], head: string, s: FishScale = SCREEN_FISH): FishLayout {
  const list = bones.length ? bones : [{ name: 'No bones yet', causes: [] }];
  const cols = Math.max(1, Math.ceil(list.length / 2));
  const x0 = 4, spineX1 = s.width - s.headW, colW = (spineX1 - x0) / cols;
  const slant = Math.min(40, colW * 0.28);
  const room = Math.max(6, Math.floor((colW - slant - 12) / s.char));
  const deepest = (top: boolean) => Math.max(1, ...list.filter((_, i) => (i % 2 === 0) === top).map(b => b.causes.length));
  const nameH = s.line * 1.3;
  const upH = nameH + deepest(true) * s.line + s.line * 0.6;
  const downH = nameH + deepest(false) * s.line + s.line * 0.6;
  const spineY = upH + 4, h = spineY + downH + 4;
  const laid = list.map((b, i) => {
    const top = i % 2 === 0, c = Math.floor(i / 2);
    const colX = x0 + c * colW, end = colX + colW - 8, start = end - slant;
    const nameY = top ? nameH - s.line * 0.35 : h - s.line * 0.35;
    const outerY = top ? nameH + 2 : h - nameH - 2;
    const causes = b.causes.map((k, j) => ({
      text: clip(k.text, room), full: k.text, root: k.root,
      x: colX + 4 + (k.root ? s.line * 0.6 : 0),
      y: top ? nameH + (j + 1) * s.line : spineY + s.line * 0.6 + (j + 1) * s.line - s.line * 0.25,
    }));
    return { name: clip(b.name, room + 4), top, count: b.causes.length, nameX: colX + 4, nameY, line: [start, outerY, end, spineY] as [number, number, number, number], causes };
  });
  const hw = s.headW - 10, hh = Math.max(s.line * 4.4, Math.min(h - 8, s.line * 6));
  return {
    w: s.width, h, spineY, spineX0: x0, spineX1,
    head: { x: spineX1 + 6, y: spineY - hh / 2, w: hw, h: hh, lines: lines(head, Math.max(8, Math.floor((hw - 10) / (s.char * 1.05))), Math.max(2, Math.floor((hh - 6) / (s.line * 1.05)))) },
    bones: laid,
  };
}
