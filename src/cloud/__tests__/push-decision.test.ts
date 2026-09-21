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
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

/* ---------------------------------------------------------------------------
 * ROWS BEFORE BLOBS.
 *
 * The second half of the same failure, and the one that actually kept a real
 * account from syncing for a day. A pass used to re-upload every blob that had
 * failed before as its FIRST act, and, inside the push, send a kind's media
 * before that kind's rows. A walk is tens of megabytes and a project row is a
 * few hundred bytes, so one video that would not go up — mobile data, an app
 * backgrounded half a minute in — spent the whole pass. The rows were never
 * reached, nothing was recorded as sent, and the next pass began on the same
 * video. The app reported itself as backing up the entire time, truthfully:
 * it was backing up a film.
 *
 * The order is the fix, so the order is what is tested. It is read out of the
 * source because the alternative is a fake Supabase, a fake storage bucket and
 * a fake IndexedDB for an assertion about two lines' positions.
 * ------------------------------------------------------------------------- */
describe('the order of a pass', () => {
  const src = readFileSync(join(__dirname, '..', 'sync.ts'), 'utf8');
  const body = src.slice(src.indexOf('export async function syncNow'));
  const at = (needle: string) => {
    const i = body.indexOf(needle);
    expect(i, `not found in syncNow: ${needle}`).toBeGreaterThan(-1);
    return i;
  };

  const PUSH_ROWS = '.upsert(slice.map(b => b.row)';
  const PUSH_MEDIA = 'for (const b of batch) await uploadMedia(';
  const RETRY_UPLOADS = 'if (wantedUploads.size) await uploadMedia(';

  it('sends a kind’s rows before that kind’s media', () => {
    expect(at(PUSH_ROWS)).toBeLessThan(at(PUSH_MEDIA));
  });

  it('retries the failed-media queue only after every row is up', () => {
    expect(at(PUSH_ROWS)).toBeLessThan(at(RETRY_UPLOADS));
  });

  /* The queue must still run. Moving it to the end and quietly dropping it
     would trade a stall for silent data loss on the films. */
  it('still retries the failed-media queue', () => {
    expect(body).toContain(RETRY_UPLOADS);
    expect(body).toContain('if (failedDownloads.size) await downloadMedia(');
  });

  /* Tombstones stay in front of everything: a delete this device has already
     made must reach the cloud before the pull can hand the row back. */
  it('still pushes tombstones before the pull', () => {
    expect(at('const tombs = await listTombstones()')).toBeLessThan(at('---- PULL'));
  });
});
