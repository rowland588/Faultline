/* PDCA'S OWN SECTIONS OF THE PROJECT REPORT (docs/METHODS.md §17). Source: Shewhart (1939) and Deming (1986; PDSA 1993) — knowledge
 * record rca.pdca. A PDCA's report answers the record's four questions: what did we expect the change to do and what did it do, is the
 * difference real, did it become the standard, and what comes next. The cycles come from lib/methodPdca (readCycles) — the module the
 * board and the cycle record on paper read — so the three cannot part. Nothing is worked out: the numbers are the team's words, the
 * hit/missed word is the team's own first word (Yes · Partly · No) and a cycle that does not say is "not stated". What needs a look is
 * said by lib/methodInsights/pdca (it reaches "What needs attention" through the dashboard), so there are no flags here. */
import { HIT_WORD, readCycles, type CycleReading } from '../../../lib/methodPdca';
import type { MethodReportFn, ReportSection, ReportTone } from '../../../lib/methodReportModel';

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const NOT = 'Not written yet';
const DECISION_WORD = { adopt: 'Adopt', adapt: 'Adapt', abandon: 'Abandon' } as const;

const hitCell = (r: CycleReading): string => (r.hit ? HIT_WORD[r.hit] : r.checked ? 'Not stated' : 'Not checked yet');
const hitTone = (r: CycleReading): ReportTone | undefined => (r.hit === 'yes' ? 'g' : r.hit === 'partly' ? 'a' : r.hit === 'no' ? 'r' : undefined);

export const pdcaReport: MethodReportFn = ctx => {
  const cycles = readCycles(ctx.answers);
  const last = cycles[cycles.length - 1];
  const checked = cycles.filter(c => c.checked);
  const hit = cycles.filter(c => c.hit === 'yes').length;
  const missed = cycles.filter(c => c.hit === 'no' || c.hit === 'partly').length;
  const unstated = checked.filter(c => !c.hit).length;
  const notChecked = cycles.filter(c => !c.checked).length;

  /* 1 the cycles against what was predicted — the heart of a PDCA */
  const lead = checked.length
    ? `${plural(cycles.length, 'cycle')}: ${hit} hit the prediction, ${missed} missed it or only partly hit it${unstated ? `, ${unstated} checked without saying` : ''}${notChecked ? `, ${notChecked} not checked yet` : ''}.`
    : `${plural(cycles.length, 'cycle')}, none checked yet — a result is set against its prediction once Check is written.`;
  const decisionCell = (c: CycleReading) => (c.decision ? DECISION_WORD[c.decision] + (c.why ? ` — ${c.why}` : '') : c.decisionText || 'Not decided yet');
  const against: ReportSection = {
    id: 'pdca-cycles', title: 'Each cycle against its prediction', lead,
    items: [
      { kind: 'table', head: ['Cycle', 'Where it was → should be', 'Predicted', 'Result', 'Hit it?', 'Decision'], shares: [0.08, 0.22, 0.16, 0.18, 0.14, 0.22],
        rows: cycles.map(c => [String(c.n), c.before || NOT, c.predicted || 'No prediction written', c.after || (c.started ? NOT : 'Not checked yet'), hitCell(c), decisionCell(c)]),
        tones: cycles.map(hitTone) },
    ],
  };
  if (checked.length && hit === 0 && missed > 0) against.items.push({ kind: 'callout', tone: 'a', word: 'Watch', text: 'No cycle has hit its prediction yet — the cause suspected or the size of the change may be wrong.' });
  const words = cycles.filter(c => c.against);
  if (words.length) against.items.push({ kind: 'bullets', items: words.map(c => ({ text: `Cycle ${c.n}, in the team’s words: ${c.against}`, tone: hitTone(c) })) });

  /* 2 what was learned and decided, and why it can be believed */
  const learnedRows = cycles.filter(c => c.learned || c.beyond || c.decisionText || c.again);
  const learned: ReportSection = {
    id: 'pdca-learned', title: 'What each cycle taught us',
    lead: learnedRows.length ? 'What was learned, how we know the movement is more than the ordinary ups and downs, and what comes next.' : 'Nothing learned or decided is written yet — it is written in Check and Act.',
    items: learnedRows.length ? [{ kind: 'table', head: ['Cycle', 'What we learned', 'How we know it is real', 'Next cycle’s change'], shares: [0.08, 0.34, 0.32, 0.26],
      rows: learnedRows.map(c => [String(c.n), c.learned || NOT, c.beyond || NOT, c.again || (c.decision === 'adopt' ? 'None — adopted' : '—')]) }] : [],
  };
  const unproven = learnedRows.filter(c => c.checked && !c.beyond);
  if (unproven.length) learned.items.push({ kind: 'callout', tone: 'n', word: 'Note', text: `${unproven.length === 1 ? `Cycle ${unproven[0].n} has` : `Cycles ${unproven.map(c => c.n).join(', ')} have`} a result but no reason given for believing it is more than the number’s own ups and downs. Analysis (Did it change) or a control chart would say.` });

  /* 3 the cycle in hand */
  const hand = last;
  const handSection: ReportSection = {
    id: 'pdca-hand', title: `The cycle in hand — cycle ${hand.n}`, lead: `${hand.status}.`,
    items: [
      { kind: 'facts', rows: [['The change', hand.change || NOT], ['The effect expected', hand.predicted || NOT], ['Who does what, by when', hand.who || NOT], ['Where it stands', hand.inHand ? `In ${hand.inHand} — not finished until ${hand.inHand} is written` : 'All four quarters written']] },
    ],
  };
  if (!hand.inHand && hand.decision === 'adopt') handSection.items.push({ kind: 'paragraph', text: hand.standard ? `Adopted, and written into: ${hand.standard}` : 'Adopted — but where the new way is written is not said yet.' });
  return [against, learned, handSection];
};
