/* A PRODUCT'S LINE CAPACITY AS A LEAN PAGE (docs/LEAN-PAGE.md, slice 2).
 *
 * Read from lib/capacityPaper's reading of the product (itself read from
 * lib/capacity — analyse, the bottleneck's cost, the V, the checks, the way to
 * the target), so the screen (screens/CapacityPanel) and the paper
 * (lib/capacityPaperPdf) say one thing. Nothing is worked out here but a share.
 *
 * The tiles: what the line makes and who holds it, the target, against the
 * target, labour a pack, the people. No "since last time": a capacity is one
 * record, changed where it sits — its alternatives are its what-ifs, not its
 * history. The action plan is the way to the target, worked out — each step
 * with nobody against it yet, so a step nobody owns is seen to be one. */
import type { LeanAction, LeanInsight, LeanPage, LeanTile, LeanTone } from './lean';
import { fmtMoney, fmtN, oneOf } from './capacity';
import type { CapacityPaper } from './capacityPaper';

const FROM: Record<string, string> = { typed: 'typed on the capacity', map: 'placed on the line standard', line: 'the line’s crew' };

export function capacityLean(p: CapacityPaper): LeanPage {
  const x = p.figures;
  const one = oneOf(p.unit);
  const held = x.limit ?? 'the bottleneck';
  const short = p.short;
  const tiles: LeanTile[] = [
    { k: 'The line makes', v: x.line != null ? fmtN(x.line) : '—', of: x.line != null ? `${p.unit} a minute · held by ${held}` : x.stations ? 'the speeds are still to fill in' : 'no stations yet' },
    x.target != null
      ? { k: 'Target', v: fmtN(x.target), of: `${p.unit} a minute${p.targetPct != null ? ` · ${fmtN(Math.round(p.targetPct))}% of what ${held} can do` : ''}` }
      : { k: 'Target', v: '—', of: 'not set — set one to read the line against it' },
    x.target != null && x.line != null
      ? (short && x.gap != null
        ? { k: 'Against the target', v: `${fmtN(x.gap)} short`, of: `${p.unit} a minute · ${fmtN(Math.round((x.gap / x.target) * 100))}% of the target · ${fmtN(Math.round(x.gap * 60))} an hour`, tone: 'r' }
        : { k: 'Against the target', v: 'Meets it', of: `${fmtN(Math.max(0, x.line - x.target))} ${p.unit} a minute to spare`, tone: 'g' })
      : { k: 'Against the target', v: '—', of: 'said once a target and the speeds are in' },
    x.perPack != null
      ? { k: `Labour a ${one}`, v: fmtMoney(x.perPack), of: x.against === 'target' && x.perPackThen != null && x.extraPerPack != null
        ? `${fmtMoney(x.perPackThen)} at the target · ${fmtMoney(x.extraPerPack)} because of ${held}` : `${fmtMoney(x.perHour ?? 0)} an hour for the line` }
      : { k: `Labour a ${one}`, v: '—', of: 'say how many people are on the line and what one costs an hour' },
    { k: 'People', v: x.people != null ? fmtN(x.people) : '—', of: x.people != null ? FROM[x.peopleFrom ?? 'typed'] ?? '' : 'not said yet' },
  ];
  const insights: LeanInsight[] = [
    ...(p.rows.length ? [{ text: p.sentence, tone: 'n' as LeanTone }] : []),
    ...(p.v ? [{ text: `The V-curve: ${p.v.text}`, tone: p.v.tone as LeanTone }] : []),
    ...(p.walk ? [{ text: `The bottleneck, walked: ${p.walk.text}`, tone: p.walk.tone as LeanTone }] : []),
    ...p.check.map(c => ({ text: c, tone: 'a' as LeanTone })),
    ...(p.labour?.more ? [{ text: p.labour.more, tone: 'n' as LeanTone }] : []),
  ];
  const actions: LeanAction[] = (p.plan?.steps ?? []).map(s => ({ what: s, state: 'To decide', tone: 'n' }));
  /* THE CLOSING LINE — one sentence of its own, not the money line again:
     who holds it and by how much, what that costs a pack, and the way on */
  const steps = p.plan?.steps.length ?? 0;
  const minute = x.perMin != null && x.perMin > 0 ? ` Each minute ${fmtMoney(x.perMin)} of labour is paid for ${p.unit} not made${x.contributionPerMin != null ? `, and ${fmtMoney(x.contributionPerMin)} of contribution is lost` : ''}.` : '';
  const lifted = x.against === 'next' && x.then != null && x.perPackThen != null && x.extraPerPack != null
    ? `; lifted to ${fmtN(x.then)}${x.next ? `, where ${x.next} would hold it` : ''}, labour would be ${fmtMoney(x.perPackThen)} a ${one} — ${fmtMoney(x.extraPerPack)} a ${one} because of ${held}` : '';
  const spare = x.line != null && x.target != null ? Math.max(0, x.line - x.target) : 0;
  const closing: { text: string; tone: LeanTone } = x.line == null ? { text: p.headline, tone: 'n' }
    : short && x.target != null && x.gap != null
      ? { text: `${held} holds ${p.product} to ${fmtN(x.line)} ${p.unit} a minute, ${fmtN(x.gap)} short of ${fmtN(x.target)}${x.extraPerPack != null && x.against === 'target' ? ` — ${fmtMoney(x.extraPerPack)} a ${one} in labour because of it` : ''}.${minute}${steps ? ` The way to ${fmtN(x.target)}: ${steps} step${steps === 1 ? '' : 's'}, worked out.` : ''}`, tone: 'r' }
      : x.target != null
        ? { text: `${p.product} makes ${fmtN(x.line)} ${p.unit} a minute against ${fmtN(x.target)} — ${held} sets the pace${spare > 0.05 ? ` with ${fmtN(spare)} to spare` : ''}${lifted}.`, tone: 'g' }
        : { text: `${held} sets the pace at ${fmtN(x.line)} ${p.unit} a minute${lifted} — set a target to read the line against it.`, tone: 'n' };
  return {
    eyebrow: 'Line capacity',
    title: p.product,
    sub: [p.line, p.job ? `for ${p.job}` : ''].filter(Boolean).join(' · '),
    verdict: { text: p.headline, tone: short ? 'r' : x.target != null && x.line != null ? 'g' : 'n' },
    facts: [['Unit', p.unit], ['Stations', String(x.stations)], ...(p.target ? [['Target', p.target] as [string, string]] : [])],
    tiles,
    insights,
    actions,
    actionsEmpty: short ? 'No way to the target worked out yet — a station’s speed is still to fill in.' : x.target != null ? 'Nothing to change to meet the target — the line makes it.' : 'Set a target and the way to it is worked out here.',
    closing,
  };
}
