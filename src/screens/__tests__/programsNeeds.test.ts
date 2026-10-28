import { describe, expect, it } from 'vitest';
import { programNeedsAttention } from '../ProgramsPage';
import type { ProgramLine } from '../../lib/programsReport';

const line = (over: Partial<ProgramLine>): ProgramLine => ({
  what: 'PR-1', word: 'To do', tone: 'n', bucket: 'open', machine: 'Wrapper', assetId: 'a1',
  ...over,
} as ProgramLine);

describe('programNeedsAttention', () => {
  it('includes failed, late, open, not tested and no program', () => {
    expect(programNeedsAttention(line({ bucket: 'failed', tone: 'r' }))).toBe(true);
    expect(programNeedsAttention(line({ bucket: 'late', tone: 'r' }))).toBe(true);
    expect(programNeedsAttention(line({ bucket: 'open' }))).toBe(true);
    expect(programNeedsAttention(line({ said: 'notTested' }))).toBe(true);
    expect(programNeedsAttention(line({ said: 'noProgram' }))).toBe(true);
  });
  it('excludes done and baseline', () => {
    expect(programNeedsAttention(line({ bucket: 'done', tone: 'g' }))).toBe(false);
    expect(programNeedsAttention(line({ bucket: 'baseline', tone: 'g' }))).toBe(false);
  });
});
