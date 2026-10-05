/* THE FISHBONE PAGE AS ITS OWN PLACE — the pure half (docs/SIXM.md, "The
 * fishbone page — its own place"). Rowland, 5 October: "I can click, I go in,
 * I come out." Which panel is open is said by the address, so the phone's
 * Back closes it and a link opens it:
 *
 *   #/project/:id/fishbone?line=&problem=<case>&cause=<cause id>   a cause's panel
 *   #/project/:id/fishbone?line=&problem=<case>&panel=problem      the problem's panel
 *   …&view=read                                                    "Read it through"
 *
 * WHICH RECORD: none — a panel is a way of looking at the problem (a Case)
 * and one of its causes; nothing here is stored but the device's choice to
 * keep the Pareto tucked away. */

/** The one panel open beside the fish, or none. */
export type RoomPanel = { kind: 'cause'; id: string } | { kind: 'problem' } | null;

/** The panel the address asks for. A cause wins over the problem panel, so a
 *  half-edited link still opens something sensible. */
export function panelOf(q: URLSearchParams): RoomPanel {
  const cause = q.get('cause')?.trim();
  if (cause) return { kind: 'cause', id: cause };
  if (q.get('panel') === 'problem') return { kind: 'problem' };
  return null;
}

/** The same address with this panel open (or none) — every other key kept. */
export function withPanel(q: URLSearchParams, p: RoomPanel): URLSearchParams {
  const n = new URLSearchParams(q);
  n.delete('cause');
  n.delete('panel');
  if (p?.kind === 'cause') n.set('cause', p.id);
  if (p?.kind === 'problem') n.set('panel', 'problem');
  return n;
}

/** Two panels are the same one. */
export const samePanel = (a: RoomPanel, b: RoomPanel): boolean =>
  a?.kind === b?.kind && (a?.kind !== 'cause' || a.id === (b as { id: string }).id);

/** "Read it through" — the four parts as one page in place of the fish. */
export const readingOf = (q: URLSearchParams): boolean => q.get('view') === 'read';

/* ------------------------------ the Pareto drawer ------------------------------ */

/** Where the device remembers that the Pareto was tucked away. */
export const PARETO_KEY = 'faultline.fishbone.pareto';

/** Pinned open unless this device tucked it away. Works with no storage at
 *  all (a private window, blocked site data): pinned. */
export function readPinned(store: Pick<Storage, 'getItem'> | null | undefined): boolean {
  try { return store?.getItem(PARETO_KEY) !== 'tucked'; } catch { return true; }
}

export function writePinned(store: Pick<Storage, 'setItem' | 'removeItem'> | null | undefined, pinned: boolean): void {
  try {
    if (pinned) store?.removeItem(PARETO_KEY);
    else store?.setItem(PARETO_KEY, 'tucked');
  } catch { /* the choice lasts this visit only */ }
}

/** The room's columns on a laptop, in px (kept with the CSS: .fr-body). */
export const ROOM = {
  /** A laptop: the drawer pins and the panels sit beside the fish. */
  wide: 1100,
  drawer: 340,
  panel: 420,
  /** The thin edge the drawer tucks into. */
  edge: 34,
  /** The page's side gutters and the gaps between columns. */
  chrome: 2 * 16 + 2 * 12,
  /** The fish draws itself (not the lanes) from this wide (ui/Fishbone DRAWN_MIN). */
  drawn: 820,
} as const;

/** Whether the Pareto shows beside the fish. Pinned, it shows — except while
 *  a panel is open and the room cannot hold the drawer, the drawn fish and the
 *  panel together: then it steps aside to its edge, so the fish keeps being
 *  drawn rather than falling back to lanes, and comes back when the panel
 *  closes. "peek" is the edge tab pressed while it had stepped aside (the
 *  edge tab of a drawer this device tucked away pins it again instead). */
export function drawerShows(o: { pinned: boolean; peek: boolean; panelOpen: boolean; width: number }): boolean {
  if (!o.pinned) return false;
  if (o.peek || !o.panelOpen) return true;
  return o.width - ROOM.drawer - ROOM.panel - ROOM.chrome >= ROOM.drawn;
}
