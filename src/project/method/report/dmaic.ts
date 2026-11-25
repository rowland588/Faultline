/* DMAIC'S SECTIONS OF THE PROJECT REPORT (docs/METHODS.md §17; ISO 13053-1). Built from the SAME model the board and the Charter
 * paper use (shapes/dmaicModel): the five phase reviews — who, when, what each decided; the charter at a glance; and which phase is
 * next and what is missing before its review. Each says what it means for this project, not a copy of the answers. A tool's own
 * sentence comes from the model's slots (studyLine); its money is in "What everything is telling us now", by tool, never summed. Pure. */
import type { MethodReportFn, ReportItem, ReportSection, ReportTone } from '../../../lib/methodReportModel';
import { fieldsOf } from '../../../lib/methodSheet';
import { charterOf, currentGate, dayWords, gatesOf, recordedReview, type Gate } from '../shapes/dmaicModel';

const TONE: Record<Gate['tone'], ReportTone | undefined> = { g: 'g', a: 'a', r: 'r', w: 'w', n: undefined };

export const dmaicReport: MethodReportFn = ctx => {
  const gates = gatesOf(ctx.answers);
  const cur = currentGate(gates);
  const charter = charterOf(ctx.answers);

  /* the five phase reviews */
  const reviews: ReportSection = {
    id: 'dmaic-reviews', title: 'The five phase reviews',
    lead: `${gates.filter(g => g.review.result === 'passed' || g.review.result === 'conditions').length} of 5 phase reviews passed.`,
    items: [
      { kind: 'table', head: ['Phase', 'Review status', 'Reviewer', 'Review date', 'Review notes'], shares: [0.15, 0.22, 0.16, 0.16, 0.31],
        rows: gates.map(g => [g.name, recordedReview(g.review),
          g.review.who || '—', g.review.when ? dayWords(g.review.when) : '—', g.review.note || '—']),
        tones: gates.map(g => g.review.result ? TONE[g.tone] : undefined) },
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
    const conditional = gates.filter(g => g.review.result === 'conditions');
    nextItems.push(conditional.length
      ? { kind: 'callout', tone: 'a', word: 'Conditions recorded', text: conditional.map(g => g.name).join(', ') }
      : { kind: 'callout', tone: 'g', word: 'Passed', text: 'All five phase reviews have a recorded pass.' });
  } else {
    const unwritten = fieldsOf('dmaic', cur.name).filter(f => !(ctx.answer(f.id))).map(f => f.label);
    const lack = [!cur.review.who && 'who holds the review', !cur.review.when && 'the day of the review', !cur.review.result && 'what it decided'].filter(Boolean) as string[];
    const held = cur.review.result === 'held';
    nextItems.push({ kind: 'callout', tone: held ? 'r' : cur.state === 'Ready for review' ? 'a' : 'n', word: held ? 'Needs attention' : cur.state === 'Ready for review' ? 'Watch' : 'Note',
      text: `${cur.asks}${held ? ` It was held${cur.review.note ? `: ${cur.review.note}` : ' — what for is not written'}.` : ''}` });
    nextItems.push({ kind: 'bullets', items: [
      ...(unwritten.length ? [{ text: `Still to write before the review: ${unwritten.join(' · ')}.`, tone: 'a' as const }] : [{ text: `Every ${cur.name} question is written.` }]),
      ...(lack.length && !held ? [{ text: `The review itself still needs: ${lack.join(', ')}.` }] : []),
    ] });
    const tools = ctx.findings.filter(f => f.section === cur.name && f.key !== 'talk');
    if (tools.length) nextItems.push({kind: 'table', head: ['Saved tool record', 'Finding'], rows: tools.map(f => [f.title, f.says])});
  }
  const nextSec: ReportSection = { id: 'dmaic-next', title: cur ? `${cur.name} review` : 'All phase reviews passed',
    lead: cur ? 'First phase in DMAIC order without a recorded pass.' : undefined, items: nextItems };
  return [reviews, charterSec, nextSec];
};
