/* P1 SEAM — the other five quality tools. Each is a pure read over the SAME
 * drilled Observation[]; the drill path and the tool choice are orthogonal, so
 * none of them reshapes the data. Signatures are reserved here so the shape is
 * committed now; bodies land tool-by-tool. This proves "one dataset, many tools". */
import type { Observation, DimensionKey } from '../types';

// bar          — compare a dimension side by side (no cumulative curve)
export type ComputeBar = (rows: Observation[], dimension: DimensionKey) => unknown;

// run / control chart — a measure over time; control adds mean + sigma limits
export type ComputeRunSeries = (rows: Observation[], bucketMs: number) => unknown;
export type ComputeControlChart = (rows: Observation[], bucketMs: number) => unknown;

// histogram    — distribution of a continuous value (durationMs, or valueNum)
export type ComputeHistogram = (rows: Observation[], bins: number) => unknown;

// scatter      — one measured value against another (valueNum vs durationMs, …)
export type ComputeScatter = (rows: Observation[]) => unknown;

// fishbone     — category (spine) → reason (bones); a structured cause view
export type ComputeFishbone = (rows: Observation[]) => unknown;

// stratify     — the same cut split by a second dimension (e.g. by shift)
export type ComputeStratified = (rows: Observation[], splitBy: DimensionKey, dimension: DimensionKey) => unknown;

export {}; // reserved — no P0 implementations
