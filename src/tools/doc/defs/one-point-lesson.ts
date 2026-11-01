/* ONE-POINT LESSON (FC-224) — one idea, one page, mostly pictures, taught in five to ten minutes at the machine by whoever learned it. The
 * grid of who was taught, by shift, is the measure. Specified in knowledge/specs/FC-224-one-point-lesson.md; the method in
 * knowledge/methods/people/one-point-lesson.md (TPM practice: Suzuki 1994). Line Talk can still write the words from what is said
 * (docs/LINE-TALK.md); this holds the lesson and who has been taught. No money of its own (knowledge/MONEY.md, FC-224). */
import { daysBetween, niceDay } from '../../../lib/weeks';
import { KIND_WORD, coverOf, type Person } from '../figures/opl';
import { andList, distinctList, fmt, plural } from '../figures/words';
import { cellText, numOf, rowsOf, textOf } from '../doc';
import type { DocDef, DocProblem, DocTable } from '../types';

/** The record: a lesson below full coverage a week after it was written is the team leader's action. */
const WEEK = 7;
/** Five to ten minutes at the machine; longer is a procedure. */
const MINUTES_HIGH = 10;
/** One point is a sentence or two. */
const POINT_LONG = 240;

const one: DocDef = {
  key: 'one-point-lesson', fc: 'FC-224', title: 'One-point lesson', noun: 'lesson', group: 'Standardise',
  says: 'One idea on one page, right and wrong in pictures, taught at the machine in ten minutes — and who has been taught, by shift',
  question: 'How do we teach this one thing in five minutes?',
  signoff: { word: 'Agreed', ready: 'Ready to agree', by: 'the team leader', ask: 'Agree the lesson', back: 'Reopen the lesson' },
  sections: [
    { id: 'lesson', title: 'The lesson', help: 'One point. If it needs three, it is a procedure.', items: [
      { id: 'title', kind: 'text', label: 'Lesson', required: true, example: 'Film guide set 2 mm proud creases the splice', help: 'The point as a title.' },
      { id: 'kind', kind: 'choice', label: 'What kind', required: true, options: [
        { value: 'basic', label: 'Basic knowledge', help: 'How a sensor works; what a gauge should read.' },
        { value: 'trouble', label: 'Trouble case', help: 'What went wrong, why, what to look for.' },
        { value: 'improvement', label: 'Improvement case', help: 'What we changed and what it did.' },
      ] },
      { id: 'where', kind: 'text', label: 'Machine or task', example: 'Ilapak flow wrapper, film splice', offer: ctx => (ctx.lineName ? { value: ctx.lineName, words: `${ctx.lineName} — this document’s line` } : undefined) },
      { id: 'point', kind: 'long', label: 'The one point', required: true, example: 'Set the film guide to the 2 mm mark; 2 mm proud creases the film at the splice.', help: 'One or two sentences. What to do, or what to look for.' },
      { id: 'reason', kind: 'long', label: 'Why', example: 'A creased splice jams the former and stops the line for 20 minutes.', help: 'What goes wrong if it is not done — the reason to remember it.' },
      { id: 'check', kind: 'text', label: 'What to check, and when', example: 'The guide setting at every reel change', help: 'The habit that keeps it right.' },
      { id: 'minutes', kind: 'number', label: 'Minutes to teach one person', min: 0, unit: 'min', help: 'Five to ten. Longer is a procedure.' },
      { id: 'author', kind: 'person', label: 'Written by', required: true, help: 'Who found it or learned it — the person to ask.' },
      { id: 'written', kind: 'date', label: 'Written on', required: true },
      { id: 'back', kind: 'choice', label: 'Has the trouble come back since?', showIf: v => v.kind === 'trouble', options: [{ value: 'no', label: 'No — not since' }, { value: 'yes', label: 'Yes — it has come back' }], help: 'A trouble that recurs after the lesson is a cause not found, not a lesson to teach again.' },
      { id: 'offered', kind: 'text', label: 'Offered to', example: 'Line 1, Line 7', help: 'Other lines with the same machine. Separate them with commas.' },
    ] },
    { id: 'pictures', title: 'The pictures', help: 'The picture is the lesson: the right way ✓ and, for a trouble case, the wrong way ✗.', items: [
      { id: 'rightPhotos', kind: 'photos', label: 'The right way ✓', max: 3, help: 'Mark what makes it right in the caption.' },
      { id: 'wrongPhotos', kind: 'photos', label: 'The wrong way ✗', max: 3, help: 'What it looks like when it is wrong — the crease, the gap.' },
    ] },
    { id: 'taught', title: 'Who should know — and has been taught', help: 'Each person taught is marked with the day. The grid is the measure.', items: [
      { id: 'people', kind: 'list', label: 'The people', rowWord: 'person', required: true, help: 'Everyone who should know it. A blank “Taught on” is not taught yet.', columns: [
        { id: 'name', kind: 'person', label: 'Person', required: true },
        { id: 'shift', kind: 'text', label: 'Shift', example: 'Days' },
        { id: 'taught', kind: 'date', label: 'Taught on', help: 'The day they were taught it at the machine.' },
      ] },
    ] },
  ],
  check: (v, ctx): DocProblem[] => {
    const out: DocProblem[] = [];
    const point = textOf(v, 'point');
    if (point.length > POINT_LONG) out.push({ field: 'point', say: 'That is more than one point — a lesson with three points is a procedure. Keep one, and write the rest as another lesson.' });
    const m = numOf(v, 'minutes');
    if (m !== undefined && m > MINUTES_HIGH) out.push({ field: 'minutes', say: `${fmt(m, 0)} minutes is long for a one-point lesson — five to ${MINUTES_HIGH} at the machine; longer is a procedure.` });
    const written = textOf(v, 'written');
    if (written && written > ctx.today) out.push({ field: 'written', say: 'The day it was written has not come yet.' });
    for (const r of rowsOf(v, 'people')) {
      const t = cellText(r, 'taught');
      if (t && written && t < written) out.push({ field: 'people', say: `${cellText(r, 'name') || 'A person'} is marked taught before the lesson was written.` });
      if (t && t > ctx.today) out.push({ field: 'people', say: `${cellText(r, 'name') || 'A person'}’s teaching day has not come yet.` });
    }
    return out;
  },
  read: (v, ctx, photos) => {
    const rows = rowsOf(v, 'people');
    const people: Person[] = rows.map(r => ({ name: cellText(r, 'name'), shift: cellText(r, 'shift'), taught: !!cellText(r, 'taught') }));
    const c = coverOf(people);
    const kind = textOf(v, 'kind');
    const title = textOf(v, 'title') || 'This lesson';
    const offered = distinctList(textOf(v, 'offered'));
    const right = photos.filter(p => p.field === 'rightPhotos').length, wrong = photos.filter(p => p.field === 'wrongPhotos').length;
    const written = textOf(v, 'written');
    const age = written ? daysBetween(written, ctx.today) : undefined;
    const togo = c.total - c.taught;
    const sentence = c.total
      ? `${title}: ${KIND_WORD[kind] ?? 'lesson'}, taught to ${c.taught} of ${c.total}${c.shifts.length > 1 ? ` on ${plural(c.shifts.length, 'shift')}` : ''} (${Math.round((c.rate as number) * 100)}%)${togo ? `, ${togo} to go` : ''}${offered.length ? `; offered to ${andList(offered)}` : ''}.`
      : '';
    const checks: DocProblem[] = [];
    if (c.total && togo && age !== undefined && age > WEEK) checks.push({ field: 'people', say: `${plural(togo, 'person', 'people')} still not taught ${plural(age, 'day')} after it was written — a week is the most it should wait; this is the team leader’s action.` });
    if (kind === 'trouble' && textOf(v, 'back') === 'yes') checks.push({ field: 'back', say: 'The trouble has come back after the lesson — a cause not found. Find the cause (five whys) rather than teaching this again.' });
    if (title && !right && !wrong) checks.push({ field: 'rightPhotos', say: 'No picture yet — the picture is the lesson, and words alone are a memo.' });
    else if (kind === 'trouble' && right && !wrong) checks.push({ field: 'wrongPhotos', say: 'A trouble case shows the wrong way as well as the right — add the picture of what goes wrong.' });
    const table: DocTable[] = c.total ? [{
      title: 'Who has been taught', head: ['Shift', 'Taught', 'Of', 'Coverage'], shares: [0.4, 0.2, 0.2, 0.2],
      rows: c.shifts.map(s => [s.shift, String(s.taught), String(s.total), `${Math.round((s.taught / s.total) * 100)}%`]),
      note: 'Coverage = people taught ÷ people who should know.',
    }] : [];
    const last = rows.map(r => cellText(r, 'taught')).filter(Boolean).sort().pop();
    return {
      sentence, tone: 'n',
      tiles: [
        { k: 'Kind', v: KIND_WORD[kind] ?? '—', of: 'basic · trouble · improvement' },
        { k: 'Taught', v: c.total ? `${c.taught} of ${c.total}` : '—', of: togo ? `${togo} to go` : c.total ? 'everyone' : 'who should know?', ...(togo && age !== undefined && age > WEEK ? { tone: 'a' as const } : {}) },
        { k: 'Coverage', v: c.rate !== undefined ? `${Math.round(c.rate * 100)}%` : '—', of: c.shifts.length > 1 ? `${plural(c.shifts.length, 'shift')}, the lowest ${Math.round(Math.min(...c.shifts.map(s => s.taught / s.total)) * 100)}%` : 'taught ÷ should know' },
        { k: 'Pictures', v: `${right + wrong}`, of: `${right} right · ${wrong} wrong` },
        { k: 'Last taught', v: last ? niceDay(last, { year: true }) : '—', of: last ? 'the latest day in the grid' : 'nobody yet' },
        { k: 'Offered to', v: offered.length ? String(offered.length) : '—', of: offered.length ? andList(offered) : 'no other line yet' },
      ],
      tables: table,
      working: c.total ? [{ label: 'Coverage', value: `${c.taught} ÷ ${c.total} = ${fmt((c.taught / c.total) * 100, 1)}%`, note: 'people taught ÷ people who should know' }] : [],
      money: { missing: [], none: 'A one-point lesson has no money of its own: the trouble it prevents is priced on the problem it fixes, and teaching it is ten minutes a person (knowledge/MONEY.md, FC-224).' },
      caveats: [
        'A sheet pinned up and never taught teaches nobody: the grid of people taught is the proof, not the page.',
        'A lesson that contradicts the standard is wrong, or the standard is: update the standard first.',
        'A trouble case taught again and again is a cause not found — the lesson shares the fix, it does not find the cause.',
        'Coverage counts people marked with a day; it does not test that they remember it.',
      ],
      checks,
      closing: sentence ? `${sentence.replace(/\.$/, '')}. ${togo ? 'The people still to be taught are the team leader’s to do.' : 'Everyone who should know it has been taught.'}` : 'Write the one point, add the picture, then mark each person as they are taught.',
    };
  },
  examples: [
    {
      name: 'A trouble case — the film guide set proud, taught to 11 of 12 on two shifts',
      source: 'knowledge/methods/people/one-point-lesson.md worked case; worked in scripts/knowledge/cases-teach.py O1 (11 of 12 = 91.7%, days 6 of 6, nights 5 of 6)',
      values: {
        title: 'Film guide set proud creases the splice', kind: 'trouble', where: 'Ilapak flow wrapper, film splice', author: 'Night setter', written: '2026-10-20', minutes: 8, offered: 'Line 1, Line 7',
        point: 'Set the film guide to the 2 mm mark; 2 mm proud creases the film at the splice.', back: 'no',
        people: [
          ...['Ann', 'Ben', 'Cal', 'Dev', 'Eve', 'Fin'].map((n, i) => ({ id: `d${i}`, c: { name: n, shift: 'Days', taught: '2026-10-21' } })),
          ...['Gil', 'Hana', 'Ira', 'Jon', 'Kim'].map((n, i) => ({ id: `n${i}`, c: { name: n, shift: 'Nights', taught: '2026-10-22' } })),
          { id: 'n9', c: { name: 'Lou', shift: 'Nights' } },
        ],
      },
      expect: {
        sentence: 'Film guide set proud creases the splice: trouble case, taught to 11 of 12 on 2 shifts (92%), 1 to go; offered to Line 1 and Line 7.',
        tiles: { 'Filled in': '6 of 6', Kind: 'trouble case', Taught: '11 of 12', Coverage: '92%', Pictures: '0', 'Offered to': '2' },
        tables: { 'Who has been taught': [['Days', '6', '6', '100%'], ['Nights', '5', '6', '83%']] },
        checks: ['1 person still not taught 12 days after it was written', 'No picture yet'],
        needs: [],
      },
    },
    {
      name: 'A trouble that came back, a lesson that is a procedure, and a sheet nobody taught',
      source: 'the record’s misuse list: a trouble taught again and again is a cause not found; ten minutes is the most; a sheet pinned up and never taught',
      values: {
        title: 'Seal temperature', kind: 'trouble', author: 'Sam', written: '2026-10-01', minutes: 25, back: 'yes',
        point: 'Check the jaw temperature at start-up, then again after any stop longer than ten minutes, then compare the reading against the recipe card, then write it on the sheet at the machine, then initial the shift log and tell the team leader if it is more than two degrees out. '.repeat(1),
        people: [{ id: 'a', c: { name: 'Ann', shift: 'Days' } }, { id: 'b', c: { name: 'Ben', shift: 'Days' } }],
      },
      expect: {
        sentence: 'Seal temperature: trouble case, taught to 0 of 2 (0%), 2 to go.',
        tiles: { Taught: '0 of 2', Coverage: '0%', 'Last taught': '—' },
        checks: ['more than one point', '25 minutes is long for a one-point lesson', 'The trouble has come back after the lesson', '2 people still not taught 31 days after it was written'],
        needs: [],
      },
    },
    { name: 'A draft — nothing yet', source: 'the shape: a document is saved as typed; the boxes still needed are named', values: {}, expect: { sentence: '', tiles: { 'Filled in': '0 of 6', Taught: '—' }, needs: ['Lesson', 'What kind', 'The one point', 'Written by', 'Written on', 'The people — at least one person'] } },
  ],
  see: [{ key: 'job-instruction', why: 'a whole job taught step by step' }, { key: 'sop', why: 'the steps with a photo each' }],
};

export default one;
