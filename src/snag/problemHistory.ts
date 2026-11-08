/* WHO CHANGED WHAT ON A PROBLEM, AND WHEN — the audit trail (8 November, the enterprise basics; supabase/PROBLEM_HISTORY.sql).
 * The database keeps it, by a trigger on the problems: the person, the moment, and for each field a person sees, what it was and
 * what it became. Nothing on a device writes it. This module reads it (a line's members only — the table's policy) and says each
 * row as a sentence: "Sam changed the due day 5 Nov → 12 Nov". */
import { supabase } from '../cloud/client';

export interface HistoryRow { at: string; actor_email: string | null; action: 'raised' | 'changed'; changed: Record<string, { from?: unknown; to?: unknown }> }

const STATUS: Record<string, string> = { open: 'To do', in_progress: 'Doing', closed: 'Done' };
const PRIO: Record<string, string> = { critical: 'Critical', high: 'High', low: 'Low' };
const day = (v: unknown) => (typeof v === 'number' ? new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'no day');
const words = (v: unknown, none = 'nothing') => (typeof v === 'string' && v.trim() ? `“${v.trim().length > 60 ? `${v.trim().slice(0, 57)}…` : v.trim()}”` : none);
const num = (v: unknown, unit: string) => (typeof v === 'number' ? `${v} ${unit}` : 'nothing');

/** Who did it, as a person reads it: the name before the @ of their email; somebody when the change came with no sign-in. */
export function whoOf(email: string | null | undefined): string {
  const local = (email ?? '').split('@')[0]?.trim();
  if (!local) return 'Somebody';
  const w = local.replace(/[._-]+/g, ' ').trim();
  return w.charAt(0).toUpperCase() + w.slice(1);
}

/** One field's change in words — never a raw value a person would not recognise. */
export function fieldSaid(field: string, from: unknown, to: unknown): string {
  switch (field) {
    case 'problem': return `reworded it to ${words(to)}`;
    case 'status': return `moved it ${STATUS[String(from)] ?? 'on'} → ${STATUS[String(to)] ?? String(to)}`;
    case 'priority': return `set the priority ${PRIO[String(from)] ?? 'Low'} → ${PRIO[String(to)] ?? 'Low'}`;
    case 'owner': return to ? `gave it to ${String(to)}${from ? ` (it was ${String(from)})` : ''}` : `took ${from ? String(from) : 'its owner'} off it`;
    case 'due_at': return `changed the due day ${day(from)} → ${day(to)}`;
    case 'proposed_solution': return `wrote the plan: ${words(to, 'took the plan off')}`;
    case 'latest_update': return `said the latest: ${words(to, 'cleared the latest')}`;
    case 'close_note': return `wrote what shows it is fixed: ${words(to)}`;
    case 'deleted_at': return to ? 'deleted it' : 'brought it back';
    case 'archived_at': return to ? 'put it away' : 'brought it back from being put away';
    case 'linked_obs_ids': return 'changed what it waits for or which waste it is';
    case 'minutes_per_day': return `set the minutes a day it costs to ${num(to, 'min')}`;
    case 'rejects_per_day': return `set the rejects a day to ${num(to, 'packs')}`;
    case 'held_packs': return `set the packs on hold to ${num(to, 'packs')}`;
    case 'program_id': return to ? 'linked it to a program' : 'took it off its program';
    case 'project_id': return to ? 'put it in a project' : 'took it out of its project';
    case 'target_asset': return to ? `said it is on the ${String(to)}` : 'took its machine off';
    default: return `changed ${field.replace(/_/g, ' ')}`;
  }
}

/** A row as one sentence: who, what. Several fields at once are said together. */
export function rowSaid(r: HistoryRow): string {
  const who = whoOf(r.actor_email);
  if (r.action === 'raised') return `${who} raised it`;
  const parts = Object.entries(r.changed ?? {}).map(([k, v]) => fieldSaid(k, v?.from ?? null, v?.to ?? null));
  return parts.length ? `${who} ${parts.join('; ')}` : `${who} changed it`;
}

export type HistoryRead = { rows: HistoryRow[] } | { none: 'no-cloud' | 'error' };
/** The problem's history, newest first — from the cloud, the one place it is kept. */
export async function readHistory(snagId: string): Promise<HistoryRead> {
  if (!supabase) return { none: 'no-cloud' };
  const ask = supabase.from('problem_history').select('at, actor_email, action, changed').eq('snag_id', snagId).order('at', { ascending: false }).limit(100)
    .then(({ data, error }): HistoryRead => (error ? { none: 'error' } : { rows: (data ?? []) as HistoryRow[] }), (): HistoryRead => ({ none: 'error' }));
  /* no signal: said after eight seconds, never "reading" for ever */
  const late = new Promise<HistoryRead>(res => window.setTimeout(() => res({ none: 'error' }), 8000));
  return Promise.race([ask, late]);
}
