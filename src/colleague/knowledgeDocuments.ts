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
const formats = /\b(?:(?:training|learning)\s+(?:document|guide|manual|pack|material|course)|training|document|guide|manual|handout|checklist|report|course|workshop|exercise|lesson(?: plan)?|briefing|playbook|toolbox talk|job aid|worksheet|cheat sheet|induction plan|work instruction|standard operating procedure|SOP)\b/i;

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

export function visualRevision(words: string) {
  return /^(?:make (?:it|this|that|the (?:guide|document)|(?:this|that) (?:guide|document)) (?:more )?visual|(?:illustrate|add (?:visuals|illustrations) to) (?:it|this|that|(?:the|this|that) (?:guide|document)))$/i.test(command(words));
}

const retrievalExample = { beforeSeconds:90, afterSeconds:35 };
const fiveS = (): DocumentDraft => ({
  title: '5S training guide',
  sections: [
    section('Why organise the work?', '5S is a method for organising the workplace around the work people actually do. Its purpose is to make the correct item easy to find, the correct method easy to follow and an abnormal condition easy to see. That can reduce searching, walking, waiting and picking errors. It can also expose a defect before it interrupts production. A tidy-looking area can still perform badly.\n\nStart with the people who do the job on each shift. Ask one of them to demonstrate a repeat task, such as preparing a product change. Follow the work through stores, the line and handover. Where do people stop, make extra trips, ask for help or risk choosing the wrong material? Pick one of those problems and agree how you will recognise an improvement.\n\nBy the end of this session, learners should be able to explain all five practices, use them on a shared workflow, distinguish an enabled improvement from a measured result, and agree how the team will sustain it.'),
    section('Sort — decide what the job needs', 'At the point of use, ask what each item is for, how often it is needed, what quantity is justified and who controls it. Separate current-job materials from obsolete, duplicate or uncertain items. Red-tag doubtful items with their identity, reason, owner and review date. Agree their disposition with the owner. Keep required safety equipment, controlled stock and traceability intact.\n\nExample: a changeover cart carries parts for several formats. A crew searches through them and can choose an obsolete guide. With operators and engineering, identify the approved change parts and separate shared items from format-specific kits. Check whether the correct kit can now be selected on the first attempt.'),
    section('Set in order — design the point of use', 'Observe sequence, frequency of use, ergonomics and replenishment before assigning locations. Place frequently used items where the work happens. Make identity, location, required quantity and shortage visible to the next person. Check travel routes and compatibility with hygiene, segregation and site safety rules.\n\nExample: arrange a format kit in the order it is fitted and agree who replenishes missing parts before the next change. At a document station, give operators a clear route to the current approved instruction and a way to recognise an obsolete copy. Test the arrangement with a relief operator who did not design it.'),
    section('Shine — use cleaning as inspection', 'Agree safe cleaning and inspection points, the normal condition and who responds when it changes. Use the site’s isolation, cleaning, hygiene and defect-reporting procedures. Keep clear of moving equipment. Repairs belong to authorised people.\n\nExample: a recurring oil mark becomes visible when a machine base is restored to its normal condition. The operator records its location and alerts maintenance through the site process. The area owner follows up the underlying cause. Repeated cleaning alone would leave the loss mechanism in place. Food safety release and sanitation verification follow their own approved controls.'),
    section('Standardise — make normal visible', 'Create the standard with the operators, stores, maintenance and quality teams affected. Show what belongs where, how the area is checked, when it is reset, the minimum stock or replenishment trigger where relevant, and what happens when something is wrong. Use plain labels, a layout or an approved photograph where they help. Give the standard an owner and a revision date.\n\nTry it across shifts. Ask a new starter to prepare the change kit and a relief operator to check it at handover. Where they interpret the standard differently, revise the wording or layout and repeat the trial.'),
    section('Sustain — close the loop across shifts', 'Build a quick condition check into existing work such as start-up or handover. Operators identify abnormalities. The shift lead gives each issue an owner and due date. The area owner reviews recurring problems, tests improvements and updates the standard after a change proves effective. Periodic independent checks can show where shifts interpret the same rule differently.\n\nUse audit results to choose what to investigate. A high checklist score alongside persistent searching means the checklist is missing an important part of the work. Ask the team to demonstrate the task again.'),
    section('Test the effect on performance', 'Choose a measure tied to the original problem. Retrieval time, walking distance, missing-kit incidents, wrong selections or delay before the first good unit each answer a different question. Record the baseline and repeat the same task under comparable conditions. Note changes in product mix, staffing or equipment that could explain the difference.\n\nWorked teaching example: retrieving a change part takes ' + retrievalExample.beforeSeconds + ' seconds in a baseline observation and ' + retrievalExample.afterSeconds + ' seconds in a trial. The observed task takes ' + (retrievalExample.beforeSeconds - retrievalExample.afterSeconds) + ' seconds less. Repeat across operators and shifts before adopting the layout. Only claim a line productivity gain after measuring saleable output against the relevant input over a representative period. Time released away from the constraint may improve work without increasing throughput.\n\nKnowledge check: the audit score rose but changeover delay stayed flat. What would you check? Follow the change from last good unit to first good unit, find what is still delaying it and check whether the 5S changes addressed that cause.'),
    section('Workshop — practise on a shared workflow', 'Choose a shared task that learners recognise and have permission to observe. Ask the person doing it to show where they lose time or how a mistake can occur. If the team has an approved standard, compare it with what happens during the task.\n\nIn pairs, identify a loss and record the starting condition. Specify one decision for each of the five practices, who owns it and what evidence would show it worked. Have another shift demonstrate the proposed standard. At the review, compare the agreed measure, check for unintended effects and decide whether to adopt, revise or reverse the change.\n\nFacilitator check: Can the learner explain why the layout changes the task? Which abnormality would Shine expose? Who responds when the standard fails? What evidence would justify claiming higher productivity?\n\nFurther reading on the method: Hiroyuki Hirano, 5 Pillars of the Visual Workplace (1995), and Takashi Osada, The 5S\'s (1991).'),
  ],
});

function readable(s: string) {
  return s.replace(/(\S)\n(?=[a-zA-Z(])/g, '$1 ').replace(/\*\*|\x60/g, '').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)').trim();
}

/** A request with extra constraints goes to Claude unchanged. Exact library topics can be taught without a model call. */
export function libraryDocument(request: NonNullable<ReturnType<typeof writingRequest>>): DocumentDraft | undefined {
  const topic = normal(request.subject).replace(/^(?:an?|the) /,'');
  if (request.kind.toLowerCase() === 'exercise' && /^(?:(?:visual|illustrated) )?5s(?: (?:visual|illustrated))?$/.test(topic)) return {
    title:'5S illustrated exercise',
    sections:[
      section('Inspect the changeover kit','Practise Set in order and Standardise by deciding whether a kit can be handed over. In this fictional exercise the list of required parts is the standard. Compare it with the illustrated tray and give your decision before revealing the answer. The drawing was made for this exercise.'),
      section('Apply the decision','Identify which position differs from the agreed standard. Explain who should respond and how the next shift would know the kit is ready. Then identify a different task where the same idea would help.'),
    ],
  };
  if (!/training|guide|handout|manual|document|report|briefing|lesson/i.test(request.kind)) return;
  const topicKey = (s: string) => normal(s).replace(/^(?:an?|the)\s+/, '');
  const records = methodRecords();
  const find = (subject: string) => {
    const names = records.filter(r => [r.id, r.name, r.name.split(/\s+[—(]/)[0]].some(n => topicKey(n) === subject));
    const matches = names.length ? names : records.filter(r => r.aka.some(n => topicKey(n) === subject));
    return { names, matches };
  };
  const subject = topicKey(request.subject);
  if (!subject || /^(?:this|that|it|six s|6s)$/.test(subject)) return;
  const direct = find(subject);
  const { names, matches } = !direct.matches.length && /^(?:visual|illustrated) /.test(subject)
    ? find(subject.replace(/^(?:visual|illustrated) /, '')) : direct;
  if (matches.length !== 1) return;
  const record = matches[0];
  if (record.id === 'lean.five-s' && !names.length) return;
  if (record.id === 'lean.five-s' && /training|guide|handout|lesson|manual/i.test(request.kind)) return fiveS();
  return documentFromMethod(record, request.kind);
}

function documentFromMethod(record: MethodRecord, kind: string): DocumentDraft {
  const body = (heading: string) => readable(record.sections[heading] ?? '');
  const topic = record.name.split(' — ')[0];
  const training = /training|lesson|guide|handout|manual/i.test(kind);
  const sections = [
    section(training ? 'What you will learn' : 'Purpose', [body('Purpose and principle'), 'Decisions this method supports', body('Questions it answers')].join('\n\n')),
    section('What you need', body('Inputs and minimum conditions')),
    section('How to apply it', body('Procedure and calculation')),
    section('Example interpretation', body('Reading the result')),
    section('On the factory floor', body('In food and FMCG manufacturing')),
    section('Where it can mislead', [body('Assumptions, limits and misuse'), 'When to choose a different approach', body('When not to use it — and instead')].join('\n\n')),
    ...(training ? [section('Practise and check understanding', 'Use the factory example above, or a case your team has permission to share. Choose one decision from the list below and name the process owner who would act on it. Gather the specified inputs, apply the procedure, and show how the result changes the decision.\n\n' + body('Questions it answers') + '\n\nAsk a second learner to challenge the interpretation using one of the limits above. Agree what to compare with the starting condition, under what conditions, when to review and who will follow up. Record a measured benefit only after that comparison.')] : []),
    section('Further reading', body('References')),
  ].filter(s => s.text);
  return { title: topic + ' ' + (training ? 'training guide' : kind.toLowerCase()), sections };
}

export const writingGuidance = 'The user requests a written operational document. Author it now in their requested language, format, audience and level. Use method_knowledge when relevant and your general domain knowledge for other topics. Teach the whole method at the depth the user requested. Explain the operational purpose and mechanism, when it applies, every essential practice and who does it, and how to repeat or sustain it. Connect the method to a practical decision and choose a baseline and verification measure. Separate released time or capacity from demonstrated throughput or productivity. Include a transferable worked example, a second context, practice, an answer or assessment criterion, and genuine limits. For a work instruction cover prerequisites, actions, acceptance and what to do when the standard is missed. For an analytical report state the decision, evidence, uncertainty and follow-up. Keep a quick reference concise when requested. An illustration, diagram or occasional emoji can explain one idea. The lesson must still teach the method without it. Keep hypothetical examples distinct from actual site findings. General guidance needs no file, measured results or project. If the person asks for actual site performance, use authorised source results and evidence sections as usual. Open with the learning objective or the decision in the user’s brief. Build the content from the named method or material the user supplied. Put optional invented scenarios in an explicitly labelled exercise. Only include a visual when its caption explains which part of that material it helps the reader understand or use. Identify general further reading separately from the sources actually used. If the intended task or a specific source is unclear and it changes the advice, ask one focused question. Teach one idea at a time with short visual labels. For two alternative routes through a problem, create a dedicated section headed by the learner’s question and a two-row table headed Observation | Change to try | Check. Supply a distinct observation, an appropriate action to trial and an observable check for each route, using short labels. The app draws both branches. For an ordered sequence use a process section. For a visual control, use a dedicated table headed Normal condition | Signal | Response with the actual standard, visible deviation and named response for each example. For measured comparisons, use a two-column table such as Condition | Retrieval time (seconds) only when comparable values and units are supplied or explicitly hypothetical. For a boundary or sequence, show where it starts and ends. Do not substitute a list of topic headings for a graphic. For a real workflow use a process section with one concise, named step per line so Luna can illustrate and play the sequence. For a comparison use a dedicated text section containing only a Markdown pipe table with headers, a separator row, and the actual contrasts. Choose whichever serves this particular brief. Include no invented site measurements. Use build_report once to save the full document. For a requested revision, update the named existing report. The app handles an explicit HTML export.';

/* A complete course and a quick answer have different deliverables. Check the actual proposed
 * material before saving a full training document, including a draft recovered from prose. */
export function trainingDraftGap(brief: string, sections: readonly Partial<Section>[]) {
  const format = writingRequest(brief)?.kind;
  if (format && /^(?:briefing|checklist|job aid|cheat sheet|worksheet)$/i.test(format)) return;
  if (!/\b(training|teach|course|workshop|lesson)\b/i.test(brief) || /\b(quick|brief|outline|short|micro|one[- ]point|one[- ]page|single[- ]page|slide)\b/i.test(brief)) return;
  if (sections.filter(s => s.kind === 'process' || (s.text?.trim().length ?? 0) >= 36).length < 3) {
    return 'Develop the full training guide before saving. Cover the purpose and application, then include practice and a way to check learning. A single illustration or tip alone is incomplete.';
  }
  const words = sections.map(s => [s.heading,s.text].join(' ')).join(' ');
  if (/\b5s\b/i.test(brief) && /\b(?:the|workplace|operator|training|station)\b/i.test(words)) {
    if (![/\bsort(?:ing)?\b|seiri/i,/set in order|straighten|seiton/i,/shine|seiso/i,/standardi[sz]|seiketsu/i,/sustain|shitsuke/i].every(re => re.test(words))) return 'Explain how all five 5S practices work, including standardising and sustaining the changes.';
  }
}

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
