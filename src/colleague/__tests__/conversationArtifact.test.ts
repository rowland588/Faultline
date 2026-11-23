import { describe, expect, it } from 'vitest';
import { artifactPreview, artifactRefs, canPresentOnScreen } from '../conversationArtifact';
import type { CapRef } from '../../capabilities/types';

describe('conversationArtifact', () => {
  it('artifactPreview takes the first sentence', () => {
    expect(artifactPreview('Made “Tracker”. It opens in the app like any sheet. More words.')).toBe('Made “Tracker”.');
    expect(artifactPreview('', 'Draft only')).toBe('Draft only');
  });

  it('artifactRefs keeps study and report refs with href', () => {
    const refs: CapRef[] = [
      { kind: 'action', id: 'a1', label: 'Late', href: '/actions' },
      { kind: 'study', id: 's1', label: 'Project tracker', href: '/study/s1' },
      { kind: 'study', id: 's1', label: 'Project tracker', href: '/study/s1' },
    ];
    expect(artifactRefs(refs)).toEqual([refs[1]]);
  });

  it('canPresentOnScreen is true for conversational reports', () => {
    expect(canPresentOnScreen({ kind: 'convreport', id: 'r1', label: 'Pack', href: '' })).toBe(true);
    expect(canPresentOnScreen({ kind: 'study', id: 's1', label: 'SMED', href: '/x' })).toBe(false);
  });
});