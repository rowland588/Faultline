import { describe, expect, it } from 'vitest';
import { parseRoute } from '../../../state/useRoute';
import { recoverySteps } from '../plan';

describe('line recovery program', () => {
  it('keeps every door on a real route and carries the selected line and project', () => {
    const steps = recoverySteps('project-one', 'line-7');
    expect(steps.map(s => s.title)).toEqual(['Agree the gap', 'Find the limit', 'Find the problems', 'Count the losses', 'Prove the causes', 'Make the changes', 'Check and hold']);
    for (const step of steps) {
      expect(parseRoute(`#${step.to}`).name).not.toBe('home');
      for (const link of step.also ?? []) expect(parseRoute(`#${link.to}`).name).not.toBe('home');
    }
    expect(steps[1].to).toContain('line=line-7');
    expect(steps[1].to).toContain('project=project-one');
    expect(steps[2].to).toContain('line=line-7');
    expect(steps[2].to).toContain('project=project-one');
    expect(steps[3].also?.find(x => x.label === 'Stops Pareto')?.to).toBe('/w/line-7/analyse');
    expect(steps[5].to).toBe('/project/project-one/actions');
  });

  it('does not send line-dependent steps to an invented line', () => {
    const steps = recoverySteps('project-one');
    expect(steps.filter(s => s.needsLine)).toHaveLength(4);
    expect(steps.every(s => !s.to.includes('line=undefined'))).toBe(true);
  });

  it('offers the method report only when the project has a method', () => {
    expect(recoverySteps('project-one', 'line-7')[6].also?.some(x => x.label === 'Project report')).toBe(false);
    expect(recoverySteps('project-one', 'line-7', true)[6].also?.some(x => x.label === 'Project report')).toBe(true);
  });
});
