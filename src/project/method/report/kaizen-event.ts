/* THE KAIZEN EVENT'S SECTIONS OF THE PROJECT REPORT (docs/METHODS.md §17). Six sections, each saying what it MEANS for this event:
 * the charter, the week day by day, what the week changed (before, after, what it bought), the new way, the actions carried to the
 * check, and the 30-day check itself. Every figure of days, check and actions is lib/kaizenEvent's — the module the board and the
 * Kaizen event report read — and the method's own warnings are lib/methodInsights/kaizen-event's, which reach "what needs
 * attention" through the dashboard (so no flag is repeated here). A tool's own sentence is quoted, never rewritten, and its money
 * is its own clause of that sentence (moneyClauses) — never summed, never invented. Pure. */
import { actionsOf, checkOf, dayWords, daysOf, eventSays, type Check } from '../../../lib/kaizenEvent';
import { moneyClauses, type MethodReportFn, type ReportItem, type ReportSection, type ReportTone } from '../../../lib/methodReportModel';
import { niceDay } from '../../../lib/weeks';

const NOT = 'Not written yet.';
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** The check's headline word — a colour is never the only carrier. */
export function checkWord(c: Check): string {
  if (c.verdict) return c.verdict;
  if (c.tone === 'r') return 'Overdue';
  return c.date ? 'Booked' : 'Not booked';
}

export const kaizenEventReport: MethodReportFn = ctx => {
  const a = ctx.answers;
  const w = ctx.answer;
  const today = ctx.today;
  const days = daysOf(a);
  const check = checkOf(a, today);
  const acts = actionsOf(ctx.owed, today);
  const at = (section: string) => ctx.findings.filter(f => f.section === section);
  const toolBullets = (section: string): ReportItem[] => {
    const fs = at(section);
    return fs.length ? [{ kind: 'bullets', items: fs.map(f => ({ text: `${f.tool} (${f.title}): ${f.says}`, tone: f.tone as ReportTone })) }] : [];
  };
  const moneyOf = (...sections: string[]): ReportItem[] => sections.flatMap(s => at(s)).flatMap((f): ReportItem[] => {
    const cl = moneyClauses(f.says);
    return cl.length ? [{ kind: 'money', tool: f.tool, title: f.title, text: cl.join(' '), missing: false }] : [];
  });

  /* 1 the charter */
  const startWords = a['start'] ? `from ${dayWords(a['start'], true)}` : '';
  const charter: ReportSection = {
    id: 'kz-charter', title: 'The charter', lead: 'What the week is for, who owns it, and the number it is judged by.',
    items: [
      { kind: 'facts', rows: [
        ['Problem and goal', w('charter') || NOT], ['Sponsor', w('sponsor') || NOT], ['Measure and target', w('target') || NOT],
        ['Team', w('team') || NOT], ['Dates', w('dates') || startWords || NOT], ['Baseline (taken before the week)', w('baseline') || NOT],
      ] },
      ...(at('Prepare').length ? [{ kind: 'paragraph', text: 'What the project’s tools say about the baseline:' } as ReportItem, ...toolBullets('Prepare')] : []),
    ],
  };

  /* 2 the week, day by day */
  const missedIso = (iso?: string) => !!iso && iso < today;
  const week: ReportSection = {
    id: 'kz-week', title: 'The week, day by day', lead: eventSays(a, today),
    items: [
      { kind: 'table', head: ['Day', 'Date', 'What we saw', 'What we changed', 'Measure at the close', 'State'], shares: [0.07, 0.14, 0.24, 0.24, 0.2, 0.11],
        rows: days.map(d => [String(d.n), d.iso ? dayWords(d.iso, true) : 'No date', d.see || '—', d.change || '—', d.measure || '—', d.word]),
        tones: days.map(d => (d.word === 'Not written' ? (missedIso(d.iso) ? 'r' : undefined) : d.word === 'Under way' ? 'w' : undefined)) },
      ...(w('waste') ? [{ kind: 'facts', rows: [['The waste seen, in one answer', w('waste')]] } as ReportItem] : []),
      ...(at('Observe').length ? [{ kind: 'paragraph', text: 'What the project’s tools saw on the floor:' } as ReportItem, ...toolBullets('Observe')] : []),
    ],
  };

  /* 3 what the week changed — before, after, what it bought */
  const before = w('baseline'), after = w('after');
  const both = !!before && !!after;
  const result: ReportSection = {
    id: 'kz-result', title: 'What the week changed',
    lead: 'The measure before the week and after it, set side by side.',
    items: [
      { kind: 'facts', rows: [['Measure and target', w('target') || NOT], ['Before the week', before || NOT], ['After the changes', after || NOT], ['Changes tried, and measured', w('tried') || NOT], ['What the week bought', w('worth') || NOT]] },
      both
        ? { kind: 'callout', tone: 'n', word: 'Note', text: 'Both numbers are the team’s own words, so the report does not work out the difference between them. For a tested before and after (is it beyond the noise?), use Analysis, Did it change.' }
        : { kind: 'callout', tone: 'a', word: 'Watch', text: `The week has no result yet: ${[!before ? 'the baseline' : '', !after ? 'the measure after the changes' : ''].filter(Boolean).join(' and ')} ${before || after ? 'is' : 'are'} not written.` },
      ...(at('Improve').length ? [{ kind: 'paragraph', text: 'What the project’s tools say about the changes:' } as ReportItem, ...toolBullets('Improve')] : []),
      ...moneyOf('Improve', 'Prepare', 'Observe'),
    ],
  };

  /* 4 the new way */
  const written = w('written'), trained = w('trained');
  const standard: ReportSection = {
    id: 'kz-standard', title: 'The new way',
    lead: 'A gain holds when the new way is written and taught to everyone who does the work.',
    items: [
      { kind: 'facts', rows: [['The new way, written', written || NOT], ['Who has been trained', trained || NOT]] },
      written && trained
        ? { kind: 'callout', tone: 'g', word: 'Written and taught', text: 'The new way is written and the people trained in it are named.' }
        : { kind: 'callout', tone: written ? 'a' : 'n', word: written ? 'Watch' : 'Note', text: written ? 'The new way is written, but nobody is recorded as trained in it. A standard nobody was taught is not one.' : 'The new way is not written yet.' },
      ...toolBullets('Standardise'),
    ],
  };

  /* 5 the actions carried to the check */
  const open = ctx.owed.filter(i => (i.kind === 'next' || i.kind === 'found') && !i.doneAt && !(i.testId ?? '').startsWith('method:'));
  const trouble = open.filter(i => (i.due && i.due < today) || !(i.owner ?? '').trim());
  const actions: ReportSection = {
    id: 'kz-actions', title: 'Actions carried to the 30-day check',
    lead: acts.raised ? `${plural(acts.raised, 'action')} raised, ${acts.closed} closed${acts.share === null ? '' : ` (${acts.share}%)`}, ${acts.open} open.` : 'No action has been raised on this project yet.',
    items: [
      { kind: 'facts', rows: [['Raised', String(acts.raised)], ['Closed', acts.share === null ? '0' : `${acts.closed} (${acts.share}% of raised)`], ['Open', String(acts.open)], ['Late', String(acts.late)], ['Open with nobody named', String(acts.noOwner)], ['Written under Sustain', w('open') || NOT]] },
      trouble.length
        ? { kind: 'bullets', items: trouble.map(i => ({ tone: (i.due && i.due < today ? 'r' : 'a') as ReportTone, text: `${i.what.trim() || 'An action with no words yet'} — ${(i.owner ?? '').trim() || 'nobody named'}, ${i.due ? `by ${niceDay(i.due)}${i.due < today ? ' (late)' : ''}` : 'no day'}` })) }
        : { kind: 'paragraph', text: acts.open ? 'Every open action has an owner and a day that has not passed.' : 'No action is open.' },
    ],
  };

  /* 6 the 30-day check */
  const end = days[4]?.iso;
  const checkSec: ReportSection = {
    id: 'kz-check', title: 'The 30-day check',
    lead: 'The test of the week: is the measure still moved a month later?',
    items: [
      { kind: 'callout', tone: check.tone === 'n' ? 'n' : check.tone, word: checkWord(check), text: check.says },
      { kind: 'facts', rows: [
        ['The week ended', a['start'] && end ? dayWords(end, true) : 'First day not given'],
        ['The day of the check', check.date ? dayWords(check.date, true) : check.suggested ? `Not booked — thirty days on is ${dayWords(check.suggested, true)}` : 'Not booked'],
        ['Verdict', check.verdict ?? 'Not recorded'],
        ['The measure at 30 days', check.holding || NOT],
      ] },
      ...(after && check.holding ? [{ kind: 'paragraph', text: `Set side by side: after the changes — ${after}; at 30 days — ${check.holding}.` } as ReportItem] : []),
      ...toolBullets('Sustain'),
      ...moneyOf('Sustain', 'Standardise'),
    ],
  };

  return [charter, week, result, standard, actions, checkSec];
};
