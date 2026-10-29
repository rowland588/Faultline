/* ATTRIBUTE AGREEMENT — do inspectors agree? (FC-121, msa.attribute-agreement; knowledge/specs/FC-121-attribute-agreement.md). */

export interface AttrJudgment {
  item: string;
  inspector: string;
  look: number;
  /** true = reject / fail the visual standard */
  reject: boolean;
}

export interface AttrReference {
  item: string;
  reject: boolean;
}

export interface AttrInspectorResult {
  name: string;
  selfAgree: number;
  bothRight: number;
  kappaRef: number;
  missRate: number;
  falseAlarmRate: number;
  band: 'good' | 'marginal' | 'poor';
}

export interface AttrResult {
  nItems: number;
  nInspectors: number;
  looks: number;
  inspectors: AttrInspectorResult[];
  allLooksAgree: number;
  allLooksRight: number;
  fleissKappa: number;
  /** items where any look by any inspector ≠ reference */
  disagreeItems: string[];
  fleissBand: 'good' | 'marginal' | 'poor';
}

const as01 = (reject: boolean): number => (reject ? 1 : 0);

/** Cohen's κ between two equal-length 0/1 vectors. */
export function cohensKappa(a: number[], b: number[]): number {
  if (a.length !== b.length || !a.length) return NaN;
  const n = a.length;
  let agree = 0;
  for (let i = 0; i < n; i++) if (a[i] === b[i]) agree++;
  const po = agree / n;
  const p1 = a.reduce((s, x) => s + x, 0) / n;
  const p2 = b.reduce((s, x) => s + x, 0) / n;
  const pe = p1 * p2 + (1 - p1) * (1 - p2);
  if (pe >= 1) return 1;
  return (po - pe) / (1 - pe);
}

/** Fleiss κ for N items × k raters, each rating 0/1 (pass/reject). */
export function fleissKappa(ratings: number[][]): number {
  const N = ratings.length;
  if (!N) return NaN;
  const k = ratings[0]?.length ?? 0;
  if (!k || k < 2) return NaN;
  const nCat = 2;
  let pBar = 0;
  for (let i = 0; i < N; i++) {
    const row = ratings[i];
    let sumSq = 0;
    for (let c = 0; c < nCat; c++) {
      const nij = row.filter(x => x === c).length;
      sumSq += nij * nij;
    }
    pBar += (sumSq - k) / (k * (k - 1));
  }
  pBar /= N;
  const pJ = [0, 0];
  for (let i = 0; i < N; i++) for (const v of ratings[i]) pJ[v]++;
  const pe = pJ.reduce((s, nj) => s + (nj / (N * k)) ** 2, 0);
  if (pe >= 1) return 1;
  return (pBar - pe) / (1 - pe);
}

export function kappaBand(k: number): 'good' | 'marginal' | 'poor' {
  if (Number.isNaN(k)) return 'poor';
  if (k >= 0.75) return 'good';
  if (k >= 0.4) return 'marginal';
  return 'poor';
}

export function attributeAgreement(refs: AttrReference[], judgments: AttrJudgment[]): AttrResult | undefined {
  if (!refs.length || refs.length < 10) return undefined;
  const items = [...new Set(refs.map(r => r.item))].sort();
  if (items.length !== refs.length) return undefined;
  const refMap = new Map(refs.map(r => [r.item, r.reject]));
  const inspectors = [...new Set(judgments.map(j => j.inspector))].sort();
  if (inspectors.length < 2) return undefined;
  const looks = [...new Set(judgments.map(j => j.look))].sort((a, b) => a - b);
  if (!looks.length) return undefined;
  const need = items.length * inspectors.length * looks.length;
  const cells = new Map<string, boolean>();
  for (const j of judgments) cells.set(`${j.item}\0${j.inspector}\0${j.look}`, j.reject);
  for (const item of items) for (const insp of inspectors) for (const lk of looks) {
    if (!cells.has(`${item}\0${insp}\0${lk}`)) return undefined;
  }
  if (cells.size !== need) return undefined;

  const truth = items.map(it => as01(refMap.get(it) as boolean));
  const nRejects = truth.filter(x => x === 1).length;
  const nGood = truth.length - nRejects;

  const inspResults: AttrInspectorResult[] = inspectors.map(name => {
    const look1 = items.map(it => as01(cells.get(`${it}\0${name}\0${looks[0]}`) as boolean));
    const look2 = looks.length > 1
      ? items.map(it => as01(cells.get(`${it}\0${name}\0${looks[1]}`) as boolean))
      : look1;
    let selfMatch = 0;
    for (let i = 0; i < items.length; i++) if (look1[i] === look2[i]) selfMatch++;
    let bothRight = 0;
    for (let i = 0; i < items.length; i++) if (look1[i] === truth[i] && look2[i] === truth[i]) bothRight++;
    const kappaRef = cohensKappa(look1, truth);
    let misses = 0;
    for (let i = 0; i < items.length; i++) if (truth[i] === 1 && look1[i] === 0) misses++;
    let falseAl = 0;
    for (let i = 0; i < items.length; i++) if (truth[i] === 0 && look1[i] === 1) falseAl++;
    const missRate = nRejects ? misses / nRejects : 0;
    const falseAlarmRate = nGood ? falseAl / nGood : 0;
    return {
      name, selfAgree: selfMatch / items.length, bothRight: bothRight / items.length,
      kappaRef, missRate, falseAlarmRate, band: kappaBand(kappaRef),
    };
  });

  const allRatings: number[][] = items.map((_, i) => {
    const row: number[] = [];
    for (const name of inspectors) for (const lk of looks) {
      row.push(as01(cells.get(`${items[i]}\0${name}\0${lk}`) as boolean));
    }
    return row;
  });
  let allAgree = 0;
  let allRight = 0;
  for (let i = 0; i < items.length; i++) {
    const row = allRatings[i];
    if (row.every(v => v === row[0])) allAgree++;
    if (row.every(v => v === truth[i])) allRight++;
  }
  const fleiss = fleissKappa(allRatings);
  const disagreeItems = items.filter((it, i) => {
    for (const name of inspectors) for (const lk of looks) {
      if (as01(cells.get(`${it}\0${name}\0${lk}`) as boolean) !== truth[i]) return true;
    }
    return false;
  });

  return {
    nItems: items.length,
    nInspectors: inspectors.length,
    looks: looks.length,
    inspectors: inspResults,
    allLooksAgree: allAgree / items.length,
    allLooksRight: allRight / items.length,
    fleissKappa: fleiss,
    disagreeItems,
    fleissBand: kappaBand(fleiss),
  };
}
