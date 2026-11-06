/* Pictures, videos and links on any tool (docs/ATTACHMENTS.md; lib/attachments). */
import { describe, expect, it } from 'vitest';
import { asMedia, attachLink, attachMediaKeys, attachName, attachSaid, attachmentsOf, cleanUrl, fromMedia, hostOf, paperUrl, type Attachment } from '../attachments';

const A = (o: Partial<Attachment> & Pick<Attachment, 'id' | 'kind'>): Attachment => ({ at: 1, ...o });
const facts = (attach: Attachment[]) => ({ facts: { attach } }) as never;

describe('what a study holds', () => {
  const list: Attachment[] = [
    A({ id: 'b', kind: 'video', target: 'w02', blobKey: 'blob-b', thumbKey: 'thumb-b', at: 3 }),
    A({ id: 'a', kind: 'photo', target: 'w01', blobKey: 'blob-a', at: 2 }),
    A({ id: 'c', kind: 'link', url: 'https://example.com/x', at: 1 }),
    A({ id: 'd', kind: 'photo', target: 'w01', blobKey: 'blob-d', at: 4, struck: true }),
  ];
  it('lists the live ones oldest first, a struck one gone', () => {
    expect(attachmentsOf(facts(list)).map(a => a.id)).toEqual(['c', 'a', 'b']);
  });
  it('lists one part’s, the whole record’s being the empty target', () => {
    expect(attachmentsOf(facts(list), 'w01').map(a => a.id)).toEqual(['a']);
    expect(attachmentsOf(facts(list), 'w02').map(a => a.id)).toEqual(['b']);
    expect(attachmentsOf(facts(list), '').map(a => a.id)).toEqual(['c']);
    expect(attachmentsOf(facts([]), 'w01')).toEqual([]);
  });
  it('says what is there in words', () => {
    expect(attachSaid(list.filter(a => !a.struck))).toBe('1 picture · 1 video · 1 link');
    expect(attachSaid([A({ id: 'x', kind: 'photo' }), A({ id: 'y', kind: 'photo' })])).toBe('2 pictures');
    expect(attachSaid([])).toBe('');
  });
});

describe('what the cloud is given', () => {
  it('names every file — the picture or clip and its small picture — and never a link', () => {
    const keys = attachMediaKeys({ attach: [
      A({ id: 'v', kind: 'video', blobKey: 'blob-v', thumbKey: 'thumb-v', mime: 'video/mp4' }),
      A({ id: 'p', kind: 'photo', blobKey: 'blob-p' }),
      A({ id: 'l', kind: 'link', url: 'https://example.com' }),
    ] });
    expect(keys).toEqual([{ key: 'blob-v', mime: 'video/mp4' }, { key: 'thumb-v', mime: 'image/jpeg' }, { key: 'blob-p', mime: 'image/jpeg' }]);
    expect(attachMediaKeys({})).toEqual([]);
  });
});

describe('an address as a person types it', () => {
  it('adds https:// to a bare address and trims it', () => {
    expect(cleanUrl('  www.youtube.com/watch?v=abc ')).toBe('https://www.youtube.com/watch?v=abc');
    expect(cleanUrl('example.co.uk/path')).toBe('https://example.co.uk/path');
    expect(cleanUrl('http://plant.local.example.com/a')).toBe('http://plant.local.example.com/a');
  });
  it('refuses what is not a web address — a script, a file, a bare word, spaces', () => {
    for (const bad of ['', '   ', 'javascript:alert(1)', 'data:text/html,hi', 'file:///etc/passwd', 'ftp://example.com/x', 'hello', 'two words.com', 'mailto:a@b.co']) expect(cleanUrl(bad), bad).toBeUndefined();
  });
  it('names a link by its title, else its host', () => {
    expect(attachName(A({ id: 'l', kind: 'link', url: 'https://www.youtube.com/watch?v=1', title: 'Film break' }))).toBe('Film break');
    expect(attachName(A({ id: 'l', kind: 'link', url: 'https://www.youtube.com/watch?v=1' }))).toBe('youtube.com');
    expect(hostOf('https://www.example.com/a')).toBe('example.com');
    expect(attachName(A({ id: 'v', kind: 'video', caption: 'Jam at the sealer' }))).toBe('Jam at the sealer');
    expect(attachName(A({ id: 'v', kind: 'video' }))).toBe('Video');
  });
});

describe('what a paper prints for each', () => {
  const href = '/calc/workstation-stops/study-1';
  it('a video becomes a link that opens it in the app; a link its own address; a photo nothing (it prints itself)', () => {
    const v = A({ id: 'vid 1', kind: 'video' });
    expect(paperUrl('https://faultline.opexelevate.co.uk', href, v)).toBe('https://faultline.opexelevate.co.uk/#/calc/workstation-stops/study-1?media=vid%201');
    expect(attachLink('https://x.test/', href + '?a=1', v)).toBe('https://x.test/#/calc/workstation-stops/study-1?a=1&media=vid%201');
    expect(paperUrl('https://x', href, A({ id: 'l', kind: 'link', url: 'https://example.com/z' }))).toBe('https://example.com/z');
    expect(paperUrl('https://x', href, A({ id: 'p', kind: 'photo' }))).toBeUndefined();
  });
});

describe('media picked on the phone', () => {
  it('becomes an attachment on a part, and the evidence tiles can draw it back', () => {
    const a = fromMedia({ id: 'm1', kind: 'video', blobKey: 'blob-1', thumbKey: 'thumb-1', mime: 'video/mp4', capturedAt: 99 }, 'w03', 'Dave');
    expect(a).toEqual({ id: 'm1', kind: 'video', target: 'w03', blobKey: 'blob-1', thumbKey: 'thumb-1', mime: 'video/mp4', at: 99, by: 'Dave' });
    expect(asMedia(a)).toEqual({ id: 'm1', kind: 'video', blobKey: 'blob-1', thumbKey: 'thumb-1', mime: 'video/mp4', capturedAt: 99 });
    expect(asMedia(A({ id: 'l', kind: 'link', url: 'https://example.com' }))).toBeUndefined();
    expect('target' in fromMedia({ id: 'm2', kind: 'photo', blobKey: 'b', mime: 'image/jpeg', capturedAt: 1 }, undefined)).toBe(false);
  });
});
