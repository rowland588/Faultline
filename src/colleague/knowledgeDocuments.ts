import { uid } from '../lib/ids';
import { runCall } from '../capabilities/registry';
import type { CapCtx } from '../capabilities/types';
import type { Step } from './colleagueAsk';
import { methodRecords } from '../catalogue/methodIndex';
import type { MethodRecord } from '../catalogue/methodRecord';
import { textDocument, type ConvReport, type ReportSection } from '../lib/data/outputs';
import { requestByReply } from './visualWork';
import { getStudy } from '../db';
import { outputsOfConversation } from '../capabilities/data';
import { saveHtmlArtifact } from './htmlArtifacts';
import { factsOfConversation, turnsOfConversation } from './conversation';

type Section = Pick<ReportSection, 'heading' | 'text' | 'kind'>;
export interface DocumentDraft { title: string; sections: Section[] }
const section = (heading: string, text: string): Section => ({ kind: 'text', heading, text });
const normal = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const command = (s: string) => s.trim().replace(/^(?:(?:hey\s+)?luna[, ]+)?(?:please[, ]+)?(?:(?:can|could|would) you\s+)?(?:please\s+)?/i, '').replace(/[.!?]+$/, '').trim();
const formats = /\b(?:(?:training|learning)\s+(?:document|guide|manual|pack|material|course)|training|document|guide|manual|handout|checklist|report|lesson(?: plan)?|briefing|playbook|toolbox talk|job aid|worksheet|cheat sheet|induction plan|work instruction|standard operating procedure|SOP)\b/i;

export const reportTopicQuestion = 'What should the report cover, and who will use it?';

export function writingRequest(words: string, previousReply?: string) {
  const requested = command(words)
    .replace(/^(?:I(?:'d|’d| would) like|I (?:want|need)) you to\s+/i, '')
    .replace(/^(?:I(?:'d|’d| would) like|I (?:want|need))\s+/i, 'write ');
  const answer = previousReply === reportTopicQuestion && !/^(?:cancel|stop|no|never mind)\b/i.test(requested);
  const input = (answer && !/^(?:make|build|create|write|draft)\b/i.test(requested)
    ? (formats.test(requested) ? 'write ' : 'write a report on ') + requested : requested).replace(/\b(?:trainining|trainning|trianing)\b/gi, 'training').replace(/(?:,?\s+please|\s+for me)$/i, '');
  const start = /^(?:make|build|create|prepare|draft|write|produce|design|develop|generate|give)\s+(?:(?:me|us)\s+)?/i.exec(input);
  if (!start || !formats.test(input) || /\bdashboards?\b/i.test(input)) return undefined;
  const html = /\bhtml\b/i.test(input) && !/\b(?:without|skip|no)\s+(?:the\s+)?html\b/i.test(input);
  const brief = input.slice(start[0].length).replace(/\s*(?:,?\s+and\s+(?:then\s+)?|,\s*)(?:turn|convert|export|save|put|make)\b[^.?!]*\bhtml\b.*$/i, '').trim();
  const kind = formats.exec(brief)?.[0] ?? 'document';
  const subject = brief.replace(/\b(?:in|as)\s+(?:(?:an?|the)\s+)?html\b|\bhtml\b/gi, '').replace(kind, ' ').replace(/^(?:an?|the)\s+/i, '').trim().replace(/^(?:on|about|for|in)\s+/i, '').trim();
  if (!subject || /^(?:this|that|it|up)$/i.test(subject)) return undefined;
  return { brief, kind, subject, html };
}

/** The words refer to an existing document. A fresh topic and its brief go to the authoring path. */
export function htmlDocumentRequest(words: string): { name?: string } | undefined {
  const input = command(words);
  if (/^(?:save|export|download)\s+(?:as\s+)?html$/i.test(input)) return {};
  if (/^(?:make (?:it|this|that) html|(?:create|make|save) (?:an? |the )?html (?:version|copy) of (?:it|this|that|(?:this|that|the) (?:document|report|guide)))$/i.test(input)) return {};
  const match = /^(?:turn|convert|export|save|put|make|download)\s+(.+?)\s+(?:into|to|as|in)\s+(?:(?:an?|the)\s+)?(?:standalone\s+)?html(?:\s+(?:file|document|page))?(?:,?\s+please)?$/i.exec(input);
  if (!match || /\b(?:dashboard|graphs?|charts?)\b/i.test(match[1])) return undefined;
  const named = match[1].replace(/^(?:me\s+)?(?:(?:this|that|the|my|our|last|latest)\b\s*)+/i, '').replace(/^(?:it|one)$/i, '').trim();
  if (named && (/^(?:an?|new)\s+/i.test(named) || (/^make /i.test(input) && !/^(?:the|this|that|my|our|last|latest)\b/i.test(match[1])))) return undefined;
  if (!named || /^(?:training\s+)?(?:report|document|guide|manual|handout|lesson|checklist|briefing|SOP|work instruction)$/i.test(named)) return {};
  if (!formats.test(named) && !/^["“].+["”]$/.test(named)) return undefined;
  return { name: named };
}

const fiveS = (): DocumentDraft => ({
  title: '5S training guide',
  sections: [
    section('What good looks like', 'By the end of this session, a team member should be able to return a workstation to its agreed condition, spot an abnormality and show the next shift what needs attention. Use a training bench or a stopped, authorised work area. Bring the area’s current standard and a few everyday items.'),
    section('Sort and set in order', 'Sort means deciding what belongs here. At a packing bench, keep the label roll needed for the current job. Put surplus stock in its agreed location. If nobody knows who owns an item, red-tag it with the reason and refer it to the area owner. Keep required tools and safety equipment available.\n\nSet in order means giving every necessary item an obvious home. Ask the operator where the label roll is used. Mark its location so a relief operator can find it, return it and see when it is missing.'),
    section('Shine and inspect', 'Use the approved cleaning method and follow the site’s isolation and hygiene procedures. As you clean, inspect. A recurring drip beneath a dispenser calls for a reported defect as well as a clean surface. Keep clear of moving equipment and leave repairs to authorised staff.'),
    section('Standardise and sustain', 'Agree the normal condition with the people who work each shift. A photograph of a correctly set bench can show where the current labels, cleaning tools and waste container belong. Add who checks it and when.\n\nAt handover, have the incoming operator compare the bench with the standard. Record a gap and give it an owner. If people repeatedly leave an item elsewhere, ask them to demonstrate the job before changing the layout.'),
    section('Practise at the bench', 'Give pairs an example workstation with a spare roll in the work area, a tool away from its marked home and a note describing a recurring leak. Ask one person to reset the area while the other observes. Swap roles.\n\nAsk each pair to show what they moved, what they escalated and what the next shift can now recognise at a glance. Use the team’s observations to agree one improvement to the standard.'),
    section('Check understanding', 'A tool is on its marked hook but nobody uses it here. Which step should you revisit?\nAnswer: Sort. Check its purpose and owner before relocating it.\n\nThe team cleans the same drip every shift. What is still missing?\nAnswer: Inspection and defect follow-up. Record the source of the drip through the site’s procedure and assign follow-up.\n\nHow can you tell the change has lasted?\nAnswer: Ask another shift to demonstrate the standard and review whether the same gaps recur.'),
    section('Facilitator close', 'Ask each learner to demonstrate one part of the reset and explain how they would report a problem. Agree who will review the standard at the next handover.\n\nMethod reference: Faultline’s Lean library, 5S. Further reading: Hiroyuki Hirano, 5 Pillars of the Visual Workplace.'),
  ],
});

function readable(s: string) {
  return s.replace(/(\S)\n(?=[a-zA-Z(])/g, '$1 ').replace(/\*\*|\x60/g, '').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)').trim();
}

/** A request with extra constraints goes to Claude unchanged. Exact library topics can be taught without a model call. */
export function libraryDocument(request: NonNullable<ReturnType<typeof writingRequest>>): DocumentDraft | undefined {
  if (!/training|guide|handout|manual|document|report|briefing|lesson/i.test(request.kind)) return;
  const subject = normal(request.subject.replace(/^(?:an?|the)\s+/i, ''));
  if (!subject || /^(?:this|that|it|six s|6s)$/.test(subject)) return;
  const matches = methodRecords().filter(r => [r.id, r.name, r.name.split(/\s+[—(]/)[0], ...r.aka].some(n => normal(n) === subject));
  if (matches.length !== 1) return;
  const record = matches[0];
  if (record.id === 'lean.five-s' && !['5s', 'five s', 'lean five s'].includes(subject)) return;
  if (record.id === 'lean.five-s' && /training|guide|handout|lesson|manual/i.test(request.kind)) return fiveS();
  return documentFromMethod(record, request.kind);
}

function documentFromMethod(record: MethodRecord, kind: string): DocumentDraft {
  const body = (heading: string) => readable(record.sections[heading] ?? '');
  const topic = record.name.split(' — ')[0];
  const training = /training|lesson|guide|handout|manual/i.test(kind);
  const sections = [
    section(training ? 'What you will learn' : 'Purpose', body('Purpose and principle')),
    section('What you need', body('Inputs and minimum conditions')),
    section('How to apply it', body('Procedure and calculation')),
    section('Example interpretation', body('Reading the result')),
    section('On the factory floor', body('In food and FMCG manufacturing')),
    section('Where it can mislead', body('Assumptions, limits and misuse')),
    ...(training ? [section('Practise and check understanding', 'Work in pairs. Choose one operation you know and identify the inputs the method needs. Apply the procedure to an example, then show another pair how you reached your conclusion.\n\nUse these questions to check the demonstration:\n' + body('Questions it answers'))] : []),
    section('Further reading', body('References')),
  ].filter(s => s.text);
  return { title: topic + ' ' + (training ? 'training guide' : kind.toLowerCase()), sections };
}

export const writingGuidance = 'The user requests a written operational document. Author it now in their requested language, format, audience and level. Use method_knowledge when relevant and your general domain knowledge for other topics. A training guide needs usable instruction, a worked example, practice and a knowledge check. Keep hypothetical examples distinct from actual site findings. General guidance needs no file, measured results or project. If the person asks for actual site performance, use authorised source results and evidence sections as usual. Use build_report once with a title and text or process sections to keep the full document here. For a requested revision, update the named existing report. The app handles an explicit HTML export.';

export function writingFromReply(text: string, title: string): DocumentDraft | undefined {
  const sections: Section[] = [];
  let heading = 'Overview', body: string[] = [];
  const flush = () => { if (body.join('').trim()) sections.push(section(heading, body.join('\n').trim())); body = []; };
  const lines = text.trim().split('\n');
  const firstHeading = /^#\s+(.+)$/.exec(lines[0]);
  if (firstHeading) { title = firstHeading[1].trim(); lines.shift(); }
  for (const line of lines) {
    const h = /^(?:#{1,4}\s+(.+?)|\*\*([^*]+)\*\*\s*:?)\s*$/.exec(line.trim());
    if (h) { flush(); heading = (h[1] ?? h[2]).replace(/:$/, '').trim(); }
    else body.push(line);
  }
  flush();
  if (sections.length < (firstHeading ? 1 : 2) || sections.length > 8 || sections.some(s => !s.text || s.text.length > 6000 || s.heading.length > 140)) return;
  return { title: title.slice(0, 120), sections };
}

export async function writeDocumentDraft(ctx: CapCtx, draft: DocumentDraft) {
  const call = { id: uid(), name: 'build_report', input: { title: draft.title, sections: draft.sections } };
  const result = await runCall(ctx, call, { confirmed: false });
  if (!result.ok || !result.show) throw new Error(result.ok ? 'The document was not saved.' : result.why);
  const step: Step = { call, title: 'Write the document', kind: 'local', status: 'done', says: result.says, refs: result.refs };
  return { step, ref: result.show };
}

export async function exportWrittenDocument(cid: string, opts: { name?: string; turnId?: string; reportId?: string } = {}) {
  const study = await getStudy(cid);
  if (!study || study.deletedAt) throw new Error('This conversation is unavailable.');
  const outputs = outputsOfConversation(study);
  let reports = outputs.reports.filter(textDocument);
  let report: ConvReport | undefined;
  if (opts.name) {
    const query = normal(opts.name).split(' ').filter(w => !['document','report','guide','training','manual','handout','the','called'].includes(w));
    const exact = reports.filter(r => normal(r.title) === normal(opts.name ?? ''));
    const matches = query.length ? reports.filter(r => query.every(w => normal(r.title).split(' ').includes(w))) : [];
    const choices = exact.length ? exact : matches;
    if (choices.length > 1) throw new Error('Which document do you mean? ' + choices.map(r => r.title).join(' or ') + '. Use Save HTML on the one you want.');
    report = choices[0];
  } else if (opts.reportId) report = reports.find(r => r.id === opts.reportId?.split('@')[0]);
  else {
    const turns = turnsOfConversation(factsOfConversation(study)).filter(t => !t.struck);
    const requests = requestByReply(turns);
    const turn = opts.turnId ? turns.find(t => t.id === opts.turnId) : [...turns].reverse().find(t => t.kind === 'reply' && (writingRequest(requests.get(t.id) ?? '') || t.used?.some(u => u.refs.some(r => r.kind === 'convreport'))));
    if (turn || opts.turnId) {
      const ids = turn?.used?.filter(u => u.status === 'done').flatMap(u => u.refs.filter(r => r.kind === 'convreport').map(r => r.id.split('@')[0])) ?? [];
      reports = reports.filter(r => ids.includes(r.id));
      if (reports.length > 1) throw new Error('Which document do you want as HTML? ' + reports.map(r => r.title).join(' or '));
    }
    report = [...reports].sort((a,b) => b.updated - a.updated)[0];
  }
  if (!report) throw new Error(opts.name ? 'I couldn’t find that document in this chat.' : 'Which document would you like to create? Give me a topic and an audience.');
  const { reportHtml } = await import('../lib/data/reportHtml');
  const html = await reportHtml({ report, charts: new Map(outputs.charts.map(c => [c.id,c])), results: new Map(outputs.results.map(r => [r.id,r])), printed: new Date().toLocaleDateString('en-GB') }).text();
  return saveHtmlArtifact(cid, report, html);
}
