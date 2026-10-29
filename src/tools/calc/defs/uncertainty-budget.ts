/* MEASUREMENT UNCERTAINTY BUDGET — FC-123 (knowledge/specs/FC-123-uncertainty-budget.md; msa.measurement-uncertainty). */
import {
  guardLower,
  testUncertaintyRatio,
  uncertaintyBudget,
} from '../../../lib/ie/uncertainty';
import { fmt, gbp } from '../format';
import type { CalcDef, CalcMoney, Problem, Values } from '../types';

const num = (v: Values, id: string): number | undefined => {
  const x = v[id];
  return typeof x === 'number' && Number.isFinite(x) ? x : undefined;
};
const unit = (v: Values): string => (typeof v.unit === 'string' && v.unit.trim() ? v.unit.trim() : 'g');

const def: CalcDef = {
  key: 'uncertainty-budget',
  fc: 'FC-123',
  title: 'Measurement uncertainty budget',
  says: 'How sure a reading is — resolution, repeatability and the certificate combined',
  question: 'What is the ± on a reading from this gauge, and how far inside a limit must it be?',
  group: 'Measurement systems',
  inputs: [
    { id: 'gauge', label: 'Gauge', kind: 'text', optional: true, help: 'Bench scale, cook probe — names the sentence only.' },
    { id: 'unit', label: 'Unit', kind: 'text', default: 'g', help: 'g, °C, mm — the same unit on every source.' },
    { id: 'resolution', label: 'Resolution (smallest step)', unit: 'same unit', kind: 'number', min: 0.000001, help: 'What the display steps by — 0.01 g on many scales.' },
    { id: 'repeatability', label: 'Repeatability s', unit: 'same unit', kind: 'number', min: 0.000001, help: 'Standard deviation from a Type 1 study or daily checks on one reference.' },
    { id: 'nReadings', label: 'Readings averaged', kind: 'number', min: 1, integer: true, default: 1,
      chosen: 'Default 1 — a single reading unless you are averaging several.',
      help: '1 for a single reading; 10 if you take the mean of ten.' },
    { id: 'certU', label: 'Certificate expanded U', unit: 'same unit', kind: 'number', min: 0.000001, help: 'From the calibration certificate, same unit as the gauge.' },
    { id: 'certK', label: 'Certificate k', kind: 'number', min: 1, default: 2, chosen: 'Faultline assumes k = 2 on the certificate unless you change it.' },
    { id: 'kOut', label: 'State expanded U at k', kind: 'number', min: 1, default: 2, chosen: 'k = 2 for about 95% — usual on certificates and guard bands.' },
    { id: 'lowerLimit', label: 'Lower limit to meet', unit: 'same unit', kind: 'number', optional: true, help: 'Optional: legal minimum weight or CCP floor — for a one-sided guard band.' },
    { id: 'tolerance', label: 'Tolerance (two-sided)', unit: 'same unit', kind: 'number', min: 0.000001, optional: true, help: 'Optional: full tolerance width — for the test uncertainty ratio.' },
    { id: 'costKilo', label: 'Cost a kilo', unit: '£ a kilo', kind: 'number', min: 0, optional: true, money: true, help: 'Optional: to say give-away on the guard band (weight goods only).' },
  ],
  check(v): Problem[] {
    const out: Problem[] = [];
    const n = num(v, 'nReadings');
    if (n !== undefined && n < 1) out.push({ field: 'nReadings', say: 'At least one reading.', block: true });
    return out;
  },
  compute(v) {
    const u = unit(v);
    const gName = typeof v.gauge === 'string' && v.gauge.trim() ? v.gauge.trim() : 'The gauge';
    const r = uncertaintyBudget({
      resolution: num(v, 'resolution') as number,
      repeatability: num(v, 'repeatability') as number,
      n: num(v, 'nReadings') ?? 1,
      certU: num(v, 'certU') as number,
      certK: num(v, 'certK') ?? 2,
      k: num(v, 'kOut') ?? 2,
    });
    const U = r.U;
    const sentence = `${gName} reads to ±${fmt(U, 2)} ${u} (k = ${fmt(r.k, 0)}) on ${num(v, 'nReadings') === 1 ? 'a single reading' : `the mean of ${num(v, 'nReadings')} readings`} — ${fmt(r.dominantSharePct, 0)}% of that is ${r.dominant.toLowerCase()}.`;

    const more: string[] = [];
    const L = num(v, 'lowerLimit');
    if (L !== undefined) {
      const g = guardLower(L, U);
      more.push(`To be sure a pack is above ${fmt(L, 2)} ${u}, the reading must be at least ${fmt(g, 2)} ${u} (limit plus U).`);
    }
    const T = num(v, 'tolerance');
    if (T !== undefined) {
      const tur = testUncertaintyRatio(T, U);
      if (tur !== undefined) {
        more.push(`Test uncertainty ratio: tolerance ÷ (2U) = ${fmt(T, 2)} ÷ (2 × ${fmt(U, 3)}) ≈ ${fmt(tur, 1)}${tur >= 4 ? ' — fit by the usual rule of 4 or more' : ' — below 4, the guard band eats much of the tolerance'}.`);
      }
    }
    if ((num(v, 'nReadings') ?? 1) > 1) {
      const single = uncertaintyBudget({
        resolution: num(v, 'resolution') as number,
        repeatability: num(v, 'repeatability') as number,
        n: 1,
        certU: num(v, 'certU') as number,
        certK: num(v, 'certK') ?? 2,
        k: num(v, 'kOut') ?? 2,
      });
      more.push(`A single reading instead would be ±${fmt(single.U, 2)} ${u} — averaging ${num(v, 'nReadings')} readings brings it to ±${fmt(U, 2)} ${u}.`);
    }

    const costK = num(v, 'costKilo');
    let money: CalcMoney;
    if (L !== undefined && costK !== undefined && u === 'g') {
      const extraG = U;
      const givePerPack = (extraG / 1000) * costK;
      money = {
        text: `The guard band of ${fmt(U, 2)} g on every pack checked to the limit is give-away — about ${gbp(givePerPack)} a pack at ${gbp(costK)} a kilo.`,
        figures: [['Give-away a pack at the guard band', gbp(givePerPack)]],
        missing: [],
      };
    } else {
      const missing: string[] = [];
      if (L === undefined) missing.push('Give a lower limit and cost a kilo to say give-away on the guard band.');
      else if (costK === undefined) missing.push('Give cost a kilo to say give-away on the guard band.');
      else if (u !== 'g') missing.push('Give-away is worked for grams and cost a kilo — other units are not priced here.');
      money = { missing };
    }

    const tur = T !== undefined ? testUncertaintyRatio(T, U) : undefined;
    return {
      verdict: `±${fmt(U, 2)} ${u}`,
      tone: tur !== undefined && tur < 4 ? 'a' : 'n',
      sentence,
      more,
      tiles: [
        { k: 'Expanded U', v: `±${fmt(U, 2)}`, of: `${u} at k = ${fmt(r.k, 0)}`, n: U, better: 'lower', fmt: x => `±${fmt(x, 2)} ${u}` },
        { k: 'Combined u_c', v: fmt(r.uc, 3), of: `${u} (1σ)`, n: r.uc, better: 'lower', fmt: x => `${fmt(x, 3)} ${u}` },
        { k: 'Dominant source', v: `${fmt(r.dominantSharePct, 0)}%`, of: r.dominant, n: r.dominantSharePct, better: 'lower', fmt: x => `${fmt(x, 0)}%` },
        L !== undefined
          ? { k: 'Guard at limit', v: fmt(guardLower(L, U), 2), of: `minimum reading above ${fmt(L, 2)} ${u}`, n: guardLower(L, U), better: 'lower', fmt: x => `${fmt(x, 2)} ${u}` }
          : { k: 'Guard at limit', v: '—', of: 'give a lower limit' },
        tur !== undefined
          ? { k: 'TUR', v: fmt(tur, 1), of: 'tolerance ÷ (2U)', n: tur, better: 'higher', fmt: x => fmt(x, 1) }
          : { k: 'TUR', v: '—', of: 'give a tolerance' },
      ],
      working: r.sources.map(s => ({
        label: s.name,
        value: `u = ${fmt(s.u, 4)} ${u} (${fmt(s.sharePct, 1)}% of u_c²)`,
        note: s.name === 'Resolution' ? 'δ/(2√3), rectangular' : s.name === 'Repeatability' ? `s/√${num(v, 'nReadings') ?? 1}` : `U/k on certificate`,
      })).concat([
        { label: 'Combined', value: `u_c = ${fmt(r.uc, 4)} ${u}`, note: '√Σu²' },
        { label: 'Expanded', value: `U = ${fmt(r.k, 0)} × ${fmt(r.uc, 4)} = ${fmt(U, 3)} ${u}`, note: 'k × u_c' },
      ]),
      caveats: [
        'Sources left out (temperature, operator, drift since calibration) make U too small — list only what you have evidence for.',
        'k = 2 assumes several sources contribute; one dominant rectangular source gives less than 95% at k = 2.',
        'The guard band is a decision rule (JCGM 106) — the team still applies the product limit and the HACCP plan.',
        'This is how sure one result is; gauge R&R (FC-118) asks whether the whole system is fit for a tolerance.',
      ],
      money,
      closing: `${gName}: ±${fmt(U, 2)} ${u} (k = ${fmt(r.k, 0)}); improve ${r.dominant.toLowerCase()} first if U must shrink.`,
    };
  },
  examples: [
    {
      name: 'Bench scale — single reading (cases-msa.py)',
      source: 'scripts/knowledge/cases-msa.py msa.measurement-uncertainty',
      inputs: { gauge: 'Bench scale', unit: 'g', resolution: 0.01, repeatability: 0.08, nReadings: 1, certU: 0.05, certK: 2, kOut: 2, lowerLimit: 400 },
      expect: {
        verdict: '±0.17 g',
        tone: 'n',
        sentence: 'Bench scale reads to ±0.17 g (k = 2) on a single reading — 91% of that is repeatability.',
        tiles: { 'Expanded U': '±0.17', 'Combined u_c': '0.084', 'Dominant source': '91%', 'Guard at limit': '400.17' },
      },
    },
    {
      name: 'Mean of ten readings',
      source: 'cases-msa.py — u_rep 0.025, U 0.071',
      inputs: { gauge: 'Bench scale', unit: 'g', resolution: 0.01, repeatability: 0.08, nReadings: 10, certU: 0.05, certK: 2, kOut: 2, lowerLimit: 400 },
      expect: {
        verdict: '±0.07 g',
        tone: 'n',
        sentence: 'Bench scale reads to ±0.07 g (k = 2) on the mean of 10 readings — 50% of that is repeatability.',
        tiles: { 'Expanded U': '±0.07', 'Guard at limit': '400.07' },
      },
    },
    {
      name: 'TUR on a 10 g tolerance',
      source: 'cases-msa.py — 10/(2×0.17) ≈ 29',
      inputs: { gauge: 'Bench scale', unit: 'g', resolution: 0.01, repeatability: 0.08, nReadings: 1, certU: 0.05, certK: 2, kOut: 2, tolerance: 10 },
      expect: {
        verdict: '±0.17 g',
        tone: 'n',
        sentence: 'Bench scale reads to ±0.17 g (k = 2) on a single reading — 91% of that is repeatability.',
        tiles: { TUR: '29.8' },
      },
    },
  ],
  refused: [
    { name: 'no resolution', inputs: { repeatability: 0.08, nReadings: 1, certU: 0.05, certK: 2, kOut: 2 }, blocked: 'Resolution' },
    { name: 'zero repeatability refused', inputs: { resolution: 0.01, repeatability: 0, nReadings: 1, certU: 0.05, certK: 2, kOut: 2 }, blocked: 'must be at least' },
  ],
  see: [{ key: 'littles-law', why: 'different question — how long product waits, not how sure a weight is' }],
};

export default def;
