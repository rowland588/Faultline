/* The tools inside a workspace: where Back lands from them, and the numbers
 * their boxes accept. Each case here was a defect found by using the screen. */
import { describe, expect, it } from 'vitest';
import { chainCrumbs } from '../useTrail';
import { studyTarget } from '../proof';

const line = { projectId: 'P', projectName: 'Line 7 pace', lineId: 'L', lineName: 'Line 2A' };

describe('the step above a workspace screen', () => {
  it('sends the walk back to the line it was filmed on — its filmed lens', () => {
    for (const screen of ['snags', 'snaglist', 'line', 'segment', 'asset', 'history', 'walk']) {
      expect(chainCrumbs(line, 'ws', screen).slice(-1)[0]).toEqual({ label: 'Line 2A', to: '/project/P/line/L?view=snags' });
    }
  });

  it('sends the study back to the line page its "where is the time going?" door is on', () => {
    for (const screen of ['capture', 'analyse', 'case', 'meeting']) {
      expect(chainCrumbs(line, 'ws', screen).slice(-1)[0]).toEqual({ label: 'Line 2A', to: '/project/P/line/L' });
    }
  });

  it('a project walk with no line goes back to the project’s evidence; a stage-gate walk to Install', () => {
    expect(chainCrumbs({ projectId: 'P', projectName: 'Job' }, 'ws', 'snags').slice(-1)[0]).toEqual({ label: 'Job', to: '/project/P?view=snags' });
    expect(chainCrumbs({ projectId: 'P', projectName: 'Job' }, 'ws', 'capture').slice(-1)[0]).toEqual({ label: 'Job', to: '/project/P' });
    expect(chainCrumbs({ projectId: 'P', projectName: 'Job', stageGate: true }, 'ws', 'walk').slice(-1)[0]).toEqual({ label: 'Install', to: '/project/P/install' });
  });
});

describe('the samples a study asks for', () => {
  it('takes twelve when twelve is typed — the box used to turn the 1 into 3, then 32', () => {
    expect(studyTarget('1', 8)).toBe(3);   // mid-typing is clamped only when used
    expect(studyTarget('12', 8)).toBe(12);
  });
  it('clamps to 3–50 and falls back to the suggestion on an empty or nonsense box', () => {
    expect(studyTarget('200', 8)).toBe(50);
    expect(studyTarget('', 8)).toBe(8);
    expect(studyTarget(null, 8)).toBe(8);
    expect(studyTarget('abc', 8)).toBe(8);
    expect(studyTarget('7.4', 20)).toBe(7);
  });
});
