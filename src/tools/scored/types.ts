import type { CriticalityRowIn, RankedRow } from '../../lib/ie/criticality';

export interface ScoredScale { id: string; label: string }

export interface ScoredExample {
  name: string;
  rows: CriticalityRowIn[];
  expect: { classA: number; classB?: number; classC?: number };
}

export interface ScoredDef {
  key: string;
  fc: string;
  title: string;
  says: string;
  group: string;
  question: string;
  scales: ScoredScale[];
  limits: string[];
  examples: ScoredExample[];
  rank: (rows: CriticalityRowIn[]) => { ok: RankedRow[]; counts: Record<'A' | 'B' | 'C', number> } | { problems: string[] };
}
