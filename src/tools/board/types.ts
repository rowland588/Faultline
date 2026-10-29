import type { MaintenanceGather, MaintenanceMeasuresResult } from '../../lib/ie/maintenanceMeasures';
import type { ToolStudy } from '../../lib/study';

export interface BoardDef {
  key: string;
  fc: string;
  title: string;
  says: string;
  group: string;
  question: string;
  limits: string[];
  gather: (s: ToolStudy, siblings: ToolStudy[], now: number) => MaintenanceGather;
  summarize: (g: MaintenanceGather) => MaintenanceMeasuresResult;
}
