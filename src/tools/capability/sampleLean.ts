/* A CAPABILITY STUDY AS A LEAN PAGE (docs/LEAN-PAGE.md, slice 6) — the tiles
 * and the closing line its page (screens/StudyScreen) and its paper say, read
 * from lib/ie/sample: the readings in of those agreed, the mean and the range,
 * the readings outside the limits, and Ppk and Cpk with how many they are
 * from and how sure (Bissell) — every figure its strip held, now its tiles;
 * pass or fail, how many failed of how many may and what the count proves. Nothing is worked out
 * here. What the readings outside would cost is not said yet (BLUEPRINT §6,
 * Money in every tool): no figure is made up for it. */
import type { LeanTile, LeanTone } from '../../lib/lean';
import type { AgreedReadings } from '../../lib/study';
import { CPK_FROM, goodWord, pctWord, ruleWords, type SampleFigures, type SampleSays, sampleMoney, kgWord, gbpWord, fateWord, type Fate } from './sample';
import { fewerThan } from '../../lib/ie/dist';
import { shareWords } from './modes';

const tone = (t: string): LeanTone | undefined => (t === 'r' || t === 'a' || t === 'g' ? t : undefined);

export function sampleTiles(f: SampleFigures, a: AgreedReadings, said: SampleSays): LeanTile[] {
  const unit = a.unit ? ` ${a.unit}` : '';
  const fx = (v?: number) => (v === undefined ? '—' : v.toFixed(f.dp));
  const cap = said.capability;
  const limits = a.kind === 'packers' ? `the ℮ ${a.nominal}${unit} rules`
    : a.lower !== undefined && a.upper !== undefined ? `${a.lower}–${a.upper}${unit}`
    : a.lower !== undefined ? `at least ${a.lower}${unit}` : a.upper !== undefined ? `at most ${a.upper}${unit}` : 'the limits';
  const tiles: LeanTile[] = [
    { k: a.kind === 'ticks' ? 'Checked' : a.kind === 'rejects' ? 'Runs' : a.kind === 'faults' ? 'Inspections' : a.kind === 'rate' ? 'Intervals' : 'Readings', v: String(f.n), of: `of ${f.count} agreed${f.n < f.count ? ` · ${f.count - f.n} still to take` : ''}`, ...(f.n ? {} : { tone: 'n' as LeanTone }) },
  ];
  const verdictTile: LeanTile = { k: 'Verdict', v: said.verdict, of: said.text, ...(tone(said.tone) ? { tone: tone(said.tone) } : {}) };
  /* W1 — REJECTS OUT OF WHAT WAS MADE: made, rejected, the rate of the maximum, how sure, the money */
  if (a.kind === 'rejects' && f.runs) {
    const r = f.runs, n = (v: number) => v.toLocaleString('en-GB');
    const m = sampleMoney(f, a).runs;
    return [...tiles,
      { k: 'Made', v: n(r.made), of: `across ${f.n} run${f.n === 1 ? '' : 's'}`, ...(f.n ? {} : { tone: 'n' as LeanTone }) },
      { k: 'Rejected', v: n(r.rejected), of: r.made ? `${(r.p * 100).toFixed(2)}% · ${n(Math.round(r.perMillion))} per million` : 'none counted', ...(r.verdict === 'notMet' ? { tone: 'r' as LeanTone } : r.made ? {} : { tone: 'n' as LeanTone }) },
      { k: 'Confident', v: r.made && f.n >= 3 ? `≤ ${shareWords(r.upper)}` : '—', of: r.made && f.n >= 3 ? `95% confident · between ${(r.lo * 100).toFixed(2)}% and ${(r.hi * 100).toFixed(2)}%${r.max !== undefined ? ` · at most ${shareWords(r.max)} agreed` : ''}` : 'said from 3 runs', ...(r.made && f.n >= 3 ? {} : { tone: 'n' as LeanTone }) },
      ...(m ? [{ k: 'Rejects cost', v: m.gbpShift !== undefined ? gbpWord(m.gbpShift) : '—', of: m.gbpShift !== undefined ? `a shift — about ${n(Math.round(m.rejectsShift as number))} packs${m.gbpWeek !== undefined ? ` · ${gbpWord(m.gbpWeek)} a week` : ''}` : m.missing.join('; '), tone: (m.gbpShift !== undefined ? 'a' : 'n') as LeanTone }] : []),
      verdictTile];
  }
  /* W1 — FAULTS FOUND ON EACH ITEM: items, faults, per item, the top kind */
  if (a.kind === 'faults' && f.faults) {
    const q = f.faults, n = (v: number) => v.toLocaleString('en-GB'), top = q.tally[0];
    return [...tiles,
      { k: 'Items', v: n(q.items), of: `across ${f.n} inspection${f.n === 1 ? '' : 's'}`, ...(f.n ? {} : { tone: 'n' as LeanTone }) },
      { k: 'Faults', v: n(q.faults), of: q.items ? `${q.dpu.toFixed(3)} an item · ${(q.shareAny * 100).toFixed(1)}% of items carry one` : 'none counted', ...(q.verdict === 'notMet' ? { tone: 'r' as LeanTone } : q.items ? {} : { tone: 'n' as LeanTone }) },
      { k: 'Per 100', v: q.items && f.n >= 3 ? (q.dpu * 100).toFixed(1) : '—', of: q.items && f.n >= 3 ? `95% confident ${(q.lo * 100).toFixed(1)}–${(q.hi * 100).toFixed(1)}${q.max !== undefined ? ` · at most ${(q.max * 100).toFixed(1)} agreed` : ''}` : 'said from 3 inspections', ...(q.items && f.n >= 3 ? {} : { tone: 'n' as LeanTone }) },
      { k: 'Top kind', v: top ? top.kind : '—', of: top ? `${n(top.count)} of ${n(q.faults)} — ${Math.round(top.share * 100)}%${top.gbp !== undefined ? ` · ${gbpWord(top.gbp)}` : ''}` : 'no faults by kind yet', ...(top ? {} : { tone: 'n' as LeanTone }) },
      verdictTile];
  }
  /* W1 — HELD AT A RATE: intervals met, the stretch, made of expected */
  if (a.kind === 'rate' && f.rate) {
    const r = f.rate, n = (v: number) => v.toLocaleString('en-GB');
    return [...tiles,
      { k: 'Met', v: f.n ? `${r.met} of ${f.n}` : '—', of: f.n ? `${Math.round(r.share * 100)}% of intervals${r.held === 'gaps' || r.held === 'not' ? ` · ${r.heldShare}% needed for held with gaps` : ''}` : 'said once an interval is in', ...(r.held === 'not' ? { tone: 'r' as LeanTone } : f.n ? {} : { tone: 'n' as LeanTone }) },
      { k: 'Longest stretch', v: f.n ? `${r.stretchMin} min` : '—', of: f.n ? `met in a row · intervals of ${r.intervalMin}` : '' , ...(f.n ? {} : { tone: 'n' as LeanTone }) },
      { k: 'Made', v: f.n ? n(r.made) : '—', of: f.n ? `of ${n(Math.round(r.expected))} expected at ${r.limit}${unit} a minute (${r.ratio.toFixed(3)})` : '', ...(f.n && r.ratio < 1 ? { tone: 'a' as LeanTone } : f.n ? {} : { tone: 'n' as LeanTone }) },
      r.ppk !== undefined
        ? { k: 'Ppk on rates', v: r.ppk.toFixed(2), of: `one-sided · from ${f.n} intervals${r.ppkLow !== undefined ? ` · 95% sure at least ${r.ppkLow.toFixed(2)}` : ''}`, ...(r.ppk < 1 ? { tone: 'a' as LeanTone } : {}) }
        : { k: 'Ppk on rates', v: '—', of: `said from 25 intervals · ${f.n} so far`, tone: 'n' as LeanTone },
      verdictTile];
  }
  /* pass or fail: how many failed of how many may, and what the count
     proves (knowledge/specs/FC-094-capability.md §7) */
  if (a.kind === 'ticks' && f.ticks) {
    const t = f.ticks, over = t.bad.length > t.allowFail, pc = pctWord(t.conf);
    /* the rule beside the count for a loss allowed or a confidence level (part 1b) */
    const rule = t.judge === 'loss' ? ` · ${t.good}% good` : t.judge === 'confidence' ? ` · ${t.good}% good, ${pc} confident` : '';
    return [...tiles,
      { k: 'Failed', v: t.bad.length.toLocaleString('en-GB'), of: `${t.allowFail > 0 ? `of ${t.allowFail.toLocaleString('en-GB')} allowed` : 'none allowed'}${rule}`, ...(over ? { tone: 'r' as LeanTone } : f.n ? {} : { tone: 'n' as LeanTone }) },
      /* WHAT IT PROVES, WITH ITS CONFIDENCE — a number that may fail as fewer than x in 100 failing; a
         loss allowed or a confidence level as the share good, rounded down */
      !(f.n && t.proves < 0.995)
        ? { k: 'Confident', v: '—', of: 'nothing yet about how few would fail', tone: 'n' as LeanTone }
        : t.judge === 'count'
          ? { k: 'Confident', v: fewerThan(t.proves).replace('fewer than', '<'), of: `would fail — ${pc} confident${t.proves > 0.01 ? ` · 1 in 100 takes ${t.toShow1.toLocaleString('en-GB')}` : ''}` }
          : { k: 'Confident', v: `≥ ${goodWord(1 - t.proves)}`, of: `good — ${pc} confident` },
      ...rejectsTile(f, a),
      { k: 'Verdict', v: said.verdict, of: said.text, ...(tone(said.tone) ? { tone: tone(said.tone) } : {}) }];
  }
  const ok = f.ppk !== undefined && Number.isFinite(f.ppk) && f.n >= CPK_FROM;
  return [
    ...tiles,
    { k: 'Mean', v: f.n ? `${fx(f.mean)}${unit}` : '—', of: f.n ? `${fx(f.min)}–${fx(f.max)} across the readings` : 'said once a reading is in' },
    { k: 'Outside', v: String(f.outside.length), of: `of ${limits}`, ...(f.outside.length ? { tone: 'r' as LeanTone } : f.n ? {} : { tone: 'n' as LeanTone }) },
    ...giveawayTile(f, a),
    ok
      ? { k: 'Ppk', v: (f.ppk as number).toFixed(2), of: `${f.cpk !== undefined && Number.isFinite(f.cpk) ? `Cpk ${f.cpk.toFixed(2)} · ` : ''}from ${f.n} readings${f.ppkLow !== undefined ? ` · 95% sure at least ${f.ppkLow.toFixed(2)}` : ''}`, ...(cap && tone(cap.tone) ? { tone: tone(cap.tone) } : {}) }
      : { k: 'Ppk', v: '—', of: `said from ${CPK_FROM} readings · ${f.n} so far` },
  ];
}

/** THE CLOSING LINE — the verdict and the tiles in one sentence: the
 *  readings in, those outside, and Ppk when it can be said (the reading
 *  itself is said once, above it, as "what it says"). */
export function sampleClosing(f: SampleFigures, a: AgreedReadings, said: SampleSays): { text: string; tone: LeanTone } {
  const tones = [said.tone, said.capability?.tone];
  const t: LeanTone = tones.includes('r') ? 'r' : tones.includes('a') ? 'a' : said.tone === 'g' ? 'g' : 'n';
  if (a.kind === 'rejects' && f.runs) return { text: f.n ? `${said.verdict} — ${f.runs.rejected.toLocaleString('en-GB')} rejected of ${f.runs.made.toLocaleString('en-GB')} made over ${f.n} of ${f.count} runs (${(f.runs.p * 100).toFixed(2)}%).` : `${said.verdict} — ${f.count} runs agreed, none in yet.`, tone: f.n ? t : 'n' };
  if (a.kind === 'faults' && f.faults) return { text: f.n ? `${said.verdict} — ${f.faults.faults.toLocaleString('en-GB')} faults on ${f.faults.items.toLocaleString('en-GB')} items over ${f.n} of ${f.count} inspections (${f.faults.dpu.toFixed(3)} an item).` : `${said.verdict} — ${f.count} inspections agreed, none in yet.`, tone: f.n ? t : 'n' };
  if (a.kind === 'rate' && f.rate) return { text: f.n ? `${said.verdict} — ${f.rate.met} of ${f.n} intervals met, the longest stretch ${f.rate.stretchMin} minutes, ${f.rate.made.toLocaleString('en-GB')} made.` : `${said.verdict} — ${f.count} intervals agreed, none counted yet.`, tone: f.n ? t : 'n' };
  if (!f.n) return { text: `${said.verdict} — ${f.count} readings agreed, none in yet.`, tone: 'n' };
  if (a.kind === 'ticks') {
    const failed = f.ticks?.bad.length ?? 0, allowed = f.ticks?.allowFail ?? 0;
    const rule = f.ticks ? ruleWords(f.ticks) : '';
    const n = (v: number) => v.toLocaleString('en-GB');
    return { text: `${said.verdict} — ${n(f.n)} of ${n(f.count)} checked, ${failed ? `${n(failed)} failed` : 'none failed'}${allowed > 0 || rule ? ` (${n(Math.max(0, allowed))} allowed${rule})` : ''}.`, tone: t };
  }
  const ok = f.ppk !== undefined && Number.isFinite(f.ppk) && f.n >= CPK_FROM;
  return { text: `${said.verdict} — ${f.n} of ${f.count} readings in, ${f.outside.length} outside${ok ? `, Ppk ${(f.ppk as number).toFixed(2)}` : ''}.`, tone: t };
}

/* MONEY (knowledge/specs/FC-156-capability-money.md §7) — one tile each, in the
 * study's own figures: give-away a pack with the shift and the week when they
 * can be said; the rejects a shift by what became of them. A missing input is
 * named on the tile, never a figure invented. */
function giveawayTile(f: SampleFigures, a: AgreedReadings): LeanTile[] {
  const g = sampleMoney(f, a).giveaway;
  if (!g) return [];
  const unit = a.unit ? ` ${a.unit}` : '';
  if (g.perPack <= 0) return [{ k: 'Give-away', v: 'none', of: 'the mean is not over the nominal', tone: 'g' as LeanTone }];
  const parts = [g.kgShift !== undefined ? `${kgWord(g.kgShift)} a shift` : '', g.gbpShift !== undefined ? `${gbpWord(g.gbpShift)} a shift` : '', g.gbpWeek !== undefined ? `${gbpWord(g.gbpWeek)} a week` : ''].filter(Boolean);
  return [{ k: 'Give-away', v: `${g.perPack.toFixed(f.dp)}${unit}`, of: `a pack over the nominal${parts.length ? ` — ${parts.join(' · ')}` : ''}${g.missing.length ? ` · ${g.missing.join('; ')}` : ''}`, tone: (g.gbpShift !== undefined ? 'a' : 'n') as LeanTone }];
}
function rejectsTile(f: SampleFigures, a: AgreedReadings): LeanTile[] {
  const r = sampleMoney(f, a).rejects;
  if (!r) return [];
  const n = (v: number) => v.toLocaleString('en-GB');
  const by = (['waste', 'rework', 'recovered'] as Fate[]).filter(k => r.fates[k] > 0);
  if (!r.shift) return [{ k: 'Rejects cost', v: '—', of: `${by.map(k => `${n(r.fates[k])} ${fateWord(k)}`).join(' · ')} · ${r.missing.join('; ')}`, tone: 'n' as LeanTone }];
  const s = r.shift;
  const said = by.map(k => k === 'waste' ? `${n(s.waste)} waste${s.wasteGbp !== undefined ? ` ${gbpWord(s.wasteGbp)}` : ''}`
    : k === 'rework' ? `${n(s.rework)} reworked${s.reworkGbp !== undefined ? ` ${gbpWord(s.reworkGbp)}` : ''}`
    : `${n(s.recovered)} recovered by hand, not priced`).join(' · ');
  return [{ k: 'Rejects cost', v: s.gbp !== undefined ? gbpWord(s.gbp) : '—', of: `a shift — from ${n(r.failed)} of ${n(r.n)}: ${said}${r.weekGbp !== undefined ? ` · ${gbpWord(r.weekGbp)} a week` : ''}${r.missing.length ? ` · ${r.missing.join('; ')}` : ''}`, tone: (s.gbp !== undefined && s.gbp > 0 ? 'a' : 'n') as LeanTone }];
}
