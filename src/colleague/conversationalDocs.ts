/* CONVERSATIONAL DOCUMENTS (27 November 2026 — Rowland, voice: Luna is conversational; he does not want extra clicks).
 *
 * Well-formed phrasing is answered in the app: a training document for X; turn this / the last upload into an SOP,
 * work instruction, training pack or presentation. A file attached in this chat is bound by its source id — never the
 * machine-manual path unless that is the file they uploaded. Format is asked once, as chips, only when they did not say
 * SOP vs work instruction vs training vs presentation. Pure. */

import type { CapRef } from '../capabilities/types';
import { visualRevision, writingRequest } from './knowledgeDocuments';

export type DocFormat = 'sop' | 'instruction' | 'training' | 'presentation';
export type DocExport = 'html' | 'pdf' | 'slides';

export const FORMAT_ASK = 'Do you want it as an SOP or a work instruction?';
export const FORMAT_CHIPS_UPLOAD = ['Make this an SOP', 'Work instruction', 'Training'] as const;
export const FORMAT_CHIPS_DRAFT = ['Make this an SOP', 'Slides', 'HTML'] as const;
export const ASK_SOURCE_ONCE = 'Attach the file you want turned into that — a PDF, a photo, or a linked document. I will not invent the factory.';

export type ConversationalDoc =
  | { kind: 'from-upload'; format: DocFormat; export?: DocExport }
  | { kind: 'offer' }
  | { kind: 'follow-up'; format?: DocFormat; export?: DocExport }
  | { kind: 'ask-source'; format: DocFormat };

const command = (s: string) => s.trim()
  .replace(/^(?:(?:hey\s+)?luna[, ]+)?(?:please[, ]+)?(?:(?:can|could|would) you\s+)?(?:please\s+)?/i, '')
  .replace(/[.!?]+$/, '')
  .trim();

const LAST_UPLOAD = /\b(?:the\s+)?(?:document|file|pdf|one|upload)\s+i\s+just\s+uploaded\b|\b(?:the\s+)?(?:last|latest)\s+(?:upload|file|document|pdf|attachment)\b|\b(?:this|that|the)\s+(?:uploaded\s+)?(?:file|document|pdf|upload|attachment)\b|\b(?:this|that|it)\b/i;

function formatOf(s: string): DocFormat | undefined {
  if (/\bstandard operating procedure\b|\bSOPs?\b/i.test(s)) return 'sop';
  if (/\b(?:work|task)\s+instructions?\b|\bWIs?\b/.test(s)) return 'instruction';
  if (/\bpresentations?\b|\bslides?\b/i.test(s) && !/\bhtml\b/i.test(s)) return 'presentation';
  if (/\b(?:training|learning)\s+(?:document|guide|manual|pack|material|course)\b|\b(?:toolbox talk|job aid)\b|\btraining\b|\bcourse\b|\bworkshop\b|\blesson(?: plan)?\b/i.test(s)) return 'training';
}

function exportOf(s: string): DocExport | undefined {
  if (/\bhtml\b/i.test(s)) return 'html';
  if (/\bslides?\b|\bpptx\b|\bpresentation\b/i.test(s) && !/\bSOP\b/i.test(s)) return 'slides';
  if (/\bpdf\b/i.test(s)) return 'pdf';
}

const CHIP: Record<string, ConversationalDoc> = {
  'make this an sop': { kind: 'from-upload', format: 'sop' },
  'work instruction': { kind: 'from-upload', format: 'instruction' },
  'training': { kind: 'from-upload', format: 'training' },
  'slides': { kind: 'follow-up', format: 'presentation', export: 'slides' },
  'html': { kind: 'follow-up', export: 'html' },
};

const FROM_UPLOAD = /^(?:turn|convert|make|write|draft|put)\s+(?:me\s+)?(?:(?:the|this|that|it|my|our|last|latest)\b[\s\S]*?)\s+(?:into|to|as|in)\s+/i;
const BARE_TURN = /^(?:turn|convert)\s+(?:(?:the|this|that|it)\b.*)$/i;

/** Well-formed conversational document intent — or undefined, so Luna answers as before. */
export function conversationalDoc(words: string): ConversationalDoc | undefined {
  const input = command(words).replace(/\s+/g, ' ');
  if (!input) return undefined;
  const chip = CHIP[input.toLowerCase()];
  if (chip) return chip;
  /* A graph → HTML dashboard, or “make it more visual”, is already answered later in code. */
  if (/\bdashboards?\b/i.test(input) || visualRevision(input)) return undefined;
  const writing = writingRequest(input);
  const fromFile = /\b(?:from|using|based on|of)\s+(?:the\s+)?(?:(?:attached|uploaded)\s+)?(?:file|document|pdf|upload|one i (?:just )?uploaded)\b/i.test(input)
    || /\b(?:document|file|pdf|one)\s+i\s+just\s+uploaded\b/i.test(input)
    || LAST_UPLOAD.test(input) && FROM_UPLOAD.test(input);
  if (writing && !fromFile) return undefined;
  const format = formatOf(input);
  const exported = exportOf(input);
  if (fromFile || FROM_UPLOAD.test(input) || BARE_TURN.test(input)) {
    if (format) return { kind: 'from-upload', format, ...(exported && exported !== 'slides' ? { export: exported } : format === 'presentation' ? { export: 'slides' } : {}) };
    if (exported === 'html' || exported === 'pdf') return { kind: 'follow-up', export: exported };
    return { kind: 'offer' };
  }
  if (/^(?:and\s+)?(?:(?:that|this)(?:,\s*that)*(?:,?\s+and\s+that)?,\s*)?(?:as\s+)?(?:an?\s+)?(?:html|slides|pdf|sop|work instruction)\b/i.test(input)
    || /^(?:and\s+)(?:slides|html|pdf|that)\b/i.test(input)) {
    if (format || exported) return { kind: 'follow-up', ...(format ? { format } : {}), ...(exported ? { export: exported } : {}) };
  }
  return undefined;
}

/** The format they named, or slides → presentation. Offer has none. */
export function formatWanted(intent: ConversationalDoc): DocFormat | undefined {
  if (intent.kind === 'offer') return undefined;
  if (intent.format) return intent.format;
  if (intent.kind === 'follow-up' && intent.export === 'slides') return 'presentation';
  return undefined;
}

export function lastAttachedSource(actions: readonly { name: string; status: string; refs: readonly CapRef[]; at: number }[]): { id: string; name: string } | undefined {
  const hits = actions.filter(a => a.status === 'done' && (a.name === 'factory_source' || a.name === 'machine_document'))
    .sort((a, b) => b.at - a.at);
  for (const a of hits) {
    const r = a.refs.find(x => x.kind === 'study' && x.id);
    if (r) return { id: r.id, name: r.label.replace(/\s+— factory source$/i, '') };
  }
}

export const formatTitle = (format: DocFormat, name: string) => {
  const n = name.replace(/\.(pdf|docx?|txt)$/i, '').trim() || name;
  return format === 'sop' ? `${n} — SOP`
    : format === 'instruction' ? `${n} — work instruction`
      : format === 'presentation' ? `${n} — slides`
        : `${n} — training`;
};
