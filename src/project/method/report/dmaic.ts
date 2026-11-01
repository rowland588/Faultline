/* DMAIC'S SECTIONS OF THE PROJECT REPORT (docs/METHODS.md §17; ISO 13053-1). Built from the SAME model the board and the Charter
 * paper use (shapes/dmaicModel): the five phase reviews — who, when, what each decided; the charter at a glance; and which phase is
 * next and what is missing before its review. Each says what it means for this project, not a copy of the answers. A tool's own
 * sentence comes from the model's slots (studyLine); its money is in "What everything is telling us now", by tool, never summed. Pure. */
import type { MethodReportFn, ReportItem, ReportSection, ReportTone } from '../../../lib/methodReportModel';
import { fieldsOf } from '../../../lib/methodSheet';
import { RESULTS, charterOf, currentGate, dayWords, gatesOf, gatesSay, insertionsOf, type Gate } from '../shapes/dmaicModel';

const TONE: Record<Gate['tone'], ReportTone | undefined> = { g: 'g', a: 'a', r: 'r', w: 'w', n: undefined };

export const dmaicReport: MethodReportFn = ctx => {
  const gates = gatesOf(ctx.answers);
  const cur = currentGate(gates);
  const charter = charterOf(ctx.answers);

  /* the five phase reviews */
  const decided = (g: Gate) => (g.review.result ? RESULTS.find(r => r.k === g.review.result)?.word ?? '' : '');
  const reviews: ReportSection = {
    id: 'dmaic-reviews', title: 'The five phase reviews',
    lead: gatesSay(gates),
    items: [
      { kind: 'table', head: ['Phase', 'State', 'Reviewed by', 'Date', 'What it decided'], shares: [0.14, 0.2, 0.18, 0.15, 0.33],
        rows: gates.map(g => [`${g.name}${cur?.key === g.key ? ' — in hand' : ''}`, `${g.state}${g.fields ? ` (${g.written} of ${g.fields} written)` : ''}`, g.review.who || '—', g.review.when ? dayWords(g.review.when) : '—', [decided(g), g.review.note].filter(Boolean).join(': ') || '—']),
        tones: gates.map(g => TONE[g.tone]) },
      { kind: 'paragraph', text: 'A review is held at the end of each phase on the evidence written for it. It never locks the next phase: the team may start Measure while Define’s review is only booked, and the report says so in words.' },
    ],
  };

  /* the charter at a glance */
  const written = charter.rows.filter(r => r.value);
  const charterSec: ReportSection = {
    id: 'dmaic-charter', title: 'The charter at a glance',
    lead: charter.says,
    items: [
      ...(written.length ? [{ kind: 'facts', rows: written.map(r => [r.label, r.value] as [string, string]) } as ReportItem] : []),
      ...(charter.missing.length ? [{ kind: 'callout', tone: written.length ? 'a' : 'n', word: 'Not written yet', text: charter.missing.join(' · ') } as ReportItem] : []),
    ],
  };

  /* which phase is next, and what is missing for its review */
  const nextItems: ReportItem[] = [];
  if (!cur) {
    nextItems.push({ kind: 'callout', tone: 'g', word: 'Fine', text: 'All five phases have passed their review. The process is handed over; the holding evidence is the control chart and the control plan.' });
  } else {
    const unwritten = fieldsOf('dmaic', cur.name).filter(f => !(ctx.answer(f.id))).map(f => f.label);
    const lack = [!cur.review.who && 'who holds the review', !cur.review.when && 'the day of the review', !cur.review.result && 'what it decided'].filter(Boolean) as string[];
    const held = cur.review.result === 'held';
    nextItems.push({ kind: 'callout', tone: held ? 'r' : cur.state === 'Ready for review' ? 'a' : 'n', word: held ? 'Needs attention' : cur.state === 'Ready for review' ? 'Watch' : 'Note',
      text: `${cur.name} is next (${cur.state.toLowerCase()}). ${cur.asks}${held ? ` It was held${cur.review.note ? `: ${cur.review.note}` : ' — what for is not written'}.` : ''}` });
    nextItems.push({ kind: 'bullets', items: [
      ...(unwritten.length ? [{ text: `Still to write before the review: ${unwritten.join(' · ')}.`, tone: 'a' as const }] : [{ text: `Every ${cur.name} question is written.` }]),
      ...(lack.length && !held ? [{ text: `The review itself still needs: ${lack.join(', ')}.` }] : []),
    ] });
    const tools = insertionsOf(ctx.studies).filter(i => i.phase === cur.key);
    if (tools.length) nextItems.push({ kind: 'table', head: ['Question in this phase', 'What the project’s own tool says'], shares: [0.4, 0.6],
      rows: tools.map(i => [i.question, i.says ? `${i.toolName} — ${i.name}: ${i.says}` : `No ${i.toolName} study in this project yet.`]) });
  }
  const nextSec: ReportSection = { id: 'dmaic-next', title: cur ? `Next: ${cur.name}` : 'Where it stands: closed', lead: cur ? `The phase in hand, and what is missing before its review.` : undefined, items: nextItems };

  return [reviews, charterSec, nextSec];
};
