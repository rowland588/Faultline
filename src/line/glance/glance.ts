/* A TOOL RECORD AT A GLANCE — what a card on the line's page shows of it (13 November, the line-page brief — Rowland: "each card already
 * showing its tool's own result, the headline figure and the graph the tool produced, so the page reads as evidence … Nothing about what a
 * tool does or calculates should change, and every number on a card must match the number on its tool page").
 *
 * Pure, and it works NOTHING out: each branch calls the very function the tool's own page calls for its tiles and its picture — a
 * calculator's result (tools/calc studyCalc), a capability study's tiles (sampleTiles), a control chart's (chartTiles), an analysis's
 * (analysisTiles), a Line Talk's own count (talkCounts), Line capacity's lean page and flow model (capacityLean · flowModel). A tool with no figures of its own yet on a card
 * says its sentence and nothing more — no figure is made up to fill a card. Knows nothing of lines: it takes a record, so an area can
 * use it for the records of several lines. */
import type { LeanTile, LeanTone } from '../../lib/lean';
import type { ToolStudy } from '../../lib/study';
import type { Workspace } from '../../types';
import type { Standard } from '../../tools/linestandard/standard';
import { headcount } from '../../tools/linestandard/standard';
import { talkCounts, talkLatest, talkMinutes, turnsOf } from '../../tools/talk/talk';
import { studyCalc, tilesSince } from '../../tools/calc/calc';
import type { CalcBars, CalcPicture } from '../../tools/calc/types';
import { sample, sampleSays } from '../../tools/capability/sample';
import { sampleTiles } from '../../tools/capability/sampleLean';
import { chartFigures, chartTiles } from '../../tools/chart/chart';
import { analysisFigures, analysisTiles } from '../../tools/analysis/analysis';
import { analyse, labourInputs } from '../../tools/linebalance/capacity';
import { lanesAlike } from '../../tools/linebalance/capacityLines';
import { flowModel, type FlowModel } from '../../tools/linebalance/capacityFlow';
import { capacityPaper } from '../../tools/linebalance/capacityPaper';
import { capacityLean } from '../../tools/linebalance/capacityLean';

/** The tool's own picture, as its page draws it — a description the tool's own component draws; never a new chart. */
export type GlancePic =
  | { t: 'bars'; bars: CalcBars }
  | { t: 'plot'; pic: CalcPicture }
  | { t: 'capacity'; model: FlowModel };

export interface Glance {
  /** The figures the tool's page shows, in its order — the first is the headline. Empty when the tool has none for a card yet. */
  tiles: LeanTile[];
  pic?: GlancePic;
  /** A few words of verdict where the tool gives one ("429 kg lost"). */
  verdict?: string;
  tone?: LeanTone;
  /** The tool's own one sentence, where its row on a list says only the verdict (a calculator). */
  sentence?: string;
  /** What that sentence is, said before it ("Latest answer"). */
  note?: string;
}

const NONE: Glance = { tiles: [] };

/** A study's figures and picture, from its tool's own functions. */
export function glanceOfStudy(s: ToolStudy): Glance {
  if (s.tool === 'calc') {
    const r = studyCalc(s)?.run.result;
    if (!r) return NONE;
    return { tiles: tilesSince(r.tiles, undefined), verdict: r.verdict, tone: r.tone, sentence: r.sentence,
      ...(r.bars ? { pic: { t: 'bars' as const, bars: r.bars } } : r.picture ? { pic: { t: 'plot' as const, pic: r.picture } } : {}) };
  }
  if (s.tool === 'capability' && s.agreed?.readings) {
    const a = s.agreed.readings, f = sample(a, s.facts.readings ?? []), said = sampleSays(f, a);
    return { tiles: sampleTiles(f, a, said), verdict: said.verdict, tone: said.tone as LeanTone };
  }
  if (s.tool === 'chart' && s.agreed?.chart) {
    const a = s.agreed.chart;
    return { tiles: chartTiles(chartFigures(a, s.facts.readings ?? []), a) };
  }
  if (s.tool === 'analysis' && s.agreed?.analysis) {
    const a = s.agreed.analysis;
    return { tiles: analysisTiles(analysisFigures(a, s.facts.readings ?? []), a) };
  }
  if (s.tool === 'talk') {
    /* a Line Talk: what it holds, counted by the talk's own count (talkCounts — the one its sentence is written from), and its latest answer */
    const turns = turnsOf(s.facts), c = talkCounts(turns), latest = talkLatest(turns);
    if (!c.live) return NONE;
    const tiles: LeanTile[] = [
      ...(c.said ? [{ k: 'Said', v: String(c.said), ...(c.secs > 0 ? { of: talkMinutes(c.secs) } : {}) }] : []),
      ...(c.photos ? [{ k: 'Photos', v: String(c.photos) }] : []),
      ...(c.typed ? [{ k: 'Typed', v: String(c.typed) }] : []),
      ...(c.answers ? [{ k: 'Answers', v: String(c.answers) }] : []),
      ...(c.docs ? [{ k: 'Documents', v: String(c.docs) }] : []),
      ...(c.unwritten ? [{ k: 'Not written down', v: String(c.unwritten), tone: 'a' as const }] : []),
    ];
    return { tiles, ...(latest ? { sentence: latest.text, note: 'Latest answer' } : {}) };
  }
  /* A value stream's page does not show its figures as tiles a check can read off it, so its card says its sentence until that can be
     proven (Rowland, 13 November: "any card that can't be proven shows the sentence until it can"). */
  return NONE;
}

/** A product's Line capacity: the tiles its page shows (capacityLean over capacityPaper, as CapacityPanel reads them) and its bars. */
export function glanceOfCapacity(st: Standard, line: Workspace | null | undefined): Glance {
  const cap = st.capacity;
  if (!cap?.stations.length) return NONE;
  const page = capacityLean(capacityPaper({ product: st.product, line: line?.name ?? '', printed: '', capacity: cap,
    labour: labourInputs(cap, headcount(st), line ?? undefined), ...(line?.marginPerPack != null ? { margin: line.marginPerPack } : {}) }));
  const r = analyse(cap);
  return { tiles: page.tiles, pic: { t: 'capacity', model: flowModel(cap, r, lanesAlike(cap)) }, ...(page.verdict ? { verdict: page.verdict.text, tone: page.verdict.tone as LeanTone } : {}) };
}
