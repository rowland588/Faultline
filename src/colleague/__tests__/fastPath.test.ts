import { describe, it, expect } from 'vitest';
import { fastCall, type FastCtx } from '../fastPath';

const ctx: FastCtx = { tool: 'stops', machines: ['Bagger', 'Case Packer', 'Packer', 'Metal detector'], reasons: ['Jam', 'Film break', 'Changeover'] };
const stop = (machine: string, reason: string) => ({ name: 'capture_event', input: { event: 'stopped', machine, reason } });

describe('the words code answers by itself while stops are timed', () => {
  it('a stop said as a tap: the line\'s machine and a reason it knows, as the line has them', () => {
    expect(fastCall('Bagger stopped, jam', ctx)).toEqual(stop('Bagger', 'Jam'));
    expect(fastCall('stop on the bagger — film break.', ctx)).toEqual(stop('Bagger', 'Film break'));
    expect(fastCall('bagger jam', ctx)).toEqual(stop('Bagger', 'Jam'));
    expect(fastCall('The bagger is down because of a jam', ctx)).toEqual(stop('Bagger', 'Jam'));
  });
  it('the longest machine name wins, and two machines are never guessed between', () => {
    expect(fastCall('case packer stopped jam', ctx)).toEqual(stop('Case Packer', 'Jam'));
    expect(fastCall('bagger and metal detector stopped jam', ctx)).toBeNull();
  });
  it('a reason the line does not know is taken in their words only when they said it stopped', () => {
    expect(fastCall('bagger stopped, bags not opening', ctx)).toEqual(stop('Bagger', 'Bags not opening'));
    expect(fastCall('bagger bags not opening', ctx)).toBeNull();
    expect(fastCall('bagger looks fine', ctx)).toBeNull();
  });
  it('no reason said, or no machine of the line: Luna asks — nothing is invented', () => {
    expect(fastCall('bagger stopped', ctx)).toBeNull();
    expect(fastCall('the labeller stopped, jam', ctx)).toBeNull();
    expect(fastCall('stopped, jam', ctx)).toBeNull();
    expect(fastCall('stopped, jam', { ...ctx, machine: 'Bagger' })).toEqual(stop('Bagger', 'Jam'));
  });
  it('running again, undo and the end — whole phrases only', () => {
    expect(fastCall('Running again.', ctx)).toEqual({ name: 'capture_event', input: { event: 'running' } });
    expect(fastCall("It's running again", ctx)).toEqual({ name: 'capture_event', input: { event: 'running' } });
    expect(fastCall('bagger running again', ctx)).toEqual({ name: 'capture_event', input: { event: 'running' } });
    expect(fastCall('undo that', ctx)).toEqual({ name: 'undo_capture', input: {} });
    expect(fastCall('stop timing', ctx)).toEqual({ name: 'end_measurement', input: {} });
    expect(fastCall('is it running again', ctx)).toBeNull();
  });
  it('a question, a doubt, a correction, a time said or anything longer goes to Luna', () => {
    for (const s of ['why does the bagger keep stopping?', 'bagger stopped jam I think', 'that was not a jam', 'bagger has not stopped', 'bagger stopped, not a jam', 'bagger stopped for a jam about five minutes ago',
      'the bagger stopped with a jam and the operator says the film is too thin today', 'how many stops so far', 'raise a problem on the bagger jam', 'bagger jam again or film break', ''])
      expect(fastCall(s, ctx), s).toBeNull();
  });
  it('only while stops are timed', () => {
    expect(fastCall('bagger stopped, jam', { ...ctx, tool: 'changeover' })).toBeNull();
  });
});
