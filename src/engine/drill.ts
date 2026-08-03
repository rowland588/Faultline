/* The drill-down — a Pareto you can walk into. A path is an ordered list of
 * {dimension, value} filters; tapping a bar pushes the next filter and the same
 * Pareto re-computes on the narrower rows, ranked by the NEXT dimension. Default
 * order WHERE → WHAT → WHY (symptom → where → what → why → proof). Evidence is
 * gathered at every node, so the photo/video is always one tap from the number. */
import type { Observation, ID, DimensionKey, DrillPath, WorkstreamView, MediaRef } from '../types';
import { dimOf } from './types';
import { computePareto, type Pareto } from './pareto';
import { suggestNextDimension, detectDisagreement, type NextDimSuggestion, type Disagreement } from './intelligence';

/** Rows in this workspace that match every crumb in the path. */
export function applyDrill(all: Observation[], wsId: ID, path: DrillPath): Observation[] {
  return all.filter(
    o => o.workspaceId === wsId && o.deletedAt == null && path.every(s => dimOf[s.dimension](o) === s.value),
  );
}

/** The dimension to rank by at this depth = first in the order not yet used.
 *  null → we're at a leaf (nothing left to cut by). */
export function currentDimension(view: WorkstreamView): DimensionKey | null {
  const used = new Set(view.path.map(s => s.dimension));
  return view.dimensionOrder.find(d => !used.has(d)) ?? null;
}

export function pushDrill(view: WorkstreamView, sliceKey: string, dim: DimensionKey): WorkstreamView {
  return { ...view, path: [...view.path, { dimension: dim, value: sliceKey }] };
}

export function popDrill(view: WorkstreamView): WorkstreamView {
  return { ...view, path: view.path.slice(0, -1) };
}

export interface DrillNode {
  rows: Observation[];
  dimension: DimensionKey | null;
  pareto: Pareto | null; // null at a leaf
  media: MediaRef[]; // evidence aggregated from these rows — available at every node
  suggestion: NextDimSuggestion | null;
  disagreement: Disagreement | null;
}

/** Everything the Analyse/Present screens need for the current drill position. */
export function drillNode(all: Observation[], view: WorkstreamView): DrillNode {
  const rows = applyDrill(all, view.workspaceId, view.path);
  const dimension = currentDimension(view);
  const pareto = dimension ? computePareto(rows, dimension, view.measure) : null;
  const media = rows.flatMap(o => o.media);
  const suggestion = dimension ? suggestNextDimension(rows, view) : null;
  const disagreement = dimension ? detectDisagreement(rows, dimension) : null;
  return { rows, dimension, pareto, media, suggestion, disagreement };
}
