/* WHAT GOES UP, AND WHY THE OLD ANSWER WAS WRONG FOR EVER.
 *
 * The push used to decide with `clock(row) > cursor`, where the cursor was the
 * wall-clock time of the last pass. It is a filter that can only ever say NO to
 * a row written with an old clock, on this pass and on every pass afterwards,
 * with nothing on screen to say a row never left the device.
 *
 * And the app writes old clocks on purpose: seeded and adopted rows carry a
 * fixed old timestamp so they can never overwrite a real edit made elsewhere.
 * On a real account that meant every project sat on one phone while the lines
 * and next steps hanging off it synced perfectly.
 *
 * So each case below is also run against the old rule, and the one that matters
 * — an old clock — is asserted to have been skipped by it. If somebody ever
 * reintroduces a clock comparison, THAT assertion is what fails. */
import { describe, it, expect } from 'vitest';
import { needsPush, pruneSent, sentKey, type Sent } from '../sync';

/** The rule this replaced, written out so it can be held to the same cases. */
const oldRule = (clock: number, cursor: number) => clock > cursor;

const CURSOR = 1_700_000_000_000;   // "the last pass ran here"
const OLD = 946_684_800_000;        // the fixed old stamp seeded/adopted rows carry
const FRESH = CURSOR + 5_000;       // typed just now

describe('what the push sends', () => {
  it('sends a row it has no record of', () => {
    expect(needsPush({}, 'projects', 'p1', FRESH)).toBe(true);
  });

  it('does not send a row already up there at this exact clock', () => {
    const sent: Sent = { [sentKey('projects', 'p1')]: FRESH };
    expect(needsPush(sent, 'projects', 'p1', FRESH)).toBe(false);
  });

  it('sends a row that has been edited since', () => {
    const sent: Sent = { [sentKey('projects', 'p1')]: FRESH };
    expect(needsPush(sent, 'projects', 'p1', FRESH + 1)).toBe(true);
  });

  /* THE BUG. A project written with the deliberate old stamp, never sent. */
  it('sends a row whose clock is older than the last pass — the bug', () => {
    expect(needsPush({}, 'projects', 'p1', OLD)).toBe(true);
    expect(oldRule(OLD, CURSOR)).toBe(false);   // the old rule stranded it, silently and for ever
  });

  it('still sends it on the pass after that, having never got it accepted', () => {
    const sent: Sent = {};                       // nothing recorded: the upsert errored
    expect(needsPush(sent, 'projects', 'p1', OLD)).toBe(true);
  });

  /* A clock that went backwards is a change like any other — a restored backup,
     a device with a wrong date. The old rule read it as "nothing to do". */
  it('sends a row whose clock moved backwards', () => {
    const sent: Sent = { [sentKey('projects', 'p1')]: FRESH };
    expect(needsPush(sent, 'projects', 'p1', OLD)).toBe(true);
    expect(oldRule(OLD, FRESH)).toBe(false);
  });

  /* Two kinds can hold the same id — a line and a project both called 'x' would
     share one slot if the key were the id alone. */
  it('keeps the kinds apart', () => {
    const sent: Sent = { [sentKey('projects', 'x')]: FRESH };
    expect(needsPush(sent, 'projects', 'x', FRESH)).toBe(false);
    expect(needsPush(sent, 'pace_ppm', 'x', FRESH)).toBe(true);
  });
});

describe('pruning the record', () => {
  it('forgets rows that no longer exist and keeps the ones that do', () => {
    const live = sentKey('projects', 'here');
    const gone = sentKey('projects', 'deleted-on-another-device');
    const sent: Sent = { [live]: FRESH, [gone]: FRESH };

    pruneSent(sent, new Set([live]));

    expect(Object.keys(sent)).toEqual([live]);
  });

  it('is what stops a lifetime of deletes growing the record for ever', () => {
    const sent: Sent = {};
    for (let i = 0; i < 500; i++) sent[sentKey('snags', `s${i}`)] = FRESH;

    pruneSent(sent, new Set([sentKey('snags', 's499')]));

    expect(Object.keys(sent)).toHaveLength(1);
  });

  /* Pruning must not resurrect work: a row still present keeps its recorded
     clock, so the next pass does not re-send everything. */
  it('leaves a surviving row needing no push', () => {
    const key = sentKey('projects', 'p1');
    const sent: Sent = { [key]: FRESH };

    pruneSent(sent, new Set([key]));

    expect(needsPush(sent, 'projects', 'p1', FRESH)).toBe(false);
  });
});
