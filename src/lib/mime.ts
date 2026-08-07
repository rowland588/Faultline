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
