/* A REGISTER OF CARDS ON THE SCORED PAGE — which editor a definition's `register` draws (FMEA, FC-132; control plan, FC-133). */
import type { ScoredRow, ToolStudy } from '../../lib/study';
import { FmeaEditor } from '../fmea/FmeaEditor';
import { PlanEditor, type PlanLine } from '../cplan/PlanEditor';
import type { ScoredDef } from './types';

export function RegisterEditor({ def, rows, canEdit, study, studies, onChange, rate, onRate, line, onInputs }: {
  def: ScoredDef; rows: ScoredRow[]; canEdit: boolean; study: ToolStudy; studies: readonly ToolStudy[]; onChange: (next: ScoredRow[]) => void;
  rate?: number; onRate: (v: number | undefined) => void; line?: PlanLine; onInputs: (patch: { speed?: number; packCost?: number; shiftMin?: number }) => void;
}) {
  if (def.key === 'control-plan') return <PlanEditor rows={rows} canEdit={canEdit} study={study} studies={studies} onChange={onChange} rate={rate} onRate={onRate} line={line} onInputs={onInputs} />;
  return <FmeaEditor rows={rows} canEdit={canEdit} onChange={onChange} />;
}
