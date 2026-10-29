/** WCM cost deployment (FC-057; knowledge/specs/FC-057-cost-deployment.md). */
export const CD_LOSSES = ['breakdowns', 'changeover', 'short_stops', 'rejects', 'giveaway'] as const;
export const CD_PROCESSES = ['bagger', 'filler', 'case_packer', 'checkweigher'] as const;
export type CdLoss = typeof CD_LOSSES[number];
export type CdProcess = typeof CD_PROCESSES[number];
export type CdMatrix = Partial<Record<CdLoss, Partial<Record<CdProcess, number>>>>;
export interface CdCausalMove { loss: CdLoss; from: CdProcess; to: CdProcess; amount: number }
export interface CdProject { loss: CdLoss; recoveryShare: number; cost: number }
export interface CdInputs { matrix: CdMatrix; moves?: CdCausalMove[]; project?: CdProject }
export interface CdParetoRow { loss: CdLoss; total: number; share: number }
export interface CdResult {
  total: number; byLoss: CdParetoRow[]; topLoss?: CdParetoRow; projectWeekly?: number; paybackMonths?: number;
  movesApplied: CdCausalMove[]; refusedMoves: string[];
}
const lossLabel: Record<CdLoss, string> = {
  breakdowns: 'Breakdowns', changeover: 'Changeover', short_stops: 'Short stops', rejects: 'Rejects', giveaway: 'Give-away',
};
export const cdLossLabel = (k: CdLoss): string => lossLabel[k];
export const cdCellTotal = (m: CdMatrix, loss: CdLoss, p: CdProcess): number => { const v = m[loss]?.[p]; return v !== undefined && v > 0 ? v : 0; };
export const cdLossTotal = (m: CdMatrix, loss: CdLoss): number => CD_PROCESSES.reduce((n, p) => n + cdCellTotal(m, loss, p), 0);
export const cdMatrixTotal = (m: CdMatrix): number => CD_LOSSES.reduce((n, l) => n + cdLossTotal(m, l), 0);
export function cdApplyCausal(matrix: CdMatrix, moves: readonly CdCausalMove[] | undefined) {
  const out: CdMatrix = {};
  for (const l of CD_LOSSES) { const row = matrix[l]; if (row) out[l] = { ...row }; }
  const applied: CdCausalMove[] = []; const refused: string[] = [];
  for (const m of moves ?? []) {
    const fromVal = cdCellTotal(out, m.loss, m.from);
    if (m.amount <= 0 || m.amount > fromVal + 1e-9) { refused.push(`${lossLabel[m.loss]} at ${m.from}: cannot move £${m.amount} — only £${fromVal} there`); continue; }
    const row = { ...out[m.loss], [m.from]: fromVal - m.amount, [m.to]: cdCellTotal(out, m.loss, m.to) + m.amount };
    out[m.loss] = row; applied.push(m);
  }
  return { matrix: out, applied, refused };
}
export function cdPareto(matrix: CdMatrix): CdParetoRow[] {
  const total = cdMatrixTotal(matrix);
  if (total <= 0) return [];
  return CD_LOSSES.map(loss => ({ loss, total: cdLossTotal(matrix, loss), share: cdLossTotal(matrix, loss) / total }))
    .filter(r => r.total > 0).sort((a, b) => b.total - a.total);
}
export function cdProjectFigures(lossTotal: number, project: CdProject | undefined) {
  if (!project || lossTotal <= 0 || project.recoveryShare <= 0) return {};
  const weekly = lossTotal * (project.recoveryShare / 100);
  if (!(project.cost > 0) || weekly <= 0) return { weekly };
  return { weekly, paybackMonths: project.cost / (weekly * 4.33) };
}
export function cdWork(input: CdInputs): CdResult | { problems: string[] } {
  const total0 = cdMatrixTotal(input.matrix);
  if (total0 <= 0) return { problems: ['Type at least one loss in pounds for the period — empty cells stay empty until the records feed them.'] };
  const { matrix, applied, refused } = cdApplyCausal(input.matrix, input.moves);
  const byLoss = cdPareto(matrix); const topLoss = byLoss[0];
  const lossForProject = input.project ? cdLossTotal(matrix, input.project.loss) : 0;
  const { weekly, paybackMonths } = cdProjectFigures(lossForProject, input.project);
  return { total: cdMatrixTotal(matrix), byLoss, topLoss, ...(weekly !== undefined ? { projectWeekly: weekly } : {}), ...(paybackMonths !== undefined ? { paybackMonths } : {}), movesApplied: applied, refusedMoves: refused };
}
export const CD_WORKED_MATRIX: CdMatrix = {
  breakdowns: { bagger: 2400, filler: 600 }, changeover: { bagger: 1900 }, short_stops: { bagger: 1500, case_packer: 400 },
  rejects: { bagger: 800, checkweigher: 300 }, giveaway: { filler: 2200 },
};
