/* WHAT THE FLOOR SAID OF A JOB'S PROGRAMS, for the line's Programs (flow
 * audit #3: "one program, two records, two answers" — PR-04 "Proved 12 Oct"
 * on the line, "Failed · closed 13 Oct" on the job). A job's program shows on
 * its line's Programs; the status its job's Set up said of it — baseline
 * achieved, passed, failed, with what was seen — is the job's programs reading
 * (lib/programsReport), read here once per job and kept current, so the line
 * says it beside the record's own state. Nothing is stored. */
import { useEffect, useState } from 'react';
import { getProject, listAssets, listPrograms, listTestItems, listTests, onDataChange } from '../db';
import { programsReading, type ProgTone } from './programsReport';
import { todayISO } from './weeks';

export interface FloorWord {
  /** "Failed · closed 13 Oct", "baseline achieved — done 13 Oct". */
  word: string;
  tone: ProgTone;
  /** What was seen, with the status it stands on. */
  note?: string;
}

/** The floor's word on each of these jobs' programs, by program id — only
 *  where the job's Set up said something of it. */
export function useJobFloor(jobIds: readonly string[]): Map<string, FloorWord> {
  const key = [...new Set(jobIds.filter(Boolean))].sort().join(',');
  const [got, setGot] = useState<Map<string, FloorWord>>(() => new Map());
  useEffect(() => {
    let live = true;
    const ids = key ? key.split(',') : [];
    const load = () => void Promise.all(ids.map(async pid => {
      const [tests, items, assets, programs, project] = await Promise.all([listTests(pid), listTestItems(pid), listAssets(pid), listPrograms(pid), getProject(pid)]);
      return programsReading({ tests, items, assets, programs, today: todayISO(), ...(project ? { holder: project } : {}) })?.lines ?? [];
    })).then(all => {
      if (!live) return;
      const m = new Map<string, FloorWord>();
      for (const l of all.flat()) {
        /* Only where the floor's status leads the row — the newer fact; one
           proved since the floor last spoke reads as proved, as it does here. */
        if (!l.programId || !l.partId || !l.record) continue;
        m.set(l.programId, { word: l.word, tone: l.tone, ...(l.note ? { note: l.note } : {}) });
      }
      setGot(m);
    });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [key]);
  return got;
}
