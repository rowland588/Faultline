import { describe, expect, it } from 'vitest';
import { labelsOf, labelsSummary, toggleLabel, withCardLabels, type Standard, type StandardMark } from '../standard';

const person = (id: string, label: string, o: Partial<StandardMark> = {}): StandardMark => ({ id, kind: 'person', x: 10, y: 10, label, ...o } as StandardMark);
const std = (marks: StandardMark[]): Standard => ({ id: 's', projectId: '', product: 'p', marks, sort: 0, createdAt: 0, updatedAt: 0 } as Standard);

describe('what else a person is — labels', () => {
  it('are clean: trimmed, once whatever the case, short, at most six', () => {
    expect(labelsOf({ labels: [' Overburdened ', 'overburdened', 'Product  issue', '', 'x'.repeat(40)] })).toEqual(['Overburdened', 'Product issue', 'x'.repeat(24)]);
    expect(labelsOf({ labels: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] })).toHaveLength(6);
    expect(labelsOf({})).toEqual([]);
  });
  it('toggle adds, takes off the same word in any case, and leaves no empty list', () => {
    expect(toggleLabel({}, 'Extra labour')).toEqual(['Extra labour']);
    expect(toggleLabel({ labels: ['Extra labour', 'Overburdened'] }, 'extra labour')).toEqual(['Overburdened']);
    expect(toggleLabel({ labels: ['Extra labour'] }, 'EXTRA LABOUR')).toBeUndefined();
  });
  it('a summary says who carries each, people only, in the order first seen', () => {
    const s = std([person('a', 'Op 2', { labels: ['Overburdened'] }), person('b', 'Packer', { labels: ['Extra labour', 'Overburdened'] }), { id: 'm', kind: 'box', x: 1, y: 1, labels: ['Overburdened'] } as StandardMark, person('c', '')]);
    expect(labelsSummary(s)).toEqual([{ label: 'Overburdened', who: ['Op 2', 'Packer'] }, { label: 'Extra labour', who: ['Packer'] }]);
  });
  it('the card copy has the labels at the head of what they do, and the stored map is untouched', () => {
    const s = std([person('a', 'Op 2', { task: 'Packs the trays', labels: ['Overburdened', 'Product issue'] }), person('b', 'Op 3', { task: 'Wraps' })]);
    const c = withCardLabels(s);
    expect(c.marks[0].task).toBe('Overburdened · Product issue — Packs the trays');
    expect(c.marks[1].task).toBe('Wraps');
    expect(s.marks[0].task).toBe('Packs the trays');
    expect(withCardLabels(std([person('b', 'Op 3')]))).toEqual(std([person('b', 'Op 3')]));
  });
});
