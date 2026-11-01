/* THE A3'S SECTIONS OF THE PROJECT REPORT (docs/METHODS.md §17; knowledge/methods/rca/a3.md). The sheet in its two columns, the
 * countermeasure table (what · who · by when · against which cause, with the state of each), and whether the number held. Every
 * word comes from the models the board and the A3 paper already use — shapes/a3Model for the sheet, lib/methodInsights/a3 for what
 * is wrong with it (the same reading the dashboard says) — and the tools' own sentences and money. Nothing is recomputed here and
 * nothing is invented: a figure the team has not given is named as not written. No `flags`: the A3's insight already reaches
 * "what needs attention" through the dashboard, and saying it twice would be noise. */
import { a3Sheet, evidencePair } from '../shapes/a3Model';
import { a3Reading } from '../../../lib/methodInsights/a3';
import { studyLine, studyTitle } from '../../../lib/studyLinks';
import { moneyClauses, type MethodReportFn, type ReportItem, type ReportSection } from '../../../lib/methodReportModel';

const NOT = 'Not written yet.';

export const a3Report: MethodReportFn = ctx => {
  const pair = evidencePair(ctx.studies);
  const ev = (s: (typeof ctx.studies)[number] | undefined) => (s ? { title: studyTitle(s), says: studyLine(s, { studies: [...ctx.studies] }).text } : undefined);
  const cur = ev(pair.current), fol = ev(pair.followup);
  const sheet = a3Sheet(ctx.answers, { ...(cur ? { current: cur } : {}), ...(fol ? { followup: fol } : {}) });
  const r = a3Reading(ctx.answers, ctx.today);
  const a = ctx.answer;

  /* 1 — the page at a glance */
  const glance: ReportSection = {
    id: 'a3-glance', title: 'The A3 at a glance', lead: sheet.says,
    items: [
      { kind: 'facts', rows: [
        ['Problem', a('problem') || NOT], ['Owner', a('owner') || NOT], ['Questioned and agreed', a('agreed') || NOT],
        ['Number now', a('currentnum') || NOT], ['Number wanted, by when', a('target') || NOT],
        ['Follow-up', a('followdate') ? (a('followdate') + (r.follow.status === 'checked' ? ' — checked' : '')) : NOT],
      ] },
    ],
  };

  /* 2 — the sheet, in its two columns */
  const row = (b: (typeof sheet.blocks)[number]): string[] => {
    const words = b.list
      ? (sheet.cms.length ? `${sheet.cms.length} countermeasure${sheet.cms.length === 1 ? '' : 's'} — in the table below.` : NOT)
      : b.fields.filter(f => f.value).map(f => (b.fields.length > 1 ? `${f.label}: ${f.value}` : f.value)).join(' · ') || NOT;
    return [`${b.n}. ${b.title}`, words, b.evidence ? `${b.evidence.title} — ${b.evidence.says}` : '—'];
  };
  const side = (s: 'left' | 'right') => sheet.blocks.filter(b => b.side === s).map(row);
  const sheetSection: ReportSection = {
    id: 'a3-sheet', title: 'The sheet, block by block',
    lead: 'An A3 is read top left to bottom right: how it is now on the left, what is to be done on the right.',
    items: [
      { kind: 'paragraph', text: 'Left of the sheet — how it is now' },
      { kind: 'table', head: ['Block', 'What the team wrote', 'What the project’s tools say'], shares: [0.2, 0.46, 0.34], rows: side('left') },
      { kind: 'paragraph', text: 'Right of the sheet — what is to be done' },
      { kind: 'table', head: ['Block', 'What the team wrote', 'What the project’s tools say'], shares: [0.2, 0.46, 0.34], rows: side('right') },
    ],
  };

  /* 3 — the countermeasures */
  const cmItems: ReportItem[] = [];
  if (!r.cms.length) cmItems.push({ kind: 'callout', tone: 'n', word: 'Note', text: 'No countermeasure is written yet — the analysis has no answer on the page.' });
  else {
    cmItems.push({ kind: 'table', head: ['#', 'What', 'Who', 'By when', 'Against which cause', 'State'], shares: [0.05, 0.25, 0.12, 0.13, 0.25, 0.2],
      rows: r.cms.map(c => [String(c.n), c.cm.what || '—', c.cm.who || 'Nobody yet', c.cm.when || 'No day', c.cm.cause || 'No cause named', c.state]),
      tones: r.cms.map(c => c.tone) });
    const named = r.cms.length - r.cms.filter(c => c.noCause).length;
    cmItems.push({ kind: 'paragraph', text: `${named} of ${r.cms.length} countermeasure${r.cms.length === 1 ? '' : 's'} name${r.cms.length === 1 ? 's' : ''} the cause ${r.cms.length === 1 ? 'it answers' : 'they answer'}. A countermeasure that names no cause is a to-do list, not a countermeasure.`, tone: named === r.cms.length ? 'g' : 'a' });
  }
  const counter: ReportSection = { id: 'a3-counter', title: 'Countermeasures — what, who, by when, against which cause', lead: r.cms.length ? `${r.cms.length} on the sheet.` : 'None written.', items: cmItems };

  /* 4 — did it hold */
  const hold: ReportItem[] = [
    { kind: 'facts', rows: [['How the number is checked', a('followup') || NOT], ['Checked on', a('followdate') || NOT], ['What it showed', a('held') || NOT]] },
    { kind: 'callout', tone: r.follow.tone === 'g' ? 'g' : r.follow.tone, word: r.follow.status === 'checked' ? 'Fine' : r.follow.tone === 'r' ? 'Needs attention' : r.follow.tone === 'a' ? 'Watch' : 'Note', text: r.follow.says },
  ];
  if (cur || fol) {
    hold.push({ kind: 'paragraph', text: fol
      ? 'The number before and after, from the project’s own tools:'
      : 'The number now is from a tool; there is no second study to read it against yet — a before-and-after needs two.' });
    for (const [label, e] of [['Current condition', cur], ['Follow-up', fol]] as const) {
      if (!e) continue;
      hold.push({ kind: 'paragraph', text: `${label}: ${e.title} — ${e.says}` });
      const cl = moneyClauses(e.says);
      if (cl.length) hold.push({ kind: 'money', tool: label, title: e.title, text: cl.join(' '), missing: false });
    }
  } else hold.push({ kind: 'paragraph', text: 'No tool has measured the number yet — a chart or a capability study of it would show how you know.' });
  const followSection: ReportSection = { id: 'a3-follow', title: 'Did it hold?', lead: 'The page lives until the follow-up is written.', items: hold };

  return [glance, sheetSection, counter, followSection];
};
