import type { MethodKey } from './methods';
import type { PlanModel } from './planModel';

export const modelOfMethod = (method: MethodKey): PlanModel => (method === 'stage-gate' ? 'commissioning' : 'board');
