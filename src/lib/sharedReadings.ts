/* READINGS SHARED BETWEEN THE STATISTICS TOOLS (knowledge/specs/FC-094-shared-readings.md; docs/TOOLS-WORLDS.md W1 —
 * Rowland, 31 October: "shared readings yes ... option A": start one tool from another's readings, copied with a link back,
 * no new record).
 *
 * Thirty readings typed into Capability should not be typed again to ask whether they were steady (Control chart) or how sure
 * the mean is (Analysis). A new study of the other tool is made with the readings copied, on the same line, project, machine
 * and product; what the source knows (unit, limits, nominal) is carried and what it does not is left for the target to ask —
 * a limit is never invented. The copy is a copy: its readings are its own, and `facts.copiedFrom` only says where they came
 * from. Pure; the sheet that offers it is ui/ShareReadings.
 *
 * Offered between exactly three tools, each reading one column of numbers in order. A fourth that does joins by one row of
 * SHARES below. Counted, pass-or-fail, paired, tabular and gauge data are not one column of values and are never offered. */
import { uid } from './ids';
import type { AgreedAnalysis, AgreedChart, AgreedReadings, StudyReading, StudyTool, ToolStudy } from './study';

export type ShareTarget = 'chart' | 'capability' | 'analysis';

/** What each target is called to a person, and what it will do with the readings. */
export const SHARE_WORDS: Record<ShareTarget, { action: string; does: string; suffix: string }> = {
  chart: { action: 'Chart these readings', does: 'Plots them in order against limits — was it steady, did anything move.', suffix: 'chart' },
  capability: { action: 'Check capability', does: 'Ppk against the limits — can the process hold them, and how sure is that.', suffix: 'capability' },
  analysis: { action: 'How sure am I', does: 'The mean with its interval — how far to trust the figure.', suffix: 'how sure' },
};

const ALL: readonly ShareTarget[] = ['chart', 'capability', 'analysis'];
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export interface ShareOffer {
  /** The tools that can be started from these readings, never the study's own. */
  targets: ShareTarget[];
  /** The readings that would travel: numbers, not struck, in the order they were taken. */
  values: StudyReading[];
  /** Why nothing is offered, in words — the item is shown disabled with it, never hidden. */
  why?: string;
}

/** The numeric readings a study could share: not struck, with a number, no `arm` (an analysis's arms are not one column). */
const column = (s: ToolStudy): StudyReading[] =>
  (s.facts.readings ?? []).filter(r => !r.struck && isNum(r.value) && !r.arm).sort((a, b) => a.at - b.at);

/** Whether a study keeps one column of values — and which tools can be started from it. */
export function shareOffer(s: ToolStudy): ShareOffer | undefined {
  const own = s.tool as StudyTool;
  if (own !== 'capability' && own !== 'chart' && own !== 'analysis') return undefined;
  const targets = ALL.filter(t => t !== own);
  if (own === 'capability') {
    const k = s.agreed?.readings?.kind;
    if (k && k !== 'limits' && k !== 'packers') return { targets: [], values: [], why: 'These readings are counts or passes and fails — they do not make a column of measurements.' };
  }
  if (own === 'analysis') {
    const a = s.agreed?.analysis;
    if (!a) return { targets: [], values: [], why: 'Set the question first — then there are readings to share.' };
    const ok = (a.kind === 'sure' && a.of === 'mean') || a.kind === 'shape';
    if (!ok) return { targets: [], values: [], why: 'These are counts, pairs, groups or a table — they do not make one column of measurements.' };
  }
  const values = column(s);
  if (values.length < 2) return { targets: [], values, why: 'Nothing to share yet — add readings first.' };
  return { targets, values };
}

/** What carries across, by what the source knows. Nothing here is a default: a missing limit stays missing. */
interface Known { unit?: string; nominal?: number; lower?: number; upper?: number; name?: string }
function known(s: ToolStudy): Known {
  const r: AgreedReadings | undefined = s.agreed?.readings;
  const c: AgreedChart | undefined = s.agreed?.chart;
  const a: AgreedAnalysis | undefined = s.agreed?.analysis;
  if (s.tool === 'capability' && r) return { unit: r.unit, nominal: r.nominal, lower: r.kind === 'limits' ? r.lower : undefined, upper: r.kind === 'limits' ? r.upper : undefined };
  if (s.tool === 'chart' && c) return { unit: c.unit, nominal: c.target, lower: c.lower, upper: c.upper, name: c.name };
  if (s.tool === 'analysis' && a) return { unit: a.unit, name: a.name, lower: a.shape?.lower, upper: a.shape?.upper };
  return {};
}
const clean = <T extends Record<string, unknown>>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

/** The new study of `target`, from `source`: the readings copied (fresh ids, struck ones left behind), what is known carried,
 *  the origin noted. `id` and `at` are the caller's, so a test can pin them. */
export function shareInto(source: ToolStudy, target: ShareTarget, o: { name: string; id?: string; at: number; ids?: () => string }): ToolStudy | undefined {
  const offer = shareOffer(source);
  if (!offer || !offer.targets.includes(target)) return undefined;
  const ids = o.ids ?? uid;
  const readings: StudyReading[] = offer.values.map(r => clean({ id: ids(), value: r.value, at: r.at, ...(r.who ? { who: r.who } : {}), ...(r.note ? { note: r.note } : {}) }) as StudyReading);
  const k = known(source);
  const what = (k.name?.trim() || source.name).trim();
  let agreed: ToolStudy['agreed'];
  if (target === 'chart') {
    agreed = { chart: clean({ kind: 'xmr' as const, name: what, unit: k.unit, target: k.nominal, lower: k.lower, upper: k.upper }) as AgreedChart };
  } else if (target === 'analysis') {
    agreed = { analysis: clean({ kind: 'sure' as const, name: what, unit: k.unit, of: 'mean' as const, confidence: 0.95 as const }) as AgreedAnalysis };
  } else if (k.lower !== undefined || k.upper !== undefined) {
    /* capability needs a limit; only when the source knows one is the study agreed — otherwise its set-up asks, readings kept */
    agreed = { readings: clean({ kind: 'limits' as const, count: Math.max(30, readings.length), unit: k.unit, nominal: k.nominal, lower: k.lower, upper: k.upper }) as AgreedReadings };
  }
  return clean({
    id: o.id ?? ids(), tool: target, name: o.name.trim(),
    workspaceId: source.workspaceId, projectId: source.projectId, machine: source.machine, assetId: source.assetId, product: source.product,
    ...(agreed ? { agreed } : {}),
    facts: { readings, copiedFrom: { id: source.id, tool: source.tool, name: source.name, n: readings.length, at: o.at } },
    uses: [], startedAt: o.at, createdAt: o.at, updatedAt: o.at,
  }) as ToolStudy;
}

/** The new study's name, offered: "Fill weight — chart". */
export const shareName = (source: ToolStudy, target: ShareTarget): string => `${source.name.trim() || 'Readings'} — ${SHARE_WORDS[target].suffix}`;

/** "12 Oct" — the day words screen and paper share. */
export const shortDay = (at: number): string => new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** WHERE THE READINGS CAME FROM, in one phrase — on the new study's page and on its paper (rule 2: screen and paper together). */
export const copiedHead = (c: NonNullable<ToolStudy['facts']['copiedFrom']> | undefined, day: (at: number) => string = shortDay): string | undefined =>
  c ? `Readings copied from “${c.name}”, ${c.n} on ${day(c.at)}` : undefined;

/** What the copy says of itself: where its readings came from, and — when the source has moved on — that it has. `source`:
 *  the source study as it is now; null when it has been deleted; undefined while it is still being read. */
export function copiedSays(c: NonNullable<ToolStudy['facts']['copiedFrom']> | undefined, source: ToolStudy | null | undefined, day: (at: number) => string = shortDay): { head: string; moved?: string } | undefined {
  const head = copiedHead(c, day);
  if (!c || !head) return undefined;
  if (source === undefined) return { head };
  if (source === null) return { head, moved: 'It was copied from a study that has since been deleted.' };
  const now = column(source).length;
  return now !== c.n ? { head, moved: `The source now has ${now} — this copy has ${c.n}.` } : { head };
}
