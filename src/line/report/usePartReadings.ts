/* EACH PART OF A REPORT AS THE ONE-PAGE LINE REPORT READS IT (lib/lineLean) — its tiles' reading and its programs, machine by
 * machine (lib/lineRecords lineProgramsReading). One reader for the line report (LineReportScreen) and the area report
 * (AreaReportScreen), so a line reads the same in both. Moved out of LineReportScreen on 9 November, unchanged. */
import { useEffect, useMemo, useState } from 'react';
import type { Observation } from '../../types';
import { listObservations, onDataChange, projectsOnWorkspace } from '../../db';
import type { LineRecords } from '../../lib/useLineRecords';
import { projectsOnLines, stageOnlyByLine, useJobFloor } from '../../lib/useJobFloor';
import { lineProgramsReading } from '../../lib/lineRecords';
import { useLooking } from '../../tools/gemba/useLooking';
import { spreadSentences, useYokotenMany } from '../../tools/yokoten/useYokoten';
import { lookingReading } from '../../tools/gemba/looking';
import type { LineReading } from '../../lib/lineLean';
import { scopeCounts } from '../../tools/checks/owed';
import { lineDay } from '../../lib/lineLoss';
import { stopsOf } from '../../screens/ProductionLineScreen';
import type { LinePart } from './lineBundle';

/** The stops timed on each line and how many projects are on it — read for the ids given, again whenever anything is written. */
export function useLineObs(ids: readonly string[]): { obs: Map<string, Observation[]>; jobsOn: Map<string, number> } {
  const [obs, setObs] = useState<Map<string, Observation[]>>(new Map());
  const [jobsOn, setJobsOn] = useState<Map<string, number>>(new Map());
  const key = ids.join('|');
  useEffect(() => {
    let live = true;
    const list = key ? key.split('|') : [];
    const load = async () => {
      const [o, j] = await Promise.all([Promise.all(list.map(id => listObservations(id))), Promise.all(list.map(id => projectsOnWorkspace(id)))]);
      if (!live) return;
      setObs(new Map(list.map((id, i) => [id, o[i]])));
      setJobsOn(new Map(list.map((id, i) => [id, j[i].length])));
    };
    void load();
    const off = onDataChange(() => void load());
    return () => { live = false; off(); };
  }, [key]);
  return { obs, jobsOn };
}

export function usePartReadings(parts: readonly LinePart[], obs: ReadonlyMap<string, Observation[]>, jobsOn: ReadonlyMap<string, number>, rec: LineRecords, today: string) {
  /* ITS PROGRAMS, machine by machine — read as the line's Programs reads them (lib/lineRecords) */
  const partIds = useMemo(() => parts.map(p => p.line.id), [parts]);
  const floor = useJobFloor(useMemo(() => projectsOnLines(partIds, rec.jobLines, pid => rec.jobs.some(j => j.id === pid && !j.archivedAt)), [partIds, rec.jobLines, rec.jobs]));
  const stageOnly = useMemo(() => stageOnlyByLine(floor.stageOnly ?? [], rec.machines, rec.jobLines), [floor, rec.machines, rec.jobLines]);
  const jobNames = useMemo(() => new Map(rec.jobs.map(j => [j.id, j.name])), [rec.jobs]);
  const programs = useMemo(() => new Map(parts.map(p => [p.line.id, lineProgramsReading([{ id: p.line.id, name: p.line.name, machines: p.kit.machines, programs: p.kit.programs }], today,
    { floor, jobName: jobNames, tests: rec.provingTests, studies: rec.studies, standards: rec.standards, stageOnly: new Map([[p.line.id, (stageOnly.get(p.line.id) ?? []).map(x => x.line)]]) })] as const)), [parts, today, floor, jobNames, rec.provingTests, rec.studies, rec.standards, stageOnly]);

  /* how fresh the looking is, a part at a time (FC-199, tools/gemba) */
  const looked = useLooking(partIds);
  const spreadOf = useYokotenMany(partIds);
  const checkCounts = useMemo(() => new Map(parts.map(p => [p.line.id, scopeCounts(rec.studies.filter(x => !x.deletedAt && x.workspaceId === p.line.id), Date.now())] as const)), [parts, rec.studies]);
  /* EACH PART AS THE ONE-PAGE LINE REPORT READS IT (lib/lineLean) — the same tiles and closing line */
  const readings = useMemo(() => new Map(parts.map(p => {
    const s = stopsOf(obs.get(p.line.id) ?? []);
    const r: LineReading = { name: p.line.name, problems: { open: p.problems.open, late: p.problems.late, critical: p.problems.critical },
      programs: { n: p.kit.programs.length, proved: p.kit.proved, late: p.kit.late, onStage: (stageOnly.get(p.line.id) ?? []).length },
      stops: { n: s.n, minutes: s.minutes, ...(s.worst ? { worst: s.worst } : {}) }, day: lineDay(p.line), jobs: jobsOn.get(p.line.id) ?? 0,
      /* the line's check logs (src/tools/checks): the tile and the closing line the line's page says */
      ...(checkCounts.get(p.line.id)?.logs ? { checks: checkCounts.get(p.line.id) } : {}),
      ...(() => { const lk = looked?.find(x => x.id === p.line.id); return lk ? { looking: lookingReading(p.line.name, lk.looking) } : {}; })(),
      ...(() => { const sp = spreadSentences(spreadOf?.get(p.line.id)); return sp.length ? { spread: sp } : {}; })() };
    return [p.line.id, r] as const;
  })), [parts, obs, stageOnly, jobsOn, checkCounts, looked, spreadOf]);
  return { readings, programs };
}
