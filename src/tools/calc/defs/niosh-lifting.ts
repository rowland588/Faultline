/* NIOSH LIFTING — FC-207 (knowledge/specs/FC-207-niosh-lifting.md; ergonomics.niosh-lifting). */
import { assessLift, CAVEAT, type Coupling, type LiftHours, type Multipliers } from '../../../lib/ie/ergo';
import { fmt } from '../format';
import type { CalcDef, Problem, Values } from '../types';

const num = (v: Values, id: string): number => v[id] as number;

const FACTOR: Record<keyof Multipliers, string> = {
  hm: 'horizontal reach',
  vm: 'vertical height at the start',
  dm: 'vertical travel',
  am: 'twist',
  fm: 'lifting frequency',
  cm: 'hand coupling',
};

function limiting(m: Multipliers): keyof Multipliers {
  let k: keyof Multipliers = 'hm';
  let v = m.hm;
  for (const key of Object.keys(m) as (keyof Multipliers)[]) {
    if (m[key] < v) { k = key; v = m[key]; }
  }
  return k;
}

const toneOf = (band: string): 'a' | 'n' | 'r' => (band === 'nominal' ? 'n' : band === 'increased' ? 'a' : 'r');

const def: CalcDef = {
  key: 'niosh-lifting',
  fc: 'FC-207',
  title: 'NIOSH lifting equation',
  says: 'Recommended weight limit and lifting index for one two-handed lift — a screening tool, not a full assessment',
  question: 'Is this lift within the recommended limit?',
  group: 'People and ergonomics',
  inputs: [
    { id: 'task', label: 'Task', kind: 'text', optional: true, help: 'Palletising cases, loading sacks — names the sentence only.' },
    { id: 'loadKg', label: 'Load lifted', unit: 'kg', kind: 'number', min: 0.000001, help: 'The weight in the hands at the start — include the box, not just the product.' },
    { id: 'hCm', label: 'Hands from mid-point between ankles', unit: 'cm', kind: 'number', min: 0, help: 'Horizontal reach — measure at the start of the lift; under 25 cm counts as 25 cm.' },
    { id: 'vCm', label: 'Hands above floor at start', unit: 'cm', kind: 'number', min: 0, help: 'Vertical height at origin — floor to knuckles at the start.' },
    { id: 'dCm', label: 'Vertical travel of the lift', unit: 'cm', kind: 'number', min: 0.000001, help: 'How far the hands move up (or down) — origin to destination.' },
    { id: 'aDeg', label: 'Twist from straight ahead', unit: '°', kind: 'number', min: 0, default: 0, chosen: '0° when the person faces the load — measure if they twist.' },
    { id: 'liftsPerMin', label: 'Lifts a minute', unit: 'lifts/min', kind: 'number', min: 0, help: 'Average over the task — the manual’s frequency table uses this and how long lifting goes on.' },
    { id: 'hours', label: 'Lifting goes on for', kind: 'choice', default: '1',
      options: [
        { value: '1', label: 'Up to 1 hour', help: 'With the recovery breaks the manual assumes.' },
        { value: '2', label: 'Up to 2 hours', help: 'Less recovery — the frequency multiplier is stricter.' },
        { value: '8', label: 'Up to 8 hours (a shift)', help: 'The shift column of the frequency table.' },
      ] },
    { id: 'coupling', label: 'Hand coupling', kind: 'choice', default: 'fair',
      options: [
        { value: 'good', label: 'Good — handles or cut-outs', help: 'Multiplier 1.0 at any height.' },
        { value: 'fair', label: 'Fair — box without handles', help: '0.95 when hands start below 75 cm, 1.0 when high.' },
        { value: 'poor', label: 'Poor — loose or awkward grip', help: '0.90 — sacks, slippery cartons.' },
      ] },
  ],
  check(_v): Problem[] {
    return [];
  },
  compute(v) {
    const r = assessLift({
      loadKg: num(v, 'loadKg'),
      hCm: num(v, 'hCm'),
      vCm: num(v, 'vCm'),
      dCm: num(v, 'dCm'),
      aDeg: num(v, 'aDeg'),
      liftsPerMin: num(v, 'liftsPerMin'),
      hours: Number(v.hours) as LiftHours,
      coupling: v.coupling as Coupling,
    });
    const lim = limiting(r.m);
    const more: string[] = [];
    if (r.rwl > 0) more.push(`${FACTOR[lim]} is the biggest limit — multiplier ${fmt(r.m[lim], 2)}.`);
    if (r.notes.length) more.push(...r.notes);

    const liWord = isFinite(r.li) ? r.li.toFixed(2) : '—';
    const verdict = r.band === 'outside'
      ? 'Outside the equation'
      : `Index ${liWord} — ${r.band === 'nominal' ? 'nominal risk' : r.band === 'increased' ? 'increased risk' : 'high risk'}`;

    return {
      verdict,
      tone: toneOf(r.band),
      sentence: r.sentence,
      more,
      tiles: [
        { k: 'Recommended limit', v: r.rwl > 0 ? `${fmt(r.rwl, 1)} kg` : '—', of: 'RWL at this geometry', n: r.rwl, better: 'higher', fmt: x => `${fmt(x, 1)} kg` },
        { k: 'Lifting index', v: isFinite(r.li) ? liWord : '—', of: `${fmt(num(v, 'loadKg'), 1)} kg ÷ limit`, n: isFinite(r.li) ? r.li : undefined, better: 'lower', fmt: x => fmt(x, 2), ...(r.li > 1 ? { tone: 'a' as const } : {}), ...(r.li > 3 ? { tone: 'r' as const } : {}) },
        { k: 'Load', v: `${fmt(num(v, 'loadKg'), 1)} kg`, of: typeof v.task === 'string' && v.task.trim() ? v.task.trim() : 'this lift', n: num(v, 'loadKg'), fmt: x => `${fmt(x, 1)} kg` },
        { k: 'Biggest limit', v: r.rwl > 0 ? FACTOR[lim] : '—', of: r.rwl > 0 ? `multiplier ${fmt(r.m[lim], 2)}` : 'task out of range' },
      ],
      working: [
        { label: 'Load constant', value: 'LC = 23 kg', note: 'NIOSH revised equation' },
        { label: 'HM — horizontal', value: fmt(r.m.hm, 3), note: '25 ÷ H, capped' },
        { label: 'VM — vertical start', value: fmt(r.m.vm, 3), note: '1 − 0.003|V − 75|' },
        { label: 'DM — travel', value: fmt(r.m.dm, 3), note: '0.82 + 4.5 ÷ D' },
        { label: 'AM — asymmetry', value: fmt(r.m.am, 3), note: '1 − 0.0032A' },
        { label: 'FM — frequency', value: fmt(r.m.fm, 3), note: 'Table 5' },
        { label: 'CM — coupling', value: fmt(r.m.cm, 3), note: 'Table 7' },
        { label: 'RWL', value: r.rwl > 0 ? `${fmt(r.rwl, 2)} kg` : 'outside range', note: '23 × HM × VM × DM × AM × FM × CM' },
        { label: 'LI', value: isFinite(r.li) ? fmt(r.li, 2) : '—', note: 'load ÷ RWL' },
      ],
      caveats: [
        CAVEAT,
        'Two-handed, smooth lifts only — carrying, pushing, team lifts and jerking loads are not covered.',
        'UK sites often assess with HSE MAC charts instead — this is the NIOSH screening equation.',
        'A high index points to geometry and frequency to change — it does not say which control to pick.',
      ],
      closing: r.rwl > 0
        ? `At ${fmt(num(v, 'loadKg'), 1)} kg the lifting index is ${liWord} against ${fmt(r.rwl, 1)} kg — ${FACTOR[lim]} is the first multiplier to improve.`
        : 'The measurements put this task outside the equation — measure again or use a different assessment method.',
      money: { missing: ['NIOSH gives risk only — no money on this calculator (FC-207).'] },
    };
  },
  examples: [
    {
      name: 'CCOHS floor-to-150 cm lift, poor grip, once in a while',
      source: 'src/lib/ie/__tests__/ergo.test.ts — CCOHS worked example; NIOSH Applications Manual',
      inputs: { loadKg: 13, hCm: 30, vCm: 2, dCm: 150, aDeg: 0, liftsPerMin: 0.2, hours: '1', coupling: 'poor' },
      expect: {
        verdict: 'Index 1.14 — increased risk',
        tone: 'a',
        sentence: 'Lift: 13 kg against a limit of 11.5 kg — index 1.14, increased risk.',
        tiles: { 'Recommended limit': '11.5 kg', 'Lifting index': '1.14', Load: '13 kg', 'Biggest limit': 'vertical height at the start' },
      },
    },
    {
      name: 'Nominal — light load under the limit',
      source: 'by hand: 8 kg against RWL ≈ 11.5 from the case above',
      inputs: { loadKg: 8, hCm: 30, vCm: 2, dCm: 150, aDeg: 0, liftsPerMin: 0.2, hours: '1', coupling: 'poor' },
      expect: {
        verdict: 'Index 0.70 — nominal risk',
        tone: 'n',
        sentence: 'Lift: 8 kg against a limit of 11.5 kg — index 0.70, nominal risk.',
        tiles: { 'Lifting index': '0.70' },
      },
    },
    {
      name: 'Beyond horizontal reach — outside the equation',
      source: 'src/lib/ie/__tests__/ergo.test.ts — hands more than 63 cm out',
      inputs: { loadKg: 10, hCm: 70, vCm: 50, dCm: 30, aDeg: 0, liftsPerMin: 1, hours: '1', coupling: 'good' },
      expect: {
        verdict: 'Outside the equation',
        tone: 'r',
        sentence: 'Lift: 10 kg — the task is outside the equation\'s range (the hands are more than 63 cm out — beyond the equation).',
        tiles: { 'Recommended limit': '—', 'Lifting index': '—' },
      },
    },
  ],
  refused: [
    { name: 'no load', inputs: { hCm: 30, vCm: 50, dCm: 30, aDeg: 0, liftsPerMin: 1, hours: '1', coupling: 'good' }, blocked: 'Load lifted' },
    { name: 'zero load', inputs: { loadKg: 0, hCm: 30, vCm: 50, dCm: 30, aDeg: 0, liftsPerMin: 1, hours: '1', coupling: 'good' }, blocked: 'must be at least' },
  ],
};

export default def;
