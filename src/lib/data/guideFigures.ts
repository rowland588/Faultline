import formatKit from './guideArt/format-kit.jpg.base64?raw';
import before from './guideArt/bench-before.jpg.base64?raw';
import after from './guideArt/bench-after.jpg.base64?raw';
import { type ConvReport, type ReportSection } from './outputs';
import { mediaEscape } from './presentationMedia';

export interface GuidePanel { label: string; detail: string; photo?: { data: string; alt: string; labels: [string,string] } }
export interface GuideFigure {
  kind: 'bench' | 'changeover' | 'method' | 'overview' | 'phases' | 'inspection' | 'measure' | 'control';
  title: string;
  panels: GuidePanel[];
  takeaway?: string;
  measure?: { unit:string; values:{label:string;value:number}[] };
  inspection?: { standard: string; image: string; alt: string; width: number; height: number; signal: string; status: string; response: string };
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
  if (fullFiveS(report) && section.heading.startsWith('Sustain —')) return {
    kind:'control', title:'Who acts at handover?', panels:[
      {label:'Normal condition',detail:'The incoming operator can find and return every item to its defined place.'},
      {label:'Signal',detail:'A position is still empty when the kit is due for handover.'},
      {label:'Response',detail:'The shift lead names an owner and due time. The area owner investigates repeated shortages.'},
    ],
  } satisfies GuideFigure;
  if (fullFiveS(report) && section.heading === 'Test the effect on performance') {
    // The visual follows the values in the saved edition, including a revised example.
    const values = /retrieving a change part takes (\d+) seconds in a baseline observation and (\d+) seconds in a trial/i.exec(section.text ?? '');
    if (values) return {kind:'measure',title:'Time to retrieve one part',panels:[],measure:{unit:'seconds',values:[{label:'Baseline',value:Number(values[1])},{label:'Trial',value:Number(values[2])}]},takeaway:'Illustrative observations, timed over the same task. Repeat the trial across shifts.'} satisfies GuideFigure;
  }
  if (fullFiveS(report) && section.heading === 'Workshop — practise on a shared workflow' && section.text?.includes('illustrated packing bench')) return bench;
}

export function guideFigure(report: ConvReport): GuideFigure | undefined {
  const sections = report.sections;
  if (sections.some(s => !['text','process','summary','recommendation'].includes(s.kind) || s.evidence?.length || s.chartId || s.resultId)) return;
  const byHeading = (heading: string) => sections.find(s => s.heading === heading);
  if (fullFiveS(report)) return;
  if (report.title === '5S illustrated exercise' && byHeading('Inspect the changeover kit') && byHeading('Apply the decision')) return {
    kind:'inspection', title:'Would you release this kit?',
    panels:[],
    inspection:{
      standard:'A complete format kit contains one roller, one guide and one starwheel.',
      image:'data:image/jpeg;base64,' + formatKit, width:1040, height:532,
      alt:'Changeover tray with a roller on the left, an empty guide-shaped recess in the middle and a starwheel on the right.',
      signal:'The centre recess is empty. The exposed outline identifies the missing guide.',
      status:'Hold the kit',
      response:'The shift lead flags the shortage to the kit owner. The owner restores the approved guide and checks all three positions before releasing the kit.',
    },
  };
  if (/\b5s\b/i.test(report.title) && byHeading('Sort and set in order') && byHeading('Practise at the bench')) return bench;
  if (/\bSMED\b/i.test(report.title) && byHeading('How to apply it') && byHeading('What you need')) return changeover;
  if (/^Kanban, supermarkets and FIFO lanes/i.test(report.title) && byHeading('How to apply it')) return {
    kind:'control', title:'What authorises the next container?', panels:[
      {label:'Normal condition',detail:'The downstream process takes a container from its supermarket.'},
      {label:'Signal',detail:'The withdrawn container releases its kanban back to the supplying process.'},
      {label:'Response',detail:'The supplying team replenishes the authorised quantity. With no withdrawal signal it waits.'},
    ],
  };
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

function controlTable(headings: string[]) {
  return headings.length === 3 && /^(?:normal(?: condition)?|standard|expected condition)$/i.test(headings[0])
    && /^(?:signal|abnormal(?: condition)?|exception|observed signal)$/i.test(headings[1])
    && /^(?:response|action|owner and response)$/i.test(headings[2]);
}

function measureHtml(title: string, measure: NonNullable<GuideFigure['measure']>, note?: string) {
  const maximum = Math.max(...measure.values.map(v=>v.value),0);
  return '<figure class="lg-measure" data-guide-figure="measure"><figcaption><strong>' + mediaEscape(title) + '</strong></figcaption>' +
    measure.values.map(v=>'<div class="lg-measure-row"><span>' + mediaEscape(v.label) + '</span><div class="lg-track"><i style="width:' +
      (maximum ? 100*v.value/maximum : 0) + '%"></i></div><strong>' + v.value + ' ' + mediaEscape(measure.unit) + '</strong></div>').join('') +
    (note ? '<p>' + mediaEscape(note) + '</p>' : '') + '</figure>';
}

export function comparisonHtml(table: NonNullable<ReturnType<typeof comparisonTable>>) {
  // Compare like units on a zero-based scale with the original values alongside each bar.
  const unit = table.headings.length===2 && /^(.*?)\s*\((seconds|minutes|hours|metres|units|kg|s|min)\)$/i.exec(table.headings[1]);
  if (unit && table.rows.length>=2 && table.rows.length<=8 && table.rows.every(r=>/^\d+(?:\.\d+)?$/.test(r[1]) && Number.isFinite(Number(r[1])))) {
    return measureHtml(unit[1] || table.headings[1],{unit:unit[2],values:table.rows.map(r=>({label:r[0],value:Number(r[1])}))});
  }
  if (controlTable(table.headings)) {
    return '<div class="lg-controls">' + table.rows.map(row=>'<div class="lg-control-row">' +
      table.headings.map((h,i)=>'<div class="lg-control-state"><strong><b aria-hidden="true">' + ['✓','!','→'][i] + '</b>' + mediaEscape(h) + '</strong><p>' + mediaEscape(row[i]) + '</p></div>').join('') + '</div>').join('') + '</div>';
  }
  return '<div class="lg-comparison" tabindex="0" role="region" aria-label="Comparison table"><table><thead><tr>' +
    table.headings.map(h => '<th scope="col">' + mediaEscape(h) + '</th>').join('') + '</tr></thead><tbody>' +
    table.rows.map(r => '<tr><th scope="row">' + mediaEscape(r[0]) + '</th>' + r.slice(1).map(c => '<td>' + mediaEscape(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
}

export function guideFigureHtml(figure: GuideFigure) {
  if (figure.kind === 'control') return '<figure class="lg-control-figure" data-guide-figure="control"><figcaption><strong>' +
    mediaEscape(figure.title) + '</strong></figcaption>'+comparisonHtml({headings:figure.panels.map(p=>p.label),rows:[figure.panels.map(p=>p.detail)]})+'</figure>';
  if (figure.measure) return measureHtml(figure.title,figure.measure,figure.takeaway);
  if (figure.kind === 'changeover') {
    const [before,during,after] = figure.panels;
    return '<figure class="lg-timing" data-guide-figure="changeover"><figcaption><strong>' + mediaEscape(figure.title) + '</strong></figcaption><div class="lg-timing-line"><span>Last good pack</span><b aria-hidden="true">↔</b><span>First good pack</span></div><div class="lg-timing-steps">' +
      [before,during,after].map(p=>'<div><strong>'+mediaEscape(p.label)+'</strong><p>'+mediaEscape(p.detail)+'</p></div>').join('')+'</div><p>'+mediaEscape(figure.takeaway ?? '')+'</p></figure>';
  }
  const check = figure.inspection;
  if (check) return '<figure class="lg-inspection" data-guide-figure="inspection"><figcaption><span>5S field exercise · illustrated example</span><strong>' +
    mediaEscape(figure.title) + '</strong><p>' + mediaEscape(check.standard) + '</p></figcaption>' +
    '<div class="lg-inspect-scene"><img width="' + check.width + '" height="' + check.height + '" src="' + check.image + '" alt="' + mediaEscape(check.alt) + '">' +
    '<span class="lg-finding" aria-hidden="true">Missing guide</span></div>' +
    '<details class="lg-answer"><summary>Check your decision</summary><div class="lg-answer-body"><strong><b aria-hidden="true">!</b>' + mediaEscape(check.status) +
    '</strong><p>' + mediaEscape(check.signal) + ' ' + mediaEscape(check.response) + '</p></div></details></figure>';
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
