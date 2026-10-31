/* HAND-OVERS BETWEEN THE STATISTICS TOOLS (knowledge/specs/FC-086-hand-overs.md; docs/TOOLS-WORLDS.md W2 — Rowland, 30 October:
 * "this tool says X, now link to this tool").
 *
 * A tool's answer sometimes says what the next question is. Two rules, fixed, each saying why in the tool's own words — never a
 * model's guess and never a button that is always there:
 *
 *   Capability said the run was NOT STEADY   → Chart these readings (a capability index on a drifting run is a rough guide at
 *                                              best — the chart shows when it moved and whether it settled)
 *   a Control chart is STEADY with its limits set, no signal, and the specification known
 *                                            → Check capability (a steady process is the only kind a capability index describes)
 *
 * Each is the W1 action (lib/sharedReadings) opened on the right tool with the reason beside it; it is a suggestion, said once
 * under the answer, and never starts anything by itself. Pure; ui/NextStep draws it. */
import { checksSay, sample } from '../tools/capability/sample';
import { chartFigures } from '../tools/chart/chart';
import { shareOffer, type ShareTarget } from './sharedReadings';
import type { ToolStudy } from './study';

export interface HandOver {
  /** The tool the readings go to. */
  target: ShareTarget;
  /** What to do and why, in one sentence. */
  says: string;
  /** The fact it rests on, in the answering tool's words. */
  because: string;
}

export function handOverFor(s: ToolStudy): HandOver | undefined {
  const offer = shareOffer(s);
  if (!offer?.targets.length) return undefined;

  if (s.tool === 'capability') {
    const a = s.agreed?.readings;
    if (!a || (a.kind !== 'limits' && a.kind !== 'packers') || !offer.targets.includes('chart')) return undefined;
    const steady = checksSay(sample(a, s.facts.readings ?? []), a).find(c => c.k === 'steady');
    if (!steady || steady.tone !== 'a') return undefined;
    return { target: 'chart', says: 'The run was not steady — chart these readings to see when it moved and whether it settled.', because: steady.text };
  }

  if (s.tool === 'chart') {
    const a = s.agreed?.chart;
    if (!a || a.kind !== 'xmr' || a.products || (a.lower === undefined && a.upper === undefined) || !offer.targets.includes('capability')) return undefined;
    const f = chartFigures(a, s.facts.readings ?? []);
    if (f.provisional || f.signals.length) return undefined;
    return { target: 'capability', says: 'Steady inside its limits, and the specification is known — can it hold the specification? Check capability.', because: `${f.n} readings against limits set from ${f.from?.n ?? 'its'} readings, no signal.` };
  }
  return undefined;
}
