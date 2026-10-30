/* the cloud mapper's reading of a program row's criteria, for the test — through the real mapper */
import { MAPS } from '../../../cloud/mappers';
import type { Criterion } from '../../programs';

export function mapKind(criteria: unknown): Criterion[] | undefined {
  const row = { id: 'p', project_id: 'j', what: 'x', state: 'onMachine', sort: 1, created_at: 1, updated_at: 1, criteria } as Record<string, unknown>;
  return (MAPS.programs.fromRow(row) as { criteria?: Criterion[] }).criteria;
}
