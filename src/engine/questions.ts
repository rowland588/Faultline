/* Question-first — nobody needs to know the seven tools by name. Pick a plain
 * question; the app picks the tool, dimension and measure behind it. P0 answers
 * everything with a Pareto; the P1 tools slot into the same picker (each a pure
 * read over the same drilled rows). */
import type { DimensionKey, Measure } from '../types';

export type Tool = 'pareto' | 'run' | 'histogram' | 'scatter' | 'fishbone' | 'stratify' | 'bar';

export interface Question {
  id: string;
  label: string;
  sub: string;
  tool: Tool;
  dimension: DimensionKey;
  measure: Measure;
  order: DimensionKey[]; // the drill sequence, starting with this question's dimension
}

/** P0: three questions, all answered by a Pareto. More cards (run/histogram/
 *  scatter/fishbone/stratify) drop in here as their tools land — no other change. */
export const QUESTIONS: Question[] = [
  { id: 'where-time', label: 'Where are we losing the most?', sub: 'Assets → category → sub-category, by time', tool: 'pareto', dimension: 'asset', measure: 'time', order: ['asset', 'category', 'subcategory'] },
  { id: 'what-often', label: "What's going wrong most often?", sub: 'Category → sub-category → asset, by count', tool: 'pareto', dimension: 'category', measure: 'count', order: ['category', 'subcategory', 'asset'] },
  { id: 'what-time', label: 'Which problem costs the most time?', sub: 'Category → sub-category → asset, by time', tool: 'pareto', dimension: 'category', measure: 'time', order: ['category', 'subcategory', 'asset'] },
  { id: 'which-shift', label: 'Is it the same on every shift?', sub: 'Shift → category → asset, by time', tool: 'stratify', dimension: 'shift', measure: 'time', order: ['shift', 'category', 'subcategory', 'asset'] },
];

export function chooseTool(questionId: string): { tool: Tool; dimension: DimensionKey; measure: Measure } {
  const q = QUESTIONS.find(x => x.id === questionId) ?? QUESTIONS[0];
  return { tool: q.tool, dimension: q.dimension, measure: q.measure };
}
