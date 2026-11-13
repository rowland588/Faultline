/* AT THE MACHINE — a procedure as the sheet that is read where the work is done (13 November — Rowland: "Are the SOPs clear? … do we
 * follow the original lean manufacturing principles and visual management? We don't want clutter. We want clarity. That's the design").
 *
 * The document's own paper (lib/report/docPaper) is its RECORD: every box, the reading, the checks, what it does not say. This is the
 * other one — the standard work sheet of the method: the job, what to take care of FIRST, the steps big and numbered in order, each with
 * its key point and its picture, and at the foot who keeps it and whether it is agreed. Nothing else: no tiles, no checks, no money.
 * Pure — the paper (lib/report/floorPaper) reads this and nothing else. It makes up no word: a step is the document's step, a warning
 * is a note written on the document that starts as a warning does, and a draft says it is a draft. */
import type { ToolStudy } from '../../lib/study';
import { niceDay, isoDay } from '../../lib/weeks';
import { cellText, rowsOf, studyPhotos, studyRaw, textOf } from './doc';
import { stepOfCaption } from './figures/sop';
import { pointsOf } from './figures/ji';

export const FLOOR_KINDS = ['sop', 'job-instruction'] as const;
export interface FloorStep { n: number; do: string; points: string[]; why: string[]; care: string; from: string; photoKey?: string }
export interface FloorSheet {
  kind: string; title: string; where: string;
  /** "Draft — not agreed" or "Agreed by … on …": the first thing a reader must know about a procedure. */
  status: string; agreed: boolean;
  /** What to take care of before starting — the document's notes that are warnings, in the words written. */
  warnings: string[];
  steps: FloorStep[];
  /** One line: who keeps it, its version, when it is read again. Only what the document holds. */
  foot: string;
  /** The documents the steps were taken from, said once. */
  source: string;
  /** The title block's boxes, as a standard work sheet has them — a box the document does not fill prints empty, to be written in. */
  cells: { label: string; value: string }[];
  /** The sign-off boxes at the foot. */
  signs: { label: string; value: string }[];
  /** Whether a step gives a reason (a work instruction's Why column). */
  hasWhy: boolean;
}

const CARE: Record<string, string> = { safety: 'Safety', quality: 'Quality', food: 'Food safety', allergen: 'Allergen' };
const WARN = /\b(warning|caution|danger|attention)\b/i;
/** "From VFB-240 manual, p.6: WARNING — …" → the warning's own words; where it is from is said once, at the foot. */
const bareWarning = (t: string) => t.replace(/^From [^:]{1,80}:\s*/i, '').replace(/^(warning|caution|danger|attention)\s*[—–:-]\s*/i, '').trim();

export function floorSheet(s: ToolStudy): FloorSheet | undefined {
  const key = s.agreed?.doc?.def;
  if (key !== 'sop' && key !== 'job-instruction') return undefined;
  const v = studyRaw(s), sop = key === 'sop';
  const photos = studyPhotos(s).filter(p => !p.struck && p.field === 'stepPhotos');
  const photoOf = (n: number) => photos.find(p => stepOfCaption(p.caption) === n)?.blobKey;
  const steps: FloorStep[] = rowsOf(v, 'steps').map((r, i) => {
    const n = i + 1, pk = sop ? photoOf(n) : undefined;
    const care = sop ? CARE[cellText(r, 'care')] ?? '' : cellText(r, 'safety') === 'yes' ? 'Safety' : '';
    return {
      n, do: cellText(r, sop ? 'do' : 'step'), points: sop ? (cellText(r, 'how') ? [cellText(r, 'how')] : []) : pointsOf(cellText(r, 'keys')),
      why: sop ? [] : pointsOf(cellText(r, 'reasons')), care, from: cellText(r, 'from'), ...(pk ? { photoKey: pk } : {}),
    };
  }).filter(x => x.do);
  const signed = s.agreed?.doc?.signed;
  const sources = [...new Set(steps.map(x => x.from.replace(/,?\s*p\.\s*\d+$/i, '').trim()).filter(Boolean))];
  const pages = [...new Set(steps.map(x => /p\.\s*(\d+)$/i.exec(x.from)?.[1]).filter((x): x is string => !!x))];
  /* one home per thing: where every step comes from one page, the foot says it once and no step repeats it */
  if (new Set(steps.map(x => x.from)).size === 1) for (const st of steps) st.from = '';
  const keeper = textOf(v, sop ? 'owner' : 'instructor'), version = textOf(v, 'version'), review = textOf(v, 'review');
  return {
    kind: sop ? 'Standard operating procedure' : 'Work instruction',
    title: textOf(v, 'title') || s.name, where: textOf(v, 'where'),
    status: signed ? `Agreed by ${signed.by} on ${niceDay(isoDay(signed.at), { year: true })}` : 'Draft — not agreed yet. Read it against the machine before it is used.',
    agreed: !!signed,
    warnings: (s.facts.remarks ?? []).filter(r => !r.struck && WARN.test(r.text)).map(r => bareWarning(r.text)).filter(Boolean),
    steps,
    foot: [keeper ? `${sop ? 'Kept by' : 'Taught by'} ${keeper}` : '', version ? `Version ${version}` : '', review ? `Read again by ${niceDay(review, { year: true })}` : ''].filter(Boolean).join('  ·  '),
    cells: [
      { label: 'Machine and line', value: textOf(v, 'where') }, { label: 'Version', value: version },
      { label: sop ? 'Kept by' : 'Taught by', value: keeper }, { label: 'Read again by', value: review ? niceDay(review, { year: true }) : '' },
    ],
    signs: [
      { label: sop ? 'Written by' : 'Broken down by', value: '' }, { label: 'Checked at the machine by', value: '' },
      { label: 'Agreed by', value: signed ? `${signed.by} · ${niceDay(isoDay(signed.at), { year: true })}` : '' },
    ],
    hasWhy: steps.some(x => x.why.length > 0),
    source: sources.length ? `Steps from ${sources.join(' and ')}${pages.length ? `, page${pages.length === 1 ? '' : 's'} ${pages.join(', ')}` : ''}.` : '',
  };
}
