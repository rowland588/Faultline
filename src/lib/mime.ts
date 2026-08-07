/* Media type recovery.
 *
 * An object URL takes its MIME type from the Blob's own `type` — and a <video>
 * handed a blob typed `application/octet-stream` refuses to decode it outright
 * ("The element has no supported sources", networkState NO_SOURCE). A storage
 * round-trip does not reliably preserve the type, so a clip filmed on one
 * device came back untyped everywhere else and silently would not play.
 *
 * So we never trust the transport for this: the bytes themselves say what they
 * are. Container signatures are short, stable, and unambiguous. */

const SIGS: Array<{ mime: string; test: (b: Uint8Array) => boolean }> = [
  { mime: 'video/webm', test: b => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 }, // EBML (webm/mkv)
  { mime: 'video/mp4',  test: b => b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70 }, // ....ftyp (mp4/mov)
  { mime: 'image/jpeg', test: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/png',  test: b => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: 'image/gif',  test: b => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 },
  { mime: 'image/webp', test: b => b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 }, // RIFF....WEBP
];

/** A type the browser can actually dispatch on — octet-stream is not one. */
export const isUsableMime = (t?: string | null): boolean =>
  !!t && t !== 'application/octet-stream' && t !== 'binary/octet-stream';

/** Identify a blob from its leading bytes, or null if we don't recognise it. */
export async function sniffMime(blob: Blob): Promise<string | null> {
  try {
    const head = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
    return SIGS.find(s => s.test(head))?.mime ?? null;
  } catch {
    return null;
  }
}

/** The same bytes, carrying a type the browser will decode. Cheap: .slice()
 *  re-wraps the existing buffer rather than copying it. `hint` is used only
 *  when the signature isn't recognised (e.g. a HEIC still from an iPhone). */
export async function withUsableMime(blob: Blob, hint?: string): Promise<Blob> {
  if (isUsableMime(blob.type)) return blob;
  const mime = (await sniffMime(blob)) ?? (isUsableMime(hint) ? hint! : null);
  return mime ? blob.slice(0, blob.size, mime) : blob;
}

/* ---------- which video codec is inside ----------
 * Phones default to HEVC (H.265) for camera recordings. A laptop browser will
 * happily decode the AAC audio of such a file while failing on the video track,
 * which shows up as sound playing over a blank picture. Naming the codec turns
 * that from "the app is broken" into something actionable, so we look for the
 * sample-description fourcc. The moov box sits at the start on some files and
 * the end on others, so check both ends rather than reading the whole clip. */
const FOURCC: Array<[string, string]> = [
  ['hvc1', 'HEVC (H.265)'], ['hev1', 'HEVC (H.265)'],
  ['avc1', 'H.264'], ['avc3', 'H.264'],
  ['av01', 'AV1'], ['vp09', 'VP9'], ['vp08', 'VP8'],
];

export async function sniffVideoCodec(blob: Blob): Promise<string | null> {
  const WINDOW = 1_048_576; // 1MB from each end covers where moov actually lands
  try {
    const parts = blob.size <= WINDOW * 2
      ? [blob]
      : [blob.slice(0, WINDOW), blob.slice(blob.size - WINDOW)];
    for (const part of parts) {
      const text = new TextDecoder('latin1').decode(await part.arrayBuffer());
      for (const [cc, label] of FOURCC) if (text.includes(cc)) return label;
    }
  } catch { /* diagnostics only — never block playback on this */ }
  return null;
}

/** Can this browser decode that codec at all? Used to phrase the failure
 *  honestly ("this browser can't play HEVC") rather than blaming the file. */
export function browserCanPlay(codecLabel: string | null): boolean {
  if (!codecLabel) return true;
  const probe: Record<string, string> = {
    'HEVC (H.265)': 'video/mp4; codecs="hvc1"',
    'H.264': 'video/mp4; codecs="avc1.42E01E"',
    'AV1': 'video/mp4; codecs="av01.0.05M.08"',
    'VP9': 'video/webm; codecs="vp9"',
    'VP8': 'video/webm; codecs="vp8"',
  };
  const type = probe[codecLabel];
  if (!type) return true;
  return document.createElement('video').canPlayType(type) !== '';
}
