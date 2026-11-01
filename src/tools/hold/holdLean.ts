/* THE REGISTER AS THE LEAN PAGE (docs/LEAN-PAGE.md) — its tiles, read by the page and by the paper from here, so they cannot part. */
import type { LeanTile } from '../../lib/lean';
import { gbp, qtyWords, type HoldFigures } from './hold';

export function holdTiles(f: HoldFigures): LeanTile[] {
  const open = f.open.length;
  return [
    { k: 'On hold now', v: String(open), of: open ? qtyWords(f.openBy) : f.holds ? 'nothing held' : 'none raised yet', ...(f.late.length ? { tone: 'r' as const } : open ? { tone: 'a' as const } : {}) },
    { k: 'Tied up', v: f.tiedUp !== undefined ? gbp(f.tiedUp) : '—', of: f.tiedUp !== undefined ? 'waiting, not lost' : open ? 'no cost a piece given' : 'nothing on hold' },
    { k: 'Oldest', v: f.oldest ? `${f.oldest.days} d` : '—', of: f.oldest ? `${f.oldest.hold.product || 'a hold'}` : 'nothing on hold' },
    { k: 'Past decide-by', v: String(f.late.length), of: open ? `of ${open} open` : '—', ...(f.late.length ? { tone: 'r' as const } : {}) },
    { k: 'Lost to decisions', v: f.fates.some(x => x.holds) ? gbp(f.lost) : '—', of: f.fates.some(x => x.holds) ? (f.lostMissing ? 'some cost not given' : 'from what was decided') : 'nothing decided yet' },
  ];
}
