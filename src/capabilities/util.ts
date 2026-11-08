/* Small shared pieces of the capabilities: an app address without its '#', the usual refs, a plural. */
import type { CapRef } from './types';
import type { Workspace } from '../types';

/** The app's address as the router takes it — '/lines/abc', never '#/lines/abc'. */
export const route = (href: string): string => (href.startsWith('#') ? href.slice(1) : href);

export const lineRef = (w: Pick<Workspace, 'id' | 'name'>): CapRef => ({ kind: 'line', id: w.id, label: w.name, href: `/lines/${w.id}` });
export const projectRef = (p: { id: string; name: string }): CapRef => ({ kind: 'project', id: p.id, label: p.name, href: `/project/${p.id}` });
export const problemRef = (s: { id: string; problem?: string; what?: string }): CapRef => ({ kind: 'problem', id: s.id, label: (s.problem ?? s.what ?? '').trim() || 'A problem', href: `/snags?open=${encodeURIComponent(s.id)}` });

export const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

/** A refusal for an id nobody has: "No line with that id — find it first." */
export const notFound = (what: string): { ok: false; why: string } => ({ ok: false, why: `There is no ${what} with that id on this device — find it by name first.` });
