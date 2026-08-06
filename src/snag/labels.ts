/** The human label for a "section" (segment): its explicit name if set, else the
 *  asset name(s) already marked inside it, else the bare "Segment N". Used
 *  everywhere a section is shown so the name you gave the asset represents it
 *  consistently — the hub, the segment title, and the walkthrough. */
export function sectionLabel(seg: { name?: string; sequence: number }, assetNames: string[]): string {
  if (seg.name) return seg.name;
  if (assetNames.length === 1) return assetNames[0];
  if (assetNames.length > 1) return `${assetNames[0]} + ${assetNames.length - 1} more`;
  return `Segment ${seg.sequence}`;
}
