import before from './guideArt/bench-before.jpg.base64?raw';
import after from './guideArt/bench-after.jpg.base64?raw';
import { type ConvReport, type ReportSection } from './outputs';
import { mediaEscape } from './presentationMedia';

export interface GuidePanel { label: string; detail: string; photo?: { data: string; alt: string; labels: [string,string] } }
export interface GuideFigure {
  kind: 'bench' | 'changeover' | 'method' | 'overview' | 'phases';
  title: string;
  panels: GuidePanel[];
  takeaway?: string;
}

const bench: GuideFigure = {
  kind: 'bench', title: 'What changed at the packing bench?',
  panels: [
    { label: 'Before the reset', detail: 'The tape gun and two spare rolls occupy the work surface.', photo: { data: 'data:image/jpeg;base64,' + before, labels:['Tape gun','Spare rolls'], alt: 'Green tape gun and two loose yellow rolls on the bench. The tool hook is empty.' } },
    { label: 'Ready for handover', detail: 'The gun has a visible home. One roll stays at point of use and the spares sit in a bin.', photo: { data: 'data:image/jpeg;base64,' + after, labels:['Tool home','Storage bin'], alt: 'The same bench with the green tape gun hanging on its hook, one roll on the worktop and two in a blue bin.' } },
  ],
  takeaway: 'At handover, ask someone from the next shift to find the gun, return it and point out where a missing item would show.',
};

const changeover: GuideFigure = {
  kind: 'changeover', title: 'Where does changeover time begin and end?',
  panels: [
    { label: 'Prepare while running', detail: 'Stage the approved roll and job paperwork outside the operating equipment.' },
    { label: 'Change between good packs', detail: 'From the last good pack of the old run, carry out the authorised change and checks. Include restart and adjustments.' },
    { label: 'Confirm the first good pack', detail: 'The first accepted pack of the new run closes the measured interval. Return surplus materials when safe.' },
  ],
  takeaway: 'This packing example shows the measurement boundaries. The widths in the diagram do not represent elapsed time.',
};

function excerpt(section: ReportSection): string {
  const paragraph = (section.text ?? '').trim().split(/\n\s*\n|\n(?=\s*[-*•]|\s*\d+[.)]\s)/)[0]?.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim() ?? '';
  const sentence = paragraph.match(/^.*?[.!?](?:[”"’'](?=\s|$)|(?=\s|$))/u)?.[0] ?? paragraph;
  return sentence.length <= 320 ? sentence : '';
}

/** Derive the illustration from this version's saved sections. A teaching example never becomes a site observation. */
function fullFiveS(report: ConvReport) {
  return /\b5s\b/i.test(report.title) && report.sections.some(s => s.heading === 'Why organise the work?') && report.sections.some(s => s.heading === 'Test the effect on performance');
}

export function guideSectionFigure(report: ConvReport, section: ReportSection) {
  if (fullFiveS(report) && section.heading === 'Workshop — practise on a shared workflow') return bench;
}

export function guideFigure(report: ConvReport): GuideFigure | undefined {
  const sections = report.sections;
  if (sections.some(s => !['text','process','summary','recommendation'].includes(s.kind) || s.evidence?.length || s.chartId || s.resultId)) return;
  const byHeading = (heading: string) => sections.find(s => s.heading === heading);
  if (fullFiveS(report)) return {
    kind:'phases', title:'How the five practices support reliable work',
    panels:[
      {label:'Sort',detail:'Decide what the task needs. Remove confusion about obsolete parts and unnecessary stock.'},
      {label:'Set in order',detail:'Design the point of use around the task. Reduce travel, search and incorrect selection.'},
      {label:'Shine',detail:'Inspect as you clean. Make a new leak, loose fitting or other abnormal condition visible and report it.'},
      {label:'Standardise',detail:'Agree the normal condition, replenishment trigger and response across shifts.'},
      {label:'Sustain',detail:'Review exceptions with the process owner. Check whether the performance gain holds.'},
    ],
    takeaway:'Start with an observed loss. Compare the same task before and after, then verify the wider effect on the process.',
  };
  if (/\b5s\b/i.test(report.title) && byHeading('Sort and set in order') && byHeading('Practise at the bench')) return bench;
  if (/\bSMED\b/i.test(report.title) && byHeading('How to apply it') && byHeading('What you need')) return changeover;
  if (/^DMAIC\b/i.test(report.title) && byHeading('How to apply it')) return {
    kind:'phases', title:'What each DMAIC phase establishes',
    panels:[
      {label:'Define',detail:'Agree the problem, the customer requirement and a measurable project aim.'},
      {label:'Measure',detail:'Check that the measurement system is reliable and establish the baseline.'},
      {label:'Analyse',detail:'Test possible causes against the evidence.'},
      {label:'Improve',detail:'Pilot a change and measure its effect against the baseline.'},
      {label:'Control',detail:'Agree the standard, owner and response when performance moves.'},
    ],
  };
  if (sections.some(s => s.kind === 'process' || comparisonTable(s.text))) return;
  const method = [['What you need', 'Inputs'], ['How to apply it', 'Method'], ['Example interpretation', 'Example reading']].map(([heading, label]) => {
    const s = byHeading(heading);
    return s && { label, detail: excerpt(s) };
  });
  if (method.every((p): p is GuidePanel => !!p?.detail)) return { kind: 'method', title: 'From inputs to interpretation', panels: method };
  const panels = sections.filter(s => !/^(?:references|sources|further reading|appendix)\b/i.test(s.heading))
    .slice(0, 4).map(s => ({label: s.heading, detail: excerpt(s)})).filter(p => p.detail);
  if (panels.length >= 2) return { kind:'overview', title:'At a glance', panels };
}

/** A Markdown comparison supplied by the author. Refuse uneven rows instead of dropping cells. */
export function comparisonTable(text?: string): { headings: string[]; rows: string[][] } | undefined {
  if (!text?.trim().startsWith('|')) return;
  const lines = text.trim().split(/\r?\n/).map(l => l.trim());
  if (lines.length < 3 || !lines.every(l => l.startsWith('|') && l.endsWith('|'))) return;
  const [headings, rule, ...rows] = lines.map(l => l.slice(1,-1).split('|').map(c => c.trim()));
  if (headings.length < 2 || headings.length > 5 || !headings.every(Boolean) || rule.length !== headings.length || !rule.every(c => /^:?-{3,}:?$/.test(c)) || !rows.every(r => r.length === headings.length)) return;
  return { headings, rows };
}

export function comparisonHtml(table: NonNullable<ReturnType<typeof comparisonTable>>) {
  return '<div class="lg-comparison" tabindex="0" role="region" aria-label="Comparison table"><table><thead><tr>' +
    table.headings.map(h => '<th scope="col">' + mediaEscape(h) + '</th>').join('') + '</tr></thead><tbody>' +
    table.rows.map(r => '<tr><th scope="row">' + mediaEscape(r[0]) + '</th>' + r.slice(1).map(c => '<td>' + mediaEscape(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
}

export function guideFigureHtml(figure: GuideFigure) {
  const photo = figure.kind === 'bench';
  const cards = figure.panels.map(p => '<div class="lg-panel">' +
    (p.photo ? '<div class="lg-photo"><img width="608" height="467" src="' + p.photo.data + '" alt="' + mediaEscape(p.photo.alt) + '">' +
      p.photo.labels.map(label => '<span aria-hidden="true" class="lg-pin">' + mediaEscape(label) + '</span>').join('') + '</div>' : '') +
    '<div class="lg-caption"><strong>' + mediaEscape(p.label) + '</strong>' +
    (photo ? '' : '<p>' + mediaEscape(p.detail) + '</p>') + '</div></div>').join('');
  const foot = photo ? '<details><summary>Reveal the changes</summary><ul>' + figure.panels.map(p => '<li>' + mediaEscape(p.detail) + '</li>').join('') + '</ul><p>' + mediaEscape(figure.takeaway ?? '') + '</p></details>'
    : figure.takeaway ? '<p class="lg-note">' + mediaEscape(figure.takeaway) + '</p>' : '';
  return '<figure class="lg-figure lg-' + figure.kind + '" data-guide-figure="' + figure.kind + '"><figcaption>' +
    (photo ? '<span>Illustrative packing bench · general example</span>' : '') + '<strong>' + mediaEscape(figure.title) + '</strong></figcaption><div class="lg-panels">' + cards + '</div>' + foot + '</figure>';
}
