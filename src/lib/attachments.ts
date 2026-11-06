/* PICTURES, VIDEOS AND LINKS ON ANY TOOL (docs/ATTACHMENTS.md — Rowland, 6 November: "add ability to put pictures and videos to any work station ...
 * ensure they are on the report, if video create URL links ... something we need to add across the app").
 *
 * One list on the study's facts — `facts.attach` — for every tool, so a tool that wants pictures draws the same sheet and its paper prints the same
 * blocks. Each entry is a photo, a video or a link, optionally aimed at a PART of the study (`target`: a workstation of the stops chart, a station of
 * a line balance …) so it prints under that part's name. A photo or video is a file in the media store (db putBlob, kept in the cloud while the study
 * names it — supabase/ATTACHMENTS.sql); a link is an address typed or pasted. The list is id-keyed and merged across devices like every list of facts;
 * a removal is `struck`, never an erasure. Pure: the screen, the paper and the tests read the same functions. */
import type { MediaRef } from '../types';
import type { ToolStudy } from './study';

export type AttachKind = 'photo' | 'video' | 'link';

export interface Attachment {
  id: string;
  kind: AttachKind;
  /** The part of the study it is about ('w03' — a workstation); absent is the whole record. */
  target?: string;
  /** photo, video: the file in the media store, and a small picture of it (a video's first frame). */
  blobKey?: string;
  thumbKey?: string;
  mime?: string;
  /** link: the address, https:// or http:// only. */
  url?: string;
  /** link: what it is called, else its host. */
  title?: string;
  caption?: string;
  at: number;
  by?: string;
  struck?: boolean;
}

/** Every live attachment of a study — of one part when `target` is given ('' is the whole record), else all, oldest first. */
export function attachmentsOf(s: Pick<ToolStudy, 'facts'>, target?: string): Attachment[] {
  return (s.facts.attach ?? [])
    .filter(a => !a.struck && (target === undefined || (a.target ?? '') === target))
    .sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
}

/** The media a study's attachments keep, for the cloud to take (cloud/mappers studies.mediaKeys). */
export function attachMediaKeys(facts: Pick<ToolStudy['facts'], 'attach'>): { key: string; mime: string }[] {
  return (facts.attach ?? []).flatMap(a => [
    ...(a.blobKey ? [{ key: a.blobKey, mime: a.mime || (a.kind === 'video' ? 'video/mp4' : 'image/jpeg') }] : []),
    ...(a.thumbKey ? [{ key: a.thumbKey, mime: 'image/jpeg' }] : []),
  ]);
}

/** An address as a person types it: trimmed, https:// added when none is given, only http(s) accepted — never `javascript:`, never a bare word. */
export function cleanUrl(raw: string): string | undefined {
  const t = raw.trim();
  if (!t || /\s/.test(t)) return undefined;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return undefined;
    if (!u.hostname.includes('.') && u.hostname !== 'localhost') return undefined;
    return u.toString();
  } catch { return undefined; }
}

/** "www.youtube.com" — a link's host, for when it has no title. */
export function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

/** What an attachment is called on the screen and on paper. */
export function attachName(a: Attachment): string {
  if (a.kind === 'link') return a.title?.trim() || (a.url ? hostOf(a.url) : 'Link');
  return a.caption?.trim() || (a.kind === 'video' ? 'Video' : 'Photo');
}

/** The address that opens an attachment in Faultline: the study's own page with the attachment asked for — a video on paper becomes this link.
 *  `origin` is the app's (location.origin); `href` the study's address ('/calc/workstation-stops/<id>'). */
export function attachLink(origin: string, href: string, a: Pick<Attachment, 'id'>): string {
  return `${origin.replace(/\/$/, '')}/#${href}${href.includes('?') ? '&' : '?'}media=${encodeURIComponent(a.id)}`;
}

/** The address a paper prints for an attachment: a link's own address; a video's the app link; a photo prints itself. */
export function paperUrl(origin: string, href: string, a: Attachment): string | undefined {
  if (a.kind === 'link') return a.url;
  if (a.kind === 'video') return attachLink(origin, href, a);
  return undefined;
}

/** A picked photo or video (lib/media MediaRef) as an attachment on a part. */
export function fromMedia(m: MediaRef, target: string | undefined, by?: string): Attachment {
  return { id: m.id, kind: m.kind === 'video' ? 'video' : 'photo', ...(target ? { target } : {}), blobKey: m.blobKey, ...(m.thumbKey ? { thumbKey: m.thumbKey } : {}), mime: m.mime, at: m.capturedAt, ...(by ? { by } : {}) };
}

/** An attachment as the evidence tiles draw it (ui/Evidence). */
export const asMedia = (a: Attachment): MediaRef | undefined => (a.kind === 'link' || !a.blobKey ? undefined
  : { id: a.id, kind: a.kind, blobKey: a.blobKey, ...(a.thumbKey ? { thumbKey: a.thumbKey } : {}), mime: a.mime || (a.kind === 'video' ? 'video/mp4' : 'image/jpeg'), capturedAt: a.at });

/** The counts a part's button says: "2 pictures · 1 video · 1 link". */
export function attachSaid(list: readonly Attachment[]): string {
  const n = (k: AttachKind) => list.filter(a => a.kind === k).length;
  const bit = (c: number, one: string, many: string) => (c ? `${c} ${c === 1 ? one : many}` : '');
  return [bit(n('photo'), 'picture', 'pictures'), bit(n('video'), 'video', 'videos'), bit(n('link'), 'link', 'links')].filter(Boolean).join(' · ');
}
