/* A SHIFT'S LOSS COUNT AS A LEAN PAGE (docs/LEAN-PAGE.md, slice 1). The
 * closest thing the app has to the picture Rowland sent: planned against
 * made, where the minutes went, what they cost, what is being done.
 *
 * Read from lib/ie/losses — the figures (lossFigures) and the sentences
 * (lossSays, compareLosses) — and the line's other counts for since last
 * time and the trend. Nothing is worked out here that the module does not
 * already work out but a share and a percentage. The screen
 * (screens/LossesScreen) and the paper (lib/studiesPdf) both draw this. */
import { actionOf, fixOf, planOrder, since, type LeanAction, type LeanPage, type LeanPoint, type LeanTile, type LeanTone, type ActionLike, type FixLike } from '../../lib/lean';
import type { ToolStudy } from '../../lib/study';
import { niceDay, todayISO } from '../../lib/weeks';
import { compareLosses, findBar, gbp, minWords, packs, rateWords, shiftWords, windowWords, type LossFigures, type LossSays } from './losses';
import type { Tone } from '../../lib/ie/sample';

const tone = (t: Tone): LeanTone => (t === 'w' ? 'n' : t);
const pct = (a: number, b: number): number => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
const pctWords = (n: number): string => `${Number.isInteger(n) ? n : n.toFixed(1)}%`;

/** One of the line's counts, with its figures. */
export interface CountRead { s: ToolStudy; f: LossFigures }

/** What has been raised from a study: the records it is evidence for
 *  (StudyUse role 'evidence'), each as a row of the plan, named by the part
 *  it was raised from when `partOf` says one. */
export function raisedFrom(s: ToolStudy, actions: ({ id: string; deletedAt?: number } & ActionLike)[], fixes: ({ id: string; deletedAt?: number } & FixLike)[], partOf?: (step: string) => string | undefined, today = todayISO()): LeanAction[] {
  const rows: LeanAction[] = [];
  const seen = new Set<string>();
  for (const u of s.uses) {
    if (u.role !== 'evidence' || seen.has(u.ref)) continue;
    const from = u.step ? partOf?.(u.step) : undefined;
    const a = u.kind === 'action' ? actions.find(x => x.id === u.ref && !x.deletedAt) : undefined;
    const t = u.kind === 'fix' ? fixes.find(x => x.id === u.ref && !x.deletedAt) : undefined;
    if (a) { rows.push({ ...actionOf(a, today, from), open: { kind: 'action', ref: u.ref } }); seen.add(u.ref); }
    else if (t) { rows.push({ ...fixOf(t, today, from), open: { kind: 'fix', ref: u.ref } }); seen.add(u.ref); }
  }
  return planOrder(rows);
}

/** The count before this one on the line, with its figures counted. */
export function countBefore(s: ToolStudy, history: CountRead[]): CountRead | undefined {
  const at = s.facts.losses?.from;
  if (at === undefined) return undefined;
  return history.filter(h => h.s.id !== s.id && !h.s.deletedAt && h.f.enough && (h.s.facts.losses?.from ?? Infinity) < at)
    .sort((a, b) => (b.s.facts.losses?.from ?? 0) - (a.s.facts.losses?.from ?? 0))[0];
}

/** The count, read into the eight parts. `history`: the line's loss counts
 *  (this one may be among them); `actions`: what has been raised from it. */
export function lossLean(i: { s: ToolStudy; f: LossFigures; said: LossSays; line?: string; history: CountRead[]; actions: LeanAction[] }): LeanPage {
  const { s, f, said } = i;
  const c = s.facts.losses;
  const before = countBefore(s, i.history);
  const bf = before?.f;
  const against = before?.s.facts.losses ? niceDay(todayISO(new Date(before.s.facts.losses.from))) : '';
  const sameProduct = !!before && (before.s.product ?? '') === (s.product ?? '');
  const lost = f.lostMin ?? 0, planned = f.plannedMin ?? 0, made = f.made ?? 0, expected = f.expected ?? 0;
  const money = f.labour !== undefined || f.contribution !== undefined ? (f.labour ?? 0) + (f.contribution ?? 0) : undefined;
  const moneyBefore = bf && (bf.labour !== undefined || bf.contribution !== undefined) ? (bf.labour ?? 0) + (bf.contribution ?? 0) : undefined;
  const stopsN = f.stopsN + f.changeoverN, stoppedMin = f.stopsMin + f.changeoverMin;

  /* THE TILES — counted figures, never OEE (docs/LEAN-PAGE.md) */
  const tiles: LeanTile[] = f.enough ? [
    {
      k: 'Good packs', v: packs(made), of: `of ${packs(expected)} expected · ${pctWords(pct(made, expected))}`,
      tone: f.overPacks ? 'a' : made >= expected ? 'g' : 'n',
      ...(bf?.enough ? { change: sameProduct
        ? since(made, bf.made, { fmt: packs, higher: true, against, same: 0.5, counted: true })
        : since(pct(made, expected), pct(bf.made ?? 0, bf.expected ?? 0), { fmt: n => `${n.toFixed(1)} pts`, higher: true, against, same: 0.05 }) } : {}),
    },
    {
      k: 'Lost', v: minWords(lost), of: `of ${minWords(planned)} planned · ${pctWords(pct(lost, planned))}`,
      tone: lost <= 0 ? 'g' : 'n',
      ...(bf?.enough ? { change: since(lost, bf.lostMin, { fmt: minWords, higher: false, against, same: 0.5 }) } : {}),
    },
    {
      k: 'Stops timed', v: f.split ? String(stopsN) : '—',
      of: f.split ? (stopsN ? `${minWords(stoppedMin)} stopped${f.changeoverN ? ` · ${f.changeoverN} changeover${f.changeoverN === 1 ? '' : 's'}` : ''}` : 'none logged in the window') : 'read on the count’s own page',
      ...(bf?.split && f.split ? { change: since(stoppedMin, bf.stopsMin + bf.changeoverMin, { fmt: minWords, higher: false, against, same: 0.5 }) } : {}),
    },
    {
      k: 'Rejects', v: packs(f.rejects), of: `packs · ${pctWords(pct(f.rejects, made + f.rejects))} of ${packs(made + f.rejects)} run`,
      tone: f.rejects === 0 ? 'g' : 'n',
      ...(bf?.enough ? { change: since(f.rejects, bf.rejects, { fmt: packs, higher: false, against, same: 0.5, counted: true }) } : {}),
    },
    money !== undefined
      ? { k: 'What it cost', v: gbp(money), of: [f.labour !== undefined ? `${gbp(f.labour)} idle labour` : '', f.contribution !== undefined ? `${gbp(f.contribution)} contribution` : ''].filter(Boolean).join(' · '),
        ...(moneyBefore !== undefined ? { change: since(money, moneyBefore, { fmt: gbp, higher: false, against, same: 0.5 }) } : {}) }
      : { k: 'What it cost', v: '—', of: 'give the line its crew, wage and margin in Your factory to see it' },
  ] : [
    { k: 'Good packs', v: '—', of: 'not counted yet' },
    { k: 'Lost', v: '—', of: planned ? `of ${minWords(planned)} planned` : 'the planned minutes still to put in' },
    { k: 'Stops timed', v: f.split ? String(stopsN) : '—', of: f.split ? (stopsN ? `${minWords(stoppedMin)} stopped so far` : 'none logged in the window yet') : 'read on the count’s own page' },
    { k: 'Rejects', v: '—', of: 'not counted yet' },
    { k: 'What it cost', v: '—', of: 'said once the count is in' },
  ];

  /* THE TREND — the line's counts, good packs against what each expected */
  const counted = [...i.history.filter(h => h.s.id !== s.id && !h.s.deletedAt && h.f.enough && h.s.facts.losses), ...(f.enough && c ? [{ s, f }] : [])]
    .sort((a, b) => (a.s.facts.losses?.from ?? 0) - (b.s.facts.losses?.from ?? 0)).slice(-8);
  const dayOf = (h: CountRead) => niceDay(todayISO(new Date(h.s.facts.losses?.from ?? 0)));
  const dup = new Set(counted.map(dayOf).filter((d, k, all) => all.indexOf(d) !== k));
  const points: LeanPoint[] = counted.map(h => ({
    label: `${dayOf(h)}${dup.has(dayOf(h)) && h.s.facts.losses?.shift ? ` ${h.s.facts.losses.shift}` : ''}`,
    v: h.f.made ?? 0, ...(h.f.expected !== undefined ? { target: h.f.expected } : {}), ...(h.s.id === s.id ? { now: true } : {}),
  }));

  /* WHAT IT MEANS — the module's own sentences, the change first */
  const top = f.enough ? [...f.bars].sort((a, b) => b.min - a.min)[0] : undefined;
  const insights = [
    ...(bf?.enough && f.enough ? [(() => { const k = compareLosses(bf, f); return { text: `Against ${against}: ${k.text}`, tone: tone(k.tone) }; })()] : []),
    ...(top && lost > 0 ? [{ text: `${top.label}${top.asset ? ` on the ${top.asset}` : ''} took the most: ${minWords(top.min)}, ${Math.round((top.min / lost) * 100)}% of the ${minWords(lost)} lost${top.labour !== undefined || top.contribution !== undefined ? ` — ${gbp((top.labour ?? 0) + (top.contribution ?? 0))}` : ''}.`, tone: (top.abnormal ? 'a' : 'n') as LeanTone }] : []),
    ...said.lines.map(l => ({ text: l.text, tone: tone(l.tone) })),
  ];

  const who = shiftWords(c);
  const open = i.actions.filter(a => a.state !== 'Done').length;
  const closing = !f.enough ? { text: said.text, tone: 'n' as LeanTone }
    : {
      text: `${who} made ${packs(made)} of the ${packs(expected)} expected at ${rateWords(f.rate ?? 0)} (${pctWords(pct(made, expected))}) — ${lost > 0 ? `${minWords(lost)} lost${top ? `, the most to ${top.label.toLowerCase()} (${minWords(top.min)})` : ''}${money !== undefined ? `, ${gbp(money)} in the shift` : ''}` : 'nothing lost'}.${i.actions.length ? ` ${open ? `${open} action${open === 1 ? '' : 's'} open` : 'Every action raised is done'}.` : ''}`,
      tone: (made >= expected ? 'g' : tone(said.tone)) as LeanTone,
    };

  return {
    eyebrow: 'Loss count',
    title: s.name?.trim() || who,
    sub: [i.line, s.product].filter(Boolean).join(' · '),
    verdict: { text: said.verdict, tone: tone(said.tone) },
    facts: [
      ...(c ? [['Day', niceDay(todayISO(new Date(c.from)), { weekday: 'short' })] as [string, string], ['Shift', `${c.shift ? `${c.shift} · ` : ''}${windowWords(c)}`] as [string, string]] : []),
      ...(f.rate !== undefined ? [['Rate', rateWords(f.rate)] as [string, string]] : []),
    ],
    tiles,
    ...(points.length >= 2 ? { trend: { title: 'Good packs a shift, against what the rate expects', unit: 'packs', points, bar: 'Good packs made', mark: 'Expected at the rate' } } : {}),
    insights,
    actions: i.actions,
    actionsEmpty: s.projectId ? 'Nothing raised from this count yet — tap a cause and Make it better.' : 'Nothing raised from this count yet — attach it to a project to raise a fix or a countermeasure from a cause.',
    closing,
  };
}

/** The part of a count a record was raised from, in the floor's words. */
export const lossPart = (f: LossFigures) => (step: string): string | undefined => {
  const b = findBar(f.bars, step);
  return b ? `${b.label}${b.asset ? ` on the ${b.asset}` : ''}` : undefined;
};
