import { describe, expect, it } from 'vitest';
import { savingAt, withoutSave } from '../useSaveOnArrival';

describe('a paper made on arrival (?save=1)', () => {
  it('adds save=1 to an address with or without a query', () => {
    expect(savingAt('/project/p1/report')).toBe('/project/p1/report?save=1');
    expect(savingAt('/pace-report?project=p1')).toBe('/pace-report?project=p1&save=1');
    expect(savingAt('/project/p1/report?doc=full')).toBe('/project/p1/report?doc=full&save=1');
  });
  it('takes save=1 off wherever it is, keeping the rest', () => {
    expect(withoutSave('#/project/p1/report?save=1')).toBe('#/project/p1/report');
    expect(withoutSave('#/pace-report?project=p1&save=1')).toBe('#/pace-report?project=p1');
    expect(withoutSave('#/pace-report?project=p1&save=1&doc=full')).toBe('#/pace-report?project=p1&doc=full');
    expect(withoutSave('#/project/p1/report?save=1&doc=full')).toBe('#/project/p1/report?doc=full');
    expect(withoutSave('#/project/p1/report?doc=full')).toBe('#/project/p1/report?doc=full');
  });
});
