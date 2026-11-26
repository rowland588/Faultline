import type { CapCall, CapResult } from '../capabilities/types';
import type { ColleagueTurn } from './conversation';
import { writingRequest } from './knowledgeDocuments';

export interface SourceBrief { request: string; subject: string }
export interface AuthorSource { id: string; name: string; kind: 'manual' | 'record' | 'workbook' | 'data' }

const fold = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const object = /\b(?:this|that|our|my|these|those)\s+(?:(?:actual|own|local|current|production|packing|assembly|inspection|existing|factory|shop|particular|specific)\s+){0,3}(work\s?benches|work\s?bench|bench(?:es)?|workstations?|stations?|lines?|machines?|equipment|areas?|factory|factories|sites?|warehouses?|workshops?|layouts?|changeovers?|process(?:es)?|procedures?|SOPs?|setups?|workcells?|teams?|shifts?)\b(?!\s+(?:leaders?|leads?|operators?|supervisors?|managers?|staff)\b)/i;
const generalAnswer = /^(?:(?:please|yes)[, ]+)?(?:use|give me|make|write|show me)?\s*(?:a |an |the )?(?:general|generic|illustrative|hypothetical)(?: (?:example|guide|version|one|document))?(?: instead| please)?[.!]?$/i;
const sourcesMentioned = /\b(?:photo|picture|image|drawing|file|manual|procedure|workbook|source|attached|attachment|record)\b|\.pdf\b|\.xlsx\b|\bP\d+\b/i;

export function namesFile(words: string) {
  return /\.(?:xlsx?|xlsm|csv|pdf|docx?)\b/i.test(words);
}

export function siteSubject(words: string) {
  const m = object.exec(words);
  if (m) return m[1].toLowerCase();
  if (namesFile(words) && /\b(?:using|use|based on|from|about)\b/i.test(words)) return 'named file';
  if (/\b(?:in|from|using|based on|shown in) (?:the |my |our )?(?:attached|uploaded|pictured|photographed)\b|\b(?:workbench|workstation|machine|line) (?:in|from) (?:the|my|our) (?:photo|file|picture)\b/i.test(words)) return 'subject in the source';
}

function description(words: string) {
  const clauses = words.split(/[\n.!?;]|\s+[—–]\s+/);
  return clauses.find(s =>
    !/(?:don.t have|do not have|without|no access to|lack)\b.{0,28}\b(?:information|photo|file|picture|permission|details|image|source)\b/i.test(s) &&
    !/\b(?:if|whether|suppose|imagine|hypothetical|might|could you|does it|do we)\b/i.test(s) &&
    /\b(?:holds?|contains?|store[sd]?|keep[s]?|sits?|stand[s]?|takes?|walk[s]?|wait[s]?|search(?:es)?|operators? (?:must|have to)|there (?:are|is)|has|have)\s+(?!permission\b|access\b|a (?:photo|file)\b)\S+(?:\s+\S+){1,}/i.test(s))?.trim();
}

export function authorBrief(words: string, turns: readonly ColleagueTurn[]) {
  const replies = turns.filter(t => t.kind === 'reply' && !t.struck && !t.answering);
  const last = replies[replies.length-1];
  const pending = last?.sourceBrief;
  let request = words;
  if (pending && generalAnswer.test(words.trim())) {
    const method = /\b(5s|smed|dmaic|kaizen|kanban)\b/i.exec(pending.request)?.[1];
    const matched = object.exec(pending.request);
    if (method && matched?.index !== undefined) {
      const before = pending.request.slice(0,matched.index).replace(/\s+(?:(?:specifically )?(?:on|about|for|using|at|of|from)|based on)\s*$/i,' ');
      request = (before + pending.request.slice(matched.index + matched[0].length)).replace(/\s+/g,' ').trim();
    } else {
      request = pending.request.replace(object,'a typical ' + pending.subject).replace(/(?:based on|using|from)\s+[“"]?[^“"\n]+?\.(?:pdf|xlsx?|csv|docx?)[”"]?/gi,'using a general example') + '. Use a clearly labelled general example.';
    }
  } else if (pending && !writingRequest(words) && (!words.trim() || description(words) || sourcesMentioned.test(words))) {
    request = pending.request + (words.trim() ? '\n' + words : '');
  }
  const writing = writingRequest(request, last?.text);
  const subject = writing && siteSubject(request);
  if (!subject) return { request, writing };
  const olderNote = [...turns].reverse().find(t => !t.struck && (t.kind === 'typed' || t.kind === 'said') &&
    fold(t.text ?? t.heard ?? '').includes(fold(subject)) && description(t.text ?? t.heard ?? ''));
  const note = description(request) ?? (olderNote ? description(olderNote.text ?? olderNote.heard ?? '') : undefined);
  return { request, writing, site:{request,subject}, note };
}

export function sourceQuestion(subject: string) {
  return 'What should I use for the ' + subject + '? Attach a photo, identify a file I can read, or describe the work. You can also say “use a general example”.';
}

export function pickAuthorSources(words: string, sources: AuthorSource[]) {
  const phrase = ' ' + fold(words) + ' ';
  const names = sources.filter(s => [s.name,s.id].some(n => !!n && phrase.includes(' ' + fold(n) + ' ')));
  const unique = (rows: AuthorSource[]) => rows.filter((s,i) => rows.findIndex(x=>x.id===s.id && x.kind===s.kind)===i);
  const named = unique(names);
  const byId = named.filter(s => phrase.includes(' ' + fold(s.id) + ' '));
  if (byId.length) return byId;
  if (named.length) return named.some(s => named.filter(t => fold(t.name) === fold(s.name)).length > 1) ? [] : named;
  return /\b(?:attached|uploaded) (?:workbook|file|manual|document)\b/i.test(words) && unique(sources).length === 1 ? unique(sources) : [];
}

export function selectPhotoTurns(turns: readonly ColleagueTurn[], request: string, subject: string, labels: Map<string,string>) {
  const photos = turns.filter(t => t.kind === 'photo' && !t.struck && t.media);
  const ids = request.match(/\bP\d+\b/gi)?.map(s=>s.toUpperCase());
  if (ids?.length) return photos.filter(t => ids.includes(labels.get(t.id) ?? ''));
  const captioned = photos.filter(t => t.text && fold(t.text).includes(fold(subject)));
  if (captioned.length) return captioned;
  const priorReply = turns.slice().reverse().find(t => t.kind === 'reply' && !t.struck && !t.answering);
  const adjacent = photos.filter(t => !priorReply || t.at >= priorReply.at);
  if (adjacent.length === 1 && !adjacent[0].text?.trim()) return adjacent;
  return photos.length === 1 && !photos[0].text?.trim() && /\b(?:attached|photo|picture|image)\b/i.test(request) ? photos : [];
}

const readKeys: Record<string,{ key: string; scope: AuthorSource['kind'] }> = {
  find_in_document:{key:'documentId',scope:'manual'}, read_record:{key:'studyId',scope:'record'},
  workbook_profile:{key:'workbookId',scope:'workbook'}, workbook_rows:{key:'workbookId',scope:'workbook'}, query_workbook:{key:'workbookId',scope:'workbook'},
  source_fields:{key:'source',scope:'data'}, query_data:{key:'source',scope:'data'},
};
export function selectedRead(call: CapCall, selected: AuthorSource[]) {
  const read = readKeys[call.name];
  const input = call.input && typeof call.input === 'object' ? call.input as Record<string,unknown> : {};
  if (Array.isArray(input.lookups) && input.lookups.some(l => l && typeof l === 'object' && 'source' in l && !selected.some(s=>s.id===l.source))) return;
  return read && selected.find(s => s.kind === read.scope && s.id === input[read.key]);
}

export function hasSourceContent(name: string, result: CapResult) {
  if (!result.ok) return false;
  const data = (result.data ?? {}) as {passages?:unknown[]; rows?:unknown[]; result?:{ rowsMatched?:number }; rowsMatched?:number; readings?:{n?:number}; remarks?:string[]; excerpt?:string};
  if (name === 'find_in_document') return !!data.passages?.length;
  if (name === 'query_workbook' || name === 'query_data') return (data.result?.rowsMatched ?? data.rowsMatched ?? 0)>0;
  if (name === 'workbook_rows') return !!data.rows?.length;
  return name === 'read_record' && result.refs.some(r=>r.kind==='study') && (!!data.excerpt?.trim() || !!data.remarks?.length || (data.readings?.n ?? 0)>0);
}

/** Report and chart IDs must have been produced from this brief's allowed sources in this turn. */
export function scopedOutput(call: CapCall, outputs: ReadonlySet<string>) {
  if (!['build_report','make_chart'].includes(call.name) || !call.input || typeof call.input !== 'object') return false;
  const input = call.input as {reportId?:string;resultId?:string;compareResultId?:string;section?:Partial<Record<string,unknown>>;sections?:Partial<Record<string,unknown>>[]};
  const allowed = (id: unknown) => typeof id === 'string' && outputs.has(id.split('@')[0]);
  if (call.name === 'make_chart') return allowed(input.resultId) && (!input.compareResultId || allowed(input.compareResultId));
  if (input.reportId && !allowed(input.reportId)) return false;
  const parts = [...(Array.isArray(input.sections) ? input.sections : []), ...(input.section ? [input.section] : [])];
  return parts.every(s => s && typeof s === 'object' && (!s.chartId || allowed(s.chartId)) && (!s.resultId || allowed(s.resultId)) &&
    (!s.evidence || (Array.isArray(s.evidence) && s.evidence.every(allowed))));
}
