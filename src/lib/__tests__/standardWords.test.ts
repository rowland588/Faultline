/* WORDS ON THE LINE STANDARD (Rowland, 15 October, on his Line 2a & 2b): a
 * tall, narrow shape's words run up it ("it only goes across, it doesn't let
 * me go upwards"), and a long analysis typed as what a person does is summed
 * up by its head, the rest printed whole on the notes page. */
import { describe, expect, it } from 'vitest';
import { bottlenecksOf, firstPara, wordsUp } from '../standard';

describe('which way a shape’s words run', () => {
  const dest = { shape: 'rect' as const, label: 'Destaker' };
  it('up a tall, narrow shape when a word would not fit across — his Destaker, 5.7% wide', () => {
    expect(wordsUp(dest, 57, 260, 17)).toBe(true);
  });
  it('across a wide shape, or a tall one its words fit', () => {
    expect(wordsUp({ shape: 'rect', label: 'Grading' }, 134, 99, 17)).toBe(false);
    expect(wordsUp({ shape: 'rect', label: 'BU' }, 57, 260, 17)).toBe(false);
  });
  it('as set, whatever the shape', () => {
    expect(wordsUp({ ...dest, dir: 'across' }, 57, 260, 17)).toBe(false);
    expect(wordsUp({ shape: 'rect', label: 'Grading', dir: 'up' }, 134, 99, 17)).toBe(true);
  });
  it('never an arrow, never no words', () => {
    expect(wordsUp({ shape: 'arrow', label: 'Flow', dir: 'up' }, 5, 300, 17)).toBe(false);
    expect(wordsUp({ shape: 'rect', label: '  ' }, 5, 300, 17)).toBe(false);
  });
});

describe('the head of what was written', () => {
  const task = 'BOTTLENECK – PALLET WRAPPER (ONE OPERATOR SERVING BOTH LINES)\n\nWrapper cycle: 10 min to wrap a pair.\n\n• Crate – 5.1 min lost every pair.';
  it('the first paragraph, its line breaks made spaces', () => {
    expect(firstPara(task)).toBe('BOTTLENECK – PALLET WRAPPER (ONE OPERATOR SERVING BOTH LINES)');
    expect(firstPara('Load film\nand check the seals')).toBe('Load film and check the seals');
  });
  it('the bottleneck summed up by it — the whole stays with the person', () => {
    const [b] = bottlenecksOf({ marks: [{ id: 'w', kind: 'person', x: 1, y: 1, label: 'Pallet wrapper', task, bottleneck: true }] });
    expect(b.words).toBe('Pallet wrapper — BOTTLENECK – PALLET WRAPPER (ONE OPERATOR SERVING BOTH LINES)');
  });
});
