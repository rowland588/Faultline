/* WHAT LUNA CAN DO WITH A CONNECTION (23 November, docs/LUNA-ABILITIES.md P1) — one table in code for the describe_connection capability
 * and the attach UI; every line names a real capability or an automatic step in the app, never marketing copy. */
import type { SourceKind } from './sources';

/** How the UI and describe_connection name a connection — manual is a document whose pages were read in code on a machine. */
export type ConnectionKind = SourceKind | 'manual';

export interface ConnectionAbility { label: string; /** capability name, when Luna uses one */ cap?: string }

export interface ConnectionProfile { kind: ConnectionKind; can: ConnectionAbility[]; cannot: readonly string[] }

const WORKBOOK: ConnectionProfile = {
  kind: 'workbook',
  can: [
    { label: 'Ask what it holds', cap: 'workbook_profile' },
    { label: 'Ask figures over every row', cap: 'query_workbook' },
    { label: 'Show the rows behind an answer', cap: 'workbook_rows' },
    { label: 'Get a first look when it attaches', cap: undefined },
    { label: 'Correct how it is read', cap: 'read_workbook_as' },
    { label: 'Make a pack from the look', cap: 'workbook_pack' },
    { label: 'Build a report on the conversation', cap: 'build_report' },
    { label: 'See what moved between periods', cap: 'explain_change' },
  ],
  cannot: [
    'Change cells in the Excel file',
    'Send the workbook to the AI',
    'Invent a total — every figure is worked from the rows',
  ],
};

const TABLE: ConnectionProfile = {
  kind: 'table',
  can: [
    { label: 'Ask what it holds', cap: 'source_fields' },
    { label: 'Ask figures over every row', cap: 'query_data' },
    { label: 'Build a report on the conversation', cap: 'build_report' },
    { label: 'See what moved between periods', cap: 'explain_change' },
  ],
  cannot: [
    'Change the file it came from',
    'Send its rows to the AI',
    'Invent a total — every figure is worked from the rows',
  ],
};

const MANUAL: ConnectionProfile = {
  kind: 'manual',
  can: [
    { label: 'Search what the manual says', cap: 'find_in_document' },
    { label: 'List procedures with steps and pages', cap: 'list_procedures' },
    { label: 'Draft a PM list from OEM intervals', cap: 'draft_pm_list' },
    { label: 'Make an SOP or task instruction', cap: 'make_procedure' },
    { label: 'Make a planned maintenance log', cap: 'make_pm_list' },
  ],
  cannot: [
    'Rewrite the PDF layout',
    'Reword steps freely — steps stay the manual’s words',
    'Change a record without your yes on a card',
  ],
};

const DOCUMENT: ConnectionProfile = {
  kind: 'document',
  can: [
    { label: 'See what is in the register about it', cap: 'list_sources' },
    { label: 'Name it and say what it is about', cap: 'name_source' },
  ],
  cannot: [
    'Search inside it unless it was kept as a machine manual (PDF read in the app)',
    'Change the file itself',
    'Change a record without your yes on a card',
  ],
};

const BY_KIND: Record<ConnectionKind, ConnectionProfile> = { workbook: WORKBOOK, table: TABLE, document: DOCUMENT, manual: MANUAL };

export function connectionKindOf(o: { kind: SourceKind; manual?: boolean }): ConnectionKind {
  if (o.kind === 'workbook' || o.kind === 'table') return o.kind;
  return o.manual ? 'manual' : 'document';
}

/** The abilities for a kind — the single source for UI and describe_connection. */
export function connectionProfile(kind: ConnectionKind): ConnectionProfile {
  return BY_KIND[kind];
}

/** Short sentences for the attach blurb (presentation only — no capability run). */
export function connectionBlurb(kind: ConnectionKind): string[] {
  return connectionProfile(kind).can.map(a => a.label);
}