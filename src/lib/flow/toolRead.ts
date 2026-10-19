/* A TOOL'S RECORD, READ FOR A STEP IT ANSWERS (lib/flow/components; the
 * vision slice, docs/PLATFORM-STATUS.md).
 *
 * A method's step can be done with one of the app's tools — SMED, a loss
 * count, a capability study, a line balance, work sampling, a value stream
 * map. The step holds the study's id (FlowRecord.studyId); this reads that
 * study with the tool's OWN module — the arithmetic that is tested where it
 * lives, never a second copy — into what the runtime needs: the tool's
 * sentence and verdict, whether enough is recorded, and its figures by the
 * keys lib/flow/components names them. Pure: whoever has the study (and,
 * for a loss count, the line's stops and cost) hands it in. */
import type { ToolStudy } from '../study';
import { lossFiguresOf, studyHref, studySays, studyTitle, type StudyContext } from '../studyLinks';
import { figuresOf } from '../ie/changeover';
import { sample } from '../ie/sample';
import { studyBalance } from '../ie/balanceLink';
import { DEFAULT_ACTIVITIES, samplingEnough, shares, tapsOf } from '../ie/sampling';
import { flowFigures } from '../ie/steps';
import type { ToolReading } from './runtime';
import { analyse, labourCost, labourInputs } from '../capacity';
import { headcount, type Standard } from '../standard';
import type { Observation, Workspace } from '../../types';

const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;
const put = (out: Record<string, number>, k: string, v: number | undefined, dp = 2) => {
  if (typeof v === 'number' && Number.isFinite(v)) out[k] = round(v, dp);
};

/** The figures a study gives a step, by tool. */
export function toolFigures(s: ToolStudy, ctx?: StudyContext): { enough: boolean; figures: Record<string, number> } {
  const figures: Record<string, number> = {};
  switch (s.tool) {
    case 'capability': {
      const f = sample(s.agreed?.readings, s.facts.readings ?? []);
      put(figures, 'cpk', f.cpk); put(figures, 'ppk', f.ppk); put(figures, 'mean', f.mean, 3);
      return { enough: f.enough, figures };
    }
    case 'losses': {
      const f = lossFiguresOf(s, ctx);
      put(figures, 'lost_minutes', f.lostMin, 1); put(figures, 'packs_made', f.made, 0);
      put(figures, 'packs_short', f.shortPacks, 0); put(figures, 'rejects', f.rejects, 0);
      return { enough: f.enough, figures };
    }
    case 'changeover': {
      const f = figuresOf(s.facts);
      if (f.enough) {
        put(figures, 'changeover_minutes', f.nowSec / 60, 1);
        put(figures, 'internal_minutes', f.internalSec / 60, 1);
        put(figures, 'external_minutes', f.externalSec / 60, 1);
      }
      return { enough: f.enough, figures };
    }
    case 'balance': {
      const f = studyBalance(s);
      put(figures, 'balance_efficiency', f.efficiency !== undefined ? f.efficiency * 100 : undefined, 1);
      put(figures, 'people_needed', f.fewest, 0);
      put(figures, 'longest_stack', f.constraint?.work, 1);
      return { enough: f.elements.length > 0 && !f.untimed, figures };
    }
    case 'sampling': {
      const a = s.agreed?.sampling;
      const taps = tapsOf(s.facts.taps ?? []);
      const work = (a?.activities ?? DEFAULT_ACTIVITIES)[0];
      const share = shares(taps, a?.activities ?? DEFAULT_ACTIVITIES).find(x => x.activity === work)?.share;
      put(figures, 'taps', taps.length, 0);
      if (taps.length) put(figures, 'share_working', share !== undefined ? share * 100 : undefined, 1);
      return { enough: samplingEnough(taps.length) === 'enough', figures };
    }
    case 'map': {
      const f = flowFigures(s.facts.flow, s.agreed?.map);
      if (f.steps) { put(figures, 'lead_time_minutes', f.leadSec / 60, 1); put(figures, 'value_added_share', f.pce !== undefined ? f.pce * 100 : undefined, 1); }
      return { enough: f.steps > 0 && !f.untimed, figures };
    }
    default:
      return { enough: false, figures };
  }
}

/** Read a study for the step it answers. */
export function readTool(s: ToolStudy, ctx?: StudyContext): ToolReading {
  const { enough, figures } = toolFigures(s, ctx);
  const said = studySays(s, ctx);
  return { tool: s.tool, name: studyTitle(s), says: said.text, ...(said.verdict ? { verdict: said.verdict } : {}), enough, figures, href: studyHref(s) };
}

/** A PRODUCT'S LINE CAPACITY, read for a step it answers — Line capacity lives
 *  on the product's line standard, not as a study. lib/capacity's own
 *  arithmetic: the line's rate once stops count, the good out of the end, how
 *  far short of its target (0 when it meets it), and labour a pack in pence —
 *  the people and one person's rate as the capacity page takes them (typed,
 *  else the standard's people and the line's crew and wage). Enough once the
 *  line can be counted. */
export function capacityFigures(std: Pick<Standard, 'capacity' | 'marks'>, line?: Pick<Workspace, 'crew' | 'labourRatePerHour' | 'labourBurden'>): { enough: boolean; figures: Record<string, number>; says: string; short: boolean } {
  const figures: Record<string, number> = {};
  const cap = std.capacity;
  if (!cap?.stations.length) return { enough: false, figures, says: 'No stations yet — the line’s stations for this product are still to write', short: false };
  const r = analyse(cap);
  put(figures, 'line_rate', r.line, 1);
  put(figures, 'good_rate', r.goodOut, 1);
  if (r.target != null && r.gap != null) put(figures, 'short_of_target', Math.max(0, r.gap), 1);
  const li = labourInputs(cap, headcount(std), line);
  const lc = labourCost(r, li.people, li.rate);
  if (lc) put(figures, 'labour_per_pack', lc.perPack * 100, 2);
  return { enough: r.line != null && r.line > 0, figures, says: r.sentence, short: (r.gap ?? 0) > 1e-9 };
}

/** Read a product's Line capacity for the step it answers. */
export function readCapacity(std: Standard, line?: Workspace): ToolReading {
  const f = capacityFigures(std, line);
  const href = `${std.workspaceId ? `/w/${std.workspaceId}/standards/${std.id}` : `/project/${std.projectId}/standard/${std.id}`}?at=balance`;
  const verdict = !f.enough ? 'Speeds still to fill in' : f.short ? 'Short of its target' : std.capacity?.targetPerMin != null ? 'Meets its target' : undefined;
  return { tool: 'capacity', name: `Line capacity — ${std.product}${line ? ` on ${line.name}` : ''}`, says: f.says, ...(verdict ? { verdict } : {}), enough: f.enough, figures: f.figures, href };
}

/** EVERY TOOL RECORD A PROJECT'S STEPS POINT AT, read — from the rows whoever
 *  holds them hands in: the device from its own store (lib/flow/operations
 *  readTools), the server from the database (lib/flow/serverCheck). A step's
 *  id is a study's, or else a product's line standard's for its Line
 *  capacity; a loss count reads its line's stops and cost. One composition,
 *  so the two read a step the same. */
export function readToolsFrom(
  ids: readonly string[],
  rows: { studies: readonly ToolStudy[]; standards?: readonly Standard[]; workspaces?: readonly Workspace[]; observations?: readonly Observation[] },
): Record<string, ToolReading> {
  const want = new Set(ids.filter(Boolean));
  const out: Record<string, ToolReading> = {};
  const workspaces = [...(rows.workspaces ?? [])];
  const observations = [...(rows.observations ?? [])];
  for (const st of rows.studies) if (want.has(st.id) && !st.deletedAt) out[st.id] = readTool(st, { observations, workspaces });
  for (const sd of rows.standards ?? []) {
    if (!want.has(sd.id) || out[sd.id] || sd.deletedAt) continue;
    out[sd.id] = readCapacity(sd, workspaces.find(w => w.id === sd.workspaceId));
  }
  return out;
}
