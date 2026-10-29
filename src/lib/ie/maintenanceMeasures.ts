/** Maintenance measures board (FC-067). */
import type { ToolStudy } from '../study';
import type { LogDef } from '../../tools/checks/def';
import { logFigures, type LogFigures } from '../../tools/checks/figures';
import { relAll } from '../../tools/reliability/reliability';
import type { LeanTile, LeanTone } from '../lean';
import { span } from '../../tools/reliability/words';

export const MM_PERIOD_DAYS = 30;
export function plannedShare(plannedHours: number, reactiveHours: number): number | undefined {
  const d = plannedHours + reactiveHours;
  return d > 0 ? plannedHours / d : undefined;
}
export function plannedHoursFromLog(s: ToolStudy, _def: LogDef, now: number, days = MM_PERIOD_DAYS): number {
  const log = s.agreed?.log; if (!log) return 0;
  const from = now - days * 86400000; let h = 0;
  for (const c of log.checks) {
    const std = c.stdHours ?? 0; if (std <= 0) continue;
    for (const r of s.facts.results ?? []) {
      if (r.struck || r.checkId !== c.id || r.outcome !== 'pass') continue;
      if (r.at >= from && r.at <= now) h += std;
    }
  }
  return h;
}
export interface MachineReliability { studyId: string; studyName: string; machine?: string; mtbfH?: number; mttrMin?: number; availability?: number }
export function reliabilityFromStudy(s: ToolStudy, now: number): MachineReliability | undefined {
  const a = s.agreed?.reliability; if (!a) return undefined;
  const items = relAll(a, s.facts.watch ?? [], s.facts.events ?? [], now); const first = items[0]; if (!first) return undefined;
  return { studyId: s.id, studyName: s.name || 'Reliability study', machine: s.machine?.trim() || undefined, mtbfH: first.f.mtbfH, mttrMin: first.r?.medianMin ?? first.r?.meanMin, availability: first.r?.availability };
}
export interface MaintenanceGather { pm?: LogFigures; pmStudyName?: string; reactiveHours: number; plannedHours: number; machines: MachineReliability[] }
export function gatherMaintenance(input: { pmLog?: ToolStudy; pmDef?: LogDef; reliability: ToolStudy[]; reactiveHours: number; now: number }): MaintenanceGather {
  const pmFig = input.pmLog && input.pmDef ? logFigures({ s: input.pmLog, def: input.pmDef, now: input.now, ctx: {}, days: MM_PERIOD_DAYS }) : undefined;
  const plannedHours = input.pmLog && input.pmDef ? plannedHoursFromLog(input.pmLog, input.pmDef, input.now) : 0;
  return { ...(pmFig ? { pm: pmFig, pmStudyName: input.pmLog?.name } : {}), reactiveHours: input.reactiveHours, plannedHours, machines: input.reliability.map(s => reliabilityFromStudy(s, input.now)).filter((x): x is MachineReliability => !!x) };
}
export interface MaintenanceMeasuresResult { verdict: string; tone: LeanTone; sentence: string; tiles: LeanTile[]; closing: string; caveats: string[] }
export function summarizeMaintenance(g: MaintenanceGather): MaintenanceMeasuresResult {
  const compliance = g.pm?.comp.pct; const backlog = g.pm?.backlogHours ?? 0; const share = plannedShare(g.plannedHours, g.reactiveHours);
  const watched = g.machines.filter(m => m.mtbfH !== undefined).length;
  const worst = g.machines.filter(m => m.mtbfH !== undefined).sort((a, b) => (a.mtbfH ?? Infinity) - (b.mtbfH ?? Infinity))[0];
  const tiles: LeanTile[] = [
    compliance !== undefined ? { k: 'PM compliance', v: `${Math.round(compliance)}%`, of: `last ${MM_PERIOD_DAYS} days`, ...(compliance >= 80 ? { tone: 'g' as const } : compliance >= 60 ? { tone: 'a' as const } : { tone: 'r' as const }) } : { k: 'PM compliance', v: '—', of: 'start a planned-maintenance log on this line' },
    backlog > 0 ? { k: 'Backlog', v: `${backlog} h`, of: `${g.pm?.backlogJobs ?? 0} overdue PM tasks`, tone: 'a' } : { k: 'Backlog', v: g.pm ? '0 h' : '—', of: g.pm ? 'no overdue PM tasks' : 'no PM log yet' },
    share !== undefined ? { k: 'Planned share', v: `${Math.round(share * 100)}%`, of: `${g.plannedHours} h planned ÷ (${g.plannedHours} + ${g.reactiveHours} reactive)`, ...(share >= 0.8 ? { tone: 'g' as const } : share >= 0.5 ? { tone: 'a' as const } : { tone: 'r' as const }) } : { k: 'Planned share', v: '—', of: 'type reactive maintenance hours' },
    { k: 'Machines watched', v: String(watched), of: `${g.machines.length} reliability studies` },
    worst?.mtbfH !== undefined ? { k: 'Shortest MTBF', v: span(worst.mtbfH), of: worst.machine ?? worst.studyName, tone: 'a' } : { k: 'Shortest MTBF', v: '—', of: 'watch reliability at the machine' },
  ];
  const parts: string[] = [];
  if (compliance !== undefined) parts.push(`PM compliance ${Math.round(compliance)}%`);
  if (share !== undefined) parts.push(`planned share ${Math.round(share * 100)}%`);
  if (backlog > 0) parts.push(`backlog ${backlog} crew-hours`);
  if (worst?.mtbfH !== undefined) parts.push(`shortest MTBF ${span(worst.mtbfH)}`);
  const sentence = parts.length ? `${parts.join('; ')} — from the line's PM log and reliability studies.` : 'Open on a line with PM and reliability records; type reactive hours for planned share.';
  let tone: LeanTone = 'n';
  if (compliance !== undefined && compliance < 60) tone = 'r'; else if (backlog > 0 || (share !== undefined && share < 0.5)) tone = 'a'; else if (compliance !== undefined && compliance >= 80) tone = 'g';
  return { verdict: share !== undefined ? `Planned share ${Math.round(share * 100)}%` : compliance !== undefined ? `PM ${Math.round(compliance)}%` : 'Maintenance measures', tone, sentence, tiles, closing: share !== undefined && share < 0.8 ? 'Half or more of maintenance is still reactive — protect planned tasks on critical machines first.' : 'Keep PM compliance up; the board refreshes when logs or studies change.', caveats: ['Reactive hours are typed until repair-time stops feed them.', 'MTBF is from each reliability study as-is — not merged automatically.'] };
}
