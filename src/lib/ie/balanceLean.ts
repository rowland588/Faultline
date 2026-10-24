/* THE LINE BALANCE'S TILES AND CLOSING LINE (docs/LEAN-PAGE.md, slice 2) —
 * read from lib/ie/balance (the figures) and lib/ie/balanceLink (what the
 * bottleneck costs), so the page (ui/WorkBalance), All together (ui/Together)
 * and their papers say one thing. Nothing is worked out here.
 *
 * The tiles: the people (and what the work needs at this takt), the takt (and
 * where it came from), the bottleneck person (their work against their takt),
 * labour a pack (as it runs, at takt), and what the bottleneck loses a minute
 * — or, within takt, how balanced the work is. */
import { fmtMoney } from '../../tools/linebalance/capacity';
import { fmtN } from '../../tools/linebalance/capacityWords';
import type { LeanTile, LeanTone } from '../lean';
import type { AgreedBalance } from '../study';
import { aPiece, secs, type BalanceFigures } from './balance';
import type { BalanceCost } from './balanceLink';

export function balanceTiles(f: BalanceFigures, a: AgreedBalance | undefined, k: BalanceCost | undefined, unit?: string, onMap?: number): LeanTile[] {
  const u = unit ?? 'packs', one = u.replace(/s$/, '');
  const c = f.constraint;
  const over = !!c && c.overBy > 0;
  return [
    { k: 'People', v: String(f.people.length), of: a && f.fewest != null ? `the work needs ${f.fewest} at this takt${onMap != null ? ` · ${onMap} on the map` : ''}` : f.people.length ? 'no takt yet to read them against' : 'nobody listed yet',
      ...(a && f.fewest != null && f.fewest > f.people.length ? { tone: 'a' as LeanTone } : {}) },
    a ? { k: 'Takt', v: secs(a.taktSec), of: `${aPiece({ unit: u }).trim()} · ${a.from === 'target' ? 'Line capacity’s target' : 'agreed here'}${a.allowance ? ` · +${Math.round(a.allowance * 100)}% allowance` : ''}` }
      : { k: 'Takt', v: '—', of: 'give Line capacity a target, or agree one here' },
    c && a ? { k: 'The bottleneck', v: c.who, of: `${secs(c.work)} of ${secs(c.takt ?? a.taktSec)}${aPiece(c)} takt${over ? ` — over by ${secs(c.overBy)}` : ' — the longest'}`, ...(over ? { tone: 'r' as LeanTone } : {}) }
      : { k: 'The bottleneck', v: '—', of: f.untimed ? `${f.untimed} element${f.untimed === 1 ? '' : 's'} still to time` : 'said once there is a takt' },
    k ? { k: `Labour a ${one}`, v: fmtMoney(k.perPackNow), of: k.constraint ? `${fmtMoney(k.perPackAtTakt)} at takt · ${fmtMoney(k.perPackNow - k.perPackAtTakt)} because of ${k.constraint}` : `${k.people} ${k.people === 1 ? 'person' : 'people'} at ${fmtMoney(k.ratePerHour)} an hour` }
      : { k: `Labour a ${one}`, v: '—', of: 'give the line an hourly rate in Line capacity' },
    k?.constraint
      ? { k: 'Lost a minute', v: `${fmtN(k.lost)}`, of: `${u} · ${fmtMoney(k.paidNotMade)} of labour paid for them${k.contributionLost != null ? ` · ${fmtMoney(k.contributionLost)} contribution` : ''}`, tone: 'r' }
      : { k: 'Balanced', v: f.efficiency != null && a ? `${Math.round(f.efficiency * 100)}%` : '—', of: f.efficiency != null && a ? 'of the people’s time is work against the longest' : 'said once the work is timed against takt',
        ...(k?.spare ? { of: `of the people’s time is work · ${fmtMoney(k.spare)} a minute paid with no work in it` } : {}) },
  ];
}

/** THE CLOSING LINE — one sentence of its own: who sets the pace against
 *  takt and what it costs a pack, or the balance's own sentence within takt. */
export function balanceClosing(f: BalanceFigures, k: BalanceCost | undefined, said: { text: string; tone: string }, unit?: string): { text: string; tone: LeanTone } {
  const u = unit ?? 'packs', one = u.replace(/s$/, '');
  const n = (v: number) => String(Number(v.toFixed(v < 10 ? 2 : 1)));
  if (k?.constraint) return { text: `${k.constraint} sets the pace at ${n(k.packsNow)} ${u} a minute against the ${n(k.packsAtTakt)} takt asks — ${fmtMoney(k.perPackNow - k.perPackAtTakt)} a ${one} more in labour because of ${k.constraint}.`, tone: 'r' };
  const c = f.constraint;
  if (c && c.overBy > 0) return { text: said.text, tone: 'r' };
  return { text: said.text, tone: said.tone === 'a' ? 'a' : c && !f.untimed && f.taktSec ? 'g' : 'n' };
}
