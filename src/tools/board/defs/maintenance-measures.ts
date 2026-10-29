import { gatherMaintenance, summarizeMaintenance } from '../../../lib/ie/maintenanceMeasures';
import type { ToolStudy } from '../../../lib/study';
import { defOf } from '../../checks/registry';
import type { BoardDef } from '../types';

const pmDef = defOf('planned-maintenance');

const def: BoardDef = {
  key: 'maintenance-measures',
  fc: 'FC-067',
  title: 'Maintenance measures',
  says: 'PM compliance, backlog, planned share and MTBF from this line’s logs and studies',
  group: 'Maintenance',
  question: 'Is maintenance getting better this month?',
  limits: [
    'Reactive hours are typed until repair-time stops feed them (FC-059).',
    'Parts cost in money is not on this board.',
    'EN 15341 exact indicator names not confirmed against the standard text.',
  ],
  gather(s, siblings, now) {
    const reactive = s.agreed?.board?.reactiveHours ?? 0;
    const lineId = s.workspaceId;
    const onLine = (x: ToolStudy) => x.workspaceId === lineId && !x.closedAt;
    const pmLog = siblings.find(x => onLine(x) && x.tool === 'log' && x.agreed?.log?.key === 'planned-maintenance');
    const reliability = siblings.filter(x => onLine(x) && x.tool === 'reliability');
    return gatherMaintenance({ pmLog, pmDef, reliability, reactiveHours: reactive, now });
  },
  summarize: summarizeMaintenance,
};

export default def;
