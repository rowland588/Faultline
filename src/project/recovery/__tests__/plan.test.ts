import { describe, expect, it } from 'vitest';
import { parseRoute } from '../../../state/useRoute';
import { recoverySteps } from '../plan';
import { launchPlacement } from '../../../lib/methodPlacement';
import { methodByKey } from '../../../lib/methods';

describe('line recovery program', () => {
  it('keeps every door on a real route and carries the selected line and project', () => {
    const steps = recoverySteps('project-one', 'line-7');
    expect(steps.map(s => s.title)).toEqual(['Record the problems', 'Measure the line', 'Count the losses', 'Prove the causes', 'Make the changes', 'Check and hold']);
    expect(steps.map(s => s.phase)).toEqual(['Define', 'Measure', 'Measure', 'Analyse', 'Improve', 'Control']);
    const dmaic = methodByKey('dmaic');
    expect(dmaic?.sections.find(s => s.name === 'Measure')?.tools).toEqual(expect.arrayContaining(['FC-034', 'FC-049', 'FC-052']));
    expect(dmaic?.sections.find(s => s.name === 'Analyse')?.tools).toContain('FC-146');
    expect(dmaic?.sections.find(s => s.name === 'Improve')?.tools).toContain('FC-194');
    expect(dmaic?.sections.find(s => s.name === 'Control')?.tools).toContain('FC-086');
    for (const step of steps) {
      expect(parseRoute(`#${step.to}`).name).not.toBe('home');
      for (const link of step.also ?? []) expect(parseRoute(`#${link.to}`).name).not.toBe('home');
    }
    expect(steps[0].to).toContain('line=line-7');
    expect(steps[0].to).toContain('project=project-one');
    expect(steps[1].to).toContain('line=line-7');
    expect(steps[1].to).toContain('project=project-one');
    expect(steps[2].also?.find(x => x.label === 'Stops Pareto')?.to).toBe('/w/line-7/analyse');
    const talk = new URL(steps[0].also?.find(x => x.label.includes('Line Talk'))?.to ?? '', 'https://example.test');
    expect([talk.pathname, talk.searchParams.get('line'), talk.searchParams.get('project')]).toEqual(['/talk', 'line-7', 'project-one']);
    expect(steps[1].also?.find(x => x.label.includes('target'))?.to).toContain('pset-measures');
    expect(steps.some(s => s.also?.some(link => link.label.includes('program')))).toBe(false);
    expect(steps[4].to).toBe('/project/project-one/actions?line=line-7');
    expect(recoverySteps('project-one')[4].to).toBe('/project/project-one/actions');
  });

  it('carries the chosen DMAIC phase from the recovery front door into each tool record', () => {
    const steps = recoverySteps('p', 'line2', 'dmaic');
    expect(steps[4].to).toBe('/project/p/actions?line=line2&phase=Improve');
    for (const step of steps.filter(s => s.to.includes('project='))) {
      expect(launchPlacement('p', step.to)).toEqual({ projectId: 'p', method: 'dmaic', section: step.phase });
    }
    expect(launchPlacement('p', steps[0].also?.[0].to ?? '')?.section).toBe('Define');
    expect(launchPlacement('p', steps[5].also?.[0].to ?? '')?.section).toBe('Control');
    expect(launchPlacement('p', recoverySteps('p', 'line2', 'a3')[1].to)).toBeUndefined();
  });

  it('does not send line-dependent steps to an invented line', () => {
    const steps = recoverySteps('project-one');
    expect(steps.filter(s => s.needsLine)).toHaveLength(4);
    expect(steps.every(s => !s.to.includes('line=undefined'))).toBe(true);
  });

  it('offers the method report only when the project has a method', () => {
    expect(recoverySteps('project-one', 'line-7')[5].also?.some(x => x.label === 'Project report')).toBe(false);
    expect(recoverySteps('project-one', 'line-7', 'dmaic')[5].also?.some(x => x.label === 'Project report')).toBe(true);
  });
});
