/* A CAPABILITY STUDY AS A LEAN PAGE (docs/LEAN-PAGE.md, slice 6) — the tiles
 * and the closing line its page (screens/StudyScreen) and its paper say, read
 * from lib/ie/sample: the readings in of those agreed, the mean and the range,
 * the readings outside the limits, and Ppk and Cpk with how many they are
 * from — every figure its strip held, now its tiles. Nothing is worked out
 * here. What the readings outside would cost is not said yet (BLUEPRINT §6,
 * Money in every tool): no figure is made up for it. */
import type { LeanTile, LeanTone } from '../lean';
import type { AgreedReadings } from '../study';
import { CPK_FROM, type SampleFigures, type SampleSays } from './sample';

const tone = (t: string): LeanTone | undefined => (t === 'r' || t === 'a' || t === 'g' ? t : undefined);

export function sampleTiles(f: SampleFigures, a: AgreedReadings, said: SampleSays): LeanTile[] {
  const unit = a.unit ? ` ${a.unit}` : '';
  const fx = (v?: number) => (v === undefined ? '—' : v.toFixed(f.dp));
  const cap = said.capability;
  const limits = a.kind === 'packers' ? `the ℮ ${a.nominal}${unit} rules`
    : a.lower !== undefined && a.upper !== undefined ? `${a.lower}–${a.upper}${unit}`
    : a.lower !== undefined ? `at least ${a.lower}${unit}` : a.upper !== undefined ? `at most ${a.upper}${unit}` : 'the limits';
  const tiles: LeanTile[] = [
    { k: 'Readings', v: String(f.n), of: `of ${f.count} agreed${f.n < f.count ? ` · ${f.count - f.n} still to take` : ''}`, ...(f.n ? {} : { tone: 'n' as LeanTone }) },
  ];
  if (a.kind === 'ticks') return [...tiles, { k: 'Verdict', v: said.verdict, of: said.text, ...(tone(said.tone) ? { tone: tone(said.tone) } : {}) }];
  const ok = f.ppk !== undefined && Number.isFinite(f.ppk) && f.n >= CPK_FROM;
  return [
    ...tiles,
    { k: 'Mean', v: f.n ? `${fx(f.mean)}${unit}` : '—', of: f.n ? `${fx(f.min)}–${fx(f.max)} across the readings` : 'said once a reading is in' },
    { k: 'Outside', v: String(f.outside.length), of: `of ${limits}`, ...(f.outside.length ? { tone: 'r' as LeanTone } : f.n ? {} : { tone: 'n' as LeanTone }) },
    ok
      ? { k: 'Ppk', v: (f.ppk as number).toFixed(2), of: `${f.cpk !== undefined && Number.isFinite(f.cpk) ? `Cpk ${f.cpk.toFixed(2)} · ` : ''}from ${f.n} readings`, ...(cap && tone(cap.tone) ? { tone: tone(cap.tone) } : {}) }
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
  if (a.kind === 'ticks') return { text: `${said.verdict} — ${f.n} of ${f.count} in.`, tone: t };
  const ok = f.ppk !== undefined && Number.isFinite(f.ppk) && f.n >= CPK_FROM;
  return { text: `${said.verdict} — ${f.n} of ${f.count} readings in, ${f.outside.length} outside${ok ? `, Ppk ${(f.ppk as number).toFixed(2)}` : ''}.`, tone: t };
}
