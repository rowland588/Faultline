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

const tone = (t: string): LeanTone | undefined => (t === 'r' || t === 'a' || t === 'g' ? t : undefined);

export function sampleTiles(f: SampleFigures, a: AgreedReadings, said: SampleSays): LeanTile[] {
  const unit = a.unit ? ` ${a.unit}` : '';
  const fx = (v?: number) => (v === undefined ? '—' : v.toFixed(f.dp));
  const cap = said.capability;
  const limits = a.kind === 'packers' ? `the ℮ ${a.nominal}${unit} rules`
    : a.lower !== undefined && a.upper !== undefined ? `${a.lower}–${a.upper}${unit}`
    : a.lower !== undefined ? `at least ${a.lower}${unit}` : a.upper !== undefined ? `at most ${a.upper}${unit}` : 'the limits';
  const tiles: LeanTile[] = [
    { k: a.kind === 'ticks' ? 'Checked' : 'Readings', v: String(f.n), of: `of ${f.count} agreed${f.n < f.count ? ` · ${f.count - f.n} still to take` : ''}`, ...(f.n ? {} : { tone: 'n' as LeanTone }) },
  ];
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
