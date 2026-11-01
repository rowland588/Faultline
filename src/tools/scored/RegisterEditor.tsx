/* A REGISTER OF CARDS ON THE SCORED PAGE — which editor a definition's `register` draws (FMEA, FC-132; control plan, FC-133; product on hold, FC-135; fault tree, FC-152). */
import type { ScoredRow, ToolStudy } from '../../lib/study';
import { FmeaEditor } from '../fmea/FmeaEditor';
import { PlanEditor, type PlanLine } from '../cplan/PlanEditor';
import { HoldEditor } from '../hold/HoldEditor';
import { FaultEditor } from '../faulttree/FaultEditor';
import type { ScoredDef } from './types';

/** What a register keeps beside its rows, typed — each key one register's. */
export type InputsPatch = { speed?: number; packCost?: number; shiftMin?: number; costToDate?: number; margin?: number; carryPct?: number; eventCost?: number; period?: string };
export type RegisterLine = PlanLine & { margin?: number };

export function RegisterEditor({ def, rows, canEdit, study, studies, onChange, rate, onRate, line, onInputs }: {
  def: ScoredDef; rows: ScoredRow[]; canEdit: boolean; study: ToolStudy; studies: readonly ToolStudy[]; onChange: (next: ScoredRow[]) => void;
  rate?: number; onRate: (v: number | undefined) => void; line?: RegisterLine; onInputs: (patch: InputsPatch) => void;
}) {
  if (def.key === 'control-plan') return <PlanEditor rows={rows} canEdit={canEdit} study={study} studies={studies} onChange={onChange} rate={rate} onRate={onRate} line={line} onInputs={onInputs} />;
  if (def.key === 'hold') return <HoldEditor rows={rows} canEdit={canEdit} study={study} onChange={onChange} rate={rate} onRate={onRate} line={line} onInputs={onInputs} />;
  if (def.key === 'fault-tree') return <FaultEditor rows={rows} canEdit={canEdit} study={study} onChange={onChange} onInputs={onInputs} />;
  return <FmeaEditor rows={rows} canEdit={canEdit} onChange={onChange} />;
}
